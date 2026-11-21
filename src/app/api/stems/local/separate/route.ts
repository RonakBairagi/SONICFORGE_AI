import { NextRequest, NextResponse } from 'next/server';
import { resolveActiveLocalServerUrl } from '@/lib/local-stem-config';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const activeUrl = await resolveActiveLocalServerUrl();

  try {
    const formData = await req.formData();
    const file = formData.get('audio') as File | null;
    const preset = (formData.get('preset') as string) || '4_tracks';

    if (!file) {
      return NextResponse.json({ error: 'Audio file is required for separation.' }, { status: 400 });
    }

    // Forward multipart to local Demucs FastAPI server
    const forwardForm = new FormData();
    forwardForm.append('audio', file, file.name);
    forwardForm.append('preset', preset);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(`${activeUrl}/separate`, {
      method: 'POST',
      body: forwardForm,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `Local Demucs engine error (${res.status}): ${errText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({
      success: true,
      creationId: data.creationId || data.jobId,
      jobId: data.jobId || data.creationId,
      preset: preset,
      engine: 'demucs',
      status: data.status || 'queued',
      message: 'Local Demucs separation job queued successfully.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to connect to local Demucs engine';
    return NextResponse.json(
      {
        error: `Could not reach local Demucs engine on ${activeUrl}. Please ensure 'local-stem-server/start.bat' is running. (${msg})`,
        code: 'LOCAL_SERVER_UNREACHABLE',
        launchHelp: 'Launch local-stem-server/start.bat on your PC to enable free offline Demucs processing.',
      },
      { status: 503 }
    );
  }
}
