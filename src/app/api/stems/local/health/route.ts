import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 10;

const LOCAL_SERVER_URL = process.env.LOCAL_DEMUCS_SERVER_URL || 'http://127.0.0.1:8000';

export async function GET() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${LOCAL_SERVER_URL}/health`, {
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
        url: LOCAL_SERVER_URL,
      });
    }

    return NextResponse.json({
      online: false,
      message: `Local server returned status ${res.status}`,
      url: LOCAL_SERVER_URL,
    });
  } catch {
    return NextResponse.json({
      online: false,
      message: 'Local Demucs engine is not running on http://127.0.0.1:8000.',
      url: LOCAL_SERVER_URL,
      launchHelp: 'Run local-stem-server/start.bat or python -m uvicorn server:app --port 8000 to launch free local separation.',
    });
  }
}
