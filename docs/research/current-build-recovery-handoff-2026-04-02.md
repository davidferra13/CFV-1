# Current Build Recovery Handoff

> **Date:** 2026-04-02
> **Status:** historical reference; baseline recovered later on 2026-04-02
> **Purpose:** preserve the earlier recovery path that was needed while the repo-wide typecheck baseline was red.

---

## Executive Summary

This document is now historical context.

The repo-wide baseline described here was recovered later on `2026-04-02`. Use `docs/build-state.md` as the current authority. Only fall back to this document if the baseline regresses again and the newer build-state entries are unavailable or contradictory.

## Superseded Current Path

Do not use the recovery sequence below for normal survey execution while `docs/build-state.md` is green.

The current ordered builder path is:

1. `docs/build-state.md`
2. `docs/research/current-builder-start-handoff-2026-04-02.md`
3. `docs/specs/survey-wave-1-internal-launch-builder-handoff-2026-04-02.md`
4. `docs/specs/p0-survey-passive-voluntary-deploy-verification.md`
5. `docs/specs/p1-survey-public-hardening-and-results-scale.md`

This document remains valuable only as a regression playbook if the repo-wide build baseline turns red again.

### What ultimately fixed the baseline

The final green baseline came from two concrete changes, not from repairing `lib/db/migrations/schema.ts` directly:

- `lib/db/migrations` was kept out of the app/build tsconfig surfaces, so generated migration artifacts no longer contaminate `npm run typecheck:app` or the production build tsconfig.
- active/public survey-definition reads were moved onto cached read paths, which stopped public survey static generation from exhausting DB clients during `npm run build -- --no-lint`.

If this baseline regresses again, inspect those two surfaces first before reopening the original blocker sequence below.

---

## Original Blockers At Time Of Failure

### 1. TypeScript baseline was red

- `npm run typecheck:app` fails in `lib/db/migrations/schema.ts`
- earliest failing lines include:
  - `1551`
  - `1586`
  - `1789`
  - `1904`
  - `2601`
  - `2740`
  - `24773`
- dominant error pattern:
  - `TS1127: Invalid character`
  - `TS1002: Unterminated string literal`
  - cascading parse failures after those malformed generated expressions

Observed examples include generated defaults such as:

- `encode(extensions.gen_random_bytes(32), \'hex\'::text)`

This file has already shown churn in git history:

- `377d241e` - `fix: repair 60 syntax errors in auto-generated Drizzle schema`
- `4e3423eb` - `chore: drizzle schema sync + server action improvements across modules`

This is a workflow instability, not a one-off typo.

### 2. Build-state and session narrative were stale

- `docs/build-state.md` previously still reported `4743f418` as green
- `docs/session-log.md` contains many later entries that inherited that green state without rerunning full gates
- the survey readiness pass explicitly noted `targeted lint only, no full tsc or next build`

So the repo's written state and the repo's executable state diverged.

### 3. Post-event survey / feedback ownership was and remains fragmented

The repo currently has overlapping systems across different tables and routes:

- `event_surveys` backing `/survey/[token]`
- `post_event_surveys` backing `/feedback/[token]`
- `event_feedback`
- `surveys`
- `user_feedback`

This matters because any builder touching surveys, reviews, or trust features can easily reinforce the wrong system if they start from UI names alone.

### 4. Runtime issues already existed even before new work

Observed in the current dev server log:

- dashboard query failure: `column "first_name" does not exist`
- repeated compat warnings: `Unmapped filter operator: not.eq`
- repeated realtime presence `403`s
- `/api/ai/health` returning `401`
- Next warning that `serverActions` is an invalid `next.config.js` key

### 5. OpenClaw operational artifacts were present in the repo

Sensitive local artifacts exist under `.openclaw-deploy/`, including captured remote session material and raw captured responses. Treat these as operationally risky until explicitly cleaned up or quarantined.

---

## Original Recovery Sequence

Historical appendix only. Do not follow this sequence while the current build-state file still reports green.

This is the sequence the next builder should follow.

### Phase 0. Establish control of the environment

- Inspect active background dev and sync processes before starting new work.
- Do not assume `openclaw-watch.pid` is authoritative.
- Avoid launching another builder or feature branch flow on top of the current noisy environment.

Exit condition:

- the builder knows which app server, sync process, and watcher are actually live

### Phase 1. Repair or formally re-scope `lib/db/migrations/schema.ts`

This is the immediate blocker.

The builder must determine which of these is true:

- the file is a tracked source artifact that must be regenerated cleanly
- the file is correct in intent but was corrupted by escaping or generation drift
- the file should not be in the `tsconfig.ci.json` app gate at all

Do not guess.

The builder must inspect:

- the generator path that produces this file
- the relationship between `lib/db/migrations/schema.ts` and any canonical schema source
- the most recent commits touching the file

Exit condition:

- `npm run typecheck:app` exits `0`

### Phase 2. Re-run the real build gate

Only after Phase 1 passes:

- run the full production build gate
- update `docs/build-state.md` only with fresh evidence from the current checkout

Exit condition:

- `next build --no-lint` exits `0`

### Phase 3. Re-check current runtime regressions

Before feature work resumes, validate the currently observed runtime problems:

- dashboard `first_name` query error
- `not.eq` compat warnings
- realtime presence `403`s
- AI health auth expectations
- `next.config.js` invalid-key warning and dev-origin behavior

Not all of these must be fixed in the same slice, but they must be triaged and classified as:

- blocker
- acceptable known issue
- separate follow-up

Exit condition:

- the builder has an explicit, written classification for each runtime issue

### Phase 4. Resume the product queue in dependency order

Only after the baseline is green again, the next builder should resume this order:

1. deploy and verify the existing public survey path from the `docs/research/current-builder-start-handoff-2026-04-02.md` -> `docs/specs/survey-wave-1-internal-launch-builder-handoff-2026-04-02.md` chain
2. execute `docs/specs/p0-survey-passive-voluntary-deploy-verification.md`
3. execute `docs/specs/p1-survey-public-hardening-and-results-scale.md`
4. verify `docs/specs/featured-chef-public-proof-and-booking.md`
5. verify `docs/specs/public-chef-credentials-showcase.md`
6. only then begin `docs/specs/post-event-trust-loop-consolidation.md`

Why this order:

- the baseline must be trustworthy first
- the current public survey path is already the closest thing to a canonical intake surface
- the trust-loop consolidation spec assumes stable public-proof destinations and a clearer survey ownership model

---

## What The Next Builder Must Not Do

- do not start a new feature spec while `npm run typecheck:app` is red
- do not trust `docs/build-state.md` history rows without rerunning the gates on the current checkout
- do not choose a survey system by route name alone
- do not expand the feature registry or architecture inventory as a substitute for runtime verification
- do not treat `.openclaw-deploy` artifacts as normal product files

---

## Quick File Map For Recovery

Use these files first.

### Baseline truth

- `docs/build-state.md`
- `docs/session-log.md`
- `tsconfig.ci.json`
- `package.json`

### Immediate blocker

- `lib/db/migrations/schema.ts`

### Survey / feedback ownership

- `lib/surveys/actions.ts`
- `lib/feedback/surveys-actions.ts`
- `lib/feedback/surveys.ts`
- `lib/feedback/feedback-actions.ts`
- `lib/feedback/actions.ts`
- `app/(chef)/feedback/page.tsx`
- `app/(chef)/surveys/page.tsx`
- `app/(public)/feedback/[token]/page.tsx`
- `app/(client)/survey/[token]/page.tsx`

### Current survey launch path

- `database/migrations/20260402000118_market_research_public_surveys.sql`
- `app/beta-survey/public/[slug]/page.tsx`
- `components/beta-survey/beta-survey-form.tsx`
- `lib/beta-survey/actions.ts`
- `app/(admin)/admin/beta-surveys/[id]/results-client.tsx`

### OpenClaw runtime dependencies

- `lib/openclaw/catalog-actions.ts`
- `lib/openclaw/sync.ts`
- `lib/openclaw/vendor-import-actions.ts`
- `.openclaw-deploy/logs/pull.log`

---

## Completion Condition

This recovery handoff is complete when:

- the repo's written build state matches the repo's actual build state
- the next builder can start from a green baseline
- the next product slice begins from the ordered queue above instead of from stale assumptions
