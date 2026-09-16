/**
 * The archive.
 *
 * Past sets, listed newest first, with both numbers side by side where they
 * exist: what the day was worth when it counted, and what a replay scored. The
 * comparison is the point - it is the clearest evidence a player has that they
 * are getting better at estimating, which a single day's score can never show.
 */

import React, { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";

import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Screen } from "../components/Screen";
import { Text } from "../components/Text";
import { dayLabel, longDayLabel } from "../core/dates";
import { formatScore } from "../core/formatting";
import { colors, radius, space } from "../core/tokens";
import { listAttempts } from "../services/attemptService";
import { listArchive } from "../services/practiceService";
import type { ArchiveEntry } from "../services/practiceService";
import { useDailyState } from "../state/useDailyState";
import { useSession } from "../state/useSession";

export function ArchiveScreen({
  onPlay,
  onExit,
}: {
  readonly onPlay: (dateKey: string) => void;
  /** The archive runs as a flow, so it owns its own way back. */
  readonly onExit: () => void;
}) {
  const { userId } = useSession();
  const { dateKey } = useDailyState();
  const [entries, setEntries] = useState<readonly ArchiveEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // Ranked scores are read here and handed in, so the practice service
      // never has to reach into the ranked side.
      const attempts = await listAttempts(userId);
      const ranked = new Map(
        attempts
          .filter((attempt) => attempt.status !== "IN_PROGRESS")
          .map((attempt) => [attempt.dateKey, attempt.totalScore] as const),
      );
      setEntries(await listArchive(userId, ranked, dateKey));
    } finally {
      setLoading(false);
    }
  }, [dateKey, userId]);

  useEffect(() => {
    void load();
  }, [load]);

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
            Unranked
          </Text>
          <Text variant="title">The archive</Text>
          <Text tone="muted">
            Every set that has already been ranked, open to replay. Practice runs are scored the
            same way and never move your rank - only today's set does that.
          </Text>
        </View>

        <Card>
          {entries.length === 0 ? (
            <Text tone="muted">
              {loading ? "Loading..." : "No days have been ranked yet. Come back tomorrow."}
            </Text>
          ) : (
            entries.map((entry) => (
              <Pressable
                key={entry.dateKey}
                accessibilityRole="button"
                accessibilityLabel={`Practise ${longDayLabel(entry.dateKey)}`}
                onPress={() => onPlay(entry.dateKey)}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <View style={styles.rowMeta}>
                  <Text variant="body">{dayLabel(entry.dateKey, dateKey)}</Text>
                  <Text variant="caption" tone="faint">
                    {entry.rankedScore === undefined
                      ? "Not played for rank"
                      : `Ranked ${formatScore(entry.rankedScore)}`}
                  </Text>
                </View>

                {entry.practiceScore === undefined ? (
                  <Text
                    variant="caption"
                    tone={entry.inProgress ? "accent" : "muted"}
                    uppercase
                  >
                    {entry.inProgress ? "Resume" : "Play"}
                  </Text>
                ) : (
                  <View style={styles.rowScore}>
                    <Text variant="label" tone="muted">
                      {formatScore(entry.practiceScore)}
                    </Text>
                    <Text variant="caption" tone="faint" uppercase>
                      {entry.rankedScore !== undefined && entry.practiceScore > entry.rankedScore
                        ? "Beat it"
                        : "Practice"}
                    </Text>
                  </View>
                )}
              </Pressable>
            ))
          )}
        </Card>

        <Button label="Back to today" variant="secondary" onPress={onExit} style={styles.back} />
      </Screen>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { gap: space.xs, marginBottom: space.lg },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowPressed: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    paddingHorizontal: space.sm,
    marginHorizontal: -space.sm,
  },
  rowMeta: { flex: 1, gap: space.xxs },
  rowScore: { alignItems: "flex-end", gap: space.xxs },
  back: { marginTop: space.lg },
});
