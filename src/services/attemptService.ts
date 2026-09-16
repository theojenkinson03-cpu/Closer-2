/**
 * Attempts: the record of what a player answered today.
 *
 * This module is the authority on three rules that a client must never be
 * trusted with, and which are written here exactly as a real API would write
 * them so that moving them server-side is a transplant, not a redesign:
 *
 *   1. One ranked attempt per player per day.
 *   2. An answer, once locked, cannot be changed.
 *   3. Scores are computed here from the stored question, never supplied by
 *      the caller. The UI can ask to lock a value; it cannot assert a score.
 *
 * State is written through to durable storage on every mutation, so an attempt
 * survives the app being killed mid-set.
 */

import { scoreAnswer, QUESTIONS_PER_DAY, totalScore as sumScores } from "../core/scoring";
import { dateKeyFor } from "../core/dates";
import type { Attempt, AnswerRecord, AttemptStatus, Question } from "../types";
import { buildDailySet } from "./dailyService";
import { simulateLatency } from "./config";
import { readJson, writeJson } from "./storage";

export type AttemptErrorCode =
  | "ALREADY_SUBMITTED"
  | "ANSWER_LOCKED"
  | "UNKNOWN_QUESTION"
  | "OUT_OF_ORDER"
  | "NOT_FOUND";

export class AttemptError extends Error {
  readonly code: AttemptErrorCode;

  constructor(code: AttemptErrorCode, message: string) {
    super(message);
    this.name = "AttemptError";
    this.code = code;
  }
}

type AttemptsByDate = Record<string, Attempt>;

const cache = new Map<string, AttemptsByDate>();

function keyFor(userId: string): string {
  return `attempts:${userId}`;
}

async function load(userId: string): Promise<AttemptsByDate> {
  const cached = cache.get(userId);
  if (cached) return cached;
  const stored = await readJson<AttemptsByDate>(keyFor(userId), {});
  cache.set(userId, stored);
  return stored;
}

async function persist(userId: string, attempts: AttemptsByDate): Promise<void> {
  cache.set(userId, attempts);
  await writeJson(keyFor(userId), attempts);
}

function newAttempt(userId: string, dateKey: string, setId: string): Attempt {
  return {
    attemptId: `att_${userId}_${dateKey}`,
    userId,
    setId,
    dateKey,
    status: "IN_PROGRESS",
    answers: [],
    currentIndex: 0,
    totalScore: 0,
    startedAt: new Date().toISOString(),
  };
}

/** DEMO_DATA: local. Real implementation: GET /attempts/:dateKey */
export async function getAttempt(userId: string, dateKey: string): Promise<Attempt | undefined> {
  const attempts = await load(userId);
  return attempts[dateKey];
}

/** Every attempt on record, newest first. Backs the stats and history screens. */
export async function listAttempts(userId: string): Promise<Attempt[]> {
  const attempts = await load(userId);
  return Object.values(attempts).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}

/**
 * DEMO_DATA: local. Real implementation: POST /attempts
 *
 * Idempotent by design: a second call on the same day returns the attempt that
 * already exists rather than issuing a fresh one.
 */
export async function startAttempt(userId: string, dateKey: string = dateKeyFor()): Promise<Attempt> {
  await simulateLatency();
  const attempts = await load(userId);
  const existing = attempts[dateKey];
  if (existing) return existing;
  const set = buildDailySet(dateKey);
  const attempt = newAttempt(userId, dateKey, set.setId);
  await persist(userId, { ...attempts, [dateKey]: attempt });
  return attempt;
}

export interface LockAnswerResult {
  readonly attempt: Attempt;
  readonly answer: AnswerRecord;
  /** True when this answer completed the set. */
  readonly completed: boolean;
}

/**
 * DEMO_DATA: local. Real implementation: POST /attempts/:dateKey/answers
 *
 * The caller sends a raw slider value. Everything else - which question it
 * belongs to, what it scored, how far off it was - is derived here.
 */
export async function lockAnswer(
  userId: string,
  dateKey: string,
  questionId: string,
  value: number,
): Promise<LockAnswerResult> {
  await simulateLatency();
  const existing = (await load(userId))[dateKey];
  const current = existing ?? (await startAttempt(userId, dateKey));

  if (current.status !== "IN_PROGRESS") {
    throw new AttemptError("ALREADY_SUBMITTED", "Today's attempt is already submitted.");
  }
  if (current.answers.some((entry) => entry.questionId === questionId)) {
    throw new AttemptError("ANSWER_LOCKED", "That answer is already locked in.");
  }

  const set = buildDailySet(dateKey);
  const question: Question | undefined = set.questions.find((entry) => entry.id === questionId);
  if (!question) {
    throw new AttemptError("UNKNOWN_QUESTION", "That question is not in today's set.");
  }
  const expected = set.questions[current.currentIndex];
  if (!expected || expected.id !== questionId) {
    throw new AttemptError("OUT_OF_ORDER", "Questions must be answered in order.");
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
  const status: AttemptStatus = completed ? "SUBMITTED" : "IN_PROGRESS";
  const updated: Attempt = {
    ...current,
    answers,
    currentIndex: answers.length,
    totalScore: sumScores(answers),
    status,
    ...(completed ? { submittedAt: new Date().toISOString() } : {}),
  };

  const store = await load(userId);
  await persist(userId, { ...store, [dateKey]: updated });
  return { attempt: updated, answer, completed };
}

/** Move an attempt along the rank pipeline. Called by the rank service. */
export async function setAttemptStatus(
  userId: string,
  dateKey: string,
  status: AttemptStatus,
): Promise<Attempt> {
  const attempts = await load(userId);
  const attempt = attempts[dateKey];
  if (!attempt) throw new AttemptError("NOT_FOUND", "No attempt for that day.");
  const updated: Attempt = { ...attempt, status };
  await persist(userId, { ...attempts, [dateKey]: updated });
  return updated;
}

/** Test and sign-out hook: drops the in-memory cache without touching disk. */
export function clearAttemptCache(): void {
  cache.clear();
}
