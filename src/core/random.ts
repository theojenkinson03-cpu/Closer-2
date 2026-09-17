/**
 * Deterministic pseudo-randomness.
 *
 * Question selection and the simulated field must be identical for every player
 * on a given day, and identical again when the same day is replayed in a test.
 * `Math.random` cannot do either, so everything seeds off a string.
 */

/** FNV-1a, 32-bit. Fast, dependency-free, good enough for shuffling. */
export function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Mulberry32: tiny, fast, well-distributed 32-bit PRNG. */
export function createRandom(seed: string | number): () => number {
  let state = (typeof seed === "number" ? seed : hashString(seed)) >>> 0;
  return function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer in [min, max]. */
export function randomInt(random: () => number, min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

/** Fisher-Yates using a supplied generator. Returns a new array. */
export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const a = copy[i]!;
    const b = copy[j]!;
    copy[i] = b;
    copy[j] = a;
  }
  return copy;
}

/**
 * Approximately normal sample via the sum of three uniforms. Cheap, bounded,
 * and shaped like a real distribution of scores - which is all the simulated
 * field needs.
 */
export function gaussian(random: () => number, mean = 0, deviation = 1): number {
  const sum = random() + random() + random();
  return mean + ((sum - 1.5) / 0.5) * deviation * 0.5774;
}
