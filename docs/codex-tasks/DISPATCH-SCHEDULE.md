# Codex Dispatch Schedule - May 5, 2026

> Codex resets at 11:50 AM. Dispatch immediately after.

## Batch 1 (11:50 AM - Parallel, no file overlap)

| Task                       | Slug | Domain                        | Collision risk                   |
| -------------------------- | ---- | ----------------------------- | -------------------------------- |
| Server action hardening    | 005  | `lib/**/actions.ts` only      | None with 004 (004 is app/ only) |
| Empty/error/loading states | 004  | `app/(chef)/**/page.tsx` only | None with 005 (005 is lib/ only) |

These two are perfectly parallel: one touches only lib/, the other only app/.

## Batch 2 (after Batch 1 merges)

| Task                     | Slug | Domain                                                                           | Why sequential                                    |
| ------------------------ | ---- | -------------------------------------------------------------------------------- | ------------------------------------------------- |
| Security MFA integration | 001  | `lib/security/`, `lib/mfa/`, `lib/phone/`, `app/auth/`, `app/settings/security/` | Touches both lib/ and app/; must wait for 004+005 |

## Batch 3 (after Batch 2 merges)

| Task                | Slug | Domain                   | Why sequential                             |
| ------------------- | ---- | ------------------------ | ------------------------------------------ |
| Settings page audit | 002  | `app/(chef)/settings/**` | Overlaps with 001's settings/security page |

## Batch 4 (if time allows)

| Task                           | Slug | Domain                                   |
| ------------------------------ | ---- | ---------------------------------------- |
| Test coverage for core actions | 003  | `tests/` only (read-only access to lib/) |

Task 003 can technically run anytime since it only creates files in tests/. But it benefits from running AFTER 005 (hardened actions are more testable). Schedule last.

## Opus Time Budget for May 5

| Activity                         | Estimated time | When     |
| -------------------------------- | -------------- | -------- |
| Morning context load + dispatch  | 10 min         | 11:50 AM |
| Review Batch 1 (two diffs)       | 15 min         | ~1:00 PM |
| Dispatch Batch 2                 | 5 min          | ~1:20 PM |
| Review Batch 2                   | 10 min         | ~2:30 PM |
| Dispatch Batch 3                 | 5 min          | ~2:45 PM |
| Review Batch 3                   | 10 min         | ~4:00 PM |
| Dispatch Batch 4                 | 5 min          | ~4:15 PM |
| End-of-day review + merge + push | 15 min         | ~5:30 PM |
| **Total Opus time**              | **~75 min**    |          |

Compare to current: Opus doing all this work directly would take 4-6 hours of premium tokens.

## What Opus Does While Codex Runs

Between dispatches, Opus should NOT idle on implementation. Options:

- Write specs for next week's Codex tasks
- Review and update product blueprint progress
- Plan the validation push (real user testing, not code)
- Write task briefs for Batch 5-10 (pipeline never runs dry)
- Nothing (save tokens)
