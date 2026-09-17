import { assert, equal, isTrue, suite, test, throwsAsync } from "./harness";
import {
  AttemptError,
  clearAttemptCache,
  getAnswerContext,
  getAttempt,
  listAttempts,
  lockAnswer,
  startAttempt,
} from "../src/services/attemptService";
import {
  buildDailySet,
  cycleLengthDays,
  SEAM_GUARD_DAYS,
  seamGuardFor,
  selectQuestions,
} from "../src/services/dailyService";
import { clearRankCache, getRankResult, getRankState, isRankDropReady, markRankSeen, processRankDrop } from "../src/services/rankService";
import { getLeaderboard } from "../src/services/leaderboardService";
import { computeStreaks, getPlayerStats } from "../src/services/statsService";
import { QUESTIONS } from "../src/services/questionBank";
import { placementFor, fieldSizeFor, questionFieldStats, sampleFieldRp } from "../src/services/field";
import { createMemoryAdapter, setStorageAdapter, writeJson } from "../src/services/storage";
import { setLatencyEnabled } from "../src/services/config";
import {
  clearPracticeCache,
  getPracticeAttempt,
  isArchiveAvailable,
  listArchive,
  lockPracticeAnswer,
  PracticeError,
  resetPractice,
  startPractice,
} from "../src/services/practiceService";
import {
  completeOnboarding,
  DEFAULT_PREFERENCES,
  getPreferences,
  needsOnboarding,
  ONBOARDING_VERSION,
  setPreferences,
} from "../src/services/preferences";
import { QUESTIONS_PER_DAY } from "../src/core/scoring";
import { formatUnitValue } from "../src/core/formatting";
import { addDaysToKey, daysBetweenKeys, rankDropAtFor, SEASON_EPOCH, seasonIdFor } from "../src/core/dates";

setLatencyEnabled(false);

const USER = "test_user";
const DAY = "2026-09-15";
const AFTER_DROP = new Date(rankDropAtFor(DAY)).getTime() + 60_000;
const BEFORE_DROP = new Date(rankDropAtFor(DAY)).getTime() - 60_000;

function reset(): void {
  setStorageAdapter(createMemoryAdapter());
  clearAttemptCache();
  clearRankCache();
  clearPracticeCache();
}

/** Answer every question in a day's set, optionally perfectly. */
async function playDay(dateKey: string, perfect = false): Promise<void> {
  const set = buildDailySet(dateKey);
  for (const question of set.questions) {
    const value = perfect ? question.answer : question.rangeStart;
    await lockAnswer(USER, dateKey, question.id, value);
  }
}

suite("question bank", () => {
  test("every question has a unique id", () => {
    equal(new Set(QUESTIONS.map((q) => q.id)).size, QUESTIONS.length);
  });

  test("every answer sits inside its own range", () => {
    for (const question of QUESTIONS) {
      const low = Math.min(question.rangeStart, question.rangeEnd);
      const high = Math.max(question.rangeStart, question.rangeEnd);
      assert(
        question.answer >= low && question.answer <= high,
        `${question.id}: answer ${question.answer} is outside [${low}, ${high}]`,
      );
    }
  });

  test("every question has a usable step", () => {
    for (const question of QUESTIONS) {
      assert(question.step > 0, `${question.id}: step must be positive`);
      const span = Math.abs(question.rangeEnd - question.rangeStart);
      assert(span / question.step >= 10, `${question.id}: too few positions on the slider`);
    }
  });

  test("every question is attributed and dated", () => {
    for (const question of QUESTIONS) {
      assert(question.source.length > 3, `${question.id}: missing a source`);
      assert(/^\d{4}-\d{2}-\d{2}$/.test(question.verifiedAt), `${question.id}: bad verifiedAt`);
    }
  });

  test("date questions never render a thousands separator", () => {
    for (const question of QUESTIONS) {
      if (question.unit.long !== "CE" && question.unit.long !== "BCE") continue;
      const rendered = formatUnitValue(question.answer, question.unit);
      assert(!rendered.includes(","), `${question.id}: rendered a year as ${rendered}`);
    }
  });

  test("the bank holds a month of content", () => {
    assert(
      cycleLengthDays() >= 28,
      `only ${cycleLengthDays()} days of unique content; a month is the retention bar`,
    );
  });
});

suite("daily set", () => {
  test("a day holds exactly seven questions", () => {
    equal(buildDailySet(DAY).questions.length, QUESTIONS_PER_DAY);
  });

  test("selection is deterministic", () => {
    const a = selectQuestions(DAY).map((q) => q.id);
    const b = selectQuestions(DAY).map((q) => q.id);
    equal(a.join(","), b.join(","));
  });

  test("consecutive days do not share questions", () => {
    const today = new Set(selectQuestions(DAY).map((q) => q.id));
    const tomorrow = selectQuestions(addDaysToKey(DAY, 1)).map((q) => q.id);
    for (const id of tomorrow) assert(!today.has(id), `${id} repeated a day later`);
  });

  test("a full cycle never repeats a question", () => {
    // Align to a cycle boundary: the no-repeat guarantee is per cycle, and an
    // arbitrary window of the same length straddles two of them.
    const cycleDays = cycleLengthDays();
    const offset = ((daysBetweenKeys(SEASON_EPOCH, DAY) % cycleDays) + cycleDays) % cycleDays;
    const start = addDaysToKey(DAY, -offset);
    const seen = new Set<string>();
    for (let i = 0; i < cycleDays; i += 1) {
      for (const question of selectQuestions(addDaysToKey(start, i))) {
        assert(!seen.has(question.id), `${question.id} repeated inside a cycle`);
        seen.add(question.id);
      }
    }
  });

  test("no question returns inside a week, seams included", () => {
    // Long enough to cross two seams, which is where the guarantee is thinnest.
    const lastSeen = new Map<string, number>();
    const guard = seamGuardFor(cycleLengthDays());
    for (let day = 0; day < cycleLengthDays() * 2 + 10; day += 1) {
      for (const question of selectQuestions(addDaysToKey(DAY, day))) {
        const previous = lastSeen.get(question.id);
        if (previous !== undefined) {
          assert(
            day - previous > guard,
            `${question.id} returned after ${day - previous} day(s), guard is ${guard}`,
          );
        }
        lastSeen.set(question.id, day);
      }
    }
  });

  test("the guard shrinks rather than breaking on a short cycle", () => {
    equal(seamGuardFor(33), SEAM_GUARD_DAYS);
    equal(seamGuardFor(5), 2, "a five-day cycle cannot support a six-day guard");
    equal(seamGuardFor(1), 0);
  });

  test("a set opens easy and ends hard", () => {
    const difficulties = selectQuestions(DAY).map((q) => q.difficulty);
    for (let i = 1; i < difficulties.length; i += 1) {
      assert(difficulties[i]! >= difficulties[i - 1]!, "difficulty should not fall");
    }
  });

  test("the rank drop is stamped on the set", () => {
    equal(buildDailySet(DAY).rankDropAt, rankDropAtFor(DAY));
  });
});

suite("attempts", () => {
  test("no attempt exists until one is started", async () => {
    reset();
    equal(await getAttempt(USER, DAY), undefined);
  });

  test("starting twice returns the same attempt", async () => {
    reset();
    const first = await startAttempt(USER, DAY);
    const second = await startAttempt(USER, DAY);
    equal(first.attemptId, second.attemptId);
    equal(first.startedAt, second.startedAt);
  });

  test("the service scores the answer, not the caller", async () => {
    reset();
    const question = buildDailySet(DAY).questions[0]!;
    const { answer } = await lockAnswer(USER, DAY, question.id, question.answer);
    equal(answer.score, 1000);
    equal(answer.exactness, "BULLSEYE");
    equal(answer.answer, question.answer);
  });

  test("an answer cannot be changed once locked", async () => {
    reset();
    const question = buildDailySet(DAY).questions[0]!;
    await lockAnswer(USER, DAY, question.id, question.answer);
    await throwsAsync(
      () => lockAnswer(USER, DAY, question.id, question.answer),
      (error) => error instanceof AttemptError && error.code === "ANSWER_LOCKED",
    );
  });

  test("questions must be answered in order", async () => {
    reset();
    const set = buildDailySet(DAY);
    await throwsAsync(
      () => lockAnswer(USER, DAY, set.questions[3]!.id, 0),
      (error) => error instanceof AttemptError && error.code === "OUT_OF_ORDER",
    );
  });

  test("a question from another day is rejected", async () => {
    reset();
    await throwsAsync(
      () => lockAnswer(USER, DAY, "not-a-question", 0),
      (error) => error instanceof AttemptError && error.code === "UNKNOWN_QUESTION",
    );
  });

  test("the seventh answer submits the attempt", async () => {
    reset();
    await playDay(DAY, true);
    const attempt = await getAttempt(USER, DAY);
    equal(attempt?.status, "SUBMITTED");
    equal(attempt?.answers.length, QUESTIONS_PER_DAY);
    equal(attempt?.totalScore, 7000);
    assert(Boolean(attempt?.submittedAt), "a submitted attempt is stamped");
  });

  test("a submitted day cannot be played again", async () => {
    reset();
    await playDay(DAY, true);
    const question = buildDailySet(DAY).questions[0]!;
    await throwsAsync(
      () => lockAnswer(USER, DAY, question.id, 1),
      (error) => error instanceof AttemptError && error.code === "ALREADY_SUBMITTED",
    );
  });

  test("an attempt survives the app being killed", async () => {
    reset();
    const set = buildDailySet(DAY);
    await lockAnswer(USER, DAY, set.questions[0]!.id, set.questions[0]!.answer);
    await lockAnswer(USER, DAY, set.questions[1]!.id, set.questions[1]!.answer);

    // Same storage, brand new process: caches gone, records intact.
    clearAttemptCache();
    clearRankCache();

    const restored = await getAttempt(USER, DAY);
    equal(restored?.answers.length, 2);
    equal(restored?.currentIndex, 2);
    equal(restored?.status, "IN_PROGRESS");
  });

  test("attempts list newest first", async () => {
    reset();
    await playDay(addDaysToKey(DAY, -1), true);
    await playDay(DAY, true);
    const attempts = await listAttempts(USER);
    equal(attempts[0]?.dateKey, DAY);
    equal(attempts.length, 2);
  });
});

suite("rank drop", () => {
  test("nothing drops before the field locks", async () => {
    reset();
    await playDay(DAY, true);
    equal(await processRankDrop(USER, DAY, BEFORE_DROP), undefined);
  });

  test("an unfinished day never drops", async () => {
    reset();
    const set = buildDailySet(DAY);
    await lockAnswer(USER, DAY, set.questions[0]!.id, set.questions[0]!.answer);
    equal(await processRankDrop(USER, DAY, AFTER_DROP), undefined);
  });

  test("readiness follows the clock", () => {
    isTrue(isRankDropReady(DAY, AFTER_DROP));
    equal(isRankDropReady(DAY, BEFORE_DROP), false);
  });

  test("a perfect day beats the field and gains rp", async () => {
    reset();
    await playDay(DAY, true);
    const result = await processRankDrop(USER, DAY, AFTER_DROP);
    assert(result !== undefined, "the drop should produce a result");
    assert(result!.delta > 0, "a perfect score should gain rp");
    equal(result!.percentile, 1);
    equal(result!.totalScore, 7000);
  });

  test("a rated player pays for a bad day", async () => {
    reset();
    // Seed an established rating: a settled player has something to lose.
    await writeJson(`rank:${USER}`, {
      userId: USER,
      rp: 1900,
      tier: "SHARPSHOOTER",
      division: 3,
      peakRp: 1900,
      gamesPlayed: 60,
      streak: 4,
      seasonId: seasonIdFor(DAY),
      demotionShield: false,
    });
    await playDay(DAY, false);
    const result = await processRankDrop(USER, DAY, AFTER_DROP);
    assert(result !== undefined);
    assert(result!.delta < 0, "the bottom of the field should cost a rated player rp");
    assert(result!.percentile > 80, "guessing the floor should finish well down the field");
  });

  test("an unrated player is barely punished for a bad day", async () => {
    reset();
    await playDay(DAY, false);
    const result = await processRankDrop(USER, DAY, AFTER_DROP);
    assert(result !== undefined);
    // A 250 RP newcomer is expected to lose to the field, so losing costs
    // almost nothing. That asymmetry is the point of an expectation-based
    // ladder: you are paid against what you were supposed to do.
    assert(result!.delta > -12, "a newcomer should not be buried for a first bad day");
    assert(result!.delta <= 0);
  });

  test("processing twice returns the same stored result", async () => {
    reset();
    await playDay(DAY, true);
    const first = await processRankDrop(USER, DAY, AFTER_DROP);
    const second = await processRankDrop(USER, DAY, AFTER_DROP);
    equal(first!.rpAfter, second!.rpAfter);
    equal(first!.delta, second!.delta, "rp must not be paid out twice");
  });

  test("the drop moves the stored rank state", async () => {
    reset();
    const before = await getRankState(USER, DAY);
    await playDay(DAY, true);
    const result = await processRankDrop(USER, DAY, AFTER_DROP);
    const after = await getRankState(USER, DAY);
    equal(after.rp, result!.rpAfter);
    equal(after.gamesPlayed, before.gamesPlayed + 1);
  });

  test("the attempt advances to RANK_READY, then RANK_SEEN", async () => {
    reset();
    await playDay(DAY, true);
    await processRankDrop(USER, DAY, AFTER_DROP);
    equal((await getAttempt(USER, DAY))?.status, "RANK_READY");
    await markRankSeen(USER, DAY);
    equal((await getAttempt(USER, DAY))?.status, "RANK_SEEN");
  });

  test("a stored result is readable afterwards", async () => {
    reset();
    await playDay(DAY, true);
    await processRankDrop(USER, DAY, AFTER_DROP);
    const stored = await getRankResult(USER, DAY);
    equal(stored?.dateKey, DAY);
  });
});

suite("field and leaderboard", () => {
  test("the field is the same size every time it is asked", () => {
    equal(fieldSizeFor(DAY), fieldSizeFor(DAY));
    assert(fieldSizeFor(DAY) > 1000);
  });

  test("a better score never places worse", () => {
    const good = placementFor(DAY, 6200);
    const bad = placementFor(DAY, 2100);
    assert(good.fieldRank < bad.fieldRank);
    assert(good.percentile <= bad.percentile);
  });

  test("the sampled field is stable and plausible", () => {
    const sample = sampleFieldRp(DAY, 32);
    equal(sample.length, 32);
    equal(sample.join(","), sampleFieldRp(DAY, 32).join(","));
    for (const rp of sample) assert(rp >= 0 && rp <= 5200);
  });

  test("the leaderboard is ordered and marks the player", async () => {
    reset();
    await playDay(DAY, true);
    const board = await getLeaderboard(USER, DAY);
    equal(board.top.length, 10);
    for (let i = 1; i < board.top.length; i += 1) {
      assert(board.top[i]!.totalScore <= board.top[i - 1]!.totalScore, "top is not sorted");
      equal(board.top[i]!.rank, i + 1);
    }
    equal(board.around.filter((entry) => entry.isMe).length, 1);
  });

  test("the board hides the field until the player has played", async () => {
    reset();
    const board = await getLeaderboard(USER, DAY);
    equal(board.around.length, 0);
    equal(board.top.length, 10);
  });
});

suite("preferences", () => {
  test("a fresh install needs onboarding", async () => {
    reset();
    const preferences = await getPreferences();
    equal(preferences.onboardingSeen, 0);
    isTrue(needsOnboarding(preferences));
  });

  test("completing onboarding records the version", async () => {
    reset();
    const preferences = await completeOnboarding();
    equal(preferences.onboardingSeen, ONBOARDING_VERSION);
    equal(needsOnboarding(preferences), false);
  });

  test("onboarding shows again when the flow changes", async () => {
    reset();
    await completeOnboarding();
    // A player who saw version 1 should see a materially changed version 2.
    isTrue(needsOnboarding({ ...(await getPreferences()), onboardingSeen: ONBOARDING_VERSION - 1 }));
  });

  test("patches merge rather than replace", async () => {
    reset();
    await completeOnboarding();
    await setPreferences({ sliderHintSeen: true });
    const preferences = await getPreferences();
    equal(preferences.onboardingSeen, ONBOARDING_VERSION, "the unrelated field survived");
    equal(preferences.sliderHintSeen, true);
  });

  test("unknown stored fields fall back to defaults", async () => {
    reset();
    await writeJson("preferences", { sliderHintSeen: true });
    equal((await getPreferences()).onboardingSeen, DEFAULT_PREFERENCES.onboardingSeen);
  });
});

suite("per-question field", () => {
  const easy = { id: "probe-easy", difficulty: 1 as const };
  const hard = { id: "probe-hard", difficulty: 5 as const };

  test("the same question and score always report the same field", () => {
    const a = questionFieldStats(DAY, easy, 800);
    const b = questionFieldStats(DAY, easy, 800);
    equal(a.beatenShare, b.beatenShare);
    equal(a.medianScore, b.medianScore);
  });

  test("a better score never beats less of the field", () => {
    let previous = -1;
    for (const score of [0, 200, 400, 600, 800, 1000]) {
      const { beatenShare } = questionFieldStats(DAY, hard, score);
      assert(beatenShare >= previous, `share fell at ${score}`);
      previous = beatenShare;
    }
  });

  test("a perfect answer beats nearly everyone and a floor answer almost nobody", () => {
    assert(questionFieldStats(DAY, hard, 1000).beatenShare > 0.9);
    assert(questionFieldStats(DAY, hard, 0).beatenShare < 0.05);
  });

  test("an easy question concentrates the field near the answer", () => {
    assert(
      questionFieldStats(DAY, easy, 500).medianScore > questionFieldStats(DAY, hard, 500).medianScore,
      "the median should be higher on an easier question",
    );
    assert(
      questionFieldStats(DAY, easy, 500).bullseyeShare >= questionFieldStats(DAY, hard, 500).bullseyeShare,
    );
  });

  test("shares stay inside zero and one", () => {
    for (const difficulty of [1, 2, 3, 4, 5] as const) {
      const stats = questionFieldStats(DAY, { id: `d${difficulty}`, difficulty }, 700);
      assert(stats.beatenShare >= 0 && stats.beatenShare <= 1);
      assert(stats.bullseyeShare >= 0 && stats.bullseyeShare <= 1);
      assert(stats.medianScore >= 0 && stats.medianScore <= 1000);
    }
  });

  test("locking an answer reports the field with it", async () => {
    reset();
    const question = buildDailySet(DAY).questions[0]!;
    const { field } = await lockAnswer(USER, DAY, question.id, question.answer);
    assert(field.beatenShare > 0.9, "a bullseye should beat the field");
  });

  test("context is available for an answer already on record", async () => {
    const question = buildDailySet(DAY).questions[2]!;
    const stats = await getAnswerContext(DAY, question.id, 1000);
    assert(stats !== undefined);
    equal(await getAnswerContext(DAY, "not-a-question", 500), undefined);
  });
});

suite("archive", () => {
  const YESTERDAY = addDaysToKey(DAY, -1);

  async function playPractice(dateKey: string, perfect = false): Promise<void> {
    for (const question of buildDailySet(dateKey).questions) {
      await lockPracticeAnswer(USER, dateKey, question.id, perfect ? question.answer : question.rangeStart, DAY);
    }
  }

  test("only past days are playable", () => {
    isTrue(isArchiveAvailable(YESTERDAY, DAY));
    equal(isArchiveAvailable(DAY, DAY), false, "today is ranked, not practice");
    equal(isArchiveAvailable(addDaysToKey(DAY, 1), DAY), false);
    equal(isArchiveAvailable("2020-01-01", DAY), false, "before ranked play began");
  });

  test("today cannot be practised, even by a direct call", async () => {
    reset();
    await throwsAsync(
      () => startPractice(USER, DAY, DAY),
      (error) => error instanceof PracticeError && error.code === "NOT_PAST_DAY",
    );
    const question = buildDailySet(DAY).questions[0]!;
    await throwsAsync(
      () => lockPracticeAnswer(USER, DAY, question.id, 1, DAY),
      (error) => error instanceof PracticeError && error.code === "NOT_PAST_DAY",
    );
  });

  test("practice is scored by the same engine as ranked play", async () => {
    reset();
    const question = buildDailySet(YESTERDAY).questions[0]!;
    const { answer } = await lockPracticeAnswer(USER, YESTERDAY, question.id, question.answer, DAY);
    equal(answer.score, 1000);
    equal(answer.exactness, "BULLSEYE");
  });

  test("practice never touches rank, streak or the ranked attempt", async () => {
    reset();
    const before = await getRankState(USER, DAY);
    await playPractice(YESTERDAY, true);

    const after = await getRankState(USER, DAY);
    equal(after.rp, before.rp, "rp moved");
    equal(after.gamesPlayed, before.gamesPlayed, "games played moved");
    equal(after.streak, before.streak, "streak moved");
    equal(await getAttempt(USER, YESTERDAY), undefined, "a ranked attempt was created");
    equal((await getPlayerStats(USER, DAY)).gamesPlayed, 0, "practice counted as a game");
  });

  test("practice keeps its order and completes", async () => {
    reset();
    const set = buildDailySet(YESTERDAY);
    await throwsAsync(
      () => lockPracticeAnswer(USER, YESTERDAY, set.questions[4]!.id, 0, DAY),
      (error) => error instanceof PracticeError && error.code === "OUT_OF_ORDER",
    );
    await playPractice(YESTERDAY, true);
    const attempt = await getPracticeAttempt(USER, YESTERDAY);
    equal(attempt?.answers.length, QUESTIONS_PER_DAY);
    equal(attempt?.totalScore, 7000);
    assert(Boolean(attempt?.completedAt));
  });

  test("a finished day is closed until it is reset", async () => {
    reset();
    await playPractice(YESTERDAY, true);
    const question = buildDailySet(YESTERDAY).questions[0]!;
    await throwsAsync(
      () => lockPracticeAnswer(USER, YESTERDAY, question.id, 1, DAY),
      (error) => error instanceof PracticeError && error.code === "ALREADY_COMPLETE",
    );

    await resetPractice(USER, YESTERDAY);
    equal(await getPracticeAttempt(USER, YESTERDAY), undefined);
    const { answer } = await lockPracticeAnswer(USER, YESTERDAY, question.id, question.answer, DAY);
    equal(answer.score, 1000, "the day is playable again");
  });

  test("practice survives a restart", async () => {
    reset();
    const set = buildDailySet(YESTERDAY);
    await lockPracticeAnswer(USER, YESTERDAY, set.questions[0]!.id, set.questions[0]!.answer, DAY);
    clearPracticeCache();
    const restored = await getPracticeAttempt(USER, YESTERDAY);
    equal(restored?.answers.length, 1);
  });

  test("the archive lists past days with both scores", async () => {
    reset();
    await playPractice(YESTERDAY, true);
    const entries = await listArchive(USER, new Map([[YESTERDAY, 4812]]), DAY, 5);
    equal(entries.length, 5);
    equal(entries[0]?.dateKey, YESTERDAY, "newest first");
    equal(entries[0]?.rankedScore, 4812);
    equal(entries[0]?.practiceScore, 7000);
    equal(entries[1]?.practiceScore, undefined);
  });

  test("the archive never lists today or the future", async () => {
    reset();
    const entries = await listArchive(USER, new Map(), DAY, 10);
    for (const entry of entries) isTrue(isArchiveAvailable(entry.dateKey, DAY));
  });

  test("a part-finished day is flagged in progress", async () => {
    reset();
    const set = buildDailySet(YESTERDAY);
    await lockPracticeAnswer(USER, YESTERDAY, set.questions[0]!.id, 0, DAY);
    const entries = await listArchive(USER, new Map(), DAY, 3);
    isTrue(entries[0]!.inProgress);
    equal(entries[0]!.practiceScore, undefined);
  });
});

suite("stats", () => {
  test("streaks count consecutive days", () => {
    const { current, best } = computeStreaks(
      ["2026-09-11", "2026-09-12", "2026-09-13", "2026-09-15"],
      "2026-09-15",
    );
    equal(best, 3);
    equal(current, 1);
  });

  test("a streak survives until the following day", () => {
    equal(computeStreaks(["2026-09-14"], "2026-09-15").current, 1);
    equal(computeStreaks(["2026-09-13"], "2026-09-15").current, 0, "a missed day ends it");
  });

  test("no games played is an empty, safe stats block", async () => {
    reset();
    const stats = await getPlayerStats(USER, DAY);
    equal(stats.gamesPlayed, 0);
    equal(stats.averageScore, 0);
    equal(stats.bestScore, 0);
    equal(stats.history.length, 0);
  });

  test("stats aggregate across days", async () => {
    reset();
    await playDay(addDaysToKey(DAY, -1), true);
    await playDay(DAY, true);
    const stats = await getPlayerStats(USER, DAY);
    equal(stats.gamesPlayed, 2);
    equal(stats.averageScore, 7000);
    equal(stats.bestScore, 7000);
    equal(stats.bullseyes, QUESTIONS_PER_DAY * 2);
    equal(stats.currentStreak, 2);
  });

  test("category accuracy covers every answered category", async () => {
    reset();
    await playDay(DAY, true);
    const stats = await getPlayerStats(USER, DAY);
    const answered = stats.byCategory.reduce((sum, entry) => sum + entry.answered, 0);
    equal(answered, QUESTIONS_PER_DAY);
    for (const entry of stats.byCategory) equal(entry.averageScore, 1000);
  });

  test("history follows the rank drops", async () => {
    reset();
    await playDay(DAY, true);
    await processRankDrop(USER, DAY, AFTER_DROP);
    const stats = await getPlayerStats(USER, DAY);
    equal(stats.history.length, 1);
    equal(stats.history[0]?.dateKey, DAY);
  });
});
