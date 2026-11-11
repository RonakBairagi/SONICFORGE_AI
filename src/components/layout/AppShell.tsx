'use client';

import React from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { AudioPlayer } from '../audio/AudioPlayer';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-midnight-950 text-slate-100 flex flex-col md:flex-row antialiased selection:bg-studio-blue/30 selection:text-cyan-200">
      {/* Desktop Sidebar */}
      <Sidebar className="hidden md:flex" />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-28 md:pb-24">
        <Navbar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">{children}</main>
      </div>

      {/* Global Docked Audio Player */}
      <AudioPlayer />
    </div>
  );
}

