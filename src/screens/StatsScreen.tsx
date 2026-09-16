/**
 * Stats.
 *
 * Built to answer "am I actually getting better at this?" - which is the only
 * question that keeps a skill ladder interesting past the first week. Trend
 * first, then the shape of a player's precision, then where their weak
 * categories are.
 */

import React, { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";

import { Card } from "../components/Card";
import { ExactnessDistribution, ScoreBar, Sparkline } from "../components/Charts";
import { Screen } from "../components/Screen";
import { Text } from "../components/Text";
import { dayLabel } from "../core/dates";
import { exactnessLabel, formatNumber, formatPercentile, formatScore, formatSigned, pluralise } from "../core/formatting";
import { EXACTNESS_ORDER } from "../core/scoring";
import { colors, exactnessColors, space } from "../core/tokens";
import { getPlayerStats } from "../services/statsService";
import { useDailyState } from "../state/useDailyState";
import { useSession } from "../state/useSession";
import type { PlayerStats } from "../types";

export function StatsScreen() {
  const { userId } = useSession();
  const { dateKey, phase } = useDailyState();
  const [stats, setStats] = useState<PlayerStats | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      setStats(await getPlayerStats(userId, dateKey));
    } finally {
      setLoading(false);
    }
  }, [dateKey, userId]);

  useEffect(() => {
    void load();
  }, [load, phase]);

  return (
    <ScrollView
      style={styles.flex}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.textFaint} />
      }
    >
      <Screen>
        <View style={styles.header}>
          <Text variant="title">Your numbers</Text>
          <Text tone="muted">
            {stats && stats.gamesPlayed > 0
              ? `${pluralise(stats.gamesPlayed, "day")} played · ${pluralise(stats.bullseyes, "bullseye")}`
              : "Play a set to start building a record."}
          </Text>
        </View>

        <Card title="Daily total">
          <Sparkline history={stats?.history ?? []} />
          <View style={styles.statRow}>
            <Stat label="Average" value={formatScore(stats?.averageScore ?? 0)} />
            <Stat label="Best" value={formatScore(stats?.bestScore ?? 0)} />
            <Stat label="Streak" value={formatNumber(stats?.currentStreak ?? 0)} />
            <Stat label="Best run" value={formatNumber(stats?.bestStreak ?? 0)} />
          </View>
        </Card>

        <Card title="Precision" style={styles.card}>
          <ExactnessDistribution
            counts={
              stats?.exactnessCounts ?? {
                BULLSEYE: 0,
                PRECISE: 0,
                CLOSE: 0,
                NEAR: 0,
                WIDE: 0,
                OFF_TARGET: 0,
              }
            }
          />
          <View style={styles.legend}>
            {EXACTNESS_ORDER.map((tier) => (
              <View key={tier} style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: exactnessColors[tier] }]} />
                <Text variant="caption" tone="muted" style={styles.legendLabel}>
                  {exactnessLabel(tier)}
                </Text>
                <Text variant="caption" tone="faint">
                  {formatNumber(stats?.exactnessCounts[tier] ?? 0)}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        <Card title="By category" style={styles.card}>
          {stats && stats.byCategory.length > 0 ? (
            stats.byCategory.map((entry) => (
              <ScoreBar key={entry.category} score={entry.averageScore} label={entry.category} />
            ))
          ) : (
            <Text tone="muted">No answers recorded yet.</Text>
          )}
        </Card>

        <Card title="History" style={styles.card}>
          {stats && stats.history.length > 0 ? (
            [...stats.history]
              .reverse()
              .slice(0, 14)
              .map((entry) => (
                <View key={entry.dateKey} style={styles.historyRow}>
                  <Text variant="caption" tone="muted" style={styles.historyDay}>
                    {dayLabel(entry.dateKey, dateKey)}
                  </Text>
                  <Text variant="caption" tone="default" style={styles.historyScore}>
                    {formatScore(entry.totalScore)}
                  </Text>
                  <Text variant="caption" tone="faint" style={styles.historyPercentile}>
                    {formatPercentile(entry.percentile)}
                  </Text>
                  <Text
                    variant="caption"
                    tone={entry.rpDelta >= 0 ? "positive" : "negative"}
                    style={styles.historyDelta}
                  >
                    {formatSigned(entry.rpDelta)}
                  </Text>
                </View>
              ))
          ) : (
            <Text tone="muted">Your first rank drop will show up here.</Text>
          )}
        </Card>
      </Screen>
    </ScrollView>
  );
}

function Stat({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <View style={styles.stat}>
      <Text variant="caption" tone="faint" uppercase>
        {label}
      </Text>
      <Text variant="heading">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { gap: space.xs, marginBottom: space.lg },
  card: { marginTop: space.lg },
  statRow: { flexDirection: "row", justifyContent: "space-between", marginTop: space.md },
  stat: { gap: space.xxs },
  legend: { gap: space.sm, marginTop: space.md },
  legendRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { flex: 1 },
  historyRow: { flexDirection: "row", alignItems: "center", paddingVertical: space.xs },
  historyDay: { flex: 1 },
  historyScore: { width: 56, textAlign: "right" },
  historyPercentile: { width: 72, textAlign: "right" },
  historyDelta: { width: 48, textAlign: "right" },
});
