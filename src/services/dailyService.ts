/**
 * Daily set assembly.
 *
 * Selection is a pure function of the date key, so every player in the world
 * receives byte-identical questions and the same day always rebuilds the same
 * set - which is what makes history, replays and tests possible.
 *
 * Repeat protection works by cycling. The bank is shuffled once per cycle and
 * dealt seven at a time, so a question cannot reappear until the entire bank
 * has been used. The shuffle is re-seeded each cycle, so the same seven never
 * travel together twice.
 *
 * Cycling alone leaves one hole: the seam. A question served on the last day of
 * one cycle is free to return on the first day of the next, and the days either
 * side of a seam are adjacent in a player's experience even though they sit in
 * different cycles. So the first `SEAM_GUARD_DAYS` days of a cycle exclude
 * everything served in the last `SEAM_GUARD_DAYS` days of the previous one,
 * which lifts the guarantee to: no question returns within a week.
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


/** Days of separation guaranteed across a cycle seam. */
export const SEAM_GUARD_DAYS = 6;

/**
 * The guard a given cycle length can actually support.
 *
 * The repair needs a middle region to draw swaps from, and that region has to
 * sit clear of both guard bands, so a short cycle gets a proportionally
 * smaller guard rather than a broken one.
 */
export function seamGuardFor(cycleDays: number): number {
  return Math.max(0, Math.min(SEAM_GUARD_DAYS, Math.floor((cycleDays - 1) / 2)));
}

/**
 * Bridge the seam between cycles.
 *
 * The opening days of a cycle would otherwise be free to repeat what the
 * closing days of the previous one served. The fix is a swap *inside* the
 * cycle rather than a substitution, so the cycle stays a partition of the bank
 * and nothing can appear twice within it.
 *
 * Swap candidates come only from the middle of the cycle, never from either
 * guard band. That matters for more than tidiness: it leaves the closing days
 * of every cycle untouched by that cycle's own repair, so the previous cycle's
 * tail can be read straight from its unrepaired order and the repair does not
 * chain backwards through every cycle that came before it.
 */
function repairSeam(
  order: readonly Question[],
  cycleIndex: number,
  cycleDays: number,
  bank: readonly Question[],
): Question[] {
  const repaired = order.slice();
  const guard = seamGuardFor(cycleDays);
  if (guard === 0) return repaired;

  const previous = orderForCycle(cycleIndex - 1, bank);
  const blocked = new Set<string>();
  for (let day = cycleDays - guard; day < cycleDays; day += 1) {
    for (const question of sliceForDay(previous, day)) blocked.add(question.id);
  }

  const guardEnd = guard * QUESTIONS_PER_DAY;
  const middleEnd = (cycleDays - guard) * QUESTIONS_PER_DAY;

  for (let i = 0; i < guardEnd; i += 1) {
    if (!blocked.has(repaired[i]!.id)) continue;
    for (let j = guardEnd; j < middleEnd; j += 1) {
      if (blocked.has(repaired[j]!.id)) continue;
      const displaced = repaired[i]!;
      repaired[i] = repaired[j]!;
      repaired[j] = displaced;
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
