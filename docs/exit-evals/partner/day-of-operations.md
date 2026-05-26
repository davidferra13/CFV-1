# Exit Eval: Partner / DAY-OF OPERATIONS

> Wave 5 | 5 scenarios | Role: PARTNER
> Status: `NEEDS-DEVELOPER-REVIEW` (solo mode, no chef input)
> Date: 2026-05-25

---

## Scenario #52: Coordinate arrival/loading day-of

**Original classification:** Permanent
**Reclassified to:** Partially Reducible

**Why partner leaves:** The partner (venue host, Airbnb owner, concierge) needs to coordinate the physical logistics of the chef's arrival: which entrance, what time the chef can start loading, who will be on-site to open doors, whether the service elevator is available, where to unload equipment. This is a real-time physical coordination problem that typically happens over phone/text/radio because timing windows shift and both parties are mobile.

**Context ChefFlow has:**

- Event date, serve time, arrival time (`events.serve_time`, `events.arrival_time`)
- Full location address, city, state, zip from `partner_locations` table
- Venue details: gate code, access instructions, parking instructions, directions from road (`event_venue_details` table via `lib/events/venue-details-actions.ts`)
- Arrival guide with 12 structured sections: address, parking, building/gate access, entry instructions, elevator/loading notes, arrival contact, arrival window (`lib/dinner-circles/arrival-guide.ts`)
- Partner location metadata: max guest count, experience tags, service types
- Drive briefing with map URL for the chef (`lib/mobile/drive-briefing.ts`)
- Event Day Dashboard with arrival phase tracking (`lib/operations/event-day-actions.ts`)

**Data source?** No. This is coordination between two humans in physical space, not an API problem.

**Client-collaborative angle:** The partner IS the collaborator here. The Dinner Circle arrival guide (`lib/dinner-circles/arrival-guide.ts`) already has `host_and_chef` visibility sections specifically for this. The partner/host can pre-fill elevator/loading notes, arrival contact, and arrival window. The gap is that the partner portal does not currently surface or allow editing of arrival guide data for upcoming events at their locations.

**Physical reality:** This is the quintessential "both parties are mobile, hands may be full" scenario. Voice or text is natural. A confirmed arrival window visible to both parties (partner sees "Chef arriving 2:30-3:00, will text on approach") reduces the back-and-forth. Print is irrelevant here; push notifications or SMS confirmations would be the digital bridge.

**Compounding:** High. A venue partner hosts multiple events. Once ChefFlow knows "Building B service elevator, key is with front desk, loading dock on Oak Street, 30-min unload window before 3pm" that knowledge serves every future event at that location. The `partner_locations` table already persists across events. The `event_venue_details` table captures per-event variations.

**Solution design:**

- Surface upcoming confirmed events on partner portal with pre-event coordination card (48h before)
- Allow partner to confirm/update arrival window and on-site contact for specific events from their portal
- Add "arrival confirmed" status visible to chef on Event Day Dashboard
- Store location-level default arrival procedures on `partner_locations` (persistent, compounds)
- Optional: SMS notification when chef marks "en route" (from drive briefing / event day phase)

**Where it appears:**

- Partner portal dashboard (upcoming event card with coordination actions)
- Partner location detail page (default arrival procedures section)
- Chef Event Day Dashboard (partner confirmation status)
- Dinner Circle arrival guide (host sections auto-populated from partner data)

**What remains as permanent exit:**
Real-time voice coordination when plans change last-minute (traffic delay, elevator broken, different entrance needed). Phone/text for urgent same-moment decisions will always exist. ChefFlow reduces the PLANNED coordination; the REACTIVE coordination stays external.

**Priority:** High frequency (every event at partner venue) x Medium effort (surfaces + partner-side form + status sync) = High priority
**Spec needed?** Yes (partner event-day coordination surface)

---

## Scenario #53: Check real-time traffic or directions

**Original classification:** Permanent
**Reclassified to:** Bridgeable

**Why partner leaves:** The partner checks traffic or provides directions context so they can estimate when the chef will arrive, or to relay updated routing info (road closure, construction, better entrance from a specific direction). The partner is trying to answer: "When will they get here?" or "Should I tell them to come from the east side today?"

**Context ChefFlow has:**

- Full location address with lat/lng coordinates (used in `lib/mobile/drive-briefing.ts` to generate Google Maps URL)
- Mapbox integration for static map images (`lib/maps/mapbox.ts`)
- Drive briefing generates navigation link: `https://www.google.com/maps/dir/?api=1&destination=...`
- Arrival time stored on event record
- Directions from road stored in `event_venue_details.directions_from_road`
- Rideshare/dropoff notes in arrival guide

**Data source?** Yes, partially. Traffic data comes from Google Maps/Waze APIs. ChefFlow already generates map links but does not embed real-time traffic. However, the partner's real need is often "tell the chef about a routing issue" rather than checking traffic themselves.

**Client-collaborative angle:** The partner knows their local area: construction seasons, event-day road closures, best approach routes. This is local knowledge that compounds. The arrival guide already has a "rideshare_dropoff" section for pin locations. Adding a "preferred approach route" or "current traffic note" field to the partner's pre-event coordination card would let the partner proactively share this.

**Physical reality:** Partner checks maps on their phone. Standard mobile screen interaction. No special hands-free need on the partner side (they are at the venue waiting, not driving).

**Compounding:** Medium. Location-level directions compound (always approach from Oak Street, avoid Main during rush hour). Event-specific traffic does not compound (one-time conditions).

**Solution design:**

- Display map preview on partner location detail page (using existing Mapbox `getStaticMapUrl`)
- Add "approach notes" field to partner location (persistent local knowledge)
- Pre-event coordination card shows chef's expected arrival time and map link
- Partner can add "day-of routing note" visible to chef (e.g., "Main St closed today, use Oak St entrance")
- Deep link to Google Maps/Waze from partner location page for their own quick reference

**Where it appears:**

- Partner location detail page (map preview + permanent approach notes)
- Partner pre-event coordination card (day-of routing note field)
- Chef drive briefing (displays partner's routing note if present)

**What remains as permanent exit:**
Checking live traffic conditions on Google Maps/Waze. ChefFlow will never be a navigation app. The partner will always leave to see real-time road conditions. ChefFlow's job is to (a) make it one tap to open maps with the right destination, and (b) let the partner communicate routing intel back to the chef without a phone call.

**Priority:** Medium frequency (partner checks when expecting chef) x Low effort (map link + text field) = Medium priority
**Spec needed?** No (small addition to partner coordination surface spec)

---

## Scenario #54: Alert chef to last-minute venue issue

**Original classification:** Permanent
**Reclassified to:** Partially Reducible

**Why partner leaves:** Something breaks at the venue right before or during the event: water main issue, power outage, elevator stuck, oven broken, locked room, neighbor complaint, flooding. The partner needs to reach the chef IMMEDIATELY with actionable information. They grab their phone and call or text because urgency demands the fastest channel.

**Context ChefFlow has:**

- Chef contact information (accessible internally)
- Event status tracking with phases (`lib/operations/event-day-actions.ts`)
- Service issue logging: `ServiceIssue` type with severity levels (low/medium/high) tied to events
- Location alerts system (`lib/locations/alert-actions.ts`) with alert types including `equipment_issue`, severity levels, and resolution tracking
- Contingency/emergency contacts (`lib/contingency/actions.ts`)
- Event Day Dashboard shows issues panel
- Remy escalation system (`lib/remy/snooze-escalation.ts`)

**Data source?** No. This is human-to-human urgent communication about a physical reality.

**Client-collaborative angle:** Limited. The partner is the source of this information. The client may need to know (e.g., "dinner will be 30 min late due to venue issue") but that is a downstream notification, not a collection surface.

**Physical reality:** Urgency dictates the channel. Phone call is fastest. The partner will ALWAYS call for truly urgent issues. However, the AFTER-ACTION capture is where ChefFlow adds value: logging what happened, what was affected, how it was resolved, so it does not happen again.

**Compounding:** High for after-action data. If "Building B elevator breaks every June" or "unit 4B circuit breaker trips with heavy appliance load" gets captured, future events at that venue are safer. The `LocationAlert` system already supports this pattern. Per-location issue history would be extremely valuable.

**Solution design:**

- Add partner-initiated "venue issue" report from partner portal (pre-event and day-of)
- Issue report includes: severity, description, what is affected, current status
- Chef receives push notification / Rail item for partner-reported venue issues
- After resolution, both parties can add notes (creates location knowledge base)
- Location detail page shows issue history (compounds: "this venue has had 2 power issues")
- Quick "call chef" button on partner portal event card (one-tap to chef phone number)

**Where it appears:**

- Partner portal event coordination card ("Report venue issue" button)
- Chef Event Day Dashboard (partner-reported issues appear in issues panel)
- Chef Universal Rail (urgent partner venue alert item, per `partner-rail-registry.ts` pattern)
- Partner location detail page (issue history section)

**What remains as permanent exit:**
The phone call itself. When something is on fire (figuratively or literally), the partner will always call. ChefFlow cannot and should not replace voice for true emergencies. The value is: (1) one-tap to call, (2) structured capture afterward, (3) knowledge compounds into venue safety profile.

**Priority:** Low frequency (rare but high severity) x Medium effort (issue form + notification + history) = Medium-high priority
**Spec needed?** No (folds into partner coordination surface)

---

## Scenario #55: Update guest-facing signage or printed materials

**Original classification:** Permanent
**Reclassified to:** Bridgeable

**Why partner leaves:** The partner needs to update physical materials that guests will see at the venue: a welcome sign with the chef's name, a menu display, directional signage to the dining area, allergy notices, or a guidebook entry about the chef experience. They go to Canva, their printer, or their property binder to create/update these materials.

**Context ChefFlow has:**

- Front-of-house menu PDF generator (`lib/documents/generate-front-of-house-menu.ts`) with clean client-friendly design
- Serving labels generator (`lib/documents/generate-serving-labels.ts`) for containers/plates
- Full menu data: dishes, courses, allergens, dietary tags
- Chef business name, branding
- Event occasion, date, guest count
- Document generation system with PDF layout (`lib/documents/pdf-layout.ts`, `pdf-design-tokens.ts`)
- BEO (Banquet Event Order) generator includes venue and service details
- Print actions for recipes, grocery lists (`lib/print/print-actions.ts`)

**Data source?** Partially. The DATA for signage (menu items, chef name, allergens, event details) all lives in ChefFlow. The DESIGN and PRINTING are external (Canva, physical printer). ChefFlow already generates printable PDFs for menus and labels.

**Client-collaborative angle:** The partner needs access to printable materials they can use at their venue. Currently, only the chef can generate these documents. If the partner could access a "printable materials" section for confirmed events at their locations, they could self-serve: download the front-of-house menu, allergen card, or a branded "tonight's chef" card without texting the chef.

**Physical reality:** This IS a print problem. The end artifact is physical paper/signage. ChefFlow's role is to be the data source that feeds the printed output. The existing PDF generators are already designed for this. The gap is partner access to these outputs.

**Compounding:** Medium. Template layouts compound (partner learns which format works at their venue). Per-event content changes every time (different menu, different chef potentially).

**Solution design:**

- Add "Event Materials" section to partner portal for confirmed upcoming events
- Expose read-only printable menu PDF (front-of-house version, no pricing) to partner
- Generate a "venue welcome card" template: chef name, occasion, dietary highlights
- Allergen summary card printable (derived from menu dishes)
- Partner can download these materials 48h before event without contacting chef
- Chef controls which materials are partner-accessible (toggle per document type)

**Where it appears:**

- Partner portal event detail page ("Printable Materials" section)
- Partner location detail page (reusable venue-specific templates)
- Chef event settings (toggle: share materials with partner)

**What remains as permanent exit:**
Custom design work (Canva, InDesign), physical printing, updating property binders, and any venue-specific branding that goes beyond what ChefFlow templates produce. ChefFlow provides the DATA and basic formatted output; the partner's brand-specific design layer remains external.

**Priority:** Medium frequency (every event where partner prints anything) x Medium effort (expose existing PDF generators to partner role) = Medium priority
**Spec needed?** No (addition to partner coordination surface)

---

## Scenario #56: Coordinate cleanup or house rules

**Original classification:** Bridgeable
**Reclassified to:** Reducible + Client-Collaborative

**Why partner leaves:** The partner needs to communicate venue-specific cleanup requirements and house rules to the chef before/during service: what time everything must be clear, noise restrictions, which trash/recycling goes where, what surfaces need specific treatment, shoe policies, photography rules, areas off-limits to guests. Currently this happens over text/email or in a printed property binder.

**Context ChefFlow has:**

- House rules field on client record (`clients.house_rules` in schema)
- Property rules array on `event_venue_details` (`property_rules: string[]`)
- Pet policy, no-smoking areas, off-limits areas in venue details
- Arrival guide has a dedicated "house_rules" section: "Pets, shoes, smoking, photos, quiet hours, rooms off-limits, or safety expectations" (`lib/dinner-circles/arrival-guide.ts`)
- Event closeout checklist (`lib/events/closeout-actions.ts`) tracks post-service tasks
- Departure checklist component (`components/events/departure-checklist.tsx`)
- BEO document includes house rules when present
- Documents system can generate reset checklists (`lib/documents/generate-reset-checklist.ts`)

**Data source?** No. The knowledge comes from the partner (their venue, their rules). ChefFlow should be the REPOSITORY for this knowledge.

**Client-collaborative angle:** The partner IS the collaborator. They know their venue rules better than anyone. The Dinner Circle arrival guide already has a `house_rules` section with `attendee_visible` default visibility. The `event_venue_details` table stores `property_rules` as an array. The gap is that the PARTNER cannot currently edit these directly through their portal; the chef must manually enter rules the partner communicated externally.

**Physical reality:** House rules are a "read once, internalize" document. Print is natural (laminated card in kitchen, list on the fridge). The chef needs this visible during setup and service. Large text, short bullet points, glance-able. The departure/reset checklist is the cleanup complement: what state to leave everything in.

**Compounding:** Very high. Venue rules rarely change. Once captured, they serve every single future event at that location permanently. This is the highest-compounding scenario in this batch. A partner entering their rules ONCE eliminates this coordination forever.

**Solution design:**

- Add "House Rules & Cleanup" section to partner location detail in partner portal
- Partner edits: property rules, quiet hours, cleanup deadline, trash/recycling, surface care, off-limits areas, shoe policy, photography policy
- Data flows into `event_venue_details.property_rules` for events at that location (auto-populated)
- Data flows into Dinner Circle arrival guide `house_rules` section (auto-populated)
- Chef sees partner-authored rules on Event Day Dashboard and in BEO document
- Generate printable "venue rules" card from partner data (PDF, one page)
- Departure/reset checklist incorporates venue-specific cleanup items from partner

**Where it appears:**

- Partner portal location detail page (editable "House Rules & Cleanup" section)
- Chef Event Day Dashboard (venue rules panel, auto-populated from partner location)
- Dinner Circle arrival guide (house_rules section, auto-filled)
- BEO document (house rules section already renders this data)
- Printable venue rules card (new document type)
- Departure checklist (venue-specific cleanup items)

**What remains as permanent exit:**
Real-time cleanup coordination when circumstances change (e.g., "actually leave the table set up, we have brunch tomorrow" or communicating with building maintenance about dumpster access). One-off deviations from stored rules will still be communicated via text/phone.

**Priority:** High frequency (every event at every partner venue) x Low-medium effort (partner form + auto-population of existing fields) = Very high priority
**Spec needed?** Yes (partner-authored venue rules with auto-population into event pipeline)

---

## Batch Summary

| #   | Title                                            | Reclassified To                  | Spec Needed? |
| --- | ------------------------------------------------ | -------------------------------- | ------------ |
| 52  | Coordinate arrival/loading day-of                | Partially Reducible              | Yes          |
| 53  | Check real-time traffic or directions            | Bridgeable                       | No           |
| 54  | Alert chef to last-minute venue issue            | Partially Reducible              | No           |
| 55  | Update guest-facing signage or printed materials | Bridgeable                       | No           |
| 56  | Coordinate cleanup or house rules                | Reducible + Client-Collaborative | Yes          |

### Key Findings

**Strongest existing infrastructure:** The Dinner Circle arrival guide (`lib/dinner-circles/arrival-guide.ts`) with 12 structured sections and role-based visibility is already designed for exactly this coordination pattern. The `event_venue_details` table stores venue logistics. The Event Day Dashboard tracks service phases and issues. PDF document generators handle printable materials.

**Critical gap:** The partner portal has NO day-of coordination surface. Partners can see event history and manage location metadata, but cannot participate in active event coordination. All 5 scenarios share a common solution: a "partner event coordination card" that surfaces 48h before confirmed events and enables the partner to contribute day-of information.

**Highest value item:** Scenario #56 (house rules/cleanup). It has the highest compounding factor because venue rules rarely change, and ChefFlow already has the storage infrastructure (`event_venue_details.property_rules`, arrival guide `house_rules` section, BEO rendering). The only missing piece is partner portal write access to this data.

**Architecture note:** The partner portal (`app/(partner)/partner/`) currently shows events as read-only history. Adding pre-event coordination requires a new "upcoming events" view with action surfaces, distinct from the historical events table.
