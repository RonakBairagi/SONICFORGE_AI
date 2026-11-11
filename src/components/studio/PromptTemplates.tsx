'use client';

import React from 'react';
import {
  Film,
  Sparkles,
  Zap,
  BookOpen,
  Mic,
  Video,
  Gamepad2,
  Music,
} from 'lucide-react';

export interface PromptTemplate {
  id: string;
  category: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  prompt: string;
  genre: string;
  mood: string;
  tempo: string;
  instrumentation: string[];
  forceInstrumental: boolean;
  suggestedDurationSec: number;
}

export const STUDIO_TEMPLATES: PromptTemplate[] = [
  {
    id: 'cinematic-epic',
    category: 'Cinematic Score',
    title: 'Epic Orchestral Crescendo',
    icon: Film,
    prompt:
      'Sweeping cinematic orchestral cue starting with melancholic cello and piano, slowly building with thunderous brass, taiko drums, and soaring violins into a heroic climax.',
    genre: 'Cinematic Orchestral',
    mood: 'Heroic & Intense',
    tempo: '110 BPM (Building)',
    instrumentation: ['Cello', 'Grand Piano', 'Brass Section', 'Taiko Drums', 'Strings'],
    forceInstrumental: true,
    suggestedDurationSec: 45,
  },
  {
    id: 'ambient-emotional',
    category: 'Emotional & Ambient',
    title: 'Nebula Dreamscape',
    icon: Sparkles,
    prompt:
      'Lush ethereal ambient soundscape with drifting granular synthesizer pads, soft reverberant electric guitar swells, and gentle sub-bass hum.',
    genre: 'Ambient Soundscape',
    mood: 'Peaceful & Reflective',
    tempo: '70 BPM (Slow)',
    instrumentation: ['Analog Synth Pads', 'Ethereal Guitar Swells', 'Sub Bass', 'Chimes'],
    forceInstrumental: true,
    suggestedDurationSec: 30,
  },
  {
    id: 'electronic-synthwave',
    category: 'Electronic',
    title: 'Neon Cyberpunk Highway',
    icon: Zap,
    prompt:
      'High-energy 1980s synthwave anthem with punchy LinnDrum snare hits, driving arpeggiated bassline, glowing Roland Juno synth leads, and retro cyber vibes.',
    genre: 'Synthwave / Retrowave',
    mood: 'Energetic & Nostalgic',
    tempo: '124 BPM (Driving)',
    instrumentation: ['Poly Synth Lead', 'Arpeggiated Bass', 'LinnDrum Snares', 'Gated Reverb'],
    forceInstrumental: true,
    suggestedDurationSec: 30,
  },
  {
    id: 'lofi-study',
    category: 'Instrumental Study',
    title: 'Late Night Coffee & Beats',
    icon: BookOpen,
    prompt:
      'Warm lofi hip-hop instrumental with mellow Rhodes piano chords, gentle vinyl surface crackle, relaxed boom-bap kick and snare, and a soothing acoustic guitar riff.',
    genre: 'Lo-Fi Hip Hop',
    mood: 'Chill & Relaxed',
    tempo: '84 BPM (Laid back)',
    instrumentation: ['Rhodes Piano', 'Vinyl Crackle', 'Acoustic Guitar', 'Boom-Bap Drums'],
    forceInstrumental: true,
    suggestedDurationSec: 30,
  },
  {
    id: 'podcast-intro',
    category: 'Podcast Intro / Outro',
    title: 'Modern Tech Stinger',
    icon: Mic,
    prompt:
      'Catchy and confident 15-second podcast theme song featuring crisp acoustic guitar strums, modern pop clap beat, warm upright bass, and a punchy upbeat finish.',
    genre: 'Modern Pop Acoustic',
    mood: 'Confident & Friendly',
    tempo: '118 BPM (Brisk)',
    instrumentation: ['Acoustic Guitar', 'Finger Snaps', 'Modern Claps', 'Warm Upright Bass'],
    forceInstrumental: true,
    suggestedDurationSec: 15,
  },
  {
    id: 'video-vlog',
    category: 'Video Background',
    title: 'Travel Adventure Beats',
    icon: Video,
    prompt:
      'Uplifting tropical house groove with cheerful kalimba melodies, bright vocal chops, plucky synth chords, and an energetic four-on-the-floor beat perfect for travel vlogs.',
    genre: 'Tropical Melodic House',
    mood: 'Uplifting & Sunny',
    tempo: '120 BPM',
    instrumentation: ['Kalimba', 'Bright Plucks', 'Four-on-the-floor Kick', 'Melodic Chops'],
    forceInstrumental: true,
    suggestedDurationSec: 30,
  },
  {
    id: 'game-boss',
    category: 'Game Soundtrack',
    title: 'Cyber Mecha Boss Battle',
    icon: Gamepad2,
    prompt:
      'Dark industrial battle theme fusing heavy distorted 8-string electric guitar riffs, aggressive glitch beats, pounding hybrid orchestral brass, and siren sound effects.',
    genre: 'Industrial Metal / Hybrid',
    mood: 'Aggressive & Dark',
    tempo: '140 BPM (Fast)',
    instrumentation: ['Distorted 8-String Guitars', 'Glitch Beats', 'Hybrid Brass', 'Sub Bass'],
    forceInstrumental: true,
    suggestedDurationSec: 30,
  },
  {
    id: 'original-demo',
    category: 'Original Song Demo',
    title: 'Indie Pop-Rock Anthem',
    icon: Music,
    prompt:
      'Catchy radio-friendly indie rock arrangement featuring crisp rhythmic Telecaster chords, driving bass guitar, punchy live kit drums, and an infectious soaring chorus melody.',
    genre: 'Indie Rock / Pop',
    mood: 'Inspirational & Anthemic',
    tempo: '128 BPM',
    instrumentation: ['Electric Guitar', 'Live Drum Kit', 'Bass Guitar', 'Organ'],
    forceInstrumental: false,
    suggestedDurationSec: 30,
  },
];

interface PromptTemplatesProps {
  onSelect: (template: PromptTemplate) => void;
}

export function PromptTemplates({ onSelect }: PromptTemplatesProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          Production Templates
        </h3>
        <span className="text-[11px] text-slate-400">Click to load preset controls</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {STUDIO_TEMPLATES.map((tmpl) => {
          const Icon = tmpl.icon;
          return (
            <button
              key={tmpl.id}
              onClick={() => onSelect(tmpl)}
              className="text-left p-3 rounded-xl bg-midnight-900/60 hover:bg-midnight-850/90 border border-studio-border/50 hover:border-studio-blue/40 transition-all duration-200 group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-6 h-6 rounded-lg bg-studio-blue/10 border border-studio-blue/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] font-medium text-slate-400 group-hover:text-slate-300">
                    {tmpl.category}
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 line-clamp-1">
                  {tmpl.title}
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                  {tmpl.prompt}
                </p>
              </div>
              <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400">
                <span className="px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 font-mono">
                  {tmpl.genre.split('/')[0]}
                </span>
                <span>{tmpl.suggestedDurationSec}s</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

