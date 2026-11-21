import { NextRequest, NextResponse } from 'next/server';
import {
  getStemBackendResolution,
  resolveActiveLocalServerUrl,
  getStemBackendHeaders,
} from '@/lib/local-stem-config';

export const dynamic = 'force-dynamic';
export const maxDuration = 10;

export async function GET(req: NextRequest) {
  const config = getStemBackendResolution();

  if (!config.isConfigured || !config.url) {
    return NextResponse.json(
      {
        error: config.error || 'Hosted Demucs stem backend is not configured in Vercel.',
        code: config.code || 'MISSING_PRODUCTION_BACKEND',
      },
      { status: 503 }
    );
  }

  const activeUrl = await resolveActiveLocalServerUrl();
  if (!activeUrl) {
    return NextResponse.json(
      {
        error: `Demucs engine on ${config.url} is currently unavailable.`,
        code: 'BACKEND_UNAVAILABLE',
      },
      { status: 503 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId') || searchParams.get('creationId');

    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId query parameter is required', code: 'MISSING_JOB_ID' },
        { status: 400 }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const headers = getStemBackendHeaders();
    const res = await fetch(`${activeUrl}/status/${jobId}`, {
      headers,
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeout);

    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json(
          {
            error: `Stem job ${jobId.slice(0, 8)} was not found on Demucs storage. It may have expired or the backend restarted.`,
            code: 'JOB_NOT_FOUND',
            isFailed: true,
          },
          { status: 404 }
        );
      }

      if (res.status === 401 || res.status === 403) {
        return NextResponse.json(
          {
            error: 'Authentication failed polling Demucs status. Verify STEM_API_KEY.',
            code: 'AUTH_FAILURE',
            isFailed: true,
          },
          { status: res.status }
        );
      }

      if (res.status === 429) {
        return NextResponse.json(
          {
            error: 'Demucs backend rate limit reached while polling status.',
            code: 'QUOTA_EXCEEDED',
          },
          { status: 429 }
        );
      }

      const errText = await res.text();
      return NextResponse.json(
        { error: `Demucs server error (${res.status}): ${errText}`, code: 'BACKEND_STATUS_ERROR' },
        { status: res.status }
      );
    }

    const data = await res.json();

    // Map stem artifacts to local proxy download endpoint
    const stems = (data.stems || []).map((s: { stem_id?: string; stem?: string; name?: string; filename?: string; diagnostics?: any; size_bytes?: number }) => {
      const stemKey = s.stem || (s.name ? s.name.toLowerCase().replace(/\s+/g, '_') : 'stem');
      const stemFile = s.filename || `${stemKey}.wav`;
      const downloadPath = `/api/stems/local/download/${jobId}/${stemFile}`;
      return {
        id: s.stem_id || `${jobId}_${stemKey}`,
        stem_id: s.stem_id || `${jobId}_${stemKey}`,
        stem: stemKey,
        name: s.name || stemKey,
        filename: stemFile,
        download_url: downloadPath,
        downloadUrl: downloadPath,
        diagnostics: s.diagnostics || null,
        size_bytes: s.size_bytes || 0,
      };
    });

    const isComplete = Boolean(data.isComplete || data.status === 'completed');
    const isFailed = Boolean(data.isFailed || data.status === 'failed');

    return NextResponse.json({
      jobId: data.id || jobId,
      creationId: data.id || jobId,
      status: data.status,
      isComplete,
      isFailed,
      progress: data.progress || 0,
      statusDetails:
        data.statusDetails ||
        (isComplete
          ? 'Separation complete! Lossless stems ready.'
          : data.status === 'queued'
          ? 'Queued for Demucs neural inference...'
          : 'Processing stems on Demucs neural engine...'),
      stems,
      error: data.error || null,
    });
  } catch (err: unknown) {
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    const msg = err instanceof Error ? err.message : 'Status check failed';
    return NextResponse.json(
      {
        error: isTimeout
          ? `Status check to Demucs engine on ${activeUrl} timed out.`
          : `Could not query Demucs engine on ${activeUrl}: ${msg}`,
        code: 'BACKEND_UNAVAILABLE',
      },
      { status: 503 }
    );
  }
}
