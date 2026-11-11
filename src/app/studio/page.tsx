'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { PromptTemplates, PromptTemplate, STUDIO_TEMPLATES } from '@/components/studio/PromptTemplates';
import { TrackCard } from '@/components/studio/TrackCard';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useAudioPlayer } from '@/context/AudioPlayerContext';
import { saveTrack, getUserTracks, getUserProjects } from '@/lib/firestore-service';
import { GeneratedTrack, StudioProject } from '@/types';
import { generateId } from '@/lib/utils';

const GENRES = [
  'Cinematic Orchestral',
  'Ambient & Drone',
  'Synthwave / Retrowave',
  'Lo-Fi Hip Hop',
  'Modern Electronic / EDM',
  'Acoustic Pop',
  'Cyberpunk / Industrial',
  'Deep House',
  'Chillhop & Jazz',
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

export default function MusicStudioPage() {
  const { user } = useAuth();
  const { success, error, warning } = useToast();
  const { play } = useAudioPlayer();

  // Studio Form State
  const [prompt, setPrompt] = useState(
    'An uplifting cinematic orchestral cue building from a delicate solo piano into a soaring brass and string climax with taiko drums.'
  );
  const [selectedGenre, setSelectedGenre] = useState('Cinematic Orchestral');
  const [selectedMood, setSelectedMood] = useState('Heroic & Triumphant');
  const [selectedTempo, setSelectedTempo] = useState('110 BPM (Building)');
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([
    'Piano',
    'Orchestral Strings',
    'Brass Section',
  ]);
  const [forceInstrumental, setForceInstrumental] = useState(true);
  const [durationSec, setDurationSec] = useState(30);

  // Generation status
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationTimeElapsed, setGenerationTimeElapsed] = useState(0);
  const [recentTracks, setRecentTracks] = useState<GeneratedTrack[]>([]);
  const [projects, setProjects] = useState<StudioProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // Load user's recent tracks & projects
  useEffect(() => {
    if (user) {
      getUserTracks(user.uid).then((tracks) => setRecentTracks(tracks.slice(0, 10)));
      getUserProjects(user.uid).then(setProjects);
    }
  }, [user]);

  // Generation progress timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      setGenerationTimeElapsed(0);
      interval = setInterval(() => {
        setGenerationTimeElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Toggle instrument selection
  const toggleInstrument = (inst: string) => {
    setSelectedInstruments((prev) =>
      prev.includes(inst) ? prev.filter((i) => i !== inst) : [...prev, inst]
    );
  };

  // Handle template selection
  const handleSelectTemplate = (tmpl: PromptTemplate) => {
    setPrompt(tmpl.prompt);
    setSelectedGenre(tmpl.genre);
    setSelectedMood(tmpl.mood);
    setSelectedTempo(tmpl.tempo);
    setSelectedInstruments(tmpl.instrumentation);
    setForceInstrumental(tmpl.forceInstrumental);
    setDurationSec(tmpl.suggestedDurationSec);
    success('Template loaded', `Applied settings for "${tmpl.title}"`);
  };

  // Trigger Real Music Generation
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      warning('Prompt is empty', 'Please describe the music you wish to produce.');
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch('/api/music/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          genre: selectedGenre,
          mood: selectedMood,
          instrumentation: selectedInstruments,
          tempo: selectedTempo,
          forceInstrumental,
          durationMs: durationSec * 1000,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate music');
      }

      const activeProject = projects.find((p) => p.id === selectedProjectId);

      const newTrack: GeneratedTrack = {
        id: generateId('track'),
        userId: user ? user.uid : 'guest',
        title: prompt.split('.')[0].substring(0, 42) || 'Untitled Composition',
        prompt,
        genre: selectedGenre,
        mood: selectedMood,
        instrumentation: selectedInstruments,
        tempo: selectedTempo,
        forceInstrumental,
        durationMs: data.durationMs || durationSec * 1000,
        modelId: data.modelId || 'music_v2',
        provider: 'elevenlabs',
        audioUrl: data.audioUrl,
        createdAt: Date.now(),
        projectId: activeProject ? activeProject.id : null,
        projectName: activeProject ? activeProject.name : null,
        status: 'completed',
        isFavorite: false,
      };

      // Persist to Firestore & Local Storage
      await saveTrack(newTrack);

      setRecentTracks((prev) => [newTrack, ...prev]);
      success('Music generated successfully!', 'Your new AI composition is ready to preview.');

      // Automatically play the new track in the global player
      play({ type: 'track', item: newTrack });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Generation failed';
      error('Generation Error', message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Header Banner */}
        <div className="relative rounded-3xl bg-gradient-to-r from-midnight-900 via-midnight-850 to-midnight-900 border border-studio-border/70 p-6 sm:p-8 overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-studio-blue/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-studio-blue/10 border border-studio-blue/20 text-cyan-300 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Official ElevenLabs Music Integration</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              AI Music Studio
            </h1>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
              Compose studio-grade instrumental tracks, cinematic scores, and themes powered by the
              cutting-edge ElevenLabs Music model.
            </p>
          </div>
        </div>

        {/* Prompt Templates */}
        <PromptTemplates onSelect={handleSelectTemplate} />

        {/* Main Studio Console Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left / Center: Prompt Input & Musical Parameters */}
          <div className="lg:col-span-8 space-y-6">
            <div className="p-6 rounded-2xl bg-midnight-900/80 border border-studio-border/70 backdrop-blur-xl shadow-xl space-y-5">
              {/* Text Description Area */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Music2 className="w-4 h-4 text-studio-cyan" />
                    Composition Description
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {prompt.length} / 4000 characters
                  </span>
                </div>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  placeholder="Describe the mood, melody, tempo, instruments, and artistic vibe..."
                  className="w-full rounded-xl bg-midnight-950/80 border border-studio-border/70 p-3.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-studio-blue focus:ring-1 focus:ring-studio-blue transition-all resize-none"
                />
              </div>

              {/* Genre & Mood Pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1.5">
                    Genre / Style
                  </label>
                  <select
                    value={selectedGenre}
                    onChange={(e) => setSelectedGenre(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-midnight-950/80 border border-studio-border text-sm text-slate-200 focus:outline-none focus:border-studio-blue"
                  >
                    {GENRES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1.5">
                    Emotional Tone & Mood
                  </label>
                  <select
                    value={selectedMood}
                    onChange={(e) => setSelectedMood(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-midnight-950/80 border border-studio-border text-sm text-slate-200 focus:outline-none focus:border-studio-blue"
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
                <label className="text-xs font-medium text-slate-400 block mb-2">
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
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-studio-blue text-white shadow-sm shadow-studio-blue/30 border border-cyan-400/40'
                            : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-white/5'
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
                  <label className="text-xs font-medium text-slate-400 block mb-1.5">
                    Assign to Project (Optional)
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-midnight-950/80 border border-studio-border text-sm text-slate-200 focus:outline-none focus:border-studio-blue"
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

          {/* Right Column: Generation Controls & Studio Knobs */}
          <div className="lg:col-span-4 space-y-6">
            <div className="p-6 rounded-2xl bg-midnight-900/80 border border-studio-border/70 backdrop-blur-xl shadow-xl space-y-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-studio-cyan" />
                Track Master Controls
              </h3>

              {/* Instrumental Only Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-midnight-950/60 border border-white/5">
                <div>
                  <p className="text-xs font-semibold text-slate-200">Instrumental Only</p>
                  <p className="text-[11px] text-slate-400">Guarantees no vocal elements</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForceInstrumental(!forceInstrumental)}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                    forceInstrumental ? 'bg-studio-blue' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      forceInstrumental ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Duration selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    Target Duration
                  </span>
                  <span className="text-xs font-mono font-bold text-cyan-300">
                    {durationSec}s
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[15, 30, 45, 60].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setDurationSec(sec)}
                      className={`py-2 rounded-lg text-xs font-mono font-medium transition-all ${
                        durationSec === sec
                          ? 'bg-studio-blue text-white border border-cyan-400/30'
                          : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-white/5'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Model Tag */}
              <div className="p-3 rounded-xl bg-midnight-950/60 border border-white/5 text-[11px] text-slate-400 space-y-1">
                <div className="flex justify-between text-slate-300 font-medium">
                  <span>Engine:</span>
                  <span className="text-cyan-400 font-mono">music_v2 (ElevenLabs)</span>
                </div>
                <div className="flex justify-between">
                  <span>Audio Spec:</span>
                  <span className="font-mono">44.1 kHz • MP3 Stereo</span>
                </div>
              </div>

              {/* Big Generate Button */}
              <button
                type="button"
                disabled={isGenerating}
                onClick={handleGenerate}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-studio-blue via-indigo-600 to-studio-violet hover:from-blue-500 hover:to-violet-500 text-white font-semibold text-sm shadow-lg shadow-studio-blue/25 hover:shadow-studio-blue/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group active:scale-[0.99]"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-300" />
                    <span>Synthesizing Audio ({generationTimeElapsed}s)...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-cyan-300 group-hover:scale-110 transition-transform" />
                    <span>Generate Music Track</span>
                  </>
                )}
              </button>

              {/* Progress Indicator */}
              {isGenerating && (
                <div className="space-y-2 animate-in fade-in">
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-studio-blue via-cyan-400 to-studio-violet rounded-full w-2/3 animate-pulse" />
                  </div>
                  <p className="text-[11px] text-center text-slate-400 flex items-center justify-center gap-1.5">
                    <span>ElevenLabs is composing your audio track. Please wait...</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Studio Generations */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              Recent Studio Tracks
            </h2>
            <span className="text-xs text-slate-400">
              {recentTracks.length} saved in this session
            </span>
          </div>

          {recentTracks.length === 0 ? (
            <div className="p-8 rounded-2xl bg-midnight-900/50 border border-studio-border/50 text-center space-y-2">
              <Music2 className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-sm font-semibold text-slate-300">No tracks generated yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Pick a preset template above or write your own custom prompt, then click &quot;Generate Music Track&quot;.
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

