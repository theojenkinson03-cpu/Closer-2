/**
 * Identity.
 *
 * DEMO_DATA: identity is a locally generated, persisted id. That is enough to
 * keep one device's progress intact, and deliberately not enough to be a real
 * account - there is no cross-device restore and no way to prove who you are.
 *
 * The seam for real authentication is `AuthProvider`. Adding Sign in with Apple
 * (mandatory on iOS once any third-party sign-in exists) means implementing the
 * same three methods against a provider SDK and returning a server-issued id;
 * nothing above this file needs to change, because every other service already
 * takes `userId` as an argument rather than reaching for a global.
 */

import { DEMO_DISPLAY_NAME, DEMO_USER_ID } from "./config";
import { readJson, writeJson } from "./storage";

const SESSION_KEY = "auth:session";

export type AuthProvider = "anonymous" | "apple" | "google" | "email";

export interface AuthSession {
  readonly userId: string;
  readonly displayName: string;
  readonly provider: AuthProvider;
  readonly createdAt: string;
  /** Present only for real providers; anonymous sessions have no token. */
  readonly token?: string;
}

function generateUserId(): string {
  const entropy = Math.random().toString(36).slice(2, 10);
  return `local_${Date.now().toString(36)}_${entropy}`;
}

/** The current session, creating an anonymous one on first launch. */
export async function getSession(): Promise<AuthSession> {
  const stored = await readJson<AuthSession | null>(SESSION_KEY, null);
  if (stored?.userId) return stored;
  const session: AuthSession = {
    userId: generateUserId(),
    displayName: DEMO_DISPLAY_NAME,
    provider: "anonymous",
    createdAt: new Date().toISOString(),
  };
  await writeJson(SESSION_KEY, session);
  return session;
}

export async function setDisplayName(displayName: string): Promise<AuthSession> {
  const session = await getSession();
  const updated: AuthSession = { ...session, displayName: displayName.trim() || DEMO_DISPLAY_NAME };
  await writeJson(SESSION_KEY, updated);
  return updated;
}

/**
 * Not implemented in demo mode. Left as an explicit, typed failure rather than
 * a silent no-op so the gap is visible at the call site.
 */
export async function signInWith(provider: Exclude<AuthProvider, "anonymous">): Promise<never> {
  throw new Error(`Sign-in with ${provider} requires a backend. See docs/BACKEND.md.`);
}

export async function signOut(): Promise<void> {
  await writeJson(SESSION_KEY, null);
}

/** Fallback identity for code paths that run before the session resolves. */
export const FALLBACK_USER_ID = DEMO_USER_ID;
