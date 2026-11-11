import { NextRequest, NextResponse } from 'next/server';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const { messages, userContext } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages are required.' }, { status: 400 });
    }

    const lastMessage = messages[messages.length - 1].content.toLowerCase();

    // High quality contextual domain intelligence for SonicForge AI studio
    let reply = '';
    let suggestedPrompt: string | undefined = undefined;

    if (
      lastMessage.includes('prompt') ||
      lastMessage.includes('write') ||
      lastMessage.includes('idea') ||
      lastMessage.includes('synthwave') ||
      lastMessage.includes('cinematic') ||
      lastMessage.includes('lofi') ||
      lastMessage.includes('ambient')
    ) {
      if (lastMessage.includes('synthwave') || lastMessage.includes('80s') || lastMessage.includes('retro')) {
        reply =
          "Here is a great Synthwave production prompt: **'1984 neon highway drive, analog Juno-106 poly synth leads, punchy LinnDrum snare, pulsing arpeggiated bassline, nostalgic and driving at 120 BPM'**.\n\nYou can tweak the pacing to 118-124 BPM and keep 'Instrumental Only' checked for pure synth ambiance.";
        suggestedPrompt =
          '1984 neon highway drive, analog Juno-106 poly synth leads, punchy LinnDrum snare, pulsing arpeggiated bassline, nostalgic and driving';
      } else if (lastMessage.includes('cinematic') || lastMessage.includes('trailer') || lastMessage.includes('movie')) {
        reply =
          "For epic cinematic scores, layer acoustic orchestrations with modern sound design: **'Dark cinematic trailer crescendo with deep brass braams, frantic staccato violins, thunderous Taiko percussion, building from suspenseful silence into a triumphant heroic climax'**.\n\nTip: Set duration to 60 seconds to allow the dynamic build to unfold naturally.";
        suggestedPrompt =
          'Dark cinematic trailer crescendo with deep brass braams, frantic staccato violins, thunderous Taiko percussion, triumphant heroic climax';
      } else if (lastMessage.includes('lofi') || lastMessage.includes('study') || lastMessage.includes('chill')) {
        reply =
          "For relaxing lofi beats, emphasize warmth and vinyl texture: **'Chill lofi hip-hop study beat, dusty Rhodes electric piano, mellow muted trumpet accents, warm boombap drums, relaxed late-night atmosphere, gentle vinyl crackle at 85 BPM'**.\n\nThis works smoothly with instrumental mode enabled in the Music Studio.";
        suggestedPrompt =
          'Chill lofi hip-hop study beat, dusty Rhodes electric piano, mellow muted trumpet accents, warm boombap drums, vinyl crackle';
      } else {
        reply =
          "To craft a standout AI music prompt on SonicForge AI, follow the 4-layer formula:\n1. **Mood & Setting** (e.g., 'Euphoric sunrise festival anthem')\n2. **Core Instrumentation** (e.g., 'Stratocaster guitar riffs, 808 sub bass, tight live drums')\n3. **Genre & Tempo** (e.g., 'Modern indie pop-rock at 116 BPM')\n4. **Production Flavor** (e.g., 'Crisp wide stereo mix, warm tape saturation')\n\nWould you like me to tailor a prompt for a specific genre or project?";
        suggestedPrompt =
          'Atmospheric indie electro-pop ballad, shimmering electric guitar, lush synth pads, warm acoustic drums, reflective and uplifting';
      }
    } else if (
      lastMessage.includes('quota') ||
      lastMessage.includes('credit') ||
      lastMessage.includes('limit') ||
      lastMessage.includes('rate limit')
    ) {
      reply =
        "ElevenLabs plans have specific monthly character and concurrency quotas:\n- **Free Tier**: 10,000 monthly characters (suitable for brief sound effects and testing).\n- **Music API**: Requires adequate character balance on ElevenLabs. If you hit a 429 status code or insufficient credits error, wait a few minutes or upgrade your tier on the ElevenLabs console.\n- **Diagnostics**: Visit the **Diagnostics** page (/diagnostics) at any time to verify key health and account status safely.";
    } else if (
      lastMessage.includes('sfx') ||
      lastMessage.includes('sound effect') ||
      lastMessage.includes('foley')
    ) {
      reply =
        "The SFX Studio (/sfx) uses ElevenLabs' dedicated Text-to-Sound model (`eleven_text_to_sound_v2`).\n\nBest practices for sound design:\n- Be descriptive with physical materials (e.g., *'Heavy wooden door slamming in empty stone cathedral'* rather than just *'door'*).\n- Set **Prompt Influence** higher (0.6 - 0.8) for strict literal sounds, or lower (0.2 - 0.4) for atmospheric textures.\n- Toggle **Loop Mode** for continuous background soundscapes like rain or spaceship engine hums.";
      suggestedPrompt =
        'Futuristic spaceship airlock depressurizing with heavy hydraulic hiss and metallic clank';
    } else if (
      lastMessage.includes('help') ||
      lastMessage.includes('support') ||
      lastMessage.includes('ticket') ||
      lastMessage.includes('email')
    ) {
      reply =
        "Need help with your studio session?\n- Open a ticket directly in **Help & Support** (/support) — tickets persist securely to your account in Firestore.\n- Or click 'Send Support Email' on the Support page to draft an email directly to our engineering desk at support@sonicforge.ai.\n- You can also check system connectivity anytime under **Diagnostics**.";
    } else {
      reply =
        "Welcome to SonicForge AI! I am Sonic Assistant, your AI music copilot. I can help you structure song arrangements, generate genre-defining prompts for ElevenLabs Music, craft sound effects, and navigate your studio projects.\n\nTry asking: *'Help me write a cinematic sci-fi soundtrack prompt'* or *'How do I create looping ambient rain in the SFX studio?'*";
    }

    return NextResponse.json({
      reply,
      suggestedPrompt,
      timestamp: Date.now(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json(
      { error: `Assistant reasoning error: ${message}` },
      { status: 500 }
    );
  }
}

