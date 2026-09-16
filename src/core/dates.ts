/**
 * Game-day arithmetic. Pure functions, no I/O.
 *
 * Everything is computed in a single fixed game timezone (UTC) rather than the
 * device's locale. A global daily competition only works if every player's
 * "today" is the same today, and if the field locks for everyone at the same
 * instant. Local-midnight rollovers would hand players in one timezone an extra
 * set, or two chances at the same one.
 */

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

/** Offset of the game timezone from UTC, in minutes. */
export const GAME_TZ_OFFSET_MINUTES = 0;

/** Hour (game timezone) the field locks and everyone's rank is revealed. */
export const RANK_DROP_HOUR = 12;

/** Hour (game timezone) a new set becomes playable. */
export const SET_OPEN_HOUR = 0;

/** First day of ranked play, used to number seasons. */
export const SEASON_EPOCH = "2026-01-05";
export const SEASON_LENGTH_DAYS = 90;

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

function toMs(input: Date | number | string): number {
  if (typeof input === "number") return input;
  if (typeof input === "string") return new Date(input).getTime();
  return input.getTime();
}

function pad(value: number, width = 2): string {
  return String(Math.abs(Math.trunc(value))).padStart(width, "0");
}

/** `YYYY-MM-DD` for the game day an instant falls in. */
export function dateKeyFor(input: Date | number | string = Date.now()): string {
  const shifted = new Date(toMs(input) + GAME_TZ_OFFSET_MINUTES * MS_PER_MINUTE);
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

export function isValidDateKey(key: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const ms = parseDateKey(key);
  return Number.isFinite(ms) && dateKeyFor(ms) === key;
}

/** Epoch ms of midnight (game timezone) on a date key. */
export function parseDateKey(key: string): number {
  const [year, month, day] = key.split("-").map(Number);
  if (!year || !month || !day) return Number.NaN;
  return Date.UTC(year, month - 1, day) - GAME_TZ_OFFSET_MINUTES * MS_PER_MINUTE;
}

export function addDaysToKey(key: string, days: number): string {
  return dateKeyFor(parseDateKey(key) + days * MS_PER_DAY);
}

/** Whole game days from `from` to `to`. Negative when `to` is earlier. */
export function daysBetweenKeys(from: string, to: string): number {
  return Math.round((parseDateKey(to) - parseDateKey(from)) / MS_PER_DAY);
}

export function compareDateKeys(a: string, b: string): number {
  return a === b ? 0 : a < b ? -1 : 1;
}

export function isConsecutiveDay(previousKey: string, key: string): boolean {
  return daysBetweenKeys(previousKey, key) === 1;
}

/** ISO timestamp a set opens. */
export function setOpensAt(key: string): string {
  return new Date(parseDateKey(key) + SET_OPEN_HOUR * MS_PER_HOUR).toISOString();
}

/** ISO timestamp the field locks for a given game day. */
export function rankDropAtFor(key: string): string {
  return new Date(parseDateKey(key) + RANK_DROP_HOUR * MS_PER_HOUR).toISOString();
}

/**
 * The next rank drop from an instant. A player who finishes after today's drop
 * has already missed it, so their result lands at tomorrow's.
 */
export function nextRankDropFrom(now: Date | number = Date.now()): string {
  const nowMs = toMs(now);
  const todayKey = dateKeyFor(nowMs);
  const todayDrop = rankDropAtFor(todayKey);
  if (toMs(todayDrop) > nowMs) return todayDrop;
  return rankDropAtFor(addDaysToKey(todayKey, 1));
}

export function msUntil(iso: string, now: Date | number = Date.now()): number {
  return Math.max(0, toMs(iso) - toMs(now));
}

export function hasPassed(iso: string, now: Date | number = Date.now()): boolean {
  return toMs(now) >= toMs(iso);
}

/** `HH:MM:SS` remaining. Clamps at zero rather than counting backwards. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/** Loose countdown for supporting copy: "4h 12m", "38m", "in a moment". */
export function formatCountdownLoose(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  if (total < 60) return "in a moment";
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${pad(minutes)}m`;
}

/** "Today", "Yesterday", or "Mon 14 Sep". */
export function dayLabel(key: string, todayKey: string = dateKeyFor()): string {
  const diff = daysBetweenKeys(key, todayKey);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff === -1) return "Tomorrow";
  return longDayLabel(key);
}

/** "Mon 14 Sep". */
export function longDayLabel(key: string): string {
  const ms = parseDateKey(key);
  const date = new Date(ms + GAME_TZ_OFFSET_MINUTES * MS_PER_MINUTE);
  const weekday = WEEKDAY_LABELS[date.getUTCDay()] ?? "";
  const month = MONTH_LABELS[date.getUTCMonth()] ?? "";
  return `${weekday} ${date.getUTCDate()} ${month}`;
}

/** "SEASON 3" numbering from the ranked epoch. */
export function seasonIdFor(key: string): string {
  const elapsed = daysBetweenKeys(SEASON_EPOCH, key);
  const index = Math.floor(Math.max(0, elapsed) / SEASON_LENGTH_DAYS) + 1;
  return `S${index}`;
}

export function seasonEndsOn(key: string): string {
  const elapsed = Math.max(0, daysBetweenKeys(SEASON_EPOCH, key));
  const index = Math.floor(elapsed / SEASON_LENGTH_DAYS);
  return addDaysToKey(SEASON_EPOCH, (index + 1) * SEASON_LENGTH_DAYS - 1);
}

/** Last N date keys ending at `key`, oldest first. */
export function recentKeys(key: string, count: number): string[] {
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) keys.push(addDaysToKey(key, -i));
  return keys;
}
