# Series Circles Phase 1: Data Foundation + Core CRUD

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the database schema, TypeScript types, and core server actions for Series Circles so that a chef can create a series, invite co-hosts, and manage the series config. No UI in this phase.

**Architecture:** New `lib/series/` module houses all Series Circle logic, parallel to existing `lib/circles/` and `lib/dinner-circles/`. One migration creates all tables (even those consumed by later phases) to avoid multi-phase migration coordination. Type system extended with `'series'` circle type. Server actions follow existing `requireChef()` + Supabase admin client pattern from `lib/circles/unified-api.ts`.

**Tech Stack:** Next.js server actions, Supabase (via `createServerClient`), PostgreSQL, TypeScript

**Phases overview (this is Phase 1 of 6):**

| Phase | Name                                        | Dependency | Delivers                                                                 |
| ----- | ------------------------------------------- | ---------- | ------------------------------------------------------------------------ |
| **1** | **Data Foundation + Core CRUD (THIS PLAN)** | None       | Migration, types, series CRUD, host management                           |
| 2     | Content & Feed System                       | Phase 1    | Posts CRUD, news feed UI, reactions                                      |
| 3     | Event Lifecycle & Ticketing                 | Phase 1    | Event drop, early access, history, timeline                              |
| 4     | Host Workspace                              | Phase 1    | Inventory, menu builder, threads, prep, equipment, checklist, financials |
| 5     | Series Page (Consumer)                      | Phases 1-3 | 11 configurable modules, public page, /s/{slug} routing                  |
| 6     | Integrations & Polish                       | Phases 1-5 | Weather, maps, notifications, discovery, stats, menu feedback            |

---

## File Structure

```
database/migrations/
  20260527000001_series_circles.sql          -- All tables + ALTER TABLEs

lib/series/
  types.ts                                    -- SeriesConfig, SeriesHostProfile, FarmInventoryItem, etc.
  actions.ts                                  -- Series CRUD: create, get, list, update config
  host-actions.ts                             -- Host management: invite, accept, remove, update permissions
  index.ts                                    -- Barrel exports

lib/circles/
  types.ts                                    -- ADD 'series' to CircleType union (modify)
  unified-api.ts                              -- ADD series handling in resolveCircleType + circleTypeToGroupType (modify)

tests/
  lib/series/actions.test.ts                  -- Series CRUD tests
  lib/series/host-actions.test.ts             -- Host management tests
```

---

### Task 1: Database Migration

**Files:**

- Create: `database/migrations/20260527000001_series_circles.sql`

- [ ] **Step 1: Check latest migration timestamp**

Run: `ls database/migrations/*.sql | tail -3`
Expected: Latest is `20260526000011_*`. Our timestamp `20260527000001` is strictly higher.

- [ ] **Step 2: Write the migration file**

```sql
-- Series Circles: Persistent Multi-Host Communities
-- Creates all tables for the Series Circles feature.
-- Additive only: no existing columns modified or removed.

-- ── 1. Series config JSONB on hub_groups ────────────────────────────────
ALTER TABLE hub_groups ADD COLUMN IF NOT EXISTS series_config JSONB DEFAULT NULL;
COMMENT ON COLUMN hub_groups.series_config IS
  'Master config for series circles: modules, farm, venue, expectations, widgets, early access, transparency settings.';

-- ── 2. Vanity slug for /s/{slug} URLs ──────────────────────────────────
ALTER TABLE hub_groups ADD COLUMN IF NOT EXISTS series_slug TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_hub_groups_series_slug
  ON hub_groups(series_slug) WHERE series_slug IS NOT NULL;

-- ── 3. Series hosts (equal co-ownership) ───────────────────────────────
CREATE TABLE IF NOT EXISTS series_hosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,

  -- Identity: ChefFlow user OR external collaborator
  user_id UUID REFERENCES users(id),
  tenant_id UUID REFERENCES chefs(id),

  -- External host identity (when not a ChefFlow user)
  external_name TEXT,
  external_email TEXT,
  external_bio TEXT,
  external_avatar_url TEXT,
  external_role TEXT,

  -- Host metadata
  display_name TEXT NOT NULL,
  display_role TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  website_url TEXT,

  -- Permissions (all equal by default)
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

CREATE INDEX IF NOT EXISTS idx_series_hosts_user
  ON series_hosts(user_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_series_hosts_series
  ON series_hosts(series_id) WHERE status != 'removed';

-- ── 4. Series posts (rich content feed) ────────────────────────────────
CREATE TABLE IF NOT EXISTS series_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  author_host_id UUID NOT NULL REFERENCES series_hosts(id),

  post_type TEXT NOT NULL CHECK (post_type IN (
    'update', 'sourcing', 'menu_preview', 'behind_scenes',
    'announcement', 'recap', 'transparency', 'milestone'
  )),
  title TEXT,
  body TEXT NOT NULL,

  image_urls TEXT[] DEFAULT '{}',
  link_url TEXT,
  link_label TEXT,

  event_id UUID REFERENCES events(id),

  visibility TEXT NOT NULL DEFAULT 'members' CHECK (visibility IN ('members', 'public')),

  pinned BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_series_posts_feed
  ON series_posts(series_id, published_at DESC) WHERE archived_at IS NULL;

-- ── 5. Series event history (timeline snapshots) ───────────────────────
CREATE TABLE IF NOT EXISTS series_event_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id),

  event_date DATE NOT NULL,
  event_title TEXT NOT NULL,
  guest_count INTEGER,
  menu_summary TEXT,
  menu_highlights TEXT[],

  cover_photo_url TEXT,
  photo_urls TEXT[] DEFAULT '{}',

  tickets_sold INTEGER,
  revenue_cents INTEGER,

  host_recap TEXT,
  guest_favorites TEXT[],

  visible_to_members BOOLEAN NOT NULL DEFAULT true,
  visible_to_public BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(series_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_series_event_history_timeline
  ON series_event_history(series_id, event_date DESC);

-- ── 6. Series menu drafts (collaborative menu builder) ─────────────────
CREATE TABLE IF NOT EXISTS series_menu_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id),
  status TEXT NOT NULL DEFAULT 'brainstorming'
    CHECK (status IN ('brainstorming', 'draft', 'review', 'locked', 'published')),
  menu_data JSONB NOT NULL DEFAULT '{}',
  locked_at TIMESTAMPTZ,
  locked_by UUID REFERENCES series_hosts(id),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 7. Host planning threads ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS series_host_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id),
  thread_type TEXT NOT NULL DEFAULT 'general'
    CHECK (thread_type IN ('general','menu','logistics','sourcing','equipment','budget','day_of')),
  subject TEXT NOT NULL,
  pinned BOOLEAN NOT NULL DEFAULT false,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS series_host_thread_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES series_host_threads(id) ON DELETE CASCADE,
  author_host_id UUID NOT NULL REFERENCES series_hosts(id),
  body TEXT NOT NULL,
  photo_urls TEXT[] DEFAULT '{}',
  reply_to_id UUID REFERENCES series_host_thread_messages(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 8. Prep schedule blocks ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS series_prep_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id),
  assigned_host_id UUID NOT NULL REFERENCES series_hosts(id),
  title TEXT NOT NULL,
  tasks TEXT[] DEFAULT '{}',
  block_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location TEXT,
  access_needed BOOLEAN NOT NULL DEFAULT false,
  access_notes TEXT,
  access_confirmed BOOLEAN NOT NULL DEFAULT false,
  equipment_needed TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned','confirmed','in_progress','completed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 9. Equipment and supplies ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS series_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id),
  category TEXT NOT NULL
    CHECK (category IN ('dishware','linens','cooking_equipment','serving','furniture','decor','other')),
  name TEXT NOT NULL,
  quantity INTEGER,
  quantity_needed INTEGER,
  provided_by UUID REFERENCES series_hosts(id),
  provider_notes TEXT,
  photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'needed'
    CHECK (status IN ('needed','claimed','confirmed','on_site')),
  is_series_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 10. Shared pre-event checklist ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS series_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id),
  task TEXT NOT NULL,
  assigned_to UUID REFERENCES series_hosts(id),
  due_date DATE,
  category TEXT NOT NULL DEFAULT 'logistics'
    CHECK (category IN ('prep','sourcing','equipment','logistics','communication','day_of','post_event')),
  priority TEXT NOT NULL DEFAULT 'important'
    CHECK (priority IN ('critical','important','nice_to_have')),
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES series_hosts(id),
  notes TEXT,
  auto_source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 11. Host expense tracking ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS series_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES hub_groups(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id),
  host_id UUID NOT NULL REFERENCES series_hosts(id),
  category TEXT NOT NULL
    CHECK (category IN ('ingredients','equipment','venue','labor','marketing','other')),
  description TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  receipt_photo_url TEXT,
  expense_date DATE NOT NULL,
  reimbursable BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 12. Event parent link ──────────────────────────────────────────────
ALTER TABLE events ADD COLUMN IF NOT EXISTS series_circle_id UUID REFERENCES hub_groups(id);
COMMENT ON COLUMN events.series_circle_id IS
  'Parent Series Circle for events produced inside a series. Multiple events per series.';
CREATE INDEX IF NOT EXISTS idx_events_series_circle
  ON events(series_circle_id) WHERE series_circle_id IS NOT NULL;

-- ── 13. Early access timing on event share settings ────────────────────
ALTER TABLE event_share_settings ADD COLUMN IF NOT EXISTS public_sale_opens_at TIMESTAMPTZ;
COMMENT ON COLUMN event_share_settings.public_sale_opens_at IS
  'When public ticket sales open. Before this time, only series members can purchase.';

-- ── 14. Member notification preferences for series ─────────────────────
ALTER TABLE hub_group_members
  ADD COLUMN IF NOT EXISTS series_notify_events BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS series_notify_posts BOOLEAN NOT NULL DEFAULT true;
```

- [ ] **Step 3: Verify migration syntax**

Run: `npx tsc --noEmit --skipLibCheck 2>&1 | head -5`
Expected: Migration is SQL-only, so TypeScript check should not be affected. Just verify no existing build breaks.

- [ ] **Step 4: Commit**

```bash
git add database/migrations/20260527000001_series_circles.sql
git commit -m "feat(series): add Series Circles migration with all tables

13 schema changes: series_hosts, series_posts, series_event_history,
series_menu_drafts, series_host_threads, series_host_thread_messages,
series_prep_blocks, series_equipment, series_checklist_items,
series_expenses, plus ALTER TABLE additions on hub_groups, events,
event_share_settings, and hub_group_members.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 2: TypeScript Types

**Files:**

- Create: `lib/series/types.ts`

- [ ] **Step 1: Write the types file**

This file is the single source of truth for all Series Circle types. It's large because it covers the full SeriesConfig JSONB shape plus all sub-types from the spec.

```typescript
// ---------------------------------------------------------------------------
// Series Circles: Type Definitions
// Single source of truth for all series-related types.
// ---------------------------------------------------------------------------

// ── Host Types ──────────────────────────────────────────────────────────

export type SeriesHostStatus = 'invited' | 'active' | 'removed'

export type SeriesHostPermissions = {
  canCreateEvents: boolean
  canPublishPosts: boolean
  canManageMembers: boolean
  canManageTickets: boolean
  canManageFinances: boolean
  canEditSeries: boolean
}

export type SeriesHost = {
  id: string
  seriesId: string
  userId: string | null
  tenantId: string | null
  externalName: string | null
  externalEmail: string | null
  externalBio: string | null
  externalAvatarUrl: string | null
  externalRole: string | null
  displayName: string
  displayRole: string
  bio: string | null
  avatarUrl: string | null
  websiteUrl: string | null
  permissions: SeriesHostPermissions
  status: SeriesHostStatus
  invitedAt: string
  acceptedAt: string | null
  removedAt: string | null
}

// ── Host Profile (rich display data in SeriesConfig) ────────────────────

export type SeriesHostProfile = {
  hostId: string
  headshotUrl: string | null
  actionPhotos: string[]
  links: Array<{
    label: string
    url: string
    icon: string | null
    featured: boolean
  }>
  servicePackages: Array<{
    name: string
    description: string
    priceRange: string | null
    bookingUrl: string | null
    photoUrl: string | null
  }>
  highlights: string[]
}

// ── Farm Types ──────────────────────────────────────────────────────────

export type SeriesFarmProfile = {
  farmName: string
  location: string
  foundedYear: number | null
  story: string
  coverPhotoUrl: string | null
  galleryPhotos: string[]
  googleMapsEmbedUrl: string | null
  streetViewEmbedUrl: string | null
  coordinates: { lat: number; lng: number } | null
  livestock: Array<{
    id: string
    name: string
    species: string | null
    breed: string | null
    count: number | null
    photoUrl: string | null
    notes: string | null
    onMenu: boolean
  }>
  gardenPlots: Array<{
    id: string
    name: string
    photoUrl: string | null
    crops: string[]
    notes: string | null
  }>
  recentHarvests: Array<{
    id: string
    itemName: string
    photoUrl: string | null
    pickedDate: string
    quantity: string | null
    destination: string | null
  }>
  historyTimeline: Array<{
    year: number
    title: string
    description: string
    photoUrl: string | null
  }>
  csaUrl: string | null
  farmStoreUrl: string | null
  farmWebsiteUrl: string | null
}

// ── Farm Inventory ──────────────────────────────────────────────────────

export type FarmInventoryCategory =
  | 'fresh_meat'
  | 'freezer'
  | 'garden'
  | 'herbs'
  | 'dairy_eggs'
  | 'pantry'
  | 'canned_preserved'
  | 'freeze_dried'
  | 'supplemental'
  | 'dishware_equipment'

export type FarmInventoryItem = {
  id: string
  name: string
  category: FarmInventoryCategory
  photoUrl: string | null
  seasonStart: number | null
  seasonEnd: number | null
  currentStatus: 'available' | 'coming_soon' | 'out_of_season' | 'limited'
  onUpcomingMenu: boolean
  sourceNotes: string | null
  variety: string | null
}

// ── Venue ───────────────────────────────────────────────────────────────

export type SeriesVenueProfile = {
  venueName: string | null
  settingDescription: string
  photos: Array<{
    url: string
    caption: string | null
    featured: boolean
  }>
  googleMapsEmbedUrl: string | null
  streetViewEmbedUrl: string | null
  seatedCapacity: number | null
  standingCapacity: number | null
  tableDescription: string | null
  seasonalNotes: Array<{
    season: 'spring' | 'summer' | 'fall' | 'winter'
    description: string
    photoUrl: string | null
  }>
  accessibilityNotes: string | null
}

// ── Menu Config ─────────────────────────────────────────────────────────

export type SeriesMenuConfig = {
  showIngredientSourcing: boolean
  showDietaryIcons: boolean
  showBeveragePairings: boolean
  showChefNotes: boolean
  enablePostEventFeedback: boolean
  enablePreEventPolling: boolean
  enableOpenSuggestions: boolean
  enableDishRatings: boolean
  showMostRequested: boolean
}

// ── Event Expectations ──────────────────────────────────────────────────

export type SeriesEventExpectations = {
  dressCode: {
    enabled: boolean
    label: string
    description: string | null
    photoUrl: string | null
  } | null
  ageRequirement: {
    enabled: boolean
    minimumAge: number | null
    label: string
    notes: string | null
  } | null
  byobPolicy: {
    enabled: boolean
    allowed: boolean
    details: string | null
    whatsProvided: string | null
  } | null
  smokingPolicy: {
    enabled: boolean
    fourTwentyFriendly: boolean
    smokingAllowed: boolean
    designatedArea: string | null
    details: string | null
  } | null
  guestRules: Array<{
    rule: string
    icon: string | null
  }>
  whatToBring: Array<{
    item: string
    required: boolean
    notes: string | null
  }>
  timing: {
    arrivalTime: string | null
    dinnerStartTime: string | null
    expectedEndTime: string | null
    arrivalNotes: string | null
  }
  houseRules: Array<{
    rule: string
    important: boolean
  }>
  parking: {
    instructions: string
    photoUrl: string | null
    mapUrl: string | null
  } | null
  entryInstructions: {
    instructions: string
    photoUrl: string | null
    streetViewUrl: string | null
  } | null
  eventVibe: {
    tone: string
    description: string | null
    moodPhotos: string[]
    playlistUrl: string | null
  } | null
  weather: {
    showForecast: boolean
    rainPlan: string | null
    temperatureNotes: string | null
  }
}

// ── Module System ───────────────────────────────────────────────────────

export type SeriesModuleKey =
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

export type SeriesModuleEntry = {
  key: SeriesModuleKey
  enabled: boolean
  sortOrder: number
  visibility: 'public' | 'members'
}

// ── SeriesConfig (master JSONB) ─────────────────────────────────────────

export type SeriesConfig = {
  tagline: string
  coverImageUrl: string | null
  heroGallery: string[]
  slug: string | null
  hostDisplayOrder: string[]
  hostProfiles: SeriesHostProfile[]
  approvalMode: 'auto' | 'manual'
  maxMembers: number | null
  earlyAccess: {
    enabled: boolean
    windowHours: number
    maxTicketsPerMember: number | null
    memberPricingEnabled: boolean
    memberDiscountPercent: number | null
  }
  transparency: {
    showSourcingStories: boolean
    showCostBreakdown: boolean
    showFarmUpdates: boolean
  }
  farm: SeriesFarmProfile | null
  farmInventory: FarmInventoryItem[]
  venue: SeriesVenueProfile | null
  menu: SeriesMenuConfig
  defaultExpectations: SeriesEventExpectations
  liveWidgets: {
    showCountdown: boolean
    showSeatsRemaining: boolean
    showWeather: boolean
    showRsvpPulse: boolean
    showMemberCount: boolean
    showLastEventRating: boolean
  }
  defaultNotifications: {
    newPosts: boolean
    newEvents: boolean
    eventReminders: boolean
    digestMode: 'instant' | 'daily' | 'weekly'
  }
  modules: SeriesModuleEntry[]
  publicPage: {
    enabled: boolean
    showPastEvents: boolean
    showMemberCount: boolean
    showUpcomingEvents: boolean
    story: string
  }
}

// ── Series Summary (list view) ──────────────────────────────────────────

export type SeriesSummary = {
  id: string
  name: string
  description: string | null
  slug: string | null
  groupToken: string
  coverImageUrl: string | null
  tagline: string | null
  memberCount: number
  hostCount: number
  eventCount: number
  isActive: boolean
  createdAt: string
}

// ── CRUD Inputs ─────────────────────────────────────────────────────────

export type SeriesCreateInput = {
  name: string
  description?: string | null
  tagline?: string
  slug?: string | null
  visibility?: 'public' | 'private'
}

export type SeriesHostInviteInput = {
  seriesId: string
  email?: string | null
  externalName?: string | null
  externalEmail?: string | null
  externalRole?: string | null
  displayName: string
  displayRole: string
  bio?: string | null
}

export type SeriesOperationResult = {
  success: boolean
  seriesId?: string
  hostId?: string
  error?: string
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit --skipLibCheck 2>&1 | head -10`
Expected: No errors from `lib/series/types.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/series/types.ts
git commit -m "feat(series): add TypeScript types for Series Circles

SeriesConfig JSONB shape, SeriesHost, SeriesHostProfile, SeriesFarmProfile,
FarmInventoryItem, SeriesVenueProfile, SeriesMenuConfig, SeriesEventExpectations,
SeriesModuleKey, plus CRUD input/output types.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Default SeriesConfig Factory

**Files:**

- Create: `lib/series/defaults.ts`

- [ ] **Step 1: Write the defaults factory**

This function produces a valid initial `SeriesConfig` for newly created series. Every field has a sensible default so hosts start with a working page.

```typescript
import type { SeriesConfig, SeriesModuleKey, SeriesModuleEntry } from './types'

const DEFAULT_MODULE_ORDER: SeriesModuleKey[] = [
  'hero',
  'hosts',
  'farm',
  'farm_inventory',
  'venue',
  'menu',
  'event_expectations',
  'live_data',
  'news_feed',
  'past_events',
  'links',
]

export function createDefaultSeriesConfig(
  overrides?: Partial<Pick<SeriesConfig, 'tagline' | 'slug'>>
): SeriesConfig {
  const modules: SeriesModuleEntry[] = DEFAULT_MODULE_ORDER.map((key, i) => ({
    key,
    enabled: true,
    sortOrder: i,
    visibility: key === 'news_feed' ? ('members' as const) : ('public' as const),
  }))

  return {
    tagline: overrides?.tagline ?? '',
    coverImageUrl: null,
    heroGallery: [],
    slug: overrides?.slug ?? null,
    hostDisplayOrder: [],
    hostProfiles: [],
    approvalMode: 'auto',
    maxMembers: null,
    earlyAccess: {
      enabled: true,
      windowHours: 48,
      maxTicketsPerMember: null,
      memberPricingEnabled: false,
      memberDiscountPercent: null,
    },
    transparency: {
      showSourcingStories: true,
      showCostBreakdown: false,
      showFarmUpdates: true,
    },
    farm: null,
    farmInventory: [],
    venue: null,
    menu: {
      showIngredientSourcing: true,
      showDietaryIcons: true,
      showBeveragePairings: false,
      showChefNotes: true,
      enablePostEventFeedback: true,
      enablePreEventPolling: false,
      enableOpenSuggestions: false,
      enableDishRatings: true,
      showMostRequested: false,
    },
    defaultExpectations: {
      dressCode: null,
      ageRequirement: null,
      byobPolicy: null,
      smokingPolicy: null,
      guestRules: [],
      whatToBring: [],
      timing: {
        arrivalTime: null,
        dinnerStartTime: null,
        expectedEndTime: null,
        arrivalNotes: null,
      },
      houseRules: [],
      parking: null,
      entryInstructions: null,
      eventVibe: null,
      weather: {
        showForecast: true,
        rainPlan: null,
        temperatureNotes: null,
      },
    },
    liveWidgets: {
      showCountdown: true,
      showSeatsRemaining: true,
      showWeather: true,
      showRsvpPulse: false,
      showMemberCount: true,
      showLastEventRating: false,
    },
    defaultNotifications: {
      newPosts: true,
      newEvents: true,
      eventReminders: true,
      digestMode: 'instant',
    },
    modules,
    publicPage: {
      enabled: true,
      showPastEvents: true,
      showMemberCount: true,
      showUpcomingEvents: true,
      story: '',
    },
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit --skipLibCheck 2>&1 | head -10`
Expected: Clean.

- [ ] **Step 3: Commit**

```bash
git add lib/series/defaults.ts
git commit -m "feat(series): add default SeriesConfig factory

Creates sensible initial config for new series: all modules enabled,
48h early access, sourcing transparency on, public page on.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 4: Series CRUD Server Actions

**Files:**

- Create: `lib/series/actions.ts`

- [ ] **Step 1: Write the series CRUD actions**

These follow the exact same pattern as `lib/circles/unified-api.ts`: `'use server'`, `requireChef()`, `createServerClient({ admin: true })`, `revalidatePath()`.

**Critical difference:** Series circles have `tenant_id = NULL` on `hub_groups`. Access is through `series_hosts` membership, not tenant scoping. The creating host's `tenant_id` is stored in `series_hosts`, not on the circle itself.

```typescript
'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { createDefaultSeriesConfig } from './defaults'
import type {
  SeriesCreateInput,
  SeriesConfig,
  SeriesSummary,
  SeriesHost,
  SeriesOperationResult,
} from './types'

async function requireSeriesHost(
  db: any,
  seriesId: string,
  userId: string
): Promise<SeriesHost | null> {
  const { data } = await db
    .from('series_hosts')
    .select('*')
    .eq('series_id', seriesId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()
  if (!data) return null
  return mapHostRow(data)
}

function mapHostRow(row: any): SeriesHost {
  return {
    id: row.id,
    seriesId: row.series_id,
    userId: row.user_id,
    tenantId: row.tenant_id,
    externalName: row.external_name,
    externalEmail: row.external_email,
    externalBio: row.external_bio,
    externalAvatarUrl: row.external_avatar_url,
    externalRole: row.external_role,
    displayName: row.display_name,
    displayRole: row.display_role,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    websiteUrl: row.website_url,
    permissions: {
      canCreateEvents: row.can_create_events,
      canPublishPosts: row.can_publish_posts,
      canManageMembers: row.can_manage_members,
      canManageTickets: row.can_manage_tickets,
      canManageFinances: row.can_manage_finances,
      canEditSeries: row.can_edit_series,
    },
    status: row.status,
    invitedAt: row.invited_at,
    acceptedAt: row.accepted_at,
    removedAt: row.removed_at,
  }
}

export async function createSeries(input: SeriesCreateInput): Promise<SeriesOperationResult> {
  try {
    const user = await requireChef()
    const db: any = createServerClient({ admin: true })

    const name = input.name.trim()
    if (!name || name.length < 1) return { success: false, error: 'Series name is required' }
    if (name.length > 100) return { success: false, error: 'Series name is too long' }

    if (input.slug) {
      const slug = input.slug.trim().toLowerCase()
      if (!/^[a-z0-9-]+$/.test(slug)) {
        return {
          success: false,
          error: 'Slug must be lowercase letters, numbers, and hyphens only',
        }
      }
      const { data: existingSlug } = await db
        .from('hub_groups')
        .select('id')
        .eq('series_slug', slug)
        .maybeSingle()
      if (existingSlug) return { success: false, error: 'That URL slug is already taken' }
    }

    const { getChefHubProfileId } = await import('@/lib/hub/circle-lookup')
    const chefProfileId = await getChefHubProfileId(user.tenantId!)
    if (!chefProfileId) return { success: false, error: 'Chef hub profile not found' }

    const config = createDefaultSeriesConfig({
      tagline: input.tagline,
      slug: input.slug ?? null,
    })

    const { data: group, error: groupError } = await db
      .from('hub_groups')
      .insert({
        name,
        description: input.description?.trim() || null,
        group_type: 'series',
        tenant_id: null,
        is_active: true,
        created_by_profile_id: chefProfileId,
        visibility: input.visibility ?? 'public',
        series_config: config,
        series_slug: input.slug?.trim().toLowerCase() || null,
      })
      .select('id, group_token')
      .single()

    if (groupError || !group) {
      return { success: false, error: groupError?.message ?? 'Failed to create series' }
    }

    const { error: hostError } = await db.from('series_hosts').insert({
      series_id: group.id,
      user_id: user.userId,
      tenant_id: user.tenantId,
      display_name: user.email.split('@')[0],
      display_role: 'Chef',
      status: 'active',
      accepted_at: new Date().toISOString(),
    })

    if (hostError) {
      await db.from('hub_groups').delete().eq('id', group.id)
      return { success: false, error: 'Failed to set up host' }
    }

    await db.from('hub_group_members').insert({
      group_id: group.id,
      profile_id: chefProfileId,
      role: 'chef',
      can_post: true,
      can_invite: true,
      can_pin: true,
    })

    revalidatePath('/circles')
    return { success: true, seriesId: group.id }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function getSeries(seriesId: string): Promise<{
  id: string
  name: string
  description: string | null
  groupToken: string
  slug: string | null
  config: SeriesConfig
  isActive: boolean
  createdAt: string
  myHost: SeriesHost | null
} | null> {
  const user = await requireChef()
  const db: any = createServerClient({ admin: true })

  const { data: g } = await db
    .from('hub_groups')
    .select('id, name, description, group_token, series_slug, series_config, is_active, created_at')
    .eq('id', seriesId)
    .eq('group_type', 'series')
    .single()

  if (!g) return null

  const myHost = await requireSeriesHost(db, seriesId, user.userId)
  if (!myHost) return null

  return {
    id: g.id,
    name: g.name,
    description: g.description,
    groupToken: g.group_token,
    slug: g.series_slug,
    config: g.series_config as SeriesConfig,
    isActive: g.is_active,
    createdAt: g.created_at,
    myHost,
  }
}

export async function listMySeries(): Promise<SeriesSummary[]> {
  const user = await requireChef()
  const db: any = createServerClient({ admin: true })

  const { data: hostRows } = await db
    .from('series_hosts')
    .select('series_id')
    .eq('user_id', user.userId)
    .eq('status', 'active')

  if (!hostRows?.length) return []

  const seriesIds = hostRows.map((r: any) => r.series_id)

  const { data: groups } = await db
    .from('hub_groups')
    .select('id, name, description, group_token, series_slug, series_config, is_active, created_at')
    .in('id', seriesIds)
    .eq('group_type', 'series')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (!groups?.length) return []

  const groupIds = groups.map((g: any) => g.id)

  const { data: memberRows } = await db
    .from('hub_group_members')
    .select('group_id')
    .in('group_id', groupIds)
  const memberCounts = new Map<string, number>()
  for (const r of memberRows ?? []) {
    memberCounts.set(r.group_id, (memberCounts.get(r.group_id) ?? 0) + 1)
  }

  const { data: hostCounts } = await db
    .from('series_hosts')
    .select('series_id')
    .in('series_id', groupIds)
    .eq('status', 'active')
  const hostCountMap = new Map<string, number>()
  for (const r of hostCounts ?? []) {
    hostCountMap.set(r.series_id, (hostCountMap.get(r.series_id) ?? 0) + 1)
  }

  const { data: eventCounts } = await db
    .from('events')
    .select('series_circle_id')
    .in('series_circle_id', groupIds)
  const eventCountMap = new Map<string, number>()
  for (const r of eventCounts ?? []) {
    eventCountMap.set(r.series_circle_id, (eventCountMap.get(r.series_circle_id) ?? 0) + 1)
  }

  return groups.map((g: any) => {
    const config = g.series_config as SeriesConfig | null
    return {
      id: g.id,
      name: g.name,
      description: g.description,
      slug: g.series_slug,
      groupToken: g.group_token,
      coverImageUrl: config?.coverImageUrl ?? null,
      tagline: config?.tagline ?? null,
      memberCount: memberCounts.get(g.id) ?? 0,
      hostCount: hostCountMap.get(g.id) ?? 0,
      eventCount: eventCountMap.get(g.id) ?? 0,
      isActive: g.is_active,
      createdAt: g.created_at,
    }
  })
}

export async function updateSeriesConfig(
  seriesId: string,
  configPatch: Partial<SeriesConfig>
): Promise<SeriesOperationResult> {
  try {
    const user = await requireChef()
    const db: any = createServerClient({ admin: true })

    const host = await requireSeriesHost(db, seriesId, user.userId)
    if (!host) return { success: false, error: 'Not a host of this series' }
    if (!host.permissions.canEditSeries)
      return { success: false, error: 'No permission to edit series' }

    const { data: existing } = await db
      .from('hub_groups')
      .select('series_config')
      .eq('id', seriesId)
      .single()
    if (!existing) return { success: false, error: 'Series not found' }

    const currentConfig = (existing.series_config ?? {}) as SeriesConfig
    const newConfig = { ...currentConfig, ...configPatch }

    if (configPatch.slug !== undefined) {
      const slug = configPatch.slug?.trim().toLowerCase() || null
      if (slug && !/^[a-z0-9-]+$/.test(slug)) {
        return {
          success: false,
          error: 'Slug must be lowercase letters, numbers, and hyphens only',
        }
      }
      if (slug) {
        const { data: taken } = await db
          .from('hub_groups')
          .select('id')
          .eq('series_slug', slug)
          .neq('id', seriesId)
          .maybeSingle()
        if (taken) return { success: false, error: 'That URL slug is already taken' }
      }
      await db.from('hub_groups').update({ series_slug: slug }).eq('id', seriesId)
    }

    const { error } = await db
      .from('hub_groups')
      .update({
        series_config: newConfig,
        updated_at: new Date().toISOString(),
      })
      .eq('id', seriesId)

    if (error) return { success: false, error: 'Failed to update config' }

    revalidatePath('/circles')
    revalidatePath(`/series/${seriesId}`)
    return { success: true, seriesId }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function updateSeriesDetails(
  seriesId: string,
  updates: { name?: string; description?: string | null }
): Promise<SeriesOperationResult> {
  try {
    const user = await requireChef()
    const db: any = createServerClient({ admin: true })

    const host = await requireSeriesHost(db, seriesId, user.userId)
    if (!host) return { success: false, error: 'Not a host of this series' }
    if (!host.permissions.canEditSeries)
      return { success: false, error: 'No permission to edit series' }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (updates.name !== undefined) {
      const name = updates.name.trim()
      if (!name) return { success: false, error: 'Name is required' }
      patch.name = name
    }
    if (updates.description !== undefined) {
      patch.description = updates.description?.trim() || null
    }

    const { error } = await db.from('hub_groups').update(patch).eq('id', seriesId)
    if (error) return { success: false, error: 'Failed to update series' }

    revalidatePath('/circles')
    revalidatePath(`/series/${seriesId}`)
    return { success: true, seriesId }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit --skipLibCheck 2>&1 | head -20`
Expected: Clean.

- [ ] **Step 3: Commit**

```bash
git add lib/series/actions.ts
git commit -m "feat(series): add Series CRUD server actions

createSeries, getSeries, listMySeries, updateSeriesConfig,
updateSeriesDetails. Host-scoped access (no tenant_id on series).

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 5: Host Management Server Actions

**Files:**

- Create: `lib/series/host-actions.ts`

- [ ] **Step 1: Write the host management actions**

```typescript
'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import type {
  SeriesHost,
  SeriesHostInviteInput,
  SeriesHostPermissions,
  SeriesOperationResult,
} from './types'

function mapHostRow(row: any): SeriesHost {
  return {
    id: row.id,
    seriesId: row.series_id,
    userId: row.user_id,
    tenantId: row.tenant_id,
    externalName: row.external_name,
    externalEmail: row.external_email,
    externalBio: row.external_bio,
    externalAvatarUrl: row.external_avatar_url,
    externalRole: row.external_role,
    displayName: row.display_name,
    displayRole: row.display_role,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    websiteUrl: row.website_url,
    permissions: {
      canCreateEvents: row.can_create_events,
      canPublishPosts: row.can_publish_posts,
      canManageMembers: row.can_manage_members,
      canManageTickets: row.can_manage_tickets,
      canManageFinances: row.can_manage_finances,
      canEditSeries: row.can_edit_series,
    },
    status: row.status,
    invitedAt: row.invited_at,
    acceptedAt: row.accepted_at,
    removedAt: row.removed_at,
  }
}

async function requireActiveHost(
  db: any,
  seriesId: string,
  userId: string
): Promise<SeriesHost | null> {
  const { data } = await db
    .from('series_hosts')
    .select('*')
    .eq('series_id', seriesId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()
  return data ? mapHostRow(data) : null
}

export async function inviteSeriesHost(
  input: SeriesHostInviteInput
): Promise<SeriesOperationResult> {
  try {
    const user = await requireChef()
    const db: any = createServerClient({ admin: true })

    const myHost = await requireActiveHost(db, input.seriesId, user.userId)
    if (!myHost) return { success: false, error: 'Not a host of this series' }
    if (!myHost.permissions.canManageMembers) {
      return { success: false, error: 'No permission to invite hosts' }
    }

    if (input.email) {
      const email = input.email.trim().toLowerCase()
      if (!email.includes('@')) return { success: false, error: 'Valid email required' }

      const { data: inviteeUser } = await db
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle()

      if (inviteeUser) {
        if (inviteeUser.id === user.userId) {
          return { success: false, error: 'Cannot invite yourself' }
        }
        const { data: existing } = await db
          .from('series_hosts')
          .select('id, status')
          .eq('series_id', input.seriesId)
          .eq('user_id', inviteeUser.id)
          .maybeSingle()

        if (existing?.status === 'active') return { success: false, error: 'Already a host' }
        if (existing?.status === 'invited')
          return { success: false, error: 'Invitation already pending' }

        if (existing?.status === 'removed') {
          await db
            .from('series_hosts')
            .update({
              status: 'invited',
              display_name: input.displayName,
              display_role: input.displayRole,
              bio: input.bio ?? null,
              invited_at: new Date().toISOString(),
              accepted_at: null,
              removed_at: null,
            })
            .eq('id', existing.id)
          revalidatePath(`/series/${input.seriesId}`)
          return { success: true, seriesId: input.seriesId, hostId: existing.id }
        }

        const { data: inviteeChef } = await db
          .from('chefs')
          .select('id')
          .eq('auth_user_id', inviteeUser.id)
          .maybeSingle()

        const { data: newHost, error } = await db
          .from('series_hosts')
          .insert({
            series_id: input.seriesId,
            user_id: inviteeUser.id,
            tenant_id: inviteeChef?.id ?? null,
            display_name: input.displayName,
            display_role: input.displayRole,
            bio: input.bio ?? null,
            status: 'invited',
          })
          .select('id')
          .single()

        if (error) return { success: false, error: 'Failed to create invitation' }
        revalidatePath(`/series/${input.seriesId}`)
        return { success: true, seriesId: input.seriesId, hostId: newHost.id }
      }
    }

    if (input.externalName && input.externalEmail) {
      const extEmail = input.externalEmail.trim().toLowerCase()
      const { data: existing } = await db
        .from('series_hosts')
        .select('id, status')
        .eq('series_id', input.seriesId)
        .eq('external_email', extEmail)
        .maybeSingle()

      if (existing?.status === 'active') return { success: false, error: 'Already a host' }

      if (existing) {
        await db
          .from('series_hosts')
          .update({
            status: 'active',
            external_name: input.externalName,
            external_role: input.externalRole ?? null,
            display_name: input.displayName,
            display_role: input.displayRole,
            bio: input.bio ?? null,
            accepted_at: new Date().toISOString(),
            removed_at: null,
          })
          .eq('id', existing.id)
        revalidatePath(`/series/${input.seriesId}`)
        return { success: true, seriesId: input.seriesId, hostId: existing.id }
      }

      const { data: newHost, error } = await db
        .from('series_hosts')
        .insert({
          series_id: input.seriesId,
          external_name: input.externalName,
          external_email: extEmail,
          external_role: input.externalRole ?? null,
          display_name: input.displayName,
          display_role: input.displayRole,
          bio: input.bio ?? null,
          status: 'active',
          accepted_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (error) return { success: false, error: 'Failed to add external host' }
      revalidatePath(`/series/${input.seriesId}`)
      return { success: true, seriesId: input.seriesId, hostId: newHost.id }
    }

    return { success: false, error: 'Either email or external name+email is required' }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function acceptSeriesHostInvitation(seriesId: string): Promise<SeriesOperationResult> {
  try {
    const user = await requireChef()
    const db: any = createServerClient({ admin: true })

    const { data: invite } = await db
      .from('series_hosts')
      .select('id')
      .eq('series_id', seriesId)
      .eq('user_id', user.userId)
      .eq('status', 'invited')
      .maybeSingle()

    if (!invite) return { success: false, error: 'No pending invitation found' }

    await db
      .from('series_hosts')
      .update({
        status: 'active',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invite.id)

    const { getChefHubProfileId } = await import('@/lib/hub/circle-lookup')
    const profileId = await getChefHubProfileId(user.tenantId!)
    if (profileId) {
      const { data: existingMember } = await db
        .from('hub_group_members')
        .select('id')
        .eq('group_id', seriesId)
        .eq('profile_id', profileId)
        .maybeSingle()
      if (!existingMember) {
        await db.from('hub_group_members').insert({
          group_id: seriesId,
          profile_id: profileId,
          role: 'host',
          can_post: true,
          can_invite: true,
          can_pin: true,
          is_co_host: true,
        })
      }
    }

    revalidatePath('/circles')
    revalidatePath(`/series/${seriesId}`)
    return { success: true, seriesId, hostId: invite.id }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function removeSeriesHost(
  seriesId: string,
  hostId: string
): Promise<SeriesOperationResult> {
  try {
    const user = await requireChef()
    const db: any = createServerClient({ admin: true })

    const myHost = await requireActiveHost(db, seriesId, user.userId)
    if (!myHost) return { success: false, error: 'Not a host of this series' }
    if (!myHost.permissions.canManageMembers) {
      return { success: false, error: 'No permission to remove hosts' }
    }
    if (myHost.id === hostId) return { success: false, error: 'Cannot remove yourself' }

    const { data: activeHosts } = await db
      .from('series_hosts')
      .select('id')
      .eq('series_id', seriesId)
      .eq('status', 'active')
    if ((activeHosts?.length ?? 0) <= 1) {
      return { success: false, error: 'Cannot remove the last host' }
    }

    await db
      .from('series_hosts')
      .update({
        status: 'removed',
        removed_at: new Date().toISOString(),
      })
      .eq('id', hostId)
      .eq('series_id', seriesId)

    revalidatePath(`/series/${seriesId}`)
    return { success: true, seriesId }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function updateSeriesHostPermissions(
  seriesId: string,
  hostId: string,
  permissions: Partial<SeriesHostPermissions>
): Promise<SeriesOperationResult> {
  try {
    const user = await requireChef()
    const db: any = createServerClient({ admin: true })

    const myHost = await requireActiveHost(db, seriesId, user.userId)
    if (!myHost) return { success: false, error: 'Not a host of this series' }
    if (!myHost.permissions.canManageMembers) {
      return { success: false, error: 'No permission to manage hosts' }
    }

    const patch: Record<string, boolean> = {}
    if (permissions.canCreateEvents !== undefined)
      patch.can_create_events = permissions.canCreateEvents
    if (permissions.canPublishPosts !== undefined)
      patch.can_publish_posts = permissions.canPublishPosts
    if (permissions.canManageMembers !== undefined)
      patch.can_manage_members = permissions.canManageMembers
    if (permissions.canManageTickets !== undefined)
      patch.can_manage_tickets = permissions.canManageTickets
    if (permissions.canManageFinances !== undefined)
      patch.can_manage_finances = permissions.canManageFinances
    if (permissions.canEditSeries !== undefined) patch.can_edit_series = permissions.canEditSeries

    if (Object.keys(patch).length === 0) return { success: true, seriesId }

    await db
      .from('series_hosts')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', hostId)
      .eq('series_id', seriesId)

    revalidatePath(`/series/${seriesId}`)
    return { success: true, seriesId }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function listSeriesHosts(seriesId: string): Promise<SeriesHost[]> {
  const user = await requireChef()
  const db: any = createServerClient({ admin: true })

  const myHost = await requireActiveHost(db, seriesId, user.userId)
  if (!myHost) return []

  const { data: hosts } = await db
    .from('series_hosts')
    .select('*')
    .eq('series_id', seriesId)
    .in('status', ['active', 'invited'])
    .order('invited_at', { ascending: true })

  return (hosts ?? []).map(mapHostRow)
}

export async function updateSeriesHostProfile(
  seriesId: string,
  updates: {
    displayName?: string
    displayRole?: string
    bio?: string | null
    avatarUrl?: string | null
    websiteUrl?: string | null
  }
): Promise<SeriesOperationResult> {
  try {
    const user = await requireChef()
    const db: any = createServerClient({ admin: true })

    const myHost = await requireActiveHost(db, seriesId, user.userId)
    if (!myHost) return { success: false, error: 'Not a host of this series' }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (updates.displayName !== undefined) patch.display_name = updates.displayName
    if (updates.displayRole !== undefined) patch.display_role = updates.displayRole
    if (updates.bio !== undefined) patch.bio = updates.bio
    if (updates.avatarUrl !== undefined) patch.avatar_url = updates.avatarUrl
    if (updates.websiteUrl !== undefined) patch.website_url = updates.websiteUrl

    await db.from('series_hosts').update(patch).eq('id', myHost.id).eq('series_id', seriesId)

    revalidatePath(`/series/${seriesId}`)
    return { success: true, seriesId, hostId: myHost.id }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit --skipLibCheck 2>&1 | head -20`
Expected: Clean.

- [ ] **Step 3: Commit**

```bash
git add lib/series/host-actions.ts
git commit -m "feat(series): add host management server actions

inviteSeriesHost (ChefFlow users + external), acceptSeriesHostInvitation,
removeSeriesHost, updateSeriesHostPermissions, listSeriesHosts,
updateSeriesHostProfile. Supports equal co-ownership model.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 6: Barrel Exports

**Files:**

- Create: `lib/series/index.ts`

- [ ] **Step 1: Write the barrel file**

```typescript
export type {
  SeriesHostStatus,
  SeriesHostPermissions,
  SeriesHost,
  SeriesHostProfile,
  SeriesFarmProfile,
  FarmInventoryCategory,
  FarmInventoryItem,
  SeriesVenueProfile,
  SeriesMenuConfig,
  SeriesEventExpectations,
  SeriesModuleKey,
  SeriesModuleEntry,
  SeriesConfig,
  SeriesSummary,
  SeriesCreateInput,
  SeriesHostInviteInput,
  SeriesOperationResult,
} from './types'

export { createDefaultSeriesConfig } from './defaults'

export {
  createSeries,
  getSeries,
  listMySeries,
  updateSeriesConfig,
  updateSeriesDetails,
} from './actions'

export {
  inviteSeriesHost,
  acceptSeriesHostInvitation,
  removeSeriesHost,
  updateSeriesHostPermissions,
  listSeriesHosts,
  updateSeriesHostProfile,
} from './host-actions'
```

- [ ] **Step 2: Commit**

```bash
git add lib/series/index.ts
git commit -m "feat(series): add barrel exports for lib/series

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 7: Extend CircleType System

**Files:**

- Modify: `lib/circles/types.ts:6-14`
- Modify: `lib/circles/unified-api.ts:24-48`

- [ ] **Step 1: Add 'series' to CircleType union**

In `lib/circles/types.ts`, add `'series'` to the `CircleType` union:

```typescript
export type CircleType =
  | 'operational' // Auto-created for events, clients, vendors
  | 'elective' // Manually created by chef
  | 'event' // Scoped to a single event
  | 'client' // Durable chef-client relationship
  | 'vendor' // Chef-vendor sourcing
  | 'collab' // Multi-chef collaboration
  | 'community' // Public/semi-public community
  | 'series' // Persistent multi-host series
```

- [ ] **Step 2: Update resolveCircleType in unified-api.ts**

In `lib/circles/unified-api.ts`, update `resolveCircleType` to handle `series`:

```typescript
function resolveCircleType(
  groupType: string | null,
  eventId: string | null,
  visibility: string | null
): CircleType {
  if (groupType === 'series') return 'series'
  if (groupType === 'bridge') return 'collab'
  if (groupType === 'community') return 'community'
  if (eventId) return 'event'
  if (visibility === 'secret') return 'elective'
  return 'client'
}
```

- [ ] **Step 3: Update circleTypeToGroupType in unified-api.ts**

```typescript
function circleTypeToGroupType(circleType: CircleType): string {
  switch (circleType) {
    case 'series':
      return 'series'
    case 'collab':
      return 'bridge'
    case 'community':
      return 'community'
    default:
      return 'circle'
  }
}
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit --skipLibCheck 2>&1 | head -20`
Expected: Clean. No downstream breakage since `'series'` is additive to the union.

- [ ] **Step 5: Commit**

```bash
git add lib/circles/types.ts lib/circles/unified-api.ts
git commit -m "feat(circles): add 'series' to CircleType union and resolvers

Additive change: existing circle types unaffected. resolveCircleType
and circleTypeToGroupType now handle group_type='series'.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 8: TypeScript Build Verification

**Files:** None (verification only)

- [ ] **Step 1: Full type check**

Run: `npx tsc --noEmit --skipLibCheck`
Expected: Exit 0, no errors.

- [ ] **Step 2: Verify no import cycles**

Run: `grep -r "from '@/lib/series'" lib/circles/ --include="*.ts" | head -5`
Expected: No results. `lib/circles/` should NOT import from `lib/series/`. The dependency is one-way: `lib/series/` imports from `lib/circles/` types and `lib/hub/`.

- [ ] **Step 3: Verify exports resolve**

Run: `node -e "console.log('ok')"` (sanity check that Node runs)
Then verify the barrel: `grep "export" lib/series/index.ts | wc -l`
Expected: Should show the export count (around 20 lines).

---

### Task 9: Final Commit and Summary

- [ ] **Step 1: Verify all files are committed**

Run: `git status --short lib/series/ lib/circles/types.ts lib/circles/unified-api.ts database/migrations/20260527000001_series_circles.sql`
Expected: All clean (no uncommitted changes in these paths).

- [ ] **Step 2: Verify commit history**

Run: `git log --oneline -8`
Expected: See all Phase 1 commits in order.

---

## Phase 1 Deliverables Summary

| What                                                  | Where                                                   |
| ----------------------------------------------------- | ------------------------------------------------------- |
| Migration (13 schema changes)                         | `database/migrations/20260527000001_series_circles.sql` |
| TypeScript types (full SeriesConfig shape)            | `lib/series/types.ts`                                   |
| Default config factory                                | `lib/series/defaults.ts`                                |
| Series CRUD (create, get, list, update)               | `lib/series/actions.ts`                                 |
| Host management (invite, accept, remove, permissions) | `lib/series/host-actions.ts`                            |
| Barrel exports                                        | `lib/series/index.ts`                                   |
| CircleType extension                                  | `lib/circles/types.ts` (modified)                       |
| Resolver updates                                      | `lib/circles/unified-api.ts` (modified)                 |

## What Phase 1 Does NOT Include

- No UI (Phase 5)
- No series posts (Phase 2)
- No event drop flow (Phase 3)
- No early access ticket gating (Phase 3)
- No history auto-population (Phase 3)
- No host workspace tabs (Phase 4)
- No notifications (Phase 6)
- No weather API (Phase 6)
- No Google Maps embeds (Phase 6)

These all depend on Phase 1's tables and types being in place.
