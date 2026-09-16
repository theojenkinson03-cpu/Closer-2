/**
 * Playing the set.
 *
 * The screen holds one question at a time and refuses to move on until the
 * answer is locked, because the whole product rests on a commitment: you cannot
 * see how close you were until you have decided.
 *
 * The reveal between questions is the reward loop. It shows the truth, the
 * miss, and the points - in that order - and nothing else, so it can be read in
 * under two seconds.
 */

import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { EstimateSlider } from "../components/EstimateSlider";
import { ExactnessPill } from "../components/ExactnessPill";
import { ProgressDots } from "../components/ProgressDots";
import { Screen } from "../components/Screen";
import { Text } from "../components/Text";
import { formatMiss, formatScore, formatUnitValue } from "../core/formatting";
import { QUESTIONS_PER_DAY, snapToStep } from "../core/scoring";
import { space } from "../core/tokens";
import { useDailyState } from "../state/useDailyState";
import { impact, selection } from "../services/haptics";
import type { AnswerRecord } from "../types";

export interface GameScreenProps {
  readonly onFinished: () => void;
  readonly onExit: () => void;
}

export function GameScreen({ onFinished, onExit }: GameScreenProps) {
  const { question, answers, attempt, lock, busy, error } = useDailyState();
  const [revealed, setRevealed] = useState<AnswerRecord | undefined>(undefined);
  const [value, setValue] = useState(0);

  // The slider opens at the midpoint of the range: a neutral starting position
  // that does not anchor the player towards either end.
  const midpoint = useMemo(() => {
    if (!question) return 0;
    return snapToStep(
      question.rangeStart + (question.rangeEnd - question.rangeStart) / 2,
      question.rangeStart,
      question.rangeEnd,
      question.step,
    );
  }, [question]);

  useEffect(() => {
    setValue(midpoint);
  }, [midpoint]);

  if (!question && !revealed) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text variant="heading">That is the set.</Text>
          <Button label="See your card" onPress={onFinished} />
        </View>
      </Screen>
    );
  }

  const index = revealed ? answers.length - 1 : answers.length;

  const onLock = async () => {
    impact();
    const answer = await lock(value);
    if (answer) setRevealed(answer);
  };

  const onNext = () => {
    const wasFinal = answers.length >= QUESTIONS_PER_DAY;
    setRevealed(undefined);
    if (wasFinal) onFinished();
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text variant="caption" tone="faint" uppercase>
          {`Question ${Math.min(index + 1, QUESTIONS_PER_DAY)} of ${QUESTIONS_PER_DAY}`}
        </Text>
        <ProgressDots
          total={QUESTIONS_PER_DAY}
          currentIndex={answers.length}
          results={answers.map((answer) => answer.exactness)}
        />
      </View>

      {revealed ? (
        <RevealCard answer={revealed} onNext={onNext} isFinal={answers.length >= QUESTIONS_PER_DAY} />
      ) : question ? (
        <>
          <Card style={styles.prompt}>
            <Text variant="caption" tone="faint" uppercase>
              {question.category}
            </Text>
            <Text variant="title">{question.prompt}</Text>
            {question.subtitle ? (
              <Text variant="body" tone="muted">
                {question.subtitle}
              </Text>
            ) : null}
          </Card>

          <View style={styles.sliderBlock}>
            <EstimateSlider
              question={question}
              value={value}
              onChange={setValue}
              onHaptic={selection}
            />
          </View>

          {error ? (
            <Text tone="negative" variant="caption" uppercase>
              {error}
            </Text>
          ) : null}

          <Button label="Lock it in" onPress={onLock} loading={busy} />
          <Button
            label="Back to today"
            variant="ghost"
            onPress={onExit}
            accessibilityHint="Your locked answers are saved"
          />
        </>
      ) : null}

      {attempt ? (
        <Text variant="caption" tone="faint" uppercase align="center" style={styles.banked}>
          {`${formatScore(attempt.totalScore)} banked`}
        </Text>
      ) : null}
    </Screen>
  );
}

function RevealCard({
  answer,
  onNext,
  isFinal,
}: {
  readonly answer: AnswerRecord;
  readonly onNext: () => void;
  readonly isFinal: boolean;
}) {
  const { set } = useDailyState();
  // The question that was just answered, not the one the set has moved on to.
  const answered = set?.questions.find((entry) => entry.id === answer.questionId);
  const unit = answered?.unit ?? { label: "", placement: "suffix" as const, decimals: 0 };

  return (
    <Card style={styles.reveal}>
      <ExactnessPill exactness={answer.exactness} score={answer.score} />

      {answered ? (
        <Text variant="body" tone="muted">
          {answered.prompt}
        </Text>
      ) : null}

      {/* The same track the guess was made on, with the truth drawn on it.
          Seeing the two marks a few pixels apart says more about a near miss
          than any number can. */}
      {answered ? (
        <EstimateSlider
          question={answered}
          value={answer.value}
          onChange={() => undefined}
          answer={answer.answer}
          disabled
        />
      ) : null}

      <View style={styles.revealRow}>
        <View style={styles.revealCell}>
          <Text variant="caption" tone="faint" uppercase>
            You said
          </Text>
          <Text variant="heading">{formatUnitValue(answer.value, unit)}</Text>
        </View>
        <View style={styles.revealCell}>
          <Text variant="caption" tone="faint" uppercase>
            Answer
          </Text>
          <Text variant="heading" tone="accent">
            {formatUnitValue(answer.answer, unit)}
          </Text>
        </View>
      </View>
      <Text tone="muted">{formatMiss(answer.delta, unit)}</Text>
      {answered ? (
        <Text variant="caption" tone="faint">
          {`Source: ${answered.source}`}
        </Text>
      ) : null}
      <Button label={isFinal ? "Finish" : "Next question"} onPress={onNext} />
    </Card>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", gap: space.lg },
  header: { gap: space.md, marginBottom: space.xl },
  prompt: { marginBottom: space.xl },
  sliderBlock: { marginBottom: space.xxl },
  reveal: { gap: space.lg },
  revealRow: { flexDirection: "row", justifyContent: "space-between" },
  revealCell: { gap: space.xs },
  banked: { marginTop: space.lg },
});
