/**
 * Number and label formatting. Pure functions, no I/O.
 *
 * Every number a player sees goes through here so that a value reads the same
 * on the slider, in the reveal, and on the share card.
 */

import type { ExactnessTier, Unit } from "../types";
import { EXACTNESS_LABELS } from "./scoring";

/** Real minus sign, not a hyphen. Used everywhere a negative is displayed. */
export const MINUS = "−";

export function groupDigits(value: string): string {
  const [whole = "", fraction] = value.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction ? `${grouped}.${fraction}` : grouped;
}

export function formatNumber(value: number, decimals = 0, grouped = true): string {
  if (!Number.isFinite(value)) return "-";
  const fixed = Math.abs(value).toFixed(Math.max(0, decimals));
  const body = grouped ? groupDigits(fixed) : fixed;
  return value < 0 ? `${MINUS}${body}` : body;
}

/** "1.2M", "84.5K", "912". Used where space is tight, never on the slider. */
export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? MINUS : "";
  if (abs >= 1_000_000_000) return `${sign}${trimZero(abs / 1_000_000_000)}B`;
  if (abs >= 1_000_000) return `${sign}${trimZero(abs / 1_000_000)}M`;
  if (abs >= 10_000) return `${sign}${trimZero(abs / 1_000)}K`;
  return formatNumber(value, 0);
}

function trimZero(value: number): string {
  const fixed = value.toFixed(1);
  return fixed.endsWith(".0") ? fixed.slice(0, -2) : fixed;
}

/** A value with its unit attached: "$4.2", "8,849 m", "62%". */
export function formatUnitValue(value: number, unit: Unit): string {
  const body = formatNumber(value, unit.decimals, unit.grouped !== false);
  if (unit.label === "") return body;
  if (unit.placement === "prefix") return `${unit.label}${body}`;
  return unit.label === "%" ? `${body}${unit.label}` : `${body} ${unit.label}`;
}

/** Same as `formatUnitValue` but compacted, for tick marks and chips. */
export function formatUnitValueCompact(value: number, unit: Unit): string {
  const body = unit.grouped === false ? formatNumber(value, unit.decimals, false) : formatCompact(value);
  if (unit.label === "") return body;
  if (unit.placement === "prefix") return `${unit.label}${body}`;
  return unit.label === "%" ? `${body}${unit.label}` : `${body} ${unit.label}`;
}

/** "+24" / "−18" / "0". */
export function formatSigned(value: number): string {
  if (value === 0) return "0";
  return value > 0 ? `+${formatNumber(value)}` : `${MINUS}${formatNumber(Math.abs(value))}`;
}

export function formatRp(value: number): string {
  return `${formatNumber(Math.round(value))} RP`;
}

export function formatScore(value: number): string {
  return formatNumber(Math.round(value));
}

/** "Top 4%" - or "Top 1%" for anything that rounds below one. */
export function formatPercentile(percentile: number): string {
  const bounded = Math.min(100, Math.max(1, Math.round(percentile)));
  return `Top ${bounded}%`;
}

export function ordinal(value: number): string {
  const n = Math.abs(Math.round(value));
  const lastTwo = n % 100;
  const last = n % 10;
  const suffix =
    lastTwo >= 11 && lastTwo <= 13 ? "th" : last === 1 ? "st" : last === 2 ? "nd" : last === 3 ? "rd" : "th";
  return `${formatNumber(value)}${suffix}`;
}

export function exactnessLabel(tier: ExactnessTier): string {
  return EXACTNESS_LABELS[tier];
}

/** "3 days" / "1 day". */
export function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return `${formatNumber(count)} ${Math.abs(count) === 1 ? singular : plural}`;
}

/** How far off a guess was, phrased for the reveal. */
export function formatMiss(delta: number, unit: Unit): string {
  if (delta === 0) return "Exact";
  const direction = delta > 0 ? "over" : "under";
  // A miss is a quantity even when the values either side of it are years.
  const magnitude = formatUnitValue(Math.abs(delta), { ...unit, grouped: true });
  return `${magnitude} ${direction}`;
}

export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return (parts[0] ?? "").slice(0, 2).toUpperCase();
  return `${(parts[0] ?? "")[0] ?? ""}${(parts[1] ?? "")[0] ?? ""}`.toUpperCase();
}

/** Emoji trace of a day's exactness tiers, for the share card. */
export const EXACTNESS_EMOJI: Readonly<Record<ExactnessTier, string>> = {
  BULLSEYE: "\u{1F534}",
  PRECISE: "\u{1F7E0}",
  CLOSE: "\u{1F7E2}",
  NEAR: "\u{1F535}",
  WIDE: "⚪",
  OFF_TARGET: "⬛",
};

export function exactnessTrace(tiers: readonly ExactnessTier[]): string {
  return tiers.map((tier) => EXACTNESS_EMOJI[tier]).join("");
}
