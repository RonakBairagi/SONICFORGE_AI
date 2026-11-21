import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 10;

const LOCAL_SERVER_URL = process.env.LOCAL_DEMUCS_SERVER_URL || 'http://127.0.0.1:8000';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId') || searchParams.get('creationId');

    if (!jobId) {
      return NextResponse.json({ error: 'jobId query parameter is required' }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`${LOCAL_SERVER_URL}/status/${jobId}`, {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json(
        { error: `Job not found or local server error (${res.status})` },
        { status: res.status }
      );
    }

    const data = await res.json();

    // Map local stem URLs to local proxy download endpoint so browsers on HTTPS/localhost can stream smoothly
    const stems = (data.stems || []).map((s: { stem_id: string; stem: string; name: string }) => ({
      stem_id: s.stem_id,
      stem: s.stem,
      name: s.name,
      download_url: `/api/stems/local/download/${jobId}/${s.stem}.wav`,
    }));

    return NextResponse.json({
      jobId: data.id || jobId,
      creationId: data.id || jobId,
      status: data.status,
      isComplete: Boolean(data.isComplete || data.status === 'completed'),
      isFailed: Boolean(data.isFailed || data.status === 'failed'),
      progress: data.progress || 0,
      statusDetails: data.statusDetails || (data.status === 'completed' ? 'Separation complete! Lossless stems ready.' : 'Processing on Demucs local engine...'),
      stems: stems,
      error: data.error || null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Status check failed';
    return NextResponse.json(
      { error: `Could not query local Demucs engine: ${msg}`, code: 'LOCAL_STATUS_ERROR' },
      { status: 503 }
    );
  }
}
