/**
 * Player preferences.
 *
 * Small, local, and nothing a backend needs to own. Versioning the onboarding
 * flag rather than storing a boolean means a future change to what the flow
 * teaches can show it again, to new and existing players alike, without
 * migrating anything.
 */

import { readJson, writeJson } from "./storage";

const KEY = "preferences";

/** Bump when the onboarding flow changes materially. */
export const ONBOARDING_VERSION = 1;

export interface Preferences {
  /** The onboarding version this player has completed, or 0 for none. */
  readonly onboardingSeen: number;
  /** Whether the fine-drag and keyboard hint has been dismissed. */
  readonly sliderHintSeen: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  onboardingSeen: 0,
  sliderHintSeen: false,
};

export async function getPreferences(): Promise<Preferences> {
  const stored = await readJson<Partial<Preferences>>(KEY, {});
  return { ...DEFAULT_PREFERENCES, ...stored };
}

export async function setPreferences(patch: Partial<Preferences>): Promise<Preferences> {
  const next = { ...(await getPreferences()), ...patch };
  await writeJson(KEY, next);
  return next;
}

export function needsOnboarding(preferences: Preferences): boolean {
  return preferences.onboardingSeen < ONBOARDING_VERSION;
}

export async function completeOnboarding(): Promise<Preferences> {
  return setPreferences({ onboardingSeen: ONBOARDING_VERSION });
}
