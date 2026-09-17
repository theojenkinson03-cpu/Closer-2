/**
 * The rank drop.
 *
 * The one cinematic moment in the app. It is built out of the core `Animated`
 * API rather than Reanimated - a handful of timed opacity, scale and counter
 * animations do not justify another native dependency, and everything here
 * runs on the native driver except the RP counter, which by definition has to
 * pass numbers back to JavaScript.
 *
 * The sequence earns its length by paying out information in the order players
 * care about it: what tier am I, what did the day cost or pay, where did I
 * finish, did I move.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from "react-native";

import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { RankBadge } from "../components/RankBadge";
import { Screen } from "../components/Screen";
import { Text } from "../components/Text";
import { TierProgress } from "../components/TierProgress";
import { longDayLabel } from "../core/dates";
import { formatNumber, formatPercentile, formatSigned, ordinal } from "../core/formatting";
import { rankLabel, TIER_BY_ID } from "../core/ranks";
import { duration, space } from "../core/tokens";
import { celebrate } from "../services/haptics";
import { useDailyState } from "../state/useDailyState";

export interface RankDropScreenProps {
  readonly onShare: () => void;
  readonly onDone: () => void;
}

export function RankDropScreen({ onShare, onDone }: RankDropScreenProps) {
  const { rankResult, dateKey, seeRank } = useDailyState();
  const [reduceMotion, setReduceMotion] = useState(false);

  const badge = useRef(new Animated.Value(0)).current;
  const counter = useRef(new Animated.Value(0)).current;
  const details = useRef(new Animated.Value(0)).current;
  const banner = useRef(new Animated.Value(0)).current;

  const [rp, setRp] = useState(rankResult?.rpBefore ?? 0);
  const celebrated = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (!cancelled) setReduceMotion(enabled);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!rankResult) return;

    const listener = counter.addListener(({ value }) => {
      setRp(Math.round(rankResult.rpBefore + (rankResult.rpAfter - rankResult.rpBefore) * value));
    });

    if (reduceMotion) {
      // No motion, same information: jump straight to the resolved state.
      badge.setValue(1);
      details.setValue(1);
      banner.setValue(1);
      counter.setValue(1);
      setRp(rankResult.rpAfter);
      return () => counter.removeListener(listener);
    }

    const sequence = Animated.sequence([
      Animated.spring(badge, { toValue: 1, useNativeDriver: true, friction: 6, tension: 48 }),
      Animated.timing(counter, {
        toValue: 1,
        duration: duration.cinematic,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(details, {
        toValue: 1,
        duration: duration.base,
        useNativeDriver: true,
      }),
      Animated.timing(banner, {
        toValue: 1,
        duration: duration.slow,
        easing: Easing.out(Easing.back(1.4)),
        useNativeDriver: true,
      }),
    ]);

    sequence.start(() => {
      if ((rankResult.promoted || rankResult.percentile <= 5) && !celebrated.current) {
        celebrated.current = true;
        celebrate();
      }
    });

    return () => {
      sequence.stop();
      counter.removeListener(listener);
    };
  }, [badge, banner, counter, details, rankResult, reduceMotion]);

  // A rating that moves against the raw result needs explaining, or it reads as
  // arbitrary: a newcomer can finish well down the field and still gain,
  // because the ladder pays what you beat relative to expectation.
  const rationale = useMemo(() => {
    if (!rankResult) return undefined;
    const middling = rankResult.percentile > 50;
    if (rankResult.delta > 0 && middling) {
      return "You finished above where your rank was expected to. RP moves on expectation, not raw score.";
    }
    if (rankResult.delta < 0 && !middling) {
      return "A strong finish, but below what your rank was expected to manage today.";
    }
    return undefined;
  }, [rankResult]);

  const movement = useMemo(() => {
    if (!rankResult) return undefined;
    if (rankResult.promoted) {
      return { title: "Promoted", detail: `Welcome to ${TIER_BY_ID[rankResult.tierAfter].name}.` };
    }
    if (rankResult.demoted) {
      return { title: "Demoted", detail: `Back to ${TIER_BY_ID[rankResult.tierAfter].name}. Win it back tomorrow.` };
    }
    if (rankResult.shielded) {
      return {
        title: "Shield held",
        detail: `A bad day cannot knock you out of ${TIER_BY_ID[rankResult.tierAfter].name} the day after you earn it.`,
      };
    }
    if (rankResult.divisionAfter < rankResult.divisionBefore) {
      return { title: "Division up", detail: rankLabel(rankResult.rpAfter) };
    }
    return undefined;
  }, [rankResult]);

  if (!rankResult) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text variant="heading">Nothing has dropped yet.</Text>
          <Button label="Back to today" onPress={onDone} />
        </View>
      </Screen>
    );
  }

  const gained = rankResult.delta >= 0;

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text variant="caption" tone="faint" uppercase>
          {`Rank drop · ${longDayLabel(dateKey)}`}
        </Text>
      </View>

      <Animated.View
        style={[
          styles.badgeStage,
          {
            opacity: badge,
            transform: [
              { scale: badge.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
            ],
          },
        ]}
      >
        <RankBadge tier={rankResult.tierAfter} size={168} glow />
        <Text variant="title" style={styles.tierName}>
          {rankLabel(rankResult.rpAfter)}
        </Text>
      </Animated.View>

      <View style={styles.counterBlock}>
        <Text variant="display" align="center" style={styles.counter}>
          {formatNumber(rp)}
        </Text>
        <Text variant="caption" tone="faint" uppercase align="center">
          Ranked points
        </Text>
        <Text
          variant="heading"
          align="center"
          tone={gained ? "positive" : "negative"}
          style={styles.delta}
        >
          {`${formatSigned(rankResult.delta)} RP`}
        </Text>
      </View>

      <Animated.View style={{ opacity: details }}>
        <Card title="Where you finished">
          <View style={styles.statRow}>
            <View style={styles.stat}>
              <Text variant="caption" tone="faint" uppercase>
                Field
              </Text>
              <Text variant="heading">{formatPercentile(rankResult.percentile)}</Text>
            </View>
            <View style={styles.stat}>
              <Text variant="caption" tone="faint" uppercase>
                Placed
              </Text>
              <Text variant="heading">{ordinal(rankResult.fieldRank)}</Text>
            </View>
            <View style={styles.stat}>
              <Text variant="caption" tone="faint" uppercase>
                Played
              </Text>
              <Text variant="heading">{formatNumber(rankResult.fieldSize)}</Text>
            </View>
          </View>
          {rankResult.friendsPosition ? (
            <Text tone="muted">
              {`${ordinal(rankResult.friendsPosition.rank)} of ${formatNumber(rankResult.friendsPosition.of)} among friends.`}
            </Text>
          ) : null}
          {rationale ? (
            <Text variant="caption" tone="faint">
              {rationale}
            </Text>
          ) : null}
          <TierProgress rp={rankResult.rpAfter} />
        </Card>
      </Animated.View>

      {movement ? (
        <Animated.View
          style={[
            styles.banner,
            {
              opacity: banner,
              transform: [
                { translateY: banner.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
              ],
            },
          ]}
        >
          <Card>
            <Text variant="label" uppercase tone="accent">
              {movement.title}
            </Text>
            <Text tone="muted">{movement.detail}</Text>
          </Card>
        </Animated.View>
      ) : null}

      <View style={styles.actions}>
        <Button label="Share your card" variant="secondary" onPress={onShare} />
        <Button
          label="Done"
          onPress={() => {
            void seeRank();
            onDone();
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", gap: space.lg },
  header: { marginBottom: space.lg, alignItems: "center" },
  badgeStage: { alignItems: "center", gap: space.md },
  tierName: { marginTop: space.sm },
  counterBlock: { marginVertical: space.xl, gap: space.xs },
  counter: { fontVariant: ["tabular-nums"] },
  delta: { marginTop: space.sm },
  statRow: { flexDirection: "row", justifyContent: "space-between" },
  stat: { gap: space.xxs },
  banner: { marginTop: space.lg },
  actions: { marginTop: space.xl, gap: space.md },
});
