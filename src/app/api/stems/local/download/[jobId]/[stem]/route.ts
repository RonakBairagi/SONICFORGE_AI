import { NextRequest, NextResponse } from 'next/server';
import {
  getStemBackendResolution,
  resolveActiveLocalServerUrl,
  getStemBackendHeaders,
} from '@/lib/local-stem-config';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string; stem: string } }
) {
  const config = getStemBackendResolution();

  if (!config.isConfigured || !config.url) {
    return NextResponse.json(
      { error: config.error || 'Hosted Demucs stem backend is not configured in Vercel.', code: 'MISSING_PRODUCTION_BACKEND' },
      { status: 503 }
    );
  }

  const activeUrl = await resolveActiveLocalServerUrl();
  if (!activeUrl) {
    return NextResponse.json(
      { error: `Demucs backend on ${config.url} is unavailable.`, code: 'BACKEND_UNAVAILABLE' },
      { status: 503 }
    );
  }

  try {
    const { jobId, stem } = params;
    if (!jobId || !stem) {
      return NextResponse.json(
        { error: 'Missing jobId or stem filename parameter.', code: 'INVALID_REQUEST' },
        { status: 400 }
      );
    }

    const decodedStem = decodeURIComponent(stem);
    const rangeHeader = req.headers.get('range');
    const headers: Record<string, string> = {
      ...getStemBackendHeaders(),
    };
    if (rangeHeader) {
      headers['Range'] = rangeHeader;
    }

    const res = await fetch(`${activeUrl}/stems/${jobId}/${encodeURIComponent(decodedStem)}`, {
      headers,
    });

    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json(
          {
            error: `Stem file '${stem}' for job ${jobId.slice(0, 8)} was not found on Demucs backend storage.`,
            code: 'STEM_NOT_FOUND',
          },
          { status: 404 }
        );
      }

      if (res.status === 401 || res.status === 403) {
        return NextResponse.json(
          {
            error: 'Authentication failed downloading stem from Demucs backend.',
            code: 'AUTH_FAILURE',
          },
          { status: res.status }
        );
      }

      return NextResponse.json(
        { error: `Backend download error (${res.status})`, code: 'DOWNLOAD_ERROR' },
        { status: res.status }
      );
    }

    const arrayBuffer = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') || 'audio/wav';
    const contentRange = res.headers.get('content-range');
    const responseHeaders: Record<string, string> = {
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Content-Disposition': `inline; filename="${stem}"`,
      'Cache-Control': 'public, max-age=86400',
    };
    if (contentRange) {
      responseHeaders['Content-Range'] = contentRange;
    }

    return new NextResponse(arrayBuffer, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Download proxy exception';
    return NextResponse.json(
      { error: `Download proxy failed: ${msg}`, code: 'DOWNLOAD_EXCEPTION' },
      { status: 500 }
    );
  }
}
