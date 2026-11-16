'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Layers,
  Upload,
  Sparkles,
  Sliders,
  Volume2,
  Download,
  Play,
  Pause,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Radio,
  FileAudio,
  Zap,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useToast } from '@/context/ToastContext';

interface StemArtifact {
  id: string;
  name: string;
  downloadUrl: string;
  volume: number;
  muted: boolean;
  solo: boolean;
  audioRef?: HTMLAudioElement | null;
}

const PRESETS = [
  {
    id: '4_tracks',
    name: '4 Stems (Standard Band)',
    desc: 'Vocals, Drums, Bass, and Other Instruments (RoFormer engine).',
    badge: 'Popular',
  },
  {
    id: '2_tracks',
    name: '2 Stems (Vocal & Backing)',
    desc: 'Isolated Lead Acapella and full Instrumental backing track.',
    badge: 'Fast',
  },
  {
    id: '6_tracks',
    name: '6 Stems (Full Arrangement)',
    desc: 'Vocals, Drums, Bass, Guitar, Piano, and Remainder.',
    badge: 'Deep AI',
  },
  {
    id: 'lead_back',
    name: 'Lead vs Backing Vocals',
    desc: 'Separates main vocal performance from choir & harmonies.',
    badge: 'Vocal',
  },
];

export default function StemsPage() {
  const { info, success, warning, error } = useToast();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>('4_tracks');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Completed stems
  const [stems, setStems] = useState<StemArtifact[]>([]);
  const [isMasterPlaying, setIsMasterPlaying] = useState<boolean>(false);

  // Audio elements for synchronized mixer
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|flac|ogg|m4a)$/i)) {
      setErrorMessage('Please select a valid audio file (MP3, WAV, FLAC, or OGG).');
      return;
    }

    if (file.size > 30 * 1024 * 1024) {
      setErrorMessage('File size exceeds 30MB limit. Please choose a shorter track.');
      return;
    }

    setSelectedFile(file);
    info('Audio File Loaded', `${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)`);
  };

  const handleStartSeparation = async () => {
    if (!selectedFile) {
      warning('No file selected', 'Please select an audio file first.');
      return;
    }

    setIsProcessing(true);
    setProgress(15);
    setStatusText('Ingesting and uploading audio to Neural Analog...');
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('audio', selectedFile);
      formData.append('preset', selectedPreset);

      const response = await fetch('/api/stems/split', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errJson.error || `Upload failed with status ${response.status}`);
      }

      const data = await response.json();
      const creationId = data.creationId;
      setProgress(40);
      setStatusText('Neural models separating stems (RoFormer inference)...');

      // Poll status
      pollIntervalRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/stems/status?creationId=${creationId}`);
          if (!pollRes.ok) return;

          const pollData = await pollRes.json();
          if (pollData.isFailed) {
            clearInterval(pollIntervalRef.current!);
            setIsProcessing(false);
            setErrorMessage(pollData.errorMessage || 'Stem separation failed on provider.');
            error('Separation Failed', pollData.errorMessage);
            return;
          }

          if (pollData.isComplete) {
            clearInterval(pollIntervalRef.current!);
            setProgress(100);
            setIsProcessing(false);
            setStatusText('Complete!');

            const stemArtifacts: StemArtifact[] = (pollData.stems || []).map(
              (s: { id: string; name: string }, idx: number) => ({
                id: s.id,
                name: s.name || `Stem ${idx + 1}`,
                downloadUrl: `/api/stems/download/${s.id}`,
                volume: 1.0,
                muted: false,
                solo: false,
              })
            );

            setStems(stemArtifacts);
            success('Stems Separated!', `Generated ${stemArtifacts.length} isolated audio tracks.`);
          } else {
            setProgress((prev) => Math.min(92, prev + 5));
          }
        } catch (_) {}
      }, 3500);
    } catch (err: unknown) {
      setIsProcessing(false);
      const msg = err instanceof Error ? err.message : 'Separation failed';
      setErrorMessage(msg);
      error('Separation Error', msg);
    }
  };

  // Synchronized Master Playback
  const toggleMasterPlay = () => {
    if (isMasterPlaying) {
      audioElementsRef.current.forEach((audio) => audio.pause());
      setIsMasterPlaying(false);
    } else {
      const anySolo = stems.some((s) => s.solo);
      audioElementsRef.current.forEach((audio, id) => {
        const stem = stems.find((s) => s.id === id);
        if (stem) {
          if (stem.muted || (anySolo && !stem.solo)) {
            audio.volume = 0;
          } else {
            audio.volume = stem.volume;
          }
          audio.currentTime = 0;
          audio.play().catch(() => {});
        }
      });
      setIsMasterPlaying(true);
    }
  };

  // Update volume and solo/mute on audio elements
  const updateStemState = (id: string, updates: Partial<StemArtifact>) => {
    setStems((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, ...updates } : s));
      const anySolo = next.some((s) => s.solo);

      audioElementsRef.current.forEach((audio, audioId) => {
        const item = next.find((s) => s.id === audioId);
        if (item) {
          if (item.muted || (anySolo && !item.solo)) {
            audio.volume = 0;
          } else {
            audio.volume = item.volume;
          }
        }
      });

      return next;
    });
  };

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-midnight-900 border border-slate-200 dark:border-white/10 shadow-sm backdrop-blur-xl">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-studio-violet/10 dark:bg-purple-500/10 border border-studio-violet/20 dark:border-purple-500/20 text-studio-violet dark:text-purple-300 text-xs font-bold uppercase tracking-wider mb-2">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              Neural Analog Audio Engine
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              Neural Stem Separation Lab
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              GPU-accelerated RoFormer transformer models to isolate Vocals, Drums, Bass, Guitars, and Instruments.
            </p>
          </div>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Configuration & Preset Selection */}
        <div className="p-6 rounded-3xl bg-white dark:bg-midnight-900 border border-slate-200 dark:border-white/10 shadow-sm space-y-5">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-studio-blue" />
            1. Select Separation Preset
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPreset(p.id)}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  selectedPreset === p.id
                    ? 'bg-studio-violet/10 border-studio-violet shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-white/5'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{p.name}</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-studio-violet/20 text-studio-violet dark:text-purple-300">
                    {p.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {p.desc}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Upload & Run Action */}
        <div className="p-8 rounded-3xl bg-white dark:bg-midnight-900 border border-slate-200 dark:border-white/10 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-studio-blue/15 border border-studio-blue/30 mx-auto flex items-center justify-center text-studio-blue">
            <FileAudio className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {selectedFile ? selectedFile.name : 'Upload Audio Track to Split'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Supports MP3, WAV, FLAC, OGG (Max 30MB).
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <label className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-white/10 cursor-pointer transition-all flex items-center gap-2">
              <Upload className="w-4 h-4" />
              <span>{selectedFile ? 'Change File' : 'Browse Audio File'}</span>
              <input
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </label>

            {selectedFile && !isProcessing && (
              <button
                onClick={handleStartSeparation}
                className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-studio-blue via-indigo-600 to-cyan-500 hover:from-studio-blue/90 shadow-md shadow-studio-blue/25 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Separate Stems with Neural Analog</span>
              </button>
            )}
          </div>

          {/* Processing Progress Bar */}
          {isProcessing && (
            <div className="max-w-md mx-auto pt-4 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-studio-blue dark:text-cyan-300 flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {statusText}
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{progress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-midnight-950 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-studio-blue via-studio-violet to-cyan-400 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Separated Stems Multi-Channel Mixer */}
        {stems.length > 0 && (
          <div className="p-6 rounded-3xl bg-white dark:bg-midnight-900 border border-slate-200 dark:border-white/10 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  Separated Stems Mixer
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Play stems in synchronized alignment, adjust volume, or solo individual tracks.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMasterPlay}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    isMasterPlaying
                      ? 'bg-rose-600 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                  }`}
                >
                  {isMasterPlaying ? (
                    <>
                      <Pause className="w-4 h-4 fill-white" /> Pause Mix
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-white" /> Play All in Sync
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Stems List */}
            <div className="space-y-3">
              {stems.map((stem) => (
                <div
                  key={stem.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Stem name */}
                  <div className="w-48 shrink-0 flex items-center gap-2.5">
                    <div className="w-2.5 h-8 rounded-full bg-studio-blue" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white capitalize">
                        {stem.name.replace(/_/g, ' ')}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-mono">Neural Stems</span>
                    </div>
                  </div>

                  {/* Audio Element & Controls */}
                  <div className="flex-1 min-w-0 flex items-center gap-3">
                    <audio
                      src={stem.downloadUrl}
                      ref={(el) => {
                        if (el) audioElementsRef.current.set(stem.id, el);
                        else audioElementsRef.current.delete(stem.id);
                      }}
                      className="w-full h-8"
                      controls
                    />
                  </div>

                  {/* Mute, Solo, Volume, Download */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateStemState(stem.id, { muted: !stem.muted })}
                        className={`px-2 py-1 rounded text-[10px] font-bold ${
                          stem.muted
                            ? 'bg-rose-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        M
                      </button>
                      <button
                        onClick={() => updateStemState(stem.id, { solo: !stem.solo })}
                        className={`px-2 py-1 rounded text-[10px] font-bold ${
                          stem.solo
                            ? 'bg-amber-500 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        S
                      </button>
                    </div>

                    <a
                      href={stem.downloadUrl}
                      download={`stem_${stem.name}.wav`}
                      className="p-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors"
                      title="Download Stem (WAV)"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
