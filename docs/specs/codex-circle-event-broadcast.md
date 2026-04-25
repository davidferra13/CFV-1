# Circle Event Broadcast

> **Status:** SPEC - Ready for Codex  
> **Priority:** P0  
> **Scope:** When a chef publishes a ticketed event, email all circle members with event details and ticket link.  
> **Risk:** LOW - additive only, no schema changes, no existing behavior modified.

---

## Problem

Circle members have no way to learn about new dinners without manually checking the hub page. This forces the "constant monitoring" behavior described in the Isabella persona. The chef creates an event, enables ticketing, but nobody in the circle knows unless they happen to visit.

## Solution

When `toggleEventTicketing` enables tickets on an event, broadcast an email to all members of that event's circle with: event name, date, location, price range, capacity, and a direct link to the public event page (`/e/[shareToken]`).

## Existing Infrastructure (DO NOT recreate)

- `lib/hub/circle-notification-actions.ts` - has `notifyCircleMembers()` with throttle, quiet hours, digest mode, push support. USE this pattern.
- `lib/email/notifications.ts` - all email dispatchers live here. ADD the new one here.
- `lib/email/templates/circle-message.tsx` - existing circle email template. CREATE a new template modeled on this.
- `lib/tickets/actions.ts:798` - `toggleEventTicketing()` already auto-creates circle. ADD broadcast call here.
- `lib/tickets/purchase-actions.ts:747` - `getUpcomingPublicEvents()` shows how to query share settings + events.

## Files to Create

### 1. `lib/email/templates/circle-event-broadcast.tsx`

New email template. Model it exactly on `lib/email/templates/circle-message.tsx` (same `BaseLayout`, same styling).

**Props:**

```ts
type Props = {
  recipientName: string
  chefName: string
  groupName: string
  eventName: string // event.occasion or "Upcoming Dinner"
  eventDate: string // formatted date string
  eventLocation: string // event.location_city or "TBA"
  priceRange: string // e.g. "$125/person" or "$75 - $150"
  spotsAvailable: string // e.g. "8 spots available" or "Limited spots"
  ticketUrl: string // full URL to /e/[shareToken]
  circleUrl: string // full URL to /hub/g/[groupToken]
}
```

**Email content structure:**

1. Heading: "New dinner from {chefName}"
2. Greeting: "Hi {recipientName},"
3. Body: "{chefName} just posted a new dinner in {groupName}:"
4. Detail box (styled like the `quoteBox` in circle-message.tsx):
   - Event name (bold)
   - Date
   - Location
   - Price
   - Spots available
5. Primary CTA button: "Get Tickets" -> `ticketUrl` (same brown button style as circle-message.tsx: `backgroundColor: '#78350f'`)
6. Secondary link: "View Circle" -> `circleUrl` (plain text link below button)
7. Footer muted text: "You're receiving this because you're a member of {groupName}. You can mute notifications from the circle settings."

**IMPORTANT:** No em dashes anywhere. Use commas or periods instead.

## Files to Modify

### 2. `lib/email/notifications.ts`

**ADD** at the bottom of the file (before the closing comments if any), a new export:

```ts
import { CircleEventBroadcastEmail } from './templates/circle-event-broadcast'

export async function sendCircleEventBroadcastEmail(params: {
  recipientEmail: string
  recipientName: string
  chefName: string
  groupName: string
  eventName: string
  eventDate: string
  eventLocation: string
  priceRange: string
  spotsAvailable: string
  ticketUrl: string
  circleUrl: string
}) {
  await sendEmail({
    to: params.recipientEmail,
    subject: `${params.chefName} posted a new dinner in ${params.groupName}`,
    react: createElement(CircleEventBroadcastEmail, {
      recipientName: params.recipientName,
      chefName: params.chefName,
      groupName: params.groupName,
      eventName: params.eventName,
      eventDate: params.eventDate,
      eventLocation: params.eventLocation,
      priceRange: params.priceRange,
      spotsAvailable: params.spotsAvailable,
      ticketUrl: params.ticketUrl,
      circleUrl: params.circleUrl,
    }),
  })
}
```

**ALSO ADD** the import at the top with the other template imports:

```ts
import { CircleEventBroadcastEmail } from './templates/circle-event-broadcast'
```

### 3. `lib/hub/circle-notification-actions.ts`

**ADD** a new exported function at the bottom of the file:

```ts
/**
 * Broadcast a new ticketed event to all circle members via email.
 * Called when a chef enables ticketing on an event.
 * Respects: muting, notifications_enabled, email preferences.
 * Does NOT respect throttle/quiet hours (this is a one-time announcement, not chat).
 */
export async function broadcastEventToCircleMembers(input: {
  groupId: string
  chefName: string
  eventName: string
  eventDate: string
  eventLocation: string
  priceRange: string
  spotsAvailable: string
  ticketUrl: string
}): Promise<void> {
  try {
    const db: any = createServerClient({ admin: true })

    const [groupResult, membersResult] = await Promise.all([
      db.from('hub_groups').select('name, group_token').eq('id', input.groupId).single(),
      db
        .from('hub_group_members')
        .select(
          'profile_id, notifications_muted, notify_email, hub_guest_profiles(id, email, display_name, notifications_enabled)'
        )
        .eq('group_id', input.groupId),
    ])

    const group = groupResult.data
    const members = membersResult.data ?? []

    if (!group) return

    const circleUrl = `${APP_URL}/hub/g/${group.group_token}`

    for (const member of members) {
      const profile = member.hub_guest_profiles as unknown as {
        id: string
        email: string | null
        display_name: string
        notifications_enabled: boolean
      } | null

      if (!profile) continue
      if (!profile.notifications_enabled) continue
      if (member.notifications_muted) continue
      if (!profile.email) continue

      const emailEnabled = (member as any).notify_email !== false
      if (!emailEnabled) continue

      try {
        const { sendCircleEventBroadcastEmail } = await import('@/lib/email/notifications')
        await sendCircleEventBroadcastEmail({
          recipientEmail: profile.email,
          recipientName: profile.display_name,
          chefName: input.chefName,
          groupName: group.name,
          eventName: input.eventName,
          eventDate: input.eventDate,
          eventLocation: input.eventLocation,
          priceRange: input.priceRange,
          spotsAvailable: input.spotsAvailable,
          ticketUrl: input.ticketUrl,
          circleUrl,
        })
      } catch (err) {
        console.error('[non-blocking] Circle event broadcast email failed', err)
      }
    }
  } catch (err) {
    console.error('[non-blocking] broadcastEventToCircleMembers failed', err)
  }
}
```

### 4. `lib/tickets/actions.ts`

**MODIFY** the `toggleEventTicketing` function (line 798). After the circle auto-creation block (line 843), add the broadcast call. The modified section should look like:

Find this block (around line 835-844):

```ts
// Auto-create dinner circle when ticketing is enabled
if (input.enabled) {
  try {
    const { ensureCircleForEvent } = await import('@/lib/hub/chef-circle-actions')
    await ensureCircleForEvent(input.eventId, user.tenantId!)
  } catch (err) {
    console.error('[toggleEventTicketing] Circle auto-creation failed (non-blocking):', err)
  }
}
```

Replace with:

```ts
// Auto-create dinner circle when ticketing is enabled
if (input.enabled) {
  let circleGroupId: string | null = null
  try {
    const { ensureCircleForEvent } = await import('@/lib/hub/chef-circle-actions')
    const circle = await ensureCircleForEvent(input.eventId, user.tenantId!)
    circleGroupId = circle?.id ?? null
  } catch (err) {
    console.error('[toggleEventTicketing] Circle auto-creation failed (non-blocking):', err)
  }

  // Broadcast to circle members that a new ticketed event is available
  if (circleGroupId) {
    try {
      // Load event details for the broadcast
      const { data: eventData } = await db
        .from('events')
        .select('occasion, event_date, serve_time, location_city, status')
        .eq('id', input.eventId)
        .single()

      const { data: shareData } = await db
        .from('event_share_settings')
        .select('share_token')
        .eq('event_id', input.eventId)
        .single()

      const { data: ticketTypes } = await db
        .from('event_ticket_types')
        .select('price_cents, capacity, sold_count')
        .eq('event_id', input.eventId)
        .eq('is_active', true)

      if (eventData && shareData) {
        const { data: chef } = await db
          .from('chefs')
          .select('business_name, full_name')
          .eq('id', user.tenantId!)
          .single()

        const chefName = chef?.business_name || chef?.full_name || 'Your chef'

        // Build price range from ticket types
        let priceRange = 'See event page'
        if (ticketTypes && ticketTypes.length > 0) {
          const prices = ticketTypes.map((t: any) => t.price_cents)
          const minPrice = Math.min(...prices)
          const maxPrice = Math.max(...prices)
          if (minPrice === maxPrice) {
            priceRange = `$${(minPrice / 100).toFixed(0)}/person`
          } else {
            priceRange = `$${(minPrice / 100).toFixed(0)} - $${(maxPrice / 100).toFixed(0)}`
          }
        }

        // Build spots available
        let spotsAvailable = 'Limited spots'
        if (ticketTypes && ticketTypes.length > 0) {
          const totalCapacity = ticketTypes.reduce(
            (sum: number, t: any) => sum + (t.capacity ?? 0),
            0
          )
          const totalSold = ticketTypes.reduce(
            (sum: number, t: any) => sum + (t.sold_count ?? 0),
            0
          )
          const remaining = totalCapacity - totalSold
          if (totalCapacity > 0 && remaining > 0) {
            spotsAvailable = `${remaining} spots available`
          }
        }

        const ticketUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'}/e/${shareData.share_token}`
        const eventDate = eventData.event_date
          ? new Date(eventData.event_date).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })
          : 'Date TBD'

        const { broadcastEventToCircleMembers } =
          await import('@/lib/hub/circle-notification-actions')
        await broadcastEventToCircleMembers({
          groupId: circleGroupId,
          chefName,
          eventName: eventData.occasion || 'Upcoming Dinner',
          eventDate,
          eventLocation: eventData.location_city || 'Location TBD',
          priceRange,
          spotsAvailable,
          ticketUrl,
        })
      }
    } catch (err) {
      console.error('[toggleEventTicketing] Circle broadcast failed (non-blocking):', err)
    }
  }
}
```

## Verification

After building, verify:

1. `npx tsc --noEmit --skipLibCheck` passes
2. The new template file exists and exports a React component
3. The new email dispatcher is exported from `lib/email/notifications.ts`
4. The `broadcastEventToCircleMembers` function is exported from `lib/hub/circle-notification-actions.ts`
5. `toggleEventTicketing` still returns `{ success: true }` and the broadcast is wrapped in try/catch (non-blocking)

## What NOT to Do

- Do NOT modify any database schema or create migrations
- Do NOT modify the public event page (`/e/[shareToken]`)
- Do NOT modify any other email templates
- Do NOT add new routes or pages
- Do NOT touch the event FSM or transitions
- Do NOT import from `'use server'` files into client components
