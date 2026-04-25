# Consumer Hub: Upcoming Events from My Circles

> **Status:** SPEC - Ready for Codex  
> **Priority:** P0  
> **Scope:** Add an "Upcoming" tab to the consumer profile page (`/hub/me/[profileToken]`) showing ticketed events from all circles the guest belongs to.  
> **Risk:** LOW - adds one new server action, adds one new tab to existing component. No schema changes.

---

## Problem

A guest who belongs to multiple Dinner Circles has no single place to see upcoming events across all their circles. They must visit each circle page individually, which recreates the "constant monitoring" problem. Isabella needs ONE view of "what dinners are coming up from chefs I follow."

## Solution

Add an "Upcoming" tab to the existing `/hub/me/[profileToken]` profile page. This tab shows all upcoming ticketed events from circles the guest is a member of, sorted by date. Each event card links directly to the public event page (`/e/[shareToken]`) for ticket purchase.

## Existing Infrastructure (DO NOT recreate)

- `app/(public)/hub/me/[profileToken]/page.tsx` - Server component that loads profile, event history, and groups. ADD the new data fetch here.
- `app/(public)/hub/me/[profileToken]/profile-view.tsx` - Client component with tabs (dinners, groups, dietary). ADD the new tab here.
- `lib/hub/profile-actions.ts` - Server actions for profile data. ADD the new query here.
- `lib/tickets/purchase-actions.ts:747` - `getUpcomingPublicEvents(tenantId)` shows how to query upcoming events with tickets. USE this pattern.

## Files to Modify

### 1. `lib/hub/profile-actions.ts`

**ADD** a new exported function at the bottom of the file:

```ts
/**
 * Get upcoming ticketed events from all circles a guest profile belongs to.
 * Returns events with tickets enabled, event_date >= today, status not cancelled/completed.
 * Public - uses profile token for access (no auth required).
 */
export async function getUpcomingEventsForProfile(profileToken: string): Promise<
  {
    id: string
    occasion: string | null
    event_date: string | null
    location_city: string | null
    share_token: string
    chef_name: string | null
    circle_name: string | null
    circle_token: string | null
    ticket_types: {
      name: string
      price_cents: number
      capacity: number | null
      sold_count: number
    }[]
  }[]
> {
  const db: any = createServerClient({ admin: true })

  // Get profile by token
  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', profileToken)
    .single()

  if (!profile) return []

  // Get all circles this profile is a member of
  const { data: memberships } = await db
    .from('hub_group_members')
    .select('group_id')
    .eq('profile_id', profile.id)

  if (!memberships || memberships.length === 0) return []

  const groupIds = memberships.map((m: any) => m.group_id)

  // Get groups with their linked events and tenant info
  const { data: groups } = await db
    .from('hub_groups')
    .select('id, name, group_token, tenant_id')
    .in('id', groupIds)
    .eq('is_active', true)

  if (!groups || groups.length === 0) return []

  // Collect all tenant IDs to find their upcoming events
  const tenantIds = [...new Set(groups.map((g: any) => g.tenant_id).filter(Boolean))]
  if (tenantIds.length === 0) return []

  const today = new Date().toISOString().split('T')[0]
  const results: {
    id: string
    occasion: string | null
    event_date: string | null
    location_city: string | null
    share_token: string
    chef_name: string | null
    circle_name: string | null
    circle_token: string | null
    ticket_types: {
      name: string
      price_cents: number
      capacity: number | null
      sold_count: number
    }[]
  }[] = []

  // For each tenant, find upcoming ticketed events
  for (const tenantId of tenantIds) {
    // Get share settings with tickets enabled
    const { data: shares } = await db
      .from('event_share_settings')
      .select('event_id, share_token')
      .eq('tenant_id', tenantId)
      .eq('tickets_enabled', true)

    if (!shares || shares.length === 0) continue

    const eventIds = shares.map((s: any) => s.event_id)
    const tokenMap = new Map(shares.map((s: any) => [s.event_id, s.share_token]))

    // Get upcoming events (not cancelled, not completed, date >= today)
    const { data: events } = await db
      .from('events')
      .select('id, occasion, event_date, location_city, status')
      .eq('tenant_id', tenantId)
      .in('id', eventIds)
      .gte('event_date', today)
      .not('status', 'in', '("cancelled","completed")')
      .order('event_date', { ascending: true })

    if (!events || events.length === 0) continue

    // Get chef name
    const { data: chef } = await db
      .from('chefs')
      .select('business_name, full_name')
      .eq('id', tenantId)
      .single()

    const chefName = chef?.business_name || chef?.full_name || null

    // Find the circle for this tenant
    const tenantGroup = groups.find((g: any) => g.tenant_id === tenantId)

    for (const event of events) {
      // Get ticket types for this event
      const { data: ticketTypes } = await db
        .from('event_ticket_types')
        .select('name, price_cents, capacity, sold_count')
        .eq('event_id', event.id)
        .eq('is_active', true)

      results.push({
        id: event.id,
        occasion: event.occasion,
        event_date: event.event_date,
        location_city: event.location_city,
        share_token: tokenMap.get(event.id) as string,
        chef_name: chefName,
        circle_name: tenantGroup?.name ?? null,
        circle_token: tenantGroup?.group_token ?? null,
        ticket_types: (ticketTypes ?? []).map((t: any) => ({
          name: t.name,
          price_cents: t.price_cents,
          capacity: t.capacity,
          sold_count: t.sold_count,
        })),
      })
    }
  }

  // Sort by event_date ascending
  results.sort((a, b) => {
    if (!a.event_date) return 1
    if (!b.event_date) return -1
    return a.event_date.localeCompare(b.event_date)
  })

  return results
}
```

### 2. `app/(public)/hub/me/[profileToken]/page.tsx`

**ADD** import for the new function. Find the existing imports at the top:

```ts
import {
  getProfileByToken,
  getProfileEventHistory,
  getProfileGroups,
} from '@/lib/hub/profile-actions'
```

Replace with:

```ts
import {
  getProfileByToken,
  getProfileEventHistory,
  getProfileGroups,
  getUpcomingEventsForProfile,
} from '@/lib/hub/profile-actions'
```

**ADD** the new data fetch to the `Promise.all` block. Find (around line 37):

```ts
const [eventHistory, groupMemberships, unreadCounts] = await Promise.all([
  getProfileEventHistory(profileToken),
  getProfileGroups(profileToken),
  getHubUnreadCounts(profileToken).catch(() => []),
])
```

Replace with:

```ts
const [eventHistory, groupMemberships, unreadCounts, upcomingEvents] = await Promise.all([
  getProfileEventHistory(profileToken),
  getProfileGroups(profileToken),
  getHubUnreadCounts(profileToken).catch(() => []),
  getUpcomingEventsForProfile(profileToken).catch(() => []),
])
```

**ADD** the `upcomingEvents` prop to the `ProfileView` component. Find (around line 59):

```ts
  return (
    <ProfileView
      profile={profile}
      eventHistory={eventHistory}
      groups={
```

Replace with:

```ts
  return (
    <ProfileView
      profile={profile}
      eventHistory={eventHistory}
      upcomingEvents={upcomingEvents}
      groups={
```

### 3. `app/(public)/hub/me/[profileToken]/profile-view.tsx`

**MODIFY** the `ProfileViewProps` interface. Find:

```ts
interface ProfileViewProps {
  profile: HubGuestProfile
  eventHistory: HubGuestEventHistory[]
  groups: (HubGroup & { memberRole: string; unreadCount: number })[]
}
```

Replace with:

```ts
interface UpcomingEvent {
  id: string
  occasion: string | null
  event_date: string | null
  location_city: string | null
  share_token: string
  chef_name: string | null
  circle_name: string | null
  circle_token: string | null
  ticket_types: { name: string; price_cents: number; capacity: number | null; sold_count: number }[]
}

interface ProfileViewProps {
  profile: HubGuestProfile
  eventHistory: HubGuestEventHistory[]
  upcomingEvents: UpcomingEvent[]
  groups: (HubGroup & { memberRole: string; unreadCount: number })[]
}
```

**MODIFY** the component function signature. Find:

```ts
export function ProfileView({ profile: initialProfile, eventHistory, groups }: ProfileViewProps) {
```

Replace with:

```ts
export function ProfileView({ profile: initialProfile, eventHistory, upcomingEvents, groups }: ProfileViewProps) {
```

**MODIFY** the `Tab` type. Find:

```ts
type Tab = 'dinners' | 'groups' | 'dietary'
```

Replace with:

```ts
type Tab = 'upcoming' | 'dinners' | 'groups' | 'dietary'
```

**MODIFY** the `tabs` array. Find:

```ts
const tabs: { id: Tab; label: string; emoji: string; count?: number }[] = [
  { id: 'dinners', label: 'My Dinners', emoji: '🍽️', count: eventHistory.length },
  { id: 'groups', label: 'My Groups', emoji: '👥', count: groups.length },
  { id: 'dietary', label: 'Dietary', emoji: '🥗' },
]
```

Replace with:

```ts
const tabs: { id: Tab; label: string; emoji: string; count?: number }[] = [
  {
    id: 'upcoming',
    label: 'Upcoming',
    emoji: '🔥',
    count: upcomingEvents.length > 0 ? upcomingEvents.length : undefined,
  },
  { id: 'dinners', label: 'My Dinners', emoji: '🍽️', count: eventHistory.length },
  { id: 'groups', label: 'My Groups', emoji: '👥', count: groups.length },
  { id: 'dietary', label: 'Dietary', emoji: '🥗' },
]
```

**MODIFY** the default active tab. Find:

```ts
const [activeTab, setActiveTab] = useState<Tab>('dinners')
```

Replace with:

```ts
const [activeTab, setActiveTab] = useState<Tab>(upcomingEvents.length > 0 ? 'upcoming' : 'dinners')
```

**ADD** the upcoming events tab content. Find the line `{activeTab === 'dinners' && (` and add the following block BEFORE it:

```tsx
{
  activeTab === 'upcoming' && (
    <div className="space-y-3">
      {upcomingEvents.length === 0 ? (
        <div className="py-12 text-center text-sm text-stone-600">
          No upcoming dinners from your circles right now. When a chef in one of your circles posts
          a new event, it will appear here.
        </div>
      ) : (
        upcomingEvents.map((event) => {
          const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
          const ticketUrl = `${appUrl}/e/${event.share_token}`

          // Calculate price range and availability
          let priceDisplay = ''
          let spotsDisplay = ''
          if (event.ticket_types.length > 0) {
            const prices = event.ticket_types.map((t) => t.price_cents)
            const min = Math.min(...prices)
            const max = Math.max(...prices)
            priceDisplay =
              min === max
                ? `$${(min / 100).toFixed(0)}`
                : `$${(min / 100).toFixed(0)} - $${(max / 100).toFixed(0)}`

            const totalCap = event.ticket_types.reduce((s, t) => s + (t.capacity ?? 0), 0)
            const totalSold = event.ticket_types.reduce((s, t) => s + t.sold_count, 0)
            const remaining = totalCap - totalSold
            if (totalCap > 0) {
              spotsDisplay = remaining > 0 ? `${remaining} spots left` : 'Sold out'
            }
          }

          return (
            <a
              key={event.id}
              href={`/e/${event.share_token}`}
              className="block rounded-xl border border-stone-800 bg-stone-900/50 p-4 transition-colors hover:border-[#e88f47]/50 hover:bg-stone-800/50"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-stone-200">
                    {event.occasion ?? 'Upcoming Dinner'}
                  </h3>
                  <p className="mt-0.5 text-xs text-stone-500">
                    by {event.chef_name ?? 'Chef'}
                    {event.circle_name ? ` in ${event.circle_name}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs font-medium text-stone-300">
                    {event.event_date
                      ? new Date(event.event_date + 'T12:00:00').toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'Date TBD'}
                  </div>
                  {event.location_city && (
                    <div className="mt-0.5 text-xs text-stone-500">{event.location_city}</div>
                  )}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-stone-800 pt-3">
                <div className="flex gap-3 text-xs">
                  {priceDisplay && <span className="text-stone-400">{priceDisplay}/person</span>}
                  {spotsDisplay && (
                    <span
                      className={spotsDisplay === 'Sold out' ? 'text-red-400' : 'text-green-400'}
                    >
                      {spotsDisplay}
                    </span>
                  )}
                </div>
                <span className="rounded-full bg-[#78350f] px-3 py-1 text-xs font-medium text-white">
                  {spotsDisplay === 'Sold out' ? 'Sold Out' : 'Get Tickets'}
                </span>
              </div>
            </a>
          )
        })
      )}
    </div>
  )
}
```

## Verification

After building, verify:

1. `npx tsc --noEmit --skipLibCheck` passes
2. The `getUpcomingEventsForProfile` function is exported from `lib/hub/profile-actions.ts`
3. The `ProfileView` component accepts and renders the `upcomingEvents` prop
4. The tab defaults to "Upcoming" when there are upcoming events, "My Dinners" otherwise
5. Each event card links to `/e/[shareToken]` (the public ticket purchase page)
6. When there are no upcoming events, the empty state message is shown

## What NOT to Do

- Do NOT modify any database schema or create migrations
- Do NOT create new routes or pages (this modifies existing ones only)
- Do NOT modify the public event page (`/e/[shareToken]`)
- Do NOT modify any email templates
- Do NOT touch the event FSM, transitions, or ticket purchase flow
- Do NOT modify `lib/hub/group-actions.ts` or circle creation logic
- Do NOT add authentication requirements (this page is public, accessed via profile token)
