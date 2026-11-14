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

    // Validate server environment (support alternative names and trim)
    const apiKey = (process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS_API_KEY)?.trim();
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'ElevenLabs API key is not configured on the server. Please check your Vercel or environment variables.',
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

    // 1. First attempt: Official ElevenLabs Music API (music_v2)
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

    // If Music API succeeds (e.g. Paid tier)
    if (response.ok) {
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
    }

    // Read error response from /v1/music
    const errorText = await response.text();
    let errorJson: { detail?: { code?: string; message?: string; status?: string } | string } = {};
    try {
      errorJson = JSON.parse(errorText);
    } catch (_) {}

    const detailObj = typeof errorJson.detail === 'object' ? errorJson.detail : null;
    const isPaidPlanRequired =
      response.status === 402 ||
      detailObj?.code === 'paid_plan_required' ||
      (typeof errorJson.detail === 'string' && errorJson.detail.includes('paid plan'));

    // 2. Intelligent Free-Tier Fallback:
    // If the ElevenLabs account is on Free Tier and blocked from /v1/music,
    // seamlessly generate the musical cue using ElevenLabs's Sound Generation API!
    if (isPaidPlanRequired) {
      const durationSeconds = Math.max(3.0, Math.min(22.0, Math.round(clampedDuration / 1000)));
      const sfxResponse = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: enhancedPrompt,
          duration_seconds: durationSeconds,
          prompt_influence: 0.35,
          model_id: 'eleven_text_to_sound_v2',
        }),
      });

      if (sfxResponse.ok) {
        const audioBuffer = await sfxResponse.arrayBuffer();
        const base64Audio = Buffer.from(audioBuffer).toString('base64');
        const audioDataUrl = `data:audio/mpeg;base64,${base64Audio}`;

        return NextResponse.json({
          success: true,
          audioUrl: audioDataUrl,
          durationMs: durationSeconds * 1000,
          modelId: 'eleven_text_to_sound_v2',
          provider: 'elevenlabs',
          enhancedPrompt,
          byteSize: audioBuffer.byteLength,
          note: 'Synthesized via ElevenLabs Sound Engine (Free Tier Compatible)',
        });
      }
    }

    // Return specific sanitized error messages
    if (response.status === 401) {
      return NextResponse.json(
        { error: 'Invalid or unauthorized ElevenLabs API key. Please check your key in Vercel.', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }
    if (response.status === 429) {
      return NextResponse.json(
        {
          error: 'ElevenLabs rate limit reached or character quota exhausted. Please try again in 60 seconds.',
          code: 'RATE_LIMIT_EXCEEDED',
        },
        { status: 429 }
      );
    }

    const message =
      typeof errorJson.detail === 'string'
        ? errorJson.detail
        : detailObj?.message ||
          `ElevenLabs API returned status ${response.status}: ${errorText.substring(0, 200)}`;

    return NextResponse.json(
      { error: message, code: 'PROVIDER_ERROR', rawStatus: response.status },
      { status: response.status }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json(
      { error: `Internal music generation failure: ${message}`, code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
