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
  TrendingUp,
  Clock,
  Disc3,
  Sliders,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { TrackCard } from '@/components/studio/TrackCard';
import { useAuth } from '@/context/AuthContext';
import {
  getUserTracks,
  getUserSoundEffects,
  getUserProjects,
} from '@/lib/firestore-service';
import { GeneratedTrack, StudioProject } from '@/types';
import { formatDate } from '@/lib/utils';

export default function DashboardPage() {
  const { user, profile } = useAuth();

  const [recentTracks, setRecentTracks] = useState<GeneratedTrack[]>([]);
  const [projects, setProjects] = useState<StudioProject[]>([]);
  const [sfxCount, setSfxCount] = useState(0);

  const uid = user ? user.uid : 'guest';

  useEffect(() => {
    Promise.all([
      getUserTracks(uid),
      getUserProjects(uid),
      getUserSoundEffects(uid),
    ]).then(([tracks, projs, sfx]) => {
      setRecentTracks(tracks.slice(0, 4));
      setProjects(projs.slice(0, 3));
      setSfxCount(sfx.length);
    });
  }, [uid]);

  const artistName = profile?.displayName || user?.email?.split('@')[0] || 'Studio Artist';

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Welcome Hero */}
        <div className="relative rounded-3xl bg-gradient-to-r from-midnight-900 via-midnight-850 to-midnight-900 border border-studio-border/70 p-6 sm:p-8 overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-studio-blue/15 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-semibold mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              SonicForge Studio v1.0
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Welcome back, {artistName}
            </h1>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
              Your AI audio workspace is active. Create original musical arrangements, design cinematic
              sound effects, and collaborate with your AI voice copilot.
            </p>

            <div className="flex flex-wrap items-center gap-3 mt-6">
              <Link
                href="/studio"
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-studio-blue to-studio-violet text-white text-xs font-semibold shadow-lg shadow-studio-blue/20 hover:opacity-95 transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Launch Music Studio</span>
              </Link>
              <Link
                href="/sfx"
                className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-white/5 transition-colors flex items-center gap-2"
              >
                <Volume2 className="w-4 h-4 text-cyan-400" />
                <span>Design SFX</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Launch Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/studio"
            className="p-5 rounded-2xl bg-midnight-900/70 hover:bg-midnight-850/90 border border-studio-border/60 hover:border-studio-blue/40 transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-studio-blue/10 border border-studio-blue/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform mb-3">
                <Music2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-100 group-hover:text-cyan-300">
                Music Studio
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Prompt orchestral themes, ambient loops, synthwave, and study beats.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs text-cyan-400 font-semibold gap-1 group-hover:translate-x-0.5 transition-transform">
              <span>Compose now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          <Link
            href="/sfx"
            className="p-5 rounded-2xl bg-midnight-900/70 hover:bg-midnight-850/90 border border-studio-border/60 hover:border-cyan-500/40 transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-300 group-hover:scale-110 transition-transform mb-3">
                <Volume2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-100 group-hover:text-cyan-300">
                SFX &amp; Foley
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Generate cinematic braams, nature weather, sci-fi airlocks, and UI sounds.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs text-cyan-400 font-semibold gap-1 group-hover:translate-x-0.5 transition-transform">
              <span>Design audio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          <Link
            href="/assistant"
            className="p-5 rounded-2xl bg-midnight-900/70 hover:bg-midnight-850/90 border border-studio-border/60 hover:border-studio-violet/40 transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-studio-violet/10 border border-studio-violet/20 flex items-center justify-center text-studio-violet group-hover:scale-110 transition-transform mb-3">
                <BotMessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-100 group-hover:text-studio-violet">
                Sonic Assistant
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Voice-guided prompt assistant powered by Rime Coda text-to-speech.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs text-studio-violet font-semibold gap-1 group-hover:translate-x-0.5 transition-transform">
              <span>Talk with assistant</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          <Link
            href="/diagnostics"
            className="p-5 rounded-2xl bg-midnight-900/70 hover:bg-midnight-850/90 border border-studio-border/60 hover:border-emerald-500/40 transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform mb-3">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-100 group-hover:text-emerald-400">
                Diagnostics
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Zero-leakage connectivity tests for ElevenLabs, Rime, and Firestore.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs text-emerald-400 font-semibold gap-1 group-hover:translate-x-0.5 transition-transform">
              <span>Inspect status</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        </div>

        {/* Recent Generations & Active Projects Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Recent Tracks */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Disc3 className="w-5 h-5 text-cyan-400" />
                Latest Studio Generations
              </h2>
              <Link
                href="/library"
                className="text-xs text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
              >
                <span>View Library</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {recentTracks.length === 0 ? (
              <div className="p-8 rounded-2xl bg-midnight-900/50 border border-studio-border/50 text-center space-y-2">
                <Music2 className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">
                  No music generated yet. Open the Music Studio to produce your first song.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTracks.map((t) => (
                  <TrackCard key={t.id} track={t} />
                ))}
              </div>
            )}
          </div>

          {/* Active Projects Sidebar */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-studio-violet" />
                Active Projects
              </h2>
              <Link
                href="/projects"
                className="text-xs text-slate-400 hover:text-studio-violet flex items-center gap-1 transition-colors"
              >
                <span>All Projects</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {projects.length === 0 ? (
              <div className="p-6 rounded-2xl bg-midnight-900/50 border border-studio-border/50 text-center text-xs text-slate-400">
                No active projects. Group your tracks by creating a project in the Projects section.
              </div>
            ) : (
              <div className="space-y-3">
                {projects.map((proj) => (
                  <Link
                    key={proj.id}
                    href="/projects"
                    className="p-4 rounded-xl bg-midnight-900/70 hover:bg-midnight-850 border border-studio-border/60 hover:border-studio-violet/40 block transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 truncate">
                        {proj.name}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatDate(proj.createdAt)}
                      </span>
                    </div>
                    {proj.description && (
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-1">
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

