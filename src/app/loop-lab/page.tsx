'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  Square,
  Repeat,
  Volume2,
  Sliders,
  Download,
  Mic,
  MicOff,
  Upload,
  Layers,
  Sparkles,
  Music2,
  Plus,
  Trash2,
  VolumeX,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { audioBufferToWav } from '@/lib/wav-encoder';
import { useToast } from '@/context/ToastContext';

interface TrackState {
  id: string;
  name: string;
  color: string;
  volume: number; // 0 to 1.5 (default 1.0)
  pan: number; // -1 (left) to 1 (right)
  muted: boolean;
  solo: boolean;
  audioBuffer: AudioBuffer | null;
  audioUrl?: string;
  duration: number;
}

const DEFAULT_TRACKS: TrackState[] = [
  {
    id: 'track_1',
    name: 'Drums & Percussion',
    color: '#06b6d4', // cyan
    volume: 0.9,
    pan: 0,
    muted: false,
    solo: false,
    audioBuffer: null,
    duration: 0,
  },
  {
    id: 'track_2',
    name: 'Bass & Tanpura Drone',
    color: '#8b5cf6', // violet
    volume: 0.85,
    pan: -0.2,
    muted: false,
    solo: false,
    audioBuffer: null,
    duration: 0,
  },
  {
    id: 'track_3',
    name: 'Harmonium & Melodic Lead',
    color: '#3b82f6', // blue
    volume: 1.0,
    pan: 0.2,
    muted: false,
    solo: false,
    audioBuffer: null,
    duration: 0,
  },
  {
    id: 'track_4',
    name: 'Singing Vocals / Mic Input',
    color: '#10b981', // emerald
    volume: 1.0,
    pan: 0,
    muted: false,
    solo: false,
    audioBuffer: null,
    duration: 0,
  },
];

export default function LoopLabPage() {
  const { info, success, warning, error } = useToast();

  const [tracks, setTracks] = useState<TrackState[]>(DEFAULT_TRACKS);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [bpm, setBpm] = useState<number>(110);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [recordingTrackId, setRecordingTrackId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Web Audio Context
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const startTimeRef = useRef<number>(0);
  const playheadIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Initialize or get audio context
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContextRef.current = new AudioCtx();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  // Compute maximum project duration across tracks
  const maxDuration = Math.max(8, ...tracks.map((t) => t.duration || 0));

  // Stop all active playback nodes
  const stopPlayback = useCallback(() => {
    activeSourcesRef.current.forEach((src) => {
      try {
        src.stop();
        src.disconnect();
      } catch (_) { }
    });
    activeSourcesRef.current = [];
    if (playheadIntervalRef.current) {
      clearInterval(playheadIntervalRef.current);
      playheadIntervalRef.current = null;
    }
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  // Start multi-track playback
  const startPlayback = useCallback(() => {
    stopPlayback();
    const ctx = getAudioContext();

    const anySolo = tracks.some((t) => t.solo);
    const sources: AudioBufferSourceNode[] = [];

    tracks.forEach((track) => {
      if (!track.audioBuffer) return;
      if (track.muted) return;
      if (anySolo && !track.solo) return;

      const source = ctx.createBufferSource();
      source.buffer = track.audioBuffer;
      source.loop = isLooping;

      const gain = ctx.createGain();
      gain.gain.value = track.volume;

      // Stereo panner
      if (ctx.createStereoPanner) {
        const panner = ctx.createStereoPanner();
        panner.pan.value = track.pan;
        source.connect(gain);
        gain.connect(panner);
        panner.connect(ctx.destination);
      } else {
        source.connect(gain);
        gain.connect(ctx.destination);
      }

      source.start(0);
      sources.push(source);
    });

    activeSourcesRef.current = sources;
    startTimeRef.current = ctx.currentTime;
    setIsPlaying(true);

    // Playhead progress tick
    playheadIntervalRef.current = setInterval(() => {
      const elapsed = ctx.currentTime - startTimeRef.current;
      if (elapsed >= maxDuration && !isLooping) {
        stopPlayback();
      } else {
        setCurrentTime(elapsed % maxDuration);
      }
    }, 50);
  }, [tracks, isLooping, maxDuration, getAudioContext, stopPlayback]);

  // Generate synthetic test clip for demonstration
  const generateSynthClip = async (trackId: string, type: 'percussion' | 'drone' | 'melody') => {
    const ctx = getAudioContext();
    const sampleRate = ctx.sampleRate;
    const duration = 8; // 8 seconds loop (4 bars at 120 bpm)
    const numSamples = sampleRate * duration;
    const buffer = ctx.createBuffer(2, numSamples, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    if (type === 'percussion') {
      // Synthesize rhythmic kick & snare pattern
      const beatSamples = Math.floor(sampleRate * (60 / bpm));
      for (let i = 0; i < numSamples; i++) {
        const beatPos = i % beatSamples;
        const beatNum = Math.floor(i / beatSamples) % 4;

        if (beatNum === 0 || beatNum === 2) {
          // Kick pulse
          const env = Math.exp(-beatPos / (sampleRate * 0.08));
          const val = Math.sin((2 * Math.PI * 65 * beatPos) / sampleRate) * env * 0.7;
          left[i] = val;
          right[i] = val;
        } else {
          // Snare noise
          const env = Math.exp(-beatPos / (sampleRate * 0.12));
          const val = (Math.random() * 2 - 1) * env * 0.5;
          left[i] = val;
          right[i] = val;
        }
      }
    } else if (type === 'drone') {
      // Synthesize deep Tanpura Sa/Pa drone
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const sa = Math.sin(2 * Math.PI * 130.81 * t) * 0.3; // C3
        const pa = Math.sin(2 * Math.PI * 196.0 * t) * 0.2; // G3
        const saHigh = Math.sin(2 * Math.PI * 261.63 * t) * 0.15; // C4
        const sample = sa + pa + saHigh;
        left[i] = sample;
        right[i] = sample;
      }
    } else {
      // Synthesize melodic arpeggio
      const notes = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25]; // Pentatonic
      const noteDuration = sampleRate * 0.5;
      for (let i = 0; i < numSamples; i++) {
        const noteIdx = Math.floor(i / noteDuration) % notes.length;
        const freq = notes[noteIdx];
        const localPos = i % noteDuration;
        const env = Math.exp(-localPos / (sampleRate * 0.25));
        const val = Math.sin((2 * Math.PI * freq * i) / sampleRate) * env * 0.35;
        left[i] = val;
        right[i] = val;
      }
    }

    setTracks((prev) =>
      prev.map((t) =>
        t.id === trackId ? { ...t, audioBuffer: buffer, duration } : t
      )
    );
    success('Audio Generated', `Synthesized loop added to track.`);
  };

  // Upload local audio file into a track
  const handleFileUpload = async (trackId: string, file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const ctx = getAudioContext();
      const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);

      setTracks((prev) =>
        prev.map((t) =>
          t.id === trackId
            ? {
              ...t,
              audioBuffer: decodedBuffer,
              duration: decodedBuffer.duration,
              audioUrl: URL.createObjectURL(file),
            }
            : t
        )
      );
      success('Audio Imported', `Loaded "${file.name}" (${decodedBuffer.duration.toFixed(1)}s)`);
    } catch (err) {
      error('Import Error', 'Could not decode audio file.');
    }
  };

  // Microphone recording into a track
  const toggleRecordTrack = async (trackId: string) => {
    if (recordingTrackId === trackId) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setRecordingTrackId(null);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordedChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        const arrayBuffer = await blob.arrayBuffer();
        const ctx = getAudioContext();
        const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);

        setTracks((prev) =>
          prev.map((t) =>
            t.id === trackId
              ? {
                ...t,
                audioBuffer: decodedBuffer,
                duration: decodedBuffer.duration,
                audioUrl: URL.createObjectURL(blob),
              }
              : t
          )
        );
        success('Recording Saved', `Recorded ${decodedBuffer.duration.toFixed(1)}s into track.`);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecordingTrackId(trackId);
      info('Recording...', 'Sing or speak into your microphone. Click stop when finished.');
    } catch (err) {
      error('Recording Failed', 'Microphone permission was denied.');
    }
  };

  // Export full mixdown to WAV
  const exportMixdown = async () => {
    const hasAudio = tracks.some((t) => t.audioBuffer !== null);
    if (!hasAudio) {
      warning('Empty Project', 'Add or generate audio on at least one track before exporting.');
      return;
    }

    setIsExporting(true);
    info('Exporting Mix', 'Rendering audio tracks in offline context...');

    try {
      const sampleRate = 44100;
      const renderDuration = Math.max(4, Math.min(60, maxDuration));
      const offlineCtx = new OfflineAudioContext(2, sampleRate * renderDuration, sampleRate);

      const anySolo = tracks.some((t) => t.solo);

      tracks.forEach((track) => {
        if (!track.audioBuffer) return;
        if (track.muted) return;
        if (anySolo && !track.solo) return;

        const source = offlineCtx.createBufferSource();
        source.buffer = track.audioBuffer;

        const gain = offlineCtx.createGain();
        gain.gain.value = track.volume;

        if (offlineCtx.createStereoPanner) {
          const panner = offlineCtx.createStereoPanner();
          panner.pan.value = track.pan;
          source.connect(gain);
          gain.connect(panner);
          panner.connect(offlineCtx.destination);
        } else {
          source.connect(gain);
          gain.connect(offlineCtx.destination);
        }

        source.start(0);
      });

      const renderedBuffer = await offlineCtx.startRendering();
      const wavBlob = audioBufferToWav(renderedBuffer);

      // Trigger automatic browser file download
      const url = URL.createObjectURL(wavBlob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `SonicForge_LoopLab_Mix_${Date.now()}.wav`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      setIsExporting(false);
      success('Mixdown Exported!', `Downloaded ${renderDuration.toFixed(1)}s stereo WAV file.`);
    } catch (err: unknown) {
      setIsExporting(false);
      const msg = err instanceof Error ? err.message : 'Failed to render mixdown.';
      error('Export Error', msg);
    }
  };

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-midnight-900 border border-slate-200 dark:border-white/10 shadow-sm backdrop-blur-xl">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-studio-blue/10 dark:bg-cyan-500/10 border border-studio-blue/20 dark:border-cyan-500/20 text-studio-blue dark:text-cyan-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Layers className="w-3.5 h-3.5" />
              Multi-Track Audio Arranger
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              Sonic Loop Lab &amp; Mixer
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Multi-track timeline with live recording, file import, volume/pan faders, and offline stereo WAV export.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={exportMixdown}
              disabled={isExporting}
              className="px-5 py-2.5 rounded-2xl font-bold text-xs text-white bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 shadow-md shadow-emerald-600/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Rendering...' : 'Export Mix (WAV)'}</span>
            </button>
          </div>
        </div>

        {/* Master Transport Bar */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-midnight-900 border border-slate-200 dark:border-white/10 shadow-sm flex flex-wrap items-center justify-between gap-4">
          {/* Play / Stop / Loop */}
          <div className="flex items-center gap-2">
            {!isPlaying ? (
              <button
                onClick={startPlayback}
                className="w-11 h-11 rounded-xl bg-studio-blue hover:bg-studio-blue/90 text-white flex items-center justify-center shadow-md shadow-studio-blue/25 transition-transform active:scale-95 cursor-pointer"
                title="Play All Tracks"
              >
                <Play className="w-5 h-5 fill-white" />
              </button>
            ) : (
              <button
                onClick={stopPlayback}
                className="w-11 h-11 rounded-xl bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-md shadow-rose-600/25 transition-transform active:scale-95 cursor-pointer"
                title="Pause / Stop"
              >
                <Square className="w-4 h-4 fill-white" />
              </button>
            )}

            <button
              onClick={() => setIsLooping(!isLooping)}
              className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${isLooping
                  ? 'bg-studio-violet/20 border-studio-violet text-studio-violet dark:text-purple-300'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-white/10 text-slate-400'
                }`}
              title="Toggle Timeline Loop"
            >
              <Repeat className="w-4 h-4" />
            </button>

            {/* Time readout */}
            <div className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 ml-2">
              {currentTime.toFixed(1)}s / {maxDuration.toFixed(1)}s
            </div>
          </div>

          {/* BPM & Grid */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">Tempo:</span>
              <input
                type="number"
                min="60"
                max="200"
                value={bpm}
                onChange={(e) => setBpm(Number(e.target.value))}
                className="w-16 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs font-bold font-mono text-slate-900 dark:text-white text-center"
              />
              <span className="text-xs text-slate-400 font-semibold">BPM</span>
            </div>
          </div>
        </div>

        {/* Tracks Timeline View */}
        <div className="space-y-3">
          {tracks.map((track) => (
            <div
              key={track.id}
              className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-midnight-900 border border-slate-200 dark:border-white/10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              {/* Left: Track Info & Color Tag */}
              <div className="w-full md:w-56 shrink-0 flex items-center gap-3">
                <div
                  className="w-3 h-10 rounded-full shrink-0"
                  style={{ backgroundColor: track.color }}
                />
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {track.name}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <button
                      onClick={() =>
                        setTracks((prev) =>
                          prev.map((t) => (t.id === track.id ? { ...t, muted: !t.muted } : t))
                        )
                      }
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${track.muted
                          ? 'bg-rose-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}
                    >
                      M
                    </button>
                    <button
                      onClick={() =>
                        setTracks((prev) =>
                          prev.map((t) => (t.id === track.id ? { ...t, solo: !t.solo } : t))
                        )
                      }
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${track.solo
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}
                    >
                      S
                    </button>
                  </div>
                </div>
              </div>

              {/* Center: Track Clip Lane & Waveform Simulation */}
              <div className="flex-1 min-w-0 h-16 rounded-xl bg-slate-50 dark:bg-midnight-950 border border-slate-200 dark:border-white/10 p-2 flex items-center relative overflow-hidden">
                {/* Playhead Marker */}
                {isPlaying && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-20"
                    style={{ left: `${(currentTime / maxDuration) * 100}%` }}
                  />
                )}

                {track.audioBuffer ? (
                  <div
                    className="h-full rounded-lg px-3 flex items-center justify-between text-xs font-semibold text-white shadow-sm relative overflow-hidden w-full"
                    style={{ backgroundColor: `${track.color}40`, borderColor: track.color }}
                  >
                    <span className="truncate">Audio Clip ({track.duration.toFixed(1)}s)</span>
                    <button
                      onClick={() =>
                        setTracks((prev) =>
                          prev.map((t) =>
                            t.id === track.id ? { ...t, audioBuffer: null, duration: 0 } : t
                          )
                        )
                      }
                      className="p-1 rounded hover:bg-black/30 text-white"
                      title="Clear Clip"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="w-full flex items-center justify-center gap-2 text-xs text-slate-400">
                    <span>No audio clip loaded</span>
                    <button
                      onClick={() =>
                        generateSynthClip(
                          track.id,
                          track.id === 'track_1' ? 'percussion' : track.id === 'track_2' ? 'drone' : 'melody'
                        )
                      }
                      className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 font-medium text-[11px]"
                    >
                      + Demo Synth
                    </button>
                  </div>
                )}
              </div>

              {/* Right: Controls (Vol, Pan, Mic, File) */}
              <div className="flex items-center gap-3 shrink-0">
                {/* Volume slider */}
                <div className="w-24">
                  <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                    <span>Vol</span>
                    <span>{(track.volume * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.05"
                    value={track.volume}
                    onChange={(e) =>
                      setTracks((prev) =>
                        prev.map((t) =>
                          t.id === track.id ? { ...t, volume: Number(e.target.value) } : t
                        )
                      )
                    }
                    className="w-full accent-studio-blue"
                  />
                </div>

                {/* Record Mic Button */}
                <button
                  onClick={() => toggleRecordTrack(track.id)}
                  className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${recordingTrackId === track.id
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  title="Record Microphone into Track"
                >
                  <Mic className="w-4 h-4" />
                </button>

                {/* Import File Button */}
                <label
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                  title="Import Audio File (WAV, MP3)"
                >
                  <Upload className="w-4 h-4" />
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(track.id, e.target.files[0]);
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

