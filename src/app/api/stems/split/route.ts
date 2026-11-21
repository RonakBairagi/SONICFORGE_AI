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
 * Step 1: Upload audio file directly to Neural Analog (/from-file)
 * Returns audio_id immediately without waiting for stem separation
 */
export async function POST(req: NextRequest) {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'Neural Analog API Key is not configured on the server.',
          code: 'MISSING_API_KEY',
        },
        { status: 500 }
      );
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json(
        {
          error: 'Failed to read upload stream. If your audio file is over 4.5 MB, use a compressed audio file or the Public Music Link import to bypass serverless payload limits.',
          code: 'PAYLOAD_PARSE_ERROR',
        },
        { status: 400 }
      );
    }

    const file = formData.get('audio') as File | null;
    if (!file) {
      return NextResponse.json(
        { error: 'Audio file is required for upload.', code: 'MISSING_FILE' },
        { status: 400 }
      );
    }

    // Stream multipart directly to Neural Analog
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
          error: `Neural Analog audio ingestion failed (${uploadRes.status}): ${errText}`,
          code: 'INGESTION_FAILED',
        },
        { status: uploadRes.status }
      );
    }

    const uploadJson = await uploadRes.json();
    const audioId = uploadJson.audio_id;

    if (!audioId) {
      return NextResponse.json(
        { error: 'Failed to obtain audio ID from Neural Analog.', code: 'NO_AUDIO_ID' },
        { status: 500 }
      );
    }

    // Return immediately to decouple upload from downstream processing
    return NextResponse.json({
      success: true,
      audioId,
      fileName: file.name,
      fileSize: file.size,
      status: uploadJson.status || 'in_progress',
      message: 'Audio file uploaded and ingested successfully.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Audio upload error';
    return NextResponse.json({ error: msg, code: 'UPLOAD_EXCEPTION' }, { status: 500 });
  }
}
