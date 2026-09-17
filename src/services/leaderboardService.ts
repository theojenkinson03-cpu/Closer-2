/**
 * Leaderboards.
 *
 * DEMO_DATA: the board is generated from the same per-day seed as the field, so
 * the names above and below a player stay put between app launches. A real
 * implementation is two queries - the global top N, and a window around the
 * player's own row - which is exactly the shape returned here.
 */

import type { Leaderboard, LeaderboardEntry } from "../types";
import { tierForRp } from "../core/ranks";
import { getAttempt } from "./attemptService";
import { DEMO_DISPLAY_NAME, simulateLatency } from "./config";
import { fieldSizeFor, placementFor, syntheticPlayers, topScoresFor } from "./field";
import { getRankState } from "./rankService";

const TOP_COUNT = 10;
const AROUND_RADIUS = 3;

/** DEMO_DATA: local. Real implementation: GET /leaderboard/:dateKey */
export async function getLeaderboard(userId: string, dateKey: string): Promise<Leaderboard> {
  await simulateLatency();

  const fieldSize = fieldSizeFor(dateKey);
  const players = syntheticPlayers(dateKey, TOP_COUNT + AROUND_RADIUS * 2 + 4);
  const topScores = topScoresFor(dateKey, TOP_COUNT);

  const top: LeaderboardEntry[] = topScores.map((totalScore, index) => {
    const player = players[index]!;
    return {
      userId: player.userId,
      displayName: player.displayName,
      rank: index + 1,
      totalScore,
      rp: player.rp,
      tier: tierForRp(player.rp).id,
      isMe: false,
    };
  });

  const attempt = await getAttempt(userId, dateKey);
  if (!attempt || attempt.status === "IN_PROGRESS") {
    return { dateKey, fieldSize, top, around: [] };
  }

  const state = await getRankState(userId, dateKey);
  const placement = placementFor(dateKey, attempt.totalScore);
  const me: LeaderboardEntry = {
    userId,
    displayName: DEMO_DISPLAY_NAME,
    rank: placement.fieldRank,
    totalScore: attempt.totalScore,
    rp: state.rp,
    tier: state.tier,
    isMe: true,
  };

  // Neighbours are drawn from the same seeded pool, then nudged so their scores
  // bracket the player's own the way a real board would.
  const neighbours: LeaderboardEntry[] = [];
  for (let offset = -AROUND_RADIUS; offset <= AROUND_RADIUS; offset += 1) {
    if (offset === 0) {
      neighbours.push(me);
      continue;
    }
    const rank = placement.fieldRank + offset;
    if (rank < 1 || rank > fieldSize) continue;
    const player = players[(TOP_COUNT + offset + AROUND_RADIUS) % players.length]!;
    neighbours.push({
      userId: player.userId,
      displayName: player.displayName,
      rank,
      totalScore: Math.max(0, attempt.totalScore - offset * 7 - (offset > 0 ? 3 : -3)),
      rp: player.rp,
      tier: tierForRp(player.rp).id,
      isMe: false,
    });
  }

  return { dateKey, fieldSize, top, around: neighbours.sort((a, b) => a.rank - b.rank) };
}
