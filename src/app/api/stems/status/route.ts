import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const API_BASE = 'https://api.neuralanalog.com';

function getApiKey(): string {
  const k1 = process.env.NEURALANALOG_API_KEY?.trim();
  if (k1 && !k1.startsWith('your_')) return k1;
  const k2 = process.env.AUDIO_SEPARATION_API_KEY?.trim();
  if (k2 && !k2.startsWith('your_')) return k2;
  return 'na_live_MBbUCp6I19VqTJ-GX9XqZp5l2VNGQ43reSqJ13OS3kM';
}

/**
 * Checks stem splitting progress on Neural Analog using the official /status/{object_type}/{object_id} contract
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawJobId = searchParams.get('creationId') || searchParams.get('objectId');
    const objectType = searchParams.get('objectType') || 'stem_split';

    if (!rawJobId || rawJobId === 'undefined' || rawJobId === 'null') {
      return NextResponse.json(
        { error: 'Valid creationId or objectId query parameter is required', code: 'MISSING_PARAM' },
        { status: 400 }
      );
    }

    const jobId = rawJobId.trim();
    const apiKey = getApiKey();

    const statusRes = await fetch(`${API_BASE}/status/${objectType}/${jobId}`, {
      headers: { 'X-API-Key': apiKey },
    });

    if (!statusRes.ok) {
      const errText = await statusRes.text();
      let userMsg = `Status check failed (${statusRes.status}): ${errText}`;
      if (statusRes.status === 404) {
        userMsg = `Job ${jobId.slice(0, 8)} was not found on Neural Analog. It may have expired or was created with a different key.`;
      } else if (statusRes.status === 429) {
        userMsg = 'Neural Analog rate limit reached. Backing off status check.';
      }

      return NextResponse.json(
        { error: userMsg, code: 'STATUS_ERROR', statusCode: statusRes.status },
        { status: statusRes.status }
      );
    }

    const statusJson = await statusRes.json();

    if (statusJson.is_failed) {
      return NextResponse.json({
        isComplete: false,
        isFailed: true,
        status: 'failed',
        errorMessage: statusJson.error_message || 'Neural Analog stem splitting failed.',
        statusDetails: statusJson.status_details || 'Failed',
        audioId: statusJson.audio_id || null,
        objectId: jobId,
        objectType: statusJson.object_type || objectType,
      });
    }

    const isComplete = Boolean(statusJson.is_complete);
    const details =
      statusJson.status_details ||
      (isComplete
        ? 'Separation complete! Lossless stems ready.'
        : statusJson.status === 'upload_completed'
        ? 'Stems saved. Rendering streaming formats...'
        : 'Waiting in hardware queue for GPU allocation...');

    return NextResponse.json({
      isComplete,
      isFailed: false,
      status: statusJson.status || (isComplete ? 'completed' : 'in_progress'),
      statusDetails: details,
      audioId: statusJson.audio_id || null,
      objectId: jobId,
      objectType: statusJson.object_type || objectType,
      downloadUrl: statusJson.download_url || null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to query stem status';
    return NextResponse.json({ error: msg, code: 'STATUS_EXCEPTION' }, { status: 500 });
  }
}
