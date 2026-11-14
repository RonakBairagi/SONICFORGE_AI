'use client';

import React from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Music2,
  Volume2,
  BotMessageSquare,
  ShieldCheck,
  Disc3,
  Layers,
  ArrowRight,
  Play,
  Activity,
  Sliders,
  CheckCircle2,
  ExternalLink,
  Mic2,
  Phone,
  Mail,
  Zap,
} from 'lucide-react';
import { WaveformVisualizer } from '@/components/audio/WaveformVisualizer';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { SUPPORT_CONFIG } from '@/lib/support-config';

export default function LandingPage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Representative normalized real waveform peaks for hero display
  const demoPeaks = [
    0.2, 0.35, 0.6, 0.45, 0.8, 0.95, 0.7, 0.55, 0.3, 0.65, 0.85, 0.9, 0.75, 0.4, 0.6, 0.8,
    1.0, 0.85, 0.65, 0.5, 0.7, 0.9, 0.8, 0.6, 0.35, 0.5, 0.75, 0.85, 0.65, 0.4, 0.55, 0.7,
    0.85, 0.95, 0.8, 0.6, 0.45, 0.65, 0.75, 0.55, 0.4, 0.3, 0.25, 0.2, 0.15, 0.1, 0.08, 0.05
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-midnight-950 text-slate-900 dark:text-slate-100 selection:bg-studio-blue/30 selection:text-cyan-200 transition-colors">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-studio-border/60 bg-white/80 dark:bg-midnight-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-studio-blue via-studio-violet to-cyan-400 p-0.5 shadow-lg shadow-studio-blue/20">
              <div className="w-full h-full bg-slate-900 dark:bg-midnight-950 rounded-[10px] flex items-center justify-center">
                <Music2 className="w-5 h-5 text-cyan-300" />
              </div>
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-slate-900 via-indigo-900 to-studio-blue dark:from-white dark:via-slate-200 dark:to-cyan-300 bg-clip-text text-transparent">
                SONICFORGE AI
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <Link href="/studio" className="hover:text-studio-blue dark:hover:text-cyan-300 transition-colors">
              Music &amp; Vocal Studio
            </Link>
            <Link href="/sfx" className="hover:text-studio-blue dark:hover:text-cyan-300 transition-colors">
              SFX Studio
            </Link>
            <Link href="/assistant" className="hover:text-studio-blue dark:hover:text-cyan-300 transition-colors">
              Sonic Assistant
            </Link>
            <Link href="/diagnostics" className="hover:text-studio-blue dark:hover:text-cyan-300 transition-colors">
              Diagnostics
            </Link>
            <Link href="/support" className="hover:text-studio-blue dark:hover:text-cyan-300 transition-colors">
              Support
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-studio-blue to-studio-violet text-white text-xs font-bold shadow-md shadow-studio-blue/20 hover:opacity-95 transition-all"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-studio-blue to-studio-violet text-white text-xs font-bold shadow-md shadow-studio-blue/20 hover:opacity-95 transition-all"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-28 px-4 sm:px-6 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-studio-blue/20 via-studio-violet/15 to-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-midnight-900/90 border border-slate-200 dark:border-studio-border/80 text-xs font-semibold shadow-lg">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-slate-700 dark:text-slate-300">GeeksforGeeks Generative AI Clash</span>
            <span className="text-slate-400">•</span>
            <span className="text-studio-blue dark:text-cyan-300 font-bold">Techno India University</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.1]">
            Empowering Artists with{' '}
            <span className="bg-gradient-to-r from-cyan-500 via-studio-blue to-studio-violet bg-clip-text text-transparent">
              Generative AI Audio
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            A professional AI Music &amp; Sound Studio for musicians, indie game developers, filmmakers,
            and podcasters. Generate full songs with AI-sung vocals, customize lyrics, synthesize sound effects with zero latency delay, and collaborate with your AI voice copilot.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <Link
              href="/studio"
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-studio-blue via-indigo-600 to-studio-violet hover:from-blue-500 hover:to-violet-500 text-white font-bold text-sm shadow-xl shadow-studio-blue/25 hover:shadow-studio-blue/40 transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-cyan-300" />
              <span>Launch Studio (Vocal &amp; Music)</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/sfx"
              className="px-6 py-3.5 rounded-2xl bg-white dark:bg-midnight-900/80 hover:bg-slate-50 dark:hover:bg-midnight-850 border border-slate-200 dark:border-studio-border/80 text-slate-800 dark:text-slate-200 font-semibold text-sm transition-all flex items-center gap-2 shadow-sm"
            >
              <Volume2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>Design Sound Effects</span>
            </Link>
          </div>

          {/* Interactive Waveform Banner Card */}
          <div className="mt-12 p-6 rounded-3xl bg-white/90 dark:bg-midnight-900/80 border border-slate-200 dark:border-studio-border/80 backdrop-blur-xl shadow-2xl max-w-2xl mx-auto space-y-4">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Disc3 className="w-4 h-4 text-studio-blue dark:text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Neon Skyline Dreams (AI Vocals Demo)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-studio-violet/15 text-studio-violet dark:text-purple-300">
                  AI Vocals
                </span>
              </div>
              <span className="font-mono text-studio-blue dark:text-cyan-400 font-semibold">44.1 kHz • MP3</span>
            </div>

            <WaveformVisualizer peaks={demoPeaks} progress={0.42} height={42} />

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              <span>0:13</span>
              <span className="text-slate-700 dark:text-slate-300 font-sans font-medium">ElevenLabs music_v2_5 Engine</span>
              <span>0:30</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section className="py-20 border-t border-slate-200 dark:border-studio-border/50 bg-slate-100/60 dark:bg-midnight-900/40 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs uppercase font-bold tracking-wider text-studio-blue dark:text-cyan-400">
              Complete Audio Production Suite
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              Engineered for Genuine Creative Control
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              No mock audio, zero infinite loading, and dual-engine fallback for instant rendering.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-3xl bg-white dark:bg-midnight-900/70 border border-slate-200 dark:border-studio-border/60 hover:border-studio-blue/40 transition-all space-y-3 shadow-sm hover:shadow-md">
              <div className="w-10 h-10 rounded-xl bg-studio-blue/10 border border-studio-blue/20 flex items-center justify-center text-studio-blue dark:text-cyan-400">
                <Mic2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Full Songs with AI Vocals</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Compose complete vocal tracks with custom lyrics, structure tags ([Intro], [Chorus]), vocal delivery styles, and AI lyric assistance using ElevenLabs Music API.
              </p>
              <div className="pt-2 text-xs text-studio-blue dark:text-cyan-400 font-bold flex items-center gap-1">
                <Link href="/studio">Explore Vocal Studio &rarr;</Link>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-3xl bg-white dark:bg-midnight-900/70 border border-slate-200 dark:border-studio-border/60 hover:border-cyan-500/40 transition-all space-y-3 shadow-sm hover:shadow-md">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-300">
                <Volume2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Sound Effects &amp; Foley v3</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Design custom sound effects with prompt influence parameters, seamless loop modes, and zero infinite loading via ElevenLabs Text-to-Sound v3.
              </p>
              <div className="pt-2 text-xs text-cyan-600 dark:text-cyan-400 font-bold flex items-center gap-1">
                <Link href="/sfx">Explore SFX Studio &rarr;</Link>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-3xl bg-white dark:bg-midnight-900/70 border border-slate-200 dark:border-studio-border/60 hover:border-studio-violet/40 transition-all space-y-3 shadow-sm hover:shadow-md">
              <div className="w-10 h-10 rounded-xl bg-studio-violet/10 border border-studio-violet/20 flex items-center justify-center text-studio-violet dark:text-purple-400">
                <BotMessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Sonic Assistant (Voice)</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Conversational assistant with browser microphone speech recognition and voice feedback powered by Rime Coda text-to-speech.
              </p>
              <div className="pt-2 text-xs text-studio-violet dark:text-purple-400 font-bold flex items-center gap-1">
                <Link href="/assistant">Talk with Copilot &rarr;</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-studio-border/60 py-8 px-4 sm:px-6 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2 bg-white/50 dark:bg-transparent">
        <p className="font-semibold text-slate-700 dark:text-slate-300">
          SONICFORGE AI &bull; Built for GeeksforGeeks Generative AI Clash &bull; Techno India University
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] pt-1">
          <a href={`mailto:${SUPPORT_CONFIG.supportEmail}`} className="hover:text-studio-blue dark:hover:text-cyan-300 font-mono">
            Support: {SUPPORT_CONFIG.supportEmail}
          </a>
          <span>&bull;</span>
          <a href={`tel:${SUPPORT_CONFIG.supportPhone}`} className="hover:text-emerald-500 font-mono">
            Helpline: {SUPPORT_CONFIG.supportPhoneDisplay}
          </a>
        </div>
        <p className="text-[10px] text-slate-400 pt-1">
          Powered by ElevenLabs Music &amp; Sound Generation, Rime Coda TTS, and Google Firebase.
        </p>
      </footer>
    </div>
  );
}
