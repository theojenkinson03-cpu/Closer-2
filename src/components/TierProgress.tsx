/**
 * Progress through the current tier.
 *
 * Shows the two numbers that make a ladder feel like a ladder: where you are
 * inside the band, and how far the next one is.
 */

import React from "react";
import { StyleSheet, View } from "react-native";

import { formatNumber, formatRp } from "../core/formatting";
import { progressInTier, rankLabel, rpToNextTier, TIER_BY_ID, tierForRp } from "../core/ranks";
import { colors, radius, space } from "../core/tokens";
import { Text } from "./Text";

export function TierProgress({ rp }: { readonly rp: number }) {
  const tier = tierForRp(rp);
  const definition = TIER_BY_ID[tier.id];
  const progress = progressInTier(rp);
  const remaining = rpToNextTier(rp);

  return (
    <View style={styles.block}>
      <View style={styles.row}>
        <Text variant="label" uppercase style={{ color: definition.accent }}>
          {rankLabel(rp)}
        </Text>
        <Text variant="label" tone="muted">
          {formatRp(rp)}
        </Text>
      </View>
      <View style={styles.track}>
        <View
          style={[styles.fill, { width: `${Math.round(progress * 100)}%`, backgroundColor: definition.color }]}
        />
      </View>
      <Text variant="caption" tone="faint" uppercase>
        {remaining > 0
          ? `${formatNumber(remaining)} rp to ${TIER_BY_ID[tier.id].name === "Champion" ? "the top" : "promotion"}`
          : "Top of the ladder"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.sm },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  track: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: radius.pill },
});
