import type { StateStorage } from 'zustand/middleware';

/**
 * Persistence adapter. Local storage today; swap this object for a backend-backed StateStorage
 * (async getItem/setItem are supported by zustand) to persist progress server-side.
 */
const memory = new Map<string, string>();

export const persistenceAdapter: StateStorage = {
  getItem(name) {
    try {
      return window.localStorage.getItem(name);
    } catch {
      return memory.get(name) ?? null;
    }
  },
  setItem(name, value) {
    try {
      window.localStorage.setItem(name, value);
    } catch {
      memory.set(name, value);
    }
  },
  removeItem(name) {
    try {
      window.localStorage.removeItem(name);
    } catch {
      memory.delete(name);
    }
  },
};

/** Optional ?slot=name URL parameter selects a separate save slot (useful for testing). */
const slot = (() => {
  try {
    return new URLSearchParams(window.location.search).get('slot')?.replace(/[^\w-]/g, '').slice(0, 32) || undefined;
  } catch {
    return undefined;
  }
})();
export const STORAGE_KEY = slot ? `toxilab.save.${slot}` : 'toxilab.save';
export const STORAGE_VERSION = 3;
