/**
 * You.
 *
 * Identity, the ladder in full, and an honest account of what this build does
 * and does not yet do. The last part matters: a ranked game that quietly keeps
 * its scores on one device should say so rather than imply a global account.
 */

import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { RankBadge } from "../components/RankBadge";
import { Screen } from "../components/Screen";
import { Text } from "../components/Text";
import { TierProgress } from "../components/TierProgress";
import { longDayLabel, seasonEndsOn, seasonIdFor } from "../core/dates";
import { formatNumber, formatRp, initialsFor, pluralise } from "../core/formatting";
import { TIERS, tierForRp } from "../core/ranks";
import { colors, radius, space } from "../core/tokens";
import { DEMO_DATA } from "../services/config";
import { getPermissionState, notificationsAvailable, requestPermission, scheduleRankDrop } from "../services/notifications";
import type { PermissionState } from "../services/notifications";
import { useDailyState } from "../state/useDailyState";
import { useSession } from "../state/useSession";

export function ProfileScreen() {
  const { session, rename } = useSession();
  const { rankState, dateKey } = useDailyState();
  const [name, setName] = useState(session?.displayName ?? "");
  const [permission, setPermission] = useState<PermissionState>("unavailable");

  useEffect(() => {
    setName(session?.displayName ?? "");
  }, [session?.displayName]);

  useEffect(() => {
    void getPermissionState().then(setPermission);
  }, []);

  const enableReminders = useCallback(async () => {
    const next = await requestPermission();
    setPermission(next);
    if (next === "granted") await scheduleRankDrop(dateKey);
  }, [dateKey]);

  const rp = rankState?.rp ?? 0;
  const current = tierForRp(rp);

  return (
    <Screen scroll>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text variant="heading" tone="muted">
            {initialsFor(session?.displayName ?? "You")}
          </Text>
        </View>
        <View style={styles.identity}>
          <Text variant="title">{session?.displayName ?? "You"}</Text>
          <Text variant="caption" tone="faint" uppercase>
            {`${seasonIdFor(dateKey)} · ends ${longDayLabel(seasonEndsOn(dateKey))}`}
          </Text>
        </View>
      </View>

      <Card>
        <View style={styles.rankRow}>
          <RankBadge tier={rankState?.tier ?? "SCOUT"} size={84} />
          <View style={styles.rankMeta}>
            <TierProgress rp={rp} />
            <Text variant="caption" tone="faint" uppercase>
              {`Peak ${formatRp(rankState?.peakRp ?? 0)} · ${pluralise(rankState?.gamesPlayed ?? 0, "day")} played`}
            </Text>
          </View>
        </View>
      </Card>

      <Card title="Display name" style={styles.card}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Your name on the board"
          placeholderTextColor={colors.textFaint}
          style={styles.input}
          maxLength={24}
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={() => void rename(name)}
        />
        <Button label="Save" variant="secondary" onPress={() => void rename(name)} />
      </Card>

      <Card title="Rank drop reminder" style={styles.card}>
        <Text tone="muted">
          {permission === "granted"
            ? "You will be notified the moment the field locks."
            : notificationsAvailable()
              ? "Get a notification when the field locks and your rank moves."
              : "Notifications are not available on this platform."}
        </Text>
        {permission === "granted" || !notificationsAvailable() ? null : (
          <Button label="Enable reminders" variant="secondary" onPress={() => void enableReminders()} />
        )}
      </Card>

      <Card title="The ladder" style={styles.card}>
        {TIERS.map((tier) => {
          const reached = rp >= tier.floor;
          return (
            <View key={tier.id} style={styles.tierRow}>
              <RankBadge tier={tier.id} size={38} muted={!reached} />
              <View style={styles.tierMeta}>
                <Text
                  variant="label"
                  uppercase
                  style={{ color: reached ? tier.accent : colors.textFaint }}
                >
                  {tier.name}
                </Text>
                <Text variant="caption" tone="faint">
                  {Number.isFinite(tier.ceiling)
                    ? `${formatNumber(tier.floor)} – ${formatNumber(tier.ceiling - 1)} RP`
                    : `${formatNumber(tier.floor)}+ RP`}
                </Text>
              </View>
              {tier.id === current.id ? (
                <Text variant="caption" tone="accent" uppercase>
                  You
                </Text>
              ) : null}
            </View>
          );
        })}
      </Card>

      {DEMO_DATA ? (
        <Card title="About this build" style={styles.card}>
          <Text tone="muted">
            CLOSER is running on local data. Your attempts, ranked points and history are stored on
            this device and survive restarts, but there is no account behind them: nothing restores
            to a new phone, and the players on the board are simulated from the day's seed rather
            than being real opponents.
          </Text>
          <Text variant="caption" tone="faint" uppercase>
            {`Identity: ${session?.provider ?? "anonymous"}`}
          </Text>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: space.lg, marginBottom: space.lg },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  identity: { flex: 1, gap: space.xxs },
  card: { marginTop: space.lg },
  rankRow: { flexDirection: "row", alignItems: "center", gap: space.lg },
  rankMeta: { flex: 1, gap: space.sm },
  input: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundDeep,
    paddingHorizontal: space.md,
    color: colors.text,
    fontSize: 16,
  },
  tierRow: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.xs },
  tierMeta: { flex: 1, gap: space.xxs },
});
