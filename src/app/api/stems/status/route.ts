import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const API_BASE = 'https://api.neuralanalog.com';

function getApiKey(): string {
  return (
    process.env.AUDIO_SEPARATION_API_KEY?.trim() ||
    process.env.NEURALANALOG_API_KEY?.trim() ||
    'na_live_MBbUCp6I19VqTJ-GX9XqZp5l2VNGQ43reSqJ13OS3kM'
  );
}

/**
 * Checks stem splitting progress on Neural Analog
 */
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
        status: 'failed',
        errorMessage: statusJson.error_message || 'Neural Analog stem splitting failed.',
        statusDetails: statusJson.status_details || null,
      });
    }

    return NextResponse.json({
      isComplete: Boolean(statusJson.is_complete),
      isFailed: false,
      status: statusJson.status || (statusJson.is_complete ? 'completed' : 'in_progress'),
      statusDetails: statusJson.status_details || (statusJson.is_complete ? 'Separation complete!' : 'In processing queue...'),
      audioId: statusJson.audio_id || null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to query stem status';
    return NextResponse.json({ error: msg, code: 'STATUS_EXCEPTION' }, { status: 500 });
  }
}
