/**
 * SonicForge AI - Google Gemini Integration Layer
 * Connects securely to the Google Generative AI API (Gemini 1.5 Flash / 2.0)
 * Server-side only; secret keys are never passed to the browser bundle.
 */

export interface GeminiResponse {
  reply: string;
  suggestedPrompt?: string;
  action?: {
    type: 'studio_prompt' | 'custom_song' | 'sfx_prompt' | 'support_ticket';
    payload?: Record<string, unknown>;
  };
}

const SONICFORGE_SYSTEM_PROMPT = `You are Sonic Assistant, the expert AI audio engineer, songwriter, and creative copilot inside SonicForge AI.
SonicForge AI is a professional DAW and AI music & sound studio built for musicians, indie game developers, filmmakers, and podcasters.

Your capabilities & knowledge in SonicForge AI:
1. AI Music & Vocal Studio: Powered by ElevenLabs Music API (music_v2_5) with creation modes:
   - "Full Song with AI Vocals": Generates complete sung compositions with natural AI-sung melodies, lyrics, and arrangements.
   - "Custom Song Creation": Allows users to provide their own lyrics, choose vocal styles (Soaring, Intimate, Raspy Rock, Melodic Pop, Rap Flow, Soulful R&B), vocalist gender, tempo, and language (English, Hindi, Spanish, French, Japanese, etc.).
   - "Instrumental Only": Orchestral scores, synthwave, lo-fi beats, ambient soundscapes.
2. Sound Effects & Foley Studio: Powered by ElevenLabs Text-to-Sound v3. Creates cinematic braams, airlocks, ambient weather, UI chimes, and magical portals.
3. Audio Architecture: Real Web Audio API decoding (no fake waveforms), 45s safety timeout, and dual-engine fallback.
4. Multilingual Songwriting: You write original, rhyming, rhythmic song lyrics in ANY requested language (Hindi, Punjabi, English, Spanish, Japanese, etc.) formatted with section tags like [Verse 1], [Chorus], [Outro].

Guidelines for your responses:
- Directly answer the user's creative or technical question.
- If they ask for lyrics or a song idea, write evocative, rhyming lyrics with clear song section headers.
- If they ask for a music or SFX prompt, provide actionable production parameters (tempo in BPM, key instruments, mood).
- If they encounter an error (like 402 or 429), explain clearly that 402 means free-tier quota limits (which SonicForge automatically mitigates via its dual-engine fallback) and 429 means rate-limiting.
- Keep your answers inspiring, concise, and focused on audio production.
`;

export async function queryGeminiAssistant(
  conversation: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
): Promise<GeminiResponse | null> {
  const apiKey = (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY
  )?.trim();

  if (!apiKey) {
    return null;
  }

  try {
    const contents = [
      {
        role: 'user',
        parts: [{ text: SONICFORGE_SYSTEM_PROMPT }],
      },
      ...conversation.map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      })),
    ];

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.75,
            maxOutputTokens: 1000,
          },
        }),
      }
    );

    if (!res.ok) {
      console.warn(`Gemini API returned HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    const replyText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    if (!replyText) return null;

    // Extract potential suggested studio prompt from reply
    let suggestedPrompt: string | undefined = undefined;
    const promptMatch = replyText.match(/Prompt:\s*["“]?([^"\n\r]{20,200})["”]?/i);
    if (promptMatch) {
      suggestedPrompt = promptMatch[1].trim();
    }

    return {
      reply: replyText,
      suggestedPrompt,
    };
  } catch (err) {
    console.warn('Gemini query failed, switching to local semantic reasoner:', err);
    return null;
  }
}
