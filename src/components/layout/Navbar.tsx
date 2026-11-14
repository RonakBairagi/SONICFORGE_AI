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
      <header className="sticky top-0 z-30 h-16 border-b border-studio-border/60 dark:border-white/10 bg-midnight-950/80 dark:bg-midnight-950/80 light:bg-white/90 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between transition-colors">
        {/* Left: Mobile hamburger & section title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white dark:hover:text-white light:hover:text-slate-900 hover:bg-slate-800/40 transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2">
            <span className="text-sm sm:text-base font-semibold text-slate-100 dark:text-slate-100 light:text-slate-900 flex items-center gap-2">
              {title}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-cyan-950/60 dark:bg-cyan-950/60 light:bg-cyan-50 border border-cyan-500/20 text-cyan-300 dark:text-cyan-300 light:text-cyan-700">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Production Ready
            </span>
          </div>
        </div>

        {/* Right: Actions, Theme Switcher, Support, Profile */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Quick Generate Action */}
          <Link
            href="/studio"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-studio-blue/90 to-studio-violet/90 hover:from-studio-blue hover:to-studio-violet text-white text-xs font-semibold shadow-md shadow-studio-blue/15 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Create Song</span>
          </Link>

          {/* Theme Toggle Button (Light / Dark) */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-400 hover:text-cyan-400 hover:bg-slate-800/50 dark:hover:bg-slate-800/60 light:hover:bg-slate-100 transition-colors"
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
            className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-emerald-400 hover:bg-slate-800/50 dark:hover:bg-slate-800/60 light:hover:bg-slate-100 transition-colors"
            title={`Call Support: ${SUPPORT_CONFIG.supportPhoneDisplay}`}
          >
            <Phone className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-mono">{SUPPORT_CONFIG.supportPhoneDisplay}</span>
          </a>

          <Link
            href="/diagnostics"
            className="p-2 rounded-xl text-slate-400 hover:text-cyan-400 hover:bg-slate-800/50 dark:hover:bg-slate-800/60 light:hover:bg-slate-100 transition-colors"
            title="System Diagnostics"
          >
            <Activity className="w-4 h-4" />
          </Link>

          <Link
            href="/support"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 dark:hover:text-slate-200 light:hover:text-slate-900 hover:bg-slate-800/50 dark:hover:bg-slate-800/60 light:hover:bg-slate-100 transition-colors"
            title="Help Center & Support Desk"
          >
            <HelpCircle className="w-4 h-4" />
          </Link>

          {user ? (
            <Link
              href="/settings"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 dark:hover:text-slate-200 light:hover:text-slate-900 hover:bg-slate-800/50 dark:hover:bg-slate-800/60 light:hover:bg-slate-100 transition-colors"
              title="Profile & Settings"
            >
              <User className="w-4 h-4" />
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-xs px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden bg-midnight-950/80 dark:bg-midnight-950/80 light:bg-slate-900/60 backdrop-blur-md flex"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-72 bg-midnight-950 dark:bg-midnight-950 light:bg-white border-r border-studio-border dark:border-white/10 light:border-slate-200 h-full flex flex-col justify-between p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-studio-border dark:border-white/10 light:border-slate-200">
                <div className="flex items-center gap-2">
                  <Music2 className="w-5 h-5 text-cyan-400" />
                  <span className="font-bold text-slate-100 dark:text-slate-100 light:text-slate-900">
                    SonicForge AI
                  </span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="mt-4 space-y-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-studio-blue/20 text-white dark:text-white light:text-studio-blue border border-studio-blue/40'
                          : 'text-slate-400 hover:text-slate-200 dark:hover:text-slate-200 light:hover:text-slate-900 hover:bg-slate-900/60 light:hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded-full bg-studio-violet/20 text-studio-violet">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Mobile Footer */}
            <div className="pt-4 border-t border-studio-border dark:border-white/10 light:border-slate-200 space-y-2">
              <a
                href={`tel:${SUPPORT_CONFIG.supportPhone}`}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-800/80 text-emerald-400 text-xs font-medium"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call {SUPPORT_CONFIG.supportPhoneDisplay}</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
