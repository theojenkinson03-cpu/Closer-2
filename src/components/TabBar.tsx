/**
 * Bottom navigation.
 *
 * Four destinations, no nesting, no stack. The icons are drawn from the same
 * geometric language as the badges rather than pulled from an icon font, so
 * there is no font to load and nothing to fall back to.
 */

import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import { colors, radius, space } from "../core/tokens";
import { Text } from "./Text";

export type TabKey = "today" | "board" | "stats" | "profile";

export interface TabBarProps {
  readonly active: TabKey;
  readonly onChange: (tab: TabKey) => void;
  readonly badge?: Partial<Record<TabKey, boolean>>;
}

const TABS: ReadonlyArray<{ key: TabKey; label: string }> = [
  { key: "today", label: "Today" },
  { key: "board", label: "Board" },
  { key: "stats", label: "Stats" },
  { key: "profile", label: "You" },
];

function TabIcon({ tab, active }: { readonly tab: TabKey; readonly active: boolean }) {
  const tint = active ? colors.accent : colors.textFaint;
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      {tab === "today" ? (
        <>
          <Circle cx={12} cy={12} r={9} stroke={tint} strokeWidth={1.6} fill="none" />
          <Circle cx={12} cy={12} r={4} stroke={tint} strokeWidth={1.6} fill="none" />
          <Circle cx={12} cy={12} r={1.6} fill={tint} />
        </>
      ) : null}
      {tab === "board" ? (
        <>
          <Rect x={3} y={13} width={4.5} height={8} rx={1} fill={tint} />
          <Rect x={9.75} y={6} width={4.5} height={15} rx={1} fill={tint} />
          <Rect x={16.5} y={10} width={4.5} height={11} rx={1} fill={tint} />
        </>
      ) : null}
      {tab === "stats" ? (
        <Path
          d="M3 17 L9 10 L13 13 L21 4"
          stroke={tint}
          strokeWidth={1.8}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      {tab === "profile" ? (
        <>
          <Circle cx={12} cy={8.5} r={3.6} stroke={tint} strokeWidth={1.6} fill="none" />
          <Path
            d="M4.5 20.5 C5.6 16.4 8.5 14.4 12 14.4 C15.5 14.4 18.4 16.4 19.5 20.5"
            stroke={tint}
            strokeWidth={1.6}
            fill="none"
            strokeLinecap="round"
          />
        </>
      ) : null}
    </Svg>
  );
}

export function TabBar({ active, onChange, badge = {} }: TabBarProps) {
  return (
    <View style={styles.bar}>
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.label}
            onPress={() => onChange(tab.key)}
            style={styles.tab}
          >
            <View>
              <TabIcon tab={tab.key} active={isActive} />
              {badge[tab.key] ? <View style={styles.badge} /> : null}
            </View>
            <Text variant="caption" tone={isActive ? "accent" : "faint"} uppercase>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.backgroundDeep,
    paddingTop: space.md,
    paddingBottom: space.md,
  },
  tab: { flex: 1, alignItems: "center", gap: space.xs },
  badge: {
    position: "absolute",
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
});
