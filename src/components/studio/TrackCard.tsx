'use client';

import React from 'react';
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

  const isCurrentTrack =
    current?.type === 'track' && current.item.id === track.id;
  const isThisPlaying = isCurrentTrack && isPlaying;

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
      className={`p-4 rounded-2xl border transition-all duration-200 group relative ${
        isCurrentTrack
          ? 'bg-midnight-850 border-studio-blue/50 shadow-lg shadow-studio-blue/10'
          : 'bg-midnight-900/70 hover:bg-midnight-850/90 border-studio-border/60 hover:border-studio-blue/30'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3.5 min-w-0">
          {/* Play/Pause Button */}
          <button
            onClick={handlePlayToggle}
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-md ${
              isThisPlaying
                ? 'bg-gradient-to-tr from-cyan-400 to-studio-blue text-white shadow-cyan-500/20'
                : 'bg-slate-800/80 group-hover:bg-gradient-to-tr group-hover:from-studio-blue group-hover:to-studio-violet text-slate-200 group-hover:text-white'
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
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors truncate">
              {track.title}
            </h4>
            <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-slate-400">
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                {track.genre}
              </span>
              <span>•</span>
              <span className="text-slate-400">{track.mood}</span>
              <span>•</span>
              <span className="font-mono text-cyan-400/90">
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
            </div>
            <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
              {track.prompt}
            </p>
          </div>
        </div>

        {/* Favorite toggle */}
        {onFavoriteToggle && (
          <button
            onClick={() => onFavoriteToggle(track.id, !track.isFavorite)}
            className={`p-1.5 rounded-lg transition-colors ${
              track.isFavorite
                ? 'text-rose-400 bg-rose-500/10'
                : 'text-slate-400 hover:text-rose-400 hover:bg-slate-800'
            }`}
            title={track.isFavorite ? 'Remove Favorite' : 'Mark Favorite'}
          >
            <Heart
              className={`w-4 h-4 ${track.isFavorite ? 'fill-current' : ''}`}
            />
          </button>
        )}
      </div>

      {/* Card Actions Footer */}
      <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-[11px] text-slate-400">
          {formatDate(track.createdAt)} • {track.modelId}
        </span>

        <div className="flex items-center gap-1.5">
          {/* Tweak Prompt in Studio */}
          {onTweakInStudio && (
            <button
              onClick={() => onTweakInStudio(track)}
              className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-studio-blue/20 text-slate-300 hover:text-cyan-300 border border-white/5 transition-colors flex items-center gap-1.5 text-[11px]"
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
              className="px-2 py-1 rounded-lg bg-slate-800/80 text-slate-300 border border-white/5 text-[11px] focus:outline-none focus:ring-1 focus:ring-studio-blue"
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
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
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
              className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-colors"
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

