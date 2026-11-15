'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Music2,
  Volume2,
  Sparkles,
  ArrowRight,
  Headphones,
  Sliders,
  Layers,
  Radio,
  LogIn,
} from 'lucide-react';

export function WelcomeScreen() {
  const router = useRouter();
  const pathname = usePathname();

  const [hasMounted, setHasMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    try {
      const seen = sessionStorage.getItem('sonicforge_welcome_seen');
      if (!seen) {
        setIsOpen(true);
      }
    } catch {
      // If sessionStorage is restricted or disabled, fail silently without blocking app
      setIsOpen(false);
    }
  }, []);

  // Hydration safety: do not render anything on server
  if (!hasMounted || !isOpen) {
    return null;
  }

  const handleDismiss = (destination?: string) => {
    try {
      sessionStorage.setItem('sonicforge_welcome_seen', 'true');
    } catch {
      // Ignore storage errors in private modes
    }

    setIsExiting(true);

    // Allow exit transition to play smoothly
    setTimeout(() => {
      setIsOpen(false);
      setIsExiting(false);
      if (destination) {
        router.push(destination);
      } else if (pathname === '/') {
        router.push('/dashboard');
      }
    }, 500);
  };

  // Sound visualization equalizer bars
  const equalizerBars = [
    { height: '40%', delay: '0ms', duration: '1100ms' },
    { height: '70%', delay: '150ms', duration: '950ms' },
    { height: '95%', delay: '300ms', duration: '1200ms' },
    { height: '55%', delay: '100ms', duration: '850ms' },
    { height: '85%', delay: '250ms', duration: '1050ms' },
    { height: '100%', delay: '50ms', duration: '1300ms' },
    { height: '65%', delay: '200ms', duration: '900ms' },
    { height: '90%', delay: '350ms', duration: '1150ms' },
    { height: '50%', delay: '80ms', duration: '1000ms' },
    { height: '75%', delay: '220ms', duration: '920ms' },
    { height: '100%', delay: '180ms', duration: '1250ms' },
    { height: '60%', delay: '320ms', duration: '880ms' },
    { height: '80%', delay: '120ms', duration: '1100ms' },
    { height: '45%', delay: '280ms', duration: '970ms' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to SonicForge AI"
      className={`fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto overflow-x-hidden p-4 sm:p-6 transition-all duration-500 ease-out ${
        isExiting
          ? 'opacity-0 scale-95 pointer-events-none'
          : 'opacity-100 scale-100 backdrop-blur-3xl'
      }`}
      style={{
        backgroundColor: 'rgba(7, 9, 14, 0.94)',
      }}
    >
      {/* Cinematic Ambient Background Lighting */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Violet ambient glow */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 rounded-full bg-studio-violet/20 blur-[120px] animate-pulse-slow" />
        {/* Blue ambient glow */}
        <div className="absolute bottom-1/4 -right-20 w-[420px] h-[420px] rounded-full bg-studio-blue/20 blur-[130px] animate-pulse-slow" />
        {/* Cyan center focal accent */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full bg-cyan-500/10 blur-[140px]" />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Main Glassmorphic Welcome Card */}
      <div className="relative w-full max-w-3xl my-auto rounded-3xl bg-midnight-900/80 border border-white/10 shadow-2xl shadow-black/80 backdrop-blur-2xl p-6 sm:p-10 md:p-12 overflow-hidden text-center z-10">
        {/* Top Glow Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-studio-blue via-studio-violet to-cyan-400" />

        {/* Brand Logo & Studio Badge */}
        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/[0.04] border border-white/10 shadow-inner mb-6 backdrop-blur-md">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-studio-blue via-studio-violet to-cyan-400 p-0.5 shadow-md shadow-studio-blue/30">
            <div className="w-full h-full bg-midnight-950 rounded-[6px] flex items-center justify-center">
              <Music2 className="w-4 h-4 text-cyan-300" />
            </div>
          </div>
          <span className="text-xs font-bold tracking-widest text-slate-300 uppercase">
            SONICFORGE AI
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
        </div>

        {/* Headings */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-3">
          Welcome to{' '}
          <span className="bg-gradient-to-r from-cyan-300 via-studio-blue to-studio-violet bg-clip-text text-transparent">
            SONICFORGE AI
          </span>
        </h1>

        <p className="text-base sm:text-lg md:text-xl font-medium text-cyan-300/90 mb-4 tracking-wide">
          Where Imagination Becomes Sound.
        </p>

        <p className="text-xs sm:text-sm md:text-base text-slate-300 max-w-xl mx-auto mb-8 leading-relaxed font-normal">
          Create original music, generate immersive sound effects, and transform your creative ideas
          into extraordinary audio experiences with AI.
        </p>

        {/* Dynamic Equalizer Waveform Sound Visualization */}
        <div className="flex items-end justify-center gap-1 sm:gap-1.5 h-14 sm:h-16 mb-8 max-w-md mx-auto px-4 py-2 rounded-2xl bg-midnight-950/60 border border-white/5 shadow-inner">
          {equalizerBars.map((bar, idx) => (
            <div
              key={idx}
              className="w-1.5 sm:w-2 rounded-full bg-gradient-to-t from-studio-blue via-studio-violet to-cyan-300"
              style={{
                height: bar.height,
                animation: `wave ${bar.duration} ease-in-out infinite alternate`,
                animationDelay: bar.delay,
              }}
            />
          ))}
        </div>

        {/* 3 Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-8 text-left">
          {/* Feature 1: AI Music Generation */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-studio-blue/40 transition-all duration-300 group shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-studio-blue/15 border border-studio-blue/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Music2 className="w-4 h-4 text-studio-blue" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">AI Music Generation</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Full-track composition, singing vocals, and instrumental stems with ElevenLabs.
            </p>
          </div>

          {/* Feature 2: AI Sound Effects */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-cyan-400/40 transition-all duration-300 group shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Volume2 className="w-4 h-4 text-cyan-300" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">AI Sound Effects</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Hyper-realistic foley, cinematic impacts, and ambient soundscapes with multi-take batching.
            </p>
          </div>

          {/* Feature 3: AI Voice & Creative Assistant */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-studio-violet/40 transition-all duration-300 group shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-studio-violet/15 border border-studio-violet/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Sparkles className="w-4 h-4 text-studio-violet" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">AI Voice &amp; Assistant</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Conversational voice direction, lyric ideation, and audio co-pilot powered by Rime Coda.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={() => handleDismiss()}
            className="w-full sm:w-auto min-w-[220px] px-8 py-3.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-studio-blue via-indigo-600 to-cyan-500 hover:from-studio-blue/90 hover:to-cyan-400 shadow-lg shadow-studio-blue/25 hover:shadow-cyan-500/30 transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 group cursor-pointer"
          >
            <span>Get Started</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            type="button"
            onClick={() => handleDismiss('/login')}
            className="text-xs text-slate-400 hover:text-cyan-300 transition-colors flex items-center gap-1.5 font-medium cursor-pointer py-1"
          >
            <span>Already have an account?</span>
            <span className="text-white hover:underline font-semibold flex items-center gap-1">
              Sign In
              <LogIn className="w-3 h-3" />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

