import { NextResponse } from 'next/server';
import {
  getStemBackendResolution,
  resolveActiveLocalServerUrl,
  getStemBackendHeaders,
} from '@/lib/local-stem-config';

export const dynamic = 'force-dynamic';
export const maxDuration = 10;

export async function GET() {
  const config = getStemBackendResolution();

  // If in production and no hosted backend is configured, or misconfigured to localhost:
  if (!config.isConfigured || !config.url) {
    return NextResponse.json({
      online: false,
      configured: false,
      isProduction: config.isProduction,
      code: config.code || 'MISSING_PRODUCTION_BACKEND',
      message: config.error || 'Hosted Demucs stem backend is not configured in Vercel.',
      launchHelp: config.launchHelp,
      url: null,
    });
  }

  const activeUrl = await resolveActiveLocalServerUrl();
  if (!activeUrl) {
    return NextResponse.json({
      online: false,
      configured: true,
      isProduction: config.isProduction,
      code: 'BACKEND_UNAVAILABLE',
      message: `Demucs backend on ${config.url} is offline or unreachable.`,
      launchHelp: config.launchHelp,
      url: config.url,
    });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const headers = getStemBackendHeaders();
    const res = await fetch(`${activeUrl}/health`, {
      headers,
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeout);

    // Check authentication failure
    if (res.status === 401 || res.status === 403) {
      return NextResponse.json({
        online: false,
        configured: true,
        isProduction: config.isProduction,
        code: 'AUTH_FAILURE',
        message: 'Authentication failed connecting to Demucs backend. Verify STEM_API_KEY.',
        url: activeUrl,
      });
    }

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({
        online: true,
        configured: true,
        isProduction: config.isProduction,
        device: data.device || 'cpu',
        deviceName: data.deviceName || (config.isProduction ? 'Hosted Cloud GPU' : 'Local Machine'),
        model: data.defaultModel || 'htdemucs',
        port: data.port || (activeUrl.includes(':') ? activeUrl.split(':').pop() : undefined),
        url: activeUrl,
      });
    }

    return NextResponse.json({
      online: false,
      configured: true,
      isProduction: config.isProduction,
      code: 'BACKEND_STATUS_ERROR',
      message: `Demucs backend on ${activeUrl} returned status ${res.status}.`,
      url: activeUrl,
    });
  } catch (err: unknown) {
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    return NextResponse.json({
      online: false,
      configured: true,
      isProduction: config.isProduction,
      code: 'BACKEND_UNAVAILABLE',
      message: isTimeout
        ? `Health check to Demucs engine on ${activeUrl} timed out.`
        : `Demucs engine is unreachable on ${activeUrl}.`,
      url: activeUrl,
      launchHelp: config.isProduction
        ? 'If your backend is hosted on a free cloud tier (like Render or Hugging Face), it may be waking from cold sleep. Please wait 30 seconds and retry.'
        : 'Run local-stem-server/start.bat to launch your local Demucs engine.',
    });
  }
}
