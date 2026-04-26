# Triage Handoff - 2026-04-26 (post-massive-win)

**Branch:** main
**Build health:** GREEN (tsc clean, 0 errors)
**Last 5 commits:**

- c303ddf08 refactor(brand): consolidate brand constants into single source of truth
- 7d7b75bb9 style(public): remove AI template patterns from landing and signin
- d5672d9bb feat(recipes): add confidence score to recipe list
- f6e86abba feat(culinary): add peak season produce nudge to menu sidebar
- 2ce4fc7d8 feat(recipes): add confidence score rings to recipe list

## Triage Results

| #   | Item                                      | Spec                                               | Label  | Status           |
| --- | ----------------------------------------- | -------------------------------------------------- | ------ | ---------------- |
| 1   | Wire real menu costs into service pricing | `docs/specs/build-menu-cost-to-service-pricing.md` | CLAUDE | queued           |
| 2   | Yield % UI input on recipe ingredients    | `docs/specs/build-yield-percent-ui.md`             | CODEX  | queued           |
| 3   | Shareable menu selection token            | `docs/specs/build-shareable-menu-selection.md`     | CLAUDE | queued (carried) |
| 4   | Client-facing group split page            | `docs/specs/build-group-split-page.md`             | CLAUDE | queued (carried) |
| 5   | Referral context badge on event detail    | `docs/specs/build-referral-context-badge.md`       | CODEX  | queued (carried) |

## What Changed This Session

- **Massive-win analysis completed (full /massive-win procedure).** Food costing connection scored 38/50, the highest-leverage single change identified. Full code-level infrastructure scan of the entire costing pipeline.
- **Key finding:** The 10-tier price resolution chain, recipe costing, and menu cost summaries all work. But `computePricing()` in `lib/pricing/compute.ts` uses hardcoded `$30-50/guest` (lines 746-753) instead of querying actual menu costs. Every quote is a guess. Connecting this one seam makes the entire price intelligence infrastructure earn its keep.
- **Runner-up (yield UI, scored 29/50):** `recipe_ingredients.yield_pct` column exists, `suggestYieldByName()` is built, but no UI writes to it. Costs assume zero waste, underestimating by 10-40%.
- **Session 2 pipeline analysis noted:** Pipeline generalization and Codex branch watcher specs were written (`docs/specs/build-pipeline-generalization.md`, `docs/specs/build-codex-branch-watcher.md`). Valid infrastructure work but de-prioritized below revenue-critical food costing items.

## Decisions Made

- **Items #1 and #2 are NEW from massive-win analysis.** They displace pipeline generalization and Codex watcher because: revenue-critical beats infrastructure-critical. David called pricing "utter dog shit." The costing connection directly determines profit on every event. Pipeline generalization compounds builds; costing compounds money.
- **#2 (Yield UI) is CODEX:** one form field, one save path, schema column exists. Build before #1 so the numbers are accurate when they reach the quote.
- **#1 (Menu cost connection) is CLAUDE:** bridges two independent systems (service pricing + food costing). Requires judgment on fallback behavior, confidence display, chef-only visibility.
- **Megan stress test items (#3, #4) remain carried.** Still valid, still revenue-adjacent.

## Previous Triage Specs (Carried, Not Re-Listed)

- `docs/specs/build-pipeline-generalization.md` (CLAUDE, queued, from session 2)
- `docs/specs/build-codex-branch-watcher.md` (CLAUDE, queued, from session 2)
- `docs/specs/build-handle-availability-scanner.md` (CLAUDE, queued)
- `docs/specs/build-chefflow-platform-account.md` (CLAUDE, queued)
- `docs/specs/build-brand-constants-consolidation.md` (CODEX, **DONE**: c303ddf08)
- `docs/specs/build-social-profile-assets.md` (CODEX, queued)
- `docs/specs/build-brand-account-kit.md` (CLAUDE, queued)

## Blocked Items

- iOS mobile app: blocked on macOS hardware
- External account creation: blocked on manual human action (CAPTCHA, phone verification)

## Notes for Next Triage

- **Build #2 (yield UI) first if running Codex.** Small, independent, makes #1's numbers accurate.
- **Build #1 requires Claude.** Multi-file reasoning across `compute.ts`, quote form, proposal preview, money tab. Spec has exact line numbers.
- **Service pricing seam:** `lib/pricing/compute.ts` lines 746-753. Hardcoded `estimatedGroceryCents` with 3000/5000 cents per guest. This is the one thing to replace.
- Megan stress test: `docs/stress-tests/persona-megan-referral-bachelorette-2026-04-26.md`
- Pipeline generalization context: :3977 system is ~70% of vision. 74 build-queue items, 57 build plans. Mature infrastructure; generalization is additive.

## Handoff Prompts (Ready to Paste)

```
Read and execute docs/specs/build-menu-cost-to-service-pricing.md. Follow it exactly. Run all verification commands at the end. If verification fails after 2 attempts, git stash your changes and report what failed. Do not fix unrelated issues.
```

```
Read and execute docs/specs/build-yield-percent-ui.md. Follow it exactly. Run all verification commands at the end. If verification fails after 2 attempts, git stash your changes and report what failed. Do not fix unrelated issues.
```

```
Read and execute docs/specs/build-shareable-menu-selection.md. Follow it exactly. Run all verification commands at the end. If verification fails after 2 attempts, git stash your changes and report what failed. Do not fix unrelated issues.
```

```
Read and execute docs/specs/build-group-split-page.md. Follow it exactly. Run all verification commands at the end. If verification fails after 2 attempts, git stash your changes and report what failed. Do not fix unrelated issues.
```

```
Read and execute docs/specs/build-referral-context-badge.md. Follow it exactly. Run all verification commands at the end. If verification fails after 2 attempts, git stash your changes and report what failed. Do not fix unrelated issues.
```

## Cold-Start Prompt

Copy this into a fresh conversation to continue:

> Read docs/prompts/last-triage-handoff.md, then read and execute docs/prompts/triage-and-delegate.md. Previous triage context is in the handoff file. Do not re-derive what is already decided. Focus on: what changed since last triage, what completed, what is next.
