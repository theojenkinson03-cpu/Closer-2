/**
 * Daily set assembly.
 *
 * Selection is a pure function of the date key, so every player in the world
 * receives byte-identical questions and the same day always rebuilds the same
 * set - which is what makes history, replays and tests possible.
 *
 * Repeat protection works by cycling. The bank is shuffled once per cycle and
 * dealt seven at a time, so a question cannot reappear until the entire bank
 * has been used. The shuffle is re-seeded each cycle so the same seven never
 * travel together twice, and the first day of a cycle additionally avoids
 * anything served on the last day of the previous one.
 */

import { createRandom, shuffle } from "../core/random";
import { QUESTIONS_PER_DAY } from "../core/scoring";
import {
  dateKeyFor,
  daysBetweenKeys,
  rankDropAtFor,
  SEASON_EPOCH,
  seasonIdFor,
  setOpensAt,
} from "../core/dates";
import type { DailySet, Question } from "../types";
import { QUESTIONS } from "./questionBank";
import { simulateLatency } from "./config";

/** Days of unique content the current bank supports. */
export function cycleLengthDays(bankSize: number = QUESTIONS.length): number {
  return Math.max(1, Math.floor(bankSize / QUESTIONS_PER_DAY));
}

function floorMod(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

function orderForCycle(cycleIndex: number, bank: readonly Question[]): Question[] {
  return shuffle(bank, createRandom(`${SEASON_EPOCH}:cycle:${cycleIndex}`));
}

function sliceForDay(order: readonly Question[], dayInCycle: number): Question[] {
  const start = dayInCycle * QUESTIONS_PER_DAY;
  return order.slice(start, start + QUESTIONS_PER_DAY);
}


/**
 * Bridge the seam between cycles.
 *
 * Day one of a cycle would otherwise be free to repeat what was served on the
 * last day of the previous one. The fix is a swap *inside* the cycle rather
 * than a substitution, so the cycle stays a partition of the bank and nothing
 * can appear twice. Candidates are drawn only from the middle of the cycle -
 * never the first or last day - which keeps the previous cycle's final day
 * stable and stops the repair from chaining backwards for ever.
 */
function repairSeam(
  order: readonly Question[],
  cycleIndex: number,
  cycleDays: number,
  bank: readonly Question[],
): Question[] {
  const repaired = order.slice();
  if (cycleDays < 3) return repaired;

  const previousLastDay = sliceForDay(orderForCycle(cycleIndex - 1, bank), cycleDays - 1);
  const blocked = new Set(previousLastDay.map((question) => question.id));

  const firstMiddle = QUESTIONS_PER_DAY;
  const lastMiddle = (cycleDays - 1) * QUESTIONS_PER_DAY - 1;

  for (let i = 0; i < QUESTIONS_PER_DAY; i += 1) {
    if (!blocked.has(repaired[i]!.id)) continue;
    for (let j = firstMiddle; j <= lastMiddle; j += 1) {
      if (blocked.has(repaired[j]!.id)) continue;
      const a = repaired[i]!;
      repaired[i] = repaired[j]!;
      repaired[j] = a;
      break;
    }
  }
  return repaired;
}

/**
 * Deterministic seven for a date key.
 *
 * Exported separately from `getDailySet` so tests, tooling and a future
 * server-side generator can all reach the same selection without going through
 * the async service wrapper.
 */
export function selectQuestions(
  dateKey: string,
  bank: readonly Question[] = QUESTIONS,
): Question[] {
  if (bank.length === 0) return [];
  const cycleDays = cycleLengthDays(bank.length);
  const dayIndex = daysBetweenKeys(SEASON_EPOCH, dateKey);
  const cycleIndex = Math.floor(dayIndex / cycleDays);
  const dayInCycle = floorMod(dayIndex, cycleDays);

  const order = repairSeam(orderForCycle(cycleIndex, bank), cycleIndex, cycleDays, bank);
  const picked = sliceForDay(order, dayInCycle);

  // Easiest first: a day should open with a question a player can land, and
  // close with one that separates the field.
  return picked.sort((a, b) => a.difficulty - b.difficulty || a.id.localeCompare(b.id));
}

export function buildDailySet(dateKey: string): DailySet {
  return {
    setId: `set_${dateKey}`,
    dateKey,
    questions: selectQuestions(dateKey),
    opensAt: setOpensAt(dateKey),
    rankDropAt: rankDropAtFor(dateKey),
  };
}

/** DEMO_DATA: resolves locally. Real implementation: GET /daily/:dateKey */
export async function getDailySet(dateKey: string = dateKeyFor()): Promise<DailySet> {
  await simulateLatency();
  return buildDailySet(dateKey);
}

export function currentSeasonId(dateKey: string = dateKeyFor()): string {
  return seasonIdFor(dateKey);
}
