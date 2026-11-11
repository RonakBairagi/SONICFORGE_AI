'use client';

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { GeneratedTrack, GeneratedSoundEffect } from '@/types';

export type PlayableItem =
  | {
      type: 'track';
      item: GeneratedTrack;
    }
  | {
      type: 'sfx';
      item: GeneratedSoundEffect;
    }
  | {
      type: 'raw';
      title: string;
      subtitle?: string;
      audioUrl: string;
    };

interface AudioPlayerContextType {
  current: PlayableItem | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  isLoadingAudio: boolean;
  audioError: string | null;
  audioWaveformPeaks: number[];
  play: (item: PlayableItem) => void;
  pause: () => void;
  resume: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  setVolumeLevel: (vol: number) => void;
  toggleMute: () => void;
  setRate: (rate: number) => void;
  closePlayer: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<PlayableItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [audioWaveformPeaks, setAudioWaveformPeaks] = useState<number[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Audio element on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audioRef.current = audio;

    audio.addEventListener('loadstart', () => {
      setIsLoadingAudio(true);
      setAudioError(null);
    });

    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration || 0);
      setIsLoadingAudio(false);
    });

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
    });

    audio.addEventListener('playing', () => {
      setIsPlaying(true);
      setIsLoadingAudio(false);
      setAudioError(null);
    });

    audio.addEventListener('pause', () => {
      setIsPlaying(false);
    });

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });

    audio.addEventListener('error', (e) => {
      setIsLoadingAudio(false);
      setIsPlaying(false);
      setAudioError('Failed to load audio stream. The link may have expired or is invalid.');
      console.warn('Audio playback error:', e);
    });

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  // Compute REAL waveform peaks using Web Audio API AudioContext
  const computeRealWaveform = useCallback(async (audioUrl: string) => {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      const response = await fetch(audioUrl);
      if (!response.ok) return;
      const arrayBuffer = await response.arrayBuffer();
      const ctx = new AudioCtx();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      // Extract raw channel data
      const channelData = audioBuffer.getChannelData(0);
      const samples = 48; // 48 bars
      const blockSize = Math.floor(channelData.length / samples);
      const peaks: number[] = [];

      for (let i = 0; i < samples; i++) {
        let blockStart = blockSize * i;
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(channelData[blockStart + j]);
        }
        peaks.push(sum / blockSize);
      }

      // Normalize peaks
      const max = Math.max(...peaks, 0.001);
      const normalized = peaks.map((p) => Math.max(0.12, p / max));
      setAudioWaveformPeaks(normalized);
      await ctx.close();
    } catch (err) {
      // If Web Audio API decode fails (e.g. cross-origin), compute deterministic pseudo peaks
      console.warn('Waveform audio buffer decode notice:', err);
      const defaultBars = Array.from({ length: 48 }, (_, i) => 0.2 + 0.6 * Math.abs(Math.sin((i + 1) * 0.4)));
      setAudioWaveformPeaks(defaultBars);
    }
  }, []);

  const play = useCallback(
    (item: PlayableItem) => {
      if (!audioRef.current) return;
      setCurrent(item);
      setAudioError(null);
      setIsLoadingAudio(true);

      const url =
        item.type === 'track'
          ? item.item.audioUrl
          : item.type === 'sfx'
          ? item.item.audioUrl
          : item.audioUrl;

      if (!url) {
        setAudioError('No audio URL found for this track.');
        setIsLoadingAudio(false);
        return;
      }

      audioRef.current.src = url;
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.volume = isMuted ? 0 : volume;
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setIsLoadingAudio(false);
          computeRealWaveform(url);
        })
        .catch((err) => {
          console.warn('Playback prevented or failed:', err);
          setIsPlaying(false);
          setIsLoadingAudio(false);
          setAudioError(err.message || 'Playback blocked by browser policy. Click Play to start.');
        });
    },
    [playbackRate, isMuted, volume, computeRealWaveform]
  );

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const resume = useCallback(() => {
    if (audioRef.current && audioRef.current.src) {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((e) => setAudioError(e.message));
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
  }, [isPlaying, pause, resume]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const setVolumeLevel = useCallback(
    (vol: number) => {
      setVolume(vol);
      setIsMuted(vol === 0);
      if (audioRef.current) {
        audioRef.current.volume = vol;
      }
    },
    []
  );

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (audioRef.current) {
        audioRef.current.volume = next ? 0 : volume;
      }
      return next;
    });
  }, [volume]);

  const setRate = useCallback((rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, []);

  const closePlayer = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setCurrent(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  return (
    <AudioPlayerContext.Provider
      value={{
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
        play,
        pause,
        resume,
        togglePlay,
        seek,
        setVolumeLevel,
        toggleMute,
        setRate,
        closePlayer,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return context;
}

