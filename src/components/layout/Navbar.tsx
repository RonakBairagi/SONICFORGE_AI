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
  Disc3,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { SUPPORT_CONFIG } from '@/lib/support-config';
import { NAV_GROUPS, NAV_ITEMS } from './Sidebar';

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const currentNav = NAV_ITEMS.find((item) => item.href === pathname);
  const title = currentNav ? currentNav.name : 'SonicForge Studio';

  return (
    <>
      <header className="sticky top-0 z-30 h-16 border-b border-plum-700/15 dark:border-white/10 bg-white/70 dark:bg-charcoal-900/65 backdrop-blur-2xl px-4 sm:px-6 flex items-center justify-between transition-colors shadow-sm">
        {/* Left: Mobile hamburger & section title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-500 hover:text-charcoal-900 dark:text-lavender-300 dark:hover:text-white hover:bg-cream-100 dark:hover:bg-charcoal-800 transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2">
            <span className="text-sm sm:text-base font-bold text-charcoal-900 dark:text-white flex items-center gap-2">
              {title}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-champagne-400/10 border border-champagne-400/25 text-champagne-600 dark:text-champagne-300">
              <span className="w-1.5 h-1.5 rounded-full bg-champagne-400 animate-pulse" />
              Studio Engine Active
            </span>
          </div>
        </div>

        {/* Right: Quick actions, Theme Switcher, Support, Profile */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Quick Create Custom Song Action */}
          <Link
            href="/custom-song"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-plum-600 via-plum-700 to-champagne-600 hover:from-plum-500 hover:to-champagne-500 text-white text-xs font-bold shadow-md shadow-plum-950/20 hover:opacity-95 transition-all"
          >
            <Mic2 className="w-3.5 h-3.5 text-champagne-300" />
            <span>Custom Song</span>
          </Link>

          {/* Quick Stem Lab Action */}
          <Link
            href="/stems"
            className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-champagne-400/25 bg-champagne-400/10 text-xs font-semibold text-champagne-700 dark:text-champagne-300 hover:bg-champagne-400/20 transition-all"
          >
            <Disc3 className="w-3.5 h-3.5" />
            <span>Stem Lab</span>
          </Link>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-500 hover:text-charcoal-900 dark:text-lavender-300 dark:hover:text-champagne-400 hover:bg-cream-100 dark:hover:bg-charcoal-800 transition-colors"
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-champagne-400" />
            ) : (
              <Moon className="w-4 h-4 text-plum-600" />
            )}
          </button>

          {/* Direct Support Phone Link */}
          <a
            href={`tel:${SUPPORT_CONFIG.supportPhone}`}
            className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-champagne-600 dark:text-lavender-300 dark:hover:text-champagne-300 hover:bg-cream-100 dark:hover:bg-charcoal-800 transition-colors"
            title={`Call Support Hotline: ${SUPPORT_CONFIG.supportPhoneDisplay}`}
          >
            <Phone className="w-3.5 h-3.5 text-champagne-500" />
            <span className="font-mono text-[11px]">{SUPPORT_CONFIG.supportPhoneDisplay}</span>
          </a>

          <Link
            href="/diagnostics"
            className="p-2 rounded-xl text-slate-500 hover:text-charcoal-900 dark:text-lavender-300 dark:hover:text-champagne-400 hover:bg-cream-100 dark:hover:bg-charcoal-800 transition-colors"
            title="System Diagnostics"
          >
            <Activity className="w-4 h-4" />
          </Link>

          <Link
            href="/settings"
            className="flex items-center gap-2 p-1.5 pl-2 sm:pr-2.5 rounded-xl bg-cream-100/60 dark:bg-charcoal-800/60 border border-slate-200/60 dark:border-white/5 hover:border-champagne-400/30 transition-all text-xs font-semibold text-charcoal-800 dark:text-lavender-200"
          >
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-plum-600 to-champagne-400 flex items-center justify-center text-charcoal-950 font-bold text-[10px]">
              {user ? (user.email ? user.email.charAt(0).toUpperCase() : 'A') : 'G'}
            </div>
            <span className="hidden sm:inline truncate max-w-[90px]">
              {user ? (user.isAnonymous ? 'Guest' : (user.displayName || user.email?.split('@')[0])) : 'Account'}
            </span>
          </Link>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop blur */}
          <div
            className="fixed inset-0 bg-charcoal-950/70 backdrop-blur-md transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer content */}
          <div className="relative w-72 max-w-xs bg-white dark:bg-charcoal-900 h-full p-4 flex flex-col justify-between overflow-y-auto z-10 shadow-2xl border-r border-plum-700/20 dark:border-white/10">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-plum-700/15 dark:border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-plum-600 to-champagne-400 flex items-center justify-center">
                    <Music2 className="w-4 h-4 text-charcoal-950" />
                  </div>
                  <span className="font-extrabold text-sm text-charcoal-900 dark:text-white">
                    SONICFORGE AI
                  </span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-cream-100 dark:hover:bg-charcoal-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                {NAV_GROUPS.map((group) => (
                  <div key={group.title} className="space-y-1">
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted">
                      {group.title}
                    </div>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold ${
                            isActive
                              ? 'bg-plum-600/20 text-champagne-500 dark:text-champagne-300 border border-champagne-400/30'
                              : 'text-slate-600 dark:text-lavender-200/70 hover:bg-cream-100 dark:hover:bg-charcoal-800'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className="w-4 h-4" />
                            <span>{item.name}</span>
                          </div>
                          {item.badge && (
                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-champagne-400/20 text-champagne-600 dark:text-champagne-300">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-plum-700/15 dark:border-white/10">
              <div className="flex items-center justify-between text-xs text-muted">
                <span>Theme: {theme}</span>
                <button
                  onClick={toggleTheme}
                  className="p-1.5 rounded-lg bg-cream-100 dark:bg-charcoal-800"
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4 text-champagne-400" /> : <Moon className="w-4 h-4 text-plum-600" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
