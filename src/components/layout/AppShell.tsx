'use client';

import React from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { AudioPlayer } from '../audio/AudioPlayer';
import { AnimatedBackground } from '../ui/AnimatedBackground';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream-50/90 dark:bg-charcoal-950/85 text-charcoal-900 dark:text-lavender-50 flex flex-col md:flex-row antialiased selection:bg-champagne-400/30 selection:text-champagne-200 relative transition-colors duration-300">
      {/* Cinematic Animated Background Layer */}
      <AnimatedBackground />

      {/* Primary Studio Sidebar Navigation */}
      <Sidebar className="hidden md:flex relative z-20" />

      {/* Main Studio Viewport */}
      <div className="flex-1 flex flex-col min-w-0 pb-28 md:pb-24 relative z-10">
        <Navbar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>

      {/* Master Docked Audio Player */}
      <div className="relative z-40">
        <AudioPlayer />
      </div>
    </div>
  );
}
