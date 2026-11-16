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
  Link as LinkIcon,
  HelpCircle,
  VolumeX,
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

  // Mode: File Upload or Public Link
  const [inputMode, setInputMode] = useState<'file' | 'link'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [publicUrl, setPublicUrl] = useState<string>('');
  const [selectedPreset, setSelectedPreset] = useState<string>('4_tracks');

  // Processing state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [diagnosticTip, setDiagnosticTip] = useState<string | null>(null);

  // Result stems
  const [stems, setStems] = useState<StemArtifact[]>([]);
  const [isMasterPlaying, setIsMasterPlaying] = useState<boolean>(false);
  const [masterVolume, setMasterVolume] = useState<number>(1.0);

  // Synchronized audio mixer references
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      audioRefs.current.forEach((audio) => {
        audio.pause();
        audio.src = '';
      });
      audioRefs.current.clear();
    };
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    setDiagnosticTip(null);
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|flac|ogg|m4a)$/i)) {
      setErrorMessage('Please select a valid audio file (MP3, WAV, FLAC, or OGG).');
      return;
    }

    // Inform user if file is large for serverless
    if (file.size > 4.5 * 1024 * 1024) {
      setDiagnosticTip(
        `Note: This file is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Serverless direct uploads have a 4.5MB payload limit on standard hosting. If upload is rejected, use a compressed MP3 or the Public Link Import tab below.`
      );
    }

    if (file.size > 40 * 1024 * 1024) {
      setErrorMessage('File size exceeds 40MB limit. Please choose a shorter track.');
      return;
    }

    setSelectedFile(file);
    info('Audio File Loaded', `${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)`);
  };

  const handleStartSeparation = async () => {
    setErrorMessage(null);
    setDiagnosticTip(null);

    if (inputMode === 'file' && !selectedFile) {
      warning('No file selected', 'Please choose an audio file first.');
      return;
    }

    if (inputMode === 'link' && !publicUrl.trim()) {
      warning('No link entered', 'Please enter a valid public music link or audio URL.');
      return;
    }

    setIsProcessing(true);
    setProgress(15);
    setStatusText(
      inputMode === 'file'
        ? 'Uploading audio to Neural Analog separation engine...'
        : 'Importing public track into Neural Analog...'
    );

    try {
      let response: Response;

      if (inputMode === 'file') {
        const formData = new FormData();
        formData.append('audio', selectedFile!);
        formData.append('preset', selectedPreset);

        response = await fetch('/api/stems/split', {
          method: 'POST',
          body: formData,
        });
      } else {
        response = await fetch('/api/stems/link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: publicUrl.trim(), preset: selectedPreset }),
        });
      }

      if (!response.ok) {
        let msg = `Request failed with status code ${response.status}`;
        if (response.status === 413) {
          msg = 'File exceeds maximum serverless payload limit (4.5 MB). Please choose a compressed audio file or paste a public link in the Link Import tab.';
          setDiagnosticTip('Tip: Use the "Public Music Link Import" tab for large songs from Suno, YouTube, or direct MP3 URLs.');
        } else if (response.status === 504) {
          msg = 'Serverless gateway timed out while ingesting the audio track. Please try again with a shorter track.';
        } else {
          try {
            const errJson = await response.json();
            msg = errJson.error || msg;
          } catch {
            const text = await response.text();
            if (text) msg = text;
          }
        }
        throw new Error(msg);
      }

      const data = await response.json();
      const creationId = data.creationId;
      const initialStems = data.stems || [];

      setProgress(40);
      setStatusText('Neural models performing RoFormer stem isolation...');

      // Store initial stems
      const formattedStems: StemArtifact[] = initialStems.map((s: { stem_id: string; stem?: string }, idx: number) => ({
        id: s.stem_id,
        name: s.stem ? s.stem.charAt(0).toUpperCase() + s.stem.slice(1) : `Stem ${idx + 1}`,
        downloadUrl: `/api/stems/download/${s.stem_id}`,
        volume: 1.0,
        muted: false,
        solo: false,
      }));

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

          if (pollData.statusDetails) {
            setStatusText(pollData.statusDetails);
          }

          if (pollData.isComplete) {
            clearInterval(pollIntervalRef.current!);
            setProgress(100);
            setIsProcessing(false);
            setStatusText('Separation complete! Initializing stem mixer...');

            // If initial stems was empty, construct from preset
            if (formattedStems.length > 0) {
              setStems(formattedStems);
            } else {
              // Fallback default stems for preset
              const defaultNames =
                selectedPreset === '2_tracks'
                  ? ['Vocals', 'Instrumental']
                  : selectedPreset === 'lead_back'
                  ? ['Lead Vocals', 'Backing Vocals', 'Instrumental']
                  : ['Vocals', 'Drums', 'Bass', 'Other Instruments'];

              setStems(
                defaultNames.map((name, i) => ({
                  id: `stem-${creationId}-${i}`,
                  name,
                  downloadUrl: `/api/stems/download/${creationId}?index=${i}`,
                  volume: 1.0,
                  muted: false,
                  solo: false,
                }))
              );
            }

            success('Stems Ready!', 'Your isolated audio stems have been generated.');
          }
        } catch (pollErr) {
          console.warn('Poll error:', pollErr);
        }
      }, 3500);
    } catch (err: unknown) {
      setIsProcessing(false);
      setProgress(0);
      const msg = err instanceof Error ? err.message : 'Stem separation failed';
      setErrorMessage(msg);
      error('Stem Separation Error', msg);
    }
  };

  // Master playback control
  const toggleMasterPlay = () => {
    const nextState = !isMasterPlaying;
    setIsMasterPlaying(nextState);

    stems.forEach((stem) => {
      let audio = audioRefs.current.get(stem.id);
      if (!audio) {
        audio = new Audio(stem.downloadUrl);
        audio.loop = true;
        audioRefs.current.set(stem.id, audio);
      }

      // Check solo
      const anySolo = stems.some((s) => s.solo);
      const effectiveMute = stem.muted || (anySolo && !stem.solo);
      audio.muted = effectiveMute;
      audio.volume = stem.volume * masterVolume;

      if (nextState) {
        audio.currentTime = 0;
        audio.play().catch((err) => console.warn('Audio play error:', err));
      } else {
        audio.pause();
      }
    });
  };

  const handleVolumeChange = (stemId: string, vol: number) => {
    setStems((prev) =>
      prev.map((s) => {
        if (s.id === stemId) {
          const audio = audioRefs.current.get(stemId);
          if (audio) audio.volume = vol * masterVolume;
          return { ...s, volume: vol };
        }
        return s;
      })
    );
  };

  const handleToggleMute = (stemId: string) => {
    setStems((prev) => {
      const updated = prev.map((s) => (s.id === stemId ? { ...s, muted: !s.muted } : s));
      const anySolo = updated.some((s) => s.solo);

      updated.forEach((s) => {
        const audio = audioRefs.current.get(s.id);
        if (audio) {
          audio.muted = s.muted || (anySolo && !s.solo);
        }
      });
      return updated;
    });
  };

  const handleToggleSolo = (stemId: string) => {
    setStems((prev) => {
      const updated = prev.map((s) => (s.id === stemId ? { ...s, solo: !s.solo } : s));
      const anySolo = updated.some((s) => s.solo);

      updated.forEach((s) => {
        const audio = audioRefs.current.get(s.id);
        if (audio) {
          audio.muted = s.muted || (anySolo && !s.solo);
        }
      });
      return updated;
    });
  };

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Header Hero */}
        <div className="relative rounded-3xl glass-panel-elevated p-6 sm:p-8 overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-champagne-400/15 border border-champagne-400/30 text-champagne-700 dark:text-champagne-300 text-xs font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Neural Analog RoFormer Architecture • 24-Bit Studio
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-charcoal-900 dark:text-white">
              Neural Stem Lab
            </h1>
            <p className="mt-2 text-sm text-muted">
              Deconstruct full master recordings into pristine isolated tracks: Vocals, Drums, Bass, and Instruments using state-of-the-art neural source separation.
            </p>
          </div>
        </div>

        {/* Diagnostic Error Banner */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-3 text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="font-bold text-sm">Separation Failed</p>
              <p className="text-xs opacity-90">{errorMessage}</p>
              {diagnosticTip && (
                <p className="text-xs text-champagne-700 dark:text-champagne-300 pt-1 font-medium">
                  {diagnosticTip}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Input Configuration & Upload Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Source Input (File / Link) */}
          <div className="lg:col-span-2 glass-panel rounded-3xl p-6 space-y-6">
            {/* Mode Selector Tabs */}
            <div className="flex items-center p-1 rounded-2xl bg-cream-100/70 dark:bg-charcoal-800/70 border border-plum-700/15 dark:border-white/5">
              <button
                onClick={() => setInputMode('file')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  inputMode === 'file'
                    ? 'bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white shadow-sm border border-champagne-400/30'
                    : 'text-muted hover:text-charcoal-900 dark:hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Audio File</span>
              </button>
              <button
                onClick={() => setInputMode('link')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  inputMode === 'link'
                    ? 'bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white shadow-sm border border-champagne-400/30'
                    : 'text-muted hover:text-charcoal-900 dark:hover:text-white'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Import Music Link (Suno / YouTube / Spotify)</span>
              </button>
            </div>

            {inputMode === 'file' ? (
              /* Drag & Drop File Upload Area */
              <div>
                <label className="border-2 border-dashed border-plum-600/30 dark:border-champagne-400/20 hover:border-champagne-400/50 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer bg-cream-50/40 dark:bg-charcoal-950/40 hover:bg-cream-100/50 dark:hover:bg-charcoal-850/50 transition-all group">
                  <input
                    type="file"
                    accept="audio/mp3,audio/wav,audio/flac,audio/ogg,audio/m4a"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-plum-600 to-champagne-400 flex items-center justify-center text-charcoal-950 mb-3 shadow-lg shadow-plum-950/20 group-hover:scale-105 transition-transform">
                    <FileAudio className="w-7 h-7" />
                  </div>
                  <span className="font-bold text-sm text-charcoal-900 dark:text-white">
                    {selectedFile ? selectedFile.name : 'Select or drop an audio track'}
                  </span>
                  <span className="text-xs text-muted mt-1">
                    {selectedFile
                      ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for separation`
                      : 'Supports MP3, WAV, FLAC, OGG (recommended < 4.5MB for instant serverless direct upload)'}
                  </span>
                </label>

                {diagnosticTip && (
                  <p className="mt-2 text-xs text-amber-700 dark:text-amber-300 font-medium">
                    {diagnosticTip}
                  </p>
                )}
              </div>
            ) : (
              /* Public Music Link Input */
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-muted">
                  Public Music URL or Audio Stream
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      type="url"
                      value={publicUrl}
                      onChange={(e) => setPublicUrl(e.target.value)}
                      placeholder="https://suno.com/song/... or direct MP3 URL"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/70 dark:bg-charcoal-950/60 border border-plum-700/20 dark:border-white/10 text-xs font-medium focus:outline-none focus:border-champagne-400"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-muted">
                  Bypasses serverless file upload limits entirely. Neural Analog downloads and separates directly from high-speed provider networks.
                </p>
              </div>
            )}

            {/* Action Trigger */}
            <button
              onClick={handleStartSeparation}
              disabled={isProcessing}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-plum-600 via-plum-700 to-champagne-600 hover:from-plum-500 hover:to-champagne-500 text-white font-extrabold text-sm shadow-xl shadow-plum-950/30 flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Separating Stems...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-champagne-300" />
                  <span>Start Neural Stem Separation</span>
                </>
              )}
            </button>
          </div>

          {/* Right Col: Preset Selection */}
          <div className="glass-panel rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-charcoal-900 dark:text-white">
                Separation Preset
              </span>
              <span className="text-[10px] font-bold text-champagne-600 dark:text-champagne-300 uppercase tracking-wider">
                RoFormer v2
              </span>
            </div>

            <div className="space-y-2.5">
              {PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => setSelectedPreset(preset.id)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    selectedPreset === preset.id
                      ? 'bg-plum-600/15 border-champagne-400/40 shadow-sm'
                      : 'bg-white/40 dark:bg-charcoal-950/40 border-plum-700/15 dark:border-white/5 hover:border-champagne-400/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-charcoal-900 dark:text-white">
                      {preset.name}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-champagne-400/20 text-champagne-700 dark:text-champagne-300">
                      {preset.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted mt-1">{preset.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Processing Progress Bar */}
        {isProcessing && (
          <div className="glass-panel rounded-3xl p-6 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-charcoal-900 dark:text-white flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-champagne-400" />
                {statusText}
              </span>
              <span className="font-mono font-bold text-champagne-600 dark:text-champagne-400">
                {progress}%
              </span>
            </div>
            <div className="h-2 w-full bg-cream-200 dark:bg-charcoal-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-plum-600 to-champagne-400 transition-all duration-500 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Completed Multi-Channel Mixer */}
        {stems.length > 0 && (
          <div className="glass-panel-elevated rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-plum-700/15 dark:border-white/10">
              <div>
                <h2 className="font-extrabold text-lg text-charcoal-900 dark:text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-champagne-400" />
                  Synchronized Stem Mixer
                </h2>
                <p className="text-xs text-muted">
                  Control channel gain, solo vocal harmonies, mute backing instruments, and download lossless WAV stems.
                </p>
              </div>

              {/* Master Play Button */}
              <button
                onClick={toggleMasterPlay}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-champagne-500 to-champagne-600 hover:from-champagne-400 hover:to-champagne-500 text-charcoal-950 font-extrabold text-xs shadow-lg flex items-center gap-2"
              >
                {isMasterPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isMasterPlaying ? 'Pause Master' : 'Play All Stems'}</span>
              </button>
            </div>

            {/* Stem Track Sliders */}
            <div className="space-y-3">
              {stems.map((stem) => (
                <div
                  key={stem.id}
                  className="p-4 rounded-2xl bg-white/50 dark:bg-charcoal-950/60 border border-plum-700/15 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-[140px]">
                    <div className="w-8 h-8 rounded-lg bg-plum-600/20 border border-champagne-400/30 flex items-center justify-center text-champagne-500 text-xs font-bold">
                      {stem.name.charAt(0)}
                    </div>
                    <span className="font-bold text-xs text-charcoal-900 dark:text-white">
                      {stem.name}
                    </span>
                  </div>

                  {/* Volume Slider */}
                  <div className="flex items-center gap-3 flex-1 max-w-xs w-full">
                    <Volume2 className="w-4 h-4 text-muted shrink-0" />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={stem.volume}
                      onChange={(e) => handleVolumeChange(stem.id, parseFloat(e.target.value))}
                      className="w-full accent-champagne-400 h-1.5 bg-cream-200 dark:bg-charcoal-800 rounded-lg cursor-pointer"
                    />
                    <span className="font-mono text-[10px] text-muted w-8 text-right">
                      {Math.round(stem.volume * 100)}%
                    </span>
                  </div>

                  {/* Solo & Mute Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleSolo(stem.id)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                        stem.solo
                          ? 'bg-amber-400 text-charcoal-950 border-amber-500 font-extrabold'
                          : 'bg-cream-100 dark:bg-charcoal-800 text-muted border-transparent hover:text-charcoal-900 dark:hover:text-white'
                      }`}
                    >
                      SOLO
                    </button>

                    <button
                      onClick={() => handleToggleMute(stem.id)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                        stem.muted
                          ? 'bg-rose-500 text-white border-rose-600 font-extrabold'
                          : 'bg-cream-100 dark:bg-charcoal-800 text-muted border-transparent hover:text-charcoal-900 dark:hover:text-white'
                      }`}
                    >
                      MUTE
                    </button>

                    <a
                      href={stem.downloadUrl}
                      download={`${stem.name.toLowerCase()}_stem.wav`}
                      className="p-1.5 rounded-lg bg-champagne-400/15 border border-champagne-400/30 text-champagne-700 dark:text-champagne-300 hover:bg-champagne-400/25 transition-colors ml-2"
                      title={`Download ${stem.name} WAV`}
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
