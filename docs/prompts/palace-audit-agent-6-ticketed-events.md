# Agent Handoff: Ticketed Events Wiring

Read and execute `docs/palace-audit-build-spec.md`, section "AGENT 6: Ticketed Events Wiring."

## Context

The developer co-hosts farm dinners with a farm owner. This is a real, active, revenue-generating business need. The spec at `docs/specs/ticketed-events-and-distribution.md` describes native ticket sales. ALL the infrastructure already exists: Stripe Connect, Instant Book, RSVP, Hub Circles, Campaigns. This is a wiring job.

Also read the co-host vision at the memory file `C:\Users\david\.claude\projects\c--Users-david-Documents-CFv1\memory\project_farm_dinner_cohost.md` and the integrity question set at `docs/specs/system-integrity-question-set-cohosting.md`.

## Your job

1. **Read the full spec:** `docs/specs/ticketed-events-and-distribution.md`
2. **Read existing infrastructure:**
   - Stripe Connect: `lib/stripe/` (Connect onboarding, checkout sessions)
   - Instant Book: `lib/booking/instant-book-actions.ts`
   - RSVP: Hub group RSVP system
   - Campaigns: `lib/marketing/actions.ts`
3. **Database migration** (show SQL, get approval before writing):
   - Add to `events` table: `is_ticketed BOOLEAN DEFAULT false`, `ticket_price_cents INTEGER`, `max_tickets INTEGER`, `tickets_sold INTEGER DEFAULT 0`
   - Add `event_tickets` table: `id`, `event_id`, `buyer_email`, `buyer_name`, `stripe_payment_intent_id`, `status` (confirmed/cancelled/refunded), `created_at`
   - Add `co_host` to hub_group_members role enum or add `is_co_host BOOLEAN` column
4. **Build ticket purchase flow:**
   - Public event page at `/e/[eventSlug]` (or use existing public event route)
   - Stripe Checkout session creation for ticket purchase
   - Webhook handler for successful payment -> create ticket + update tickets_sold
   - Confirmation email to buyer using existing email system
5. **Build co-host role:**
   - Co-host can view/edit event details within the Hub Circle
   - Co-host sees guest list and ticket sales
   - Structured admin communication channel between chef and co-host
6. **Wire to Hub Circle:**
   - Ticketed event appears in the circle
   - Circle members can purchase tickets
   - Broadcasting upcoming dinners to circle members via existing campaign system

## Rules

- Show ALL migration SQL before writing files. Developer must approve.
- Remind developer to back up database before applying.
- All monetary amounts in cents (integer)
- Ledger entries for ticket revenue (append-only, immutable)
- Auth gates on all server actions
- Tenant scoping on all queries
- No em dashes
- Non-blocking side effects (notifications, emails) wrapped in try/catch
- Test in real app after building

## Verification

- Can create a ticketed event from event form
- Public event page renders with ticket purchase CTA
- Stripe Checkout flow completes successfully
- Ticket count updates after purchase
- Co-host can view event in their Hub Circle
- `npx tsc --noEmit --skipLibCheck` passes
- `npx next build --no-lint` passes
