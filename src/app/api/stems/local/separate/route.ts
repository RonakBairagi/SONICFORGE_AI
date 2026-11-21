import { NextRequest, NextResponse } from 'next/server';
import {
  getStemBackendResolution,
  resolveActiveLocalServerUrl,
  getStemBackendHeaders,
} from '@/lib/local-stem-config';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const config = getStemBackendResolution();

  // Guard: In production without configured backend
  if (!config.isConfigured || !config.url) {
    return NextResponse.json(
      {
        error: config.error || 'Hosted Demucs stem backend is not configured in Vercel.',
        code: config.code || 'MISSING_PRODUCTION_BACKEND',
        launchHelp: config.launchHelp,
      },
      { status: 503 }
    );
  }

  const activeUrl = await resolveActiveLocalServerUrl();
  if (!activeUrl) {
    return NextResponse.json(
      {
        error: `Could not connect to Demucs backend on ${config.url}. Server is offline or unreachable.`,
        code: 'BACKEND_UNAVAILABLE',
        launchHelp: config.launchHelp,
      },
      { status: 503 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get('audio') as File | null;
    const preset = (formData.get('preset') as string) || '4_tracks';

    if (!file) {
      return NextResponse.json(
        { error: 'Audio file is required for stem separation.', code: 'MISSING_AUDIO_FILE' },
        { status: 400 }
      );
    }

    // Size limit check
    const MAX_SIZE = 100 * 1024 * 1024; // 100MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        {
          error: `Audio file (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds maximum allowed size of 100 MB.`,
          code: 'PAYLOAD_TOO_LARGE',
        },
        { status: 413 }
      );
    }

    // Forward multipart to Demucs backend
    const forwardForm = new FormData();
    forwardForm.append('audio', file, file.name);
    forwardForm.append('preset', preset);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const headers = getStemBackendHeaders();
    const res = await fetch(`${activeUrl}/separate`, {
      method: 'POST',
      headers,
      body: forwardForm,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    // Handle distinct backend error responses
    if (!res.ok) {
      const errText = await res.text();

      if (res.status === 401 || res.status === 403) {
        return NextResponse.json(
          {
            error: 'Authentication failed connecting to Demucs backend. Verify STEM_API_KEY in environment variables.',
            code: 'AUTH_FAILURE',
            details: errText,
          },
          { status: res.status }
        );
      }

      if (res.status === 413) {
        return NextResponse.json(
          {
            error: 'Uploaded audio file exceeds the backend maximum payload limit.',
            code: 'PAYLOAD_TOO_LARGE',
            details: errText,
          },
          { status: 413 }
        );
      }

      if (res.status === 429) {
        return NextResponse.json(
          {
            error: 'Backend rate limit or concurrency quota reached. Please try again shortly.',
            code: 'QUOTA_EXCEEDED',
            details: errText,
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          error: `Demucs backend error (${res.status}): ${errText}`,
          code: 'BACKEND_PROCESSING_ERROR',
          statusCode: res.status,
        },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({
      success: true,
      creationId: data.creationId || data.jobId,
      jobId: data.jobId || data.creationId,
      preset: preset,
      engine: 'demucs',
      status: data.status || 'queued',
      message: 'Demucs separation job queued successfully.',
    });
  } catch (err: unknown) {
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    const msg = err instanceof Error ? err.message : 'Separation dispatch exception';
    return NextResponse.json(
      {
        error: isTimeout
          ? `Connection to Demucs engine on ${activeUrl} timed out during upload.`
          : `Could not reach Demucs engine on ${activeUrl}: ${msg}`,
        code: 'BACKEND_UNAVAILABLE',
        launchHelp: config.launchHelp,
      },
      { status: 503 }
    );
  }
}
