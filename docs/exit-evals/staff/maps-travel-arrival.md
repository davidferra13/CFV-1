# Staff / Maps, Travel & Arrival Exit Evaluation

Mode: Solo evaluation. Every scenario is marked `NEEDS-DEVELOPER-REVIEW`.

## Scenario #9: Navigate to the event

**Original classification:** Permanent
**Reclassified to:** Bridgeable
**Review status:** NEEDS-DEVELOPER-REVIEW

**Why staff leaves:** Staff need turn-by-turn navigation to arrive at the correct entrance on time, not just the event address.
**Context ChefFlow has:**

- Event date, serve time, arrival time, guest count, service style, and occasion.
- Event address fields, plus latitude/longitude when geocoded.
- Staff role, station, assignment notes, scheduled hours, chef phone, and collaborators.
- Access instructions, location notes, kitchen notes, and site notes in the token briefing.
- Chef-side travel route infrastructure and printable travel route documents.

**Data source?** No. Navigation is an external action surface, though map URLs, geocoding, and route ETA APIs can source supporting data.
**Client-collaborative angle:** Dinner Circle can collect destination confidence: exact entrance, buzzer/gate, service elevator, landmark, doorman note, and whether maps pins route drivers to the wrong side.
**Physical reality:** Staff are likely mobile, carrying gear, driving, or walking. ChefFlow should offer a large "Open Maps" handoff, a printable staff briefing with address/access notes, and an optional voice-readable arrival brief.
**Compounding:** High, because wrong-pin fixes, entrance notes, and access patterns become reusable venue profile intelligence.

**Solution design:**

- Keep the current clean maps handoff, but generate destination links from the best available geocoded coordinate when present.
- Add an arrival card that combines address, arrival time, access instructions, and "wrong pin / use this entrance" notes.
- Add a post-arrival prompt for staff to confirm arrived, late, or wrong entrance so ChefFlow captures outcome evidence.
- Promote confirmed entrance/access corrections into venue profile notes for future staff briefings.

**Where it appears:**

- `/staff-portal/[id]` token event briefing location card
- `/staff-schedule` assignment detail or expanded assignment row
- Chef-side `/events/[id]/staff` briefing preview

**What remains as permanent exit:**
Turn-by-turn driving, walking, public transit navigation, rerouting, and platform-specific traffic handling remain in Maps/Waze/Apple Maps.

**Priority:** High frequency x low-medium effort = high bridge priority
**Spec needed?** no

## Scenario #10: Check live traffic before leaving

**Original classification:** Permanent
**Reclassified to:** Partially Reducible
**Review status:** NEEDS-DEVELOPER-REVIEW

**Why staff leaves:** Staff need to decide when to leave so they hit the arrival window despite traffic, parking, unloading, and route uncertainty.
**Context ChefFlow has:**

- Event date, arrival time, serve time, travel time minutes, departure time, and event coordinates when geocoded.
- Staff assignment status, schedule, role, scheduled hours, and event briefing link.
- Chef-side timeline estimator with travel and arrival buffers.
- Chef-side travel legs with origin, destination, stops, drive minutes, status, and printable route support.
- No clear staff-origin address in the inspected staff portal data model.

**Data source?** Yes: Google Routes/Distance Matrix, Mapbox Directions/Traffic, or similar route ETA APIs can provide live/estimated travel time. Staff still need their own nav app for active rerouting.
**Client-collaborative angle:** Limited. The client can provide building-specific arrival buffer facts such as security desk delay, valet/load-in queue, elevator delay, parking difficulty, and "traffic always backs up on this street."
**Physical reality:** This is a pre-departure glance moment. Staff need a big leave-by time, "traffic worse than planned" warning, and one-tap map handoff, not a dense dashboard.
**Compounding:** Medium, because recurring venue buffers and observed lateness patterns improve future leave windows, but live traffic itself does not compound.

**Solution design:**

- Add a staff-facing leave window card using event arrival time, saved travel minutes, buffer rules, and route ETA when sourceable.
- Capture per-venue arrival buffer facts from staff arrival outcomes and client-provided building notes.
- Provide "Open route" only after showing the in-app leave-by recommendation.
- Add a manual "I am running late" status action tied to the staff assignment.

**Where it appears:**

- `/staff-portal/[id]` day-of top card
- `/staff-schedule` upcoming assignment row
- Chef-side `/events/[id]/travel` and `/events/[id]/staff`

**What remains as permanent exit:**
Live rerouting, route avoidance, crash/closure handling, and turn-by-turn navigation remain in a map app.

**Priority:** High frequency x medium effort = high roadmap candidate
**Spec needed?** yes

## Scenario #11: Find parking or loading access

**Original classification:** Bridgeable
**Reclassified to:** Reducible + Client-Collaborative
**Review status:** NEEDS-DEVELOPER-REVIEW

**Why staff leaves:** Staff need confidence about where to park, unload, enter, and move equipment without wasting arrival time or calling the chef/client from the curb.
**Context ChefFlow has:**

- Event address, location notes, access instructions, kitchen notes, site notes, and special requests in the staff token briefing.
- Venue detail support for parking capacity, parking instructions, overflow plan, gate code, access instructions, directions from road, setup zones, restroom info, and property rules.
- Client and event history that can compound into venue profiles.
- Chef-side staff briefing generation and print/copy support.

**Data source?** Partly. Street View/maps can help visually confirm entrances, but the decisive data is usually client/venue knowledge rather than a public API.
**Client-collaborative angle:** Strong. Dinner Circle should ask the client or venue host for parking, loading, gate codes, service entrance, freight elevator, building contact, and "do not park here" constraints before staff ever leave.
**Physical reality:** This must be available before and during load-in, with large text, printable briefing, and voice-readable access notes. Staff may have full hands and little time.
**Compounding:** High, because parking, loading, gate, and entrance notes should become durable venue intelligence reused across every future event at that location.

**Solution design:**

- Promote parking/loading fields into a staff-safe arrival section in the token briefing.
- Add Dinner Circle logistics prompts that collect parking, loading, gate, and entrance facts from clients/venue hosts.
- Store confirmed answers on a venue profile and prefill future events at the same address.
- Add staff feedback after arrival: "parking worked", "wrong entrance", "new loading note", with chef review before compounding.

**Where it appears:**

- `/staff-portal/[id]` Location / Arrival section
- Dinner Circle event logistics prompt
- Chef-side venue details and `/events/[id]/staff` briefing panel

**What remains as permanent exit:**
First-time visual confirmation via Street View, live curb changes, security guard instructions, or a venue phone call may still happen when the client/venue data is missing or stale.

**Priority:** High frequency x medium effort = top staff logistics candidate
**Spec needed?** yes

## Scenario #12: Coordinate rideshare or transit

**Original classification:** Permanent
**Reclassified to:** Bridgeable
**Review status:** NEEDS-DEVELOPER-REVIEW

**Why staff leaves:** Staff need to book, track, pay for, or coordinate non-owned transportation to arrive on time and potentially document reimbursement.
**Context ChefFlow has:**

- Event address, arrival time, serve time, assignment status, role, scheduled hours, and chef contact.
- Staff schedule and token briefing surfaces, but no inspected staff-facing transit/rideshare booking integration.
- Chef-side reimbursement/time/pay surfaces exist adjacent to staff workflows, but rideshare marketplace actions are external.

**Data source?** No. Uber, Lyft, and transit apps are action destinations. Transit APIs can provide reference schedules, but booking/payment/driver coordination remains external.
**Client-collaborative angle:** Moderate. Client or venue can provide pickup/drop-off rules, loading-zone restrictions, concierge desk instructions, and transit entrance advice.
**Physical reality:** Mobile-first handoff is correct. Staff need one-tap copy/open destination, arrival-window context, and a way to record ETA or reimbursement evidence after the external trip.
**Compounding:** Low-medium. Pickup/drop-off rules compound by venue; the actual ride booking does not.

**Solution design:**

- Add "copy destination" and "open rideshare/transit" handoff options from the staff arrival card.
- Let staff record ETA, late risk, or transportation note without texting the chef.
- Capture ride/transit receipt or reimbursement note tied to the assignment.
- Store venue pickup/drop-off constraints separately from generic address notes.

**Where it appears:**

- `/staff-portal/[id]` arrival card
- `/staff-schedule` assignment detail
- Staff reimbursement/time note surface

**What remains as permanent exit:**
Booking, canceling, payment, driver messaging, and live transit service disruption handling remain in rideshare/transit apps.

**Priority:** Medium frequency x low-medium effort = useful bridge
**Spec needed?** no

## Scenario #13: Get directions between prep site and event

**Original classification:** Permanent
**Reclassified to:** Bridgeable
**Review status:** NEEDS-DEVELOPER-REVIEW

**Why staff leaves:** Staff need to move between a prep origin and the service venue without manually reconstructing addresses, stops, timing, and route order.
**Context ChefFlow has:**

- Event address, coordinates, arrival time, travel time minutes, and departure time.
- Chef preference home address and chef-side event travel legs with origin, destination, stops, linked events, drive minutes, and status.
- Printable travel route PDFs and chef-side `/events/[id]/travel` route planning.
- Prep blocks and kitchen rental/commissary-adjacent data exist in the broader app, but the inspected staff portal does not expose prep-site-to-event routing.

**Data source?** No for the full action; route geometry and ETA can be sourced from a maps API, but the route handoff and turn-by-turn execution remain external.
**Client-collaborative angle:** Low for prep-site origin, higher for destination arrival details. Client/venue can still provide unloading and entrance details for the final leg.
**Physical reality:** Staff need a route packet or link before they are moving, especially if they are carrying food/equipment. Print helps when hands are busy or signal is poor.
**Compounding:** Medium-high. Common prep sites, commissaries, home kitchens, and venue pairings can become reusable route templates with known buffers.

**Solution design:**

- Expose relevant chef-approved travel legs to assigned staff as read-only route handoffs.
- Add staff-safe route links for origin-to-venue and stop-to-venue when those addresses are known.
- Include printable route packet access from the staff token briefing.
- Capture actual travel time or route issue after arrival for future buffer tuning.

**Where it appears:**

- `/staff-portal/[id]` travel section
- `/events/[id]/travel` chef-side route plan with staff visibility controls
- Generated travel route PDF

**What remains as permanent exit:**
Turn-by-turn navigation, route selection, and live rerouting remain in maps. ChefFlow should own the route plan and handoff, not become the navigator.

**Priority:** Medium frequency x medium effort = strong bridge after core arrival fields
**Spec needed?** yes

## Scenario #14: Locate a nearby store for emergency supplies

**Original classification:** Bridgeable
**Reclassified to:** Partially Reducible
**Review status:** NEEDS-DEVELOPER-REVIEW

**Why staff leaves:** Staff need to find a realistic nearby place to buy a missing ingredient, disposable, ice, fuel, smallware, or emergency supply without asking the chef to search under pressure.
**Context ChefFlow has:**

- Event address and coordinates when geocoded.
- Menu items, ingredients, station needs, packing context, and travel route/store-stop infrastructure.
- Chef preferred store settings and store coverage suggestions.
- Chef-side nearby stores panel backed by Google Places for supermarkets near an event venue.
- Chef-side travel legs and travel-leg ingredients that already model store stops and sourcing status.

**Data source?** Yes for discovery: Google Places or another local search API. No for guaranteed inventory, payment, delivery, or emergency purchase authorization.
**Client-collaborative angle:** Medium. Client/venue can provide the nearest reliable grocery, corner store, ice source, permitted delivery drop-off, or "avoid this store" note.
**Physical reality:** This is a stress moment. Staff need a tiny emergency card: nearest approved stores, distance/open-now, tap directions, call store, and reimbursement/receipt capture.
**Compounding:** Medium-high. Approved emergency suppliers by venue and ingredient category compound into faster future recovery, especially for repeat venues.

**Solution design:**

- Expose a staff-safe emergency supply card using event coordinates, chef preferred stores, nearby store search, and travel-stop data.
- Prioritize chef-approved stores and stores already used on travel legs before generic map search results.
- Add categories such as grocery, ice, disposables, pharmacy, hardware, and restaurant supply.
- Add receipt/photo/reimbursement capture tied to the assignment or event.
- Record which store solved the issue so venue emergency supplier knowledge compounds.

**Where it appears:**

- `/staff-portal/[id]` emergency section
- `/staff-station` when a station flags missing supplies
- Chef-side `/events/[id]/travel` and preferred store settings

**What remains as permanent exit:**
Actual purchase, inventory confirmation, delivery ordering, and payment stay in store apps, phone calls, or physical retail.

**Priority:** Medium-high frequency x medium effort = high recovery-value candidate
**Spec needed?** yes

## Batch Summary

| #   | Title                                        | Reclassified To                  | Spec Needed? |
| --- | -------------------------------------------- | -------------------------------- | ------------ |
| 9   | Navigate to the event                        | Bridgeable                       | no           |
| 10  | Check live traffic before leaving            | Partially Reducible              | yes          |
| 11  | Find parking or loading access               | Reducible + Client-Collaborative | yes          |
| 12  | Coordinate rideshare or transit              | Bridgeable                       | no           |
| 13  | Get directions between prep site and event   | Bridgeable                       | yes          |
| 14  | Locate a nearby store for emergency supplies | Partially Reducible              | yes          |

Spec notes only, per solo-mode override: potential future specs are staff leave-window intelligence, venue parking/loading intelligence, staff travel-leg handoff, and staff emergency supply finder. No standalone specs were created.
