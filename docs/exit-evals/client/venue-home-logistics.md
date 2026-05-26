# Exit Eval: Client / VENUE, HOME & LOGISTICS

> Wave 2 | 8 scenarios | Role: CLIENT
> Evaluator: Claude (Solo mode)
> Date: 2026-05-25
> Status: NEEDS-DEVELOPER-REVIEW

---

## Scenario #68: Share home access details

**Original classification:** Reducible with secure event access fields
**Reclassified to:** Reducible + Client-Collaborative

**Why client leaves:** Client needs to communicate sensitive access information (gate codes, door codes, elevator instructions, parking directions) to the chef before the event. They text or email because there is no obvious secure place in the portal to store it.

**Context ChefFlow has:**

- Event date, time, location address
- Client profile (with gate_code, wifi_password, security_notes, parking_instructions, access_instructions fields already in schema)
- Venue profiles with `access_instructions`, `parking_notes` fields
- Dinner Circle arrival guide with 12 structured sections including `building_gate_access`, `entry_instructions`, `elevator_loading_notes`
- VenueDetailsPanel with gate code, access instructions, directions from road fields

**Data source?** No. This is client-provided knowledge, not an external API.

**Client-collaborative angle:** The client IS the source. Dinner Circle arrival guide already defines structured collection for: address, parking, building/gate access, entry instructions, elevator/loading notes, arrival contact, house rules. The `SecurityAccessPanel` component (`components/clients/security-access-panel.tsx`) stores gate_code, wifi_password, security_notes, parking_instructions, access_instructions, house_rules on the client record. The pre-event checklist (`app/(client)/my-events/[id]/pre-event-checklist/page.tsx`) already exists as a client-facing confirmation page.

**Physical reality:** Screen-based. Client fills in details at home before the event. Chef references on mobile day-of (large text, glance-friendly). Sensitive data (codes) should be masked until needed.

**Compounding:** HIGH. Client's home access details rarely change. Capture once, reuse for every future event at that location. The venue profile system (`lib/venues/recon-actions.ts`) already tracks visit_count and last_visited_at.

**Solution design:**

- Wire client-facing "Access Details" form into the pre-event checklist flow (client portal already has the page)
- Auto-populate from client profile's existing security/access fields on repeat bookings
- Surface in chef's event detail via existing VenueDetailsPanel and SecurityAccessPanel
- Mark sensitive fields (codes) as masked-by-default with reveal toggle (already built in SecurityAccessPanel)
- Auto-link to venue profile for compounding across events at same address

**Where it appears:**

- Client portal: `/my-events/[id]/pre-event-checklist` (extend existing page)
- Chef event detail: VenueDetailsPanel + SecurityAccessPanel (already built)
- Dinner Circle arrival guide: `building_gate_access` section (already defined)

**What remains as permanent exit:**
Nothing. All data is client-sourced and all collection/display surfaces exist. Only wiring gap remains.

**Priority:** High frequency (every event at a private home) x Low effort (surfaces exist, need client-facing form wiring) = HIGH
**Spec needed?** No. Infrastructure exists. Needs wiring task only.

---

## Scenario #69: Check venue rules

**Original classification:** Bridgeable with document upload and event packet
**Reclassified to:** Reducible + Client-Collaborative

**Why client leaves:** Client goes to a venue's website, PDF, or email to find noise restrictions, curfews, catering policies, setup/teardown windows, or alcohol rules. They need this to tell the chef what constraints exist.

**Context ChefFlow has:**

- Event location and venue profile
- VenueDetailsPanel with `property_rules` (array of strings), `pet_policy`, `rain_backup_plan`
- Dinner Circle arrival guide with `house_rules` section
- Document upload capability via media vault (`lib/media/vault-actions.ts`)
- Event packet system (`components/documents/event-packet-drawer.tsx`)

**Data source?** No. Venue rules are venue-provided documents or client knowledge. Not available via API.

**Client-collaborative angle:** Strong. The client often already has the venue's rules PDF or knows the key constraints from their rental contract. The Dinner Circle `house_rules` section prompts: "Pets, shoes, smoking, photos, quiet hours, rooms off-limits, or safety expectations." The VenueDetailsPanel already captures `property_rules` as a structured list. Client can provide these directly instead of chef hunting for them.

**Physical reality:** Screen-based. Rules are text documents. Chef may want a printed copy for day-of reference. PDF upload is the natural format for venue contracts.

**Compounding:** HIGH. Venue rules rarely change. Once captured in a venue profile, they apply to every event at that location. The venue profile system already tracks this per-tenant.

**Solution design:**

- Add "Venue Rules" upload slot in client pre-event form (accept PDF, photos of posted rules)
- Auto-map to venue profile `property_rules` for reuse
- Show rules in chef's VenueDetailsPanel (already rendering)
- Allow client to type key constraints (noise cutoff time, setup window, no open flames) into structured fields
- Include in event packet PDF generation for day-of print

**Where it appears:**

- Client portal: pre-event checklist or event detail page
- Chef event detail: VenueDetailsPanel `property_rules` section (already rendering)
- Event packet: include rules section in generated PDF

**What remains as permanent exit:**
Client may still need to check the venue's website for updated policies or new restrictions not yet captured. First-time venues always require initial discovery.

**Priority:** Medium frequency (venue events, not home events) x Low effort (property_rules field exists) = MEDIUM-HIGH
**Spec needed?** No. Mostly wiring of existing fields to client-facing input.

---

## Scenario #70: Confirm parking/loading

**Original classification:** Bridgeable with access notes and maps
**Reclassified to:** Reducible + Client-Collaborative

**Why client leaves:** Client checks Google Maps Street View, texts the venue, or emails the building manager to confirm where the chef can park a vehicle, unload equipment, and whether there is a loading dock or service entrance. The chef needs this to plan arrival logistics.

**Context ChefFlow has:**

- Event location (address, lat/lng for map links)
- VenueDetailsPanel: `parking_capacity`, `parking_instructions`, `overflow_plan`, `directions_from_road`
- Venue profile: `parking_notes`, `access_instructions`
- Dinner Circle arrival guide: `parking` section ("Street, garage, permit, driveway, validation, or tow-zone notes"), `elevator_loading_notes` section ("Service elevator, load-in path, loading dock, carts, stairs, or timing restrictions"), `rideshare_dropoff` section
- SecurityAccessPanel: `parkingInstructions` field
- Client intel checklist: `access` category

**Data source?** Partially. Google Maps provides Street View and location context (permanent exit for visual recon). But parking rules and loading instructions come from client/venue knowledge.

**Client-collaborative angle:** Strong. The client or host knows their parking situation better than anyone. The Dinner Circle arrival guide specifically prompts for parking details, elevator/loading notes, and rideshare drop-off points. These sections are designed to be host-filled.

**Physical reality:** Chef needs this on mobile at arrival. Large text, quick-glance format. Map link should open native maps app. Loading instructions may need day-of reference.

**Compounding:** HIGH. Parking at a repeat venue never changes. Venue profile stores and compounds.

**Solution design:**

- Prompt client to fill parking/loading section via pre-event checklist or Dinner Circle arrival guide (infrastructure exists)
- Auto-populate from venue profile on repeat bookings at same address
- Include "Loading Zone" field specifically for chef load-in (distinct from guest parking)
- Provide Google Maps deep-link from event detail (already has lat/lng)
- Show in mobile-optimized format on chef's day-of view

**Where it appears:**

- Client portal: pre-event checklist "Parking & Access" section
- Chef event detail: VenueDetailsPanel parking section (already rendering)
- Dinner Circle: `parking` and `elevator_loading_notes` channels (already defined)
- Day-of mobile view: event live page

**What remains as permanent exit:**
Visual recon via Google Maps Street View for first-time venues. Chef may still drive by to confirm. Map navigation to the location itself.

**Priority:** High frequency (every event) x Low effort (all fields exist) = HIGH
**Spec needed?** No. Wiring task to surface existing fields to client input.

---

## Scenario #71: Share kitchen photos

**Original classification:** Reducible with portal upload
**Reclassified to:** Reducible + Client-Collaborative

**Why client leaves:** Client takes photos of their kitchen (stove, counter space, fridge, outlet locations) and sends them via text or email so the chef can plan what to bring. Photos live on their phone and there is no obvious upload destination in the portal.

**Context ChefFlow has:**

- Media vault system (`lib/media/vault-actions.ts`) with full upload, tier assignment, tagging, and cross-event search
- Venue profile: `photos` field (string array) already defined in `VenueProfile` type
- Entity photo upload component (`components/entities/entity-photo-upload.tsx`)
- Client photo gallery (`components/clients/client-photo-gallery.tsx`)
- Event photo gallery for chef and client portal
- VenueDetailsPanel with setup zones (kitchen_zone, dining_zone, bar_zone)

**Data source?** No. Photos are client-captured, stored on their phone.

**Client-collaborative angle:** Perfect fit. The client takes the photos. They just need a place to upload them that the chef can see. The venue profile already has a `photos: string[]` field. The media vault supports `raw` tier uploads tagged by venue.

**Physical reality:** Mobile upload (client takes photo on phone, uploads immediately). Chef reviews on laptop during planning. May reference on mobile day-of to remember layout. Photo should be zoomable for detail.

**Compounding:** HIGH. Kitchen photos rarely change. Upload once per venue/client home, reference forever. Venue profile compounding across events.

**Solution design:**

- Add "Kitchen Photos" upload button in client pre-event checklist (use existing entity-photo-upload component)
- Store in venue profile `photos` array, tagged as "kitchen"
- Show in chef's VenueDetailsPanel or dedicated kitchen layout section
- Auto-carry to future events at same location
- Allow client to annotate photos (circle the outlet, mark the available counter space)

**Where it appears:**

- Client portal: pre-event checklist with photo upload action
- Chef event detail: venue profile photos section
- Chef planning view: equipment/logistics planning

**What remains as permanent exit:**
Nothing for existing kitchens. New clients at new venues still use their phone camera (that is the capture device, not an exit).

**Priority:** Medium frequency (mostly first-time clients/venues) x Low effort (photo upload infrastructure fully built) = MEDIUM-HIGH
**Spec needed?** No. Wire existing upload components to client portal venue context.

---

## Scenario #72: Confirm equipment availability

**Original classification:** Reducible with pre-event checklist
**Reclassified to:** Reducible + Client-Collaborative

**Why client leaves:** Chef asks "do you have a stand mixer?" or "how many burners does your stove have?" and the client checks their kitchen, then texts back. Multiple back-and-forth messages. Client may not know what the chef actually needs to know.

**Context ChefFlow has:**

- Venue profile type: `equipment_available` (string array), `oven_type`, `oven_count`, `burner_count`, `counter_space_rating` (1-5), `has_full_kitchen`, `has_refrigeration`, `has_freezer`, `has_running_water`, `refrigeration_notes`, `power_outlets`, `water_access`
- VenueReconChecklist: hasOven, hasGrill, hasStoveTop, hasRunningWater, hasPowerOutlets, hasRefrigeration, hasCounterSpace, hasParking
- Client intel checklist: `kitchen` category with `kitchen_quality` field (basic/decent/well_equipped/professional)
- Equipment checklist actions (`lib/events/equipment-checklist-actions.ts`)
- Pre-event checklist page for clients (already exists)
- VenueDetailsPanel with infrastructure section (power, water, kitchen zone)

**Data source?** No. This is physical inspection knowledge from the client.

**Client-collaborative angle:** Perfect fit. The client knows their own kitchen. ChefFlow should present a structured checklist of what the chef needs to know (not open-ended questions). The VenueReconChecklist type already defines the exact boolean fields. The client can check boxes and add notes. Chef never needs to ask.

**Physical reality:** Client fills checklist at home (standing in kitchen, phone in hand). Simple yes/no checkboxes work perfectly. Chef references during planning phase on desktop.

**Compounding:** HIGH. Kitchen equipment at a repeat client's home never changes (unless they renovate). Capture once, serve forever. The venue profile already tracks this with visit_count.

**Solution design:**

- Build client-facing "Kitchen Equipment Survey" using VenueReconChecklist fields (checkboxes: oven, grill, stovetop, running water, outlets, fridge, counter space, parking)
- Auto-generate from menu requirements (if menu has items needing oven, ask about oven)
- Present in pre-event checklist flow before event
- Store in venue profile for reuse; auto-populate on repeat bookings
- Chef sees filled-in venue profile on event detail (already renders in VenueDetailsPanel)

**Where it appears:**

- Client portal: pre-event checklist "Kitchen Equipment" section
- Chef event detail: VenueDetailsPanel infrastructure section (already built)
- Venue profile: equipment_available, boolean fields (already in schema)

**What remains as permanent exit:**
Nothing. Client fills checklist, chef sees data. Zero texts needed.

**Priority:** High frequency (every first event at client's home) x Low effort (schema and display exist, need client-facing input form) = HIGH
**Spec needed?** No. Schema and display exist. Wire client-facing form using existing VenueReconChecklist type.

---

## Scenario #73: Coordinate building security

**Original classification:** Permanent exit. Store instructions and contact.
**Reclassified to:** Partially Reducible

**Why client leaves:** Client contacts their building's concierge, HOA, or security desk to arrange service entrance access, loading dock timing, freight elevator booking, or visitor passes for the chef and staff. This involves external systems (building portals, concierge calls, HOA emails).

**Context ChefFlow has:**

- Dinner Circle arrival guide: `building_gate_access` section ("Gate, keypad, doorman, callbox, concierge, or access-code instructions"), `elevator_loading_notes` section ("Service elevator, load-in path, loading dock, carts, stairs, or timing restrictions"), `arrival_contact` section ("Name, phone, backup contact, or preferred arrival channel")
- SecurityAccessPanel: gate_code, security_notes, access_instructions
- VenueDetailsPanel: gate_code, access_instructions
- Venue profile: access_instructions field
- Client intel checklist: `access` category

**Data source?** No. Building security systems are external and varied (apps, phone calls, portals). No API integration possible.

**Client-collaborative angle:** Strong. The client is the building resident. They coordinate with their own building and relay the result (access code, concierge name, arrival protocol). ChefFlow should capture the OUTPUT of that coordination, not try to replace the coordination itself.

**Physical reality:** Client makes phone calls or uses building app. Result is text-based instructions. Chef needs them on mobile at arrival time. Large text, quick reference.

**Compounding:** HIGH. Building security protocols are stable. Same concierge, same access procedure. Capture once per building/client.

**Solution design:**

- Prompt client: "How does your building handle service providers?" in pre-event checklist
- Structured fields: concierge name/number, access code, freight elevator hours, visitor pass requirements, arrival protocol
- Store in venue profile `access_instructions` and client record `security_notes`
- Auto-populate on repeat events at same building
- Show in chef's day-of mobile view with one-tap call to concierge

**Where it appears:**

- Client portal: pre-event checklist "Building Access" section
- Chef event detail: SecurityAccessPanel (already built)
- Dinner Circle: `building_gate_access` channel (already defined)
- Day-of mobile: arrival card with concierge contact

**What remains as permanent exit:**
Client still physically coordinates with their building (calls concierge, books freight elevator, arranges passes). ChefFlow captures the result but cannot replace the building's own systems.

**Priority:** Medium frequency (apartment/condo events only) x Low effort (fields exist, need client-facing prompt) = MEDIUM
**Spec needed?** No. Capture fields exist. Add structured building security prompt to pre-event client flow.

---

## Scenario #74: Book cleaning service

**Original classification:** Permanent exit. Store timing dependencies.
**Reclassified to:** Bridgeable

**Why client leaves:** Client books a cleaning service to come after the event (or before, for setup). They use a cleaning app, text their regular cleaner, or browse marketplace sites. This is a non-food vendor coordination task entirely outside ChefFlow's scope.

**Context ChefFlow has:**

- Event timeline generator (`lib/events/timeline-generator-actions.ts`, `lib/events/timeline-estimator.ts`)
- Event vendor coordination section (`components/events/vendor-coordination-section.tsx`)
- Support network system (`lib/support-network/event-network.ts`) for tracking external vendor contacts
- Task auto-generation (`lib/tasks/auto-generate.ts`) with cleaning service references
- Post-event jobs (`lib/jobs/post-event-jobs.ts`)
- Event playbook actions (`lib/events/playbook-actions.ts`)

**Data source?** No. Cleaning services are booked through their own platforms, apps, or phone calls.

**Client-collaborative angle:** Minimal. Client books independently. ChefFlow only needs to know: what time cleaner arrives (so chef knows cleanup deadline) and whether cleaner handles kitchen or just living areas. This is timing coordination, not booking.

**Physical reality:** Client uses phone/app to book. Result is a time window. Chef needs to know the window for event timeline planning.

**Compounding:** LOW. Cleaning timing varies per event. The vendor contact may compound (same cleaner reused), but the booking itself is one-off.

**Solution design:**

- Add "Post-Event Vendors" section in event timeline: cleaner arrival time, scope (kitchen included?)
- Include in pre-event checklist: "Is a cleaning service coming after? What time?"
- Factor cleaning window into event timeline (chef knows when to be out)
- Store cleaner contact in support network for repeat bookings

**Where it appears:**

- Client portal: pre-event checklist "After the Event" section
- Chef event detail: timeline view (existing)
- Vendor coordination section: timing dependency note

**What remains as permanent exit:**
All of it. Client still books their own cleaner through their own channels. ChefFlow just captures the timing constraint.

**Priority:** Low frequency (occasional, not every event) x Low effort (simple time field) = LOW
**Spec needed?** No. Add optional "cleaner arrival time" field to event timeline.

---

## Scenario #75: Check weather for outdoor event

**Original classification:** Bridgeable with event weather widget
**Reclassified to:** Reducible

**Why client leaves:** Client checks a weather app or weather.com to decide whether to move an outdoor event indoors, add tent rentals, change timing, or prepare guests for conditions. They want to make informed decisions about the event format based on the forecast.

**Context ChefFlow has:**

- Full weather system built on Open-Meteo API (free, no key required):
  - `lib/events/weather-actions.ts`: 3-day forecast window centered on event day, outdoor detection
  - `lib/weather/weather-snapshot-actions.ts`: capture/retrieve weather snapshots, history, chef notes
  - `lib/weather/weather-checklist.ts`: auto-generated checklist items based on forecast (rain, wind, heat, cold, snow, thunderstorm)
  - `lib/weather/weather-checklist-actions.ts`: actions for checklist
  - `lib/weather/weather-alert-enrichment.ts`: enriched alerts
  - `lib/weather/solar-times.ts`, `lib/weather/solar-actions.ts`: sunrise/sunset
  - `lib/weather/cooking-advisories.ts`, `lib/weather/cooking-advisory-actions.ts`: cooking-specific weather impacts
- Weather UI components:
  - `components/events/weather-widget.tsx`: 3-day forecast cards with temp, precip, wind
  - `components/events/weather-forecast-card.tsx`: event forecast card with alerts
- VenueDetailsPanel: `rain_backup_plan` field
- Event weather detection: `detectOutdoor()` function using occasion keywords and venue type
- `inferEventType()` function for outdoor/indoor classification

**Data source?** YES. Open-Meteo API (free, no key). Already fully integrated. Weather data is sourced automatically for events within 7 days.

**Client-collaborative angle:** Minimal for weather data itself. But the DECISION (move indoors? add tent? change time?) involves client and chef collaboration. The `rain_backup_plan` field captures the contingency.

**Physical reality:** Client checks weather on phone before event. The existing weather widget provides all needed data (temp high/low, precip probability, wind speed, condition) in a visual 3-day card format.

**Compounding:** LOW for weather data (always fresh). HIGH for contingency plans (rain backup plans compound across events at same venue).

**Solution design:**

- Already built. Weather widget shows 3-day forecast on event detail.
- Expose weather widget in CLIENT portal event detail (currently chef-only?)
- Add "Weather Decision" prompt: if precip > 40%, surface rain backup plan field to client
- Auto-generate weather-conditional checklist items (already built in weather-checklist.ts)
- Include weather summary in client notifications 48h before outdoor event

**Where it appears:**

- Chef event detail: WeatherWidget and WeatherForecastCard (already built and rendering)
- Client portal: event detail or countdown page (needs wiring)
- Notifications: pre-event weather alert to client (48h before outdoor event)
- Pre-event checklist: weather contingency confirmation

**What remains as permanent exit:**
Nothing meaningful. Open-Meteo provides all forecast data. Client no longer needs weather.com.

**Priority:** Medium frequency (outdoor events only, seasonal) x Already built (just needs client-facing exposure) = MEDIUM-HIGH
**Spec needed?** No. Weather system is complete. Wire to client portal and add notification trigger.

---

## Batch Summary

| #   | Title                           | Reclassified To                  | Spec Needed? |
| --- | ------------------------------- | -------------------------------- | ------------ |
| 68  | Share home access details       | Reducible + Client-Collaborative | No           |
| 69  | Check venue rules               | Reducible + Client-Collaborative | No           |
| 70  | Confirm parking/loading         | Reducible + Client-Collaborative | No           |
| 71  | Share kitchen photos            | Reducible + Client-Collaborative | No           |
| 72  | Confirm equipment availability  | Reducible + Client-Collaborative | No           |
| 73  | Coordinate building security    | Partially Reducible              | No           |
| 74  | Book cleaning service           | Bridgeable                       | No           |
| 75  | Check weather for outdoor event | Reducible                        | No           |

## Key Findings

**ChefFlow's venue/home/logistics infrastructure is remarkably complete.** The codebase already has:

1. **Venue profiles** with all relevant fields (access, parking, equipment, photos, rules, visit history)
2. **Dinner Circle arrival guide** with 12 structured sections covering every logistics detail
3. **SecurityAccessPanel** with gate codes, wifi, parking, access, house rules
4. **VenueDetailsPanel** with parking, access, zones, infrastructure, rules, weather backup
5. **Pre-event checklist** client-facing page already built
6. **Weather system** fully integrated (Open-Meteo API, 3-day forecast, checklists, alerts)
7. **Media vault** for photo uploads with tier management
8. **Equipment checklist** system with structured boolean fields

**The primary gap is client-facing input wiring.** All storage and chef-facing display is built. What is missing:

- Client-facing forms in the pre-event checklist that prompt for venue details
- Auto-population from venue profile on repeat bookings
- Weather widget exposure in client portal
- Notification triggers for weather decisions on outdoor events

**7 of 8 scenarios need NO new spec** because infrastructure exists. The work is wiring existing systems to the client portal input flow.

**Compounding is the story.** 6 of 8 scenarios have HIGH compounding. The venue profile system already supports this with visit_count and address-based matching. Once wired to client input, the 50th event at a venue should require zero logistics communication.
