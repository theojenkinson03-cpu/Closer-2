import { assert, equal, suite, test } from "./harness";
import { buildShareText, SHARE_URL } from "../src/core/share";
import { EXACTNESS_EMOJI } from "../src/core/formatting";

const BASE = {
  dateKey: "2026-09-15",
  totalScore: 5412,
  exactness: ["BULLSEYE", "CLOSE", "NEAR", "WIDE", "PRECISE", "BULLSEYE", "OFF_TARGET"] as const,
};

suite("share card", () => {
  test("the card names the day and the score", () => {
    const lines = buildShareText(BASE).split("\n");
    equal(lines[0], "CLOSER · Tue 15 Sep");
    equal(lines[2], "5,412 / 7,000");
  });

  test("the trace is one emoji per answer", () => {
    const lines = buildShareText(BASE).split("\n");
    equal(lines[1]?.startsWith(EXACTNESS_EMOJI.BULLSEYE), true);
    equal([...(lines[1] ?? "")].length >= BASE.exactness.length, true);
  });

  test("the card never leaks a question or an answer", () => {
    const text = buildShareText({
      ...BASE,
      percentile: 12,
      rankLabel: "Marksman II",
      rpDelta: 24,
    });
    assert(!/\d{3,}\s?(m|km|%)/.test(text), "no measurements should appear");
    assert(!text.includes("Everest"), "no prompt text should appear");
  });

  test("the field position only appears once the rank has dropped", () => {
    assert(!buildShareText(BASE).includes("Top"));
    assert(buildShareText({ ...BASE, percentile: 12 }).includes("Top 12%"));
  });

  test("rank and rp ride together when both are known", () => {
    const text = buildShareText({ ...BASE, rankLabel: "Marksman II", rpDelta: -18 });
    assert(text.includes("Marksman II · −18 RP"));
  });

  test("a rank with no delta still shows", () => {
    assert(buildShareText({ ...BASE, rankLabel: "Scout III" }).includes("Scout III"));
  });

  test("a streak is only worth mentioning past one day", () => {
    assert(!buildShareText({ ...BASE, streak: 1 }).includes("streak"));
    assert(buildShareText({ ...BASE, streak: 9 }).includes("9 day streak"));
  });

  test("the card ends with the link", () => {
    assert(buildShareText(BASE).endsWith(SHARE_URL));
  });

  test("an empty day still produces a valid card", () => {
    const text = buildShareText({ dateKey: "2026-09-15", totalScore: 0, exactness: [] });
    equal(text.split("\n").length, 3);
  });
});
