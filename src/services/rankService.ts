/**
 * Ranking: what the day was worth.
 *
 * The rank drop is the product's second daily beat. A result is deliberately
 * not available the moment a player finishes - it is held until the field locks
 * at `rankDropAt`, then computed against everyone who played the same seven
 * questions. `processRankDrop` is idempotent: calling it early returns nothing,
 * calling it twice returns the same stored result.
 */

import {
  actualFromPlacement,
  applyRankDelta,
  createRankState,
  rankDelta,
  seasonReset,
} from "../core/ranks";
import { createRandom, randomInt } from "../core/random";
import { addDaysToKey, dateKeyFor, hasPassed, rankDropAtFor, seasonIdFor } from "../core/dates";
import type { Attempt, DayHistoryEntry, RankResult, RankState } from "../types";
import { getAttempt, setAttemptStatus } from "./attemptService";
import { FIELD_SAMPLE_SIZE, simulateLatency } from "./config";
import { placementFor, sampleFieldRp } from "./field";
import { readJson, writeJson } from "./storage";

type ResultsByDate = Record<string, RankResult>;

const stateCache = new Map<string, RankState>();
const resultCache = new Map<string, ResultsByDate>();

function stateKeyFor(userId: string): string {
  return `rank:${userId}`;
}

function resultsKeyFor(userId: string): string {
  return `rankResults:${userId}`;
}

async function loadResults(userId: string): Promise<ResultsByDate> {
  const cached = resultCache.get(userId);
  if (cached) return cached;
  const stored = await readJson<ResultsByDate>(resultsKeyFor(userId), {});
  resultCache.set(userId, stored);
  return stored;
}

async function persistResults(userId: string, results: ResultsByDate): Promise<void> {
  resultCache.set(userId, results);
  await writeJson(resultsKeyFor(userId), results);
}

async function persistState(userId: string, state: RankState): Promise<void> {
  stateCache.set(userId, state);
  await writeJson(stateKeyFor(userId), state);
}

/** DEMO_DATA: local. Real implementation: GET /rank */
export async function getRankState(
  userId: string,
  dateKey: string = dateKeyFor(),
): Promise<RankState> {
  const cached = stateCache.get(userId);
  if (cached) return cached;
  const seasonId = seasonIdFor(dateKey);
  const stored = await readJson<RankState | null>(stateKeyFor(userId), null);
  if (!stored) {
    const fresh = createRankState(userId, seasonId);
    await persistState(userId, fresh);
    return fresh;
  }
  // A season boundary crossed while the app was closed still has to be honoured.
  const state = stored.seasonId === seasonId ? stored : seasonReset(stored, seasonId);
  if (state !== stored) await persistState(userId, state);
  stateCache.set(userId, state);
  return state;
}

export async function getRankResult(userId: string, dateKey: string): Promise<RankResult | undefined> {
  const results = await loadResults(userId);
  return results[dateKey];
}

export async function listRankResults(userId: string): Promise<RankResult[]> {
  const results = await loadResults(userId);
  return Object.values(results).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

export async function getHistory(userId: string): Promise<DayHistoryEntry[]> {
  const results = await listRankResults(userId);
  return results.map((result) => ({
    dateKey: result.dateKey,
    totalScore: result.totalScore,
    rpDelta: result.delta,
    rpAfter: result.rpAfter,
    percentile: result.percentile,
  }));
}

export function isRankDropReady(dateKey: string, now: Date | number = Date.now()): boolean {
  return hasPassed(rankDropAtFor(dateKey), now);
}

/** Simulated friends group. Real implementation: a social-graph query. */
function friendsPositionFor(dateKey: string, userId: string, percentile: number) {
  const random = createRandom(`friends:${userId}:${dateKey}`);
  const of = randomInt(random, 3, 9);
  const rank = Math.max(1, Math.min(of, Math.round((percentile / 100) * of + random() * 0.8)));
  return { rank, of };
}

/**
 * DEMO_DATA: local. Real implementation: POST /rank/drop/:dateKey
 *
 * Returns `undefined` until the field locks, which is what keeps the reveal a
 * scheduled event rather than an instant one.
 */
export async function processRankDrop(
  userId: string,
  dateKey: string,
  now: Date | number = Date.now(),
): Promise<RankResult | undefined> {
  const existing = await getRankResult(userId, dateKey);
  if (existing) return existing;

  const attempt: Attempt | undefined = await getAttempt(userId, dateKey);
  if (!attempt) return undefined;
  if (attempt.status === "IN_PROGRESS") return undefined;
  if (!isRankDropReady(dateKey, now)) return undefined;

  await simulateLatency();

  const state = await getRankState(userId, dateKey);
  const placement = placementFor(dateKey, attempt.totalScore);
  const actual = actualFromPlacement(placement.fieldRank, placement.fieldSize);
  const field = sampleFieldRp(dateKey, FIELD_SAMPLE_SIZE);
  const delta = rankDelta({ rp: state.rp, gamesPlayed: state.gamesPlayed, actual, field });

  const previous = await getAttempt(userId, addDaysToKey(dateKey, -1));
  const playedPreviousDay = Boolean(previous && previous.status !== "IN_PROGRESS");
  const applied = applyRankDelta(state, delta, { playedPreviousDay });

  const result: RankResult = {
    dateKey,
    rpBefore: applied.rpBefore,
    rpAfter: applied.rpAfter,
    delta: applied.delta,
    tierBefore: applied.tierBefore,
    tierAfter: applied.tierAfter,
    divisionBefore: applied.divisionBefore,
    divisionAfter: applied.divisionAfter,
    promoted: applied.promoted,
    demoted: applied.demoted,
    shielded: applied.shielded,
    percentile: placement.percentile,
    fieldSize: placement.fieldSize,
    fieldRank: placement.fieldRank,
    totalScore: attempt.totalScore,
    friendsPosition: friendsPositionFor(dateKey, userId, placement.percentile),
  };

  const results = await loadResults(userId);
  await persistResults(userId, { ...results, [dateKey]: result });
  await persistState(userId, applied.state);
  await setAttemptStatus(userId, dateKey, "RANK_READY");
  return result;
}

export async function markRankSeen(userId: string, dateKey: string): Promise<void> {
  const attempt = await getAttempt(userId, dateKey);
  if (!attempt) return;
  if (attempt.status === "RANK_SEEN") return;
  await setAttemptStatus(userId, dateKey, "RANK_SEEN");
}

/** Test and sign-out hook. */
export function clearRankCache(): void {
  stateCache.clear();
  resultCache.clear();
}
