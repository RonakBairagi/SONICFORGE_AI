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

export async function POST(req: NextRequest) {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'Neural Analog API Key is not configured. Please set AUDIO_SEPARATION_API_KEY.',
          code: 'MISSING_API_KEY',
        },
        { status: 500 }
      );
    }

    const body = await req.json();
    const url = body.url?.trim();
    const preset = body.preset || '4_tracks';

    if (!url) {
      return NextResponse.json(
        { error: 'Public audio link (URL) is required.', code: 'MISSING_URL' },
        { status: 400 }
      );
    }

    // Step 1: Import audio link to Neural Analog (/from-link)
    const linkRes = await fetch(`${API_BASE}/from-link`, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!linkRes.ok) {
      const errText = await linkRes.text();
      return NextResponse.json(
        {
          error: `Audio link import rejected (${linkRes.status}): ${errText}`,
          code: 'LINK_IMPORT_FAILED',
        },
        { status: linkRes.status }
      );
    }

    const linkJson = await linkRes.json();
    const audioId = linkJson.audio_id;

    if (!audioId) {
      return NextResponse.json(
        { error: 'Failed to obtain audio ID from link import.', code: 'NO_AUDIO_ID' },
        { status: 500 }
      );
    }

    // Step 2: Poll audio readiness
    let audioReady = false;
    let attempts = 0;
    while (!audioReady && attempts < 15) {
      attempts++;
      await new Promise((r) => setTimeout(r, 1500));
      const statusRes = await fetch(`${API_BASE}/status/audio/${audioId}`, {
        headers: { 'X-API-Key': apiKey },
      });
      if (statusRes.ok) {
        const statusJson = await statusRes.json();
        if (statusJson.is_failed) {
          return NextResponse.json(
            { error: statusJson.error_message || 'Audio file processing failed on link import.', code: 'PROCESSING_FAILED' },
            { status: 500 }
          );
        }
        if (statusJson.is_complete) {
          audioReady = true;
          break;
        }
      }
    }

    // Step 3: Trigger Neural Stem Separation
    const splitRes = await fetch(`${API_BASE}/create-stems`, {
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

    if (!splitRes.ok) {
      const splitErr = await splitRes.text();
      return NextResponse.json(
        {
          error: `Stem split initiation failed (${splitRes.status}): ${splitErr}`,
          code: 'SPLIT_INITIATION_FAILED',
        },
        { status: splitRes.status }
      );
    }

    const splitJson = await splitRes.json();
    const creationId = splitJson.creation_id;
    const audioStems = splitJson.audio_stems || [];

    return NextResponse.json({
      success: true,
      audioId,
      creationId,
      preset,
      stems: audioStems,
      status: 'processing',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal link separation error';
    return NextResponse.json({ error: msg, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
