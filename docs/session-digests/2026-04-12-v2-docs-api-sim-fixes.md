# Session Digest: v2 Documents API + Simulation Fix

**Date:** 2026-04-12 (afternoon session)
**Agent:** Builder
**Status:** Complete

---

## What Was Done

### 1. Event Column Name Fixes (resumed from prior context)

Fixed wrong column references in 4 AI action files that were using deprecated column names:

- `lib/ai/draft-actions.ts` - `location` -> `location_address` (5 occurrences)
- `lib/ai/prep-timeline-actions.ts` - `notes` -> `site_notes` (3 occurrences)
- `lib/ai/remy-travel-time.ts` - `location` -> `location_address` (8 occurrences)
- `lib/menus/dish-index-bridge.ts` - `date` -> `event_date`, `event_type` -> `occasion`

### 2. Test Scripts: Supabase -> Auth.js (resumed from prior context)

All 9 Remy/simulation test scripts in `scripts/` were using forbidden Supabase client auth. Rewrote `scripts/lib/db.mjs` to provide `signInAgent(port)` via `/api/e2e/auth`, then migrated all scripts.

### 3. v2 Documents API - Full Generation Support

`POST /api/v2/documents/generate` previously returned `supported: false` for `invoice`, `quote`, `receipt`, `contract`, `menu`, `prep_list`, `grocery_list`, `timeline`.

**Added `*ByTenant` data-fetching variants** (session-free, accept explicit tenantId for API key auth context):

- `getInvoiceDataByTenant(eventId, tenantId)` in `lib/events/invoice-actions.ts`
- `generateReceiptByTenant(eventId, tenantId)` in `lib/documents/generate-receipt.ts`
- `fetchQuoteDocumentDataByTenant(quoteId, tenantId)` in `lib/documents/generate-quote.ts`

**Rewrote `app/api/v2/documents/generate/route.ts`** to:

- Return binary PDFs for `invoice`, `receipt`, `quote`, `contract` (Content-Type: application/pdf)
- Remap `menu` -> `foh`, `prep_list` -> `prep`, `grocery_list` -> `grocery`, `timeline` -> `execution` (existing operational snapshot types)
- `fetchContractData` already accepted `chefId` param - used directly

### 4. Simulation Quality Evaluator Fix

`client_parse` and `allergen_risk` modules had been failing at 0% since April 9. Root cause: their Ollama-based quality evaluators made a second AI call after the pipeline call, which was consistently failing or scoring incorrectly.

**Converted both to deterministic evaluators** (Formula > AI):

- `evaluateClientParseDeterministic` - checks fullName/email with fuzzyMatch, verifies dietary restrictions from ground truth expectedName/expectedEmail/expectedDietary
- `evaluateAllergenRiskDeterministic` - checks rows array exists, safetyFlags non-empty when risks expected, at least one non-safe row per conflict scenario

`menu_suggestions` remains Ollama-evaluated (genuinely subjective).

Expected outcome: simulation should now show 5/6 modules passing (83%) instead of 3/6 (50%) when Ollama is running.

---

## Stale Backlog Items Confirmed (no work needed)

Several Sweep 3 "confirmed gaps" turned out to be built:

- **Double-booking detection** - `transitions.ts:211` has same-date conflict check, returns `warnings` in result, `event-transitions.tsx:118` shows amber toast
- **Waitlist promote** - `waitlist/page.tsx:94` "Create Event" link + `event-form.tsx:628` auto-converts waitlist entry
- **Inventory reorder UI** - `app/(chef)/inventory/reorder/page.tsx` exists
- **DocuSign Send UI** - `components/contracts/send-contract-button.tsx:145` has conditional "Send via DocuSign" button
- **Year-end CPA export** - `app/(chef)/finance/year-end/export/route.ts` working

---

## Key Technical Decisions

- **`*ByTenant` pattern**: Chose to add tenant-scoped variants of data-fetch functions rather than refactoring existing ones. Keeps session-auth paths clean, adds parallel API-key paths. Acceptable duplication for isolation.
- **No `requireChef()` in v2 route**: v2 uses `withApiAuth` + `ApiContext.tenantId`. Never call session-dependent functions from API key handlers.
- **Deterministic evaluation is always preferred over AI eval**: client_parse and allergen_risk have structured ground truth. Scoring them with AI introduced flakiness. Deterministic is faster, cheaper, and more reliable.

---

## Files Modified This Session

- `lib/ai/draft-actions.ts`
- `lib/ai/prep-timeline-actions.ts`
- `lib/ai/remy-travel-time.ts`
- `lib/menus/dish-index-bridge.ts`
- `scripts/lib/db.mjs`
- `scripts/test-email-08.mjs` + 8 other test scripts
- `lib/events/invoice-actions.ts` (added `getInvoiceDataByTenant`)
- `lib/documents/generate-receipt.ts` (added `generateReceiptByTenant`)
- `lib/documents/generate-quote.ts` (added `fetchQuoteDocumentDataByTenant`)
- `app/api/v2/documents/generate/route.ts` (full rewrite)
- `lib/simulation/quality-evaluator.ts` (added 2 deterministic evaluators)

---

## Build State

- `tsc --noEmit --skipLibCheck`: green (verified multiple times this session)
- Live ops guardian: ok, failureCount: 0

---

## What the Next Agent Should Know

- `*ByTenant` functions are the pattern for all API v2 data access. If a new v2 endpoint needs event/client/financial data, add a `*ByTenant(id, tenantId)` variant to the relevant lib file.
- The simulation now evaluates client_parse and allergen_risk deterministically. Future simulation module additions should prefer deterministic evaluation whenever ground truth is structured.
- `menu_suggestions` simulation module has AI generating menu suggestions - this is in a testing/simulation context only, not surfaced to chefs as a feature.
- Remaining genuine backlog items: Referral partner commission system (complex, no spec), calendar integration (stubs only), SMS channel (needs Twilio), dark mode gaps (large effort).
