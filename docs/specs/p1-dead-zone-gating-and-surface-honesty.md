# Spec: Dead-Zone Gating and Surface Honesty

> **Status:** ready
> **Priority:** P1 (next up)
> **Depends on:** none
> **Estimated complexity:** medium (5-8 files)

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event                 | Date                 | Agent/Session   | Commit |
| --------------------- | -------------------- | --------------- | ------ |
| Created               | 2026-04-03 03:22 EDT | Planner (Codex) |        |
| Status: ready         | 2026-04-03 03:22 EDT | Planner (Codex) |        |
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
- The anti-clutter rule is already explicit: approved work includes verification, consolidation, bug fixes, and hiding or gating dead zones.
- The sanity check already named the problem clearly: some pages exist in the live product but do not actually work properly, including the new insurance claim form and the finance surfaces that collapse to unavailable states.
- The next move is not more speculative feature work. It is to stop exposing unfinished or misleading surfaces like they are active capabilities.

### Developer Intent

- **Core goal:** stop ChefFlow from presenting fake, broken, or prematurely surfaced pages as if they are trustworthy product capabilities.
- **Key constraints:** do not fabricate customer proof, do not turn honest placeholders into fake features, do not widen the scope into full finance or safety rebuilds, and do not confuse "temporarily hidden" with "deleted forever."
- **Motivation:** incomplete or deceptive surfaces damage trust faster than an honestly missing feature because they make the system feel unreliable and unfinished.
- **Success from the developer's perspective:** a builder can remove the fake or misleading exposure cleanly, keep honest placeholders honest, and leave the product in a state where users are no longer invited into pages that immediately confess they do not really work.

---

## What This Does (Plain English)

This spec hardens a small set of deceptive or prematurely surfaced routes so ChefFlow stops advertising them like finished capabilities. After this is built, the fake insurance-claim creation form is no longer presented as a saveable workflow, finance home pages stop promoting bank feed and cash flow as primary destinations until they are actually active and trustworthy, and the public customer-stories area remains an honest noindex placeholder instead of being mixed into the same cleanup bucket.

---

## Why It Matters

The current system audit allows consolidation, gating, and dead-zone cleanup before broad new feature expansion. A route that says "this will not save" or "not available at this time" after being presented as a real workflow is a trust regression, not harmless polish debt.

---

## Current State (What Already Exists)

### Verified dead or misleading exposure

- `/safety/claims/new` is a hidden nav route and an in-page CTA target from `/safety/claims`, but the page itself renders a full input form and then states that persistence is not available and nothing will be saved.
- `/finance/bank-feed` is described in the audit as a bank feed panel plus manual transaction form, and it is surfaced from finance landing pages, but the live sanity check reported it as a route that always falls back to "not available."
- `/finance/cash-flow` is surfaced from finance landing pages, but the live sanity check reported it as a route that always falls back to "not available."

### Important distinction: not every thin surface is a dead zone

- `/customers` is externally discoverable, but it is intentionally noindex and explicitly states that ChefFlow has not published customer stories yet.
- `lib/marketing/customer-stories.ts` keeps `CUSTOMER_STORIES` empty until there are verified, approved, real stories.
- That means `/customers` is an honest trust-preserving placeholder, not the same class of problem as a fake save flow.

### Important distinction: some "unavailable" surfaces are really reliability problems

- `getCashFlowForecast()` currently queries `events` and `expenses` with `chef_id`, while the main tables are keyed by `tenant_id`.
- That makes `/finance/cash-flow` look less like an intentional placeholder and more like a broken route that should stop being promoted until repaired.

---

## Files to Create

| File                                  | Purpose                                                                                             |
| ------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `lib/finance/surface-availability.ts` | Central read-only helper that decides when finance surfaces are honest enough to surface primarily. |

---

## Files to Modify

| File                                                                       | What to Change                                                                                                                                   |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `app/(chef)/safety/claims/new/page.tsx`                                    | Remove the fake save-looking form. Replace it with a redirect or non-deceptive unavailable route behavior.                                       |
| `app/(chef)/safety/claims/page.tsx`                                        | Remove `New Claim` primary actions and rewrite the page as a read-only claims archive / documents surface until real claim creation exists.      |
| `app/(chef)/finance/page.tsx`                                              | Stop surfacing Bank Feed and Cash Flow as primary finance tiles unless the new availability helper says the surface is active enough to promote. |
| `app/(chef)/financials/page.tsx`                                           | Apply the same finance-surface gating logic to the alternate financial hub.                                                                      |
| `app/(chef)/finance/bank-feed/page.tsx`                                    | Downgrade the empty state copy from an automatic-capability promise to an honest secondary/manual reconciliation state.                          |
| `app/(chef)/finance/cash-flow/page.tsx`                                    | Keep the route honest when forecast data fails, and align its degraded state with the new gating rules so it is not promoted prematurely.        |
| `docs/app-complete-audit.md`                                               | Update the audit notes so these surfaces are no longer described like primary active destinations after the gating pass lands.                   |
| `docs/research/foundations/2026-04-03-system-improvement-control-tower.md` | Mark the dead-zone cleanup lane as ready-spec and point builders at this file instead of telling them to invent a new cleanup spec.              |

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

- No migration is part of this slice.
- Do not add feature-flag tables or schema gates just to hide these routes.
- This is a surface-honesty pass, not a data-model rewrite.

---

## Data Model

This spec introduces one small code-level availability contract for finance surfaces:

```ts
type FinanceSurfaceState = 'active' | 'manual_only' | 'degraded'

type FinanceSurfaceAvailability = {
  bankFeed: {
    state: FinanceSurfaceState
    showAsPrimary: boolean
    reason: string
  }
  cashFlow: {
    state: FinanceSurfaceState
    showAsPrimary: boolean
    reason: string
  }
}
```

Semantics:

- `active`: the page has enough real data or working capability to be promoted from finance landing surfaces.
- `manual_only`: the page still has some legitimate use, but only as a secondary/manual fallback and should not be sold as a primary capability.
- `degraded`: the route should remain honest and reachable only by direct link or future repair work, not by primary promotion.

Recommended current-state mapping:

- `bankFeed`
  - `active` only if there is at least one active bank connection or existing bank transaction history
  - `manual_only` when the only real action is manual transaction entry
- `cashFlow`
  - `active` only when the forecast loads successfully
  - `degraded` when the route still collapses to the unavailable state

Important non-finance modeling rule:

- `/customers` remains intentionally public and honest while `CUSTOMER_STORIES` is empty.
- This spec does not create a "customer stories unavailable" gate because the current implementation already behaves honestly.

---

## Server Actions

No mutating server actions are required.

| Function / Helper                 | Auth            | Input     | Output                       | Side Effects |
| --------------------------------- | --------------- | --------- | ---------------------------- | ------------ |
| `getFinanceSurfaceAvailability()` | `requireChef()` | none      | `FinanceSurfaceAvailability` | none         |
| existing bank-feed actions        | `requireChef()` | unchanged | unchanged                    | unchanged    |
| existing cash-flow actions        | `requireChef()` | unchanged | unchanged                    | unchanged    |

Builder note:

- `getFinanceSurfaceAvailability()` should stay read-only and cheap.
- Do not introduce a new persistent flag when route/data inspection is enough.

---

## UI / Component Spec

### Page Layout

#### Insurance Claims

- `/safety/claims` remains the archive/list view for existing claim records and claim documents.
- Remove the visible `New Claim` CTA from both the populated and empty states.
- Add a small explanatory note near the header or empty state:
  - claim tracking history may appear here
  - new in-app claim filing is not active yet
  - use the existing incident workflow and claim documents surface instead

#### New Claim Route

- `/safety/claims/new` must stop rendering interactive text fields that imply save behavior.
- Preferred behavior: redirect to `/safety/claims`.
- Acceptable fallback: render a non-interactive informational state with no form fields and a single route back to `/safety/claims`.
- Do not keep the current fake form shell.

#### Finance Home and Financial Hub

- Finance landing surfaces must consult `getFinanceSurfaceAvailability()`.
- `Bank Feed` should only appear as a primary tile when `showAsPrimary` is true.
- `Cash Flow Forecast` should only appear as a primary tile when `showAsPrimary` is true.
- If the surfaces are not primary-ready, keep the rest of finance intact instead of backfilling with fake replacement cards.

#### Bank Feed Route

- If the route is in `manual_only` state, the page copy must stop promising automatic bank connectivity as the main job.
- The degraded state should clearly position the page as manual reconciliation support.
- `AddManualTransactionForm` may remain if it still works.

#### Cash Flow Route

- If the route is degraded, the empty state should read like a temporary unavailable/reporting issue, not a finished capability.
- Do not promote the route from finance home or the alternate financial hub while degraded.

### States

- **Loading:** keep current loading behavior.
- **Empty:** empty is acceptable only when the route still provides a truthful, useful fallback. Empty is not acceptable when the page still visually behaves like a primary workflow that just happens to do nothing.
- **Error:** use honest degraded copy. Never imply saved work or automatic sync if none exists.
- **Populated:** only primary-promote bank feed and cash flow when the populated state is actually available.

### Interactions

- Clicking `Insurance Claims` still opens the claims archive.
- No visible CTA anywhere in the chef UI should take the user into a fake claim-creation form.
- Finance home and the alternate financial hub should render fewer cards rather than misleading cards.
- Direct links or bookmarks into downgraded finance routes are allowed, but the route must explain its current state truthfully.

---

## Edge Cases and Error Handling

| Scenario                                                                      | Correct Behavior                                                                                                              |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| A chef already has historical insurance claims in the table                   | Keep `/safety/claims` intact as an archive. Only remove fake creation affordances.                                            |
| A chef has active bank connections or bank transaction history                | Bank Feed can remain surfaced as a primary destination.                                                                       |
| A chef has no bank connections but does use manual transactions               | Bank Feed can remain reachable, but it is `manual_only`, not a primary finance promise.                                       |
| Cash flow route keeps failing because of loader/query mismatches              | Do not keep promoting it from finance home. Treat it as degraded until repaired.                                              |
| A builder tries to "solve" public customer stories by inventing fake examples | That is a regression. `/customers` remains honest and empty until real approved stories exist.                                |
| A builder wants to delete the routes entirely                                 | Not in this slice. This spec is about gating, redirecting, and truthfulness first. Permanent deletion is a separate decision. |

---

## Verification Steps

1. Sign in as a chef account with no active bank connections and no claim-filing workflow configured.
2. Navigate to `/safety/claims`.
3. Verify: no visible `New Claim` CTA remains.
4. Navigate directly to `/safety/claims/new`.
5. Verify: the fake save-looking form is gone. The route redirects or renders a non-interactive unavailable state only.
6. Navigate to `/finance`.
7. Verify: `Bank Feed` and `Cash Flow Forecast` are not promoted as primary tiles when their availability helper says they are not primary-ready.
8. Navigate to `/financials`.
9. Verify: the same finance-surface gating is applied there.
10. Navigate directly to `/finance/bank-feed` on an account with no bank setup.
11. Verify: the page reads like a manual/degraded fallback, not like an active automatic-sync workflow.
12. Navigate directly to `/finance/cash-flow` when forecast loading is still degraded.
13. Verify: the route is honest about the degraded state and is no longer promoted elsewhere.
14. Navigate to `/customers`.
15. Verify: the page still states that customer stories have not been published yet and remains noindex/trust-preserving.

---

## Out of Scope

- Building real insurance claim persistence or insurance integrations.
- Building or verifying real Plaid/Stripe bank-sync ingestion.
- Repairing the full cash-flow forecast implementation logic in this slice.
- Publishing or fabricating customer stories.
- Deleting the affected routes permanently.
- Wider finance information architecture cleanup beyond primary-tile honesty.

---

## Notes for Builder Agent

1. **Do not treat all four sanity-check examples as the same class of issue.** `/safety/claims/new` is a true deceptive dead zone. `/finance/bank-feed` is a partly real surface that may be overpromoted. `/finance/cash-flow` currently behaves like a degraded route and likely needs a future repair. `/customers` is an intentionally honest placeholder and should stay that way.

2. **Use existing evidence, not instinct.** The sanity check, route discoverability report, and code paths already show which routes are hidden, discoverable, or overpromoted. Do not invent a fresh taxonomy.

3. **Prefer downgrade over deletion.** The goal is to stop misleading users, not to destroy future work.

4. **Primary promotion is the real bug for finance.** If a surface can only honestly serve direct-link or secondary/manual use, stop placing it in finance home tiles until it is trustworthy.

5. **Keep customer-story trust intact.** `CUSTOMER_STORIES` is intentionally empty today. That is a good constraint, not something to bypass.
