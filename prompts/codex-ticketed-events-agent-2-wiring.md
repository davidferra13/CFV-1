# Codex Task: Fix Ticketed Events Wiring (3 Files, Surgical Edits)

## Rules Before You Start

1. Read `CLAUDE.md` at the project root. Follow its rules.
2. You are editing EXACTLY 3 files. Do not touch any other file.
3. Each edit is a find-and-replace. Find the EXACT old code, replace with EXACT new code.
4. If you cannot find the exact string to replace, STOP and report what you see instead. Do NOT guess.

## The 3 Files and What Is Wrong

| File                                                              | Bug                                                                                                                                        | Line                 |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- |
| `app/(chef)/events/[id]/page.tsx`                                 | Passes wrong `shareToken` to tickets tab. Uses `event_shares.share_token` (column is `.token`) instead of querying `event_share_settings`. | ~1008                |
| `app/(chef)/events/[id]/_components/event-detail-tickets-tab.tsx` | Missing `ticketsEnabled` prop. Toggle button uses wrong heuristic.                                                                         | ~20-28, ~30-38, ~209 |
| `lib/tickets/webhook-handler.ts`                                  | Guest insert omits `event_share_id`. After the migration makes it nullable, this works, but should still try to link if a share exists.    | ~123-234             |

---

## Fix 1: Event Detail Page

**File:** `app/(chef)/events/[id]/page.tsx`

### Fix 1A: Add event_share_settings query

Find this EXACT block (around line 530):

```tsx
// Ticket sales data
const [ticketTypes, ticketList, ticketSummary] = await Promise.all([
  getEventTicketTypes(params.id).catch(() => []),
  getEventTickets(params.id).catch(() => []),
  getEventTicketSummary(params.id).catch(() => null),
])
```

Replace with:

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

**Verify `createServerClient` is already imported** in this file. Run:

```bash
grep -n "createServerClient" "app/(chef)/events/[id]/page.tsx" | head -3
```

If it is NOT imported, add this import at the top of the file near the other imports:

```tsx
import { createServerClient } from '@/lib/db/compat'
```

### Fix 1B: Fix the tickets tab render

Find this EXACT code (around line 1001-1009):

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

Replace with:

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

## Fix 2: Tickets Tab Component

**File:** `app/(chef)/events/[id]/_components/event-detail-tickets-tab.tsx`

### Fix 2A: Add ticketsEnabled to Props

Find:

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

Replace with:

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

### Fix 2B: Add ticketsEnabled to destructuring

Find:

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

Replace with:

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

### Fix 2C: Fix toggle button

Find:

```tsx
{
  summary ? 'Disable Sales' : 'Enable Sales'
}
```

Replace with:

```tsx
{
  ticketsEnabled ? 'Disable Sales' : 'Enable Sales'
}
```

Also find:

```tsx
                onClick={() => handleToggleTicketing(ticketTypes.length > 0 && !summary)}
```

Replace with:

```tsx
                onClick={() => handleToggleTicketing(!ticketsEnabled)}
```

---

## Fix 3: Webhook Handler

**File:** `lib/tickets/webhook-handler.ts`

### Fix 3A: Handle nullable event_share_id on guest insert

Find this block (around line 123):

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
```

Replace with:

```tsx
  // 3. Create event guest record
  try {
    // Find active event_share for FK (ticket guests may not have one)
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
      // No share found; column is nullable after migration
    }

    const guestData: Record<string, unknown> = {
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
      guestData.event_share_id = eventShareId
    }

    const { data: guest } = await db
      .from('event_guests')
      .insert(guestData)
      .select('id')
      .single()
```

**Important:** Do NOT change anything after this block. The `if (guest)` update and `catch (guestErr)` block that follow should remain exactly as they are.

---

## Verification

After all edits, run:

```bash
# Spot-check that edits landed
echo "=== Fix 1A ===" && grep -n "ticketShareToken" "app/(chef)/events/[id]/page.tsx" | head -3
echo "=== Fix 1B ===" && grep -n "ticketsEnabled={" "app/(chef)/events/[id]/page.tsx" | head -3
echo "=== Fix 2A ===" && grep -n "ticketsEnabled" "app/(chef)/events/[id]/_components/event-detail-tickets-tab.tsx" | head -5
echo "=== Fix 3A ===" && grep -n "eventShareId" "lib/tickets/webhook-handler.ts" | head -3
```

Each grep should return at least 1 match. If any returns 0, the edit did not land correctly.

## What NOT to Do

- Do NOT edit any file other than these 3.
- Do NOT create new files.
- Do NOT run the dev server or build.
- Do NOT change database schema (that is Agent 1's job).
- Do NOT add new imports unless the specific import is missing (check first with grep).
- Do NOT reformat or restructure code outside the exact blocks specified.
- Do NOT use em dashes anywhere.
