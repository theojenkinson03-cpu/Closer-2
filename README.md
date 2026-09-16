# CLOSER

A daily competitive estimation game. Seven questions, one ranked attempt, and a
result that is deliberately withheld until the field locks.

CLOSER does not score knowledge, it scores calibration. There is no multiple
choice and no right-or-wrong: you slide to a number and are paid for how close
you land, as a fraction of the range you were given. That normalisation is what
makes "how tall is Everest" comparable with "when was Magna Carta sealed".

The second half of the product is the wait. Finishing your seven does not tell
you how you did against anyone. At 12:00 UTC the field locks, every attempt is
scored against every other, and ranked points move. That gap is the point: it
turns a single morning habit into two daily touchpoints.

## Running it

```bash
npm install
npm start          # Expo dev server; press i, a, or w
npm test           # 137 unit tests, no framework, ~50ms
npm run typecheck  # tsc --noEmit, strict
npm run assets     # regenerate the app icons from tools/generate-assets.mjs
```

Runs in plain Expo Go - there is no custom development client to build, because
nothing here depends on a native module outside the Expo SDK.

## How it is put together

Three layers, and the boundaries are enforced rather than aspirational.

**`src/core` - pure logic.** No React, no React Native, no platform API, no
I/O. Scoring, the rank engine, game-day arithmetic, formatting, seeded
randomness and the share card all live here. This is where every test points,
which is why the suite runs in milliseconds under plain Node with no simulator.

The scoring curve is `1000 · e^(-4.8 · normalisedError)`. Exponential decay
keeps the resolution where players actually land: two guesses that are both
"about right" still separate cleanly, while everything past a quarter of the
range collapses towards zero, where the difference between wrong and very wrong
does not deserve points. Ranges are allowed to run backwards - a BCE question
slides from 1200 BCE down to 200 BCE - and the span is taken as a magnitude, so
a reversed range scores identically to its ascending twin.

Ranked points move the way a chess rating moves. You are not paid for your raw
score, you are paid for beating the field you were *expected* to beat, with the
K-factor decaying across three calibration phases (provisional, learning,
stable). Without that normalisation an expanding player base quietly inflates
everyone's rating. Promotion grants a one-day demotion shield, which removes the
promote/demote flicker that makes ranked systems feel arbitrary.

**`src/services` - the backend seam.** Every service is an async function with
the signature a real endpoint would have, and `DEMO_DATA = true` in
`config.ts` marks the whole folder as the thing to replace. Three rules a
client must never be trusted with are enforced here, written as a real API would
write them: one ranked attempt per day, answers immutable once locked, and
scores computed from the stored question rather than supplied by the caller. The
UI can ask to lock a value; it cannot assert a score. See
[docs/BACKEND.md](docs/BACKEND.md) for the endpoint-by-endpoint swap.

Attempts, ratings and results are written through to `AsyncStorage` on every
mutation, so an attempt survives the app being killed mid-set. Storage is
resolved lazily behind a try/catch and degrades to memory, which is also how the
Node test runner exercises the same code.

**`src/components`, `src/screens`, `src/state` - the app.** Navigation is a
state machine, not a router: `NOT_STARTED → IN_PROGRESS → SUBMITTED →
AWAITING_RANK → RANK_READY → RANK_SEEN`. Which screen shows is a pure function
of that phase, rebuilt from stored state on every launch, so a cold start lands
a player exactly where they left off and no back gesture can reach a state the
server would not recognise.

The tier badges are computed SVG geometry rather than shipped images - eight
silhouettes that escalate from a plain gem through laurels and wings to a crown,
all polar maths, so they are resolution-independent and animate without swapping
assets. The slider is PanResponder: one finger, one axis, no competing gestures,
no native module. Because a 390px track cannot resolve one metre out of five
thousand, the drag gets you close and nudge buttons close the last step.

## What is real and what is not

Real: the scoring and rank engines, the daily set selection with full
repeat-protection cycling, one-attempt-per-day enforcement, answer immutability,
persistence across restarts, the rank-drop schedule, local notifications, and
every screen.

Simulated: the opposition. `src/services/field.ts` generates the day's field
from a per-day seed - its size, its score distribution and the RP it holds - so
placements and leaderboards are stable and plausible but not other people.
Identity is a locally generated id, which keeps one device's progress intact and
is deliberately not an account: nothing restores to a new phone. The profile
screen says so in the app rather than implying otherwise.

## Verification

- `npm test` - 137 tests over the pure layer and the services, including the
  reversed-range case, the demotion shield, cycle-boundary repeat protection,
  answer immutability, and idempotent rank drops.
- `npm run typecheck` - strict, with `noUncheckedIndexedAccess`.
- The full flow has been driven end to end in a browser against the real web
  bundle: start, seven locks with reveals, the day card, the rank drop, and all
  four tabs, with no console errors.

## Next

[docs/STORE_CHECKLIST.md](docs/STORE_CHECKLIST.md) tracks what remains before a
store submission, and what is already in place.
