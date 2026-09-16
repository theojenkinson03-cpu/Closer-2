/**
 * A live countdown to the next rank drop.
 *
 * Ticks once a second and only while mounted, so a backgrounded app is not
 * burning a timer. The remaining time is recomputed from the clock on every
 * tick rather than decremented, which means it stays correct across a
 * suspend/resume that a decrementing counter would drift through.
 */

import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { formatCountdown, msUntil } from "../core/dates";
import { space } from "../core/tokens";
import { Text } from "./Text";

export interface CountdownProps {
  readonly target: string;
  readonly label?: string;
  readonly onElapsed?: () => void;
}

export function Countdown({ target, label = "Rank drop in", onElapsed }: CountdownProps) {
  const [remaining, setRemaining] = useState(() => msUntil(target));

  useEffect(() => {
    setRemaining(msUntil(target));
    const timer = setInterval(() => {
      const next = msUntil(target);
      setRemaining(next);
      if (next <= 0) {
        clearInterval(timer);
        onElapsed?.();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [onElapsed, target]);

  return (
    <View style={styles.block}>
      <Text variant="caption" tone="faint" uppercase>
        {label}
      </Text>
      <Text variant="title" style={styles.value}>
        {formatCountdown(remaining)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.xs },
  value: { fontVariant: ["tabular-nums"] },
});
