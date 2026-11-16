'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Volume2,
  Sliders,
  RotateCcw,
  Sparkles,
  Music2,
  Radio,
  Keyboard as KeyboardIcon,
  HelpCircle,
  Play,
  Square,
  Wind,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import * as Tone from 'tone';
import {
  NOTE_NAMES,
  NoteName,
  getSargamForNote,
  midiToFreq,
} from '@/lib/music-theory';
import { useToast } from '@/context/ToastContext';

// Standard laptop keyboard mapping for harmonium keys
const KEYBOARD_MAP: Record<string, { note: NoteName; octaveOffset: number }> = {
  a: { note: 'C', octaveOffset: 0 },
  w: { note: 'C#', octaveOffset: 0 },
  s: { note: 'D', octaveOffset: 0 },
  e: { note: 'D#', octaveOffset: 0 },
  d: { note: 'E', octaveOffset: 0 },
  f: { note: 'F', octaveOffset: 0 },
  t: { note: 'F#', octaveOffset: 0 },
  g: { note: 'G', octaveOffset: 0 },
  y: { note: 'G#', octaveOffset: 0 },
  h: { note: 'A', octaveOffset: 0 },
  u: { note: 'A#', octaveOffset: 0 },
  j: { note: 'B', octaveOffset: 0 },
  k: { note: 'C', octaveOffset: 1 },
  o: { note: 'C#', octaveOffset: 1 },
  l: { note: 'D', octaveOffset: 1 },
  p: { note: 'D#', octaveOffset: 1 },
  ';': { note: 'E', octaveOffset: 1 },
  "'": { note: 'F', octaveOffset: 1 },
};

interface KeyDescriptor {
  note: NoteName;
  octave: number;
  fullNote: string;
  isBlack: boolean;
  midi: number;
}

export default function HarmoniumPage() {
  const { info, success, warning } = useToast();

  const [tonicSa, setTonicSa] = useState<NoteName>('C');
  const [baseOctave, setBaseOctave] = useState<number>(3);
  const [volume, setVolume] = useState<number>(-8); // dB
  const [reverbWet, setReverbWet] = useState<number>(0.25);
  const [bellowRate, setBellowRate] = useState<number>(3.5); // Hz tremolo
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const [isAudioReady, setIsAudioReady] = useState<boolean>(false);
  const [midiConnected, setMidiConnected] = useState<boolean>(false);

  // Tone.js nodes
  const polySynthRef = useRef<Tone.PolySynth | null>(null);
  const reverbRef = useRef<Tone.Reverb | null>(null);
  const tremoloRef = useRef<Tone.Tremolo | null>(null);
  const filterRef = useRef<Tone.Filter | null>(null);

  // Initialize Harmonium Synthesis Engine
  const initAudio = useCallback(async () => {
    if (isAudioReady) return;
    await Tone.start();

    // Reverb for acoustic room warmth
    const reverb = new Tone.Reverb({
      decay: 2.5,
      preDelay: 0.01,
      wet: reverbWet,
    }).toDestination();
    await reverb.generate();
    reverbRef.current = reverb;

    // Bellow pumping tremolo (simulates hand pumping bellows)
    const tremolo = new Tone.Tremolo({
      frequency: bellowRate,
      depth: 0.25,
      type: 'sine',
    }).connect(reverb);
    tremolo.start();
    tremoloRef.current = tremolo;

    // Harmonium acoustic reed filter (gentle lowpass with slight nasal peak)
    const filter = new Tone.Filter({
      frequency: 2400,
      type: 'lowpass',
      rolloff: -12,
      Q: 1.8,
    }).connect(tremolo);
    filterRef.current = filter;

    // Rich dual-reed additive synth voice
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: 'sawtooth4', // rich harmonium reed harmonics
      },
      envelope: {
        attack: 0.04, // slight breath onset
        decay: 0.3,
        sustain: 0.85,
        release: 0.15, // quick air cutoff
      },
    }).connect(filter);

    synth.volume.value = volume;
    polySynthRef.current = synth;

    setIsAudioReady(true);
    info('Harmonium Ready', 'Play with mouse, laptop keyboard, or USB MIDI.');
  }, [isAudioReady, reverbWet, bellowRate, volume, info]);

  // Adjust volume
  useEffect(() => {
    if (polySynthRef.current) {
      polySynthRef.current.volume.value = volume;
    }
  }, [volume]);

  // Adjust reverb
  useEffect(() => {
    if (reverbRef.current) {
      reverbRef.current.wet.value = reverbWet;
    }
  }, [reverbWet]);

  // Trigger Note On
  const handleNoteOn = useCallback(
    async (fullNote: string) => {
      if (!isAudioReady) {
        await initAudio();
      }
      if (!polySynthRef.current) return;

      try {
        polySynthRef.current.triggerAttack(fullNote);
        setActiveNotes((prev) => new Set(prev).add(fullNote));
      } catch (e) {
        console.error('Harmonium play error', e);
      }
    },
    [isAudioReady, initAudio]
  );

  // Trigger Note Off
  const handleNoteOff = useCallback((fullNote: string) => {
    if (!polySynthRef.current) return;
    try {
      polySynthRef.current.triggerRelease(fullNote);
      setActiveNotes((prev) => {
        const next = new Set(prev);
        next.delete(fullNote);
        return next;
      });
    } catch (_) {}
  }, []);

  // Panic button: stop all sounding notes
  const stopAllNotes = useCallback(() => {
    if (polySynthRef.current) {
      polySynthRef.current.releaseAll();
    }
    setActiveNotes(new Set());
  }, []);

  // Web MIDI API connection
  useEffect(() => {
    if (typeof window !== 'undefined' && 'requestMIDIAccess' in navigator) {
      navigator.requestMIDIAccess().then(
        (midiAccess: any) => {
          let hasInputs = false;
          midiAccess.inputs.forEach((input: any) => {
            hasInputs = true;
            input.onmidimessage = (msg: any) => {
              const [status, noteNum, velocity] = msg.data;
              const command = status >> 4;
              const fullNote = Tone.Frequency(noteNum, 'midi').toNote();

              if (command === 9 && velocity > 0) {
                // Note On
                handleNoteOn(fullNote);
              } else if (command === 8 || (command === 9 && velocity === 0)) {
                // Note Off
                handleNoteOff(fullNote);
              }
            };
          });
          if (hasInputs) {
            setMidiConnected(true);
            success('MIDI Device Connected', 'USB MIDI keyboard is active.');
          }
        },
        () => {
          // MIDI not available or permission denied
        }
      );
    }
  }, [handleNoteOn, handleNoteOff, success]);

  // Laptop Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      const key = e.key.toLowerCase();
      const mapping = KEYBOARD_MAP[key];
      if (mapping) {
        e.preventDefault();
        const noteOctave = baseOctave + mapping.octaveOffset;
        const fullNote = `${mapping.note}${noteOctave}`;
        handleNoteOn(fullNote);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const mapping = KEYBOARD_MAP[key];
      if (mapping) {
        const noteOctave = baseOctave + mapping.octaveOffset;
        const fullNote = `${mapping.note}${noteOctave}`;
        handleNoteOff(fullNote);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [baseOctave, handleNoteOn, handleNoteOff]);

  // Generate 2 octaves of keyboard keys
  const keys: KeyDescriptor[] = [];
  for (let oct = baseOctave; oct <= baseOctave + 1; oct++) {
    NOTE_NAMES.forEach((note) => {
      const isBlack = note.includes('#');
      const idx = NOTE_NAMES.indexOf(note);
      const midi = (oct + 1) * 12 + idx;
      keys.push({
        note,
        octave: oct,
        fullNote: `${note}${oct}`,
        isBlack,
        midi,
      });
    });
  }
  // Add closing C of upper octave
  keys.push({
    note: 'C',
    octave: baseOctave + 2,
    fullNote: `C${baseOctave + 2}`,
    isBlack: false,
    midi: (baseOctave + 3) * 12,
  });

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-midnight-900 border border-slate-200 dark:border-white/10 shadow-sm backdrop-blur-xl">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-studio-violet/10 dark:bg-purple-500/10 border border-studio-violet/20 dark:border-purple-500/20 text-studio-violet dark:text-purple-300 text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              Virtual Reed Instrument
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              Sonic Harmonium Studio
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Dual-reed synthesized Indian Harmonium with dynamic Sargam transposition, bellow tremolo, and Web MIDI.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {!isAudioReady ? (
              <button
                onClick={initAudio}
                className="px-6 py-3 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-studio-blue via-indigo-600 to-cyan-500 hover:from-studio-blue/90 hover:to-cyan-400 shadow-lg shadow-studio-blue/25 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Initialize Audio</span>
              </button>
            ) : (
              <button
                onClick={stopAllNotes}
                className="px-4 py-2.5 rounded-2xl font-semibold text-xs text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Silence all currently ringing notes"
              >
                <Square className="w-3.5 h-3.5 text-rose-500" />
                <span>Stop All Notes</span>
              </button>
            )}

            {midiConnected && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                MIDI Active
              </span>
            )}
          </div>
        </div>

        {/* Master Control Board: Tonic Sa, Octaves, Reverb, Bellows */}
        <div className="p-6 rounded-3xl bg-white dark:bg-midnight-900 border border-slate-200 dark:border-white/10 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Tonic Sa Selector */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
              Select Tonic Sa (षड्ज)
            </label>
            <select
              value={tonicSa}
              onChange={(e) => setTonicSa(e.target.value as NoteName)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-studio-blue"
            >
              {NOTE_NAMES.map((n) => (
                <option key={n} value={n}>
                  Sa = {n} {n === 'C' ? '(White 1 / Safed 1)' : n === 'C#' ? '(Black 1 / Kaali 1)' : ''}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 mt-1">
              Updates Sargam labels without changing physical key pitch.
            </p>
          </div>

          {/* Octave Shift */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
              Keyboard Octave
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBaseOctave((prev) => Math.max(2, prev - 1))}
                className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200"
              >
                -1 Oct
              </button>
              <span className="px-3 py-2 text-sm font-mono font-bold text-slate-900 dark:text-white">
                Oct {baseOctave}–{baseOctave + 1}
              </span>
              <button
                onClick={() => setBaseOctave((prev) => Math.min(5, prev + 1))}
                className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200"
              >
                +1 Oct
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Mandra (Lower) / Madhya (Middle) / Taar (High)
            </p>
          </div>

          {/* Master Volume */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Volume
              </label>
              <span className="text-xs font-mono text-slate-600 dark:text-slate-300">{volume} dB</span>
            </div>
            <input
              type="range"
              min="-30"
              max="2"
              step="1"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-full accent-studio-blue cursor-pointer"
            />
          </div>

          {/* Reverb Space */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Reverb Ambience
              </label>
              <span className="text-xs font-mono text-slate-600 dark:text-slate-300">
                {(reverbWet * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="0.8"
              step="0.05"
              value={reverbWet}
              onChange={(e) => setReverbWet(Number(e.target.value))}
              className="w-full accent-studio-violet cursor-pointer"
            />
          </div>
        </div>

        {/* Playable Harmonium Physical Chassis & Keyboard */}
        <div className="p-4 sm:p-8 rounded-3xl bg-gradient-to-b from-amber-950 via-stone-900 to-black border-4 border-amber-900/60 shadow-2xl relative overflow-hidden">
          {/* Woodgrain & Brass Trim Accent */}
          <div className="absolute top-0 inset-x-0 h-4 bg-gradient-to-r from-amber-700 via-yellow-600 to-amber-700 opacity-80" />

          {/* Harmonium Badge Header */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-amber-900/40 text-amber-200/80">
            <div className="flex items-center gap-2 text-xs font-bold tracking-widest uppercase font-serif">
              <Wind className="w-4 h-4 text-amber-400" />
              <span>Sur-Mandal Reed System • 2 Reed Approximation</span>
            </div>
            <div className="text-xs font-mono text-amber-300">
              Active Notes: {Array.from(activeNotes).join(', ') || 'None'}
            </div>
          </div>

          {/* Interactive Keyboard Canvas */}
          <div className="relative h-60 sm:h-72 w-full overflow-x-auto select-none flex justify-center pb-2">
            <div className="relative inline-flex h-full">
              {/* Render White Keys first */}
              {keys
                .filter((k) => !k.isBlack)
                .map((key) => {
                  const sargam = getSargamForNote(key.note, tonicSa);
                  const isPressed = activeNotes.has(key.fullNote);

                  return (
                    <div
                      key={key.fullNote}
                      onMouseDown={() => handleNoteOn(key.fullNote)}
                      onMouseUp={() => handleNoteOff(key.fullNote)}
                      onMouseLeave={() => handleNoteOff(key.fullNote)}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        handleNoteOn(key.fullNote);
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        handleNoteOff(key.fullNote);
                      }}
                      className={`relative w-10 sm:w-12 h-full rounded-b-xl border border-slate-300 dark:border-stone-700 shadow-md flex flex-col justify-end items-center pb-3 transition-colors cursor-pointer ${
                        isPressed
                          ? 'bg-amber-200 dark:bg-amber-100 shadow-inner translate-y-1'
                          : 'bg-gradient-to-b from-slate-100 via-white to-slate-200 dark:from-stone-200 dark:via-stone-100 dark:to-stone-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-[10px] font-bold text-slate-800 dark:text-stone-900 font-sans">
                        {key.fullNote}
                      </span>
                      <span
                        className={`text-xs sm:text-sm font-extrabold ${
                          sargam === 'Sa'
                            ? 'text-rose-600'
                            : sargam === 'Pa'
                            ? 'text-blue-600'
                            : 'text-amber-800'
                        }`}
                      >
                        {sargam}
                      </span>
                    </div>
                  );
                })}

              {/* Render Black Keys layered on top */}
              {keys.map((key) => {
                if (!key.isBlack) return null;

                // Calculate horizontal position relative to white keys
                const whiteKeysBefore = keys
                  .filter((k) => !k.isBlack && k.midi < key.midi).length;

                const sargam = getSargamForNote(key.note, tonicSa);
                const isPressed = activeNotes.has(key.fullNote);

                return (
                  <div
                    key={key.fullNote}
                    onMouseDown={() => handleNoteOn(key.fullNote)}
                    onMouseUp={() => handleNoteOff(key.fullNote)}
                    onMouseLeave={() => handleNoteOff(key.fullNote)}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      handleNoteOn(key.fullNote);
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      handleNoteOff(key.fullNote);
                    }}
                    className={`absolute z-10 w-7 sm:w-8 h-[60%] rounded-b-lg border-2 border-stone-900 shadow-xl flex flex-col justify-end items-center pb-2 cursor-pointer transition-transform ${
                      isPressed
                        ? 'bg-amber-800 border-amber-400 translate-y-1'
                        : 'bg-gradient-to-b from-stone-800 via-stone-900 to-black hover:from-stone-700'
                    }`}
                    style={{
                      left: `calc(${whiteKeysBefore} * (100% / 15) - (1.75rem / 2))`,
                    }}
                  >
                    <span className="text-[9px] font-bold text-slate-300 font-mono">
                      {key.fullNote}
                    </span>
                    <span className="text-[11px] font-extrabold text-amber-300">
                      {sargam.split(' ')[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Laptop Keyboard Guide & Sargam Quick Reference */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-midnight-900 border border-slate-200 dark:border-white/10 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <KeyboardIcon className="w-4 h-4 text-studio-blue" />
              Laptop Keyboard Shortcut Map
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              You can play the harmonium instantly with your computer keyboard:
            </p>
            <div className="flex flex-wrap gap-1.5 text-xs font-mono">
              <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10">A: C</span>
              <span className="px-2 py-1 rounded bg-stone-800 text-amber-300 border border-stone-700">W: C#</span>
              <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10">S: D</span>
              <span className="px-2 py-1 rounded bg-stone-800 text-amber-300 border border-stone-700">E: D#</span>
              <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10">D: E</span>
              <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10">F: F</span>
              <span className="px-2 py-1 rounded bg-stone-800 text-amber-300 border border-stone-700">T: F#</span>
              <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10">G: G</span>
              <span className="px-2 py-1 rounded bg-stone-800 text-amber-300 border border-stone-700">Y: G#</span>
              <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10">H: A</span>
              <span className="px-2 py-1 rounded bg-stone-800 text-amber-300 border border-stone-700">U: A#</span>
              <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10">J: B</span>
              <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10">K: High C</span>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-midnight-900 border border-slate-200 dark:border-white/10 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-studio-violet" />
              Sargam Swara Notation Guide
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Indian classical music uses 7 Shuddha (pure) and 5 Vikrit (altered) swaras:
            </p>
            <ul className="text-xs space-y-1 text-slate-600 dark:text-slate-300 list-disc list-inside">
              <li><strong>Sa &amp; Pa:</strong> Achal (immovable) root and fifth.</li>
              <li><strong>Re, Ga, Dha, Ni:</strong> Can be Shuddha (natural) or Komal (flat).</li>
              <li><strong>Ma:</strong> Can be Shuddha (natural fourth) or Tivra (sharp fourth).</li>
            </ul>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
