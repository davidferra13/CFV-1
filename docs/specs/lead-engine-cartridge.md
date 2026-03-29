# Spec: Lead Engine Cartridge + ChefFlow Connector

> **Status:** built (Workstream B only, ChefFlow side)
> **Priority:** P1 (next up)
> **Depends on:** openclaw-cartridge-infrastructure (verified)
> **Estimated complexity:** large (9+ files across Pi + ChefFlow)
> **Created:** 2026-03-29
> **Built by:** Claude Code (2026-03-29)
> **Spec error found:** Spec claimed `prospects.source` has no CHECK constraint. It does: `CHECK (source IN ('ai_scrub', 'web_enriched', 'manual'))`. Migration `20260401000118` adds `openclaw_import` and `csv_import`.
> **Note:** Workstream A (Pi scrapers) not built; requires physical Pi deployment. Workstream B (ChefFlow connector) complete.

---

## What This Does (Plain English)

The OpenClaw lead-engine cartridge scrapes catering-adjacent **businesses** (caterers, personal chefs, event venues, wedding venues, food trucks) from public directories (Yelp, Google Maps, local business registries) on the Pi. These are supply-side intelligence: businesses the chef might partner with, compete against, or prospect for venue referrals. The Pi stores them in SQLite, exposes them via a local API. ChefFlow's sync handler pulls from that API (triggered nightly by the Pi), upserts into `openclaw_leads`, and the admin can browse and import selected leads into their `prospects` pipeline.

**Architectural principle:** OpenClaw does ALL scraping. ChefFlow is the beautiful frontend. No redundant lead generation on ChefFlow.

---

## Why It Matters

The prospecting module (8 pages, pipeline, scoring, dedup, call queue) is fully built but data-starved. Today prospects only come from manual entry, CSV import, or AI scrub (LLM-generated guesses). OpenClaw will feed it real, verified business data from actual public directories, which is night and day better than AI fabrication.

---

## Architecture: Pull Model (Matching Price-Intel Pattern)

The sync system uses a **pull model**, proven by price-intel:

```
1. Pi cron fires sync-to-chefflow.mjs
2. sync-to-chefflow.mjs POSTs to ChefFlow: /api/cron/openclaw-sync?cartridge=lead-engine
   (this is a TRIGGER with no data payload, just authentication)
3. ChefFlow's lead-engine sync handler PULLS from Pi API: http://10.0.0.177:8083/api/leads/unsynced
4. Handler upserts pulled data into openclaw_leads table
5. Handler tells Pi to mark those leads as synced: POST http://10.0.0.177:8083/api/leads/mark-synced
```

This matches exactly how price-intel works:

- `sync-receiver.ts:70` calls `cartridge.syncHandler(null)` (no data passed)
- `sync.ts:281-320`: price-intel handler fetches from Pi API (`fetchEnriched(batch)`)

The Pi script is a **trigger**, not a data push. ChefFlow does the pulling.

---

## Two Workstreams

### Workstream A: Pi-Side (Lead Engine Cartridge)

Build the lead-engine cartridge from the `_template/` scaffold. Initial scrapers target catering **businesses** in the developer's region.

### Workstream B: ChefFlow-Side (OpenClaw-to-Prospecting Connector)

Connect `openclaw_leads` table to the existing prospecting module. Let the admin browse OpenClaw leads and import selected ones into their `prospects` pipeline.

---

## Why Businesses, Not "People Seeking Caterers"

The original draft targeted demand-side scrapers (Thumbtack requests, Craigslist "looking for a caterer" posts). This was wrong for three reasons:

1. **Schema mismatch**: `openclaw_leads` was designed for business entities (amenity, cuisine, opening_hours, outdoor_seating columns from `20260401000083_openclaw_leads.sql:10-29`). Catering requests don't have business attributes.

2. **Category mismatch**: `ProspectCategory` in `constants.ts:7-29` lists organization types (yacht_club, country_club, wedding_planner, etc.). A Craigslist post "need caterer for wedding" maps to none of them.

3. **Scoring mismatch**: `computeLeadScore` in `lead-scoring.ts:6-24` expects `avgEventBudget`, `annualEventsEstimate`, `luxuryIndicators`, `membershipSize`. Individual requests have none of these. Every imported lead would score near-zero.

**Business-type scraping fits perfectly:** a Yelp catering company has a name, address, phone, email, website, categories, ratings. These map cleanly to `openclaw_leads` columns and score well in the existing formula.

**Demand-side scraping (Thumbtack, Craigslist requests) is a future spec** that would need its own table (`openclaw_lead_requests`) and a different UI (an "Incoming Opportunities" feed, not the prospecting pipeline).

---

## Workstream A: Pi-Side Files

### Files to Create (on Pi, scaffolded from `F:\OpenClaw-Vault\_template\`)

| File                                                   | Purpose                                                                         |
| ------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `profiles/lead-engine/lib/db.mjs`                      | Extends shared db.mjs with `businesses` table schema                            |
| `profiles/lead-engine/scrapers/yelp.mjs`               | Scrapes Yelp search results for caterers, personal chefs, event venues          |
| `profiles/lead-engine/scrapers/google-maps.mjs`        | Scrapes Google Maps business listings via Places API (free tier) or web         |
| `profiles/lead-engine/scrapers/secretary-of-state.mjs` | Scrapes MA/NH/ME business registries for food service licenses                  |
| `profiles/lead-engine/services/sync-api.mjs`           | HTTP API: `/api/leads/unsynced`, `/api/leads/mark-synced`, `/api/stats`         |
| `profiles/lead-engine/services/sync-to-chefflow.mjs`   | Nightly trigger: POSTs to ChefFlow's unified cron endpoint (no data, just auth) |
| `profiles/lead-engine/cron/scrape-businesses.mjs`      | Cron job runner: cycles through all scrapers                                    |
| `profiles/lead-engine/package.json`                    | Dependencies: shared lib + puppeteer-core                                       |
| `profiles/lead-engine/README.md`                       | Setup and scraper docs                                                          |

### Pi Database Schema (SQLite)

```sql
-- Extends shared base tables (source_registry, sync_log)

CREATE TABLE IF NOT EXISTS businesses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,              -- 'yelp', 'google_maps', 'sos_ma', 'sos_nh'
  source_id TEXT NOT NULL,           -- unique ID from source (yelp biz ID, place_id, etc.)
  source_url TEXT,                   -- link back to original listing

  -- Business identity
  name TEXT NOT NULL,
  business_type TEXT,                -- 'caterer', 'personal_chef', 'event_venue', 'wedding_venue', 'food_truck'
  description TEXT,                  -- Yelp "about" or Google description
  categories TEXT,                   -- JSON array: ['catering', 'personal_chef', 'meal_prep']

  -- Location
  city TEXT,
  state TEXT,
  zip TEXT,
  street TEXT,
  lat REAL,
  lon REAL,

  -- Contact
  phone TEXT,
  email TEXT,
  website TEXT,
  owner_name TEXT,

  -- Enrichment
  rating REAL,                       -- Yelp/Google rating (1.0-5.0)
  review_count INTEGER,
  price_range TEXT,                  -- '$', '$$', '$$$', '$$$$'
  cuisine_types TEXT,                -- JSON array: ['italian', 'french', 'american']
  serves_vegan INTEGER DEFAULT 0,
  serves_vegetarian INTEGER DEFAULT 0,
  serves_gluten_free INTEGER DEFAULT 0,

  -- Scoring (Pi-side, before push)
  lead_score INTEGER DEFAULT 0,      -- 0-100
  chef_relevance TEXT,               -- 'high', 'medium', 'low'

  -- Sync tracking
  scraped_at TEXT DEFAULT (datetime('now')),
  synced_at TEXT,                     -- NULL until synced to ChefFlow

  UNIQUE(source, source_id)
);

CREATE INDEX idx_biz_source ON businesses(source);
CREATE INDEX idx_biz_state ON businesses(state);
CREATE INDEX idx_biz_score ON businesses(lead_score DESC);
CREATE INDEX idx_biz_synced ON businesses(synced_at);  -- fast lookup for unsynced
CREATE INDEX idx_biz_type ON businesses(business_type);
```

### Pi Scraper Details

**Yelp (`yelp.mjs`):**

- Target: Yelp search results for "catering", "personal chef", "event venue", "wedding venue" in target metros
- Method: HTTP fetch of Yelp search pages (no API key needed for public search results)
- Extract: name, address, phone, rating, review_count, price_range, categories, website link
- Rate limit: 5-8 second delays between requests (via shared `rateLimitDelay()`)
- Initial metros: Boston, Providence, Portland ME, Manchester NH, Worcester, Cape Cod
- Parse Yelp categories to derive `business_type` and `categories` fields

**Google Maps (`google-maps.mjs`):**

- Target: Google Maps search results for catering-related queries
- Method: Puppeteer (Google Maps requires JS rendering), using shared `launchBrowser()`
- Extract: name, address, phone, website, rating, review_count, place type
- Rate limit: 8-12 second delays (Google is stricter)
- Dedup against Yelp results by fuzzy name + city match before insert

**Secretary of State (`secretary-of-state.mjs`):**

- Target: MA Secretary of State business filings, NH business lookup
- Method: HTTP fetch (public search forms)
- Extract: registered business name, owner/agent name, filing date, status (active/inactive)
- Enriches existing records with owner_name and verifies business is active
- Rate limit: 3-6 seconds

### Pi Local Scoring (before push)

Deterministic 0-100 score based on available structured data:

| Factor                                        | Points   |
| --------------------------------------------- | -------- |
| Has phone number                              | +15      |
| Has email                                     | +15      |
| Has website                                   | +10      |
| Has owner/contact name                        | +10      |
| Rating >= 4.0                                 | +10      |
| Rating >= 4.5                                 | +5 bonus |
| Review count >= 10                            | +5       |
| Review count >= 50                            | +5 bonus |
| Has multiple categories (versatile business)  | +5       |
| Is in target metro area                       | +10      |
| Price range $$$ or $$$$ (premium positioning) | +10      |

**Chef relevance** (separate from score):

- `high`: business_type is 'caterer' or 'personal_chef' (direct competitors or referral partners)
- `medium`: business_type is 'event_venue' or 'wedding_venue' (venue partnerships)
- `low`: business_type is 'food_truck' or generic food business

### Pi Sync API Endpoints

Built using shared `createSyncServer()` from `_shared/lib/sync-api-base.mjs`, plus custom routes:

| Endpoint                 | Method | Purpose                                                           |
| ------------------------ | ------ | ----------------------------------------------------------------- |
| `/api/leads/unsynced`    | GET    | Returns businesses where `synced_at IS NULL`, max 200 per call    |
| `/api/leads/mark-synced` | POST   | Body: `{ ids: number[] }`. Sets `synced_at = now()` for given IDs |
| `/api/leads/by-source`   | GET    | Stats breakdown by source (yelp count, google count, etc.)        |
| `/health`                | GET    | Provided by shared base                                           |
| `/api/stats`             | GET    | Provided by shared base                                           |
| `/api/sync/log`          | GET    | Provided by shared base                                           |

---

## Workstream B: ChefFlow-Side Files

### Files to Create

| File                                                | Purpose                                                                    |
| --------------------------------------------------- | -------------------------------------------------------------------------- |
| `lib/openclaw/lead-engine-handler.ts`               | Sync handler: pulls from Pi API, upserts to openclaw_leads                 |
| `lib/prospecting/openclaw-import.ts`                | Server actions: browse openclaw_leads, import selected into prospects      |
| `components/prospecting/openclaw-leads-browser.tsx` | Client component: filterable table of openclaw_leads with "Import" buttons |
| `app/(chef)/prospecting/openclaw/page.tsx`          | New page: Browse and import OpenClaw leads (dedicated route, not tab)      |

### Files to Modify

| File                              | What to Change                                                                                 |
| --------------------------------- | ---------------------------------------------------------------------------------------------- |
| `lib/openclaw/sync-receiver.ts`   | Register lead-engine cartridge with its sync handler (lines 43-46, where future cartridges go) |
| `app/(chef)/prospecting/page.tsx` | Add "OpenClaw Leads" button in the action bar (line 63-95, alongside existing buttons)         |

### No Database Changes

The `openclaw_leads` table already has all needed columns:

- `source` + `source_id` unique index for dedup (`20260401000094_openclaw_source_field.sql:20-21`)
- `name`, `phone`, `email`, `website`, `city`, `state`, `lat`, `lon` for business identity
- `rating`, `review_count` for enrichment (`20260401000094:11-12`)
- `owner_name` for contact (`20260401000094:9`)
- `business_type`, `categories`, `lead_score`, `chef_relevance` for classification (`20260401000083:32-35`)
- `source_url` for linking back to original listing (`20260401000094:6`)
- `diet_vegan`, `diet_vegetarian`, `diet_gluten_free` for dietary capability (`20260401000083:28-30`)
- GIN index on `categories` for filtering (`20260401000083:48`)

The `prospects` table already has:

- `source` column (TEXT, no CHECK constraint; confirmed by grep: zero results for source.\*CHECK in migration 20260322000039)
- All fields needed for pipeline management
- Lead scoring via existing `lead-scoring.ts`

No new migration needed.

---

## Data Model

### One-Way Pull Flow

```
Pi cron (nightly)
  └─> sync-to-chefflow.mjs: POST /api/cron/openclaw-sync?cartridge=lead-engine (trigger only, no data)
        └─> ChefFlow sync-receiver.ts: calls lead-engine handler with null
              └─> lead-engine-handler.ts: fetches GET http://10.0.0.177:8083/api/leads/unsynced
                    └─> Maps Pi fields to openclaw_leads columns
                    └─> UPSERT by (source, source_id)
                    └─> POST http://10.0.0.177:8083/api/leads/mark-synced (confirms receipt)

Admin (on-demand)
  └─> Browses /prospecting/openclaw (filterable table of openclaw_leads)
        └─> Clicks "Import" on selected leads
              └─> openclaw-import.ts: fuzzy dedup check against existing prospects
              └─> Maps openclaw_leads columns to prospects columns
              └─> INSERT into prospects (chef_id scoped, source = 'openclaw_import')
```

### Key Relationships

- `openclaw_leads` is a **global pool** (not tenant-scoped). All scraped data lands here.
- `prospects` is **tenant-scoped** (`chef_id`). When an admin imports a lead, it becomes their prospect.
- One openclaw_lead can be imported by multiple chefs (no exclusive claim).
- Import uses fuzzy dedup against existing prospects (via `fuzzy-match.ts`) to prevent duplicates.

### Column Mapping: Pi SQLite -> openclaw_leads (done by sync handler)

| Pi `businesses` column | `openclaw_leads` column | Notes                                                             |
| ---------------------- | ----------------------- | ----------------------------------------------------------------- |
| source                 | source                  | Prefixed: `'lead-engine:yelp'`, `'lead-engine:google_maps'`, etc. |
| source_id              | source_id               | Direct copy                                                       |
| source_url             | source_url              | Direct copy                                                       |
| name                   | name                    | Direct copy                                                       |
| business_type          | business_type           | Direct copy                                                       |
| description            | ai_notes                | Business description text                                         |
| categories (JSON)      | categories (text[])     | Parse JSON to array                                               |
| city                   | city                    | Direct copy                                                       |
| state                  | state                   | Direct copy                                                       |
| zip                    | postcode                | Direct copy                                                       |
| street                 | street                  | Direct copy                                                       |
| lat                    | lat                     | Direct copy                                                       |
| lon                    | lon                     | Direct copy                                                       |
| phone                  | phone                   | Direct copy                                                       |
| email                  | email                   | Direct copy                                                       |
| website                | website                 | Direct copy                                                       |
| owner_name             | owner_name              | Direct copy                                                       |
| rating                 | rating                  | Direct copy                                                       |
| review_count           | review_count            | Direct copy                                                       |
| serves_vegan           | diet_vegan              | Direct copy (boolean)                                             |
| serves_vegetarian      | diet_vegetarian         | Direct copy (boolean)                                             |
| serves_gluten_free     | diet_gluten_free        | Direct copy (boolean)                                             |
| lead_score             | lead_score              | Direct copy (Pi-side score)                                       |
| chef_relevance         | chef_relevance          | Direct copy ('high'/'medium'/'low')                               |

### Column Mapping: openclaw_leads -> prospects (done by import action)

| `openclaw_leads` column | `prospects` column     | Notes                                                   |
| ----------------------- | ---------------------- | ------------------------------------------------------- |
| name                    | name                   | Direct copy                                             |
| phone                   | phone                  | Direct copy                                             |
| email                   | email                  | Direct copy                                             |
| website                 | website                | Direct copy                                             |
| city                    | city                   | Direct copy                                             |
| state                   | state                  | Direct copy                                             |
| street + postcode       | address                | Combined into address string                            |
| lat, lon                | latitude, longitude    | Direct copy                                             |
| business_type           | category               | Mapped via `BUSINESS_TYPE_TO_CATEGORY` (see below)      |
| ai_notes                | description            | Direct copy                                             |
| owner_name              | contact_person         | Direct copy                                             |
| source                  | (tracked)              | Prospect gets `source = 'openclaw_import'`              |
| categories              | tags                   | Copied as prospect tags                                 |
| lead_score              | lead_score             | **Use Pi-side score directly** (see scoring section)    |
| rating, review_count    | description (appended) | "Yelp: 4.5 stars (127 reviews)" appended to description |
| diet flags              | description (appended) | "Serves: vegan, gluten-free" if any are true            |
| source_url              | notes                  | "Source: [url]" saved to notes for reference            |

### Business Type to ProspectCategory Mapping

```typescript
// In lib/prospecting/openclaw-import.ts
const BUSINESS_TYPE_TO_CATEGORY: Record<string, ProspectCategory> = {
  caterer: 'business_owner',
  personal_chef: 'business_owner',
  event_venue: 'event_coordinator',
  wedding_venue: 'wedding_planner',
  food_truck: 'business_owner',
  restaurant: 'business_owner',
  bakery: 'business_owner',
  meal_prep: 'business_owner',
}
// Fallback: anything not in this map -> 'other'
```

This mapping uses existing categories from `constants.ts:7-29`. It's not perfect (a wedding venue isn't a wedding planner), but it's the closest fit without adding new categories. The `tags` field carries the original `categories` array for precise filtering.

---

## Lead Scoring Strategy

**Do NOT re-score with `computeLeadScore()` on import.** The existing scoring formula (`lead-scoring.ts:6-24`) was designed for outbound prospecting targets (venues, clubs, wealthy individuals) and expects fields like `avgEventBudget`, `annualEventsEstimate`, `luxuryIndicators`, `membershipSize`. OpenClaw business leads have none of these fields, so the score would always be near-zero.

Instead:

1. **Use the Pi-side score as-is** when importing. The Pi's scoring formula (see "Pi Local Scoring" section) is tailored to the data available from scrapers (contact quality, ratings, reviews, location match).
2. **Store Pi score** in `prospects.lead_score` on import.
3. **Allow manual re-scoring later** if the admin enriches the prospect with budget/event data via the dossier page (this uses the existing enrichment actions, which do call `computeLeadScore`).

This means the lead_score for OpenClaw imports uses a different formula than AI-scrubbed prospects. This is fine because:

- The number still means "0 = low quality, 100 = high quality"
- The inputs available are different, so the formula must be different
- Mixing scoring formulas is better than giving everything a 5/100

---

## Server Actions

### New: `lib/openclaw/lead-engine-handler.ts`

Not a server action file (`'use server'` not needed). This is the sync handler registered in the cartridge registry.

```typescript
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import type { CartridgeSyncResult } from './cartridge-registry'

const OPENCLAW_LEAD_ENGINE_API =
  process.env.OPENCLAW_LEAD_ENGINE_API_URL || 'http://10.0.0.177:8083'

/**
 * Sync handler for lead-engine cartridge.
 * Called by syncCartridgeInternal('lead-engine') with data=null.
 * Pulls unsynced leads from Pi API, upserts to openclaw_leads.
 */
export async function handleLeadEngineSync(_data: unknown): Promise<CartridgeSyncResult> {
  // Step 1: Pull unsynced leads from Pi
  const response = await fetch(`${OPENCLAW_LEAD_ENGINE_API}/api/leads/unsynced`, {
    signal: AbortSignal.timeout(30000),
    cache: 'no-store',
  })
  if (!response.ok) {
    /* return error result */
  }
  const leads = await response.json()

  // Step 2: Upsert each lead into openclaw_leads by (source, source_id)
  // Step 3: revalidateTag('openclaw-lead-count') to bust the cached count
  // Step 4: POST back to Pi to mark synced IDs (non-blocking, try/catch, no retry)

  return { success, cartridge: 'lead-engine', matched, updated, skipped, errors }
}
```

Key implementation notes:

- Follows same pattern as `sync.ts:281-320` (`syncCore`) for price-intel
- Uses Drizzle `db` directly (not compat shim) since this isn't a server action file
- Upserts using `ON CONFLICT (source, source_id) WHERE source_id IS NOT NULL DO UPDATE`
- After upsert, calls `revalidateTag('openclaw-lead-count')` to bust the cached count on the main prospecting page (import from `next/cache`)
- Marks synced IDs on Pi after successful upsert (non-blocking, wrapped in try/catch). If mark-synced fails, log a warning and return success anyway. This is safe because upserts are idempotent: the Pi will re-send those leads next run and they'll match the existing rows with no data corruption. Do NOT add retry logic for mark-synced.
- `OPENCLAW_LEAD_ENGINE_API_URL` env var follows same pattern as `OPENCLAW_API_URL` in sync.ts:24

### New: `lib/prospecting/openclaw-import.ts`

`'use server'` file. All actions use `requireAdmin()` + `requireChef()` for tenant scoping.

| Action                               | Auth             | Input                                                                       | Output                                                              | Side Effects                                                                                                               |
| ------------------------------------ | ---------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `getOpenClawLeads(filters)`          | `requireAdmin()` | `{ state?, city?, source?, minScore?, minRating?, search?, page?, limit? }` | `{ leads: OpenClawLead[], total: number }`                          | None (read-only)                                                                                                           |
| `getOpenClawLeadCount()`             | `requireAdmin()` | none                                                                        | `number`                                                            | None. **Cached with `unstable_cache`**, tag `'openclaw-lead-count'`, revalidated by lead-engine sync handler after upsert. |
| `importOpenClawLead(openclawLeadId)` | `requireAdmin()` | `number`                                                                    | `{ success, prospectId?, error?, duplicate?, existingProspectId? }` | Creates prospect, revalidates `/prospecting`                                                                               |
| `bulkImportOpenClawLeads(ids)`       | `requireAdmin()` | `number[]`                                                                  | `{ imported, skipped, duplicates: string[], errors: string[] }`     | Creates prospects, revalidates `/prospecting`                                                                              |

**Import logic (per lead):**

1. Fetch the openclaw_lead by ID (raw SQL query, not tenant-scoped since openclaw_leads is global)
2. Fetch all existing prospect names + cities for this chef (`chef_id` scoped)
3. Run fuzzy dedup: `isSimilarName(lead.name, existingName)` AND same state (using `normalizeCity` for city comparison)
4. If duplicate found: return `{ duplicate: true, existingProspectId }` (let admin decide)
5. Map columns per the mapping table above, including `BUSINESS_TYPE_TO_CATEGORY`
6. Set `lead_score` = Pi-side score (from `openclaw_leads.lead_score`), NOT re-computed
7. Insert into prospects with `source = 'openclaw_import'`, `status = 'new'`, `pipeline_stage = 'new'`, `chef_id = user.tenantId!`
8. `revalidatePath('/prospecting')` + `revalidatePath('/prospecting/openclaw')`

---

## UI / Component Spec

### New Page: `/prospecting/openclaw` (`app/(chef)/prospecting/openclaw/page.tsx`)

A dedicated page (not a tab on the import page). Follows the existing page pattern:

- `requireAdmin()` + `requireChef()` at top
- Server component that fetches initial data
- Renders the client browser component

**Why a dedicated route instead of a tab on `/prospecting/import`:**

- The import page (`import/page.tsx:1-36`) is a simple server component rendering `<CSVImportForm />`. Adding tabs would require refactoring it to a client component with state.
- A separate route is cleaner and consistent with how other prospecting sub-features work (scrub, pipeline, queue, clusters each have their own route).

### OpenClaw Leads Browser (`components/prospecting/openclaw-leads-browser.tsx`)

A filterable, paginated table of leads from `openclaw_leads`.

**Layout:**

- Back link to /prospecting (matching existing pattern from `import/page.tsx:20-26`)
- Title: "OpenClaw Leads" with subtitle: "Businesses scraped by OpenClaw. Import the best into your prospect pipeline."
- Filter bar: state dropdown, city text input, source dropdown (yelp/google_maps/etc.), min score slider, min rating dropdown (3+, 4+, 4.5+), text search
- Table columns: Name, City/State, Type, Source, Score, Rating, Phone, Email/Website, Actions
- Each row "Import" button (primary), or "Imported" badge (muted, if fuzzy match detects already in prospects)
- Checkbox column for bulk select + "Import Selected (N)" button in header
- Pagination: 25 per page, page number display, prev/next buttons

**States:**

- **Loading:** Skeleton table rows (6 rows, matching column widths)
- **Empty:** "No OpenClaw leads found. Leads appear after the lead-engine cartridge runs its first scrape on the Pi." with link to docs
- **Error:** "Could not load OpenClaw leads" with retry button (never show zeros as if no data exists)
- **Populated:** Table with filter/sort/pagination
- **After import:** Toast: "Imported [name] as a new prospect" with link to the new prospect's dossier

**Interactions:**

- Import button: calls `importOpenClawLead(id)`. On duplicate response, shows modal: "Possible duplicate: [existing name]. Import anyway?" with View Existing and Import Anyway buttons
- Bulk import: calls `bulkImportOpenClawLeads(ids)`. Shows progress ("Importing 3 of 12..."). On completion, toast summary: "Imported 10, skipped 2 duplicates"
- Filter changes: client-side state, re-fetches via server action (not URL params, to keep it snappy)

### Prospecting Main Page Changes

Add to the action button bar (`page.tsx:63-95`), after the "Import CSV" button:

```tsx
<Link href="/prospecting/openclaw">
  <Button variant="secondary" className="flex items-center gap-2">
    <Database className="h-4 w-4" /> {/* or Globe icon */}
    OpenClaw Leads
  </Button>
</Link>
```

Add to the stat cards section (`page.tsx:99-120`), as a 5th card (shown only when count > 0):

```tsx
{
  openclawCount > 0 && (
    <Link href="/prospecting/openclaw">
      <StatCard
        label="OpenClaw Leads"
        value={openclawCount}
        icon={<Database className="h-5 w-5 text-emerald-400" />}
      />
    </Link>
  )
}
```

This requires calling `getOpenClawLeadCount()` in the page's data fetch (add to the `Promise.all` on line 43).

**Cache implementation for `getOpenClawLeadCount()`:**

```typescript
// In lib/prospecting/openclaw-import.ts
import { unstable_cache } from 'next/cache'

const getCachedOpenClawLeadCount = unstable_cache(
  async () => {
    const db: any = createServerClient()
    const { data } = await db.from('openclaw_leads').select('id', { count: 'exact', head: true })
    return data?.length ?? 0 // or use raw SQL: SELECT count(*) FROM openclaw_leads
  },
  ['openclaw-lead-count'],
  { tags: ['openclaw-lead-count'], revalidate: 3600 } // 1hr fallback, busted on sync
)

export async function getOpenClawLeadCount(): Promise<number> {
  await requireAdmin()
  return getCachedOpenClawLeadCount()
}
```

This prevents a `count(*)` on every prospecting page load. The cache is busted by the lead-engine sync handler via `revalidateTag('openclaw-lead-count')` after each sync run.

---

## Edge Cases and Error Handling

| Scenario                                                   | Correct Behavior                                                                                                                                   |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pi unreachable during sync                                 | Handler returns `{ success: false, error: 'Pi API unreachable' }`. Cron route returns 500. Next nightly run retries.                               |
| Pi returns empty array (no new leads)                      | Handler returns `{ success: true, matched: 0, updated: 0 }`. Normal, not an error.                                                                 |
| Duplicate lead from Pi (same source + source_id)           | UPSERT: update existing row in openclaw_leads, increment `matched` count                                                                           |
| Cross-source duplicate (same business on Yelp AND Google)  | Two separate openclaw_leads rows (different source+source_id). Admin sees both, can import either. Fuzzy dedup catches if they try to import both. |
| Admin imports lead that fuzzy-matches existing prospect    | Return `{ duplicate: true, existingProspectId }`. Show modal with choice: view existing or import anyway.                                          |
| openclaw_leads table is empty (no scrapes yet)             | Show empty state with explanation, not zeros                                                                                                       |
| Pi sync partially fails (some upserts succeed, some don't) | Return partial success with accurate counts. Mark only successfully synced IDs on Pi.                                                              |
| Lead has no contact info (phone, email, website all null)  | Still importable. Lead score from Pi reflects low contact quality.                                                                                 |
| Bulk import of 50+ leads                                   | Process sequentially server-side. Client shows progress. No timeout (server actions can run long).                                                 |
| `business_type` not in mapping table                       | Map to `'other'`. Store original business_type in prospect description.                                                                            |
| mark-synced call to Pi fails after upsert                  | Log warning, don't fail the sync. Pi will re-send those leads next run (upsert handles dedup).                                                     |

---

## Verification Steps

### Workstream A (Pi-side, manual verification):

1. Scaffold lead-engine from template: `bash swap.sh new lead-engine`
2. Verify directory structure matches template + custom files
3. Copy scraper files into the scaffold
4. Run each scraper individually against live sites, verify SQLite has records
5. Start sync-api, verify `/api/leads/unsynced` returns data
6. Run sync-to-chefflow.mjs against local dev server, verify openclaw_leads gets rows

### Workstream B (ChefFlow-side):

1. Sign in with agent account
2. Seed `openclaw_leads` with realistic test data via SQL insert (5-10 rows with source='lead-engine:yelp', varied cities/states/scores)
3. Navigate to `/prospecting`
4. Verify "OpenClaw Leads" button appears in action bar
5. Verify OpenClaw stat card shows count (if seeded data exists)
6. Click "OpenClaw Leads", verify `/prospecting/openclaw` page loads
7. Verify filter bar works: filter by state, by source, by min score
8. Click "Import" on a lead, verify it appears in prospects list at `/prospecting`
9. Verify the imported prospect has: correct name, city, state, category, lead_score, source='openclaw_import'
10. Navigate back to `/prospecting/openclaw`, verify the imported lead shows "Imported" badge
11. Try importing the same lead again, verify duplicate detection modal appears
12. Bulk select 3 leads, click "Import Selected", verify all appear in prospects
13. Screenshot the OpenClaw leads page and the prospecting page showing imported leads

---

## Out of Scope

- **Demand-side scrapers** (Thumbtack requests, Craigslist "looking for caterer" posts) - needs its own table `openclaw_lead_requests` and a separate "Incoming Opportunities" UI. Separate spec.
- **Other lead-engine scrapers** (Venue Kitchen Intel DB #3, Event Demand DB #10, Restaurant Closures DB #13, etc.) - separate specs per scraper
- **Automated import** (auto-importing all high-score leads without admin action) - future spec
- **Removing existing AI scrub** - it stays as a secondary option; OpenClaw is the primary pipeline
- **market-intel, trend-watch cartridges** - separate specs
- **Real-time sync** (SSE push when new leads arrive) - future enhancement
- **Adding new ProspectCategory values** - use existing categories with mapping table. If the mapping proves insufficient, that's a separate UI enhancement.
- **Changes to lead-scoring.ts** - Pi-side score is used for imports. The existing formula stays for AI-scrubbed prospects.

---

## Notes for Builder Agent

1. **Pull model, not push.** The sync handler receives `null` as data (see `sync-receiver.ts:70`). It must fetch from the Pi API itself. Follow the exact pattern in `sync.ts:281-320` where `syncCore` calls `fetchEnriched()`.

2. **Pi-side work is NOT testable via Playwright.** Builder should focus on file creation and verify syntax/logic. The developer will deploy to the Pi.

3. **ChefFlow-side work IS testable.** Seed `openclaw_leads` with test rows via SQL insert, then test the full import flow via Playwright.

4. **Seed data SQL for testing** (builder should use this in verification):

```sql
INSERT INTO openclaw_leads (name, phone, email, website, city, state, postcode, lat, lon, source, source_id, source_url, business_type, categories, lead_score, chef_relevance, rating, review_count, owner_name, ai_notes, diet_vegan, diet_vegetarian)
VALUES
('North Shore Catering Co.', '978-555-0101', 'info@northshorecatering.com', 'https://northshorecatering.com', 'Beverly', 'MA', '01915', 42.558, -70.880, 'lead-engine:yelp', 'yelp-nsc-001', 'https://yelp.com/biz/north-shore-catering', 'caterer', '{catering,event_planning}', 78, 'high', 4.5, 89, 'Sarah Mitchell', 'Full-service catering for weddings and corporate events in the North Shore area.', false, true),
('Harbor View Event Center', '978-555-0202', NULL, 'https://harborviewevents.com', 'Newburyport', 'MA', '01950', 42.812, -70.877, 'lead-engine:google_maps', 'gm-hvec-001', 'https://maps.google.com/place/harbor-view', 'event_venue', '{event_venue,wedding_venue}', 65, 'medium', 4.2, 43, NULL, 'Waterfront event space with in-house kitchen. Capacity 200.', false, false),
('Chef Maria Personal Chef Services', '603-555-0303', 'maria@chefmaria.com', 'https://chefmaria.com', 'Portsmouth', 'NH', '03801', 43.071, -70.762, 'lead-engine:yelp', 'yelp-cmpc-001', 'https://yelp.com/biz/chef-maria', 'personal_chef', '{personal_chef,meal_prep,private_dining}', 82, 'high', 4.8, 127, 'Maria Santos', 'Private chef specializing in Mediterranean and farm-to-table cuisine.', true, true),
('Portland Food Truck Co', '207-555-0404', NULL, NULL, 'Portland', 'ME', '04101', 43.661, -70.255, 'lead-engine:google_maps', 'gm-pftc-001', NULL, 'food_truck', '{food_truck,catering}', 35, 'low', 3.8, 22, NULL, 'Mobile food service, tacos and BBQ.', false, false),
('Essex County Wedding Barn', '978-555-0505', 'events@essexbarn.com', 'https://essexbarn.com', 'Ipswich', 'MA', '01938', 42.679, -70.841, 'lead-engine:yelp', 'yelp-ecwb-001', 'https://yelp.com/biz/essex-barn', 'wedding_venue', '{wedding_venue,event_venue,barn_venue}', 71, 'medium', 4.6, 95, 'Tom & Linda Ward', 'Rustic barn venue on 40 acres. Requires outside catering. Preferred vendor list available.', false, false);
```

5. **Fuzzy dedup is already built.** Use `isSimilarName` and `normalizeCity` from `lib/prospecting/fuzzy-match.ts`. Don't reinvent.

6. **Do NOT call `computeLeadScore()` on import.** Use the `lead_score` from `openclaw_leads` as-is. The Pi scoring formula matches the data available. The ChefFlow formula expects different inputs.

7. **The cartridge registry pattern is already built.** Register lead-engine the same way price-intel is registered in `lib/openclaw/sync-receiver.ts:22-41`. Add after the "Future cartridges register here" comment on line 43.

8. **Admin-only.** All prospecting is admin-only (per CLAUDE.md rule 0c). Every new server action must use `requireAdmin()`.

9. **Source field convention.** Use compound source values in openclaw_leads: `'lead-engine:yelp'`, `'lead-engine:google_maps'`, `'lead-engine:sos_ma'`. This lets ChefFlow filter by both cartridge and original source.

10. **No client data flows back.** This is a one-way pipeline. OpenClaw never receives data from ChefFlow.

11. **Build order:** Workstream B first (ChefFlow connector), then Workstream A (Pi scrapers). The connector can be tested with seeded data immediately. Pi scrapers need physical deployment.

12. **Env var for Pi API.** Add `OPENCLAW_LEAD_ENGINE_API_URL` to `.env.local`. Default: `http://10.0.0.177:8083`. Follow the pattern from `sync.ts:24` (`OPENCLAW_API_URL`).

13. **New page route.** Create `app/(chef)/prospecting/openclaw/page.tsx` as a new server component page. Follow the pattern from `app/(chef)/prospecting/import/page.tsx` for structure (requireAdmin, requireChef, back link, title, render client component).
