'use client';

import React, { useState } from 'react';
import {
  Play,
  Pause,
  Download,
  Heart,
  FolderPlus,
  Trash2,
  Sliders,
  Sparkles,
  Disc,
  Mic2,
  FileText,
  ChevronDown,
  ChevronUp,
  Clock,
  Zap,
} from 'lucide-react';
import { GeneratedTrack, StudioProject } from '@/types';
import { useAudioPlayer } from '@/context/AudioPlayerContext';
import { formatTime, formatDate, downloadAudioFile } from '@/lib/utils';

interface TrackCardProps {
  track: GeneratedTrack;
  projects?: StudioProject[];
  onFavoriteToggle?: (trackId: string, currentVal: boolean) => void;
  onDelete?: (trackId: string) => void;
  onAssignProject?: (trackId: string, projectId: string, projectName: string) => void;
  onTweakInStudio?: (track: GeneratedTrack) => void;
}

export function TrackCard({
  track,
  projects = [],
  onFavoriteToggle,
  onDelete,
  onAssignProject,
  onTweakInStudio,
}: TrackCardProps) {
  const { current, isPlaying, play, pause } = useAudioPlayer();
  const [showLyrics, setShowLyrics] = useState(false);

  const isCurrentTrack =
    current?.type === 'track' && current.item.id === track.id;
  const isThisPlaying = isCurrentTrack && isPlaying;

  const hasVocals = !track.forceInstrumental || track.creationMode === 'full_song' || !!track.lyrics;

  const handlePlayToggle = () => {
    if (isThisPlaying) {
      pause();
    } else {
      play({ type: 'track', item: track });
    }
  };

  const handleDownload = () => {
    if (track.audioUrl) {
      downloadAudioFile(track.audioUrl, track.title);
    }
  };

  return (
    <div
      className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 group relative backdrop-blur-xl ${
        isCurrentTrack
          ? 'bg-slate-50 dark:bg-midnight-850 border-studio-blue shadow-lg shadow-studio-blue/15 ring-1 ring-studio-blue/30'
          : 'bg-white/80 dark:bg-midnight-900/80 hover:bg-slate-50/90 dark:hover:bg-midnight-850/90 border-slate-200 dark:border-studio-border/60 hover:border-studio-blue/40 shadow-sm hover:shadow-md'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          {/* Play/Pause Button */}
          <button
            onClick={handlePlayToggle}
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-md ${
              isThisPlaying
                ? 'bg-gradient-to-tr from-cyan-400 to-studio-blue text-white shadow-cyan-500/30 animate-pulse'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 group-hover:bg-gradient-to-tr group-hover:from-studio-blue group-hover:to-studio-violet group-hover:text-white'
            }`}
            title={isThisPlaying ? 'Pause' : 'Play Preview'}
          >
            {isThisPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          {/* Track Details */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-studio-blue dark:group-hover:text-cyan-300 transition-colors truncate">
                {track.title}
              </h4>
              {/* Vocal Badge */}
              {hasVocals ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-studio-violet/15 text-studio-violet dark:text-purple-300 border border-studio-violet/30">
                  <Mic2 className="w-2.5 h-2.5" />
                  AI Vocals
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  <Disc className="w-2.5 h-2.5" />
                  Instrumental
                </span>
              )}
              {track.generationTimeSeconds !== undefined && track.generationTimeSeconds > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                  <Zap className="w-2.5 h-2.5" />
                  {track.generationTimeSeconds.toFixed(1)}s
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[11px] text-slate-600 dark:text-slate-400">
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                {track.genre}
              </span>
              <span>•</span>
              <span>{track.mood}</span>
              <span>•</span>
              <span className="font-mono text-studio-blue dark:text-cyan-400 font-semibold">
                {formatTime(track.durationMs / 1000)}
              </span>
              {track.projectName && (
                <>
                  <span>•</span>
                  <span className="text-studio-violet font-medium">
                    📁 {track.projectName}
                  </span>
                </>
              )}
              {track.vocalStyle && (
                <>
                  <span>•</span>
                  <span className="text-indigo-600 dark:text-indigo-300 italic">
                    {track.vocalStyle}
                  </span>
                </>
              )}
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed">
              {track.prompt}
            </p>
          </div>
        </div>

        {/* Favorite toggle */}
        {onFavoriteToggle && (
          <button
            onClick={() => onFavoriteToggle(track.id, !track.isFavorite)}
            className={`p-2 rounded-xl transition-colors ${
              track.isFavorite
                ? 'text-rose-500 bg-rose-500/10'
                : 'text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={track.isFavorite ? 'Remove Favorite' : 'Mark Favorite'}
          >
            <Heart
              className={`w-4 h-4 ${track.isFavorite ? 'fill-current' : ''}`}
            />
          </button>
        )}
      </div>

      {/* Lyrics Dropdown Preview */}
      {track.lyrics && (
        <div className="mt-3">
          <button
            onClick={() => setShowLyrics(!showLyrics)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-studio-violet dark:text-purple-300 hover:underline"
          >
            <FileText className="w-3 h-3" />
            <span>{showLyrics ? 'Hide Song Lyrics' : 'View Song Lyrics'}</span>
            {showLyrics ? (
              <ChevronUp className="w-3 h-3 ml-0.5" />
            ) : (
              <ChevronDown className="w-3 h-3 ml-0.5" />
            )}
          </button>

          {showLyrics && (
            <div className="mt-2 p-3 rounded-xl bg-slate-100/90 dark:bg-midnight-950/80 border border-slate-200 dark:border-white/5 text-xs text-slate-700 dark:text-slate-300 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed shadow-inner">
              {track.lyrics}
            </div>
          )}
        </div>
      )}

      {/* Card Actions Footer */}
      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          {formatDate(track.createdAt)} • {track.modelId}
        </span>

        <div className="flex items-center gap-1.5">
          {/* Tweak Prompt in Studio */}
          {onTweakInStudio && (
            <button
              onClick={() => onTweakInStudio(track)}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-studio-blue/15 text-slate-700 dark:text-slate-300 hover:text-studio-blue dark:hover:text-cyan-300 border border-slate-200 dark:border-white/5 transition-colors flex items-center gap-1.5 text-[11px]"
              title="Open Prompt in Studio"
            >
              <Sliders className="w-3 h-3" />
              <span>Tweak</span>
            </button>
          )}

          {/* Project selector dropdown */}
          {onAssignProject && projects.length > 0 && (
            <select
              value={track.projectId || ''}
              onChange={(e) => {
                const proj = projects.find((p) => p.id === e.target.value);
                if (proj) {
                  onAssignProject(track.id, proj.id, proj.name);
                }
              }}
              className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/5 text-[11px] focus:outline-none focus:ring-1 focus:ring-studio-blue"
            >
              <option value="">Move to Project...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          {/* Download Button */}
          <button
            onClick={handleDownload}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            title="Download MP3"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Delete Button */}
          {onDelete && (
            <button
              onClick={() => {
                if (confirm(`Delete "${track.title}"? This cannot be undone.`)) {
                  onDelete(track.id);
                }
              }}
              className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition-colors"
              title="Delete Track"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
