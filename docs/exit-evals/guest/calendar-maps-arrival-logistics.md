# Exit Eval: Guest / Calendar, Maps & Arrival Logistics

> **Wave 4 | 7 scenarios | Role: GUEST**
> **Evaluator:** Claude (solo mode)
> **Date:** 2026-05-25
> **Status:** NEEDS-DEVELOPER-REVIEW

---

## Scenario #15: Add event to personal calendar

**Original classification:** Bridgeable
**Reclassified to:** Bridgeable

**Why guest leaves:** Guest needs the event in their personal calendar so it shows alongside work meetings, family plans, and travel. The personal calendar is the scheduling source of truth for their life. ChefFlow will never replace it.

**Context ChefFlow has:**

- Event date and time (serve time, arrival time)
- Event location (full address)
- Event name/occasion
- Host name
- Duration estimate (3-hour default)
- Circle URL for context

**Data source?** No. The guest's personal calendar is not a data source; it is a personal scheduling system where ChefFlow pushes data TO.

**Client-collaborative angle:** Minimal. The host/chef sets the event time. No guest collaboration needed for calendar data.

**Physical reality:** Screen-based. One-tap action from the event page. Must work on mobile (most guests view event invites on phones).

**Compounding:** Low. Each event is a one-off calendar add. No learning or memory needed.

**Solution design:**

- Public `/e/[shareToken]` already has Google Calendar deep-link and .ics download (BUILT)
- `components/events/calendar-add-buttons.tsx` exists as a reusable component with Google Calendar + Apple/Outlook .ics
- MISSING: The share page (`/share/[token]`) and guest portal (`/event/[eventId]/guest/[secureToken]`) do NOT have calendar add buttons
- Add `CalendarAddButtons` component to share page and guest portal (below event date/time section)
- Include arrival time (not just serve time) in calendar event title or notes

**Where it appears:**

- `/e/[shareToken]` confirmation section (ALREADY BUILT: Google Calendar link + .ics download)
- `/share/[token]` event details card (MISSING)
- `/event/[eventId]/guest/[secureToken]` portal header (MISSING)
- Dinner Circle "Getting There" channel (could add)

**What remains as permanent exit:**
The guest still opens their calendar app to view the event alongside their other plans. ChefFlow cannot replace the personal calendar; it can only push events into it cleanly.

**Priority:** High frequency (every guest for every event) x Low effort (component exists, just needs wiring) = P0
**Spec needed?** No. Component exists (`components/events/calendar-add-buttons.tsx`). Wire it to share page and guest portal.

---

## Scenario #16: Navigate to the event

**Original classification:** Permanent
**Reclassified to:** Bridgeable

**Why guest leaves:** Guest needs turn-by-turn navigation from their current location to the event venue. Maps apps handle real-time routing, traffic, re-routing, and ETA. ChefFlow will never be a navigation app.

**Context ChefFlow has:**

- Full event address (street, city, state, zip)
- Location notes (from host/chef)
- Parking instructions (via `pre_event_content.parking_info` and venue details)
- Arrival time
- Rideshare dropoff point (Dinner Circle arrival guide)

**Data source?** No. Turn-by-turn navigation requires real-time GPS, traffic, and road data. This is definitively external.

**Client-collaborative angle:** High. The host knows:

- Best approach route ("take exit 42, not 43")
- Pinned map location (if address is imprecise, e.g., farm/estate)
- Rideshare drop-off point specifics
- The Dinner Circle arrival guide (`lib/dinner-circles/arrival-guide.ts`) already has a `rideshare_dropoff` section

**Physical reality:** Mobile-first. Guest taps an address and expects their preferred maps app to open. Must be a tappable link, not selectable text.

**Compounding:** Medium. Venue addresses compound for repeat guests at the same location, but navigation itself is always real-time.

**Solution design:**

- Render address as a tappable Google Maps deep-link (`https://www.google.com/maps/search/?api=1&query=ADDRESS`)
- On guest portal: show address as clickable map link (currently renders plain text at line 333 of portal-client.tsx)
- On share page: same (currently renders plain text at line 146)
- Include "Copy address" button for pasting into preferred maps app
- Show parking instructions and rideshare drop-off notes directly above the map link
- The `/nearby` listing-card already uses Google Maps links (line 281); reuse pattern

**Where it appears:**

- `/share/[token]` location section (address rendered but not linked)
- `/event/[eventId]/guest/[secureToken]` location section (address rendered but not linked)
- `/e/[shareToken]` public event page (location text shown)
- Dinner Circle "Getting There" channel (address section)

**What remains as permanent exit:**
Turn-by-turn navigation always happens in Google Maps/Apple Maps/Waze. ChefFlow provides the cleanest possible handoff: tappable link, pre-loaded destination, parking context shown before leaving.

**Priority:** High frequency (every attending guest) x Low effort (make address a link) = P0
**Spec needed?** No. Pattern exists in `/nearby` listing cards. Apply to guest surfaces.

---

## Scenario #17: Check traffic before leaving

**Original classification:** Permanent
**Reclassified to:** Partially Reducible

**Why guest leaves:** Guest wants to know when to leave home to arrive on time. They need real-time traffic conditions between their location and the venue to calculate departure time.

**Context ChefFlow has:**

- Event arrival time
- Event address (destination)
- Event date and time
- Historical patterns (if guest has attended before at same venue)

**Data source?** Yes, partially. Google Maps Directions API can estimate travel time given origin/destination. But ChefFlow does not know the guest's home address (no auth, no profile beyond token).

**Client-collaborative angle:** The host can provide "plan for 30 minutes from downtown" or "traffic is heavy on Route 1 after 4pm" in arrival guide notes. The `late_arrival_handling` section in the arrival guide addresses what happens if traffic causes delay.

**Physical reality:** Mobile. Guest checks while getting ready. Quick glance at ETA. Large text for time estimates.

**Compounding:** Low. Traffic is real-time and changes daily. No compounding benefit.

**Solution design:**

- Show "leave by" guidance on guest portal: "Arrive by 6:00 PM. Plan your departure accordingly."
- Include a "Get Directions" button that opens Google Maps with destination pre-filled (same as #16)
- Show arrival window from Dinner Circle arrival guide if populated
- Show host-provided traffic notes if available in arrival guide
- Do NOT attempt to build a traffic widget (requires guest location, adds complexity, breaks privacy)

**Where it appears:**

- Guest portal event header (arrival time emphasis)
- Dinner Circle "Getting There" channel (arrival window section)
- Pre-event content section (arrival_instructions field already exists)

**What remains as permanent exit:**
Real-time traffic checking requires the guest's current location and live road data. Guest will always check Maps for this. ChefFlow's job is to make the "when should I leave?" question as easy as possible by showing arrival time prominently and providing a one-tap directions link.

**Priority:** Medium frequency (pre-event, one check per guest) x Low effort (show arrival time, link to maps) = P1
**Spec needed?** No. Covered by #16 map link + arrival time emphasis.

---

## Scenario #18: Coordinate parking or building access

**Original classification:** Bridgeable
**Reclassified to:** Reducible + Client-Collaborative

**Why guest leaves:** Guest texts the host "where do I park?" or "what's the gate code?" because the event page does not show this information. The host knows it; ChefFlow just never asked them.

**Context ChefFlow has:**

- `pre_event_content.parking_info` field (text, chef-provided)
- `pre_event_content.arrival_instructions` field
- Venue details: `parking_instructions`, `parking_capacity`, `overflow_plan`, `gate_code`, `access_instructions`, `directions_from_road` (in `lib/events/venue-details-actions.ts`)
- Dinner Circle arrival guide: `parking`, `building_gate_access`, `entry_instructions`, `elevator_loading_notes`, `rideshare_dropoff` sections (in `lib/dinner-circles/arrival-guide.ts`)
- The `GettingThereChannel` component (`components/circles/redesign/channels/getting-there.tsx`) renders all 12 arrival guide sections

**Data source?** No. This is institutional/situational knowledge from the host/venue.

**Client-collaborative angle:** VERY HIGH. The host knows their own building better than anyone:

- Parking type and instructions
- Gate/door codes
- Which entrance to use
- Elevator access
- Concierge protocol
  The Dinner Circle arrival guide ALREADY has structured fields for all of this with visibility controls (`attendee_visible`, `host_and_chef`, etc.). The system is BUILT but may not be consistently populated or surfaced.

**Physical reality:** Mobile. Guest checks while in car or approaching building. Needs quick, scannable info. Large text. Copy-to-clipboard for codes.

**Compounding:** High. Venue access info is entered once and serves every future guest at that address. The venue-details system already supports this.

**Solution design:**

- Ensure guest portal surfaces parking and access info from `pre_event_content` (ALREADY BUILT at line 1057-1060 of portal-client.tsx: "Before You Arrive" section shows parking_info and arrival_instructions)
- Ensure Dinner Circle "Getting There" channel is populated by host during Circle setup
- Add a prompt to the host during event confirmation: "Add parking and access notes for your guests"
- Surface the `GettingThereChannel` data on guest-visible Circle views
- For gate codes: tap-to-reveal pattern (sensitive data, attendee_visible visibility)

**Where it appears:**

- Guest portal "Before You Arrive" section (BUILT: parking_info, arrival_instructions)
- Dinner Circle "Getting There" channel (BUILT: 12-section arrival guide with parking, building access, entry, rideshare)
- Public event page venue details (BUILT: parking_instructions, directions_from_road for public/ticketed events)

**What remains as permanent exit:**
If the host has NOT filled in parking/access notes, the guest still texts the host. The system eliminates this exit only when the host provides the information. Edge cases: building apps, concierge phone calls for real-time buzzing.

**Priority:** High frequency (every event at unfamiliar venue) x Low effort (system is built, needs population prompts) = P0
**Spec needed?** No. Infrastructure exists (`venue-details-actions.ts`, `arrival-guide.ts`, `GettingThereChannel`). Need host prompting and consistent surfacing. See existing spec: `docs/specs/venue-access-intelligence.md`.

---

## Scenario #19: Order rideshare

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why guest leaves:** Guest needs to book an Uber/Lyft to get to the event. Rideshare is a separate marketplace with pricing, driver matching, and real-time dispatch. ChefFlow will never be a transportation provider.

**Context ChefFlow has:**

- Event address (destination for rideshare)
- Arrival time (when to schedule pickup)
- Rideshare drop-off point (from arrival guide: `rideshare_dropoff` section)
- Event end time estimate (for return trip planning)

**Data source?** No. Rideshare is a transactional marketplace, not a data source.

**Client-collaborative angle:** Medium. Host can specify the best rideshare drop-off point (lobby entrance, not back alley). The arrival guide already has a `rideshare_dropoff` section with prompt: "Pinned pickup/dropoff point, lobby side, loading zone, or traffic notes."

**Physical reality:** Mobile. Guest opens Uber/Lyft app. Needs the address in their clipboard or a deep-link.

**Compounding:** Low. Each ride is independent. No learning.

**Solution design:**

- Provide "Copy address" button on guest portal and share page (guest pastes into rideshare app)
- Show rideshare drop-off notes from arrival guide prominently
- Optionally: show arrival time as "Schedule your ride to arrive by [time]" hint
- Do NOT build rideshare integration (API partnerships, not worth complexity)

**Where it appears:**

- Guest portal location section (copyable address)
- Dinner Circle "Getting There" channel (rideshare_dropoff section)
- Share page location section

**What remains as permanent exit:**
Ordering the rideshare itself. Guest will always open Uber/Lyft. ChefFlow provides the address, drop-off instructions, and timing to make the handoff frictionless.

**Priority:** Medium frequency (subset of guests) x Very low effort (copy button + show dropoff notes) = P1
**Spec needed?** No. Covered by address link improvements from #16.

---

## Scenario #20: Check weather for outdoor dinner

**Original classification:** Bridgeable
**Reclassified to:** Reducible

**Why guest leaves:** Guest checks weather to decide what to wear, whether to bring a jacket, or whether the event might be affected by rain. For outdoor events, weather determines outfit, comfort expectations, and contingency awareness.

**Context ChefFlow has:**

- Event date and time
- Event location (lat/lng derivable from address)
- Open-Meteo API integration ALREADY BUILT (`lib/weather/open-meteo.ts`): free, no API key, 16-day forecast + historical
- Weather batch fetching (`lib/weather/weather-actions.ts`)
- Weather widget for chef calendar (`components/events/weather-widget.tsx`)
- Weather forecast card (`components/events/weather-forecast-card.tsx`)
- Weather risk assessment (`lib/formulas/weather-risk.ts`)
- Full event weather intelligence spec EXISTS (`docs/specs/event-weather-intelligence.md`)
- Rain backup plan field in venue details (`rain_backup_plan`, `cancel_weather_threshold`)

**Data source?** Yes. Weather is a pure data source. Open-Meteo API is already integrated. The guest should NEVER leave to check weather.

**Client-collaborative angle:** Medium. Host can communicate rain backup plan. The venue details already store `rain_backup_plan` and `cancel_weather_threshold`. If surfaced on Circle, guests see "Rain plan: move under covered patio" without asking.

**Physical reality:** Glance moment. Guest checks weather once or twice before event. Needs: temperature, rain probability, wind. One line of text is enough for Tier 1.

**Compounding:** Low per event. But the weather data infrastructure compounds across the platform.

**Solution design:**

- Add weather glance to guest portal header: "Saturday: 72F, clear skies" (Tier 1 from spec)
- Add weather to Dinner Circle header (per spec: "Every circle shows weather for that event's date at the TOP")
- Add weather to share page event details card
- Reuse existing Open-Meteo fetch; create a lightweight guest-facing weather component (no auth required, keyed by event date + location)
- Show rain backup plan from venue details if weather indicates precipitation
- Weather widget exists for chef (`WeatherWidget`); create a simpler guest variant

**Where it appears:**

- Guest portal event header (MISSING: needs guest weather widget)
- Dinner Circle header (MISSING: per spec should show weather at top)
- Share page event details (MISSING)
- Public event page `/e/[shareToken]` (MISSING)

**What remains as permanent exit:**
Hourly forecast granularity and radar maps. Guests who want minute-by-minute updates or Doppler radar will still open a weather app. ChefFlow answers the 90% question: "What's the weather like for Saturday's dinner?"

**Priority:** High frequency (every outdoor event, many indoor events too) x Medium effort (API exists, need guest-facing component) = P0
**Spec needed?** No. Spec already exists: `docs/specs/event-weather-intelligence.md`. Needs implementation on guest surfaces.

---

## Scenario #21: Look up venue/farm details

**Original classification:** Permanent
**Reclassified to:** Partially Reducible

**Why guest leaves:** Guest wants to know more about the venue: what kind of place it is, what the farm grows, what to expect when they arrive. They Google the venue name or look for its website to set expectations.

**Context ChefFlow has:**

- Venue details system with farm profile: `farm_name`, `farm_bio`, `farm_photo_url`, `farm_website`, `farm_social_url`, `farm_logo_url` (in `lib/events/venue-details-actions.ts`)
- Farm showcase: `farm_animals[]` and `farm_crops[]` with photos and descriptions
- Public event page ALREADY renders farm showcase (lines 970-1039 of public-event-view.tsx): farm name, logo, bio, photo, animals grid, crops grid, plus farm website link
- Property rules and restroom info
- Welcome message from venue host

**Data source?** Partially. Venue/farm info can be captured once and displayed. But the venue's own website has richer, more current content (hours, upcoming events, full photo galleries, online store).

**Client-collaborative angle:** Medium. For private home events, the host IS the venue. For farm/restaurant events, the chef captures venue details during event setup. The venue details system already supports this capture.

**Physical reality:** Screen browsing. Guest might explore farm website for fun/interest before attending. Not urgent or hands-free.

**Compounding:** High. Venue profiles persist across all events at that location. Farm showcase data entered once serves every future dinner there.

**Solution design:**

- Public event page already shows farm showcase (BUILT for `/e/[shareToken]`)
- Add venue overview to guest portal (farm name, bio, photo, website link)
- Add venue info to share page if venue details exist
- Keep farm website as a clear outbound link (guest may want deeper content)
- Ensure "return to event" path is obvious when linking to external venue sites
- Surface property rules and welcome message on guest-facing pages

**Where it appears:**

- `/e/[shareToken]` public event page (BUILT: full farm showcase with animals, crops, bio, photos)
- `/share/[token]` share page (MISSING: no venue details)
- `/event/[eventId]/guest/[secureToken]` guest portal (MISSING: no venue details)
- Dinner Circle (partially: Getting There channel covers logistics but not venue identity)

**What remains as permanent exit:**
Guests who want to explore the venue's own website (online store, photo gallery, history, other events) will always leave. ChefFlow provides enough context to set expectations; the venue's website remains the deep-dive destination.

**Priority:** Medium frequency (farm/venue events, not private homes) x Low effort (data exists, needs surfacing on guest pages) = P1
**Spec needed?** No. Data model and public rendering exist. Wire venue details to share page and guest portal.

---

## Batch Summary

| #   | Title                                 | Reclassified To                  | Spec Needed?                                          |
| --- | ------------------------------------- | -------------------------------- | ----------------------------------------------------- |
| 15  | Add event to personal calendar        | Bridgeable                       | No (component exists, wire to guest surfaces)         |
| 16  | Navigate to the event                 | Bridgeable                       | No (make address a tappable link)                     |
| 17  | Check traffic before leaving          | Partially Reducible              | No (covered by #16 + arrival time emphasis)           |
| 18  | Coordinate parking or building access | Reducible + Client-Collaborative | No (see existing spec: venue-access-intelligence.md)  |
| 19  | Order rideshare                       | Permanent                        | No                                                    |
| 20  | Check weather for outdoor dinner      | Reducible                        | No (see existing spec: event-weather-intelligence.md) |
| 21  | Look up venue/farm details            | Partially Reducible              | No (data model and rendering exist)                   |

---

## Key Findings

### What is already built:

1. **Calendar add** on public ticketed event page (`/e/[shareToken]`): Google Calendar deep-link + .ics download
2. **CalendarAddButtons component** (`components/events/calendar-add-buttons.tsx`): reusable, accepts eventId/occasion/date/time/location
3. **Weather infrastructure**: Open-Meteo API, batch fetching, weather widget, risk assessment, full spec
4. **Venue details system**: parking, access, gate codes, directions, farm profiles with animals/crops/photos
5. **Dinner Circle arrival guide**: 12 structured sections (parking, building access, entry, elevator, rideshare dropoff, etc.) with visibility controls
6. **Guest portal "Before You Arrive"**: already surfaces parking_info and arrival_instructions from pre_event_content
7. **Farm showcase on public event page**: full rendering of farm name, bio, photos, animals, crops

### What is NOT built (gaps):

1. **No calendar add on share page** (`/share/[token]`) or guest portal
2. **No tappable map link** on share page or guest portal (address renders as plain text)
3. **No weather on guest-facing surfaces** (only on chef calendar/event views)
4. **No venue details on share page or guest portal** (only on public ticketed event page)
5. **No "Copy address" button** on any guest surface
6. **No host prompting** to fill arrival guide during event setup

### Implementation priority:

- **P0**: Wire `CalendarAddButtons` to share page and guest portal; make addresses tappable map links; add guest weather widget
- **P1**: Surface venue details on share/portal; add copy-address button; show rideshare dropoff notes
- **P2**: Host prompting for arrival guide population; weather on Dinner Circle header
