/**
 * The share card.
 *
 * Wordle's real invention was not the game, it was a result you could paste
 * anywhere without spoiling anything. CLOSER's trace does the same job: the
 * emoji describe how close each of the seven answers landed, and give away
 * nothing about what the questions were.
 *
 * Pure string building, so it can be tested and reused by any surface - a
 * share sheet today, an image card later.
 */

import { longDayLabel } from "./dates";
import { exactnessTrace, formatNumber, formatPercentile, formatSigned } from "./formatting";
import { MAX_DAILY_SCORE } from "./scoring";
import type { ExactnessTier } from "../types";

export const SHARE_URL = "https://closer.game";

export interface ShareCardInput {
  readonly dateKey: string;
  readonly totalScore: number;
  readonly exactness: readonly ExactnessTier[];
  /** Omitted before the rank drop - there is no field position to claim yet. */
  readonly percentile?: number;
  readonly rankLabel?: string;
  readonly rpDelta?: number;
  readonly streak?: number;
}

export function buildShareText(input: ShareCardInput): string {
  const lines: string[] = [`CLOSER · ${longDayLabel(input.dateKey)}`];

  if (input.exactness.length > 0) {
    lines.push(exactnessTrace(input.exactness));
  }

  const score = `${formatNumber(input.totalScore)} / ${formatNumber(MAX_DAILY_SCORE)}`;
  lines.push(
    input.percentile === undefined ? score : `${score} · ${formatPercentile(input.percentile)}`,
  );

  if (input.rankLabel) {
    lines.push(
      input.rpDelta === undefined
        ? input.rankLabel
        : `${input.rankLabel} · ${formatSigned(input.rpDelta)} RP`,
    );
  }

  if (input.streak && input.streak > 1) {
    lines.push(`${formatNumber(input.streak)} day streak`);
  }

  lines.push(SHARE_URL);
  return lines.join("\n");
}
