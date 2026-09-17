/**
 * Service-layer configuration.
 *
 * `DEMO_DATA` is the seam between this build and a real backend. Every service
 * in this folder is written as an async function with the signature a real
 * endpoint would have, so switching it off is an implementation swap inside
 * these files - no screen, hook or component changes.
 */

export const DEMO_DATA = true;

/** Stand-in identity until real authentication lands. */
export const DEMO_USER_ID = "demo_user_local";
export const DEMO_DISPLAY_NAME = "You";

/** Storage namespace. Bump the version to invalidate every persisted record. */
export const STORAGE_NAMESPACE = "closer:v1";

/** Simulated round-trip latency so the UI is built against real-world waits. */
export const DEMO_LATENCY_MS = { min: 90, max: 220 } as const;

/** Days a question is held back after being served. */
export const REPEAT_PROTECTION_DAYS = 9;

/** Players who answered a given set. Seeded per day in demo mode. */
export const FIELD_SIZE = { min: 11_000, max: 24_000 } as const;

/** Opponents sampled from the field to compute the Elo expectation. */
export const FIELD_SAMPLE_SIZE = 96;

/** Synthetic scores drawn to place a player inside the field. */
export const FIELD_PLACEMENT_SAMPLES = 1200;

/** Synthetic answers drawn to describe the field on a single question. */
export const QUESTION_SAMPLES = 400;

let latencyEnabled = true;

/** Tests run against the same services and should not pay the fake latency. */
export function setLatencyEnabled(enabled: boolean): void {
  latencyEnabled = enabled;
}

export async function simulateLatency(random: () => number = Math.random): Promise<void> {
  if (!DEMO_DATA || !latencyEnabled) return;
  const { min, max } = DEMO_LATENCY_MS;
  const delay = min + random() * (max - min);
  await new Promise((resolve) => setTimeout(resolve, delay));
}
