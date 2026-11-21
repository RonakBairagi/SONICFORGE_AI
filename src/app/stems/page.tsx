'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Sparkles,
  Sliders,
  Volume2,
  Download,
  Play,
  Pause,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileAudio,
  Zap,
  Link as LinkIcon,
  Clock,
  RefreshCw,
  XCircle,
  Cpu,
  Radio,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useToast } from '@/context/ToastContext';
import { audioBufferToWav } from '@/lib/wav-encoder';

interface StemArtifact {
  id: string;
  name: string;
  downloadUrl: string;
  volume: number;
  muted: boolean;
  solo: boolean;
  diagnostics?: {
    file_size_bytes?: number;
    duration_seconds?: number;
    sample_rate?: number;
    channels?: number;
    peak_amplitude?: number;
    rms_amplitude?: number;
    is_silent?: boolean;
  };
}

const PRESETS = [
  {
    id: '4_tracks',
    name: '4 Stems (Standard Band)',
    desc: 'Vocals, Drums, Bass, and Other Instruments (RoFormer / Demucs engine).',
    badge: 'Popular',
  },
  {
    id: '2_tracks',
    name: '2 Stems (Vocal & Backing)',
    desc: 'Isolated Lead Acapella and full Instrumental backing track.',
    badge: 'Fast',
  },
  {
    id: '6_tracks',
    name: '6 Stems (Full Arrangement)',
    desc: 'Vocals, Drums, Bass, Guitar, Piano, and Remainder.',
    badge: 'Deep AI',
  },
  {
    id: 'lead_back',
    name: 'Lead vs Backing Vocals',
    desc: 'Separates main vocal performance from choir & harmonies.',
    badge: 'Vocal',
  },
];

const LOCAL_STORAGE_KEY = 'sonicforge_stem_job';

export default function StemsPage() {
  const { info, success, warning, error } = useToast();

  // Engine Mode: 'local' (Free Local Demucs CPU Engine) | 'cloud' (Neural Analog Gateway)
  const [engineMode, setEngineMode] = useState<'local' | 'cloud'>('local');
  const [localServerStatus, setLocalServerStatus] = useState<{
    online: boolean;
    port?: number;
    device?: string;
    deviceName?: string;
    defaultModel?: string;
  } | null>(null);

  // Quota exceeded fallback state
  const [quotaExceededInfo, setQuotaExceededInfo] = useState<{
    isQuota: boolean;
    message: string;
  } | null>(null);

  // Mode: File Upload or Public Link
  const [inputMode, setInputMode] = useState<'file' | 'link'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [publicUrl, setPublicUrl] = useState<string>('');
  const [selectedPreset, setSelectedPreset] = useState<string>('4_tracks');

  // Multi-stage processing state:
  // 'idle' | 'uploading' | 'ingesting' | 'ready_to_split' | 'queue' | 'processing' | 'completed' | 'failed'
  const [pipelineStage, setPipelineStage] = useState<string>('idle');
  const [statusDetails, setStatusDetails] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Ingested audio asset
  const [audioId, setAudioId] = useState<string | null>(null);
  const [trackTitle, setTrackTitle] = useState<string>('');

  // Stem job tracking
  const [creationId, setCreationId] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Result stems
  const [stems, setStems] = useState<StemArtifact[]>([]);
  const [isMasterPlaying, setIsMasterPlaying] = useState<boolean>(false);
  const [masterVolume, setMasterVolume] = useState<number>(1.0);
  const [playingStemId, setPlayingStemId] = useState<string | null>(null);

  // Synchronized audio mixer references
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSubmittingRef = useRef<boolean>(false);
  const consecutiveErrorsRef = useRef<number>(0);

  // Periodically check local Demucs backend health
  useEffect(() => {
    let isMounted = true;
    const checkLocalHealth = async () => {
      try {
        const res = await fetch('/api/stems/local/health');
        if (res.ok && isMounted) {
          const data = await res.json();
          setLocalServerStatus(data);
        }
      } catch {
        if (isMounted) {
          setLocalServerStatus({ online: false });
        }
      }
    };
    checkLocalHealth();
    const interval = setInterval(checkLocalHealth, 8000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Restore saved job from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const job = JSON.parse(saved);
        if (job.creationId) {
          setCreationId(job.creationId);
          setAudioId(job.audioId || null);
          setTrackTitle(job.trackTitle || 'Recovered Project');
          setSelectedPreset(job.preset || '4_tracks');
          if (job.engine) setEngineMode(job.engine);

          const restoredStems = Array.isArray(job.stems) && job.stems.length > 0 ? job.stems : [];

          if (job.isComplete && restoredStems.length > 0) {
            setPipelineStage('completed');
            setStems(restoredStems);
          } else {
            setPipelineStage('queue');
            if (job.engine === 'local' || String(job.creationId).startsWith('job_')) {
              startLocalStemPolling(job.creationId);
            } else {
              startStemPolling(job.creationId, restoredStems);
            }
          }
        }
      }
    } catch (e) {
      console.warn('Failed to restore job from localStorage:', e);
    }

    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
      audioRefs.current.forEach((audio) => {
        audio.pause();
        audio.src = '';
      });
      audioRefs.current.clear();
    };
  }, []);

  // Elapsed timer tracking
  useEffect(() => {
    if (pipelineStage === 'queue' || pipelineStage === 'processing') {
      elapsedTimerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    }
    return () => {
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    };
  }, [pipelineStage]);

  // Client-side audio optimizer for large files
  const optimizeAudioIfNeeded = async (file: File): Promise<File> => {
    if (file.size <= 4.2 * 1024 * 1024) {
      return file;
    }

    setStatusDetails(`Optimizing ${(file.size / (1024 * 1024)).toFixed(1)} MB audio for transfer...`);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      const wavBlob = audioBufferToWav(decodedBuffer);
      audioCtx.close();

      return new File([wavBlob], file.name.replace(/\.[^.]+$/, '') + '.wav', {
        type: 'audio/wav',
      });
    } catch (err) {
      console.warn('Client audio compression fallback to original file:', err);
      return file;
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|flac|ogg|m4a)$/i)) {
      setErrorMessage('Please select a valid audio file (MP3, WAV, FLAC, or OGG).');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setErrorMessage('File size exceeds 100MB limit. Please select a shorter track.');
      return;
    }

    setSelectedFile(file);
    setTrackTitle(file.name);
    setAudioId(null);
    setPipelineStage('idle');
    info('Audio File Loaded', `${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)`);
  };

  // Stage 1: Ingest Audio Asset (File or Link) for Cloud Mode
  const handleIngestAudio = async () => {
    setErrorMessage(null);

    if (inputMode === 'file' && !selectedFile) {
      warning('No file selected', 'Please select an audio file first.');
      return;
    }
    if (inputMode === 'link' && !publicUrl.trim()) {
      warning('No link entered', 'Please enter a valid Suno, YouTube, or Spotify link.');
      return;
    }

    setPipelineStage('uploading');
    setStatusDetails(inputMode === 'file' ? 'Uploading audio file...' : 'Connecting to music source...');

    try {
      let audioAssetId: string;

      if (inputMode === 'file') {
        const fileToUpload = await optimizeAudioIfNeeded(selectedFile!);
        setStatusDetails('Streaming audio to Neural Analog ingestion gateway...');

        const formData = new FormData();
        formData.append('audio', fileToUpload);

        const res = await fetch('/api/stems/split', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: `Upload error (${res.status})` }));
          throw new Error(errData.error || `Upload failed with status ${res.status}`);
        }

        const data = await res.json();
        audioAssetId = data.audioId;
      } else {
        setStatusDetails('Importing track from public source into Neural Analog...');
        const res = await fetch('/api/stems/link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: publicUrl.trim() }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: `Import error (${res.status})` }));
          throw new Error(errData.error || `Import failed with status ${res.status}`);
        }

        const data = await res.json();
        audioAssetId = data.audioId;
        setTrackTitle(publicUrl.trim());
      }

      setAudioId(audioAssetId);
      setPipelineStage('ingesting');
      setStatusDetails('Verifying audio readiness on Neural Analog...');

      // Poll audio status until complete
      let attempts = 0;
      const pollAudioInterval = setInterval(async () => {
        attempts++;
        try {
          const statusRes = await fetch(`/api/stems/audio-status?audioId=${audioAssetId}`);
          if (!statusRes.ok) return;

          const statusData = await statusRes.json();
          if (statusData.isFailed) {
            clearInterval(pollAudioInterval);
            setPipelineStage('failed');
            setErrorMessage(statusData.errorMessage || 'Audio file analysis rejected by provider.');
            error('Ingestion Failed', statusData.errorMessage);
            return;
          }

          if (statusData.isComplete) {
            clearInterval(pollAudioInterval);
            setPipelineStage('ready_to_split');
            setStatusDetails('Audio asset ready. Choose separation preset and begin.');
            success('Audio Ready', 'Track imported successfully.');
          } else if (attempts > 20) {
            clearInterval(pollAudioInterval);
            setPipelineStage('failed');
            setErrorMessage('Audio ingestion timed out. Please try again.');
          }
        } catch (e) {
          console.warn('Audio status check error:', e);
        }
      }, 1500);
    } catch (err: unknown) {
      setPipelineStage('failed');
      const msg = err instanceof Error ? err.message : 'Audio upload failed';
      setErrorMessage(msg);
      error('Upload Failed', msg);
    }
  };

  // Local Demucs engine processing path
  const handleStartLocalSeparation = async () => {
    if (!selectedFile) {
      warning('No audio file', 'Please select or drop an audio file first.');
      return;
    }

    isSubmittingRef.current = true;
    consecutiveErrorsRef.current = 0;
    setPipelineStage('uploading');
    setElapsedSeconds(0);
    setProgress(0);
    setStatusDetails('Streaming audio to local Demucs neural engine...');
    setErrorMessage(null);
    setQuotaExceededInfo(null);

    try {
      const formData = new FormData();
      formData.append('audio', selectedFile);
      formData.append('preset', selectedPreset);

      const res = await fetch('/api/stems/local/separate', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ error: `Engine error (${res.status})` }));
        throw new Error(errJson.error || 'Demucs separation failed');
      }

      const data = await res.json();
      const localJobId = data.jobId;
      setCreationId(localJobId);
      setTrackTitle(selectedFile.name);

      const jobRecord = {
        creationId: localJobId,
        audioId: localJobId,
        trackTitle: selectedFile.name,
        preset: selectedPreset,
        stems: [],
        startTime: Date.now(),
        isComplete: false,
        engine: 'local',
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(jobRecord));

      startLocalStemPolling(localJobId);
    } catch (err: unknown) {
      setPipelineStage('failed');
      const msg = err instanceof Error ? err.message : 'Local stem separation failed';
      setErrorMessage(msg);
      error('Demucs Error', msg);
    } finally {
      isSubmittingRef.current = false;
    }
  };

  // Polling for Local Demucs engine
  const startLocalStemPolling = (jobId: string) => {
    let delay = 2500;
    let pollCount = 0;
    consecutiveErrorsRef.current = 0;

    const poll = async () => {
      pollCount++;
      try {
        const res = await fetch(`/api/stems/local/status?jobId=${jobId}`);
        if (!res.ok) {
          consecutiveErrorsRef.current++;
          if (consecutiveErrorsRef.current >= 6) {
            setPipelineStage('failed');
            const errMsg = 'Connection to Demucs engine interrupted.';
            setErrorMessage(errMsg);
            error('Demucs Error', errMsg);
            return;
          }
          scheduleNext(delay);
          return;
        }

        consecutiveErrorsRef.current = 0;
        const data = await res.json();

        if (data.status === 'failed') {
          setPipelineStage('failed');
          setErrorMessage(data.error || 'Stem separation failed on Demucs engine.');
          error('Job Failed', data.error || 'Separation failed');
          localStorage.removeItem(LOCAL_STORAGE_KEY);
          return;
        }

        if (data.statusDetails) {
          setStatusDetails(data.statusDetails);
        }
        if (typeof data.progress === 'number') {
          setProgress(data.progress);
        }

        if ((data.status === 'completed' || data.isComplete) && Array.isArray(data.stems) && data.stems.length > 0) {
          setPipelineStage('completed');
          setStatusDetails('Separation complete! Lossless stems ready.');

          const formattedStems: StemArtifact[] = data.stems.map((s: any) => ({
            id: s.id || s.stem_id || `${jobId}_${(s.stem || s.name || '').toLowerCase()}`,
            name: s.name,
            downloadUrl: s.downloadUrl || s.download_url,
            volume: 1.0,
            muted: false,
            solo: false,
            diagnostics: s.diagnostics,
          }));

          setStems(formattedStems);

          const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              parsed.isComplete = true;
              parsed.stems = formattedStems;
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed));
            } catch (e) {
              console.warn(e);
            }
          }

          success('Stems Ready!', 'Demucs engine finished separating all audio stems.');
          return;
        }

        if (data.status === 'processing') {
          setPipelineStage('processing');
        }

        if (pollCount > 10) delay = 3500;
        scheduleNext(delay);
      } catch (err) {
        console.warn('Local poll error:', err);
        consecutiveErrorsRef.current++;
        if (consecutiveErrorsRef.current >= 6) {
          setPipelineStage('failed');
          setErrorMessage('Network connection lost while tracking local stem job.');
          return;
        }
        scheduleNext(delay);
      }
    };

    const scheduleNext = (ms: number) => {
      pollTimerRef.current = setTimeout(poll, ms);
    };

    scheduleNext(1500);
  };

  // Stage 2: Trigger Stem Separation (Routes explicitly based on selected provider)
  const handleStartStemSeparation = async () => {
    if (isSubmittingRef.current) return;

    if (engineMode === 'local') {
      return handleStartLocalSeparation();
    }

    if (!audioId) {
      warning('Audio not ready', 'Please import or upload an audio track first.');
      return;
    }

    isSubmittingRef.current = true;
    consecutiveErrorsRef.current = 0;
    setPipelineStage('queue');
    setElapsedSeconds(0);
    setStatusDetails('Submitting stem separation job to Neural Analog hardware queue...');
    setErrorMessage(null);
    setQuotaExceededInfo(null);

    try {
      const res = await fetch('/api/stems/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioId, preset: selectedPreset }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ error: `Failed with status ${res.status}` }));

        if (
          res.status === 403 ||
          errJson.isQuotaError ||
          (errJson.error && errJson.error.toLowerCase().includes('minutes')) ||
          (errJson.error && errJson.error.toLowerCase().includes('quota'))
        ) {
          setQuotaExceededInfo({
            isQuota: true,
            message:
              errJson.error ||
              'Neural Analog cloud processing quota exhausted. Switch to Free Local CPU Engine to separate without fees.',
          });
          setPipelineStage('ready_to_split');
          setStatusDetails('Cloud quota reached. Switch to Free Local Engine below.');
          warning('Cloud Quota Depleted', 'Switch to the Free Local Engine to separate without fees.');
          return;
        }

        throw new Error(errJson.error || 'Failed to start separation');
      }

      const data = await res.json();
      const newCreationId = data.creationId;
      setCreationId(newCreationId);

      const defaultLabels =
        selectedPreset === '2_tracks'
          ? ['Vocals', 'Instrumental']
          : selectedPreset === 'lead_back'
          ? ['Lead Vocals', 'Backing Vocals']
          : ['Vocals', 'Drums', 'Bass', 'Other'];

      let formattedStems: StemArtifact[] = [];

      if (Array.isArray(data.stems) && data.stems.length > 0) {
        formattedStems = data.stems.map(
          (s: { stem_id: string; stem?: string; download_url?: string }, idx: number) => ({
            id: s.stem_id,
            name: s.stem ? s.stem.charAt(0).toUpperCase() + s.stem.slice(1) : `Stem ${idx + 1}`,
            downloadUrl: s.download_url || `/api/stems/download/${s.stem_id}`,
            volume: 1.0,
            muted: false,
            solo: false,
          })
        );
      } else {
        formattedStems = defaultLabels.map((label, idx) => ({
          id: `${newCreationId}_${idx}`,
          name: label,
          downloadUrl: `/api/stems/download/${newCreationId}`,
          volume: 1.0,
          muted: false,
          solo: false,
        }));
      }

      // Persist in localStorage so page refresh doesn't lose job
      const jobRecord = {
        creationId: newCreationId,
        audioId,
        trackTitle,
        preset: selectedPreset,
        stems: formattedStems,
        startTime: Date.now(),
        isComplete: false,
        engine: 'cloud',
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(jobRecord));

      startStemPolling(newCreationId, formattedStems);
    } catch (err: unknown) {
      setPipelineStage('failed');
      const msg = err instanceof Error ? err.message : 'Stem separation failed';
      setErrorMessage(msg);
      error('Separation Error', msg);
    } finally {
      isSubmittingRef.current = false;
    }
  };

  // Polling for Neural Analog Cloud
  const startStemPolling = (jobId: string, currentStems: StemArtifact[]) => {
    let delay = 3000;
    let pollCount = 0;
    consecutiveErrorsRef.current = 0;

    const defaultLabels =
      selectedPreset === '2_tracks'
        ? ['Vocals', 'Instrumental']
        : selectedPreset === 'lead_back'
        ? ['Lead Vocals', 'Backing Vocals']
        : ['Vocals', 'Drums', 'Bass', 'Other'];

    const activeStems: StemArtifact[] =
      currentStems && currentStems.length > 0
        ? currentStems
        : defaultLabels.map((lbl, idx) => ({
            id: `${jobId}_${idx}`,
            name: lbl,
            downloadUrl: `/api/stems/download/${jobId}`,
            volume: 1.0,
            muted: false,
            solo: false,
          }));

    const poll = async () => {
      pollCount++;
      try {
        const res = await fetch(`/api/stems/status?creationId=${jobId}`);
        if (!res.ok) {
          consecutiveErrorsRef.current++;
          if (consecutiveErrorsRef.current >= 4) {
            setPipelineStage('failed');
            const errMsg = `Status check failed with code ${res.status}. Please check your connection or retry.`;
            setErrorMessage(errMsg);
            error('Polling Error', errMsg);
            return;
          }
          scheduleNext(delay);
          return;
        }

        consecutiveErrorsRef.current = 0;
        const data = await res.json();

        if (data.isFailed) {
          setPipelineStage('failed');
          setErrorMessage(data.errorMessage || 'Stem separation failed on provider.');
          error('Job Failed', data.errorMessage || 'Separation failed');
          localStorage.removeItem(LOCAL_STORAGE_KEY);
          return;
        }

        if (data.statusDetails) {
          setStatusDetails(data.statusDetails);
          const lowerDetails = data.statusDetails.toLowerCase();
          if (lowerDetails.includes('queue') || lowerDetails.includes('waiting')) {
            setPipelineStage('queue');
          } else {
            setPipelineStage('processing');
          }
        }

        if (data.isComplete) {
          setPipelineStage('completed');
          setStatusDetails('Separation complete! Lossless stems ready.');
          setStems(activeStems);

          const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              parsed.isComplete = true;
              parsed.stems = activeStems;
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed));
            } catch (e) {
              console.warn('Failed to parse localStorage during complete update:', e);
            }
          }

          success('Stems Ready!', 'Your isolated audio stems have finished processing.');
          return;
        }

        if (pollCount > 5) delay = 5000;
        if (pollCount > 15) delay = 8000;
        if (pollCount > 30) delay = 10000;

        scheduleNext(delay);
      } catch (err) {
        console.warn('Poll status error:', err);
        consecutiveErrorsRef.current++;
        if (consecutiveErrorsRef.current >= 4) {
          setPipelineStage('failed');
          setErrorMessage('Network connection lost while tracking stem job.');
          return;
        }
        scheduleNext(delay);
      }
    };

    const scheduleNext = (ms: number) => {
      pollTimerRef.current = setTimeout(poll, ms);
    };

    scheduleNext(1500);
  };

  const handleManualRefresh = async () => {
    if (!creationId) return;
    info('Checking Status', 'Querying processing queue...');
    try {
      const isLocal = engineMode === 'local' || String(creationId).startsWith('job_') || creationId.includes('-');
      const url = isLocal
        ? `/api/stems/local/status?jobId=${creationId}`
        : `/api/stems/status?creationId=${creationId}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.statusDetails) setStatusDetails(data.statusDetails);
        if (data.isComplete || data.status === 'completed') {
          setPipelineStage('completed');
          if (Array.isArray(data.stems) && data.stems.length > 0) {
            const formattedStems: StemArtifact[] = data.stems.map((s: any) => ({
              id: s.id || s.stem_id || `${creationId}_${(s.stem || s.name || '').toLowerCase()}`,
              name: s.name,
              downloadUrl: s.downloadUrl || s.download_url,
              volume: 1.0,
              muted: false,
              solo: false,
              diagnostics: s.diagnostics,
            }));
            setStems(formattedStems);
          }
          success('Completed!', 'Stem separation finished.');
        }
      }
    } catch (e) {
      console.warn('Manual refresh error:', e);
    }
  };

  const handleCancelTracking = () => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    isSubmittingRef.current = false;
    consecutiveErrorsRef.current = 0;
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setPipelineStage('idle');
    setCreationId(null);
    setAudioId(null);
    setStatusDetails('');
    setErrorMessage(null);
    info('Job Dismissed', 'Stopped tracking current stem job.');
  };

  // Master playback control
  const toggleMasterPlay = () => {
    const nextState = !isMasterPlaying;
    setIsMasterPlaying(nextState);
    setPlayingStemId(null);

    stems.forEach((stem) => {
      let audio = audioRefs.current.get(stem.id);
      if (!audio) {
        audio = new Audio(stem.downloadUrl);
        audio.loop = true;
        audioRefs.current.set(stem.id, audio);
      }

      const anySolo = stems.some((s) => s.solo);
      const effectiveMute = stem.muted || (anySolo && !stem.solo);
      audio.muted = effectiveMute;
      audio.volume = stem.volume * masterVolume;

      if (nextState) {
        audio.currentTime = 0;
        audio.play().catch((err) => console.warn('Audio play error:', err));
      } else {
        audio.pause();
      }
    });
  };

  // Individual stem play/pause preview
  const toggleSingleStemPlay = (stem: StemArtifact) => {
    if (isMasterPlaying) {
      setIsMasterPlaying(false);
      audioRefs.current.forEach((a) => a.pause());
    }

    let audio = audioRefs.current.get(stem.id);
    if (!audio) {
      audio = new Audio(stem.downloadUrl);
      audio.loop = true;
      audioRefs.current.set(stem.id, audio);
    }

    if (playingStemId === stem.id) {
      audio.pause();
      setPlayingStemId(null);
    } else {
      audioRefs.current.forEach((a, id) => {
        if (id !== stem.id) a.pause();
      });
      audio.currentTime = 0;
      audio.volume = stem.volume * masterVolume;
      audio.muted = false;
      audio.play().catch((err) => {
        console.warn('Individual play error:', err);
        error('Playback Error', 'Could not play audio stem. Check that the audio file exists.');
      });
      setPlayingStemId(stem.id);
    }
  };

  const handleVolumeChange = (stemId: string, vol: number) => {
    setStems((prev) =>
      prev.map((s) => {
        if (s.id === stemId) {
          const audio = audioRefs.current.get(stemId);
          if (audio) audio.volume = vol * masterVolume;
          return { ...s, volume: vol };
        }
        return s;
      })
    );
  };

  const handleToggleMute = (stemId: string) => {
    setStems((prev) => {
      const updated = prev.map((s) => (s.id === stemId ? { ...s, muted: !s.muted } : s));
      const anySolo = updated.some((s) => s.solo);

      updated.forEach((s) => {
        const audio = audioRefs.current.get(s.id);
        if (audio) {
          audio.muted = s.muted || (anySolo && !s.solo);
        }
      });
      return updated;
    });
  };

  const handleToggleSolo = (stemId: string) => {
    setStems((prev) => {
      const updated = prev.map((s) => (s.id === stemId ? { ...s, solo: !s.solo } : s));
      const anySolo = updated.some((s) => s.solo);

      updated.forEach((s) => {
        const audio = audioRefs.current.get(s.id);
        if (audio) {
          audio.muted = s.muted || (anySolo && !s.solo);
        }
      });
      return updated;
    });
  };

  const formatElapsed = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Header Hero */}
        <div className="relative rounded-3xl glass-panel-elevated p-6 sm:p-8 overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-champagne-400/15 border border-champagne-400/30 text-champagne-700 dark:text-champagne-300 text-xs font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              {engineMode === 'local'
                ? 'Free Local CPU Engine • Demucs v4 Hybrid Transformer'
                : 'Neural Analog RoFormer Architecture • Asynchronous Studio'}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-charcoal-900 dark:text-white">
              Neural Stem Lab
            </h1>
            <p className="mt-2 text-sm text-muted">
              Deconstruct full master recordings into isolated stems: Vocals, Drums, Bass, and Instruments using state-of-the-art neural source separation.
            </p>
          </div>
        </div>

        {/* Provider Engine Selector */}
        <div className="glass-panel rounded-2xl p-2.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-cream-100/70 dark:bg-charcoal-800/70 rounded-xl border border-plum-700/15 dark:border-white/5 flex-1 max-w-lg">
            <button
              onClick={() => {
                setEngineMode('local');
                setErrorMessage(null);
                setQuotaExceededInfo(null);
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                engineMode === 'local'
                  ? 'bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white shadow-sm border border-emerald-500/40'
                  : 'text-muted hover:text-charcoal-900 dark:hover:text-white'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-emerald-500" />
              <span>Free Local CPU Engine</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-extrabold">
                DEMUCS AI
              </span>
            </button>
            <button
              onClick={() => {
                setEngineMode('cloud');
                setErrorMessage(null);
                setQuotaExceededInfo(null);
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                engineMode === 'cloud'
                  ? 'bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white shadow-sm border border-champagne-400/30'
                  : 'text-muted hover:text-charcoal-900 dark:hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-champagne-500" />
              <span>Neural Analog / Cloud</span>
            </button>
          </div>

          <div className="flex items-center gap-3 px-2">
            {engineMode === 'local' ? (
              localServerStatus?.online ? (
                <span className="inline-flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Demucs v4 HT Active (Port {localServerStatus?.port || 8765} • CPU)
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 text-xs font-bold text-rose-500">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Backend Offline (Run: python -m uvicorn server:app --port 8765)
                </span>
              )
            ) : (
              <span className="inline-flex items-center gap-2 text-xs font-bold text-champagne-600 dark:text-champagne-300">
                <span className="w-2 h-2 rounded-full bg-champagne-400 animate-pulse" />
                Neural Analog Gateway Ready
              </span>
            )}
          </div>
        </div>

        {/* Quota Exceeded Smart Fallback Banner */}
        {quotaExceededInfo && (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-amber-500/15 border border-amber-500/40 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="font-extrabold text-sm text-charcoal-900 dark:text-white">
                  Cloud Processing Quota Depleted
                </h3>
                <p className="text-xs text-muted">{quotaExceededInfo.message}</p>
                <p className="text-xs text-charcoal-800 dark:text-lavender-200 pt-1">
                  Switch to our <strong>Free Local CPU Engine</strong> powered by Meta AI Demucs to separate this track on your machine without paid minutes or quota limits.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 pl-12">
              <button
                onClick={() => {
                  setEngineMode('local');
                  setQuotaExceededInfo(null);
                  setErrorMessage(null);
                  success('Switched to Free Local Engine', 'Your selected track is ready for free Demucs separation.');
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-charcoal-950 font-extrabold text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 fill-charcoal-950" />
                <span>Switch to Free Local Engine</span>
              </button>
              <button
                onClick={() => setQuotaExceededInfo(null)}
                className="px-3 py-2 rounded-xl text-xs text-muted hover:text-charcoal-900 dark:hover:text-white"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Error Alert Banner */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-3 text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="font-bold text-sm">Action Notice</p>
              <p className="text-xs opacity-90">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Active Queue / Hardware Status Banner */}
        {(pipelineStage === 'queue' || pipelineStage === 'processing') && (
          <div className="p-5 rounded-2xl glass-panel-elevated border-champagne-400/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-champagne-400/20 border border-champagne-400/40 flex items-center justify-center text-champagne-600 dark:text-champagne-300 shrink-0">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-charcoal-900 dark:text-white">
                    {engineMode === 'local' ? 'Demucs Neural Separation in Progress' : 'Waiting in Hardware Queue'}
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-cream-200 dark:bg-charcoal-800 text-muted">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {formatElapsed(elapsedSeconds)}
                  </span>
                  {progress > 0 && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold">
                      {progress}%
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted">
                  {statusDetails || (engineMode === 'local' ? 'Separating stems with Demucs...' : 'Allocating GPU workers on Neural Analog cluster...')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleManualRefresh}
                className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl glass-panel text-xs font-bold text-charcoal-800 dark:text-lavender-200 hover:border-champagne-400/40 flex items-center justify-center gap-1.5"
                title="Query latest job status"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Check Status</span>
              </button>
              <button
                onClick={handleCancelTracking}
                className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-500/20 flex items-center justify-center gap-1.5"
                title="Stop polling this job"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        )}

        {/* Input Configuration & Upload Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Step 1 (Ingest Track) */}
          <div className="lg:col-span-2 glass-panel rounded-3xl p-6 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-plum-700/15 dark:border-white/10">
              <h2 className="font-bold text-sm text-charcoal-900 dark:text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-champagne-400/20 text-champagne-600 dark:text-champagne-400 text-xs flex items-center justify-center font-bold">1</span>
                Import Audio Source
              </h2>
              {engineMode === 'local' ? (
                selectedFile && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> File Ready (Demucs AI)
                  </span>
                )
              ) : (
                audioId && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Asset Ready
                  </span>
                )
              )}
            </div>

            {/* Mode Selector Tabs (Cloud only supports direct link download) */}
            {engineMode === 'cloud' && (
              <div className="flex items-center p-1 rounded-2xl bg-cream-100/70 dark:bg-charcoal-800/70 border border-plum-700/15 dark:border-white/5">
                <button
                  onClick={() => setInputMode('file')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    inputMode === 'file'
                      ? 'bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white shadow-sm border border-champagne-400/30'
                      : 'text-muted hover:text-charcoal-900 dark:hover:text-white'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Audio File</span>
                </button>
                <button
                  onClick={() => setInputMode('link')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    inputMode === 'link'
                      ? 'bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white shadow-sm border border-champagne-400/30'
                      : 'text-muted hover:text-charcoal-900 dark:hover:text-white'
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>Public Music Link (Suno / YouTube / Spotify)</span>
                </button>
              </div>
            )}

            {engineMode === 'local' || inputMode === 'file' ? (
              /* Drag & Drop File Upload Area */
              <div>
                <label className="border-2 border-dashed border-plum-600/30 dark:border-champagne-400/20 hover:border-champagne-400/50 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer bg-cream-50/40 dark:bg-charcoal-950/40 hover:bg-cream-100/50 dark:hover:bg-charcoal-850/50 transition-all group">
                  <input
                    type="file"
                    accept="audio/mp3,audio/wav,audio/flac,audio/ogg,audio/m4a"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-plum-600 to-champagne-400 flex items-center justify-center text-charcoal-950 mb-3 shadow-lg shadow-plum-950/20 group-hover:scale-105 transition-transform">
                    <FileAudio className="w-7 h-7" />
                  </div>
                  <span className="font-bold text-sm text-charcoal-900 dark:text-white">
                    {selectedFile ? selectedFile.name : 'Select or drop an audio track'}
                  </span>
                  <span className="text-xs text-muted mt-1">
                    {selectedFile
                      ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to separate`
                      : engineMode === 'local'
                      ? 'Supports MP3, WAV, FLAC, OGG (Processed locally with zero API limits)'
                      : 'Supports MP3, WAV, FLAC, OGG (auto-optimized for serverless transfer)'}
                  </span>
                </label>
              </div>
            ) : (
              /* Public Music Link Input */
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-muted">
                  Public Music URL (Suno, YouTube, YouTube Shorts, Spotify, Udio)
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      type="url"
                      value={publicUrl}
                      onChange={(e) => setPublicUrl(e.target.value)}
                      placeholder="https://suno.com/song/... or https://youtube.com/watch?v=..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/70 dark:bg-charcoal-950/60 border border-plum-700/20 dark:border-white/10 text-xs font-medium focus:outline-none focus:border-champagne-400"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-muted">
                  Neural Analog downloads and analyzes directly from high-speed provider servers, bypassing browser file upload completely.
                </p>
              </div>
            )}

            {/* Ingest Action Button (Only needed in cloud mode) */}
            {engineMode === 'cloud' ? (
              <button
                onClick={handleIngestAudio}
                disabled={pipelineStage === 'uploading' || pipelineStage === 'ingesting'}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-plum-600 via-plum-700 to-champagne-600 hover:from-plum-500 hover:to-champagne-500 text-white font-extrabold text-xs shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
              >
                {pipelineStage === 'uploading' || pipelineStage === 'ingesting' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{statusDetails || 'Ingesting Track...'}</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 text-champagne-300" />
                    <span>{audioId ? 'Re-upload / Re-import Track' : 'Upload & Prepare Audio Asset'}</span>
                  </>
                )}
              </button>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>
                  <strong>Zero-Upload Local Mode:</strong> Audio file is sent directly to your local Demucs AI server. No cloud quotas, no serverless limits.
                </span>
              </div>
            )}
          </div>

          {/* Right Col: Step 2 (Choose Preset & Launch Separation) */}
          <div className="glass-panel rounded-3xl p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-plum-700/15 dark:border-white/10">
                <span className="font-bold text-sm text-charcoal-900 dark:text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-champagne-400/20 text-champagne-600 dark:text-champagne-400 text-xs flex items-center justify-center font-bold">2</span>
                  Separation Preset
                </span>
                <span className="text-[10px] font-bold text-champagne-600 dark:text-champagne-300 uppercase tracking-wider">
                  {engineMode === 'local' ? 'Demucs v4 HT' : 'RoFormer v2'}
                </span>
              </div>

              <div className="space-y-2.5">
                {PRESETS.map((preset) => (
                  <div
                    key={preset.id}
                    onClick={() => setSelectedPreset(preset.id)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      selectedPreset === preset.id
                        ? 'bg-plum-600/15 border-champagne-400/40 shadow-sm'
                        : 'bg-white/40 dark:bg-charcoal-950/40 border-plum-700/15 dark:border-white/5 hover:border-champagne-400/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-charcoal-900 dark:text-white">
                        {preset.name}
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-champagne-400/20 text-champagne-700 dark:text-champagne-300">
                        {preset.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted mt-1">{preset.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Launch Stem Separation Button */}
            <button
              onClick={handleStartStemSeparation}
              disabled={
                engineMode === 'local'
                  ? !selectedFile || pipelineStage === 'uploading' || pipelineStage === 'processing'
                  : !audioId || pipelineStage === 'queue' || pipelineStage === 'processing'
              }
              className={`w-full py-3.5 rounded-2xl font-extrabold text-sm shadow-xl flex items-center justify-center gap-2 disabled:opacity-40 transition-all cursor-pointer mt-4 ${
                engineMode === 'local'
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-charcoal-950'
                  : 'bg-gradient-to-r from-champagne-500 to-champagne-600 hover:from-champagne-400 hover:to-champagne-500 text-charcoal-950'
              }`}
            >
              <Zap className="w-4 h-4 fill-charcoal-950" />
              <span>
                {engineMode === 'local'
                  ? 'Separate Stems (Free Demucs AI)'
                  : 'Separate Stems (Cloud GPU)'}
              </span>
            </button>
          </div>
        </div>

        {/* Completed Multi-Channel Mixer */}
        {pipelineStage === 'completed' && stems.length > 0 && (
          <div className="glass-panel-elevated rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-plum-700/15 dark:border-white/10">
              <div>
                <h2 className="font-extrabold text-lg text-charcoal-900 dark:text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-champagne-400" />
                  Synchronized Multitrack Mixer
                </h2>
                <p className="text-xs text-muted">
                  Lossless 44.1 kHz 24-bit stems separated from {trackTitle}. Isolate, solo, mute, audition, or download tracks.
                </p>
              </div>

              {/* Master Play Button */}
              <button
                onClick={toggleMasterPlay}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-champagne-500 to-champagne-600 hover:from-champagne-400 hover:to-champagne-500 text-charcoal-950 font-extrabold text-xs shadow-lg flex items-center gap-2 cursor-pointer"
              >
                {isMasterPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isMasterPlaying ? 'Pause Master' : 'Play All Stems'}</span>
              </button>
            </div>

            {/* Stem Track Rows */}
            <div className="space-y-3">
              {stems.map((stem) => (
                <div
                  key={stem.id}
                  className="p-4 rounded-2xl bg-white/50 dark:bg-charcoal-950/60 border border-plum-700/15 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-[200px]">
                    {/* Individual Stem Play / Audition Button */}
                    <button
                      onClick={() => toggleSingleStemPlay(stem)}
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all shrink-0 shadow-sm cursor-pointer ${
                        playingStemId === stem.id
                          ? 'bg-champagne-400 text-charcoal-950 border-champagne-500 font-extrabold'
                          : 'bg-champagne-400/20 hover:bg-champagne-400/35 border-champagne-400/40 text-champagne-600 dark:text-champagne-300'
                      }`}
                      title={playingStemId === stem.id ? 'Pause Stem' : `Play ${stem.name}`}
                    >
                      {playingStemId === stem.id ? (
                        <Pause className="w-4 h-4 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      )}
                    </button>

                    <div>
                      <span className="font-bold text-xs text-charcoal-900 dark:text-white block">
                        {stem.name}
                      </span>
                      {stem.diagnostics?.peak_amplitude !== undefined ? (
                        <span className="text-[10px] text-muted font-mono flex items-center gap-1.5 mt-0.5">
                          {stem.diagnostics.is_silent ? (
                            <span className="text-amber-500 font-bold">Quiet / Low Signal</span>
                          ) : (
                            <span className="text-emerald-500 font-bold">Active Signal</span>
                          )}
                          <span>• Peak: {stem.diagnostics.peak_amplitude}</span>
                          <span>• RMS: {stem.diagnostics.rms_amplitude}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted">Lossless WAV • 44.1 kHz</span>
                      )}
                    </div>
                  </div>

                  {/* Volume Slider */}
                  <div className="flex items-center gap-3 flex-1 max-w-xs w-full">
                    <Volume2 className="w-4 h-4 text-muted shrink-0" />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={stem.volume}
                      onChange={(e) => handleVolumeChange(stem.id, parseFloat(e.target.value))}
                      className="w-full accent-champagne-400 h-1.5 bg-cream-200 dark:bg-charcoal-800 rounded-lg cursor-pointer"
                    />
                    <span className="font-mono text-[10px] text-muted w-8 text-right">
                      {Math.round(stem.volume * 100)}%
                    </span>
                  </div>

                  {/* Solo & Mute Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleSolo(stem.id)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                        stem.solo
                          ? 'bg-amber-400 text-charcoal-950 border-amber-500 font-extrabold'
                          : 'bg-cream-100 dark:bg-charcoal-800 text-muted border-transparent hover:text-charcoal-900 dark:hover:text-white'
                      }`}
                    >
                      SOLO
                    </button>

                    <button
                      onClick={() => handleToggleMute(stem.id)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                        stem.muted
                          ? 'bg-rose-500 text-white border-rose-600 font-extrabold'
                          : 'bg-cream-100 dark:bg-charcoal-800 text-muted border-transparent hover:text-charcoal-900 dark:hover:text-white'
                      }`}
                    >
                      MUTE
                    </button>

                    <a
                      href={stem.downloadUrl}
                      download={`${stem.name.toLowerCase().replace(/\s+/g, '_')}_stem.wav`}
                      className="p-1.5 rounded-lg bg-champagne-400/15 border border-champagne-400/30 text-champagne-700 dark:text-champagne-300 hover:bg-champagne-400/25 transition-colors ml-2 cursor-pointer flex items-center justify-center"
                      title={`Download ${stem.name} WAV`}
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
