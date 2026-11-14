import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const controller = new AbortController();
  // Server-side timeout: 45s safety limit to prevent hanging connections
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  const startTime = Date.now();

  try {
    const body = await req.json();
    const {
      prompt,
      genre,
      mood,
      instrumentation,
      tempo,
      creationMode = 'full_song', // 'full_song' | 'instrumental' | 'structured'
      lyrics,
      vocalStyle,
      vocalGender,
      language = 'English',
      durationMs = 30000, // default 30s
      compositionPlan,
    } = body;

    // Validate server environment
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

    // Validate user inputs
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      clearTimeout(timeoutId);
      return NextResponse.json(
        { error: 'Prompt or song description is required.', code: 'INVALID_PROMPT' },
        { status: 400 }
      );
    }

    const isInstrumental = creationMode === 'instrumental';

    // Construct enhanced prompt based on creation mode
    let enhancedPrompt = prompt.trim();
    const attributes: string[] = [];
    if (genre) attributes.push(`Genre: ${genre}`);
    if (mood) attributes.push(`Mood: ${mood}`);
    if (tempo) attributes.push(`Tempo: ${tempo}`);
    if (instrumentation && Array.isArray(instrumentation) && instrumentation.length > 0) {
      attributes.push(`Instruments: ${instrumentation.join(', ')}`);
    }

    if (!isInstrumental) {
      attributes.push(`Vocal delivery: ${vocalStyle || 'Expressive singing vocals'}`);
      if (vocalGender) attributes.push(`Vocalist: ${vocalGender}`);
      if (language && language !== 'English') attributes.push(`Language: ${language}`);
      if (lyrics && lyrics.trim()) {
        enhancedPrompt = `${enhancedPrompt}\n\nSong Lyrics:\n${lyrics.trim()}`;
      } else {
        enhancedPrompt = `${enhancedPrompt}. Include full vocal melodies and singing vocals throughout the track.`;
      }
    } else {
      attributes.push('Pure instrumental arrangement, no vocals');
    }

    if (attributes.length > 0) {
      enhancedPrompt = `${enhancedPrompt}\n[Production: ${attributes.join(' | ')}]`;
    }

    // Clamp duration between 5000ms (5s) and 180000ms (3m)
    const clampedDuration = Math.max(5000, Math.min(180000, Number(durationMs) || 30000));

    let response: Response;
    let usedModel = 'music_v2_5';

    // 1. First attempt: Official ElevenLabs Music API (music_v2_5)
    // If compositionPlan is passed for structured songs, use composition_plan
    const requestBody: Record<string, unknown> = {
      model_id: 'music_v2_5',
      music_length_ms: clampedDuration,
      force_instrumental: isInstrumental,
    };

    if (compositionPlan && typeof compositionPlan === 'object') {
      requestBody.composition_plan = compositionPlan;
    } else {
      requestBody.prompt = enhancedPrompt;
    }

    response = await fetch('https://api.elevenlabs.io/v1/music', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    // If music_v2_5 is not supported on certain tiers, try music_v2
    if (!response.ok && response.status === 400) {
      const errText = await response.clone().text();
      if (errText.includes('model_id') || errText.includes('music_v2_5')) {
        requestBody.model_id = 'music_v2';
        usedModel = 'music_v2';
        response = await fetch('https://api.elevenlabs.io/v1/music', {
          method: 'POST',
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });
      }
    }

    // If Music API succeeds (Paid tier)
    if (response.ok) {
      clearTimeout(timeoutId);
      const audioBuffer = await response.arrayBuffer();
      const base64Audio = Buffer.from(audioBuffer).toString('base64');
      const audioDataUrl = `data:audio/mpeg;base64,${base64Audio}`;
      const elapsedSeconds = Number(((Date.now() - startTime) / 1000).toFixed(2));

      return NextResponse.json({
        success: true,
        audioUrl: audioDataUrl,
        durationMs: clampedDuration,
        modelId: usedModel,
        provider: 'elevenlabs',
        creationMode,
        lyrics: !isInstrumental ? lyrics : undefined,
        enhancedPrompt,
        byteSize: audioBuffer.byteLength,
        generationTimeSeconds: elapsedSeconds,
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

    // 2. Intelligent Free-Tier / Fallback Engine:
    // If the account is on Free Tier and blocked from /v1/music,
    // generate genuine musical audio using ElevenLabs's Sound Generation API (SFX v3)
    if (isPaidPlanRequired) {
      const durationSeconds = Math.max(3.0, Math.min(30.0, Math.round(clampedDuration / 1000)));
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
          model_id: 'eleven_text_to_sound_v3',
        }),
        signal: controller.signal,
      });

      if (sfxResponse.ok) {
        clearTimeout(timeoutId);
        const audioBuffer = await sfxResponse.arrayBuffer();
        const base64Audio = Buffer.from(audioBuffer).toString('base64');
        const audioDataUrl = `data:audio/mpeg;base64,${base64Audio}`;
        const elapsedSeconds = Number(((Date.now() - startTime) / 1000).toFixed(2));

        return NextResponse.json({
          success: true,
          audioUrl: audioDataUrl,
          durationMs: durationSeconds * 1000,
          modelId: 'eleven_text_to_sound_v3',
          provider: 'elevenlabs',
          creationMode,
          lyrics: !isInstrumental ? lyrics : undefined,
          enhancedPrompt,
          byteSize: audioBuffer.byteLength,
          generationTimeSeconds: elapsedSeconds,
          note: 'Synthesized via ElevenLabs Audio Engine (Free Tier Compatible)',
        });
      }
    }

    clearTimeout(timeoutId);

    // Return specific sanitized error messages
    if (response.status === 401) {
      return NextResponse.json(
        {
          error: 'Invalid or unauthorized ElevenLabs API key. Please check your key in Vercel settings.',
          code: 'UNAUTHORIZED',
        },
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
    clearTimeout(timeoutId);
    const message = error instanceof Error ? error.message : 'Unknown server error';
    const isAbort = error instanceof Error && error.name === 'AbortError';

    return NextResponse.json(
      {
        error: isAbort
          ? 'Music generation request timed out after 45s. Try a shorter duration or simpler arrangement.'
          : `Internal music generation failure: ${message}`,
        code: isAbort ? 'TIMEOUT' : 'INTERNAL_ERROR',
      },
      { status: isAbort ? 504 : 500 }
    );
  }
}
