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
import { AnswerReveal } from "../components/AnswerReveal";
import { EstimateSlider } from "../components/EstimateSlider";
import { ProgressDots } from "../components/ProgressDots";
import { Screen } from "../components/Screen";
import { Text } from "../components/Text";
import { formatScore } from "../core/formatting";
import { QUESTIONS_PER_DAY, snapToStep } from "../core/scoring";
import { space } from "../core/tokens";
import { useDailyState } from "../state/useDailyState";
import type { RevealedAnswer } from "../state/useDailyState";
import { celebrate, impact, selection } from "../services/haptics";

export interface GameScreenProps {
  readonly onFinished: () => void;
  readonly onExit: () => void;
}

export function GameScreen({ onFinished, onExit }: GameScreenProps) {
  const { question, answers, attempt, set, lock, busy, error } = useDailyState();
  const [revealed, setRevealed] = useState<RevealedAnswer | undefined>(undefined);
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
    const outcome = await lock(value);
    if (!outcome) return;
    // A bullseye is rare enough to be worth its own note.
    if (outcome.answer.exactness === "BULLSEYE") celebrate();
    setRevealed(outcome);
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
        <AnswerReveal
          question={set?.questions.find((entry) => entry.id === revealed.answer.questionId)}
          answer={revealed.answer}
          field={revealed.field}
          onNext={onNext}
          nextLabel={answers.length >= QUESTIONS_PER_DAY ? "Finish" : "Next question"}
        />
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

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", gap: space.lg },
  header: { gap: space.md, marginBottom: space.xl },
  prompt: { marginBottom: space.xl },
  sliderBlock: { marginBottom: space.xxl },
  banked: { marginTop: space.lg },
});
