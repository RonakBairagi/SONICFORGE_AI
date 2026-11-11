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
} from 'lucide-react';
import { WaveformVisualizer } from '@/components/audio/WaveformVisualizer';
import { useAuth } from '@/context/AuthContext';

export default function LandingPage() {
  const { user } = useAuth();

  // Representative normalized real waveform peaks for hero display
  const demoPeaks = [
    0.2, 0.35, 0.6, 0.45, 0.8, 0.95, 0.7, 0.55, 0.3, 0.65, 0.85, 0.9, 0.75, 0.4, 0.6, 0.8,
    1.0, 0.85, 0.65, 0.5, 0.7, 0.9, 0.8, 0.6, 0.35, 0.5, 0.75, 0.85, 0.65, 0.4, 0.55, 0.7,
    0.85, 0.95, 0.8, 0.6, 0.45, 0.65, 0.75, 0.55, 0.4, 0.3, 0.25, 0.2, 0.15, 0.1, 0.08, 0.05
  ];

  return (
    <div className="min-h-screen bg-midnight-950 text-slate-100 selection:bg-studio-blue/30 selection:text-cyan-200">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-studio-border/60 bg-midnight-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-studio-blue via-studio-violet to-cyan-400 p-0.5 shadow-lg shadow-studio-blue/20">
              <div className="w-full h-full bg-midnight-950 rounded-[10px] flex items-center justify-center">
                <Music2 className="w-5 h-5 text-cyan-300" />
              </div>
            </div>
            <div>
              <span className="font-bold text-base tracking-tight bg-gradient-to-r from-white via-slate-200 to-cyan-300 bg-clip-text text-transparent">
                SONICFORGE AI
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400">
            <Link href="/studio" className="hover:text-cyan-300 transition-colors">
              Music Studio
            </Link>
            <Link href="/sfx" className="hover:text-cyan-300 transition-colors">
              SFX Studio
            </Link>
            <Link href="/assistant" className="hover:text-cyan-300 transition-colors">
              Sonic Assistant
            </Link>
            <Link href="/diagnostics" className="hover:text-cyan-300 transition-colors">
              Diagnostics
            </Link>
            <Link href="/support" className="hover:text-cyan-300 transition-colors">
              Support
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-studio-blue to-studio-violet text-white text-xs font-semibold shadow-md shadow-studio-blue/20 hover:opacity-95 transition-all"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-studio-blue to-studio-violet text-white text-xs font-semibold shadow-md shadow-studio-blue/20 hover:opacity-95 transition-all"
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
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-midnight-900/90 border border-studio-border/80 text-xs font-semibold shadow-xl">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-slate-300">GeeksforGeeks Generative AI Clash</span>
            <span className="text-slate-500">•</span>
            <span className="text-cyan-300">Techno India University</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
            Empowering Artists with{' '}
            <span className="bg-gradient-to-r from-cyan-300 via-studio-blue to-studio-violet bg-clip-text text-transparent">
              Generative AI Audio
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            A professional AI Music &amp; Sound Studio for musicians, indie game developers, filmmakers,
            and podcasters. Powered by official ElevenLabs Music &amp; SFX models with real-time Rime Coda voice guidance.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <Link
              href="/studio"
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-studio-blue via-indigo-600 to-studio-violet hover:from-blue-500 hover:to-violet-500 text-white font-semibold text-sm shadow-xl shadow-studio-blue/25 hover:shadow-studio-blue/40 transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-cyan-300" />
              <span>Launch Music Studio</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/assistant"
              className="px-6 py-3 rounded-2xl bg-midnight-900/80 hover:bg-midnight-850 border border-studio-border/80 hover:border-studio-blue/40 text-slate-200 font-semibold text-sm transition-all flex items-center gap-2"
            >
              <BotMessageSquare className="w-4 h-4 text-studio-violet" />
              <span>Talk to Sonic Assistant</span>
            </Link>
          </div>

          {/* Interactive Waveform Banner Card */}
          <div className="mt-12 p-6 rounded-3xl bg-midnight-900/80 border border-studio-border/80 backdrop-blur-xl shadow-2xl max-w-2xl mx-auto space-y-4">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Disc3 className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
                <span className="font-semibold text-slate-200">
                  Cinematic Orchestral Crescendo (Demo Cue)
                </span>
              </div>
              <span className="font-mono text-cyan-400">44.1 kHz • MP3</span>
            </div>

            <WaveformVisualizer peaks={demoPeaks} progress={0.42} height={42} />

            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>0:13</span>
              <span className="text-slate-300">ElevenLabs music_v2 Engine</span>
              <span>0:30</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section className="py-20 border-t border-studio-border/50 bg-midnight-900/40 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs uppercase font-bold tracking-wider text-cyan-400">
              Complete Audio Production Suite
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Engineered for Genuine Creative Control
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              No fake buttons, no simulated waveforms. Production-grade cloud integrations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-midnight-900/70 border border-studio-border/60 hover:border-studio-blue/40 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-studio-blue/10 border border-studio-blue/20 flex items-center justify-center text-cyan-400">
                <Music2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-100">AI Music Studio</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Compose full orchestral cues, synthwave grooves, ambient textures, and study beats with
                duration controls, tempo guidance, and instrument filters using ElevenLabs Music API.
              </p>
              <div className="pt-2 text-xs text-cyan-400 font-semibold flex items-center gap-1">
                <Link href="/studio">Explore Music Studio &rarr;</Link>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-midnight-900/70 border border-studio-border/60 hover:border-cyan-500/40 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-300">
                <Volume2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-100">SFX &amp; Foley Studio</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Design custom sound effects with prompt influence parameters, seamless loop modes for
                nature ambiances, and sub-second precision using the ElevenLabs Text-to-Sound model.
              </p>
              <div className="pt-2 text-xs text-cyan-400 font-semibold flex items-center gap-1">
                <Link href="/sfx">Explore SFX Studio &rarr;</Link>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-midnight-900/70 border border-studio-border/60 hover:border-studio-violet/40 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-studio-violet/10 border border-studio-violet/20 flex items-center justify-center text-studio-violet">
                <BotMessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-100">Sonic Assistant (Voice)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Conversational assistant with browser microphone speech recognition and realistic voice
                feedback powered by Rime Coda text-to-speech.
              </p>
              <div className="pt-2 text-xs text-studio-violet font-semibold flex items-center gap-1">
                <Link href="/assistant">Talk with Copilot &rarr;</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-studio-border/60 py-8 px-4 sm:px-6 text-center text-xs text-slate-500 space-y-2">
        <p>
          SONICFORGE AI &bull; Built for GeeksforGeeks Generative AI Clash &bull; Techno India University
        </p>
        <p className="text-[11px] text-slate-400">
          Powered by ElevenLabs Music &amp; Sound Generation, Rime Coda TTS, and Google Firebase.
        </p>
      </footer>
    </div>
  );
}

