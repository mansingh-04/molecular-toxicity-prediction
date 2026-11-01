/** Runtime service configuration. All endpoints come from Vite env variables; no secrets belong here. */
const env = import.meta.env;

const clean = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().replace(/\/$/, '') : undefined);

export const SERVICE_CONFIG = {
  chemistryApiUrl: clean(env.VITE_CHEMISTRY_API_URL),
  compoundLibraryUrl: clean(env.VITE_COMPOUND_LIBRARY_URL),
  rdkitBaseUrl: `${env.BASE_URL ?? '/'}rdkit/`,
  requestTimeoutMs: 30000,
};

export async function fetchJson<T>(url: string, init?: RequestInit, timeoutMs = SERVICE_CONFIG.requestTimeoutMs): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} from ${url}${text ? `: ${text.slice(0, 300)}` : ''}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}
