'use client';

import React from 'react';
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
  ChevronRight,
  Phone,
  Sparkles,
  Mic2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { SUPPORT_CONFIG } from '@/lib/support-config';

export const NAV_ITEMS = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Music Studio', href: '/studio', icon: Music2, badge: 'Vocal AI' },
  { name: 'Custom Song', href: '/custom-song', icon: Mic2, badge: 'Lyrics' },
  { name: 'SFX Studio', href: '/sfx', icon: Volume2, badge: 'v3' },
  { name: 'My Library', href: '/library', icon: Library },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'Sonic Assistant', href: '/assistant', icon: BotMessageSquare, badge: 'Voice' },
  { name: 'Help & Support', href: '/support', icon: HelpCircle },
  { name: 'Diagnostics', href: '/diagnostics', icon: Activity },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar({ className = '' }: { className?: string }) {
  const pathname = usePathname();
  const { user, profile, logout } = useAuth();

  return (
    <aside
      aria-label="Studio Sidebar Navigation"
      className={`w-64 shrink-0 bg-white dark:bg-midnight-950 border-r border-slate-200 dark:border-white/10 backdrop-blur-xl flex flex-col justify-between h-screen sticky top-0 transition-colors z-30 shadow-sm ${className}`}
    >
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-studio-blue via-studio-violet to-cyan-400 p-0.5 shadow-lg shadow-studio-blue/20">
              <div className="w-full h-full bg-slate-900 dark:bg-midnight-950 rounded-[10px] flex items-center justify-center">
                <Music2 className="w-5 h-5 text-cyan-300 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                SONICFORGE
              </span>
              <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-studio-blue/10 text-studio-blue dark:bg-cyan-500/10 dark:text-cyan-400 border border-studio-blue/20 dark:border-cyan-500/20 font-bold tracking-wider">
                STUDIO
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all group ${
                  isActive
                    ? 'bg-gradient-to-r from-studio-blue/15 to-studio-violet/15 dark:from-studio-blue/25 dark:to-studio-violet/25 text-studio-blue dark:text-white border border-studio-blue/30 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-850/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive
                        ? 'text-studio-blue dark:text-cyan-400'
                        : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full bg-studio-violet/15 border border-studio-violet/30 text-studio-violet dark:text-purple-300">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Footer / Support Contact */}
      <div className="p-3 border-t border-slate-200 dark:border-white/10 space-y-2">
        {/* Support Hotline pill */}
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-midnight-900 border border-slate-200/80 dark:border-white/5 text-[11px] space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="font-semibold">Support Desk</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </div>
          <a
            href={`tel:${SUPPORT_CONFIG.supportPhone}`}
            className="flex items-center gap-1.5 font-mono font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            <Phone className="w-3 h-3" />
            <span>{SUPPORT_CONFIG.supportPhoneDisplay}</span>
          </a>
        </div>

        {/* User Account / Guest */}
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-midnight-900 border border-slate-200/80 dark:border-white/5 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 dark:text-slate-200 truncate">
              {profile?.displayName || user?.email?.split('@')[0] || 'Studio Guest'}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
              {user?.email || 'Local Session'}
            </p>
          </div>
          {user ? (
            <button
              onClick={() => logout()}
              className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-500/10 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          ) : (
            <Link
              href="/login"
              className="text-[11px] font-bold text-studio-blue dark:text-cyan-400 hover:underline"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}
