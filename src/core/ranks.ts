/**
 * Rank engine. Pure functions, no I/O.
 *
 * RP moves the way a chess rating moves: you are not paid for your raw score,
 * you are paid for beating the field you were *expected* to beat. A 6,100 on an
 * easy day when everyone scored 6,000 is worth less than a 5,200 on a day the
 * field averaged 4,400. Without that normalisation an expanding player base
 * quietly inflates everyone's rating, and a ladder that only goes up is not a
 * ladder.
 *
 * The K-factor decays in three phases so new players find their true level in a
 * week rather than a season, while established players sit on a stable number.
 */

import type { RankState, Tier, TierId } from "../types";
import { clamp } from "./scoring";

export const TIERS: readonly Tier[] = [
  { id: "SCOUT", name: "Scout", order: 1, floor: 0, ceiling: 600, divisions: 3, color: "#6E8CA6", accent: "#A8BECF" },
  { id: "SEEKER", name: "Seeker", order: 2, floor: 600, ceiling: 1200, divisions: 3, color: "#4DA2C9", accent: "#9FD8EE" },
  { id: "MARKSMAN", name: "Marksman", order: 3, floor: 1200, ceiling: 1800, divisions: 3, color: "#4DD8A4", accent: "#B3F4DC" },
  { id: "SHARPSHOOTER", name: "Sharpshooter", order: 4, floor: 1800, ceiling: 2400, divisions: 3, color: "#E8C26A", accent: "#F8E7B8" },
  { id: "MASTER", name: "Master", order: 5, floor: 2400, ceiling: 3000, divisions: 3, color: "#F5B33C", accent: "#FFD98A" },
  { id: "ORACLE", name: "Oracle", order: 6, floor: 3000, ceiling: 3600, divisions: 3, color: "#8E7BEF", accent: "#C9BFFA" },
  { id: "LEGEND", name: "Legend", order: 7, floor: 3600, ceiling: 4200, divisions: 3, color: "#E5484D", accent: "#FCA6A8" },
  { id: "CHAMPION", name: "Champion", order: 8, floor: 4200, ceiling: Infinity, divisions: 1, color: "#F4F7FA", accent: "#E8C26A" },
];

export const TIER_BY_ID: Readonly<Record<TierId, Tier>> = Object.fromEntries(
  TIERS.map((tier) => [tier.id, tier]),
) as Record<TierId, Tier>;

export const STARTING_RP = 250;
export const PROVISIONAL_GAMES = 5;
export const LEARNING_GAMES = 20;
export const K_PROVISIONAL = 80;
export const K_LEARNING = 48;
export const K_STABLE = 32;
/** Hard safety rail so no single day can swing a rating wildly. */
export const MAX_DAILY_SWING = 120;
/** Roman numerals for divisions, highest division first. */
export const DIVISION_NUMERALS = ["I", "II", "III", "IV", "V"] as const;

export function tierForRp(rp: number): Tier {
  const bounded = Math.max(0, rp);
  for (let i = TIERS.length - 1; i >= 0; i -= 1) {
    const tier = TIERS[i]!;
    if (bounded >= tier.floor) return tier;
  }
  return TIERS[0]!;
}

/**
 * Division inside a tier. 1 is the top division (one promotion away), counting
 * upwards as you go down. Undivided tiers return 0.
 */
export function divisionForRp(rp: number): number {
  const tier = tierForRp(rp);
  if (tier.divisions <= 1) return 0;
  const width = (tier.ceiling - tier.floor) / tier.divisions;
  const stepsIn = Math.floor((Math.max(0, rp) - tier.floor) / width);
  const index = clamp(stepsIn, 0, tier.divisions - 1);
  return tier.divisions - index;
}

/** "Marksman II", or "Champion" for the undivided top tier. */
export function rankLabel(rp: number): string {
  const tier = tierForRp(rp);
  const division = divisionForRp(rp);
  if (division === 0) return tier.name;
  return `${tier.name} ${DIVISION_NUMERALS[division - 1] ?? String(division)}`;
}

/** 0 - 1 progress through the current tier. CHAMPION reports progress to 6000. */
export function progressInTier(rp: number): number {
  const tier = tierForRp(rp);
  const ceiling = Number.isFinite(tier.ceiling) ? tier.ceiling : 6000;
  const span = ceiling - tier.floor;
  if (span <= 0) return 1;
  return clamp((Math.max(0, rp) - tier.floor) / span, 0, 1);
}

/** RP still needed for the next tier. 0 once a player is CHAMPION. */
export function rpToNextTier(rp: number): number {
  const tier = tierForRp(rp);
  if (!Number.isFinite(tier.ceiling)) return 0;
  return Math.max(0, Math.ceil(tier.ceiling - Math.max(0, rp)));
}

export function nextTier(tierId: TierId): Tier | undefined {
  const current = TIER_BY_ID[tierId];
  return TIERS.find((tier) => tier.order === current.order + 1);
}

export function kFactorFor(gamesPlayed: number): number {
  if (gamesPlayed < PROVISIONAL_GAMES) return K_PROVISIONAL;
  if (gamesPlayed < LEARNING_GAMES) return K_LEARNING;
  return K_STABLE;
}

/** Standard Elo expectation of `rp` scoring above `opponentRp`. */
export function expectedScore(rp: number, opponentRp: number): number {
  return 1 / (1 + Math.pow(10, (opponentRp - rp) / 400));
}

/** Mean expectation against a sampled slice of the day's field. */
export function expectedAgainstField(rp: number, field: readonly number[]): number {
  if (field.length === 0) return 0.5;
  const sum = field.reduce((acc, opponentRp) => acc + expectedScore(rp, opponentRp), 0);
  return sum / field.length;
}

/**
 * Performance in 0 - 1 from a finishing position. Beating everyone is 1,
 * finishing last is 0, and a field of one is a draw.
 */
export function actualFromPlacement(fieldRank: number, fieldSize: number): number {
  if (fieldSize <= 1) return 0.5;
  const bounded = clamp(fieldRank, 1, fieldSize);
  return (fieldSize - bounded) / (fieldSize - 1);
}

/** "Top 4%" as a number. A winner is 1, the last player is 100. */
export function percentileFromPlacement(fieldRank: number, fieldSize: number): number {
  if (fieldSize <= 0) return 100;
  const bounded = clamp(fieldRank, 1, fieldSize);
  return clamp(Math.ceil((bounded / fieldSize) * 100), 1, 100);
}

export interface RankDeltaInput {
  readonly rp: number;
  readonly gamesPlayed: number;
  /** Performance in 0 - 1, usually from `actualFromPlacement`. */
  readonly actual: number;
  /** RP of a sampled slice of the players who answered the same set. */
  readonly field: readonly number[];
}

/** Signed RP change for one day. */
export function rankDelta(input: RankDeltaInput): number {
  const expected = expectedAgainstField(input.rp, input.field);
  const k = kFactorFor(input.gamesPlayed);
  const raw = k * (clamp(input.actual, 0, 1) - expected);
  return clamp(Math.round(raw), -MAX_DAILY_SWING, MAX_DAILY_SWING);
}

export interface AppliedRank {
  readonly state: RankState;
  readonly rpBefore: number;
  readonly rpAfter: number;
  readonly delta: number;
  readonly tierBefore: TierId;
  readonly tierAfter: TierId;
  readonly divisionBefore: number;
  readonly divisionAfter: number;
  readonly promoted: boolean;
  readonly demoted: boolean;
  /** True when a demotion was absorbed by the shield earned on promotion. */
  readonly shielded: boolean;
}

/**
 * Apply a delta to a rank state.
 *
 * Promotion grants a one-day shield: the first day that would knock a player
 * back out of a tier they just reached is clamped to the tier floor instead.
 * It costs the ladder nothing in the long run and removes the demoralising
 * promote/demote flicker that makes ranked systems feel arbitrary.
 */
export function applyRankDelta(
  state: RankState,
  delta: number,
  options: { readonly playedPreviousDay?: boolean } = {},
): AppliedRank {
  const rpBefore = Math.max(0, state.rp);
  const tierBefore = tierForRp(rpBefore);
  const divisionBefore = divisionForRp(rpBefore);

  let rpAfter = Math.max(0, rpBefore + delta);
  let shielded = false;

  if (rpAfter < tierBefore.floor && state.demotionShield) {
    rpAfter = tierBefore.floor;
    shielded = true;
  }

  const tierAfter = tierForRp(rpAfter);
  const promoted = tierAfter.order > tierBefore.order;
  const demoted = tierAfter.order < tierBefore.order;
  const streak = options.playedPreviousDay === false ? 1 : state.streak + 1;

  return {
    state: {
      ...state,
      rp: rpAfter,
      tier: tierAfter.id,
      division: divisionForRp(rpAfter),
      peakRp: Math.max(state.peakRp, rpAfter),
      gamesPlayed: state.gamesPlayed + 1,
      streak,
      // Earn a shield on promotion, spend it on the day it saves you.
      demotionShield: promoted ? true : shielded ? false : state.demotionShield,
    },
    rpBefore,
    rpAfter,
    delta: rpAfter - rpBefore,
    tierBefore: tierBefore.id,
    tierAfter: tierAfter.id,
    divisionBefore,
    divisionAfter: divisionForRp(rpAfter),
    promoted,
    demoted,
    shielded,
  };
}

export function createRankState(userId: string, seasonId: string): RankState {
  const tier = tierForRp(STARTING_RP);
  return {
    userId,
    rp: STARTING_RP,
    tier: tier.id,
    division: divisionForRp(STARTING_RP),
    peakRp: STARTING_RP,
    gamesPlayed: 0,
    streak: 0,
    seasonId,
    demotionShield: false,
  };
}

/** Soft reset between seasons: pull everyone back towards the middle. */
export function seasonReset(state: RankState, seasonId: string): RankState {
  const rp = Math.round(STARTING_RP + (state.rp - STARTING_RP) * 0.6);
  const tier = tierForRp(rp);
  return {
    ...state,
    rp,
    tier: tier.id,
    division: divisionForRp(rp),
    peakRp: rp,
    gamesPlayed: 0,
    streak: 0,
    seasonId,
    demotionShield: false,
  };
}
