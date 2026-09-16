/**
 * First run.
 *
 * CLOSER asks players to do something no other daily game asks: commit to a
 * number and be paid for proximity. Two things about that are not self-evident
 * and, left unexplained, make the game feel arbitrary - that scoring is
 * relative to the range rather than absolute, and that ranked points move on
 * expectation rather than on raw score.
 *
 * So the first screen is not a description, it is the mechanic: a real slider
 * on a real question, scored by the real engine. Nothing here is a mock-up, and
 * the tutorial question is deliberately one nobody needs to know - a week's
 * minutes can be reasoned out - so the lesson lands on calibration rather than
 * on trivia.
 */

import React, { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { EstimateSlider } from "../components/EstimateSlider";
import { ExactnessPill } from "../components/ExactnessPill";
import { RankBadge } from "../components/RankBadge";
import { Screen } from "../components/Screen";
import { Text } from "../components/Text";
import { formatMiss, formatNumber, formatScore, formatUnitValue } from "../core/formatting";
import {
  EXACTNESS_LABELS,
  EXACTNESS_THRESHOLDS,
  MAX_DAILY_SCORE,
  MAX_SCORE,
  QUESTIONS_PER_DAY,
  scoreAnswer,
  scoreForNormalisedError,
  snapToStep,
} from "../core/scoring";
import { RANK_DROP_HOUR } from "../core/dates";
import { colors, exactnessColors, radius, space } from "../core/tokens";
import { celebrate, impact, selection } from "../services/haptics";
import type { Unit } from "../types";

/**
 * A question that is worked out rather than recalled, and deliberately not in
 * the bank, so the tutorial spoils nothing.
 */
const TUTORIAL = {
  prompt: "How many minutes are in a week?",
  subtitle: "You can work this one out - that is the point",
  unit: { label: "min", placement: "suffix", decimals: 0, long: "minutes" } as Unit,
  answer: 10080,
  rangeStart: 1000,
  rangeEnd: 30000,
  step: 10,
};

const STEP_COUNT = 3;

export function OnboardingScreen({ onDone }: { readonly onDone: () => void }) {
  const [step, setStep] = useState(0);

  return (
    <Screen scroll>
      <View style={styles.progress}>
        {Array.from({ length: STEP_COUNT }, (_, index) => (
          <View
            key={`step-${index}`}
            style={[styles.progressDot, index === step && styles.progressDotActive]}
          />
        ))}
      </View>

      {step === 0 ? <TryIt onNext={() => setStep(1)} /> : null}
      {step === 1 ? <Bands onNext={() => setStep(2)} /> : null}
      {step === 2 ? <TheDrop onNext={onDone} /> : null}

      {step === 0 ? (
        <Button label="Skip" variant="ghost" onPress={onDone} style={styles.skip} />
      ) : null}
    </Screen>
  );
}

function TryIt({ onNext }: { readonly onNext: () => void }) {
  const midpoint = useMemo(
    () =>
      snapToStep(
        TUTORIAL.rangeStart + (TUTORIAL.rangeEnd - TUTORIAL.rangeStart) / 2,
        TUTORIAL.rangeStart,
        TUTORIAL.rangeEnd,
        TUTORIAL.step,
      ),
    [],
  );
  const [value, setValue] = useState(midpoint);
  const [checked, setChecked] = useState(false);
  const result = useMemo(() => scoreAnswer(value, TUTORIAL), [value]);

  const check = () => {
    impact();
    if (result.exactness === "BULLSEYE") celebrate();
    setChecked(true);
  };

  return (
    <View style={styles.block}>
      <View style={styles.header}>
        <Text variant="caption" tone="accent" uppercase>
          How it works
        </Text>
        <Text variant="title">It is not what you know. It is how close you get.</Text>
        <Text tone="muted">
          Every question is a number. You slide to your best estimate and lock it in - there are no
          options to pick from, and no half marks for being vaguely right.
        </Text>
      </View>

      <Card>
        <Text variant="caption" tone="faint" uppercase>
          Try one
        </Text>
        <Text variant="heading">{TUTORIAL.prompt}</Text>
        <Text tone="muted">{TUTORIAL.subtitle}</Text>

        <View style={styles.sliderBlock}>
          <EstimateSlider
            question={TUTORIAL}
            value={value}
            onChange={(next) => {
              setChecked(false);
              setValue(next);
            }}
            onHaptic={selection}
            {...(checked ? { answer: TUTORIAL.answer } : {})}
          />
        </View>

        {checked ? (
          <View style={styles.result}>
            <ExactnessPill exactness={result.exactness} score={result.score} />
            <Text tone="muted">
              {`The answer is ${formatUnitValue(TUTORIAL.answer, TUTORIAL.unit)}. You were ${formatMiss(result.delta, TUTORIAL.unit).toLowerCase()}.`}
            </Text>
            <Text variant="caption" tone="faint">
              {`Scores run to ${formatNumber(MAX_SCORE)} a question, measured against the width of the slider - so a question spanning thousands forgives more than one spanning ten.`}
            </Text>
          </View>
        ) : (
          <Text variant="caption" tone="faint">
            Drag the marker. Hold and drag away from the track for fine control, or use the arrow
            keys.
          </Text>
        )}

        {checked ? (
          <Button label="Next" onPress={onNext} />
        ) : (
          <Button label="Lock it in" onPress={check} />
        )}
      </Card>
    </View>
  );
}

function Bands({ onNext }: { readonly onNext: () => void }) {
  return (
    <View style={styles.block}>
      <View style={styles.header}>
        <Text variant="caption" tone="accent" uppercase>
          Scoring
        </Text>
        <Text variant="title">Six bands between exact and nowhere near.</Text>
        <Text tone="muted">
          Each band is a share of the slider's width, so the same miss counts differently on a
          question about a mountain and one about a year.
        </Text>
      </View>

      <Card>
        <View style={styles.bandHead}>
          <Text variant="caption" tone="faint" uppercase>
            Band
          </Text>
          <Text variant="caption" tone="faint" uppercase>
            Pays up to
          </Text>
        </View>

        {EXACTNESS_THRESHOLDS.map(([tier, threshold], index) => {
          const finite = Number.isFinite(threshold);
          // A band pays at most what its *best* edge scores, which is the
          // previous band's boundary - so BULLSEYE reads as the full 1,000
          // rather than as the score for being 0.5% out.
          const previous = EXACTNESS_THRESHOLDS[index - 1]?.[1];
          const ceiling = previous === undefined ? MAX_SCORE : scoreForNormalisedError(previous);
          return (
            <View key={tier} style={styles.bandRow}>
              <View style={[styles.bandSwatch, { backgroundColor: exactnessColors[tier] }]} />
              <View style={styles.bandMeta}>
                <Text variant="label" uppercase style={{ color: exactnessColors[tier] }}>
                  {EXACTNESS_LABELS[tier]}
                </Text>
                <Text variant="caption" tone="faint">
                  {finite
                    ? `Within ${formatNumber(threshold * 100, threshold < 0.01 ? 1 : 0)}% of the range`
                    : "Further out than a quarter of the range"}
                </Text>
              </View>
              <Text variant="label" tone="muted">
                {formatScore(ceiling)}
              </Text>
            </View>
          );
        })}
      </Card>

      <Text variant="caption" tone="faint">
        {`Seven questions a day, so ${formatNumber(MAX_DAILY_SCORE)} is a perfect round. Nobody has one.`}
      </Text>

      <Button label="Next" onPress={onNext} />
    </View>
  );
}

function TheDrop({ onNext }: { readonly onNext: () => void }) {
  return (
    <View style={styles.block}>
      <View style={styles.header}>
        <Text variant="caption" tone="accent" uppercase>
          The rank drop
        </Text>
        <Text variant="title">One attempt. Everyone gets the same seven.</Text>
        <Text tone="muted">
          {`Your answers are locked as you go - there is no second run at a day. Finishing does not tell you how you did, because the field is still playing. At ${RANK_DROP_HOUR}:00 UTC it locks, every attempt is scored against every other, and ranked points move.`}
        </Text>
      </View>

      <Card>
        <View style={styles.dropRow}>
          <RankBadge tier="MARKSMAN" size={72} />
          <View style={styles.dropMeta}>
            <Text variant="label" uppercase>
              Eight tiers
            </Text>
            <Text variant="caption" tone="faint">
              Scout to Champion, with a shield that stops a single bad day knocking you straight
              back out of a tier you just earned.
            </Text>
          </View>
        </View>

        <View style={styles.rule} />

        <Text variant="label" uppercase>
          Paid on expectation
        </Text>
        <Text tone="muted">
          Points move on how you did against what your rank was expected to manage, not on your raw
          score. A newcomer can finish mid-field and still climb; a Champion can have a good day and
          go nowhere.
        </Text>
      </Card>

      <Button label={`Play today's ${QUESTIONS_PER_DAY}`} onPress={onNext} />
    </View>
  );
}

const styles = StyleSheet.create({
  progress: { flexDirection: "row", gap: space.sm, marginBottom: space.xl },
  progressDot: {
    height: 3,
    flex: 1,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  progressDotActive: { backgroundColor: colors.accent },
  block: { gap: space.xl },
  header: { gap: space.sm },
  sliderBlock: { marginVertical: space.md },
  result: { gap: space.md },
  bandHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: space.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  bandRow: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.xs },
  bandSwatch: { width: 10, height: 26, borderRadius: radius.sm },
  bandMeta: { flex: 1, gap: space.xxs },
  dropRow: { flexDirection: "row", alignItems: "center", gap: space.lg },
  dropMeta: { flex: 1, gap: space.xs },
  rule: { height: 1, backgroundColor: colors.border, marginVertical: space.sm },
  skip: { marginTop: space.lg },
});
