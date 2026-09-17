# Replacing the demo backend

Every service in `src/services` is written with the signature a real endpoint
would have, so going live is an implementation swap inside that folder. No
screen, hook or component imports a service's internals, and none of them
compute a score, decide a placement or decide what today's questions are.

Flip `DEMO_DATA` in `src/services/config.ts` to `false` and replace the bodies
below. The types in `src/types/index.ts` are the contract; keep them and the UI
does not change.

## Endpoint map

| Service call | Method | Endpoint | Notes |
| --- | --- | --- | --- |
| `getDailySet(dateKey)` | GET | `/daily/:dateKey` | Must **not** include `answer` before lock-in. Return `PublicQuestion[]`. |
| `startAttempt(userId, dateKey)` | POST | `/attempts` | Idempotent on `(userId, dateKey)`. Return the existing row if there is one. |
| `getAttempt(userId, dateKey)` | GET | `/attempts/:dateKey` | |
| `listAttempts(userId)` | GET | `/attempts` | Paginate; the stats screen reads at most a few weeks. |
| `lockAnswer(userId, dateKey, questionId, value)` | POST | `/attempts/:dateKey/answers` | Body is `{ questionId, value }` only. The server scores it. |
| `processRankDrop(userId, dateKey)` | POST | `/rank/drop/:dateKey` | Idempotent. Return `204` before `rankDropAt`. |
| `getRankState(userId)` | GET | `/rank` | |
| `getLeaderboard(userId, dateKey)` | GET | `/leaderboard/:dateKey` | Two queries: global top N, and a window around the caller. |
| `getPlayerStats(userId)` | GET | `/stats` | Can stay client-derived from attempts at first. |

## What has to move server-side, and why

**Question answers.** The demo ships the whole bank to the device because there
is nowhere else to put it. In production the answer column must never leave the
server before an answer is locked, or the game is trivially cheatable by anyone
willing to read a bundle.

**Scoring.** `lockAnswer` already refuses to accept a score from its caller and
derives everything from the stored question. Keep that property: the endpoint
takes a raw slider value and returns the breakdown.

**One attempt per day.** Enforce it with a unique constraint on
`(user_id, date_key)`, not application logic alone.

**Answer immutability.** Reject a second write for the same `question_id` on
the same attempt at the database level too. `AttemptError` already models this
as `ANSWER_LOCKED`; map the HTTP conflict onto it and the UI copy still works.

**Ordering.** `lockAnswer` rejects out-of-order answers (`OUT_OF_ORDER`). This
stops a client from previewing all seven prompts and answering the easy ones
first, which would break comparability across the field.

**The rank drop.** The demo processes it lazily on next open. In production run
it as a scheduled job at `rankDropAt`: score the whole field, compute
placements in one pass, then write each player's `RankResult`. The client call
becomes a read. The engine itself (`src/core/ranks.ts`) is already pure and can
be run unchanged on a server.

## Suggested schema

```sql
create table questions (
  id            text primary key,
  prompt        text not null,
  subtitle      text,
  category      text not null,
  unit          jsonb not null,
  answer        numeric not null,   -- never selected by client-facing queries
  range_start   numeric not null,
  range_end     numeric not null,   -- may be less than range_start
  step          numeric not null check (step > 0),
  difficulty    smallint not null check (difficulty between 1 and 5),
  source        text not null,
  verified_at   date not null,
  last_used_at  date
);

create table attempts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users (id),
  date_key     date not null,
  set_id       text not null,
  status       text not null,
  total_score  integer not null default 0,
  started_at   timestamptz not null default now(),
  submitted_at timestamptz,
  unique (user_id, date_key)
);

create table answers (
  attempt_id  uuid not null references attempts (id) on delete cascade,
  question_id text not null references questions (id),
  value       numeric not null,
  score       integer not null,
  delta       numeric not null,
  exactness   text not null,
  answered_at timestamptz not null default now(),
  primary key (attempt_id, question_id)
);

create table rank_states (
  user_id         uuid primary key references users (id),
  season_id       text not null,
  rp              integer not null,
  peak_rp         integer not null,
  games_played    integer not null default 0,
  streak          integer not null default 0,
  demotion_shield boolean not null default false
);

create table rank_results (
  user_id    uuid not null references users (id),
  date_key   date not null,
  rp_before  integer not null,
  rp_after   integer not null,
  field_rank integer not null,
  field_size integer not null,
  percentile smallint not null,
  primary key (user_id, date_key)
);
```

## Authentication

`src/services/authService.ts` is the seam. It currently mints a local id and
persists it, which is enough to keep one device's progress and deliberately not
enough to be an account. `signInWith(provider)` throws rather than silently
no-opping, so the gap is visible at the call site.

To make it real, implement `getSession` and `signInWith` against a provider and
return a server-issued `userId`. Everything else already takes `userId` as an
argument rather than reaching for a global, so nothing above that file changes.

Two constraints worth knowing before starting: Apple requires Sign in with Apple
to be offered if any other third-party sign-in is, and an anonymous-to-account
migration path is needed so the first week of a player's history is not thrown
away when they finally sign in.

## Notifications

`src/services/notifications.ts` schedules the rank-drop reminder locally, which
works because the reveal time is known in advance and needs no server. It does
depend on the player opening the app to schedule it.

A server push is the robust version: the scheduled drop job already knows every
player who submitted that day, so it can notify them with their result in the
payload. Keep the local schedule as the fallback for players who have not
granted push or are offline.
