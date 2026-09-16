import { equal, suite, test } from "./harness";
import {
  EXACTNESS_EMOJI,
  exactnessLabel,
  exactnessTrace,
  formatCompact,
  formatMiss,
  formatNumber,
  formatPercentile,
  formatRp,
  formatScore,
  formatSigned,
  formatUnitValue,
  formatUnitValueCompact,
  groupDigits,
  initialsFor,
  MINUS,
  ordinal,
  pluralise,
} from "../src/core/formatting";
import type { Unit } from "../src/types";

const METRES: Unit = { label: "m", placement: "suffix", decimals: 0 };
const DOLLARS: Unit = { label: "$", placement: "prefix", decimals: 2 };
const PERCENT: Unit = { label: "%", placement: "suffix", decimals: 0 };
const BARE: Unit = { label: "", placement: "suffix", decimals: 0 };

suite("formatting", () => {
  test("digits are grouped in threes", () => {
    equal(groupDigits("1234567"), "1,234,567");
    equal(groupDigits("999"), "999");
    equal(groupDigits("1234.5"), "1,234.5");
  });

  test("numbers respect the requested decimals", () => {
    equal(formatNumber(8849), "8,849");
    equal(formatNumber(3.0499, 2), "3.05");
    equal(formatNumber(42195), "42,195");
  });

  test("negatives use a real minus sign", () => {
    equal(formatNumber(-18), `${MINUS}18`);
    equal(MINUS, "−");
  });

  test("non-finite input degrades to a dash", () => {
    equal(formatNumber(Number.NaN), "-");
    equal(formatNumber(Infinity), "-");
  });

  test("compact form kicks in above ten thousand", () => {
    equal(formatCompact(912), "912");
    equal(formatCompact(84500), "84.5K");
    equal(formatCompact(1_200_000), "1.2M");
    equal(formatCompact(3_000_000_000), "3B");
  });

  test("units sit on the correct side", () => {
    equal(formatUnitValue(8849, METRES), "8,849 m");
    equal(formatUnitValue(5.69, DOLLARS), "$5.69");
    equal(formatUnitValue(71, PERCENT), "71%", "no space before a percent sign");
    equal(formatUnitValue(1989, BARE), "1,989");
  });

  test("years are not grouped, quantities are", () => {
    const YEAR: Unit = { label: "", placement: "suffix", decimals: 0, grouped: false };
    equal(formatUnitValue(1991, YEAR), "1991");
    equal(formatUnitValue(1991, BARE), "1,991");
    equal(formatNumber(1991, 0, false), "1991");
  });

  test("a miss between two years is still a quantity", () => {
    const YEAR: Unit = { label: "", placement: "suffix", decimals: 0, grouped: false };
    equal(formatMiss(1200, YEAR), "1,200 over", "the gap is a count of years, not a date");
  });

  test("an ungrouped unit is never compacted", () => {
    const BCE: Unit = { label: "BCE", placement: "suffix", decimals: 0, grouped: false };
    equal(formatUnitValueCompact(2560, BCE), "2560 BCE");
  });

  test("compact units keep their placement", () => {
    equal(formatUnitValueCompact(384400, METRES), "384.4K m");
    equal(formatUnitValueCompact(1_000_000, DOLLARS), "$1M");
  });

  test("signed values always carry their sign", () => {
    equal(formatSigned(24), "+24");
    equal(formatSigned(-18), `${MINUS}18`);
    equal(formatSigned(0), "0");
  });

  test("rp and scores read as whole numbers", () => {
    equal(formatRp(1284.6), "1,285 RP");
    equal(formatScore(6821.4), "6,821");
  });

  test("percentiles never round to zero", () => {
    equal(formatPercentile(4), "Top 4%");
    equal(formatPercentile(0.2), "Top 1%");
    equal(formatPercentile(140), "Top 100%");
  });

  test("ordinals handle the teens", () => {
    equal(ordinal(1), "1st");
    equal(ordinal(2), "2nd");
    equal(ordinal(3), "3rd");
    equal(ordinal(4), "4th");
    equal(ordinal(11), "11th");
    equal(ordinal(12), "12th");
    equal(ordinal(13), "13th");
    equal(ordinal(21), "21st");
    equal(ordinal(1042), "1,042nd");
  });

  test("exactness labels are display-ready", () => {
    equal(exactnessLabel("BULLSEYE"), "BULLSEYE");
    equal(exactnessLabel("OFF_TARGET"), "OFF TARGET", "the underscore never reaches a screen");
  });

  test("plurals agree with their count", () => {
    equal(pluralise(1, "day"), "1 day");
    equal(pluralise(3, "day"), "3 days");
    equal(pluralise(2, "bullseye"), "2 bullseyes");
  });

  test("a miss names its direction", () => {
    equal(formatMiss(0, METRES), "Exact");
    equal(formatMiss(12, METRES), "12 m over");
    equal(formatMiss(-12, METRES), "12 m under");
  });

  test("initials come from one or two names", () => {
    equal(initialsFor("Mira Stone"), "MS");
    equal(initialsFor("Bo"), "BO");
    equal(initialsFor("   "), "?");
  });

  test("the share trace is one emoji per answer", () => {
    const trace = exactnessTrace(["BULLSEYE", "CLOSE", "OFF_TARGET"]);
    equal(trace, `${EXACTNESS_EMOJI.BULLSEYE}${EXACTNESS_EMOJI.CLOSE}${EXACTNESS_EMOJI.OFF_TARGET}`);
    equal(exactnessTrace([]), "");
  });
});
