/**
 * Resilient API client for browser & iframe environments.
 * Prevents WebKit/Safari DOMException ("The string did not match the expected pattern")
 * and transient fetch drops ("Load failed").
 */

export function buildApiUrl(
  endpoint: string,
  params?: Record<string, string | number | null | undefined>
): string {
  if (!params) return endpoint;

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  }

  const queryString = searchParams.toString();
  return queryString ? `${endpoint}?${queryString}` : endpoint;
}

export async function safeFetchJson<T = any>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, options);

  // Read response as text first to prevent WebKit / Safari DOMException 12
  // ("The string did not match the expected pattern") when server returns HTML/empty
  const rawText = await res.text();
  let data: any = null;

  if (rawText && rawText.trim().length > 0) {
    try {
      data = JSON.parse(rawText);
    } catch {
      throw new Error(
        `Server returned an unparseable response (HTTP ${res.status}: ${res.statusText || 'Unknown'}).`
      );
    }
  } else {
    data = {};
  }

  if (!res.ok || (data && data.success === false)) {
    const errorMsg = data?.error || `Request failed with HTTP status ${res.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export async function fetchWithRetry<T = any>(
  url: string,
  options?: RequestInit,
  retries = 3,
  delayMs = 600
): Promise<T> {
  let lastError: any = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await safeFetchJson<T>(url, options);
    } catch (err: any) {
      lastError = err;
      // Do not retry client 4xx errors
      const msg = err?.message || '';
      if (msg.includes('HTTP 4') || msg.includes('HTTP status 4')) {
        throw err;
      }
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
      }
    }
  }

  throw lastError || new Error('Network request failed after retries.');
}
