/**
 * Screen chrome.
 *
 * On a phone this is a safe-area-aware container. On a wide screen (the web
 * preview, a tablet) it centres the app inside a phone-shaped frame, because a
 * portrait-locked daily game stretched across 1,400px tells you nothing about
 * how it actually feels. The frame is cosmetic and web-only - it never appears
 * in a native build.
 */

import React from "react";
import { Platform, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import type { ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, layout, radius, space } from "../core/tokens";

export function useIsFramed(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === "web" && width > layout.frameWidth + 120;
}

export interface ScreenProps {
  readonly children: React.ReactNode;
  readonly scroll?: boolean;
  readonly padded?: boolean;
  readonly style?: ViewStyle;
  /** Space kept clear at the bottom for the tab bar. */
  readonly bottomInset?: number;
}

export function Screen({ children, scroll = false, padded = true, style, bottomInset = 0 }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const framed = useIsFramed();

  // Inside the web frame the safe area is simulated by the frame itself (see
  // `styles.screen`), so the content only needs its own breathing room. On a
  // device the measured insets do the same job.
  const top = framed ? space.md : Math.max(insets.top, space.md);
  const bottom = (framed ? space.sm : Math.max(insets.bottom, space.sm)) + bottomInset;

  const content = (
    <View
      style={[
        styles.content,
        padded && styles.padded,
        { paddingTop: top, paddingBottom: bottom },
        style,
      ]}
    >
      {children}
    </View>
  );

  return scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.grow}
      showsVerticalScrollIndicator={false}
    >
      {content}
    </ScrollView>
  ) : (
    <View style={styles.flex}>{content}</View>
  );
}

/** The decorative phone shell used only by the wide-screen web preview. */
export function PhoneOrFull({ children }: { readonly children: React.ReactNode }) {
  const framed = useIsFramed();

  if (!framed) {
    return <View style={styles.fullBleed}>{children}</View>;
  }

  return (
    <View style={styles.stage}>
      <View style={styles.frame}>
        <View style={styles.screen}>{children}</View>
        <View pointerEvents="none" style={styles.island} />
        <View pointerEvents="none" style={styles.homeIndicator} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grow: { flexGrow: 1 },
  content: { flex: 1 },
  padded: { paddingHorizontal: space.xl },
  fullBleed: { flex: 1, backgroundColor: colors.background },
  stage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.backgroundDeep,
    padding: space.xl,
  },
  frame: {
    width: layout.frameWidth,
    height: layout.frameHeight,
    maxHeight: "100%",
    borderRadius: 54,
    borderWidth: 8,
    borderColor: "#02080E",
    backgroundColor: colors.background,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOpacity: 0.55,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 24 },
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 46,
    overflow: "hidden",
    // Stands in for the device safe area: clears the drawn Dynamic Island at
    // the top and the home indicator at the bottom.
    paddingTop: 44,
    paddingBottom: 22,
  },
  island: {
    position: "absolute",
    top: 10,
    alignSelf: "center",
    width: 112,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: "#02080E",
  },
  homeIndicator: {
    position: "absolute",
    bottom: 8,
    alignSelf: "center",
    width: 132,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.textFaint,
    opacity: 0.5,
  },
});
