import { NextRequest, NextResponse } from 'next/server';
import { Buffer } from 'buffer';

/**
 * Helper to condense prompts for the ElevenLabs Sound Generation fallback engine
 * Strict requirement: text must be <= 440 characters to avoid HTTP 400 text_too_long
 */
function buildAcousticFallbackPrompt(params: {
  title?: string;
  genre?: string;
  mood?: string;
  tempo?: string;
  instrumentation?: string[];
  vocalStyle?: string;
  vocalGender?: string;
  language?: string;
  lyrics?: string;
  prompt: string;
  isInstrumental: boolean;
}): string {
  const {
    title,
    genre = 'Modern Pop',
    mood = 'Uplifting',
    tempo = '120 BPM',
    instrumentation = [],
    vocalStyle = 'Melodic singing vocals',
    vocalGender = 'Female vocals',
    language = 'English',
    lyrics,
    prompt,
    isInstrumental,
  } = params;

  const instrumentsStr =
    Array.isArray(instrumentation) && instrumentation.length > 0
      ? instrumentation.slice(0, 3).join(', ')
      : 'piano, synthesizers, and drums';

  const concept = (prompt || title || 'original melodic track').trim();

  if (isInstrumental) {
    const base = `Instrumental music: ${genre}, ${mood}, ${tempo}. Arrangement featuring ${instrumentsStr}. Concept: ${concept}.`;
    return base.length > 420 ? base.substring(0, 417) + '...' : base;
  }

  // Extract a concise vocal lyric snippet / hook from user lyrics if provided
  let lyricHook = '';
  if (lyrics && lyrics.trim()) {
    const cleanLines = lyrics
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('[') && !l.endsWith(']'));
    if (cleanLines.length > 0) {
      lyricHook = cleanLines.slice(0, 2).join(' / ');
      if (lyricHook.length > 80) lyricHook = lyricHook.substring(0, 77) + '...';
    }
  }

  const vocalInfo = `${vocalStyle} (${vocalGender}${language && language !== 'English' ? `, ${language}` : ''})`;
  let combined = `Full song with singing vocals: ${genre}, ${mood}, ${tempo}. Concept: ${concept}. Vocals: ${vocalInfo}.`;
  if (lyricHook) {
    combined += ` Singing lyrics: "${lyricHook}".`;
  }
  combined += ` Instruments: ${instrumentsStr}.`;

  if (combined.length > 420) {
    return combined.substring(0, 417) + '...';
  }
  return combined;
}

export async function POST(req: NextRequest) {
  const controller = new AbortController();
  // Server-side safety timeout: 90s to accommodate deep ElevenLabs music models without hanging indefinitely
  const timeoutId = setTimeout(() => controller.abort(), 90000);

  const startTime = Date.now();

  try {
    const body = await req.json();
    const {
      title,
      prompt,
      genre = 'Synthpop / Modern Pop',
      mood = 'Euphoric & Energetic',
      instrumentation = [],
      tempo = '124 BPM',
      creationMode = 'full_song', // 'full_song' | 'custom_song' | 'instrumental' | 'structured'
      lyrics,
      vocalStyle = 'Soaring & Anthemic',
      vocalGender = 'Female Vocals (Soprano / Warm)',
      language = 'English',
      durationMs = 30000, // default 30s
      additionalInstructions,
      compositionPlan,
    } = body;

    // Validate server environment
    const apiKey = (process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS_API_KEY)?.trim();
    if (!apiKey) {
      clearTimeout(timeoutId);
      return NextResponse.json(
        {
          error: 'ElevenLabs API key is not configured on the server. Please add ELEVENLABS_API_KEY in your deployment environment.',
          code: 'MISSING_API_KEY',
        },
        { status: 500 }
      );
    }

    // Validate prompt/lyrics inputs
    const effectivePrompt = (prompt || title || (lyrics ? `Song with lyrics: ${lyrics.substring(0, 60)}` : '')).trim();
    if (!effectivePrompt) {
      clearTimeout(timeoutId);
      return NextResponse.json(
        { error: 'A song concept, title, or lyrics must be provided.', code: 'INVALID_PROMPT' },
        { status: 400 }
      );
    }

    const isInstrumental = creationMode === 'instrumental';

    // Construct full high-fidelity prompt for the official ElevenLabs Music API
    let enhancedPrompt = effectivePrompt;
    const attributes: string[] = [];
    if (genre) attributes.push(`Genre: ${genre}`);
    if (mood) attributes.push(`Mood: ${mood}`);
    if (tempo) attributes.push(`Tempo: ${tempo}`);
    if (instrumentation && Array.isArray(instrumentation) && instrumentation.length > 0) {
      attributes.push(`Instrumentation: ${instrumentation.join(', ')}`);
    }

    if (!isInstrumental) {
      attributes.push(`Vocal delivery: ${vocalStyle}`);
      attributes.push(`Vocalist: ${vocalGender}`);
      if (language && language !== 'English') attributes.push(`Language: ${language}`);
      if (lyrics && lyrics.trim()) {
        enhancedPrompt = `${enhancedPrompt}\n\nSong Lyrics:\n${lyrics.trim()}`;
      } else {
        enhancedPrompt = `${enhancedPrompt}. Include complete singing vocal melodies and lyrics throughout the arrangement.`;
      }
    } else {
      attributes.push('Pure instrumental arrangement, absolutely no vocals');
    }

    if (additionalInstructions && additionalInstructions.trim()) {
      attributes.push(`Notes: ${additionalInstructions.trim()}`);
    }

    if (attributes.length > 0) {
      enhancedPrompt = `${enhancedPrompt}\n[Production Notes: ${attributes.join(' | ')}]`;
    }

    // Clamp duration between 5s and 180s
    const clampedDuration = Math.max(5000, Math.min(180000, Number(durationMs) || 30000));

    let response: Response;
    let usedModel = 'music_v2_5';

    // 1. Attempt Official ElevenLabs Music API (/v1/music)
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

    // If music_v2_5 is not supported on certain accounts, fallback to music_v2
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

    // If Official Music API Succeeded
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
        title: title || effectivePrompt.split('.')[0].substring(0, 40),
        lyrics: !isInstrumental ? lyrics : undefined,
        genre,
        mood,
        vocalStyle: !isInstrumental ? vocalStyle : undefined,
        vocalGender: !isInstrumental ? vocalGender : undefined,
        byteSize: audioBuffer.byteLength,
        generationTimeSeconds: elapsedSeconds,
        engineTier: 'paid_elevenlabs_music',
      });
    }

    // Read provider error
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

    // 2. Intelligent Free-Tier Engine Fallback:
    // When the ElevenLabs Music API is restricted to paid subscriptions (HTTP 402),
    // use ElevenLabs Sound Generation API with carefully condensed prompt under 440 chars.
    if (isPaidPlanRequired) {
      const acousticPrompt = buildAcousticFallbackPrompt({
        title,
        genre,
        mood,
        tempo,
        instrumentation,
        vocalStyle,
        vocalGender,
        language,
        lyrics,
        prompt: effectivePrompt,
        isInstrumental,
      });

      const durationSeconds = Math.max(3.0, Math.min(15.0, Math.round(clampedDuration / 1000)));

      let sfxResponse = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: acousticPrompt,
          duration_seconds: durationSeconds,
          prompt_influence: 0.4,
          model_id: 'eleven_text_to_sound_v3',
        }),
        signal: controller.signal,
      });

      let usedSfxModel = 'eleven_text_to_sound_v3';

      // If eleven_text_to_sound_v3 is not available on this tier, fallback to eleven_text_to_sound_v2
      if (!sfxResponse.ok && sfxResponse.status === 400) {
        const errCheck = await sfxResponse.clone().text();
        if (errCheck.includes('model_id') || errCheck.includes('eleven_text_to_sound_v3')) {
          sfxResponse = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
            method: 'POST',
            headers: {
              'xi-api-key': apiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: acousticPrompt,
              duration_seconds: durationSeconds,
              prompt_influence: 0.4,
              model_id: 'eleven_text_to_sound_v2',
            }),
            signal: controller.signal,
          });
          usedSfxModel = 'eleven_text_to_sound_v2';
        }
      }

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
          modelId: usedSfxModel,
          provider: 'elevenlabs',
          creationMode,
          title: title || effectivePrompt.split('.')[0].substring(0, 40),
          lyrics: !isInstrumental ? lyrics : undefined,
          genre,
          mood,
          vocalStyle: !isInstrumental ? vocalStyle : undefined,
          vocalGender: !isInstrumental ? vocalGender : undefined,
          byteSize: audioBuffer.byteLength,
          generationTimeSeconds: elapsedSeconds,
          engineTier: 'free_tier_acoustic_engine',
          note: 'Synthesized with ElevenLabs Audio Engine (Free Tier Compatible)',
        });
      }
    }

    clearTimeout(timeoutId);

    // Specific error messages
    if (response.status === 401) {
      return NextResponse.json(
        {
          error: 'Invalid ElevenLabs API key. Please verify ELEVENLABS_API_KEY in your environment configuration.',
          code: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }
    if (response.status === 429) {
      return NextResponse.json(
        {
          error: 'ElevenLabs rate limit or character quota reached. Please wait 60 seconds before trying again.',
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
          ? 'Music generation request timed out after 45s. Please retry with a shorter duration.'
          : `Internal music generation error: ${message}`,
        code: isAbort ? 'TIMEOUT' : 'INTERNAL_ERROR',
      },
      { status: isAbort ? 504 : 500 }
    );
  }
}
