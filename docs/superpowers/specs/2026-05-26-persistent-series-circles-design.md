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
  // ── Identity ──────────────────────────────────
  tagline: string
  coverImageUrl: string | null
  heroGallery: string[] // Secondary hero images (carousel)
  slug: string | null // Vanity URL: /s/{slug}

  // ── Host display ──────────────────────────────
  hostDisplayOrder: string[] // series_hosts.id[] for ordering
  hostProfiles: SeriesHostProfile[] // Rich profile data (see Module 2)

  // ── Membership ────────────────────────────────
  approvalMode: 'auto' | 'manual'
  maxMembers: number | null

  // ── Ticket priority ───────────────────────────
  earlyAccess: {
    enabled: boolean
    windowHours: number
    maxTicketsPerMember: number | null
    memberPricingEnabled: boolean
    memberDiscountPercent: number | null
  }

  // ── Transparency ──────────────────────────────
  transparency: {
    showSourcingStories: boolean
    showCostBreakdown: boolean // Members-only, never public
    showFarmUpdates: boolean
  }

  // ── Farm profile ──────────────────────────────
  farm: SeriesFarmProfile | null // Full farm data (Module 3)

  // ── Farm inventory ────────────────────────────
  farmInventory: FarmInventoryItem[] // Full produce + meat catalog (Module 4)

  // ── Venue profile ─────────────────────────────
  venue: SeriesVenueProfile | null // Venue/setting data (Module 5)

  // ── Menu config ───────────────────────────────
  menu: SeriesMenuConfig // Display + engagement (Module 6)

  // ── Default event expectations ────────────────
  defaultExpectations: SeriesEventExpectations // Template for new events (Module 7)

  // ── Live data widgets ─────────────────────────
  liveWidgets: {
    showCountdown: boolean
    showSeatsRemaining: boolean
    showWeather: boolean
    showRsvpPulse: boolean
    showMemberCount: boolean
    showLastEventRating: boolean
  }

  // ── Notification defaults ─────────────────────
  defaultNotifications: {
    newPosts: boolean
    newEvents: boolean
    eventReminders: boolean
    digestMode: 'instant' | 'daily' | 'weekly'
  }

  // ── Module ordering + visibility ──────────────
  modules: Array<{
    key: SeriesModuleKey
    enabled: boolean
    sortOrder: number
    visibility: 'public' | 'members'
  }>

  // ── Public page ───────────────────────────────
  publicPage: {
    enabled: boolean
    showPastEvents: boolean
    showMemberCount: boolean
    showUpcomingEvents: boolean
    story: string
  }
}

type SeriesModuleKey =
  | 'hero'
  | 'hosts'
  | 'farm'
  | 'farm_inventory'
  | 'venue'
  | 'menu'
  | 'event_expectations'
  | 'live_data'
  | 'news_feed'
  | 'past_events'
  | 'links'
```

The `SeriesConfig` JSONB is the master control surface. All module types referenced above (`SeriesHostProfile`, `SeriesFarmProfile`, `FarmInventoryItem`, `SeriesVenueProfile`, `SeriesMenuConfig`, `SeriesEventExpectations`) are defined in their respective Module sections in the Series Page Anatomy.

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

## Series Page: Full Anatomy

The Series Page is the entire public and member experience. Every section is a **configurable module** that hosts toggle on/off and customize. Every module supports photos. The page is the brand.

### URL Structure

```
/s/{series_slug}             -- Public series landing page (vanity slug)
/hub/s/{group_token}         -- Token-based fallback (consistent with existing hub URLs)
/s/{series_slug}/events      -- All events (past + upcoming)
/s/{series_slug}/farm        -- Farm deep-dive
/s/{series_slug}/menu        -- Current mastered menu
/s/{series_slug}/join        -- Join flow
```

### Module Map (All Configurable)

Every module below is an entry in `series_config.modules`. Each has `enabled: boolean`, `sort_order: number`, `visibility: 'public' | 'members'`, and module-specific config. Hosts drag-and-drop to reorder. Default order shown below.

---

### Module 1: Hero Banner

The first thing anyone sees. Sets the tone.

- **Cover photo** (required, full-bleed)
- **Series name** + **tagline**
- **Countdown timer** to next event (live, auto-calculated from next event date)
- **Seats remaining** badge (live from ticket system: "7 of 24 seats left")
- **Join CTA** button (non-members) or **Member badge** (members)
- **Expected weather** widget for next event (auto-fetched from event date + location)

Photo support: cover photo (hero), optional secondary hero gallery (3-5 images in carousel).

---

### Module 2: The Hosts

Every host gets a rich profile card. Not just a name; the full picture.

Per host (from `series_hosts` + `series_host_profiles`):

- **Photo** (headshot or action shot)
- **Display name** ("Chef Marco", "Willow Creek Farm")
- **Role** ("Executive Chef", "Farm Owner & Grower")
- **Bio** (rich text, no length limit)
- **Gallery** (action photos: cooking, farming, plating, harvesting)
- **Direct links** section:
  - Chef: ChefFlow profile link, booking page, Instagram, website, other socials
  - Farmer: farm website, CSA sign-up link, farm store, Instagram, other socials
- **Service packages** offered (e.g., "Private Dinners", "Cooking Classes", "CSA Boxes", "Farm Tours")
- **Credentials / highlights** ("James Beard semifinalist", "Certified Organic since 2019")

```typescript
type SeriesHostProfile = {
  hostId: string // FK to series_hosts.id

  // Photos
  headshotUrl: string | null
  actionPhotos: string[] // Gallery of this host in action

  // Links (all optional, hosts fill in what applies)
  links: Array<{
    label: string // "Book a Private Dinner", "Our CSA Program", "Instagram"
    url: string
    icon: string | null // Optional icon identifier
    featured: boolean // Show prominently vs. in "more links" section
  }>

  // Service packages this host offers
  servicePackages: Array<{
    name: string // "Farm-to-Table Private Dinner"
    description: string
    priceRange: string | null // "$150-200/person" or null if varies
    bookingUrl: string | null // Direct link to book
    photoUrl: string | null
  }>

  // Highlights / credentials
  highlights: string[] // Short bullet items shown under bio
}
```

---

### Module 3: The Farm

The farmer's story. Full deep-dive into where the food comes from. This is the transparency engine.

#### Farm Identity

- **Farm name**, **location**, **founding year**
- **Farm story / history** (rich text: how it started, philosophy, what makes it special)
- **Farm photos gallery** (overview shots, fields, barn, facilities, seasons)
- **Google Maps: top-down satellite view** (embedded, showing farm layout/fields)
- **Google Maps: Street View of entrance** (embedded, so guests know what to look for)

#### Livestock

Per animal or herd/flock:

- **Photo**
- **Name** (if individual) or **type** ("Heritage Berkshire Pigs")
- **Species / breed**
- **Count** (optional: "12 laying hens")
- **Notes** ("Our Gloucestershire Old Spots are heritage breed, raised on pasture")
- **Relevance to menu** badge (if animal's products appear on upcoming menu)

#### Garden & Growing

Per plot or growing area:

- **Photo** (current state)
- **Name** ("South Field", "Greenhouse #2", "Herb Garden")
- **What's growing** (list of current crops with status)
- **Planting / harvest notes**

#### Recently Picked / Harvested

Photo-driven feed of recent harvests. The "what's fresh right now" view.

- **Photo** of the picked item
- **Item name** ("San Marzano Tomatoes")
- **Picked date**
- **Quantity** ("40 lbs")
- **Destination** ("Going into Saturday's sauce" or "Available at farm stand")

#### Farm History Section

A dedicated timeline of the farm's story:

- **Founded**: year + founding story
- **Milestones**: key moments (organic certification, new barn, first dinner series, etc.)
- **Photos per milestone**
- **Text narrative** per entry

```typescript
type SeriesFarmProfile = {
  // Identity
  farmName: string
  location: string // "Haverhill, MA"
  foundedYear: number | null
  story: string // Rich text farm history/philosophy

  // Photos
  coverPhotoUrl: string | null
  galleryPhotos: string[]

  // Maps
  googleMapsEmbedUrl: string | null // Satellite/top-down view
  streetViewEmbedUrl: string | null // Entrance street view
  coordinates: { lat: number; lng: number } | null // For weather + map centering

  // Livestock
  livestock: Array<{
    id: string
    name: string // "Heritage Berkshire Pigs" or individual name
    species: string | null
    breed: string | null
    count: number | null
    photoUrl: string | null
    notes: string | null
    onMenu: boolean // Auto-linked if products appear on upcoming menu
  }>

  // Garden plots
  gardenPlots: Array<{
    id: string
    name: string // "South Field"
    photoUrl: string | null
    crops: string[] // What's currently growing
    notes: string | null
  }>

  // Recent harvests (photo-driven feed)
  recentHarvests: Array<{
    id: string
    itemName: string
    photoUrl: string | null
    pickedDate: string // ISO date
    quantity: string | null
    destination: string | null // "Saturday's dinner" or "Farm stand"
  }>

  // Farm history timeline
  historyTimeline: Array<{
    year: number
    title: string
    description: string
    photoUrl: string | null
  }>

  // External links
  csaUrl: string | null // Direct link to CSA sign-up
  farmStoreUrl: string | null
  farmWebsiteUrl: string | null
}
```

---

### Module 4: Full Farm Inventory

**Everything** the farm produces, not just what's on the menu. This is the "what's available" catalog. Members and public see what the farm grows/raises, season by season.

Per item:

- **Photo**
- **Name** ("Beefsteak Tomatoes", "Pasture-Raised Eggs")
- **Category** (produce, meat, dairy, eggs, herbs, honey, preserves, etc.)
- **Season** (when available: "June-September")
- **Current status** (available now, coming soon, out of season)
- **On the menu** badge (auto-linked if this item appears on the upcoming event's menu)
- **Source notes** ("Grown from seed in Greenhouse #1")

```typescript
type FarmInventoryItem = {
  id: string
  name: string
  category:
    | 'produce'
    | 'meat'
    | 'poultry'
    | 'dairy'
    | 'eggs'
    | 'herbs'
    | 'honey'
    | 'preserves'
    | 'seafood'
    | 'grains'
    | 'other'
  photoUrl: string | null
  seasonStart: number | null // Month (1-12), null = year-round
  seasonEnd: number | null
  currentStatus: 'available' | 'coming_soon' | 'out_of_season' | 'limited'
  onUpcomingMenu: boolean // Auto-calculated from event menu
  sourceNotes: string | null
  variety: string | null // "Heirloom", "Heritage", "Certified Organic"
}
```

Stored as `series_config.farmInventory: FarmInventoryItem[]` or in a dedicated `series_farm_inventory` table if the list is large (100+ items).

---

### Module 5: The Venue / Setting

Where the dinner happens. Photos, maps, and practical details.

- **Venue photos gallery** (outdoor seating, table setup, ambiance, lighting, views)
- **Google Maps: top-down satellite view** of the venue/property
- **Google Maps: Street View of entrance** (arrival experience)
- **Capacity** ("24 seats at the long table", "40 standing for cocktail hour")
- **Setting description** ("Outdoor farm table under string lights, overlooking the south pasture")
- **Seasonal notes** ("Heated tent in winter", "Open-air in summer")
- **Accessibility notes**

```typescript
type SeriesVenueProfile = {
  venueName: string | null // null if same as farm
  settingDescription: string // Rich text

  // Photos
  photos: Array<{
    url: string
    caption: string | null
    featured: boolean // Show in hero rotation
  }>

  // Maps
  googleMapsEmbedUrl: string | null
  streetViewEmbedUrl: string | null

  // Capacity
  seatedCapacity: number | null
  standingCapacity: number | null
  tableDescription: string | null // "24-seat reclaimed oak farm table"

  // Seasonal variants
  seasonalNotes: Array<{
    season: 'spring' | 'summer' | 'fall' | 'winter'
    description: string
    photoUrl: string | null
  }>

  accessibilityNotes: string | null
}
```

---

### Module 6: The Menu (Front and Center)

The mastered menu is the star. Everything else supports it.

#### Mastered Menu Display

- **Full menu**, beautifully rendered, front and center
- **Course-by-course breakdown** with:
  - Course name ("First Course", "Intermezzo", "Main")
  - Dish name + description
  - Photo per dish (optional)
  - Ingredient sourcing callout per dish ("Tomatoes from Willow Creek Farm, picked this morning")
  - Dietary/allergen icons
- **Wine / beverage pairings** (if applicable)
- **Chef's notes** ("Why I built this menu", "The story behind this dish")

#### Menu Feedback & Polling (Members Only)

- **Post-event feedback**: "What was your favorite course?" (polling)
- **Pre-event polling**: "Which of these three dessert options?" (menu poll composer already exists)
- **Open suggestions**: "What would you love to see next month?"
- **Rating per dish** from past events (aggregated, anonymous)
- **Most requested items** leaderboard across all events

```typescript
type SeriesMenuConfig = {
  // Display
  showIngredientSourcing: boolean // Show "from Willow Creek Farm" per ingredient
  showDietaryIcons: boolean
  showBeveragePairings: boolean
  showChefNotes: boolean

  // Member engagement
  enablePostEventFeedback: boolean // "What was your favorite?"
  enablePreEventPolling: boolean // "Vote on dessert options"
  enableOpenSuggestions: boolean // Free-text "what do you want?"
  enableDishRatings: boolean // Star ratings per dish
  showMostRequested: boolean // Leaderboard of most popular items
}
```

Menu data itself comes from the existing `menus` + `dish_index` + `recipes` system via `events.series_circle_id`. No duplication of menu content.

---

### Module 7: Event Details & Guest Expectations

Everything a guest needs to know. Per-event configurable. Shown on the series page for the upcoming event and on each event's own page.

```typescript
type SeriesEventExpectations = {
  // Attire
  dressCode: {
    enabled: boolean
    label: string // "Smart Casual", "Outdoor Rustic", "Cocktail Attire"
    description: string | null // "Dress for a beautiful evening outdoors. Layers recommended."
    photoUrl: string | null // Example outfit or mood photo
  } | null

  // Age & legal
  ageRequirement: {
    enabled: boolean
    minimumAge: number | null // 21, 18, null = all ages
    label: string // "21+ Event" or "All Ages Welcome"
    notes: string | null // "Valid ID required at entry"
  } | null

  // BYOB
  byobPolicy: {
    enabled: boolean
    allowed: boolean
    details: string | null // "BYOB wine welcome. Corkage fee: $15/bottle."
    whatsProvided: string | null // "Beer and cocktails included in ticket price"
  } | null

  // 420 / smoking
  smokingPolicy: {
    enabled: boolean
    fourTwentyFriendly: boolean
    smokingAllowed: boolean
    designatedArea: string | null // "Smoking area past the barn"
    details: string | null // "Cannabis-friendly event. Please be respectful of all guests."
  } | null

  // Guest rules
  guestRules: Array<{
    rule: string // "No outside food", "Pets must stay home"
    icon: string | null // Optional icon identifier
  }>

  // What to bring
  whatToBring: Array<{
    item: string // "A blanket for stargazing after dinner"
    required: boolean // Required vs. suggested
    notes: string | null
  }>

  // Timing
  timing: {
    arrivalTime: string | null // "6:00 PM"
    dinnerStartTime: string | null // "6:30 PM"
    expectedEndTime: string | null // "10:00 PM"
    arrivalNotes: string | null // "Please arrive on time. Late arrivals may miss the first course."
  }

  // House rules
  houseRules: Array<{
    rule: string // "Please remove shoes at the door"
    important: boolean // Highlighted vs. normal
  }>

  // Parking & entry
  parking: {
    instructions: string // "Park along the gravel drive. Do not block the barn doors."
    photoUrl: string | null // Photo of parking area
    mapUrl: string | null // Specific parking map
  } | null

  entryInstructions: {
    instructions: string // "Enter through the white gate. Follow the lanterns."
    photoUrl: string | null // Photo of entrance
    streetViewUrl: string | null // Street View of entrance
  } | null

  // Vibe
  eventVibe: {
    tone: string // "Intimate & Relaxed", "Celebratory", "Rustic Elegance"
    description: string | null // "Think firepit, string lights, good wine, and honest food."
    moodPhotos: string[] // Inspiration/mood photos
    playlistUrl: string | null // Spotify/Apple Music link
  } | null

  // Weather
  weather: {
    showForecast: boolean // Auto-fetch and display
    rainPlan: string | null // "Dinner moves to the heated barn in case of rain"
    temperatureNotes: string | null // "Evenings can be cool. Bring a layer."
  }
}
```

Weather auto-fetching uses event date + venue coordinates. Displayed as a simple widget: temperature, conditions, rain probability. Updates daily as event approaches.

---

### Module 8: Live Data Widgets

Real-time information that keeps the page alive.

| Widget                | Source                                        | Update Frequency         | Public       | Member |
| --------------------- | --------------------------------------------- | ------------------------ | ------------ | ------ |
| **Countdown timer**   | Next event date/time                          | Real-time (client-side)  | Yes          | Yes    |
| **Seats remaining**   | `event_ticket_types.capacity - sold_count`    | On ticket purchase (SSE) | Configurable | Yes    |
| **Expected weather**  | External weather API + event date/coordinates | Daily refresh            | Yes          | Yes    |
| **RSVP pulse**        | `event_guests` aggregate                      | On RSVP change           | Configurable | Yes    |
| **Member count**      | `hub_group_members` count                     | On join/leave            | Configurable | Yes    |
| **Post-event rating** | Average dish ratings from last event          | Static after event       | Configurable | Yes    |

Seats remaining shows scarcity: "7 seats left" in yellow, "2 seats left" in red, "Sold Out" with waitlist option.

---

### Module 9: News Feed (Posts)

Rich content posts between events. Already detailed in the "Content and News System" section above. On the series page, posts appear as a scrollable feed with:

- Host avatar + name + timestamp
- Post type badge (Update, Sourcing, Menu Preview, etc.)
- Title (if provided)
- Body text
- Photo gallery (if attached)
- Emoji reactions from members

---

### Module 10: Past Events Timeline

Visual timeline of every completed event. The series' accumulated story.

Per event entry:

- **Date** + **event title**
- **Cover photo** (promoted from event photos)
- **Photo gallery** (selectable from event photos)
- **Menu highlights** (top dishes)
- **Guest count**
- **Host recap** (written reflection)
- **Guest favorites** (from dish ratings)
- **Transparency callout** (members only: cost breakdown if enabled)

Timeline can be viewed as:

- **Card grid** (visual, photo-forward)
- **Chronological list** (compact, text-forward)

---

### Module 11: Links & Resources Hub

Consolidated external links from all hosts and the series itself.

- **Farm CSA sign-up** (direct link)
- **Farm store / online ordering**
- **Chef booking page** (ChefFlow profile)
- **Chef's other series** (if they run multiple)
- **Social media** (all hosts' accounts, consolidated)
- **Press / media mentions**
- **Service packages** (consolidated from all hosts)

---

### Module Visibility Matrix

| Module             | Public (non-member)                 | Member                            | Host                  |
| ------------------ | ----------------------------------- | --------------------------------- | --------------------- |
| Hero Banner        | Full                                | Full + member badge               | Full + edit           |
| Hosts              | Full                                | Full                              | Full + edit own       |
| Farm               | Configurable                        | Full                              | Full + edit           |
| Farm Inventory     | Configurable                        | Full + "on menu" badges           | Full + edit           |
| Venue              | Configurable                        | Full + entry instructions         | Full + edit           |
| Menu               | Configurable (can hide until event) | Full + feedback/polling           | Full + edit           |
| Event Expectations | Configurable                        | Full                              | Full + edit per event |
| Live Data          | Configurable per widget             | Full                              | Full + revenue data   |
| News Feed          | Public posts only                   | All posts                         | All + compose         |
| Past Events        | Public timeline                     | Full + host recaps + transparency | Full + revenue        |
| Links & Resources  | Full                                | Full                              | Full + edit           |

Hosts configure each module's public visibility. Default: most modules public to drive discovery and membership conversion. Transparency and financial data always members-only or hosts-only.

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

#### Data Layer

| Capability                                  | What's Needed                                                  |
| ------------------------------------------- | -------------------------------------------------------------- |
| `series` group_type                         | Add to type system, policy matrix, taxonomy                    |
| `series_hosts` table                        | Multi-host equal ownership with permissions                    |
| `series_posts` table                        | Rich content feed (8 post types, photos, pinning)              |
| `series_event_history` table                | Frozen event snapshots for timeline                            |
| `series_config` JSONB column                | Master config: all modules, farm, venue, expectations, widgets |
| `events.series_circle_id` column            | Event-to-series parent relationship                            |
| `event_share_settings.public_sale_opens_at` | Early access window timing                                     |
| `hub_group_members.series_notify_*` columns | Series notification preferences                                |

#### Series Page Modules (UI)

| Module               | What's Needed                                                                    |
| -------------------- | -------------------------------------------------------------------------------- |
| Hero Banner          | Cover photo, carousel, countdown timer, seats badge, weather widget              |
| Host Profiles        | Rich cards with photos, bio, gallery, links, service packages, credentials       |
| Farm Profile         | Farm identity, history timeline, livestock, garden plots, recent harvests, maps  |
| Farm Inventory       | Full produce + meat catalog with photos, season, status, "on menu" badges        |
| Venue / Setting      | Photos, maps (satellite + street view), capacity, seasonal notes                 |
| Menu Display         | Mastered menu front-and-center, course photos, sourcing callouts, pairings       |
| Menu Engagement      | Post-event feedback, pre-event polling, suggestions, dish ratings, leaderboard   |
| Event Expectations   | Dress code, age, BYOB, 420, rules, what to bring, timing, parking, vibe, weather |
| Live Data Widgets    | Countdown, seats remaining (SSE), weather API, RSVP pulse, member count          |
| News Feed            | Post composer, type badges, photo galleries, emoji reactions                     |
| Past Events Timeline | Card grid + list views, photos, menus, recaps, guest favorites                   |
| Links & Resources    | CSA, farm store, booking page, social media, press, service packages             |
| Module Manager       | Drag-and-drop ordering, per-module visibility toggle (public/members)            |

#### Server Actions + Logic

| Capability                         | What's Needed                                                 |
| ---------------------------------- | ------------------------------------------------------------- |
| Series creation flow               | Create series, set config, invite co-hosts                    |
| Series host management             | Equal co-host CRUD with per-permission control                |
| Series post CRUD                   | Create, edit, pin, archive posts with photos                  |
| Event-drop flow                    | Create event inside series, notify members, open early access |
| Early access ticket gating         | Membership check in purchase flow                             |
| Post-event history auto-population | Transition hook on event completion                           |
| Weather API integration            | Fetch forecast for event date + venue coordinates             |
| Farm inventory management          | CRUD for farm produce/meat catalog                            |
| Menu feedback collection           | Polling, ratings, suggestions per event                       |
| Series-level stats                 | Aggregated across all series events                           |
| Photo management                   | Upload, reorder, caption, promote to timeline                 |

### Modify (Extend Existing)

| Capability                                     | Change Needed                                                       |
| ---------------------------------------------- | ------------------------------------------------------------------- |
| Type system (`lib/circles/types.ts`)           | Add `'series'` to `CircleType`                                      |
| Policy matrix                                  | Add `series` row with shared ownership rules                        |
| Circle creation (`lib/circles/unified-api.ts`) | Support `series` type creation                                      |
| Operating loop                                 | Do NOT auto-create series circles (they're manual)                  |
| Event creation                                 | Support `series_circle_id` linking                                  |
| Event transitions                              | Post recap to series on completion, snapshot to history             |
| Ticket purchase flow                           | Check early access window + membership                              |
| Circle detail view                             | New tabs for series (Feed, Events, Timeline, Farm, Hosts, Settings) |
| Discovery view                                 | Include public series in discovery with farm/venue photos           |
| Circle stats                                   | Aggregate across series events                                      |
| Menu polls                                     | Link existing `dinner-circle-menu-poll-composer` to series context  |
| Existing arrival guide                         | Reuse `DinnerCircleArrivalGuide` structure for series defaults      |
| Existing accommodation intake                  | Reuse for series default expectations                               |

## Migration: 1 New Migration File

All schema changes in a single migration:

```sql
-- 1. New group_type value (no schema change, just policy)

-- 2. Series config on hub_groups (JSONB holds ALL module config)
-- This single column stores: farm profile, venue profile, farm inventory,
-- host profiles, menu config, event expectations template, live widget
-- toggles, module ordering, public page settings, early access config,
-- transparency settings, notification defaults.
ALTER TABLE hub_groups ADD COLUMN series_config JSONB DEFAULT NULL;

-- 3. Series hosts (equal co-ownership)
CREATE TABLE series_hosts ( ... );  -- Full DDL in Multi-Host section

-- 4. Series posts (rich content feed)
CREATE TABLE series_posts ( ... );  -- Full DDL in Content section

-- 5. Series event history (timeline snapshots)
CREATE TABLE series_event_history ( ... );  -- Full DDL in History section

-- 6. Event parent link
ALTER TABLE events ADD COLUMN series_circle_id UUID REFERENCES hub_groups(id);

-- 7. Early access timing
ALTER TABLE event_share_settings ADD COLUMN public_sale_opens_at TIMESTAMPTZ;

-- 8. Member notification prefs
ALTER TABLE hub_group_members
  ADD COLUMN series_notify_events BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN series_notify_posts BOOLEAN NOT NULL DEFAULT true;

-- 9. Vanity slug (unique, for /s/{slug} URLs)
ALTER TABLE hub_groups ADD COLUMN series_slug TEXT;
CREATE UNIQUE INDEX idx_hub_groups_series_slug
  ON hub_groups(series_slug) WHERE series_slug IS NOT NULL;
```

All additive. No drops, no renames, no type changes. Safe for production.

### Why JSONB Instead of Separate Tables

Farm profile, venue profile, farm inventory, host profiles, event expectations, and module config all live in `series_config` JSONB rather than separate tables because:

1. **They're edited as a unit.** Hosts manage all this through one settings UI.
2. **Read pattern is one big fetch.** The series page loads everything at once.
3. **Schema evolves fast.** Adding a new field to farm profile is a code change, not a migration.
4. **Volume is low.** One config blob per series. Not millions of rows.

Exception: `series_posts` and `series_event_history` are separate tables because they grow unboundedly over time and need indexing, pagination, and independent queries.

## Photo Storage Note

All photo URLs (`coverImageUrl`, `heroGallery`, farm photos, livestock photos, harvest photos, venue photos, host photos, post photos, event timeline photos, mood photos, menu photos, parking photos, entry photos) use the existing local filesystem upload infrastructure. No new storage system needed. Hosts upload through the existing image upload flow; URLs are stored in the JSONB or in `series_posts.image_urls`.

## Open Questions

1. **Slug vs. token for public URL?** Spec supports both: vanity slug (`/s/field-and-fire`) and token fallback (`/hub/s/{token}`). Slug is user-facing, token is for sharing.
2. **Revenue sharing between hosts?** V1 = manual. Future spec could add split tracking.
3. **External host onboarding flow?** V1: chef manages external host profiles. Future: magic-link invite for self-service.
4. **Member tiers?** V1: one tier. Future: VIP/founding member with different early access.
5. **Weather API provider?** Need to choose: OpenWeatherMap (free tier), WeatherAPI, or National Weather Service API (free, US-only). NWS is $0, sufficient for US-based series.
6. **Google Maps embed authentication?** Satellite and Street View embeds need a Maps Embed API key. Already available in the project or needs setup.
7. **Farm inventory size threshold?** JSONB works for <200 items. If farms have massive catalogs, migrate to a dedicated table.

## Success Criteria

A Series Circle is working when:

1. Two hosts co-own a permanent circle with equal authority
2. Events drop into the circle and members are notified
3. Members get early access to tickets before public sale
4. Hosts post updates between events and members see them in a rich feed
5. Past events accumulate into a visible timeline with menus, photos, and recaps
6. The series has a public page with farm profile, venue photos, host bios, and maps
7. Full farm inventory is browsable with "on the menu" badges
8. Mastered menu is front-and-center with sourcing callouts per dish
9. Event expectations (dress code, BYOB, 420, rules, timing, parking, vibe) are clear
10. Live widgets show countdown, seats remaining, and weather forecast
11. Transparency posts give members behind-the-scenes access to sourcing and costs
12. Every module is configurable: hosts toggle on/off, reorder, set public/members visibility
13. Photos are everywhere: hosts, farm, livestock, harvests, venue, events, menu, mood
14. Direct links to farm CSA, chef booking, service packages, and social media
15. All of this coexists peacefully with existing operational Dinner Circles
