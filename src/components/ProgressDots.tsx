/**
 * Seven dots: where you are in the day, and how each answer landed.
 *
 * Doubles as the day's shape at a glance - the same information the share card
 * carries as emoji.
 */

import React from "react";
import { StyleSheet, View } from "react-native";

import { exactnessColors, colors, radius, space } from "../core/tokens";
import type { ExactnessTier } from "../types";

export interface ProgressDotsProps {
  readonly total: number;
  readonly currentIndex: number;
  readonly results?: readonly ExactnessTier[];
}

export function ProgressDots({ total, currentIndex, results = [] }: ProgressDotsProps) {
  return (
    <View style={styles.row} accessibilityLabel={`Question ${Math.min(currentIndex + 1, total)} of ${total}`}>
      {Array.from({ length: total }, (_, index) => {
        const result = results[index];
        const active = index === currentIndex;
        return (
          <View
            key={`dot-${index}`}
            style={[
              styles.dot,
              result ? { backgroundColor: exactnessColors[result] } : null,
              active ? styles.active : null,
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space.sm, alignItems: "center" },
  dot: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.borderStrong,
  },
  active: {
    width: 26,
    backgroundColor: colors.accent,
  },
});
