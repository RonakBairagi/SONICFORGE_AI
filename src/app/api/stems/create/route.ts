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
 * Triggers stem separation job on Neural Analog using an already ingested audioId
 */
export async function POST(req: NextRequest) {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Neural Analog API Key is not configured', code: 'MISSING_API_KEY' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const audioId = body.audioId?.trim();
    const preset = body.preset || '4_tracks';

    if (!audioId) {
      return NextResponse.json(
        { error: 'audioId is required to start stem separation.', code: 'MISSING_AUDIO_ID' },
        { status: 400 }
      );
    }

    // Call /create-stems
    const res = await fetch(`${API_BASE}/create-stems`, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_id: audioId,
        preset: preset,
        bit_depth: 24,
        hq_streaming_format: 'mp3',
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        {
          error: `Failed to trigger stem separation (${res.status}): ${errText}`,
          code: 'CREATE_STEMS_FAILED',
        },
        { status: res.status }
      );
    }

    const data = await res.json();
    const creationId = data.creation_id;
    const audioStems = data.audio_stems || [];

    return NextResponse.json({
      success: true,
      creationId,
      audioId,
      preset,
      stems: audioStems,
      status: 'in_progress',
      message: 'Stem separation initiated successfully.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Stem creation exception';
    return NextResponse.json({ error: msg, code: 'CREATE_EXCEPTION' }, { status: 500 });
  }
}

