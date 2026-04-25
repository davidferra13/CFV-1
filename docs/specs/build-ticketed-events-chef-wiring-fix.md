# Build Spec: Ticketed Events Chef Wiring Fix

> **Scope:** Edit exactly 2 files.
> **Risk:** Low. No schema changes. No public route changes.
> **Mode:** configuring
> **Highest leverage action:** Wire the chef event tickets tab to `event_share_settings` so the public ticket page link and enable/disable control use the same source of truth as public purchasing.

Read `CLAUDE.md` before starting.

---

## Recommendation

Build this next: fix chef-side ticketing wiring.

This is the highest-leverage remaining ticketed-events action because the public ticket page now exists and the ticketing actions use `event_share_settings`, but the chef event page still passes RSVP share data into the ticket sales tab. That can leave chefs without the correct `/e/[shareToken]` link and can make the sales toggle label/action drift from the real `tickets_enabled` state.

---

## Evidence

- Public event loading uses `event_share_settings` by `share_token`: `lib/tickets/purchase-actions.ts` lines 75-82.
- Public event data exposes `ticketsEnabled` from `share.tickets_enabled`: `lib/tickets/purchase-actions.ts` lines 125-146.
- Ticket purchase also resolves the submitted token through `event_share_settings` and rejects disabled tickets: `lib/tickets/purchase-actions.ts` lines 242-250.
- Chef-side `toggleEventTicketing` already upserts `event_share_settings`: `lib/tickets/actions.ts` lines 436-453.
- The migration for the ticketing share settings table already exists: `database/migrations/20260425000002_ticketed_events_share_settings.sql` lines 8-23.
- The chef event page still computes an RSVP share URL from `guestShares`: `app/(chef)/events/[id]/page.tsx` lines 599-603.
- The chef event page still passes `(activeShare as any)?.share_token` into `EventDetailTicketsTab`: `app/(chef)/events/[id]/page.tsx` lines 1014-1022.
- The ticket tab constructs the public ticket URL from the `shareToken` prop: `app/(chef)/events/[id]/_components/event-detail-tickets-tab.tsx` lines 57-58.
- The ticket tab currently has no `ticketsEnabled` prop: `app/(chef)/events/[id]/_components/event-detail-tickets-tab.tsx` lines 20-28.
- The ticket tab currently toggles sales using `ticketTypes.length > 0 && !summary` and labels the button from `summary`: `app/(chef)/events/[id]/_components/event-detail-tickets-tab.tsx` lines 206-213.

---

## Files To Edit

Edit only:

1. `app/(chef)/events/[id]/page.tsx`
2. `app/(chef)/events/[id]/_components/event-detail-tickets-tab.tsx`

Do not edit:

- `app/(public)/e/[shareToken]/public-event-view.tsx`
- `lib/tickets/purchase-actions.ts`
- `lib/tickets/actions.ts`
- migrations
- docs

---

## Implementation

### 1. Fetch ticket share settings on the chef event page

In `app/(chef)/events/[id]/page.tsx`, after the existing ticket sales data fetch around lines 541-546, add a small `event_share_settings` lookup:

```tsx
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

This is additive and uses the same table that public loading and ticket purchase already use.

### 2. Pass ticket settings into the tickets tab

In the `EventDetailTicketsTab` render around lines 1014-1022, replace the RSVP-derived `shareToken` prop with the ticket share token and pass `ticketsEnabled`:

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

### 3. Add `ticketsEnabled` to the tab props

In `app/(chef)/events/[id]/_components/event-detail-tickets-tab.tsx`, update `Props`:

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

Update the component destructuring:

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

### 4. Fix the sales toggle control

Replace the current toggle button logic around lines 206-213:

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

Keep the existing `handleToggleTicketing` function. It already calls `toggleEventTicketing`, and that server action already writes `event_share_settings`.

---

## Verification

Run these targeted checks:

```bash
npx tsc --noEmit --skipLibCheck 2>&1 | grep -E "(events/\\[id\\]/page|event-detail-tickets-tab)" || echo "No type errors in edited ticket wiring files"
rg -n "ticketShareToken|ticketsEnabled|event_share_settings" "app/(chef)/events/[id]/page.tsx" "app/(chef)/events/[id]/_components/event-detail-tickets-tab.tsx"
rg -n "activeShare as any\\)\\?\\.share_token|ticketTypes.length > 0 && !summary|summary \\? 'Disable Sales'" "app/(chef)/events/[id]/page.tsx" "app/(chef)/events/[id]/_components/event-detail-tickets-tab.tsx" && exit 1 || echo "Old ticket wiring removed"
```

Expected:

- Type check shows no errors in the edited ticket wiring files.
- `ticketShareToken`, `ticketsEnabled`, and `event_share_settings` are present in the expected files.
- The old RSVP `share_token` prop and summary-based toggle heuristic are gone.

---

## Rules

- Edit only the 2 files listed above.
- Keep all changes additive and surgical.
- Do not touch the public event view.
- Do not touch migrations.
- Do not run database migrations.
- Do not alter auth.
- Do not add imports from `@/components/ui/*` to public files.
- No em dashes.
- Preserve unrelated dirty work in the repository.
