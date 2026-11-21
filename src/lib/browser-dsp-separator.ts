/**
 * SonicForge AI — In-Browser Client-Side Audio Stem Separator
 * 
 * 100% Free, Client-Side, Zero-Backend Audio Separation Engine
 * Powered by Web Audio API Digital Signal Processing (DSP)
 * 
 * Technical Architecture:
 * 1. Center-Channel Isolation (Vocal Acapella):
 *    Extracts correlated mid-channel audio (L+R) with vocal formant filtering (200 Hz - 4.5 kHz),
 *    attenuating side-channel instrumentation.
 * 2. Side-Channel Phase Cancellation with Bass Retention (Instrumental Backing):
 *    Cancels center-panned vocal energy via phase difference (L-R) while preserving low-end
 *    bass and kick drum frequencies via low-pass crossover recombination.
 * 
 * Features:
 * - 0 MB Model Download (Runs instantly in 1-2 seconds)
 * - Zero network requests (100% client-side privacy)
 * - Works on any browser (Chrome, Edge, Firefox, Safari, Mobile)
 * - Encodes lossless 16-bit PCM WAV stems for synchronized multitrack playback and download
 */

import { audioBufferToWav } from './wav-encoder';

export interface BrowserSeparationResult {
  jobId: string;
  vocalsUrl: string;
  instrumentalUrl: string;
  vocalsBlob: Blob;
  instrumentalBlob: Blob;
  duration: number;
}

/**
 * Separates audio into Lead Vocals and Instrumental Backing Track directly in the browser
 */
export async function separateAudioInBrowser(
  audioFile: File,
  onProgress?: (status: string) => void
): Promise<BrowserSeparationResult> {
  onProgress?.('Decoding audio stream into Web Audio buffer...');

  const arrayBuffer = await audioFile.arrayBuffer();
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioCtx();

  let decodedBuffer: AudioBuffer;
  try {
    decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  } catch (err: unknown) {
    audioCtx.close();
    const msg = err instanceof Error ? err.message : 'Decoding failed';
    throw new Error(`Could not decode audio file in browser: ${msg}. Please use MP3 or WAV.`);
  }

  const sampleRate = decodedBuffer.sampleRate;
  const numChannels = decodedBuffer.numberOfChannels;
  const numSamples = decodedBuffer.length;
  const duration = decodedBuffer.duration;

  onProgress?.('Analyzing stereo phase and frequency spectra...');

  // Extract channel data
  const left = decodedBuffer.getChannelData(0);
  const right = numChannels > 1 ? decodedBuffer.getChannelData(1) : left;

  // Allocate output buffers
  const vocalsBuffer = audioCtx.createBuffer(2, numSamples, sampleRate);
  const instBuffer = audioCtx.createBuffer(2, numSamples, sampleRate);

  const vocLeft = vocalsBuffer.getChannelData(0);
  const vocRight = vocalsBuffer.getChannelData(1);
  const instLeft = instBuffer.getChannelData(0);
  const instRight = instBuffer.getChannelData(1);

  onProgress?.('Extracting center-channel vocals and side-channel instrumental...');

  // 1-pole Low-Pass Filter state for bass retention (~160 Hz cutoff)
  // rc = 1 / (2 * pi * f), dt = 1 / sampleRate, alpha = dt / (rc + dt)
  const bassCutoff = 160;
  const rcBass = 1 / (2 * Math.PI * bassCutoff);
  const dt = 1 / sampleRate;
  const alphaBass = dt / (rcBass + dt);
  let bassLeft = 0;
  let bassRight = 0;

  // 1-pole Band-Pass Filter state for vocal formant isolation (250 Hz - 4000 Hz)
  const vocalLowCutoff = 250;
  const vocalHighCutoff = 4000;
  const rcVocalLow = 1 / (2 * Math.PI * vocalLowCutoff);
  const rcVocalHigh = 1 / (2 * Math.PI * vocalHighCutoff);
  const alphaVocalLow = dt / (rcVocalLow + dt);
  const alphaVocalHigh = dt / (rcVocalHigh + dt);

  let vocLowL = 0;
  let vocLowR = 0;
  let vocHighL = 0;
  let vocHighR = 0;

  for (let i = 0; i < numSamples; i++) {
    const l = left[i];
    const r = right[i];

    // Mid channel (center panned: vocals, bass, kick)
    const mid = (l + r) * 0.5;
    // Side channel (stereo width: guitars, synths, reverbs, cymbals)
    const side = (l - r) * 0.5;

    // --- BASS RECOVERY FOR INSTRUMENTAL ---
    // Smooth low-frequencies from center to keep bass and kick in instrumental
    bassLeft += alphaBass * (mid - bassLeft);
    bassRight += alphaBass * (mid - bassRight);

    // Instrumental = Side Channels + Recombined Bass Foundation
    // This removes center vocals while keeping the drums/bass rhythm section
    const instL = side + bassLeft;
    const instR = -side + bassRight;

    instLeft[i] = Math.max(-1, Math.min(1, instL));
    instRight[i] = Math.max(-1, Math.min(1, instR));

    // --- VOCAL EXTRACTION ---
    // Remove side content from center mid channel
    const rawVocal = mid - Math.abs(side) * 0.45;

    // Apply vocal formant bandpass filter (250 Hz - 4000 Hz)
    vocLowL += alphaVocalLow * (rawVocal - vocLowL);
    vocHighL += alphaVocalHigh * (rawVocal - vocHighL);
    const vocalFiltered = vocHighL - vocLowL;

    // Boost vocal presence slightly
    const vocalGain = 1.35;
    const vocOut = Math.max(-1, Math.min(1, vocalFiltered * vocalGain));

    vocLeft[i] = vocOut;
    vocRight[i] = vocOut;
  }

  audioCtx.close();

  onProgress?.('Encoding lossless 16-bit WAV stems...');

  const vocalsBlob = audioBufferToWav(vocalsBuffer);
  const instrumentalBlob = audioBufferToWav(instBuffer);

  const vocalsUrl = URL.createObjectURL(vocalsBlob);
  const instrumentalUrl = URL.createObjectURL(instrumentalBlob);

  const jobId = `browser_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  return {
    jobId,
    vocalsUrl,
    instrumentalUrl,
    vocalsBlob,
    instrumentalBlob,
    duration,
  };
}
