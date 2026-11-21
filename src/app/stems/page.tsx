'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Layers,
  Upload,
  Sparkles,
  Sliders,
  Volume2,
  Download,
  Play,
  Pause,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Radio,
  FileAudio,
  Zap,
  Link as LinkIcon,
  HelpCircle,
  VolumeX,
  Clock,
  RefreshCw,
  XCircle,
  Cpu,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useToast } from '@/context/ToastContext';
import { audioBufferToWav } from '@/lib/wav-encoder';
import {
  isHuggingFaceSpaceTarget,
  getCleanGradioSpaceTarget,
  checkGradioSpaceHealth,
  separateWithGradioSpace,
} from '@/lib/gradio-stem-adapter';

interface StemArtifact {
  id: string;
  name: string;
  downloadUrl: string;
  volume: number;
  muted: boolean;
  solo: boolean;
}

const PRESETS = [
  {
    id: '4_tracks',
    name: '4 Stems (Standard Band)',
    desc: 'Vocals, Drums, Bass, and Other Instruments (RoFormer engine).',
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

  // Mode: File Upload or Public Link
  const [inputMode, setInputMode] = useState<'file' | 'link'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [publicUrl, setPublicUrl] = useState<string>('');
  const [selectedPreset, setSelectedPreset] = useState<string>('4_tracks');

  // Engine Mode: 'cloud' (Neural Analog) | 'local' (Demucs AI)
  const [engineMode, setEngineMode] = useState<'cloud' | 'local'>('cloud');
  const [localServerStatus, setLocalServerStatus] = useState<{
    online: boolean;
    configured?: boolean;
    isProduction?: boolean;
    device?: string;
    deviceName?: string;
    model?: string;
    launchHelp?: string;
    code?: string;
    message?: string;
  } | null>(null);
  const [quotaExceededInfo, setQuotaExceededInfo] = useState<{
    isQuota: boolean;
    message: string;
  } | null>(null);

  // Periodically check Demucs server health (local, hosted FastAPI, or Hugging Face Space)
  useEffect(() => {
    const checkLocalHealth = async () => {
      try {
        const spaceTarget = getCleanGradioSpaceTarget();
        if (spaceTarget && isHuggingFaceSpaceTarget(spaceTarget)) {
          const gh = await checkGradioSpaceHealth();
          setLocalServerStatus({
            online: gh.online,
            configured: true,
            isProduction: true,
            deviceName: gh.deviceName || (gh.zeroGpuEnabled ? 'Hugging Face ZeroGPU' : 'Hugging Face Space'),
            device: gh.device || 'gpu',
            model: gh.model || 'htdemucs',
            message: gh.error,
          });
          return;
        }

        const res = await fetch('/api/stems/local/health');
        const data = await res.json().catch(() => ({ online: false }));
        setLocalServerStatus(data);
      } catch {
        setLocalServerStatus({ online: false });
      }
    };
    checkLocalHealth();
    const interval = setInterval(checkLocalHealth, 8000);
    return () => clearInterval(interval);
  }, []);

  // Multi-stage processing state
  // 'idle' | 'uploading' | 'ingesting' | 'ready_to_split' | 'queue' | 'processing' | 'completed' | 'failed'
  const [pipelineStage, setPipelineStage] = useState<string>('idle');
  const [statusDetails, setStatusDetails] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Ingested audio asset
  const [audioId, setAudioId] = useState<string | null>(null);
  const [trackTitle, setTrackTitle] = useState<string>('');

  // Stem job tracking
  const [creationId, setCreationId] = useState<string | null>(null);
  const [queueStartTime, setQueueStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Result stems
  const [stems, setStems] = useState<StemArtifact[]>([]);
  const [isMasterPlaying, setIsMasterPlaying] = useState<boolean>(false);
  const [masterVolume, setMasterVolume] = useState<number>(1.0);

  // Synchronized audio mixer references
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSubmittingRef = useRef<boolean>(false);
  const consecutiveErrorsRef = useRef<number>(0);

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

          const restoredStems = Array.isArray(job.stems) && job.stems.length > 0 ? job.stems : [];

          if (job.isComplete && restoredStems.length > 0) {
            setPipelineStage('completed');
            setStems(restoredStems);
          } else {
            setPipelineStage('queue');
            setQueueStartTime(job.startTime || Date.now());
            startStemPolling(job.creationId, restoredStems);
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

  // Client-side audio optimizer for files > 4.2 MB
  const optimizeAudioIfNeeded = async (file: File): Promise<File> => {
    if (file.size <= 4.2 * 1024 * 1024) {
      return file;
    }

    setStatusDetails(`Optimizing ${(file.size / (1024 * 1024)).toFixed(1)} MB audio to meet serverless limits...`);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      // Downmix or resample into 16-bit PCM WAV using audioBufferToWav
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

    if (file.size > 50 * 1024 * 1024) {
      setErrorMessage('File size exceeds 50MB limit. Please select a shorter track.');
      return;
    }

    setSelectedFile(file);
    setTrackTitle(file.name);
    setAudioId(null);
    setPipelineStage('idle');
    info('Audio File Loaded', `${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)`);
  };

  // Stage 1: Ingest Audio Asset (File or Link)
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

  // Stage 2: Trigger Stem Separation (Cloud or Local)
  const handleStartStemSeparation = async () => {
    if (isSubmittingRef.current) return;

    // Route to Free Local Demucs Engine if local mode is active
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

        // Detect Neural Analog processing quota exhaustion
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
              'Neural Analog processing minutes exhausted (Cost: 0.5m, Remaining: 0.2m).',
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

  // Demucs Stem Separation Handler (Local or Hosted)
  const handleStartLocalSeparation = async () => {
    if (!selectedFile) {
      warning('No audio file', 'Please select or drop an audio file first.');
      return;
    }

    if (localServerStatus?.configured === false && localServerStatus?.isProduction) {
      const msg = 'Hosted Demucs backend is not configured in Vercel. Set NEXT_PUBLIC_STEM_API_URL in project environment variables.';
      setErrorMessage(msg);
      error('Configuration Required', msg);
      return;
    }

    isSubmittingRef.current = true;
    consecutiveErrorsRef.current = 0;
    setPipelineStage('uploading');
    setElapsedSeconds(0);
    setStatusDetails('Streaming audio to Demucs neural engine...');
    setErrorMessage(null);
    setQuotaExceededInfo(null);

    try {
      const spaceTarget = getCleanGradioSpaceTarget();

      // Path A: Hugging Face Gradio Space (Direct client-to-Space streaming via @gradio/client)
      // Bypasses Vercel 4.5 MB serverless limit and function timeouts
      if (spaceTarget && isHuggingFaceSpaceTarget(spaceTarget)) {
        setStatusDetails('Connecting to Hugging Face Demucs Space...');
        setPipelineStage('processing');

        const gradioResult = await separateWithGradioSpace(
          selectedFile,
          selectedPreset,
          (statusText) => setStatusDetails(statusText)
        );

        setCreationId(gradioResult.jobId);
        setTrackTitle(selectedFile.name);
        setPipelineStage('completed');
        setStatusDetails('Separation complete! Lossless stems ready.');

        const formattedStems: StemArtifact[] =
          selectedPreset === '2_tracks'
            ? [
                {
                  id: `${gradioResult.jobId}_vocals`,
                  name: 'Vocals',
                  downloadUrl: gradioResult.vocalsUrl,
                  volume: 1.0,
                  muted: false,
                  solo: false,
                },
                {
                  id: `${gradioResult.jobId}_instrumental`,
                  name: 'Instrumental',
                  downloadUrl: gradioResult.instrumentalUrl || gradioResult.vocalsUrl,
                  volume: 1.0,
                  muted: false,
                  solo: false,
                },
              ]
            : [
                {
                  id: `${gradioResult.jobId}_vocals`,
                  name: 'Vocals',
                  downloadUrl: gradioResult.vocalsUrl,
                  volume: 1.0,
                  muted: false,
                  solo: false,
                },
                {
                  id: `${gradioResult.jobId}_drums`,
                  name: 'Drums',
                  downloadUrl: gradioResult.drumsUrl || '',
                  volume: 1.0,
                  muted: false,
                  solo: false,
                },
                {
                  id: `${gradioResult.jobId}_bass`,
                  name: 'Bass',
                  downloadUrl: gradioResult.bassUrl || '',
                  volume: 1.0,
                  muted: false,
                  solo: false,
                },
                {
                  id: `${gradioResult.jobId}_other`,
                  name: 'Other Instruments',
                  downloadUrl: gradioResult.otherUrl || '',
                  volume: 1.0,
                  muted: false,
                  solo: false,
                },
              ].filter((s) => Boolean(s.downloadUrl));

        setStems(formattedStems);
        success('Stems Ready!', 'Demucs ZeroGPU finished separating all stems.');
        return;
      }

      // Path B: Local Demucs Server or Hosted FastAPI Server
      const formData = new FormData();
      formData.append('audio', selectedFile);
      formData.append('preset', selectedPreset);

      const res = await fetch('/api/stems/local/separate', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ error: `Engine error (${res.status})` }));
        const code = errJson.code;

        if (code === 'MISSING_PRODUCTION_BACKEND') {
          throw new Error('Hosted Demucs backend is not configured in Vercel. Please set NEXT_PUBLIC_STEM_API_URL in project settings.');
        }
        if (code === 'AUTH_FAILURE') {
          throw new Error('Authentication failed connecting to Demucs backend. Check STEM_API_KEY.');
        }
        if (code === 'PAYLOAD_TOO_LARGE') {
          throw new Error('Audio file exceeds the maximum allowed upload limit.');
        }
        if (code === 'QUOTA_EXCEEDED') {
          throw new Error('Demucs backend rate limit or concurrency quota reached. Please try again shortly.');
        }
        throw new Error(errJson.error || 'Failed to start Demucs separation');
      }

      const data = await res.json();
      const jobId = data.jobId || data.creationId;
      setCreationId(jobId);
      setTrackTitle(selectedFile.name);
      setPipelineStage('processing');
      setStatusDetails(
        localServerStatus?.isProduction
          ? 'Demucs neural source separation in progress on hosted GPU...'
          : 'Demucs neural source separation in progress on your machine...'
      );

      startLocalStemPolling(jobId);
    } catch (err: unknown) {
      setPipelineStage('failed');
      const msg = err instanceof Error ? err.message : 'Separation failed';
      setErrorMessage(msg);
      error('Engine Error', msg);
    } finally {
      isSubmittingRef.current = false;
    }
  };

  // Polling for Demucs Engine (Local or Hosted)
  const startLocalStemPolling = (jobId: string) => {
    let delay = 2000;
    let pollCount = 0;
    consecutiveErrorsRef.current = 0;

    const poll = async () => {
      pollCount++;
      try {
        const res = await fetch(`/api/stems/local/status?jobId=${jobId}`);

        if (res.status === 401 || res.status === 403) {
          setPipelineStage('failed');
          const errMsg = 'Demucs backend authentication failed (401/403). Verify STEM_API_KEY.';
          setErrorMessage(errMsg);
          error('Authentication Error', errMsg);
          return;
        }

        if (res.status === 429) {
          setPipelineStage('failed');
          const errMsg = 'Demucs backend concurrency quota exhausted. Please try again later.';
          setErrorMessage(errMsg);
          error('Quota Exceeded', errMsg);
          return;
        }

        if (!res.ok) {
          consecutiveErrorsRef.current++;
          if (consecutiveErrorsRef.current >= 4) {
            setPipelineStage('failed');
            const errMsg = localServerStatus?.isProduction
              ? 'Lost connection to hosted Demucs engine. The server may have restarted.'
              : 'Failed to communicate with local Demucs engine. Please verify local-stem-server is running on http://127.0.0.1:8765.';
            setErrorMessage(errMsg);
            error('Engine Error', errMsg);
            return;
          }
          scheduleNext(delay);
          return;
        }

        consecutiveErrorsRef.current = 0;
        const data = await res.json();

        if (data.isFailed || data.status === 'failed') {
          setPipelineStage('failed');
          setErrorMessage(data.error || 'Demucs separation failed.');
          error('Job Failed', data.error);
          return;
        }

        if (data.statusDetails) {
          setStatusDetails(data.statusDetails);
        }

        if (data.isComplete || data.status === 'completed') {
          setPipelineStage('completed');
          setStatusDetails('Separation complete! Lossless stems ready.');
          const formattedStems: StemArtifact[] = (data.stems || []).map(
            (s: { stem_id: string; stem?: string; name?: string; download_url?: string }, idx: number) => ({
              id: s.stem_id,
              name: s.name || (s.stem ? s.stem.charAt(0).toUpperCase() + s.stem.slice(1) : `Stem ${idx + 1}`),
              downloadUrl: s.download_url || `/api/stems/local/download/${jobId}/${s.stem}.wav`,
              volume: 1.0,
              muted: false,
              solo: false,
            })
          );
          setStems(formattedStems);
          success('Stems Ready!', 'Demucs finished separating all stems.');
          return;
        }

        scheduleNext(delay);
      } catch (err) {
        console.warn('Demucs poll error:', err);
        consecutiveErrorsRef.current++;
        if (consecutiveErrorsRef.current >= 4) {
          setPipelineStage('failed');
          setErrorMessage('Connection to Demucs engine lost.');
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

  // Intelligent polling with gradual backoff
  const startStemPolling = (jobId: string, currentStems: StemArtifact[]) => {
    let delay = 3000;
    let pollCount = 0;
    consecutiveErrorsRef.current = 0;

    // Fallback stems if empty
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

          // Update storage with completed status
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

        // Increase polling interval gradually up to 10s to respect rate limits
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
    info('Checking Status', 'Querying Neural Analog processing queue...');
    try {
      const res = await fetch(`/api/stems/status?creationId=${creationId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.statusDetails) setStatusDetails(data.statusDetails);
        if (data.isComplete) {
          setPipelineStage('completed');
          setStatusDetails('Separation complete! Lossless stems ready.');
          if (stems.length === 0) {
            let loadedStems: StemArtifact[] = [];
            const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (saved) {
              try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed.stems) && parsed.stems.length > 0) {
                  loadedStems = parsed.stems;
                }
              } catch (e) {
                console.warn(e);
              }
            }
            if (loadedStems.length === 0) {
              const defaultLabels =
                selectedPreset === '2_tracks'
                  ? ['Vocals', 'Instrumental']
                  : selectedPreset === 'lead_back'
                    ? ['Lead Vocals', 'Backing Vocals']
                    : ['Vocals', 'Drums', 'Bass', 'Other'];
              loadedStems = defaultLabels.map((lbl, idx) => ({
                id: `${creationId}_${idx}`,
                name: lbl,
                downloadUrl: `/api/stems/download/${creationId}`,
                volume: 1.0,
                muted: false,
                solo: false,
              }));
            }
            setStems(loadedStems);
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
              Dual-Engine Architecture • Cloud GPU & Free Local Demucs AI
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-charcoal-900 dark:text-white">
              Neural Stem Lab
            </h1>
            <p className="mt-2 text-sm text-muted">
              Deconstruct full master recordings into isolated stems: Vocals, Drums, Bass, and Instruments using state-of-the-art neural source separation.
            </p>
          </div>
        </div>

        {/* Engine Mode Switcher */}
        <div className="glass-panel rounded-2xl p-2.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-cream-100/70 dark:bg-charcoal-800/70 rounded-xl border border-plum-700/15 dark:border-white/5 flex-1 max-w-md">
            <button
              onClick={() => {
                setEngineMode('cloud');
                setErrorMessage(null);
                setQuotaExceededInfo(null);
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${engineMode === 'cloud'
                ? 'bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white shadow-sm border border-champagne-400/30'
                : 'text-muted hover:text-charcoal-900 dark:hover:text-white'
                }`}
            >
              <Radio className="w-3.5 h-3.5 text-champagne-500" />
              <span>Neural Analog Cloud</span>
            </button>
            <button
              onClick={() => {
                setEngineMode('local');
                setErrorMessage(null);
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${engineMode === 'local'
                ? 'bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white shadow-sm border border-emerald-500/40'
                : 'text-muted hover:text-charcoal-900 dark:hover:text-white'
                }`}
            >
              <Cpu className="w-3.5 h-3.5 text-emerald-500" />
              <span>Free Local Engine</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-extrabold">
                100% FREE
              </span>
            </button>
          </div>

          <div className="flex items-center gap-3 px-2">
            {engineMode === 'local' ? (
              localServerStatus?.online ? (
                <span className="inline-flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Demucs Online ({localServerStatus.deviceName || (localServerStatus.isProduction ? 'Hosted GPU' : 'Host CPU')})
                </span>
              ) : localServerStatus?.configured === false && localServerStatus?.isProduction ? (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Hosted Backend Not Configured
                  </span>
                </div>
              ) : localServerStatus?.code === 'AUTH_FAILURE' ? (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Auth Failed (STEM_API_KEY)
                  </span>
                </div>
              ) : localServerStatus?.isProduction ? (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Hosted Backend Offline / Cold Starting
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Local Server Offline
                  </span>
                  <span className="text-[11px] text-muted hidden md:inline">
                    (Run <code>local-stem-server/start.bat</code>)
                  </span>
                </div>
              )
            ) : (
              <span className="text-xs text-muted">
                Cloud GPU Processing • High Speed
              </span>
            )}
          </div>
        </div>

        {/* Hosted Demucs Backend Not Configured Notice (Vercel) */}
        {engineMode === 'local' && localServerStatus?.configured === false && localServerStatus?.isProduction && (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-600/10 to-amber-500/10 border border-amber-500/30 space-y-2">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="font-extrabold text-sm text-charcoal-900 dark:text-white">
                  Hosted Demucs Backend Not Configured on Vercel
                </h3>
                <p className="text-xs text-muted">
                  Your SonicForge AI frontend is currently deployed on Vercel. Deployed cloud websites cannot connect to your local PC&apos;s <code>127.0.0.1:8765</code> loopback.
                </p>
                <p className="text-xs text-charcoal-800 dark:text-lavender-200 pt-1">
                  <strong>To enable Demucs separation on this live website:</strong> Deploy the backend to a hosted cloud provider (e.g. Hugging Face Spaces, Render, or RunPod) and configure <code>NEXT_PUBLIC_STEM_API_URL</code> in your Vercel Project Environment Variables.
                </p>
                <p className="text-[11px] text-muted pt-1">
                  💡 In local development (<code>http://localhost:3000</code>), your local Python Demucs server works automatically.
                </p>
              </div>
            </div>
          </div>
        )}

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
                <p className="text-xs text-muted">
                  {quotaExceededInfo.message}
                </p>
                <p className="text-xs text-charcoal-800 dark:text-lavender-200 pt-1">
                  Switch to our <strong>Free Local Engine</strong> powered by Meta AI's open-source <strong>Demucs</strong> to separate this track on your computer without paid APIs or quota limits.
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
                    {pipelineStage === 'queue' ? 'Waiting in Hardware Queue' : 'Neural Separation in Progress'}
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-cream-200 dark:bg-charcoal-800 text-muted">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {formatElapsed(elapsedSeconds)}
                  </span>
                </div>
                <p className="text-xs text-muted">
                  {statusDetails || 'Allocating GPU workers on Neural Analog cluster...'}
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
                    <CheckCircle2 className="w-3.5 h-3.5" /> File Ready (Local Demucs)
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

            {/* Mode Selector Tabs (Cloud only has link support) */}
            {engineMode === 'cloud' && (
              <div className="flex items-center p-1 rounded-2xl bg-cream-100/70 dark:bg-charcoal-800/70 border border-plum-700/15 dark:border-white/5">
                <button
                  onClick={() => setInputMode('file')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${inputMode === 'file'
                    ? 'bg-white dark:bg-charcoal-900 text-charcoal-900 dark:text-white shadow-sm border border-champagne-400/30'
                    : 'text-muted hover:text-charcoal-900 dark:hover:text-white'
                    }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Audio File</span>
                </button>
                <button
                  onClick={() => setInputMode('link')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${inputMode === 'link'
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
                      ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for separation`
                      : 'Supports MP3, WAV, FLAC, OGG (Processed locally without limits)'}
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
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-plum-600 via-plum-700 to-champagne-600 hover:from-plum-500 hover:to-champagne-500 text-white font-extrabold text-xs shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
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
                  <strong>Zero-Upload Local Mode:</strong> Audio file will be sent directly to your local Demucs AI server. No cloud quotas, no serverless limits.
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
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${selectedPreset === preset.id
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
                  ? !selectedFile ||
                    pipelineStage === 'uploading' ||
                    pipelineStage === 'processing' ||
                    (localServerStatus?.configured === false && localServerStatus?.isProduction)
                  : !audioId || pipelineStage === 'queue' || pipelineStage === 'processing'
              }
              className={`w-full py-3.5 rounded-2xl font-extrabold text-sm shadow-xl flex items-center justify-center gap-2 disabled:opacity-40 transition-all cursor-pointer mt-4 ${engineMode === 'local'
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-charcoal-950'
                : 'bg-gradient-to-r from-champagne-500 to-champagne-600 hover:from-champagne-400 hover:to-champagne-500 text-charcoal-950'
                }`}
            >
              <Zap className="w-4 h-4 fill-charcoal-950" />
              <span>
                {engineMode === 'local'
                  ? localServerStatus?.configured === false && localServerStatus?.isProduction
                    ? 'Hosted Backend Required (Vercel)'
                    : 'Separate Stems (Demucs AI)'
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
                  Lossless 24-bit stems separated from {trackTitle}. Isolate, mute, solo, or download tracks.
                </p>
              </div>

              {/* Master Play Button */}
              <button
                onClick={toggleMasterPlay}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-champagne-500 to-champagne-600 hover:from-champagne-400 hover:to-champagne-500 text-charcoal-950 font-extrabold text-xs shadow-lg flex items-center gap-2"
              >
                {isMasterPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isMasterPlaying ? 'Pause Master' : 'Play All Stems'}</span>
              </button>
            </div>

            {/* Stem Track Sliders */}
            <div className="space-y-3">
              {stems.map((stem) => (
                <div
                  key={stem.id}
                  className="p-4 rounded-2xl bg-white/50 dark:bg-charcoal-950/60 border border-plum-700/15 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-[140px]">
                    <div className="w-8 h-8 rounded-lg bg-plum-600/20 border border-champagne-400/30 flex items-center justify-center text-champagne-500 text-xs font-bold">
                      {stem.name.charAt(0)}
                    </div>
                    <span className="font-bold text-xs text-charcoal-900 dark:text-white">
                      {stem.name}
                    </span>
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
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${stem.solo
                        ? 'bg-amber-400 text-charcoal-950 border-amber-500 font-extrabold'
                        : 'bg-cream-100 dark:bg-charcoal-800 text-muted border-transparent hover:text-charcoal-900 dark:hover:text-white'
                        }`}
                    >
                      SOLO
                    </button>

                    <button
                      onClick={() => handleToggleMute(stem.id)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${stem.muted
                        ? 'bg-rose-500 text-white border-rose-600 font-extrabold'
                        : 'bg-cream-100 dark:bg-charcoal-800 text-muted border-transparent hover:text-charcoal-900 dark:hover:text-white'
                        }`}
                    >
                      MUTE
                    </button>

                    <a
                      href={stem.downloadUrl}
                      download={`${stem.name.toLowerCase()}_stem.wav`}
                      className="p-1.5 rounded-lg bg-champagne-400/15 border border-champagne-400/30 text-champagne-700 dark:text-champagne-300 hover:bg-champagne-400/25 transition-colors ml-2"
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
