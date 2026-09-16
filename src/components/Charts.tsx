/**
 * Statistics charts, drawn with react-native-svg.
 *
 * Both charts here answer a question a player actually asks. The sparkline
 * answers "am I getting better?"; the distribution answers "where does my
 * precision break down?". Neither needs a charting library to do that.
 */

import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";

import { formatScore } from "../core/formatting";
import { MAX_DAILY_SCORE } from "../core/scoring";
import { EXACTNESS_ORDER } from "../core/scoring";
import { colors, exactnessColors, radius, space } from "../core/tokens";
import type { DayHistoryEntry, ExactnessTier } from "../types";
import { Text } from "./Text";

export interface SparklineProps {
  readonly history: readonly DayHistoryEntry[];
  readonly height?: number;
}

/** Daily totals over time. Flat means consistent, which is its own good news. */
export function Sparkline({ history, height = 96 }: SparklineProps) {
  const width = 300;
  const points = history.slice(-21);

  if (points.length < 2) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text variant="caption" tone="faint" uppercase>
          Two days of play to draw a trend
        </Text>
      </View>
    );
  }

  const maxScore = Math.max(...points.map((entry) => entry.totalScore), 1);
  const minScore = Math.min(...points.map((entry) => entry.totalScore), maxScore - 1);
  const span = Math.max(maxScore - minScore, 1);

  const coords = points.map((entry, index) => ({
    x: (index / (points.length - 1)) * width,
    y: height - ((entry.totalScore - minScore) / span) * (height - 12) - 6,
  }));

  const line = coords
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L ${width} ${height} L 0 ${height} Z`;
  const last = coords[coords.length - 1]!;

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.accent} stopOpacity={0.35} />
            <Stop offset="1" stopColor={colors.accent} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={area} fill="url(#spark)" />
        <Path d={line} fill="none" stroke={colors.accent} strokeWidth={2} strokeLinejoin="round" />
        <Circle cx={last.x} cy={last.y} r={4} fill={colors.accent} />
      </Svg>
      <View style={styles.axis}>
        <Text variant="caption" tone="faint">
          {formatScore(minScore)}
        </Text>
        <Text variant="caption" tone="faint">
          {formatScore(maxScore)}
        </Text>
      </View>
    </View>
  );
}

export interface DistributionProps {
  readonly counts: Readonly<Record<ExactnessTier, number>>;
}

/** How a player's answers split across the exactness bands. */
export function ExactnessDistribution({ counts }: DistributionProps) {
  const total = EXACTNESS_ORDER.reduce((sum, tier) => sum + counts[tier], 0);
  const width = 300;
  const barHeight = 18;
  const gap = 8;
  const height = EXACTNESS_ORDER.length * (barHeight + gap);

  if (total === 0) {
    return (
      <View style={styles.empty}>
        <Text variant="caption" tone="faint" uppercase>
          No answers recorded yet
        </Text>
      </View>
    );
  }

  const max = Math.max(...EXACTNESS_ORDER.map((tier) => counts[tier]), 1);

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      {EXACTNESS_ORDER.map((tier, index) => {
        const value = counts[tier];
        const barWidth = Math.max((value / max) * (width - 8), value > 0 ? 3 : 0);
        return (
          <React.Fragment key={tier}>
            {/* The track has to be visible or a zero-count band reads as a
                rendering fault rather than as a zero. */}
            <Rect
              x={0}
              y={index * (barHeight + gap)}
              width={width - 8}
              height={barHeight}
              rx={4}
              fill={colors.border}
              fillOpacity={0.75}
            />
            <Rect
              x={0}
              y={index * (barHeight + gap)}
              width={barWidth}
              height={barHeight}
              rx={4}
              fill={exactnessColors[tier]}
              fillOpacity={0.85}
            />
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

export function ScoreBar({ score, label }: { readonly score: number; readonly label: string }) {
  const share = Math.max(0, Math.min(1, score / 1000));
  return (
    <View style={styles.scoreRow}>
      <Text variant="caption" tone="muted" uppercase style={styles.scoreLabel}>
        {label}
      </Text>
      <View style={styles.scoreTrack}>
        <View style={[styles.scoreFill, { width: `${share * 100}%` }]} />
      </View>
      <Text variant="caption" tone="muted" style={styles.scoreValue}>
        {formatScore(score)}
      </Text>
    </View>
  );
}

/** Today's total against the theoretical maximum. */
export function DailyTotalBar({ total }: { readonly total: number }) {
  const share = Math.max(0, Math.min(1, total / MAX_DAILY_SCORE));
  return (
    <View style={styles.totalTrack}>
      <View style={[styles.totalFill, { width: `${share * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { justifyContent: "center", alignItems: "center", paddingVertical: space.lg },
  axis: { flexDirection: "row", justifyContent: "space-between", marginTop: space.xs },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  scoreLabel: { width: 88 },
  scoreValue: { width: 44, textAlign: "right" },
  scoreTrack: {
    flex: 1,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  scoreFill: { height: "100%", backgroundColor: colors.accent, opacity: 0.8 },
  totalTrack: {
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  totalFill: { height: "100%", backgroundColor: colors.accent },
});
