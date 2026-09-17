/**
 * The reveal.
 *
 * Shared by ranked play and the archive, because the moment is the product and
 * it should be identical in both: the verdict, the question restated, the truth
 * drawn on the same track the guess was made on, the miss, and where the field
 * landed.
 *
 * The slider is the reason this is one component rather than two. Seeing your
 * marker and the answer a few pixels apart communicates a near miss in a way
 * that "29 over" never does, and rebuilding that twice would guarantee the two
 * drifted apart.
 */

import React from "react";
import { StyleSheet, View } from "react-native";

import { formatMiss, formatUnitValue } from "../core/formatting";
import { space } from "../core/tokens";
import type { QuestionFieldStats } from "../services/field";
import type { AnswerRecord, Question } from "../types";
import { Button } from "./Button";
import { Card } from "./Card";
import { FieldComparison } from "./Charts";
import { EstimateSlider } from "./EstimateSlider";
import { ExactnessPill } from "./ExactnessPill";
import { Text } from "./Text";

const FALLBACK_UNIT = { label: "", placement: "suffix" as const, decimals: 0 };

export interface AnswerRevealProps {
  /** The question that was answered, not the one the set has moved on to. */
  readonly question: Question | undefined;
  readonly answer: AnswerRecord;
  readonly field: QuestionFieldStats;
  readonly onNext: () => void;
  readonly nextLabel: string;
}

export function AnswerReveal({ question, answer, field, onNext, nextLabel }: AnswerRevealProps) {
  const unit = question?.unit ?? FALLBACK_UNIT;

  return (
    <Card style={styles.card}>
      <ExactnessPill exactness={answer.exactness} score={answer.score} />

      {question ? (
        <Text variant="body" tone="muted">
          {question.prompt}
        </Text>
      ) : null}

      {question ? (
        <EstimateSlider
          question={question}
          value={answer.value}
          onChange={() => undefined}
          answer={answer.answer}
          disabled
        />
      ) : null}

      <View style={styles.row}>
        <View style={styles.cell}>
          <Text variant="caption" tone="faint" uppercase>
            You said
          </Text>
          <Text variant="heading">{formatUnitValue(answer.value, unit)}</Text>
        </View>
        <View style={styles.cell}>
          <Text variant="caption" tone="faint" uppercase>
            Answer
          </Text>
          <Text variant="heading" tone="accent">
            {formatUnitValue(answer.answer, unit)}
          </Text>
        </View>
      </View>

      <Text tone="muted">{formatMiss(answer.delta, unit)}</Text>

      <FieldComparison
        beatenShare={field.beatenShare}
        medianScore={field.medianScore}
        score={answer.score}
      />

      {question ? (
        <Text variant="caption" tone="faint">
          {`Source: ${question.source}`}
        </Text>
      ) : null}

      <Button label={nextLabel} onPress={onNext} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.lg },
  row: { flexDirection: "row", justifyContent: "space-between" },
  cell: { gap: space.xs },
});
