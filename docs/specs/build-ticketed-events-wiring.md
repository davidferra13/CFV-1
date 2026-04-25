# Build Spec: Ticketed Events Wiring Fixes

> **Scope:** Edit 3 existing files. Small, surgical changes.
> **Risk:** LOW. No schema changes, no new tables.
> **Time:** ~15 minutes.

Read `CLAUDE.md` before starting.

---

## Overview

Three files need fixes to wire the ticketed events feature together:

| File                                                              | Problem                                              | Fix                                                  |
| ----------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------- |
| `app/(chef)/events/[id]/page.tsx`                                 | Passes wrong `shareToken` to tickets tab (line 1008) | Add `event_share_settings` query, pass correct props |
| `app/(chef)/events/[id]/_components/event-detail-tickets-tab.tsx` | Toggle button uses wrong heuristic (line 209)        | Add `ticketsEnabled` prop, fix toggle logic          |
| `lib/tickets/webhook-handler.ts`                                  | Missing `event_share_id` on guest insert (line 127)  | Add fallback for nullable `event_share_id`           |

---

## Fix 1: Event Detail Page (`app/(chef)/events/[id]/page.tsx`)

### 1A. Add `event_share_settings` query

Find this block (around line 530-535):

```tsx
// Ticket sales data
const [ticketTypes, ticketList, ticketSummary] = await Promise.all([
  getEventTicketTypes(params.id).catch(() => []),
  getEventTickets(params.id).catch(() => []),
  getEventTicketSummary(params.id).catch(() => null),
])
```

REPLACE WITH:

```tsx
// Ticket sales data
const [ticketTypes, ticketList, ticketSummary] = await Promise.all([
  getEventTicketTypes(params.id).catch(() => []),
  getEventTickets(params.id).catch(() => []),
  getEventTicketSummary(params.id).catch(() => null),
])

// Ticket share settings (separate from RSVP event_shares)
let ticketShareToken: string | null = null
let ticketsEnabled = false
try {
  const tsDb: any = createServerClient()
  const { data: ticketSettings } = await tsDb
    .from('event_share_settings')
    .select('share_token, tickets_enabled')
    .eq('event_id', params.id)
    .eq('tenant_id', user.tenantId!)
    .maybeSingle()
  if (ticketSettings) {
    ticketShareToken = ticketSettings.share_token ?? null
    ticketsEnabled = ticketSettings.tickets_enabled === true
  }
} catch {
  // event_share_settings may not exist yet; degrade gracefully
}
```

### 1B. Fix the `EventDetailTicketsTab` render

Find this exact code (around line 1001-1009):

```tsx
<EventDetailTicketsTab
  activeTab={activeTab}
  eventId={event.id}
  eventStatus={event.status}
  ticketTypes={ticketTypes as any[]}
  tickets={ticketList as any[]}
  summary={ticketSummary}
  shareToken={(activeShare as any)?.share_token ?? null}
/>
```

REPLACE WITH:

```tsx
<EventDetailTicketsTab
  activeTab={activeTab}
  eventId={event.id}
  eventStatus={event.status}
  ticketTypes={ticketTypes as any[]}
  tickets={ticketList as any[]}
  summary={ticketSummary}
  shareToken={ticketShareToken}
  ticketsEnabled={ticketsEnabled}
/>
```

---

## Fix 2: Tickets Tab Component (`app/(chef)/events/[id]/_components/event-detail-tickets-tab.tsx`)

### 2A. Update Props type

Find this exact code (lines 20-28):

```tsx
type Props = {
  activeTab: EventDetailTab
  eventId: string
  eventStatus: string
  ticketTypes: EventTicketType[]
  tickets: EventTicket[]
  summary: EventTicketSummary | null
  shareToken: string | null
}
```

REPLACE WITH:

```tsx
type Props = {
  activeTab: EventDetailTab
  eventId: string
  eventStatus: string
  ticketTypes: EventTicketType[]
  tickets: EventTicket[]
  summary: EventTicketSummary | null
  shareToken: string | null
  ticketsEnabled: boolean
}
```

### 2B. Update function signature destructuring

Find this exact code (lines 30-38):

```tsx
export function EventDetailTicketsTab({
  activeTab,
  eventId,
  eventStatus,
  ticketTypes,
  tickets,
  summary,
  shareToken,
}: Props) {
```

REPLACE WITH:

```tsx
export function EventDetailTicketsTab({
  activeTab,
  eventId,
  eventStatus,
  ticketTypes,
  tickets,
  summary,
  shareToken,
  ticketsEnabled,
}: Props) {
```

### 2C. Fix toggle button logic

Find this exact code (around line 209):

```tsx
<Button
  variant="ghost"
  onClick={() => handleToggleTicketing(ticketTypes.length > 0 && !summary)}
  disabled={isPending}
  className="text-xs"
>
  {summary ? 'Disable Sales' : 'Enable Sales'}
</Button>
```

REPLACE WITH:

```tsx
<Button
  variant="ghost"
  onClick={() => handleToggleTicketing(!ticketsEnabled)}
  disabled={isPending}
  className="text-xs"
>
  {ticketsEnabled ? 'Disable Sales' : 'Enable Sales'}
</Button>
```

---

## Fix 3: Webhook Handler (`lib/tickets/webhook-handler.ts`)

### 3A. Handle nullable `event_share_id` on guest insert

The guest insert at line 124-142 does not provide `event_share_id`. After the migration makes that column nullable, the insert will work. However, we should also link it to an event_share if one exists.

Find this exact code (lines 123-152):

```tsx
// 3. Create event guest record
try {
  const { data: guest } = await db
    .from('event_guests')
    .insert({
      event_id,
      tenant_id,
      full_name: ticket.buyer_name,
      email: ticket.buyer_email,
      phone: ticket.buyer_phone ?? null,
      rsvp_status: 'attending',
      dietary_restrictions: ticket.dietary_restrictions ?? [],
      allergies: ticket.allergies ?? [],
      plus_one: !!ticket.plus_one_name,
      plus_one_name: ticket.plus_one_name ?? null,
      notes: ticket.notes ?? null,
      source: 'ticket',
    })
    .select('id')
    .single()

  if (guest) {
    await db.from('event_tickets').update({ event_guest_id: guest.id }).eq('id', ticket_id)
  }
} catch (guestErr) {
  // May fail if event_guests doesn't have a source column - non-blocking
  console.error(
    '[handleTicketPurchaseCompleted] Guest record creation failed (non-blocking):',
    guestErr
  )
}
```

REPLACE WITH:

```tsx
// 3. Create event guest record
try {
  // Find an active event_share for this event (ticket guests need one for the FK)
  let eventShareId: string | null = null
  try {
    const { data: share } = await db
      .from('event_shares')
      .select('id')
      .eq('event_id', event_id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()
    eventShareId = share?.id ?? null
  } catch {
    // No share found; event_share_id is nullable after migration
  }

  const guestInsert: Record<string, unknown> = {
    event_id,
    tenant_id,
    full_name: ticket.buyer_name,
    email: ticket.buyer_email,
    phone: ticket.buyer_phone ?? null,
    rsvp_status: 'attending',
    dietary_restrictions: ticket.dietary_restrictions ?? [],
    allergies: ticket.allergies ?? [],
    plus_one: !!ticket.plus_one_name,
    plus_one_name: ticket.plus_one_name ?? null,
    notes: ticket.notes ?? null,
  }
  if (eventShareId) {
    guestInsert.event_share_id = eventShareId
  }

  const { data: guest } = await db.from('event_guests').insert(guestInsert).select('id').single()

  if (guest) {
    await db.from('event_tickets').update({ event_guest_id: guest.id }).eq('id', ticket_id)
  }
} catch (guestErr) {
  console.error(
    '[handleTicketPurchaseCompleted] Guest record creation failed (non-blocking):',
    guestErr
  )
}
```

---

## Verification

After all edits:

```bash
# Type check (focus on edited files)
npx tsc --noEmit --skipLibCheck 2>&1 | grep -E "(page\.tsx|event-detail-tickets-tab|webhook-handler)" || echo "No type errors in edited files"

# Verify the edits landed (spot checks)
grep -n "ticketShareToken" "app/(chef)/events/[id]/page.tsx" | head -5
grep -n "ticketsEnabled" "app/(chef)/events/[id]/_components/event-detail-tickets-tab.tsx" | head -5
grep -n "eventShareId" "lib/tickets/webhook-handler.ts" | head -5
```

---

## Rules

- Edit ONLY these 3 files. Do not create new files or edit anything else.
- No em dashes.
- `createServerClient()` (no admin) for the chef-side query (RLS handles tenant scoping).
- `createServerClient({ admin: true })` is already used in the webhook handler; keep it.
- All try/catch blocks must log errors, not swallow silently.
- Use `maybeSingle()` not `single()` for queries that may return zero rows.
