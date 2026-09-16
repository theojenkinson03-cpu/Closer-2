/**
 * The daily state machine.
 *
 * A player's day is a sequence of server-side facts, not a navigation history:
 *
 *   NOT_STARTED -> IN_PROGRESS -> SUBMITTED -> AWAITING_RANK -> RANK_READY -> RANK_SEEN
 *
 * Which screen shows is a pure function of that phase, which is why there is no
 * router here. It also means the app cannot be put into an impossible state by
 * a back gesture, a deep link, or a cold start halfway through a set: the phase
 * is rebuilt from the stored attempt every time the app opens.
 *
 * Three things force a re-derivation: mount, returning to the foreground (the
 * game day may have rolled over while the app was away), and the rank-drop
 * countdown reaching zero.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";

import { dateKeyFor, isConsecutiveDay } from "../core/dates";
import type { AnswerRecord, Attempt, DailySet, Question, RankResult, RankState } from "../types";
import { getAttempt, lockAnswer, setAttemptStatus, startAttempt } from "../services/attemptService";
import { getDailySet } from "../services/dailyService";
import { getRankState, isRankDropReady, markRankSeen, processRankDrop } from "../services/rankService";
import { requestPermission, scheduleRankDrop } from "../services/notifications";

export type DailyPhase =
  | "LOADING"
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "AWAITING_RANK"
  | "RANK_READY"
  | "RANK_SEEN";

interface DailyValue {
  readonly phase: DailyPhase;
  readonly dateKey: string;
  readonly set: DailySet | undefined;
  readonly attempt: Attempt | undefined;
  readonly rankState: RankState | undefined;
  readonly rankResult: RankResult | undefined;
  readonly question: Question | undefined;
  readonly answers: readonly AnswerRecord[];
  readonly lastAnswer: AnswerRecord | undefined;
  readonly busy: boolean;
  readonly error: string | undefined;
  readonly start: () => Promise<void>;
  readonly lock: (value: number) => Promise<AnswerRecord | undefined>;
  readonly acknowledgeSubmission: () => Promise<void>;
  readonly openRankDrop: () => Promise<RankResult | undefined>;
  readonly seeRank: () => Promise<void>;
  readonly refresh: () => Promise<void>;
}

const DailyContext = createContext<DailyValue | undefined>(undefined);

function phaseFor(attempt: Attempt | undefined, result: RankResult | undefined): DailyPhase {
  if (!attempt) return "NOT_STARTED";
  switch (attempt.status) {
    case "IN_PROGRESS":
      return "IN_PROGRESS";
    case "SUBMITTED":
      return "SUBMITTED";
    case "AWAITING_RANK":
      return result ? "RANK_READY" : "AWAITING_RANK";
    case "RANK_READY":
      return "RANK_READY";
    case "RANK_SEEN":
      return "RANK_SEEN";
    default:
      return "NOT_STARTED";
  }
}

export function DailyProvider({
  userId,
  children,
}: {
  readonly userId: string | undefined;
  readonly children: React.ReactNode;
}) {
  const [dateKey, setDateKey] = useState(() => dateKeyFor());
  const [set, setSet] = useState<DailySet | undefined>(undefined);
  const [attempt, setAttempt] = useState<Attempt | undefined>(undefined);
  const [rankState, setRankState] = useState<RankState | undefined>(undefined);
  const [rankResult, setRankResult] = useState<RankResult | undefined>(undefined);
  const [phase, setPhase] = useState<DailyPhase>("LOADING");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const lastAnswer = useRef<AnswerRecord | undefined>(undefined);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const key = dateKeyFor();
    setDateKey(key);
    try {
      const [dailySet, storedAttempt, state] = await Promise.all([
        getDailySet(key),
        getAttempt(userId, key),
        getRankState(userId, key),
      ]);
      setSet(dailySet);
      setRankState(state);

      // A result may have become available while the app was closed.
      let result = await processRankDrop(userId, key);
      let current = storedAttempt;
      if (result) current = await getAttempt(userId, key);

      // Yesterday's drop is also worth surfacing on open, so a player who
      // missed the notification still sees what the day was worth.
      if (!result && current?.status === "AWAITING_RANK" && isRankDropReady(key)) {
        result = await processRankDrop(userId, key);
        if (result) current = await getAttempt(userId, key);
      }

      setAttempt(current);
      setRankResult(result ?? undefined);
      // Read after the drop, not before: processing it moves the rating.
      if (result) setRankState(await getRankState(userId, key));
      setPhase(phaseFor(current, result ?? undefined));
      setError(undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
      setPhase((previous) => (previous === "LOADING" ? "NOT_STARTED" : previous));
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Returning to the foreground can mean a new game day, or a drop that landed
  // while the app was away.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (status) => {
      if (status !== "active") return;
      const key = dateKeyFor();
      if (key !== dateKey || isRankDropReady(dateKey)) void refresh();
    });
    return () => subscription.remove();
  }, [dateKey, refresh]);

  const start = useCallback(async () => {
    if (!userId) return;
    setBusy(true);
    try {
      const started = await startAttempt(userId, dateKey);
      setAttempt(started);
      setPhase("IN_PROGRESS");
      setError(undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not start today's set.");
    } finally {
      setBusy(false);
    }
  }, [dateKey, userId]);

  const lock = useCallback(
    async (value: number) => {
      if (!userId || !set) return undefined;
      const index = attempt?.currentIndex ?? 0;
      const question = set.questions[index];
      if (!question) return undefined;

      setBusy(true);
      try {
        const outcome = await lockAnswer(userId, dateKey, question.id, value);
        lastAnswer.current = outcome.answer;
        setAttempt(outcome.attempt);
        setError(undefined);
        if (outcome.completed) {
          setPhase("SUBMITTED");
          // The reveal time is already known, so the reminder does not need a
          // server - only the player's permission.
          void requestPermission().then((permission) => {
            if (permission === "granted") void scheduleRankDrop(dateKey);
          });
        }
        return outcome.answer;
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not lock that answer.");
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [attempt?.currentIndex, dateKey, set, userId],
  );

  const acknowledgeSubmission = useCallback(async () => {
    if (!userId) return;
    const updated = await setAttemptStatus(userId, dateKey, "AWAITING_RANK");
    setAttempt(updated);
    const result = await processRankDrop(userId, dateKey);
    if (result) {
      setRankResult(result);
      // The drop moved the rating, so the cached state is now stale - Today and
      // the profile both read it.
      setRankState(await getRankState(userId, dateKey));
      setAttempt(await getAttempt(userId, dateKey));
      setPhase("RANK_READY");
      return;
    }
    setPhase("AWAITING_RANK");
  }, [dateKey, userId]);

  const openRankDrop = useCallback(async () => {
    if (!userId) return undefined;
    setBusy(true);
    try {
      const result = await processRankDrop(userId, dateKey);
      if (!result) return undefined;
      setRankResult(result);
      setRankState(await getRankState(userId, dateKey));
      setAttempt(await getAttempt(userId, dateKey));
      setPhase("RANK_READY");
      return result;
    } finally {
      setBusy(false);
    }
  }, [dateKey, userId]);

  const seeRank = useCallback(async () => {
    if (!userId) return;
    await markRankSeen(userId, dateKey);
    const [updated, state] = await Promise.all([
      getAttempt(userId, dateKey),
      getRankState(userId, dateKey),
    ]);
    setAttempt(updated);
    setRankState(state);
    setPhase("RANK_SEEN");
  }, [dateKey, userId]);

  const question = useMemo(() => {
    if (!set) return undefined;
    return set.questions[attempt?.currentIndex ?? 0];
  }, [attempt?.currentIndex, set]);

  const value = useMemo<DailyValue>(
    () => ({
      phase,
      dateKey,
      set,
      attempt,
      rankState,
      rankResult,
      question,
      answers: attempt?.answers ?? [],
      lastAnswer: lastAnswer.current,
      busy,
      error,
      start,
      lock,
      acknowledgeSubmission,
      openRankDrop,
      seeRank,
      refresh,
    }),
    [
      acknowledgeSubmission,
      attempt,
      busy,
      dateKey,
      error,
      lock,
      openRankDrop,
      phase,
      question,
      rankResult,
      rankState,
      refresh,
      seeRank,
      set,
      start,
    ],
  );

  return <DailyContext.Provider value={value}>{children}</DailyContext.Provider>;
}

export function useDailyState(): DailyValue {
  const value = useContext(DailyContext);
  if (!value) throw new Error("useDailyState must be used inside a DailyProvider");
  return value;
}

/** True when a streak is still alive as of today. */
export function streakIsLive(lastPlayedKey: string | undefined, todayKey: string): boolean {
  if (!lastPlayedKey) return false;
  return lastPlayedKey === todayKey || isConsecutiveDay(lastPlayedKey, todayKey);
}
