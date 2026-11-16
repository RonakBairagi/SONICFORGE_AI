'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Music2,
  Volume2,
  FolderKanban,
  Library,
  BotMessageSquare,
  Activity,
  ArrowRight,
  Play,
  Pause,
  TrendingUp,
  Clock,
  Disc3,
  Sliders,
  Mic2,
  Heart,
  Download,
  Radio,
  Piano,
  Layers,
  BookOpen,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { TrackCard } from '@/components/studio/TrackCard';
import { useAuth } from '@/context/AuthContext';
import { useAudioPlayer } from '@/context/AudioPlayerContext';
import {
  getUserTracks,
  getUserSoundEffects,
  getUserProjects,
} from '@/lib/firestore-service';
import { GeneratedTrack, GeneratedSoundEffect, StudioProject } from '@/types';
import { formatDate, downloadAudioFile } from '@/lib/utils';

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const { play, pause, current, isPlaying } = useAudioPlayer();

  const [recentTracks, setRecentTracks] = useState<GeneratedTrack[]>([]);
  const [recentSfx, setRecentSfx] = useState<GeneratedSoundEffect[]>([]);
  const [projects, setProjects] = useState<StudioProject[]>([]);
  const [activeTab, setActiveTab] = useState<'tracks' | 'sfx'>('tracks');

  // Genuine Statistics State
  const [stats, setStats] = useState({
    tracksCount: 0,
    sfxCount: 0,
    projectsCount: 0,
    totalMinutes: 0,
    favoritesCount: 0,
  });

  const uid = user ? user.uid : 'guest';

  useEffect(() => {
    Promise.all([
      getUserTracks(uid),
      getUserProjects(uid),
      getUserSoundEffects(uid),
    ]).then(([tracks, projs, sfx]) => {
      setRecentTracks(tracks.slice(0, 5));
      setRecentSfx(sfx.slice(0, 5));
      setProjects(projs.slice(0, 4));

      const tracksMs = tracks.reduce((acc, t) => acc + (t.durationMs || 30000), 0);
      const sfxSec = sfx.reduce((acc, s) => acc + (s.durationSeconds || 4), 0);
      const totalMin = Number(((tracksMs / 60000) + (sfxSec / 60)).toFixed(1));

      const favTracks = tracks.filter((t) => t.isFavorite).length;
      const favSfx = sfx.filter((s) => s.isFavorite).length;

      setStats({
        tracksCount: tracks.length,
        sfxCount: sfx.length,
        projectsCount: projs.length,
        totalMinutes: totalMin,
        favoritesCount: favTracks + favSfx,
      });
    });
  }, [uid]);

  const artistName = profile?.displayName || user?.email?.split('@')[0] || 'Studio Artist';

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Welcome Hero */}
        <div className="relative rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-midnight-900 border border-slate-700/60 dark:border-studio-border/70 p-6 sm:p-8 overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-studio-blue/15 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-semibold mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              SonicForge Studio • Production AI Suite
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Welcome back, {artistName}
            </h1>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
              Your creative audio studio is active. Compose full songs with AI singing vocals &amp; custom lyrics, synthesize sound effects with zero latency delays, and consult your voice assistant.
            </p>

            <div className="flex flex-wrap items-center gap-3 mt-6">
              <Link
                href="/custom-song"
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-studio-violet to-purple-600 text-white text-xs font-bold shadow-lg shadow-purple-500/20 hover:opacity-95 transition-all flex items-center gap-2"
              >
                <Mic2 className="w-4 h-4 text-purple-200" />
                <span>Create Custom Song &amp; Lyrics</span>
              </Link>
              <Link
                href="/studio"
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-studio-blue to-indigo-600 text-white text-xs font-bold shadow-lg shadow-studio-blue/20 hover:opacity-95 transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-cyan-300" />
                <span>Launch Music Studio</span>
              </Link>
              <Link
                href="/sfx"
                className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-white/10 transition-colors flex items-center gap-2"
              >
                <Volume2 className="w-4 h-4 text-cyan-400" />
                <span>Design SFX</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Genuine Studio Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <div className="p-4 rounded-2xl bg-white dark:bg-midnight-900/80 border border-slate-200 dark:border-studio-border/70 backdrop-blur-xl shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Tracks</span>
              <Music2 className="w-4 h-4 text-studio-blue dark:text-cyan-400" />
            </div>
            <p className="text-2xl font-black font-mono text-slate-900 dark:text-white">
              {stats.tracksCount}
            </p>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">Produced songs</span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-midnight-900/80 border border-slate-200 dark:border-studio-border/70 backdrop-blur-xl shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Sound Effects</span>
              <Volume2 className="w-4 h-4 text-cyan-500" />
            </div>
            <p className="text-2xl font-black font-mono text-slate-900 dark:text-white">
              {stats.sfxCount}
            </p>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">Audio designs</span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-midnight-900/80 border border-slate-200 dark:border-studio-border/70 backdrop-blur-xl shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Audio Minutes</span>
              <Clock className="w-4 h-4 text-studio-violet dark:text-purple-400" />
            </div>
            <p className="text-2xl font-black font-mono text-slate-900 dark:text-white">
              {stats.totalMinutes}m
            </p>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">Rendered playback</span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-midnight-900/80 border border-slate-200 dark:border-studio-border/70 backdrop-blur-xl shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Projects</span>
              <FolderKanban className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-black font-mono text-slate-900 dark:text-white">
              {stats.projectsCount}
            </p>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">Organized sets</span>
          </div>

          <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-white dark:bg-midnight-900/80 border border-slate-200 dark:border-studio-border/70 backdrop-blur-xl shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Favorites</span>
              <Heart className="w-4 h-4 text-rose-500" />
            </div>
            <p className="text-2xl font-black font-mono text-slate-900 dark:text-white">
              {stats.favoritesCount}
            </p>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">Starred items</span>
          </div>
        </div>

        {/* Quick Launch Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <Link
            href="/custom-song"
            className="p-5 rounded-3xl bg-white dark:bg-midnight-900/70 hover:bg-slate-50 dark:hover:bg-midnight-850/90 border border-purple-200 dark:border-purple-900/40 hover:border-studio-violet transition-all group flex flex-col justify-between shadow-sm hover:shadow-md"
          >
            <div>
              <div className="w-10 h-10 rounded-2xl bg-studio-violet/15 border border-studio-violet/30 flex items-center justify-center text-studio-violet dark:text-purple-400 group-hover:scale-110 transition-transform mb-3">
                <Mic2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-studio-violet dark:group-hover:text-purple-300">
                Custom Song
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Write original lyrics, choose vocal styles &amp; languages, and render complete vocal tracks.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs text-studio-violet dark:text-purple-400 font-bold gap-1 group-hover:translate-x-0.5 transition-transform">
              <span>Write song</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          <Link
            href="/studio"
            className="p-5 rounded-3xl bg-white dark:bg-midnight-900/70 hover:bg-slate-50 dark:hover:bg-midnight-850/90 border border-slate-200/80 dark:border-studio-border/60 hover:border-studio-blue/40 transition-all group flex flex-col justify-between shadow-sm hover:shadow-md"
          >
            <div>
              <div className="w-10 h-10 rounded-2xl bg-studio-blue/10 border border-studio-blue/20 flex items-center justify-center text-studio-blue dark:text-cyan-400 group-hover:scale-110 transition-transform mb-3">
                <Music2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-studio-blue dark:group-hover:text-cyan-300">
                Music Studio
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Preset templates, instrumental arrangements, orchestral cues, and soundscapes.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs text-studio-blue dark:text-cyan-400 font-bold gap-1 group-hover:translate-x-0.5 transition-transform">
              <span>Compose now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          <Link
            href="/sfx"
            className="p-5 rounded-2xl bg-white/80 dark:bg-midnight-900/70 hover:bg-white dark:hover:bg-midnight-850/90 border border-slate-200/80 dark:border-studio-border/60 hover:border-cyan-500/40 transition-all group flex flex-col justify-between shadow-sm hover:shadow-md"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-300 group-hover:scale-110 transition-transform mb-3">
                <Volume2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-300">
                SFX &amp; Foley
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Portals, weather, braams, and game audio with ElevenLabs v3 and zero freeze.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs text-cyan-600 dark:text-cyan-400 font-bold gap-1 group-hover:translate-x-0.5 transition-transform">
              <span>Design audio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          <Link
            href="/assistant"
            className="p-5 rounded-2xl bg-white/80 dark:bg-midnight-900/70 hover:bg-white dark:hover:bg-midnight-850/90 border border-slate-200/80 dark:border-studio-border/60 hover:border-studio-violet/40 transition-all group flex flex-col justify-between shadow-sm hover:shadow-md"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-studio-violet/10 border border-studio-violet/20 flex items-center justify-center text-studio-violet dark:text-purple-400 group-hover:scale-110 transition-transform mb-3">
                <BotMessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-studio-violet dark:group-hover:text-purple-300">
                Sonic Assistant
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Dynamic conversational copilot powered by Rime Coda text-to-speech.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs text-studio-violet dark:text-purple-400 font-bold gap-1 group-hover:translate-x-0.5 transition-transform">
              <span>Talk with assistant</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          <Link
            href="/diagnostics"
            className="p-5 rounded-2xl bg-white/80 dark:bg-midnight-900/70 hover:bg-white dark:hover:bg-midnight-850/90 border border-slate-200/80 dark:border-studio-border/60 hover:border-emerald-500/40 transition-all group flex flex-col justify-between shadow-sm hover:shadow-md"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform mb-3">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                Diagnostics
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Zero-leakage connectivity tests for ElevenLabs, Rime, and Firebase.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs text-emerald-600 dark:text-emerald-400 font-bold gap-1 group-hover:translate-x-0.5 transition-transform">
              <span>Inspect status</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        </div>

        {/* Live Instrument & Creative Music Tools */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                Live Instrument &amp; Music Creation Tools
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Playable browser instruments, pitch coaches, theory explorers, and arrangement tools powered by Web Audio.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* SonicTune Tuner */}
            <Link
              href="/tuner"
              className="p-5 rounded-3xl bg-white dark:bg-midnight-900/80 hover:bg-slate-50 dark:hover:bg-midnight-850 border border-slate-200 dark:border-white/10 hover:border-studio-blue/40 transition-all group flex flex-col justify-between shadow-sm"
            >
              <div>
                <div className="w-10 h-10 rounded-2xl bg-studio-blue/15 border border-studio-blue/30 flex items-center justify-center text-studio-blue mb-3 group-hover:scale-110 transition-transform">
                  <Radio className="w-5 h-5" />
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-studio-blue">
                    SonicTune Tuner
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-studio-blue/10 text-studio-blue border border-studio-blue/20">
                    Pitchy
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Real-time guitar, bass, ukulele, and chromatic tuner with live needle gauge and 440 Hz calibration.
                </p>
              </div>
              <div className="mt-4 flex items-center text-xs text-studio-blue font-bold gap-1 group-hover:translate-x-0.5 transition-transform">
                <span>Tune instrument</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>

            {/* Sonic Harmonium */}
            <Link
              href="/harmonium"
              className="p-5 rounded-3xl bg-white dark:bg-midnight-900/80 hover:bg-slate-50 dark:hover:bg-midnight-850 border border-slate-200 dark:border-white/10 hover:border-studio-violet/40 transition-all group flex flex-col justify-between shadow-sm"
            >
              <div>
                <div className="w-10 h-10 rounded-2xl bg-studio-violet/15 border border-studio-violet/30 flex items-center justify-center text-studio-violet mb-3 group-hover:scale-110 transition-transform">
                  <Piano className="w-5 h-5" />
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-studio-violet">
                    Sonic Harmonium
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-studio-violet/10 text-studio-violet border border-studio-violet/20">
                    Sargam
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Playable Indian reed harmonium with dynamic Sa transposition, keyboard mappings, and Web MIDI.
                </p>
              </div>
              <div className="mt-4 flex items-center text-xs text-studio-violet font-bold gap-1 group-hover:translate-x-0.5 transition-transform">
                <span>Play harmonium</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>

            {/* Raga & Rhythm Practice */}
            <Link
              href="/practice"
              className="p-5 rounded-3xl bg-white dark:bg-midnight-900/80 hover:bg-slate-50 dark:hover:bg-midnight-850 border border-slate-200 dark:border-white/10 hover:border-cyan-400/40 transition-all group flex flex-col justify-between shadow-sm"
            >
              <div>
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-400 mb-3 group-hover:scale-110 transition-transform">
                  <Activity className="w-5 h-5" />
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-cyan-400">
                    Raga &amp; Rhythm Studio
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    Taal
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Tanpura drone, Indian Taal cycles (Teentaal, Keherwa, Rupak), and guided Alankar exercises.
                </p>
              </div>
              <div className="mt-4 flex items-center text-xs text-cyan-400 font-bold gap-1 group-hover:translate-x-0.5 transition-transform">
                <span>Practice rhythm</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>

            {/* Vocal Pitch Coach */}
            <Link
              href="/vocal-coach"
              className="p-5 rounded-3xl bg-white dark:bg-midnight-900/80 hover:bg-slate-50 dark:hover:bg-midnight-850 border border-slate-200 dark:border-white/10 hover:border-emerald-400/40 transition-all group flex flex-col justify-between shadow-sm"
            >
              <div>
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-400">
                    Vocal Pitch Coach
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Live
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Live microphone singing pitch analysis, scrolling vocal contour trail, and target note stability matching.
                </p>
              </div>
              <div className="mt-4 flex items-center text-xs text-emerald-400 font-bold gap-1 group-hover:translate-x-0.5 transition-transform">
                <span>Coach voice</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>

            {/* Sonic Loop Lab */}
            <Link
              href="/loop-lab"
              className="p-5 rounded-3xl bg-white dark:bg-midnight-900/80 hover:bg-slate-50 dark:hover:bg-midnight-850 border border-slate-200 dark:border-white/10 hover:border-amber-400/40 transition-all group flex flex-col justify-between shadow-sm"
            >
              <div>
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-400 mb-3 group-hover:scale-110 transition-transform">
                  <Layers className="w-5 h-5" />
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-400">
                    Sonic Loop Lab
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Mixer
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Multi-track arranger with live mic recording, file import, volume/pan faders, and offline WAV export.
                </p>
              </div>
              <div className="mt-4 flex items-center text-xs text-amber-400 font-bold gap-1 group-hover:translate-x-0.5 transition-transform">
                <span>Open arranger</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>

            {/* Chord & Scale Explorer */}
            <Link
              href="/chords"
              className="p-5 rounded-3xl bg-white dark:bg-midnight-900/80 hover:bg-slate-50 dark:hover:bg-midnight-850 border border-slate-200 dark:border-white/10 hover:border-indigo-400/40 transition-all group flex flex-col justify-between shadow-sm"
            >
              <div>
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-400/30 flex items-center justify-center text-indigo-400 mb-3 group-hover:scale-110 transition-transform">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-400">
                    Chord &amp; Scale Explorer
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    Theory
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Diatonic modes, Sargam equivalents, progression loops, and Standard MIDI (.mid) file export.
                </p>
              </div>
              <div className="mt-4 flex items-center text-xs text-indigo-400 font-bold gap-1 group-hover:translate-x-0.5 transition-transform">
                <span>Explore theory</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Generations & Active Projects Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Recent Tracks & SFX Switcher */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('tracks')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'tracks'
                      ? 'bg-studio-blue text-white shadow-md shadow-studio-blue/20'
                      : 'bg-slate-100 dark:bg-midnight-900/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Disc3 className="w-3.5 h-3.5" />
                  <span>Music Tracks ({stats.tracksCount})</span>
                </button>
                <button
                  onClick={() => setActiveTab('sfx')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'sfx'
                      ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
                      : 'bg-slate-100 dark:bg-midnight-900/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Sound Effects ({stats.sfxCount})</span>
                </button>
              </div>

              <Link
                href={activeTab === 'tracks' ? '/library' : '/sfx'}
                className="text-xs font-semibold text-slate-500 hover:text-studio-blue dark:text-slate-400 dark:hover:text-cyan-300 flex items-center gap-1 transition-colors self-start sm:self-auto"
              >
                <span>{activeTab === 'tracks' ? 'Open Library' : 'SFX Studio'}</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {activeTab === 'tracks' ? (
              recentTracks.length === 0 ? (
                <div className="p-8 rounded-3xl bg-white/60 dark:bg-midnight-900/50 border border-slate-200/60 dark:border-studio-border/50 text-center space-y-2">
                  <Music2 className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    No music generated yet. Open the Music Studio or Custom Song Studio to produce your first song.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentTracks.map((t) => (
                    <TrackCard key={t.id} track={t} />
                  ))}
                </div>
              )
            ) : recentSfx.length === 0 ? (
              <div className="p-8 rounded-3xl bg-white/60 dark:bg-midnight-900/50 border border-slate-200/60 dark:border-studio-border/50 text-center space-y-2">
                <Volume2 className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto" />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No sound effects created yet. Open the SFX Studio to design custom impacts, ambient tones, and risers.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentSfx.map((sfx) => {
                  const isThisPlaying =
                    current?.type === 'sfx' && current.item.id === sfx.id && isPlaying;
                  return (
                    <div
                      key={sfx.id}
                      className="p-3.5 rounded-2xl bg-white/80 dark:bg-midnight-900/80 border border-slate-200 dark:border-studio-border/60 hover:border-cyan-500/40 transition-all flex items-center justify-between gap-3 shadow-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          onClick={() => {
                            if (isThisPlaying) {
                              pause();
                            } else {
                              play({ type: 'sfx', item: sfx });
                            }
                          }}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                            isThisPlaying
                              ? 'bg-cyan-500 text-white animate-pulse'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-cyan-500 hover:text-white'
                          }`}
                        >
                          {isThisPlaying ? (
                            <Pause className="w-4 h-4 fill-current" />
                          ) : (
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          )}
                        </button>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {sfx.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {sfx.category} • {sfx.durationSeconds}s
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                          {formatDate(sfx.createdAt)}
                        </span>
                        {sfx.audioUrl && (
                          <button
                            onClick={() => downloadAudioFile(sfx.audioUrl, sfx.title)}
                            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-cyan-500 transition-colors"
                            title="Download MP3"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Projects Sidebar */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-studio-violet dark:text-purple-400" />
                Active Projects
              </h2>
              <Link
                href="/projects"
                className="text-xs font-semibold text-slate-500 hover:text-studio-violet dark:text-slate-400 dark:hover:text-purple-300 flex items-center gap-1 transition-colors"
              >
                <span>All Projects</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {projects.length === 0 ? (
              <div className="p-6 rounded-3xl bg-white/60 dark:bg-midnight-900/50 border border-slate-200/60 dark:border-studio-border/50 text-center text-xs text-slate-500 dark:text-slate-400">
                No active projects. Group your tracks by creating a project in the Projects section.
              </div>
            ) : (
              <div className="space-y-3">
                {projects.map((proj) => (
                  <Link
                    key={proj.id}
                    href="/projects"
                    className="p-4 rounded-2xl bg-white/80 dark:bg-midnight-900/70 hover:bg-white dark:hover:bg-midnight-850 border border-slate-200 dark:border-studio-border/60 hover:border-studio-violet/40 block transition-all group shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-studio-blue dark:group-hover:text-cyan-300 truncate">
                        {proj.name}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatDate(proj.createdAt)}
                      </span>
                    </div>
                    {proj.description && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-1">
                        {proj.description}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
