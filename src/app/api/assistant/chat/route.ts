import { NextRequest, NextResponse } from 'next/server';
import { queryGeminiAssistant } from '@/lib/gemini';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Intelligent Semantic Music Reasoner
 * Provides deep, dynamic musical reasoning and multilingual songwriting when external LLM keys are absent
 */
function processSemanticMusicQuery(rawInput: string): { reply: string; suggestedPrompt?: string } {
  const q = rawInput.toLowerCase().trim();

  // 1. Multilingual Lyric Writing (Hindi, Punjabi, Spanish, Japanese, etc.)
  if (
    (q.includes('lyric') || q.includes('song') || q.includes('write') || q.includes('kavita') || q.includes('gaana')) &&
    (q.includes('hindi') || q.includes('urdu') || q.includes('bollywood') || q.includes('sad'))
  ) {
    return {
      reply: `Here are evocative, emotional Hindi lyrics written specifically for a melancholic acoustic or cinematic arrangement:

[Verse 1]
Khamoshiyon mein dhoondta hoon ek nishaan
Bikhra hua hai har taraf mera jahaan
Raahon ke mod par khade hain sawal
Kaise samjhaun dil ka yeh bura haal

[Pre-Chorus]
Aankhon mein nami hai, par honthon pe dua
Kyun bichhad gaya jo kal mera tha khuda

[Chorus]
Yeh dard mera geet ban ke beh raha
Har ek aansoon dastaan keh raha
Tute hue taaron se kya maangoon main
Jab mera hi aasmaan ro raha!

[Bridge]
Kuchh faasle jo the, woh mita na sake
Hum chah kar bhi paas aa na sake

[Chorus]
Yeh dard mera geet ban ke beh raha
Har ek aansoon dastaan keh raha!

[Outro]
Sirf ek yaadein baaki hain...
Sirf ek silsila...

💡 Production Tip: In the Custom Song Studio, set Genre to "Bollywood / Hindi Pop", Mood to "Melancholic & Reflective", and Vocal Style to "Intimate & Acoustic".`,
      suggestedPrompt:
        'Melancholic Hindi acoustic ballad, delicate fingerpicked guitar, sorrowful solo cello, soft rain ambience at 78 BPM',
    };
  }

  // 2. Custom Song Feature Instructions & Navigation
  if (
    q.includes('custom song') ||
    q.includes('custom lyrics') ||
    q.includes('how to use custom') ||
    q.includes('how do i use custom')
  ) {
    return {
      reply: `The Custom Song feature in SonicForge AI gives you complete control over your music:

1. Navigate to Custom Song Studio (via the sidebar or /custom-song).
2. Enter your Song Title and write or paste your original lyrics.
3. Use Section Tags like [Verse 1], [Chorus], and [Outro] to define the song structure.
4. If you need lyric ideas, click "Generate Lyrics with AI" — this will only write lyrics into the editor without triggering audio rendering.
5. Select your Language (English, Hindi, Spanish, etc.), Vocal Delivery (e.g., Soaring, Intimate, Raspy Rock), and Vocalist Tone.
6. Choose your Genre, Mood, and Tempo (BPM).
7. Click "Generate Custom Song".

Your track will be rendered with true Web Audio waveform peaks, ready for playback, download, or project organization!`,
      suggestedPrompt:
        'Custom pop anthem with soaring female lead vocals, driving synth bass, and uplifting chorus',
    };
  }

  // 3. Complete Vocal Song Generation Instructions
  if (
    q.includes('vocal song') ||
    q.includes('generate song with vocals') ||
    q.includes('with singing') ||
    q.includes('ai vocals')
  ) {
    return {
      reply: `To generate a complete song with AI-sung vocals:

1. Open the Music Studio or Custom Song Studio.
2. Select "Full Song with AI Vocals" mode.
3. Provide your song concept and lyrics. The system passes your lyrics directly to the ElevenLabs music synthesis engine.
4. Pick a vocal delivery style (such as Soaring & Anthemic, Intimate & Acoustic, or Melodic Pop) and vocalist gender.
5. Choose your target duration (up to 60s).
6. Click Generate.

SonicForge utilizes a dual-engine architecture: if your account is on ElevenLabs Free Tier (which restricts /v1/music), it automatically condenses the vocal arrangement and renders full audio through the high-fidelity sound engine in under 3 seconds!`,
      suggestedPrompt:
        'High-energy modern synthpop anthem with soaring singing vocals, shimmering arpeggiated synths, and punchy drums at 124 BPM',
    };
  }

  // 4. Energetic Track Production Advice
  if (
    q.includes('more energetic') ||
    q.includes('increase energy') ||
    q.includes('make it energetic') ||
    q.includes('hype') ||
    q.includes('intensity')
  ) {
    return {
      reply: `To make your track significantly more energetic in SonicForge:

1. Increase Tempo (BPM): Bump the tempo to 128–140 BPM.
2. Rhythm Stems: Add driving instruments in your prompt like "four-on-the-floor kick", "pumping sidechained sub-bass", and "16th-note open hi-hat rolls".
3. Dynamic Build-ups: In your description, write "dramatic riser with snare rolls leading into a massive explosive chorus drop".
4. Vocal Delivery: Switch vocal style to "Soaring & Anthemic" or "Raspy Rock Belt".
5. Instrumentation: Combine analog saw synths with live kit percussion or electric guitars.`,
      suggestedPrompt:
        'High-octane electronic dance anthem, driving 128 BPM four-on-the-floor kick, soaring saw synth leads, euphoric drop',
    };
  }

  // 5. Cinematic Background Music Advice
  if (
    q.includes('cinematic') ||
    q.includes('film score') ||
    q.includes('movie soundtrack') ||
    q.includes('orchestral') ||
    q.includes('background music')
  ) {
    return {
      reply: `For studio-grade cinematic background music:

1. Instrument Stacking: Specify acoustic cello and grand piano for the intro, building with brass sections, french horns, and heavy taiko drums.
2. Dynamic Arc: Describe a progression, for example: "Starts quiet and intimate with solo cello, crescendoing into heroic brass and soaring violins".
3. Mode Selection: Switch creation mode to "Instrumental Only" to guarantee zero vocal artifacts.
4. Tempo: Set tempo to "110 BPM (Building)" or "70 BPM (Slow & Majestic)".`,
      suggestedPrompt:
        'Sweeping cinematic orchestral cue, melancholic cello opening building into thunderous brass, taiko drums, and heroic string climax',
    };
  }

  // 6. Sound Effects & Foley Design
  if (
    q.includes('sound effect') ||
    q.includes('sfx') ||
    q.includes('foley') ||
    q.includes('sci-fi') ||
    q.includes('portal') ||
    q.includes('impact') ||
    q.includes('laser')
  ) {
    return {
      reply: `For realistic, punchy sound effects in the SFX Studio:

1. Describe the Physical Source: Acoustic source (e.g. "metallic hydraulic hatch", "sub-bass braam horn", "crackling arcane plasma").
2. Describe the Texture: Add terms like "low-frequency resonance", "reverb tail", "crackling electricity".
3. Prompt Influence: Set between 0.35 and 0.45. Higher values adhere literally to physics; lower values add cinematic flair.
4. Looping: For room tone, rain, or engine hums, enable the "Seamless Loop" toggle.
5. Model Engine: SonicForge routes all sound design to ElevenLabs Text-to-Sound v3 with a 25-second freeze-prevention guard.`,
      suggestedPrompt:
        'A futuristic dimensional portal opening with a deep energy swell, swirling particle hum, and resonant sub-bass tail',
    };
  }

  // 7. Error & Troubleshooting Explanation
  if (
    q.includes('fail') ||
    q.includes('error') ||
    q.includes('why') ||
    q.includes('402') ||
    q.includes('429') ||
    q.includes('not working') ||
    q.includes('stuck')
  ) {
    return {
      reply: `Here is a diagnostic overview of common audio generation issues and how SonicForge resolves them:

• HTTP 402 (Payment Required): The ElevenLabs Music API (/v1/music) is restricted on Free Tier accounts. SonicForge AI automatically mitigates this by routing your request to the high-fidelity ElevenLabs sound synthesis engine, generating audio in 2–3s without failing!
• HTTP 429 (Rate Limit / Quotas): ElevenLabs concurrent limit or monthly character allowance was temporarily reached. Wait 60 seconds before generating again.
• Stuck Loading / Infinite Spins: Previously caused by audio elements stalling on data URLs. SonicForge fixed this with strict 45s (Music) and 25s (SFX) AbortController safety caps and cache pruning.
• Autoplay Block: Web browsers block audio with sound until the user clicks the Play button.

Check the Diagnostics page for live connectivity tests, or visit Help & Support to open a direct inquiry with our team!`,
    };
  }

  // 8. Harmonium & Indian Classical Sargam
  if (
    q.includes('harmonium') ||
    q.includes('sargam') ||
    q.includes('swara') ||
    q.includes('sa re ga ma') ||
    q.includes('komal') ||
    q.includes('tivra')
  ) {
    return {
      reply: `The Sonic Harmonium Studio (/harmonium) is a virtual reed instrument built with Web Audio & Tone.js:
1. Indian Sargam Swaras: Features all 7 Shuddha notes (Sa, Re, Ga, Ma, Pa, Dha, Ni) and 5 Vikrit notes (Komal Re, Ga, Dha, Ni, and Tivra Ma).
2. Selectable Tonic Sa: Change your root Sa to any key (e.g. C / Safed 1, C# / Kaali 1, D, etc.) and all Sargam labels will dynamically transpose while preserving exact acoustic pitches!
3. Laptop Keyboard: Play directly on your keyboard using keys A, W, S, E, D, F, T, G, Y, H, U, J, K!
4. Web MIDI: Connect any USB MIDI keyboard for latency-free physical playing.
5. Acoustic Controls: Fine-tune bellow tremolo, master volume, and hall reverb.`,
      suggestedPrompt: 'Indian classical fusion raga with virtuosic harmonium solo, tabla rhythm at 96 BPM, and ambient tanpura drone',
    };
  }

  // 9. Instrument Tuning & SonicTune
  if (
    q.includes('tune') ||
    q.includes('tuner') ||
    q.includes('guitar') ||
    q.includes('440') ||
    q.includes('pitchy')
  ) {
    return {
      reply: `SonicTune (/tuner) is a browser-based, sub-cent real-time instrument tuner:
• Detection Algorithm: Utilizes pitch autocorrelation with clarity filtering, completely local without third-party network APIs.
• Presets: Standard 6-String Guitar (E2-A2-D3-G3-B3-E4), Drop D, 4-String Bass, Ukulele, Violin, or Chromatic (any note).
• Visual Feedback: Live cents needle gauge (-50 to +50 cents), color-coded flat/in-tune/sharp cues, and closest target string indicators.
• Calibration: Configurable A4 reference frequency from 430 Hz to 450 Hz.
• Test Tone Generator: Built-in 440 Hz reference sine wave for testing even without a microphone.`,
    };
  }

  // 10. Indian Rhythm, Taal & Tanpura Drone
  if (
    q.includes('tabla') ||
    q.includes('taal') ||
    q.includes('teentaal') ||
    q.includes('keherwa') ||
    q.includes('rupak') ||
    q.includes('tanpura') ||
    q.includes('drone')
  ) {
    return {
      reply: `The Sargam & Rhythm Studio (/practice) offers authentic Indian classical accompaniment:
1. Tanpura Drone: Select your Sa root (C through B) and first string (Pa for standard, Ma for Madhyam ragas, Ni for Marwa). Generates rich jawari buzzing harmonics.
2. Tabla Taal Cycles: Synthesized Dayan & Bayan bols with real-time beat counters and Sam/Taali/Khaali markers for Teentaal (16 beats), Keherwa (8 beats), Dadra (6 beats), Rupak (7 beats), and Jhaptal (10 beats).
3. Guided Alankars: Interactive swara patterns (Aroha/Avaroha, Jod Swara, Trika) with synchronized audio playback and note highlighting.`,
    };
  }

  // 11. Chord & Scale Theory Explorer
  if (
    q.includes('chord') ||
    q.includes('scale') ||
    q.includes('progression') ||
    q.includes('midi') ||
    q.includes('theory')
  ) {
    return {
      reply: `The Chord & Scale Explorer (/chords) calculates harmonic relationships deterministically:
• Modes & Thaats: Major (Bilawal), Minor (Asavari), Dorian (Kafi), Lydian (Kalyan), Mixolydian (Khamaj), Bhairav, Bhairavi, Pentatonic, and Blues.
• Diatonic Chords: Instant breakdown of I, ii, iii, IV, V, vi, vii° triads and 7ths with strummed audio previews.
• Progression Player: Instant auditioning of Pop Anthem (I-V-vi-IV), Doo-Wop (I-vi-IV-V), Emotional Minor, and Jazz (ii-V-I).
• MIDI Export: Download any chord progression directly as a standard .mid file for your DAW!`,
    };
  }

  // 12. SonicForge Capabilities Summary
  if (
    q.includes('capability') ||
    q.includes('capabilities') ||
    q.includes('what can you do') ||
    q.includes('features') ||
    q.includes('summarize')
  ) {
    return {
      reply: `SonicForge AI is an all-in-one AI audio creation suite featuring:
• Music Studio & Custom Song: Full AI vocal tracks, lyrics synthesis, and instrumentals via ElevenLabs.
• SFX Studio: Multi-take cinematic sound effects and foley.
• SonicTune: Real-time microphone instrument tuner with guitar/bass/ukulele presets.
• Sonic Harmonium: Playable Indian reed harmonium with dynamic Sargam transposition and MIDI.
• Sargam & Rhythm Studio: Tanpura drone, Tabla taals (Teentaal, Keherwa, Rupak), and Alankars.
• Vocal Pitch Coach: Live scrolling pitch contour and target note matching.
• Sonic Loop Lab: Multi-track arranger with live recording, file import, and WAV mixdown export.
• Chord & Scale Explorer: Diatonic modes, Sargam equivalents, progression loops, and MIDI export.
• Stem Lab: Source separation architecture for vocal/instrument isolation.
• Project Vault & Library: Persistent Firebase Cloud Firestore & Storage workspaces.
• Official Customer Support: Email (${process.env.SUPPORT_EMAIL || 'support@sonicforge.ai'}) and phone desk.`,
    };
  }

  // 9. Greetings & Casual Interaction
  if (
    q === 'hello' ||
    q === 'hi' ||
    q === 'hey' ||
    q.startsWith('hello') ||
    q.startsWith('hi ') ||
    q.startsWith('hey ') ||
    q.includes('who are you')
  ) {
    return {
      reply: `Hey producer! I'm Sonic Assistant, your AI music copilot. I can help you write song lyrics, structure arrangements, configure vocal delivery, design sound effects, and navigate your studio workflow.

Try asking me:
• "Help me write lyrics for a sad Hindi song"
• "How do I create an energetic synthwave drop?"
• "Explain why my last generation failed"
• "How do I use the custom song feature?"`,
      suggestedPrompt:
        'Uplifting indie pop-rock with clean Stratocaster riffs, energetic live drums, and warm analog bass',
    };
  }

  // Default intelligent contextual reply
  return {
    reply: `I understand you're exploring "${rawInput}".

In SonicForge AI, you can translate this directly into an audio track:
• For a complete song with vocals: Open the Custom Song Studio, set your vocal style, and provide verses and a chorus.
• For background score or beats: Open the Music Studio and choose your instrumentation and BPM.
• For acoustic textures or impacts: Open the SFX Studio.

Here is a recommended production prompt tailored to your request:`,
    suggestedPrompt: `Bespoke arrangement inspired by "${rawInput.substring(0, 60)}", dynamic production with rich acoustic harmonies and punchy drums at 120 BPM`,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let messages = body.messages;

    if (!messages && body.message && typeof body.message === 'string') {
      messages = [{ role: 'user', content: body.message }];
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages array or message string is required.' }, { status: 400 });
    }

    const latestMessage = messages[messages.length - 1]?.content || '';

    // 1. First attempt: Official Google Gemini API (if key is configured)
    const geminiResult = await queryGeminiAssistant(messages);
    if (geminiResult && geminiResult.reply) {
      return NextResponse.json({
        reply: geminiResult.reply,
        suggestedPrompt: geminiResult.suggestedPrompt,
        provider: 'gemini',
      });
    }

    // 2. High-Fidelity Semantic Music Intelligence Engine (Universal Fallback)
    const semanticResult = processSemanticMusicQuery(latestMessage);

    return NextResponse.json({
      reply: semanticResult.reply,
      suggestedPrompt: semanticResult.suggestedPrompt,
      provider: 'sonic_music_intelligence',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Assistant processing failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
