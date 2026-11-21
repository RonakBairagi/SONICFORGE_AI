/**
 * SonicForge AI - Demucs Stem Engine Configuration & Dual-Environment Resolver
 * 
 * Manages connectivity for both:
 * 1. Local Development: connects to local Demucs engine on http://127.0.0.1:8765 (with port probing fallback)
 * 2. Production Deployment (Vercel): connects to hosted HTTPS Demucs backend via NEXT_PUBLIC_STEM_API_URL or STEM_API_URL
 * 
 * CRITICAL PRODUCTION RULE:
 * Production deployments NEVER default to localhost / 127.0.0.1.
 * If no hosted backend is configured in production, returns clear error state.
 */

export interface StemBackendResolution {
  url: string | null;
  isConfigured: boolean;
  isProduction: boolean;
  isLocal: boolean;
  code?: string;
  error?: string;
  launchHelp?: string;
}

const CANDIDATE_LOCAL_PORTS = [
  process.env.LOCAL_STEM_PORT ? parseInt(process.env.LOCAL_STEM_PORT, 10) : null,
  8765,
  8000,
].filter((p): p is number => p !== null && !isNaN(p) && p > 0);

/**
 * Checks whether the current runtime is in production (e.g. Vercel deployment)
 */
export function isProductionEnvironment(): boolean {
  if (process.env.NODE_ENV === 'production') return true;
  if (process.env.VERCEL === '1') return true;
  if (process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview') return true;
  return false;
}

/**
 * Checks whether a URL points to localhost or local loopback addresses
 */
export function isLocalhostUrl(targetUrl: string): boolean {
  if (!targetUrl) return false;
  try {
    const parsed = new URL(targetUrl.includes('://') ? targetUrl : `http://${targetUrl}`);
    const host = parsed.hostname.toLowerCase();
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.endsWith('.local')
    );
  } catch {
    return (
      targetUrl.includes('127.0.0.1') ||
      targetUrl.includes('localhost') ||
      targetUrl.includes('0.0.0.0')
    );
  }
}

/**
 * Reads explicitly configured backend URL from environment
 * Checks STEM_API_URL, NEXT_PUBLIC_STEM_API_URL, or legacy LOCAL_DEMUCS_SERVER_URL
 */
export function getConfiguredStemBackendUrl(): string | null {
  const envUrl =
    process.env.STEM_API_URL ||
    process.env.NEXT_PUBLIC_STEM_API_URL ||
    process.env.LOCAL_DEMUCS_SERVER_URL;

  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return null;
}

/**
 * Legacy compatibility helper
 */
export function getConfiguredLocalServerUrl(): string {
  const resolution = getStemBackendResolution();
  return resolution.url || `http://127.0.0.1:${process.env.LOCAL_STEM_PORT || '8765'}`;
}

/**
 * Resolves current backend configuration according to runtime environment
 */
export function getStemBackendResolution(): StemBackendResolution {
  const isProd = isProductionEnvironment();
  const configuredUrl = getConfiguredStemBackendUrl();

  if (configuredUrl) {
    const isLocal = isLocalhostUrl(configuredUrl);

    // Guard: A localhost URL in production is unreachable from Vercel serverless functions
    if (isProd && isLocal) {
      return {
        url: null,
        isConfigured: false,
        isProduction: true,
        isLocal: false,
        code: 'PRODUCTION_LOCALHOST_MISCONFIGURED',
        error: 'NEXT_PUBLIC_STEM_API_URL points to localhost (127.0.0.1), which is unreachable from Vercel serverless deployments.',
        launchHelp: 'To process stems on your deployed site, deploy the Demucs backend to a hosted cloud provider (e.g. Hugging Face Spaces, Render, or RunPod) and set NEXT_PUBLIC_STEM_API_URL in your Vercel Project Settings.',
      };
    }

    return {
      url: configuredUrl,
      isConfigured: true,
      isProduction: isProd,
      isLocal,
    };
  }

  // In production with no configured backend:
  // DO NOT default to localhost!
  if (isProd) {
    return {
      url: null,
      isConfigured: false,
      isProduction: true,
      isLocal: false,
      code: 'MISSING_PRODUCTION_BACKEND',
      error: 'Hosted Demucs stem backend URL is not configured in Vercel.',
      launchHelp: 'To enable AI stem separation on your deployed site, deploy the Demucs backend to a cloud host (such as Hugging Face Spaces, Render, or RunPod) and configure NEXT_PUBLIC_STEM_API_URL in your Vercel Environment Variables.',
    };
  }

  // In local development: default to local server on port 8765
  const port = process.env.LOCAL_STEM_PORT || '8765';
  return {
    url: `http://127.0.0.1:${port}`,
    isConfigured: true,
    isProduction: false,
    isLocal: true,
    launchHelp: 'Run local-stem-server/start.bat to launch your local Demucs engine on port 8765.',
  };
}

/**
 * Returns authentication headers if STEM_API_KEY is configured
 * STEM_API_KEY is kept strictly server-side (never exposed as NEXT_PUBLIC_)
 */
export function getStemBackendHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const apiKey = (
    process.env.STEM_API_KEY ||
    process.env.STEM_BACKEND_API_KEY ||
    ''
  ).trim();

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
    headers['X-API-Key'] = apiKey;
  }
  return headers;
}

/**
 * Resolves the active backend URL:
 * - If hosted production URL: returns it directly
 * - If local development: probes ports (8765, 8000) to find active Demucs instance
 * - If unconfigured in production: returns null
 */
export async function resolveActiveLocalServerUrl(): Promise<string | null> {
  const resolution = getStemBackendResolution();

  if (!resolution.isConfigured || !resolution.url) {
    return null;
  }

  // Hosted backend: return directly without local probing
  if (!resolution.isLocal) {
    return resolution.url;
  }

  // Local development: probe local candidate ports
  for (const port of CANDIDATE_LOCAL_PORTS) {
    const candidateUrl = `http://127.0.0.1:${port}`;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 600);
      const probeRes = await fetch(`${candidateUrl}/health`, {
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timer);
      if (probeRes.ok) {
        return candidateUrl;
      }
    } catch {
      // Continue to next candidate
    }
  }

  return resolution.url;
}
