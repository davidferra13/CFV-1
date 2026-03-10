# Tier 2 Competitive Features (2026-03-09)

Three features inspired by competitor platforms, implemented for ChefFlow.

## Feature A: Auto-Confirm + Calendar Block on Proposal Signature

**Inspired by:** Perfect Venue

**What it does:** When a client signs a proposal via the Smart File flow (`acceptProposalAndSign`), three things happen automatically as non-blocking side effects:

1. **Calendar block** - Creates a `chef_calendar_entries` row with `blocks_bookings: true` for the event date. Idempotent (checks for existing block using `description: auto-block:event:{eventId}`).
2. **Confirmation email** - Sends a branded email to the client confirming their proposal was accepted, using the `NotificationGenericEmail` template.
3. **Chef notification** - Creates an in-app notification for the chef: "Client signed and accepted your proposal."

On event cancellation, the calendar block is automatically removed.

**Files changed:**

- `lib/calendar/auto-block.ts` (NEW) - `autoBlockEventDate()` and `removeEventDateBlock()`
- `lib/proposal/actions.ts` - Wired into `acceptProposalAndSign()`
- `lib/events/transitions.ts` - Wired `removeEventDateBlock` into cancellation flow

**No migration needed** - uses existing `chef_calendar_entries` table.

## Feature B: Two-Sided Referral Rewards (Enhanced)

**Inspired by:** Smile.io

**What already existed:** `client_referrals` table, referral codes on clients, `awardReferralRewardForCompletedEvent()`, `getReferralShareDataForClientEvent()`, QR code support.

**What's new:**

1. **Client referral stats** (`getClientReferralStats()`) - Returns the client's referral code, URL, total referrals, completed count, points earned, and a list of recent referrals with status.
2. **Chef referral dashboard** (`getChefReferralDashboard()`) - Shows all referral activity across clients: totals, top referrers, recent referrals.
3. **ReferralCard component** - Client-facing card with: copy link button, share/email buttons, referral code display, 3-stat summary (referred/completed/points), and recent referral list.
4. **Wired into client portal** - ReferralCard added to the My Rewards page.

**Files changed:**

- `lib/referrals/actions.ts` - Added `getClientReferralStats()`, `getChefReferralDashboard()`
- `components/referrals/referral-card.tsx` (NEW) - Client-facing referral card
- `app/(client)/my-rewards/page.tsx` - Added ReferralCard to rewards page

**No migration needed** - uses existing `client_referrals` table and `referral_code` column on clients.

## Feature C: Receipt Scan to Ingredient Cost Auto-Update

**Inspired by:** Meez

**What it does:** After a receipt is OCR-processed, a new matching step fuzzy-matches receipt line items to the chef's ingredient library. The chef reviews matches, then applies approved prices, which cascade through all recipes.

**Pipeline:**

1. Receipt uploaded and OCR'd (existing flow)
2. `matchReceiptToIngredients()` - Deterministic fuzzy matching using normalized text, Jaccard word similarity, and Levenshtein distance. No AI. Returns matches with confidence scores.
3. Chef reviews in `ReceiptCostMatcher` component - approve/reject each match, adjust quantities
4. `applyReceiptPrices()` - For each approved match: logs to `ingredient_price_history`, calls `cascadeIngredientPriceChange()` to update recipes/menus/events
5. Shows summary of what changed: old vs new costs, recipes affected

**Matching strategy (Formula > AI):**

- Text normalization (strip abbreviations, punctuation)
- Substring containment (score 0.85-0.9)
- Jaccard word overlap with stem-aware partial matching (score 0-0.7)
- Levenshtein distance for short strings (score 0-0.3)
- Threshold: 0.3 minimum to suggest a match

**Files created:**

- `lib/costing/receipt-cost-sync.ts` (NEW) - `matchReceiptToIngredients()`, `applyReceiptPrices()`, `getReceiptMatchesForReview()`
- `components/receipts/receipt-cost-matcher.tsx` (NEW) - Review UI with approve/reject, quantity override, and results summary

**No migration needed** - uses existing `ingredients`, `ingredient_price_history`, `receipt_photos`, `receipt_line_items` tables + existing cascade engine.
