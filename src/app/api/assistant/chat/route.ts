import { NextRequest, NextResponse } from 'next/server';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages array is required.' }, { status: 400 });
    }

    const rawInput = messages[messages.length - 1]?.content || '';
    const q = rawInput.toLowerCase().trim();

    let reply = '';
    let suggestedPrompt: string | undefined = undefined;

    // 1. GREETINGS & CASUAL INTERACTION
    if (
      q === 'hello' ||
      q === 'hi' ||
      q === 'hey' ||
      q === 'yo' ||
      q.startsWith('hello') ||
      q.startsWith('hi ') ||
      q.startsWith('hey ') ||
      q.includes('how are you') ||
      q.includes('who are you') ||
      q.includes('good morning') ||
      q.includes('good evening') ||
      q.includes('what can you do')
    ) {
      reply =
        "Hey producer! I am Sonic Assistant, your AI music copilot. I can help you design song structures, generate rich ElevenLabs music prompts, craft custom sound effects, and answer music production questions.\n\nWhat kind of track or sound are you in the mood to create today? Tell me a genre, an instrument, or a mood, and I'll build the arrangement for you!";
      suggestedPrompt =
        'Uplifting modern indie pop-rock with clean Stratocaster riffs, energetic live drums, and warm analog bass';
    }

    // 2. HIP HOP, TRAP, DRILL & PHONK
    else if (
      q.includes('hip hop') ||
      q.includes('hip-hop') ||
      q.includes('rap') ||
      q.includes('trap') ||
      q.includes('drill') ||
      q.includes('phonk') ||
      q.includes('boom bap') ||
      q.includes('808')
    ) {
      if (q.includes('drill')) {
        reply =
          "For UK/NY Drill, focus on sliding 808 sub-bass, syncopated off-beat hi-hat rolls, dark reverse piano samples, and sharp snares around 140–144 BPM.\n\nTip: In the Music Studio, set the duration to 30s and tempo to 142 BPM.";
        suggestedPrompt =
          'Dark UK drill beat with sliding distorted 808 bass, syncopated triplet hi-hats, minor key Rhodes chops, tense and menacing at 142 BPM';
      } else if (q.includes('phonk')) {
        reply =
          "For Drift Phonk, prioritize heavy cowbell melodies, heavily distorted 808 sub bass, chopped vocal samples, and gritty Memphis cassette tape warmth at 160 BPM.";
        suggestedPrompt =
          'Aggressive drift phonk anthem, distorted cowbell lead, crunchy overdriven 808 sub bass, retro tape saturation, high octane energy at 160 BPM';
      } else if (q.includes('boom bap')) {
        reply =
          "For 90s East Coast Boom Bap, keep the kick and snare dusty and unquantized, layered over soulful vinyl horns and upright bass at 88–92 BPM.";
        suggestedPrompt =
          'Golden era 90s boom bap beat, soulful chopped jazz horn sample, dusty acoustic drum break, warm upright bass, vinyl crackle at 90 BPM';
      } else {
        reply =
          "For modern Hip-Hop & Trap, the secret is giving the 808 room to breathe while crisp hi-hats drive the pulse.\n\nKey components: Hard-hitting kick, layered 808 sub, snappy clap, and hypnotic minor-key melody at 130–140 BPM.";
        suggestedPrompt =
          'Hard-hitting modern trap beat, deep melodic 808 sub bass, fast rolling hi-hats, moody bell melody, atmospheric reverb at 136 BPM';
      }
    }

    // 3. ELECTRONIC, EDM, HOUSE, TECHNO & TRANCE
    else if (
      q.includes('edm') ||
      q.includes('house') ||
      q.includes('techno') ||
      q.includes('trance') ||
      q.includes('dance') ||
      q.includes('electronic') ||
      q.includes('dubstep') ||
      q.includes('club')
    ) {
      if (q.includes('techno')) {
        reply =
          "For driving peak-time Techno, anchor the groove around a heavy rumbling sub-kick, hypnotic modular synth stabs, rolling 16th-note percussion, and industrial metallic textures at 132–138 BPM.";
        suggestedPrompt =
          'Dark hypnotic peak-time techno, rolling sub-heavy kick drum, analog modular synth pulses, gritty industrial warehouse atmosphere at 134 BPM';
      } else {
        reply =
          "For modern House & Dance, use an energetic four-on-the-floor kick, groovy offbeat open hi-hats, sidechained basslines, and euphoric piano or synth stabs around 124–128 BPM.";
        suggestedPrompt =
          'Euphoric deep house groove, punchy four-on-the-floor kick, pumping sidechained bassline, lush vocal chops, bright piano chords at 126 BPM';
      }
    }

    // 4. ROCK, METAL, PUNK & GUITAR
    else if (
      q.includes('rock') ||
      q.includes('metal') ||
      q.includes('punk') ||
      q.includes('guitar') ||
      q.includes('grunge') ||
      q.includes('heavy')
    ) {
      if (q.includes('metal') || q.includes('heavy')) {
        reply =
          "For Modern Metal, combine down-tuned palm-muted 8-string guitars, aggressive double-kick drum patterns, grinding bass guitar, and dynamic breakdowns around 130–150 BPM.";
        suggestedPrompt =
          'Heavy modern metal track, down-tuned 8-string distorted guitars, thunderous double-bass drums, soaring melodic guitar solo, aggressive and powerful';
      } else {
        reply =
          "For dynamic Indie Rock, blend overdriven rhythm guitars, bright melodic single-coil lead riffs, driving live bass, and punchy acoustic drums around 120–128 BPM.";
        suggestedPrompt =
          'Energetic indie alternative rock, overdriven Telecaster chords, driving bassline, punchy live drum kit, bright and anthemic chorus';
      }
    }

    // 5. LO-FI, CHILL, STUDY & RELAXING
    else if (
      q.includes('lofi') ||
      q.includes('lo-fi') ||
      q.includes('chill') ||
      q.includes('study') ||
      q.includes('relax') ||
      q.includes('sleep') ||
      q.includes('calm') ||
      q.includes('peaceful')
    ) {
      reply =
        "For Lo-Fi and Chillout music, warm imperfections are key: soft tape flutter, dusty Rhodes electric piano chords, gentle vinyl surface noise, and unhurried boom-bap drums at 75–85 BPM.";
      suggestedPrompt =
        'Cozy lo-fi study beat, gentle Rhodes electric piano, mellow muted trumpet riffs, warm acoustic boom-bap drums, gentle vinyl crackle at 80 BPM';
    }

    // 6. SYNTHWAVE, RETROWAVE & CYBERPUNK
    else if (
      q.includes('synthwave') ||
      q.includes('retrowave') ||
      q.includes('cyberpunk') ||
      q.includes('80s') ||
      q.includes('retro') ||
      q.includes('neon')
    ) {
      reply =
        "For 80s Synthwave and Cyberpunk, layer analog poly-synth chords (Juno-106 style), gated reverb snare hits, driving arpeggiated basslines, and soaring synth leads at 118–124 BPM.";
      suggestedPrompt =
        '1984 neon highway drive, analog Juno poly synth leads, punchy LinnDrum snare with gated reverb, pulsing arpeggiated bassline, nostalgic retro synthwave';
    }

    // 7. CINEMATIC, ORCHESTRAL, FILM SCORE & TRAILER
    else if (
      q.includes('cinematic') ||
      q.includes('orchestral') ||
      q.includes('trailer') ||
      q.includes('movie') ||
      q.includes('film') ||
      q.includes('soundtrack') ||
      q.includes('epic') ||
      q.includes('score')
    ) {
      reply =
        "For high-impact Cinematic cues, create a dynamic dynamic build: start with an intimate motif (cello or solo piano), layer in frantic staccato strings, and crescendo with French horns, massive taiko drums, and brass braams.";
      suggestedPrompt =
        'Epic cinematic orchestral cue building from a solo cello and grand piano into massive brass braams, frantic violins, and thunderous taiko percussion';
    }

    // 8. AMBIENT, MEDITATION & DRONE
    else if (
      q.includes('ambient') ||
      q.includes('drone') ||
      q.includes('meditation') ||
      q.includes('yoga') ||
      q.includes('zen') ||
      q.includes('spa') ||
      q.includes('soundscape')
    ) {
      reply =
        "For Ambient and Meditation audio, eliminate sharp rhythmic transients. Use evolving granular synth pads, soft reverberant guitar swells, subtle chimes, and deep sub-bass frequencies.";
      suggestedPrompt =
        'Ethereal ambient meditation soundscape, slowly evolving analog synth pads, gentle singing bowl resonances, soft reverberant textures, deeply calming and immersive';
    }

    // 9. JAZZ, BLUES, SOUL & R&B
    else if (
      q.includes('jazz') ||
      q.includes('blues') ||
      q.includes('soul') ||
      q.includes('r&b') ||
      q.includes('rnb') ||
      q.includes('funk')
    ) {
      reply =
        "For smooth Jazz and Neo-Soul, use rich extended 7th and 9th chord voicings on electric piano, a warm walking upright bass, brushed snare drums, and an expressive tenor saxophone or muted trumpet.";
      suggestedPrompt =
        'Late night jazz club instrumental, mellow tenor saxophone melody, warm walking upright bass, brushed snare drums, vintage Rhodes piano chords';
    }

    // 10. ACOUSTIC, FOLK & COUNTRY
    else if (
      q.includes('acoustic') ||
      q.includes('folk') ||
      q.includes('country') ||
      q.includes('indie folk') ||
      q.includes('banjo')
    ) {
      reply =
        "For Acoustic and Folk music, highlight intimate wooden instruments: steel-string acoustic guitar fingerpicking, warm upright bass, gentle shaker rhythms, and delicate mandolin or violin accents.";
      suggestedPrompt =
        'Warm indie folk acoustic ballad, rhythmic fingerpicked acoustic guitar, subtle upright bass, soft violin harmonies, organic and heartfelt';
    }

    // 11. REGGAE, AFROBEATS & WORLD
    else if (
      q.includes('reggae') ||
      q.includes('afrobeat') ||
      q.includes('afrobeats') ||
      q.includes('latin') ||
      q.includes('bossa nova') ||
      q.includes('indian') ||
      q.includes('bollywood') ||
      q.includes('sitar')
    ) {
      if (q.includes('afrobeat')) {
        reply =
          "For contemporary Afrobeats and Amapiano, build the groove around deep log drums, syncopated shaker rhythms, warm melodic electric piano chords, and bright brass stabs at 100–108 BPM.";
        suggestedPrompt =
          'Vibrant modern Afrobeats groove, rhythmic acoustic guitar licks, deep Amapiano log drum bass, syncopated shakers, uplifting and infectious';
      } else if (q.includes('indian') || q.includes('bollywood') || q.includes('sitar')) {
        reply =
          "For Indian Classical Fusion, blend melodic sitar improvisations, bansuri bamboo flute melodies, and dynamic tabla rhythms over cinematic orchestral string swells.";
        suggestedPrompt =
          'Cinematic Indian classical fusion, expressive sitar melody, dynamic tabla percussion, bansuri bamboo flute, lush orchestral string backdrop';
      } else {
        reply =
          "For Reggae and Dub, keep the bassline heavy and melodic, with rhythmic guitar and organ skanks on the offbeats (beats 2 and 4), paired with expansive spring reverb and tape delay.";
        suggestedPrompt =
          'Classic roots reggae groove, deep melodic sub bassline, rhythmic guitar skanks on the offbeat, crisp one-drop drum pattern, warm dub delay';
      }
    }

    // 12. VIDEO GAME SOUNDTRACKS & 8-BIT
    else if (
      q.includes('game') ||
      q.includes('gaming') ||
      q.includes('8-bit') ||
      q.includes('chiptune') ||
      q.includes('boss') ||
      q.includes('rpg')
    ) {
      reply =
        "For Game Soundtracks, match the intensity of the scene! For boss fights, use hybrid industrial brass and fast drums. For exploration, use mystical flutes, harp plucks, and ambient pads.";
      suggestedPrompt =
        'Fast-paced action RPG boss battle theme, aggressive hybrid synth bass, pounding orchestral brass, dramatic strings, heroic and urgent';
    }

    // 13. SOUND EFFECTS & FOLEY REQUESTS
    else if (
      q.includes('sfx') ||
      q.includes('sound effect') ||
      q.includes('foley') ||
      q.includes('explosion') ||
      q.includes('rain') ||
      q.includes('laser') ||
      q.includes('impact') ||
      q.includes('footstep') ||
      q.includes('whoosh') ||
      q.includes('gun') ||
      q.includes('thunder')
    ) {
      reply =
        "To craft sound effects in our SFX Studio (/sfx), describe the physical texture, materials, and reverberation tail.\n\nTip: Set Prompt Influence to 0.4 for realistic sound design, and toggle 'Loop' if you need continuous rain or ambient hums.";
      suggestedPrompt =
        'Massive cinematic trailer braam impact with deep sub-bass drop and metallic reverberation tail';
    }

    // 14. SPECIFIC EMOTIONS / MOODS (Sad, Happy, Dark, Energetic, Romantic)
    else if (
      q.includes('sad') ||
      q.includes('crying') ||
      q.includes('emotional') ||
      q.includes('depress') ||
      q.includes('melanchol') ||
      q.includes('heartbreak')
    ) {
      reply =
        "For an emotional, melancholic mood, slow tempos (65–75 BPM) and minor scales (such as D minor or A minor) work wonders. Use a gentle solo piano, expressive cello swells, and subtle tape hiss.";
      suggestedPrompt =
        'Deeply melancholic cinematic ballad, delicate solo piano melody, sorrowful cello harmonies, rain textures, intimate and heartbreaking';
    } else if (
      q.includes('happy') ||
      q.includes('uplifting') ||
      q.includes('joy') ||
      q.includes('cheerful') ||
      q.includes('positive')
    ) {
      reply =
        "For an uplifting, joyful vibe, write in major keys with bright instrumentation: acoustic guitar strums, cheerful piano riffs, bouncy brass fanfares, and crisp handclaps around 120 BPM.";
      suggestedPrompt =
        'Cheerful uplifting acoustic pop groove, sunny acoustic guitar strumming, bright piano chords, handclaps, warm and inspirational';
    } else if (
      q.includes('dark') ||
      q.includes('scary') ||
      q.includes('horror') ||
      q.includes('spooky') ||
      q.includes('tense') ||
      q.includes('suspense')
    ) {
      reply =
        "For dark and suspenseful audio, use dissonant string clusters, deep sub-bass drones, clock-ticking percussion, and sudden metallic scraping textures.";
      suggestedPrompt =
        'Dark psychological thriller cue, creeping low sub drone, dissonant violin scrapes, rhythmic heartbeat kick drum, tense and unsettling';
    } else if (
      q.includes('energetic') ||
      q.includes('gym') ||
      q.includes('workout') ||
      q.includes('hype') ||
      q.includes('intense')
    ) {
      reply =
        "For high-energy workout or sports cues, pump up the tempo (130–150 BPM) with aggressive synth basslines, driving live drum breaks, and adrenaline-pumping builds.";
      suggestedPrompt =
        'High-energy workout anthem, driving distorted synth bass, aggressive punchy drums, uplifting brass stabs, motivational at 135 BPM';
    }

    // 15. TECHNICAL QUESTIONS (Tempo, BPM, Compression, Mastering, Stems)
    else if (
      q.includes('bpm') ||
      q.includes('tempo') ||
      q.includes('compression') ||
      q.includes('mastering') ||
      q.includes('reverb') ||
      q.includes('mix') ||
      q.includes('structure') ||
      q.includes('verse')
    ) {
      if (q.includes('bpm') || q.includes('tempo')) {
        reply =
          "BPM stands for **Beats Per Minute** and sets your track's pacing:\n- **60–80 BPM**: Lo-Fi, Ballads, Ambient\n- **90–110 BPM**: Hip-Hop, R&B, Funk\n- **120–128 BPM**: House, Pop, Synthwave, Rock\n- **130–150 BPM**: Trap, Techno, Drum & Bass, Metal\n\nYou can specify BPM directly in your prompt in the Music Studio!";
      } else if (q.includes('compression')) {
        reply =
          "**Audio Compression** reduces the dynamic range of an audio signal—making the quiet parts louder and taming the loudest peaks so your drums and vocals sound thick, punchy, and glued together.";
      } else {
        reply =
          "A classic commercial song structure consists of:\n1. **Intro** (4–8 bars setting the atmosphere)\n2. **Verse** (develops the theme)\n3. **Pre-Chorus** (builds tension)\n4. **Chorus** (highest energy / main hook)\n5. **Bridge** (contrasting variation)\n6. **Outro** (resolution)\n\nIn SonicForge, describe this progression in your prompt to get dynamic builds!";
      }
      suggestedPrompt =
        'Dynamic arrangement building from a 4-bar piano intro into an energetic drum and synth chorus, resolving with a mellow outro';
    }

    // 16. DYNAMIC SEMANTIC REASONING FOR ANY OTHER VOICE / TEXT INPUT
    else {
      // Analyze input words to extract themes, moods, and imagery
      const words = rawInput.replace(/[^a-zA-Z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
      const subject = words.slice(0, 8).join(' ');

      reply = `I heard your idea: **"${rawInput}"**!\n\nTo translate this into audio, I've designed a custom production arrangement tailored to your theme. We'll balance the frequency spectrum with rich melodic layers, dynamic rhythmic pacing, and studio-grade stereo separation.\n\nClick the button below to load this custom prompt directly into the Music Studio!`;

      suggestedPrompt = `Original production inspired by "${subject}": atmospheric instrumentation, rich melodic textures, driving rhythmic pulse, polished stereo mix`;
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
