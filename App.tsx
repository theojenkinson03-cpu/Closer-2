/**
 * CLOSER.
 *
 * Navigation is a small state machine rather than a router. The app has four
 * tabs and three full-screen flows, and which flow a player belongs in is
 * decided by their daily phase - not by history. That means a cold start lands
 * a player exactly where they left off, and no back gesture can put the app
 * into a state the server would not recognise.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Share, StatusBar, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { PhoneOrFull } from "./src/components/Screen";
import { TabBar } from "./src/components/TabBar";
import type { TabKey } from "./src/components/TabBar";
import { buildShareText } from "./src/core/share";
import { rankLabel } from "./src/core/ranks";
import { colors } from "./src/core/tokens";
import { configureNotifications } from "./src/services/notifications";
import { completeOnboarding, getPreferences, needsOnboarding } from "./src/services/preferences";
import type { Preferences } from "./src/services/preferences";
import { ArchiveScreen } from "./src/screens/ArchiveScreen";
import { GameScreen } from "./src/screens/GameScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { LeaderboardScreen } from "./src/screens/LeaderboardScreen";
import { PracticeScreen } from "./src/screens/PracticeScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { RankDropScreen } from "./src/screens/RankDropScreen";
import { StatsScreen } from "./src/screens/StatsScreen";
import { SubmittedScreen } from "./src/screens/SubmittedScreen";
import { DailyProvider, useDailyState } from "./src/state/useDailyState";
import { SessionProvider, useSession } from "./src/state/useSession";

type Flow = "none" | "game" | "submitted" | "drop" | "archive" | "practice";

function Shell({ onReplayOnboarding }: { readonly onReplayOnboarding: () => void }) {
  const { phase, attempt, answers, rankResult, rankState, dateKey, start } = useDailyState();
  const { userId } = useSession();
  const [tab, setTab] = useState<TabKey>("today");
  const [flow, setFlow] = useState<Flow>("none");
  const [practiceDay, setPracticeDay] = useState<string | undefined>(undefined);

  useEffect(() => {
    configureNotifications();
  }, []);

  // Flow transitions are explicit, driven by the screens themselves. In
  // particular the seventh answer must not auto-advance to the card: locking
  // the last answer still owes the player its reveal, and jumping the moment
  // the phase flips to SUBMITTED would swallow it. A cold start in any phase
  // still lands correctly because Today offers the matching action.

  const share = useCallback(async () => {
    const message = buildShareText({
      dateKey,
      totalScore: attempt?.totalScore ?? 0,
      exactness: answers.map((answer) => answer.exactness),
      ...(rankResult ? { percentile: rankResult.percentile, rpDelta: rankResult.delta } : {}),
      ...(rankState ? { rankLabel: rankLabel(rankState.rp), streak: rankState.streak } : {}),
    });
    try {
      await Share.share({ message });
    } catch {
      // The player dismissed the sheet; nothing to recover from.
    }
  }, [answers, attempt?.totalScore, dateKey, rankResult, rankState]);

  const play = useCallback(async () => {
    if (phase === "SUBMITTED") {
      setFlow("submitted");
      return;
    }
    if (phase === "NOT_STARTED") await start();
    setFlow("game");
  }, [phase, start]);

  const content = useMemo(() => {
    if (flow === "game") {
      return <GameScreen onFinished={() => setFlow("submitted")} onExit={() => setFlow("none")} />;
    }
    if (flow === "submitted") {
      return <SubmittedScreen onShare={share} onDone={() => setFlow("none")} />;
    }
    if (flow === "drop") {
      return <RankDropScreen onShare={share} onDone={() => setFlow("none")} />;
    }
    if (flow === "archive") {
      return (
        <ArchiveScreen
          onPlay={(key) => {
            setPracticeDay(key);
            setFlow("practice");
          }}
          onExit={() => setFlow("none")}
        />
      );
    }
    if (flow === "practice" && userId && practiceDay) {
      return (
        <PracticeScreen
          userId={userId}
          dateKey={practiceDay}
          todayKey={dateKey}
          onExit={() => setFlow("archive")}
        />
      );
    }
    switch (tab) {
      case "board":
        return <LeaderboardScreen />;
      case "stats":
        return <StatsScreen onOpenArchive={() => setFlow("archive")} />;
      case "profile":
        return <ProfileScreen onReplayOnboarding={onReplayOnboarding} />;
      case "today":
      default:
        return (
          <HomeScreen
            onPlay={() => void play()}
            onOpenDrop={() => setFlow("drop")}
            onOpenArchive={() => setFlow("archive")}
            onShare={share}
          />
        );
    }
  }, [dateKey, flow, onReplayOnboarding, play, practiceDay, share, tab, userId]);

  return (
    <View style={styles.root}>
      <View style={styles.body}>{content}</View>
      {flow === "none" ? (
        <TabBar
          active={tab}
          onChange={setTab}
          badge={{ today: phase === "RANK_READY" }}
        />
      ) : null}
    </View>
  );
}

/**
 * Boot gate.
 *
 * Two things have to resolve from storage before the app can show anything
 * truthful: who the player is, and whether they have been taught the rules.
 * Until both land this renders the ground colour rather than a spinner, so the
 * hand-off from the splash screen is seamless.
 */
function Gate() {
  const { userId, ready } = useSession();
  const [preferences, setPrefs] = useState<Preferences | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void getPreferences().then((resolved) => {
      if (!cancelled) setPrefs(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const finishOnboarding = useCallback(async () => {
    setPrefs(await completeOnboarding());
  }, []);

  if (!ready || !preferences) return <View style={styles.root} />;

  if (needsOnboarding(preferences)) {
    return <OnboardingScreen onDone={() => void finishOnboarding()} />;
  }

  return (
    <DailyProvider userId={userId}>
      <Shell onReplayOnboarding={() => setPrefs({ ...preferences, onboardingSeen: 0 })} />
    </DailyProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={colors.backgroundDeep} />
      <PhoneOrFull>
        <SessionProvider>
          <Gate />
        </SessionProvider>
      </PhoneOrFull>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1 },
});
