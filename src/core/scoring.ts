/**
 * Scoring engine. Pure functions, no I/O, no platform dependencies.
 *
 * CLOSER does not score knowledge, it scores *calibration*: how close a guess
 * lands to the truth, measured as a fraction of the slider span the player was
 * given. Normalising by span is what makes a question about the height of a
 * mountain comparable with a question about the year of a treaty.
 *
 *     score = MAX_SCORE * e ^ (-DECAY * normalisedError)
 *
 * Exponential decay is chosen over a linear falloff because it keeps the
 * interesting resolution where players actually land. Two guesses that are both
 * "about right" still separate cleanly, while everything past a quarter of the
 * span collapses towards zero, where the difference between wrong and very
 * wrong does not deserve points.
 */

import type { ExactnessTier, Question, ScoreBreakdown } from "../types";

export const MAX_SCORE = 1000;
export const QUESTIONS_PER_DAY = 7;
export const MAX_DAILY_SCORE = MAX_SCORE * QUESTIONS_PER_DAY;

/** Steepness of the decay curve. Tuned so 5% off the span still pays ~787. */
export const DECAY = 4.8;

/** Upper bound of normalised error for each exactness tier, in order. */
export const EXACTNESS_THRESHOLDS: ReadonlyArray<readonly [ExactnessTier, number]> = [
  ["BULLSEYE", 0.005],
  ["PRECISE", 0.02],
  ["CLOSE", 0.05],
  ["NEAR", 0.12],
  ["WIDE", 0.25],
  ["OFF_TARGET", Infinity],
];

export const EXACTNESS_ORDER: readonly ExactnessTier[] = EXACTNESS_THRESHOLDS.map(
  ([tier]) => tier,
);

export const EXACTNESS_LABELS: Readonly<Record<ExactnessTier, string>> = {
  BULLSEYE: "BULLSEYE",
  PRECISE: "PRECISE",
  CLOSE: "CLOSE",
  NEAR: "NEAR",
  WIDE: "WIDE",
  OFF_TARGET: "OFF TARGET",
};

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

/**
 * Absolute width of a slider range.
 *
 * Ranges are allowed to run backwards (a BCE question slides from 800 BCE down
 * to 100 BCE), so span is always taken as a magnitude. A zero-width range would
 * make every guess infinitely wrong, so it is floored at 1.
 */
export function rangeSpan(rangeStart: number, rangeEnd: number): number {
  const span = Math.abs(rangeEnd - rangeStart);
  return span > 0 ? span : 1;
}

/** Clamp a value into a range that may be ascending or descending. */
export function clampToRange(value: number, rangeStart: number, rangeEnd: number): number {
  const low = Math.min(rangeStart, rangeEnd);
  const high = Math.max(rangeStart, rangeEnd);
  return clamp(value, low, high);
}

/** Snap a value onto the question's step grid, staying inside the range. */
export function snapToStep(
  value: number,
  rangeStart: number,
  rangeEnd: number,
  step: number,
): number {
  const safeStep = step > 0 ? step : 1;
  const low = Math.min(rangeStart, rangeEnd);
  const snapped = low + Math.round((clampToRange(value, rangeStart, rangeEnd) - low) / safeStep) * safeStep;
  // Guard against float dust like 1899.9999999999998.
  const decimals = decimalsForStep(safeStep);
  const rounded = Number(snapped.toFixed(decimals));
  return clampToRange(rounded, rangeStart, rangeEnd);
}

/** How many decimal places a step implies (0.25 -> 2, 10 -> 0). */
export function decimalsForStep(step: number): number {
  if (!Number.isFinite(step) || step <= 0) return 0;
  const text = String(step);
  const dot = text.indexOf(".");
  return dot === -1 ? 0 : text.length - dot - 1;
}

/** Fraction of the range the guess missed by, clamped to 0 - 1. */
export function normalisedError(
  value: number,
  answer: number,
  rangeStart: number,
  rangeEnd: number,
): number {
  const span = rangeSpan(rangeStart, rangeEnd);
  return clamp(Math.abs(value - answer) / span, 0, 1);
}

/** Points for a given normalised error. Monotonically decreasing. */
export function scoreForNormalisedError(error: number): number {
  const bounded = clamp(error, 0, 1);
  return Math.round(MAX_SCORE * Math.exp(-DECAY * bounded));
}

export function exactnessFor(normalised: number): ExactnessTier {
  const bounded = clamp(normalised, 0, 1);
  for (const [tier, threshold] of EXACTNESS_THRESHOLDS) {
    if (bounded <= threshold) return tier;
  }
  return "OFF_TARGET";
}

/** Convert a raw slider value into the full breakdown a result screen needs. */
export function scoreAnswer(
  value: number,
  question: Pick<Question, "answer" | "rangeStart" | "rangeEnd">,
): ScoreBreakdown {
  const { answer, rangeStart, rangeEnd } = question;
  const clamped = clampToRange(value, rangeStart, rangeEnd);
  const delta = clamped - answer;
  const error = Math.abs(delta);
  const normalised = normalisedError(clamped, answer, rangeStart, rangeEnd);
  return {
    score: scoreForNormalisedError(normalised),
    delta,
    error,
    normalisedError: normalised,
    exactness: exactnessFor(normalised),
  };
}

/** Sum of a day's answers. */
export function totalScore(scores: readonly { score: number }[]): number {
  return scores.reduce((sum, entry) => sum + entry.score, 0);
}

/** 0 - 1 share of the maximum available for the number of questions answered. */
export function scoreRatio(total: number, questionCount: number): number {
  const max = MAX_SCORE * Math.max(questionCount, 1);
  return clamp(total / max, 0, 1);
}

/**
 * The guess that would have scored this many points, expressed as a distance
 * from the answer. Used by the reveal to draw "you needed to be this close".
 */
export function errorForScore(score: number): number {
  const bounded = clamp(score, 1, MAX_SCORE);
  return -Math.log(bounded / MAX_SCORE) / DECAY;
}
