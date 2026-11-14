'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Music2,
  Mic2,
  Disc,
  Sparkles,
  Sliders,
  Play,
  Pause,
  Download,
  RotateCcw,
  Clock,
  Globe,
  FileText,
  Wand2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  Volume2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useAudioPlayer } from '@/context/AudioPlayerContext';
import { saveTrack, getUserTracks } from '@/lib/firestore-service';
import { GeneratedTrack } from '@/types';
import { generateId, formatTime, downloadAudioFile } from '@/lib/utils';
import { WaveformVisualizer } from '@/components/audio/WaveformVisualizer';

type GenerationState =
  | 'idle'
  | 'validating'
  | 'preparing'
  | 'generating'
  | 'receiving'
  | 'processing'
  | 'ready'
  | 'failed'
  | 'cancelled';

const GENRES = [
  'Synthpop / Modern Pop',
  'Cinematic Orchestral',
  'Indie Rock / Alternative',
  'Acoustic Pop / Singer-Songwriter',
  'Lo-Fi Hip Hop & Chill',
  'Modern Electronic / EDM',
  'R&B / Soul Groove',
  'Cyberpunk / Industrial',
  'Ambient & Dream Pop',
  'Bollywood / Hindi Pop',
];

const MOODS = [
  'Euphoric & Energetic',
  'Melancholic & Reflective',
  'Heroic & Triumphant',
  'Chill & Relaxed',
  'Dark & Suspenseful',
  'Inspirational & Hopeful',
  'Romantic & Sweet',
  'Mysterious & Eerie',
];

const VOCAL_STYLES = [
  'Soaring & Anthemic',
  'Intimate & Acoustic',
  'Raspy Rock Belt',
  'Melodic Pop Harmony',
  'Dynamic Rap Flow',
  'Soulful R&B Groove',
  'Ethereal & Dreamlike',
];

const VOCAL_GENDERS = [
  'Female Vocals (Soprano / Warm)',
  'Male Vocals (Baritone / Resonant)',
  'Duet & Harmonized Vocalists',
  'Choir / Group Harmony',
];

const LANGUAGES = [
  'English',
  'Hindi',
  'Spanish',
  'Japanese',
  'French',
  'German',
  'Italian',
  'Korean',
];

const TEMPO_OPTIONS = [
  '80 BPM (Slow & Emotional)',
  '96 BPM (Groovy & Laidback)',
  '112 BPM (Moderate & Building)',
  '124 BPM (Driving & Danceable)',
  '140 BPM (Fast & High Energy)',
];

export default function CustomSongPage() {
  const { user } = useAuth();
  const { success, error, warning, info } = useToast();
  const { play, current, isPlaying, pause } = useAudioPlayer();

  // Form State — Preserved across failed generations
  const [title, setTitle] = useState('Neon Skylines');
  const [lyrics, setLyrics] = useState(
    `[Verse 1]\nWe drove through the midnight rain\nChasing the glow of city names\nEvery shadow turning into gold\n\n[Chorus]\nCause tonight we are neon skylines\nBurning bright above the dark lines\nNothing can hold our hearts back now!\n\n[Outro]\nFading into the golden dawn...`
  );
  const [theme, setTheme] = useState('Hope and triumph in a cyberpunk neon city');
  const [genre, setGenre] = useState('Synthpop / Modern Pop');
  const [mood, setMood] = useState('Euphoric & Energetic');
  const [vocalStyle, setVocalStyle] = useState('Soaring & Anthemic');
  const [vocalGender, setVocalGender] = useState('Female Vocals (Soprano / Warm)');
  const [language, setLanguage] = useState('English');
  const [tempo, setTempo] = useState('124 BPM (Driving & Danceable)');
  const [durationSec, setDurationSec] = useState(30);
  const [isVocalSong, setIsVocalSong] = useState(true);
  const [additionalInstructions, setAdditionalInstructions] = useState(
    'Emphasize dynamic bass drop into chorus with punchy drums'
  );

  // Lyric Generation state
  const [isWritingLyrics, setIsWritingLyrics] = useState(false);

  // Song Generation State Machine
  const [generationState, setGenerationState] = useState<GenerationState>('idle');
  const [generationTimeElapsed, setGenerationTimeElapsed] = useState(0);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [latestTrack, setLatestTrack] = useState<GeneratedTrack | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Timer for generation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (
      generationState === 'validating' ||
      generationState === 'preparing' ||
      generationState === 'generating' ||
      generationState === 'receiving' ||
      generationState === 'processing'
    ) {
      interval = setInterval(() => {
        setGenerationTimeElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [generationState]);

  // Insert structural lyric tag at cursor/end
  const insertSectionTag = (tag: string) => {
    setLyrics((prev) => `${prev.trim()}\n\n${tag}\n`);
    info('Tag Added', `Inserted ${tag}`);
  };

  // Dedicated AI Lyric Writer (Does NOT trigger song audio generation)
  const handleGenerateLyricsOnly = async () => {
    setIsWritingLyrics(true);
    try {
      const res = await fetch('/api/lyrics/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          theme: theme || title,
          genre,
          mood,
          language,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to write lyrics');
      }

      setLyrics(data.lyrics);
      success('Lyrics Generated!', `Crafted original ${language} lyrics for "${title}".`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate lyrics';
      error('Lyrics Assistant Error', msg);
    } finally {
      setIsWritingLyrics(false);
    }
  };

  // Cancel generation in flight
  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setGenerationState('cancelled');
    info('Generation Cancelled', 'Audio composition request stopped.');
  };

  // Trigger Song Generation
  const handleGenerateSong = async () => {
    // 1. Validating State
    setGenerationState('validating');
    setGenerationError(null);

    if (!title.trim()) {
      setGenerationState('failed');
      setGenerationError('Please provide a song title.');
      warning('Title Required', 'Enter a title for your custom composition.');
      return;
    }

    if (isVocalSong && !lyrics.trim()) {
      setGenerationState('failed');
      setGenerationError('Vocal songs require lyrics. Type lyrics or click "Generate Lyrics".');
      warning('Lyrics Required', 'Please enter song lyrics or use the AI lyric generator.');
      return;
    }

    // 2. Preparing State
    setGenerationState('preparing');
    setGenerationTimeElapsed(0);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Safety timeout: 45s
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 45000);

    try {
      // 3. Generating State
      setGenerationState('generating');

      const payload = {
        title: title.trim(),
        prompt: `${title}: ${theme || 'A bespoke custom musical composition'}.`,
        genre,
        mood,
        tempo,
        creationMode: isVocalSong ? 'custom_song' : 'instrumental',
        lyrics: isVocalSong ? lyrics.trim() : undefined,
        vocalStyle: isVocalSong ? vocalStyle : undefined,
        vocalGender: isVocalSong ? vocalGender : undefined,
        language: isVocalSong ? language : undefined,
        durationMs: durationSec * 1000,
        additionalInstructions: additionalInstructions.trim() || undefined,
      };

      const response = await fetch('/api/music/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // 4. Receiving & Processing State
      setGenerationState('receiving');

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to render custom song');
      }

      setGenerationState('processing');

      const newTrack: GeneratedTrack = {
        id: generateId('track_custom'),
        userId: user ? user.uid : 'guest',
        title: title.trim(),
        prompt: `${genre} • ${mood} • ${tempo}`,
        genre,
        mood,
        tempo,
        creationMode: isVocalSong ? 'full_song' : 'instrumental',
        lyrics: isVocalSong ? lyrics.trim() : undefined,
        vocalStyle: isVocalSong ? vocalStyle : undefined,
        vocalGender: isVocalSong ? vocalGender : undefined,
        language: isVocalSong ? language : undefined,
        forceInstrumental: !isVocalSong,
        durationMs: data.durationMs || durationSec * 1000,
        modelId: data.modelId || 'music_v2_5',
        provider: 'elevenlabs',
        audioUrl: data.audioUrl,
        createdAt: Date.now(),
        status: 'completed',
        isFavorite: false,
        generationTimeSeconds: data.generationTimeSeconds || generationTimeElapsed,
      };

      await saveTrack(newTrack);
      setLatestTrack(newTrack);

      // 5. Ready State
      setGenerationState('ready');
      success(
        'Custom Song Created!',
        `Rendered in ${newTrack.generationTimeSeconds?.toFixed(1) || generationTimeElapsed}s. Ready to play.`
      );

      // Automatically play the new track
      play({ type: 'track', item: newTrack });
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof DOMException && err.name === 'AbortError') {
        setGenerationState('cancelled');
        setGenerationError('Generation request was cancelled or timed out after 45s.');
      } else {
        const msg = err instanceof Error ? err.message : 'Custom song generation failed';
        setGenerationState('failed');
        setGenerationError(msg);
        error('Generation Error', msg);
      }
    } finally {
      abortControllerRef.current = null;
    }
  };

  const isCurrentPlaying =
    latestTrack && current?.type === 'track' && current.item.id === latestTrack.id && isPlaying;

  const isGenerating =
    generationState === 'validating' ||
    generationState === 'preparing' ||
    generationState === 'generating' ||
    generationState === 'receiving' ||
    generationState === 'processing';

  return (
    <AppShell>
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Header Hero */}
        <div className="relative rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-midnight-900 border border-slate-700/60 dark:border-studio-border/70 p-6 sm:p-8 overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-studio-violet/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-studio-violet/20 border border-studio-violet/40 text-purple-300 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Custom Song &amp; Lyrics Studio</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Compose Custom Vocal Songs
            </h1>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
              Craft original songs with your own lyrics or write them with our AI assistant. Control vocal delivery, multi-language singing, musical arrangement, and tempo.
            </p>
          </div>
        </div>

        {/* Studio Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form & Lyrics (8 Cols) */}
          <div className="lg:col-span-8 space-y-6">
            <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-midnight-900/80 border border-slate-200 dark:border-studio-border/70 backdrop-blur-xl shadow-xl space-y-6">
              {/* Title & Mode Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1.5">
                    Song Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Neon Skylines / Midnight Horizon"
                    className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-midnight-950 border border-slate-200 dark:border-studio-border text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-studio-violet focus:ring-1 focus:ring-studio-violet shadow-inner"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1.5">
                    Arrangement Type
                  </label>
                  <div className="flex rounded-2xl bg-slate-100 dark:bg-midnight-950 p-1 border border-slate-200 dark:border-studio-border">
                    <button
                      type="button"
                      onClick={() => setIsVocalSong(true)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        isVocalSong
                          ? 'bg-studio-violet text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Mic2 className="w-3.5 h-3.5" />
                      <span>Vocal</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsVocalSong(false)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        !isVocalSong
                          ? 'bg-studio-blue text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Disc className="w-3.5 h-3.5" />
                      <span>Instrumental</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Concept / Theme Description */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1.5">
                  Song Concept &amp; Story Theme
                </label>
                <input
                  type="text"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  placeholder="e.g. A nostalgic drive along the coast under neon lights..."
                  className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-midnight-950 border border-slate-200 dark:border-studio-border text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-studio-violet shadow-inner"
                />
              </div>

              {/* LYRICS EDITOR (Only when Vocal Song) */}
              {isVocalSong && (
                <div className="space-y-3.5 p-5 rounded-2xl bg-purple-50/60 dark:bg-slate-900/60 border border-purple-200/70 dark:border-purple-900/40">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-studio-violet dark:text-purple-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        Original Song Lyrics *
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={isWritingLyrics}
                      onClick={handleGenerateLyricsOnly}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-studio-violet to-studio-blue text-white text-xs font-bold flex items-center gap-1.5 shadow-sm hover:opacity-95 transition-all disabled:opacity-50"
                    >
                      {isWritingLyrics ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Writing Lyrics...</span>
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-3.5 h-3.5" />
                          <span>Generate Lyrics with AI</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Section Insertion Tags */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Add Section:
                    </span>
                    {['[Intro]', '[Verse 1]', '[Pre-Chorus]', '[Chorus]', '[Verse 2]', '[Bridge]', '[Outro]'].map(
                      (tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => insertSectionTag(tag)}
                          className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-mono hover:bg-studio-violet/20 hover:text-studio-violet border border-slate-200 dark:border-slate-700 transition-colors"
                        >
                          {tag}
                        </button>
                      )
                    )}
                  </div>

                  {/* Lyrics Textarea */}
                  <textarea
                    rows={8}
                    required
                    value={lyrics}
                    onChange={(e) => setLyrics(e.target.value)}
                    placeholder="Type or paste your lyrics here with section tags like [Verse 1], [Chorus]..."
                    className="w-full rounded-2xl bg-white dark:bg-midnight-950 border border-slate-200 dark:border-studio-border/80 p-4 text-xs font-mono text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-studio-violet focus:ring-1 focus:ring-studio-violet leading-relaxed resize-y shadow-inner"
                  />

                  {/* Vocal Performance Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Vocal Delivery
                      </label>
                      <select
                        value={vocalStyle}
                        onChange={(e) => setVocalStyle(e.target.value)}
                        className="w-full p-2.5 rounded-xl bg-white dark:bg-midnight-950 border border-slate-200 dark:border-studio-border text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-studio-violet"
                      >
                        {VOCAL_STYLES.map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Vocalist Tone / Gender
                      </label>
                      <select
                        value={vocalGender}
                        onChange={(e) => setVocalGender(e.target.value)}
                        className="w-full p-2.5 rounded-xl bg-white dark:bg-midnight-950 border border-slate-200 dark:border-studio-border text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-studio-violet"
                      >
                        {VOCAL_GENDERS.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Language
                      </label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full p-2.5 rounded-xl bg-white dark:bg-midnight-950 border border-slate-200 dark:border-studio-border text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-studio-violet"
                      >
                        {LANGUAGES.map((l) => (
                          <option key={l} value={l}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Genre, Mood & Tempo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Genre / Musical Style
                  </label>
                  <select
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-midnight-950 border border-slate-200 dark:border-studio-border text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-studio-violet"
                  >
                    {GENRES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Emotional Tone
                  </label>
                  <select
                    value={mood}
                    onChange={(e) => setMood(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-midnight-950 border border-slate-200 dark:border-studio-border text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-studio-violet"
                  >
                    {MOODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Tempo / Energy
                  </label>
                  <select
                    value={tempo}
                    onChange={(e) => setTempo(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-midnight-950 border border-slate-200 dark:border-studio-border text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-studio-violet"
                  >
                    {TEMPO_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Additional Production Instructions */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Additional Arrangement Instructions (Optional)
                </label>
                <input
                  type="text"
                  value={additionalInstructions}
                  onChange={(e) => setAdditionalInstructions(e.target.value)}
                  placeholder="e.g. Build from solo piano into soaring lead guitar climax..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-midnight-950 border border-slate-200 dark:border-studio-border text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-studio-violet shadow-inner"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Generation Controls & Result Card (4 Cols) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="p-6 rounded-3xl bg-white dark:bg-midnight-900/80 border border-slate-200 dark:border-studio-border/70 backdrop-blur-xl shadow-xl space-y-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-studio-violet" />
                Master Render Settings
              </h3>

              {/* Duration selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-studio-violet" />
                    Target Duration
                  </span>
                  <span className="text-xs font-mono font-bold text-studio-violet">
                    {durationSec}s
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[15, 30, 45, 60].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setDurationSec(sec)}
                      className={`py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                        durationSec === sec
                          ? 'bg-studio-violet text-white shadow-md shadow-purple-500/25'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Model Tag */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-midnight-950/60 border border-slate-200 dark:border-white/5 text-[11px] text-slate-600 dark:text-slate-400 space-y-1.5">
                <div className="flex justify-between text-slate-800 dark:text-slate-200 font-medium">
                  <span>Engine:</span>
                  <span className="text-studio-violet font-mono font-bold">
                    music_v2_5 (ElevenLabs)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Audio Specs:</span>
                  <span className="font-mono">44.1 kHz • MP3 Stereo</span>
                </div>
                <div className="flex justify-between">
                  <span>Vocal Mode:</span>
                  <span className="font-semibold text-studio-violet">
                    {isVocalSong ? 'Full Song with AI Vocals' : 'Instrumental Only'}
                  </span>
                </div>
              </div>

              {/* Error display */}
              {generationError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{generationError}</p>
                </div>
              )}

              {/* Render Song Button (Double Click Protected) */}
              <button
                type="button"
                disabled={isGenerating}
                onClick={handleGenerateSong}
                className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-studio-violet via-purple-600 to-studio-blue hover:from-violet-500 hover:to-blue-500 text-white font-bold text-sm shadow-xl shadow-purple-500/25 hover:shadow-purple-500/40 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed group active:scale-[0.99]"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-purple-200" />
                    <span>Rendering Song ({generationTimeElapsed}s)...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-purple-200 group-hover:scale-110 transition-transform" />
                    <span>Generate Custom Song</span>
                  </>
                )}
              </button>

              {/* Cancel Button */}
              {isGenerating && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="w-full py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-rose-500/20"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel Rendering</span>
                </button>
              )}

              {/* State Progress Display */}
              {isGenerating && (
                <div className="space-y-2.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-midnight-950/60 border border-slate-200 dark:border-white/5 animate-in fade-in">
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-studio-violet via-purple-400 to-studio-blue rounded-full w-3/4 animate-pulse" />
                  </div>
                  <p className="text-[11px] text-center text-slate-700 dark:text-slate-300 font-semibold capitalize">
                    State: {generationState}...
                  </p>
                  <p className="text-[10px] text-center text-slate-400 font-mono">
                    Elapsed: {generationTimeElapsed}s (Timeout cap: 45s)
                  </p>
                </div>
              )}
            </div>

            {/* Generated Song Result Panel */}
            {latestTrack && (
              <div className="p-6 rounded-3xl bg-white dark:bg-midnight-900/80 border border-studio-violet/40 shadow-xl space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                      Generated Result
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                    ⚡ {latestTrack.generationTimeSeconds?.toFixed(1)}s
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-midnight-950/70 border border-slate-200 dark:border-white/5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {latestTrack.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {latestTrack.genre} • {formatTime(latestTrack.durationMs / 1000)}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        if (isCurrentPlaying) pause();
                        else play({ type: 'track', item: latestTrack });
                      }}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                        isCurrentPlaying
                          ? 'bg-gradient-to-tr from-purple-500 to-studio-violet text-white animate-pulse'
                          : 'bg-studio-violet text-white hover:bg-purple-600'
                      }`}
                    >
                      {isCurrentPlaying ? (
                        <Pause className="w-4 h-4 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-white/5 text-xs">
                    <button
                      onClick={() => downloadAudioFile(latestTrack.audioUrl, latestTrack.title)}
                      className="inline-flex items-center gap-1.5 text-studio-violet font-semibold hover:underline"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download MP3</span>
                    </button>

                    <button
                      onClick={handleGenerateSong}
                      disabled={isGenerating}
                      className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-studio-violet font-medium transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Regenerate</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
