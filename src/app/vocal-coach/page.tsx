'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  Play,
  Square,
  Activity,
  CheckCircle2,
  AlertCircle,
  Volume2,
  Trophy,
  Target,
  RefreshCw,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { PitchDetector } from 'pitchy';
import * as Tone from 'tone';
import {
  freqToPitchInfo,
  PitchInfo,
  NOTE_NAMES,
  NoteName,
  noteToFreq,
} from '@/lib/music-theory';
import { useToast } from '@/context/ToastContext';

interface PitchPoint {
  time: number;
  freq: number;
  cents: number;
  note: string;
}

export default function VocalCoachPage() {
  const { info, success, warning, error } = useToast();

  const [isListening, setIsListening] = useState(false);
  const [pitchData, setPitchData] = useState<PitchInfo | null>(null);
  const [stabilityScore, setStabilityScore] = useState<number>(0); // 0-100%
  const [targetNote, setTargetNote] = useState<string>('A4');
  const [targetSuccessCount, setTargetSuccessCount] = useState<number>(0);
  const [isPlayingReference, setIsPlayingReference] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Web Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // History for contour visualization
  const pitchHistoryRef = useRef<PitchPoint[]>([]);
  const recentPitchesRef = useRef<number[]>([]);
  const holdStartTimeRef = useRef<number | null>(null);

  // Reference note synth
  const refSynthRef = useRef<Tone.Synth | null>(null);

  // Initialize reference tone synthesizer
  const playReferenceNote = async () => {
    await Tone.start();
    if (isPlayingReference) {
      if (refSynthRef.current) refSynthRef.current.triggerRelease();
      setIsPlayingReference(false);
      return;
    }

    const synth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.1, decay: 0.2, sustain: 0.8, release: 0.5 },
    }).toDestination();
    synth.volume.value = -8;
    refSynthRef.current = synth;

    synth.triggerAttack(targetNote);
    setIsPlayingReference(true);
  };

  const stopReferenceNote = () => {
    if (refSynthRef.current) {
      refSynthRef.current.triggerRelease();
      refSynthRef.current = null;
    }
    setIsPlayingReference(false);
  };

  // Start microphone pitch detection
  const startListening = async () => {
    setPermissionError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          autoGainControl: true,
          noiseSuppression: false,
        },
      });

      mediaStreamRef.current = stream;
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      setIsListening(true);
      info('Vocal Coach Active', 'Sing into your microphone to track your pitch contour.');

      runPitchLoop();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not access microphone.';
      setPermissionError(msg);
      error('Microphone Denied', msg);
    }
  };

  const stopListening = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setIsListening(false);
    setPitchData(null);
    setStabilityScore(0);
  };

  const runPitchLoop = () => {
    if (!analyserRef.current || !audioContextRef.current) return;

    const analyser = analyserRef.current;
    const sampleRate = audioContextRef.current.sampleRate;
    const bufferLength = analyser.fftSize;
    const buffer = new Float32Array(bufferLength);
    const detector = PitchDetector.forFloat32Array(bufferLength);

    const loop = () => {
      analyser.getFloatTimeDomainData(buffer);

      // Volume check
      let sumSquares = 0;
      for (let i = 0; i < bufferLength; i++) sumSquares += buffer[i] * buffer[i];
      const rms = Math.sqrt(sumSquares / bufferLength);

      if (rms >= 0.015) {
        const [pitch, clarity] = detector.findPitch(buffer, sampleRate);

        if (clarity >= 0.85 && pitch >= 60 && pitch <= 1200) {
          const infoObj = freqToPitchInfo(pitch);
          setPitchData(infoObj);

          // Calculate stability (standard deviation of last 10 pitch frames)
          const recent = recentPitchesRef.current;
          recent.push(pitch);
          if (recent.length > 10) recent.shift();
          if (recent.length >= 5) {
            const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
            const variance = recent.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recent.length;
            const stdDev = Math.sqrt(variance);
            const score = Math.max(0, Math.min(100, Math.round(100 - stdDev * 4)));
            setStabilityScore(score);
          }

          // Target note hit check: within ±15 cents of target note for > 800ms
          if (infoObj.fullNote === targetNote && Math.abs(infoObj.cents) <= 15) {
            if (!holdStartTimeRef.current) {
              holdStartTimeRef.current = Date.now();
            } else if (Date.now() - holdStartTimeRef.current > 800) {
              setTargetSuccessCount((prev) => prev + 1);
              holdStartTimeRef.current = null;
              success('Target Pitch Matched!', `Great job holding ${targetNote}!`);
            }
          } else {
            holdStartTimeRef.current = null;
          }

          // Record contour history
          const history = pitchHistoryRef.current;
          history.push({
            time: Date.now(),
            freq: pitch,
            cents: infoObj.cents,
            note: infoObj.fullNote,
          });
          if (history.length > 120) history.shift();
        }
      }

      // Draw Pitch Contour onto Canvas
      drawContourCanvas();

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
  };

  const drawContourCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Draw background guide lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let y = 30; y < height; y += 35) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw target pitch guide line
    const targetFreq = 440; // baseline
    const targetY = height / 2;
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(0, targetY);
    ctx.lineTo(width, targetY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw scrolling pitch trail
    const history = pitchHistoryRef.current;
    if (history.length < 2) return;

    ctx.beginPath();
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const stepX = width / 120;
    history.forEach((pt, idx) => {
      const x = idx * stepX;
      // Map cents from target (-50 to +50) to Y
      const y = targetY - (pt.cents / 50) * (height / 2.5);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
      stopReferenceNote();
    };
  }, []);

  const cents = pitchData?.cents ?? 0;
  const isInTune = Math.abs(cents) <= 8;

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-midnight-900 border border-slate-200 dark:border-white/10 shadow-sm backdrop-blur-xl">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-studio-violet/10 dark:bg-purple-500/10 border border-studio-violet/20 dark:border-purple-500/20 text-studio-violet dark:text-purple-300 text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              Singing Voice Technology
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              Vocal Pitch Coach
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Live microphone singing pitch analysis, real-time scrolling vocal contour visualizer, and target note stability matching.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {!isListening ? (
              <button
                onClick={startListening}
                className="px-6 py-3 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-studio-blue via-indigo-600 to-cyan-500 hover:from-studio-blue/90 shadow-lg shadow-studio-blue/25 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Mic className="w-4 h-4" />
                <span>Start Singing Coach</span>
              </button>
            ) : (
              <button
                onClick={stopListening}
                className="px-6 py-3 rounded-2xl font-bold text-sm text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-600/25 flex items-center gap-2 transition-all cursor-pointer"
              >
                <MicOff className="w-4 h-4" />
                <span>Stop Coach</span>
              </button>
            )}
          </div>
        </div>

        {/* Permission Banner */}
        {permissionError && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{permissionError}</span>
          </div>
        )}

        {/* Coach Metrics & Live Pitch Display */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Note & Stability Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-midnight-900 border border-slate-200 dark:border-white/10 shadow-sm flex flex-col items-center justify-center text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Detected Singing Note
            </span>
            <div className="text-6xl sm:text-7xl font-black my-2">
              <span className={isInTune ? 'text-emerald-400' : 'text-cyan-400'}>
                {pitchData ? pitchData.fullNote : '--'}
              </span>
            </div>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
              {pitchData ? `${pitchData.freq} Hz (${cents > 0 ? `+${cents}` : cents} cents)` : 'Sing to detect'}
            </p>

            {/* Vocal Stability Meter */}
            <div className="w-full mt-6 pt-4 border-t border-slate-200 dark:border-white/10">
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="font-bold text-slate-400">Pitch Stability</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {stabilityScore}%
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-studio-blue via-studio-violet to-emerald-400 transition-all duration-150"
                  style={{ width: `${stabilityScore}%` }}
                />
              </div>
            </div>
          </div>

          {/* Scrolling Vocal Contour Trail (Canvas) */}
          <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-midnight-900 border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                Live Vocal Pitch Contour (Trail)
              </h3>
              <span className="text-xs text-slate-400">Target Line: Center</span>
            </div>

            <div className="relative w-full h-48 bg-slate-50 dark:bg-midnight-950 rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
              <canvas
                ref={canvasRef}
                width={640}
                height={200}
                className="w-full h-full block"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Target Note Matching Challenge */}
        <div className="p-6 rounded-3xl bg-white dark:bg-midnight-900 border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-400" />
                Target Note Pitch Challenge
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Match the target reference pitch and hold steady for 1 second.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold">
                <Trophy className="w-3.5 h-3.5" />
                <span>Score: {targetSuccessCount} Matches</span>
              </div>

              <button
                onClick={playReferenceNote}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isPlayingReference
                    ? 'bg-rose-600 text-white'
                    : 'bg-studio-blue text-white shadow-md'
                }`}
              >
                {isPlayingReference ? (
                  <>
                    <Square className="w-3.5 h-3.5" /> Stop Reference
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-white" /> Hear Target ({targetNote})
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Target Note Selector */}
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 pt-2">
            {['C3', 'E3', 'G3', 'A3', 'C4', 'E4', 'G4', 'A4'].map((note) => (
              <button
                key={note}
                onClick={() => {
                  setTargetNote(note);
                  if (isPlayingReference) stopReferenceNote();
                }}
                className={`py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                  targetNote === note
                    ? 'bg-emerald-500 text-white shadow-md'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {note}
              </button>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

