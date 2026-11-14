'use client';

import React from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { AudioPlayer } from '../audio/AudioPlayer';
import { AnimatedBackground } from '../ui/AnimatedBackground';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-midnight-950 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row antialiased selection:bg-studio-blue/30 selection:text-cyan-200 relative transition-colors duration-200">
      {/* Background audio waves & particles */}
      <AnimatedBackground />

      {/* Desktop Sidebar */}
      <Sidebar className="hidden md:flex relative z-10" />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-28 md:pb-24 relative z-10">
        <Navbar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">{children}</main>
      </div>

      {/* Global Docked Audio Player */}
      <div className="relative z-40">
        <AudioPlayer />
      </div>
    </div>
  );
}
