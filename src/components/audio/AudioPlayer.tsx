'use client';

import React, { useState } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Download,
  X,
  Disc3,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { useAudioPlayer } from '@/context/AudioPlayerContext';
import { WaveformVisualizer } from './WaveformVisualizer';
import { formatTime, downloadAudioFile } from '@/lib/utils';

export function AudioPlayer() {
  const {
    current,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    isLoadingAudio,
    audioError,
    audioWaveformPeaks,
    togglePlay,
    seek,
    setVolumeLevel,
    toggleMute,
    setRate,
    closePlayer,
  } = useAudioPlayer();

  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  if (!current) return null;

  const title =
    current.type === 'track'
      ? current.item.title
      : current.type === 'sfx'
      ? current.item.title
      : current.title;

  const subtitle =
    current.type === 'track'
      ? `${current.item.genre} • ${current.item.mood}${
          current.item.creationMode === 'full_song' ? ' • AI Vocals' : ''
        }`
      : current.type === 'sfx'
      ? `Sound Effect • ${current.item.category}`
      : current.subtitle || 'Audio preview';

  const audioUrl =
    current.type === 'track'
      ? current.item.audioUrl
      : current.type === 'sfx'
      ? current.item.audioUrl
      : current.audioUrl;

  const progress = duration > 0 ? currentTime / duration : 0;

  const handleSeek = (newProgress: number) => {
    seek(newProgress * duration);
  };

  const handleDownload = () => {
    if (audioUrl) {
      downloadAudioFile(audioUrl, `${title.replace(/\s+/g, '_')}`);
    }
  };

  const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  return (
    <aside
      aria-label="Audio Playback Dock"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-midnight-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 shadow-2xl px-4 py-3 sm:px-6 transition-all duration-200"
    >
      {audioError && (
        <div className="max-w-7xl mx-auto mb-2 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-center justify-between">
          <span>{audioError}</span>
          <button
            onClick={() => {}}
            className="text-rose-500 hover:text-rose-700 dark:hover:text-white underline ml-2 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-3 md:gap-6 justify-between">
        {/* Track Info */}
        <div className="flex items-center gap-3 w-full md:w-1/4 min-w-0">
          <div className="relative shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-studio-violet/30 to-studio-blue/30 border border-slate-200 dark:border-white/10 flex items-center justify-center overflow-hidden shadow-sm">
            <Disc3
              className={`w-6 h-6 text-studio-blue dark:text-cyan-300 ${isPlaying ? 'animate-spin' : ''}`}
              style={{ animationDuration: '4s' }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5">
              {title}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-studio-blue dark:text-studio-cyan" />
              {subtitle}
            </p>
          </div>
        </div>

        {/* Center Controls & Waveform */}
        <div className="flex flex-col items-center gap-1.5 w-full md:w-2/4">
          <div className="flex items-center gap-4 w-full justify-center">
            <button
              onClick={togglePlay}
              disabled={isLoadingAudio}
              className="w-11 h-11 rounded-full bg-gradient-to-r from-studio-blue to-studio-violet text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-studio-blue/20 disabled:opacity-50"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isLoadingAudio ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            {/* Time labels */}
            <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 min-w-[36px] text-right">
              {formatTime(currentTime)}
            </span>

            {/* Real Waveform Visualizer */}
            <div className="flex-1 min-w-[140px] sm:min-w-[220px]">
              <WaveformVisualizer
                peaks={audioWaveformPeaks}
                progress={progress}
                onSeek={handleSeek}
                height={32}
              />
            </div>

            <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 min-w-[36px]">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Right side controls: Volume, Speed, Download, Close */}
        <div className="flex items-center justify-end gap-3 w-full md:w-1/4">
          {/* Speed Selector */}
          <div className="relative">
            <button
              onClick={() => setShowSpeedMenu(!showSpeedMenu)}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-white/5 text-[11px] font-mono font-bold transition-colors"
              title="Playback speed"
            >
              {playbackRate}x
            </button>

            {showSpeedMenu && (
              <div className="absolute bottom-full mb-2 right-0 bg-white dark:bg-midnight-850 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl p-1 z-50 flex flex-col gap-0.5">
                {speeds.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setRate(s);
                      setShowSpeedMenu(false);
                    }}
                    className={`px-3 py-1.5 text-xs rounded-lg text-left font-mono font-bold transition-colors ${
                      playbackRate === s
                        ? 'bg-studio-blue text-white'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Volume Control */}
          <div className="hidden sm:flex items-center gap-1.5 group">
            <button
              onClick={toggleMute}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-500" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.02"
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolumeLevel(parseFloat(e.target.value))}
              className="w-16 h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-studio-blue"
              title="Volume"
            />
          </div>

          {/* Download */}
          <button
            onClick={handleDownload}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-studio-blue dark:hover:text-cyan-300 border border-slate-200 dark:border-white/5 transition-colors"
            title="Download Audio (MP3)"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Close */}
          <button
            onClick={closePlayer}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
            title="Close Player"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
