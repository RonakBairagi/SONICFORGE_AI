/**
 * SONICFORGE AI — Comprehensive Music Theory Engine
 * Supports Western Scales, Chords, Diatonic Progressions, Indian Thaats, Sargam mappings, and MIDI generation
 */

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
export type NoteName = typeof NOTE_NAMES[number];

export const SARGAM_SWARAS = [
  { name: 'Sa', short: 'S', offset: 0, isKomal: false, isTivra: false },
  { name: 'Re (komal)', short: 're', offset: 1, isKomal: true, isTivra: false },
  { name: 'Re (shuddha)', short: 'Re', offset: 2, isKomal: false, isTivra: false },
  { name: 'Ga (komal)', short: 'ga', offset: 3, isKomal: true, isTivra: false },
  { name: 'Ga (shuddha)', short: 'Ga', offset: 4, isKomal: false, isTivra: false },
  { name: 'Ma (shuddha)', short: 'Ma', offset: 5, isKomal: false, isTivra: false },
  { name: 'Ma (tivra)', short: 'ma\'', offset: 6, isKomal: false, isTivra: true },
  { name: 'Pa', short: 'P', offset: 7, isKomal: false, isTivra: false },
  { name: 'Dha (komal)', short: 'dha', offset: 8, isKomal: true, isTivra: false },
  { name: 'Dha (shuddha)', short: 'Dha', offset: 9, isKomal: false, isTivra: false },
  { name: 'Ni (komal)', short: 'ni', offset: 10, isKomal: true, isTivra: false },
  { name: 'Ni (shuddha)', short: 'Ni', offset: 11, isKomal: false, isTivra: false },
];

export interface PitchInfo {
  freq: number;
  note: NoteName;
  octave: number;
  fullNote: string;
  targetFreq: number;
  cents: number;
  midi: number;
}

/**
 * Convert frequency to full pitch info (note, octave, cents deviation)
 */
export function freqToPitchInfo(freq: number, a4 = 440): PitchInfo {
  if (freq <= 0) {
    return { freq: 0, note: 'C', octave: 4, fullNote: 'C4', targetFreq: 261.63, cents: 0, midi: 60 };
  }
  const midiExact = 69 + 12 * Math.log2(freq / a4);
  const midi = Math.round(midiExact);
  const cents = Math.round((midiExact - midi) * 100);
  const noteIndex = ((midi % 12) + 12) % 12;
  const note = NOTE_NAMES[noteIndex];
  const octave = Math.floor(midi / 12) - 1;
  const targetFreq = a4 * Math.pow(2, (midi - 69) / 12);

  return {
    freq: Number(freq.toFixed(2)),
    note,
    octave,
    fullNote: `${note}${octave}`,
    targetFreq: Number(targetFreq.toFixed(2)),
    cents,
    midi,
  };
}

/**
 * Convert MIDI note number to frequency in Hz
 */
export function midiToFreq(midi: number, a4 = 440): number {
  return a4 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Convert note name + octave to frequency
 */
export function noteToFreq(note: string, octave: number, a4 = 440): number {
  const index = NOTE_NAMES.indexOf(note as NoteName);
  if (index === -1) return 440;
  const midi = (octave + 1) * 12 + index;
  return midiToFreq(midi, a4);
}

/**
 * Get Indian Sargam representation for a given Western note with a chosen Tonic (Sa)
 */
export function getSargamForNote(note: NoteName, tonicSa: NoteName = 'C'): string {
  const tonicIndex = NOTE_NAMES.indexOf(tonicSa);
  const noteIndex = NOTE_NAMES.indexOf(note);
  if (tonicIndex === -1 || noteIndex === -1) return 'Sa';

  const semitonesFromSa = (noteIndex - tonicIndex + 12) % 12;
  const swara = SARGAM_SWARAS.find((s) => s.offset === semitonesFromSa);
  return swara ? swara.name : 'Sa';
}

/**
 * Tuner instrument presets
 */
export interface TunerPreset {
  id: string;
  name: string;
  instrument: string;
  strings: { label: string; fullNote: string; freq: number }[];
}

export const TUNER_PRESETS: TunerPreset[] = [
  {
    id: 'guitar_standard',
    name: 'Standard Guitar',
    instrument: 'Guitar (6-String)',
    strings: [
      { label: '6th (Low E)', fullNote: 'E2', freq: 82.41 },
      { label: '5th (A)', fullNote: 'A2', freq: 110.0 },
      { label: '4th (D)', fullNote: 'D3', freq: 146.83 },
      { label: '3rd (G)', fullNote: 'G3', freq: 196.0 },
      { label: '2nd (B)', fullNote: 'B3', freq: 246.94 },
      { label: '1st (High E)', fullNote: 'E4', freq: 329.63 },
    ],
  },
  {
    id: 'guitar_drop_d',
    name: 'Drop D Guitar',
    instrument: 'Guitar (6-String)',
    strings: [
      { label: '6th (Low D)', fullNote: 'D2', freq: 73.42 },
      { label: '5th (A)', fullNote: 'A2', freq: 110.0 },
      { label: '4th (D)', fullNote: 'D3', freq: 146.83 },
      { label: '3rd (G)', fullNote: 'G3', freq: 196.0 },
      { label: '2nd (B)', fullNote: 'B3', freq: 246.94 },
      { label: '1st (High E)', fullNote: 'E4', freq: 329.63 },
    ],
  },
  {
    id: 'bass_standard',
    name: 'Standard Bass (4-String)',
    instrument: 'Bass',
    strings: [
      { label: '4th (Low E)', fullNote: 'E1', freq: 41.2 },
      { label: '3rd (A)', fullNote: 'A1', freq: 55.0 },
      { label: '2nd (D)', fullNote: 'D2', freq: 73.42 },
      { label: '1st (G)', fullNote: 'G2', freq: 98.0 },
    ],
  },
  {
    id: 'ukulele_standard',
    name: 'Standard Ukulele (G-C-E-A)',
    instrument: 'Ukulele',
    strings: [
      { label: '4th (G)', fullNote: 'G4', freq: 392.0 },
      { label: '3rd (C)', fullNote: 'C4', freq: 261.63 },
      { label: '2nd (E)', fullNote: 'E4', freq: 329.63 },
      { label: '1st (A)', fullNote: 'A4', freq: 440.0 },
    ],
  },
  {
    id: 'violin_standard',
    name: 'Standard Violin',
    instrument: 'Violin',
    strings: [
      { label: '4th (G)', fullNote: 'G3', freq: 196.0 },
      { label: '3rd (D)', fullNote: 'D4', freq: 293.66 },
      { label: '2nd (A)', fullNote: 'A4', freq: 440.0 },
      { label: '1st (E)', fullNote: 'E5', freq: 659.25 },
    ],
  },
];

/**
 * Scale and Thaat Definitions
 */
export interface ScaleDefinition {
  id: string;
  name: string;
  category: 'Western' | 'Indian Thaat' | 'World & Exotic';
  thaatEquivalent?: string;
  intervals: number[]; // semitone offsets from root
  description: string;
  mood: string;
}

export const SCALES: ScaleDefinition[] = [
  {
    id: 'major',
    name: 'Major (Ionian)',
    category: 'Western',
    thaatEquivalent: 'Bilawal Thaat',
    intervals: [0, 2, 4, 5, 7, 9, 11],
    description: 'Bright, joyful, foundational scale in Western music and Hindustani Bilawal.',
    mood: 'Joyful, uplifting, confident',
  },
  {
    id: 'natural_minor',
    name: 'Natural Minor (Aeolian)',
    category: 'Western',
    thaatEquivalent: 'Asavari Thaat',
    intervals: [0, 2, 3, 5, 7, 8, 10],
    description: 'Emotional, sombre, thoughtful; corresponds to Asavari Thaat.',
    mood: 'Melancholic, reflective, profound',
  },
  {
    id: 'harmonic_minor',
    name: 'Harmonic Minor',
    category: 'Western',
    intervals: [0, 2, 3, 5, 7, 8, 11],
    description: 'Dramatic scale with an augmented second interval between 6th and 7th.',
    mood: 'Dramatic, intense, exotic',
  },
  {
    id: 'dorian',
    name: 'Dorian',
    category: 'Western',
    thaatEquivalent: 'Kafi Thaat',
    intervals: [0, 2, 3, 5, 7, 9, 10],
    description: 'Minor scale with a raised 6th, reminiscent of folk and Kafi Thaat.',
    mood: 'Cool, jazzy, soulful',
  },
  {
    id: 'mixolydian',
    name: 'Mixolydian',
    category: 'Western',
    thaatEquivalent: 'Khamaj Thaat',
    intervals: [0, 2, 4, 5, 7, 9, 10],
    description: 'Major scale with flat 7th; foundation of classic rock, blues, and Khamaj.',
    mood: 'Bluesy, heroic, earthy',
  },
  {
    id: 'lydian',
    name: 'Lydian',
    category: 'Western',
    thaatEquivalent: 'Kalyan Thaat',
    intervals: [0, 2, 4, 6, 7, 9, 11],
    description: 'Major scale with sharp 4th (Tivra Ma); dreamlike, cinematic, and Yaman-esque.',
    mood: 'Dreamy, ethereal, expansive',
  },
  {
    id: 'bhairav',
    name: 'Bhairav Thaat',
    category: 'Indian Thaat',
    intervals: [0, 1, 4, 5, 7, 8, 11], // Sa, re, Ga, Ma, Pa, dha, Ni
    description: 'Komal Re and Komal Dha with Shuddha Ga and Ni. Morning contemplation.',
    mood: 'Devotional, meditative, solemn',
  },
  {
    id: 'bhairavi',
    name: 'Bhairavi Thaat',
    category: 'Indian Thaat',
    intervals: [0, 1, 3, 5, 7, 8, 10], // Sa, re, ga, Ma, Pa, dha, ni (Phrygian)
    description: 'All four komal notes (re, ga, dha, ni). Queen of morning ragas and farewell songs.',
    mood: 'Expressive, romantic, poignant',
  },
  {
    id: 'kalyan',
    name: 'Kalyan Thaat',
    category: 'Indian Thaat',
    intervals: [0, 2, 4, 6, 7, 9, 11], // Sa, Re, Ga, Tivra Ma, Pa, Dha, Ni (Lydian)
    description: 'Evening dignity with Tivra Ma. The heart of Raga Yaman.',
    mood: 'Majestic, serene, peaceful',
  },
  {
    id: 'pentatonic_major',
    name: 'Pentatonic Major',
    category: 'Western',
    thaatEquivalent: 'Raga Bhupali (audav)',
    intervals: [0, 2, 4, 7, 9],
    description: 'Universal 5-note scale found across global folk, pop, and Raga Bhupali.',
    mood: 'Open, pure, harmonious',
  },
  {
    id: 'blues',
    name: 'Blues Scale',
    category: 'Western',
    intervals: [0, 3, 5, 6, 7, 10],
    description: 'Minor pentatonic with added flat 5th (blue note) for gritty blues expression.',
    mood: 'Gritty, soulful, passionate',
  },
];

/**
 * Get all notes in a scale for a specific root
 */
export function getScaleNotes(root: NoteName, scale: ScaleDefinition): { note: NoteName; sargam: string; interval: number }[] {
  const rootIndex = NOTE_NAMES.indexOf(root);
  return scale.intervals.map((interval) => {
    const noteIndex = (rootIndex + interval) % 12;
    const note = NOTE_NAMES[noteIndex];
    const sargam = getSargamForNote(note, root);
    return { note, sargam, interval };
  });
}

/**
 * Chord Interface & Diatonic Chord Generation
 */
export interface ChordInfo {
  numeral: string;
  name: string;
  root: NoteName;
  quality: 'Major' | 'Minor' | 'Diminished' | 'Augmented' | 'Dominant 7th' | 'Major 7th' | 'Minor 7th';
  notes: NoteName[];
  frequencies: number[]; // based on octave 3/4
}

export function getDiatonicChords(root: NoteName, scale: ScaleDefinition): ChordInfo[] {
  const scaleNotes = getScaleNotes(root, scale);
  const n = scaleNotes.length;
  if (n < 7) {
    // For pentatonic, generate triads based on 7-tone major/minor parent
    return [];
  }

  const romanNumerals = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];

  return scaleNotes.map((item, i) => {
    const chordRoot = item.note;
    const third = scaleNotes[(i + 2) % n].note;
    const fifth = scaleNotes[(i + 4) % n].note;
    const seventh = scaleNotes[(i + 6) % n].note;

    const rIdx = NOTE_NAMES.indexOf(chordRoot);
    const tIdx = NOTE_NAMES.indexOf(third);
    const fIdx = NOTE_NAMES.indexOf(fifth);

    const semitonesToThird = (tIdx - rIdx + 12) % 12;
    const semitonesToFifth = (fIdx - rIdx + 12) % 12;

    let quality: ChordInfo['quality'] = 'Major';
    let suffix = '';
    if (semitonesToThird === 3 && semitonesToFifth === 7) {
      quality = 'Minor';
      suffix = 'm';
    } else if (semitonesToThird === 4 && semitonesToFifth === 7) {
      quality = 'Major';
      suffix = '';
    } else if (semitonesToThird === 3 && semitonesToFifth === 6) {
      quality = 'Diminished';
      suffix = 'dim';
    } else if (semitonesToThird === 4 && semitonesToFifth === 8) {
      quality = 'Augmented';
      suffix = 'aug';
    }

    const chordName = `${chordRoot}${suffix}`;
    const numeral = romanNumerals[i] || `${i + 1}`;

    const notes = [chordRoot, third, fifth];
    const freqs = notes.map((note) => noteToFreq(note, 3));

    return {
      numeral,
      name: chordName,
      root: chordRoot,
      quality,
      notes,
      frequencies: freqs,
    };
  });
}

/**
 * Common Chord Progressions for Creative Songwriting
 */
export interface ChordProgressionTemplate {
  name: string;
  genre: string;
  degrees: number[]; // 1-indexed (e.g. [1, 5, 6, 4] for I-V-vi-IV)
  description: string;
}

export const CHORD_PROGRESSIONS: ChordProgressionTemplate[] = [
  {
    name: 'Pop Anthem (I - V - vi - IV)',
    genre: 'Pop / Rock',
    degrees: [1, 5, 6, 4],
    description: 'The most famous progression in modern music history (Let It Be, Someone Like You).',
  },
  {
    name: 'Doo-Wop & Soul (I - vi - IV - V)',
    genre: 'Classic Soul / Ballad',
    degrees: [1, 6, 4, 5],
    description: 'Vintage 50s warmth and romantic nostalgia (Stand By Me, Perfect).',
  },
  {
    name: 'Emotional Minor (vi - IV - I - V)',
    genre: 'Modern Pop / Cinematic',
    degrees: [6, 4, 1, 5],
    description: 'Deeply expressive, cinematic, and dramatic (Despacito, Faded).',
  },
  {
    name: 'Jazz & Lo-Fi (ii - V - I)',
    genre: 'Jazz / R&B / Lo-Fi',
    degrees: [2, 5, 1],
    description: 'Smooth, resolving, ubiquitous cadence in jazz and chillhop.',
  },
  {
    name: 'Epic Hero (i - VI - III - VII)',
    genre: 'Film & Orchestral',
    degrees: [6, 4, 1, 5],
    description: 'Sweeping, adventurous, heroic orchestral energy.',
  },
];

/**
 * Generate a Standard MIDI File (Format 0) binary Blob for exporting chord progressions
 */
export function exportMidiFile(
  trackName: string,
  bpm: number,
  chords: { notes: NoteName[]; durationBeats: number }[]
): Blob {
  // Standard MIDI file writer with ticks
  const ticksPerBeat = 480;
  const microsecondsPerBeat = Math.round(60000000 / bpm);

  const header = [
    0x4d, 0x54, 0x68, 0x64, // 'MThd'
    0x00, 0x00, 0x00, 0x06, // chunk length = 6
    0x00, 0x00,             // format 0
    0x00, 0x01,             // 1 track
    (ticksPerBeat >> 8) & 0xff,
    ticksPerBeat & 0xff,
  ];

  const trackEvents: number[] = [];

  // Helper for variable-length quantity
  function writeVarInt(val: number) {
    const buffer = [];
    buffer.push(val & 0x7f);
    val >>= 7;
    while (val > 0) {
      buffer.push((val & 0x7f) | 0x80);
      val >>= 7;
    }
    while (buffer.length > 0) {
      trackEvents.push(buffer.pop()!);
    }
  }

  // Delta 0: Tempo meta event
  writeVarInt(0);
  trackEvents.push(
    0xff, 0x51, 0x03,
    (microsecondsPerBeat >> 16) & 0xff,
    (microsecondsPerBeat >> 8) & 0xff,
    microsecondsPerBeat & 0xff
  );

  // Delta 0: Track name meta event
  const nameBytes = Array.from(new TextEncoder().encode(trackName.substring(0, 32)));
  writeVarInt(0);
  trackEvents.push(0xff, 0x03, nameBytes.length, ...nameBytes);

  // Iterate chords
  chords.forEach((chord) => {
    const chordDurationTicks = Math.round(chord.durationBeats * ticksPerBeat);
    const midiNotes = chord.notes.map((note) => {
      const idx = NOTE_NAMES.indexOf(note);
      return 60 + idx; // Octave 4
    });

    // Note On for all notes at delta 0 (except first)
    midiNotes.forEach((midiNote, idx) => {
      writeVarInt(0);
      trackEvents.push(0x90, midiNote, 96); // Velocity 96
    });

    // Note Off after duration
    midiNotes.forEach((midiNote, idx) => {
      writeVarInt(idx === 0 ? chordDurationTicks : 0);
      trackEvents.push(0x80, midiNote, 0);
    });
  });

  // End of Track event
  writeVarInt(0);
  trackEvents.push(0xff, 0x2f, 0x00);

  const trackLength = trackEvents.length;
  const trackHeader = [
    0x4d, 0x54, 0x72, 0x6b, // 'MTrk'
    (trackLength >> 24) & 0xff,
    (trackLength >> 16) & 0xff,
    (trackLength >> 8) & 0xff,
    trackLength & 0xff,
  ];

  const fullBytes = new Uint8Array([...header, ...trackHeader, ...trackEvents]);
  return new Blob([fullBytes], { type: 'audio/midi' });
}

