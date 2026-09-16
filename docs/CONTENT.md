# Writing questions

The question bank is `src/services/questionBank.ts`. It is typed, so a bad
question fails `npm run typecheck`, and tested, so a question whose answer sits
outside its own range fails `npm test`.

## What makes a good CLOSER question

**A number with a single defensible value.** Not "how many plays did
Shakespeare write" (37, 38 or 39 depending on who is counting) but "how many
letters are in the Greek alphabet". If experts disagree, the question is
unusable no matter how interesting it is.

**Stable.** Heights, distances, dates and counts that do not move between the
day the question is written and the day it is served. Where a value does drift -
populations, prices, site counts - the prompt names the year and `verifiedAt`
stamps the check.

**A range that makes the guess interesting.** The range is the difficulty dial,
because scoring is normalised by span. Too wide and everyone lands in the same
band; too narrow and precision is luck. Aim for a span where a well-informed
guess lands inside 5% and a wild one does not.

**A range that does not give the answer away.** A range of 1-100 for an answer
of 50 hands out a free bullseye to anyone who leaves the slider alone, since the
slider opens at the midpoint. Offset the answer from the centre.

## The fields

```ts
{
  id: "geo-everest",              // stable, kebab-case, prefixed by category
  prompt: "How tall is Mount Everest?",
  subtitle: "Height above sea level",  // optional clarifier
  category: "geography",
  unit: M,                        // reuse a unit constant; add one if needed
  answer: 8849,
  range: [5000, 10000],           // may run backwards for BCE questions
  step: 1,                        // slider granularity
  difficulty: 1,                  // 1 easiest, 5 hardest; orders the daily set
  source: "Nepal-China joint survey, 2020",
  verifiedAt: "2026-02-01",
}
```

`range` may descend. A BCE question runs `[1200, 200]` so that further right
means later, and the scoring engine takes the span as a magnitude - a reversed
range scores identically to its ascending twin. There is a test for exactly
this.

`step` must leave at least ten positions on the slider; a test enforces it.

## How selection works

The bank is shuffled once per cycle and dealt seven a day, so no question can
reappear until the entire bank has been used. The shuffle is re-seeded each
cycle, so the same seven never travel together twice, and the first day of a
cycle additionally avoids anything served on the last day of the previous one.
Selection is a pure function of the date key, so every player worldwide gets
byte-identical questions and any past day can be rebuilt exactly.

Adding questions lengthens the cycle automatically: `cycleLengthDays()` is
`floor(bankSize / 7)`. At 77 questions that is 11 days.

Each day is sorted easiest-first, so a set opens with something a player can
land and closes with one that separates the field.

## Before committing a batch

```bash
npm test        # range containment, step resolution, sources, cycle integrity
npm run typecheck
```

The tests will not tell you whether a fact is *true*. Cite a primary source in
`source` - a survey, an official body, a company filing - and date the check.
Anything sourced to general recollection does not belong in a ranked game.
