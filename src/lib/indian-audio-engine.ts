/**
 * SONICFORGE AI — ACOUSTIC INDIAN CLASSICAL AUDIO ENGINE
 * 
 * Provides:
 * 1. Authentic Tanpura Drone with Jawari acoustic bridge simulation,
 *    multi-harmonic string cascade, sympathetic resonance, and twin-string beating.
 * 2. Authentic Tabla Synthesizer with realistic Dayan (rim/sur/syahi) and
 *    Bayan (bass meend glide / closed slap) strokes for all traditional bols.
 * 3. Sargam Melodic Voice with smooth Indian vocal/harmonium acoustic contour.
 */

import { NOTE_NAMES, NoteName } from './music-theory';

// Map of tonic notes to fundamental frequency in Hz (Middle Octave 3/4)
export const TONIC_FREQUENCIES: Record<NoteName, number> = {
  C: 130.81,   // C3
  'C#': 138.59, // C#3
  D: 146.83,   // D3
  'D#': 155.56, // D#3
  E: 164.81,   // E3
  F: 174.61,   // F3
  'F#': 185.00, // F#3
  G: 196.00,   // G3
  'G#': 207.65, // G#3
  A: 220.00,   // A3
  'A#': 233.08, // A#3
  B: 246.94,   // B3
};

// Swara semitone offsets relative to Madhya Sa (0)
export const SWARA_SEMITONES: Record<string, number> = {
  // Mandra Saptak (Lower Octave)
  '.N': -1, 'ni.': -1, '.ni': -1, '.Ni': -1,
  '.D': -3, 'dha.': -3, '.dha': -3, '.Dha': -3,
  '.P': -5, 'pa.': -5, '.pa': -5, '.Pa': -5,
  '.M': -6, "ma'.": -6, ".ma'": -6,
  '.m': -7, 'ma.': -7, '.ma': -7, '.Ma': -7,
  '.G': -8, 'ga.': -8, '.ga': -8, '.Ga': -8,
  '.R': -10, 're.': -10, '.re': -10, '.Re': -10,
  '.S': -12, 'sa.': -12, '.sa': -12, '.Sa': -12,

  // Madhya Saptak (Middle Octave)
  'S': 0, 'Sa': 0, 'sa': 0,
  'r': 1, 're': 1, 'Re (Komal)': 1, 'komal re': 1, 'r_': 1,
  'R': 2, 'Re': 2, 'shuddha re': 2,
  'g': 3, 'ga': 3, 'Ga (Komal)': 3, 'komal ga': 3, 'g_': 3,
  'G': 4, 'Ga': 4, 'shuddha ga': 4,
  'm': 5, 'ma': 5, 'Ma': 5, 'shuddha ma': 5,
  'M': 6, 'Ma (Teevra)': 6, "ma'": 6, "Ma'": 6, 'teevra ma': 6,
  'P': 7, 'Pa': 7, 'pa': 7,
  'd': 8, 'dha': 8, 'Dha (Komal)': 8, 'komal dha': 8, 'd_': 8,
  'D': 9, 'Dha': 9, 'shuddha dha': 9,
  'n': 10, 'ni': 10, 'Ni (Komal)': 10, 'komal ni': 10, 'n_': 10,
  'N': 11, 'Ni': 11, 'shuddha ni': 11,

  // Taar Saptak (Higher Octave)
  "S'": 12, "Sa'": 12, "sa'": 12, "S*": 12, "Sa*": 12,
  "r'": 13, "re'": 13, "r*": 13,
  "R'": 14, "Re'": 14, "R*": 14, "Re*": 14,
  "g'": 15, "ga'": 15, "g*": 15,
  "G'": 16, "Ga'": 16, "G*": 16, "Ga*": 16,
  "m*": 17, "Ma*": 17,
  "ma'*": 18, "Ma'*": 18,
  "P'": 19, "Pa'": 19, "P*": 19, "Pa*": 19,
  "d'": 20, "dha'": 20, "d*": 20,
  "D'": 21, "Dha'": 21, "D*": 21, "Dha*": 21,
  "n'": 22, "ni'": 22, "n*": 22,
  "N'": 23, "Ni'": 23, "N*": 23, "Ni*": 23,
  "S''": 24, "Sa''": 24, "S**": 24, "Sa**": 24,
};

export interface ParsedSwara {
  swara: string;
  semitoneOffset: number;
}

/**
 * Deterministic Sargam phrase parser:
 * Converts arbitrary text phrases (e.g. "Sa Re Ga Ma Pa Dha Ni Sa'")
 * into structured swaras with semitone offsets.
 */
export function parseSargamPhrase(phrase: string): ParsedSwara[] {
  if (!phrase || typeof phrase !== 'string') return [];

  // Normalize delimiters (commas, pipes, dashes, multiple spaces)
  const tokens = phrase
    .replace(/[,|;]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const parsed: ParsedSwara[] = [];

  for (const rawToken of tokens) {
    // Check direct match
    if (SWARA_SEMITONES[rawToken] !== undefined) {
      parsed.push({ swara: rawToken, semitoneOffset: SWARA_SEMITONES[rawToken] });
      continue;
    }

    // Try case normalization
    const clean = rawToken.replace(/[.,;]/g, '');
    if (SWARA_SEMITONES[clean] !== undefined) {
      parsed.push({ swara: clean, semitoneOffset: SWARA_SEMITONES[clean] });
      continue;
    }

    // Check with capitalized first letter
    const capitalized = clean.charAt(0).toUpperCase() + clean.slice(1);
    if (SWARA_SEMITONES[capitalized] !== undefined) {
      parsed.push({ swara: capitalized, semitoneOffset: SWARA_SEMITONES[capitalized] });
      continue;
    }

    // Single-character shuddha/komal checks
    const lower = clean.toLowerCase();
    if (lower === 's' || lower === 'sa') {
      parsed.push({ swara: 'Sa', semitoneOffset: 0 });
    } else if (lower === 're' || lower === 'r') {
      parsed.push({ swara: rawToken.startsWith('r') ? 're' : 'Re', semitoneOffset: rawToken.startsWith('r') ? 1 : 2 });
    } else if (lower === 'ga' || lower === 'g') {
      parsed.push({ swara: rawToken.startsWith('g') ? 'ga' : 'Ga', semitoneOffset: rawToken.startsWith('g') ? 3 : 4 });
    } else if (lower === 'ma' || lower === 'm') {
      parsed.push({ swara: rawToken.includes("'") ? "ma'" : 'Ma', semitoneOffset: rawToken.includes("'") ? 6 : 5 });
    } else if (lower === 'pa' || lower === 'p') {
      parsed.push({ swara: 'Pa', semitoneOffset: 7 });
    } else if (lower === 'dha' || lower === 'd') {
      parsed.push({ swara: rawToken.startsWith('d') ? 'dha' : 'Dha', semitoneOffset: rawToken.startsWith('d') ? 8 : 9 });
    } else if (lower === 'ni' || lower === 'n') {
      parsed.push({ swara: rawToken.startsWith('n') ? 'ni' : 'Ni', semitoneOffset: rawToken.startsWith('n') ? 10 : 11 });
    }
  }

  return parsed;
}

export function validateSargamPhrase(phrase: string): {
  isValid: boolean;
  parsed: ParsedSwara[];
  invalidTokens: string[];
} {
  if (!phrase || !phrase.trim()) {
    return { isValid: false, parsed: [], invalidTokens: [] };
  }

  const tokens = phrase.replace(/[,|;]/g, ' ').trim().split(/\s+/).filter(Boolean);
  const parsed: ParsedSwara[] = [];
  const invalidTokens: string[] = [];

  for (const token of tokens) {
    const sub = parseSargamPhrase(token);
    if (sub.length > 0) {
      parsed.push(...sub);
    } else {
      invalidTokens.push(token);
    }
  }

  return {
    isValid: invalidTokens.length === 0 && parsed.length > 0,
    parsed,
    invalidTokens,
  };
}

let sharedAudioContext: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedAudioContext = new AudioCtx();
  }
  if (sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume().catch((e) => console.warn('AudioContext resume error:', e));
  }
  return sharedAudioContext;
}

// ============================================================================
// 1. AUTHENTIC TANPURA ENGINE
// ============================================================================

export interface TanpuraConfig {
  tonic: NoteName;
  firstString: 'Pa' | 'Ma' | 'Ni';
  stringCount: 4 | 5;
  volume: number; // 0.0 to 1.0
  speed: number;  // seconds per string (0.8s to 2.2s)
}

export class TanpuraEngine {
  private ctx: AudioContext;
  private isPlaying: boolean = false;
  private masterGain: GainNode;
  private timerId: number | null = null;
  private currentStringIndex: number = 0;
  private config: TanpuraConfig;
  private onStringPluck?: (stringIdx: number) => void;

  constructor(config: TanpuraConfig, onStringPluck?: (stringIdx: number) => void) {
    this.ctx = getAudioContext();
    this.config = config;
    this.onStringPluck = onStringPluck;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(config.volume, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);
  }

  public updateConfig(config: Partial<TanpuraConfig>) {
    this.config = { ...this.config, ...config };
    if (config.volume !== undefined && this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.config.volume, this.ctx.currentTime);
    }
  }

  public start() {
    if (this.isPlaying) return;
    this.ctx.resume();
    this.isPlaying = true;
    this.currentStringIndex = 0;
    this.scheduleNextPluck();
  }

  public stop() {
    this.isPlaying = false;
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  private scheduleNextPluck() {
    if (!this.isPlaying) return;

    const baseFreq = TONIC_FREQUENCIES[this.config.tonic];
    let stringFreq = baseFreq;

    // String sequence configuration:
    // 4-string mode: [String 1: Pa/Ma/Ni], [String 2: Jod Sa], [String 3: Jod Sa], [String 4: Kharaj Sa]
    // 5-string mode: [String 1: Pa/Ma/Ni], [String 2: Jod Sa], [String 3: Jod Sa], [String 4: Kharaj Sa], [String 5: Mandra Pa]
    const stringCount = this.config.stringCount;
    const strIdx = this.currentStringIndex % stringCount;

    if (strIdx === 0) {
      // 1st String: Pa (1.5x Sa), Ma (1.33x Sa), or Ni (1.875x Sa) in Mandra Saptak
      if (this.config.firstString === 'Pa') stringFreq = baseFreq * 0.75; // Mandra Pa
      else if (this.config.firstString === 'Ma') stringFreq = baseFreq * (4 / 3) * 0.5; // Mandra Ma
      else stringFreq = baseFreq * (15 / 8) * 0.5; // Mandra Ni
    } else if (strIdx === 1) {
      // 2nd String: Jod Sa (Tonic Sa middle octave)
      stringFreq = baseFreq;
    } else if (strIdx === 2) {
      // 3rd String: Jod Sa (Tonic Sa with 0.6 Hz micro-detune for acoustic jawari beating)
      stringFreq = baseFreq * 1.0025;
    } else if (strIdx === 3) {
      // 4th String: Kharaj Sa (Deep octave lower 0.5x Sa)
      stringFreq = baseFreq * 0.5;
    } else if (strIdx === 4) {
      // 5th String: Mandra Pancham / Lower Root
      stringFreq = baseFreq * 0.75;
    }

    this.pluckString(stringFreq, strIdx);

    if (this.onStringPluck) {
      this.onStringPluck(strIdx);
    }

    this.currentStringIndex++;

    // Spacing between plucks (seconds)
    const intervalSec = this.config.speed || 1.25;
    // Longer pause after Kharaj Sa (last string) before restarting cycle
    const delayMs = (strIdx === stringCount - 1 ? intervalSec * 1.8 : intervalSec) * 1000;

    this.timerId = window.setTimeout(() => {
      this.scheduleNextPluck();
    }, delayMs);
  }

  /**
   * Synthesizes the characteristic acoustic Jawari buzz of an Indian Tanpura string.
   */
  private pluckString(freq: number, strIdx: number) {
    const now = this.ctx.currentTime;
    const duration = 4.8; // Long singing resonance

    // 1. Multi-harmonic rich sawtooth source for bronze/steel strings
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, now);

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, now); // 2nd harmonic reinforcement

    // 2. Jawari bridge bandpass formant filter (emulates the cotton thread & curved bone bridge)
    const jawariFilter = this.ctx.createBiquadFilter();
    jawariFilter.type = 'bandpass';
    // Jawari resonance center frequency (1800Hz - 2800Hz shimmer)
    jawariFilter.frequency.setValueAtTime(2100, now);
    jawariFilter.Q.setValueAtTime(3.8, now);

    // Warm body lowpass
    const bodyFilter = this.ctx.createBiquadFilter();
    bodyFilter.type = 'lowpass';
    bodyFilter.frequency.setValueAtTime(3200, now);

    // 3. String amplitude envelope
    const envGain = this.ctx.createGain();
    envGain.gain.setValueAtTime(0.0001, now);
    // Smooth natural finger pluck attack
    envGain.gain.exponentialRampToValueAtTime(0.75, now + 0.08);
    // Initial rich buzz decay
    envGain.gain.exponentialRampToValueAtTime(0.28, now + 0.85);
    // Long lingering sympathetic body decay
    envGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    // Connect node graph
    osc1.connect(jawariFilter);
    osc2.connect(jawariFilter);
    jawariFilter.connect(bodyFilter);
    bodyFilter.connect(envGain);
    envGain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration + 0.1);
    osc2.stop(now + duration + 0.1);
  }
}

// ============================================================================
// 2. AUTHENTIC TABLA AUDIO ENGINE
// ============================================================================

export type TablaBol =
  | 'Dha'
  | 'Dhin'
  | 'Ge'
  | 'Ghe'
  | 'Ke'
  | 'Ka'
  | 'Kat'
  | 'Na'
  | 'Ta'
  | 'Tin'
  | 'Ti'
  | 'Tun'
  | 'Te'
  | 'Tu'
  | 'Dhi'
  | 'KiTe'
  | 'TiTe'
  | 'GaDi'
  | 'GeNe'
  | 'Tirakita';

export class TablaEngine {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private tonicFreq: number;

  constructor(tonic: NoteName = 'C', volume: number = 0.85) {
    this.ctx = getAudioContext();
    this.tonicFreq = TONIC_FREQUENCIES[tonic];

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(volume, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);
  }

  public setVolume(vol: number) {
    this.masterGain.gain.setValueAtTime(vol, this.ctx.currentTime);
  }

  public setTonic(tonic: NoteName) {
    this.tonicFreq = TONIC_FREQUENCIES[tonic];
  }

  /**
   * Play any traditional tabla bol using physical acoustic synthesis modeling
   */
  public playBol(bol: string, time?: number) {
    if (!bol) return;
    const trimmed = bol.trim();
    if (trimmed === '-' || trimmed === 'S' || trimmed === 's' || trimmed.toLowerCase() === 'rest') {
      // Classical rest / avagraha
      return;
    }

    const t = time || this.ctx.currentTime;
    const cleanBol = trimmed.replace(/[^a-zA-Z]/g, '');
    if (!cleanBol || cleanBol === 'S' || cleanBol === 's') return;

    switch (cleanBol) {
      case 'Dha':
        this.playBayanGe(t, 0.9);
        this.playDayanNa(t, 0.85);
        break;
      case 'DhaGe':
        this.playBayanGe(t, 0.9);
        this.playDayanNa(t, 0.85);
        this.playBayanGe(t + 0.1, 0.7);
        break;
      case 'Dhin':
      case 'Dhi':
      case 'Din':
        this.playBayanGe(t, 0.85);
        this.playDayanTin(t, 0.85);
        break;
      case 'Ge':
      case 'Ghe':
        this.playBayanGe(t, 0.95);
        break;
      case 'GaDi':
        this.playBayanGe(t, 0.9);
        this.playDayanTe(t + 0.1);
        break;
      case 'GeNe':
        this.playBayanGe(t, 0.9);
        this.playDayanNa(t + 0.1, 0.85);
        break;
      case 'Ke':
      case 'Ka':
      case 'Kat':
        this.playBayanKe(t);
        break;
      case 'KaTa':
        this.playBayanKe(t);
        this.playDayanNa(t + 0.1, 0.85);
        break;
      case 'Na':
      case 'Ta':
        this.playDayanNa(t, 0.9);
        break;
      case 'Tin':
      case 'Ti':
      case 'Tu':
        this.playDayanTin(t, 0.85);
        break;
      case 'Tun':
        this.playDayanTun(t);
        break;
      case 'Te':
        this.playDayanTe(t);
        break;
      case 'TiTe':
      case 'KiTe':
        this.playDayanTe(t);
        this.playDayanTe(t + 0.1);
        break;
      case 'Tirakita':
        this.playDayanTe(t);
        this.playDayanNa(t + 0.08, 0.7);
        this.playBayanKe(t + 0.16);
        this.playDayanNa(t + 0.24, 0.75);
        break;
      default:
        // Default resonant stroke
        this.playDayanNa(t, 0.7);
        break;
    }
  }

  /**
   * Bayan Ge/Ghe: Deep resonant left-hand bass stroke with pressure pitch-glide (meend)
   */
  private playBayanGe(t: number, velocity: number = 0.9) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    // Characteristic pitch glide of Bayan: drops from initial strike, then stabilizes
    osc.frequency.setValueAtTime(68, t);
    osc.frequency.exponentialRampToValueAtTime(84, t + 0.08); // slight upward wrist glide
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.38);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.95 * velocity, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.35, t + 0.18);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.5);
  }

  /**
   * Bayan Ke/Ka: Closed flat palm slap (dry thud, zero pitch resonance)
   */
  private playBayanKe(t: number) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.04);

    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.08);
  }

  /**
   * Dayan Na/Ta: Crisp ringing metallic strike on outer rim (chanti)
   */
  private playDayanNa(t: number, velocity: number = 0.85) {
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    // Tuned to high harmonic of Dayan
    const freq = this.tonicFreq * 2; // e.g. C4 or D4
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, t);

    // Rim metallic overtone
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2.76, t);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq * 2, t);
    filter.Q.setValueAtTime(5.0, t);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.85 * velocity, t + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.18, t + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);

    osc1.connect(gain);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.35);
    osc2.stop(t + 0.35);
  }

  /**
   * Dayan Tin/Ti: Open resonant stroke between syahi and maidan
   */
  private playDayanTin(t: number, velocity: number = 0.8) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const freq = this.tonicFreq; // Pure Sa pitch of Dayan
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.8 * velocity, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.2, t + 0.16);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.45);
  }

  /**
   * Dayan Tun: Pure singing center open strike
   */
  private playDayanTun(t: number) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(this.tonicFreq, t);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.9, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.3, t + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.65);
  }

  /**
   * Dayan Te: Damped dry slap with fingertips on center syahi
   */
  private playDayanTe(t: number) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(this.tonicFreq * 1.5, t);
    osc.frequency.exponentialRampToValueAtTime(this.tonicFreq * 0.8, t + 0.03);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.07);
  }
}

// ============================================================================
// 3. SARGAM ALANKAR HARMONIUM / VOCAL SYNTHESIZER
// ============================================================================

export class SargamSynthEngine {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private activeNodes: { osc1: OscillatorNode; osc2: OscillatorNode; gain: GainNode }[] = [];

  constructor(volume: number = 0.5) {
    this.ctx = getAudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(volume, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);
  }

  public setVolume(vol: number) {
    this.masterGain.gain.setValueAtTime(vol, this.ctx.currentTime);
  }

  public stopAll() {
    for (const node of this.activeNodes) {
      try {
        node.gain.gain.cancelScheduledValues(this.ctx.currentTime);
        node.gain.gain.setValueAtTime(0, this.ctx.currentTime);
        node.osc1.stop();
        node.osc2.stop();
      } catch (e) {
        // ignore already stopped
      }
    }
    this.activeNodes = [];
  }

  public playSwara(freq: number, durationSec: number = 0.45) {
    const now = this.ctx.currentTime;

    // Rich dual-reed acoustic harmonium emulation
    const reed1 = this.ctx.createOscillator();
    reed1.type = 'sawtooth';
    reed1.frequency.setValueAtTime(freq, now);

    const reed2 = this.ctx.createOscillator();
    reed2.type = 'triangle';
    reed2.frequency.setValueAtTime(freq * 1.002, now); // slight chorus detuning

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2600, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.65, now + 0.04);
    gain.gain.setValueAtTime(0.55, now + durationSec * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    reed1.connect(filter);
    reed2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    reed1.start(now);
    reed2.start(now);
    reed1.stop(now + durationSec + 0.05);
    reed2.stop(now + durationSec + 0.05);

    const entry = { osc1: reed1, osc2: reed2, gain };
    this.activeNodes.push(entry);
    setTimeout(() => {
      const idx = this.activeNodes.indexOf(entry);
      if (idx !== -1) this.activeNodes.splice(idx, 1);
    }, (durationSec + 0.1) * 1000);
  }
}
