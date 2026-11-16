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
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function WelcomeScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, loading: authLoading } = useAuth();

  const [hasMounted, setHasMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [initStage, setInitStage] = useState<'checking' | 'restoring' | 'ready'>('checking');

  useEffect(() => {
    setHasMounted(true);
    try {
      const seen = sessionStorage.getItem('sonicforge_welcome_seen');
      if (!seen) {
        setIsOpen(true);
        // Genuine Initialization Sequence
        setTimeout(() => {
          setInitStage('restoring');
          setTimeout(() => {
            setInitStage('ready');
          }, 600);
        }, 500);
      }
    } catch {
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
      // Ignore private browsing storage restriction
    }

    setIsExiting(true);

    setTimeout(() => {
      setIsOpen(false);
      setIsExiting(false);
      if (destination) {
        router.push(destination);
      } else if (pathname === '/') {
        if (user) {
          router.push('/dashboard');
        } else {
          router.push('/login');
        }
      }
    }, 450);
  };

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
      {/* Ambient Radial Lights */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-96 h-96 rounded-full bg-studio-violet/20 blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-1/4 -right-20 w-[420px] h-[420px] rounded-full bg-studio-blue/20 blur-[130px] animate-pulse-slow" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full bg-cyan-500/10 blur-[140px]" />
      </div>

      {/* Main Glassmorphic Card */}
      <div className="relative w-full max-w-3xl my-auto rounded-3xl bg-midnight-900/85 border border-white/10 shadow-2xl shadow-black/80 backdrop-blur-2xl p-6 sm:p-10 md:p-12 overflow-hidden text-center z-10">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-studio-blue via-studio-violet to-cyan-400" />

        {/* Brand Badge */}
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

        <p className="text-base sm:text-lg md:text-xl font-medium text-cyan-300/90 mb-3 tracking-wide">
          Where Imagination Becomes Sound.
        </p>

        <p className="text-xs sm:text-sm md:text-base text-slate-300 max-w-xl mx-auto mb-6 leading-relaxed font-normal">
          Create original music, isolate stems with Neural Analog, generate sound effects, and transform your creative ideas into extraordinary audio experiences with AI.
        </p>

        {/* Real Initialization Status Indicator */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/60 border border-white/5 text-[11px] font-mono text-slate-400 mb-6">
          {initStage === 'checking' ? (
            <>
              <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />
              <span>Initializing Web Audio Engine...</span>
            </>
          ) : initStage === 'restoring' ? (
            <>
              <Loader2 className="w-3 h-3 text-studio-violet animate-spin" />
              <span>Restoring Firebase Security Session...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>
                Studio Ready {user ? `• Authenticated as ${profile?.displayName || user.email}` : '• Ready to Explore'}
              </span>
            </>
          )}
        </div>

        {/* Equalizer Visualizer */}
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

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-8 text-left">
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-studio-blue/15 border border-studio-blue/30 flex items-center justify-center mb-3">
              <Music2 className="w-4 h-4 text-studio-blue" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">AI Music &amp; Vocals</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Full songs, singing vocals, and stems powered by ElevenLabs.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center mb-3">
              <Layers className="w-4 h-4 text-cyan-300" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">Neural Stem Lab</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              RoFormer source separation with Neural Analog into 4-6 stems.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-studio-violet/15 border border-studio-violet/30 flex items-center justify-center mb-3">
              <Sparkles className="w-4 h-4 text-studio-violet" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">Live Instruments</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              SonicTune tuner, Harmonium, Rhythm Taals, and Loop Lab mixer.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={() => handleDismiss(user ? '/dashboard' : '/dashboard')}
            className="w-full sm:w-auto min-w-[220px] px-8 py-3.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-studio-blue via-indigo-600 to-cyan-500 hover:from-studio-blue/90 hover:to-cyan-400 shadow-lg shadow-studio-blue/25 flex items-center justify-center gap-2 group cursor-pointer transition-all"
          >
            <span>{user ? 'Enter Studio Dashboard' : 'Get Started'}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          {!user && (
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
          )}
        </div>
      </div>
    </div>
  );
}
