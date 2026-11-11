'use client';

import React from 'react';

interface WaveformVisualizerProps {
  peaks: number[];
  progress: number; // 0 to 1
  onSeek?: (progress: number) => void;
  height?: number;
  barWidth?: number;
  barGap?: number;
  className?: string;
}

export function WaveformVisualizer({
  peaks,
  progress,
  onSeek,
  height = 36,
  barWidth = 3,
  barGap = 2,
  className = '',
}: WaveformVisualizerProps) {
  // If no peaks yet, generate default subtle placeholder bars
  const displayPeaks =
    peaks && peaks.length > 0
      ? peaks
      : Array.from({ length: 48 }, (_, i) => 0.2 + 0.5 * Math.abs(Math.sin((i + 1) * 0.5)));

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newProgress = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(newProgress);
  };

  return (
    <div
      onClick={handleContainerClick}
      className={`relative flex items-center gap-[2px] cursor-pointer group select-none ${className}`}
      style={{ height: `${height}px` }}
      title="Click or drag to seek"
    >
      {displayPeaks.map((peak, idx) => {
        const barProgress = idx / displayPeaks.length;
        const isPlayed = barProgress <= progress;
        const barHeight = Math.max(4, Math.round(peak * height));

        return (
          <div
            key={idx}
            className="flex items-center justify-center transition-all duration-100"
            style={{ width: `${barWidth}px`, height: '100%' }}
          >
            <div
              className={`rounded-full transition-colors duration-150 ${
                isPlayed
                  ? 'bg-gradient-to-t from-studio-blue via-studio-violet to-cyan-400 group-hover:brightness-110'
                  : 'bg-slate-700/60 group-hover:bg-slate-600/70'
              }`}
              style={{
                height: `${barHeight}px`,
                width: '100%',
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

