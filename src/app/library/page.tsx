'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Library,
  Search,
  Filter,
  ArrowUpDown,
  Music2,
  Volume2,
  Sparkles,
  Heart,
  FolderKanban,
  Sliders,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { TrackCard } from '@/components/studio/TrackCard';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  getUserTracks,
  getUserProjects,
  deleteTrack,
  updateTrackMetadata,
} from '@/lib/firestore-service';
import { GeneratedTrack, StudioProject } from '@/types';

export default function LibraryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { success, error } = useToast();

  const [tracks, setTracks] = useState<GeneratedTrack[]>([]);
  const [projects, setProjects] = useState<StudioProject[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenreFilter, setSelectedGenreFilter] = useState('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'duration'>('date');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const uid = user ? user.uid : 'guest';
    const [userTracks, userProjects] = await Promise.all([
      getUserTracks(uid),
      getUserProjects(uid),
    ]);
    setTracks(userTracks);
    setProjects(userProjects);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleFavoriteToggle = async (trackId: string, currentVal: boolean) => {
    const uid = user ? user.uid : 'guest';
    await updateTrackMetadata(trackId, uid, { isFavorite: currentVal });
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, isFavorite: currentVal } : t))
    );
    success(
      currentVal ? 'Added to Favorites' : 'Removed from Favorites',
      'Library updated'
    );
  };

  const handleDelete = async (trackId: string) => {
    const uid = user ? user.uid : 'guest';
    await deleteTrack(trackId, uid);
    setTracks((prev) => prev.filter((t) => t.id !== trackId));
    success('Track deleted', 'Removed from your library');
  };

  const handleAssignProject = async (
    trackId: string,
    projectId: string,
    projectName: string
  ) => {
    const uid = user ? user.uid : 'guest';
    await updateTrackMetadata(trackId, uid, { projectId, projectName });
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, projectId, projectName } : t))
    );
    success('Project Assigned', `Track moved to ${projectName}`);
  };

  // Filter & Sort
  const filteredTracks = tracks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.genre.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesGenre =
      selectedGenreFilter === 'all' || t.genre === selectedGenreFilter;

    const matchesFav = !onlyFavorites || t.isFavorite;

    return matchesSearch && matchesGenre && matchesFav;
  });

  filteredTracks.sort((a, b) => {
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    if (sortBy === 'duration') return b.durationMs - a.durationMs;
    return b.createdAt - a.createdAt;
  });

  const uniqueGenres = Array.from(new Set(tracks.map((t) => t.genre))).filter(
    Boolean
  );

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Library className="w-6 h-6 text-studio-blue" />
              My Audio Library
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Browse, filter, organize, and download all your AI music generations.
            </p>
          </div>
          <Link
            href="/studio"
            className="self-start sm:self-auto px-4 py-2 rounded-xl bg-gradient-to-r from-studio-blue to-studio-violet text-white text-xs font-semibold shadow-md shadow-studio-blue/20 hover:opacity-95 transition-all flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>New Generation</span>
          </Link>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 rounded-2xl bg-midnight-900/80 border border-studio-border/70 backdrop-blur-xl flex flex-col sm:flex-row items-center gap-3 justify-between">
          {/* Search box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, prompt, genre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-midnight-950/80 border border-studio-border text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-studio-blue"
            />
          </div>

          {/* Genre & Favorites Filter */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedGenreFilter}
              onChange={(e) => setSelectedGenreFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-midnight-950/80 border border-studio-border text-xs text-slate-200 focus:outline-none focus:border-studio-blue"
            >
              <option value="all">All Genres</option>
              {uniqueGenres.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as 'date' | 'title' | 'duration')
              }
              className="px-3 py-2 rounded-xl bg-midnight-950/80 border border-studio-border text-xs text-slate-200 focus:outline-none focus:border-studio-blue"
            >
              <option value="date">Sort: Newest</option>
              <option value="title">Sort: Title</option>
              <option value="duration">Sort: Duration</option>
            </select>

            <button
              onClick={() => setOnlyFavorites(!onlyFavorites)}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                onlyFavorites
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                  : 'bg-midnight-950/80 border-studio-border text-slate-400 hover:text-slate-200'
              }`}
            >
              <Heart
                className={`w-3.5 h-3.5 ${
                  onlyFavorites ? 'fill-current text-rose-400' : ''
                }`}
              />
              <span>Favorites</span>
            </button>
          </div>
        </div>

        {/* Tracks List */}
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">
            Loading library tracks...
          </div>
        ) : filteredTracks.length === 0 ? (
          <div className="p-12 rounded-2xl bg-midnight-900/50 border border-studio-border/50 text-center space-y-3">
            <Music2 className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-300">
              No matching tracks found
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery || onlyFavorites || selectedGenreFilter !== 'all'
                ? 'Try adjusting your filters or search terms.'
                : 'You have not generated any tracks yet. Jump into the Music Studio to create your first track!'}
            </p>
            <Link
              href="/studio"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-studio-blue text-white text-xs font-semibold shadow-md hover:bg-blue-600 transition-colors mt-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Open Studio</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTracks.map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                projects={projects}
                onFavoriteToggle={handleFavoriteToggle}
                onDelete={handleDelete}
                onAssignProject={handleAssignProject}
                onTweakInStudio={() => {
                  router.push('/studio');
                }}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

