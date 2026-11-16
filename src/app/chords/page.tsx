'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  Music2,
  Play,
  Square,
  Sliders,
  Download,
  RotateCcw,
  BookOpen,
  Volume2,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import * as Tone from 'tone';
import {
  NOTE_NAMES,
  NoteName,
  SCALES,
  ScaleDefinition,
  getScaleNotes,
  getDiatonicChords,
  ChordInfo,
  CHORD_PROGRESSIONS,
  ChordProgressionTemplate,
  exportMidiFile,
} from '@/lib/music-theory';
import { useToast } from '@/context/ToastContext';

export default function ChordsPage() {
  const { info, success, warning } = useToast();

  const [selectedRoot, setSelectedRoot] = useState<NoteName>('C');
  const [selectedScale, setSelectedScale] = useState<ScaleDefinition>(SCALES[0]); // Major
  const [progressionBpm, setProgressionBpm] = useState<number>(100);
  const [isPlayingProgression, setIsPlayingProgression] = useState<boolean>(false);
  const [activeChordIdx, setActiveChordIdx] = useState<number>(-1);
  const [selectedProgression, setSelectedProgression] = useState<ChordProgressionTemplate>(
    CHORD_PROGRESSIONS[0]
  );

  // Tone.js synth
  const polySynthRef = useRef<Tone.PolySynth | null>(null);
  const progressionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const getSynth = useCallback(async () => {
    await Tone.start();
    if (!polySynthRef.current) {
      const synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.05, decay: 0.3, sustain: 0.7, release: 0.5 },
      }).toDestination();
      synth.volume.value = -8;
      polySynthRef.current = synth;
    }
    return polySynthRef.current;
  }, []);

  // Compute scale notes and chords
  const scaleNotes = getScaleNotes(selectedRoot, selectedScale);
  const diatonicChords = getDiatonicChords(selectedRoot, selectedScale);

  // Play single note
  const playNote = async (note: NoteName) => {
    const synth = await getSynth();
    synth.triggerAttackRelease(`${note}4`, '4n');
  };

  // Play single chord (strum effect)
  const playChord = async (chord: ChordInfo) => {
    const synth = await getSynth();
    const chordNotes = chord.notes.map((n) => `${n}4`);
    chordNotes.forEach((n, idx) => {
      setTimeout(() => {
        synth.triggerAttackRelease(n, '2n');
      }, idx * 45); // gentle guitar-style strum
    });
  };

  // Play progression loop
  const togglePlayProgression = async () => {
    if (isPlayingProgression) {
      stopProgression();
      return;
    }

    if (diatonicChords.length === 0) {
      warning('Progression Unavailable', 'Please select a 7-note diatonic scale.');
      return;
    }

    const synth = await getSynth();
    setIsPlayingProgression(true);

    const chordsToPlay: ChordInfo[] = selectedProgression.degrees
      .map((deg) => diatonicChords[(deg - 1) % diatonicChords.length])
      .filter(Boolean);

    let idx = 0;
    const beatMs = (60 / progressionBpm) * 1000 * 2; // 2 beats per chord

    const step = () => {
      const current = chordsToPlay[idx % chordsToPlay.length];
      setActiveChordIdx(idx % chordsToPlay.length);
      const notes = current.notes.map((n) => `${n}4`);
      synth.triggerAttackRelease(notes, '1.5n');
      idx++;
    };

    step();
    progressionIntervalRef.current = setInterval(step, beatMs);
  };

  const stopProgression = useCallback(() => {
    if (progressionIntervalRef.current) {
      clearInterval(progressionIntervalRef.current);
      progressionIntervalRef.current = null;
    }
    setIsPlayingProgression(false);
    setActiveChordIdx(-1);
  }, []);

  // Export progression to MIDI
  const handleExportMidi = () => {
    if (diatonicChords.length === 0) return;
    const progressionChords = selectedProgression.degrees
      .map((deg) => diatonicChords[(deg - 1) % diatonicChords.length])
      .filter(Boolean)
      .map((ch) => ({ notes: ch.notes, durationBeats: 2 }));

    const blob = exportMidiFile(
      `${selectedRoot}_${selectedScale.name}_Progression`,
      progressionBpm,
      progressionChords
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SonicForge_${selectedRoot}_${selectedScale.id}_Progression.mid`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    success('MIDI Exported', 'Downloaded standard .mid file.');
  };

  useEffect(() => {
    return () => {
      stopProgression();
    };
  }, [stopProgression]);

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-midnight-900 border border-slate-200 dark:border-white/10 shadow-sm backdrop-blur-xl">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-studio-violet/10 dark:bg-purple-500/10 border border-studio-violet/20 dark:border-purple-500/20 text-studio-violet dark:text-purple-300 text-xs font-bold uppercase tracking-wider mb-2">
              <BookOpen className="w-3.5 h-3.5" />
              Music Theory &amp; Harmony
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              Chord &amp; Scale Explorer
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Explore diatonic modes, Indian Thaats, Sargam mappings, chord progressions, and download Standard MIDI files.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportMidi}
              className="px-5 py-2.5 rounded-2xl font-bold text-xs text-white bg-gradient-to-r from-studio-blue to-cyan-500 hover:from-studio-blue/90 shadow-md flex items-center gap-2 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export MIDI (.mid)</span>
            </button>
          </div>
        </div>

        {/* Root & Scale Selector */}
        <div className="p-6 rounded-3xl bg-white dark:bg-midnight-900 border border-slate-200 dark:border-white/10 shadow-sm space-y-5">
          {/* Root Note row */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Select Root Key / Tonic
            </label>
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
              {NOTE_NAMES.map((note) => (
                <button
                  key={note}
                  onClick={() => {
                    setSelectedRoot(note);
                    stopProgression();
                  }}
                  className={`py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                    selectedRoot === note
                      ? 'bg-studio-blue text-white shadow-md'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {note}
                </button>
              ))}
            </div>
          </div>

          {/* Scale selection */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Select Scale / Thaat
            </label>
            <div className="flex flex-wrap gap-2">
              {SCALES.map((scale) => (
                <button
                  key={scale.id}
                  onClick={() => {
                    setSelectedScale(scale);
                    stopProgression();
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    selectedScale.id === scale.id
                      ? 'bg-studio-violet text-white shadow-md font-bold'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {scale.name}
                  {scale.thaatEquivalent ? ` • ${scale.thaatEquivalent}` : ''}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              {selectedScale.description} — <em>Mood: {selectedScale.mood}</em>
            </p>
          </div>
        </div>

        {/* Scale Notes & Sargam Display */}
        <div className="p-6 rounded-3xl bg-white dark:bg-midnight-900 border border-slate-200 dark:border-white/10 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Music2 className="w-4 h-4 text-studio-blue" />
            Scale Swaras &amp; Degrees ({selectedRoot} {selectedScale.name})
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 pt-1">
            {scaleNotes.map((item, idx) => (
              <button
                key={idx}
                onClick={() => playNote(item.note)}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/5 hover:border-studio-blue/40 text-center transition-all cursor-pointer group"
                title="Click to audition note"
              >
                <div className="text-[10px] text-slate-400 font-mono">Degree {idx + 1}</div>
                <div className="text-xl font-black text-slate-900 dark:text-white my-0.5 group-hover:text-studio-blue">
                  {item.note}
                </div>
                <div className="text-xs font-extrabold text-studio-violet dark:text-purple-300">
                  {item.sargam}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Diatonic Chords & Progression Builder */}
        {diatonicChords.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Diatonic Chords in Key */}
            <div className="p-6 rounded-3xl bg-white dark:bg-midnight-900 border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-cyan-400" />
                Diatonic Chords in {selectedRoot}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click any chord block to hear its harmony strummed:
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {diatonicChords.map((chord, idx) => (
                  <button
                    key={idx}
                    onClick={() => playChord(chord)}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/5 hover:border-cyan-400 text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>{chord.numeral}</span>
                      <span>{chord.quality}</span>
                    </div>
                    <div className="text-base font-extrabold text-slate-900 dark:text-white mt-1 group-hover:text-cyan-400">
                      {chord.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {chord.notes.join(' - ')}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Progression Player */}
            <div className="p-6 rounded-3xl bg-white dark:bg-midnight-900 border border-slate-200 dark:border-white/10 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    Chord Progression Generator
                  </h3>
                  <button
                    onClick={togglePlayProgression}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isPlayingProgression
                        ? 'bg-rose-600 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                    }`}
                  >
                    {isPlayingProgression ? (
                      <>
                        <Square className="w-3.5 h-3.5" /> Stop Progression
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-white" /> Play Progression
                      </>
                    )}
                  </button>
                </div>

                {/* Progression Tabs */}
                <div className="space-y-2">
                  {CHORD_PROGRESSIONS.map((prog, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedProgression(prog);
                        stopProgression();
                      }}
                      className={`w-full p-3 rounded-2xl text-left border transition-all ${
                        selectedProgression.name === prog.name
                          ? 'bg-emerald-500/10 border-emerald-500/40'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-white/5'
                      }`}
                    >
                      <div className="flex justify-between items-center text-xs font-bold text-slate-900 dark:text-white">
                        <span>{prog.name}</span>
                        <span className="text-[10px] text-slate-400">{prog.genre}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {prog.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Progression Beat Visualizer */}
              <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex items-center gap-2">
                <span className="text-xs text-slate-400 font-bold">Chords:</span>
                <div className="flex gap-2">
                  {selectedProgression.degrees.map((deg, i) => {
                    const ch = diatonicChords[(deg - 1) % diatonicChords.length];
                    const isActive = isPlayingProgression && activeChordIdx === i;
                    return (
                      <span
                        key={i}
                        className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all ${
                          isActive
                            ? 'bg-emerald-500 text-white scale-110 shadow-md'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {ch ? ch.name : deg}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

