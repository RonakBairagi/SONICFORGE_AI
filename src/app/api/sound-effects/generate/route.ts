import { NextRequest, NextResponse } from 'next/server';
import { Buffer } from 'buffer';

export async function POST(req: NextRequest) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s server-side safety timeout

  try {
    const body = await req.json();
    const {
      prompt,
      duration_seconds = 4.0,
      prompt_influence = 0.3,
      loop = false,
    } = body;

    const apiKey = (process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS_API_KEY)?.trim();
    if (!apiKey) {
      clearTimeout(timeoutId);
      return NextResponse.json(
        {
          error: 'ElevenLabs API key is not configured on the server. Please add ELEVENLABS_API_KEY in your settings.',
          code: 'MISSING_API_KEY',
        },
        { status: 500 }
      );
    }

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      clearTimeout(timeoutId);
      return NextResponse.json(
        { error: 'Sound effect description prompt is required.', code: 'INVALID_PROMPT' },
        { status: 400 }
      );
    }

    // Clamp duration between 0.5s and 30s (ElevenLabs SFX v3 supports up to 30 seconds)
    const clampedDuration = Math.max(0.5, Math.min(30.0, Number(duration_seconds) || 4.0));
    // Clamp prompt influence between 0.0 and 1.0
    const clampedInfluence = Math.max(0.0, Math.min(1.0, Number(prompt_influence) || 0.3));

    const startTime = Date.now();

    // Call official ElevenLabs Sound Generation API with eleven_text_to_sound_v3
    // Endpoint: POST https://api.elevenlabs.io/v1/sound-generation
    let response = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
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
        model_id: 'eleven_text_to_sound_v3',
      }),
      signal: controller.signal,
    });

    let usedModel = 'eleven_text_to_sound_v3';

    // If eleven_text_to_sound_v3 is rejected on certain accounts, fallback to v2
    if (!response.ok && response.status === 400) {
      const errCheck = await response.clone().text();
      if (errCheck.includes('model_id') || errCheck.includes('eleven_text_to_sound_v3')) {
        response = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
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
          signal: controller.signal,
        });
        usedModel = 'eleven_text_to_sound_v2';
      }
    }

    clearTimeout(timeoutId);

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
            error: 'ElevenLabs rate limit or character quota exceeded. Please wait 60 seconds.',
            code: 'RATE_LIMIT_EXCEEDED',
          },
          { status: 429 }
        );
      }
      if (response.status === 402) {
        return NextResponse.json(
          {
            error: 'ElevenLabs account has insufficient character credits for sound effect generation.',
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
    const generationDuration = (Date.now() - startTime) / 1000;

    return NextResponse.json({
      success: true,
      audioUrl: audioDataUrl,
      durationSeconds: clampedDuration,
      promptInfluence: clampedInfluence,
      loop: Boolean(loop),
      modelId: usedModel,
      provider: 'elevenlabs',
      byteSize: audioBuffer.byteLength,
      generationTimeSeconds: Number(generationDuration.toFixed(2)),
    });
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    const message = error instanceof Error ? error.message : 'Unknown server error';
    const isAbort = error instanceof Error && error.name === 'AbortError';

    return NextResponse.json(
      {
        error: isAbort
          ? 'Sound effect generation timed out after 25s. Please try again with a shorter duration.'
          : `Sound effects generation failed: ${message}`,
        code: isAbort ? 'TIMEOUT' : 'INTERNAL_ERROR',
      },
      { status: isAbort ? 504 : 500 }
    );
  }
}
