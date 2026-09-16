/**
 * Playing an archived day.
 *
 * Same engine, same reveal, same seven questions as the day was ranked on -
 * and nothing that touches rank. The copy says "unranked" in the one place a
 * player looks before committing, because the whole value of the ranked
 * attempt rests on it being the only one that counts.
 *
 * State is local rather than in a provider: an archive run is a self-contained
 * session, and putting it in the daily provider would blur exactly the line
 * this feature has to keep sharp.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { AnswerReveal } from "../components/AnswerReveal";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { DailyTotalBar } from "../components/Charts";
import { EstimateSlider } from "../components/EstimateSlider";
import { ProgressDots } from "../components/ProgressDots";
import { Screen } from "../components/Screen";
import { Text } from "../components/Text";
import { longDayLabel } from "../core/dates";
import { exactnessTrace, formatScore } from "../core/formatting";
import { MAX_DAILY_SCORE, QUESTIONS_PER_DAY, snapToStep } from "../core/scoring";
import { space } from "../core/tokens";
import { buildDailySet } from "../services/dailyService";
import type { QuestionFieldStats } from "../services/field";
import { celebrate, impact, selection } from "../services/haptics";
import {
  getPracticeAttempt,
  lockPracticeAnswer,
  resetPractice,
  startPractice,
} from "../services/practiceService";
import type { PracticeAttempt } from "../services/practiceService";
import type { AnswerRecord } from "../types";

interface Revealed {
  readonly answer: AnswerRecord;
  readonly field: QuestionFieldStats;
}

export interface PracticeScreenProps {
  readonly userId: string;
  readonly dateKey: string;
  readonly todayKey: string;
  readonly onExit: () => void;
}

export function PracticeScreen({ userId, dateKey, todayKey, onExit }: PracticeScreenProps) {
  const set = useMemo(() => buildDailySet(dateKey), [dateKey]);
  const [attempt, setAttempt] = useState<PracticeAttempt | undefined>(undefined);
  const [revealed, setRevealed] = useState<Revealed | undefined>(undefined);
  const [value, setValue] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void getPracticeAttempt(userId, dateKey).then((existing) => {
      if (!cancelled) setAttempt(existing);
    });
    return () => {
      cancelled = true;
    };
  }, [dateKey, userId]);

  const index = attempt?.currentIndex ?? 0;
  const question = set.questions[index];
  const finished = Boolean(attempt?.completedAt);

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

  const lock = useCallback(async () => {
    if (!question) return;
    impact();
    setBusy(true);
    try {
      const outcome = await lockPracticeAnswer(userId, dateKey, question.id, value, todayKey);
      if (outcome.answer.exactness === "BULLSEYE") celebrate();
      setAttempt(outcome.attempt);
      setRevealed({ answer: outcome.answer, field: outcome.field });
      setError(undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not lock that answer.");
    } finally {
      setBusy(false);
    }
  }, [dateKey, question, todayKey, userId, value]);

  const replay = useCallback(async () => {
    await resetPractice(userId, dateKey);
    setRevealed(undefined);
    setAttempt(await startPractice(userId, dateKey, todayKey));
  }, [dateKey, todayKey, userId]);

  const answers = attempt?.answers ?? [];

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text variant="caption" tone="faint" uppercase>
          {`Archive · unranked · ${longDayLabel(dateKey)}`}
        </Text>
        <ProgressDots
          total={QUESTIONS_PER_DAY}
          currentIndex={answers.length}
          results={answers.map((answer) => answer.exactness)}
        />
      </View>

      {finished && !revealed ? (
        <Card title="That day, replayed">
          <Text variant="display">{formatScore(attempt?.totalScore ?? 0)}</Text>
          <Text tone="muted">{`out of ${formatScore(MAX_DAILY_SCORE)}`}</Text>
          <DailyTotalBar total={attempt?.totalScore ?? 0} />
          <Text variant="heading" style={styles.trace}>
            {exactnessTrace(answers.map((answer) => answer.exactness))}
          </Text>
          <Text variant="caption" tone="faint">
            Practice runs never move your rank. Only today's set does that.
          </Text>
          <Button label="Play it again" variant="secondary" onPress={() => void replay()} />
          <Button label="Back to the archive" onPress={onExit} />
        </Card>
      ) : null}

      {revealed ? (
        <AnswerReveal
          question={set.questions.find((entry) => entry.id === revealed.answer.questionId)}
          answer={revealed.answer}
          field={revealed.field}
          onNext={() => setRevealed(undefined)}
          nextLabel={answers.length >= QUESTIONS_PER_DAY ? "See the day" : "Next question"}
        />
      ) : null}

      {!revealed && !finished && question ? (
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

          <Button label="Lock it in" onPress={() => void lock()} loading={busy} />
          <Button label="Back to the archive" variant="ghost" onPress={onExit} />
        </>
      ) : null}

      {attempt && !finished ? (
        <Text variant="caption" tone="faint" uppercase align="center" style={styles.banked}>
          {`${formatScore(attempt.totalScore)} banked · unranked`}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: space.md, marginBottom: space.xl },
  prompt: { marginBottom: space.xl },
  sliderBlock: { marginBottom: space.xxl },
  trace: { letterSpacing: 2 },
  banked: { marginTop: space.lg },
});
