'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Square,
  Volume2,
  Clock,
  Sparkles,
  Music2,
  Sliders,
  RotateCcw,
  Activity,
  Plus,
  Trash2,
  Save,
  Radio,
  BookOpen,
  VolumeX,
  Layers,
  ChevronRight,
  Info,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { NOTE_NAMES, NoteName } from '@/lib/music-theory';
import {
  TanpuraEngine,
  TablaEngine,
  SargamSynthEngine,
  TONIC_FREQUENCIES,
  parseSargamPhrase,
  validateSargamPhrase,
  ParsedSwara,
  getAudioContext,
} from '@/lib/indian-audio-engine';
import { useToast } from '@/context/ToastContext';

// ============================================================================
// 1. TAAL DEFINITIONS (8 CLASSICAL HINDUSTANI TAALS)
// ============================================================================

interface TaalDefinition {
  id: string;
  name: string;
  matras: number;
  divisions: number[];
  bols: string[];
  taaliKhaali: ('sam' | 'taali' | 'khaali' | 'normal')[];
  description: string;
}

const TAALS: TaalDefinition[] = [
  {
    id: 'teentaal',
    name: 'Teentaal (16 Beats)',
    matras: 16,
    divisions: [4, 4, 4, 4],
    bols: [
      'Dha', 'Dhin', 'Dhin', 'Dha',
      'Dha', 'Dhin', 'Dhin', 'Dha',
      'Dha', 'Tin', 'Tin', 'Ta',
      'Ta', 'Dhin', 'Dhin', 'Dha',
    ],
    taaliKhaali: [
      'sam', 'normal', 'normal', 'normal',
      'taali', 'normal', 'normal', 'normal',
      'khaali', 'normal', 'normal', 'normal',
      'taali', 'normal', 'normal', 'normal',
    ],
    description: 'The king of rhythmic cycles (4+4+4+4). Universal foundation for Khyal, instrumental Gat, and dance.',
  },
  {
    id: 'ektaal',
    name: 'Ektaal (12 Beats)',
    matras: 12,
    divisions: [2, 2, 2, 2, 2, 2],
    bols: [
      'Dhin', 'Dhin',
      'DhaGe', 'Tirakita',
      'Tu', 'Na',
      'Kat', 'Ta',
      'DhaGe', 'Tirakita',
      'Dhi', 'Na',
    ],
    taaliKhaali: [
      'sam', 'normal',
      'khaali', 'normal',
      'taali', 'normal',
      'khaali', 'normal',
      'taali', 'normal',
      'taali', 'normal',
    ],
    description: '6 equal vibhaags of 2 matras each. Celebrated in Vilambit Khyal and intricate Bada Khyal compositions.',
  },
  {
    id: 'jhaptal',
    name: 'Jhaptaal (10 Beats)',
    matras: 10,
    divisions: [2, 3, 2, 3],
    bols: [
      'Dhi', 'Na',
      'Dhi', 'Dhi', 'Na',
      'Ti', 'Na',
      'Dhi', 'Dhi', 'Na',
    ],
    taaliKhaali: [
      'sam', 'normal',
      'taali', 'normal', 'normal',
      'khaali', 'normal',
      'taali', 'normal', 'normal',
    ],
    description: 'Asymmetrical 2+3+2+3 cycle with distinct lilting cadence. Ideal for devotional and classical ragas.',
  },
  {
    id: 'rupak',
    name: 'Rupak (7 Beats)',
    matras: 7,
    divisions: [3, 2, 2],
    bols: ['Tin', 'Tin', 'Na', 'Dhi', 'Na', 'Dhi', 'Na'],
    taaliKhaali: ['khaali', 'normal', 'normal', 'taali', 'normal', 'taali', 'normal'],
    description: 'Distinctive Hindustani cycle starting on Khaali (0) on matra 1. 3+2+2 structure favored in light classical & Ghazal.',
  },
  {
    id: 'keherwa',
    name: 'Keharwa (8 Beats)',
    matras: 8,
    divisions: [4, 4],
    bols: ['Dha', 'Ge', 'Na', 'Ti', 'Na', 'Ke', 'Dhi', 'Na'],
    taaliKhaali: ['sam', 'normal', 'normal', 'normal', 'khaali', 'normal', 'normal', 'normal'],
    description: 'Energetic 4+4 folk and semi-classical rhythm. Fast, danceable, and central to Bhajans, Ghazals, and Sufi songs.',
  },
  {
    id: 'dadra',
    name: 'Dadra (6 Beats)',
    matras: 6,
    divisions: [3, 3],
    bols: ['Dha', 'Dhi', 'Na', 'Dha', 'Tu', 'Na'],
    taaliKhaali: ['sam', 'normal', 'normal', 'khaali', 'normal', 'normal'],
    description: 'Two divisions of 3 beats (3+3). The quintessential romantic lilt for Thumri, Dadra, and folk singing.',
  },
  {
    id: 'deepchandi',
    name: 'Deepchandi (14 Beats)',
    matras: 14,
    divisions: [3, 4, 3, 4],
    bols: [
      'Dha', 'Dhin', '-',
      'Dha', 'Dha', 'Tin', '-',
      'Ta', 'Tin', '-',
      'Dha', 'Dha', 'Dhin', '-',
    ],
    taaliKhaali: [
      'sam', 'normal', 'normal',
      'taali', 'normal', 'normal', 'normal',
      'khaali', 'normal', 'normal',
      'taali', 'normal', 'normal', 'normal',
    ],
    description: '14-beat romantic syncopated rhythm with expressive avagraha pauses (-). Standard for classical Thumri and Hori.',
  },
  {
    id: 'chautaal',
    name: 'Chautaal (12 Beats)',
    matras: 12,
    divisions: [2, 2, 2, 2, 2, 2],
    bols: [
      'Dha', 'Dha',
      'Dhin', 'Ta',
      'KiTe', 'Dha',
      'Dhin', 'Ta',
      'TiTe', 'Kat',
      'GaDi', 'GeNe',
    ],
    taaliKhaali: [
      'sam', 'normal',
      'khaali', 'normal',
      'taali', 'normal',
      'khaali', 'normal',
      'taali', 'normal',
      'taali', 'normal',
    ],
    description: 'Ancient Pakhawaj Dhrupad rhythm with heavy resonance and dignified majestic bols.',
  },
];

// ============================================================================
// 2. ALANKAR EXERCISES (8 BUILT-IN STANDARD CLASSICAL EXERCISES)
// ============================================================================

interface AlankarExercise {
  id: string;
  title: string;
  description: string;
  sequence: ParsedSwara[];
  isCustom?: boolean;
}

const BUILTIN_ALANKARS: AlankarExercise[] = [
  {
    id: 'alankar_1',
    title: '1. Shuddha Swara Aroha & Avaroha',
    description: 'Fundamental 7-note ascending and descending scale across middle and taar saptak.',
    sequence: [
      { swara: 'Sa', semitoneOffset: 0 },
      { swara: 'Re', semitoneOffset: 2 },
      { swara: 'Ga', semitoneOffset: 4 },
      { swara: 'Ma', semitoneOffset: 5 },
      { swara: 'Pa', semitoneOffset: 7 },
      { swara: 'Dha', semitoneOffset: 9 },
      { swara: 'Ni', semitoneOffset: 11 },
      { swara: "Sa'", semitoneOffset: 12 },
      { swara: "Sa'", semitoneOffset: 12 },
      { swara: 'Ni', semitoneOffset: 11 },
      { swara: 'Dha', semitoneOffset: 9 },
      { swara: 'Pa', semitoneOffset: 7 },
      { swara: 'Ma', semitoneOffset: 5 },
      { swara: 'Ga', semitoneOffset: 4 },
      { swara: 'Re', semitoneOffset: 2 },
      { swara: 'Sa', semitoneOffset: 0 },
    ],
  },
  {
    id: 'alankar_2',
    title: '2. Double Swara (Jod Swara)',
    description: 'Practices stability, intonation control, and vocal support on repeated pitches.',
    sequence: [
      { swara: 'Sa', semitoneOffset: 0 }, { swara: 'Sa', semitoneOffset: 0 },
      { swara: 'Re', semitoneOffset: 2 }, { swara: 'Re', semitoneOffset: 2 },
      { swara: 'Ga', semitoneOffset: 4 }, { swara: 'Ga', semitoneOffset: 4 },
      { swara: 'Ma', semitoneOffset: 5 }, { swara: 'Ma', semitoneOffset: 5 },
      { swara: 'Pa', semitoneOffset: 7 }, { swara: 'Pa', semitoneOffset: 7 },
      { swara: 'Dha', semitoneOffset: 9 }, { swara: 'Dha', semitoneOffset: 9 },
      { swara: 'Ni', semitoneOffset: 11 }, { swara: 'Ni', semitoneOffset: 11 },
      { swara: "Sa'", semitoneOffset: 12 }, { swara: "Sa'", semitoneOffset: 12 },
      { swara: "Sa'", semitoneOffset: 12 }, { swara: "Sa'", semitoneOffset: 12 },
      { swara: 'Ni', semitoneOffset: 11 }, { swara: 'Ni', semitoneOffset: 11 },
      { swara: 'Dha', semitoneOffset: 9 }, { swara: 'Dha', semitoneOffset: 9 },
      { swara: 'Pa', semitoneOffset: 7 }, { swara: 'Pa', semitoneOffset: 7 },
      { swara: 'Ma', semitoneOffset: 5 }, { swara: 'Ma', semitoneOffset: 5 },
      { swara: 'Ga', semitoneOffset: 4 }, { swara: 'Ga', semitoneOffset: 4 },
      { swara: 'Re', semitoneOffset: 2 }, { swara: 'Re', semitoneOffset: 2 },
      { swara: 'Sa', semitoneOffset: 0 }, { swara: 'Sa', semitoneOffset: 0 },
    ],
  },
  {
    id: 'alankar_3',
    title: '3. Triplets (Trika)',
    description: '3-note melodic steps advancing through the saptak to develop flexibility and breath timing.',
    sequence: [
      // Aroha
      { swara: 'Sa', semitoneOffset: 0 }, { swara: 'Re', semitoneOffset: 2 }, { swara: 'Ga', semitoneOffset: 4 },
      { swara: 'Re', semitoneOffset: 2 }, { swara: 'Ga', semitoneOffset: 4 }, { swara: 'Ma', semitoneOffset: 5 },
      { swara: 'Ga', semitoneOffset: 4 }, { swara: 'Ma', semitoneOffset: 5 }, { swara: 'Pa', semitoneOffset: 7 },
      { swara: 'Ma', semitoneOffset: 5 }, { swara: 'Pa', semitoneOffset: 7 }, { swara: 'Dha', semitoneOffset: 9 },
      { swara: 'Pa', semitoneOffset: 7 }, { swara: 'Dha', semitoneOffset: 9 }, { swara: 'Ni', semitoneOffset: 11 },
      { swara: 'Dha', semitoneOffset: 9 }, { swara: 'Ni', semitoneOffset: 11 }, { swara: "Sa'", semitoneOffset: 12 },
      // Avaroha
      { swara: "Sa'", semitoneOffset: 12 }, { swara: 'Ni', semitoneOffset: 11 }, { swara: 'Dha', semitoneOffset: 9 },
      { swara: 'Ni', semitoneOffset: 11 }, { swara: 'Dha', semitoneOffset: 9 }, { swara: 'Pa', semitoneOffset: 7 },
      { swara: 'Dha', semitoneOffset: 9 }, { swara: 'Pa', semitoneOffset: 7 }, { swara: 'Ma', semitoneOffset: 5 },
      { swara: 'Pa', semitoneOffset: 7 }, { swara: 'Ma', semitoneOffset: 5 }, { swara: 'Ga', semitoneOffset: 4 },
      { swara: 'Ma', semitoneOffset: 5 }, { swara: 'Ga', semitoneOffset: 4 }, { swara: 'Re', semitoneOffset: 2 },
      { swara: 'Ga', semitoneOffset: 4 }, { swara: 'Re', semitoneOffset: 2 }, { swara: 'Sa', semitoneOffset: 0 },
    ],
  },
  {
    id: 'alankar_4',
    title: '4. Quads (Chatur Swara)',
    description: '4-note ascending and descending step sequences for agility and tempo building.',
    sequence: [
      // Aroha
      { swara: 'Sa', semitoneOffset: 0 }, { swara: 'Re', semitoneOffset: 2 }, { swara: 'Ga', semitoneOffset: 4 }, { swara: 'Ma', semitoneOffset: 5 },
      { swara: 'Re', semitoneOffset: 2 }, { swara: 'Ga', semitoneOffset: 4 }, { swara: 'Ma', semitoneOffset: 5 }, { swara: 'Pa', semitoneOffset: 7 },
      { swara: 'Ga', semitoneOffset: 4 }, { swara: 'Ma', semitoneOffset: 5 }, { swara: 'Pa', semitoneOffset: 7 }, { swara: 'Dha', semitoneOffset: 9 },
      { swara: 'Ma', semitoneOffset: 5 }, { swara: 'Pa', semitoneOffset: 7 }, { swara: 'Dha', semitoneOffset: 9 }, { swara: 'Ni', semitoneOffset: 11 },
      { swara: 'Pa', semitoneOffset: 7 }, { swara: 'Dha', semitoneOffset: 9 }, { swara: 'Ni', semitoneOffset: 11 }, { swara: "Sa'", semitoneOffset: 12 },
      // Avaroha
      { swara: "Sa'", semitoneOffset: 12 }, { swara: 'Ni', semitoneOffset: 11 }, { swara: 'Dha', semitoneOffset: 9 }, { swara: 'Pa', semitoneOffset: 7 },
      { swara: 'Ni', semitoneOffset: 11 }, { swara: 'Dha', semitoneOffset: 9 }, { swara: 'Pa', semitoneOffset: 7 }, { swara: 'Ma', semitoneOffset: 5 },
      { swara: 'Dha', semitoneOffset: 9 }, { swara: 'Pa', semitoneOffset: 7 }, { swara: 'Ma', semitoneOffset: 5 }, { swara: 'Ga', semitoneOffset: 4 },
      { swara: 'Pa', semitoneOffset: 7 }, { swara: 'Ma', semitoneOffset: 5 }, { swara: 'Ga', semitoneOffset: 4 }, { swara: 'Re', semitoneOffset: 2 },
      { swara: 'Ma', semitoneOffset: 5 }, { swara: 'Ga', semitoneOffset: 4 }, { swara: 'Re', semitoneOffset: 2 }, { swara: 'Sa', semitoneOffset: 0 },
    ],
  },
  {
    id: 'alankar_5',
    title: '5. Skipping Intervals (Antar)',
    description: 'Skips one note (step of a third) to train pitch discrimination and rapid interval ear accuracy.',
    sequence: [
      // Aroha
      { swara: 'Sa', semitoneOffset: 0 }, { swara: 'Ga', semitoneOffset: 4 },
      { swara: 'Re', semitoneOffset: 2 }, { swara: 'Ma', semitoneOffset: 5 },
      { swara: 'Ga', semitoneOffset: 4 }, { swara: 'Pa', semitoneOffset: 7 },
      { swara: 'Ma', semitoneOffset: 5 }, { swara: 'Dha', semitoneOffset: 9 },
      { swara: 'Pa', semitoneOffset: 7 }, { swara: 'Ni', semitoneOffset: 11 },
      { swara: 'Dha', semitoneOffset: 9 }, { swara: "Sa'", semitoneOffset: 12 },
      // Avaroha
      { swara: "Sa'", semitoneOffset: 12 }, { swara: 'Dha', semitoneOffset: 9 },
      { swara: 'Ni', semitoneOffset: 11 }, { swara: 'Pa', semitoneOffset: 7 },
      { swara: 'Dha', semitoneOffset: 9 }, { swara: 'Ma', semitoneOffset: 5 },
      { swara: 'Pa', semitoneOffset: 7 }, { swara: 'Ga', semitoneOffset: 4 },
      { swara: 'Ma', semitoneOffset: 5 }, { swara: 'Re', semitoneOffset: 2 },
      { swara: 'Ga', semitoneOffset: 4 }, { swara: 'Sa', semitoneOffset: 0 },
    ],
  },
  {
    id: 'alankar_6',
    title: '6. Palta Zigzag Turnarounds',
    description: 'Zigzag turnarounds forming the foundation of Raga development and classical improvisation.',
    sequence: [
      // Aroha
      { swara: 'Sa', semitoneOffset: 0 }, { swara: 'Re', semitoneOffset: 2 }, { swara: 'Ga', semitoneOffset: 4 }, { swara: 'Re', semitoneOffset: 2 },
      { swara: 'Re', semitoneOffset: 2 }, { swara: 'Ga', semitoneOffset: 4 }, { swara: 'Ma', semitoneOffset: 5 }, { swara: 'Ga', semitoneOffset: 4 },
      { swara: 'Ga', semitoneOffset: 4 }, { swara: 'Ma', semitoneOffset: 5 }, { swara: 'Pa', semitoneOffset: 7 }, { swara: 'Ma', semitoneOffset: 5 },
      { swara: 'Ma', semitoneOffset: 5 }, { swara: 'Pa', semitoneOffset: 7 }, { swara: 'Dha', semitoneOffset: 9 }, { swara: 'Pa', semitoneOffset: 7 },
      { swara: 'Pa', semitoneOffset: 7 }, { swara: 'Dha', semitoneOffset: 9 }, { swara: 'Ni', semitoneOffset: 11 }, { swara: 'Dha', semitoneOffset: 9 },
      { swara: 'Dha', semitoneOffset: 9 }, { swara: 'Ni', semitoneOffset: 11 }, { swara: "Sa'", semitoneOffset: 12 }, { swara: 'Ni', semitoneOffset: 11 },
      { swara: "Sa'", semitoneOffset: 12 },
      // Avaroha
      { swara: "Sa'", semitoneOffset: 12 }, { swara: 'Ni', semitoneOffset: 11 }, { swara: 'Dha', semitoneOffset: 9 }, { swara: 'Ni', semitoneOffset: 11 },
      { swara: 'Ni', semitoneOffset: 11 }, { swara: 'Dha', semitoneOffset: 9 }, { swara: 'Pa', semitoneOffset: 7 }, { swara: 'Dha', semitoneOffset: 9 },
      { swara: 'Dha', semitoneOffset: 9 }, { swara: 'Pa', semitoneOffset: 7 }, { swara: 'Ma', semitoneOffset: 5 }, { swara: 'Pa', semitoneOffset: 7 },
      { swara: 'Pa', semitoneOffset: 7 }, { swara: 'Ma', semitoneOffset: 5 }, { swara: 'Ga', semitoneOffset: 4 }, { swara: 'Ma', semitoneOffset: 5 },
      { swara: 'Ma', semitoneOffset: 5 }, { swara: 'Ga', semitoneOffset: 4 }, { swara: 'Re', semitoneOffset: 2 }, { swara: 'Ga', semitoneOffset: 4 },
      { swara: 'Ga', semitoneOffset: 4 }, { swara: 'Re', semitoneOffset: 2 }, { swara: 'Sa', semitoneOffset: 0 }, { swara: 'Re', semitoneOffset: 2 },
      { swara: 'Sa', semitoneOffset: 0 },
    ],
  },
  {
    id: 'alankar_7',
    title: '7. Wide Intervals (4ths & 5ths)',
    description: 'Wider jumps targeting foundational tonic and consonant fifth/fourth melodic stability.',
    sequence: [
      // Aroha
      { swara: 'Sa', semitoneOffset: 0 }, { swara: 'Ma', semitoneOffset: 5 },
      { swara: 'Re', semitoneOffset: 2 }, { swara: 'Pa', semitoneOffset: 7 },
      { swara: 'Ga', semitoneOffset: 4 }, { swara: 'Dha', semitoneOffset: 9 },
      { swara: 'Ma', semitoneOffset: 5 }, { swara: 'Ni', semitoneOffset: 11 },
      { swara: 'Pa', semitoneOffset: 7 }, { swara: "Sa'", semitoneOffset: 12 },
      // Avaroha
      { swara: "Sa'", semitoneOffset: 12 }, { swara: 'Pa', semitoneOffset: 7 },
      { swara: 'Ni', semitoneOffset: 11 }, { swara: 'Ma', semitoneOffset: 5 },
      { swara: 'Dha', semitoneOffset: 9 }, { swara: 'Ga', semitoneOffset: 4 },
      { swara: 'Pa', semitoneOffset: 7 }, { swara: 'Re', semitoneOffset: 2 },
      { swara: 'Ma', semitoneOffset: 5 }, { swara: 'Sa', semitoneOffset: 0 },
    ],
  },
  {
    id: 'alankar_8',
    title: '8. Progressive Wave Patterns',
    description: 'Complex 5-swara wave repetitions advancing through the entire octave.',
    sequence: [
      // Aroha
      { swara: 'Sa', semitoneOffset: 0 }, { swara: 'Re', semitoneOffset: 2 }, { swara: 'Sa', semitoneOffset: 0 }, { swara: 'Re', semitoneOffset: 2 }, { swara: 'Ga', semitoneOffset: 4 },
      { swara: 'Re', semitoneOffset: 2 }, { swara: 'Ga', semitoneOffset: 4 }, { swara: 'Re', semitoneOffset: 2 }, { swara: 'Ga', semitoneOffset: 4 }, { swara: 'Ma', semitoneOffset: 5 },
      { swara: 'Ga', semitoneOffset: 4 }, { swara: 'Ma', semitoneOffset: 5 }, { swara: 'Ga', semitoneOffset: 4 }, { swara: 'Ma', semitoneOffset: 5 }, { swara: 'Pa', semitoneOffset: 7 },
      { swara: 'Ma', semitoneOffset: 5 }, { swara: 'Pa', semitoneOffset: 7 }, { swara: 'Ma', semitoneOffset: 5 }, { swara: 'Pa', semitoneOffset: 7 }, { swara: 'Dha', semitoneOffset: 9 },
      { swara: 'Pa', semitoneOffset: 7 }, { swara: 'Dha', semitoneOffset: 9 }, { swara: 'Pa', semitoneOffset: 7 }, { swara: 'Dha', semitoneOffset: 9 }, { swara: 'Ni', semitoneOffset: 11 },
      { swara: 'Dha', semitoneOffset: 9 }, { swara: 'Ni', semitoneOffset: 11 }, { swara: 'Dha', semitoneOffset: 9 }, { swara: 'Ni', semitoneOffset: 11 }, { swara: "Sa'", semitoneOffset: 12 },
      // Avaroha
      { swara: "Sa'", semitoneOffset: 12 }, { swara: 'Ni', semitoneOffset: 11 }, { swara: "Sa'", semitoneOffset: 12 }, { swara: 'Ni', semitoneOffset: 11 }, { swara: 'Dha', semitoneOffset: 9 },
      { swara: 'Ni', semitoneOffset: 11 }, { swara: 'Dha', semitoneOffset: 9 }, { swara: 'Ni', semitoneOffset: 11 }, { swara: 'Dha', semitoneOffset: 9 }, { swara: 'Pa', semitoneOffset: 7 },
      { swara: 'Dha', semitoneOffset: 9 }, { swara: 'Pa', semitoneOffset: 7 }, { swara: 'Dha', semitoneOffset: 9 }, { swara: 'Pa', semitoneOffset: 7 }, { swara: 'Ma', semitoneOffset: 5 },
      { swara: 'Pa', semitoneOffset: 7 }, { swara: 'Ma', semitoneOffset: 5 }, { swara: 'Pa', semitoneOffset: 7 }, { swara: 'Ma', semitoneOffset: 5 }, { swara: 'Ga', semitoneOffset: 4 },
      { swara: 'Ma', semitoneOffset: 5 }, { swara: 'Ga', semitoneOffset: 4 }, { swara: 'Ma', semitoneOffset: 5 }, { swara: 'Ga', semitoneOffset: 4 }, { swara: 'Re', semitoneOffset: 2 },
      { swara: 'Ga', semitoneOffset: 4 }, { swara: 'Re', semitoneOffset: 2 }, { swara: 'Ga', semitoneOffset: 4 }, { swara: 'Re', semitoneOffset: 2 }, { swara: 'Sa', semitoneOffset: 0 },
    ],
  },
];

const SWARA_PALETTE = [
  { label: 'Sa', swara: 'Sa', color: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' },
  { label: 're (komal)', swara: 're', color: 'bg-amber-500/10 border-amber-500/30 text-amber-400' },
  { label: 'Re (shuddha)', swara: 'Re', color: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' },
  { label: 'ga (komal)', swara: 'ga', color: 'bg-amber-500/10 border-amber-500/30 text-amber-400' },
  { label: 'Ga (shuddha)', swara: 'Ga', color: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' },
  { label: 'Ma (shuddha)', swara: 'Ma', color: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' },
  { label: "ma' (teevra)", swara: "ma'", color: 'bg-rose-500/10 border-rose-500/30 text-rose-400' },
  { label: 'Pa', swara: 'Pa', color: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' },
  { label: 'dha (komal)', swara: 'dha', color: 'bg-amber-500/10 border-amber-500/30 text-amber-400' },
  { label: 'Dha (shuddha)', swara: 'Dha', color: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' },
  { label: 'ni (komal)', swara: 'ni', color: 'bg-amber-500/10 border-amber-500/30 text-amber-400' },
  { label: 'Ni (shuddha)', swara: 'Ni', color: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' },
  { label: "Sa' (taar)", swara: "Sa'", color: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' },
];

export default function PracticeStudioPage() {
  const { info, error: showError, success } = useToast();

  // ============================================================================
  // TANPURA STATE
  // ============================================================================
  const [tanpuraPlaying, setTanpuraPlaying] = useState(false);
  const [tanpuraTonic, setTanpuraTonic] = useState<NoteName>('C');
  const [tanpuraFirstString, setTanpuraFirstString] = useState<'Pa' | 'Ma' | 'Ni'>('Pa');
  const [tanpuraStringCount, setTanpuraStringCount] = useState<4 | 5>(4);
  const [tanpuraSpeed, setTanpuraSpeed] = useState(1.35); // seconds per string
  const [tanpuraVolume, setTanpuraVolume] = useState(70); // 0 to 100
  const [activeStringIndex, setActiveStringIndex] = useState<number>(-1);

  const tanpuraEngineRef = useRef<TanpuraEngine | null>(null);

  // ============================================================================
  // TABLA & TAAL STATE
  // ============================================================================
  const [rhythmPlaying, setRhythmPlaying] = useState(false);
  const [selectedTaal, setSelectedTaal] = useState<TaalDefinition>(TAALS[0]);
  const [bpm, setBpm] = useState(90);
  const [tablaVolume, setTablaVolume] = useState(80); // 0 to 100
  const [activeMatra, setActiveMatra] = useState<number>(0);

  const tablaEngineRef = useRef<TablaEngine | null>(null);
  const rhythmTimerRef = useRef<number | null>(null);
  const rhythmStepRef = useRef<number>(0);
  const nextBeatTimeRef = useRef<number>(0);

  // ============================================================================
  // ALANKAR STATE
  // ============================================================================
  const [customAlankars, setCustomAlankars] = useState<AlankarExercise[]>([]);
  const [selectedAlankar, setSelectedAlankar] = useState<AlankarExercise>(BUILTIN_ALANKARS[0]);
  const [alankarPlaying, setAlankarPlaying] = useState(false);
  const [activeAlankarIndex, setActiveAlankarIndex] = useState<number>(-1);
  const [alankarSpeedMs, setAlankarSpeedMs] = useState(550); // ms per swara

  // Custom Alankar Builder state
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customTextInput, setCustomTextInput] = useState('');
  const [customValidation, setCustomValidation] = useState<{
    isValid: boolean;
    parsed: ParsedSwara[];
    invalidTokens: string[];
  }>({ isValid: false, parsed: [], invalidTokens: [] });

  const sargamEngineRef = useRef<SargamSynthEngine | null>(null);
  const alankarTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load custom alankars from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('sonicforge_custom_alankars');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setCustomAlankars(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to load custom alankars:', e);
    }
  }, []);

  // Update validation whenever text input changes
  useEffect(() => {
    if (customTextInput.trim()) {
      const val = validateSargamPhrase(customTextInput);
      setCustomValidation(val);
    } else {
      setCustomValidation({ isValid: false, parsed: [], invalidTokens: [] });
    }
  }, [customTextInput]);

  // Clean up all audio on unmount
  useEffect(() => {
    return () => {
      if (tanpuraEngineRef.current) tanpuraEngineRef.current.stop();
      if (rhythmTimerRef.current !== null) {
        window.clearInterval(rhythmTimerRef.current);
      }
      if (alankarTimerRef.current) {
        clearInterval(alankarTimerRef.current);
      }
      if (sargamEngineRef.current) {
        sargamEngineRef.current.stopAll();
      }
    };
  }, []);

  // ============================================================================
  // 1. TANPURA CONTROLLER
  // ============================================================================
  const toggleTanpura = () => {
    if (tanpuraPlaying) {
      if (tanpuraEngineRef.current) {
        tanpuraEngineRef.current.stop();
      }
      setTanpuraPlaying(false);
      setActiveStringIndex(-1);
      return;
    }

    if (!tanpuraEngineRef.current) {
      tanpuraEngineRef.current = new TanpuraEngine(
        {
          tonic: tanpuraTonic,
          firstString: tanpuraFirstString,
          stringCount: tanpuraStringCount,
          volume: tanpuraVolume / 100,
          speed: tanpuraSpeed,
        },
        (strIdx) => {
          setActiveStringIndex(strIdx);
        }
      );
    } else {
      tanpuraEngineRef.current.updateConfig({
        tonic: tanpuraTonic,
        firstString: tanpuraFirstString,
        stringCount: tanpuraStringCount,
        volume: tanpuraVolume / 100,
        speed: tanpuraSpeed,
      });
    }

    tanpuraEngineRef.current.start();
    setTanpuraPlaying(true);
    info('Tanpura Active', `Continuous Jawari drone in ${tanpuraTonic} (${tanpuraFirstString} string, ${tanpuraStringCount} strings)`);
  };

  // Keep tanpura config in sync when controls change
  useEffect(() => {
    if (tanpuraEngineRef.current) {
      tanpuraEngineRef.current.updateConfig({
        tonic: tanpuraTonic,
        firstString: tanpuraFirstString,
        stringCount: tanpuraStringCount,
        volume: tanpuraVolume / 100,
        speed: tanpuraSpeed,
      });
    }
  }, [tanpuraTonic, tanpuraFirstString, tanpuraStringCount, tanpuraVolume, tanpuraSpeed]);

  // ============================================================================
  // 2. TABLA & TAAL CONTROLLER (PRECISION WEB AUDIO SCHEDULER)
  // ============================================================================
  const stopTaalLoop = useCallback(() => {
    if (rhythmTimerRef.current !== null) {
      window.clearInterval(rhythmTimerRef.current);
      rhythmTimerRef.current = null;
    }
    setRhythmPlaying(false);
    setActiveMatra(0);
    rhythmStepRef.current = 0;
  }, []);

  const startTaalLoop = useCallback(() => {
    const ctx = getAudioContext();
    if (!tablaEngineRef.current) {
      tablaEngineRef.current = new TablaEngine(tanpuraTonic, tablaVolume / 100);
    } else {
      tablaEngineRef.current.setTonic(tanpuraTonic);
      tablaEngineRef.current.setVolume(tablaVolume / 100);
    }

    setRhythmPlaying(true);

    const lookAheadMs = 25; // How frequently to check scheduler
    const scheduleAheadTime = 0.12; // Schedule audio 120ms ahead
    const secondsPerBeat = 60.0 / bpm;

    nextBeatTimeRef.current = ctx.currentTime + 0.05;
    rhythmStepRef.current = 0;

    rhythmTimerRef.current = window.setInterval(() => {
      while (nextBeatTimeRef.current < ctx.currentTime + scheduleAheadTime) {
        const beatIndex = rhythmStepRef.current % selectedTaal.matras;
        const bol = selectedTaal.bols[beatIndex];

        // Schedule precise audio strike
        tablaEngineRef.current?.playBol(bol, nextBeatTimeRef.current);

        // Schedule visual UI update synchronized to beat
        const delayUntilBeat = Math.max(0, (nextBeatTimeRef.current - ctx.currentTime) * 1000);
        setTimeout(() => {
          setActiveMatra(beatIndex);
        }, delayUntilBeat);

        nextBeatTimeRef.current += secondsPerBeat;
        rhythmStepRef.current++;
      }
    }, lookAheadMs);
  }, [bpm, selectedTaal, tanpuraTonic, tablaVolume]);

  const toggleRhythm = () => {
    if (rhythmPlaying) {
      stopTaalLoop();
    } else {
      startTaalLoop();
      info('Taal Active', `Rhythm cycling: ${selectedTaal.name} at ${bpm} BPM`);
    }
  };

  // Re-sync rhythm parameters when BPM or Taal changes while playing
  useEffect(() => {
    if (rhythmPlaying) {
      stopTaalLoop();
      startTaalLoop();
    }
  }, [bpm, selectedTaal]);

  // Keep tabla volume and tonic updated
  useEffect(() => {
    if (tablaEngineRef.current) {
      tablaEngineRef.current.setVolume(tablaVolume / 100);
      tablaEngineRef.current.setTonic(tanpuraTonic);
    }
  }, [tablaVolume, tanpuraTonic]);

  // ============================================================================
  // 3. SARGAM ALANKAR AUDIO PLAYBACK
  // ============================================================================
  const toggleAlankarPlayback = () => {
    if (alankarPlaying) {
      if (alankarTimerRef.current) {
        clearInterval(alankarTimerRef.current);
        alankarTimerRef.current = null;
      }
      if (sargamEngineRef.current) {
        sargamEngineRef.current.stopAll();
      }
      setAlankarPlaying(false);
      setActiveAlankarIndex(-1);
      return;
    }

    if (!sargamEngineRef.current) {
      sargamEngineRef.current = new SargamSynthEngine(0.6);
    }

    setAlankarPlaying(true);
    const seq = selectedAlankar.sequence;
    if (!seq || seq.length === 0) {
      showError('Empty Sequence', 'The selected alankar has no notes to play.');
      setAlankarPlaying(false);
      return;
    }

    const tonicBaseFreq = TONIC_FREQUENCIES[tanpuraTonic] * 2; // e.g. C4 = 261.63Hz
    let step = 0;

    const playCurrentStep = () => {
      if (step >= seq.length) {
        if (alankarTimerRef.current) {
          clearInterval(alankarTimerRef.current);
          alankarTimerRef.current = null;
        }
        setAlankarPlaying(false);
        setActiveAlankarIndex(-1);
        return;
      }

      const note = seq[step];
      const freq = tonicBaseFreq * Math.pow(2, note.semitoneOffset / 12);
      sargamEngineRef.current?.playSwara(freq, alankarSpeedMs / 1000 * 0.85);
      setActiveAlankarIndex(step);
      step++;
    };

    playCurrentStep();
    alankarTimerRef.current = setInterval(playCurrentStep, alankarSpeedMs);
  };

  // ============================================================================
  // 4. CUSTOM ALANKAR BUILDER ACTIONS
  // ============================================================================
  const appendSwara = (swara: string) => {
    const current = customTextInput.trim();
    setCustomTextInput(current ? `${current} ${swara}` : swara);
  };

  const handleSaveCustomAlankar = () => {
    if (!customTitle.trim()) {
      showError('Title Required', 'Please provide a name for your custom alankar exercise.');
      return;
    }

    if (!customValidation.isValid || customValidation.parsed.length === 0) {
      showError('Invalid Sargam', 'Please enter valid Indian classical swaras before saving.');
      return;
    }

    const newExercise: AlankarExercise = {
      id: `custom_${Date.now()}`,
      title: customTitle.trim(),
      description: `Custom composition (${customValidation.parsed.length} swaras): ${customTextInput.trim()}`,
      sequence: customValidation.parsed,
      isCustom: true,
    };

    const updated = [newExercise, ...customAlankars];
    setCustomAlankars(updated);
    try {
      localStorage.setItem('sonicforge_custom_alankars', JSON.stringify(updated));
    } catch (e) {
      console.warn('Storage save failed:', e);
    }

    setSelectedAlankar(newExercise);
    success('Exercise Saved', `"${newExercise.title}" has been saved to your practice suite!`);
    setCustomTitle('');
    setCustomTextInput('');
    setIsBuilderOpen(false);
  };

  const handleDeleteCustomAlankar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = customAlankars.filter((a) => a.id !== id);
    setCustomAlankars(filtered);
    try {
      localStorage.setItem('sonicforge_custom_alankars', JSON.stringify(filtered));
    } catch (err) {
      console.warn('Storage delete failed:', err);
    }
    if (selectedAlankar.id === id) {
      setSelectedAlankar(BUILTIN_ALANKARS[0]);
    }
    info('Exercise Removed', 'Custom exercise removed from your list.');
  };

  // Strings config description
  const stringNames = tanpuraStringCount === 5
    ? [
        `1: ${tanpuraFirstString} (Mandra)`,
        '2: Sa (Jod)',
        '3: Sa (Detuned)',
        '4: Kharaj Sa (Deep)',
        '5: Pa (Lower)',
      ]
    : [
        `1: ${tanpuraFirstString} (Mandra)`,
        '2: Sa (Jod)',
        '3: Sa (Detuned)',
        '4: Kharaj Sa (Deep)',
      ];

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-white dark:bg-midnight-900 border border-slate-200 dark:border-white/10 shadow-sm backdrop-blur-xl">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-studio-blue/10 dark:bg-cyan-500/10 border border-studio-blue/20 dark:border-cyan-500/20 text-studio-blue dark:text-cyan-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Activity className="w-3.5 h-3.5" />
              Indian Classical Music Studio
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              Sargam, Tanpura &amp; Taal Studio
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Authentic acoustic Indian classical practice suite. Featuring Jawari-buzzing Tanpura drone, 
              precision physical Tabla synthesizer, and guided Sargam Alankar training.
            </p>
          </div>

          {/* Quick Tonic Master Root */}
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-white/5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Root Tonic:</span>
            <span className="text-sm font-extrabold font-mono text-studio-blue dark:text-cyan-400">
              {tanpuraTonic} (Sa)
            </span>
          </div>
        </div>

        {/* 2-Column Grid: Section 1 (Tanpura Drone) & Section 2 (Tabla & Taal Studio) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ==================================================================== */}
          {/* SECTION 1: AUTHENTIC TANPURA DRONE (5 COLS) */}
          {/* ==================================================================== */}
          <div className="lg:col-span-5 p-6 rounded-3xl bg-white dark:bg-midnight-900 border border-slate-200 dark:border-white/10 shadow-sm space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Radio className={`w-4 h-4 ${tanpuraPlaying ? 'text-cyan-400 animate-spin' : 'text-slate-400'}`} />
                    Tanpura Drone
                  </h2>
                  <p className="text-[11px] text-slate-400">Jawari bridge resonance &amp; sympathetic overtone field</p>
                </div>
                <button
                  onClick={toggleTanpura}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                    tanpuraPlaying
                      ? 'bg-rose-600 hover:bg-rose-500 text-white'
                      : 'bg-studio-blue hover:bg-studio-blue/90 text-white'
                  }`}
                >
                  {tanpuraPlaying ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-white" /> Stop Drone
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-white" /> Start Drone
                    </>
                  )}
                </button>
              </div>

              {/* String Animation Visualizer */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>Acoustic Jawari Strings</span>
                  <span>{tanpuraStringCount}-String Tanpura</span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 pt-1">
                  {stringNames.map((name, idx) => {
                    const isVibrating = tanpuraPlaying && activeStringIndex === idx;
                    return (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl border text-center transition-all duration-150 ${
                          isVibrating
                            ? 'bg-cyan-500/25 border-cyan-400 scale-105 shadow-md shadow-cyan-500/25'
                            : 'bg-slate-900 border-white/5'
                        }`}
                      >
                        <div
                          className={`h-1.5 rounded-full mb-2 transition-all ${
                            isVibrating ? 'bg-cyan-400 animate-pulse h-2' : 'bg-slate-700'
                          }`}
                        />
                        <span className={`text-[10px] font-bold block ${isVibrating ? 'text-cyan-300 font-mono' : 'text-slate-400'}`}>
                          {name.split(':')[1]?.trim() || name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tonic Selector Grid */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Tonic Root (Sa Key)
                </label>
                <div className="grid grid-cols-6 gap-1.5">
                  {NOTE_NAMES.map((n) => (
                    <button
                      key={n}
                      onClick={() => setTanpuraTonic(n)}
                      className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        tanpuraTonic === n
                          ? 'bg-studio-blue text-white shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* First String & 4/5 String Mode */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    First String Tuning
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {(['Pa', 'Ma', 'Ni'] as const).map((str) => (
                      <button
                        key={str}
                        onClick={() => setTanpuraFirstString(str)}
                        className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          tanpuraFirstString === str
                            ? 'bg-studio-violet text-white shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {str}
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {tanpuraFirstString === 'Pa' ? 'Standard 5th' : tanpuraFirstString === 'Ma' ? '4th (for Malkauns)' : '7th (for Marwa)'}
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    String Mode
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => setTanpuraStringCount(4)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        tanpuraStringCount === 4
                          ? 'bg-studio-blue text-white shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      4 Strings
                    </button>
                    <button
                      onClick={() => setTanpuraStringCount(5)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        tanpuraStringCount === 5
                          ? 'bg-studio-blue text-white shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      5 Strings
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {tanpuraStringCount === 5 ? 'Includes Mandra Pancham' : 'Classic 4-wire setup'}
                  </span>
                </div>
              </div>

              {/* Sliders: Speed & Volume */}
              <div className="space-y-3 pt-1">
                <div>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-bold text-slate-400">Pluck Cycle Speed</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{tanpuraSpeed}s / string</span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="2.2"
                    step="0.05"
                    value={tanpuraSpeed}
                    onChange={(e) => setTanpuraSpeed(Number(e.target.value))}
                    className="w-full accent-studio-blue cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-bold text-slate-400">Drone Volume</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{tanpuraVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={tanpuraVolume}
                    onChange={(e) => setTanpuraVolume(Number(e.target.value))}
                    className="w-full accent-studio-blue cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ==================================================================== */}
          {/* SECTION 2: TABLA & TAAL STUDIO (7 COLS) */}
          {/* ==================================================================== */}
          <div className="lg:col-span-7 p-6 rounded-3xl bg-white dark:bg-midnight-900 border border-slate-200 dark:border-white/10 shadow-sm space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-studio-violet" />
                    Tabla Rhythm Cycles (Taal)
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Dayan (metallic chanti &amp; syahi) and Bayan (meend bass glide) acoustic synthesis
                  </p>
                </div>

                <button
                  onClick={toggleRhythm}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md ${
                    rhythmPlaying
                      ? 'bg-rose-600 hover:bg-rose-500 text-white'
                      : 'bg-gradient-to-r from-studio-violet to-indigo-600 text-white'
                  }`}
                >
                  {rhythmPlaying ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-white" /> Stop Taal
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-white" /> Start Taal
                    </>
                  )}
                </button>
              </div>

              {/* 8 Classical Taals Selector */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Select Traditional Taal ({TAALS.length} Rhythmic Cycles)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {TAALS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setSelectedTaal(t);
                        setActiveMatra(0);
                      }}
                      className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                        selectedTaal.id === t.id
                          ? 'bg-studio-violet/15 border-studio-violet text-studio-violet dark:text-indigo-400 font-bold shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="text-xs font-bold leading-tight">{t.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{t.matras} Matras</div>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200 dark:border-white/5">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedTaal.name}:</span> {selectedTaal.description}
                </p>
              </div>

              {/* Tempo (Laya) & Volume Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Tempo (Laya)
                    </label>
                    <span className="text-xs font-mono font-bold text-studio-violet dark:text-indigo-400">
                      {bpm} BPM ({bpm < 70 ? 'Vilambit' : bpm < 120 ? 'Madhya' : 'Drut'})
                    </span>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="220"
                    value={bpm}
                    onChange={(e) => setBpm(Number(e.target.value))}
                    className="w-full accent-studio-violet cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <button className="hover:text-slate-200 cursor-pointer" onClick={() => setBpm(50)}>Ati-Vilambit (50)</button>
                    <button className="hover:text-slate-200 cursor-pointer" onClick={() => setBpm(84)}>Madhya (84)</button>
                    <button className="hover:text-slate-200 cursor-pointer" onClick={() => setBpm(136)}>Drut (136)</button>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Tabla Master Volume
                    </label>
                    <span className="text-xs font-mono font-bold text-studio-violet dark:text-indigo-400">
                      {tablaVolume}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={tablaVolume}
                    onChange={(e) => setTablaVolume(Number(e.target.value))}
                    className="w-full accent-studio-violet cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Acoustically tuned to {tanpuraTonic} (Sa)
                  </span>
                </div>
              </div>

              {/* Live Matra (Beat) Visualizer Grid */}
              <div className="pt-2">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Beat Grid ({selectedTaal.matras} Matras)
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {rhythmPlaying ? `Beat ${activeMatra + 1} of ${selectedTaal.matras}` : 'Paused'}
                  </span>
                </div>
                <div className={`grid gap-2 ${selectedTaal.matras > 12 ? 'grid-cols-4 sm:grid-cols-7' : 'grid-cols-4 sm:grid-cols-6'}`}>
                  {selectedTaal.bols.map((bol, idx) => {
                    const isActive = rhythmPlaying && activeMatra === idx;
                    const tag = selectedTaal.taaliKhaali[idx];

                    return (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-2xl text-center border transition-all duration-100 ${
                          isActive
                            ? 'bg-studio-violet/25 border-studio-violet scale-105 shadow-md shadow-studio-violet/30'
                            : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-white/5'
                        }`}
                      >
                        <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between mb-0.5">
                          <span>{idx + 1}</span>
                          {tag === 'sam' ? (
                            <span className="text-rose-500 font-extrabold text-[9px]">SAM (X)</span>
                          ) : tag === 'khaali' ? (
                            <span className="text-amber-500 font-bold text-[9px]">0 (Khaali)</span>
                          ) : tag === 'taali' ? (
                            <span className="text-cyan-400 font-bold text-[9px]">Taali</span>
                          ) : null}
                        </div>
                        <div
                          className={`text-sm font-bold ${
                            isActive
                              ? 'text-white font-extrabold'
                              : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {bol === '-' ? '•' : bol}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* SECTION 3: SARGAM ALANKAR STUDIO & CUSTOM ALANKAR BUILDER */}
        {/* ==================================================================== */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-midnight-900 border border-slate-200 dark:border-white/10 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                Vocal &amp; Instrument Alankar Practice
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                Sargam Alankar Exercises &amp; Custom Builder
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Practice 8 built-in classical palta patterns or build custom exercises with the interactive swara palette.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsBuilderOpen(!isBuilderOpen)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-white/10"
              >
                <Plus className="w-3.5 h-3.5" />
                {isBuilderOpen ? 'Close Builder' : 'Custom Alankar Builder'}
              </button>

              <button
                onClick={toggleAlankarPlayback}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md ${
                  alankarPlaying
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {alankarPlaying ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-white" /> Stop Audio
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-white" /> Play Alankar ({selectedAlankar.sequence.length} Notes)
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Builder Drawer (Collapsible) */}
          {isBuilderOpen && (
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-emerald-500/30 space-y-4 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    Custom Alankar Builder
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Construct any customized Sargam pattern. Click swaras or type directly into the input.
                  </p>
                </div>
              </div>

              {/* Title Input */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Exercise Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., My Yaman Komal Ni Pattern"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    onClick={handleSaveCustomAlankar}
                    className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save Custom Exercise
                  </button>
                </div>
              </div>

              {/* Interactive Swara Palette */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Interactive Swara Palette (Click to Insert)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {SWARA_PALETTE.map((p) => (
                    <button
                      key={p.swara}
                      onClick={() => appendSwara(p.swara)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer hover:scale-105 ${p.color}`}
                    >
                      {p.label}
                    </button>
                  ))}
                  <button
                    onClick={() => setCustomTextInput('')}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer ml-auto"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Direct Text Input & Validator */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Sargam Phrase (Space or comma separated)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g., Sa Re Ga Ma Pa Dha Ni Sa' | Sa' Ni Dha Pa Ma Ga Re Sa"
                  value={customTextInput}
                  onChange={(e) => setCustomTextInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-sm font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />

                {/* Validation Indicator */}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {customTextInput.trim() && (
                    <>
                      {customValidation.isValid ? (
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                          ✓ Valid Sargam phrase ({customValidation.parsed.length} swaras parsed)
                        </span>
                      ) : customValidation.invalidTokens.length > 0 ? (
                        <span className="text-xs font-bold text-rose-400">
                          Unrecognized tokens: {customValidation.invalidTokens.join(', ')}
                        </span>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Exercise Tabs: Built-in vs Custom */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-white/5 pb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Select Exercise ({BUILTIN_ALANKARS.length} Built-in + {customAlankars.length} Custom)
              </span>

              {/* Playback Speed Slider */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Tempo:</span>
                <input
                  type="range"
                  min="250"
                  max="900"
                  step="25"
                  value={alankarSpeedMs}
                  onChange={(e) => setAlankarSpeedMs(Number(e.target.value))}
                  className="w-24 accent-emerald-500 cursor-pointer"
                />
                <span className="text-xs font-mono text-slate-300">{alankarSpeedMs}ms</span>
              </div>
            </div>

            {/* Built-in Alankar Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {BUILTIN_ALANKARS.map((al) => {
                const isSelected = selectedAlankar.id === al.id;
                return (
                  <button
                    key={al.id}
                    onClick={() => {
                      setSelectedAlankar(al);
                      setActiveAlankarIndex(-1);
                      if (alankarPlaying) toggleAlankarPlayback();
                    }}
                    className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 font-bold shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="text-xs font-bold leading-tight">{al.title}</div>
                    <div className="text-[10px] text-slate-400 mt-1">{al.sequence.length} Swaras</div>
                  </button>
                );
              })}
            </div>

            {/* Custom Alankars (if any) */}
            {customAlankars.length > 0 && (
              <div className="pt-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  My Custom Exercises
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {customAlankars.map((cal) => {
                    const isSelected = selectedAlankar.id === cal.id;
                    return (
                      <div
                        key={cal.id}
                        onClick={() => {
                          setSelectedAlankar(cal);
                          setActiveAlankarIndex(-1);
                          if (alankarPlaying) toggleAlankarPlayback();
                        }}
                        className={`p-3 rounded-2xl text-left border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400 font-bold shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="overflow-hidden pr-2">
                          <div className="text-xs font-bold truncate">{cal.title}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{cal.sequence.length} Swaras</div>
                        </div>
                        <button
                          onClick={(e) => handleDeleteCustomAlankar(cal.id, e)}
                          title="Delete custom exercise"
                          className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Active Alankar Swara Note Sequence Display */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-midnight-950 border border-slate-200 dark:border-white/5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-white/5 pb-2">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {selectedAlankar.title}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">{selectedAlankar.description}</p>
              </div>
              <span className="text-xs font-mono text-emerald-400 font-bold">
                Tuned to Sa = {tanpuraTonic}
              </span>
            </div>

            {/* Sequence Chips */}
            <div className="flex flex-wrap gap-2 pt-1 max-h-56 overflow-y-auto">
              {selectedAlankar.sequence.map((item, idx) => {
                const isCurrent = alankarPlaying && activeAlankarIndex === idx;
                const isTaar = item.swara.includes("'") || item.semitoneOffset >= 12;
                const isKomal = item.swara === 're' || item.swara === 'ga' || item.swara === 'dha' || item.swara === 'ni';
                const isTeevra = item.swara.includes("'") && item.swara.toLowerCase().startsWith('m');

                return (
                  <div
                    key={idx}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all duration-100 flex items-center gap-1 ${
                      isCurrent
                        ? 'bg-emerald-500 text-white scale-110 shadow-lg shadow-emerald-500/30'
                        : isTaar
                        ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400'
                        : isTeevra
                        ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                        : isKomal
                        ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <span>{item.swara}</span>
                    {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
