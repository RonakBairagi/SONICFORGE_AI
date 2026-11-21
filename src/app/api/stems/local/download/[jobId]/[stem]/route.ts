import { NextRequest, NextResponse } from 'next/server';
import { resolveActiveLocalServerUrl } from '@/lib/local-stem-config';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string; stem: string } }
) {
  const activeUrl = await resolveActiveLocalServerUrl();

  try {
    const { jobId, stem } = params;
    if (!jobId || !stem) {
      return NextResponse.json({ error: 'Missing jobId or stem filename' }, { status: 400 });
    }

    const rangeHeader = req.headers.get('range');
    const headers: Record<string, string> = {};
    if (rangeHeader) {
      headers['Range'] = rangeHeader;
    }

    const res = await fetch(`${activeUrl}/stems/${jobId}/${stem}`, {
      headers,
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Stem not found or download error (${res.status})` },
        { status: res.status }
      );
    }

    const arrayBuffer = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') || 'audio/wav';
    const contentRange = res.headers.get('content-range');
    const responseHeaders: Record<string, string> = {
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Content-Disposition': `inline; filename="${stem}"`,
      'Cache-Control': 'public, max-age=86400',
    };
    if (contentRange) {
      responseHeaders['Content-Range'] = contentRange;
    }

    return new NextResponse(arrayBuffer, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Download proxy failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
