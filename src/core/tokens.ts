/**
 * Design tokens. Pure data - no React, no React Native, no platform APIs.
 *
 * CLOSER's palette is a deep navy ground (the "night sky" the target sits in),
 * a cool snow for type, and a single hot red used *only* for precision:
 * the bullseye, the marker, the RP gain.
 */

export const palette = {
  ink: "#06121E",
  navy: "#0B1B2B",
  navyRaised: "#10263D",
  navyLine: "#1B3A55",
  slate: "#24455F",
  mist: "#6E8CA6",
  snow: "#F4F7FA",
  snowDim: "#C6D4E0",
  red: "#E5484D",
  redDim: "#8E2F33",
  amber: "#F5B33C",
  mint: "#4DD8A4",
  violet: "#8E7BEF",
  gold: "#E8C26A",
} as const;

export const colors = {
  background: palette.navy,
  backgroundDeep: palette.ink,
  surface: palette.navyRaised,
  surfaceRaised: "#14314F",
  border: palette.navyLine,
  borderStrong: palette.slate,
  text: palette.snow,
  textMuted: palette.snowDim,
  textFaint: palette.mist,
  accent: palette.red,
  accentDim: palette.redDim,
  positive: palette.mint,
  warning: palette.amber,
  negative: palette.red,
} as const;

export const exactnessColors = {
  BULLSEYE: palette.red,
  PRECISE: palette.gold,
  CLOSE: palette.mint,
  NEAR: "#4A9BE0",
  WIDE: palette.mist,
  OFF_TARGET: palette.slate,
} as const;

export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 26,
  pill: 999,
} as const;

export const type = {
  display: { size: 44, weight: "800" as const, letterSpacing: -1.2 },
  title: { size: 28, weight: "700" as const, letterSpacing: -0.6 },
  heading: { size: 20, weight: "700" as const, letterSpacing: -0.2 },
  body: { size: 16, weight: "500" as const, letterSpacing: 0 },
  label: { size: 13, weight: "600" as const, letterSpacing: 0.8 },
  caption: { size: 11, weight: "600" as const, letterSpacing: 1.4 },
  mono: { size: 34, weight: "800" as const, letterSpacing: -0.5 },
} as const;

export const duration = {
  fast: 160,
  base: 260,
  slow: 520,
  cinematic: 1400,
} as const;

export const layout = {
  /** Width the phone-frame preview clamps to on wide screens. */
  frameWidth: 390,
  frameHeight: 844,
  maxContentWidth: 480,
  tabBarHeight: 62,
} as const;
