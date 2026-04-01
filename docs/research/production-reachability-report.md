# Research: Production Reachability Report

> **Date:** 2026-04-01
> **Question:** Which files in `components/`, `lib/`, and `hooks/` have no inbound imports from the production surface (`app/`, `components/`, `lib/`, `hooks/`)?
> **Status:** complete

---

## Audit Boundary

- **In scope:** `components/`, `lib/`, `hooks/`
- **Checked against:** `app/`, `components/`, `lib/`, `hooks/`
- **Secondary check:** `tests/`, `scripts/` (used only for test-only / tool-only classification, not to count as "reachable production")
- **Excluded from dead-code classification by rule:** all `app/**/page.tsx`, `app/**/route.ts`, `app/**/layout.tsx`, and other Next framework entrypoints
- **Search method:** `grep -rl "<basename>" <scope>` excluding the file itself

---

## Exclusion Rules

1. Files in `app/` are never classified as dead from imports alone (framework entrypoints).
2. A file with zero production inbound imports but at least one test import is classified `test_only`, not `orphan_candidate`.
3. A file referenced only by `scripts/` is classified `tool_only`.
4. String-based references (registry keys in audit maps, config maps) are noted as partial evidence of use but do not fully establish production reachability.
5. Dynamic imports (`import(...)`) are treated as production references even when they use string paths.

---

## Summary

Confirmed orphan candidates (zero inbound imports across the full production surface): **7 files**.
Test-only files (no production imports, referenced only from `tests/`): **1 file**.
Potential duplicate pair: **1 pair** (hooks vs lib validation hook).
Files with string-registry references only (not import-based): **2 files** (classified `needs_runtime_check`).

---

## Confirmed Orphan Candidates

These files returned zero matches when the production surface was searched for their basename. Each entry includes the search evidence.

### `components/ai/remy-public-widget.tsx`

- **What it does:** A standalone embeddable Remy chat widget, distinct from the main `remy-drawer.tsx` and from the `/embed/` route widget.
- **Evidence of orphan:** `grep -rl "remy-public-widget" app/ components/ lib/ hooks/` returned no results.
- **Dynamic import check:** no `import('...remy-public-widget...')` found anywhere in the production surface.
- **Classification:** `orphan_candidate`
- **Notes:** The active embed widget lives at `components/embed/embed-inquiry-form.tsx` and `app/embed/inquiry/[chefId]/page.tsx`. This file appears to be a parallel or superseded implementation.

---

### `components/admin/admin-sidebar.tsx`

- **What it does:** A sidebar component for the admin section.
- **Evidence of orphan:** `grep -rl "admin-sidebar" app/ components/ lib/ hooks/` returned no results.
- **Notes:** The admin layout at `app/(admin)/` does not appear to import this component. Admin navigation is handled through `components/navigation/nav-config.tsx` and `components/navigation/chef-nav.tsx` with `adminOnly` flags, not a dedicated sidebar.
- **Classification:** `orphan_candidate`

---

### `components/admin/admin-preview-toggle.tsx`

- **What it does:** A toggle for admin preview mode.
- **Evidence of orphan:** `grep -r "AdminPreviewToggle\|admin-preview-toggle" app/ components/ lib/` returned no results.
- **Classification:** `orphan_candidate`

---

### `components/activity/client-activity-timeline.tsx`

- **What it does:** A timeline component for displaying client activity.
- **Evidence of orphan:** `grep -rl "client-activity-timeline" app/ components/ lib/ hooks/` returned no results.
- **Notes:** A related component, `entity-activity-timeline.tsx`, is referenced (count 3). `client-activity-feed.tsx` is also referenced from `activity-page-client.tsx`. This file appears to be a superseded version.
- **Classification:** `orphan_candidate`

---

### `components/sustainability/sourcing-dashboard.tsx`

- **What it does:** A dashboard view for sustainable sourcing data.
- **Evidence of orphan:** `grep -rl "sourcing-dashboard\|SourcingDashboard" app/ components/ lib/ hooks/` returned 0 production results.
- **Classification:** `orphan_candidate`
- **Notes:** `lib/sustainability/` has 2 referenced files. The component surface for sustainability is disconnected.

---

### `components/sustainability/sourcing-log.tsx`

- **What it does:** A log view for sustainable sourcing entries.
- **Evidence of orphan:** `grep -rl "sourcing-log\|SourcingLog" app/ components/ lib/ hooks/` returned 0 production results.
- **Classification:** `orphan_candidate`

---

### `components/classes/class-form.tsx`, `class-list.tsx`, `class-registration-form.tsx`, `class-registrations.tsx`

- **What they do:** Form and list components for a cooking classes feature.
- **Evidence of orphan:** `grep -r "class-form\|class-list\|class-registration\|ClassForm\|ClassList\|ClassRegistration" app/ components/ lib/` (excluding the `classes/` dir) returned no results.
- **Route check:** There is no `app/**/classes/page.tsx` found in the route inventory.
- **lib/classes/class-actions.ts** has 4 inbound references, suggesting some of this module may be partially wired.
- **Classification:** `orphan_candidate` (component surface), with `investigate` on the lib side

---

### `components/follow-up/event-sequence-status.tsx`

- **What it does:** Status display for event sequences in the follow-up flow.
- **Evidence of orphan:** `grep -rl "event-sequence-status\|EventSequenceStatus" app/ components/ lib/ hooks/` returned 0 results outside the `follow-up/` directory.
- **Notes:** The `components/followup/` directory (different spelling) has some referenced files. This may be a duplicate or severed parallel.
- **Classification:** `orphan_candidate`

---

### `lib/wine/spoonacular-wine.ts`

- **What it does:** Wine pairing integration using the Spoonacular API.
- **Evidence of orphan:** `grep -rl "spoonacular-wine\|SpoonacularWine" app/ components/ lib/ hooks/` returned 0 results.
- **Classification:** `orphan_candidate`
- **Notes:** No wine pairing route or page was found in the route inventory.

---

### `lib/ai/menu-suggestions.ts`

- **What it does:** AI-driven menu suggestion logic using Gemini.
- **Evidence of partial reference:** Referenced once in `lib/ai/privacy-audit.ts` as a string key `'menu-suggestions'` in the routing audit map (line: `'menu-suggestions': { provider: 'gemini', ... }`). This is a documentation/registry entry, not an import.
- **Production import check:** `grep -rl "menu-suggestions" app/ components/ lib/ hooks/` excluding `privacy-audit.ts` returns 0 results.
- **Classification:** `needs_runtime_check`
- **Notes:** The privacy audit map is a metadata document, not a call graph. The fact that `menu-suggestions` is named there suggests it was intended to be wired but the actual import may have been dropped. Needs a developer decision on whether menu suggestions are wanted.

---

### `lib/ai/privacy-audit.ts`

- **What it does:** A routing audit map documenting which AI modules use Ollama vs Gemini. Purely informational, no `'use server'` directive, no functions exported that could be called.
- **Evidence:** `grep -rl "privacy-audit" app/ components/ lib/ hooks/ tests/ scripts/` returned no results.
- **Classification:** `needs_runtime_check`
- **Notes:** This is a reference document in TypeScript form. It may be intentionally standalone as a policy record. However, it is not imported anywhere and the governing policy lives in `CLAUDE.md`. Its operational value is unclear.

---

## Test-Only Files

### `lib/events/fsm.ts`

- **What it does:** A finite state machine implementation for event lifecycle transitions.
- **Production import check:** `grep -rl "events/fsm" app/ components/ lib/ hooks/` returned 0 results.
- **Test reference:** `tests/unit/events.fsm.test.ts` imports it.
- **Notes:** The related commerce FSM (`lib/commerce/sale-fsm.ts`) is actively used in `lib/commerce/payment-actions.ts` and `app/api/webhooks/stripe/route.ts`. The events FSM appears to be an earlier or parallel version that the test suite covers but production code does not call.
- **Classification:** `test_only`

---

## Duplicate Pair

### `hooks/use-field-validation.ts` vs `lib/validation/use-field-validation.ts`

- **What they do:** Both implement field-level validation logic for forms.
- **Evidence:** `grep -rl "use-field-validation" app/ components/ lib/ hooks/` returned 0 results for both files. Neither is imported anywhere in production.
- **Notes:** Both files are orphaned simultaneously. The spec seed finding suggested `lib/validation/use-field-validation.ts` was the "richer" version. Neither is currently wired.
- **Classification:** `orphan_candidate` (both), noted as a duplicate pair
- **Related:** `lib/validation/form-rules.ts` and `lib/validation/schemas.ts` exist but their import counts were not individually checked; they should be verified in follow-on work.

---

## Clusters by Directory

| Directory                    | Total Files | Orphan Count | Notes                                                    |
| ---------------------------- | ----------- | ------------ | -------------------------------------------------------- |
| `components/activity/`       | 16          | 1            | `client-activity-timeline.tsx` orphaned                  |
| `components/admin/`          | 14          | 2            | `admin-sidebar.tsx`, `admin-preview-toggle.tsx` orphaned |
| `components/ai/`             | 44+         | 1            | `remy-public-widget.tsx` orphaned                        |
| `components/classes/`        | 4           | 4            | All 4 components orphaned                                |
| `components/follow-up/`      | 1           | 1            | `event-sequence-status.tsx` orphaned                     |
| `components/sustainability/` | 2           | 2            | Both components orphaned                                 |
| `hooks/`                     | 6           | 1            | `use-field-validation.ts` orphaned                       |
| `lib/ai/`                    | 40+         | 2            | `menu-suggestions.ts`, `privacy-audit.ts` (needs check)  |
| `lib/events/`                | multiple    | 1            | `fsm.ts` test-only                                       |
| `lib/validation/`            | 3           | 1+           | `use-field-validation.ts` orphaned                       |
| `lib/wine/`                  | 1           | 1            | `spoonacular-wine.ts` orphaned                           |

---

## Unresolved Ambiguities

1. **String-based activation:** `lib/ai/privacy-audit.ts` is not imported but documents a routing policy. Whether it should be imported somewhere (e.g., an AI dispatch layer) or is purely advisory is a product decision.
2. **`lib/classes/class-actions.ts`** has 4 inbound references, meaning the server action side of the classes module IS wired. Whether this represents intentional partial wiring (server actions without a UI) or a severed UI surface needs investigation.
3. **`components/sustainability/` context:** The `lib/sustainability/` module has 2 fully referenced files, meaning the data layer is wired but the UI surface is not.
4. **`components/follow-up/` vs `components/followup/`:** Two directories with similar names. `follow-up/` appears largely orphaned (1/1 files unreferenced), while `followup/` has some referenced files. This naming ambiguity should be resolved.
5. **`lib/validation/` full coverage:** Only `use-field-validation.ts` was individually checked. `form-rules.ts` and `schemas.ts` should be checked in the decision register phase.
