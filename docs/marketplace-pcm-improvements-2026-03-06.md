# Marketplace / PCM Improvements - 2026-03-06

## What Changed

### 1. Marketplace Scorecard (NEW)

Added a comprehensive performance scorecard to the Marketplace Command Center page.

**Metrics tracked:**

- Median response time (hours from inquiry creation to first action)
- % of responses within 24 hours
- Proposal-sent rate (% of inquiries that reached quoted/booked)
- Request-to-book conversion rate
- Gross revenue booked via marketplaces
- Estimated commission paid to platforms
- Average booking value
- Direct conversion rate (marketplace clients who rebooked without a platform)
- Per-platform breakdown table (inquiries, booked, conversion %, response time, gross)

**Files:**

- `lib/marketplace/scorecard-actions.ts` (new) - Server action computing all scorecard metrics
- `app/(chef)/marketplace/page.tsx` - Added scorecard section to page

### 2. Generalized Bookmarklet (IMPROVED)

The page capture bookmarklet now works on ALL marketplace platforms, not just Take a Chef / Private Chef Manager.

**Platforms now supported:**

- Private Chef Manager / Take a Chef
- Yhangry
- Cozymeal
- Bark
- Thumbtack
- GigSalad
- The Knot / WeddingWire

**Files changed:**

- `lib/integrations/take-a-chef-page-capture.ts` - Broader URL pattern, updated bookmarklet code
- `components/marketplace/take-a-chef-capture-tool.tsx` - Updated help text
- `app/(chef)/marketplace/capture/page.tsx` - Updated description

### 3. Fuzzy Name Matching (IMPROVED)

Platform inquiry deduplication now uses smarter name matching instead of exact-only.

**New matching capabilities:**

- Accent-insensitive (Jose matches Jose)
- First/last name swap ("John Smith" matches "Smith John")
- Partial matching ("Maria Garcia" matches "Maria Elena Garcia" or "Dr. Maria Garcia")

**Files changed:**

- `lib/gmail/platform-dedup.ts` - Rewrote `namesMatch()` with fuzzy logic

### 4. Payment/Payout Reconciliation (NEW)

Take a Chef payment emails are now parsed for financial data instead of being treated as notification-only stubs.

**What gets extracted:**

- Order ID
- Gross booking amount
- Commission amount and percentage
- Net payout amount
- Payout date and method
- Currency

**What happens with it:**

- Matched to existing inquiry by order ID
- Payout details stored in inquiry's `unknown_fields.take_a_chef_payouts` array (idempotent)
- Chef notification includes specific amounts and links to the matched inquiry
- If no match found, notification flags it for manual review

**Files changed:**

- `lib/gmail/take-a-chef-parser.ts` - Added `TacParsedPayment` type and `parsePaymentEmail()` function
- `lib/gmail/sync.ts` - Rewrote `handleTacPayment()` with real reconciliation logic

### 5. Multi-Service Booking (VERIFIED - Already Working)

Investigated the reported gap in multi-service booking ingestion. Found it is already handled:

- Parser detects `multi_day` service mode from "Multiple services" request types
- `buildTacScheduleRequest()` creates a `ScheduleRequest` with individual sessions
- `ensureTacSeriesEvents()` in sync.ts creates an `event_series` with child events
- No code changes needed

## What's Still Missing (Next Session)

1. **Browser extension** - The bookmarklet works but requires the chef to manually navigate to ChefFlow. A Chrome extension that captures and submits in one click would be smoother
2. **Proposal version history** - PCM sends proposal revisions; ChefFlow doesn't track version history
3. **Availability parity** - No comparison between ChefFlow calendar and PCM calendar
4. **Contact unlock automation** - Post-booking automation chain (portal invite, direct contact card, rebook reminders)
5. **Review workflow** - Import PCM reviews, prompt for reviews, draft responses
6. **PCM operating surface** - Deep links with status-aware actions back into PCM
