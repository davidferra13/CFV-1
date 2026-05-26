# Exit Eval: Chef / TIME & LOCATION LOGISTICS

> Wave 1 | 4 scenarios | Batch date: 2026-05-25
> Mode: Solo (NEEDS-DEVELOPER-REVIEW on all scenarios)
> Evaluator: Claude (exit-eval rubric v1)

---

## Scenario #87: Set prep timing reminders/alarms

**Original classification:** Reducible (from source: "Prep timeline with push notifications per event")
**Reclassified to:** Partially Reducible

**NEEDS-DEVELOPER-REVIEW**

**Why chef leaves:** The chef needs time-anchored nudges for specific prep milestones that span hours or days before service. "Start brining the turkey at 6 AM tomorrow" is not a calendar event; it is a production-critical deadline tied to food science (brine time, marination windows, dough proofing). The chef leaves to set a phone alarm because ChefFlow's prep timeline exists as a visual reference but has no push-to-device reminder mechanism.

**Context ChefFlow has:**

- Full prep timeline engine (`lib/prep-timeline/compute-timeline.ts`) with per-component scheduling, peak windows, safety ceilings, and day-by-day breakdown
- Prep block engine (`lib/scheduling/prep-block-engine.ts`) with suggested blocks and gap detection
- Progressive prep prompts (`lib/scheduling/prep-prompts.ts`) that surface time-aware nudges on dashboard
- Event date, serve time, arrival time, event timezone
- Recipe prep times (active + passive minutes), hold classes, storage methods
- DOP (Default Operating Procedures) schedule with phased task tracking
- ICS export for prep timeline days (`lib/prep-timeline/ical-export.ts`)
- Google Calendar sync (`lib/scheduling/calendar-sync.ts`)

**Data source?** No external data source needed. All timing data is already computed internally. The gap is delivery mechanism (push notifications, ICS VALARM entries, or calendar event reminders).

**Client-collaborative angle:** Minimal. The client does not know when the chef needs to start brining. However, if the client changes serve time or guest count, ChefFlow already recomputes the prep timeline, which should cascade to update any active reminders.

**Physical reality:** This is a "wake up and start working" moment. Phone alarm is the current workflow. The chef's hands are clean at this point (pre-prep). A phone notification or alarm is the right interface. Voice (Remy announcing "Time to start the brine for the Johnson dinner") would be ideal for hands-free kitchen moments.

**Compounding:** Medium. The prep timeline itself compounds (recipes encode prep times permanently), but individual reminders are per-event. However, the pattern of "always remind me X hours before for this type of component" could become a preference.

**Solution design:**

- Add VALARM entries to prep timeline ICS export so each prep day/block triggers a calendar reminder at the computed start time
- Surface prep block start times as push-ready events via Google Calendar sync (already syncs events; extend to sync prep blocks with reminder triggers)
- Add a "Remind me" toggle per prep block on the prep timeline UI that creates a calendar reminder via the existing ICS/Google Calendar infrastructure
- Future: Remy voice prompt at prep block start time ("Time to start the brine for Saturday's dinner")
- Chef preference: default reminder lead time (e.g., "always remind me 15 min before each prep block starts")

**Where it appears:**

- Event detail page, Prep tab (prep timeline view)
- Dashboard prep prompts widget (already surfaces nudges, but only when chef visits dashboard)
- Calendar sync (Google Calendar, Apple Calendar via ICS)
- Morning briefing (already includes prep timers at `#346` in never-leaves)

**What remains as permanent exit:**
Phone-native alarm for truly critical wake-up calls (e.g., 5 AM starts). Calendar reminders cover 90% of cases, but some chefs will still set a redundant phone alarm for high-stakes timing. The physical alarm clock/phone alarm is muscle memory that may persist even after ChefFlow covers the notification.

**Priority:** High frequency (every event with advance prep) x Low effort (ICS VALARM is trivial; Google Calendar reminder flag is one field) = **HIGH priority, LOW effort**
**Spec needed?** No. Implementation is straightforward extension of existing ICS export and calendar sync. Add to reclassification sprint doc.

---

## Scenario #88: Time zone math for destination events

**Original classification:** Reducible (from source: "Event timezone field with auto-adjusted prep timeline")
**Reclassified to:** Reducible

**NEEDS-DEVELOPER-REVIEW**

**Why chef leaves:** Chef is flying to a client in another time zone. Every prep calculation (when to start brining, when to leave for the venue, when groceries need to arrive) must account for the destination time zone, not the chef's home time zone. The chef currently opens Google or a world clock app to manually convert times.

**Context ChefFlow has:**

- `event_timezone` field on events table (already exists in schema, stored as IANA timezone string)
- `normalizeEventTimezoneTruthValue()` in `lib/events/time-truth.ts` with validation via `Intl.DateTimeFormat`
- Chef's home timezone stored on `chefs` table (`timezone` field, default `America/New_York`)
- Google Calendar sync already uses `event_timezone` for DTSTART/DTEND TZID
- ICS generator supports timezone parameter
- Timeline engine computes everything relative to event date/time (pure date arithmetic)
- Business hours configuration has timezone field
- Prep timeline, DOP schedule, and prep prompts all work off event date/serve time

**Data source?** Yes, but already sourced. The Intl API provides timezone conversion natively in JavaScript. No external API needed. ChefFlow already validates IANA timezone strings.

**Client-collaborative angle:** Strong. The client (or venue/partner) knows the event timezone. Dinner Circle event hub already collects location data. When a location address is provided, the timezone could be auto-detected from the zip/city. The client confirming "event is at 7 PM Pacific" removes all ambiguity.

**Physical reality:** Screen-based. The chef reviews the prep timeline on a laptop or phone while planning travel. Large text showing "All times in Pacific (PT). Your home time: Eastern (ET)" with optional dual-time display would eliminate confusion.

**Compounding:** Medium. Destination events are infrequent for most private chefs (a few per year), but the venue profile (which already exists) can store the timezone permanently. A returning destination client's timezone is known forever.

**Solution design:**

- Auto-detect timezone from event location (zip code or city/state) when `event_timezone` is null and location is provided. A simple US zip-to-timezone lookup table covers 95% of cases.
- Display timezone badge on event detail page when `event_timezone` differs from chef's home timezone (e.g., "PST, 3h behind you")
- Render all prep timeline times with dual display: event-local time primary, chef-home-time secondary (parenthetical)
- Travel plan (`lib/travel/`) already has departure/arrival times; annotate with timezone context
- Prep prompts should respect event timezone: "Start brine at 6 AM Pacific (9 AM your time)"
- Venue profile: persist timezone so returning destination events auto-populate

**Where it appears:**

- Event detail page header (timezone badge when cross-timezone)
- Prep timeline (dual-time rendering)
- Travel plan section
- DOP schedule
- Morning briefing
- Calendar sync (already handled via `event_timezone` TZID)

**What remains as permanent exit:**
Nothing meaningful. JavaScript's Intl API handles all timezone math. Once the event timezone is known (auto-detected or client-provided), every time surface adjusts automatically. The chef never needs to open a world clock.

**Priority:** Low frequency (destination events are rare) x Low effort (timezone field exists, Intl API is native) = **MEDIUM priority, LOW effort**
**Spec needed?** No. The `event_timezone` field and normalization already exist. Implementation is display-layer work (dual-time rendering, auto-detection from location). Add to reclassification sprint doc.

---

## Scenario #89: Find a commissary/commercial kitchen to rent

**Original classification:** Partially Reducible (from source: "Venue profiles with commissary type; search is permanent exit")
**Reclassified to:** Partially Reducible

**NEEDS-DEVELOPER-REVIEW**

**Why chef leaves:** Chef needs licensed commercial kitchen space for large-scale prep or meal-prep business operations. This is a real estate/marketplace search: availability, pricing, licensing, equipment, location, hours. The chef searches Google, The Kitchen Door, Craigslist, or local food business networks.

**Context ChefFlow has:**

- Venue profiles (`lib/venues/recon-types.ts`) with `venue_type` enum that already includes `'commercial_kitchen'`
- Venue profile fields: address, kitchen_notes, equipment_available, oven_type, oven_count, burner_count, counter_space_rating, has_full_kitchen, has_refrigeration, has_freezer, has_running_water, refrigeration_notes, parking_notes, access_instructions, power_outlets, water_access, photos, quirks, notes
- Visit tracking (visit_count, last_visited_at)
- Chef's region/location (account-anchored location with default zip)
- `VenueReconChecklist` for structured kitchen assessment

**Data source?** Yes, but complex. Commercial kitchen rental is a fragmented marketplace. The Kitchen Door has some listings; Google Maps has POI data. There is no single comprehensive API for commissary rentals. This is closer to apartment hunting than weather lookup.

**Client-collaborative angle:** None directly. However, other chefs in the ChefFlow network could share commissary intel (a future collaborative feature). Partners/venues could list their commercial kitchens as available for rent.

**Physical reality:** Desktop research task. Chef searches, calls, visits in person. The physical tour of a commissary kitchen is irreplaceable (checking cleanliness, actual equipment condition, neighborhood safety, loading access).

**Compounding:** Very high. Once a chef finds a good commissary, they use it for years. The venue profile captures everything about that kitchen. The SEARCH is low-compounding (done once or twice), but the RESULT (the chosen commissary's profile) compounds across hundreds of prep sessions. ChefFlow should make the "after you find it" experience perfect.

**Solution design:**

- Enrich venue profile creation for `commercial_kitchen` type: add fields for rental rate, availability hours, licensing info, contact person, booking method, and minimum rental period
- Pre-populate "Add commissary" flow with structured fields that matter (walk-in cooler size, hood ventilation, shared vs. private, health department compliance status)
- After chef finds a commissary externally: one-tap "Save commissary" from venue profile page with all relevant fields
- Tag prep blocks with commissary venue when large-scale prep is planned at a commercial kitchen
- Show commissary details inline on prep timeline when a prep block is assigned to a commissary location
- Future (partner integration): commercial kitchen partners could list their spaces, making the search partially internal

**Where it appears:**

- Venues page (filtered by `commercial_kitchen` type)
- Venue profile detail page (enriched fields for commissary)
- Prep block assignment (link a prep block to a commissary venue)
- Travel plan (include commissary as a stop)

**What remains as permanent exit:**
The initial SEARCH for a commissary kitchen to rent remains external. ChefFlow is not a commercial kitchen marketplace and should not become one. Google, The Kitchen Door, local food business networks, and word-of-mouth are the discovery channels. ChefFlow captures the result, not the search.

**Priority:** Low frequency (once every few years per chef) x Medium effort (venue profile enrichment for commissary type) = **LOW priority, MEDIUM effort**
**Spec needed?** No. The venue profile system already supports `commercial_kitchen` type. Enrichment is additive field work. Add to reclassification sprint doc.

---

## Scenario #90: Check parking/loading dock logistics at venue

**Original classification:** Reducible + Client-Collaborative (from source: "Venue profile notes (access, parking, loading)")
**Reclassified to:** Reducible + Client-Collaborative

**NEEDS-DEVELOPER-REVIEW**

**Why chef leaves:** Chef needs to know: Can I park a van? Is there a loading dock? How do I get 50+ lbs of equipment from vehicle to kitchen? Where is the service entrance? Are there time restrictions on loading? The chef currently checks Google Maps Street View, calls the venue, or asks the client. This is critical logistics for every event at a new venue.

**Context ChefFlow has:**

- Venue profiles with `parking_notes` and `access_instructions` fields (`lib/venues/recon-types.ts`)
- `VenueReconChecklist` with `hasParking` boolean
- Dinner Circle arrival guide (`lib/dinner-circles/arrival-guide.ts`) with dedicated sections:
  - `parking`: "Street, garage, permit, driveway, validation, or tow-zone notes"
  - `elevator_loading_notes`: "Service elevator, load-in path, loading dock, carts, stairs, or timing restrictions"
  - `building_gate_access`: "Gate, keypad, doorman, callbox, concierge, or access-code instructions"
  - `entry_instructions`: "Which door to use, where to wait, who opens"
- Stewardship system categorizes "timing_access" messages from clients
- Event hub stores `access_instructions`, `location_notes`
- Client profile can store security info (gate code, WiFi, parking, house rules) at `#73` in never-leaves
- Experience modules prompt client: "Access and parking notes can be updated before the final check"

**Data source?** Partially. Google Maps/Street View can show exterior parking and loading areas. But the real intel (service elevator hours, doorman procedures, building management rules, best unloading spot) comes from the client or building management, not any API.

**Client-collaborative angle:** Very strong. This is the textbook Circle collection scenario. The client/host LIVES there or booked the venue. They know:

- Where to park a larger vehicle
- Whether there's a loading dock or service entrance
- Elevator restrictions (service elevator hours, freight elevator availability)
- Building management contact for access
- Time restrictions on loading/unloading
- Whether the chef needs a parking permit or validation

The Dinner Circle arrival guide already has the exact sections for this. The gap is ensuring these sections are prompted early enough and that the chef sees venue-specific logistics prominently.

**Physical reality:** The chef reviews this on their phone in the car before arriving, or the night before while packing. Large text, glanceable format. A printed "venue brief" with parking map/instructions would be ideal for the dashboard of the van. Voice (Remy reading the arrival guide) while driving is the hands-free bridge.

**Compounding:** Very high. Visit a venue once, know it forever. The venue profile persists across all future events at that location. Every subsequent event at the same building skips this entire exit. Client profiles accumulate residential access intel. The 10th event at a client's home has zero logistics friction.

**Solution design:**

- Ensure Dinner Circle arrival guide sections (parking, elevator/loading, building access) are prompted to the host during event setup, not just before the event
- Surface venue logistics prominently on event detail page: dedicated "Venue Access" card showing parking, loading, and access notes from both the venue profile and the current event's arrival guide
- Auto-populate venue logistics from venue profile when an event address matches a known venue
- After first visit: prompt chef to capture loading/parking intel into the venue profile ("How was parking? Any loading notes for next time?")
- Print-friendly venue brief: one-page PDF with address, parking, loading path, access codes, and contact info
- Remy: "Your next event is at 123 Main St. Parking is in the rear lot, loading dock on the east side, use the service elevator to floor 3."

**Where it appears:**

- Event detail page, Logistics section (venue access card)
- Dinner Circle arrival guide (host fills in parking, loading, access)
- Venue profile page (persistent parking/loading notes)
- Pre-event checklist / DOP schedule ("Confirm venue access")
- Travel plan (inline venue notes at destination stop)
- Print: venue brief PDF
- Voice: Remy pre-arrival briefing

**What remains as permanent exit:**
First-visit reconnaissance at a brand new venue type (e.g., a large event hall the chef has never seen). Google Maps Street View is useful for a preview of the exterior. The chef may still want to do a physical walkthrough before the event. But for residential clients and repeat venues, this exit disappears completely after one visit.

**Priority:** High frequency (every new venue) x Low effort (infrastructure already exists in arrival guide + venue profiles) = **HIGHEST priority, LOWEST effort**
**Spec needed?** No. All infrastructure exists. This is a wiring/surfacing task: ensure arrival guide data flows to the event detail page and venue profile, and prompt early enough in the Circle timeline. Add to reclassification sprint doc.

---

## Batch Summary

| #   | Title                                         | Reclassified To                  | Spec Needed? |
| --- | --------------------------------------------- | -------------------------------- | ------------ |
| 87  | Set prep timing reminders/alarms              | Partially Reducible              | No           |
| 88  | Time zone math for destination events         | Reducible                        | No           |
| 89  | Find a commissary/commercial kitchen to rent  | Partially Reducible              | No           |
| 90  | Check parking/loading dock logistics at venue | Reducible + Client-Collaborative | No           |

### Classification Breakdown

- Reducible: 1
- Reducible + Client-Collaborative: 1
- Partially Reducible: 2
- Bridgeable: 0
- Permanent: 0

### Key Findings

1. **#90 (parking/loading) is the highest-impact, lowest-effort item.** All infrastructure already exists (arrival guide, venue profiles, venue recon). This is pure wiring: surface the data already being collected in the right place at the right time.

2. **#87 (prep reminders) has 90% of the compute engine built.** The prep timeline, prep blocks, and prep prompts all exist. The gap is purely delivery mechanism: push the computed times to the chef's phone/calendar via VALARM in ICS exports or Google Calendar reminders.

3. **#88 (timezone) is already 80% solved.** The `event_timezone` field exists on events, normalization and validation exist, Google Calendar sync already uses it. The remaining work is display-layer: show dual-time when cross-timezone.

4. **#89 (commissary search) is correctly identified as partially reducible.** ChefFlow should not become a commercial kitchen marketplace. The venue profile system already supports `commercial_kitchen` type. Enrich the "after you find it" experience.

5. **Dinner Circles are the secret weapon for #90.** The arrival guide already has parking, loading, elevator, and access sections. The client provides this information before the chef ever needs to search for it. This is the canonical "question answered before it's asked" pattern.
