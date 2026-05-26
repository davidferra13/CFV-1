# Exit Eval: Client / EVENT PLANNING & VENDOR COORDINATION

> Wave 2 | 9 scenarios | Status: NEEDS-DEVELOPER-REVIEW
> Evaluated: 2026-05-25 | Mode: Solo (batch)

---

## Scenario #43: Book a venue

**Original classification:** Permanent exit. Store venue details and documents.
**Reclassified to:** Permanent

**Why client leaves:** The client needs to find, compare, tour, negotiate, and contractually book a physical space for their event. This is a marketplace transaction with its own discovery, pricing, availability, and legal binding that ChefFlow cannot own.

**Context ChefFlow has:**

- Event date, time, guest count, service type
- Client location/region
- Past event venue history (venue_profiles table with full kitchen/equipment details)
- Chef's venue profile library (parking, access, kitchen notes, quirks)
- Budget context from quotes

**Data source?** No. Venue booking is a transactional marketplace (Peerspace, venue websites, direct negotiation). Not a simple API lookup.

**Client-collaborative angle:** Client is the one who books and owns the venue relationship. ChefFlow's Dinner Circle can collect venue details once confirmed: address, access codes, parking, kitchen specs, property rules, gate codes, rain backup plan. The `venue-details-panel.tsx` and `VenueProfile` type already capture this extensively (oven count, burner count, counter space, refrigeration, water access, power outlets, photos, quirks).

**Physical reality:** Screen-based. Venue search and booking happen on laptop/phone. No hands-free or print needs at this stage.

**Compounding:** High. Once a venue is profiled in ChefFlow (`lib/venues/recon-actions.ts` with `createVenueProfile`, `recordVenueVisit`, `getVenueHistory`), subsequent events at the same location have zero friction. The venue-link system (`lib/events/venue-link-actions.ts`) auto-links events to known venues by fuzzy address match.

**Solution design:**

- Already built: Venue profiles with full kitchen/logistics capture, auto-linking to events
- Already built: Venue details panel with parking, access, gate code, rain backup, zones, property rules
- Add: "venue confirmed" checkpoint in event timeline that prompts client to fill venue details via Circle
- Add: Document upload slot for venue contracts/floor plans in event packet
- Add: Venue requirements brief (export: guest count, service style, kitchen needs) to send to venue

**Where it appears:**

- Event detail page (venue section)
- Client portal (event logistics)
- Dinner Circle workspace (arrival_guide module)

**What remains as permanent exit:**
Finding, touring, negotiating, and contractually booking the venue. ChefFlow will never be a venue marketplace.

**Priority:** Medium frequency x Low effort (already mostly built) = Low remaining priority
**Spec needed?** No

---

## Scenario #44: Coordinate with event planner

**Original classification:** Bridgeable with planner access and event packet sharing.
**Reclassified to:** Bridgeable

**Why client leaves:** The event planner runs the broader event and uses their own project management tools. The client needs to share food/chef-specific information with the planner and receive timeline/logistics info back. This is a multi-system coordination problem.

**Context ChefFlow has:**

- Full menu, dietary restrictions, guest count, service timeline
- Chef arrival/departure times
- Vendor coordination log (florist, DJ, etc.)
- Beverage service decisions
- Kitchen/equipment requirements
- Event packet generation capability (Dinner Circle `event_packet` module)

**Data source?** No. Planners use their own PM tools (Aisle Planner, HoneyBook, spreadsheets). This is human coordination.

**Client-collaborative angle:** Strong. The Dinner Circle `collaborator_access` module (already spec'd in `lib/dinner-circles/event-workspace.ts`) explicitly defines 'planner' as a role with scoped access, expiry, revoke, and audit. Planners could view timing, menu, vendor coordination, and dietary info without full system access.

**Physical reality:** Screen-based coordination. PDF/printable event packets for planner hand-off are valuable.

**Compounding:** Medium. Planner relationships may recur for repeat clients but each event is a fresh coordination.

**Solution design:**

- Already spec'd: `collaborator_access` module in Dinner Circle workspace with planner role
- Already built: Event packet generation and export (role-specific redaction)
- Add: Shareable planner-view link (no login, scoped to food/timing/dietary, time-limited)
- Add: Planner contact field on event (name, email, phone) for quick reference
- Add: "Send to planner" one-click export of food service timeline + requirements

**Where it appears:**

- Event detail page (collaborator section)
- Dinner Circle workspace (collaborator_access module)
- Event packet builder (planner-specific export)

**What remains as permanent exit:**
The planner's own PM system, their vendor network, their timeline software. ChefFlow only exports its slice.

**Priority:** Medium frequency x Medium effort = Medium priority
**Spec needed?** No (covered by existing Dinner Circle collaborator_access spec in build queue)

---

## Scenario #45: Book rentals

**Original classification:** Permanent exit. Track rental vendor and drop-off windows.
**Reclassified to:** Partially Reducible

**Why client leaves:** The client needs to find a rental company, select items (tables, chairs, linens, glassware, plates), get pricing, and book delivery/pickup. This is a transactional vendor relationship.

**Context ChefFlow has:**

- Guest count (determines quantity needed)
- Event date and venue (for delivery logistics)
- Full equipment rental tracking system (`lib/events/equipment-rental-actions.ts` with `EquipmentRental` type: vendor_name, vendor_phone, vendor_email, items[], pickup_at, return_at, cost_cents, deposit_cents, confirmation_number, notes)
- Vendor coordination section (`components/events/vendor-coordination-section.tsx`) with 'rental' and 'linen' vendor types
- Budget context

**Data source?** No. Rental companies are local businesses with their own inventory and pricing.

**Client-collaborative angle:** Medium. Client often chooses the rental company based on budget/style. Chef may advise on quantities (plates per course, glassware types). The ChefFlow event can suggest a rental checklist based on guest count and service style.

**Physical reality:** Screen-based. Client browses rental catalogs online or visits showrooms.

**Compounding:** Medium. The rental vendor and their details compound if the client reuses them. Equipment rental records persist per event and vendor contact info is stored.

**Solution design:**

- Already built: Full CRUD for equipment rentals per event with vendor details, items, costs, pickup/return times, confirmation numbers
- Already built: Vendor coordination section with 'rental' type, contact info, arrival/departure times, costs, confirmed status
- Add: Auto-generate rental needs checklist based on guest count and service style (plates x courses x guests, glassware per guest, etc.)
- Add: Client-facing rental status view in portal showing what is confirmed vs pending

**Where it appears:**

- Event detail page (equipment rentals section, vendor coordination section)
- Client portal (event logistics / vendor status)
- Pre-event checklist

**What remains as permanent exit:**
Finding the rental company, browsing their inventory, negotiating pricing, and placing the order. ChefFlow tracks what was ordered and when it arrives/departs.

**Priority:** Medium frequency x Low effort (already built) = Low remaining priority
**Spec needed?** No

---

## Scenario #46: Hire florist/decorator

**Original classification:** Permanent exit. Store vendor contacts and notes.
**Reclassified to:** Permanent

**Why client leaves:** The client is hiring a non-food vendor from their own network, Instagram, or word-of-mouth. The entire discovery, vetting, and booking process belongs to the floral/decor vendor ecosystem.

**Context ChefFlow has:**

- Event date, time, venue
- Vendor coordination system with 'florist' and 'decor' vendor types (full contact info, arrival/departure times, cost, notes, confirmation status)
- Event vibe/atmosphere fields (`lib/events/discovery-types.ts`: vibe_atmosphere, table_presentation)
- Vendor coordination log for communication tracking

**Data source?** No. Florists and decorators are discovered through Instagram, referrals, and local networks.

**Client-collaborative angle:** Low for ChefFlow specifically. The client manages this vendor relationship independently. ChefFlow's role is tracking the coordination timeline so the chef knows when decorators arrive/depart and any setup constraints.

**Physical reality:** Screen/in-person (venue visits with decorator, Instagram browsing for inspiration).

**Compounding:** Low to medium. If the client reuses a decorator, their contact info persists in the vendor coordination entries. But each event is typically unique decor.

**Solution design:**

- Already built: Vendor coordination section with 'florist' and 'decor' types, full CRUD, confirmation status
- Already built: Vendor coordination log for communication tracking with follow-up timers
- Add: Timeline dependency view (florist arrives at X, needs access before Y, must be done before guests arrive at Z)

**Where it appears:**

- Event detail page (vendor coordination section)
- Event timeline (vendor arrival windows)

**What remains as permanent exit:**
Everything. Finding, hiring, and managing the florist/decorator relationship is external. ChefFlow only tracks their slot in the event timeline.

**Priority:** Low frequency x Low effort (already built) = Low priority
**Spec needed?** No

---

## Scenario #47: Hire entertainment

**Original classification:** Permanent exit. Store timeline dependencies.
**Reclassified to:** Permanent

**Why client leaves:** The client is hiring a band, DJ, MC, or other entertainment from their own network or entertainment platforms. Entirely external vendor ecosystem.

**Context ChefFlow has:**

- Event date, time, venue, occasion
- Vendor coordination system with 'dj' and 'entertainment' vendor types
- Event timeline for coordination (when entertainment starts relative to courses)
- Sound/space requirements that affect kitchen operations

**Data source?** No. Entertainment is hired through personal networks, agency sites, social media.

**Client-collaborative angle:** Low for ChefFlow. ChefFlow's interest is purely operational: when does entertainment start (affects course timing), how loud (affects kitchen communication), any power/space conflicts.

**Physical reality:** Screen-based. Listening to demo reels, checking availability calendars.

**Compounding:** Low. Entertainment choices are rarely repeated exactly. Contact info may persist but each event is unique.

**Solution design:**

- Already built: Vendor coordination section with 'dj' and 'entertainment' types, arrival/departure times, confirmation status
- Add: Timeline dependency marking (entertainment set times relative to dinner courses)
- Add: Operational note field for chef (noise level, power draw, space conflicts)

**Where it appears:**

- Event detail page (vendor coordination section)
- Event timeline (entertainment windows)
- Chef service-day prep (operational awareness)

**What remains as permanent exit:**
Everything. Finding, auditioning, hiring, and managing entertainment is external. ChefFlow tracks timeline dependencies only.

**Priority:** Low frequency x Low effort (already built) = Low priority
**Spec needed?** No

---

## Scenario #48: Send invitations

**Original classification:** Bridgeable with RSVP/dietary links and guest import.
**Reclassified to:** Bridgeable

**Why client leaves:** Clients use dedicated invitation platforms (Paperless Post, Evite, Partiful) for visual design, RSVP tracking, and guest messaging. These platforms own the social layer of event invitations.

**Context ChefFlow has:**

- Guest list management (`lib/events/client-guest-actions.ts` with full CRUD, RSVP status tracking)
- Dietary collection system (per-guest allergies and dietary restrictions)
- No-login guest portal (`app/(public)/event/[eventId]/guest/[secureToken]/`) for RSVP and dietary submission
- Hub RSVP system (`lib/hub/rsvp-actions.ts`)
- Guest dietary rollup for the chef
- Dinner Circle workspace with attendee profiles

**Data source?** No. Invitation platforms are creative design + social coordination tools.

**Client-collaborative angle:** Strong. After invitations go out externally, ChefFlow can receive the results: guest list import, RSVP status sync, dietary collection via ChefFlow's own guest links. The no-login guest portal lets the host share a dietary-confirm link alongside (or after) the formal invitation.

**Physical reality:** Screen-based (designing and sending invitations is a desktop/phone task).

**Compounding:** Medium. Guest lists compound across events (household members, recurring friends). Dietary data collected once persists.

**Solution design:**

- Already built: Guest list management with RSVP tracking and dietary collection
- Already built: No-login guest portal for RSVP and dietary submission via secure token
- Already built: Hub RSVP system for Dinner Circle guests
- Add: "Import from invitation platform" flow (paste CSV/spreadsheet of names + emails)
- Add: Dietary-collection link generator for embedding in external invitations
- Add: RSVP sync bridge (manual update from external platform counts)

**Where it appears:**

- Client portal (guest management section)
- Event detail page (guest list)
- No-login guest portal (dietary confirm token page)
- Dinner Circle workspace (attendee_profiles module)

**What remains as permanent exit:**
Designing, sending, and managing the formal invitation through the invitation platform. ChefFlow receives the output (guest list, RSVPs, dietary info).

**Priority:** High frequency x Medium effort = High priority
**Spec needed?** No (guest RSVP/dietary system is already built; import flow is a small enhancement)

---

## Scenario #49: Build seating chart

**Original classification:** Bridgeable with guest list export.
**Reclassified to:** Partially Reducible

**Why client leaves:** Clients use visual layout tools (Canva, event planner apps, spreadsheets) to arrange guests at tables considering social dynamics, family groupings, VIP placement, and accessibility needs.

**Context ChefFlow has:**

- Full guest list with RSVP status, dietary restrictions, allergies
- Dinner Circle workspace `seating_plan` module (spec'd: seat assignments, accessibility placement, VIPs, client-safe print view, private conflict/keep-apart notes)
- Guest count and table count context
- Household/relationship data from client profiles

**Data source?** No. Seating is a creative/social decision requiring human judgment about relationships and dynamics.

**Client-collaborative angle:** Strong. The Dinner Circle `seating_plan` module is explicitly designed for this: guests see their seat assignment, chef sees service-relevant notes, host manages the full plan. Private "keep apart" notes stay hidden from guest views. This is already spec'd in the build queue.

**Physical reality:** Often ends as a printed chart for the venue. Print-safe view is explicitly part of the `seating_plan` module spec. Large format for at-a-glance reference at the door.

**Compounding:** Low. Each event has unique seating. However, "keep apart" and "seat together" preferences may persist for repeat guest groups.

**Solution design:**

- Already spec'd: Full seating plan module in Dinner Circle workspace (`BQ-20260519T171015Z-add-dinner-circle-seating-chart-and-table-plan`)
- Includes: seat assignments, accessibility placement, VIPs, print view, chef service notes, private conflict notes
- Once built: client can build seating chart entirely within ChefFlow
- Add: Guest list export (CSV) for clients who prefer external tools as fallback

**Where it appears:**

- Dinner Circle workspace (seating_plan module)
- Client portal (event planning section)
- Print export (table assignments for venue door)
- Chef view (service notes per table/seat)

**What remains as permanent exit:**
If the seating_plan module is built: very little. Clients with extremely complex layouts (200+ guests, non-standard venue shapes) may still use specialized tools. For typical private dining (8-30 guests), ChefFlow can own this entirely.

**Priority:** Medium frequency x Medium effort (spec exists, not yet built) = Medium priority
**Spec needed?** No (already in build queue as `BQ-20260519T171015Z-add-dinner-circle-seating-chart-and-table-plan`)

---

## Scenario #50: Coordinate alcohol or bar service

**Original classification:** Bridgeable with beverage notes and policy capture.
**Reclassified to:** Partially Reducible

**Why client leaves:** Beverage service coordination spans multiple concerns: who provides drinks, what to buy, where to buy it, bar setup, bartender hiring, venue alcohol policies, and wine/cocktail pairing with the menu.

**Context ChefFlow has:**

- Full beverage discovery section (`lib/events/beverage-discovery-actions.ts` and `components/events/beverage-discovery-section.tsx`): service type (chef_provides, client_provides, BYOB, no_alcohol, TBD), alcohol toggle, expectations notes
- Vendor coordination with dedicated tracking for bar service vendors
- Menu context (pairings, course structure)
- Event venue details with bar zone field
- Guest count for quantity estimation

**Data source?** Partially. Wine/spirits pricing could be sourced from APIs, but the buying decision and physical procurement remain external.

**Client-collaborative angle:** Medium. Client decides beverage service type (already captured in beverage_discovery_section). Chef provides pairing recommendations. Dinner Circle can collect guest drink preferences or special requests.

**Physical reality:** Screen for planning; physical for purchasing and setting up the bar.

**Compounding:** Medium. Beverage service preferences per client persist (e.g., "always wants wine pairings," "BYOB family"). Venue bar capabilities compound in venue profiles.

**Solution design:**

- Already built: Beverage discovery section with service type, alcohol toggle, and expectations notes
- Already built: Venue details panel with bar zone field
- Already built: Vendor coordination for bartender/bar service contacts
- Add: Quantity calculator (bottles per guest based on event duration and service style)
- Add: Pairing suggestion field linked to menu courses
- Add: Beverage responsibility assignment (who buys what, confirmed/pending status)

**Where it appears:**

- Event detail page (beverage discovery section)
- Venue details (bar zone)
- Vendor coordination (bartender contacts)
- Client portal (beverage decisions)

**What remains as permanent exit:**
Physically purchasing alcohol, hiring a bartender from external sources, reviewing venue alcohol policies/permits. ChefFlow captures decisions and tracks responsibilities.

**Priority:** High frequency x Low effort (mostly built) = Low remaining priority
**Spec needed?** No

---

## Scenario #51: Order cake, favors, or non-chef food

**Original classification:** Permanent exit. Track external commitments in event notes.
**Reclassified to:** Permanent

**Why client leaves:** The client orders from external bakeries, specialty stores, or delivery services for items outside the chef's scope: birthday cakes, wedding cakes, party favors, candy, dessert bars from specialty vendors.

**Context ChefFlow has:**

- Vendor coordination system with 'other' vendor type (can track any external vendor)
- Event notes and discovery fields
- Event timeline (when cake/favors need to arrive)
- Budget tracking (cost_cents field on vendor entries)
- Celebration board module in Dinner Circle (surprises, cakes, reveal timing)

**Data source?** No. Bakeries, favor shops, and specialty food vendors are external businesses.

**Client-collaborative angle:** Low for ChefFlow specifically. Client manages these vendor relationships. ChefFlow's interest is: (1) timeline awareness (when does cake arrive?), (2) dietary conflicts (does the external cake contain allergens that conflict with guest restrictions?), (3) service coordination (does chef plate it? store it? serve it?).

**Physical reality:** Screen for ordering; physical for delivery coordination on event day.

**Compounding:** Low. Each event typically has unique cake/favor needs. Vendor contacts may recur.

**Solution design:**

- Already built: Vendor coordination section can track any vendor type with contact info, timing, cost, confirmation
- Already built: Celebration board module spec (surprises, cakes, reveal timing in Dinner Circle)
- Add: "External food items" checklist field (allergen cross-reference with guest dietary data)
- Add: Service-day note for chef (e.g., "birthday cake arrives at 8pm, needs refrigeration, chef plates")

**Where it appears:**

- Event detail page (vendor coordination section)
- Dinner Circle workspace (celebration_board module)
- Pre-service checklist (external item arrivals)
- Chef service-day timeline

**What remains as permanent exit:**
Everything. Finding, ordering, and receiving cake/favors from external vendors. ChefFlow tracks the logistics slot and allergen implications.

**Priority:** Medium frequency x Low effort (already built) = Low priority
**Spec needed?** No

---

## Batch Summary

| #   | Title                                | Reclassified To     | Spec Needed? |
| --- | ------------------------------------ | ------------------- | ------------ |
| 43  | Book a venue                         | Permanent           | No           |
| 44  | Coordinate with event planner        | Bridgeable          | No           |
| 45  | Book rentals                         | Partially Reducible | No           |
| 46  | Hire florist/decorator               | Permanent           | No           |
| 47  | Hire entertainment                   | Permanent           | No           |
| 48  | Send invitations                     | Bridgeable          | No           |
| 49  | Build seating chart                  | Partially Reducible | No           |
| 50  | Coordinate alcohol or bar service    | Partially Reducible | No           |
| 51  | Order cake, favors, or non-chef food | Permanent           | No           |

## Classification Distribution

| Classification      | Count | Scenarios          |
| ------------------- | ----- | ------------------ |
| Permanent           | 4     | #43, #46, #47, #51 |
| Bridgeable          | 2     | #44, #48           |
| Partially Reducible | 3     | #45, #49, #50      |

## Key Findings

1. **ChefFlow already has substantial vendor coordination infrastructure.** The vendor coordination section (`components/events/vendor-coordination-section.tsx`) with 10 vendor types, full CRUD, contact tracking, confirmation status, and cost logging covers most tracking needs.

2. **The Dinner Circle workspace has spec'd but unbuilt modules** that would further reduce exits: `seating_plan`, `celebration_board`, `collaborator_access`, and `event_packet` are all defined with roles, privacy guardrails, and proof focus areas.

3. **No scenarios in this category are fully Reducible.** Event planning inherently involves external vendors and marketplaces. ChefFlow's role is tracking, coordination timing, and information flow, not replacing vendor ecosystems.

4. **Equipment rental tracking is the most complete system** (`lib/events/equipment-rental-actions.ts`) with dedicated table, vendor details, item lists, pickup/return times, deposits, and confirmation numbers.

5. **Beverage discovery is well-built** with service type selection, alcohol toggle, and freeform notes. The main gap is quantity calculation and pairing recommendations tied to the menu.

6. **Guest invitation bridging is the highest-value remaining gap** in this category. ChefFlow has the guest portal and dietary collection infrastructure but lacks a smooth "import from invitation platform" flow.

## Codebase Evidence

| Feature                                | File                                                              | Status            |
| -------------------------------------- | ----------------------------------------------------------------- | ----------------- |
| Venue profiles + auto-link             | `lib/venues/recon-actions.ts`, `lib/events/venue-link-actions.ts` | Built             |
| Venue details (parking, access, zones) | `components/events/venue-details-panel.tsx`                       | Built             |
| Vendor coordination CRUD               | `components/events/vendor-coordination-section.tsx`               | Built             |
| Vendor coordination log                | `lib/vendors/vendor-coordination-actions.ts`                      | Built             |
| Equipment rental tracking              | `lib/events/equipment-rental-actions.ts`                          | Built             |
| Beverage discovery                     | `lib/events/beverage-discovery-actions.ts`                        | Built             |
| Guest list + RSVP + dietary            | `lib/events/client-guest-actions.ts`                              | Built             |
| No-login guest portal                  | `app/(public)/event/[eventId]/guest/[secureToken]/`               | Built             |
| Hub RSVP system                        | `lib/hub/rsvp-actions.ts`                                         | Built             |
| Seating plan module                    | `lib/dinner-circles/event-workspace.ts` (seating_plan)            | Spec'd, not built |
| Collaborator access (planner)          | `lib/dinner-circles/event-workspace.ts` (collaborator_access)     | Spec'd, not built |
| Celebration board                      | `lib/dinner-circles/event-workspace.ts` (celebration_board)       | Spec'd, not built |
| Event packet export                    | `lib/dinner-circles/event-workspace.ts` (event_packet)            | Spec'd, not built |
