# Codex Spec: Ticketing Wiring Completion

> **Type:** Surgical code changes. 2 files only.
> **Risk:** LOW. Small edits to existing files.
> **Time:** ~15 minutes.

Read `CLAUDE.md` before starting. Pay special attention to the Zero Hallucination Rule and Non-Blocking Side Effects pattern.

---

## Context

The ticketed events feature has 5 bugs found in audit. 3 are already fixed (migration written, public-event-view.tsx created, shareToken query added). 2 remain:

| Bug                                | File                           | Status        |
| ---------------------------------- | ------------------------------ | ------------- |
| Toggle button uses wrong heuristic | `event-detail-tickets-tab.tsx` | **THIS SPEC** |
| No ledger entry for ticket revenue | `webhook-handler.ts`           | **THIS SPEC** |

---

## Fix 1: Tickets Tab Toggle Logic

**File:** `app/(chef)/events/[id]/_components/event-detail-tickets-tab.tsx`

### 1A. Add `ticketsEnabled` to Props type

Find this EXACT code (lines 21-29):

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

### 1B. Add `ticketsEnabled` to destructuring

Find this EXACT code (lines 31-39):

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

### 1C. Fix toggle button

Find this EXACT code (lines 228-235):

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

Replace with:

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

### 1D. Update the parent page to pass `ticketsEnabled`

**File:** `app/(chef)/events/[id]/page.tsx`

The page already queries `event_share_settings` via `getEventPublicTicketShare()` (line 250-259) but only returns the `share_token`. We need `tickets_enabled` too.

Find this EXACT function (lines 250-259):

```tsx
async function getEventPublicTicketShare(eventId: string): Promise<string | null> {
  const db: any = createServerClient()
  const { data } = await db
    .from('event_share_settings')
    .select('share_token')
    .eq('event_id', eventId)
    .maybeSingle()

  return data?.share_token ?? null
}
```

Replace with:

```tsx
async function getEventPublicTicketShare(
  eventId: string
): Promise<{ token: string | null; enabled: boolean }> {
  const db: any = createServerClient()
  const { data } = await db
    .from('event_share_settings')
    .select('share_token, tickets_enabled')
    .eq('event_id', eventId)
    .maybeSingle()

  return {
    token: data?.share_token ?? null,
    enabled: data?.tickets_enabled === true,
  }
}
```

Then find where `publicTicketShareToken` is destructured from the Promise.all result. It is at line 907:

```tsx
    publicTicketShareToken,
```

This comes from `getEventPublicTicketShare(params.id).catch(() => null)` at line 913.

Replace that catch at line 913:

```tsx
    getEventPublicTicketShare(params.id).catch(() => null),
```

With:

```tsx
    getEventPublicTicketShare(params.id).catch(() => ({ token: null, enabled: false })),
```

Then find the destructuring assignment. The variable `publicTicketShareToken` at line 907 now holds `{ token, enabled }` instead of a string. You need to update how it is used.

Find lines 903-915 (the full Promise.all destructuring block):

```tsx
const [
  dinnerCircleConfig,
  approvalGates,
  rawCircleConfig,
  publicTicketShareToken,
  popUpProductLibrary,
] = await Promise.all([
  getDinnerCircleConfig(params.id).catch(() => null),
  getApprovalGates(params.id).catch(() => []),
  getRawCircleConfigForEvent(params.id).catch(() => ({})),
  getEventPublicTicketShare(params.id).catch(() => null),
  getPopUpProductLibrary(user.tenantId!).catch(() => []),
])
```

Replace with:

```tsx
const [dinnerCircleConfig, approvalGates, rawCircleConfig, ticketShareResult, popUpProductLibrary] =
  await Promise.all([
    getDinnerCircleConfig(params.id).catch(() => null),
    getApprovalGates(params.id).catch(() => []),
    getRawCircleConfigForEvent(params.id).catch(() => ({})),
    getEventPublicTicketShare(params.id).catch(() => ({ token: null, enabled: false })),
    getPopUpProductLibrary(user.tenantId!).catch(() => []),
  ])
const publicTicketShareToken = ticketShareResult?.token ?? null
const ticketsEnabled = ticketShareResult?.enabled ?? false
```

Then find the `EventDetailTicketsTab` render (line 1443-1451):

```tsx
<EventDetailTicketsTab
  activeTab={activeTab}
  eventId={event.id}
  eventStatus={event.status}
  ticketTypes={ticketTypes as any[]}
  tickets={ticketList as any[]}
  summary={ticketSummary}
  shareToken={publicTicketShareToken}
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
  shareToken={publicTicketShareToken}
  ticketsEnabled={ticketsEnabled}
/>
```

Also find any usage of `publicTicketShareToken` for the URL construction (around line 980-981):

```tsx
  const publicTicketShareUrl = publicTicketShareToken
    ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'}/e/${publicTicketShareToken}`
```

This should still work because `publicTicketShareToken` is now extracted as a string from the result object. Verify this line still compiles.

---

## Fix 2: Ledger Entry for Ticket Revenue

**File:** `lib/tickets/webhook-handler.ts`

When a ticket purchase completes, the webhook marks it paid and creates guest records, but never creates a ledger entry. This means ticket revenue is invisible in financial views.

Find this EXACT code block (lines 279-309). This is section "3. Create event guest record":

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

Replace with (adds ledger entry BEFORE the guest record, as a new numbered section):

```tsx
// 3. Record ticket revenue in ledger
try {
  const amountCents = session.amount_total ?? 0
  if (amountCents > 0) {
    await db.from('ledger_entries').insert({
      tenant_id,
      event_id,
      entry_type: 'income',
      category: 'ticket_sale',
      amount_cents: amountCents,
      description: `Ticket purchase: ${ticket.buyer_name} (${ticket.quantity ?? 1}x)`,
      reference_type: 'event_ticket',
      reference_id: ticket_id,
      created_at: new Date().toISOString(),
    })
  }
} catch (ledgerErr) {
  // Non-blocking: financial view will be slightly behind until manual reconciliation
  console.error('[handleTicketPurchaseCompleted] Ledger entry failed (non-blocking):', ledgerErr)
}

// 4. Create event guest record
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

**IMPORTANT:** After inserting the new section 3, renumber all subsequent comment headers in the function:

- Old "4. Auto-join dinner circle" becomes "5. Auto-join dinner circle"
- Old "5. Send confirmation email" becomes "6. Send confirmation email"
- Old "6. Notify chef" becomes "7. Notify chef"
- Old "7. Invalidate caches" becomes "8. Invalidate caches"

Search for these comment lines and update the numbers.

---

## Verification

After all edits:

```bash
# Type check the edited files
npx tsc --noEmit --skipLibCheck 2>&1 | grep -E "(event-detail-tickets-tab|webhook-handler|events/\[id\]/page)" || echo "No type errors in edited files"

# Verify toggle fix landed
grep -n "ticketsEnabled" "app/(chef)/events/[id]/_components/event-detail-tickets-tab.tsx" | head -5
# Expected: at least 3 matches (Props type, destructuring, button onClick)

# Verify ledger entry landed
grep -n "ledger_entries" "lib/tickets/webhook-handler.ts" | head -3
# Expected: at least 1 match

# Verify ticketsEnabled passed from parent
grep -n "ticketsEnabled" "app/(chef)/events/[id]/page.tsx" | head -5
# Expected: at least 2 matches (variable declaration, prop passing)
```

---

## Rules

- Edit ONLY these 2 files:
  - `app/(chef)/events/[id]/_components/event-detail-tickets-tab.tsx`
  - `lib/tickets/webhook-handler.ts`
  - `app/(chef)/events/[id]/page.tsx` (for passing the prop)
- The ledger entry is a NON-BLOCKING side effect (wrapped in try/catch, logged on failure).
- All monetary amounts are in cents (use `session.amount_total` directly).
- The `ledger_entries` table uses `amount_cents` (integer), `entry_type` ('income'|'expense'), and `category` (string).
- Do NOT modify the ledger_entries table schema. It already exists.
- No em dashes anywhere.
- Do NOT run drizzle-kit push.
