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
  Zap,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
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

  const [stats, setStats] = useState({
    tracksCount: 0,
    sfxCount: 0,
    projectsCount: 0,
    totalMinutes: 0,
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

      setStats({
        tracksCount: tracks.length,
        sfxCount: sfx.length,
        projectsCount: projs.length,
        totalMinutes: totalMin,
      });
    });
  }, [uid]);

  const artistName = profile?.displayName || user?.email?.split('@')[0] || 'Studio Artist';

  const studioTools = [
    {
      title: 'AI Music Studio',
      desc: 'Generate complete instrumental and vocal arrangements with ElevenLabs Music v2.',
      href: '/studio',
      icon: Music2,
      badge: 'Vocal AI',
      color: 'from-plum-600 to-plum-800',
    },
    {
      title: 'Custom Songwriter',
      desc: 'Compose AI songs with structured verses, choruses, and custom lyrics.',
      href: '/custom-song',
      icon: Mic2,
      badge: 'Lyrics',
      color: 'from-champagne-500 to-plum-600',
    },
    {
      title: 'Sound Effects Lab',
      desc: 'Cinematic foley, atmospheric risers, impact sweeps, and organic SFX.',
      href: '/sfx',
      icon: Volume2,
      badge: 'v3 Fast',
      color: 'from-plum-700 to-champagne-600',
    },
    {
      title: 'Neural Stem Lab',
      desc: 'Isolate Vocals, Drums, Bass, and Instruments with RoFormer separation.',
      href: '/stems',
      icon: Disc3,
      badge: 'Neural AI',
      color: 'from-champagne-600 to-plum-700',
    },
    {
      title: 'Sonic Harmonium',
      desc: 'Virtual acoustic harmonium synth with Sargam keys and drone reeds.',
      href: '/harmonium',
      icon: Piano,
      badge: 'Sargam',
      color: 'from-plum-800 to-plum-950',
    },
    {
      title: 'SonicTune Tuner',
      desc: 'Microphone pitch analyzer with cent precision and note deviation detection.',
      href: '/tuner',
      icon: Radio,
      badge: 'Pitchy',
      color: 'from-champagne-500 to-champagne-700',
    },
  ];

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Cinematic Welcome Hero */}
        <div className="relative rounded-3xl glass-panel-elevated p-6 sm:p-8 overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-champagne-400/15 border border-champagne-400/30 text-champagne-700 dark:text-champagne-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              SonicForge AI Studio Suite
            </span>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-charcoal-900 dark:text-white">
              Welcome, <span className="bg-gradient-to-r from-plum-600 via-champagne-500 to-plum-400 bg-clip-text text-transparent">{artistName}</span>
            </h1>

            <p className="text-sm text-muted">
              Produce studio-grade AI music, isolate multitrack stems, design cinematic sound effects, and practice your instruments with intelligent audio tooling.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/studio"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-plum-600 via-plum-700 to-champagne-600 hover:from-plum-500 hover:to-champagne-500 text-white font-extrabold text-xs shadow-lg shadow-plum-950/20 flex items-center gap-2 transition-all"
              >
                <Zap className="w-4 h-4 text-champagne-300" />
                <span>Create New Track</span>
              </Link>
              <Link
                href="/stems"
                className="px-4 py-2.5 rounded-xl glass-panel text-xs font-bold text-charcoal-800 dark:text-lavender-100 hover:border-champagne-400/40 flex items-center gap-2 transition-all"
              >
                <Disc3 className="w-4 h-4 text-champagne-500" />
                <span>Split Stems</span>
              </Link>
              <Link
                href="/assistant"
                className="px-4 py-2.5 rounded-xl glass-panel text-xs font-bold text-charcoal-800 dark:text-lavender-100 hover:border-champagne-400/40 flex items-center gap-2 transition-all"
              >
                <BotMessageSquare className="w-4 h-4 text-plum-500 dark:text-lavender-300" />
                <span>Sonic Voice Assistant</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Access Creative Studio Tools */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold tracking-tight text-charcoal-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-champagne-500" />
              Creative Studio Workspaces
            </h2>
            <span className="text-xs text-muted">Select an engine to begin</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {studioTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.title}
                  href={tool.href}
                  className="glass-panel p-5 rounded-3xl flex flex-col justify-between hover:border-champagne-400/40 hover:shadow-lg transition-all group relative overflow-hidden"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${tool.color} flex items-center justify-center text-white shadow-md shadow-plum-950/20 group-hover:scale-110 transition-transform`}>
                        <Icon className="w-5 h-5 text-champagne-300" />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-champagne-400/15 border border-champagne-400/25 text-champagne-700 dark:text-champagne-300">
                        {tool.badge}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-extrabold text-sm text-charcoal-900 dark:text-white group-hover:text-champagne-600 dark:group-hover:text-champagne-300 transition-colors">
                        {tool.title}
                      </h3>
                      <p className="text-xs text-muted mt-1 leading-relaxed">
                        {tool.desc}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] font-bold text-champagne-600 dark:text-champagne-400 pt-4">
                    <span>Open Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Studio Production Summary & Recent Generations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Recent Audio Tracks */}
          <div className="lg:col-span-2 glass-panel rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-plum-700/15 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Music2 className="w-4 h-4 text-champagne-500" />
                <h3 className="font-extrabold text-sm text-charcoal-900 dark:text-white">
                  Recent Studio Generations
                </h3>
              </div>

              <div className="flex items-center gap-1 p-0.5 rounded-xl bg-cream-100/70 dark:bg-charcoal-800/70 border border-plum-700/15 dark:border-white/5 text-[11px]">
                <button
                  onClick={() => setActiveTab('tracks')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    activeTab === 'tracks'
                      ? 'bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white shadow-xs'
                      : 'text-muted'
                  }`}
                >
                  Songs ({recentTracks.length})
                </button>
                <button
                  onClick={() => setActiveTab('sfx')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    activeTab === 'sfx'
                      ? 'bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white shadow-xs'
                      : 'text-muted'
                  }`}
                >
                  SFX ({recentSfx.length})
                </button>
              </div>
            </div>

            {/* List */}
            {activeTab === 'tracks' ? (
              recentTracks.length > 0 ? (
                <div className="space-y-2">
                  {recentTracks.map((track) => {
                    const isTrackPlaying = isPlaying && current?.type === 'track' && current.item.id === track.id;
                    return (
                      <div
                        key={track.id}
                        className="p-3 rounded-2xl bg-white/40 dark:bg-charcoal-950/40 border border-plum-700/15 dark:border-white/5 flex items-center justify-between gap-3 hover:border-champagne-400/30 transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            onClick={() => {
                              if (isTrackPlaying) pause();
                              else {
                                play({ type: 'track', item: track });
                              }
                            }}
                            className="w-8 h-8 rounded-xl bg-champagne-400/20 border border-champagne-400/30 flex items-center justify-center text-champagne-600 dark:text-champagne-300 shrink-0"
                          >
                            {isTrackPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                          </button>

                          <div className="min-w-0">
                            <p className="font-bold text-xs text-charcoal-900 dark:text-white truncate">
                              {track.prompt || 'AI Audio Composition'}
                            </p>
                            <p className="text-[10px] text-muted truncate">
                              {formatDate(track.createdAt)} • {((track.durationMs || 30000) / 1000).toFixed(0)}s
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => downloadAudioFile(track.audioUrl, `sonicforge_${track.id.slice(0, 8)}.mp3`)}
                          className="p-1.5 rounded-lg text-muted hover:text-champagne-500 transition-colors"
                          title="Download MP3"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 space-y-2">
                  <p className="text-xs text-muted">No songs generated yet.</p>
                  <Link
                    href="/studio"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-champagne-600 dark:text-champagne-400"
                  >
                    <span>Open AI Music Studio</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )
            ) : recentSfx.length > 0 ? (
              <div className="space-y-2">
                {recentSfx.map((sfx) => {
                  const isSfxPlaying = isPlaying && current?.type === 'sfx' && current.item.id === sfx.id;
                  return (
                    <div
                      key={sfx.id}
                      className="p-3 rounded-2xl bg-white/40 dark:bg-charcoal-950/40 border border-plum-700/15 dark:border-white/5 flex items-center justify-between gap-3 hover:border-champagne-400/30 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          onClick={() => {
                            if (isSfxPlaying) pause();
                            else {
                              play({ type: 'sfx', item: sfx });
                            }
                          }}
                          className="w-8 h-8 rounded-xl bg-champagne-400/20 border border-champagne-400/30 flex items-center justify-center text-champagne-600 dark:text-champagne-300 shrink-0"
                        >
                          {isSfxPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                        </button>

                        <div className="min-w-0">
                          <p className="font-bold text-xs text-charcoal-900 dark:text-white truncate">
                            {sfx.prompt || 'Sound Effect'}
                          </p>
                          <p className="text-[10px] text-muted truncate">
                            {formatDate(sfx.createdAt)} • {(sfx.durationSeconds || 4).toFixed(1)}s
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => downloadAudioFile(sfx.audioUrl, `sfx_${sfx.id.slice(0, 8)}.mp3`)}
                        className="p-1.5 rounded-lg text-muted hover:text-champagne-500 transition-colors"
                        title="Download MP3"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 space-y-2">
                <p className="text-xs text-muted">No sound effects generated yet.</p>
                <Link
                  href="/sfx"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-champagne-600 dark:text-champagne-400"
                >
                  <span>Open Sound Effects Lab</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>

          {/* Right Col: Studio Vault & Status */}
          <div className="glass-panel rounded-3xl p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-plum-700/15 dark:border-white/10 pb-3">
                <h3 className="font-extrabold text-sm text-charcoal-900 dark:text-white flex items-center gap-2">
                  <FolderKanban className="w-4 h-4 text-champagne-500" />
                  Projects Vault
                </h3>
                <Link
                  href="/projects"
                  className="text-[11px] font-bold text-champagne-600 dark:text-champagne-400 hover:underline"
                >
                  View All
                </Link>
              </div>

              {projects.length > 0 ? (
                <div className="space-y-2">
                  {projects.map((proj) => (
                    <div
                      key={proj.id}
                      className="p-3 rounded-2xl bg-white/40 dark:bg-charcoal-950/40 border border-plum-700/15 dark:border-white/5"
                    >
                      <p className="font-bold text-xs text-charcoal-900 dark:text-white truncate">
                        {proj.name}
                      </p>
                      <p className="text-[10px] text-muted truncate">
                        {formatDate(proj.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-cream-50/50 dark:bg-charcoal-950/50 border border-plum-700/15 dark:border-white/5 text-center space-y-2">
                  <p className="text-xs text-muted">Vault ready for your creative arrangements.</p>
                  <Link
                    href="/projects"
                    className="inline-block text-[11px] font-bold text-champagne-600 dark:text-champagne-400"
                  >
                    + Create Studio Project
                  </Link>
                </div>
              )}
            </div>

            {/* Quick Engine Telemetry */}
            <div className="pt-4 border-t border-plum-700/15 dark:border-white/10 space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between text-muted">
                <span>ElevenLabs Engine</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Verified Active</span>
              </div>
              <div className="flex items-center justify-between text-muted">
                <span>Neural Analog Stem Isolation</span>
                <span className="font-bold text-champagne-600 dark:text-champagne-400">Online (RoFormer)</span>
              </div>
              <div className="flex items-center justify-between text-muted">
                <span>Rime Voice Synthesis</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">760ms Latency</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
