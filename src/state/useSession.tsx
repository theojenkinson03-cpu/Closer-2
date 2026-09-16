/**
 * Session context.
 *
 * Everything below this provider takes `userId` as an argument rather than
 * reaching for a global, which is what makes swapping the anonymous local
 * identity for a real account a change to this file alone.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { getSession, setDisplayName as persistDisplayName } from "../services/authService";
import type { AuthSession } from "../services/authService";

interface SessionValue {
  readonly session: AuthSession | undefined;
  readonly userId: string | undefined;
  readonly ready: boolean;
  readonly rename: (name: string) => Promise<void>;
}

const SessionContext = createContext<SessionValue | undefined>(undefined);

export function SessionProvider({ children }: { readonly children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void getSession().then((resolved) => {
      if (!cancelled) setSession(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const rename = useCallback(async (name: string) => {
    setSession(await persistDisplayName(name));
  }, []);

  const value = useMemo<SessionValue>(
    () => ({ session, userId: session?.userId, ready: session !== undefined, rename }),
    [rename, session],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside a SessionProvider");
  return value;
}
