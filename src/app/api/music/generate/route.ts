import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      prompt,
      genre,
      mood,
      instrumentation,
      tempo,
      forceInstrumental = true,
      durationMs = 30000, // default 30s
    } = body;

    // Validate server environment
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'ElevenLabs API key is not configured on the server. Please check your environment variables.',
          code: 'MISSING_API_KEY',
        },
        { status: 500 }
      );
    }

    // Validate user inputs
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'Prompt is required for music generation.', code: 'INVALID_PROMPT' },
        { status: 400 }
      );
    }

    // Build rich combined prompt with musical attributes
    let enhancedPrompt = prompt.trim();
    const attributes: string[] = [];
    if (genre) attributes.push(`genre: ${genre}`);
    if (mood) attributes.push(`mood: ${mood}`);
    if (tempo) attributes.push(`tempo: ${tempo}`);
    if (instrumentation && Array.isArray(instrumentation) && instrumentation.length > 0) {
      attributes.push(`featured instruments: ${instrumentation.join(', ')}`);
    }

    if (attributes.length > 0) {
      enhancedPrompt = `${enhancedPrompt}. Musical style details: [${attributes.join(' | ')}]`;
    }

    // Duration validation (ElevenLabs music accepts 3000ms up to 600000ms)
    const clampedDuration = Math.max(5000, Math.min(180000, Number(durationMs) || 30000));

    // Call official ElevenLabs Music API
    // Endpoint: POST https://api.elevenlabs.io/v1/music
    const response = await fetch('https://api.elevenlabs.io/v1/music', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: enhancedPrompt,
        music_length_ms: clampedDuration,
        force_instrumental: Boolean(forceInstrumental),
        model_id: 'music_v2',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorJson: { detail?: { message?: string; status?: string } | string } = {};
      try {
        errorJson = JSON.parse(errorText);
      } catch (_) {}

      const message =
        typeof errorJson.detail === 'string'
          ? errorJson.detail
          : errorJson.detail?.message ||
            `ElevenLabs Music API returned status ${response.status}: ${errorText.substring(0, 200)}`;

      // Return sanitized helpful error codes
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Invalid or unauthorized ElevenLabs API key.', code: 'UNAUTHORIZED' },
          { status: 401 }
        );
      }
      if (response.status === 429) {
        return NextResponse.json(
          {
            error: 'ElevenLabs rate limit reached or generation quota exhausted. Please try again shortly.',
            code: 'RATE_LIMIT_EXCEEDED',
          },
          { status: 429 }
        );
      }
      if (response.status === 402) {
        return NextResponse.json(
          {
            error: 'ElevenLabs account has insufficient credits for music generation.',
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

    // Successful audio stream received
    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    const audioDataUrl = `data:audio/mpeg;base64,${base64Audio}`;

    return NextResponse.json({
      success: true,
      audioUrl: audioDataUrl,
      durationMs: clampedDuration,
      modelId: 'music_v2',
      provider: 'elevenlabs',
      enhancedPrompt,
      byteSize: audioBuffer.byteLength,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json(
      { error: `Internal music generation failure: ${message}`, code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

