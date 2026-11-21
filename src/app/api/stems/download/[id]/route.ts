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

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const stemId = params.id;
    if (!stemId) {
      return NextResponse.json({ error: 'Stem ID is required' }, { status: 400 });
    }

    const apiKey = getApiKey();
    // Request download from Neural Analog with manual redirect handling to capture S3 signed URL
    const res = await fetch(`${API_BASE}/download/stem/${stemId}`, {
      headers: {
        'X-API-Key': apiKey,
      },
      redirect: 'manual',
    });

    // If Neural Analog returns 307 Redirect with signed S3 URL, redirect the client directly
    if (res.status === 307 || res.status === 302 || res.status === 301) {
      const location = res.headers.get('location');
      if (location) {
        return NextResponse.redirect(location, 307);
      }
    }

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `Download failed (${res.status}): ${errText}` },
        { status: res.status }
      );
    }

    const blob = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') || 'audio/wav';

    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="stem_${stemId.slice(0, 8)}.wav"`,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Stem download proxy failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
