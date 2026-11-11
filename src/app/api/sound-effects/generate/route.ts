import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      prompt,
      duration_seconds = 4.0,
      prompt_influence = 0.3,
      loop = false,
    } = body;

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'ElevenLabs API key is not configured on the server.',
          code: 'MISSING_API_KEY',
        },
        { status: 500 }
      );
    }

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'Sound effect description prompt is required.', code: 'INVALID_PROMPT' },
        { status: 400 }
      );
    }

    // Clamp duration between 0.5s and 22s
    const clampedDuration = Math.max(0.5, Math.min(22.0, Number(duration_seconds) || 4.0));
    // Clamp prompt influence between 0 and 1
    const clampedInfluence = Math.max(0.0, Math.min(1.0, Number(prompt_influence) || 0.3));

    // Call official ElevenLabs Sound Generation API
    // Endpoint: POST https://api.elevenlabs.io/v1/sound-generation
    const response = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: prompt.trim(),
        duration_seconds: clampedDuration,
        prompt_influence: clampedInfluence,
        loop: Boolean(loop),
        model_id: 'eleven_text_to_sound_v2',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorJson: { detail?: { message?: string } | string } = {};
      try {
        errorJson = JSON.parse(errorText);
      } catch (_) {}

      const message =
        typeof errorJson.detail === 'string'
          ? errorJson.detail
          : errorJson.detail?.message ||
            `Sound Effects API returned status ${response.status}: ${errorText.substring(0, 200)}`;

      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Invalid or unauthorized ElevenLabs API key.', code: 'UNAUTHORIZED' },
          { status: 401 }
        );
      }
      if (response.status === 429) {
        return NextResponse.json(
          {
            error: 'ElevenLabs rate limit or quota exceeded. Please wait a moment.',
            code: 'RATE_LIMIT_EXCEEDED',
          },
          { status: 429 }
        );
      }
      if (response.status === 402) {
        return NextResponse.json(
          {
            error: 'ElevenLabs account has insufficient credits for sound effect generation.',
            code: 'INSUFFICIENT_CREDITS',
          },
          { status: 402 }
        );
      }

      return NextResponse.json(
        { error: message, code: 'PROVIDER_ERROR', rawStatus: response.status },
        { status: response.status }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    const audioDataUrl = `data:audio/mpeg;base64,${base64Audio}`;

    return NextResponse.json({
      success: true,
      audioUrl: audioDataUrl,
      durationSeconds: clampedDuration,
      promptInfluence: clampedInfluence,
      loop: Boolean(loop),
      modelId: 'eleven_text_to_sound_v2',
      provider: 'elevenlabs',
      byteSize: audioBuffer.byteLength,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json(
      { error: `Sound effects generation failed: ${message}`, code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

