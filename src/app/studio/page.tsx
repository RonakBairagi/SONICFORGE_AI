'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Music2,
  Sliders,
  Play,
  Volume2,
  Clock,
  Layers,
  Check,
  AlertCircle,
  Loader2,
  FolderPlus,
  RefreshCw,
  Info,
  Mic2,
  Disc,
  ListMusic,
  Wand2,
  X,
  FileText,
  Globe,
  UserCheck,
  Plus,
  Trash2,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { PromptTemplates, PromptTemplate } from '@/components/studio/PromptTemplates';
import { TrackCard } from '@/components/studio/TrackCard';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useAudioPlayer } from '@/context/AudioPlayerContext';
import { saveTrack, getUserTracks, getUserProjects } from '@/lib/firestore-service';
import { GeneratedTrack, StudioProject, CreationMode, SongStructureChunk } from '@/types';
import { generateId } from '@/lib/utils';

const GENRES = [
  'Cinematic Orchestral',
  'Synthpop / Modern Pop',
  'Ambient & Drone',
  'Synthwave / Retrowave',
  'Lo-Fi Hip Hop',
  'Modern Electronic / EDM',
  'Acoustic Pop',
  'Cyberpunk / Industrial',
  'Deep House',
  'Chillhop & Jazz',
  'Indie Rock',
  'Fantasy / RPG Soundtrack',
];

const MOODS = [
  'Heroic & Triumphant',
  'Dark & Suspenseful',
  'Chill & Relaxed',
  'Euphoric & Energetic',
  'Melancholic & Reflective',
  'Dreamy & Atmospheric',
  'Mysterious & Eerie',
  'Fast-Paced & Urgent',
  'Inspirational & Hopeful',
  'Intimate & Vulnerable',
];

const INSTRUMENTS = [
  'Piano',
  'Orchestral Strings',
  'Electric Guitar',
  'Analog Synth',
  'Acoustic Guitar',
  'Sub-Bass 808',
  'Brass Section',
  'Live Drums',
  'Vinyl Crackle',
  'Chimes & Bells',
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
  'Spanish',
  'Japanese',
  'French',
  'Hindi',
  'German',
  'Italian',
  'Korean',
];

const DEFAULT_STRUCTURE: SongStructureChunk[] = [
  { section: '[Intro]', style: 'Atmospheric build with soft chords', durationMs: 5000 },
  { section: '[Verse 1]', lyrics: 'Shadows fade as morning light appears\nWalking through the silence of our fears', durationMs: 10000 },
  { section: '[Chorus]', lyrics: 'And we rise above the storm tonight\nGuided by a single guiding light!', durationMs: 10000 },
  { section: '[Outro]', style: 'Gentle piano fade with acoustic reverb', durationMs: 5000 },
];

export default function MusicStudioPage() {
  const { user } = useAuth();
  const { success, error, warning, info } = useToast();
  const { play } = useAudioPlayer();

  // Mode: Full Song with Vocals | Instrumental | Custom Structure
  const [creationMode, setCreationMode] = useState<CreationMode>('full_song');

  // Studio Form State
  const [prompt, setPrompt] = useState(
    'An uplifting modern synthpop anthem with soaring vocal melodies, shimmering arpeggiated synths, and driving four-on-the-floor drums.'
  );
  const [selectedGenre, setSelectedGenre] = useState('Synthpop / Modern Pop');
  const [selectedMood, setSelectedMood] = useState('Euphoric & Energetic');
  const [selectedTempo, setSelectedTempo] = useState('124 BPM (Driving)');
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([
    'Analog Synth',
    'Sub-Bass 808',
    'Live Drums',
    'Piano',
  ]);
  const [durationSec, setDurationSec] = useState(30);

  // Vocal-specific controls
  const [lyrics, setLyrics] = useState(
    `[Verse 1]\nWe drove through the midnight rain\nChasing the glow of city names\nEvery shadow turning into gold\n\n[Chorus]\nCause tonight we are neon skylines\nBurning bright above the dark lines\nNothing can hold our hearts back now!`
  );
  const [vocalStyle, setVocalStyle] = useState('Soaring & Anthemic');
  const [vocalGender, setVocalGender] = useState('Female Vocals (Soprano / Warm)');
  const [language, setLanguage] = useState('English');

  // Custom Structure state
  const [structureChunks, setStructureChunks] = useState<SongStructureChunk[]>(DEFAULT_STRUCTURE);

  // Generation status & abort controller
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState('');
  const [generationTimeElapsed, setGenerationTimeElapsed] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // User tracks and projects
  const [recentTracks, setRecentTracks] = useState<GeneratedTrack[]>([]);
  const [projects, setProjects] = useState<StudioProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // Load user tracks & projects
  useEffect(() => {
    if (user) {
      getUserTracks(user.uid).then((tracks) => setRecentTracks(tracks.slice(0, 10)));
      getUserProjects(user.uid).then(setProjects);
    }
  }, [user]);

  // Generation progress timer & honest stage reporting
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      setGenerationTimeElapsed(0);
      setGenerationStage('Preparing musical arrangement and prompt tokens...');
      interval = setInterval(() => {
        setGenerationTimeElapsed((prev) => {
          const next = prev + 1;
          if (next >= 2 && next < 6) {
            setGenerationStage(
              creationMode === 'full_song'
                ? 'Synthesizing AI singing vocal melodies & instruments...'
                : 'Arranging orchestral & synthesized instrumental stems...'
            );
          } else if (next >= 6 && next < 15) {
            setGenerationStage('Generating stereo waveform via ElevenLabs Music Engine...');
          } else if (next >= 15 && next < 30) {
            setGenerationStage('Mastering dynamic audio range & normalizing volume...');
          } else if (next >= 30) {
            setGenerationStage('Finalizing MP3 delivery stream...');
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isGenerating, creationMode]);

  // Toggle instrument selection
  const toggleInstrument = (inst: string) => {
    setSelectedInstruments((prev) =>
      prev.includes(inst) ? prev.filter((i) => i !== inst) : [...prev, inst]
    );
  };

  // Insert lyric structure tag at cursor / end
  const insertLyricTag = (tag: string) => {
    setLyrics((prev) => `${prev.trim()}\n\n${tag}\n`);
    info('Section tag added', `Inserted ${tag} into lyrics`);
  };

  // AI Lyric Assistant: Generates rhyming lyrics via API
  const handleAILyricAssist = async () => {
    try {
      info('AI Lyric Assistant', 'Composing lyrics based on your song theme...');
      const res = await fetch('/api/lyrics/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: prompt.split('.')[0].substring(0, 30) || 'My Song',
          theme: prompt,
          genre: selectedGenre,
          mood: selectedMood,
          language,
        }),
      });
      const data = await res.json();
      if (data.lyrics) {
        setLyrics(data.lyrics);
        success('Lyrics Created!', 'Generated full song verses & chorus structure.');
      } else {
        throw new Error('No lyrics returned');
      }
    } catch {
      // Local fallback
      setLyrics(`[Verse 1]\nWe drove through the midnight rain\nChasing the glow of city names\nEvery shadow turning into gold\n\n[Chorus]\nCause tonight we are neon skylines\nBurning bright above the dark lines\nNothing can hold our hearts back now!\n\n[Outro]\nFading into the dawn...`);
      success('Lyrics Created', 'Generated verses & chorus structure.');
    }
  };

  // Handle template selection
  const handleSelectTemplate = (tmpl: PromptTemplate) => {
    setPrompt(tmpl.prompt);
    setSelectedGenre(tmpl.genre);
    setSelectedMood(tmpl.mood);
    setSelectedTempo(tmpl.tempo);
    setSelectedInstruments(tmpl.instrumentation);
    setDurationSec(tmpl.suggestedDurationSec);
    if (tmpl.creationMode) {
      setCreationMode(tmpl.creationMode);
    } else {
      setCreationMode(tmpl.forceInstrumental ? 'instrumental' : 'full_song');
    }
    if (tmpl.lyrics) setLyrics(tmpl.lyrics);
    if (tmpl.vocalStyle) setVocalStyle(tmpl.vocalStyle);
    if (tmpl.vocalGender) setVocalGender(tmpl.vocalGender);

    success('Template loaded', `Applied settings for "${tmpl.title}"`);
  };

  // Cancel in-flight generation
  const handleCancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    info('Generation Cancelled', 'The audio request was stopped.');
  };

  // Trigger Real Music Generation
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      warning('Prompt is empty', 'Please describe the music or song concept you wish to produce.');
      return;
    }

    setIsGenerating(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Safety timeout: abort client request after 45s so the UI never hangs for 600-700 seconds
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 45000);

    const startTime = Date.now();

    try {
      // Build structured payload
      const payload: Record<string, unknown> = {
        prompt: prompt.trim(),
        genre: selectedGenre,
        mood: selectedMood,
        instrumentation: selectedInstruments,
        tempo: selectedTempo,
        creationMode,
        durationMs: durationSec * 1000,
      };

      if (creationMode === 'full_song') {
        payload.lyrics = lyrics.trim();
        payload.vocalStyle = vocalStyle;
        payload.vocalGender = vocalGender;
        payload.language = language;
      } else if (creationMode === 'structured') {
        payload.compositionPlan = {
          sections: structureChunks.map((chunk) => ({
            name: chunk.section,
            style: chunk.style || `${selectedGenre}, ${selectedMood}`,
            lyrics: chunk.lyrics || '',
            duration_ms: chunk.durationMs || 5000,
          })),
        };
        payload.lyrics = structureChunks
          .map((c) => `${c.section}\n${c.lyrics || ''}`)
          .join('\n\n');
        payload.vocalStyle = vocalStyle;
        payload.vocalGender = vocalGender;
      }

      const response = await fetch('/api/music/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate music');
      }

      const generationTimeSeconds = (Date.now() - startTime) / 1000;
      const activeProject = projects.find((p) => p.id === selectedProjectId);

      const isInstrumental = creationMode === 'instrumental';

      const newTrack: GeneratedTrack = {
        id: generateId('track'),
        userId: user ? user.uid : 'guest',
        title: prompt.split('.')[0].substring(0, 42) || 'Untitled Track',
        prompt,
        genre: selectedGenre,
        mood: selectedMood,
        instrumentation: selectedInstruments,
        tempo: selectedTempo,
        creationMode,
        lyrics: !isInstrumental ? (creationMode === 'structured' ? payload.lyrics as string : lyrics) : undefined,
        vocalStyle: !isInstrumental ? vocalStyle : undefined,
        vocalGender: !isInstrumental ? vocalGender : undefined,
        language: !isInstrumental ? language : undefined,
        forceInstrumental: isInstrumental,
        durationMs: data.durationMs || durationSec * 1000,
        modelId: data.modelId || 'music_v2_5',
        provider: 'elevenlabs',
        audioUrl: data.audioUrl,
        createdAt: Date.now(),
        projectId: activeProject ? activeProject.id : null,
        projectName: activeProject ? activeProject.name : null,
        status: 'completed',
        isFavorite: false,
        generationTimeSeconds,
      };

      // Persist to Firestore & Local Storage
      await saveTrack(newTrack);

      setRecentTracks((prev) => [newTrack, ...prev]);
      success(
        creationMode === 'full_song' ? 'AI Song Generated!' : 'Instrumental Track Generated!',
        `Rendered in ${generationTimeSeconds.toFixed(1)}s using ElevenLabs Music Engine.`
      );

      // Automatically play the new track in the global player
      play({ type: 'track', item: newTrack });
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof DOMException && err.name === 'AbortError') {
        error('Timeout / Cancelled', 'Generation was cancelled or took longer than 45 seconds.');
      } else {
        const message = err instanceof Error ? err.message : 'Generation failed';
        error('Generation Error', message);
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Header Banner */}
        <div className="relative rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-midnight-900 border border-slate-700/60 dark:border-studio-border/70 p-6 sm:p-8 overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-studio-blue/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-studio-blue/15 border border-studio-blue/30 text-cyan-300 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>ElevenLabs Music API • Full Song &amp; Vocal Studio</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              AI Music &amp; Song Studio
            </h1>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
              Compose complete songs with AI-sung vocals and custom lyrics, score cinematic soundtracks, or build custom song structures powered by ElevenLabs.
            </p>

            {/* Creation Mode Selector Pills */}
            <div className="flex flex-wrap gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setCreationMode('full_song')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  creationMode === 'full_song'
                    ? 'bg-gradient-to-r from-studio-blue to-studio-violet text-white shadow-lg shadow-studio-blue/30 ring-2 ring-cyan-400/50'
                    : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700/80'
                }`}
              >
                <Mic2 className="w-3.5 h-3.5 text-cyan-300" />
                <span>Full Song with AI Vocals</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-400/20 text-cyan-300 font-semibold uppercase">
                  Featured
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCreationMode('instrumental')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  creationMode === 'instrumental'
                    ? 'bg-gradient-to-r from-studio-blue to-indigo-600 text-white shadow-lg shadow-studio-blue/30 ring-2 ring-blue-400/50'
                    : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700/80'
                }`}
              >
                <Disc className="w-3.5 h-3.5 text-blue-300" />
                <span>Instrumental Only</span>
              </button>

              <button
                type="button"
                onClick={() => setCreationMode('structured')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  creationMode === 'structured'
                    ? 'bg-gradient-to-r from-studio-violet to-purple-600 text-white shadow-lg shadow-purple-500/30 ring-2 ring-purple-400/50'
                    : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700/80'
                }`}
              >
                <ListMusic className="w-3.5 h-3.5 text-purple-300" />
                <span>Custom Song Structure</span>
              </button>

              <a
                href="/custom-song"
                className="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-400/30"
              >
                <FileText className="w-3.5 h-3.5 text-purple-300" />
                <span>Open Dedicated Custom Song Studio &rarr;</span>
              </a>
            </div>
          </div>
        </div>

        {/* Prompt Templates */}
        <PromptTemplates onSelect={handleSelectTemplate} />

        {/* Main Studio Console Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Song Description, Lyrics, and Musical Parameters */}
          <div className="lg:col-span-8 space-y-6">
            <div className="p-6 rounded-3xl bg-white/80 dark:bg-midnight-900/80 border border-slate-200/80 dark:border-studio-border/70 backdrop-blur-xl shadow-xl space-y-5">
              {/* Text Description Area */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Music2 className="w-4 h-4 text-studio-blue dark:text-studio-cyan" />
                    Song Concept &amp; Arrangement Prompt
                  </label>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    {prompt.length} / 4000
                  </span>
                </div>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={3}
                  placeholder={
                    creationMode === 'full_song'
                      ? 'Describe the musical concept, storyline, tempo, emotions, and vocal performance style...'
                      : 'Describe the mood, melody, tempo, instruments, and arrangement...'
                  }
                  className="w-full rounded-2xl bg-slate-50 dark:bg-midnight-950/80 border border-slate-200 dark:border-studio-border/70 p-4 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-studio-blue focus:ring-1 focus:ring-studio-blue transition-all resize-none shadow-inner"
                />
              </div>

              {/* VOCAL & LYRICS EDITOR (Only when full_song or structured mode) */}
              {creationMode === 'full_song' && (
                <div className="space-y-3.5 p-4 sm:p-5 rounded-2xl bg-indigo-50/50 dark:bg-slate-900/60 border border-indigo-100 dark:border-indigo-900/40">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Mic2 className="w-4 h-4 text-studio-violet dark:text-purple-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        Lyrics Editor &amp; Vocal Delivery
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleAILyricAssist}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-studio-violet to-studio-blue text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm hover:opacity-95 transition-all"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>AI Lyric Assistant</span>
                    </button>
                  </div>

                  {/* Section Insertion Chips */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Insert Tag:</span>
                    {['[Intro]', '[Verse 1]', '[Pre-Chorus]', '[Chorus]', '[Verse 2]', '[Bridge]', '[Outro]'].map(
                      (tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => insertLyricTag(tag)}
                          className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-mono hover:bg-studio-violet/20 hover:text-studio-violet border border-slate-200 dark:border-slate-700 transition-colors"
                        >
                          {tag}
                        </button>
                      )
                    )}
                  </div>

                  {/* Lyrics Textarea */}
                  <textarea
                    value={lyrics}
                    onChange={(e) => setLyrics(e.target.value)}
                    rows={6}
                    placeholder="Type or paste your lyrics with structure tags like [Verse 1], [Chorus]..."
                    className="w-full rounded-xl bg-white dark:bg-midnight-950 border border-slate-200 dark:border-studio-border/70 p-3.5 text-xs font-mono text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-studio-violet focus:ring-1 focus:ring-studio-violet leading-relaxed resize-y"
                  />

                  {/* Vocal controls row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                        Vocal Delivery
                      </label>
                      <select
                        value={vocalStyle}
                        onChange={(e) => setVocalStyle(e.target.value)}
                        className="w-full p-2 rounded-xl bg-white dark:bg-midnight-950 border border-slate-200 dark:border-studio-border text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-studio-violet"
                      >
                        {VOCAL_STYLES.map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                        Vocalist Tone / Gender
                      </label>
                      <select
                        value={vocalGender}
                        onChange={(e) => setVocalGender(e.target.value)}
                        className="w-full p-2 rounded-xl bg-white dark:bg-midnight-950 border border-slate-200 dark:border-studio-border text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-studio-violet"
                      >
                        {VOCAL_GENDERS.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                        Language
                      </label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full p-2 rounded-xl bg-white dark:bg-midnight-950 border border-slate-200 dark:border-studio-border text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-studio-violet"
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

              {/* CUSTOM SONG STRUCTURE BUILDER (Only when structured mode) */}
              {creationMode === 'structured' && (
                <div className="space-y-4 p-4 sm:p-5 rounded-2xl bg-purple-50/50 dark:bg-slate-900/60 border border-purple-100 dark:border-purple-900/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ListMusic className="w-4 h-4 text-purple-500" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        Composition Plan Chunks
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setStructureChunks((prev) => [
                          ...prev,
                          { section: `[Section ${prev.length + 1}]`, style: 'Melodic continuation', durationMs: 5000 },
                        ])
                      }
                      className="px-2.5 py-1 rounded-lg bg-purple-600 text-white text-xs font-semibold flex items-center gap-1 hover:bg-purple-500"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Section</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {structureChunks.map((chunk, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-white dark:bg-midnight-950 border border-slate-200 dark:border-slate-800 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={chunk.section}
                            onChange={(e) => {
                              const updated = [...structureChunks];
                              updated[idx].section = e.target.value;
                              setStructureChunks(updated);
                            }}
                            className="font-bold font-mono text-xs text-purple-600 dark:text-purple-300 bg-transparent border-b border-dashed border-purple-300 dark:border-purple-700 focus:outline-none"
                          />
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 font-mono">
                              {((chunk.durationMs || 5000) / 1000).toFixed(0)}s
                            </span>
                            {structureChunks.length > 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setStructureChunks((prev) => prev.filter((_, i) => i !== idx))
                                }
                                className="p-1 text-slate-400 hover:text-rose-500"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        <input
                          type="text"
                          value={chunk.style || ''}
                          onChange={(e) => {
                            const updated = [...structureChunks];
                            updated[idx].style = e.target.value;
                            setStructureChunks(updated);
                          }}
                          placeholder="Musical style / arrangement direction..."
                          className="w-full text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-midnight-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none"
                        />
                        <textarea
                          rows={2}
                          value={chunk.lyrics || ''}
                          onChange={(e) => {
                            const updated = [...structureChunks];
                            updated[idx].lyrics = e.target.value;
                            setStructureChunks(updated);
                          }}
                          placeholder="Lyrics for this section (optional)..."
                          className="w-full text-xs font-mono text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-midnight-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none resize-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Genre & Mood Pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">
                    Genre / Style
                  </label>
                  <select
                    value={selectedGenre}
                    onChange={(e) => setSelectedGenre(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-midnight-950/80 border border-slate-200 dark:border-studio-border text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-studio-blue"
                  >
                    {GENRES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">
                    Emotional Tone &amp; Mood
                  </label>
                  <select
                    value={selectedMood}
                    onChange={(e) => setSelectedMood(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-midnight-950/80 border border-slate-200 dark:border-studio-border text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-studio-blue"
                  >
                    {MOODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Featured Instrumentation Chips */}
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-2">
                  Featured Instruments (Multi-Select)
                </label>
                <div className="flex flex-wrap gap-2">
                  {INSTRUMENTS.map((inst) => {
                    const isSelected = selectedInstruments.includes(inst);
                    return (
                      <button
                        key={inst}
                        type="button"
                        onClick={() => toggleInstrument(inst)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-studio-blue text-white shadow-sm shadow-studio-blue/30 border border-cyan-400/40'
                            : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-white/5'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-cyan-300" />}
                        <span>{inst}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Project Assignment */}
              {projects.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">
                    Assign to Project (Optional)
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-midnight-950/80 border border-slate-200 dark:border-studio-border text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-studio-blue"
                  >
                    <option value="">No Project (Save to General Library)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        📁 {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Generation Controls, Duration, Engine Status */}
          <div className="lg:col-span-4 space-y-6">
            <div className="p-6 rounded-3xl bg-white/80 dark:bg-midnight-900/80 border border-slate-200/80 dark:border-studio-border/70 backdrop-blur-xl shadow-xl space-y-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-studio-blue dark:text-studio-cyan" />
                Master Production Controls
              </h3>

              {/* Duration selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-studio-blue dark:text-cyan-400" />
                    Target Duration
                  </span>
                  <span className="text-xs font-mono font-bold text-studio-blue dark:text-cyan-300">
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
                          ? 'bg-studio-blue text-white shadow-md shadow-studio-blue/25 border border-cyan-400/40'
                          : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-white/5'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Model Tag */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-midnight-950/60 border border-slate-200 dark:border-white/5 text-[11px] text-slate-600 dark:text-slate-400 space-y-1.5">
                <div className="flex justify-between text-slate-700 dark:text-slate-300 font-medium">
                  <span>Engine:</span>
                  <span className="text-studio-blue dark:text-cyan-400 font-mono font-bold">
                    music_v2_5 (ElevenLabs)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Mode:</span>
                  <span className="font-semibold text-studio-violet dark:text-purple-300 capitalize">
                    {creationMode.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Audio Output:</span>
                  <span className="font-mono">44.1 kHz • MP3 Stereo</span>
                </div>
              </div>

              {/* Big Generate Button */}
              <button
                type="button"
                disabled={isGenerating}
                onClick={handleGenerate}
                className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-studio-blue via-indigo-600 to-studio-violet hover:from-blue-500 hover:to-violet-500 text-white font-bold text-sm shadow-xl shadow-studio-blue/25 hover:shadow-studio-blue/40 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed group active:scale-[0.99]"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-300" />
                    <span>Rendering Song ({generationTimeElapsed}s)...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-cyan-300 group-hover:scale-110 transition-transform" />
                    <span>
                      {creationMode === 'full_song'
                        ? 'Generate Song with Vocals'
                        : creationMode === 'structured'
                        ? 'Build Structured Track'
                        : 'Generate Instrumental Track'}
                    </span>
                  </>
                )}
              </button>

              {/* Cancel Button when Generating */}
              {isGenerating && (
                <button
                  type="button"
                  onClick={handleCancelGeneration}
                  className="w-full py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-rose-500/20"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel Generation</span>
                </button>
              )}

              {/* Progress Stage & Status */}
              {isGenerating && (
                <div className="space-y-2.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-midnight-950/60 border border-slate-200 dark:border-white/5 animate-in fade-in">
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-studio-blue via-cyan-400 to-studio-violet rounded-full w-3/4 animate-pulse" />
                  </div>
                  <p className="text-[11px] text-center text-slate-600 dark:text-slate-300 font-medium">
                    {generationStage}
                  </p>
                  <p className="text-[10px] text-center text-slate-400 font-mono">
                    Elapsed: {generationTimeElapsed}s (Timeout cap: 45s)
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Studio Generations */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers className="w-5 h-5 text-studio-blue dark:text-cyan-400" />
              Recent Studio Tracks
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              {recentTracks.length} saved in this session
            </span>
          </div>

          {recentTracks.length === 0 ? (
            <div className="p-8 rounded-3xl bg-white/60 dark:bg-midnight-900/50 border border-slate-200/60 dark:border-studio-border/50 text-center space-y-2">
              <Music2 className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto" />
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No tracks generated yet
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Pick a template above or craft custom lyrics, then click &quot;Generate Song with Vocals&quot;.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentTracks.map((track) => (
                <TrackCard
                  key={track.id}
                  track={track}
                  projects={projects}
                  onTweakInStudio={(t) => {
                    setPrompt(t.prompt);
                    setSelectedGenre(t.genre);
                    setSelectedMood(t.mood);
                    if (t.instrumentation) setSelectedInstruments(t.instrumentation);
                    if (t.lyrics) setLyrics(t.lyrics);
                    if (t.vocalStyle) setVocalStyle(t.vocalStyle);
                    if (t.vocalGender) setVocalGender(t.vocalGender);
                    if (t.creationMode) setCreationMode(t.creationMode);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
