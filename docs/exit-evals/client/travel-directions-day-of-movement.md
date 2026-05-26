# Exit Eval: Client / TRAVEL, DIRECTIONS & DAY-OF MOVEMENT

> Wave 2 | 5 scenarios | Evaluated: 2026-05-25 | Mode: Solo
> Status: `NEEDS-DEVELOPER-REVIEW`

---

## Scenario #76: Navigate to event

**Original classification:** Permanent exit
**Reclassified to:** Permanent

**Why client leaves:** The client needs turn-by-turn navigation with live rerouting, lane guidance, traffic avoidance, and ETA updates. This requires a full mapping engine (Google Maps, Apple Maps, Waze) running on their phone with GPS, which ChefFlow will never replicate.

**Context ChefFlow has:**

- Event `location_address`, `location_city`, `location_state`, `location_zip` (schema: `events` table)
- Venue lat/lng available in `venue_lat`/`venue_lng` columns for Dinner Circle events
- Event date and time (`event_date`, `serve_time`, `arrival_time`)
- Arrival window from Dinner Circle arrival guide (section: `arrival_window`)
- Parking instructions from arrival guide (section: `parking`)
- Building/gate access instructions

**Data source?** Yes, Google Maps Directions API exists, but real-time navigation with GPS tracking is not an API-consumable feature. The app that runs navigation IS the destination.

**Client-collaborative angle:** The host (via Dinner Circle arrival guide) already provides: address, parking, rideshare dropoff point, entry instructions, arrival window, and late-arrival handling. This is already built in `lib/dinner-circles/arrival-guide.ts` with 12 sections. The `getting-there` channel component exists at `components/circles/redesign/channels/getting-there.tsx`.

**Physical reality:** Client is in a car or rideshare. Hands-free, eyes on road. The map app is the only safe interface. No screen interaction during transit. The link-out must work with one tap before departure.

**Compounding:** Medium. The address and parking/access notes compound across repeat visits to the same venue. ChefFlow already stores venue profiles and the arrival guide persists per circle.

**Solution design:**

- Add "Get Directions" button to client event detail page (`app/(client)/my-events/[id]/page.tsx`) next to the location display (currently line ~480 shows location but no map link)
- Deep-link to Google Maps with driving mode pre-filled (template already exists in exit-link registry id #55: `https://www.google.com/maps/dir/?api=1&origin=&destination={venueAddress}&travelmode=driving`)
- Include Waze and Apple Maps variants (Waze sub-link already registered in registry id #55)
- Surface arrival guide sections (parking, rideshare dropoff, entry) in a collapsed "Arrival Info" card on the event detail page for pre-departure reference
- Add "Get Directions" to the Dinner Circle guest portal `getting-there` channel

**Where it appears:**

- Client event detail page (`/my-events/[id]`) in the Event Details card
- Dinner Circle guest view (getting-there channel)
- Event countdown card (pre-departure context)

**What remains as permanent exit:**
The actual turn-by-turn navigation. ChefFlow will never be a GPS app. The client taps "Get Directions" and enters Google Maps/Waze/Apple Maps for the drive.

**Priority:** High frequency (every event) x Low effort (link buttons + arrival card) = High priority, quick win
**Spec needed?** No. Simple link-out pattern. Already partially exists in exit-link registry.

---

## Scenario #77: Order rideshare

**Original classification:** Permanent exit
**Reclassified to:** Permanent

**Why client leaves:** The client needs to book a real-time ride through Uber/Lyft's marketplace (driver matching, surge pricing, vehicle selection, payment, real-time tracking). This is a transactional marketplace ChefFlow cannot and should not replicate.

**Context ChefFlow has:**

- Event venue address (location_address, location_city, location_state)
- Event date and time (event_date, serve_time, arrival_time)
- Arrival window from Dinner Circle arrival guide
- Rideshare dropoff point (arrival guide section: `rideshare_dropoff` in `lib/dinner-circles/arrival-guide.ts`)

**Data source?** No. Uber/Lyft are live marketplaces, not data sources. The transaction happens inside their ecosystem.

**Client-collaborative angle:** The host already provides rideshare dropoff instructions via the arrival guide. This tells the client exactly where to be dropped off. The `rideshare_dropoff` section in the arrival guide (defaultVisibility: `attendee_visible`) is purpose-built for this.

**Physical reality:** Client is at home or another location preparing to leave. They need their phone to book the ride. The rideshare app handles the entire workflow. ChefFlow's role is limited to: (1) surfacing the destination address in copy-paste-ready format, and (2) reminding the client when to order based on the arrival window.

**Compounding:** Low. Each ride is one-off. The venue address and dropoff point compound (stored in arrival guide), but the ride booking itself never repeats identically.

**Solution design:**

- Add "Copy address" button next to location on client event detail page
- Include Uber/Lyft deep-links with destination pre-filled (Uber: `uber://?action=setPickup&dropoff[formatted_address]={address}`, Lyft: `lyft://ridetype?destination[latitude]={lat}&destination[longitude]={lng}`)
- Surface rideshare dropoff instructions from arrival guide in the event detail "Arrival Info" section
- Pre-event reminder notification could include "Time to book your ride" X minutes before arrival_time (based on typical travel time)

**Where it appears:**

- Client event detail page, location section
- Dinner Circle getting-there channel (rideshare dropoff section already exists)
- Pre-event push notification

**What remains as permanent exit:**
The entire rideshare booking, payment, driver tracking, and ride itself. ChefFlow provides the destination and dropoff context; the ride marketplace does everything else.

**Priority:** Medium frequency (subset of events where client uses rideshare) x Low effort (deep links + copy button) = Medium priority
**Spec needed?** No. Deep-link pattern, no new data model needed.

---

## Scenario #78: Book lodging for destination event

**Original classification:** Permanent exit
**Reclassified to:** Permanent

**Why client leaves:** The client needs to search, compare, and book a hotel/Airbnb for a destination event. This is a travel marketplace with availability, pricing, photos, reviews, and payment that ChefFlow cannot replicate.

**Context ChefFlow has:**

- Event venue address and city
- Event date (for check-in/check-out inference)
- Travel details schema exists on events table: `accommodation_name`, `accommodation_address`, `accommodation_confirmation`, `accommodation_cost_cents` (defined in `lib/events/travel-actions.ts` as `EventTravelDetails`)
- The `TravelEquipmentSection` component (`components/events/travel-equipment-section.tsx`) already displays accommodation data

**Data source?** No. Hotel/Airbnb booking is a transactional marketplace with dynamic pricing, availability, reviews, and payment processing.

**Client-collaborative angle:** Minimal for the client role specifically. The chef-side travel tracking (`lib/events/travel-actions.ts`) already handles the chef's own accommodation. For clients attending destination events (e.g., a wedding weekend), the host could share recommended hotels or block-booking info via the Dinner Circle.

**Physical reality:** Client is at a computer or phone, browsing hotel options days/weeks before the event. Full screen, comparison shopping mode. No time pressure, no hands-free need.

**Compounding:** Low for individual bookings. Medium if ChefFlow stores "recommended lodging" per venue (e.g., "clients who attend events at Venue X typically stay at Hotel Y"), but this is an edge case for private chef events.

**Solution design:**

- Store itinerary link or confirmation number in client-accessible event details (extend the existing `accommodation_*` fields to be client-visible, not just chef-visible)
- Add "Recommended Hotels" section to Dinner Circle arrival guide (host provides)
- Deep-link to hotel search pre-filled with venue city and event dates (Google Hotels: `https://www.google.com/travel/hotels/{city}?dates={checkIn},{checkOut}`)
- For destination events, the host/chef can attach hotel block-booking links in the Circle

**Where it appears:**

- Client event detail page (for destination events with travel required)
- Dinner Circle getting-there channel (host-provided hotel recommendations)

**What remains as permanent exit:**
The entire hotel search, comparison, booking, and payment. ChefFlow stores the confirmation details for reference and surfaces recommendations, but the travel marketplace owns the transaction.

**Priority:** Low frequency (rare for private chef events; most are local) x Medium effort = Low priority
**Spec needed?** No. Existing schema supports it; just needs client-side visibility.

---

## Scenario #79: Track traffic or parking

**Original classification:** Permanent exit
**Reclassified to:** Partially Reducible

**Why client leaves:** Two sub-needs: (1) Real-time traffic conditions to decide when to leave, and (2) Where to park when they arrive. Traffic is real-time external data. Parking info is host-provided context that ChefFlow already captures.

**Context ChefFlow has:**

- Venue address (for traffic destination)
- Event arrival_time / serve_time (departure planning)
- Parking instructions from Dinner Circle arrival guide (section: `parking`, prompt: "Street, garage, permit, driveway, validation, or tow-zone notes")
- Building/gate access from arrival guide
- Rideshare dropoff from arrival guide
- Venue lat/lng for map links

**Data source?** Partially. Traffic data: Google Maps Traffic API exists but is expensive and ChefFlow would just be recreating a map. Parking info: NOT a data source; it's host-authored knowledge already captured in the arrival guide.

**Client-collaborative angle:** Strong for parking. The host provides parking instructions via the Dinner Circle arrival guide. This is already built: `lib/dinner-circles/arrival-guide.ts` defines the `parking` section with prompt "Street, garage, permit, driveway, validation, or tow-zone notes." The host fills this in once and every guest/client sees it. Traffic tracking is NOT collaborative.

**Physical reality:** Traffic check happens while seated at home (screen OK). Parking info is needed at arrival (phone glance while driving or in the parking area). Large text, simple instructions.

**Compounding:** High for parking. A venue's parking situation rarely changes. Once the host fills in parking instructions, every future event at that venue benefits. ChefFlow's arrival guide already persists per Dinner Circle, and venue profiles could carry parking data across circles.

**Solution design:**

- Parking is ALREADY SOLVED via Dinner Circle arrival guide (`parking` section in `lib/dinner-circles/arrival-guide.ts`). Ensure this is prominently surfaced in the client event detail page.
- Add "Check Traffic" link-out to Google Maps traffic view for the venue area
- Surface parking + entry instructions in a mobile-first "Arrival Card" on the event detail page (large text, one-glance format)
- For repeat venues, carry parking instructions forward to new events automatically

**Where it appears:**

- Client event detail page: "Arrival Info" card with parking instructions from arrival guide
- Dinner Circle getting-there channel (already built: `components/circles/redesign/channels/getting-there.tsx`)
- Pre-event notification could include parking summary

**What remains as permanent exit:**
Real-time traffic tracking. Client will always check Google Maps or Waze for live traffic. ChefFlow eliminates the parking info hunt entirely (host provides via arrival guide), but traffic remains external.

**Priority:** High frequency (every event has parking questions) x Low effort (surface existing data) = High priority
**Spec needed?** No. Arrival guide parking section exists; needs client-facing surfacing on event detail page.

---

## Scenario #80: Coordinate pickup/drop-off timing

**Original classification:** Bridgeable
**Reclassified to:** Reducible + Client-Collaborative

**Why client leaves:** The client needs to coordinate arrival/departure timing with other household members, rideshare drivers, or the host. Currently this happens via text/phone because there is no shared real-time arrival status surface.

**Context ChefFlow has:**

- Event date, time, arrival_time, serve_time
- Arrival window from Dinner Circle arrival guide (`arrival_window` section: "Earliest arrival, ideal arrival, doors-open time, and chef load-in window")
- Late-arrival handling from arrival guide (`late_arrival_handling` section: "Cutoff, text-before-entering rule, course pacing, and what late guests should do")
- Rideshare dropoff point from arrival guide
- Service day live milestones (`lib/events/service-day-live-actions.ts`) already tracks: confirmed, shopping, prepping, en_route, serving
- Dinner Circle as a group communication surface
- Arrival contact from arrival guide (`arrival_contact` section: "Name, phone, backup contact, or preferred arrival channel")
- Guest list with RSVP status

**Data source?** No. This is coordination, not data lookup. The information is generated by the participants themselves (ETA, departure confirmation, delay notifications).

**Client-collaborative angle:** Very strong. This is inherently multi-party coordination:

- Host sets arrival window and late-arrival rules (already in arrival guide)
- Guest announces "I'm leaving now" or "Running 10 min late"
- Host or chef can broadcast "We're running behind, doors open at 7:15 instead"
- The Dinner Circle is the perfect surface for this real-time coordination

**Physical reality:** Client is in transit (car, rideshare). Needs one-tap status updates. "I'm on my way" / "Running late" / "5 minutes away" are the only actions. Voice or single-tap UI. No typing.

**Compounding:** Medium. The arrival patterns for repeat clients/venues compound. ChefFlow learns that "Client X always arrives 10 minutes early" or "Venue Y events always start 15 minutes late." The arrival window and late-handling rules persist per Circle.

**Solution design:**

- Add quick-status buttons to the Dinner Circle day-of view: "On my way" / "Running late" / "Arrived" (one-tap, no typing)
- Surface arrival statuses in Dinner Circle for all participants (host sees who is en route)
- Chef's "en_route" milestone from service-day-live (`travel_started_at`) is already tracked and visible to clients
- Add "Notify host I'm running late" quick action to the client event detail page on day-of
- Push notification to host/chef when client sends arrival status
- Surface arrival window + late-arrival handling prominently on day-of mobile view

**Where it appears:**

- Client event detail page (day-of view): arrival status quick buttons
- Dinner Circle real-time channel: group arrival visibility
- Push notifications: arrival updates to host/chef
- Service day timeline (`app/(client)/my-events/[id]/live/service-day-timeline.tsx`): already shows chef en_route status

**What remains as permanent exit:**
Actual rideshare app coordination (telling the driver the exact dropoff spot). Phone calls for truly urgent last-minute changes where real-time voice is needed. But the text-based "I'm on my way" / "running late" coordination can move entirely into ChefFlow's Dinner Circle.

**Priority:** High frequency (every multi-guest event) x Medium effort (quick-status buttons + notifications) = High priority
**Spec needed?** Yes. The "Day-of Arrival Coordination" feature (quick-status buttons, group arrival visibility, notifications) needs a spec to define the interaction model, notification triggers, and Circle integration.

---

## Batch Summary

| #   | Title                              | Reclassified To                  | Spec Needed? |
| --- | ---------------------------------- | -------------------------------- | ------------ |
| 76  | Navigate to event                  | Permanent                        | No           |
| 77  | Order rideshare                    | Permanent                        | No           |
| 78  | Book lodging for destination event | Permanent                        | No           |
| 79  | Track traffic or parking           | Partially Reducible              | No           |
| 80  | Coordinate pickup/drop-off timing  | Reducible + Client-Collaborative | Yes          |

---

## Evidence Index

| File                                                        | Relevance                                                                               |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `lib/events/travel-actions.ts`                              | Chef-side travel/accommodation CRUD (EventTravelDetails type)                           |
| `lib/dinner-circles/arrival-guide.ts`                       | 12-section arrival guide with parking, rideshare dropoff, arrival window, late handling |
| `lib/dinner-circles/arrival-guide-actions.ts`               | Server actions for save/load arrival guide                                              |
| `components/dinner-circles/arrival-guide.tsx`               | Full arrival guide editor with visibility controls, print mode                          |
| `components/circles/redesign/channels/getting-there.tsx`    | Guest-facing "Getting There" channel in Dinner Circle redesign                          |
| `components/events/event-map-link.tsx`                      | Google Maps link component (chef-side, lat/lng based)                                   |
| `components/events/travel-equipment-section.tsx`            | Chef-side travel details display                                                        |
| `components/events/calendar-add-buttons.tsx`                | Calendar deep-links (includes location in Google Calendar URL)                          |
| `lib/exit-links/registry.ts` (id #55)                       | "Navigate to venue" exit link with Google Maps + Waze deep-links                        |
| `lib/events/service-day-live-actions.ts`                    | Client-facing service milestones including "en_route" stage                             |
| `app/(client)/my-events/[id]/live/service-day-timeline.tsx` | Live milestone tracker with 30s polling                                                 |
| `app/(client)/my-events/[id]/page.tsx`                      | Client event detail page (shows location but no map link-out)                           |
| `lib/commitment/domains/travel.ts`                          | Chef commitment rules for travel planning                                               |
| `lib/db/schema/schema.ts`                                   | Events table: location_address, location_city, location_state, venue_lat, venue_lng     |

---

## Key Findings

1. **Arrival guide is already built and comprehensive.** The Dinner Circle arrival guide (`lib/dinner-circles/arrival-guide.ts`) has 12 sections covering address, parking, building access, entry, elevator/loading, arrival contact, arrival window, late-arrival handling, accessibility, rideshare dropoff, coat/bag placement, and house rules. This is the strongest existing asset for scenarios 76-80.

2. **Client event detail page has a gap.** The page at `app/(client)/my-events/[id]/page.tsx` displays the location text but provides no "Get Directions" map link, no "Copy Address" button, and no arrival info card pulling from the Dinner Circle arrival guide. This is the primary quick win.

3. **Exit link registry already has navigation templates.** Registry id #55 defines the Google Maps directions deep-link with Waze sub-link. These just need to be surfaced on the client side.

4. **Service day live tracking is built but one-directional.** The chef's status (en_route, serving) is visible to clients via `service-day-live-actions.ts` and the timeline component. But there is no client-to-host/chef status ("I'm on my way"). This is the gap for scenario #80.

5. **The "Getting There" channel exists in the Circle redesign** (`components/circles/redesign/channels/getting-there.tsx`) but currently shows placeholder state with no real data connected. It needs wiring to the actual arrival guide data.
