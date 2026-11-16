import { NextRequest, NextResponse } from 'next/server';

const API_BASE = 'https://api.neuralanalog.com';

function getApiKey(): string {
  return (
    process.env.AUDIO_SEPARATION_API_KEY?.trim() ||
    process.env.NEURALANALOG_API_KEY?.trim() ||
    'na_live_MBbUCp6I19VqTJ-GX9XqZp5l2VNGQ43reSqJ13OS3kM'
  );
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const creationId = searchParams.get('creationId');

    if (!creationId) {
      return NextResponse.json(
        { error: 'creationId query parameter is required', code: 'MISSING_PARAM' },
        { status: 400 }
      );
    }

    const apiKey = getApiKey();
    const statusRes = await fetch(`${API_BASE}/status/stem_split/${creationId}`, {
      headers: { 'X-API-Key': apiKey },
    });

    if (!statusRes.ok) {
      const errText = await statusRes.text();
      return NextResponse.json(
        { error: `Status check failed (${statusRes.status}): ${errText}`, code: 'STATUS_ERROR' },
        { status: statusRes.status }
      );
    }

    const statusJson = await statusRes.json();

    if (statusJson.is_failed) {
      return NextResponse.json({
        isComplete: false,
        isFailed: true,
        errorMessage: statusJson.error_message || 'Neural Analog stem splitting failed.',
      });
    }

    if (statusJson.is_complete) {
      // For completed stems, extract stem artifacts
      const stems = (statusJson.audio_stems || []).map((stem: { stem_id: string; stem_name?: string; label?: string; duration?: number }) => {
        return {
          id: stem.stem_id,
          name: stem.stem_name || stem.label || 'Stem',
          downloadUrl: `${API_BASE}/download/stem/${stem.stem_id}`,
        };
      });

      return NextResponse.json({
        isComplete: true,
        isFailed: false,
        progress: 100,
        stems,
        result: statusJson,
      });
    }

    // In progress
    return NextResponse.json({
      isComplete: false,
      isFailed: false,
      progress: statusJson.progress || 50,
      status: 'processing',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Status polling error';
    return NextResponse.json({ error: msg, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
