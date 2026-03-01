# Honesty Audit Fixes — 2026-02-28

**Branch:** `feature/risk-gap-closure`
**Scope:** Fix every feature that was broken, fake, or lying to users

---

## What Was Done

A full audit identified 18 issues — 12 active bugs/lies, 6 dead code items. All 14 actionable items were fixed.

### HIGH Severity Fixes

| #   | Issue                                                                                            | File                                                   | Fix                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| 1   | Client Book Now page hardcoded `chefName="David Ferragamo"` and empty `chefSlug` for all tenants | `app/(client)/book-now/page.tsx`                       | Now queries `chefs` table using the client's `tenantId` to get the correct chef name and slug dynamically |
| 2   | DocuSign webhook queried `contracts` table (doesn't exist)                                       | `app/api/webhooks/docusign/route.ts`                   | Changed all 4 references from `contracts` to `event_contracts` (the actual table name)                    |
| 3   | Commerce receipt route queried `commerce_sales` table (doesn't exist) — always returned 404      | `app/api/documents/commerce-receipt/[saleId]/route.ts` | Route now returns 501 with clear message "POS schema not deployed" instead of silently failing            |
| 4   | "Try the event wizard" link on `/events/new` led to a stub page that just said "coming soon"     | `app/(chef)/events/new/page.tsx`                       | Removed the dead wizard link; kept the "just describe it" link (which works)                              |

### MEDIUM Severity Fixes

| #   | Issue                                                                                                                   | File(s)                                                                                                                                    | Fix                                                                                                                                |
| --- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| 5   | 6 AI services queried `event_menu_components` (table doesn't exist) — all menu-aware AI features returned empty context | `lib/ai/menu-nutritional.ts`, `prep-timeline.ts`, `service-timeline.ts`, `staff-briefing-ai.ts`, `review-request.ts`, `social-captions.ts` | Replaced with proper `menus` → `dishes` join using actual schema. Menu data now flows to AI prompts correctly                      |
| 6   | Remy context queried `inquiry_messages` (doesn't exist) — Remy never saw pending messages                               | `lib/ai/remy-context.ts`                                                                                                                   | Changed to query `messages` table with `direction = 'inbound'` and `read = false`                                                  |
| 7   | Command orchestrator queried `loyalty_accounts` (doesn't exist) and `event_menus` (doesn't exist)                       | `lib/ai/command-orchestrator.ts`                                                                                                           | Loyalty: now derives tier from `loyalty_transactions` (earn/redeem math). Menus: now queries `menus` table directly via `event_id` |
| 8   | Testimonial selection queried `aars` (wrong name) and `client_surveys` (doesn't exist)                                  | `lib/ai/testimonial-selection.ts`                                                                                                          | Changed `aars` → `after_action_reviews`. Removed `client_surveys` query, set to empty array with comment                           |
| 9   | "Disconnect Gmail" button was clickable but did nothing                                                                 | `components/integrations/take-a-chef-setup.tsx`                                                                                            | Button now disabled with `(coming soon)` label and tooltip                                                                         |
| 10  | Commission rate input (`useState(25)`) never saved — reset to 25% on refresh                                            | `components/integrations/take-a-chef-setup.tsx`                                                                                            | Removed interactive input. Now shows static "Default: 25%" text. Will become functional when Gmail connection is wired up          |
| 11  | Segment delete showed `toast.success('Segment removed')` but only removed from local state — reappeared on refresh      | `components/marketing/behavioral-segment-builder.tsx`                                                                                      | Changed to `toast.info('Segment hidden from view (server-side delete coming soon)')` — honest about what happened                  |
| 12  | Hub group notifications logged to console but never sent emails                                                         | `lib/hub/notification-actions.ts`                                                                                                          | Wired up to `sendEmail()` from `lib/email/send.ts`. Now sends real notification emails via Resend                                  |

### Dead Code Deleted

| #   | What                                                                                                    | Files                                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 13  | 5 placeholder culinary components never imported anywhere                                               | `components/culinary/RecipeBook.tsx`, `MenuList.tsx`, `MenuDetail.tsx`, `IngredientManager.tsx`, `CostingDashboard.tsx` |
| 14  | `computeMenuEngineering()` server action returned hardcoded empty results — dead code, nobody called it | `lib/analytics/menu-engineering.ts`                                                                                     |

### Intentionally Left As-Is (Not Broken)

| #   | What                                                        | Why                                           |
| --- | ----------------------------------------------------------- | --------------------------------------------- |
| 15  | Ops Copilot system disabled (`OPS_COPILOT_ENABLED` not set) | Legitimate feature flag — not lying to anyone |
| 16  | Push dinner menu picker "coming soon"                       | Has a text workaround explained in UI         |
| 17  | Community "Share a Template" button disabled                | Properly disabled with "Coming Soon" label    |
| 18  | Desktop app download "coming soon"                          | Tauri is a future feature, clearly labeled    |

---

## Schema Reference (What Actually Exists)

These are the correct table names the codebase should use:

| Code Was Using          | Correct Table                            | Status                         |
| ----------------------- | ---------------------------------------- | ------------------------------ |
| `event_menu_components` | `menus` → `dishes` (join via `event_id`) | Fixed in 6 files               |
| `contracts`             | `event_contracts`                        | Fixed in DocuSign webhook      |
| `commerce_sales`        | Does not exist                           | Route gated with 501           |
| `inquiry_messages`      | `messages` (with `direction` column)     | Fixed in Remy context          |
| `loyalty_accounts`      | `loyalty_transactions` (compute balance) | Fixed in command orchestrator  |
| `event_menus`           | `menus` (direct `event_id` FK)           | Fixed in command orchestrator  |
| `aars`                  | `after_action_reviews`                   | Fixed in testimonial selection |
| `client_surveys`        | Does not exist                           | Removed query, empty fallback  |
| `menu_items`            | Does not exist                           | Dead code deleted              |

---

## Zero Hallucination Rule Compliance

All 14 fixes align with the Zero Hallucination Rule:

- **Law 1** (no success without confirmation): Fixed segment delete toast
- **Law 2** (no hiding failure as zero): Fixed 6 AI services returning empty menu data
- **Law 3** (no non-functional features shown as functional): Fixed Disconnect Gmail button, commission rate input, event wizard link
