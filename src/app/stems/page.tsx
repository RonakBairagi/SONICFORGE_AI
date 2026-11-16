'use client';

import React, { useState } from 'react';
import {
  Layers,
  Upload,
  AlertCircle,
  Sparkles,
  Sliders,
  Volume2,
  Download,
  Info,
  ShieldAlert,
  FileAudio,
  CheckCircle2,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useToast } from '@/context/ToastContext';

export default function StemsPage() {
  const { info, warning } = useToast();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Check whether an external source-separation provider is active
  const isSeparationConfigured = false; // Requires AUDIO_SEPARATION_API_KEY on deployment

  const handleFileDrop = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    // File validation: audio only, max 25MB
    if (!file.type.startsWith('audio/')) {
      setFileError('Please select a valid audio file (MP3, WAV, FLAC, or OGG).');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setFileError('File size exceeds the 25MB maximum limit.');
      return;
    }

    setSelectedFile(file);
    info('Audio File Selected', `"${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)} MB)`);
  };

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-midnight-900 border border-slate-200 dark:border-white/10 shadow-sm backdrop-blur-xl">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-studio-violet/10 dark:bg-purple-500/10 border border-studio-violet/20 dark:border-purple-500/20 text-studio-violet dark:text-purple-300 text-xs font-bold uppercase tracking-wider mb-2">
              <Layers className="w-3.5 h-3.5" />
              Source Separation Architecture
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              Stem &amp; Arrangement Lab
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Separate mixed songs into isolated Stems (Vocals, Drums, Bass, Accompaniment) with neural AI.
            </p>
          </div>
        </div>

        {/* Clear Engineering Status Banner */}
        <div className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-slate-800 dark:text-slate-200 space-y-3">
          <div className="flex items-center gap-2 text-amber-500 dark:text-amber-400 font-bold text-sm">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span>AI Separation Provider Setup Required</span>
          </div>
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            True musical source separation requires deep neural networks (such as <strong>Demucs v4</strong> or <strong>Spleeter</strong>) hosted on dedicated GPU infrastructure. SonicForge AI maintains strict engineering integrity: we never simulate separation with simple EQ filters.
          </p>
          <div className="p-4 rounded-2xl bg-white/40 dark:bg-midnight-950/60 border border-amber-500/20 text-xs font-mono space-y-1">
            <div className="text-slate-500 dark:text-slate-400 text-[11px] font-sans font-semibold mb-1">
              To activate cloud source separation, add these server environment variables to your deployment:
            </div>
            <div className="text-amber-600 dark:text-amber-300">
              AUDIO_SEPARATION_PROVIDER=&ldquo;replicate-demucs&rdquo; # or &ldquo;lalal_ai&rdquo;
            </div>
            <div className="text-amber-600 dark:text-amber-300">
              AUDIO_SEPARATION_API_KEY=&ldquo;your_provider_api_key&rdquo;
            </div>
          </div>
        </div>

        {/* File Upload & Audio Validation Workspace */}
        <div className="p-8 rounded-3xl bg-white dark:bg-midnight-900 border border-slate-200 dark:border-white/10 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-studio-violet/10 border border-studio-violet/20 mx-auto flex items-center justify-center text-studio-violet">
            <FileAudio className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {selectedFile ? selectedFile.name : 'Select or Drop Audio File to Separate'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              Supported formats: MP3, WAV, FLAC, OGG. Maximum file duration: 5 minutes (max 25MB).
            </p>
          </div>

          {fileError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs inline-flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{fileError}</span>
            </div>
          )}

          <div className="pt-2">
            <label className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-xs text-white bg-studio-violet hover:bg-studio-violet/90 shadow-md cursor-pointer transition-all">
              <Upload className="w-4 h-4" />
              <span>{selectedFile ? 'Change Audio File' : 'Browse Audio File'}</span>
              <input
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleFileDrop}
              />
            </label>
          </div>
        </div>

        {/* Stems Multi-Track Mixer Preview Architecture */}
        <div className="p-6 rounded-3xl bg-white dark:bg-midnight-900 border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-studio-blue" />
            4-Stem Channel Architecture
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            When separation is triggered, stems are isolated into 4 independent audio channels with dedicated volume and mute switches:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            {[
              { name: 'Singing Vocals', color: 'from-rose-500 to-pink-500', desc: 'Lead & backing vocal lines' },
              { name: 'Drums & Foley', color: 'from-cyan-500 to-blue-500', desc: 'Kick, snare, hi-hats, percussion' },
              { name: 'Bass Line', color: 'from-purple-500 to-indigo-500', desc: 'Sub-bass, electric bass, 808s' },
              { name: 'Other Instruments', color: 'from-amber-500 to-orange-500', desc: 'Guitars, synths, piano, brass' },
            ].map((stem, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{stem.name}</span>
                  <span className="text-[10px] font-mono text-slate-400">Stem #{idx + 1}</span>
                </div>
                <div className={`h-1.5 rounded-full bg-gradient-to-r ${stem.color}`} />
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{stem.desc}</p>
                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-200 dark:border-white/5">
                  <span>Level: 100%</span>
                  <span className="font-semibold text-slate-300">Ready</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

