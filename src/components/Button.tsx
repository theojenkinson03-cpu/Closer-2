/**
 * Buttons.
 *
 * The primary action is the only red surface on a screen. Nothing else competes
 * with it, because on any given screen there is exactly one thing a player
 * should do next: start the day, lock the answer, open the drop.
 */

import React, { useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import type { ViewStyle } from "react-native";

import { colors, duration, radius, space } from "../core/tokens";
import { Text } from "./Text";

export interface ButtonProps {
  readonly label: string;
  readonly onPress: () => void;
  readonly variant?: "primary" | "secondary" | "ghost";
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly style?: ViewStyle;
  readonly accessibilityHint?: string;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  style,
  accessibilityHint,
}: ButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const inactive = disabled || loading;

  const press = (to: number) => {
    Animated.timing(scale, {
      toValue: to,
      duration: duration.fast,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: inactive, busy: loading }}
        accessibilityHint={accessibilityHint}
        disabled={inactive}
        onPressIn={() => press(0.97)}
        onPressOut={() => press(1)}
        onPress={onPress}
        style={[styles.base, styles[variant], inactive && styles.inactive]}
      >
        <Text
          variant="label"
          uppercase
          tone={variant === "primary" ? "default" : variant === "ghost" ? "muted" : "default"}
        >
          {loading ? "…" : label}
        </Text>
        {variant === "primary" && !inactive ? <View style={styles.sheen} pointerEvents="none" /> : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.xl,
    overflow: "hidden",
  },
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.borderStrong },
  ghost: { backgroundColor: "transparent" },
  inactive: { opacity: 0.4 },
  sheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "45%",
    backgroundColor: "#FFFFFF",
    opacity: 0.1,
  },
});
