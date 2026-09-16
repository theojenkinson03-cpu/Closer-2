/**
 * Tier badges, drawn as computed geometry rather than shipped as images.
 *
 * Eight tiers need eight silhouettes that read differently at 28px in a list
 * and at 180px in the rank-drop cinematic. Everything here is polar maths, so
 * the badge is resolution-independent, recolours with the tier, and can be
 * animated without swapping assets.
 *
 * The escalation is deliberate and legible at a glance:
 *   Scout / Seeker          plain gem
 *   Marksman / Sharpshooter more facets, a heavier dial ring
 *   Master / Oracle         laurel flourishes
 *   Legend                  wings
 *   Champion                wings, laurel and a crown
 */

import React, { memo, useMemo } from "react";
import { View } from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Polygon,
  RadialGradient,
  Stop,
} from "react-native-svg";

import { TIER_BY_ID } from "../core/ranks";
import type { TierId } from "../types";

interface Point {
  x: number;
  y: number;
}

function polar(cx: number, cy: number, radius: number, angle: number): Point {
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
}

function pointsFor(cx: number, cy: number, radius: number, sides: number, rotation: number): Point[] {
  const step = (Math.PI * 2) / sides;
  return Array.from({ length: sides }, (_, index) => polar(cx, cy, radius, rotation + index * step));
}

function toPointsAttr(points: readonly Point[]): string {
  return points.map((point) => `${round(point.x)},${round(point.y)}`).join(" ");
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/** A single laurel branch, mirrored by the caller. */
function laurelPath(cx: number, cy: number, radius: number, direction: 1 | -1): string {
  const start = { x: cx + direction * radius * 0.82, y: cy + radius * 0.52 };
  const control = { x: cx + direction * radius * 1.24, y: cy - radius * 0.1 };
  const end = { x: cx + direction * radius * 0.7, y: cy - radius * 0.72 };
  return `M ${round(start.x)} ${round(start.y)} Q ${round(control.x)} ${round(control.y)} ${round(end.x)} ${round(end.y)}`;
}

function laurelLeaves(cx: number, cy: number, radius: number, direction: 1 | -1, count: number): string[] {
  const leaves: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const t = (i + 1) / (count + 1);
    const angle = Math.PI * (0.62 - t * 0.72) * direction;
    const anchor = polar(cx, cy, radius * 1.02, angle - Math.PI / 2 + (direction === 1 ? 0 : Math.PI));
    const tip = polar(cx, cy, radius * 1.3, angle - Math.PI / 2 + (direction === 1 ? 0 : Math.PI));
    const side = polar(cx, cy, radius * 1.16, angle - Math.PI / 2 + (direction === 1 ? 0.16 : Math.PI - 0.16));
    leaves.push(
      `M ${round(anchor.x)} ${round(anchor.y)} Q ${round(side.x)} ${round(side.y)} ${round(tip.x)} ${round(tip.y)} Q ${round(anchor.x + (side.x - anchor.x) * 0.2)} ${round(anchor.y + (side.y - anchor.y) * 1.2)} ${round(anchor.x)} ${round(anchor.y)} Z`,
    );
  }
  return leaves;
}

function wingPath(cx: number, cy: number, radius: number, direction: 1 | -1): string {
  const root = { x: cx + direction * radius * 0.78, y: cy - radius * 0.08 };
  const tip = { x: cx + direction * radius * 1.78, y: cy - radius * 0.62 };
  const trail = { x: cx + direction * radius * 1.32, y: cy + radius * 0.46 };
  return [
    `M ${round(root.x)} ${round(root.y)}`,
    `C ${round(root.x + direction * radius * 0.5)} ${round(root.y - radius * 0.62)} ${round(tip.x - direction * radius * 0.3)} ${round(tip.y - radius * 0.12)} ${round(tip.x)} ${round(tip.y)}`,
    `C ${round(tip.x - direction * radius * 0.16)} ${round(tip.y + radius * 0.5)} ${round(trail.x + direction * radius * 0.2)} ${round(trail.y - radius * 0.16)} ${round(trail.x)} ${round(trail.y)}`,
    `C ${round(trail.x - direction * radius * 0.3)} ${round(trail.y - radius * 0.2)} ${round(root.x + direction * radius * 0.24)} ${round(root.y + radius * 0.3)} ${round(root.x)} ${round(root.y)}`,
    "Z",
  ].join(" ");
}

function crownPath(cx: number, cy: number, radius: number): string {
  const width = radius * 1.12;
  const base = cy - radius * 0.94;
  const height = radius * 0.5;
  const left = cx - width / 2;
  const right = cx + width / 2;
  return [
    `M ${round(left)} ${round(base)}`,
    `L ${round(left + width * 0.16)} ${round(base - height * 0.78)}`,
    `L ${round(cx - width * 0.16)} ${round(base - height * 0.24)}`,
    `L ${round(cx)} ${round(base - height * 1.12)}`,
    `L ${round(cx + width * 0.16)} ${round(base - height * 0.24)}`,
    `L ${round(right - width * 0.16)} ${round(base - height * 0.78)}`,
    `L ${round(right)} ${round(base)}`,
    "Z",
  ].join(" ");
}

export interface RankBadgeProps {
  readonly tier: TierId;
  readonly size?: number;
  /** Dim the badge, used for tiers a player has not reached. */
  readonly muted?: boolean;
  /** Extra outer glow, used on the rank-drop reveal. */
  readonly glow?: boolean;
}

function RankBadgeComponent({ tier, size = 96, muted = false, glow = false }: RankBadgeProps) {
  const definition = TIER_BY_ID[tier];
  // Laurels, wings and a crown need room. Below list size they collapse into
  // fuzz, so the badge falls back to the gem and its ring - still distinct by
  // colour, facet count and silhouette.
  const simplified = size < 44;
  const geometry = useMemo(() => {
    const order = definition.order;
    const viewBox = 100;
    const cx = viewBox / 2;
    const cy = viewBox / 2 + (order >= 8 ? 3 : 0);
    const radius = order >= 7 ? 25 : 28;
    const sides = order <= 2 ? 6 : order <= 4 ? 8 : 10;
    const rotation = -Math.PI / 2 + (sides % 2 === 0 ? Math.PI / sides : 0);
    const outer = pointsFor(cx, cy, radius, sides, rotation);
    const inner = pointsFor(cx, cy, radius * 0.56, sides, rotation + Math.PI / sides);
    const ticks = 12 + order * 6;
    return { viewBox, cx, cy, radius, sides, outer, inner, ticks, order };
  }, [definition.order]);

  const { cx, cy, radius, outer, inner, ticks, order, viewBox } = geometry;
  const opacity = muted ? 0.35 : 1;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${viewBox} ${viewBox}`}>
        <Defs>
          <LinearGradient id={`gem-${tier}`} x1="0" y1="0" x2="0.6" y2="1">
            <Stop offset="0" stopColor={definition.accent} stopOpacity={0.95} />
            <Stop offset="1" stopColor={definition.color} stopOpacity={0.95} />
          </LinearGradient>
          <RadialGradient id={`halo-${tier}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0.55" stopColor={definition.color} stopOpacity={0.35} />
            <Stop offset="1" stopColor={definition.color} stopOpacity={0} />
          </RadialGradient>
        </Defs>

        <G opacity={opacity}>
          {glow ? <Circle cx={cx} cy={cy} r={radius * 1.9} fill={`url(#halo-${tier})`} /> : null}

          {/* Dial ring: the measurement instrument CLOSER is named after. */}
          <Circle
            cx={cx}
            cy={cy}
            r={radius * 1.42}
            fill="none"
            stroke={definition.color}
            strokeOpacity={0.35}
            strokeWidth={0.8}
          />
          {Array.from({ length: simplified ? 8 : ticks }, (_, index) => {
            const count = simplified ? 8 : ticks;
            const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
            const major = simplified || index % 3 === 0;
            const from = polar(cx, cy, radius * 1.42, angle);
            const to = polar(cx, cy, radius * (major ? 1.6 : 1.52), angle);
            return (
              <Line
                key={`tick-${index}`}
                x1={round(from.x)}
                y1={round(from.y)}
                x2={round(to.x)}
                y2={round(to.y)}
                stroke={definition.color}
                strokeOpacity={major ? 0.75 : 0.35}
                strokeWidth={major ? 1.1 : 0.6}
                strokeLinecap="round"
              />
            );
          })}

          {order >= 7 && !simplified
            ? ([1, -1] as const).map((direction) => (
                <Path
                  key={`wing-${direction}`}
                  d={wingPath(cx, cy, radius, direction)}
                  fill={definition.color}
                  fillOpacity={0.22}
                  stroke={definition.accent}
                  strokeOpacity={0.7}
                  strokeWidth={0.7}
                />
              ))
            : null}

          {order >= 5 && !simplified
            ? ([1, -1] as const).map((direction) => (
                <G key={`laurel-${direction}`}>
                  <Path
                    d={laurelPath(cx, cy, radius, direction)}
                    fill="none"
                    stroke={definition.accent}
                    strokeOpacity={0.75}
                    strokeWidth={1.1}
                    strokeLinecap="round"
                  />
                  {laurelLeaves(cx, cy, radius, direction, 4).map((leaf, index) => (
                    <Path
                      key={`leaf-${direction}-${index}`}
                      d={leaf}
                      fill={definition.accent}
                      fillOpacity={0.55}
                    />
                  ))}
                </G>
              ))
            : null}

          {order >= 8 && !simplified ? (
            <Path
              d={crownPath(cx, cy, radius)}
              fill={definition.accent}
              fillOpacity={0.9}
              stroke={definition.accent}
              strokeWidth={0.8}
              strokeLinejoin="round"
            />
          ) : null}

          {/* The gem itself. */}
          <Polygon
            points={toPointsAttr(outer)}
            fill={`url(#gem-${tier})`}
            stroke={definition.accent}
            strokeWidth={1.2}
            strokeLinejoin="round"
          />

          {/* Facets. Alternating opacity simulates a single light source from
              the upper left, which is what makes a flat polygon read as cut. */}
          {outer.map((point, index) => {
            const next = outer[(index + 1) % outer.length]!;
            const seat = inner[index % inner.length]!;
            return (
              <Polygon
                key={`facet-${index}`}
                points={toPointsAttr([point, next, seat])}
                fill={index % 2 === 0 ? "#FFFFFF" : "#000000"}
                fillOpacity={index % 2 === 0 ? 0.16 : 0.14}
              />
            );
          })}

          <Polygon
            points={toPointsAttr(inner)}
            fill={definition.accent}
            fillOpacity={0.28}
            stroke={definition.accent}
            strokeOpacity={0.5}
            strokeWidth={0.6}
          />

          {/* The bullseye at the centre of every tier. */}
          <Circle cx={cx} cy={cy} r={radius * 0.16} fill={definition.accent} />
          <Circle cx={cx} cy={cy} r={radius * 0.07} fill="#06121E" fillOpacity={0.75} />
        </G>
      </Svg>
    </View>
  );
}

export const RankBadge = memo(RankBadgeComponent);
