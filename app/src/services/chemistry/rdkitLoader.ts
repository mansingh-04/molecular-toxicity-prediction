import type { RDKitModule } from '@rdkit/rdkit';
import { SERVICE_CONFIG } from '@/services/config';

/** RDKit's typings declare initRDKitModule as always present; at runtime it only exists once the script has loaded. */
const getInit = () => (window as Partial<Pick<Window, 'initRDKitModule'>>).initRDKitModule;

let promise: Promise<RDKitModule | null> | null = null;
let loadError: string | undefined;

/**
 * Loads RDKit MinimalLib (WASM) from /public/rdkit. Resolves to null (never rejects) if it
 * cannot be loaded, so callers can fall back to the demo parser.
 */
export function loadRDKit(timeoutMs = 20000): Promise<RDKitModule | null> {
  if (promise) return promise;
  if (typeof window === 'undefined' || typeof document === 'undefined' || import.meta.env.MODE === 'test') {
    loadError = 'RDKit.js is not available in this environment.';
    promise = Promise.resolve(null);
    return promise;
  }
  promise = new Promise<RDKitModule | null>((resolve) => {
    const timer = setTimeout(() => {
      loadError = 'Timed out loading RDKit.js.';
      resolve(null);
    }, timeoutMs);
    const done = (m: RDKitModule | null, err?: string) => {
      clearTimeout(timer);
      if (err) loadError = err;
      resolve(m);
    };
    const init = () => {
      const initFn = getInit();
      if (!initFn) return done(null, 'RDKit.js script did not register initRDKitModule.');
      initFn({ locateFile: () => `${SERVICE_CONFIG.rdkitBaseUrl}RDKit_minimal.wasm` })
        .then((m) => done(m))
        .catch((e) => done(null, `RDKit.js failed to initialise: ${String(e)}`));
    };
    if (getInit()) return init();
    const script = document.createElement('script');
    script.src = `${SERVICE_CONFIG.rdkitBaseUrl}RDKit_minimal.js`;
    script.async = true;
    script.onload = init;
    script.onerror = () => done(null, 'Could not load /rdkit/RDKit_minimal.js (run npm install to copy it).');
    document.head.appendChild(script);
  });
  return promise;
}

export const rdkitLoadError = () => loadError;
