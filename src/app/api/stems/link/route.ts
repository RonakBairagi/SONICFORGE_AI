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

// Supported provider patterns according to Neural Analog documentation
const SUPPORTED_LINK_PATTERNS = [
  /suno\.(com|ai)/i,
  /youtube\.com\/watch/i,
  /youtu\.be\//i,
  /youtube\.com\/shorts/i,
  /spotify\.com\/(track|album|playlist)/i,
  /udio\.com\/songs/i,
  /topmediai\.com/i,
  /musicful\.ai/i,
  /mureka\.ai/i,
  /flowmusic/i,
  /treblo/i,
  /tad\.ai/i,
];

/**
 * Step 1: Import public music link (Suno, YouTube, Spotify, etc.) via Neural Analog (/from-link)
 * Decoupled: returns audio_id immediately so frontend can track ingestion separately.
 */
export async function POST(req: NextRequest) {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Neural Analog API Key is not configured on the server.', code: 'MISSING_API_KEY' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const rawUrl = body.url?.trim();

    if (!rawUrl) {
      return NextResponse.json(
        { error: 'Please enter a valid song URL.', code: 'EMPTY_URL' },
        { status: 400 }
      );
    }

    // URL validation
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawUrl);
    } catch {
      return NextResponse.json(
        {
          error: 'Invalid URL format. Please provide a complete URL starting with https://',
          code: 'MALFORMED_URL',
        },
        { status: 400 }
      );
    }

    const isSupported = SUPPORTED_LINK_PATTERNS.some((pattern) => pattern.test(parsedUrl.href));
    if (!isSupported) {
      return NextResponse.json(
        {
          error:
            'Unsupported link source. Neural Analog link import supports public links from Suno, YouTube, YouTube Shorts, Spotify, Udio, TopMediaAI, Musicful, and Mureka. For local files or custom links, use the Direct Audio File Upload tab.',
          code: 'UNSUPPORTED_DOMAIN',
        },
        { status: 400 }
      );
    }

    // Call Neural Analog /from-link
    const res = await fetch(`${API_BASE}/from-link`, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: parsedUrl.href }),
    });

    if (!res.ok) {
      const errText = await res.text();
      let userMsg = `Audio import rejected by provider (${res.status}): ${errText}`;
      if (res.status === 422) {
        userMsg = 'Neural Analog could not parse this link. Please ensure the link is public and accessible.';
      } else if (res.status === 401) {
        userMsg = 'Authentication failed with Neural Analog. Please check your AUDIO_SEPARATION_API_KEY in Vercel.';
      }
      return NextResponse.json({ error: userMsg, code: 'IMPORT_REJECTED' }, { status: res.status });
    }

    const data = await res.json();
    const audioId = data.audio_id;

    if (!audioId) {
      return NextResponse.json(
        { error: 'Failed to receive audio asset tracking ID from Neural Analog.', code: 'NO_AUDIO_ID' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      audioId,
      url: parsedUrl.href,
      status: data.status || 'in_progress',
      message: data.message || 'Public track import initiated successfully.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Link import exception';
    return NextResponse.json({ error: msg, code: 'LINK_EXCEPTION' }, { status: 500 });
  }
}
