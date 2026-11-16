import { NextRequest, NextResponse } from 'next/server';

const API_BASE = 'https://api.neuralanalog.com';

function getApiKey(): string {
  return (
    process.env.AUDIO_SEPARATION_API_KEY?.trim() ||
    process.env.NEURALANALOG_API_KEY?.trim() ||
    'na_live_MBbUCp6I19VqTJ-GX9XqZp5l2VNGQ43reSqJ13OS3kM'
  );
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const stemId = params.id;
    if (!stemId) {
      return NextResponse.json({ error: 'Stem ID is required' }, { status: 400 });
    }

    const apiKey = getApiKey();
    const response = await fetch(`${API_BASE}/download/stem/${stemId}`, {
      headers: {
        'X-API-Key': apiKey,
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Download failed with status ${response.status}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type') || 'audio/wav';
    const audioBytes = await response.arrayBuffer();

    return new Response(audioBytes, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="stem_${stemId}.wav"`,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Stem download streaming error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
