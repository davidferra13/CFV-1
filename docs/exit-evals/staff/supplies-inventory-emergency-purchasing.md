# Staff / Supplies, Inventory & Emergency Purchasing Exit Evaluation

Mode: Solo evaluation. Every scenario is marked `NEEDS-DEVELOPER-REVIEW`.

## Scenario #40: Buy missing ingredient or disposable

**Original classification:** Permanent
**Reclassified to:** Bridgeable
**Review status:** NEEDS-DEVELOPER-REVIEW

**Why staff leaves:** Staff need to physically recover a missing ingredient, disposable, ice, fuel, smallware, or emergency supply fast enough to protect service. The operational job is not "go shopping"; it is "know what is missing, whether the staff member is authorized to buy it, where to go, what substitutions are acceptable, how much to spend, and how to get proof back into ChefFlow."
**Context ChefFlow has:**

- Event date, serve time, arrival time, guest count, service style, location, access notes, kitchen notes, site notes, chef phone, and staff assignment context.
- Staff station clipboard entries with component name, menu item context, par level, on-hand count, need-to-make, need-to-order, 86'd state, waste quantity, waste reason, and notes.
- Chef-side menu, recipe, ingredient, procurement, purchase order, preferred store, vendor, receipt, expense, and inventory transaction systems.
- Chef-side nearby store discovery through Google Places for event coordinates.
- Chef-side receipt capture and OCR that can turn supply runs into expenses, ingredient price history, vendor price points, and inventory receive transactions.

**Data source?** No for the full workflow. The purchase, payment, delivery, and physical handoff are external actions. Google Places, OpenClaw/store catalogs, vendor records, preferred stores, and receipt history can source the recovery packet.
**Client-collaborative angle:** Dinner Circle can ask the client or venue host what exists on site: pantry staples, ice, trash bags, foil, serving disposables, local store recommendations, delivery restrictions, building rules, or "do not use this store" notes.
**Physical reality:** This is a stress moment during prep or service. Staff need a large, mobile emergency card, a one-tap chef call fallback, voice-readable instructions, and camera receipt capture after purchase. Print helps if the run is assigned before staff leave.
**Compounding:** High. Emergency suppliers, venue-specific store picks, missing-item patterns, approved substitutions, and staff purchase outcomes should become reusable recovery intelligence.

**Solution design:**

- Add a staff-safe emergency purchase card triggered from low on-hand, need-to-order, 86'd, or chef-assigned emergency supply tasks.
- Include item, quantity, unit, acceptable substitutions, max spend, reimbursement expectation, preferred store, nearby alternatives, directions, and call link.
- Let staff mark the result as bought, unavailable, substituted, or escalated, with optional note and receipt photo.
- Route captured receipts into a chef approval queue before they become expenses, reimbursements, inventory receives, or price history.
- Promote successful store/item recovery back into venue and preferred-store intelligence after chef review.

**Where it appears:**

- `/staff-station`
- `/staff-portal/[id]`
- Chef-side `/events/[id]/receipts`, `/inventory/procurement`, and `/settings/store-preferences`

**What remains as permanent exit:**
The staff member still leaves ChefFlow for the physical trip, retail checkout, marketplace order, vendor call, payment app, or delivery coordination. ChefFlow should own the recovery packet and return capture, not the retail transaction itself.

**Priority:** Medium-high frequency x medium effort = high bridge priority
**Spec needed?** yes

## Scenario #41: Check store availability

**Original classification:** Permanent
**Reclassified to:** Partially Reducible
**Review status:** NEEDS-DEVELOPER-REVIEW

**Why staff leaves:** Staff need confidence that a nearby or approved store actually has the missing item before spending critical event time driving, calling, or ordering.
**Context ChefFlow has:**

- Event address, coordinates, timing, station needs, menu ingredients, and staff assignment context.
- Chef preferred stores and per-ingredient store assignment support.
- Google Places nearby store search with distance, open-now signal, and directions for chef-side event surfaces.
- OpenClaw event shopping optimization, store scorecards, price history, receipt-derived store data, vendor catalogs, and ingredient price history.
- Procurement supplier directory and purchase orders, but inspected procurement flows are chef-gated rather than staff-facing.

**Data source?** Yes, partially. Store catalogs, OpenClaw price data, vendor item catalogs, Google Places, and retailer APIs can source likely availability or open-store confidence. Real-time shelf stock, substitution acceptance, checkout, and reservation remain unreliable or external.
**Client-collaborative angle:** Dinner Circle can collect venue/client knowledge that staff otherwise search for: nearest reliable grocery, ice source, restaurant supply store, building delivery rules, and on-site pantry/disposable inventory.
**Physical reality:** This should be a pre-run glance, not research. Staff need "best likely store", open/distance, call/store-app handoff, and a quick way to report "in stock", "out of stock", or "bought substitute".
**Compounding:** Medium-high. Store reliability, item/store pairings, receipt evidence, and successful substitutions compound by venue, region, and ingredient category.

**Solution design:**

- Add an availability-confidence layer to the emergency purchase card using preferred stores, nearby stores, store scorecards, catalog/receipt freshness, and vendor item records.
- Show "likely", "unknown", or "needs call" rather than pretending ChefFlow knows live shelf stock when it does not.
- Provide one-tap directions and call/store-app handoff with the missing item and acceptable substitution context copied.
- Capture staff outcome feedback so future availability confidence improves by item, store, venue, and time of day.

**Where it appears:**

- `/staff-portal/[id]` emergency supply section
- `/staff-station` missing item or 86'd component state
- Chef-side `/prices/store/[storeId]`, `/inventory/procurement`, `/pie-cart`, and `/settings/store-preferences`

**What remains as permanent exit:**
Guaranteed live shelf stock, retail checkout, pickup/delivery slot reservation, and final store confirmation remain in retailer apps, store websites, Instacart-style marketplaces, or phone calls.

**Priority:** Medium frequency x medium-high effort = useful but source-dependent roadmap candidate
**Spec needed?** yes

## Scenario #42: Photograph a receipt for reimbursement

**Original classification:** Reducible
**Reclassified to:** Reducible
**Review status:** NEEDS-DEVELOPER-REVIEW

**Why staff leaves:** Staff need to prove an out-of-pocket purchase, connect it to the event or assignment, and get reimbursed without texting the chef a photo or losing the paper receipt.
**Context ChefFlow has:**

- Staff token portal context: event, staff member, role, tasks, assignment notes, hours, and chef contact.
- Authenticated staff portal context: staff identity, tenant, schedule, tasks, time, and station assignment.
- Chef-only receipt capture from event pages and the receipt library, including camera/file upload, storage, OCR, extraction, review, and approval.
- Expense records with event linkage, vendor name, receipt photo URL, receipt uploaded state, category, and business/personal tagging.
- Receipt approval logic that can create expenses, line items, ingredient price updates, vendor price points, and inventory receive transactions.

**Data source?** No. The receipt photo is staff-generated evidence. OCR/vision is a processing source after capture, not the external tool staff should visit.
**Client-collaborative angle:** Low. The client may know whether a host-paid purchase should be passed through, comped, or reimbursed, but the core workflow is staff-to-chef reimbursement evidence.
**Physical reality:** Mobile camera capture is primary. Staff may have a folded or damp receipt, bad signal, and no time to categorize line items. ChefFlow should support capture-now-review-later and offline retry where possible.
**Compounding:** High. Every receipt can improve reimbursement history, event actuals, vendor matching, ingredient price history, inventory receipt, and future cost estimates.

**Solution design:**

- Add staff receipt upload tied to a token event briefing, staff assignment, emergency purchase, or authenticated staff schedule item.
- Reuse the existing receipt storage/OCR pipeline, but mark submissions as staff-submitted and pending chef review.
- Let staff add amount, payment method, purchase reason, and reimbursement note without requiring accounting categorization.
- Give the chef an approve/reject/reimburse state before creating final expense, pay adjustment, inventory receive, or price history records.
- Preserve low-friction camera capture with file type/size validation and a visible "receipt received" confirmation.

**Where it appears:**

- `/staff-portal/[id]`
- `/staff-station`
- Chef-side `/events/[id]/receipts`, `/receipts`, `/expenses`, and staff pay/reimbursement review

**What remains as permanent exit:**
Actual cash movement, payroll reimbursement, Venmo/Zelle/Cash App repayment, or bank settlement remains external unless ChefFlow later integrates payout rails.

**Priority:** High frequency x medium effort = top staff finance candidate
**Spec needed?** yes

## Scenario #43: Report waste with more context

**Original classification:** Reducible
**Reclassified to:** Reducible
**Review status:** NEEDS-DEVELOPER-REVIEW

**Why staff leaves:** Staff need to explain what was wasted, why it happened, whether it affects service or food safety, and whether the chef needs visual evidence. Current in-app station waste fields capture quantity, reason, and notes, but not enough incident context for expensive, repeated, or disputed waste.
**Context ChefFlow has:**

- Staff station clipboard with component, menu item, par level, on-hand, waste quantity, waste reason, 86'd state, and notes.
- Staff update attribution through `updated_by` on clipboard entries.
- Chef-side event waste logs with item name, category, quantity description, estimated cost, reason, notes, and event linkage.
- Chef-side station waste logs and summaries by station, component, reason, and estimated value.
- Event, menu, ingredient, guest count, dietary, station, and assignment context that can explain likely root causes.

**Data source?** No. This is operational evidence generated in the kitchen. Camera capture, voice notes, and structured reason taxonomy are input methods, not external data sources.
**Client-collaborative angle:** Medium. Dinner Circle can collect or confirm causes that staff otherwise infer, such as guest no-shows, late dietary changes, client over-ordering, venue fridge failure, missing serving vessels, or host-provided food that displaced planned portions.
**Physical reality:** This is messy-hands work. The capture path must allow one-tap reason buttons, large controls, photo after the immediate rush, and voice note fallback. Print does not solve the reporting loop, but a printed prep sheet can reduce avoidable overproduction.
**Compounding:** High. Waste by component, station, menu, client, venue, season, guest count, and reason becomes operational intelligence for prep quantities, menu pricing, station training, and client expectation setting.

**Solution design:**

- Extend staff waste capture with severity, "needs chef review", root-cause category, photo attachment, optional voice note, and service-impact flag.
- Reconcile staff clipboard waste with chef event waste logs and station waste logs so the same incident is not double-counted.
- Add a chef review queue that can promote staff waste evidence into costed event waste, inventory adjustment, training note, or client/venue pattern.
- Connect waste causes to guest count changes, dietary changes, equipment failures, and 86'd components when those signals exist.

**Where it appears:**

- `/staff-station`
- `/staff-portal/[id]`
- Chef-side `/events/[id]` waste panel, `/stations/waste`, and `/inventory/waste`

**What remains as permanent exit:**
Sensory judgment, food safety escalation, physical disposal, and urgent chef calls for dangerous or service-threatening waste remain outside the normal data-entry flow.

**Priority:** High frequency x medium effort = high compounding candidate
**Spec needed?** yes

## Scenario #44: Replace broken smallware or equipment

**Original classification:** Permanent
**Reclassified to:** Bridgeable
**Review status:** NEEDS-DEVELOPER-REVIEW

**Why staff leaves:** Staff need to keep prep or service moving after a tool, smallware, appliance, serving piece, transport item, or backup fails. The operational decision is whether to repair, borrow, rent, buy, substitute process, or escalate to the chef.
**Context ChefFlow has:**

- Chef equipment inventory with smallwares and other equipment categories, purchase/value fields, maintenance intervals, owned status, rentals, and maintenance due state.
- Event packing list generation from menu methods, guest count, service style, venue/kitchen notes, chef equipment registry, and universal must-bring items.
- Chef-side equipment checklist with backup-available notes for events.
- Client kitchen inventory with item quantity, condition, notes, and last-verified state, but inspected actions are chef-gated.
- Procurement supplier directory, purchase orders, receipt capture, expense tracking, and nearby store discovery.
- Staff portal exposes station, event briefing, tasks, notes, hours, and chef contact, but not equipment issue reporting or replacement request capture.

**Data source?** No for replacement. Equipment marketplaces, Amazon, WebstaurantStore, local restaurant supply stores, repairs, rentals, and borrowing are external action destinations. ChefFlow can source known equipment, client kitchen inventory, vendor history, nearby stores, and receipt/procurement data.
**Client-collaborative angle:** Strong for venue and client-home events. Dinner Circle can collect host-owned equipment, missing/broken kitchen items, backup smallwares, servingware, outlet limitations, and permission to use or move household equipment.
**Physical reality:** Staff need a fast issue report with photo, severity, service impact, and backup status. The chef needs a triage view. A printed packing list can reduce surprises, but broken equipment needs a live capture/recovery path.
**Compounding:** High. Broken item patterns compound into maintenance schedules, packing redundancy, purchase priorities, client kitchen profiles, rental planning, and venue risk notes.

**Solution design:**

- Add staff equipment issue reporting from event briefing and station surfaces: item, photo, severity, backup available, workaround, and "service blocked" flag.
- Match reported items against chef equipment inventory, event packing list, client kitchen inventory, and equipment checklist where possible.
- Route issues to a chef triage queue with actions: approve emergency purchase, rent/borrow, mark maintenance needed, update packing list, or log replacement expense.
- Attach purchase receipts or replacement notes to the equipment item, event, vendor/store, and staff reimbursement review.
- Promote confirmed failures into maintenance and redundancy intelligence after chef review.

**Where it appears:**

- `/staff-portal/[id]`
- `/staff-station`
- Chef-side `/ops/equipment`, `/events/equipment-check`, `/events/[id]`, and `/inventory/procurement`

**What remains as permanent exit:**
Actual retail replacement, repair service, rental booking, marketplace ordering, and payment remain external. ChefFlow should preserve context out and evidence back.

**Priority:** Medium frequency x medium effort = high-risk bridge candidate
**Spec needed?** yes

## Spec Notes

Per the swarm handoff override, no standalone specs were created. Spec-worthy follow-up should be grouped into staff emergency purchasing, staff reimbursement receipt upload, richer staff waste evidence, and staff equipment issue reporting.

## Batch Summary

| #   | Title                                  | Reclassified To     | Spec Needed? |
| --- | -------------------------------------- | ------------------- | ------------ |
| 40  | Buy missing ingredient or disposable   | Bridgeable          | yes          |
| 41  | Check store availability               | Partially Reducible | yes          |
| 42  | Photograph a receipt for reimbursement | Reducible           | yes          |
| 43  | Report waste with more context         | Reducible           | yes          |
| 44  | Replace broken smallware or equipment  | Bridgeable          | yes          |
