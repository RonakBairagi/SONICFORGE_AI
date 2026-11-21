import { NextResponse } from 'next/server';
import { resolveActiveLocalServerUrl } from '@/lib/local-stem-config';

export const dynamic = 'force-dynamic';
export const maxDuration = 10;

export async function GET() {
  const activeUrl = await resolveActiveLocalServerUrl();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`${activeUrl}/health`, {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({
        online: true,
        device: data.device || 'cpu',
        deviceName: data.deviceName || 'Local Machine',
        model: data.defaultModel || 'htdemucs',
        port: data.port || (activeUrl.includes(':') ? activeUrl.split(':').pop() : '8765'),
        url: activeUrl,
      });
    }

    return NextResponse.json({
      online: false,
      message: `Local server on ${activeUrl} returned status ${res.status}`,
      url: activeUrl,
    });
  } catch {
    return NextResponse.json({
      online: false,
      message: `Local Demucs engine is not running on ${activeUrl}.`,
      url: activeUrl,
      launchHelp: 'Run local-stem-server/start.bat or python -m uvicorn server:app --port 8765 to launch free local separation.',
    });
  }
}
