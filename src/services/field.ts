/**
 * The field: everyone else who played today.
 *
 * DEMO_DATA: the opposition is simulated from a per-day seed rather than read
 * from a results table. The distribution is deliberately realistic - scores
 * cluster around a day-specific mean with a long tail either side - because the
 * rank engine is only as meaningful as the field it normalises against.
 *
 * Swapping this file for real aggregate queries (count, percentile, sampled RP)
 * is the entire backend change needed for real ranking.
 */

import { createRandom, gaussian, randomInt, shuffle } from "../core/random";
import { MAX_DAILY_SCORE } from "../core/scoring";
import { percentileFromPlacement } from "../core/ranks";
import { clamp } from "../core/scoring";
import { FIELD_PLACEMENT_SAMPLES, FIELD_SAMPLE_SIZE, FIELD_SIZE } from "./config";

const FIRST_NAMES = [
  "Ari", "Bo", "Cass", "Dara", "Eli", "Fen", "Gus", "Hana", "Ike", "Jo",
  "Kit", "Lena", "Mira", "Nils", "Odin", "Pia", "Quin", "Rui", "Sena", "Tor",
  "Uma", "Vik", "Wren", "Xan", "Yara", "Zed", "Noor", "Ines", "Otto", "Suri",
];

const LAST_NAMES = [
  "Ash", "Brook", "Cole", "Drake", "Ember", "Frost", "Grove", "Hale", "Iver", "Jett",
  "Kane", "Lark", "Mercer", "North", "Onyx", "Pike", "Quill", "Rook", "Stone", "Thorn",
  "Vale", "Wilde", "Yates", "Zane", "Marsh", "Reed", "Finch", "Sloane", "Crane", "Vance",
];

export interface FieldParams {
  readonly size: number;
  readonly meanScore: number;
  readonly deviation: number;
}

/** Deterministic shape of a given day's field. */
export function fieldParams(dateKey: string): FieldParams {
  const random = createRandom(`field:${dateKey}`);
  const size = randomInt(random, FIELD_SIZE.min, FIELD_SIZE.max);
  // Some sets are simply harder than others; the mean moves with them.
  const meanScore = Math.round(3900 + random() * 900);
  const deviation = Math.round(820 + random() * 260);
  return { size, meanScore, deviation };
}

export function fieldSizeFor(dateKey: string): number {
  return fieldParams(dateKey).size;
}

/** A sample of the day's total scores. */
export function sampleFieldScores(dateKey: string, count = FIELD_PLACEMENT_SAMPLES): number[] {
  const { meanScore, deviation } = fieldParams(dateKey);
  const random = createRandom(`scores:${dateKey}`);
  const scores: number[] = [];
  for (let i = 0; i < count; i += 1) {
    scores.push(Math.round(clamp(gaussian(random, meanScore, deviation), 0, MAX_DAILY_SCORE)));
  }
  return scores;
}

/** A sample of the RP held by players in the day's field. */
export function sampleFieldRp(dateKey: string, count = FIELD_SAMPLE_SIZE): number[] {
  const random = createRandom(`rp:${dateKey}`);
  const values: number[] = [];
  for (let i = 0; i < count; i += 1) {
    values.push(Math.round(clamp(gaussian(random, 1400, 720), 0, 5200)));
  }
  return values;
}

export interface Placement {
  readonly fieldRank: number;
  readonly fieldSize: number;
  readonly percentile: number;
  readonly beatenShare: number;
}

/**
 * Where a score lands in the day's field.
 *
 * Ties split the difference rather than being counted as losses, so identical
 * scores always produce identical placements.
 */
export function placementFor(dateKey: string, score: number): Placement {
  const { size } = fieldParams(dateKey);
  const samples = sampleFieldScores(dateKey);
  let above = 0;
  let equal = 0;
  for (const sample of samples) {
    if (sample > score) above += 1;
    else if (sample === score) equal += 1;
  }
  const share = (above + equal / 2) / Math.max(1, samples.length);
  const fieldRank = clamp(Math.round(share * (size - 1)) + 1, 1, size);
  return {
    fieldRank,
    fieldSize: size,
    percentile: percentileFromPlacement(fieldRank, size),
    beatenShare: clamp(1 - share, 0, 1),
  };
}

export interface SyntheticPlayer {
  readonly userId: string;
  readonly displayName: string;
  readonly totalScore: number;
  readonly rp: number;
}

/** Named players for the leaderboard, ordered by score, best first. */
export function syntheticPlayers(dateKey: string, count: number): SyntheticPlayer[] {
  const random = createRandom(`players:${dateKey}`);
  const { meanScore, deviation } = fieldParams(dateKey);
  const first = shuffle(FIRST_NAMES, createRandom(`first:${dateKey}`));
  const last = shuffle(LAST_NAMES, createRandom(`last:${dateKey}`));
  const players: SyntheticPlayer[] = [];
  for (let i = 0; i < count; i += 1) {
    const totalScore = Math.round(
      clamp(gaussian(random, meanScore, deviation), 0, MAX_DAILY_SCORE),
    );
    // Rating tracks performance loosely - good players have good days.
    const rp = Math.round(clamp(700 + (totalScore / MAX_DAILY_SCORE) * 3600 + gaussian(random, 0, 320), 0, 5400));
    players.push({
      userId: `sim_${dateKey}_${i}`,
      displayName: `${first[i % first.length]} ${last[(i * 7 + 3) % last.length]}`,
      totalScore,
      rp,
    });
  }
  return players.sort((a, b) => b.totalScore - a.totalScore);
}

/** Top-of-the-field scores, which are far above the mean by construction. */
export function topScoresFor(dateKey: string, count: number): number[] {
  const { meanScore, deviation } = fieldParams(dateKey);
  const random = createRandom(`top:${dateKey}`);
  const scores: number[] = [];
  let ceiling = clamp(meanScore + deviation * 2.6, 0, MAX_DAILY_SCORE);
  for (let i = 0; i < count; i += 1) {
    ceiling = clamp(ceiling - random() * 34 - 6, 0, MAX_DAILY_SCORE);
    scores.push(Math.round(ceiling));
  }
  return scores;
}
