import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      prompt,
      genre,
      mood,
      instrumentation,
      tempo,
      creationMode = 'full_song',
      lyrics,
      vocalStyle,
      vocalGender,
      durationMs = 30000,
    } = body;

    const apiKey = (process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS_API_KEY)?.trim();
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing ElevenLabs API key' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const isInstrumental = creationMode === 'instrumental';
    let enhancedPrompt = prompt ? prompt.trim() : 'Upbeat energetic soundtrack';
    const attributes: string[] = [];
    if (genre) attributes.push(`Genre: ${genre}`);
    if (mood) attributes.push(`Mood: ${mood}`);
    if (tempo) attributes.push(`Tempo: ${tempo}`);
    if (instrumentation && Array.isArray(instrumentation) && instrumentation.length > 0) {
      attributes.push(`Instruments: ${instrumentation.join(', ')}`);
    }

    if (!isInstrumental) {
      attributes.push(`Vocals: ${vocalStyle || 'Singing'}`);
      if (vocalGender) attributes.push(`Vocalist: ${vocalGender}`);
      if (lyrics && lyrics.trim()) {
        enhancedPrompt = `${enhancedPrompt}\nLyrics:\n${lyrics.trim()}`;
      }
    }

    if (attributes.length > 0) {
      enhancedPrompt = `${enhancedPrompt}\n[${attributes.join(' | ')}]`;
    }

    const clampedDuration = Math.max(5000, Math.min(180000, Number(durationMs) || 30000));

    // Call official ElevenLabs Streaming endpoint
    // POST https://api.elevenlabs.io/v1/music/stream
    const streamRes = await fetch('https://api.elevenlabs.io/v1/music/stream', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: enhancedPrompt,
        music_length_ms: clampedDuration,
        force_instrumental: isInstrumental,
        model_id: 'music_v2_5',
      }),
    });

    if (!streamRes.ok) {
      const err = await streamRes.text();
      return new Response(err, {
        status: streamRes.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Stream raw audio chunks directly to client
    return new Response(streamRes.body, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Streaming error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

