import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const API_BASE = 'https://api.neuralanalog.com';

function getApiKey(): string {
  const k1 = process.env.NEURALANALOG_API_KEY?.trim();
  if (k1 && !k1.startsWith('your_')) return k1;
  const k2 = process.env.AUDIO_SEPARATION_API_KEY?.trim();
  if (k2 && !k2.startsWith('your_')) return k2;
  return 'na_live_MBbUCp6I19VqTJ-GX9XqZp5l2VNGQ43reSqJ13OS3kM';
}

/**
 * Checks whether an imported or uploaded audio file is ready for stem separation
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const audioId = searchParams.get('audioId');

    if (!audioId) {
      return NextResponse.json(
        { error: 'audioId query parameter is required', code: 'MISSING_PARAM' },
        { status: 400 }
      );
    }

    const apiKey = getApiKey();
    const res = await fetch(`${API_BASE}/status/audio/${audioId}`, {
      headers: { 'X-API-Key': apiKey },
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `Status check failed (${res.status}): ${errText}`, code: 'STATUS_ERROR' },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({
      isComplete: Boolean(data.is_complete),
      isFailed: Boolean(data.is_failed),
      status: data.status || 'in_progress',
      statusDetails: data.status_details || null,
      errorMessage: data.error_message || null,
      audioId: data.audio_id || audioId,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to query audio status';
    return NextResponse.json({ error: msg, code: 'STATUS_EXCEPTION' }, { status: 500 });
  }
}

