'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Square,
  Volume2,
  Clock,
  Sparkles,
  Music2,
  Layers,
  Sliders,
  RotateCcw,
  Activity,
  CheckCircle2,
  Radio,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import * as Tone from 'tone';
import { NOTE_NAMES, NoteName, noteToFreq } from '@/lib/music-theory';
import { useToast } from '@/context/ToastContext';

interface TaalDefinition {
  id: string;
  name: string;
  matras: number; // total beats
  divisions: number[]; // vibhaag
  bols: string[];
  taaliKhaali: ('sam' | 'taali' | 'khaali' | 'normal')[];
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
  },
  {
    id: 'keherwa',
    name: 'Keherwa (8 Beats)',
    matras: 8,
    divisions: [4, 4],
    bols: ['Dha', 'Ge', 'Na', 'Ti', 'Na', 'Ke', 'Dhi', 'Na'],
    taaliKhaali: ['sam', 'normal', 'normal', 'normal', 'khaali', 'normal', 'normal', 'normal'],
  },
  {
    id: 'dadra',
    name: 'Dadra (6 Beats)',
    matras: 6,
    divisions: [3, 3],
    bols: ['Dha', 'Dhi', 'Na', 'Dha', 'Tu', 'Na'],
    taaliKhaali: ['sam', 'normal', 'normal', 'khaali', 'normal', 'normal'],
  },
  {
    id: 'rupak',
    name: 'Rupak (7 Beats)',
    matras: 7,
    divisions: [3, 2, 2],
    bols: ['Tin', 'Tin', 'Na', 'Dhin', 'Na', 'Dhin', 'Na'],
    taaliKhaali: ['khaali', 'normal', 'normal', 'taali', 'normal', 'taali', 'normal'],
  },
  {
    id: 'jhaptal',
    name: 'Jhaptal (10 Beats)',
    matras: 10,
    divisions: [2, 3, 2, 3],
    bols: ['Dhi', 'Na', 'Dhi', 'Dhi', 'Na', 'Ti', 'Na', 'Dhi', 'Dhi', 'Na'],
    taaliKhaali: ['sam', 'normal', 'taali', 'normal', 'normal', 'khaali', 'normal', 'taali', 'normal', 'normal'],
  },
];

interface AlankarExercise {
  id: string;
  title: string;
  description: string;
  sequence: { swara: string; semitoneOffset: number }[];
}

const ALANKARS: AlankarExercise[] = [
  {
    id: 'alankar_1',
    title: 'Alankar 1: Shuddha Swara Aroha & Avaroha',
    description: 'Straight ascending and descending fundamental scale.',
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
    title: 'Alankar 2: Double Swara (Jod Swara)',
    description: 'Practices stability and vocal breath control on repeated pitches.',
    sequence: [
      { swara: 'Sa', semitoneOffset: 0 },
      { swara: 'Sa', semitoneOffset: 0 },
      { swara: 'Re', semitoneOffset: 2 },
      { swara: 'Re', semitoneOffset: 2 },
      { swara: 'Ga', semitoneOffset: 4 },
      { swara: 'Ga', semitoneOffset: 4 },
      { swara: 'Ma', semitoneOffset: 5 },
      { swara: 'Ma', semitoneOffset: 5 },
      { swara: 'Pa', semitoneOffset: 7 },
      { swara: 'Pa', semitoneOffset: 7 },
      { swara: 'Dha', semitoneOffset: 9 },
      { swara: 'Dha', semitoneOffset: 9 },
      { swara: 'Ni', semitoneOffset: 11 },
      { swara: 'Ni', semitoneOffset: 11 },
      { swara: "Sa'", semitoneOffset: 12 },
      { swara: "Sa'", semitoneOffset: 12 },
    ],
  },
  {
    id: 'alankar_3',
    title: 'Alankar 3: Triplets (Trika)',
    description: '3-note melodic steps for flexibility and agility.',
    sequence: [
      { swara: 'Sa', semitoneOffset: 0 },
      { swara: 'Re', semitoneOffset: 2 },
      { swara: 'Ga', semitoneOffset: 4 },
      { swara: 'Re', semitoneOffset: 2 },
      { swara: 'Ga', semitoneOffset: 4 },
      { swara: 'Ma', semitoneOffset: 5 },
      { swara: 'Ga', semitoneOffset: 4 },
      { swara: 'Ma', semitoneOffset: 5 },
      { swara: 'Pa', semitoneOffset: 7 },
      { swara: 'Ma', semitoneOffset: 5 },
      { swara: 'Pa', semitoneOffset: 7 },
      { swara: 'Dha', semitoneOffset: 9 },
      { swara: 'Pa', semitoneOffset: 7 },
      { swara: 'Dha', semitoneOffset: 9 },
      { swara: 'Ni', semitoneOffset: 11 },
      { swara: 'Dha', semitoneOffset: 9 },
      { swara: 'Ni', semitoneOffset: 11 },
      { swara: "Sa'", semitoneOffset: 12 },
    ],
  },
];

export default function PracticeStudioPage() {
  const { info } = useToast();

  // Tanpura state
  const [tanpuraPlaying, setTanpuraPlaying] = useState(false);
  const [tanpuraTonic, setTanpuraTonic] = useState<NoteName>('C');
  const [tanpuraSecondString, setTanpuraSecondString] = useState<'Pa' | 'Ma' | 'Ni'>('Pa');
  const [tanpuraVolume, setTanpuraVolume] = useState(-10); // dB

  // Rhythm & Taal state
  const [rhythmPlaying, setRhythmPlaying] = useState(false);
  const [selectedTaal, setSelectedTaal] = useState<TaalDefinition>(TAALS[0]);
  const [bpm, setBpm] = useState(84);
  const [activeMatra, setActiveMatra] = useState<number>(0);

  // Alankar exercise state
  const [selectedAlankar, setSelectedAlankar] = useState<AlankarExercise>(ALANKARS[0]);
  const [alankarPlaying, setAlankarPlaying] = useState(false);
  const [activeAlankarIndex, setActiveAlankarIndex] = useState<number>(-1);

  // Tone.js refs
  const tanpuraSynthRef = useRef<Tone.PolySynth | null>(null);
  const tanpuraLoopRef = useRef<Tone.Loop | null>(null);
  const tablaDayanRef = useRef<Tone.MembraneSynth | null>(null);
  const tablaBayanRef = useRef<Tone.MembraneSynth | null>(null);
  const alankarSynthRef = useRef<Tone.Synth | null>(null);
  const isAudioStartedRef = useRef(false);

  const startAudioEngine = async () => {
    if (!isAudioStartedRef.current) {
      await Tone.start();
      Tone.Transport.bpm.value = bpm;
      isAudioStartedRef.current = true;
    }
  };

  // 1. Tanpura Drone Engine
  const toggleTanpura = async () => {
    await startAudioEngine();

    if (tanpuraPlaying) {
      if (tanpuraLoopRef.current) {
        tanpuraLoopRef.current.stop();
        tanpuraLoopRef.current.dispose();
        tanpuraLoopRef.current = null;
      }
      if (tanpuraSynthRef.current) {
        tanpuraSynthRef.current.releaseAll();
      }
      setTanpuraPlaying(false);
      return;
    }

    // Create rich buzzing Tanpura synth voice with resonant harmonics
    const filter = new Tone.Filter({
      frequency: 3200,
      type: 'lowpass',
      Q: 2.2,
    }).toDestination();

    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: 'sawtooth6', // jawari buzz simulation
      },
      envelope: {
        attack: 0.1,
        decay: 3.5,
        sustain: 0.2,
        release: 2.0,
      },
    }).connect(filter);

    synth.volume.value = tanpuraVolume;
    tanpuraSynthRef.current = synth;

    // Tanpura 4-string pluck cycle:
    // String 1: Pa / Ma / Ni (octave 3)
    // String 2: Sa (octave 4)
    // String 3: Sa (octave 4)
    // String 4: Kharaj Sa (octave 3)
    const tonicIdx = NOTE_NAMES.indexOf(tanpuraTonic);
    const sa4Midi = 60 + tonicIdx;
    const sa3Midi = 48 + tonicIdx;

    let firstMidi = sa3Midi + 7; // Pa
    if (tanpuraSecondString === 'Ma') firstMidi = sa3Midi + 5;
    if (tanpuraSecondString === 'Ni') firstMidi = sa3Midi + 11;

    const notes = [
      Tone.Frequency(firstMidi, 'midi').toNote(),
      Tone.Frequency(sa4Midi, 'midi').toNote(),
      Tone.Frequency(sa4Midi, 'midi').toNote(),
      Tone.Frequency(sa3Midi, 'midi').toNote(),
    ];

    let pluckIdx = 0;
    const loop = new Tone.Loop((time) => {
      const noteToPluck = notes[pluckIdx % notes.length];
      synth.triggerAttackRelease(noteToPluck, '2n', time);
      pluckIdx++;
    }, '1.2s').start(0);

    tanpuraLoopRef.current = loop;
    Tone.Transport.start();
    setTanpuraPlaying(true);
    info('Tanpura Active', `Drone vibrating in ${tanpuraTonic} (${tanpuraSecondString} string)`);
  };

  // Adjust Tanpura volume
  useEffect(() => {
    if (tanpuraSynthRef.current) {
      tanpuraSynthRef.current.volume.value = tanpuraVolume;
    }
  }, [tanpuraVolume]);

  // 2. Tabla & Rhythm Engine
  const toggleRhythm = async () => {
    await startAudioEngine();

    if (rhythmPlaying) {
      Tone.Transport.stop();
      Tone.Transport.cancel();
      setRhythmPlaying(false);
      setActiveMatra(0);
      return;
    }

    // Dayan (high right-hand bell/pitch drum)
    const dayan = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 4,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.005, decay: 0.25, sustain: 0.01, release: 0.1 },
    }).toDestination();
    tablaDayanRef.current = dayan;

    // Bayan (low left-hand bass modulate drum)
    const bayan = new Tone.MembraneSynth({
      pitchDecay: 0.12,
      octaves: 6,
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.01, decay: 0.45, sustain: 0.05, release: 0.3 },
    }).toDestination();
    bayan.volume.value = -3;
    tablaBayanRef.current = bayan;

    Tone.Transport.bpm.value = bpm;

    let currentBeat = 0;
    Tone.Transport.scheduleRepeat((time) => {
      const beatIdx = currentBeat % selectedTaal.matras;
      const bol = selectedTaal.bols[beatIdx];
      const category = selectedTaal.taaliKhaali[beatIdx];

      Tone.Draw.schedule(() => {
        setActiveMatra(beatIdx);
      }, time);

      // Play synthesized tabla bols
      if (bol.startsWith('Dh') || bol === 'Dha') {
        // Both Dayan & Bayan strike together
        bayan.triggerAttackRelease('G1', '8n', time);
        dayan.triggerAttackRelease('D4', '8n', time);
      } else if (bol === 'Ge' || bol === 'Ghe') {
        // Bass modulation only
        bayan.triggerAttackRelease('A1', '8n', time);
      } else if (bol === 'Tin' || bol === 'Ti' || bol === 'Ta') {
        // Open/closed Dayan strike
        dayan.triggerAttackRelease(category === 'khaali' ? 'F#4' : 'E4', '8n', time);
      } else if (bol === 'Na') {
        // Ringing rim strike
        dayan.triggerAttackRelease('A4', '8n', time);
      } else if (bol === 'Ke' || bol === 'Ka') {
        // Muted slap
        bayan.triggerAttackRelease('C1', '16n', time, 0.4);
      }

      currentBeat++;
    }, '4n');

    Tone.Transport.start();
    setRhythmPlaying(true);
  };

  // Adjust BPM
  const handleBpmChange = (newBpm: number) => {
    setBpm(newBpm);
    if (Tone.Transport) {
      Tone.Transport.bpm.value = newBpm;
    }
  };

  // 3. Sargam Alankar Audio Playback
  const toggleAlankarPlayback = async () => {
    await startAudioEngine();

    if (alankarPlaying) {
      setAlankarPlaying(false);
      setActiveAlankarIndex(-1);
      if (alankarSynthRef.current) {
        alankarSynthRef.current.dispose();
        alankarSynthRef.current = null;
      }
      return;
    }

    const synth = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.05, decay: 0.2, sustain: 0.7, release: 0.3 },
    }).toDestination();
    synth.volume.value = -8;
    alankarSynthRef.current = synth;

    setAlankarPlaying(true);

    const tonicIdx = NOTE_NAMES.indexOf(tanpuraTonic);
    const saMidi = 60 + tonicIdx;

    let step = 0;
    const interval = setInterval(() => {
      if (step >= selectedAlankar.sequence.length) {
        clearInterval(interval);
        setAlankarPlaying(false);
        setActiveAlankarIndex(-1);
        return;
      }

      const item = selectedAlankar.sequence[step];
      const targetMidi = saMidi + item.semitoneOffset;
      const noteName = Tone.Frequency(targetMidi, 'midi').toNote();

      synth.triggerAttackRelease(noteName, '8n');
      setActiveAlankarIndex(step);
      step++;
    }, 600);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Tone.Transport.stop();
      Tone.Transport.cancel();
      if (tanpuraLoopRef.current) tanpuraLoopRef.current.dispose();
      if (tanpuraSynthRef.current) tanpuraSynthRef.current.dispose();
    };
  }, []);

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-midnight-900 border border-slate-200 dark:border-white/10 shadow-sm backdrop-blur-xl">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-studio-blue/10 dark:bg-cyan-500/10 border border-studio-blue/20 dark:border-cyan-500/20 text-studio-blue dark:text-cyan-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Activity className="w-3.5 h-3.5" />
              Raga &amp; Rhythm Practice
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              Sargam &amp; Rhythm Studio
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Indian classical practice suite with Tanpura drone, authentic Indian Taal cycles, and guided Alankar exercises.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Section 1: Tanpura Drone Box */}
          <div className="p-6 rounded-3xl bg-white dark:bg-midnight-900 border border-slate-200 dark:border-white/10 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Radio className={`w-4 h-4 ${tanpuraPlaying ? 'text-cyan-400 animate-spin' : 'text-slate-400'}`} />
                Tanpura Drone
              </h2>
              <button
                onClick={toggleTanpura}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  tanpuraPlaying
                    ? 'bg-rose-600 text-white shadow-rose-600/30'
                    : 'bg-studio-blue text-white shadow-studio-blue/30'
                }`}
              >
                {tanpuraPlaying ? (
                  <>
                    <Square className="w-3.5 h-3.5" /> Stop Drone
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-white" /> Start Drone
                  </>
                )}
              </button>
            </div>

            {/* Drone Controls */}
            <div className="space-y-4 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Sa (Tonic Root)
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {NOTE_NAMES.map((n) => (
                    <button
                      key={n}
                      onClick={() => setTanpuraTonic(n)}
                      className={`py-1.5 rounded-lg font-mono font-bold transition-colors ${
                        tanpuraTonic === n
                          ? 'bg-studio-blue text-white'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  First String Tuning
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Pa', 'Ma', 'Ni'] as const).map((str) => (
                    <button
                      key={str}
                      onClick={() => setTanpuraSecondString(str)}
                      className={`py-2 rounded-xl font-bold transition-all ${
                        tanpuraSecondString === str
                          ? 'bg-studio-violet text-white shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {str} {str === 'Pa' ? '(Standard)' : str === 'Ma' ? '(Madhyam)' : '(Nishad)'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-bold text-slate-400">Drone Volume</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{tanpuraVolume} dB</span>
                </div>
                <input
                  type="range"
                  min="-30"
                  max="0"
                  value={tanpuraVolume}
                  onChange={(e) => setTanpuraVolume(Number(e.target.value))}
                  className="w-full accent-studio-blue"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Tabla & Taal Rhythm Box (2 cols) */}
          <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-midnight-900 border border-slate-200 dark:border-white/10 shadow-sm space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-studio-violet" />
                  Tabla Rhythm Cycles (Taal)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Synthesized Dayan &amp; Bayan strokes synced to audio clock.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={toggleRhythm}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    rhythmPlaying
                      ? 'bg-rose-600 text-white shadow-rose-600/30'
                      : 'bg-gradient-to-r from-studio-violet to-indigo-600 text-white shadow-md'
                  }`}
                >
                  {rhythmPlaying ? (
                    <>
                      <Square className="w-3.5 h-3.5" /> Stop Taal
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-white" /> Start Taal
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Taal Selection & Tempo Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Select Taal
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {TAALS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setSelectedTaal(t);
                        setActiveMatra(0);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        selectedTaal.id === t.id
                          ? 'bg-studio-blue text-white shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Tempo (Laya)
                  </label>
                  <span className="text-xs font-mono font-bold text-studio-blue dark:text-cyan-400">
                    {bpm} BPM ({bpm < 75 ? 'Vilambit' : bpm < 115 ? 'Madhya' : 'Drut'})
                  </span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="220"
                  value={bpm}
                  onChange={(e) => handleBpmChange(Number(e.target.value))}
                  className="w-full accent-studio-violet"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <button onClick={() => handleBpmChange(60)}>Vilambit (60)</button>
                  <button onClick={() => handleBpmChange(90)}>Madhya (90)</button>
                  <button onClick={() => handleBpmChange(140)}>Drut (140)</button>
                </div>
              </div>
            </div>

            {/* Live Matra (Beat) Visualizer Grid */}
            <div className="pt-3">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Beat Counter ({selectedTaal.matras} Matras)
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {selectedTaal.bols.map((bol, idx) => {
                  const isActive = rhythmPlaying && activeMatra === idx;
                  const tag = selectedTaal.taaliKhaali[idx];

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-2xl text-center border transition-all duration-100 ${
                        isActive
                          ? 'bg-cyan-500/20 border-cyan-400 scale-105 shadow-md shadow-cyan-500/20'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-white/5'
                      }`}
                    >
                      <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between mb-1">
                        <span>{idx + 1}</span>
                        {tag === 'sam' ? (
                          <span className="text-rose-500 font-extrabold text-[9px]">SAM (X)</span>
                        ) : tag === 'khaali' ? (
                          <span className="text-amber-500 font-bold text-[9px]">0 (Khaali)</span>
                        ) : tag === 'taali' ? (
                          <span className="text-studio-blue font-bold text-[9px]">Taali</span>
                        ) : null}
                      </div>
                      <div
                        className={`text-sm font-bold ${
                          isActive
                            ? 'text-cyan-300 font-extrabold'
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {bol}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Guided Alankar Practice Exercises */}
        <div className="p-6 rounded-3xl bg-white dark:bg-midnight-900 border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Alankar Swara Practice
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Foundational vocal and instrumental exercises. Follow along with audio guidance.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleAlankarPlayback}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  alankarPlaying
                    ? 'bg-rose-600 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                }`}
              >
                {alankarPlaying ? (
                  <>
                    <Square className="w-3.5 h-3.5" /> Stop Exercise
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-white" /> Play Alankar Audio
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Exercise Tabs */}
          <div className="flex flex-wrap gap-2">
            {ALANKARS.map((al) => (
              <button
                key={al.id}
                onClick={() => {
                  setSelectedAlankar(al);
                  setActiveAlankarIndex(-1);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  selectedAlankar.id === al.id
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {al.title.split(':')[0]}
              </button>
            ))}
          </div>

          {/* Swara Note Sequence Display */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-midnight-950 border border-slate-200 dark:border-white/5">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{selectedAlankar.description}</p>
            <div className="flex flex-wrap gap-2">
              {selectedAlankar.sequence.map((item, idx) => {
                const isCurrent = alankarPlaying && activeAlankarIndex === idx;
                return (
                  <div
                    key={idx}
                    className={`px-3 py-2 rounded-xl text-sm font-bold font-mono transition-all duration-100 ${
                      isCurrent
                        ? 'bg-emerald-500 text-white scale-110 shadow-lg'
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {item.swara}
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

