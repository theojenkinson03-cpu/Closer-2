import { assert, close, equal, isTrue, suite, test } from "./harness";
import {
  clamp,
  clampToRange,
  decimalsForStep,
  DECAY,
  errorForScore,
  exactnessFor,
  MAX_DAILY_SCORE,
  MAX_SCORE,
  normalisedError,
  QUESTIONS_PER_DAY,
  rangeSpan,
  scoreAnswer,
  scoreForNormalisedError,
  scoreRatio,
  snapToStep,
  totalScore,
} from "../src/core/scoring";

suite("scoring", () => {
  test("an exact guess scores the maximum", () => {
    equal(scoreAnswer(8849, { answer: 8849, rangeStart: 5000, rangeEnd: 10000 }).score, MAX_SCORE);
  });

  test("the worst possible guess still scores above zero", () => {
    const result = scoreAnswer(5000, { answer: 10000, rangeStart: 5000, rangeEnd: 10000 });
    equal(result.normalisedError, 1);
    equal(result.score, Math.round(MAX_SCORE * Math.exp(-DECAY)));
    assert(result.score > 0, "exponential decay never reaches zero");
  });

  test("score falls monotonically as error grows", () => {
    let previous = Infinity;
    for (let error = 0; error <= 1; error += 0.05) {
      const score = scoreForNormalisedError(error);
      assert(score <= previous, `score rose at error ${error}`);
      previous = score;
    }
  });

  test("five per cent off the span still pays a real score", () => {
    equal(scoreForNormalisedError(0.05), 787);
  });

  test("normalised error is a fraction of the span", () => {
    close(normalisedError(60, 50, 0, 100), 0.1);
    close(normalisedError(40, 50, 0, 100), 0.1);
  });

  test("normalised error clamps at one", () => {
    equal(normalisedError(5000, 50, 0, 100), 1);
  });

  test("a reversed range scores identically to its ascending twin", () => {
    const descending = scoreAnswer(700, { answer: 753, rangeStart: 1200, rangeEnd: 200 });
    const ascending = scoreAnswer(700, { answer: 753, rangeStart: 200, rangeEnd: 1200 });
    equal(descending.score, ascending.score);
    equal(descending.normalisedError, ascending.normalisedError);
  });

  test("a reversed range keeps its full span", () => {
    equal(rangeSpan(1200, 200), 1000);
    equal(rangeSpan(200, 1200), 1000);
  });

  test("a zero-width range cannot divide by zero", () => {
    equal(rangeSpan(500, 500), 1);
    assert(Number.isFinite(normalisedError(499, 500, 500, 500)), "error stayed finite");
  });

  test("guesses outside the range are clamped, not rejected", () => {
    equal(clampToRange(99999, 5000, 10000), 10000);
    equal(clampToRange(-5, 5000, 10000), 5000);
    equal(clampToRange(700, 1200, 200), 700);
    equal(clampToRange(1500, 1200, 200), 1200);
  });

  test("clamp handles NaN by falling back to the minimum", () => {
    equal(clamp(Number.NaN, 3, 9), 3);
  });

  test("exactness tiers follow the thresholds", () => {
    equal(exactnessFor(0), "BULLSEYE");
    equal(exactnessFor(0.005), "BULLSEYE");
    equal(exactnessFor(0.006), "PRECISE");
    equal(exactnessFor(0.02), "PRECISE");
    equal(exactnessFor(0.049), "CLOSE");
    equal(exactnessFor(0.11), "NEAR");
    equal(exactnessFor(0.2), "WIDE");
    equal(exactnessFor(0.9), "OFF_TARGET");
  });

  test("a breakdown reports signed delta and absolute error", () => {
    const over = scoreAnswer(60, { answer: 50, rangeStart: 0, rangeEnd: 100 });
    equal(over.delta, 10);
    equal(over.error, 10);
    const under = scoreAnswer(40, { answer: 50, rangeStart: 0, rangeEnd: 100 });
    equal(under.delta, -10);
    equal(under.error, 10);
  });

  test("snapping lands on the step grid", () => {
    equal(snapToStep(8847.4, 5000, 10000, 5), 8845);
    equal(snapToStep(3.047, 1, 6, 0.01), 3.05);
  });

  test("snapping never leaves the range", () => {
    equal(snapToStep(99999, 0, 100, 7), 98);
    equal(snapToStep(-99999, 0, 100, 7), 0);
  });

  test("snapping works on a reversed range", () => {
    equal(snapToStep(753.4, 1200, 200, 1), 753);
  });

  test("step decimals are derived from the step", () => {
    equal(decimalsForStep(1), 0);
    equal(decimalsForStep(0.5), 1);
    equal(decimalsForStep(0.01), 2);
    equal(decimalsForStep(0), 0);
  });

  test("a day totals seven questions", () => {
    equal(QUESTIONS_PER_DAY, 7);
    equal(MAX_DAILY_SCORE, MAX_SCORE * QUESTIONS_PER_DAY);
  });

  test("totals sum the answers", () => {
    equal(totalScore([{ score: 1000 }, { score: 812 }, { score: 0 }]), 1812);
    equal(totalScore([]), 0);
  });

  test("score ratio is bounded to zero and one", () => {
    close(scoreRatio(3500, 7), 0.5);
    equal(scoreRatio(99999, 7), 1);
    equal(scoreRatio(-10, 7), 0);
  });

  test("errorForScore inverts the scoring curve", () => {
    const error = errorForScore(787);
    close(error, 0.05, 0.0005);
    equal(scoreForNormalisedError(error), 787);
  });

  test("a bullseye needs half a per cent of the span", () => {
    const question = { answer: 1000, rangeStart: 0, rangeEnd: 2000 };
    isTrue(scoreAnswer(1010, question).exactness === "BULLSEYE");
    isTrue(scoreAnswer(1011, question).exactness === "PRECISE");
  });
});
