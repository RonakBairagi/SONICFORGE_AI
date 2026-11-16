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

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (parseErr) {
      return NextResponse.json(
        {
          error: 'Failed to parse upload form data. If your file is over 4.5MB, serverless limits may apply. Consider using a compressed MP3 or the Public Music Link import.',
          code: 'FORM_PARSE_ERROR',
        },
        { status: 400 }
      );
    }

    const file = formData.get('audio') as File | null;
    const preset = (formData.get('preset') as string) || '4_tracks';

    if (!file) {
      return NextResponse.json(
        { error: 'Audio file is required for stem separation.', code: 'MISSING_FILE' },
        { status: 400 }
      );
    }

    // Step 1: Upload audio file to Neural Analog (/from-file)
    const uploadForm = new FormData();
    uploadForm.append('audio', file, file.name);
    uploadForm.append('file_source', 'from_file');

    const uploadRes = await fetch(`${API_BASE}/from-file`, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
      },
      body: uploadForm,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      return NextResponse.json(
        {
          error: `Neural Analog audio ingestion rejected (${uploadRes.status}): ${errText}`,
          code: 'INGESTION_FAILED',
        },
        { status: uploadRes.status }
      );
    }

    const uploadJson = await uploadRes.json();
    const audioId = uploadJson.audio_id;

    if (!audioId) {
      return NextResponse.json(
        { error: 'Failed to receive audio tracking ID from Neural Analog.', code: 'NO_AUDIO_ID' },
        { status: 500 }
      );
    }

    // Step 2: Poll audio upload completion (usually ready in 1-3 seconds)
    let audioReady = false;
    let attempts = 0;
    while (!audioReady && attempts < 12) {
      attempts++;
      await new Promise((r) => setTimeout(r, 1200));
      const statusRes = await fetch(`${API_BASE}/status/audio/${audioId}`, {
        headers: { 'X-API-Key': apiKey },
      });
      if (statusRes.ok) {
        const statusJson = await statusRes.json();
        if (statusJson.is_failed) {
          return NextResponse.json(
            { error: statusJson.error_message || 'Audio file processing failed on provider.', code: 'PROCESSING_FAILED' },
            { status: 500 }
          );
        }
        if (statusJson.is_complete) {
          audioReady = true;
          break;
        }
      }
    }

    // Step 3: Trigger Neural Stem Separation (/create-stems)
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
    const msg = err instanceof Error ? err.message : 'Internal stem separation error';
    return NextResponse.json({ error: msg, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
