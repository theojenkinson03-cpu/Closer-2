/**
 * The slider. CLOSER's entire input surface.
 *
 * Built on PanResponder rather than react-native-gesture-handler: the gesture
 * is a single-finger horizontal drag with no competing gestures, so the core
 * API is enough, and avoiding the native module keeps the project running in
 * plain Expo Go without a custom dev client.
 *
 * Two details matter more than they look:
 *
 *   Reversed ranges. A BCE question runs from 1200 BCE on the left to 200 BCE
 *   on the right. Position maps to `rangeStart -> rangeEnd` rather than
 *   `min -> max`, so "further right" always means "later", whichever way the
 *   numbers run.
 *
 *   Drag coarse, nudge exact. A 390px track cannot resolve one metre out of
 *   five thousand, so the drag gets you close and the nudge buttons close the
 *   last step. Estimation games die if the interface, not the player, is the
 *   thing limiting precision.
 */

import React, { useCallback, useMemo, useRef, useState } from "react";
import { PanResponder, Pressable, StyleSheet, View } from "react-native";

import { clamp, decimalsForStep, snapToStep } from "../core/scoring";
import { formatUnitValue, formatUnitValueCompact, MINUS } from "../core/formatting";
import { colors, radius, space } from "../core/tokens";
import type { Question } from "../types";
import { Text } from "./Text";

const TRACK_HEIGHT = 56;
const MARKER_WIDTH = 4;
const TICK_COUNT = 41;

export interface EstimateSliderProps {
  readonly question: Pick<Question, "rangeStart" | "rangeEnd" | "step" | "unit">;
  readonly value: number;
  readonly onChange: (value: number) => void;
  readonly disabled?: boolean;
  /** Set once the answer is public: draws where the truth was. */
  readonly answer?: number;
  readonly onHaptic?: () => void;
}

export function EstimateSlider({
  question,
  value,
  onChange,
  disabled = false,
  answer,
  onHaptic,
}: EstimateSliderProps) {
  const { rangeStart, rangeEnd, step, unit } = question;
  const [width, setWidth] = useState(0);
  const startFraction = useRef(0);
  const lastEmitted = useRef(value);

  const fractionFor = useCallback(
    (raw: number) => {
      const span = rangeEnd - rangeStart;
      if (span === 0) return 0;
      return clamp((raw - rangeStart) / span, 0, 1);
    },
    [rangeEnd, rangeStart],
  );

  const valueFor = useCallback(
    (fraction: number) =>
      snapToStep(rangeStart + clamp(fraction, 0, 1) * (rangeEnd - rangeStart), rangeStart, rangeEnd, step),
    [rangeEnd, rangeStart, step],
  );

  const emit = useCallback(
    (next: number) => {
      if (next === lastEmitted.current) return;
      lastEmitted.current = next;
      onHaptic?.();
      onChange(next);
    },
    [onChange, onHaptic],
  );

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: () => !disabled,
        onPanResponderGrant: () => {
          startFraction.current = fractionFor(value);
        },
        onPanResponderMove: (_event, gesture) => {
          if (width <= 0) return;
          emit(valueFor(startFraction.current + gesture.dx / width));
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [disabled, emit, fractionFor, valueFor, value, width],
  );

  const fraction = fractionFor(value);
  const answerFraction = answer === undefined ? undefined : fractionFor(answer);
  const decimals = decimalsForStep(step);
  const nudge = (direction: 1 | -1) => {
    if (disabled) return;
    const raw = Number((value + direction * step * Math.sign(rangeEnd - rangeStart || 1)).toFixed(decimals));
    emit(snapToStep(raw, rangeStart, rangeEnd, step));
  };

  return (
    <View>
      <View style={styles.readout}>
        <Text variant="mono" align="center" accessibilityLiveRegion="polite">
          {formatUnitValue(value, unit)}
        </Text>
      </View>

      <View
        style={styles.track}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Your estimate"
        accessibilityValue={{ text: formatUnitValue(value, unit) }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === "increment") nudge(1);
          if (event.nativeEvent.actionName === "decrement") nudge(-1);
        }}
        {...responder.panHandlers}
      >
        <View style={styles.trackLine} />

        {Array.from({ length: TICK_COUNT }, (_, index) => {
          const position = index / (TICK_COUNT - 1);
          const major = index % 10 === 0;
          return (
            <View
              key={`tick-${index}`}
              pointerEvents="none"
              style={[
                styles.tick,
                major ? styles.tickMajor : null,
                { left: `${position * 100}%` },
              ]}
            />
          );
        })}

        {answerFraction !== undefined ? (
          <View pointerEvents="none" style={[styles.answer, { left: `${answerFraction * 100}%` }]} />
        ) : null}

        <View
          pointerEvents="none"
          style={[styles.fill, { width: `${fraction * 100}%` }]}
        />
        <View pointerEvents="none" style={[styles.marker, { left: `${fraction * 100}%` }]}>
          <View style={styles.markerCap} />
        </View>
      </View>

      <View style={styles.bounds}>
        <Text variant="caption" tone="faint">
          {formatUnitValueCompact(rangeStart, unit)}
        </Text>
        <Text variant="caption" tone="faint">
          {formatUnitValueCompact(rangeEnd, unit)}
        </Text>
      </View>

      {disabled ? null : (
        <View style={styles.nudges}>
          <Nudge label="−" onPress={() => nudge(-1)} hint="Decrease by one step" />
          <Text variant="caption" tone="faint" uppercase>
            {`step ${formatUnitValue(step, unit)}`}
          </Text>
          <Nudge label="+" onPress={() => nudge(1)} hint="Increase by one step" />
        </View>
      )}
    </View>
  );
}

function Nudge({
  label,
  onPress,
  hint,
}: {
  readonly label: string;
  readonly onPress: () => void;
  readonly hint: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={hint}
      onPress={onPress}
      style={({ pressed }) => [styles.nudge, pressed && styles.nudgePressed]}
    >
      <Text variant="heading">{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  readout: { marginBottom: space.lg },
  track: {
    height: TRACK_HEIGHT,
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  trackLine: {
    position: "absolute",
    left: 0,
    right: 0,
    top: TRACK_HEIGHT / 2 - 1,
    height: 2,
    backgroundColor: colors.border,
  },
  tick: {
    position: "absolute",
    width: 1,
    height: 10,
    marginLeft: -0.5,
    top: TRACK_HEIGHT / 2 - 5,
    backgroundColor: colors.borderStrong,
  },
  tickMajor: { height: 22, top: TRACK_HEIGHT / 2 - 11, backgroundColor: colors.textFaint },
  fill: {
    position: "absolute",
    left: 0,
    top: TRACK_HEIGHT / 2 - 1,
    height: 2,
    backgroundColor: colors.accent,
    opacity: 0.55,
  },
  marker: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: MARKER_WIDTH,
    marginLeft: -MARKER_WIDTH / 2,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  markerCap: {
    width: 14,
    height: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.background,
  },
  answer: {
    position: "absolute",
    top: 6,
    bottom: 6,
    width: 2,
    marginLeft: -1,
    backgroundColor: colors.positive,
  },
  bounds: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: space.sm,
  },
  nudges: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: space.lg,
  },
  nudge: {
    width: 56,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  nudgePressed: { backgroundColor: colors.surfaceRaised },
});
