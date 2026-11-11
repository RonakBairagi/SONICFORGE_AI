'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  User,
  Shield,
  Volume2,
  Trash2,
  LogOut,
  Save,
  Check,
  Disc,
  Folder,
  Sliders,
  ExternalLink,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  saveUserProfile,
  getUserTracks,
  getUserSoundEffects,
  getUserProjects,
} from '@/lib/firestore-service';

export default function SettingsPage() {
  const { user, profile, logout, refreshProfile } = useAuth();
  const { success, error, warning } = useToast();

  const [displayName, setDisplayName] = useState('');
  const [preferredVoice, setPreferredVoice] = useState('astra');
  const [defaultDuration, setDefaultDuration] = useState(30);

  // Statistics
  const [stats, setStats] = useState({ tracks: 0, sfx: 0, projects: 0 });
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setPreferredVoice(profile.preferences?.preferredVoice || 'astra');
      setDefaultDuration(profile.preferences?.defaultDurationSec || 30);
    }
    const uid = user ? user.uid : 'guest';
    Promise.all([
      getUserTracks(uid),
      getUserSoundEffects(uid),
      getUserProjects(uid),
    ]).then(([t, s, p]) => {
      setStats({ tracks: t.length, sfx: s.length, projects: p.length });
    });
  }, [profile, user]);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      const updated = {
        ...profile,
        displayName: displayName.trim() || profile.displayName,
        preferences: {
          ...profile.preferences,
          preferredVoice,
          defaultDurationSec: defaultDuration,
        },
      };

      await saveUserProfile(updated);
      await refreshProfile();
      success('Preferences Saved', 'Your studio settings have been updated.');
    } catch (err: unknown) {
      error('Save Failed', err instanceof Error ? err.message : 'Could not save profile');
    }
  };

  const handleDeleteAccountData = () => {
    if (typeof window !== 'undefined') {
      const uid = user ? user.uid : 'guest';
      localStorage.removeItem(`sonicforge_tracks_cache_${uid}`);
      localStorage.removeItem(`sonicforge_sfx_cache_${uid}`);
      localStorage.removeItem(`sonicforge_projects_cache_${uid}`);
      localStorage.removeItem(`sonicforge_chats_cache_${uid}`);
      localStorage.removeItem(`sonicforge_user_cache_${uid}`);
    }
    setShowDeleteModal(false);
    logout();
    success('Session & Local Cache Wiped', 'You have been signed out.');
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-studio-blue" />
            Studio Profile &amp; Settings
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure your studio identity, voice playback defaults, and account privacy.
          </p>
        </div>

        {/* Usage Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-midnight-900/80 border border-studio-border/70 backdrop-blur-xl">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Music Tracks Produced
            </span>
            <p className="text-2xl font-bold font-mono text-cyan-400 mt-1">{stats.tracks}</p>
          </div>
          <div className="p-4 rounded-2xl bg-midnight-900/80 border border-studio-border/70 backdrop-blur-xl">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Sound Effects Generated
            </span>
            <p className="text-2xl font-bold font-mono text-studio-violet mt-1">{stats.sfx}</p>
          </div>
          <div className="p-4 rounded-2xl bg-midnight-900/80 border border-studio-border/70 backdrop-blur-xl">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Active Projects
            </span>
            <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">{stats.projects}</p>
          </div>
        </div>

        {/* Profile & Preferences Form */}
        <div className="p-6 rounded-2xl bg-midnight-900/80 border border-studio-border/70 backdrop-blur-xl shadow-xl space-y-6">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <User className="w-4 h-4 text-cyan-400" />
            Artist Information
          </h2>

          <form onSubmit={handleSavePreferences} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">
                  Display / Artist Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Alex Morgan / SynthForge"
                  className="w-full p-2.5 rounded-xl bg-midnight-950 border border-studio-border text-xs text-slate-100 focus:outline-none focus:border-studio-blue"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || 'guest@sonicforge.ai'}
                  className="w-full p-2.5 rounded-xl bg-midnight-950/50 border border-studio-border/40 text-xs text-slate-400 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-studio-violet" />
                Assistant Voice Defaults (Rime Coda)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">
                    Preferred Voice Speaker
                  </label>
                  <select
                    value={preferredVoice}
                    onChange={(e) => setPreferredVoice(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-midnight-950 border border-studio-border text-xs text-slate-200 focus:outline-none focus:border-studio-blue"
                  >
                    <option value="astra">Astra (Female • Expressive)</option>
                    <option value="nadi">Nadi (Female • Warm &amp; Clear)</option>
                    <option value="marcus">Marcus (Male • Natural)</option>
                    <option value="allison">Allison (Female • Articulate)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">
                    Default Music Target Duration
                  </label>
                  <select
                    value={defaultDuration}
                    onChange={(e) => setDefaultDuration(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-midnight-950 border border-studio-border text-xs text-slate-200 focus:outline-none focus:border-studio-blue"
                  >
                    <option value={15}>15 Seconds (Stingers / Intros)</option>
                    <option value={30}>30 Seconds (Standard Cue)</option>
                    <option value={45}>45 Seconds (Extended Theme)</option>
                    <option value={60}>60 Seconds (Full Dynamic Build)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-studio-blue to-studio-violet text-white text-xs font-semibold shadow-md hover:opacity-95 transition-opacity flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Settings</span>
              </button>
            </div>
          </form>
        </div>

        {/* Security & Danger Zone */}
        <div className="p-6 rounded-2xl bg-midnight-900/80 border border-studio-border/70 backdrop-blur-xl shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-rose-400" />
            Account Security &amp; Data Deletion
          </h2>

          <div className="p-4 rounded-xl bg-midnight-950/70 border border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-slate-200">
                Wipe Local Studio Session &amp; Cached Data
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Permanently clears all local cached tracks, sound effects, and conversation history on this device.
              </p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset Data</span>
            </button>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 bg-midnight-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-midnight-900 border border-rose-500/40 p-6 shadow-2xl space-y-4">
              <h3 className="text-base font-bold text-rose-400 flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                Confirm Local Data Wipe
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                This action will delete all cached audio tracks, projects, and chat history saved on this browser, and sign you out. This action cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccountData}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
                >
                  Yes, Reset Everything
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

