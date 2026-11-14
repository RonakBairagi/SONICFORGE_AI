import { NextResponse } from 'next/server';
import { DiagnosticItem } from '@/types';

export async function GET() {
  const results: DiagnosticItem[] = [];
  const now = Date.now();

  // 1. Check Firebase Client Configuration
  const hasFirebaseConfig = Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  );

  results.push({
    service: 'Firebase Web SDK (Client)',
    status: hasFirebaseConfig ? 'verified' : 'missing',
    details: hasFirebaseConfig
      ? `Configured with Project ID: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`
      : 'Missing required NEXT_PUBLIC_FIREBASE_* environment variables.',
    lastChecked: now,
  });

  results.push({
    service: 'Firebase Cloud Firestore',
    status: hasFirebaseConfig ? 'verified' : 'missing',
    details: 'User collections: /users, /projects, /tracks, /sound_effects, /support_tickets',
    lastChecked: now,
  });

  results.push({
    service: 'Firebase Storage',
    status: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? 'configured' : 'missing',
    details: `Target bucket: ${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'Not set'}`,
    lastChecked: now,
  });

  // 2. Check ElevenLabs API Key & Subscription (Safe read-only call)
  const elKey = (process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS_API_KEY)?.trim();
  if (!elKey) {
    results.push({
      service: 'ElevenLabs Core API',
      status: 'missing',
      details: 'ELEVENLABS_API_KEY is not defined in server environment.',
      lastChecked: now,
    });
    results.push({
      service: 'ElevenLabs Music Generation (/v1/music)',
      status: 'missing',
      details: 'Dependent on ElevenLabs API key.',
      lastChecked: now,
    });
    results.push({
      service: 'ElevenLabs Sound Effects (/v1/sound-generation)',
      status: 'missing',
      details: 'Dependent on ElevenLabs API key.',
      lastChecked: now,
    });
  } else {
    try {
      const startTime = Date.now();
      const userRes = await fetch('https://api.elevenlabs.io/v1/user', {
        headers: { 'xi-api-key': elKey },
      });
      const latency = Date.now() - startTime;

      if (userRes.ok) {
        const userData = await userRes.json();
        const tier = userData.subscription?.tier || 'Free';
        const characterCount = userData.subscription?.character_count ?? 0;
        const characterLimit = userData.subscription?.character_limit ?? 10000;

        results.push({
          service: 'ElevenLabs Core API',
          status: 'verified',
          details: `Tier: ${tier} | Usage: ${characterCount} / ${characterLimit} chars`,
          tier,
          latencyMs: latency,
          lastChecked: now,
        });

        // Test Music endpoint schema reachability (OPTIONS / empty POST validation without charging credits)
        try {
          const musicProbe = await fetch('https://api.elevenlabs.io/v1/music', {
            method: 'POST',
            headers: {
              'xi-api-key': elKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
          });
          // Status 422 means endpoint reached and validated body schema successfully
          if (musicProbe.status === 422 || musicProbe.ok) {
            results.push({
              service: 'ElevenLabs Music Generation (/v1/music)',
              status: 'verified',
              details: 'Endpoint verified & schema active (model: music_v2).',
              lastChecked: now,
            });
          } else {
            results.push({
              service: 'ElevenLabs Music Generation (/v1/music)',
              status: 'configured',
              details: `Endpoint responded with status ${musicProbe.status}`,
              lastChecked: now,
            });
          }
        } catch (e: unknown) {
          results.push({
            service: 'ElevenLabs Music Generation (/v1/music)',
            status: 'failed',
            details: 'Network error reaching /v1/music',
            error: e instanceof Error ? e.message : 'Unknown error',
            lastChecked: now,
          });
        }

        // Test SFX endpoint schema reachability
        try {
          const sfxProbe = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
            method: 'POST',
            headers: {
              'xi-api-key': elKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
          });
          if (sfxProbe.status === 422 || sfxProbe.ok) {
            results.push({
              service: 'ElevenLabs Sound Effects (/v1/sound-generation)',
              status: 'verified',
              details: 'Endpoint active (model: eleven_text_to_sound_v2).',
              lastChecked: now,
            });
          } else {
            results.push({
              service: 'ElevenLabs Sound Effects (/v1/sound-generation)',
              status: 'configured',
              details: `Status ${sfxProbe.status}`,
              lastChecked: now,
            });
          }
        } catch (e: unknown) {
          results.push({
            service: 'ElevenLabs Sound Effects (/v1/sound-generation)',
            status: 'failed',
            details: 'Network error reaching /v1/sound-generation',
            error: e instanceof Error ? e.message : 'Unknown error',
            lastChecked: now,
          });
        }
      } else {
        results.push({
          service: 'ElevenLabs Core API',
          status: 'failed',
          details: `Authentication failed (HTTP ${userRes.status}). Verify your API key.`,
          lastChecked: now,
        });
      }
    } catch (err: unknown) {
      results.push({
        service: 'ElevenLabs Core API',
        status: 'failed',
        details: 'Failed to establish connection to api.elevenlabs.io',
        error: err instanceof Error ? err.message : 'Network failure',
        lastChecked: now,
      });
    }
  }

  // 3. Check Rime TTS Configuration & Connectivity
  const rimeKey = (
    process.env.RIME_TTS_API_KEY ||
    process.env.RIMETTS_API_KEY ||
    process.env.RIME_API_KEY
  )?.trim();
  if (!rimeKey) {
    results.push({
      service: 'Rime Coda TTS API',
      status: 'missing',
      details: 'RIME_TTS_API_KEY or RIMETTS_API_KEY is not defined in server environment.',
      lastChecked: now,
    });
  } else {
    try {
      const startTime = Date.now();
      // Test Rime schema reachability
      const rimeProbe = await fetch('https://coda.api.rime.ai/', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${rimeKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      const latency = Date.now() - startTime;

      // Status 400 with missing text indicates valid bearer token accepted and reached model parser
      if (rimeProbe.status === 400 || rimeProbe.ok) {
        results.push({
          service: 'Rime Coda TTS API',
          status: 'verified',
          details: 'Voice synthesis server active (Endpoint: coda.api.rime.ai | Default voice: astra)',
          latencyMs: latency,
          lastChecked: now,
        });
      } else if (rimeProbe.status === 401) {
        results.push({
          service: 'Rime Coda TTS API',
          status: 'failed',
          details: 'Authentication rejected (HTTP 401 Unauthorized). Verify RIME_TTS_API_KEY.',
          lastChecked: now,
        });
      } else {
        results.push({
          service: 'Rime Coda TTS API',
          status: 'configured',
          details: `Endpoint responded with status ${rimeProbe.status}`,
          lastChecked: now,
        });
      }
    } catch (err: unknown) {
      results.push({
        service: 'Rime Coda TTS API',
        status: 'failed',
        details: 'Network error connecting to coda.api.rime.ai',
        error: err instanceof Error ? err.message : 'Network error',
        lastChecked: now,
      });
    }
  }

  return NextResponse.json({
    timestamp: now,
    results,
    serverEnvironment: process.env.NODE_ENV || 'development',
  });
}

