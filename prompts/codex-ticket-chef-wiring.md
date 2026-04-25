# Codex Build: Chef-Side Ticket Wiring Fix

> **Scope:** Edit exactly 2 files. Surgical find-and-replace.
> **Risk:** LOW. No schema changes. No new files. No public routes.
> **Parallel safety:** Does NOT touch `lib/tickets/webhook-handler.ts` (another agent handles that).

---

## RULES (read before doing ANYTHING)

1. Read `CLAUDE.md` first. Follow all rules there.
2. Edit ONLY the 2 files listed below. Do not create, delete, or edit any other file.
3. No em dashes anywhere (use hyphens, commas, or semicolons).
4. Do NOT run database migrations or `drizzle-kit push`.
5. Do NOT modify any imports that already exist, only add new ones if specified.
6. After edits, run the verification commands. If they fail on YOUR changes, fix them. If they fail on OTHER files, ignore those.

---

## Problem

The chef's event detail page passes RSVP share data (from `event_shares` table) into the tickets tab. But ticket sales use a DIFFERENT table: `event_share_settings`. This means:

- The public ticket page URL shown to the chef is wrong (or missing)
- The "Enable/Disable Sales" toggle uses a heuristic instead of the real `tickets_enabled` flag

---

## File 1: `app/(chef)/events/[id]/page.tsx`

### Change 1A: Add event_share_settings query

Find this exact code block (around line 541-546):

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
  const ticketSettingsDb: any = createServerClient()
  const { data: ticketSettings } = await ticketSettingsDb
    .from('event_share_settings')
    .select('share_token, tickets_enabled')
    .eq('event_id', params.id)
    .eq('tenant_id', user.tenantId!)
    .maybeSingle()

  ticketShareToken = ticketSettings?.share_token ?? null
  ticketsEnabled = ticketSettings?.tickets_enabled === true
} catch (settingsError) {
  console.error('[EventDetailPage] Failed to load ticket share settings:', settingsError)
}
```

**Important:** `createServerClient` is already imported at the top of this file. Do NOT add a duplicate import.

### Change 1B: Pass correct props to EventDetailTicketsTab

Find this exact code block (around line 1014-1022):

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

## File 2: `app/(chef)/events/[id]/_components/event-detail-tickets-tab.tsx`

### Change 2A: Update Props type

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

### Change 2B: Update function destructuring

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

### Change 2C: Fix toggle button logic

Find this exact code (around line 206-213):

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

## Verification

Run these commands after all edits:

```bash
# Type check (focus on your files only)
npx tsc --noEmit --skipLibCheck 2>&1 | grep -E "(events/\[id\]/page|event-detail-tickets-tab)" || echo "No type errors in edited files"

# Verify new code is present
grep -n "ticketShareToken" "app/(chef)/events/[id]/page.tsx" | head -5
grep -n "ticketsEnabled" "app/(chef)/events/[id]/_components/event-detail-tickets-tab.tsx" | head -5

# Verify old code is gone
grep -n "activeShare as any" "app/(chef)/events/[id]/page.tsx" | grep -i "share_token" && echo "FAIL: old RSVP share_token prop still present" || echo "OK: old prop removed"
grep -n "ticketTypes.length > 0 && !summary" "app/(chef)/events/[id]/_components/event-detail-tickets-tab.tsx" && echo "FAIL: old toggle heuristic still present" || echo "OK: old toggle removed"
```

Expected results:

- No type errors in the two edited files
- `ticketShareToken` appears in the event page
- `ticketsEnabled` appears in the tickets tab
- Old RSVP `share_token` prop is gone
- Old `ticketTypes.length > 0 && !summary` heuristic is gone

---

## What NOT to do

- Do NOT edit `lib/tickets/webhook-handler.ts` (another agent handles that)
- Do NOT edit `app/(public)/e/[shareToken]/public-event-view.tsx`
- Do NOT edit any migration files
- Do NOT add new imports to the tickets tab file (it already has everything it needs)
- Do NOT touch the `handleToggleTicketing` function body (it already calls `toggleEventTicketing` which writes to `event_share_settings`)
- Do NOT run `drizzle-kit push`
