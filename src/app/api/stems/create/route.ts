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

const PRESET_MODEL_MAP: Record<string, string> = {
  '4_tracks': 'subroformer',
  '2_tracks': 'deux',
  '6_tracks': 'bs_roformer_sw',
  'lead_back': 'lead_back',
};

/**
 * Triggers stem separation job on Neural Analog using an already ingested audioId
 */
export async function POST(req: NextRequest) {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Neural Analog API Key is not configured on the server.', code: 'MISSING_API_KEY' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const audioId = body.audioId?.trim();
    const preset = body.preset || '4_tracks';
    const modelName = PRESET_MODEL_MAP[preset] || 'subroformer';

    if (!audioId) {
      return NextResponse.json(
        { error: 'audioId is required to start stem separation.', code: 'MISSING_AUDIO_ID' },
        { status: 400 }
      );
    }

    // Call official /create-stems endpoint with supported model_name
    let res = await fetch(`${API_BASE}/create-stems`, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_id: audioId,
        preset: preset,
        model_name: modelName,
        bit_depth: 24,
        hq_streaming_format: 'mp3',
      }),
    });

    let data: any = null;

    // Fallback to /presets/run if /create-stems is rejected
    if (!res.ok) {
      console.warn(`[Stem Create] /create-stems failed (${res.status}), trying /presets/run fallback...`);
      res = await fetch(`${API_BASE}/presets/run`, {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'stem_split',
          preset: preset,
          audio_id: audioId,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return NextResponse.json(
          {
            error: `Failed to trigger stem separation (${res.status}): ${errText}`,
            code: 'CREATE_STEMS_FAILED',
          },
          { status: res.status }
        );
      }
      data = await res.json();
    } else {
      data = await res.json();
    }

    const creationId = data.creation_id || data.object_id;
    if (!creationId) {
      return NextResponse.json(
        { error: 'No job identifier returned by Neural Analog.', code: 'NO_JOB_ID' },
        { status: 500 }
      );
    }

    // Standardize stem artifacts
    const rawStems = data.audio_stems || [];
    let formattedStems: any[] = [];

    if (rawStems.length > 0) {
      formattedStems = rawStems.map((s: any) => ({
        stem_id: s.stem_id,
        stem: s.stem || 'stem',
        status: s.status || 'in_progress',
        download_url: `/api/stems/download/${s.stem_id}`,
      }));
    } else {
      // Default fallback labels if /presets/run was used
      const defaultLabels =
        preset === '2_tracks'
          ? ['Vocals', 'Instrumental']
          : preset === 'lead_back'
          ? ['Lead Vocals', 'Backing Vocals']
          : ['Vocals', 'Drums', 'Bass', 'Other'];
      formattedStems = defaultLabels.map((label, idx) => ({
        stem_id: `${creationId}_${idx}`,
        stem: label.toLowerCase(),
        status: 'in_progress',
        download_url: `/api/stems/download/${creationId}`,
      }));
    }

    return NextResponse.json({
      success: true,
      creationId: creationId,
      objectId: creationId,
      objectType: 'stem_split',
      audioId: audioId,
      preset: preset,
      stems: formattedStems,
      status: 'in_progress',
      message: 'Stem separation initiated successfully.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Stem creation exception';
    return NextResponse.json({ error: msg, code: 'CREATE_EXCEPTION' }, { status: 500 });
  }
}

