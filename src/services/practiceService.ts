/**
 * The archive: past sets, played unranked.
 *
 * A player who finishes today has nothing left to do, and a new player has no
 * way to practise without spending their one ranked attempt. The archive fixes
 * both, and the design of it is mostly about what it must *not* do.
 *
 * Three rules, enforced here rather than in the UI, because a client cannot be
 * trusted with any of them:
 *
 *   1. Past days only. Today's set is never playable unranked - that would hand
 *      out a practice run at the questions you are about to be ranked on.
 *   2. Practice never touches rank. No RP, no streak, no games played, no
 *      ranked attempt. Practice records live under their own key and the
 *      ranked services are not imported here at all.
 *   3. Practice is replayable. Scarcity is the ranked game's job; the archive's
 *      job is repetition, so a day can be reset and tried again.
 */

import { addDaysToKey, compareDateKeys, dateKeyFor, SEASON_EPOCH } from "../core/dates";
import { QUESTIONS_PER_DAY, scoreAnswer, totalScore as sumScores } from "../core/scoring";
import type { AnswerRecord, Question } from "../types";
import { simulateLatency } from "./config";
import { buildDailySet } from "./dailyService";
import { questionFieldStats } from "./field";
import type { QuestionFieldStats } from "./field";
import { readJson, writeJson } from "./storage";

export type PracticeErrorCode =
  | "NOT_PAST_DAY"
  | "ALREADY_COMPLETE"
  | "UNKNOWN_QUESTION"
  | "OUT_OF_ORDER";

export class PracticeError extends Error {
  readonly code: PracticeErrorCode;

  constructor(code: PracticeErrorCode, message: string) {
    super(message);
    this.name = "PracticeError";
    this.code = code;
  }
}

export interface PracticeAttempt {
  readonly userId: string;
  readonly dateKey: string;
  readonly answers: readonly AnswerRecord[];
  readonly currentIndex: number;
  readonly totalScore: number;
  readonly startedAt: string;
  readonly completedAt?: string;
}

type PracticeByDate = Record<string, PracticeAttempt>;

const cache = new Map<string, PracticeByDate>();

function keyFor(userId: string): string {
  return `practice:${userId}`;
}

async function load(userId: string): Promise<PracticeByDate> {
  const cached = cache.get(userId);
  if (cached) return cached;
  const stored = await readJson<PracticeByDate>(keyFor(userId), {});
  cache.set(userId, stored);
  return stored;
}

async function persist(userId: string, attempts: PracticeByDate): Promise<void> {
  cache.set(userId, attempts);
  await writeJson(keyFor(userId), attempts);
}

/**
 * Whether a day can be practised: strictly in the past, and not before ranked
 * play began - there are no sets to replay before the epoch.
 */
export function isArchiveAvailable(dateKey: string, todayKey: string = dateKeyFor()): boolean {
  return compareDateKeys(dateKey, todayKey) < 0 && compareDateKeys(dateKey, SEASON_EPOCH) >= 0;
}

export async function getPracticeAttempt(
  userId: string,
  dateKey: string,
): Promise<PracticeAttempt | undefined> {
  return (await load(userId))[dateKey];
}

/** DEMO_DATA: local. Real implementation: POST /practice */
export async function startPractice(
  userId: string,
  dateKey: string,
  todayKey: string = dateKeyFor(),
): Promise<PracticeAttempt> {
  if (!isArchiveAvailable(dateKey, todayKey)) {
    throw new PracticeError("NOT_PAST_DAY", "Only days that have already been ranked can be practised.");
  }
  await simulateLatency();
  const attempts = await load(userId);
  const existing = attempts[dateKey];
  if (existing) return existing;

  const fresh: PracticeAttempt = {
    userId,
    dateKey,
    answers: [],
    currentIndex: 0,
    totalScore: 0,
    startedAt: new Date().toISOString(),
  };
  await persist(userId, { ...attempts, [dateKey]: fresh });
  return fresh;
}

/** Wipe a day's practice record so it can be played again. */
export async function resetPractice(userId: string, dateKey: string): Promise<void> {
  const attempts = await load(userId);
  const { [dateKey]: _removed, ...rest } = attempts;
  await persist(userId, rest);
}

export interface PracticeLockResult {
  readonly attempt: PracticeAttempt;
  readonly answer: AnswerRecord;
  readonly field: QuestionFieldStats;
  readonly completed: boolean;
}

/**
 * DEMO_DATA: local. Real implementation: POST /practice/:dateKey/answers
 *
 * Scored by the same engine as a ranked answer, so practice is honest about how
 * a guess would have done. Only where it is *recorded* differs.
 */
export async function lockPracticeAnswer(
  userId: string,
  dateKey: string,
  questionId: string,
  value: number,
  todayKey: string = dateKeyFor(),
): Promise<PracticeLockResult> {
  if (!isArchiveAvailable(dateKey, todayKey)) {
    throw new PracticeError("NOT_PAST_DAY", "Only days that have already been ranked can be practised.");
  }

  const attempts = await load(userId);
  const current = attempts[dateKey] ?? (await startPractice(userId, dateKey, todayKey));
  if (current.completedAt) {
    throw new PracticeError("ALREADY_COMPLETE", "That day is finished. Reset it to play again.");
  }

  const set = buildDailySet(dateKey);
  const question: Question | undefined = set.questions.find((entry) => entry.id === questionId);
  if (!question) {
    throw new PracticeError("UNKNOWN_QUESTION", "That question is not in that day's set.");
  }
  const expected = set.questions[current.currentIndex];
  if (!expected || expected.id !== questionId) {
    throw new PracticeError("OUT_OF_ORDER", "Questions must be answered in order.");
  }

  const breakdown = scoreAnswer(value, question);
  const answer: AnswerRecord = {
    questionId,
    value,
    answer: question.answer,
    answeredAt: new Date().toISOString(),
    ...breakdown,
  };

  const answers = [...current.answers, answer];
  const completed = answers.length >= QUESTIONS_PER_DAY;
  const updated: PracticeAttempt = {
    ...current,
    answers,
    currentIndex: answers.length,
    totalScore: sumScores(answers),
    ...(completed ? { completedAt: new Date().toISOString() } : {}),
  };

  await persist(userId, { ...(await load(userId)), [dateKey]: updated });
  return {
    attempt: updated,
    answer,
    field: questionFieldStats(dateKey, question, breakdown.score),
    completed,
  };
}

export interface ArchiveEntry {
  readonly dateKey: string;
  /** Score from the ranked attempt on that day, if it was played. */
  readonly rankedScore?: number;
  /** Score from a practice run, if one has been completed. */
  readonly practiceScore?: number;
  /** True when a practice run is part-finished. */
  readonly inProgress: boolean;
}

/**
 * DEMO_DATA: local. Real implementation: GET /archive
 *
 * Ranked scores are passed in rather than read here, so this module keeps its
 * promise of never importing the ranked services.
 */
export async function listArchive(
  userId: string,
  rankedScores: ReadonlyMap<string, number>,
  todayKey: string = dateKeyFor(),
  count = 14,
): Promise<ArchiveEntry[]> {
  const practice = await load(userId);
  const entries: ArchiveEntry[] = [];
  for (let i = 1; i <= count; i += 1) {
    const dateKey = addDaysToKey(todayKey, -i);
    if (!isArchiveAvailable(dateKey, todayKey)) break;
    const attempt = practice[dateKey];
    entries.push({
      dateKey,
      ...(rankedScores.has(dateKey) ? { rankedScore: rankedScores.get(dateKey)! } : {}),
      ...(attempt?.completedAt ? { practiceScore: attempt.totalScore } : {}),
      inProgress: Boolean(attempt && !attempt.completedAt && attempt.answers.length > 0),
    });
  }
  return entries;
}

/** Test and sign-out hook. */
export function clearPracticeCache(): void {
  cache.clear();
}
