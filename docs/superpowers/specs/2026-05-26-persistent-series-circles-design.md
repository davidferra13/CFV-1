# Persistent Series Circles

> **Status:** design spec
> **Created:** 2026-05-26
> **Scope:** New circle type for permanent multi-host communities that produce recurring events

---

## The Problem

Today, Dinner Circles are event-scoped. An inquiry arrives, a circle auto-creates, the event runs, and the circle goes quiet. If the same chef-and-farmer duo hosts another dinner next month, it's a new circle with a new link and zero memory of the previous one.

But some hosting relationships are permanent. A chef and a farmer who do monthly farm-to-table dinners together have a story that compounds over time: loyal guests, evolving menus, seasonal ingredients, shared history. The circle should reflect that permanence.

Right now, the relationship hierarchy is: Event owns Circle. The vision inverts this: **Circle owns Events.**

## The Vision

A chef and a farmer create a permanent Series Circle. It has a name ("Field & Fire Suppers"), a story, and a growing membership. Events drop into the circle like episodes in a series. Between events, hosts post updates: "Tomatoes are in." "Next month's menu preview." "The lambs are ready." Members stay engaged. When a new event drops, members get first access to tickets before the public. Every past event lives in the circle's timeline: menus, photos, who came, what was served. The circle IS the brand.

## Terminology

| Term                    | Meaning                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| **Series Circle**       | A persistent, multi-host circle that produces recurring events. The new canonical type.    |
| **Host**                | Any co-owner of a Series Circle. Chef and farmer are both hosts. Equal authority.          |
| **Member**              | Anyone who has joined the Series Circle. Gets updates, ticket priority, access to history. |
| **Event Drop**          | A new event created inside the Series Circle. Members are notified. Tickets may open.      |
| **Post**                | A content update between events (news, sourcing story, menu preview, farm update).         |
| **Early Access Window** | Time period where only members can purchase tickets before public sale opens.              |
| **Transparency Post**   | A post that reveals sourcing, cost breakdown, or behind-the-scenes story.                  |

## New Canonical Circle Type: `series`

### Type Registration

Add to `hub_groups.group_type`:

| Stored `group_type` | Canonical Circle type | Product label | Ownership mode | Default visibility    | Default linked object              |
| ------------------- | --------------------- | ------------- | -------------- | --------------------- | ---------------------------------- |
| `series`            | `series`              | Series Circle | `shared`       | `public` or `private` | None (circle IS the parent entity) |

### How It Differs From Other Types

| Dimension             | Dinner Circle         | Client Circle        | Community Circle   | **Series Circle**                                 |
| --------------------- | --------------------- | -------------------- | ------------------ | ------------------------------------------------- |
| **Lifecycle**         | Event-scoped          | Client-scoped        | Platform-scoped    | **Permanent, self-owned**                         |
| **Owns events?**      | No (owned BY event)   | No                   | No                 | **Yes (events are children)**                     |
| **Multi-host?**       | Co-host (subordinate) | No                   | No                 | **Equal co-owners**                               |
| **Content feed?**     | System messages only  | Chat                 | Chat/discussion    | **Rich posts + chat**                             |
| **Ticket priority?**  | No                    | No                   | No                 | **Early access window**                           |
| **Public discovery?** | Per-event share page  | No                   | Yes                | **Yes (series landing page)**                     |
| **History?**          | Single event          | Across client events | Discussion archive | **Event timeline with menus, photos, attendance** |
| **Transparency?**     | Config (JSONB)        | No                   | No                 | **Ongoing narrative posts**                       |

## Multi-Host Ownership Model

### The Problem With Current Co-Hosting

Current co-hosting (`circle_collaborators`) has a subordinate model: one chef owns the circle, co-hosts are invited with limited roles (`co_host`, `sous_chef`, `server`, `observer`). The owning chef's `tenant_id` scopes all data. This doesn't work when a farmer and a chef are equal partners.

### Series Host Model

Series Circles use **shared ownership**. Multiple hosts, each with equal authority. No single `tenant_id` owns the circle.

#### New table: `series_hosts`

```sql
CREATE TABLE series_hosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,

  -- Identity: can be a ChefFlow user OR an external collaborator
  user_id UUID REFERENCES users(id),        -- null for external hosts
  tenant_id UUID REFERENCES chefs(id),      -- null for external hosts

  -- External host identity (when not a ChefFlow user)
  external_name TEXT,
  external_email TEXT,
  external_bio TEXT,
  external_avatar_url TEXT,
  external_role TEXT,                         -- "Farmer", "Sommelier", "Pitmaster"

  -- Host metadata
  display_name TEXT NOT NULL,                 -- Shown publicly: "Chef Marco", "Willow Creek Farm"
  display_role TEXT NOT NULL,                 -- "Chef", "Farmer", "Sommelier", "Winemaker"
  bio TEXT,                                   -- Per-host bio shown on series page
  avatar_url TEXT,
  website_url TEXT,

  -- Permissions (all equal by default, but can be scoped)
  can_create_events BOOLEAN NOT NULL DEFAULT true,
  can_publish_posts BOOLEAN NOT NULL DEFAULT true,
  can_manage_members BOOLEAN NOT NULL DEFAULT true,
  can_manage_tickets BOOLEAN NOT NULL DEFAULT true,
  can_manage_finances BOOLEAN NOT NULL DEFAULT true,
  can_edit_series BOOLEAN NOT NULL DEFAULT true,

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('invited', 'active', 'removed')),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  removed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(series_id, user_id),
  UNIQUE(series_id, external_email)
);
```

Key design decisions:

- **External hosts supported.** The farmer might not have a ChefFlow account. They still get a profile on the series page and can be credited. They manage through the chef or through a future invite flow.
- **Equal by default.** All permission flags default to `true`. Hosts can restrict individual permissions if needed.
- **No single tenant_id.** The series itself has no `tenant_id` on `hub_groups`. Access is through `series_hosts` membership, not tenant scoping. Events created FROM the series still have a `tenant_id` (whichever host creates them).

### Authentication Flow

- ChefFlow hosts: authenticate normally via `requireChef()`, then verify `series_hosts` membership.
- External hosts: future invite flow with magic link. V1 can be managed by the creating chef on their behalf.
- Series-level actions check `series_hosts` permissions, not `tenant_id`.

## Event Lifecycle Within a Series

### Relationship Inversion

Current: `hub_groups.event_id` points circle to event.
Series: `events.series_circle_id` points event to circle. Multiple events per circle.

#### Schema change on `events` table:

```sql
ALTER TABLE events ADD COLUMN series_circle_id UUID REFERENCES hub_groups(id);
```

This is additive. Existing events with `circle_id` (from recurrence) continue to work. `series_circle_id` is the new parent relationship for series-produced events.

### Event Drop Flow

1. Host creates event inside series: sets date, menu, ticket types, capacity.
2. System creates standard `events` row with `series_circle_id` set.
3. System creates a child Dinner Circle for event-specific coordination (RSVP, dietary, chat).
4. System posts announcement to series: "New event: June 14 Farm Table Dinner."
5. Early access window opens for members.
6. After early access window, public ticket sales open (if configured).
7. Event runs through normal FSM (draft -> proposed -> ... -> completed).
8. On completion, event summary posts to series timeline.

### Child Dinner Circle

Each event within a series still gets its own Dinner Circle for:

- Guest-specific RSVP and dietary collection
- Event-day coordination and chat
- Chef prep updates for that specific event

The Series Circle is the persistent home. The Dinner Circle is the per-event workspace.

```
Series Circle ("Field & Fire Suppers")
  |
  +-- Event: June 14 Farm Table Dinner
  |     +-- Dinner Circle (event-scoped, auto-created)
  |
  +-- Event: July 19 Midsummer Harvest
  |     +-- Dinner Circle (event-scoped, auto-created)
  |
  +-- Event: Aug 23 Tomato Festival
        +-- Dinner Circle (event-scoped, auto-created)
```

Members of the Series Circle are NOT auto-added to each event's Dinner Circle. They join per-event by RSVPing or buying a ticket. But they see all events in the series feed and get notifications.

## Content and News System

### The Gap

`hub_messages` handles chat and system notifications. But the user's vision needs rich content posts: titled, multi-image, categorized, pinnable, feed-worthy. These aren't chat messages.

### New table: `series_posts`

```sql
CREATE TABLE series_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  author_host_id UUID NOT NULL REFERENCES series_hosts(id),

  -- Content
  post_type TEXT NOT NULL CHECK (post_type IN (
    'update',          -- General news ("We just planted the spring garden")
    'sourcing',        -- Sourcing story ("Where your lamb comes from")
    'menu_preview',    -- Upcoming menu tease
    'behind_scenes',   -- Kitchen/farm behind-the-scenes
    'announcement',    -- Important news (new event, schedule change)
    'recap',           -- Post-event recap with highlights
    'transparency',    -- Cost breakdown, sourcing transparency
    'milestone'        -- Circle milestone ("100 dinners served!")
  )),
  title TEXT,
  body TEXT NOT NULL,

  -- Rich content
  image_urls TEXT[] DEFAULT '{}',
  link_url TEXT,
  link_label TEXT,

  -- Event reference (optional, for event-related posts)
  event_id UUID REFERENCES events(id),

  -- Visibility
  visibility TEXT NOT NULL DEFAULT 'members' CHECK (visibility IN (
    'members',  -- Only series members see it
    'public'    -- Visible on public series page
  )),

  -- Status
  pinned BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_series_posts_feed ON series_posts(series_id, published_at DESC)
  WHERE archived_at IS NULL;
```

### Post Types Explained

| Type            | Example                                                                                | When                            |
| --------------- | -------------------------------------------------------------------------------------- | ------------------------------- |
| `update`        | "The tomatoes are finally in. Going to be a good month."                               | Anytime between events          |
| `sourcing`      | "Meet Sarah from Willow Creek. She's been growing our heirloom varieties for 3 years." | Ongoing farm/sourcing narrative |
| `menu_preview`  | "Thinking about a whole-roasted cauliflower course for next month."                    | Before event drop               |
| `behind_scenes` | "5am at the farm. The dew on these greens is unreal."                                  | Anytime                         |
| `announcement`  | "July dinner is LIVE. 16 seats. Members get first dibs until June 30."                 | Event drop                      |
| `recap`         | "Last night was magic. 24 guests, 7 courses, one very happy pig."                      | After event                     |
| `transparency`  | "Here's what June's dinner actually cost to produce."                                  | After event (opt-in)            |
| `milestone`     | "50 dinners. 400+ guests. Still going."                                                | On achievement                  |

### Interaction

Members can react to posts (emoji reactions, already supported in hub infrastructure). No comments on posts in V1 to keep the feed clean; discussion happens in the series chat tab.

## Member Model and Ticket Priority

### Joining a Series

Members join via:

1. **Link/QR** (zero friction, uses existing `circle_join_tokens`)
2. **Invitation from host** (email invite)
3. **Discovery page** (public series are discoverable)
4. **Post-event conversion** ("You attended Field & Fire. Want to join the circle?")

Approval mode configurable: `auto` (anyone can join) or `manual` (host approves).

### Member Benefits

Stored as series-level config on `hub_groups` or a new `series_config` JSONB column on `hub_groups`.

#### New column on `hub_groups`:

```sql
ALTER TABLE hub_groups ADD COLUMN series_config JSONB DEFAULT NULL;
```

Schema:

```typescript
type SeriesConfig = {
  // Identity
  tagline: string // "Farm-to-table dinners in the Merrimack Valley"
  coverImageUrl: string | null

  // Host display order
  hostDisplayOrder: string[] // series_hosts.id[] for display ordering

  // Membership
  approvalMode: 'auto' | 'manual'
  maxMembers: number | null // null = unlimited

  // Ticket priority
  earlyAccess: {
    enabled: boolean
    windowHours: number // How many hours before public sale (e.g., 48)
    maxTicketsPerMember: number | null // null = no limit
  }

  // Transparency defaults
  transparency: {
    showSourcingStories: boolean // Members see sourcing posts
    showCostBreakdown: boolean // Members see cost transparency posts
    showFarmUpdates: boolean // Members see farm/producer updates
  }

  // Notification defaults for new members
  defaultNotifications: {
    newPosts: boolean
    newEvents: boolean
    eventReminders: boolean
    digestMode: 'instant' | 'daily' | 'weekly'
  }

  // Public page
  publicPage: {
    enabled: boolean // Whether the series has a public landing page
    showPastEvents: boolean
    showMemberCount: boolean
    showUpcomingEvents: boolean
    story: string // "About this series" narrative
  }
}
```

### Early Access Flow

```
1. Host creates event inside series
2. Event enters "early_access" ticket state
3. System notifies all series members: "New event! Members-only access for 48h."
4. Members can purchase tickets during window
5. After window expires, tickets open to public (if public sale enabled)
6. If event sells out during early access, no public sale needed
```

#### Schema support:

```sql
-- New column on event_ticket_types
ALTER TABLE event_ticket_types
  ADD COLUMN early_access_only BOOLEAN NOT NULL DEFAULT false;

-- New column on event_share_settings
ALTER TABLE event_share_settings
  ADD COLUMN public_sale_opens_at TIMESTAMPTZ;
```

Ticket purchase flow checks:

1. Is `public_sale_opens_at` in the future?
2. If yes, is buyer a series member? If not, show "Members-only. Join the circle or check back [date]."
3. If buyer is a member, proceed to purchase.

## Transparency Layer

### What Transparency Means Here

Not just config flags. Transparency is an ongoing narrative that builds trust and makes the circle feel special. It's the farm-to-table story told in real time.

### Transparency Post Types

**Sourcing Stories** (`post_type: 'sourcing'`):

- "Where your lamb comes from" with photo of the farm
- "Why we switched pepper suppliers"
- "This week's harvest from Willow Creek"

**Cost Transparency** (`post_type: 'transparency'`):

- Per-event cost breakdown (ingredients, labor, venue, etc.)
- Visible only to members (never public)
- Opt-in per series via `series_config.transparency.showCostBreakdown`

#### Cost breakdown structure (posted as structured content in `series_posts.body` as JSON):

```typescript
type TransparencyBreakdown = {
  eventId: string
  eventTitle: string
  ticketPriceCents: number
  breakdown: {
    ingredientsCents: number
    laborCents: number
    venueCents: number
    equipmentCents: number
    otherCents: number
    totalCostCents: number
  }
  marginPercent: number
  narrative: string // Human-written: "Most of this dinner's cost went to the lamb..."
  highlights: Array<{
    ingredient: string
    source: string
    costCents: number
    story: string // "Dry-aged for 21 days at the farm"
  }>
}
```

**Farm Updates** (`post_type: 'update'` with farm context):

- Seasonal availability changes
- Harvest photos
- Animal updates (if farm config enabled)

### Transparency Guardrails

- Cost transparency is ALWAYS opt-in per series
- Cost posts are ALWAYS members-only (never public)
- Hosts control what level of detail to share
- No auto-generated transparency; hosts write the narrative

## History and Timeline

### The Circle Accumulates Story

Every completed event becomes part of the series timeline. This is the circle's identity over time.

### New table: `series_event_history`

```sql
CREATE TABLE series_event_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id),

  -- Snapshot (frozen at event completion)
  event_date DATE NOT NULL,
  event_title TEXT NOT NULL,
  guest_count INTEGER,
  menu_summary TEXT,                    -- Brief menu description
  menu_highlights TEXT[],               -- Key dishes

  -- Media
  cover_photo_url TEXT,
  photo_urls TEXT[] DEFAULT '{}',

  -- Stats
  tickets_sold INTEGER,
  revenue_cents INTEGER,                -- Only visible to hosts

  -- Host reflections
  host_recap TEXT,                       -- Written by host after event
  guest_favorites TEXT[],                -- Top-rated dishes

  -- Visibility
  visible_to_members BOOLEAN NOT NULL DEFAULT true,
  visible_to_public BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(series_id, event_id)
);

CREATE INDEX idx_series_event_history_timeline
  ON series_event_history(series_id, event_date DESC);
```

### Auto-Population

When an event with `series_circle_id` transitions to `completed`:

1. System creates `series_event_history` row with snapshot data
2. System posts a `recap` prompt to series (hosts can edit before publishing)
3. Photos from the event's Dinner Circle can be promoted to the series timeline

### Series-Level Stats

Extend existing `getCircleStats` to include series aggregates:

- Total events hosted
- Total covers served
- Unique members
- Returning member rate
- Average attendance
- Revenue (host-only)
- Most popular dishes across all events
- Member growth over time

## Public Series Page

### URL Structure

```
/s/{series_slug}     -- Public series landing page
/s/{series_slug}/events  -- All events (past + upcoming)
/s/{series_slug}/join    -- Join flow
```

Alternatively, reuse existing hub URL pattern:

```
/hub/s/{group_token}  -- Token-based access (consistent with existing /hub/g/{token})
```

### Page Sections

1. **Hero**: Series name, tagline, cover image, host profiles
2. **Hosts**: Photo, name, role, bio for each host
3. **Upcoming Events**: Next event(s) with ticket status. Members see "Buy Tickets." Non-members see "Join to get early access."
4. **Recent Posts**: Latest 3-5 posts (public-visibility only for non-members)
5. **Past Events**: Timeline of completed events with photos and menu highlights
6. **Join CTA**: "Join this circle" with member count and benefits callout
7. **Stats**: Events hosted, guests served, member count (if `publicPage.showMemberCount`)

### Member vs. Public View

| Section           | Public                                   | Member                                    |
| ----------------- | ---------------------------------------- | ----------------------------------------- |
| Hero + Hosts      | Full                                     | Full                                      |
| Upcoming Events   | See event, can't buy during early access | Buy tickets, see member pricing           |
| Posts             | Public posts only                        | All posts including sourcing/transparency |
| Past Events       | Public history                           | Full history + host recaps                |
| Stats             | Basic counts                             | Detailed engagement                       |
| Cost Transparency | Never                                    | If enabled                                |

## Notification Flow

### Series-Level Notifications

| Event              | Recipients                          | Channel                                               |
| ------------------ | ----------------------------------- | ----------------------------------------------------- |
| New post published | All members (per preferences)       | Circle-first, email digest                            |
| New event created  | All members                         | Push + email (always; this is the money notification) |
| Early access opens | All members                         | Push + email                                          |
| Public sale opens  | Non-members who visited series page | Email (if captured)                                   |
| Event recap posted | All members                         | Circle-first, email digest                            |
| Host joined        | All members                         | System message in circle                              |
| Milestone reached  | All members                         | Post + system message                                 |

### Member Notification Preferences

Stored on `hub_group_members` (existing columns: `notify_email`, `notify_push`, `digest_mode`, `quiet_hours_start/end`, `notifications_muted`). These already support per-member control.

New preference for series members:

```sql
ALTER TABLE hub_group_members
  ADD COLUMN series_notify_events BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN series_notify_posts BOOLEAN NOT NULL DEFAULT true;
```

## Coexistence with Existing Circle Types

### No Breaking Changes

Series Circles are additive. Existing operational circles, client circles, community circles all work exactly as before.

### Relationship Between Series and Dinner Circles

- Series Circle = persistent community and content hub
- Dinner Circle = per-event operational workspace (auto-created for each series event)
- Series members see event announcements and can join event Dinner Circles by RSVPing
- Event Dinner Circle inherits series theme/branding but is operationally independent

### Migration Path for Existing Recurring Circles

Existing `dinner_club` circles with recurring events could be upgraded to series circles:

1. Change `group_type` from `dinner_club` to `series`
2. Create `series_hosts` entries from existing owner + collaborators
3. Populate `series_config` from existing settings
4. Link existing events via `series_circle_id`

This is optional. Existing circles continue to work without migration.

## Security and Access Policy

### Series-Level Access

| Actor         | Can see series   | Can post   | Can create events | Can manage members | Can see finances |
| ------------- | ---------------- | ---------- | ----------------- | ------------------ | ---------------- |
| Host (active) | Yes              | Yes        | Per permission    | Per permission     | Per permission   |
| Member        | Yes              | React only | No                | No                 | No               |
| Public        | Public page only | No         | No                | No                 | Never            |
| Admin         | Yes              | Yes        | Yes               | Yes                | Yes              |

### Cross-Tenant Considerations

Series Circles break the single-tenant model. The farmer and chef may have different `tenant_id` values (or the farmer may not have one at all).

Rules:

1. The Series Circle itself has no `tenant_id`. It's owned by `series_hosts`, not a tenant.
2. Events created FROM the series have the creating host's `tenant_id`. That host manages the event through their normal chef portal.
3. Financial data (revenue, costs) is scoped to the event's `tenant_id`, not shared across hosts unless the series config explicitly enables it.
4. Member data (dietary, preferences) flows through hub guest profiles, which are already cross-tenant.

### Query Path: Tenant-Scoped vs. Host-Scoped

**Critical implementation note:** All existing circle queries in `lib/circles/unified-api.ts` filter by `.eq('tenant_id', tenantId)`. Series Circles have `tenant_id = NULL` on `hub_groups` and will NOT appear in these queries.

Series Circles need a parallel query path:

- `listSeriesForHost(userId)`: Join `hub_groups` through `series_hosts` where `user_id = userId` and `status = 'active'`
- `getSeriesCircle(seriesId, userId)`: Verify membership via `series_hosts` instead of `tenant_id`
- Existing tenant-scoped queries remain untouched for all other circle types

This is not a refactor of existing code. It is additive: new functions for the new type, existing functions unchanged.

### Data Isolation

- Series posts: visible to members per post visibility setting
- Event financials: visible to creating host + hosts with `can_manage_finances`
- Member list: visible to all hosts
- Cost transparency posts: members only, never public
- Individual member dietary/allergy data: only visible in event Dinner Circle context, not at series level

## Implementation: What Exists vs. What's New

### Already Built (Reuse Directly)

| Capability                  | Existing Code                                   |
| --------------------------- | ----------------------------------------------- |
| Circle container            | `hub_groups` table + types                      |
| Membership + roles          | `hub_group_members` + access policy             |
| QR/token join               | `circle_join_tokens`                            |
| Join approval               | `circle_join_requests`                          |
| Broadcast system            | `dinner_circle_broadcasts`                      |
| Notification infrastructure | `circle-first-notify.ts`, email templates, push |
| Digest system               | `circle-digest.ts`                              |
| Activity tracking           | `circle_activity`                               |
| Guest profiles              | `hub_guest_profiles`                            |
| Ticketing system            | `event_ticket_types`, `event_tickets`           |
| Event FSM                   | Full lifecycle in `lib/events/transitions.ts`   |
| Co-host infrastructure      | `circle_collaborators`, `circle_co_hosts`       |
| Circle stats                | `lib/dinner-circles/circle-stats.ts`            |
| Discovery UI                | `circles-discovery-view.tsx`                    |

### New (Must Build)

| Capability                                  | What's Needed                               |
| ------------------------------------------- | ------------------------------------------- |
| `series` group_type                         | Add to type system, policy matrix, taxonomy |
| `series_hosts` table                        | Multi-host equal ownership                  |
| `series_posts` table                        | Rich content feed between events            |
| `series_event_history` table                | Frozen event snapshots for timeline         |
| `series_config` JSONB column                | Series-level configuration                  |
| `events.series_circle_id` column            | Event-to-series parent relationship         |
| `event_share_settings.public_sale_opens_at` | Early access window timing                  |
| `hub_group_members.series_notify_*` columns | Series notification preferences             |
| Series public page                          | New route: `/hub/s/{token}` or `/s/{slug}`  |
| Series host management UI                   | Invite/manage equal co-hosts                |
| Series post composer                        | Rich content creation for hosts             |
| Series feed UI                              | Member-facing post feed                     |
| Series timeline UI                          | Past event history view                     |
| Early access ticket gating                  | Membership check in ticket purchase flow    |
| Event-drop notification flow                | Notify members on new event creation        |
| Series creation flow                        | Chef creates series, invites co-host        |
| Post-event history auto-population          | Transition hook on event completion         |

### Modify (Extend Existing)

| Capability                                     | Change Needed                                       |
| ---------------------------------------------- | --------------------------------------------------- |
| Type system (`lib/circles/types.ts`)           | Add `'series'` to `CircleType`                      |
| Policy matrix                                  | Add `series` row with shared ownership rules        |
| Circle creation (`lib/circles/unified-api.ts`) | Support `series` type creation                      |
| Operating loop                                 | Do NOT auto-create series circles (they're manual)  |
| Event creation                                 | Support `series_circle_id` linking                  |
| Event transitions                              | Post to series on completion                        |
| Ticket purchase flow                           | Check early access window + membership              |
| Circle detail view                             | New tabs for series (Feed, Events, Timeline, Hosts) |
| Discovery view                                 | Include public series in discovery                  |
| Circle stats                                   | Aggregate across series events                      |

## Migration: 1 New Migration File

All schema changes in a single migration:

```sql
-- 1. New group_type value (no schema change, just policy)

-- 2. Series config on hub_groups
ALTER TABLE hub_groups ADD COLUMN series_config JSONB DEFAULT NULL;

-- 3. Series hosts
CREATE TABLE series_hosts ( ... );  -- Full DDL above

-- 4. Series posts
CREATE TABLE series_posts ( ... );  -- Full DDL above

-- 5. Series event history
CREATE TABLE series_event_history ( ... );  -- Full DDL above

-- 6. Event parent link
ALTER TABLE events ADD COLUMN series_circle_id UUID REFERENCES hub_groups(id);

-- 7. Early access timing
ALTER TABLE event_share_settings ADD COLUMN public_sale_opens_at TIMESTAMPTZ;

-- 8. Member notification prefs
ALTER TABLE hub_group_members
  ADD COLUMN series_notify_events BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN series_notify_posts BOOLEAN NOT NULL DEFAULT true;
```

All additive. No drops, no renames, no type changes. Safe for production.

## Open Questions

1. **Slug vs. token for public URL?** Existing circles use token-based URLs (`/hub/g/{token}`). Series might benefit from vanity slugs (`/s/field-and-fire`). Both could work.
2. **Revenue sharing between hosts?** V1 spec does not include automated revenue splitting. Each event is owned by one host's tenant. Revenue sharing is manual/offline. Future spec could add this.
3. **External host onboarding flow?** V1 allows chef to manage external host profiles. Future: magic-link invite for external hosts to manage their own profile.
4. **Member tiers?** V1 has one member tier. Future: could add VIP/founding member distinctions with different early access windows or pricing.
5. **Series merch/add-ons?** Out of scope for V1. But the structure supports it (posts can link to external shops).

## Success Criteria

A Series Circle is working when:

1. Two hosts co-own a permanent circle with equal authority
2. Events drop into the circle and members are notified
3. Members get early access to tickets before public sale
4. Hosts post updates between events and members see them
5. Past events accumulate into a visible timeline with menus and photos
6. The series has a public page that tells its story and drives new membership
7. Transparency posts give members behind-the-scenes access to sourcing and costs
8. All of this coexists peacefully with existing operational Dinner Circles
