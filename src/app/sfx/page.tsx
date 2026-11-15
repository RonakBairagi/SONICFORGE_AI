'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  Sparkles,
  Repeat,
  Sliders,
  Play,
  Pause,
  Download,
  Loader2,
  Compass,
  Layers,
  Heart,
  Wind,
  Zap,
  Bell,
  Activity,
  Flame,
  Radio,
  X,
  Clock,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useAudioPlayer } from '@/context/AudioPlayerContext';
import { saveSoundEffect, getUserSoundEffects } from '@/lib/firestore-service';
import { GeneratedSoundEffect } from '@/types';
import { generateId, formatTime, formatDate, downloadAudioFile } from '@/lib/utils';

const SFX_CATEGORIES = [
  { name: 'Cinematic Impacts & Risers', icon: Zap },
  { name: 'Nature & Weather', icon: Wind },
  { name: 'Sci-Fi & Cyberpunk', icon: Radio },
  { name: 'UI & App Feedback', icon: Bell },
  { name: 'Foley & Real World', icon: Activity },
  { name: 'Magic & Fantasy', icon: Flame },
];

const SFX_PRESETS = [
  {
    category: 'Sci-Fi & Cyberpunk',
    title: 'Futuristic Portal Opening',
    prompt: 'A futuristic portal opening with a deep energy swell, swirling particle hum, and dimensional resonance',
    duration: 5.0,
    influence: 0.4,
    loop: false,
  },
  {
    category: 'Cinematic Impacts & Risers',
    title: 'Trailer Braam & Sub Drop',
    prompt: 'Massive cinematic trailer braam horn with deep resonant sub-bass drop and metallic reverberation',
    duration: 4.5,
    influence: 0.4,
    loop: false,
  },
  {
    category: 'Nature & Weather',
    title: 'Heavy Rain on Glass Window',
    prompt: 'Calming continuous heavy rainfall pelting against a glass windowpane with distant gentle thunder rumble',
    duration: 8.0,
    influence: 0.35,
    loop: true,
  },
  {
    category: 'Sci-Fi & Cyberpunk',
    title: 'Spaceship Airlock Venting',
    prompt: 'Futuristic pneumatic airlock opening with heavy hydraulic pressure release, hiss of steam, and mechanical clank',
    duration: 3.5,
    influence: 0.4,
    loop: false,
  },
  {
    category: 'UI & App Feedback',
    title: 'Glassy Success Chime',
    prompt: 'Clean, modern, crisp futuristic mobile app success notification chime with warm glassy shimmer',
    duration: 1.5,
    influence: 0.5,
    loop: false,
  },
  {
    category: 'Magic & Fantasy',
    title: 'Mystic Arcane Energy Hum',
    prompt: 'Ancient magical portal vibrating with glowing arcane hum, swirling energy wisps, and resonant frequencies',
    duration: 6.0,
    influence: 0.3,
    loop: true,
  },
];

export default function SoundEffectsStudioPage() {
  const { user } = useAuth();
  const { success, error, warning, info } = useToast();
  const { current, isPlaying, play, pause } = useAudioPlayer();

  // State
  const [prompt, setPrompt] = useState(
    'A futuristic portal opening with a deep energy swell, swirling particle hum, and dimensional resonance'
  );
  const [selectedCategory, setSelectedCategory] = useState('Sci-Fi & Cyberpunk');
  const [durationSeconds, setDurationSeconds] = useState(4.0);
  const [promptInfluence, setPromptInfluence] = useState(0.35);
  const [loop, setLoop] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationTimeElapsed, setGenerationTimeElapsed] = useState(0);
  const [recentSfx, setRecentSfx] = useState<GeneratedSoundEffect[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (user) {
      getUserSoundEffects(user.uid).then((items) => setRecentSfx(items.slice(0, 12)));
    }
  }, [user]);

  // Generation progress timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isGenerating) {
      setGenerationTimeElapsed(0);
      interval = setInterval(() => {
        setGenerationTimeElapsed((prev: number) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  const handleApplyPreset = (preset: (typeof SFX_PRESETS)[0]) => {
    setPrompt(preset.prompt);
    setSelectedCategory(preset.category);
    setDurationSeconds(preset.duration);
    setPromptInfluence(preset.influence);
    setLoop(preset.loop);
    success('Preset loaded', preset.title);
  };

  const handleCancelSFX = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    info('Generation Cancelled', 'Sound effect rendering was stopped.');
  };

  const handleGenerateSFX = async () => {
    if (!prompt.trim()) {
      warning('Prompt is empty', 'Describe the sound effect you wish to generate.');
      return;
    }

    setIsGenerating(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Strict 25s client timeout to guarantee SFX NEVER gets stuck in an infinite loading state
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 25000);

    const startTime = Date.now();

    try {
      const response = await fetch('/api/sound-effects/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          duration_seconds: durationSeconds,
          prompt_influence: promptInfluence,
          loop,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate sound effect');
      }

      const generationTimeSeconds = (Date.now() - startTime) / 1000;

      const newSfx: GeneratedSoundEffect = {
        id: generateId('sfx'),
        userId: user ? user.uid : 'guest',
        title: prompt.split('.')[0].substring(0, 36) || 'Sound Effect',
        prompt,
        category: selectedCategory,
        durationSeconds: data.durationSeconds || durationSeconds,
        promptInfluence: data.promptInfluence || promptInfluence,
        loop,
        modelId: 'eleven_text_to_sound_v3',
        provider: 'elevenlabs',
        audioUrl: data.audioUrl,
        createdAt: Date.now(),
        status: 'completed',
        isFavorite: false,
        generationTimeSeconds,
      };

      await saveSoundEffect(newSfx);
      setRecentSfx((prev) => [newSfx, ...prev]);
      success(
        'Sound Effect Rendered!',
        `Generated in ${generationTimeSeconds.toFixed(1)}s using ElevenLabs Sound Generation v3.`
      );

      play({ type: 'sfx', item: newSfx });
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof DOMException && err.name === 'AbortError') {
        error(
          'Timeout or Cancelled',
          'Sound effect rendering was cancelled or exceeded 25s. The system recovered cleanly.'
        );
      } else {
        const message = err instanceof Error ? err.message : 'SFX generation failed';
        error('Sound Effect Error', message);
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
        <div className="relative rounded-3xl bg-gradient-to-r from-slate-900 via-teal-950 to-midnight-900 border border-slate-700/60 dark:border-studio-border/70 p-6 sm:p-8 overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>ElevenLabs Sound Generation API • Model v3</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Sound Effects &amp; Foley Studio
            </h1>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
              Design bespoke sound effects, cinematic transitions, ambient environments, and game audio with zero infinite loading and sub-second playback.
            </p>
          </div>
        </div>

        {/* SFX Presets */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-studio-blue dark:text-cyan-400" />
            Curated Foley &amp; SFX Presets
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {SFX_PRESETS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleApplyPreset(p)}
                className="text-left p-4 rounded-2xl bg-white/70 dark:bg-midnight-900/60 hover:bg-white dark:hover:bg-midnight-850/90 border border-slate-200/80 dark:border-studio-border/50 hover:border-cyan-500/40 transition-all group flex flex-col justify-between shadow-sm hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
                    <span>{p.category}</span>
                    <span className="font-mono text-cyan-600 dark:text-cyan-400 font-semibold">{p.duration}s</span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-200 group-hover:text-studio-blue dark:group-hover:text-cyan-300">
                    {p.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {p.prompt}
                  </p>
                </div>
                {p.loop && (
                  <div className="mt-2.5 text-[10px] text-cyan-600 dark:text-studio-cyan font-mono flex items-center gap-1 font-semibold">
                    <Repeat className="w-3 h-3" />
                    <span>Seamless Loop</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Studio Form & Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <div className="p-6 rounded-3xl bg-white/80 dark:bg-midnight-900/80 border border-slate-200/80 dark:border-studio-border/70 backdrop-blur-xl shadow-xl space-y-5">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between mb-2">
                  <span className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-studio-blue dark:text-cyan-400" />
                    Sound Effect Prompt
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                    Describe acoustic source, texture, reverb tail
                  </span>
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={3}
                  placeholder="e.g. A futuristic portal opening with a deep energy swell..."
                  className="w-full rounded-2xl bg-slate-50 dark:bg-midnight-950/80 border border-slate-200 dark:border-studio-border/70 p-4 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all resize-none shadow-inner"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-2">
                  Category Tag
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SFX_CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = selectedCategory === cat.name;
                    return (
                      <button
                        key={cat.name}
                        type="button"
                        onClick={() => setSelectedCategory(cat.name)}
                        className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 transition-all ${
                          isSelected
                            ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40 shadow-sm font-semibold'
                            : 'bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-white/5'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Right Controls */}
          <div className="lg:col-span-4 space-y-6">
            <div className="p-6 rounded-3xl bg-white/80 dark:bg-midnight-900/80 border border-slate-200/80 dark:border-studio-border/70 backdrop-blur-xl shadow-xl space-y-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                Acoustic Parameters
              </h3>

              {/* Duration Slider */}
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Duration (seconds)</span>
                  <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
                    {durationSeconds.toFixed(1)}s
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="15.0"
                  step="0.5"
                  value={durationSeconds}
                  onChange={(e) => setDurationSeconds(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Prompt Influence Slider */}
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Prompt Influence</span>
                  <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
                    {promptInfluence.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.05"
                  value={promptInfluence}
                  onChange={(e) => setPromptInfluence(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  <span>Creative (0.1)</span>
                  <span>Literal (0.9)</span>
                </div>
              </div>

              {/* Loop Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-midnight-950/60 border border-slate-200 dark:border-white/5">
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Seamless Loop</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Ideal for portal humming or ambient tone</p>
                </div>
                <button
                  type="button"
                  onClick={() => setLoop(!loop)}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                    loop ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      loop ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Model Tag */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-midnight-950/60 border border-slate-200 dark:border-white/5 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                <div className="flex justify-between text-slate-700 dark:text-slate-300 font-medium">
                  <span>Engine:</span>
                  <span className="text-cyan-600 dark:text-cyan-400 font-mono font-bold">
                    eleven_text_to_sound_v3
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Max Timeout:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">25s Safety Guard</span>
                </div>
              </div>

              {/* Generate SFX Button */}
              <button
                type="button"
                disabled={isGenerating}
                onClick={handleGenerateSFX}
                className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-studio-blue hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-xl shadow-cyan-500/20 hover:shadow-cyan-500/35 transition-all flex items-center justify-center gap-2 disabled:opacity-50 group active:scale-[0.99]"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Rendering Sound ({generationTimeElapsed}s)...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span>Generate Sound Effect</span>
                  </>
                )}
              </button>

              {/* Cancel Button */}
              {isGenerating && (
                <button
                  type="button"
                  onClick={handleCancelSFX}
                  className="w-full py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-rose-500/20"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel Rendering</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Recent SFX List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers className="w-5 h-5 text-studio-blue dark:text-cyan-400" />
              Generated Sound Library
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              {recentSfx.length} effects
            </span>
          </div>

          {recentSfx.length === 0 ? (
            <div className="p-8 rounded-3xl bg-white/60 dark:bg-midnight-900/50 border border-slate-200/60 dark:border-studio-border/50 text-center space-y-2">
              <Volume2 className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto" />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No sound effects generated yet in this session.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {recentSfx.map((sfx) => {
                const isThisPlaying =
                  current?.type === 'sfx' && current.item.id === sfx.id && isPlaying;
                return (
                  <div
                    key={sfx.id}
                    className="p-4 rounded-2xl bg-white/80 dark:bg-midnight-900/70 border border-slate-200 dark:border-studio-border/60 hover:border-cyan-500/40 transition-all flex flex-col justify-between shadow-sm hover:shadow-md backdrop-blur-xl"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <button
                          onClick={() => {
                            if (isThisPlaying) {
                              pause();
                            } else {
                              play({ type: 'sfx', item: sfx });
                            }
                          }}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform ${
                            isThisPlaying
                              ? 'bg-cyan-500 text-white font-bold shadow-md shadow-cyan-500/30'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-cyan-500 hover:text-white'
                          }`}
                        >
                          {isThisPlaying ? (
                            <Pause className="w-4 h-4 fill-current" />
                          ) : (
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-200 truncate">
                            {sfx.title}
                          </h4>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            {sfx.category} • {sfx.durationSeconds}s
                          </span>
                        </div>
                        <button
                          onClick={() => downloadAudioFile(sfx.audioUrl, sfx.title)}
                          className="p-1.5 text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors"
                          title="Download MP3"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                        {sfx.prompt}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                      <span>{formatDate(sfx.createdAt)}</span>
                      {sfx.generationTimeSeconds !== undefined && (
                        <span className="font-mono text-emerald-600 dark:text-emerald-400">
                          ⚡ {sfx.generationTimeSeconds.toFixed(1)}s
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
