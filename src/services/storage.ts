/**
 * Durable key-value storage.
 *
 * A ranked daily game cannot keep its state in React. If the player answers
 * three questions and the OS reclaims the app, the attempt has to come back
 * exactly as it was - anything else hands out a second go at the same set.
 *
 * AsyncStorage is resolved lazily and behind a try/catch so this module also
 * works under plain Node (the test runner) and in environments where storage
 * is unavailable or full. A failed write degrades to in-memory rather than
 * throwing into a screen.
 */

import { STORAGE_NAMESPACE } from "./config";

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export function createMemoryAdapter(): StorageAdapter {
  const map = new Map<string, string>();
  return {
    async getItem(key) {
      return map.has(key) ? (map.get(key) as string) : null;
    },
    async setItem(key, value) {
      map.set(key, value);
    },
    async removeItem(key) {
      map.delete(key);
    },
  };
}

let adapter: StorageAdapter | undefined;
let warnedUnavailable = false;

function resolveAdapter(): StorageAdapter {
  if (adapter) return adapter;
  try {
    // Resolved at call time so Node-based tests never load React Native.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("@react-native-async-storage/async-storage");
    const candidate = (mod?.default ?? mod) as StorageAdapter | undefined;
    if (candidate && typeof candidate.getItem === "function") {
      adapter = candidate;
      return adapter;
    }
  } catch {
    // Falls through to the in-memory adapter below.
  }
  if (!warnedUnavailable) {
    warnedUnavailable = true;
  }
  adapter = createMemoryAdapter();
  return adapter;
}

/** Inject an adapter. Used by tests and by any future storage migration. */
export function setStorageAdapter(next: StorageAdapter | undefined): void {
  adapter = next;
  warnedUnavailable = false;
}

export function storageKey(...parts: readonly string[]): string {
  return [STORAGE_NAMESPACE, ...parts].join(":");
}

export async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await resolveAdapter().getItem(storageKey(key));
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    // Corrupt or unreadable records must not brick the app; start clean.
    return fallback;
  }
}

export async function writeJson(key: string, value: unknown): Promise<boolean> {
  try {
    await resolveAdapter().setItem(storageKey(key), JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export async function removeKey(key: string): Promise<void> {
  try {
    await resolveAdapter().removeItem(storageKey(key));
  } catch {
    // Nothing to do - the record is already unreachable.
  }
}
