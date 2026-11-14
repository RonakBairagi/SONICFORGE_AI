'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  X,
  Music2,
  Sparkles,
  HelpCircle,
  Activity,
  User,
  Sun,
  Moon,
  Phone,
  Mic2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { SUPPORT_CONFIG } from '@/lib/support-config';
import { NAV_ITEMS } from './Sidebar';

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const currentNav = NAV_ITEMS.find((item) => item.href === pathname);
  const title = currentNav ? currentNav.name : 'SonicForge Studio';

  return (
    <>
      <header className="sticky top-0 z-30 h-16 border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-midnight-950/80 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between transition-colors shadow-sm">
        {/* Left: Mobile hamburger & section title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2">
            <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {title}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-studio-blue/10 dark:bg-cyan-500/10 border border-studio-blue/20 dark:border-cyan-500/20 text-studio-blue dark:text-cyan-300">
              <span className="w-1.5 h-1.5 rounded-full bg-studio-blue dark:bg-cyan-400 animate-pulse" />
              ElevenLabs Engine
            </span>
          </div>
        </div>

        {/* Right: Actions, Theme Switcher, Support, Profile */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Quick Create Custom Song Action */}
          <Link
            href="/custom-song"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-studio-violet to-studio-blue text-white text-xs font-bold shadow-md shadow-studio-violet/20 hover:opacity-95 transition-all"
          >
            <Mic2 className="w-3.5 h-3.5" />
            <span>Custom Song</span>
          </Link>

          {/* Theme Toggle Button (Light / Dark) */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-studio-violet" />
            )}
          </button>

          {/* Direct Support Phone Link */}
          <a
            href={`tel:${SUPPORT_CONFIG.supportPhone}`}
            className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={`Call Support Hotline: ${SUPPORT_CONFIG.supportPhoneDisplay}`}
          >
            <Phone className="w-3.5 h-3.5 text-emerald-500" />
            <span className="font-mono">{SUPPORT_CONFIG.supportPhoneDisplay}</span>
          </a>

          <Link
            href="/diagnostics"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="System Diagnostics"
          >
            <Activity className="w-4 h-4" />
          </Link>

          <Link
            href="/support"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Help Desk & Support"
          >
            <HelpCircle className="w-4 h-4" />
          </Link>

          {/* User Avatar / Profile */}
          <Link
            href="/settings"
            className="p-1 rounded-xl hover:ring-2 hover:ring-studio-blue/40 transition-all ml-1"
            title="Settings & Profile"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-studio-blue to-studio-violet flex items-center justify-center text-white text-xs font-bold shadow-sm">
              {user?.email ? user.email.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
            </div>
          </Link>
        </div>
      </header>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-72 max-w-[80vw] h-full bg-white dark:bg-midnight-950 p-5 space-y-4 shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Music2 className="w-5 h-5 text-studio-blue dark:text-cyan-400" />
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  SONICFORGE STUDIO
                </span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-studio-blue/10 dark:bg-studio-blue/20 text-studio-blue dark:text-cyan-300 font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-full bg-studio-violet/10 text-studio-violet dark:bg-studio-violet/20 dark:text-purple-300 font-bold">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="pt-4 border-t border-slate-200 dark:border-white/10 space-y-2 text-xs">
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Theme:</span>
                <button
                  onClick={toggleTheme}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5"
                >
                  {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-studio-violet" />}
                  <span className="capitalize">{theme}</span>
                </button>
              </div>

              <div className="py-2 text-[11px] text-slate-500 dark:text-slate-400">
                <span>Support Hotline: </span>
                <a
                  href={`tel:${SUPPORT_CONFIG.supportPhone}`}
                  className="font-mono font-bold text-emerald-600 dark:text-emerald-400 block mt-0.5"
                >
                  {SUPPORT_CONFIG.supportPhoneDisplay}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
