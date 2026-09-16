/** A raised surface. Used for every grouped block in the app. */

import React from "react";
import { StyleSheet, View } from "react-native";
import type { ViewStyle } from "react-native";

import { colors, radius, space } from "../core/tokens";
import { Text } from "./Text";

export interface CardProps {
  readonly children: React.ReactNode;
  readonly title?: string;
  readonly style?: ViewStyle;
  readonly tight?: boolean;
}

export function Card({ children, title, style, tight = false }: CardProps) {
  return (
    <View style={[styles.card, tight && styles.tight, style]}>
      {title ? (
        <Text variant="caption" tone="faint" uppercase style={styles.title}>
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.md,
  },
  tight: { padding: space.md, gap: space.sm },
  title: { marginBottom: space.xs },
});
