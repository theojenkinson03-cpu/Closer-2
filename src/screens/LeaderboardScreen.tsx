/**
 * The board.
 *
 * Two lists, because they answer two different questions. The global top ten
 * is aspiration; the rows immediately around you are competition. A single
 * 10,000-row list would provide neither.
 */

import React, { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";

import { Card } from "../components/Card";
import { RankBadge } from "../components/RankBadge";
import { Screen } from "../components/Screen";
import { Text } from "../components/Text";
import { dayLabel } from "../core/dates";
import { formatNumber, formatScore, initialsFor, ordinal } from "../core/formatting";
import { colors, radius, space } from "../core/tokens";
import { getLeaderboard } from "../services/leaderboardService";
import { useDailyState } from "../state/useDailyState";
import { useSession } from "../state/useSession";
import type { Leaderboard, LeaderboardEntry } from "../types";

export function LeaderboardScreen() {
  const { userId } = useSession();
  const { dateKey, phase } = useDailyState();
  const [board, setBoard] = useState<Leaderboard | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      setBoard(await getLeaderboard(userId, dateKey));
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
          <Text variant="caption" tone="faint" uppercase>
            {dayLabel(dateKey)}
          </Text>
          <Text variant="title">Leaderboard</Text>
          {board ? (
            <Text tone="muted">{`${formatNumber(board.fieldSize)} players answered today's seven.`}</Text>
          ) : null}
        </View>

        <Card title="Top of the field">
          {board?.top.map((entry) => <Row key={entry.userId} entry={entry} />) ?? (
            <Text tone="muted">Loading...</Text>
          )}
        </Card>

        {board && board.around.length > 0 ? (
          <Card title="Around you" style={styles.around}>
            {board.around.map((entry) => (
              <Row key={`${entry.userId}-${entry.rank}`} entry={entry} />
            ))}
          </Card>
        ) : (
          <Card title="Around you" style={styles.around}>
            <Text tone="muted">
              Play today's set to take your place in the field.
            </Text>
          </Card>
        )}
      </Screen>
    </ScrollView>
  );
}

function Row({ entry }: { readonly entry: LeaderboardEntry }) {
  return (
    <View style={[styles.row, entry.isMe && styles.rowMe]}>
      <Text variant="caption" tone={entry.isMe ? "accent" : "faint"} style={styles.rank}>
        {ordinal(entry.rank)}
      </Text>
      <View style={styles.avatar}>
        <Text variant="caption" tone="muted">
          {initialsFor(entry.displayName)}
        </Text>
      </View>
      <View style={styles.name}>
        <Text variant="body" tone={entry.isMe ? "accent" : "default"} numberOfLines={1}>
          {entry.displayName}
        </Text>
      </View>
      <RankBadge tier={entry.tier} size={26} />
      <Text variant="label" tone="muted" style={styles.score}>
        {formatScore(entry.totalScore)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { gap: space.xs, marginBottom: space.lg },
  around: { marginTop: space.lg },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: space.sm,
  },
  rowMe: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    paddingHorizontal: space.sm,
    marginHorizontal: -space.sm,
  },
  rank: { width: 44 },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { flex: 1 },
  score: { width: 56, textAlign: "right" },
});
