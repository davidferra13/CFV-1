# Exit Eval: Vendor / DELIVERY, LOGISTICS & PHYSICAL FULFILLMENT

> Wave 6 | 8 scenarios | Role: Vendor
> Evaluator: Claude (solo mode) | Date: 2026-05-25
> Status: **NEEDS-DEVELOPER-REVIEW** (all scenarios)

---

## Scenario #26: Route delivery

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why vendor leaves:** The vendor's driver or dispatcher needs turn-by-turn navigation and multi-stop route optimization to deliver orders across multiple chefs and locations. This is a real-time, GPS-driven operation that requires a full mapping/logistics engine (Google Maps, Waze, proprietary dispatch software). ChefFlow is not a routing or navigation tool and should never try to be one.

**Context ChefFlow has:**

- Event location address (`events.locationAddress`, `locationCity`, `locationState`, `locationZip`)
- Event access instructions (`events.accessInstructions`)
- Venue profile with parking notes and access instructions (`venueProfiles.parkingNotes`, `venueProfiles.accessInstructions`)
- Expected delivery date on the purchase order (`purchaseOrders.expectedDeliveryDate`)
- Purchase order delivery location reference (`purchaseOrders.deliveryLocationId`)
- Chef's region/zip

**Data source?** Yes, but the source (Google Maps / routing APIs) is consumed by the vendor's own dispatch tools. ChefFlow should not try to route vendor deliveries; it does not know the vendor's full delivery manifest.

**Client-collaborative angle:** None directly. The chef (not client) is the delivery destination. The chef could confirm a preferred delivery window or location, which ChefFlow already captures via event fields and venue profiles.

**Physical reality:** Routing is a driver's phone/tablet task. Paper route sheets are common for multi-stop deliveries. ChefFlow's contribution is making the destination address and access details easy to copy or print from the vendor order detail page.

**Compounding:** Medium. A vendor delivering to the same chef address repeatedly learns the route, but each delivery day's route is unique based on the full stop list. Venue profiles compound (parking, access), but routing itself does not.

**Solution design:**

- Surface the delivery address prominently on the vendor order detail page (currently not shown at all)
- Add a "Copy address" button and a deep link to Google Maps on the vendor order detail
- Include access instructions and parking notes from the event or venue profile in a "Delivery notes" section visible to the vendor
- Support a clean print/export of order + delivery details for driver handoff

**Where it appears:**

- `/vendor/orders/[id]` (order detail page, add delivery address + map link)
- Vendor order print/export view (does not exist yet)

**What remains as permanent exit:**
The vendor will always use their own routing/dispatch tools for multi-stop route planning. ChefFlow provides the destination data cleanly, not the routing engine.

**Priority:** Medium frequency (every delivery day) x Low effort (address display + copy/link) = **Quick win**
**Spec needed?** No (addressed as part of vendor order detail enhancement)

---

## Scenario #27: Track truck status

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why vendor leaves:** Real-time driver GPS tracking belongs to the vendor's dispatch system. The vendor dispatcher checks where their truck is, estimated time to next stop, and whether the driver is behind schedule. ChefFlow has no telemetry feed from vendor vehicles.

**Context ChefFlow has:**

- Expected delivery date (`purchaseOrders.expectedDeliveryDate`)
- Order status (sent, acknowledged, partially_received, received)
- Event date and serve time for urgency context

**Data source?** No. Vehicle tracking is proprietary to each vendor's fleet management system.

**Client-collaborative angle:** None. The chef is the receiver, not the tracker. However, the chef benefits from knowing the ETA, which the vendor could provide.

**Physical reality:** Dispatchers use dedicated screens/apps. Drivers use phone GPS. Neither will switch to ChefFlow for this.

**Compounding:** Low. Each delivery is a unique real-time event. No historical value from tracking data.

**Solution design:**

- Add an optional "ETA / Tracking" field on the vendor order detail that the vendor can update (free text: "ETA 2:30pm" or a tracking URL)
- Chef-side order detail shows the vendor-provided ETA or tracking link when present
- No attempt to build dispatch, GPS tracking, or fleet management

**Where it appears:**

- `/vendor/orders/[id]` (add ETA input field for vendor)
- Chef-side PO detail (show vendor-provided ETA)

**What remains as permanent exit:**
All actual truck tracking stays in vendor dispatch tools. ChefFlow only receives the vendor's self-reported ETA or a link.

**Priority:** Low frequency (only when chef asks "where's my order?") x Low effort (one text field) = **Low priority, easy add**
**Spec needed?** No

---

## Scenario #28: Document proof of delivery

**Original classification:** Bridgeable
**Reclassified to:** Bridgeable

**Why vendor leaves:** The vendor driver needs to capture proof that the order was delivered: a photo of items at the door, a signed delivery receipt, or a timestamped record. Today this happens via the driver's phone camera, a paper POD form, or the vendor's delivery app. The vendor portal has no upload surface.

**Context ChefFlow has:**

- Purchase order with line items, quantities, and totals
- `purchaseOrders.photoUrl` field exists in the schema (currently unused on vendor side)
- `purchaseOrders.receivedAt` timestamp
- Order status transitions (acknowledged -> partially_received -> received)
- Event and venue context for the delivery location

**Data source?** No. Proof of delivery is generated at the physical delivery point. It is a photo/document, not an API data source.

**Client-collaborative angle:** Minimal. The chef (receiver) could confirm receipt from their side, which already exists via the chef-side PO status. The vendor needs to capture their own proof independently.

**Physical reality:** Driver takes a phone photo or gets a signature on a clipboard. The natural interface is a camera upload button on mobile. Large, simple UI for a driver standing at a doorstep. This is a "one hand holding a box" moment.

**Compounding:** Low per delivery. Medium over time: a vendor with consistent POD records builds trust and dispute resolution evidence. The `purchaseOrders.photoUrl` field already exists to store this.

**Solution design:**

- Add a photo upload button on the vendor order detail page (mobile-optimized, large tap target)
- Store the photo URL in `purchaseOrders.photoUrl` (field already exists)
- Allow vendor to add a delivery note (e.g., "Left with front desk, Jane")
- Chef sees the POD photo and note on their order detail
- Optional: auto-timestamp the upload as proof-of-delivery time

**Where it appears:**

- `/vendor/orders/[id]` (add photo upload + delivery note input)
- Chef-side PO detail (show POD photo and note)

**What remains as permanent exit:**
Vendors using their own POD systems (driver apps, fleet management) will continue to use them. ChefFlow offers a parallel capture path, not a replacement. The vendor's internal compliance system remains external.

**Priority:** Medium frequency (every delivery) x Medium effort (photo upload component) = **Medium priority**
**Spec needed?** No (uses existing `photoUrl` field; standard upload pattern)

---

## Scenario #29: Report delivery issue

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why vendor leaves:** The vendor driver encounters a problem at delivery: nobody to receive, wrong address, spoiled items during transit, quantity discrepancy, access gate locked. Today the driver calls/texts the chef or the vendor dispatcher calls the chef. No structured issue reporting exists in the vendor portal.

**Context ChefFlow has:**

- Full purchase order with expected items and quantities
- Delivery location and access instructions
- Chef contact information (though vendor portal does not currently expose it)
- Event date and timing context
- Order status history
- Vendor coordination log (chef-side, via `vendor-coordination-actions.ts`)

**Data source?** No. Delivery issues are observed in the physical world by the driver.

**Client-collaborative angle:** Low. The chef is the one who needs to respond to the issue (open the gate, redirect delivery, accept partial). The issue report surfaces the problem to the chef.

**Physical reality:** Driver is standing at a location with a problem. Needs a quick, simple form: category dropdown + free text + optional photo. Must work on mobile with one hand. Large buttons, minimal typing.

**Compounding:** High. Patterns of delivery issues at specific venues (locked gates, wrong addresses, nobody home) compound into venue intelligence. A venue that always has access problems should have that flagged proactively on future orders to that location.

**Solution design:**

- Add "Report Issue" action on vendor order detail (appears when order is in `sent` or `acknowledged` status)
- Issue form: category (access denied, nobody to receive, quantity discrepancy, quality/damage, wrong address, other) + description + optional photo
- Issue creates a notification to the chef (or feeds into vendor coordination log)
- Chef sees issue on their PO detail with timestamp and category
- Issues linked to venue profiles compound: "3 access issues at this address in the last year"

**Where it appears:**

- `/vendor/orders/[id]` (add "Report Issue" button and form)
- Chef-side PO detail (show vendor-reported issues)
- Venue profile (aggregate delivery issue history)

**What remains as permanent exit:**
Urgent issues will still trigger a phone call. The vendor won't wait for an in-app response when standing at a locked gate with perishables. The form captures the record; the phone call handles the emergency.

**Priority:** Medium frequency (issues happen on ~5-10% of deliveries) x Medium effort (form + notification) = **Medium-high priority**
**Spec needed?** Yes (touches vendor portal actions, chef notifications, venue profile aggregation)

---

## Scenario #30: Coordinate loading dock or access

**Original classification:** Bridgeable
**Reclassified to:** Bridgeable

**Why vendor leaves:** The vendor driver needs to know: where to park the truck, which entrance to use, whether there's a loading dock, elevator access, gate codes, buzzer numbers, or a security desk to check in with. Today this comes via phone calls to the chef, who relays what the client told them, or the driver searches Google Maps satellite view.

**Context ChefFlow has:**

- Event `accessInstructions` field (text, already on events table)
- Event `locationNotes` field
- Venue profile `parkingNotes` and `accessInstructions` (compounding venue intelligence)
- Venue profile `venueType` (residential, commercial_kitchen, venue_hall, etc.)
- Event location address

**Data source?** No. Access details are human knowledge (client knows their building, chef learns from experience, venue profile captures it over time).

**Client-collaborative angle:** High. The client/host knows their own building better than anyone: gate codes, loading dock hours, elevator access, parking restrictions. Dinner Circle could collect this during event setup. Today the chef asks the client, then relays to the vendor by phone.

**Physical reality:** Driver needs this info while approaching the venue. Large text, glanceable, on phone. Could also be printed on the delivery ticket. Not a complex UI problem; it is a data availability problem.

**Compounding:** Very high. A venue's access details rarely change. Capture once from the client via Circle or from the chef's experience, store in the venue profile, and every future vendor delivery to that address has the info automatically. This is the definition of "capture once, serve forever."

**Solution design:**

- Surface venue access notes and parking info on the vendor order detail page when the PO is linked to an event with a known venue
- Pull from event `accessInstructions` and venue profile `parkingNotes` + `accessInstructions`
- Include in the printable/exportable delivery ticket
- Add a "Confirm access info received" acknowledgment so the chef knows the vendor saw the instructions
- Dinner Circle collects access details from client during event setup (feeds event and venue profile)

**Where it appears:**

- `/vendor/orders/[id]` (add "Delivery Access" section pulling from event/venue)
- Vendor order print/export view
- Dinner Circle setup flow (client provides access details)
- Venue profile (accumulates access intelligence)

**What remains as permanent exit:**
First-time venues with no profile data. Driver still calls chef or searches Google Maps. But this shrinks with every delivery as venue profiles accumulate.

**Priority:** High frequency (every delivery to a non-trivial location) x Low effort (display existing data) = **High priority, quick win**
**Spec needed?** No (display of existing data; no new tables or complex logic)

---

## Scenario #31: Handle same-day route changes

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why vendor leaves:** A delivery scheduled for today needs to change: the chef moved the delivery time, a venue is suddenly inaccessible, an order needs to be rerouted to a different address, or priority changed. The vendor dispatcher adjusts the driver's route in their dispatch system. This is real-time logistics coordination.

**Context ChefFlow has:**

- Expected delivery date and event timing
- Delivery address and access details
- Order priority (implicit from event date proximity)
- No real-time dispatch or driver communication channel

**Data source?** No. Same-day route changes are operational decisions made by the vendor dispatcher based on their full delivery manifest and driver locations.

**Client-collaborative angle:** None. Same-day changes are between chef and vendor. The chef might request a time change; the vendor dispatcher executes it.

**Physical reality:** Dispatcher uses radio/phone/app to redirect driver. This happens in seconds. No portal interaction is fast enough for same-day urgency.

**Compounding:** Low. Each same-day change is unique. No historical pattern to capture.

**Solution design:**

- Add lightweight "ETA / Status" update field on vendor order detail (same as #27)
- Vendor can update the expected delivery time when route changes
- Chef sees the updated ETA on their PO detail
- No attempt to replace dispatch, driver communication, or route optimization

**Where it appears:**

- `/vendor/orders/[id]` (ETA update field, shared with #27)
- Chef-side PO detail (show updated ETA)

**What remains as permanent exit:**
All same-day logistics coordination stays in the vendor's dispatch system. ChefFlow captures the outcome (new ETA) after the decision is made, not during the decision.

**Priority:** Low frequency (same-day changes are exceptions) x Low effort (ETA field, shared with #27) = **Low priority**
**Spec needed?** No

---

## Scenario #32: Confirm cold-chain or handling details

**Original classification:** Bridgeable
**Reclassified to:** Bridgeable

**Why vendor leaves:** The vendor needs to document that temperature-sensitive items maintained proper cold chain during transport: temperature logs, insulated packaging confirmation, ice pack records. This is for food safety compliance and dispute resolution. Today this lives in delivery paperwork, compliance logs, or the vendor's quality management system.

**Context ChefFlow has:**

- Purchase order line items (knows what was ordered, which may include temperature-sensitive items)
- Vendor catalog items with category information
- Event food safety context (dietary restrictions, allergies; not temperature handling)
- `purchaseOrders.photoUrl` (could store a photo of temperature log)
- No temperature logging, cold-chain tracking, or compliance proof fields

**Data source?** No. Cold-chain data comes from physical temperature monitors (data loggers, infrared thermometers) carried with the shipment. Some vendors use IoT temperature monitoring but that is a specialized system.

**Client-collaborative angle:** None. Cold chain is the vendor's responsibility. The chef may want to see proof upon receipt, but does not contribute to the vendor's compliance documentation.

**Physical reality:** Driver checks temperature, photographs the data logger, notes it on paperwork. A simple upload (photo of temp log + text note) would capture this for the ChefFlow record without replacing the vendor's compliance system.

**Compounding:** Medium. A vendor's cold-chain reliability across many deliveries builds trust evidence. Individual temperature logs have regulatory value. Patterns (e.g., "this vendor always delivers at correct temp") feed into the vendor scorecard.

**Solution design:**

- Add optional "Compliance / Handling Proof" upload on vendor order detail (photo + note)
- Categorize as: temperature log, packaging confirmation, handling certificate, other
- Chef sees compliance proof on their PO detail
- Feed compliance proof count into vendor scorecard (`scorecard-actions.ts` already exists)
- No attempt to replace the vendor's food safety management system

**Where it appears:**

- `/vendor/orders/[id]` (add "Handling Proof" upload section)
- Chef-side PO detail (show compliance documents)
- Vendor scorecard (compliance proof rate metric)

**What remains as permanent exit:**
The vendor's internal HACCP records, temperature monitoring systems, and regulatory compliance documentation all stay external. ChefFlow captures event/order-specific proof only.

**Priority:** Low frequency (only for temperature-sensitive deliveries and compliance-conscious vendors) x Medium effort (upload + categorization) = **Low priority**
**Spec needed?** No (standard upload pattern, ties into existing scorecard)

---

## Scenario #33: Collect signature or receiving name

**Original classification:** Permanent
**Reclassified to:** Partially Reducible

**Why vendor leaves:** The vendor driver needs to record who received the delivery: a signature on a paper invoice, a name typed into a driver app, or a photo of the signed receipt. This serves as proof that someone at the destination accepted the goods. The vendor's POD (proof of delivery) system handles this.

**Context ChefFlow has:**

- Chef's name (the expected receiver in most private chef scenarios)
- Event details with location
- `purchaseOrders.receivedAt` timestamp (set when vendor marks order "received")
- `purchaseOrders.photoUrl` (could store signed receipt photo)
- No signature capture, receiving party name field, or digital signing

**Data source?** No. Signature/name capture is a physical-world interaction between the driver and the receiver.

**Client-collaborative angle:** Low. In private chef scenarios, the chef is usually the receiver. In venue/event scenarios, the venue contact or an assistant might receive. The event could pre-designate a receiving contact name.

**Physical reality:** Driver holds a clipboard or phone for signature. Digital signature pads exist in driver apps. ChefFlow could capture the receiving name as text (much simpler than building signature capture). Photo of signed paper receipt is already covered by #28's POD photo upload.

**Compounding:** Low per delivery. Medium over time: knowing who received at each venue builds a contact list (e.g., "always deliver to Jane at the front desk at this building").

**Solution design:**

- Add "Received by" text field on vendor order detail (vendor enters the name of the person who accepted delivery)
- Auto-populate with chef name as default (vendor can change if someone else received)
- Store alongside the received status transition
- Photo of signed receipt covered by #28's POD photo upload
- No digital signature capture (adds complexity for minimal value in the private chef context)
- Venue profile could accumulate common receiving contacts

**Where it appears:**

- `/vendor/orders/[id]` (add "Received by" field when marking as received)
- Chef-side PO detail (show who received)
- Venue profile (optional: common receiving contacts)

**What remains as permanent exit:**
Vendors using their own POD apps with digital signature capture will continue to use them. ChefFlow captures the receiving name, not a legal signature. For formal signature requirements, the vendor's system remains authoritative.

**Priority:** Low frequency (only matters for dispute resolution) x Low effort (one text field) = **Low priority, easy add**
**Spec needed?** No

---

## Batch Summary

| #   | Title                                  | Reclassified To     | Spec Needed? |
| --- | -------------------------------------- | ------------------- | ------------ |
| 26  | Route delivery                         | Permanent           | No           |
| 27  | Track truck status                     | Permanent           | No           |
| 28  | Document proof of delivery             | Bridgeable          | No           |
| 29  | Report delivery issue                  | Reducible           | Yes          |
| 30  | Coordinate loading dock or access      | Bridgeable          | No           |
| 31  | Handle same-day route changes          | Permanent           | No           |
| 32  | Confirm cold-chain or handling details | Bridgeable          | No           |
| 33  | Collect signature or receiving name    | Partially Reducible | No           |

### Classification Breakdown

- **Permanent:** 3 (#26, #27, #31)
- **Bridgeable:** 3 (#28, #30, #32)
- **Reducible:** 1 (#29)
- **Partially Reducible:** 1 (#33)

### Key Patterns

1. **The vendor order detail page is the hub.** All 8 scenarios touch `/vendor/orders/[id]`. The current page shows line items and status actions but lacks delivery context (address, access, ETA, POD, issue reporting).
2. **Existing schema fields are underused.** `purchaseOrders.photoUrl`, `purchaseOrders.deliveryLocationId`, event `accessInstructions`, and venue profile `parkingNotes`/`accessInstructions` all exist but are not surfaced on the vendor portal.
3. **Venue profiles are the compounding engine.** Access details, parking notes, and delivery issue history compound across deliveries. This is "capture once, serve forever" intelligence.
4. **Physical delivery is permanently external.** ChefFlow should never try to be a dispatch system, route planner, or fleet manager. It provides clean destination data out and captures proof/status back.

### Quick Wins (No spec needed, low effort)

- Surface delivery address + map link on vendor order detail (#26)
- Show access/parking notes from event and venue profile (#30)
- Add ETA text field for vendor updates (#27, #31)
- Add "Received by" name field (#33)

### Needs Spec

- **#29 (Report delivery issue):** Touches vendor portal actions, chef notifications, and venue profile aggregation. Should be specced as `vendor-delivery-issue-reporting.md`.
