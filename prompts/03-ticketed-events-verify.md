# VERIFY + FIX: Ticketed Events End-to-End

## Context

You are a QA and bug-fix agent for ChefFlow, a Next.js + PostgreSQL (Drizzle ORM) + Auth.js v5 + Stripe private chef operations platform. Read `CLAUDE.md` before doing anything.

The ticketed events feature (public event pages, Stripe checkout, chef ticket management) was built in a prior session. The code and migration exist. Your job is to **verify it works end-to-end, find bugs, fix bugs, and prove it works**.

## What Already Exists (DO NOT REBUILD)

The entire feature stack is already written:

### Database Migration

- `database/migrations/20260416000004_event_ticketing.sql` creates:
  - `event_ticket_types` (per-event pricing tiers with capacity, sold_count CAS guard)
  - `event_tickets` (individual purchases with buyer info, Stripe refs, dietary data, guest token)
  - `event_distribution` (future: external platform syndication)
  - `event_ticket_summary` view (aggregated sales metrics)
  - Adds `tickets_enabled` column to existing `event_share_settings` table

### Backend (Server Actions)

- `lib/tickets/types.ts` - TypeScript interfaces for all ticket entities
- `lib/tickets/actions.ts` - Chef-side CRUD: `createTicketType`, `updateTicketType`, `deleteTicketType`, `getEventTicketTypes`, `getEventTickets`, `getEventTicketSummary`, `createCompTicket`, `createWalkInTicket`, `refundTicket`, `toggleEventTicketing`
- `lib/tickets/purchase-actions.ts` - Public (no auth): `getPublicEventByShareToken`, `getUpcomingPublicEvents`, `purchaseTicket` (Stripe Checkout), `getTicketByGuestToken`
- `lib/tickets/webhook-handler.ts` - `handleTicketPurchaseCompleted`: marks paid, creates hub profile, creates event guest, auto-joins circle, sends confirmation email, notifies chef

### Frontend

- `app/(public)/e/[shareToken]/page.tsx` - Server component: rate limiting, JSON-LD structured data, OG meta, circle URL resolution for post-purchase
- `app/(public)/e/[shareToken]/public-event-view.tsx` - Client component: event display, ticket type selector, purchase form (name/email/phone/dietary/allergies), Stripe redirect, confirmation screen with "Join the Dinner Circle" CTA
- `app/(chef)/events/[id]/_components/event-detail-tickets-tab.tsx` - Client component: sales summary (sold/revenue/avg price), capacity bar, ticket type CRUD, comp/walk-in forms, ticket holder list with refund buttons, public link copy

### Webhook Routing

- `app/api/webhooks/stripe/route.ts` already routes `checkout.session.completed` with `metadata.type === 'event_ticket'` to `handleTicketPurchaseCompleted()`

### Parent Page Wiring

- `app/(chef)/events/[id]/page.tsx` imports `EventDetailTicketsTab`, loads ticket data at lines 527-531 via `Promise.all([getEventTicketTypes, getEventTickets, getEventTicketSummary])`, renders the tab at line 968

---

## KNOWN BUG #1: Share Token Wiring (CRITICAL)

**File:** `app/(chef)/events/[id]/page.tsx`, line 975

The Tickets tab receives:

```tsx
shareToken={(activeShare as any)?.share_token ?? null}
```

But `activeShare` comes from `guestShares` (the `event_shares` table, RSVP system), which has a `.token` property, NOT `.share_token`. The ticketing system uses `event_share_settings` table which has `share_token`.

**Result:** The Tickets tab ALWAYS gets `null` for `shareToken`. The public URL is never displayed. The "Copy Link" button is hidden.

**Fix required:**

1. Add a query for `event_share_settings` in the event detail page's data-loading block
2. Pass the correct `share_token` to `EventDetailTicketsTab`
3. This query should also return `tickets_enabled` so the toggle state is correct

### How to query it (follow existing patterns)

```ts
const { data: ticketShareSettings } = await db
  .from('event_share_settings')
  .select('share_token, tickets_enabled')
  .eq('event_id', params.id)
  .eq('tenant_id', user.tenantId!)
  .maybeSingle()
```

Then pass `shareToken={ticketShareSettings?.share_token ?? null}` to the Tickets tab.

---

## KNOWN BUG #2: Toggle Button Logic (MINOR)

**File:** `app/(chef)/events/[id]/_components/event-detail-tickets-tab.tsx`, line 209

```tsx
<Button onClick={() => handleToggleTicketing(ticketTypes.length > 0 && !summary)}>
```

This logic is wrong. It decides the enabled state from whether a summary exists (which is null when no tickets have been sold), not from the actual `tickets_enabled` DB state. A chef with ticket types but no sales would see "Disable Sales" even if ticketing was never enabled.

**Fix:** The component should receive the current `ticketsEnabled` boolean from `event_share_settings` and use that:

```tsx
<Button onClick={() => handleToggleTicketing(!ticketsEnabled)}>
  {ticketsEnabled ? 'Disable Sales' : 'Enable Sales'}
</Button>
```

Add `ticketsEnabled: boolean` to the Props type and pass it from the parent page.

---

## POSSIBLE BUG #3: Share Token Default on Insert

**File:** `lib/tickets/actions.ts`, `toggleEventTicketing()`, line 449

When creating a new `event_share_settings` row, only `event_id`, `tenant_id`, and `tickets_enabled` are set. If the `share_token` column does NOT have a database-level default (like `DEFAULT gen_random_uuid()`), the row gets created with `NULL` share_token, and the public page can never resolve it.

**Verify:** Check if `share_token` has a default in the DB. If not, add `share_token: crypto.randomUUID()` to the insert in `toggleEventTicketing`.

---

## Verification Plan (Playwright + Manual)

### Phase 1: Confirm Migration Applied

Run against the production database (port 3000 per CLAUDE.md testing rules):

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'event_ticket_types';
```

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'event_tickets';
```

```sql
SELECT column_name, column_default
FROM information_schema.columns
WHERE table_name = 'event_share_settings' AND column_name IN ('tickets_enabled', 'share_token');
```

If tables are missing, the migration hasn't been applied. Do NOT run `drizzle-kit push`. Ask the developer for approval to apply the migration.

### Phase 2: Fix Bugs

Fix bugs #1 and #2 (and #3 if confirmed). Files to edit:

- `app/(chef)/events/[id]/page.tsx` - add `event_share_settings` query, pass correct props
- `app/(chef)/events/[id]/_components/event-detail-tickets-tab.tsx` - add `ticketsEnabled` prop, fix toggle logic

### Phase 3: Playwright Tests

Test against **production build** (localhost:3000), never dev server. Use agent credentials from `.auth/agent.json`.

**Test file patterns:** Look at `tests/experiential/` for the test style. Use `navigateAndVerify`, `assertNotBlank`, `captureCheckpoint`, `dismissOverlays` from `tests/experiential/helpers/experiential-utils.ts`.

**Auth:** The agent account (`.auth/agent.json`) is a chef. Sign in via `POST /api/e2e/auth` with the agent credentials to get a session, or use the existing `.auth/chef.json` storage state.

#### Test 1: Chef Tickets Tab Renders

1. Sign in as chef (agent account)
2. Navigate to an existing event detail page (`/events/[id]?tab=tickets`)
3. Verify the Tickets tab renders (not blank)
4. Verify "Ticket Sales" heading visible
5. Verify "Add Type" button visible
6. Screenshot checkpoint

#### Test 2: Create Ticket Type

1. On the Tickets tab, click "Add Type"
2. Fill: Name="General Admission", Price="75", Capacity="20", Description="Farm dinner seat"
3. Click "Create"
4. Verify the ticket type appears in the list
5. Verify price shows "$75.00" and capacity shows "0/20 sold"

#### Test 3: Toggle Ticketing + Public URL

1. After creating a ticket type, click "Enable Sales"
2. Verify a public URL appears (containing `/e/`)
3. Copy the URL
4. Navigate to it in a new context (unauthenticated)
5. Verify the public event page renders with event name, ticket type, price, and "Get Tickets" button

#### Test 4: Public Purchase Form

1. On the public event page, click the ticket type card
2. Verify the purchase form appears (name, email, phone, dietary, allergies, notes fields)
3. Fill: Name="Test Buyer", Email="test@example.com"
4. Verify the total shows "$75.00"
5. Verify the "Get Tickets" button is enabled
6. (DO NOT actually submit; Stripe Checkout requires real payment method)

#### Test 5: Comp Ticket

1. Back on chef Tickets tab, click "+ Comp"
2. Fill: Name="VIP Guest", Email="vip@test.com", Qty=2
3. Click "Add Comp"
4. Verify "VIP Guest" appears in ticket holders list with "Comp" badge and "$0.00"

#### Test 6: Walk-In Ticket

1. Click "+ Walk-in"
2. Fill: Name="Door Guest", Paid="75.00"
3. Click "Add Walk-in"
4. Verify "Door Guest" appears in ticket holders list with "Walk-in" badge

#### Test 7: Capacity Bar Updates

1. After adding comp/walk-in tickets, verify the capacity bar shows updated sold count
2. Verify the sold/remaining numbers reflect the additions

#### Test 8: Public Page Shows Remaining Capacity

1. Navigate to the public page again (unauthenticated)
2. Verify the ticket type shows updated remaining count (capacity minus sold)

### Phase 4: Type Check + Build

After all fixes:

```bash
npx tsc --noEmit --skipLibCheck
npx next build --no-lint
```

Both must exit 0.

---

## Rules

- Read `CLAUDE.md` fully before starting
- Test against production build (localhost:3000), NEVER dev server (localhost:3100)
- No em dashes anywhere
- "OpenClaw" must never appear in user-facing surfaces
- All monetary amounts in cents (integer)
- Tenant scoping on every query (tenant_id from session, never request body)
- Do NOT run `drizzle-kit push` without explicit developer approval
- Non-blocking side effects wrapped in try/catch
- After fixing code, run type check + build to verify
- Screenshot every test checkpoint

## Key Files

| Purpose              | Path                                                                                      |
| -------------------- | ----------------------------------------------------------------------------------------- |
| Project rules        | `CLAUDE.md`                                                                               |
| Full spec            | `docs/specs/ticketed-events-and-distribution.md`                                          |
| Migration            | `database/migrations/20260416000004_event_ticketing.sql`                                  |
| Types                | `lib/tickets/types.ts`                                                                    |
| Chef actions         | `lib/tickets/actions.ts`                                                                  |
| Public purchase      | `lib/tickets/purchase-actions.ts`                                                         |
| Webhook handler      | `lib/tickets/webhook-handler.ts`                                                          |
| Public page (server) | `app/(public)/e/[shareToken]/page.tsx`                                                    |
| Public page (client) | `app/(public)/e/[shareToken]/public-event-view.tsx`                                       |
| Chef tickets tab     | `app/(chef)/events/[id]/_components/event-detail-tickets-tab.tsx`                         |
| Event detail page    | `app/(chef)/events/[id]/page.tsx` (lines 527-531: data loading, line 968-976: tab render) |
| Agent credentials    | `.auth/agent.json`                                                                        |
| Test helpers         | `tests/experiential/helpers/experiential-utils.ts`                                        |
| Playwright config    | `playwright.config.ts`                                                                    |
