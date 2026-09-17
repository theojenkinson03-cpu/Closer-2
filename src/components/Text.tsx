/**
 * Typography primitives.
 *
 * Every string in the app goes through one of these so weight, tracking and
 * colour stay consistent, and so a single change to the type scale in
 * `tokens.ts` moves the whole product.
 */

import React from "react";
import { StyleSheet, Text as RNText } from "react-native";
import type { TextProps as RNTextProps, TextStyle } from "react-native";

import { colors, type as typeScale } from "../core/tokens";

type Variant = keyof typeof typeScale;

export interface TextProps extends RNTextProps {
  readonly variant?: Variant;
  readonly tone?: "default" | "muted" | "faint" | "accent" | "positive" | "negative" | "inverse";
  readonly align?: TextStyle["textAlign"];
  readonly uppercase?: boolean;
}

const tones = {
  default: colors.text,
  muted: colors.textMuted,
  faint: colors.textFaint,
  accent: colors.accent,
  positive: colors.positive,
  negative: colors.negative,
  inverse: colors.backgroundDeep,
} as const;

export function Text({
  variant = "body",
  tone = "default",
  align,
  uppercase = false,
  style,
  ...rest
}: TextProps) {
  const scale = typeScale[variant];
  return (
    <RNText
      {...rest}
      style={[
        styles.base,
        {
          fontSize: scale.size,
          fontWeight: scale.weight,
          letterSpacing: scale.letterSpacing,
          color: tones[tone],
        },
        uppercase && styles.uppercase,
        align ? { textAlign: align } : null,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: { includeFontPadding: false },
  uppercase: { textTransform: "uppercase" },
});
