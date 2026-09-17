/**
 * Local notifications for the rank drop.
 *
 * The rank drop is the product's second daily touchpoint, and a touchpoint
 * nobody is told about does not exist. Until a server can push, the reveal is
 * scheduled locally the moment a player finishes their set: the time is already
 * known (`rankDropAt`), so the notification does not need a backend to be
 * correct - only to be resilient if the player never reopens the app.
 *
 * expo-notifications is loaded lazily inside try/catch so that this module is
 * safe to import on web and under the Node test runner, where the native module
 * does not exist.
 */

import { dayLabel, hasPassed, rankDropAtFor } from "../core/dates";
import { readJson, writeJson } from "./storage";

const SCHEDULE_KEY = "notifications:rankDrop";

type ScheduleRecord = Record<string, string>;

interface NotificationsModule {
  setNotificationHandler(handler: unknown): void;
  getPermissionsAsync(): Promise<{ status: string; canAskAgain: boolean }>;
  requestPermissionsAsync(): Promise<{ status: string }>;
  scheduleNotificationAsync(request: unknown): Promise<string>;
  cancelScheduledNotificationAsync(id: string): Promise<void>;
  setNotificationChannelAsync?(id: string, channel: unknown): Promise<unknown>;
  AndroidImportance?: Record<string, number>;
  SchedulableTriggerInputTypes?: Record<string, string>;
}

let cached: NotificationsModule | null | undefined;

function loadModule(): NotificationsModule | null {
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    cached = require("expo-notifications") as NotificationsModule;
  } catch {
    cached = null;
  }
  return cached;
}

/** True when notifications can actually be delivered on this platform. */
export function notificationsAvailable(): boolean {
  return loadModule() !== null;
}

/** Called once at startup. Safe to call repeatedly. */
export function configureNotifications(): void {
  const mod = loadModule();
  if (!mod) return;
  mod.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: true,
    }),
  });
  void mod.setNotificationChannelAsync?.("rank-drop", {
    name: "Rank drop",
    importance: mod.AndroidImportance?.HIGH ?? 4,
    vibrationPattern: [0, 180, 90, 180],
    lightColor: "#E5484D",
  });
}

export type PermissionState = "granted" | "denied" | "unavailable";

export async function getPermissionState(): Promise<PermissionState> {
  const mod = loadModule();
  if (!mod) return "unavailable";
  try {
    const current = await mod.getPermissionsAsync();
    return current.status === "granted" ? "granted" : "denied";
  } catch {
    return "unavailable";
  }
}

/** Asks only if the player has not already answered. */
export async function requestPermission(): Promise<PermissionState> {
  const mod = loadModule();
  if (!mod) return "unavailable";
  try {
    const current = await mod.getPermissionsAsync();
    if (current.status === "granted") return "granted";
    if (!current.canAskAgain) return "denied";
    const next = await mod.requestPermissionsAsync();
    return next.status === "granted" ? "granted" : "denied";
  } catch {
    return "unavailable";
  }
}

/**
 * Schedule the reveal for a given game day. Idempotent: the identifier is
 * remembered so re-entering the app does not stack duplicate notifications.
 */
export async function scheduleRankDrop(dateKey: string): Promise<string | undefined> {
  const mod = loadModule();
  if (!mod) return undefined;

  const dropAt = rankDropAtFor(dateKey);
  if (hasPassed(dropAt)) return undefined;

  const scheduled = await readJson<ScheduleRecord>(SCHEDULE_KEY, {});
  if (scheduled[dateKey]) return scheduled[dateKey];

  const permission = await getPermissionState();
  if (permission !== "granted") return undefined;

  try {
    const identifier = await mod.scheduleNotificationAsync({
      content: {
        title: "The field is locked",
        body: `${dayLabel(dateKey)}'s rank drop is in. See where you finished.`,
        data: { dateKey, type: "rank-drop" },
      },
      trigger: {
        type: mod.SchedulableTriggerInputTypes?.DATE ?? "date",
        date: new Date(dropAt),
        channelId: "rank-drop",
      },
    });
    await writeJson(SCHEDULE_KEY, { ...scheduled, [dateKey]: identifier });
    return identifier;
  } catch {
    return undefined;
  }
}

export async function cancelRankDrop(dateKey: string): Promise<void> {
  const mod = loadModule();
  const scheduled = await readJson<ScheduleRecord>(SCHEDULE_KEY, {});
  const identifier = scheduled[dateKey];
  if (!identifier) return;
  try {
    await mod?.cancelScheduledNotificationAsync(identifier);
  } catch {
    // The OS may have already delivered or dropped it.
  }
  const { [dateKey]: _removed, ...rest } = scheduled;
  await writeJson(SCHEDULE_KEY, rest);
}
