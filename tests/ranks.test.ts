import { assert, close, equal, isFalse, isTrue, suite, test } from "./harness";
import {
  actualFromPlacement,
  applyRankDelta,
  createRankState,
  divisionForRp,
  expectedAgainstField,
  expectedScore,
  kFactorFor,
  K_LEARNING,
  K_PROVISIONAL,
  K_STABLE,
  MAX_DAILY_SWING,
  nextTier,
  percentileFromPlacement,
  progressInTier,
  rankDelta,
  rankLabel,
  rpToNextTier,
  seasonReset,
  STARTING_RP,
  TIERS,
  tierForRp,
} from "../src/core/ranks";

const field = [900, 1100, 1300, 1500, 1700];

suite("ranks", () => {
  test("tier bands are contiguous and ordered", () => {
    for (let i = 1; i < TIERS.length; i += 1) {
      equal(TIERS[i]!.floor, TIERS[i - 1]!.ceiling, "a gap or overlap between tiers");
      equal(TIERS[i]!.order, TIERS[i - 1]!.order + 1);
    }
  });

  test("rp maps to the right tier", () => {
    equal(tierForRp(0).id, "SCOUT");
    equal(tierForRp(599).id, "SCOUT");
    equal(tierForRp(600).id, "SEEKER");
    equal(tierForRp(2400).id, "MASTER");
    equal(tierForRp(99999).id, "CHAMPION");
  });

  test("negative rp cannot fall out of the ladder", () => {
    equal(tierForRp(-500).id, "SCOUT");
  });

  test("divisions count down towards promotion", () => {
    equal(divisionForRp(0), 3);
    equal(divisionForRp(200), 2);
    equal(divisionForRp(400), 1);
    equal(divisionForRp(599), 1);
  });

  test("the top tier has no divisions", () => {
    equal(divisionForRp(4200), 0);
    equal(rankLabel(4200), "Champion");
  });

  test("rank labels read as tier plus numeral", () => {
    equal(rankLabel(1250), "Marksman III");
    equal(rankLabel(1700), "Marksman I");
  });

  test("progress through a tier is a zero to one fraction", () => {
    close(progressInTier(600), 0);
    close(progressInTier(900), 0.5);
    assert(progressInTier(1199) < 1, "progress stops short of the next floor");
  });

  test("rp to the next tier counts down", () => {
    equal(rpToNextTier(500), 100);
    equal(rpToNextTier(4300), 0, "champions have nowhere left to climb");
  });

  test("next tier walks up the ladder and stops at the top", () => {
    equal(nextTier("SCOUT")?.id, "SEEKER");
    equal(nextTier("CHAMPION"), undefined);
  });

  test("the k-factor decays in three phases", () => {
    equal(kFactorFor(0), K_PROVISIONAL);
    equal(kFactorFor(4), K_PROVISIONAL);
    equal(kFactorFor(5), K_LEARNING);
    equal(kFactorFor(19), K_LEARNING);
    equal(kFactorFor(20), K_STABLE);
    equal(kFactorFor(5000), K_STABLE);
  });

  test("equal ratings expect an even split", () => {
    close(expectedScore(1500, 1500), 0.5);
  });

  test("a higher rating expects to win more often", () => {
    assert(expectedScore(1900, 1500) > 0.9, "400 points is roughly ten to one");
    assert(expectedScore(1100, 1500) < 0.1);
  });

  test("expectation against an empty field is a draw", () => {
    close(expectedAgainstField(1500, []), 0.5);
  });

  test("placement converts to a zero to one performance", () => {
    equal(actualFromPlacement(1, 1001), 1);
    equal(actualFromPlacement(1001, 1001), 0);
    close(actualFromPlacement(501, 1001), 0.5);
  });

  test("a field of one is a draw", () => {
    equal(actualFromPlacement(1, 1), 0.5);
  });

  test("percentile reports the top slice", () => {
    equal(percentileFromPlacement(1, 10000), 1);
    equal(percentileFromPlacement(10000, 10000), 100);
    equal(percentileFromPlacement(400, 10000), 4);
  });

  test("beating expectation gains rp", () => {
    const delta = rankDelta({ rp: 1300, gamesPlayed: 50, actual: 0.95, field });
    assert(delta > 0, "a dominant day should pay");
  });

  test("losing to expectation costs rp", () => {
    const delta = rankDelta({ rp: 1700, gamesPlayed: 50, actual: 0.1, field });
    assert(delta < 0, "a poor day against a weaker field should cost");
  });

  test("a provisional player moves further than a settled one", () => {
    const provisional = rankDelta({ rp: 1300, gamesPlayed: 1, actual: 0.95, field });
    const settled = rankDelta({ rp: 1300, gamesPlayed: 400, actual: 0.95, field });
    assert(provisional > settled, "calibration should be fast then slow");
  });

  test("no single day can swing more than the cap", () => {
    const huge = rankDelta({ rp: 0, gamesPlayed: 0, actual: 1, field: [5000, 5000, 5000] });
    assert(Math.abs(huge) <= MAX_DAILY_SWING);
  });

  test("applying a delta moves tier and division", () => {
    const state = { ...createRankState("u", "S1"), rp: 580, gamesPlayed: 30 };
    const applied = applyRankDelta(state, 40);
    equal(applied.rpAfter, 620);
    equal(applied.tierAfter, "SEEKER");
    isTrue(applied.promoted);
    isFalse(applied.demoted);
  });

  test("promotion grants a shield", () => {
    const state = { ...createRankState("u", "S1"), rp: 580, gamesPlayed: 30 };
    const applied = applyRankDelta(state, 40);
    isTrue(applied.state.demotionShield);
  });

  test("the shield absorbs the first demotion and is then spent", () => {
    const promoted = applyRankDelta(
      { ...createRankState("u", "S1"), rp: 580, gamesPlayed: 30 },
      40,
    ).state;
    const shielded = applyRankDelta(promoted, -80);
    equal(shielded.rpAfter, 600, "clamped to the tier floor");
    isTrue(shielded.shielded);
    isFalse(shielded.state.demotionShield, "the shield is consumed");

    const unshielded = applyRankDelta(shielded.state, -80);
    equal(unshielded.rpAfter, 520);
    isTrue(unshielded.demoted);
  });

  test("rp can never go below zero", () => {
    const applied = applyRankDelta({ ...createRankState("u", "S1"), rp: 10 }, -500);
    equal(applied.rpAfter, 0);
    equal(applied.delta, -10, "the reported delta matches what actually moved");
  });

  test("peak rp only ever rises", () => {
    const up = applyRankDelta({ ...createRankState("u", "S1"), rp: 500, peakRp: 500 }, 100);
    equal(up.state.peakRp, 600);
    const down = applyRankDelta(up.state, -300);
    equal(down.state.peakRp, 600);
  });

  test("a played day extends the streak, a missed day restarts it", () => {
    const base = { ...createRankState("u", "S1"), streak: 6 };
    equal(applyRankDelta(base, 5, { playedPreviousDay: true }).state.streak, 7);
    equal(applyRankDelta(base, 5, { playedPreviousDay: false }).state.streak, 1);
  });

  test("a new player starts mid-Scout with no games played", () => {
    const state = createRankState("u", "S1");
    equal(state.rp, STARTING_RP);
    equal(state.gamesPlayed, 0);
    equal(state.tier, "SCOUT");
  });

  test("a season reset pulls ratings towards the middle", () => {
    const high = seasonReset({ ...createRankState("u", "S1"), rp: 4000 }, "S2");
    assert(high.rp < 4000 && high.rp > STARTING_RP, "compressed, not erased");
    equal(high.seasonId, "S2");
    equal(high.gamesPlayed, 0);
  });
});
