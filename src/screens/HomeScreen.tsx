/**
 * Today.
 *
 * One screen, one action. What that action is depends entirely on where the
 * player is in the day, so this screen reads the phase and offers exactly one
 * next step - never a menu of them.
 */

import React from "react";
import { StyleSheet, View } from "react-native";

import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Countdown } from "../components/Countdown";
import { DailyTotalBar } from "../components/Charts";
import { ProgressDots } from "../components/ProgressDots";
import { RankBadge } from "../components/RankBadge";
import { Screen } from "../components/Screen";
import { Text } from "../components/Text";
import { TierProgress } from "../components/TierProgress";
import { dayLabel, longDayLabel, rankDropAtFor } from "../core/dates";
import { formatPercentile, formatScore, formatSigned, pluralise } from "../core/formatting";
import { QUESTIONS_PER_DAY } from "../core/scoring";
import { space } from "../core/tokens";
import { useDailyState } from "../state/useDailyState";

export interface HomeScreenProps {
  readonly onPlay: () => void;
  readonly onOpenDrop: () => void;
  readonly onOpenArchive: () => void;
  readonly onShare: () => void;
}

export function HomeScreen({ onPlay, onOpenDrop, onOpenArchive, onShare }: HomeScreenProps) {
  const { phase, dateKey, attempt, rankState, rankResult, answers, busy } = useDailyState();
  const answered = answers.length;

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text variant="caption" tone="faint" uppercase>
          {`${dayLabel(dateKey)} · ${longDayLabel(dateKey)}`}
        </Text>
        <Text variant="display">CLOSER</Text>
        <Text variant="body" tone="muted">
          Seven questions. One attempt. How close can you get?
        </Text>
      </View>

      <Card style={styles.rankCard}>
        <View style={styles.rankRow}>
          <RankBadge tier={rankState?.tier ?? "SCOUT"} size={96} />
          <View style={styles.rankMeta}>
            <TierProgress rp={rankState?.rp ?? 0} />
            <Text variant="caption" tone="faint" uppercase>
              {rankState && rankState.streak > 0
                ? `${pluralise(rankState.streak, "day")} streak · ${pluralise(rankState.gamesPlayed, "day")} played`
                : `${pluralise(rankState?.gamesPlayed ?? 0, "day")} played`}
            </Text>
          </View>
        </View>
      </Card>

      {phase === "LOADING" ? (
        <Card>
          <Text tone="muted">Loading today's set...</Text>
        </Card>
      ) : null}

      {phase === "NOT_STARTED" ? (
        <Card title="Today's set">
          <Text variant="heading">Seven estimates are waiting.</Text>
          <Text tone="muted">
            Everyone playing today gets the same seven questions. Your rank moves when the field
            locks.
          </Text>
          <Countdown target={rankDropAtFor(dateKey)} label="Field locks in" />
          <Button label="Start today's set" onPress={onPlay} loading={busy} />
        </Card>
      ) : null}

      {phase === "IN_PROGRESS" ? (
        <Card title="In progress">
          <Text variant="heading">{`Question ${answered + 1} of ${QUESTIONS_PER_DAY}`}</Text>
          <ProgressDots
            total={QUESTIONS_PER_DAY}
            currentIndex={answered}
            results={answers.map((answer) => answer.exactness)}
          />
          <Text tone="muted">{`${formatScore(attempt?.totalScore ?? 0)} banked so far.`}</Text>
          <Button label="Resume" onPress={onPlay} loading={busy} />
        </Card>
      ) : null}

      {phase === "SUBMITTED" ? (
        <Card title="Locked in">
          <Text variant="heading">{formatScore(attempt?.totalScore ?? 0)}</Text>
          <DailyTotalBar total={attempt?.totalScore ?? 0} />
          <Button label="See your card" onPress={onPlay} />
        </Card>
      ) : null}

      {phase === "AWAITING_RANK" ? (
        <Card title="Waiting on the field">
          <Text variant="heading">{formatScore(attempt?.totalScore ?? 0)}</Text>
          <Text tone="muted">
            Your answers are in. Ranks move for everyone at the same moment - we will tell you when
            the field locks.
          </Text>
          <Countdown target={rankDropAtFor(dateKey)} />
          <Button label="Share your card" variant="secondary" onPress={onShare} />
        </Card>
      ) : null}

      {phase === "RANK_READY" ? (
        <Card title="Your rank has dropped">
          <Text variant="heading">The field is locked.</Text>
          <Text tone="muted">Open it to see where you finished and what it cost or paid.</Text>
          <Button label="Open rank drop" onPress={onOpenDrop} loading={busy} />
        </Card>
      ) : null}

      {phase !== "NOT_STARTED" && phase !== "IN_PROGRESS" && phase !== "LOADING" ? (
        <Card title="While you wait" style={styles.archiveCard}>
          <Text variant="heading">The archive</Text>
          <Text tone="muted">
            Every set that has already been ranked is open to replay, unranked. The only way to get
            better at estimating is to estimate more.
          </Text>
          <Button label="Open the archive" variant="secondary" onPress={onOpenArchive} />
        </Card>
      ) : null}

      {phase === "RANK_SEEN" && rankResult ? (
        <Card title="Today">
          <View style={styles.resultRow}>
            <View>
              <Text variant="caption" tone="faint" uppercase>
                Score
              </Text>
              <Text variant="heading">{formatScore(rankResult.totalScore)}</Text>
            </View>
            <View>
              <Text variant="caption" tone="faint" uppercase>
                Field
              </Text>
              <Text variant="heading">{formatPercentile(rankResult.percentile)}</Text>
            </View>
            <View>
              <Text variant="caption" tone="faint" uppercase>
                RP
              </Text>
              <Text variant="heading" tone={rankResult.delta >= 0 ? "positive" : "negative"}>
                {formatSigned(rankResult.delta)}
              </Text>
            </View>
          </View>
          <Text tone="muted">Come back tomorrow for a new seven.</Text>
          <Button label="Share your card" variant="secondary" onPress={onShare} />
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: space.xs, marginBottom: space.xl },
  rankCard: { marginBottom: space.lg },
  rankRow: { flexDirection: "row", alignItems: "center", gap: space.lg },
  rankMeta: { flex: 1, gap: space.sm },
  resultRow: { flexDirection: "row", justifyContent: "space-between" },
  archiveCard: { marginTop: space.lg },
});
