import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, speaker = 'astra', lang = 'en' } = body;

    const apiKey = (
      process.env.RIME_TTS_API_KEY ||
      process.env.RIMETTS_API_KEY ||
      process.env.RIME_API_KEY
    )?.trim();
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'Rime TTS API key is not configured on the server. Please check your Vercel environment variables (RIME_TTS_API_KEY or RIMETTS_API_KEY).',
          code: 'MISSING_API_KEY',
        },
        { status: 500 }
      );
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Speech synthesis text is required.', code: 'INVALID_TEXT' },
        { status: 400 }
      );
    }

    // Call official Rime Coda TTS API
    // Endpoint: POST https://coda.api.rime.ai/
    const response = await fetch('https://coda.api.rime.ai/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'audio/mp3',
      },
      body: JSON.stringify({
        text: text.trim(),
        speaker: speaker || 'astra',
        lang: lang || 'en',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          error: `Rime TTS API returned status ${response.status}: ${errorText.substring(0, 200)}`,
          code: 'RIME_ERROR',
        },
        { status: response.status }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    const audioDataUrl = `data:audio/mpeg;base64,${base64Audio}`;

    return NextResponse.json({
      success: true,
      audioUrl: audioDataUrl,
      speaker,
      byteSize: audioBuffer.byteLength,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json(
      { error: `Rime voice synthesis failed: ${message}`, code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

