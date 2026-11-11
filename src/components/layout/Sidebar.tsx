'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sparkles,
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
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export const NAV_ITEMS = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Music Studio', href: '/studio', icon: Music2, badge: 'AI' },
  { name: 'SFX Studio', href: '/sfx', icon: Volume2 },
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
      className={`w-64 shrink-0 bg-midnight-950/90 border-r border-studio-border/60 backdrop-blur-xl flex flex-col justify-between h-screen sticky top-0 ${className}`}
    >
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-studio-border/50 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-studio-blue via-studio-violet to-cyan-400 p-0.5 shadow-lg shadow-studio-blue/20">
              <div className="w-full h-full bg-midnight-950 rounded-[10px] flex items-center justify-center">
                <Music2 className="w-5 h-5 text-cyan-300 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div>
              <span className="font-bold text-base tracking-tight bg-gradient-to-r from-white via-slate-200 to-cyan-300 bg-clip-text text-transparent">
                SONICFORGE
              </span>
              <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold tracking-wider">
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
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-gradient-to-r from-studio-blue/20 to-studio-violet/20 text-white border border-studio-blue/40 shadow-sm shadow-studio-blue/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-full bg-studio-violet/20 border border-studio-violet/30 text-studio-violet">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Footer / Auth Status */}
      <div className="p-3 border-t border-studio-border/50">
        {user ? (
          <div className="p-2.5 rounded-xl bg-midnight-900/60 border border-white/5 flex items-center justify-between">
            <Link href="/settings" className="flex items-center gap-2.5 min-w-0 group">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-studio-violet to-studio-blue flex items-center justify-center text-xs font-bold text-white shrink-0">
                {profile?.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'P'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-cyan-300 transition-colors">
                  {profile?.displayName || 'Studio Artist'}
                </p>
                <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
              </div>
            </Link>
            <button
              onClick={() => logout()}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <Link
              href="/login"
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-studio-blue to-studio-violet text-white text-xs font-semibold shadow-md shadow-studio-blue/20 hover:opacity-95 transition-opacity"
            >
              <span>Sign In</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}

