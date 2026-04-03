# Spec: Finance Root Canonicalization

> **Status:** ready
> **Priority:** P1
> **Depends on:** `p1-dead-zone-gating-and-surface-honesty.md`
> **Estimated complexity:** medium-large (9+ files)

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event                 | Date                 | Agent/Session   | Commit |
| --------------------- | -------------------- | --------------- | ------ |
| Created               | 2026-04-03 04:33 EDT | Planner (Codex) |        |
| Status: ready         | 2026-04-03 04:33 EDT | Planner (Codex) |        |
| Claimed (in-progress) |                      |                 |        |
| Spike completed       |                      |                 |        |
| Pre-flight passed     |                      |                 |        |
| Build completed       |                      |                 |        |
| Type check passed     |                      |                 |        |
| Build check passed    |                      |                 |        |
| Playwright verified   |                      |                 |        |
| Status: verified      |                      |                 |        |

---

## Developer Notes

_This section preserves the developer's original conversation and intent. It is MANDATORY. A spec without Developer Notes is incomplete. A builder reading a spec without this section is building blind._

### Raw Signal

- Proceed with the most intelligent decisions on my behalf, in the correct order.
- Fully understand the current system, constraints, and context before taking action.
- Bring everything to a clear, structured, and complete state so the builder agent has full context and can execute cleanly, in order.
- The phase-shift audit already identified finance redundancy clearly: `/finance` and `/financials` both exist as discoverable money hubs.
- The goal is not more feature sprawl. It is consolidation, clearer ownership, and fewer duplicate entry surfaces.
- The builder needs a clean route truth, not another vague memo saying finance is "overlapping."

### Developer Intent

- **Core goal:** make `/finance` the single canonical chef finance entry root while preserving real finance capabilities and avoiding a breaking removal of the older `/financials` workspace.
- **Key constraints:** do not widen this into tax/export/accounting redesign, do not break standalone operational routes like `/expenses`, do not delete the legacy workspace before its unique sections are deliberately handled, and do not reintroduce the dead-zone finance tiles that already need gating.
- **Motivation:** duplicate money hubs fragment navigation truth, split revalidation and AI route knowledge, and make the product feel less coherent than it really is.
- **Success from the developer's perspective:** every primary finance entry path now resolves to `/finance`, the old `/financials` route is clearly demoted to compatibility status instead of pretending to be an equal root, and builders can tell the difference between the finance root, the legacy financials workspace, the standalone expenses tracker, and the finance category views.

---

## What This Does (Plain English)

This spec makes `/finance` the only primary chef finance entry surface. After it is built, sidebar/top-level finance navigation, dashboard cards, command surfaces, Remy route suggestions, queue links, and revenue-goal prompts all point to `/finance`. The old `/financials` page stays alive temporarily as a compatibility workspace because it still contains unique reporting/export content, but it is no longer treated as the canonical money home. This spec also locks an important distinction that must not be flattened: `/expenses` remains the standalone operational expense tracker, while `/finance/expenses` remains the finance-side category breakdown hub.

---

## Why It Matters

Right now the repo has two discoverable finance roots with overlapping language and mixed child-route expectations. `/finance` owns the main child route family and most finance back-links. `/financials` still owns the top-level nav destination, action-bar destination, dashboard money shortcuts, several AI route suggestions, and multiple revalidation targets. That split creates avoidable mental overhead for chefs and avoidable implementation drift for builders.

---

## Current State (What Already Exists)

### Verified route overlap

- `route-discoverability-report.md` marks both `/finance` and `/financials` as discoverable.
- `components/navigation/nav-config.tsx` still uses `/financials` as the top-level `Finance` destination.
- `lib/keyboard/shortcuts.ts` already uses `/finance` for the `g, f` keyboard shortcut.
- `app/(chef)/finance/page.tsx` still advertises `/financials` as `Full Financial Dashboard`.
- Dashboard money surfaces such as hero metrics and the command center still point to `/financials`.

### Verified compatibility obligations

- `/financials` is not just a dead alias. It still renders a large `FinancialsClient` workspace with:
  - summary cards
  - monthly overview
  - revenue-goal summary
  - per-event breakdown
  - market/classes income section
  - ledger-entry table
  - export buttons
- That means this slice must not replace `/financials` with a blind redirect yet.

### Important distinction: finance root vs expenses root

- `/expenses` is a standalone operational expense tracker with:
  - receipt scanning
  - `Add Expense`
  - grouped expense list
  - event-linked expense rows
  - top-level discoverability
- `/finance/expenses` is a finance-side category hub with section cards like `Food & Ingredients`, `Labor`, and `Travel`.
- These are related but not the same job. This spec consolidates the finance root, not the expense model.

### Important distinction: this does not replace tax/export truth work

- The CPA-ready tax/export spec already treats accountant export truth as its own lane.
- This spec must not re-solve `event_financial_summary`, year-end export truth, or tax-package drift.

---

## Files to Create

None.

---

## Files to Modify

| File                                                                       | What to Change                                                                                                                                                                          |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(chef)/finance/page.tsx`                                              | Remove the parallel `Full Financial Dashboard` positioning and treat `/finance` as the canonical finance home.                                                                          |
| `app/(chef)/financials/page.tsx`                                           | Keep the route alive, but add a clear compatibility/legacy notice that points users back to `/finance` as the primary home. Do not present it like an equal canonical root.             |
| `app/(chef)/financials/loading.tsx`                                        | Align the loading state with the compatibility status of the route. It should not imply a primary hub if the page is now legacy-only.                                                   |
| `components/navigation/nav-config.tsx`                                     | Repoint every root-level `Finance` or `Money` destination from `/financials` to `/finance` while preserving the existing `/expenses` vs `/finance/expenses` distinction in child links. |
| `components/dashboard/command-center.tsx`                                  | Repoint the `Money` card to `/finance`. Keep `Expenses` linked to `/expenses`.                                                                                                          |
| `app/(chef)/dashboard/_sections/hero-metrics.tsx`                          | Repoint finance-related hero links to `/finance`.                                                                                                                                       |
| `lib/revenue-goals/engine.ts`                                              | Repoint revenue-goal CTA destinations that still send chefs to `/financials`.                                                                                                           |
| `lib/queue/providers/financial.ts`                                         | Repoint financial queue item destinations that still use `/financials`.                                                                                                                 |
| `lib/ai/command-intent-parser.ts`                                          | Make the canonical parsed finance destination `/finance`, not `/financials`.                                                                                                            |
| `lib/ai/remy-actions.ts`                                                   | Update documented route suggestions so chef money help points to `/finance`.                                                                                                            |
| `lib/ai/remy-activity-tracker.ts`                                          | Make route-name labeling treat `/finance` as the canonical money root; keep `/financials` as a legacy alias only if still needed.                                                       |
| `lib/ai/remy-starters.ts`                                                  | Repoint starter surfacing logic away from `/financials` as the primary home.                                                                                                            |
| `app/api/remy/stream/route-prompt-utils.ts`                                | Update route lists and finance-home prompt text to use `/finance` as the canonical root.                                                                                                |
| `app/api/remy/stream/route-instant-answers.ts`                             | Repoint generated finance suggestions from `/financials` to `/finance`.                                                                                                                 |
| `lib/help/page-info-sections/06-chef-portal-finance.ts`                    | Rewrite the help metadata so `/finance` is the primary entrypoint and `/financials` is explicitly described as legacy or compatibility-only.                                            |
| `lib/auth/route-policy.ts`                                                 | Keep `/financials` protected while it still exists, but treat `/finance` as the canonical active root.                                                                                  |
| `lib/expenses/actions.ts`                                                  | Revalidate `/finance` anywhere finance-root freshness matters; keep `/financials` revalidation only while the compatibility page still shows live summary data.                         |
| `lib/finance/expense-line-item-actions.ts`                                 | Same finance-entry revalidation alignment as above.                                                                                                                                     |
| `lib/calendar/entry-actions.ts`                                            | Same finance-entry revalidation alignment as above.                                                                                                                                     |
| `lib/events/historical-import-actions.ts`                                  | Same finance-entry revalidation alignment as above.                                                                                                                                     |
| `lib/receipts/actions.ts`                                                  | Same finance-entry revalidation alignment as above.                                                                                                                                     |
| `lib/vendors/document-intake-actions.ts`                                   | Same finance-entry revalidation alignment as above.                                                                                                                                     |
| `docs/app-complete-audit.md`                                               | Update the finance sections so the canonical root is `/finance`, not a split `/finance` vs `/financials` story.                                                                         |
| `docs/research/foundations/2026-04-03-system-improvement-control-tower.md` | Add this as the finance-specific consolidation slice under the redundancy lane.                                                                                                         |

---

## Database Changes

None.

### New Tables

```sql
-- None
```

### New Columns on Existing Tables

```sql
-- None
```

### Migration Notes

- No schema work is part of this slice.
- Do not create feature flags, redirect tables, or finance config tables just to consolidate the route truth.

---

## Data Model

This is a route-ownership and surface-ownership correction, not a persistence change.

### Canonical route contract

- `canonicalFinanceRoot = '/finance'`
- `legacyFinancialsRoot = '/financials'`
- `operationalExpensesRoot = '/expenses'`
- `financeExpensesRoot = '/finance/expenses'`

### Meaning of each root

- `/finance`
  - the one canonical chef finance home
  - the destination for nav, dashboard, AI route suggestions, queue actions, and generic "go to finance" affordances
- `/financials`
  - temporary compatibility workspace only
  - allowed to stay live while it still contains unique sections
  - not allowed to remain a primary or equal money-home destination
- `/expenses`
  - the standalone operational expense tracker and entry flow
- `/finance/expenses`
  - the finance-side category breakdown hub

### Explicit invariants

- Do not rename or move the `/finance/*` child route family in this slice.
- Do not fold `/expenses` into `/finance/expenses`.
- Do not make `/financials` the canonical route again through any shortcut, nav, AI response, or queue link.

---

## Server Actions

No new server actions are required.

| Function / Surface                                    | Current Problem                                          | Required Change                                                                                |
| ----------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| existing mutations that revalidate only `/financials` | finance-root freshness is split across old and new roots | add `/finance` revalidation everywhere the canonical home depends on current financial summary |
| compatibility-period finance mutations                | `/financials` still renders live summary data today      | keep `/financials` revalidation only while the compatibility workspace still shows live data   |

Builder note:

- This spec does not require a shared helper, but if the builder sees repeated root revalidation drift, a tiny internal helper is acceptable.
- Do not widen that helper into a full routing abstraction layer.

---

## UI / Component Spec

### Page Layout

#### `/finance`

- Treat this as the only primary finance home.
- Remove or rewrite the `Also available: Full Financial Dashboard` line so it no longer presents `/financials` as a parallel canonical destination.
- The page can still expose deeper finance destinations like reporting, goals, ledger, tax, or payouts.
- If the dead-zone honesty spec has already landed, keep its bank-feed and cash-flow gating intact.

#### `/financials`

- Keep the route working for now.
- Add a clear compatibility message near the top:
  - finance now starts at `/finance`
  - this workspace remains available temporarily for deeper or legacy summary views
  - use `/finance` for the main hub
- Keep unique sections functional in this slice.
- Do not label the page like a peer root competing with `/finance`.

#### Navigation and command surfaces

- Sidebar/top-level `Finance` root points to `/finance`.
- Dashboard `Money` cards and hero metrics point to `/finance`.
- Remy, instant-answer suggestions, queue prompts, and goal prompts use `/finance` as the generic money destination.
- `Expenses` continues to point to `/expenses` where the job is tracking or entering expenses.

### States

- **Loading:** `/financials` loading may remain, but it must support a compatibility-state page rather than a primary-hub claim.
- **Empty:** if `/finance` has no financial data, it still remains the canonical home. Empty does not justify routing users back to `/financials`.
- **Error:** finance-root error states must still use `/finance` as the retry home.
- **Populated:** populated dashboard/report sections on `/financials` do not make it canonical; they only justify keeping the compatibility route alive until later migration.

### Interactions

- Clicking any generic `Finance` or `Money` root destination goes to `/finance`.
- Clicking `Expenses` from command surfaces still goes to `/expenses`.
- Direct visits or bookmarks to `/financials` still work and clearly signpost `/finance`.
- No newly written generic CTA should say `Financials` when it really means `Finance home`.

---

## Edge Cases and Error Handling

| Scenario                                                                            | Correct Behavior                                                                                              |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| A builder tries to replace `/financials` with an immediate redirect                 | Do not do that in this slice. The route still contains unique sections that are not yet fully redistributed.  |
| A builder points `Expenses` links to `/finance/expenses` everywhere                 | That is wrong. `/expenses` is still the operational tracker; `/finance/expenses` is the category hub.         |
| A builder updates nav but forgets Remy, queue, or goal links                        | Route truth stays fragmented. All generic finance ingress points must converge on `/finance`.                 |
| A builder updates `/finance` but leaves it advertising `/financials` as a peer root | That defeats the consolidation. `/financials` may remain reachable, but not as an equal home.                 |
| A mutation keeps revalidating only `/financials`                                    | The canonical finance home can go stale. Add `/finance` revalidation wherever finance-root freshness matters. |
| The dead-zone spec has not landed yet                                               | Do not re-promote `bank-feed` or `cash-flow` while consolidating roots. Respect the dependency.               |

---

## Verification Steps

1. Sign in as a chef and use the main sidebar/top-level `Finance` link.
2. Verify: it opens `/finance`, not `/financials`.
3. Open the command center and click `Money`.
4. Verify: it opens `/finance`.
5. Open any dashboard finance hero/summary shortcut that previously targeted `/financials`.
6. Verify: it now opens `/finance`.
7. Use a finance-related Remy or command-palette prompt that should suggest a general money destination.
8. Verify: the suggestion is `/finance`.
9. Navigate directly to `/financials`.
10. Verify: the page still works, but clearly states that `/finance` is the primary finance home.
11. Navigate to `/expenses`.
12. Verify: the operational expense tracker still works with add/scan/list behavior intact.
13. Navigate to `/finance/expenses`.
14. Verify: the category-based expense hub still works and remains distinct from `/expenses`.
15. Trigger or simulate a finance-affecting mutation already covered by current actions, such as expense creation.
16. Verify: `/finance` reflects the change without relying only on `/financials` revalidation.

---

## Out of Scope

- Tax/export truth repair, CPA export convergence, or `event_financial_summary` correction.
- Rebuilding finance information architecture beyond the root-canonicalization problem.
- Redirecting or deleting `/financials` outright.
- Migrating every unique `/financials` widget into new dedicated routes.
- Reworking `/expenses`, `/receipts`, or `/finance/expenses` into one merged expense system.
- Renaming the `/finance/*` child route family.

---

## Notes for Builder Agent

1. **Canonical root is not the same thing as route deletion.** This slice picks `/finance` as the one true home, but it deliberately keeps `/financials` alive until its unique sections are handled on purpose.

2. **Do not flatten the expense distinction.** `/expenses` is the tracker and entry flow. `/finance/expenses` is the categorized finance hub. Keep both jobs legible.

3. **Respect the dead-zone dependency.** If `p1-dead-zone-gating-and-surface-honesty.md` has not landed, do not accidentally preserve or re-promote the broken bank-feed/cash-flow surfaces while cleaning up the route root.

4. **Do not reopen finance accounting architecture in this pass.** The CPA-ready export spec already owns the accounting-truth lane. This spec only fixes route truth and root discoverability.

5. **Primary ingress must change everywhere.** Navigation, dashboard cards, queue links, goal prompts, Remy prompt catalogs, route intent parsers, and help metadata all need the same answer to "where does finance start?"
