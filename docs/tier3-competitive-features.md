# Tier 3 Competitive Features (2026-03-09)

Four features that complete the competitive feature set.

## Feature 1: Buffer Times + Booking Caps

**What was built:**

- `lib/calendar/buffer-rules.ts` - scheduling rules CRUD, conflict checking, effective availability
- `components/calendar/scheduling-rules-form.tsx` - full settings form for buffer times, caps, blocked days, preferred days, lead time
- `app/(chef)/settings/scheduling/page.tsx` - new settings page

**How it works:**

- Merges `chef_scheduling_rules` table (blocked days, buffer days, lead time) with `booking_daily_caps` table (per-day, per-week limits) into a single unified interface
- `checkBookingConflict()` verifies proposed events against all rules: blocked days, lead time, daily/weekly caps, buffer day overlaps
- `getEffectiveAvailability()` returns whether a date is available with full conflict detail
- All existing `booking_event_types` buffer columns (buffer_before_minutes, buffer_after_minutes) continue to work for per-event-type buffers via `getAvailableSlots()` in `lib/booking/availability-actions.ts`

**Settings page:** `/settings/scheduling`

## Feature 2: Tip/Gratuity Option

**What was built:**

- `components/payments/tip-selector.tsx` - percentage-based tip selector (15%, 18%, 20%, 25%, custom, no tip)
- Added standalone tip card for `in_progress` events on client event detail page

**What already existed (not rebuilt):**

- `event_tips` table (migration 20260307000017)
- `createTipCheckoutUrl` in `lib/stripe/checkout.ts`
- `generateClientTipCheckoutUrl` in `lib/events/tip-payment-actions.ts`
- `TipAfterReviewCard` in `components/reviews/tip-after-review-card.tsx` (post-review tip)
- Tip success/cancelled URL params on event detail page

**How tips flow:**

1. In-progress events: `TipAfterReviewCard` shown on event detail (new)
2. Completed events, high rating: `TipAfterReviewCard` shown after review submit (existing)
3. Client selects amount, clicks "Add Tip", redirected to Stripe Checkout
4. Stripe webhook records tip in `event_tips` table
5. Tip amount shown on event detail, invoice, and financial panels

**TipSelector component** (`components/payments/tip-selector.tsx`) is available for future use in the proposal payment flow or standalone tip pages. It calculates percentage-based amounts from a base total.

## Feature 3: Birthday/Anniversary Auto-Rewards

**What was built:**

- `lib/loyalty/auto-rewards.ts` - full auto-reward system
  - `checkAndAwardBirthdayPoints(chefId)` - idempotent daily check, awards points on client birthdays
  - `checkAndAwardAnniversaryPoints(chefId)` - same for first-event anniversaries
  - `getUpcomingMilestones(chefId, daysAhead)` - upcoming birthdays/anniversaries
  - `getAutoRewardConfig(chefId)` / `updateAutoRewardConfig()` - chef-customizable point amounts
- `app/api/scheduled/auto-rewards/route.ts` - daily cron endpoint

**How it works:**

- Uses existing `birthday` and `first_event_date`/`anniversary` columns on `clients` table
- Uses existing `loyalty_transactions` + `loyalty_config` system
- Idempotency: description includes year key (e.g. `birthday-2026`) to prevent double-awarding
- Config stored in `platform_settings` as `auto_reward_config_{chefId}` JSONB
- Default: 100 birthday points, 150 anniversary points
- Anniversary skips the first year (that's the event, not yet an anniversary)

**Schedule:** `GET /api/scheduled/auto-rewards` - run daily via cron

## Feature 4: Enhanced Morning Briefing + Email

**What was built (new sections):**

- Overdue Payments section on briefing page
- Pending Inquiries section with lead scores
- Unsigned Proposals section with days-since-sent
- Upcoming Milestones section (birthdays/anniversaries from Feature 3)
- Week Ahead section (7-day event count grid)
- `lib/email/templates/morning-briefing.tsx` - React email template
- `app/api/scheduled/briefing/route.ts` - daily email cron endpoint

**What already existed (enhanced):**

- `/briefing` page with alerts, yesterday recap, today's events, tasks, staff on duty, shift notes, prep timers
- `lib/briefing/get-morning-briefing.ts` - data aggregator (extended with 5 new parallel queries)

**Briefing email:**

- Opt-in per chef via `platform_settings` key `briefing_email_enabled_{chefId}`
- Schedule: `GET /api/scheduled/briefing` - daily via cron
- Contains: today's events, action items, week ahead count, link to full briefing
- Formula > AI: 100% deterministic, no Ollama

## Files Changed

| File                                            | Change                                      |
| ----------------------------------------------- | ------------------------------------------- |
| `lib/calendar/buffer-rules.ts`                  | New - scheduling rules + conflict detection |
| `components/calendar/scheduling-rules-form.tsx` | New - settings form                         |
| `app/(chef)/settings/scheduling/page.tsx`       | New - settings page                         |
| `components/payments/tip-selector.tsx`          | New - percentage tip selector               |
| `app/(client)/my-events/[id]/page.tsx`          | Modified - added in_progress tip card       |
| `lib/loyalty/auto-rewards.ts`                   | New - birthday/anniversary auto-rewards     |
| `app/api/scheduled/auto-rewards/route.ts`       | New - daily cron                            |
| `lib/briefing/get-morning-briefing.ts`          | Modified - 5 new data sections              |
| `app/(chef)/briefing/page.tsx`                  | Modified - 3 new UI sections                |
| `lib/email/templates/morning-briefing.tsx`      | New - email template                        |
| `app/api/scheduled/briefing/route.ts`           | New - email cron                            |
