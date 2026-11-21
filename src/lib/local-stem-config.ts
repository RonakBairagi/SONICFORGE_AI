/**
 * SonicForge AI - Local Demucs Engine Configuration & Dynamic Port Resolver
 * Supports configurable ports via LOCAL_STEM_PORT or LOCAL_DEMUCS_SERVER_URL,
 * defaulting to port 8765 with automatic fallback probing.
 */

const CANDIDATE_PORTS = [
  process.env.LOCAL_STEM_PORT ? parseInt(process.env.LOCAL_STEM_PORT, 10) : null,
  8765,
  8000,
].filter((p): p is number => p !== null && !isNaN(p) && p > 0);

export function getConfiguredLocalServerUrl(): string {
  if (process.env.LOCAL_DEMUCS_SERVER_URL) {
    return process.env.LOCAL_DEMUCS_SERVER_URL.trim().replace(/\/$/, '');
  }
  const port = process.env.LOCAL_STEM_PORT || '8765';
  return `http://127.0.0.1:${port}`;
}

export async function resolveActiveLocalServerUrl(): Promise<string> {
  if (process.env.LOCAL_DEMUCS_SERVER_URL) {
    return process.env.LOCAL_DEMUCS_SERVER_URL.trim().replace(/\/$/, '');
  }

  // Probe ports in parallel with short timeout
  for (const port of CANDIDATE_PORTS) {
    const url = `http://127.0.0.1:${port}`;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 800);
      const res = await fetch(`${url}/health`, {
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timer);
      if (res.ok) {
        return url;
      }
    } catch {
      // Continue to next candidate
    }
  }

  const defaultPort = process.env.LOCAL_STEM_PORT || '8765';
  return `http://127.0.0.1:${defaultPort}`;
}
