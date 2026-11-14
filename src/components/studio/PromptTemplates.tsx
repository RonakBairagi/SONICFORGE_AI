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
  Heart,
  Flame,
} from 'lucide-react';
import { CreationMode } from '@/types';

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
  creationMode?: CreationMode;
  suggestedDurationSec: number;
  lyrics?: string;
  vocalStyle?: string;
  vocalGender?: string;
}

export const STUDIO_TEMPLATES: PromptTemplate[] = [
  {
    id: 'vocal-synthpop-anthem',
    category: 'Vocal Pop Anthem',
    title: 'Neon Skyline Dreams',
    icon: Sparkles,
    prompt:
      'High-energy modern synthpop anthem with shimmering arpeggiators, punchy four-on-the-floor beat, and a soaring, emotional pop vocal melody.',
    genre: 'Synthpop / Modern Pop',
    mood: 'Euphoric & Energetic',
    tempo: '124 BPM',
    instrumentation: ['Analog Synth', 'Live Drums', 'Sub-Bass 808', 'Piano'],
    forceInstrumental: false,
    creationMode: 'full_song',
    suggestedDurationSec: 30,
    vocalStyle: 'Soaring & Anthemic',
    vocalGender: 'Female Vocals (Soprano / Warm)',
    lyrics: `[Verse 1]\nWe drove through the midnight rain\nChasing the glow of city names\nEvery shadow turning into gold\n\n[Chorus]\nCause tonight we are neon skylines\nBurning bright above the dark lines\nNothing can hold our hearts back now!`,
  },
  {
    id: 'vocal-indie-acoustic',
    category: 'Acoustic Singer-Songwriter',
    title: 'Lanterns on the Porch',
    icon: Music,
    prompt:
      'Intimate acoustic folk-pop song driven by fingerpicked warm acoustic guitar, delicate cello swells, and warm heartfelt vocals.',
    genre: 'Acoustic Pop',
    mood: 'Melancholic & Reflective',
    tempo: '88 BPM (Gentle)',
    instrumentation: ['Acoustic Guitar', 'Piano', 'Orchestral Strings'],
    forceInstrumental: false,
    creationMode: 'full_song',
    suggestedDurationSec: 30,
    vocalStyle: 'Intimate & Acoustic',
    vocalGender: 'Male Vocals (Baritone / Resonant)',
    lyrics: `[Verse 1]\nOld wood floor beneath our feet\nWatching summer turn bitter sweet\nWhispering secrets to the quiet night\n\n[Chorus]\nLeave the lantern glowing for me\nAcross the hills and through the trees\nI'll find my way back home.`,
  },
  {
    id: 'cinematic-epic',
    category: 'Cinematic Score',
    title: 'Epic Orchestral Crescendo',
    icon: Film,
    prompt:
      'Sweeping cinematic orchestral cue starting with melancholic cello and piano, slowly building with thunderous brass, taiko drums, and soaring violins into a heroic climax.',
    genre: 'Cinematic Orchestral',
    mood: 'Heroic & Triumphant',
    tempo: '110 BPM (Building)',
    instrumentation: ['Orchestral Strings', 'Piano', 'Brass Section', 'Live Drums'],
    forceInstrumental: true,
    creationMode: 'instrumental',
    suggestedDurationSec: 30,
  },
  {
    id: 'ambient-emotional',
    category: 'Emotional & Ambient',
    title: 'Nebula Dreamscape',
    icon: Sparkles,
    prompt:
      'Lush ethereal ambient soundscape with drifting granular synthesizer pads, soft reverberant electric guitar swells, and gentle sub-bass hum.',
    genre: 'Ambient & Drone',
    mood: 'Dreamy & Atmospheric',
    tempo: '70 BPM (Slow)',
    instrumentation: ['Analog Synth', 'Chimes & Bells', 'Electric Guitar'],
    forceInstrumental: true,
    creationMode: 'instrumental',
    suggestedDurationSec: 30,
  },
  {
    id: 'electronic-synthwave',
    category: 'Electronic / Retro',
    title: 'Neon Cyberpunk Highway',
    icon: Zap,
    prompt:
      'High-energy 1980s synthwave anthem with punchy LinnDrum snare hits, driving arpeggiated bassline, glowing Roland Juno synth leads, and retro cyber vibes.',
    genre: 'Synthwave / Retrowave',
    mood: 'Euphoric & Energetic',
    tempo: '124 BPM (Driving)',
    instrumentation: ['Analog Synth', 'Sub-Bass 808', 'Live Drums'],
    forceInstrumental: true,
    creationMode: 'instrumental',
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
    instrumentation: ['Piano', 'Vinyl Crackle', 'Acoustic Guitar'],
    forceInstrumental: true,
    creationMode: 'instrumental',
    suggestedDurationSec: 30,
  },
  {
    id: 'game-boss',
    category: 'Game Soundtrack',
    title: 'Cyber Mecha Boss Battle',
    icon: Gamepad2,
    prompt:
      'Dark industrial battle theme fusing heavy distorted 8-string electric guitar riffs, aggressive glitch beats, pounding hybrid orchestral brass, and siren sound effects.',
    genre: 'Cyberpunk / Industrial',
    mood: 'Dark & Suspenseful',
    tempo: '140 BPM (Fast)',
    instrumentation: ['Electric Guitar', 'Brass Section', 'Sub-Bass 808', 'Live Drums'],
    forceInstrumental: true,
    creationMode: 'instrumental',
    suggestedDurationSec: 30,
  },
  {
    id: 'vocal-rnb-soul',
    category: 'R&B / Soul Groove',
    title: 'Velvet Midnight',
    icon: Flame,
    prompt:
      'Smooth modern R&B track with warm neo-soul chords on electric piano, deep 808 bass, crisp trap hi-hats, and soulful vocal ad-libs.',
    genre: 'Deep House',
    mood: 'Chill & Relaxed',
    tempo: '96 BPM (Groovy)',
    instrumentation: ['Piano', 'Sub-Bass 808', 'Vinyl Crackle'],
    forceInstrumental: false,
    creationMode: 'full_song',
    suggestedDurationSec: 30,
    vocalStyle: 'Soulful R&B Groove',
    vocalGender: 'Duet & Harmonized Vocalists',
    lyrics: `[Verse 1]\nClock strikes two, shadows on the wall\nWondering if you ever meant it all\n\n[Chorus]\nVelvet midnight falling over me\nEvery whisper echoes endlessly.`,
  },
];

interface PromptTemplatesProps {
  onSelect: (template: PromptTemplate) => void;
}

export function PromptTemplates({ onSelect }: PromptTemplatesProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-studio-blue dark:text-cyan-400" />
          Production Templates
        </h3>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">Click to load preset controls</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {STUDIO_TEMPLATES.map((tmpl) => {
          const Icon = tmpl.icon;
          const isVocal = tmpl.creationMode === 'full_song' || !tmpl.forceInstrumental;
          return (
            <button
              key={tmpl.id}
              onClick={() => onSelect(tmpl)}
              className="text-left p-3.5 rounded-2xl bg-white/70 dark:bg-midnight-900/60 hover:bg-white dark:hover:bg-midnight-850/90 border border-slate-200/80 dark:border-studio-border/50 hover:border-studio-blue/40 transition-all duration-200 group flex flex-col justify-between shadow-sm hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-lg bg-studio-blue/10 border border-studio-blue/20 flex items-center justify-center text-studio-blue dark:text-cyan-400 group-hover:scale-110 transition-transform">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300">
                      {tmpl.category}
                    </span>
                  </div>
                  {isVocal && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-studio-violet/15 text-studio-violet dark:text-purple-300 border border-studio-violet/30">
                      Vocal AI
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-studio-blue dark:group-hover:text-cyan-300 line-clamp-1">
                  {tmpl.title}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  {tmpl.prompt}
                </p>
              </div>
              <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
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
