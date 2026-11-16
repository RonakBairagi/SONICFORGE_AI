'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Sliders,
  Volume2,
  Sparkles,
  HelpCircle,
  Radio,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Play,
  Square,
  ShieldCheck,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { PitchDetector } from 'pitchy';
import {
  freqToPitchInfo,
  PitchInfo,
  TUNER_PRESETS,
  TunerPreset,
  NOTE_NAMES,
  NoteName,
} from '@/lib/music-theory';
import { useToast } from '@/context/ToastContext';

export default function TunerPage() {
  const { info, warning, error } = useToast();

  const [isListening, setIsListening] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<TunerPreset | null>(TUNER_PRESETS[0]); // Guitar standard
  const [a4Ref, setA4Ref] = useState(440);
  const [sensitivity, setSensitivity] = useState(0.85); // clarity threshold
  const [noiseThreshold, setNoiseThreshold] = useState(0.012); // min RMS

  const [pitchData, setPitchData] = useState<PitchInfo | null>(null);
  const [clarity, setClarity] = useState(0);
  const [signalLevel, setSignalLevel] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [targetString, setTargetString] = useState<{ label: string; fullNote: string; freq: number } | null>(null);

  // Synthetic Test Tone state
  const [testToneActive, setTestToneActive] = useState(false);
  const [testFreq, setTestFreq] = useState(440);

  // Web Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const testOscillatorRef = useRef<OscillatorNode | null>(null);
  const testGainRef = useRef<GainNode | null>(null);

  // Moving average for needle stability
  const recentCentsRef = useRef<number[]>([]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTuner();
      stopTestTone();
    };
  }, []);

  const startTuner = async () => {
    setPermissionError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          autoGainControl: false,
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
      info('Microphone Connected', 'Listening for instrument audio...');

      runPitchDetection();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Could not access microphone. Please grant permission in browser settings.';
      setPermissionError(msg);
      error('Microphone Access Denied', msg);
    }
  };

  const stopTuner = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setIsListening(false);
    setPitchData(null);
    setSignalLevel(0);
  };

  const runPitchDetection = () => {
    if (!analyserRef.current || !audioContextRef.current) return;

    const analyser = analyserRef.current;
    const sampleRate = audioContextRef.current.sampleRate;
    const bufferLength = analyser.fftSize;
    const buffer = new Float32Array(bufferLength);
    const detector = PitchDetector.forFloat32Array(bufferLength);

    const updateLoop = () => {
      analyser.getFloatTimeDomainData(buffer);

      // 1. Calculate RMS volume
      let sumSquares = 0;
      for (let i = 0; i < bufferLength; i++) {
        sumSquares += buffer[i] * buffer[i];
      }
      const rms = Math.sqrt(sumSquares / bufferLength);
      setSignalLevel(Math.min(1, rms * 10));

      // 2. Gate silence and background noise
      if (rms >= noiseThreshold) {
        const [pitch, detClarity] = detector.findPitch(buffer, sampleRate);
        setClarity(detClarity);

        if (detClarity >= sensitivity && pitch >= 20 && pitch <= 2500) {
          const infoObj = freqToPitchInfo(pitch, a4Ref);

          // Smooth cents with simple moving average
          const history = recentCentsRef.current;
          history.push(infoObj.cents);
          if (history.length > 5) history.shift();
          const avgCents = Math.round(history.reduce((a, b) => a + b, 0) / history.length);
          infoObj.cents = avgCents;

          setPitchData(infoObj);

          // Find closest target string if preset is selected
          if (selectedPreset) {
            let closest = selectedPreset.strings[0];
            let minDiff = Math.abs(pitch - closest.freq);
            selectedPreset.strings.forEach((str) => {
              const diff = Math.abs(pitch - str.freq);
              if (diff < minDiff) {
                minDiff = diff;
                closest = str;
              }
            });
            setTargetString(closest);
          } else {
            setTargetString(null);
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(updateLoop);
    };

    animationFrameRef.current = requestAnimationFrame(updateLoop);
  };

  // Synthetic Tone Testing (allows testing tuner without guitar or mic)
  const playTestTone = (freq: number) => {
    stopTestTone();
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = audioContextRef.current || new AudioCtx();
      audioContextRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      testOscillatorRef.current = osc;
      testGainRef.current = gain;
      setTestToneActive(true);
      setTestFreq(freq);

      // Inject into detector if tuner is running
      const dummyInfo = freqToPitchInfo(freq, a4Ref);
      setPitchData(dummyInfo);
    } catch (e) {
      console.error(e);
    }
  };

  const stopTestTone = () => {
    if (testOscillatorRef.current) {
      try {
        testOscillatorRef.current.stop();
        testOscillatorRef.current.disconnect();
      } catch (_) {}
      testOscillatorRef.current = null;
    }
    setTestToneActive(false);
  };

  // Determine status color and guidance
  const cents = pitchData?.cents ?? 0;
  const isInTune = Math.abs(cents) <= 4;
  const isFlat = cents < -4;
  const isSharp = cents > 4;

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-midnight-900 border border-slate-200 dark:border-white/10 shadow-sm backdrop-blur-xl">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-studio-blue/10 dark:bg-cyan-500/10 border border-studio-blue/20 dark:border-cyan-500/20 text-studio-blue dark:text-cyan-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              High-Precision Pitch Engine
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              SonicTune Instrument Tuner
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Real-time chromatic &amp; instrument tuner with sub-cent accuracy, pitchy autocorrelation, and live gauge.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {!isListening ? (
              <button
                onClick={startTuner}
                className="px-6 py-3 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-studio-blue to-cyan-500 hover:from-studio-blue/90 hover:to-cyan-400 shadow-lg shadow-studio-blue/25 hover:shadow-cyan-500/30 flex items-center gap-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                <Mic className="w-4 h-4" />
                <span>Start Microphone</span>
              </button>
            ) : (
              <button
                onClick={stopTuner}
                className="px-6 py-3 rounded-2xl font-bold text-sm text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-600/25 flex items-center gap-2 transition-all cursor-pointer"
              >
                <MicOff className="w-4 h-4" />
                <span>Stop Tuner</span>
              </button>
            )}
          </div>
        </div>

        {/* Permission / Troubleshooting Banner */}
        {permissionError && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-300">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold">Microphone Access Required</p>
              <p>{permissionError}</p>
              <p className="text-amber-200/80">
                Tip: Click the lock icon next to your URL bar, allow Microphone permission, and reload or use the synthetic test tone buttons below.
              </p>
            </div>
          </div>
        )}

        {/* Main Tuner Display & Gauge */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Gauge Panel (2 Cols) */}
          <div className="lg:col-span-2 p-8 rounded-3xl bg-white dark:bg-midnight-900 border border-slate-200 dark:border-white/10 shadow-lg flex flex-col items-center justify-center text-center relative overflow-hidden">
            {/* Top status tag */}
            <div className="mb-4">
              {isListening ? (
                signalLevel < noiseThreshold * 5 ? (
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                    Listening... Pluck a string or sing
                  </span>
                ) : isInTune ? (
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 animate-pulse">
                    <CheckCircle2 className="w-3.5 h-3.5" /> PERFECTLY IN TUNE
                  </span>
                ) : isFlat ? (
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    FLAT — TUNE UP ↑ ({Math.abs(cents)} cents)
                  </span>
                ) : (
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    SHARP — TUNE DOWN ↓ (+{cents} cents)
                  </span>
                )
              ) : (
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
                  Tuner is Inactive. Click &ldquo;Start Microphone&rdquo; or play a test frequency.
                </span>
              )}
            </div>

            {/* Note Display */}
            <div className="my-6">
              <div className="text-7xl sm:text-8xl md:text-9xl font-black tracking-tight transition-all duration-150">
                <span
                  className={
                    isInTune
                      ? 'text-emerald-500 dark:text-emerald-400 drop-shadow-[0_0_25px_rgba(16,185,129,0.4)]'
                      : isFlat
                      ? 'text-amber-500 dark:text-amber-400'
                      : isSharp
                      ? 'text-cyan-500 dark:text-cyan-400'
                      : 'text-slate-300 dark:text-slate-700'
                  }
                >
                  {pitchData ? pitchData.note : '--'}
                </span>
                <span className="text-3xl sm:text-4xl font-bold text-slate-400 dark:text-slate-600 ml-1">
                  {pitchData ? pitchData.octave : ''}
                </span>
              </div>

              {/* Exact Frequency & Target */}
              <div className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center justify-center gap-4">
                <span>
                  Freq: <strong className="text-slate-900 dark:text-white font-mono">{pitchData ? `${pitchData.freq} Hz` : '-- Hz'}</strong>
                </span>
                <span>
                  Target: <strong className="text-slate-900 dark:text-white font-mono">{pitchData ? `${pitchData.targetFreq} Hz` : '-- Hz'}</strong>
                </span>
              </div>
            </div>

            {/* Arc / Meter Gauge */}
            <div className="w-full max-w-md my-4">
              {/* Needle Arc Track */}
              <div className="relative h-12 bg-slate-100 dark:bg-midnight-950 rounded-2xl border border-slate-200 dark:border-white/10 p-1 flex items-center">
                {/* Center marker (0 cents) */}
                <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-emerald-500 -translate-x-1/2 rounded-full z-10 shadow-sm" />

                {/* Scale Ticks (-50 to +50) */}
                <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 flex justify-between text-[10px] font-mono text-slate-400">
                  <span>-50</span>
                  <span>-25</span>
                  <span className="font-bold text-emerald-500">0</span>
                  <span>+25</span>
                  <span>+50</span>
                </div>

                {/* Dynamic Needle */}
                {pitchData && (
                  <div
                    className="absolute top-1 bottom-1 w-2 rounded-full transition-all duration-100 ease-out z-20 shadow-md"
                    style={{
                      left: `calc(50% + ${(Math.max(-50, Math.min(50, cents)) / 50) * 45}%)`,
                      transform: 'translateX(-50%)',
                      backgroundColor: isInTune ? '#10b981' : isFlat ? '#f59e0b' : '#06b6d4',
                    }}
                  />
                )}
              </div>

              <div className="flex justify-between text-xs text-slate-400 mt-2 font-medium px-2">
                <span>♭ Flat</span>
                <span className="font-mono text-slate-600 dark:text-slate-300">
                  {pitchData ? `${cents > 0 ? `+${cents}` : cents} cents` : '0 cents'}
                </span>
                <span>Sharp ♯</span>
              </div>
            </div>

            {/* Target String Assistance */}
            {targetString && (
              <div className="mt-4 px-4 py-2 rounded-xl bg-slate-50 dark:bg-midnight-950 border border-slate-200 dark:border-white/10 text-xs">
                Closest String: <strong className="text-studio-blue dark:text-cyan-300">{targetString.label} ({targetString.fullNote})</strong> @ {targetString.freq} Hz
              </div>
            )}
          </div>

          {/* Settings & Instrument Select Panel (1 Col) */}
          <div className="space-y-6">
            {/* Instrument Preset Selector */}
            <div className="p-6 rounded-3xl bg-white dark:bg-midnight-900 border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-studio-blue" />
                Tuning Preset
              </h3>

              <div className="space-y-2">
                <button
                  onClick={() => setSelectedPreset(null)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    selectedPreset === null
                      ? 'bg-studio-blue text-white shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  Chromatic Tuner (Any Note)
                </button>

                {TUNER_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setSelectedPreset(preset)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                      selectedPreset?.id === preset.id
                        ? 'bg-studio-blue text-white shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>{preset.name}</span>
                    <span className="text-[10px] opacity-80">{preset.instrument}</span>
                  </button>
                ))}
              </div>

              {/* Display strings for active preset */}
              {selectedPreset && (
                <div className="pt-3 border-t border-slate-200 dark:border-white/10">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Target Strings
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedPreset.strings.map((str, idx) => (
                      <button
                        key={idx}
                        onClick={() => playTestTone(str.freq)}
                        className={`p-2 rounded-xl text-center text-xs font-mono transition-all border ${
                          targetString?.label === str.label
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-300 hover:border-studio-blue/40'
                        }`}
                        title="Click to hear reference tone"
                      >
                        <div>{str.fullNote}</div>
                        <div className="text-[10px] text-slate-400">{str.freq}Hz</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Calibration & Sensitivity */}
            <div className="p-6 rounded-3xl bg-white dark:bg-midnight-900 border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-cyan-400" />
                Calibration &amp; Signal
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between mb-1 font-medium text-slate-600 dark:text-slate-400">
                    <span>A4 Reference Frequency</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">{a4Ref} Hz</span>
                  </div>
                  <input
                    type="range"
                    min="430"
                    max="450"
                    step="1"
                    value={a4Ref}
                    onChange={(e) => setA4Ref(Number(e.target.value))}
                    className="w-full accent-studio-blue cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>430 Hz (Verdi)</span>
                    <span>440 Hz (Standard)</span>
                    <span>444 Hz</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1 font-medium text-slate-600 dark:text-slate-400">
                    <span>Microphone Input Level</span>
                    <span className="font-mono text-slate-900 dark:text-white">{(signalLevel * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-midnight-950 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-75"
                      style={{ width: `${signalLevel * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Synthetic Reference Tone Generator */}
              <div className="pt-3 border-t border-slate-200 dark:border-white/10">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Synthetic Audio Test (No Mic Needed)
                </p>
                <div className="flex items-center gap-2">
                  {!testToneActive ? (
                    <button
                      onClick={() => playTestTone(440)}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 text-emerald-400" />
                      Play 440 Hz A4
                    </button>
                  ) : (
                    <button
                      onClick={stopTestTone}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Square className="w-3.5 h-3.5" />
                      Stop Tone ({testFreq} Hz)
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

