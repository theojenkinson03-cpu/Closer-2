import { assert, equal, isFalse, isTrue, suite, test } from "./harness";
import {
  addDaysToKey,
  dateKeyFor,
  dayLabel,
  daysBetweenKeys,
  formatCountdown,
  formatCountdownLoose,
  hasPassed,
  isConsecutiveDay,
  isValidDateKey,
  longDayLabel,
  msUntil,
  nextRankDropFrom,
  parseDateKey,
  RANK_DROP_HOUR,
  rankDropAtFor,
  recentKeys,
  SEASON_EPOCH,
  seasonEndsOn,
  seasonIdFor,
  setOpensAt,
} from "../src/core/dates";

suite("dates", () => {
  test("an instant maps to its game day", () => {
    equal(dateKeyFor(Date.UTC(2026, 8, 15, 23, 59)), "2026-09-15");
    equal(dateKeyFor(Date.UTC(2026, 8, 16, 0, 0)), "2026-09-16");
  });

  test("date keys round-trip", () => {
    equal(dateKeyFor(parseDateKey("2026-03-01")), "2026-03-01");
    equal(dateKeyFor(parseDateKey("2024-02-29")), "2024-02-29", "leap day survives");
  });

  test("invalid keys are rejected", () => {
    isTrue(isValidDateKey("2026-01-05"));
    isFalse(isValidDateKey("2026-1-5"));
    isFalse(isValidDateKey("2026-02-30"));
    isFalse(isValidDateKey("not-a-date"));
  });

  test("adding days crosses month and year ends", () => {
    equal(addDaysToKey("2026-01-31", 1), "2026-02-01");
    equal(addDaysToKey("2026-12-31", 1), "2027-01-01");
    equal(addDaysToKey("2026-01-01", -1), "2025-12-31");
  });

  test("days between keys is signed", () => {
    equal(daysBetweenKeys("2026-09-01", "2026-09-15"), 14);
    equal(daysBetweenKeys("2026-09-15", "2026-09-01"), -14);
    equal(daysBetweenKeys("2026-09-15", "2026-09-15"), 0);
  });

  test("consecutive days are detected across a month boundary", () => {
    isTrue(isConsecutiveDay("2026-02-28", "2026-03-01"), "2026 is not a leap year");
    isFalse(isConsecutiveDay("2026-03-01", "2026-03-03"));
  });

  test("a set opens at the start of its day", () => {
    equal(setOpensAt("2026-09-15"), new Date(Date.UTC(2026, 8, 15)).toISOString());
  });

  test("the rank drop lands at the configured hour", () => {
    equal(rankDropAtFor("2026-09-15"), new Date(Date.UTC(2026, 8, 15, RANK_DROP_HOUR)).toISOString());
  });

  test("before the drop, today's drop is next", () => {
    const morning = Date.UTC(2026, 8, 15, 7, 30);
    equal(nextRankDropFrom(morning), rankDropAtFor("2026-09-15"));
  });

  test("after the drop, tomorrow's drop is next", () => {
    const evening = Date.UTC(2026, 8, 15, 20, 0);
    equal(nextRankDropFrom(evening), rankDropAtFor("2026-09-16"));
  });

  test("a drop exactly on the hour has already happened", () => {
    const exact = Date.UTC(2026, 8, 15, RANK_DROP_HOUR);
    isTrue(hasPassed(rankDropAtFor("2026-09-15"), exact));
    equal(nextRankDropFrom(exact), rankDropAtFor("2026-09-16"));
  });

  test("time remaining never counts backwards", () => {
    equal(msUntil(rankDropAtFor("2020-01-01")), 0);
    assert(msUntil(rankDropAtFor("2099-01-01")) > 0);
  });

  test("countdowns are zero-padded", () => {
    equal(formatCountdown(0), "00:00:00");
    equal(formatCountdown(3_600_000), "01:00:00");
    equal(formatCountdown(4 * 3_600_000 + 12 * 60_000 + 33_000), "04:12:33");
    equal(formatCountdown(-5000), "00:00:00");
  });

  test("the loose countdown drops to words near zero", () => {
    equal(formatCountdownLoose(59_000), "in a moment");
    equal(formatCountdownLoose(38 * 60_000), "38m");
    equal(formatCountdownLoose(4 * 3_600_000 + 12 * 60_000), "4h 12m");
  });

  test("day labels are relative near today", () => {
    equal(dayLabel("2026-09-15", "2026-09-15"), "Today");
    equal(dayLabel("2026-09-14", "2026-09-15"), "Yesterday");
    equal(dayLabel("2026-09-16", "2026-09-15"), "Tomorrow");
    equal(dayLabel("2026-09-01", "2026-09-15"), longDayLabel("2026-09-01"));
  });

  test("long day labels name the weekday", () => {
    equal(longDayLabel("2026-09-15"), "Tue 15 Sep");
  });

  test("seasons are numbered from the epoch", () => {
    equal(seasonIdFor(SEASON_EPOCH), "S1");
    equal(seasonIdFor(addDaysToKey(SEASON_EPOCH, 89)), "S1");
    equal(seasonIdFor(addDaysToKey(SEASON_EPOCH, 90)), "S2");
  });

  test("a season ends the day before the next one starts", () => {
    equal(seasonEndsOn(SEASON_EPOCH), addDaysToKey(SEASON_EPOCH, 89));
  });

  test("recent keys come back oldest first", () => {
    const keys = recentKeys("2026-09-15", 3);
    equal(keys.length, 3);
    equal(keys[0], "2026-09-13");
    equal(keys[2], "2026-09-15");
  });
});
