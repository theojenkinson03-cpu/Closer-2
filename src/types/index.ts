/**
 * Shared domain types for CLOSER.
 *
 * These types describe the wire shape of every service-layer call. The demo
 * services in `src/services` satisfy them in-memory today; a real backend must
 * satisfy exactly the same shapes so the UI never has to change.
 */

export type QuestionCategory =
  | "geography"
  | "history"
  | "science"
  | "culture"
  | "sport"
  | "economy"
  | "nature";

/** Where the unit label sits relative to the number. */
export type UnitPlacement = "prefix" | "suffix";

export interface Unit {
  /** Short label rendered next to the value, e.g. "km", "%", "$". */
  readonly label: string;
  readonly placement: UnitPlacement;
  /** Decimal places to render. 0 for whole numbers. */
  readonly decimals: number;
  /** Optional long form used in the reveal copy, e.g. "kilometres". */
  readonly long?: string;
  /**
   * Whether to group thousands. Years are the exception that proves the rule:
   * 1,991 is a quantity, 1991 is a date.
   */
  readonly grouped?: boolean;
}

export interface Question {
  readonly id: string;
  readonly prompt: string;
  /** Optional clarifier shown under the prompt in smaller type. */
  readonly subtitle?: string;
  readonly category: QuestionCategory;
  readonly unit: Unit;
  /** The true value. Never sent to the client by a real backend before lock-in. */
  readonly answer: number;
  /** Slider bounds. `rangeEnd` may be *smaller* than `rangeStart` (e.g. BCE years). */
  readonly rangeStart: number;
  readonly rangeEnd: number;
  /** Slider granularity. */
  readonly step: number;
  /** 1 (easiest) to 5 (hardest). Used to order a daily set. */
  readonly difficulty: 1 | 2 | 3 | 4 | 5;
  /** Shown after the reveal so players can verify the number. */
  readonly source: string;
  /** ISO date the fact was last checked. */
  readonly verifiedAt: string;
  /** ISO date this question was last served in a daily set, if ever. */
  readonly lastUsedAt?: string;
}

/** A question as the client is allowed to see it before lock-in. */
export type PublicQuestion = Omit<Question, "answer" | "lastUsedAt">;

export type ExactnessTier =
  | "BULLSEYE"
  | "PRECISE"
  | "CLOSE"
  | "NEAR"
  | "WIDE"
  | "OFF_TARGET";

export interface ScoreBreakdown {
  /** 0 - 1000. */
  readonly score: number;
  /** Signed distance from the answer, in the question's unit. */
  readonly delta: number;
  /** Absolute distance from the answer, in the question's unit. */
  readonly error: number;
  /** Absolute error divided by the slider span, clamped to 0 - 1. */
  readonly normalisedError: number;
  readonly exactness: ExactnessTier;
}

export interface AnswerRecord extends ScoreBreakdown {
  readonly questionId: string;
  readonly value: number;
  readonly answer: number;
  readonly answeredAt: string;
}

export interface DailySet {
  readonly setId: string;
  /** Game-day key, `YYYY-MM-DD` in the game timezone. */
  readonly dateKey: string;
  readonly questions: readonly Question[];
  /** ISO timestamp the set became playable. */
  readonly opensAt: string;
  /** ISO timestamp the field locks and ranks are revealed. */
  readonly rankDropAt: string;
}

export type AttemptStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "AWAITING_RANK"
  | "RANK_READY"
  | "RANK_SEEN";

export interface Attempt {
  readonly attemptId: string;
  readonly userId: string;
  readonly setId: string;
  readonly dateKey: string;
  readonly status: AttemptStatus;
  readonly answers: readonly AnswerRecord[];
  /** Index of the question the player is on. Equals answers.length while playing. */
  readonly currentIndex: number;
  readonly totalScore: number;
  readonly startedAt: string;
  readonly submittedAt?: string;
}

export type TierId =
  | "SCOUT"
  | "SEEKER"
  | "MARKSMAN"
  | "SHARPSHOOTER"
  | "MASTER"
  | "ORACLE"
  | "LEGEND"
  | "CHAMPION";

export interface Tier {
  readonly id: TierId;
  readonly name: string;
  /** 1 (SCOUT) to 8 (CHAMPION). */
  readonly order: number;
  /** Inclusive RP floor. */
  readonly floor: number;
  /** Exclusive RP ceiling. `Infinity` for CHAMPION. */
  readonly ceiling: number;
  /** Number of divisions inside the tier. CHAMPION has 1 (no divisions). */
  readonly divisions: number;
  readonly color: string;
  readonly accent: string;
}

export interface RankState {
  readonly userId: string;
  readonly rp: number;
  readonly tier: TierId;
  /** 1 is the highest division inside a tier (III -> II -> I). 0 when undivided. */
  readonly division: number;
  readonly peakRp: number;
  readonly gamesPlayed: number;
  readonly streak: number;
  readonly seasonId: string;
  /** True while a player is shielded from dropping out of a freshly-won tier. */
  readonly demotionShield: boolean;
}

export interface RankResult {
  readonly dateKey: string;
  readonly rpBefore: number;
  readonly rpAfter: number;
  readonly delta: number;
  readonly tierBefore: TierId;
  readonly tierAfter: TierId;
  readonly divisionBefore: number;
  readonly divisionAfter: number;
  readonly promoted: boolean;
  readonly demoted: boolean;
  readonly shielded: boolean;
  /** 0 - 100, where 1 means top 1%. */
  readonly percentile: number;
  readonly fieldSize: number;
  readonly fieldRank: number;
  readonly totalScore: number;
  readonly friendsPosition?: {
    readonly rank: number;
    readonly of: number;
  };
}

export interface LeaderboardEntry {
  readonly userId: string;
  readonly displayName: string;
  readonly rank: number;
  readonly totalScore: number;
  readonly rp: number;
  readonly tier: TierId;
  readonly isMe: boolean;
}

export interface Leaderboard {
  readonly dateKey: string;
  readonly fieldSize: number;
  readonly top: readonly LeaderboardEntry[];
  readonly around: readonly LeaderboardEntry[];
}

export interface DayHistoryEntry {
  readonly dateKey: string;
  readonly totalScore: number;
  readonly rpDelta: number;
  readonly rpAfter: number;
  readonly percentile: number;
}

export interface CategoryAccuracy {
  readonly category: QuestionCategory;
  readonly averageScore: number;
  readonly answered: number;
}

export interface PlayerStats {
  readonly gamesPlayed: number;
  readonly currentStreak: number;
  readonly bestStreak: number;
  readonly averageScore: number;
  readonly bestScore: number;
  readonly bullseyes: number;
  readonly exactnessCounts: Readonly<Record<ExactnessTier, number>>;
  readonly history: readonly DayHistoryEntry[];
  readonly byCategory: readonly CategoryAccuracy[];
}
