# Beta Onboarding System

Complete system for onboarding beta testers, tracking their progress, applying discounts, and growing the user base through dinner circles.

## Overview

Every beta tester gets a **30% discount applied automatically** to all bookings. The onboarding checklist guides them through key platform features without gating anything. The system is designed so every dinner party becomes a growth opportunity: guests can join circles without accounts, and each one is a potential future client.

## Architecture

### Data Model

**Migration:** `supabase/migrations/20260330000062_beta_onboarding_system.sql`

New columns on `clients`:

- `is_beta_tester` (boolean) - Flag set by admin
- `beta_enrolled_at` (timestamptz) - When they were flagged
- `beta_discount_percent` (integer, default 30) - Configurable per client
- `referred_by_client_id` (FK to clients) - Who introduced them
- `referred_from_group_id` (FK to hub_groups) - Which circle introduced them

New table `beta_onboarding_checklist`:

- One row per client per tenant
- Tracks completion timestamps for 5 steps
- Links to primary circle created
- Tracks dismissal and overall completion

New columns on `hub_guest_profiles`:

- `referred_by_profile_id` - Who invited this guest to their first circle
- `first_group_id` - First circle they joined (for attribution)
- `upgraded_to_client_at` - When they became a full client

New columns on `events`:

- `beta_discount_percent` - Discount applied to this event
- `beta_discount_cents` - Computed discount amount

### Server Actions

**`lib/beta/onboarding-actions.ts`** - Core onboarding logic:

- `enrollBetaTester(clientId)` - Flag client + create checklist
- `unenrollBetaTester(clientId)` - Remove flag
- `getBetaTesters()` - All testers with progress (chef view)
- `getMyBetaChecklist()` - Client's own checklist
- `completeBetaStep(step)` - Manually mark a step done
- `syncBetaChecklistProgress()` - Auto-detect completed steps from existing data
- `computeBetaDiscount(serviceCents, isBeta, percent)` - Pure discount math
- `getDietaryRollupForEvent(eventId)` - Aggregate dietary info from all guests
- `dismissBetaChecklist()` - Client hides the checklist
- `recordReferralSource(newClientId, referrer, group)` - Track referrals

**`lib/beta/email-triggers.ts`** - Email automation:

- `sendPreEventDietarySummary(eventId)` - 48hr dietary rollup email to chef
- `sendPostEventCircleThanks(eventId)` - Thank you to all circle members

### Components

**`components/beta/beta-onboarding-checklist.tsx`** - Client dashboard checklist:

- Shows 5-step guided walkthrough
- Progress bar with percentage
- Steps auto-detect completion from existing data
- Dismissible, non-blocking
- Amber/emerald color scheme for warmth

**`components/beta/beta-testers-widget.tsx`** - Chef dashboard widget:

- Shows total testers, completion stats, average progress
- Highlights testers who need attention
- Links to admin panel

**`components/events/dietary-rollup.tsx`** - Event detail card:

- Aggregated allergies (red badges, critical) and restrictions (amber badges)
- Shows how many guests have shared info

**`components/events/circle-rebook-button.tsx`** - "Book another dinner with this crew"

- Shown on event summary after completion
- Pre-selects the circle for the next booking

**`components/hub/guest-upgrade-prompt.tsx`** - Guest account upgrade CTA

- Subtle, non-blocking prompt for guests without accounts
- Links to signup with profile token for data preservation

### Pages

**`app/(admin)/admin/beta/onboarding/page.tsx`** - Admin beta management:

- Summary stats (total, complete, in progress, not started)
- Step completion funnel (shows where people drop off)
- Full tester table with per-step completion status
- Unenroll capability

### Email Templates

**`lib/email/templates/pre-event-dietary-summary.tsx`** - Chef gets 48hr before event:

- Full dietary rollup with allergy alerts
- Guest count with info completion rate

**`lib/email/templates/post-event-circle-thanks.tsx`** - All circle members after event:

- Menu highlights
- For guests: soft CTA to create account or book own dinner

## Client Flow

1. Admin flags client as beta tester (sets `is_beta_tester = true`, creates checklist)
2. Client sees checklist on their dashboard ("Welcome to the Beta! Your 30% discount is already applied.")
3. Checklist guides them through:
   - Fill out taste profile (dietary prefs, allergies, cuisines)
   - Create dinner circle (invite friends)
   - Circle members fill out profiles (progress tracking)
   - Book first event (pre-populates from circle)
   - Post-dinner review
4. Steps auto-detect from existing data (no manual clicking needed)
5. 30% discount auto-applies on every invoice
6. Checklist is dismissible at any time

## Guest Flow (Growth Engine)

1. Client creates circle, invites friends via link
2. Friend clicks link, enters name + email + dietary info
3. Friend can join as guest (no account) or create account
4. Guest profile stores dietary info persistently for that circle
5. When circle books an event, guest dietary info is included automatically
6. After dinner, guests get thank-you email with soft account signup CTA
7. If guest creates account, their dietary info and circle history transfer
8. Referral source is tracked back to originating circle and inviter

## Invoice Integration

Beta discount stacks with loyalty:

1. Quoted price (base)
2. Loyalty discount applied first (from redemptions)
3. Beta discount applied to post-loyalty subtotal
4. Tax computed on final adjusted subtotal

Both discounts show as separate line items on the invoice.

## Key Files

| What                         | Where                                                           |
| ---------------------------- | --------------------------------------------------------------- |
| Migration                    | `supabase/migrations/20260330000062_beta_onboarding_system.sql` |
| Core actions                 | `lib/beta/onboarding-actions.ts`                                |
| Email triggers               | `lib/beta/email-triggers.ts`                                    |
| Client checklist UI          | `components/beta/beta-onboarding-checklist.tsx`                 |
| Chef widget                  | `components/beta/beta-testers-widget.tsx`                       |
| Admin page                   | `app/(admin)/admin/beta/onboarding/page.tsx`                    |
| Dietary rollup               | `components/events/dietary-rollup.tsx`                          |
| Circle rebook                | `components/events/circle-rebook-button.tsx`                    |
| Guest upgrade                | `components/hub/guest-upgrade-prompt.tsx`                       |
| Guest profile upgrade action | `lib/hub/profile-actions.ts` (`upgradeGuestToClient`)           |
| Referral tracking            | `lib/hub/group-actions.ts` (`joinHubGroup`)                     |
| Invoice integration          | `lib/events/invoice-actions.ts`                                 |
| Invoice view                 | `components/events/invoice-view.tsx`                            |
| Pre-event email              | `lib/email/templates/pre-event-dietary-summary.tsx`             |
| Post-event email             | `lib/email/templates/post-event-circle-thanks.tsx`              |
