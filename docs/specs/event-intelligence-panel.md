# Event Intelligence Panel

> **Date:** 2026-05-25
> **Exit Points Addressed:** 43, 45, 57, 58, 18, 46, 47
> **Category:** Bridgeable Exits (reduce friction at boundaries, own the intel)

---

## Problem

Chefs leave ChefFlow repeatedly for event-specific logistics research: checking venue kitchen capabilities, planning routes across multiple stops, finding nearby grocery stores, checking weather for outdoor events, and tracking travel/equipment details. Each exit loses context and creates re-entry friction. The data gathered externally is never captured, so it must be re-researched for the next event at the same venue.

---

## What Exists Today

ChefFlow already has significant venue and event infrastructure:

### Venue Storage (3 tables)

| Table                    | Scope                                    | Key Fields                                                                                                                                                                                                                                                                                                                                         |
| ------------------------ | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `venue_profiles`         | Reusable per chef, keyed by `venue_name` | `has_full_kitchen`, `oven_count`, `burner_count`, `has_refrigeration`, `has_freezer`, `has_running_water`, `oven_type`, `counter_space_rating`, `refrigeration_notes`, `parking_notes`, `access_instructions`, `power_outlets`, `water_access`, `equipment_available`, `venue_type`, `address`, `photos`, `quirks`, `visit_count`, `kitchen_notes` |
| `event_venue_details`    | Per-event (co-hosted events)             | parking, access, weather contingency, power/water, setup zones, farm profile                                                                                                                                                                                                                                                                       |
| `event_site_assessments` | Per-event site visit                     | kitchen size/equipment, parking, loading dock, capacity, outdoor/weather exposure, venue contact                                                                                                                                                                                                                                                   |

### Event Location Fields (on `events` table)

- `location_address`, `location_city`, `location_state`, `location_zip`, `location_notes`
- `location_lat`, `location_lng` (from Google Places autocomplete)
- `kitchen_notes`, `site_notes`, `access_instructions`

### Existing Pages

- `/events/[id]/travel` with `TravelPlanClient` (multi-leg travel planner)
- `/events/[id]/ops` (menu, shopping, prep timeline in one view)
- Event detail page with lifecycle-aware sections and intelligence panels
- Commitment system already checks `weather_contingency_outdoor` rules

### What Is Missing

1. **No venue profile surfacing on event detail.** `venue_profiles` exists but is never shown inline on the event page where the chef needs it.
2. **No map view for a day's events.** Chef must mentally map routes across multiple stops.
3. **No nearby-store finder per event.** Chef opens Google Maps separately to find stores near a venue.
4. **No weather forecast on event detail.** Chef checks a separate weather app for every outdoor event.
5. **No structured travel/equipment fields on events.** Travel details and equipment rentals live in unstructured notes or nowhere.
6. **Venue profiles not linked to events.** Events have `venue_name` equivalent data in `location_address` but no FK to `venue_profiles`.

---

## What to Build

### 1. Venue Profile Card on Event Detail

**Closes Exit 57** (research venue kitchen capabilities)
**Reduces Exit 18** (view client venue on map)

Surface the matching `venue_profiles` record inline on the event detail page. Match by `tenant_id` + fuzzy address or exact venue name.

**UI:** A collapsible card in the event overview or ops section showing:

- Venue type badge (residential, commercial kitchen, outdoor, venue hall, etc.)
- Kitchen summary: oven type/count, burner count, counter space rating (1-5 stars), refrigeration, running water
- Equipment available (tags)
- Parking notes, access instructions, power/water
- Quirks (free text, highlighted)
- Last visited date and visit count
- "Edit Venue Profile" link to full edit form
- "No venue profile yet" state with "Create from this event" button that pre-fills address from event

**Auto-link logic:**

- On event save, if `location_address` matches an existing `venue_profiles.address` (normalized comparison), auto-associate.
- If no match, show prompt: "First time at this address. Save venue notes for future events?"
- On venue profile creation from event, copy `kitchen_notes`, `site_notes`, `access_instructions` from event into the new profile.

**No new tables.** Add nullable `venue_profile_id UUID REFERENCES venue_profiles(id)` column to `events` table.

### 2. Event Map View (Daily Planner)

**Closes Exit 43** (route planning for the day)
**Reduces Exit 18** (view client venue on map)

A map view on the events timeline/board pages showing all events for a selected date plotted on an embedded map.

**UI:**

- Toggle button on `/events/timeline` or `/events/board`: "Map View"
- Static map image via Google Maps Static API (no JS Maps SDK needed), or an embedded `<iframe>` Google Maps link with multiple pins
- Each pin: event time, client name, occasion
- Below map: ordered list of stops with Google Maps direction links between consecutive stops
- "Open in Google Maps" button that opens a multi-stop directions URL (pre-built `https://www.google.com/maps/dir/...` link)
- Chef's home address (from `chef_preferences.home_address`) as start/end point

**Routing is a permanent exit.** ChefFlow builds the multi-stop Google Maps URL and links out. No in-app routing engine.

**Data source:** Query events for selected date where `location_lat` and `location_lng` are not null. Events without coordinates show in the list with "No location set" badge.

### 3. Nearby Store Finder

**Closes Exit 45** (find grocery store near event venue)

A small panel on the event detail page showing nearby grocery stores.

**Implementation:**

- Use Google Places API (Nearby Search) with event's `location_lat`/`location_lng`
- Search types: `supermarket`, `grocery_or_supermarket`
- Radius: 5 miles (configurable per chef in preferences)
- Cache results in a lightweight `event_nearby_stores` table or in-memory with 24h TTL
- Show top 5 results: store name, distance, "Open now" badge, Google Maps link

**UI:**

- Collapsed by default in event detail, labeled "Nearby Stores"
- Each store row: name, distance (miles), open/closed status, "Directions" button (Google Maps link)
- "Search for more" link opens Google Maps with the venue coordinates pre-filled
- Empty state if event has no coordinates: "Add event address to find nearby stores"

**API cost control:**

- Only fetch when panel is expanded (client-side trigger)
- Cache per `(lat, lng rounded to 3 decimals)` for 24 hours
- Server action proxies the request (API key stays server-side)

**No new tables required.** Use `unstable_cache` with `nearby-stores-{lat3}-{lng3}` tag and 24h revalidation.

### 4. Weather Widget

**Closes Exit 58** (check weather for outdoor events)

A weather forecast card on the event detail page for events within the next 7 days.

**Implementation:**

- Use Open-Meteo API (free, no API key required, self-hosted option available)
- Endpoint: `https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&timezone=auto`
- Show 3-day window centered on event date (day before, event day, day after)
- Only render for events with coordinates and event_date within 7 days from today

**UI:**

- Card in event detail header area (prominent for outdoor events)
- Each day: high/low temp, precipitation probability, weather icon (sun/cloud/rain/snow mapped from WMO weather codes)
- Event day highlighted
- Rain probability > 40% shows amber warning badge
- Rain probability > 70% shows red warning with "Weather contingency needed" linked to commitment rules
- "Full forecast" link opens weather.com or similar for the venue zip code
- For outdoor events (`event_venue_details.rain_backup_plan` exists or `event_site_assessments.outdoor_space` is true): auto-expand. For indoor: collapsed.

**Outdoor detection heuristic:**

- `venue_profiles.venue_type = 'outdoor'`
- OR `event_site_assessments.outdoor_space = true`
- OR `event_venue_details.rain_backup_plan IS NOT NULL`
- OR event occasion contains keywords: "farm", "outdoor", "garden", "bbq", "barbecue", "picnic", "rooftop"

**Integration with commitment system:**

- If weather widget shows high precipitation and no `rain_backup_plan` exists, trigger the existing `weather_contingency_outdoor` commitment rule.
- Weather data feeds into the pre-mortem `weather_impact` scenario.

**No API key cost.** Open-Meteo is free for non-commercial use (ChefFlow qualifies as a personal tool).

### 5. Travel and Equipment Notes (Structured Fields)

**Closes Exit 46** (book travel for destination events)
**Closes Exit 47** (rent equipment for large events)

Add structured fields to events for travel logistics and equipment rentals.

**Migration: `event_travel_equipment`**

```sql
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS travel_mode TEXT
    CHECK (travel_mode IS NULL OR travel_mode IN ('drive', 'fly', 'train', 'other')),
  ADD COLUMN IF NOT EXISTS travel_departure_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS travel_return_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS travel_notes TEXT,
  ADD COLUMN IF NOT EXISTS travel_cost_cents INTEGER,
  ADD COLUMN IF NOT EXISTS accommodation_name TEXT,
  ADD COLUMN IF NOT EXISTS accommodation_address TEXT,
  ADD COLUMN IF NOT EXISTS accommodation_confirmation TEXT,
  ADD COLUMN IF NOT EXISTS accommodation_cost_cents INTEGER;

CREATE TABLE IF NOT EXISTS event_equipment_rentals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  vendor_name TEXT NOT NULL,
  vendor_phone TEXT,
  vendor_email TEXT,
  items TEXT[] NOT NULL DEFAULT '{}',
  pickup_at TIMESTAMPTZ,
  return_at TIMESTAMPTZ,
  cost_cents INTEGER,
  deposit_cents INTEGER,
  confirmation_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**UI on event detail:**

- "Travel" section (visible when `travel_mode` is set or event is > 50 miles from chef home)
- "Equipment Rentals" section with add/edit/remove for rental entries
- Travel costs and rental costs automatically feed into event expense tracking via existing `expenses` table patterns
- Equipment rental return dates surface in commitment system as reminders

**Links to existing `/events/[id]/travel` page:** The structured fields provide data; the travel page provides the multi-leg planner. No duplication.

---

## Migration Plan

One migration file. Additive only.

```sql
-- Link events to reusable venue profiles
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS venue_profile_id UUID REFERENCES venue_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_events_venue_profile
  ON events(venue_profile_id) WHERE venue_profile_id IS NOT NULL;

-- Travel fields on events
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS travel_mode TEXT
    CHECK (travel_mode IS NULL OR travel_mode IN ('drive', 'fly', 'train', 'other')),
  ADD COLUMN IF NOT EXISTS travel_departure_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS travel_return_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS travel_notes TEXT,
  ADD COLUMN IF NOT EXISTS travel_cost_cents INTEGER,
  ADD COLUMN IF NOT EXISTS accommodation_name TEXT,
  ADD COLUMN IF NOT EXISTS accommodation_address TEXT,
  ADD COLUMN IF NOT EXISTS accommodation_confirmation TEXT,
  ADD COLUMN IF NOT EXISTS accommodation_cost_cents INTEGER;

-- Equipment rentals table
CREATE TABLE IF NOT EXISTS event_equipment_rentals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  vendor_name TEXT NOT NULL,
  vendor_phone TEXT,
  vendor_email TEXT,
  items TEXT[] NOT NULL DEFAULT '{}',
  pickup_at TIMESTAMPTZ,
  return_at TIMESTAMPTZ,
  cost_cents INTEGER,
  deposit_cents INTEGER,
  confirmation_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_equipment_rentals_event
  ON event_equipment_rentals(event_id);
CREATE INDEX IF NOT EXISTS idx_event_equipment_rentals_tenant
  ON event_equipment_rentals(tenant_id);

ALTER TABLE event_equipment_rentals ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_equipment_rentals_tenant
  ON event_equipment_rentals
  FOR ALL USING (tenant_id = (current_setting('app.current_tenant', true))::uuid);
```

---

## File Plan

| File                                                              | Purpose                                               |
| ----------------------------------------------------------------- | ----------------------------------------------------- |
| `database/migrations/20260526000001_event_intelligence_panel.sql` | Migration (above)                                     |
| `lib/events/venue-link-actions.ts`                                | Auto-link events to venue profiles, create-from-event |
| `lib/events/nearby-stores-actions.ts`                             | Google Places proxy for nearby stores                 |
| `lib/events/weather-actions.ts`                                   | Open-Meteo forecast fetch + cache                     |
| `lib/events/equipment-rental-actions.ts`                          | CRUD for event equipment rentals                      |
| `components/events/venue-profile-card.tsx`                        | Inline venue profile on event detail                  |
| `components/events/nearby-stores-panel.tsx`                       | Expandable nearby stores list                         |
| `components/events/weather-widget.tsx`                            | 3-day forecast card                                   |
| `components/events/equipment-rentals.tsx`                         | Equipment rental list + form                          |
| `components/events/event-map-view.tsx`                            | Daily map view with multi-stop link                   |
| `app/(chef)/events/[id]/_sections/event-venue-section.tsx`        | Section wrapper for venue + weather + stores          |
| `tests/unit/venue-link.test.ts`                                   | Address matching logic                                |
| `tests/unit/weather-actions.test.ts`                              | Forecast parsing, outdoor detection                   |
| `tests/e2e/event-intelligence-panel.spec.ts`                      | Venue card, weather widget, nearby stores render      |

---

## Exit Points Closed

| Exit # | Scenario                            | Strategy                                                                                                   | What ChefFlow Does                                                      |
| ------ | ----------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **57** | Research venue kitchen capabilities | **Own it.** Store specs in `venue_profiles`, surface on event detail. Once recorded, never research again. | Venue Profile Card with kitchen specs, auto-linked to events by address |
| **43** | Route planning for the day          | **Bridge it.** Show map, build Google Maps multi-stop URL.                                                 | Event Map View with pins + "Open in Google Maps" for routing            |
| **45** | Find grocery store near venue       | **Bridge it.** Show nearby stores, link to Google Maps for directions.                                     | Nearby Store Finder panel on event detail                               |
| **58** | Check weather for outdoor event     | **Bridge it.** Show 3-day forecast inline, link to full weather app.                                       | Weather Widget on event detail, integrated with commitment system       |
| **18** | View client venue on map            | **Bridge it.** Embedded map link on event detail.                                                          | Map pin per event with Google Maps link                                 |
| **46** | Book travel for destination events  | **Own context.** Store travel details, link out for booking.                                               | Structured travel fields on event                                       |
| **47** | Rent equipment for large events     | **Own context.** Store rental vendor, items, costs, return dates.                                          | Equipment Rentals table with commitment reminders                       |

---

## Boundaries

1. **No routing engine.** Google Maps, Waze, and Apple Maps do routing. ChefFlow builds the URL and links out. This is a permanent exit.
2. **No weather app.** Open-Meteo provides a 3-day snapshot. For hourly forecasts, radar, or alerts, link to a weather service. This is a bridge.
3. **No store inventory.** Nearby Store Finder shows location and hours. What the store stocks is not our domain.
4. **No travel booking.** Airlines, hotels, and rental cars are permanent exits. ChefFlow stores the confirmation details.
5. **No equipment catalog.** Rental companies manage their inventory. ChefFlow stores what was rented, from whom, and when it goes back.
6. **Venue profiles are owned data.** Kitchen specs, quirks, access notes compound over time. Every visit enriches the profile. This is the high-value capture that eliminates repeat research.

---

## Success Criteria

1. Chef opens an event and sees venue kitchen specs without leaving ChefFlow (exit 57 closed).
2. Chef views a day's events on a map and opens Google Maps with all stops pre-loaded in one click (exit 43 bridged).
3. Chef finds the nearest grocery store to a venue from the event page (exit 45 bridged).
4. Chef sees weather forecast for an outdoor event and gets a warning if rain backup is missing (exit 58 bridged).
5. Chef stores travel and equipment rental details on the event, with costs flowing into expense tracking (exits 46, 47 bridged).
6. Venue profiles auto-link to events by address, so a chef who returns to the same venue sees all prior kitchen intel without re-entering it.
7. No new external API keys required for weather (Open-Meteo is free). Google Places API key (already used for autocomplete) powers nearby stores.
8. All structured data is tenant-scoped with RLS. No cross-tenant leakage.

---

## Dependencies

- Google Places API key (existing, used by address autocomplete)
- Open-Meteo API (free, no key)
- `venue_profiles` table (exists)
- `event_venue_details` table (exists)
- Event coordinates (`location_lat`, `location_lng`) populated via Google Places autocomplete (existing flow)
- Commitment system weather rules (existing)

---

## Build Order

1. **Migration** (schema changes, equipment rentals table)
2. **Venue Profile Card** (highest value; eliminates repeat venue research)
3. **Weather Widget** (small, high-impact for outdoor events, connects to existing commitment system)
4. **Travel and Equipment fields** (structured data capture, expense integration)
5. **Nearby Store Finder** (API integration, caching)
6. **Event Map View** (daily planner, multi-stop link generation)
