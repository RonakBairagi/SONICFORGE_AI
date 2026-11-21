/**
 * SonicForge AI — Gradio Space Client Provider Adapter
 * 
 * Direct client-to-Space audio separation using official @gradio/client.
 * Benefits on Vercel deployment:
 * 1. Bypasses Vercel serverless 4.5 MB payload limit (streams directly from browser to Hugging Face Space).
 * 2. Bypasses Vercel 10s/60s function timeout (Gradio WebSocket/SSE handles long-running Demucs inference).
 * 3. Supports Hugging Face ZeroGPU (@spaces.GPU) and Free CPU Spaces with zero paid APIs.
 */

import { Client, handle_file } from '@gradio/client';

export interface GradioStemResult {
  jobId: string;
  vocalsUrl: string;
  drumsUrl?: string;
  bassUrl?: string;
  otherUrl?: string;
  instrumentalUrl?: string;
}

export function isHuggingFaceSpaceTarget(target: string | null | undefined): boolean {
  if (!target) return false;
  const clean = target.toLowerCase().trim();
  return (
    clean.includes('hf.space') ||
    clean.includes('huggingface.co/spaces') ||
    (/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(clean) && !clean.includes('localhost') && !clean.includes('127.0.0.1'))
  );
}

export function getCleanGradioSpaceTarget(): string | null {
  const target =
    process.env.NEXT_PUBLIC_STEM_SPACE_ID ||
    process.env.NEXT_PUBLIC_STEM_API_URL ||
    '';

  if (!target || !target.trim()) return null;
  const clean = target.trim();

  // If full huggingface.co/spaces/username/space-name URL
  if (clean.includes('huggingface.co/spaces/')) {
    const parts = clean.split('huggingface.co/spaces/')[1]?.replace(/\/+$/, '');
    return parts || clean;
  }
  return clean.replace(/\/+$/, '');
}

/**
 * Health check probe against the Hugging Face Gradio Space
 */
export async function checkGradioSpaceHealth(): Promise<{
  online: boolean;
  model?: string;
  device?: string;
  deviceName?: string;
  zeroGpuEnabled?: boolean;
  error?: string;
}> {
  const spaceTarget = getCleanGradioSpaceTarget();
  if (!spaceTarget || !isHuggingFaceSpaceTarget(spaceTarget)) {
    return { online: false, error: 'No valid Hugging Face Space target configured.' };
  }

  try {
    const app = await Client.connect(spaceTarget);
    const result = await app.predict('/health', []);
    const rawData = result?.data as any;
    if (rawData) {
      const data = Array.isArray(rawData) ? rawData[0] : rawData;
      return {
        online: data?.status === 'ok',
        model: data?.model || 'htdemucs',
        device: data?.device || 'cpu',
        deviceName: data?.deviceName || (data?.zeroGpuEnabled ? 'Nvidia ZeroGPU' : 'Hosted Space'),
        zeroGpuEnabled: Boolean(data?.zeroGpuEnabled),
      };
    }
    return { online: true, model: 'htdemucs', deviceName: 'Hugging Face Space' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Connection failed';
    return { online: false, error: msg };
  }
}

/**
 * Executes stem separation directly from browser to Hugging Face Space via @gradio/client
 */
export async function separateWithGradioSpace(
  file: File,
  preset: string = '4_tracks',
  onProgress?: (status: string) => void
): Promise<GradioStemResult> {
  const spaceTarget = getCleanGradioSpaceTarget();
  if (!spaceTarget) {
    throw new Error('Hugging Face Space target is not configured. Set NEXT_PUBLIC_STEM_API_URL or NEXT_PUBLIC_STEM_SPACE_ID in Vercel settings.');
  }

  onProgress?.('Connecting to Hugging Face Space...');
  const app = await Client.connect(spaceTarget);

  onProgress?.('Uploading audio directly to Demucs Space...');
  const fileHandle = handle_file(file);

  onProgress?.('Demucs neural source separation in progress on Hugging Face...');
  const result = await app.predict('/separate_stems', [fileHandle, preset]);

  if (!result || !result.data || !Array.isArray(result.data)) {
    throw new Error('Hugging Face Space completed but did not return valid stem artifacts.');
  }

  const [vocalsRaw, drumsRaw, bassRaw, otherRaw] = result.data as any[];

  // Helper to extract absolute URL from Gradio FileData or string
  const resolveFileUrl = (item: any): string => {
    if (!item) return '';
    if (typeof item === 'string') return item;
    if (item.url) return item.url;
    if (item.path) {
      if (item.path.startsWith('http')) return item.path;
      const baseUrl = spaceTarget.startsWith('http')
        ? spaceTarget
        : `https://${spaceTarget.replace('/', '-')}.hf.space`;
      return `${baseUrl.replace(/\/+$/, '')}/file=${item.path.replace(/^\/+/, '')}`;
    }
    return '';
  };

  const vocalsUrl = resolveFileUrl(vocalsRaw);
  const drumsUrl = resolveFileUrl(drumsRaw);
  const bassUrl = resolveFileUrl(bassRaw);
  const otherUrl = resolveFileUrl(otherRaw);

  if (!vocalsUrl) {
    throw new Error('Stem separation completed, but vocals output file was not found on the Space.');
  }

  const jobId = `hf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  return {
    jobId,
    vocalsUrl,
    drumsUrl: preset === '4_tracks' ? drumsUrl : undefined,
    bassUrl: preset === '4_tracks' ? bassUrl : undefined,
    otherUrl: preset === '4_tracks' ? otherUrl : undefined,
    instrumentalUrl: preset === '2_tracks' ? drumsUrl : undefined, // in 2_tracks, drums output holds instrumental
  };
}
