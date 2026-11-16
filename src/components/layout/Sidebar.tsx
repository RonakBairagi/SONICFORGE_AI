'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Music2,
  Volume2,
  FolderKanban,
  Library,
  BotMessageSquare,
  HelpCircle,
  Settings,
  Activity,
  LayoutDashboard,
  LogOut,
  Sparkles,
  Mic2,
  Radio,
  Piano,
  Layers,
  BookOpen,
  Disc3,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { SUPPORT_CONFIG } from '@/lib/support-config';

export interface NavGroup {
  title: string;
  items: {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Workspace',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'AI Music Studio', href: '/studio', icon: Music2, badge: 'Pro' },
      { name: 'Custom Songwriter', href: '/custom-song', icon: Mic2, badge: 'Lyrics' },
      { name: 'Sound Effects Studio', href: '/sfx', icon: Volume2 },
      { name: 'Neural Stem Lab', href: '/stems', icon: Disc3, badge: 'AI' },
      { name: 'Sonic Loop Lab', href: '/loop-lab', icon: Layers, badge: 'Mixer' },
    ],
  },
  {
    title: 'Music Tools',
    items: [
      { name: 'SonicTune Tuner', href: '/tuner', icon: Radio, badge: 'Pitch' },
      { name: 'Sonic Harmonium', href: '/harmonium', icon: Piano, badge: 'Sargam' },
      { name: 'Rhythm & Practice', href: '/practice', icon: Activity, badge: 'Taal' },
      { name: 'Vocal Pitch Coach', href: '/vocal-coach', icon: Sparkles, badge: 'Live' },
      { name: 'Chord & Scale Explorer', href: '/chords', icon: BookOpen },
    ],
  },
  {
    title: 'Library',
    items: [
      { name: 'Projects Vault', href: '/projects', icon: FolderKanban },
      { name: 'My Library', href: '/library', icon: Library },
    ],
  },
  {
    title: 'Assistance & System',
    items: [
      { name: 'Sonic Assistant', href: '/assistant', icon: BotMessageSquare, badge: 'Voice' },
      { name: 'Help & Support', href: '/support', icon: HelpCircle },
      { name: 'System Diagnostics', href: '/diagnostics', icon: Activity },
    ],
  },
];

// Flat export for Navbar breadcrumbs
export const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

export function Sidebar({ className = '' }: { className?: string }) {
  const pathname = usePathname();
  const { user, profile, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);

  const artistName = profile?.displayName || user?.email?.split('@')[0] || 'Studio Artist';

  return (
    <aside
      aria-label="Studio Sidebar Navigation"
      className={`shrink-0 transition-all duration-300 ease-in-out border-r border-plum-700/20 dark:border-white/10 bg-white/70 dark:bg-charcoal-900/65 backdrop-blur-2xl flex flex-col justify-between h-screen sticky top-0 z-30 shadow-xl ${
        collapsed ? 'w-20' : 'w-64'
      } ${className}`}
    >
      <div className="flex flex-col min-h-0 flex-1">
        {/* Brand Header */}
        <div className="p-4 border-b border-plum-700/15 dark:border-white/10 flex items-center justify-between shrink-0">
          <Link href="/" className="flex items-center gap-2.5 group overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-plum-700 via-champagne-500 to-plum-500 p-0.5 shadow-lg shadow-plum-950/20 shrink-0">
              <div className="w-full h-full bg-charcoal-950 rounded-[10px] flex items-center justify-center">
                <Music2 className="w-5 h-5 text-champagne-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0 transition-opacity duration-200">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm tracking-tight text-charcoal-900 dark:text-white">
                    SONICFORGE
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-champagne-400/15 text-champagne-600 dark:text-champagne-300 border border-champagne-400/25 font-bold uppercase tracking-wider">
                    AI
                  </span>
                </div>
                <span className="text-[10px] text-muted font-medium tracking-wide">
                  Music & Sound Studio
                </span>
              </div>
            )}
          </Link>

          {/* Collapse / Expand Toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-charcoal-900 dark:hover:text-white hover:bg-cream-100 dark:hover:bg-charcoal-800 transition-colors"
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            aria-label="Toggle Sidebar"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Scrollable Navigation Groups */}
        <nav className="p-3 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="space-y-1">
              {!collapsed && (
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted/70">
                  {group.title}
                </div>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.name : undefined}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all group relative ${
                      isActive
                        ? 'bg-gradient-to-r from-plum-600/20 via-plum-500/15 to-champagne-400/10 text-charcoal-900 dark:text-white border border-champagne-400/30 shadow-sm'
                        : 'text-slate-600 dark:text-lavender-200/70 hover:text-charcoal-900 dark:hover:text-white hover:bg-cream-100/70 dark:hover:bg-charcoal-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive
                            ? 'text-champagne-500 dark:text-champagne-400'
                            : 'text-slate-400 dark:text-lavender-300/60 group-hover:text-charcoal-900 dark:group-hover:text-white'
                        }`}
                      />
                      {!collapsed && <span className="truncate">{item.name}</span>}
                    </div>

                    {!collapsed && item.badge && (
                      <span className="text-[8px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full bg-champagne-400/15 border border-champagne-400/30 text-champagne-600 dark:text-champagne-300 shrink-0">
                        {item.badge}
                      </span>
                    )}

                    {/* Active highlight glow marker */}
                    {isActive && (
                      <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-gradient-to-b from-champagne-400 to-plum-500 rounded-r-full shadow-md shadow-champagne-400/50" />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* User Footer & Quick Settings */}
      <div className="p-3 border-t border-plum-700/15 dark:border-white/10 space-y-2 shrink-0 bg-cream-50/40 dark:bg-charcoal-950/40">
        {!collapsed ? (
          <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-xl bg-white/50 dark:bg-charcoal-850/50 border border-slate-200/60 dark:border-white/5">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-plum-600 to-champagne-400 flex items-center justify-center text-charcoal-950 text-xs font-bold shrink-0">
                {artistName.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-charcoal-900 dark:text-white truncate">
                  {artistName}
                </span>
                <span className="text-[10px] text-muted truncate">
                  {user ? (user.isAnonymous ? 'Guest Producer' : user.email) : 'Ready'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={toggleTheme}
                className="p-1.5 rounded-lg text-slate-500 dark:text-lavender-300 hover:text-champagne-500 dark:hover:text-champagne-400 hover:bg-cream-100 dark:hover:bg-charcoal-800 transition-colors"
                title={theme === 'dark' ? 'Light Theme' : 'Dark Theme'}
                aria-label="Toggle Theme"
              >
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-champagne-400" /> : <Moon className="w-3.5 h-3.5 text-plum-600" />}
              </button>

              <Link
                href="/settings"
                className="p-1.5 rounded-lg text-slate-500 dark:text-lavender-300 hover:text-champagne-500 dark:hover:text-champagne-400 hover:bg-cream-100 dark:hover:bg-charcoal-800 transition-colors"
                title="Settings"
              >
                <Settings className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-500 dark:text-lavender-300 hover:text-champagne-400 hover:bg-cream-100 dark:hover:bg-charcoal-800 transition-colors"
              title={theme === 'dark' ? 'Light Theme' : 'Dark Theme'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-champagne-400" /> : <Moon className="w-4 h-4 text-plum-600" />}
            </button>
            <Link
              href="/settings"
              className="p-2 rounded-xl text-slate-500 dark:text-lavender-300 hover:text-champagne-400 hover:bg-cream-100 dark:hover:bg-charcoal-800 transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
