# Exit Evaluation: Chef / LOGISTICS & TRAVEL

> **Batch:** 08 | **Wave:** 1 | **Scenarios:** #43, #44, #45, #46, #47
> **Mode:** Solo (NEEDS-DEVELOPER-REVIEW on all)
> **Date:** 2026-05-25

---

## Scenario #43: Route planning for the day

**Original classification:** Permanent exit (routing is permanent exit)
**Reclassified to:** Partially Reducible

**NEEDS-DEVELOPER-REVIEW**

**Why chef leaves:** The chef has multiple stops in a day (home, grocery store, specialty shop, venue A, venue B, home) and needs to sequence them in time-optimal order. The real decision is "what order do I hit these stops, and when do I leave?" Not just directions, but multi-stop optimization that factors in store hours, event serve times, and prep deadlines.

**Context ChefFlow has:**

- Home address (`chef_preferences.home_address/city/state/zip`)
- Event venue addresses (`events.location_address/city/state/zip` + lat/lng)
- Event times (serve_time, arrival_time)
- Travel time estimates (`events.travel_time_minutes`)
- Full travel plan with legs and stops (`event_travel_legs` table, `lib/travel/`)
- Nearby events within 7 days (already computed in `getTravelPlan`)
- Shopping list and which stores carry which items (travel leg ingredients with `store_name`)
- Drive briefing data (`lib/mobile/drive-briefing.ts`)
- Mileage logs (`mileage_logs` table with from/to addresses)
- OSRM-based travel time estimates (`lib/ai/remy-travel-time.ts`)

**Data source?** Yes. OSRM (already integrated, free, no API key) provides driving time and distance. Mapbox (already integrated, `lib/maps/mapbox.ts`) provides geocoding and static maps. Google Maps Directions API could provide multi-stop optimization, but OSRM handles point-to-point. The optimization logic (sequencing stops) is algorithmic, not a data source problem.

**Client-collaborative angle:** Client provides venue access instructions and parking notes via Dinner Circle (already captured in `events.access_instructions` and `venue_profiles.parking_notes`). Client can confirm "arrive no earlier than X" which constrains the route plan. This data is already collected.

**Physical reality:** The chef needs this on their phone while driving. Large text, one-tap navigation handoff to Google Maps/Waze/Apple Maps. The drive briefing (`lib/mobile/drive-briefing.ts`) already builds a single-screen no-scroll view with a map link. Route plan needs the same treatment: ordered stop list with tap-to-navigate for each stop.

**Compounding:** Medium. Individual routes don't compound, but patterns do. "I always stop at Restaurant Depot before Whole Foods." "The route from Haverhill to the North End always takes 45 min at 3pm." Travel leg history can surface these patterns. Venue profiles already persist across events.

**Solution design:**

- Build a "Day Route" view that aggregates all travel legs for a given date into a sequenced itinerary (legs already exist in `event_travel_legs`)
- Add stop-sequencing algorithm: given N stops with time constraints (serve times, store hours), produce optimal order. This is a constrained TSP variant solvable with simple greedy heuristic for typical chef day (3-6 stops)
- Use OSRM (already integrated) to compute leg-to-leg drive times for the sequence
- Generate "Open in Maps" deep links (Google Maps multi-stop URL, Apple Maps, Waze) from the sequenced route. Drive briefing already builds Google Maps URLs
- Surface the day route on the calendar day view and as a pre-departure notification

**Where it appears:**

- Calendar day view (new "Day Route" card when travel legs exist for that date)
- Event detail page, travel plan section (already has travel legs UI wiring)
- Drive briefing (extend with full day context, not just single event)
- Mobile: large-text ordered stop list with tap-to-navigate

**What remains as permanent exit:**
The chef still opens Google Maps/Waze/Apple Maps for turn-by-turn navigation. ChefFlow is not a GPS. The exit is: tap the "Navigate" button, Maps app opens with the next stop pre-loaded. This is correct behavior.

**Priority:** High frequency (every working day with multiple events) x Medium effort (travel leg data and OSRM already exist, need sequencing algo + day view UI) = **HIGH**
**Spec needed?** Yes, if scope extends beyond aggregating existing travel legs into a day view. The stop-sequencing algorithm and multi-stop Maps URL generation warrant a spec.

---

## Scenario #44: Check traffic before leaving

**Original classification:** Permanent exit (real-time traffic is not our domain)
**Reclassified to:** Bridgeable

**NEEDS-DEVELOPER-REVIEW**

**Why chef leaves:** The chef needs to decide "should I leave now, or wait 20 minutes?" This is a time-sensitive departure decision. The underlying question is: "Given current traffic conditions, what time must I depart to arrive at the venue by my arrival_time?" The chef opens Google Maps, enters the venue address, checks the current travel time, and does mental math against their target arrival.

**Context ChefFlow has:**

- Venue address and coordinates (events table, lat/lng)
- Target arrival time (`events.arrival_time`)
- Default travel time estimate (`events.travel_time_minutes`)
- Chef's home address (`chef_preferences.home_address`)
- Travel legs with departure_time and origin/destination (`event_travel_legs`)
- Drive briefing already computes a Google Maps direction URL

**Data source?** Yes, but expensive/complex. Real-time traffic data requires Google Maps Directions API (paid per request), Mapbox Traffic API, or TomTom. OSRM (currently integrated) does NOT include real-time traffic. The value proposition is thin: checking traffic is a 10-second action in Google Maps, and the data is stale within minutes. The cost and complexity of integrating real-time traffic APIs is not justified.

**Client-collaborative angle:** None. Traffic is not something the client influences.

**Physical reality:** This is a pre-departure glance moment. The chef checks their phone, sees "35 min to venue, leave by 4:15 PM." The ideal is a notification: "Leave in 20 minutes to arrive on time." This can be approximated without real-time traffic by using the stored travel_time_minutes plus a configurable buffer.

**Compounding:** Low. Traffic is ephemeral. But travel time patterns do compound: "the drive to Cambridge is always 50 min during rush hour." Historical mileage logs and travel leg completions could build time-of-day travel time estimates for frequent routes.

**Solution design:**

- Add a "departure reminder" notification: based on `arrival_time - travel_time_minutes - buffer`, push a reminder: "Leave in 20 min for [Client]'s dinner"
- Include a one-tap "Open in Maps" link in the reminder so the chef can check live traffic if needed
- On the drive briefing screen, show estimated departure time prominently: "Leave by 4:15 PM (35 min drive + 15 min buffer)"
- Over time, if travel legs are marked `completed` with actual timestamps, adjust the default travel_time_minutes for known routes

**Where it appears:**

- Push notification / in-app reminder (departure countdown)
- Drive briefing screen (departure time calculator)
- Calendar day view (departure times shown alongside event times)
- Event detail page, travel section

**What remains as permanent exit:**
Real-time traffic checking remains a permanent exit. The chef will still open Google Maps when traffic is unpredictable (snow, construction, game day). ChefFlow's job is to make the Maps app open with the right destination pre-loaded and minimize the decisions the chef has to make. The departure reminder eliminates the "when should I leave?" mental math even without live traffic.

**Priority:** High frequency (every event day) x Low effort (departure time math is trivial, notification infrastructure likely exists) = **MEDIUM-HIGH**
**Spec needed?** No. This is a notification + display enhancement using existing data. Add to reclassification sprint doc.

---

## Scenario #45: Find a grocery store near an event venue

**Original classification:** Permanent exit (could show nearby stores on event map)
**Reclassified to:** Reducible

**NEEDS-DEVELOPER-REVIEW**

**Why chef leaves:** The chef is at or near the venue and realizes they need an ingredient they forgot, or a substitution requires a last-minute store run. The question is: "Where is the nearest grocery store that carries [X] relative to where I am right now?" Secondary: "Is it open? Can I get there and back before service?"

**Context ChefFlow has:**

- Venue coordinates (`events.location_lat/lng`)
- Full `getNearbyStores()` action already built (`lib/events/nearby-stores-actions.ts`) that queries Google Places API for supermarkets within 5 miles of event venue, returns name, address, distance, open/closed status, and a Google Maps directions URL
- Shopping list with items and quantities (recipe ingredients, travel leg ingredients)
- Vendor database with addresses (`vendors` table, including `vendor_type` which supports 'grocery', 'specialty', 'butcher', etc.)
- Substitution reference data (`lib/reference/data/substitutions.json`)

**Data source?** Yes, and it is already integrated. `lib/events/nearby-stores-actions.ts` uses Google Places API. The feature exists in code but needs to be surfaced on the event detail/execution page and the drive briefing. The chef's own vendor list (with addresses) could supplement Places results for known preferred stores.

**Client-collaborative angle:** The client may know local stores near their venue: "There's a Whole Foods 2 blocks away" or "The farm stand across the road has great produce." This is perfect for Dinner Circle collection during event setup. Could add a "Nearby stores/resources" prompt to the venue details form.

**Physical reality:** This is a stress moment. Chef is mid-prep or mid-setup, realizes something is missing, needs an answer in 10 seconds. Large text, sorted by distance, with one-tap directions. Phone screen, possibly with messy hands. The result card should show: store name, distance, open/closed, tap to navigate.

**Compounding:** High. Once the chef finds a great store near a venue, that knowledge should persist in the venue profile. "Last time at the Smith residence, I grabbed herbs from the farm stand on Rt 133." Venue profiles (`venue_profiles` table) could store preferred nearby stores. Vendor records already persist.

**Solution design:**

- Surface the existing `getNearbyStores()` action on the event detail page (it is built but may not be wired to UI)
- Add "Nearby Stores" card to the drive briefing and execution view
- Allow the chef to save a discovered store to the venue profile or as a vendor
- Cross-reference nearby stores with the chef's vendor list (preferred vendors near this venue)
- Add a "Nearby resources" field to the Dinner Circle venue details form so clients can flag local stores

**Where it appears:**

- Event detail page, logistics/venue section (nearby stores card)
- Drive briefing screen (emergency store list)
- Venue profile (saved preferred nearby stores, compounds over visits)
- Dinner Circle venue details form (client can suggest nearby resources)

**What remains as permanent exit:**
Navigating to the store (turn-by-turn directions) remains a permanent exit. The discovery of which store to go to becomes fully in-app. The chef taps "Navigate" and Maps opens. If the needed ingredient is highly specific (e.g., saffron, A5 wagyu), the chef may still need to call the store to confirm stock, which is a permanent exit.

**Priority:** Medium frequency (not every event, but high-stress when it happens) x Low effort (backend exists, needs UI wiring + venue profile save) = **MEDIUM-HIGH**
**Spec needed?** No. The backend action exists. This is a UI wiring task: surface `getNearbyStores()` on event detail and drive briefing, add save-to-venue-profile flow.

---

## Scenario #46: Book travel for destination events

**Original classification:** Permanent exit (could store travel details on event)
**Reclassified to:** Bridgeable

**NEEDS-DEVELOPER-REVIEW**

**Why chef leaves:** The chef has an out-of-town gig and needs to book flights, hotels, and rental cars. The actual booking happens on airline/hotel/rental websites or through a travel agent. The operational question is: "What are my travel logistics for this destination event, and how do they affect my prep timeline, equipment transport, and costs?"

**Context ChefFlow has:**

- Event date, location, and duration
- Full travel plan system with legs and stops (`event_travel_legs`, supports multiple leg types including `service_travel`)
- Equipment lists and rental tracking (`event_equipment_rentals` with status workflow: needed, confirmed, picked_up, returned)
- Expense tracking with categories including `gas_mileage` and `vehicle`
- Mileage logging (`mileage_logs`)
- Financial data (quoted price, expenses, profit calculations)
- Event timeline (arrival_time, serve_time, departure tracking)

**Data source?** No. Airlines, hotels, and car rental companies are transactional platforms, not data sources. You cannot book a flight via API without a travel agency integration (Sabre, Amadeus, etc.), which is wildly out of scope. This is a permanent booking exit.

**Client-collaborative angle:** The client for a destination event often handles or assists with accommodation. "We have a guest house," "We've blocked rooms at the hotel," "We'll reimburse travel." The Dinner Circle can collect: accommodation arrangements, airport pickup, local transportation, travel reimbursement details. This eliminates several sub-exits (hotel hunting, ground transport research).

**Physical reality:** Travel booking is a desktop/laptop activity done days or weeks before the event. Not a kitchen moment. Not voice. Not print. Standard screen workflow.

**Compounding:** Medium. Destination event patterns compound: preferred airlines, hotel loyalty programs, rental car preferences, packing lists for shipped equipment. A "destination event checklist" template would compound across events.

**Solution design:**

- Extend travel legs to support `flight`, `hotel`, and `rental_car` leg types with confirmation number, cost, and date fields
- Add a "Travel Logistics" section to the event detail page for destination events (triggered when event location is far from chef's home address)
- Store travel confirmation details (flight number, hotel name, rental car company, confirmation codes) on the event as structured data, not just notes
- Add Dinner Circle prompt for destination events: "Will you be providing accommodation? Airport pickup? Travel reimbursement?"
- Include travel expenses in event P&L calculation (already partially supported via expense categories)

**Where it appears:**

- Event detail page, new "Destination Travel" section (only shown when event is far from home)
- Travel plan (extended leg types for flights/hotels)
- Event cost breakdown (travel expenses rolled into event P&L)
- Dinner Circle setup form (accommodation/transport questions for destination events)
- Pre-event checklist (travel confirmations verified)

**What remains as permanent exit:**
Booking flights, hotels, and rental cars on external websites. Researching destination logistics (local grocery stores, equipment rental companies in the destination city). Communicating with travel agents. These are all permanent exits. ChefFlow's job is to capture the results (confirmation numbers, costs, dates) and factor them into event planning and financials.

**Priority:** Low frequency (destination events are a small percentage of a private chef's work) x Medium effort (travel leg type extension + Dinner Circle prompts) = **LOW-MEDIUM**
**Spec needed?** No. The travel leg system already exists and can be extended with new leg types. Add to reclassification sprint doc as a future enhancement.

---

## Scenario #47: Rent equipment for large events

**Original classification:** Permanent exit (could store rental contacts + costs on event)
**Reclassified to:** Partially Reducible

**NEEDS-DEVELOPER-REVIEW**

**Why chef leaves:** The chef has a large event (50+ guests, outdoor, specialty cuisine) and needs equipment beyond their personal inventory: extra chafing dishes, portable burners, tents, tables, commercial-grade equipment. The chef browses rental company websites, compares prices, checks availability for their date, and places an order. The operational decisions: "What do I need? Who has it? How much? When do I pick up/return?"

**Context ChefFlow has:**

- Full equipment rental tracking at the event level (`event_equipment_rentals` table with name, vendor, quantity, daily_rate_cents, total_cost_cents, needed_date, status workflow: needed/confirmed/picked_up/returned)
- Chef's personal equipment inventory (`chef_equipment_master`, `equipment_items`, `equipment_maintenance_log`)
- Equipment depreciation tracking (`equipment_depreciation_schedules`)
- Legacy equipment rentals table (`equipment_rentals` with vendor_name, cost, dates)
- Vendor database with `vendor_type` that includes 'equipment' as a valid type (`vendors` table)
- Vendor event assignments (`vendor_event_assignments` linking vendors to events with amounts)
- Event equipment checklists and assignments (`event_equipment_checklists`, `event_equipment_assignments`)
- Expense tracking with 'equipment' and 'venue_rental' categories
- Packing list readiness flag (`events.equipment_list_ready`)

**Data source?** No. Equipment rental companies are transactional businesses. Availability checking and booking require direct interaction (website, phone, email). No aggregated API exists for party/event equipment rentals.

**Client-collaborative angle:** Limited but real. For venue-hosted events, the venue may provide equipment: "We have 10 round tables and 80 chairs," "Our outdoor kitchen has 6 burners." This is already captured in venue profiles (`venue_profiles.equipment_available` array). The Dinner Circle venue details form already collects infrastructure details. For client-hosted events, the client may know local rental companies or have existing accounts.

**Physical reality:** Equipment rental planning happens days/weeks before the event. Desktop workflow, not kitchen. However, the "what do I need?" question involves reviewing menu complexity, guest count, and venue equipment, which is all in ChefFlow.

**Compounding:** High. Equipment rental vendors compound: once you find a reliable rental company with good prices, you use them repeatedly. Vendor profiles persist. Equipment needs by event type compound: "100-guest outdoor BBQ always needs 2 extra propane burners, 4 chafing dishes, and 3 folding tables." Event templates could include standard equipment lists.

**Solution design:**

- Build an "Equipment Gap Analysis" that compares required equipment (from event type, guest count, menu complexity, and venue profile's available equipment) against the chef's personal inventory, and produces a "need to rent" list
- Surface the chef's equipment-type vendors on the event detail page when rentals are needed, with contact info and one-tap call/email
- Allow adding rental line items with costs directly to the event (the `event_equipment_rentals` table already supports this with full status tracking)
- Store rental vendor profiles with past pricing so the chef can compare across events
- Add equipment needs templates by event type/size (compounds across career)
- Auto-include rental costs in event P&L and quotes

**Where it appears:**

- Event detail page, equipment section (gap analysis: "You need 3 items you don't own")
- Event detail page, vendor assignments (equipment rental vendors with contact info)
- Equipment rental status tracker (needed -> confirmed -> picked_up -> returned lifecycle)
- Event cost breakdown (rental costs in P&L)
- Vendor directory filtered by type=equipment (contact info, past rentals, pricing history)
- Pre-event checklist (equipment rentals confirmed?)

**What remains as permanent exit:**
Browsing rental company websites for availability and pricing. Placing rental orders (phone, email, or website). Picking up and returning physical equipment. These are permanent exits. ChefFlow's job is: tell the chef what they need, who they've rented from before (with pricing), and track the rental lifecycle and costs.

**Priority:** Medium frequency (large events, outdoor events, specialty cuisine) x Medium effort (equipment gap analysis is new logic; rental tracking tables already exist) = **MEDIUM**
**Spec needed?** Yes, for the equipment gap analysis feature (comparing event needs vs. personal inventory vs. venue equipment). The rental tracking infrastructure already exists.

---

## Batch Summary

| #   | Title                                 | Reclassified To     | Spec Needed?                        |
| --- | ------------------------------------- | ------------------- | ----------------------------------- |
| 43  | Route planning for the day            | Partially Reducible | Yes (day route sequencing)          |
| 44  | Check traffic before leaving          | Bridgeable          | No                                  |
| 45  | Find a grocery store near event venue | Reducible           | No (backend exists, UI wiring only) |
| 46  | Book travel for destination events    | Bridgeable          | No                                  |
| 47  | Rent equipment for large events       | Partially Reducible | Yes (equipment gap analysis)        |

### Codebase Assets Discovered

| Asset                                         | Path                                           | Relevance                    |
| --------------------------------------------- | ---------------------------------------------- | ---------------------------- |
| Travel plan system (legs, stops, ingredients) | `lib/travel/types.ts`, `lib/travel/actions.ts` | Scenarios #43, #44, #46      |
| Nearby stores action (Google Places)          | `lib/events/nearby-stores-actions.ts`          | Scenario #45 (already built) |
| Drive briefing (single-screen, map links)     | `lib/mobile/drive-briefing.ts`                 | Scenarios #43, #44, #45      |
| OSRM travel time estimates                    | `lib/ai/remy-travel-time.ts`                   | Scenario #43                 |
| Mapbox geocoding + static maps                | `lib/maps/mapbox.ts`                           | Scenario #43                 |
| Venue profiles (equipment, parking, access)   | `venue_profiles` table                         | Scenarios #45, #47           |
| Equipment rental tracking                     | `event_equipment_rentals` table                | Scenario #47                 |
| Vendor database (equipment type)              | `vendors` table                                | Scenario #47                 |
| Mileage logging                               | `mileage_logs` table                           | Scenarios #43, #44           |
| Chef home address                             | `chef_preferences` table                       | Scenarios #43, #44, #46      |
| Auto-create service legs on confirm           | `autoCreateServiceLegs()`                      | Scenarios #43, #44           |

### Key Findings

1. **Scenario #45 is nearly solved.** `getNearbyStores()` already queries Google Places API for supermarkets near the venue. It needs UI wiring to event detail and drive briefing pages.
2. **The travel plan system is comprehensive.** Full leg/stop/ingredient CRUD exists with status workflows. Day route aggregation is the missing layer on top.
3. **Equipment rental tracking is fully schemaed** with two tables (`equipment_rentals` legacy, `event_equipment_rentals` modern) and a complete status lifecycle. The gap is the "what do I need?" intelligence layer.
4. **OSRM integration exists** for free, no-API-key travel time estimates. Multi-stop route optimization can be built on top without additional API costs.
5. **All five scenarios were originally classified as "Permanent exit."** After rubric analysis, only #44 and #46 remain bridgeable. Two are partially reducible (#43, #47) and one is fully reducible (#45).
