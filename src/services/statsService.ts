/**
 * Player statistics.
 *
 * Everything here is derived from records the other services already own -
 * attempts and rank results - rather than kept as a separate counter that can
 * drift out of step with them.
 */

import type {
  Attempt,
  CategoryAccuracy,
  ExactnessTier,
  PlayerStats,
  QuestionCategory,
} from "../types";
import { EXACTNESS_ORDER } from "../core/scoring";
import { isConsecutiveDay, dateKeyFor } from "../core/dates";
import { listAttempts } from "./attemptService";
import { getHistory } from "./rankService";
import { getQuestion } from "./questionBank";
import { simulateLatency } from "./config";

function emptyExactnessCounts(): Record<ExactnessTier, number> {
  return EXACTNESS_ORDER.reduce(
    (acc, tier) => ({ ...acc, [tier]: 0 }),
    {} as Record<ExactnessTier, number>,
  );
}

/** Longest and current run of consecutive completed days. */
export function computeStreaks(
  completedKeys: readonly string[],
  todayKey: string = dateKeyFor(),
): { current: number; best: number } {
  const sorted = [...completedKeys].sort();
  let best = 0;
  let run = 0;
  let previous: string | undefined;
  for (const key of sorted) {
    run = previous && isConsecutiveDay(previous, key) ? run + 1 : 1;
    best = Math.max(best, run);
    previous = key;
  }
  const last = sorted[sorted.length - 1];
  const current = !last
    ? 0
    : last === todayKey || isConsecutiveDay(last, todayKey)
      ? run
      : 0;
  return { current, best };
}

/** DEMO_DATA: local. Real implementation: GET /stats */
export async function getPlayerStats(userId: string, todayKey: string = dateKeyFor()): Promise<PlayerStats> {
  await simulateLatency();

  const attempts = await listAttempts(userId);
  const completed = attempts.filter((attempt) => attempt.status !== "IN_PROGRESS");
  const history = await getHistory(userId);

  const exactnessCounts = emptyExactnessCounts();
  const categoryTotals = new Map<QuestionCategory, { score: number; answered: number }>();

  for (const attempt of completed) {
    for (const answer of attempt.answers) {
      exactnessCounts[answer.exactness] += 1;
      const question = getQuestion(answer.questionId);
      if (!question) continue;
      const bucket = categoryTotals.get(question.category) ?? { score: 0, answered: 0 };
      bucket.score += answer.score;
      bucket.answered += 1;
      categoryTotals.set(question.category, bucket);
    }
  }

  const scores = completed.map((attempt: Attempt) => attempt.totalScore);
  const { current, best } = computeStreaks(
    completed.map((attempt) => attempt.dateKey),
    todayKey,
  );

  const byCategory: CategoryAccuracy[] = [...categoryTotals.entries()]
    .map(([category, bucket]) => ({
      category,
      averageScore: Math.round(bucket.score / Math.max(1, bucket.answered)),
      answered: bucket.answered,
    }))
    .sort((a, b) => b.averageScore - a.averageScore);

  return {
    gamesPlayed: completed.length,
    currentStreak: current,
    bestStreak: best,
    averageScore: scores.length
      ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
      : 0,
    bestScore: scores.length ? Math.max(...scores) : 0,
    bullseyes: exactnessCounts.BULLSEYE,
    exactnessCounts,
    history,
    byCategory,
  };
}
