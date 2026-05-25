# Spec: Client Intelligence Capture

> **Status:** draft
> **Priority:** P1
> **Depends on:** none (all referenced tables exist)
> **Estimated complexity:** medium (8-12 files)
> **Created:** 2026-05-25
> **Source:** Exit-points analysis (exits 14-18), Category 3: Client Research & Relationship

---

## What This Does (Plain English)

Chefs leave ChefFlow to research clients on social media, look up companies, check venues on Google Maps, and read about dietary conditions. That research happens externally and always will. This spec makes ChefFlow the place where findings land. Structured fields capture household context, lifestyle, and logistics. A pre-event checklist surfaces what the chef still does not know about a new client. Image/link pinning attaches reference material to events. And client history intelligence auto-surfaces patterns from past events so the chef builds on what they already know instead of starting from scratch.

---

## Why It Matters

Every new client triggers 30-60 minutes of external research across 4-6 platforms. The findings live in the chef's head or scattered notes. When event #3 rolls around, the chef repeats the same research. Worse, critical intel (a child's severe allergy discovered on Instagram, a kitchen with no oven found on Zillow) gets lost between events. This spec creates a single, structured home for client intelligence that compounds over time.

---

## What Already Exists (Do Not Duplicate)

The following systems are already built. This spec layers on top of them; it does not replace or duplicate any of them.

| System                              | What It Covers                                                                                                                                                                                                                                                                                               | Where It Lives                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| Client profile fields               | `instagram_handle`, `social_media_links` (JSONB), `company_name`, `occupation`, `pets` (JSONB), `preferred_contact_method`, `referral_source`, `typical_guest_count`, `gate_code`, `wifi_password`, `security_notes`, `nearest_grocery_store`, `formality_level`, `communication_style_notes`, `wow_factors` | `clients` table, `lib/clients/actions.ts`                        |
| Client passport                     | `communication_mode`, `preferred_contact_method`, `chef_autonomy_level`, `delegate_contact`, `standing_instructions`, `default_locations`                                                                                                                                                                    | `client_passports` table, `lib/passport/`                        |
| Kitchen assessments                 | Per-client equipment checklist, space assessment, constraints, photos, bring-list                                                                                                                                                                                                                            | `kitchen_assessments` table                                      |
| Household members                   | Per-person dietary/allergy records, relationships, age groups                                                                                                                                                                                                                                                | `hub_household_members` table, `lib/hub/household-actions.ts`    |
| Client notes                        | Free-text chef notes with category (general, dietary, preference, logistics, relationship), pinning, confidential flag                                                                                                                                                                                       | `client_notes` table                                             |
| Client photos                       | Site documentation (kitchen, dining, outdoor, parking, house, portrait)                                                                                                                                                                                                                                      | `client_photos` table + `client-photos` storage bucket           |
| Household Operating Memory contract | Typed contract for facts, visibility, authority maps, event reuse                                                                                                                                                                                                                                            | `lib/intelligence/client-household-operating-memory-contract.ts` |
| Venue recon                         | Venue profiles with parking notes, service entrance, access                                                                                                                                                                                                                                                  | `venue_profiles`, `lib/venues/recon-actions.ts`                  |
| Event vibe/atmosphere               | `vibe_atmosphere` column on events                                                                                                                                                                                                                                                                           | `events` table                                                   |
| Special dates                       | Birthday, anniversary, recurring occasions                                                                                                                                                                                                                                                                   | `client_special_dates` table                                     |

---

## Scope: Four Deliverables

### 1. Client Intel Fields (New Columns on `clients`)

Fields that do not exist anywhere in the current schema. Each captures intel a chef would bring back from external research.

| Field                | Type      | Purpose                                                                                                   | Exit Addressed |
| -------------------- | --------- | --------------------------------------------------------------------------------------------------------- | -------------- |
| `household_size`     | `INTEGER` | Total people living in home (affects portion planning)                                                    | 14             |
| `children_ages`      | `TEXT`    | Free text: "8, 12, 3" or "toddler and teen" (affects menu kid-friendliness)                               | 14             |
| `lifestyle_tags`     | `TEXT[]`  | Array: `health_conscious`, `foodie`, `entertainer`, `fitness`, `vegan_household`, `kosher`, `halal`, etc. | 14             |
| `lifestyle_notes`    | `TEXT`    | Free text: "Runs marathons, very calorie-aware. Hosts wine club monthly."                                 | 14             |
| `company_role`       | `TEXT`    | Job title/role at `company_name` (already exists). "VP of Marketing"                                      | 16             |
| `company_industry`   | `TEXT`    | "Tech", "Finance", "Law", "Healthcare" for corporate event context                                        | 16             |
| `company_notes`      | `TEXT`    | "Conservative culture, no alcohol at events. ~200 employees."                                             | 16             |
| `kitchen_quality`    | `TEXT`    | Quick-summary enum: `basic`, `decent`, `well_equipped`, `professional`                                    | 18             |
| `neighborhood_notes` | `TEXT`    | "Gated community, guard booth. Street parking only. Narrow driveway."                                     | 18             |
| `map_link`           | `TEXT`    | Google Maps or Street View URL for quick access                                                           | 18             |

**Not adding:** `preferred_communication_channel` (already exists as `preferred_contact_method`), `referral_source` (already exists), `social_media_links` (already exists), `pets` (already exists).

### 2. Pre-Event Intel Checklist

A computed checklist surfaced on the client detail page and on event detail for new/early-stage clients. Not a form. Not persisted. Generated at render time from missing fields.

**Checklist items and their source fields:**

| Item                           | Considered "done" when...                                                                    |
| ------------------------------ | -------------------------------------------------------------------------------------------- |
| Dietary restrictions confirmed | Client has `dietary_restrictions` OR household members have dietary data                     |
| Allergies documented           | Client has `allergies` OR household members have allergy data                                |
| Kitchen assessed               | `kitchen_assessments` row exists for this client, OR `kitchen_quality` is set                |
| Guest count confirmed          | `typical_guest_count` is set, OR current event has `guest_count`                             |
| Household size known           | `household_size` is set                                                                      |
| Children accounted for         | `children_ages` is set, OR no children (household_size = 1-2 and no child household members) |
| Theme/vibe discussed           | Current event has `vibe_atmosphere` set                                                      |
| Budget range established       | `budget_range_min_cents` or `budget_range_max_cents` is set, OR current event has a budget   |
| Contact preference set         | `preferred_contact_method` is not null                                                       |
| Social links captured          | `instagram_handle` or `social_media_links` has entries                                       |
| Parking/access noted           | `neighborhood_notes` is set, OR venue recon has `parking_notes`                              |
| Referral source recorded       | `referral_source` is not null                                                                |

**Display rules:**

- Only shows items that are NOT done (completed items vanish).
- Appears as a subtle card, not a blocking gate. Label: "Intel gaps for [Client Name]".
- When all items are done, the card disappears entirely.
- On event detail: only shows event-relevant items (dietary, kitchen, guest count, vibe, budget).
- On client detail: shows all items.

### 3. Event Reference Pinning

Attach URLs and images to events for context: a client's Pinterest board, venue photos from Google, inspiration images, corporate brand guidelines.

**New table: `event_references`**

```sql
CREATE TABLE IF NOT EXISTS event_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  ref_type TEXT NOT NULL CHECK (ref_type IN ('url', 'image', 'file')),
  url TEXT,
  storage_path TEXT,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general'
    CHECK (category IN (
      'inspiration', 'venue', 'theme', 'brand_guidelines',
      'client_reference', 'menu_reference', 'general'
    )),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_references_event
  ON event_references(event_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_event_references_tenant
  ON event_references(tenant_id, created_at DESC);
```

**UI:** A collapsible "References" section on event detail. "+ Add reference" button opens a form with: title, URL or file upload, category dropdown, optional description. References display as a compact list with favicons for URLs and thumbnails for images. Click opens in new tab (URLs) or lightbox (images).

**Storage:** Images use the existing `client-photos` bucket with path `{tenant_id}/events/{event_id}/{ref_id}.{ext}`. URLs are stored as-is; no fetching, no embedding, no iframes.

### 4. Client History Intelligence

Auto-generated insights from a client's event history. Surfaces patterns so the chef does not have to remember or re-read old event notes.

**What it surfaces:**

- Guest count pattern: "Last 3 events averaged 8 guests"
- Cuisine preference: "4 of 5 events were Mediterranean"
- Frequency: "Books every 6-8 weeks"
- Dessert pattern: "Always requests extra dessert course"
- Budget trend: "Budget has increased 20% over last year"
- Seasonal preference: "3 of 4 events were outdoor/summer"
- Standing requests: "Always asks for gluten-free bread option"

**Implementation approach:**

- Deterministic first: most patterns are simple aggregates (AVG guest count, mode cuisine, event frequency). No AI needed for these.
- AI-assisted via local Ollama for natural language summaries: take the raw aggregates and produce a 2-3 sentence narrative. Falls back to bullet list if Ollama is offline (per resilience mandate).
- Computed on demand, not stored. Cached via `unstable_cache` with tag `client-history-intel-{clientId}`, invalidated on event mutations.
- Displayed as a "Client Patterns" card on client detail page, below the existing notes section.

**Data sources (read-only, no new tables):**

- `events` (guest_count, occasion, event_date, cuisine_type, budget, vibe_atmosphere, status)
- `menus` linked to client events (cuisine patterns, course patterns)
- `client_notes` with category `preference` (standing requests)
- `ledger_entries` for budget trends

**Auth:** `requireChef()`. Tenant-scoped. Client never sees this card.

---

## Files to Create

| File                                                           | Purpose                                             |
| -------------------------------------------------------------- | --------------------------------------------------- |
| `database/migrations/{next_timestamp}_client_intel_fields.sql` | New columns on `clients` + `event_references` table |
| `lib/clients/intel-checklist.ts`                               | Computed pre-event intel checklist logic            |
| `components/clients/client-intel-checklist.tsx`                | UI card for intel gaps                              |
| `lib/events/reference-actions.ts`                              | Server actions: CRUD for event references           |
| `components/events/event-references-panel.tsx`                 | UI panel for pinned references on event detail      |
| `lib/clients/history-intelligence.ts`                          | Deterministic pattern extraction from event history |
| `components/clients/client-patterns-card.tsx`                  | UI card for auto-generated client patterns          |

## Files to Modify

| File                               | What to Change                                           |
| ---------------------------------- | -------------------------------------------------------- |
| `lib/clients/actions.ts`           | Add new columns to create/update schemas and field lists |
| `app/(chef)/clients/[id]/page.tsx` | Add intel checklist card and client patterns card        |
| `app/(chef)/events/[id]/page.tsx`  | Add event-scoped intel checklist and references panel    |
| `lib/auth/route-policy.ts`         | Register any new API routes                              |

---

## Database Changes

### Columns Added to `clients`

```sql
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS household_size INTEGER,
  ADD COLUMN IF NOT EXISTS children_ages TEXT,
  ADD COLUMN IF NOT EXISTS lifestyle_tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS lifestyle_notes TEXT,
  ADD COLUMN IF NOT EXISTS company_role TEXT,
  ADD COLUMN IF NOT EXISTS company_industry TEXT,
  ADD COLUMN IF NOT EXISTS company_notes TEXT,
  ADD COLUMN IF NOT EXISTS kitchen_quality TEXT
    CHECK (kitchen_quality IS NULL OR kitchen_quality IN ('basic', 'decent', 'well_equipped', 'professional')),
  ADD COLUMN IF NOT EXISTS neighborhood_notes TEXT,
  ADD COLUMN IF NOT EXISTS map_link TEXT;

COMMENT ON COLUMN clients.household_size IS 'Total people in household. Affects portion planning.';
COMMENT ON COLUMN clients.children_ages IS 'Free text ages/descriptions. Affects kid-friendly menu choices.';
COMMENT ON COLUMN clients.lifestyle_tags IS 'Array of lifestyle tags: health_conscious, foodie, entertainer, etc.';
COMMENT ON COLUMN clients.lifestyle_notes IS 'Free text lifestyle context from social media research.';
COMMENT ON COLUMN clients.company_role IS 'Job title at company_name. For corporate event context.';
COMMENT ON COLUMN clients.company_industry IS 'Industry sector. Affects corporate event expectations.';
COMMENT ON COLUMN clients.company_notes IS 'Chef-only. Corporate culture, size, event history notes.';
COMMENT ON COLUMN clients.kitchen_quality IS 'Quick assessment: basic/decent/well_equipped/professional.';
COMMENT ON COLUMN clients.neighborhood_notes IS 'Parking, access, gated community, street notes. Chef-only.';
COMMENT ON COLUMN clients.map_link IS 'Google Maps or Street View URL for quick navigation.';
```

### New Table: `event_references`

(See SQL in section 3 above.)

### Migration Notes

- All additive. Zero risk. Every new column is nullable.
- No changes to existing columns or tables.
- `event_references` is a new table with standard tenant scoping.
- Timestamp follows the highest existing migration timestamp.

---

## Server Actions

### Client Intel Fields

No new actions. Extend existing `createClient` and `updateClient` in `lib/clients/actions.ts` to include the new columns in their Zod schemas and column lists.

### Event References

| Action                        | Auth            | Input                                                       | Output                            |
| ----------------------------- | --------------- | ----------------------------------------------------------- | --------------------------------- |
| `getEventReferences(eventId)` | `requireChef()` | `{ eventId: UUID }`                                         | `EventReference[]`                |
| `addEventReference(data)`     | `requireChef()` | `{ eventId, refType, url?, title, description?, category }` | `{ success, reference?, error? }` |
| `updateEventReference(data)`  | `requireChef()` | `{ id, title?, description?, category?, sortOrder? }`       | `{ success, error? }`             |
| `removeEventReference(id)`    | `requireChef()` | `{ id: UUID }`                                              | `{ success, error? }`             |

All actions verify `tenant_id` matches `user.tenantId` before any operation.

### Intel Checklist

No server action. Pure client-side computation from data already fetched by the client detail page and event detail page. Function signature:

```typescript
function computeIntelChecklist(
  client: ClientProfile,
  event?: EventDetail,
  kitchenAssessments?: KitchenAssessment[],
  householdMembers?: HouseholdMember[]
): IntelChecklistItem[]
```

### Client History Intelligence

| Action                        | Auth            | Input                | Output                                              |
| ----------------------------- | --------------- | -------------------- | --------------------------------------------------- |
| `getClientPatterns(clientId)` | `requireChef()` | `{ clientId: UUID }` | `{ patterns: ClientPattern[], narrative?: string }` |

Cached via `unstable_cache` with tag `client-history-intel-{clientId}`. Invalidated by event create/update/delete actions via `revalidateTag`.

---

## UI / Component Spec

### Client Detail Page Additions

**Intel Checklist Card** (top of page, before existing content):

- Only renders when there are incomplete items.
- Subtle amber-bordered card. Header: "Intel gaps for [Name]".
- Each gap is a single line with an icon and a quick-action link (e.g., "Kitchen assessed?" links to kitchen assessment form).
- Dismissible per-session (not persisted; reappears next visit if still incomplete).

**Client Patterns Card** (below client notes section):

- Header: "Client Patterns" with a sparkle icon.
- Shows 2-3 sentence AI narrative if Ollama is available.
- Falls back to bullet list of deterministic patterns if Ollama is offline.
- Shows "Not enough history" if client has fewer than 2 completed events.
- Loading state: skeleton card.
- Error state: silently hidden (patterns are a bonus, not critical).

### Event Detail Page Additions

**Event Intel Checklist** (sidebar or top card):

- Subset of the full checklist: only event-relevant items (dietary, kitchen, guest count, vibe, budget, parking).
- Same styling as client detail version.

**References Panel** (collapsible section in event detail):

- Header: "References (N)" with a pin icon.
- "+ Add reference" button.
- Add form: title (required), URL or file upload (one or the other), category dropdown, description (optional).
- List display: compact rows with category badge, title, and link/thumbnail.
- URL references show favicon + domain. Click opens new tab.
- Image references show small thumbnail. Click opens lightbox.
- Each row has edit/delete icons.
- Empty state: "No references pinned yet. Add client Pinterest boards, venue photos, or inspiration links."

### Client Edit Form Additions

New fields grouped in sections within the existing client edit form:

**"Household" section** (after existing demographics):

- Household size (number input)
- Children ages (text input, placeholder: "e.g., 8, 12, toddler")

**"Lifestyle" section** (new):

- Lifestyle tags (multi-select chips: health_conscious, foodie, entertainer, fitness, vegan_household, kosher, halal)
- Lifestyle notes (textarea)

**"Corporate" section** (after existing company_name):

- Company role (text input)
- Company industry (dropdown: Tech, Finance, Law, Healthcare, Hospitality, Education, Non-profit, Government, Other)
- Company notes (textarea)

**"Location Intel" section** (after existing address fields):

- Kitchen quality (dropdown: Basic, Decent, Well-equipped, Professional)
- Neighborhood/parking notes (textarea)
- Map link (URL input with "Open in Maps" button)

---

## Edge Cases and Error Handling

| Scenario                                                | Correct Behavior                                                                          |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Ollama offline for pattern narrative                    | Fall back to bullet list of deterministic patterns. No error shown.                       |
| Client has 0-1 events                                   | Patterns card shows "Not enough history yet"                                              |
| All intel checklist items complete                      | Checklist card disappears entirely                                                        |
| Event reference URL is invalid                          | Accept any string; chef is responsible for URL validity                                   |
| Image upload fails                                      | Toast error, retry. Do not leave orphan DB row.                                           |
| Event reference deleted                                 | Soft consideration: if image, also clean up storage. Use same pattern as `client_photos`. |
| `event_references` query fails                          | Panel shows "Could not load references" with retry                                        |
| Client has no social links                              | Checklist shows "Social links captured?" as incomplete item                               |
| Kitchen assessment exists but `kitchen_quality` is null | Checklist considers kitchen "assessed" (the detailed assessment exists)                   |

---

## Integration Points

| System                     | How This Spec Integrates                                                                                                                                                                                    |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Household Operating Memory | New fields become source inputs for the HOM contract. `lifestyle_tags`, `household_size`, `children_ages`, `kitchen_quality`, and `neighborhood_notes` are all valid `HouseholdOperationalFact` candidates. |
| Remy                       | Client patterns feed into Remy context for smarter suggestions. "This client always orders extra dessert" informs Remy's menu review.                                                                       |
| CIL                        | CIL signal sources can consume `lifestyle_tags` and `kitchen_quality` for tenant intelligence.                                                                                                              |
| Dinner Circles             | Household member data from Circles contributes to the intel checklist (dietary/allergy completeness).                                                                                                       |
| Kitchen Assessments        | `kitchen_quality` is the quick summary; `kitchen_assessments` table is the detailed version. Both satisfy the checklist.                                                                                    |
| Venue Recon                | `parking_notes` from venue recon satisfies the parking/access checklist item alongside `neighborhood_notes`.                                                                                                |
| Event Briefing             | Event references can be included in service-day briefings (theme boards, venue photos).                                                                                                                     |
| Client Passport            | `communication_mode` and delegation info from passport are not duplicated here. Passport handles the relationship protocol; this spec handles the research findings.                                        |

---

## Exit Points Closed

| Exit # | Scenario                                        | Resolution                                                                                                                                                                                                                                                                                                             | Type    |
| ------ | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 14     | Research new client on social media             | Social research stays external (permanent exit). Findings land in: `lifestyle_tags`, `lifestyle_notes`, `household_size`, `children_ages`, `social_media_links` (existing). Quick-link out via `social_media_links`. Quick-capture back via structured fields.                                                         | Bridged |
| 15     | Check client social media for event context     | Pinterest/Instagram browsing stays external (permanent exit). Findings land in: `event_references` table (pin URLs, images to events). Chef pins the client's Pinterest board or screenshots to the event.                                                                                                             | Bridged |
| 16     | Look up client's company for corporate event    | Company research stays external (permanent exit). Findings land in: `company_role`, `company_industry`, `company_notes` (new fields), plus existing `company_name`. Chef does the LinkedIn research; ChefFlow stores the corporate context.                                                                            | Bridged |
| 17     | Check dietary/allergy info from external source | Medical research stays external (permanent exit). Findings land in: existing `dietary_restrictions`, `allergies` on client and household members, plus `client_notes` with category `dietary`. The intel checklist ensures these fields get populated. Future: allergy reference library (out of scope for this spec). | Bridged |
| 18     | View client's venue/home on map                 | Google Maps/Street View stays external (permanent exit). Findings land in: `kitchen_quality`, `neighborhood_notes`, `map_link` (new fields), plus existing `gate_code`, `security_notes`, `parking_instructions`, `access_instructions`. The `map_link` field provides one-click return to the external map.           | Bridged |

**Net effect:** Zero permanent exits eliminated (all five are inherently external). All five converted from "research and forget" to "research and capture." Intel compounds across events instead of evaporating.

---

## Verification Steps

1. Create a new client with minimal info
2. Verify intel checklist appears on client detail with 8+ incomplete items
3. Fill in household_size, children_ages, lifestyle_tags, kitchen_quality, neighborhood_notes, map_link
4. Verify checklist items disappear as fields are populated
5. Navigate to an event for this client
6. Verify event-scoped checklist shows relevant subset
7. Add a URL reference to the event (paste a Pinterest URL)
8. Add an image reference to the event (upload a venue photo)
9. Verify references appear in the References panel with correct display
10. Click URL reference and verify it opens in new tab
11. Click image reference and verify lightbox
12. Delete a reference and verify removal
13. Create 3+ completed events for a client with varying guest counts and cuisines
14. Verify Client Patterns card appears with meaningful patterns
15. Stop Ollama, reload page, verify patterns degrade to bullet list (no errors)
16. Verify all new fields appear in client edit form in correct sections
17. Screenshot client detail page with checklist, patterns, and populated intel fields

---

## Out of Scope

- Allergy reference library (exit 17 mentions researching conditions; a built-in medical reference is a separate spec)
- Embedded maps or Street View (permanent exit; we store findings, not the map)
- Social media feed aggregation (permanent exit; we link out, not embed)
- AI-powered client research (we do not scrape or crawl social media; chef does the research manually)
- Auto-populating fields from social media APIs (privacy and API cost concerns; manual capture only)
- Event reference file types beyond images (PDFs, docs could be a future extension)
- Sharing references with clients or staff (chef-only for now; staff visibility via HOM contract later)

---

## Notes for Builder Agent

- **Intel checklist is NOT persisted.** It is a pure function of existing data. No new table, no new state. Recompute on every render.
- **Client patterns use `unstable_cache`.** Tag format: `client-history-intel-{clientId}`. Add `revalidateTag` calls to event create/update/delete in `lib/events/actions.ts`.
- **Lifestyle tags are a fixed set.** Use a const array in `lib/clients/intel-checklist.ts` and render as multi-select chips. Do not let chefs type arbitrary tags (prevents data quality issues).
- **`kitchen_quality` complements, does not replace, `kitchen_assessments`.** The quick enum is for the checklist and at-a-glance view. The full assessment table is for detailed equipment tracking.
- **`map_link` validation:** Accept any URL. Do not validate that it is a Google Maps link. Chefs may use Apple Maps, Waze, or direct Zillow links.
- **Event references follow the `client_photos` storage pattern.** Same bucket, different path prefix (`events/` instead of direct client path).
- **AI narrative for patterns:** Use the existing Ollama integration pattern from Remy. Prompt: "Summarize these client dining patterns in 2-3 sentences for a private chef." If Ollama is unavailable, return `narrative: null` and let the UI render the raw patterns as bullets.
- **No em dashes** anywhere in UI copy or comments.
- Run `/wire-audit` before marking done.
