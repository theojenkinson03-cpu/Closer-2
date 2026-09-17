/**
 * The verdict on a single answer.
 *
 * A score out of 1000 is precise but not emotional; BULLSEYE is emotional but
 * not precise. The pill carries both.
 */

import React from "react";
import { StyleSheet, View } from "react-native";

import { exactnessLabel, formatScore } from "../core/formatting";
import { exactnessColors, radius, space } from "../core/tokens";
import type { ExactnessTier } from "../types";
import { Text } from "./Text";

export interface ExactnessPillProps {
  readonly exactness: ExactnessTier;
  readonly score?: number;
  readonly compact?: boolean;
}

export function ExactnessPill({ exactness, score, compact = false }: ExactnessPillProps) {
  const tint = exactnessColors[exactness];
  return (
    <View style={[styles.pill, compact && styles.compact, { borderColor: tint, backgroundColor: `${tint}22` }]}>
      <View style={[styles.dot, { backgroundColor: tint }]} />
      <Text variant="caption" uppercase style={{ color: tint }}>
        {exactnessLabel(exactness)}
      </Text>
      {score === undefined ? null : (
        <Text variant="caption" tone="muted">
          {formatScore(score)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: space.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  compact: { paddingVertical: space.xs, paddingHorizontal: space.sm },
  dot: { width: 8, height: 8, borderRadius: radius.pill },
});
