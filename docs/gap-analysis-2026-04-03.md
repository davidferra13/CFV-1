# System Behavior Gap Analysis

> **Date:** 2026-04-03
> **Method:** Compared `docs/system-behavior-specification.md` against live codebase across 5 domains
> **Status:** 7 of 10 issues fixed. 3 remain in Tier 3 (accuracy refinements, deferred).

---

## AUDIT RESULTS BY DOMAIN

### 1. Event FSM - STRONG (1 issue)

| Requirement                                | Status      |
| ------------------------------------------ | ----------- |
| 8 states defined                           | PASS        |
| Immutable transition audit trail           | PASS        |
| Database-level enforcement (trigger)       | PASS        |
| Payment auto-transition (accepted -> paid) | PASS        |
| Forward-only transitions                   | **PARTIAL** |

**Issue: draft-to-paid DB trigger mismatch**

The application code allows `draft -> paid` for instant-book (Stripe webhook pays for a draft event). The database trigger only allows `draft -> proposed` or `draft -> cancelled`. When the webhook fires, the transition fails silently.

- App-level: `lib/events/transitions.ts` line 24 allows `draft -> paid`
- DB trigger: migration `20260215000003` line 554 blocks it
- Impact: Instant-book events stay stuck in `draft` after payment
- Fix: One new migration adding `'paid'` to draft's allowed transitions in the trigger

---

### 2. Financial Ledger - STRONG (1 issue)

| Requirement                                        | Status |
| -------------------------------------------------- | ------ |
| Immutable append-only ledger                       | PASS   |
| Database triggers prevent UPDATE/DELETE            | PASS   |
| All financial figures computed from ledger (views) | PASS   |
| Reversing entries for corrections                  | PASS   |
| event_financial_summary is a SQL VIEW              | PASS   |
| No stored financial totals on mutable columns      | PASS   |

**Issue: Demo data cleanup attempts ledger DELETE**

`lib/onboarding/demo-data-actions.ts` line 97 tries to DELETE ledger entries during demo cleanup. The database trigger blocks it (correctly), but this means `clearDemoData()` throws an error and fails to complete when demo events have ledger entries.

- Impact: Demo data cannot be fully cleaned up
- Fix: Demo cleanup should either skip ledger entries (leaving orphans) or use a different approach (mark as void via reversing entries)

---

### 3. Data Integrity / Zero Hallucination - GOOD (4 issues)

| Requirement                                 | Status           |
| ------------------------------------------- | ---------------- |
| startTransition with try/catch and rollback | **4 gaps found** |
| Fetch failure shows error, not zero         | Mostly compliant |
| No hardcoded financial figures              | PASS             |
| No empty onClick handlers                   | PASS             |
| AI content marked as draft                  | PASS             |

**Issue 1: Public inquiry form shows success without validation**

- File: `components/public/public-inquiry-form.tsx` lines 234-307
- Sets `setShowSuccess(true)` after `await submitPublicInquiry()` without checking the return value
- If the server action fails silently, the user sees "success" anyway

**Issue 2: Booking form redirects to Stripe without URL validation**

- File: `components/booking/booking-form.tsx` lines 323-350
- `window.location.href = result.checkoutUrl` without checking if `checkoutUrl` exists
- If checkout creation fails, the browser navigates to `undefined`

**Issue 3: Incident form redirects on error**

- File: `components/safety/incident-form.tsx` lines 30-48
- Catches error and shows toast, but still calls `router.push('/safety/incidents')`
- User sees flash of error toast then gets redirected away from it

**Issue 4: Instant-book silently drops dietary records**

- File: `lib/booking/instant-book-actions.ts` lines 157-173
- Allergy record upsert failure is caught and logged but user is never told their allergies were not saved
- This is a food safety concern

---

### 4. Tenant Isolation & Authentication - EXCELLENT (0 issues)

| Requirement                              | Status               |
| ---------------------------------------- | -------------------- |
| Every server action has auth gate        | PASS (998/998 files) |
| Every query includes tenant scoping      | PASS                 |
| No cross-tenant queries in app code      | PASS                 |
| tenant_id from session, never from input | PASS                 |

No issues found. This is the strongest area of the codebase.

---

### 5. Allergen & Menu Costing - MIXED (2 critical, 2 minor)

| Requirement                                  | Status      |
| -------------------------------------------- | ----------- |
| Auto allergen check on menu assignment       | **FAIL**    |
| Severity flagging (life-threatening vs mild) | **PARTIAL** |
| Deterministic formula (no AI required)       | PASS        |
| Per-guest, per-dish conflict display         | PASS        |
| Ingredient cost calculation                  | PASS        |
| Cost rollup (ingredient -> dish -> menu)     | PARTIAL     |
| Food cost % formula                          | PASS        |
| 10-tier price resolution, never $0.00        | PASS        |

**Critical Issue 1: Menu assignment does NOT trigger allergen check**

- `attachMenuToEvent()` updates the menu-event link and nothing else
- Chef must manually click "Run Analysis" on the allergen panel
- A menu with shellfish can be assigned to a guest with shellfish allergy with zero automatic warning
- This is the most significant gap in the entire system

**Critical Issue 2: No allergen severity mapping**

- All allergens flagged as contains/may_contain/safe (risk level)
- No distinction between life-threatening (peanuts, shellfish) and mild (garlic intolerance)
- The FDA Big 9 allergens exist in constants but aren't prioritized in the display

**Minor Issue 1: No unit conversion in cost calculation**

- Recipe cost = quantity \* price_cents with no unit normalization
- Price in $/lb but quantity in tsp produces wildly wrong numbers
- Acknowledged as V2 in code comments

**Minor Issue 2: Components without recipes contribute zero cost**

- Items like "bread from bakery" that have no recipe are silently omitted from menu cost
- Food cost % appears better than reality

---

## PRIORITIZED ACTION PLAN

Ordered by: (1) food safety risk, (2) financial accuracy, (3) user trust, (4) data integrity.

### TIER 1: Must Fix (food safety or financial correctness)

| #     | Issue                                           | Fix                                                                                               | Risk if Unfixed                                                      | Scope                                          |
| ----- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------- |
| **1** | Allergen check not automatic on menu assignment | Add auto-check trigger when menu is attached to event. Display results as banner on event detail. | Guest with life-threatening allergy could be served a dangerous dish | 2 files: menu actions + event detail component |
| **2** | draft-to-paid DB trigger blocks instant-book    | New migration: add `'paid'` to draft's allowed transitions in the FSM trigger                     | Instant-book payments succeed at Stripe but event stays in draft     | 1 migration file                               |
| **3** | Instant-book silently drops dietary records     | Show warning toast to chef when allergy upsert fails instead of silent catch                      | Allergies lost for a paying client                                   | 1 file: instant-book-actions.ts                |

### TIER 2: Should Fix (user trust / data honesty)

| #     | Issue                                                | Fix                                                                        | Risk if Unfixed                               | Scope                           |
| ----- | ---------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------- |
| **4** | Public inquiry form shows success without validation | Check `submitPublicInquiry()` return value before showing success screen   | Client thinks inquiry was sent when it wasn't | 1 file: public-inquiry-form.tsx |
| **5** | Booking form redirects without URL validation        | Check `result.checkoutUrl` exists before `window.location.href`            | Browser navigates to `undefined`              | 1 file: booking-form.tsx        |
| **6** | Incident form redirects on error                     | Move `router.push` inside try block, after successful creation only        | Error toast vanishes as user is redirected    | 1 file: incident-form.tsx       |
| **7** | Demo data cleanup fails on ledger entries            | Skip ledger entries in cleanup (leave orphans) or create reversing entries | Demo data can never be fully removed          | 1 file: demo-data-actions.ts    |

### TIER 3: Improve When Possible (accuracy refinements)

| #      | Issue                                  | Fix                                                                                  | Risk if Unfixed                                    | Scope                                                 |
| ------ | -------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------- | ----------------------------------------------------- |
| **8**  | No allergen severity mapping           | Map FDA Big 9 to severity tiers in the allergen matrix output                        | All allergens treated equally regardless of danger | 2 files: allergen-matrix.ts + allergen-risk-panel.tsx |
| **9**  | No unit conversion in costing          | Add unit normalization layer between recipe quantities and ingredient prices         | Inaccurate food cost % when units don't match      | Database function + pricing logic                     |
| **10** | Components without recipes = zero cost | Show "uncosted" badge on components missing recipes, include in total as "estimated" | Food cost % underreported                          | Menu cost display component                           |

---

## DECISION POINTS (Require Your Input)

**Decision 1:** The allergen auto-check (Issue #1) can be implemented two ways:

- **(a)** Run the check in `attachMenuToEvent()` and store results, displaying them as a permanent banner on the event detail page
- **(b)** Add an FSM readiness gate that blocks `proposed -> accepted` until allergen verification is complete

Option (a) is informational (warns but doesn't block). Option (b) is enforcing (forces verification before proceeding). Which approach?

**Decision 2:** The draft-to-paid trigger fix (Issue #2) is a one-line change in a new migration. Should I proceed, or do you want to review the SQL first?

**Decision 3:** The demo data cleanup issue (#7) has two fixes:

- **(a)** Skip ledger entries during cleanup (fast, leaves orphan rows that don't affect anything since the parent event/client is deleted)
- **(b)** Create reversing entries for each ledger entry before deleting the event (correct but complex)

---

## WHAT'S WORKING WELL

These areas matched the specification with zero or near-zero gaps:

- **Tenant isolation** (998/998 server action files compliant)
- **Financial ledger immutability** (database triggers, append-only, views for computed values)
- **Event FSM architecture** (immutable audit trail, database enforcement, atomic transitions)
- **Price resolution** (10-tier chain, never returns $0.00)
- **Deterministic analytics** (Formula > AI pattern consistently applied)
- **AI boundaries** (Remy drafts require approval, recipes never AI-generated)
- **Payment auto-transition** (both Stripe webhook and offline recording work correctly)

The system's core architecture is sound. The gaps are at the integration seams (menu assignment doesn't trigger downstream checks) and at form-level error handling (optimistic UI without validation), not in the foundational data model.
