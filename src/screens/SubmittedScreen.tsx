/**
 * The card.
 *
 * Between finishing the set and the field locking, this is all a player has:
 * their seven answers, their total, and a countdown. That gap is deliberate -
 * it is the thing that makes the rank drop an event.
 */

import React from "react";
import { StyleSheet, View } from "react-native";

import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Countdown } from "../components/Countdown";
import { DailyTotalBar, ScoreBar } from "../components/Charts";
import { ExactnessPill } from "../components/ExactnessPill";
import { Screen } from "../components/Screen";
import { Text } from "../components/Text";
import { longDayLabel, rankDropAtFor } from "../core/dates";
import { exactnessTrace, formatMiss, formatScore, formatUnitValue } from "../core/formatting";
import { MAX_DAILY_SCORE } from "../core/scoring";
import { space } from "../core/tokens";
import { useDailyState } from "../state/useDailyState";

export interface SubmittedScreenProps {
  readonly onShare: () => void;
  readonly onDone: () => void;
}

export function SubmittedScreen({ onShare, onDone }: SubmittedScreenProps) {
  const { attempt, set, dateKey, answers, phase, acknowledgeSubmission, openRankDrop, busy } =
    useDailyState();
  const total = attempt?.totalScore ?? 0;

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text variant="caption" tone="faint" uppercase>
          {longDayLabel(dateKey)}
        </Text>
        <Text variant="display">{formatScore(total)}</Text>
        <Text variant="body" tone="muted">
          {`out of ${formatScore(MAX_DAILY_SCORE)}`}
        </Text>
        <DailyTotalBar total={total} />
        <Text variant="heading" style={styles.trace}>
          {exactnessTrace(answers.map((answer) => answer.exactness))}
        </Text>
      </View>

      <Card title="Your seven">
        {answers.map((answer, index) => {
          const question = set?.questions.find((entry) => entry.id === answer.questionId);
          const unit = question?.unit ?? { label: "", placement: "suffix" as const, decimals: 0 };
          return (
            <View key={answer.questionId} style={styles.answerRow}>
              <View style={styles.answerHead}>
                <Text variant="caption" tone="faint" uppercase>
                  {`${index + 1}. ${question?.category ?? ""}`}
                </Text>
                <ExactnessPill exactness={answer.exactness} compact />
              </View>
              <Text variant="body">{question?.prompt ?? ""}</Text>
              <View style={styles.answerMeta}>
                <Text variant="caption" tone="muted">
                  {`You ${formatUnitValue(answer.value, unit)} · Answer ${formatUnitValue(answer.answer, unit)}`}
                </Text>
                <Text variant="caption" tone="faint">
                  {formatMiss(answer.delta, unit)}
                </Text>
              </View>
              <ScoreBar score={answer.score} label={`${answer.score >= 1000 ? "max" : "points"}`} />
            </View>
          );
        })}
      </Card>

      {phase === "RANK_READY" ? (
        <Card title="The field is locked">
          <Text tone="muted">Your rank has already dropped. Open it.</Text>
          <Button label="Open rank drop" onPress={() => void openRankDrop()} loading={busy} />
        </Card>
      ) : (
        <Card title="Next">
          <Countdown target={rankDropAtFor(dateKey)} />
          <Text tone="muted">
            Ranks move for everyone at once. We will notify you the moment the field locks.
          </Text>
          <Button
            label="Got it"
            onPress={() => {
              void acknowledgeSubmission();
              onDone();
            }}
          />
        </Card>
      )}

      <Button label="Share your card" variant="secondary" onPress={onShare} style={styles.share} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: space.sm, marginBottom: space.xl },
  trace: { marginTop: space.sm, letterSpacing: 2 },
  answerRow: { gap: space.sm, paddingBottom: space.md },
  answerHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  answerMeta: { gap: space.xxs },
  share: { marginTop: space.lg },
});
