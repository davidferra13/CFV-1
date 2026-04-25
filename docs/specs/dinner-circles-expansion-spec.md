# Dinner Circles Expansion: Build Spec

> **Senior engineering recommendation.** Four independent Codex tasks.
> Informed by MemPalace audit findings: A5 (CIL no consumer), A1 (Open Tables half-built),
> O4 (config blob hidden from guests), F8 (farm dinner co-hosting real use case).

---

## What Already Exists (DO NOT REBUILD)

| System                                 | Status                  | Key Files                                                                                 |
| -------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------- |
| Hub groups + members + messages        | BUILT                   | `lib/hub/group-actions.ts`, `lib/hub/types.ts`                                            |
| Guest profiles (cookie-based identity) | BUILT                   | `lib/hub/profile-actions.ts`                                                              |
| Circle view with 9 tabs                | BUILT                   | `app/(public)/hub/g/[groupToken]/hub-group-view.tsx`                                      |
| Join flow                              | BUILT                   | `app/(public)/hub/join/[groupToken]/join-form.tsx`                                        |
| Community circle discovery             | BUILT                   | `lib/hub/community-circle-actions.ts`, `app/(public)/hub/circles/`                        |
| DinnerCircleConfig (JSONB blob)        | BUILT                   | `lib/dinner-circles/types.ts`, `lib/dinner-circles/event-circle.ts`                       |
| Layout zones + timeline in config      | BUILT (chef-side only)  | `normalizeDinnerCircleConfig` has defaults                                                |
| Open Tables schema                     | BUILT (columns + index) | `hub_groups.is_open_table`, `open_seats`, `display_area`, `display_vibe`, `dietary_theme` |
| Open Tables guest prefs                | BUILT (columns only)    | `hub_guest_profiles.open_tables_interested`, `open_tables_notify`                         |
| Ticket auto-join to circles            | BUILT                   | `lib/tickets/webhook-handler.ts`                                                          |
| 55+ hub components                     | BUILT                   | `components/hub/`                                                                         |
| Themed wrapper (palette/accent)        | BUILT                   | `components/hub/themed-wrapper.tsx`                                                       |
| Chef proof (past events)               | BUILT                   | `components/hub/circle-chef-proof.tsx`                                                    |

---

## What To Build (4 Tasks)

### Task 1: Open Tables Discovery Page

**What:** Public page at `/hub/open-tables` where anyone can browse dinners with open seats and request to join.

**Why:** The entire Open Tables schema is built (columns, index, guest preferences) but there is ZERO UI to discover them. This is "find a dinner near me" for real.

**Scope:**

- New server action: `lib/hub/open-tables-actions.ts`
- New page: `app/(public)/hub/open-tables/page.tsx`
- New component: `components/hub/open-tables-grid.tsx`

**Server action (`lib/hub/open-tables-actions.ts`):**

```ts
'use server'

import { createServerClient } from '@/lib/db/server'

export type OpenTableListing = {
  id: string
  name: string
  emoji: string | null
  groupToken: string
  displayArea: string | null
  displayVibe: string[] | null
  dietaryTheme: string[] | null
  openSeats: number | null
  maxGroupSize: number | null
  closesAt: string | null
  memberCount: number
  lastMessageAt: string | null
}

export async function getOpenTables(filters?: {
  area?: string
  vibe?: string
  dietary?: string
}): Promise<OpenTableListing[]> {
  const db: any = createServerClient({ admin: true })

  let query = db
    .from('hub_groups')
    .select(
      `
      id, name, emoji, group_token, display_area, display_vibe,
      dietary_theme, open_seats, max_group_size, closes_at,
      member_count, last_message_at
    `
    )
    .eq('is_open_table', true)
    .eq('is_active', true)
    .in('visibility', ['public'])
    .order('last_message_at', { ascending: false, nullsFirst: false })

  if (filters?.area) {
    query = query.ilike('display_area', `%${filters.area}%`)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getOpenTables] Error:', error)
    return []
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    groupToken: row.group_token,
    displayArea: row.display_area,
    displayVibe: row.display_vibe,
    dietaryTheme: row.dietary_theme,
    openSeats: row.open_seats,
    maxGroupSize: row.max_group_size,
    closesAt: row.closes_at,
    memberCount: row.member_count ?? 0,
    lastMessageAt: row.last_message_at,
  }))
}
```

**Page (`app/(public)/hub/open-tables/page.tsx`):**

- Server component
- Calls `getOpenTables()`, passes results to client component
- Page title: "Open Tables"
- Meta description for SEO

**Component (`components/hub/open-tables-grid.tsx`):**

- `'use client'` component
- Props: `listings: OpenTableListing[]`
- Search input filtering by `displayArea`
- Filter chips for vibe tags (from all unique `displayVibe` values across listings)
- Grid of cards, each showing:
  - Emoji + name
  - Area (city/neighborhood)
  - Vibe tags as small badges
  - Dietary themes as small badges
  - "X seats open" or "Closes [date]" if closesAt exists
  - Member count: "Y people joined"
  - Link to `/hub/join/{groupToken}`
- Empty state: "No open tables right now. Check back soon."
- Client-side filtering only (no server round-trips for filters)

**Patterns:**

- Follow `app/(public)/hub/circles/page.tsx` pattern for page layout
- Follow `components/hub/community-circle-card.tsx` pattern for card design
- Use Tailwind only (public page, no shadcn)
- No authentication required

**DO NOT:**

- Create database tables or migrations
- Add authentication gates
- Modify existing hub pages or components
- Add real-time features

---

### Task 2: Guest Event Timeline & Layout View

**What:** Add a "Plan" tab to the circle view that renders the event timeline and layout zones from `DinnerCircleConfig` so guests can see what's happening and where.

**Why:** Chefs configure layout zones (kitchen, prep, service, guest area) and timeline items (load-in, prep, plating, service) in `DinnerCircleConfig.layout`. Guests never see this. They show up to an event with zero idea of the physical flow. This surfaces existing data.

**Scope:**

- New component: `components/hub/circle-event-plan.tsx`
- Modify: `app/(public)/hub/g/[groupToken]/hub-group-view.tsx` (add tab + render component)
- Modify: `app/(public)/hub/g/[groupToken]/page.tsx` (pass config data)

**Data source:** `DinnerCircleConfig.layout` (already fetched on the page via `event_share_settings.circle_config`). Types from `lib/dinner-circles/types.ts`:

```ts
type DinnerCircleLayoutZone = {
  id: string
  label: string
  kind: 'kitchen' | 'prep' | 'service' | 'guest' | 'storage' | 'path'
  x: number
  y: number
  w: number
  h: number
  notes?: string
}

type DinnerCircleTimelineItem = {
  time: string // e.g. "T-90", "T-45", "6:00 PM"
  title: string
  zoneId?: string // links to a zone
  notes?: string
}
```

**Component (`components/hub/circle-event-plan.tsx`):**

- Props: `layout: DinnerCircleConfig['layout'] | undefined`, `eventDate?: string`
- If no layout or empty zones + empty timeline, return null (tab hides)
- Two sections:

**Section 1: "The Flow" (timeline)**

- Vertical timeline list, each item showing:
  - Time in bold (left column, fixed width)
  - Title (right column)
  - Zone badge if zoneId links to a zone (show zone label with kind-based color)
  - Notes in muted text below if present
- Kind-based colors: kitchen = orange, prep = blue, service = green, guest = purple, storage = gray, path = teal

**Section 2: "The Space" (layout zones)**

- Simple grid of zone cards (NOT a spatial map, ignore x/y/w/h coordinates)
- Each card: zone label, kind badge, notes if present
- Guest-friendly labels: "kitchen" -> "Kitchen", "prep" -> "Prep Area", "service" -> "Service Station", "guest" -> "Guest Area", "storage" -> "Storage", "path" -> "Flow Path"

**Integration into hub-group-view.tsx:**

- Add `'plan'` to the `Tab` type union
- Add tab button: label "Plan", icon could be a calendar or map icon
- Only show tab if layout data exists and has content (zones.length > 0 or timeline.length > 0)
- Render `<CircleEventPlan layout={...} />` when active tab is 'plan'

**Getting the data to the component:**

- In `app/(public)/hub/g/[groupToken]/page.tsx`, the `circle_config` is likely already fetched (check if it comes through `event_share_settings`). If not, add a query for `event_share_settings.circle_config` where `event_id = group.event_id`. Pass `circleConfig` as a prop to `HubGroupView`.
- In `HubGroupView`, extract `circleConfig?.layout` and pass to `CircleEventPlan`.

**Patterns:**

- Follow existing tab pattern in `hub-group-view.tsx` (conditionally visible tabs like 'events', 'schedule', 'notes')
- Use `ThemedWrapper` context for accent colors if available
- Tailwind only, mobile-first

**DO NOT:**

- Build a drag-and-drop layout editor
- Render zones spatially using x/y/w/h coordinates (too complex for Codex, save for later)
- Modify `DinnerCircleConfig` types or `normalizeDinnerCircleConfig`
- Add mutation capabilities (this is read-only for guests)

---

### Task 3: RSVP Status for Circle Members

**What:** Add RSVP functionality so circle members can indicate going/maybe/not going, and the chef can see a summary.

**Why:** Circle join is currently binary (in or out). There is no way for a guest to say "I'm coming" vs "I'm interested but unsure." The `rsvp_update` message type exists but has no backing action or UI.

**Scope:**

- New migration: `database/migrations/XXXX_add_rsvp_status.sql`
- New server action: `lib/hub/rsvp-actions.ts`
- New component: `components/hub/circle-rsvp-bar.tsx`
- Modify: `app/(public)/hub/g/[groupToken]/hub-group-view.tsx` (add RSVP bar)
- Modify: `app/(public)/hub/g/[groupToken]/page.tsx` (pass RSVP data)

**Migration SQL (create file but DO NOT RUN IT):**

```sql
-- Add RSVP status to hub_group_members
ALTER TABLE hub_group_members
ADD COLUMN IF NOT EXISTS rsvp_status text DEFAULT 'no_response'
CHECK (rsvp_status IN ('going', 'maybe', 'not_going', 'no_response'));

-- Index for quick RSVP summaries
CREATE INDEX IF NOT EXISTS idx_hub_group_members_rsvp
ON hub_group_members (group_id, rsvp_status)
WHERE rsvp_status != 'no_response';
```

**IMPORTANT: Pick a migration timestamp HIGHER than the highest existing one in `database/migrations/`. Glob the directory first.**

**Server action (`lib/hub/rsvp-actions.ts`):**

```ts
'use server'

import { createServerClient } from '@/lib/db/server'
import { cookies } from 'next/headers'

export type RsvpStatus = 'going' | 'maybe' | 'not_going' | 'no_response'

export type RsvpSummary = {
  going: number
  maybe: number
  notGoing: number
  noResponse: number
  total: number
}

export async function updateRsvpStatus(input: {
  groupId: string
  status: RsvpStatus
}): Promise<{ success: boolean; error?: string }> {
  const cookieStore = await cookies()
  const profileToken = cookieStore.get('hub_profile_token')?.value
  if (!profileToken) return { success: false, error: 'Not authenticated' }

  const db: any = createServerClient({ admin: true })

  // Resolve profile
  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', profileToken)
    .single()

  if (!profile) return { success: false, error: 'Profile not found' }

  // Update RSVP
  const { error } = await db
    .from('hub_group_members')
    .update({ rsvp_status: input.status })
    .eq('group_id', input.groupId)
    .eq('profile_id', profile.id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function getRsvpSummary(groupId: string): Promise<RsvpSummary> {
  const db: any = createServerClient({ admin: true })

  const { data: members } = await db
    .from('hub_group_members')
    .select('rsvp_status')
    .eq('group_id', groupId)

  const statuses = (members ?? []).map((m: any) => m.rsvp_status ?? 'no_response')
  return {
    going: statuses.filter((s: string) => s === 'going').length,
    maybe: statuses.filter((s: string) => s === 'maybe').length,
    notGoing: statuses.filter((s: string) => s === 'not_going').length,
    noResponse: statuses.filter((s: string) => s === 'no_response').length,
    total: statuses.length,
  }
}
```

**Component (`components/hub/circle-rsvp-bar.tsx`):**

- `'use client'` component
- Props: `groupId: string`, `summary: RsvpSummary`, `currentStatus: RsvpStatus`
- Renders a horizontal bar with 3 buttons: "Going" (green), "Maybe" (yellow), "Can't Make It" (gray)
- Active button is filled, others are outlined
- Below buttons: summary counts: "X going, Y maybe, Z can't make it"
- On click: call `updateRsvpStatus`, update local state optimistically with try/catch rollback
- Use `useTransition` for the mutation
- Compact design, fits in a sticky bar or header area

**Integration:**

- In `page.tsx`: call `getRsvpSummary(group.id)` and resolve current member's RSVP status from the members list. Pass both as props.
- In `hub-group-view.tsx`: render `<CircleRsvpBar>` at the top of the view (below header, above tabs). Only show if group has an `event_id` (RSVP makes sense for event-linked circles only).

**Patterns:**

- Follow mutation pattern from `hub-group-view.tsx` (useTransition + try/catch)
- Tailwind only
- Mobile-first (buttons stack or compress on small screens)

**DO NOT:**

- Run the migration (just create the .sql file)
- Modify existing hub_group_members queries elsewhere
- Add notification sending on RSVP change
- Touch the message system or create rsvp_update messages

---

### Task 4: Circle Invite Cards with Social Preview

**What:** Add Open Graph meta tags to circle pages and build a shareable invite card component so circle links look good when shared on iMessage, WhatsApp, Instagram, etc.

**Why:** When someone shares a circle link right now, it shows a generic Next.js page. No preview image, no description. Social sharing is the #1 growth channel for dinner circles and it currently looks like spam.

**Scope:**

- Modify: `app/(public)/hub/g/[groupToken]/page.tsx` (add OG metadata)
- Modify: `app/(public)/hub/join/[groupToken]/page.tsx` (add OG metadata)
- New component: `components/hub/circle-share-card.tsx`
- Modify: `app/(public)/hub/g/[groupToken]/hub-group-view.tsx` (add share button that shows card)

**OG Metadata (in both page.tsx files):**
Use Next.js `generateMetadata` (already a server component). Add:

```ts
export async function generateMetadata({ params }: { params: { groupToken: string } }) {
  // Fetch group data (reuse existing query)
  const db: any = createServerClient({ admin: true })
  const { data: group } = await db
    .from('hub_groups')
    .select('name, emoji, display_area, member_count, is_open_table, open_seats')
    .eq('group_token', params.groupToken)
    .eq('is_active', true)
    .single()

  if (!group) return { title: 'Dinner Circle' }

  const title = `${group.emoji ?? ''} ${group.name}`.trim()
  const memberText = group.member_count ? `${group.member_count} people joined` : ''
  const areaText = group.display_area ? `in ${group.display_area}` : ''
  const seatsText = group.is_open_table && group.open_seats ? `${group.open_seats} seats open` : ''
  const description =
    [memberText, areaText, seatsText].filter(Boolean).join(' · ') ||
    'Join this dinner circle on ChefFlow'

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'ChefFlow',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  }
}
```

**Share Card Component (`components/hub/circle-share-card.tsx`):**

- `'use client'` component
- Props: `group: { name: string; emoji: string | null; groupToken: string; displayArea: string | null; memberCount: number }`, `onClose: () => void`
- Modal/overlay with:
  - Circle name + emoji large
  - Area if available
  - "X people joined"
  - The share URL displayed as text: `{origin}/hub/join/{groupToken}`
  - "Copy Link" button (copies to clipboard, shows "Copied!" for 2 seconds)
  - Native share button using `navigator.share()` if available (falls back to copy only)
- Clean card design, centered, backdrop blur

**Integration in hub-group-view.tsx:**

- The invite button already exists (`useHubInviteLink` hook). Enhance it:
  - Instead of just copying to clipboard, show the `CircleShareCard` modal on click
  - Keep the existing copy-to-clipboard as the primary action inside the card

**Patterns:**

- Follow existing modal/overlay patterns in the codebase
- Tailwind only
- Mobile-first

**DO NOT:**

- Generate OG images (too complex, just use text metadata)
- Add external sharing API integrations
- Modify the join flow itself
- Add tracking or analytics

---

## Intentionally Deferred

| Feature                                  | Why                                                          |
| ---------------------------------------- | ------------------------------------------------------------ |
| Real-time circle updates (WebSocket/SSE) | Complex wiring to unauthenticated pages, too risky for Codex |
| Spatial layout rendering (x/y grid)      | Complex canvas/SVG work, save for Claude Code session        |
| Notification/digest cron delivery        | Email sending infrastructure, needs careful testing          |
| Guest-to-guest DM                        | Major new feature, needs design                              |
| Consent workflow (approval gates)        | Needs product decision on when to require consent            |
| CIL as circle data source                | Integration layer, needs Claude Code architect session       |

---

## Verification Checklist

- [ ] `/hub/open-tables` page renders with no errors
- [ ] Open table cards show name, area, vibe, seats, join link
- [ ] Filtering by area works client-side
- [ ] Circle "Plan" tab shows timeline and zones when config exists
- [ ] Plan tab is hidden when no layout data exists
- [ ] RSVP migration file created (NOT applied)
- [ ] RSVP bar renders going/maybe/not_going buttons
- [ ] RSVP status updates persist (after migration is applied manually)
- [ ] Circle page OG tags render (check with `curl -I`)
- [ ] Share card shows on invite click with copy + native share
- [ ] No TypeScript errors (`npx tsc --noEmit --skipLibCheck`)
- [ ] Production build passes (`npx next build --no-lint`)
- [ ] Existing circle functionality unbroken (join flow, chat, members tab)
