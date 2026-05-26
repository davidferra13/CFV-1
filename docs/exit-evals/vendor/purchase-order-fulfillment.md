# Exit Eval: Vendor / PURCHASE ORDER FULFILLMENT

> Wave 6 | 9 scenarios | Role: Vendor
> Evaluator: Claude (solo mode) | Date: 2026-05-25
> Status: **NEEDS-DEVELOPER-REVIEW** (all scenarios)

---

## Scenario #17: Receive purchase orders in the normal sales workflow

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why vendor leaves:** The vendor's business runs on their own order management system (ERP, EDI queue, email inbox, or sales dashboard). They receive orders from many customers, not just ChefFlow chefs. ChefFlow's vendor portal is a secondary view of one customer's orders; the vendor's primary sales workflow lives in their own stack.

**Context ChefFlow has:**

- Full purchase order detail: PO number, order date, expected delivery date, line items with quantities, units, unit costs, totals (`purchaseOrders`, `purchaseOrderItems` tables)
- Chef notes per order (`purchaseOrders.notes`)
- Vendor profile (contact name, email, phone, category)
- Event context when linked (`purchaseOrders.eventId`)
- Order status and history (sent, acknowledged, received transitions)

**Data source?** No. The vendor's own sales/ERP system is the destination, not a data source ChefFlow can drink from. ChefFlow is one originator of orders into their pipeline.

**Client-collaborative angle:** None. This is vendor internal operations. The chef already provided all order info when creating and sending the PO.

**Physical reality:** Many suppliers receive orders via email, fax, or EDI. A cleanly formatted email with PO details, or a printable/downloadable PO packet, is the natural bridge. The vendor prints the PO for their warehouse team or imports it into their system.

**Compounding:** Low. Each order is transactional. The vendor relationship compounds, but individual PO receipt does not.

**Solution design:**

- Ensure the PO notification email contains complete, well-formatted order details (items, quantities, delivery date, notes) so the vendor can act from email alone
- Add a "Download PDF" / "Print" button on `/vendor/orders/[id]` for vendors who prefer paper or need to hand off to warehouse staff
- Keep the vendor portal as a status window and action surface, not as the vendor's primary order intake system
- Consider structured export (CSV) for vendors who want to import into their own systems

**Where it appears:**

- Vendor notification email (sent when PO status transitions to `sent`)
- `/vendor/orders/[id]` (add print/PDF button)
- Potential CSV/structured export endpoint

**What remains as permanent exit:**
The vendor will always receive and process orders in their own sales system. ChefFlow's job is to deliver the PO cleanly (email, printable view, export) and then receive status updates back.

**Priority:** High frequency (every order placed) x Low effort (email formatting + print view) = **Quick win**
**Spec needed?** No (part of vendor portal order detail enhancement)

---

## Scenario #18: Accept an order with changes

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why vendor leaves:** The vendor receives a PO but cannot fulfill it exactly as written. They need to communicate substitutions (different brand, pack size), quantity adjustments (can only ship 8 of 10 requested), or price changes. Currently the vendor portal only offers `Acknowledge`, `Mark Partially Received`, and `Mark Received` transitions (`vendor-order-actions.tsx` lines 9-14). There is no mechanism for the vendor to propose changes at the line-item level.

**Context ChefFlow has:**

- Full PO with line items, quantities, units, and pricing (`purchaseOrderItems`)
- `receivedQuantity` field exists on line items (but only used for receiving, not for acceptance negotiation)
- `varianceNotes` field exists on line items (designed for discrepancy recording)
- Vendor profile and communication preferences
- Event date for urgency context

**Data source?** No. The changes come from the vendor's own inventory/fulfillment knowledge.

**Client-collaborative angle:** None directly. The chef is the decision-maker who must approve substitutions. The vendor proposes; the chef approves/rejects.

**Physical reality:** Vendors often call or email to say "I don't have X, can I send Y instead?" or "Price went up, new price is Z." A structured in-app flow captures this without losing context. The vendor may be at their desk (screen-friendly) or on the warehouse floor (mobile-friendly).

**Compounding:** Medium. If ChefFlow records what substitutions a vendor commonly proposes, the chef can learn vendor patterns. Substitution history builds vendor intelligence over time.

**Solution design:**

- Add an "Accept with Changes" action to the vendor order actions component (alongside Acknowledge)
- Create a line-item change proposal UI: for each item, vendor can mark as "confirmed", "substituted" (with replacement name/qty/price), "quantity adjusted", or "unavailable"
- Add a new PO status: `accepted_with_changes` that notifies the chef
- Chef-side: show proposed changes with approve/reject per line
- Store accepted substitutions in `varianceNotes` or a new `line_proposals` structure

**Where it appears:**

- `/vendor/orders/[id]` (new "Accept with Changes" button and line-item change form)
- Chef-side PO detail (vendor change proposals requiring approval)
- Notification to chef when vendor proposes changes

**What remains as permanent exit:**
Complex multi-item negotiations may still happen over phone for nuance. Simple substitutions and quantity adjustments should be entirely in-app.

**Priority:** High frequency (vendors frequently cannot fill orders exactly) x Medium effort (new UI + status + notifications) = **High priority**
**Spec needed?** Yes

---

## Scenario #19: Reject an order

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why vendor leaves:** The vendor cannot fulfill the order at all (out of stock, minimum not met, relationship issue, wrong delivery area). Currently the `VALID_TRANSITIONS` in `order-actions.ts` (line 9) only allows `sent -> [acknowledged, partially_received]`. There is no reject/decline path. The vendor must call or email the chef to refuse.

**Context ChefFlow has:**

- Full PO details and vendor relationship context
- The DB schema already has a `cancelled` status in the check constraint (`purchase_orders_status_check` allows 'cancelled')
- Vendor profile (category, minimum order, reliability score)

**Data source?** No. Rejection is a vendor business decision.

**Client-collaborative angle:** None. This is between vendor and chef. The chef needs to know immediately so they can find an alternative supplier.

**Physical reality:** Rejection is usually communicated urgently (phone call or quick email). An in-app reject button with a required reason would be faster than a phone call and would automatically alert the chef.

**Compounding:** Medium. Rejection reasons feed into vendor reliability scoring (`vendors.reliabilityScore`) and the Vendor Trust Ledger (`lib/vendors/vendor-trust-ledger-contract.ts`). Tracking why vendors reject builds long-term supplier intelligence.

**Solution design:**

- Add `rejected` to the `VALID_TRANSITIONS` map: `sent -> [..., 'rejected']`
- Add the `rejected` value to the DB status check constraint (migration needed)
- Require a rejection reason (enum: "out of stock", "below minimum", "cannot deliver by date", "other" + free text)
- Immediately notify the chef when a PO is rejected
- Feed rejection into vendor trust ledger for reliability scoring
- Chef-side: show rejection reason and suggest alternative vendors for the same items

**Where it appears:**

- `/vendor/orders/[id]` (new "Cannot Fulfill" or "Reject" button with reason form)
- Chef notifications (immediate alert on rejection)
- Vendor Trust Ledger (rejection history for scoring)
- Chef-side PO management (show rejected orders with reason)

**What remains as permanent exit:**
None for the reject action itself. The vendor may still call to explain complex situations, but the base rejection with reason should be fully in-app.

**Priority:** Medium frequency (rejections are uncommon but critical) x Low effort (add status + reason field + notification) = **Medium-high priority**
**Spec needed?** No (straightforward status addition with reason field)

---

## Scenario #20: Confirm partial line fulfillment

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why vendor leaves:** The vendor can ship some items but not all, or can ship partial quantities of some items. The current portal has order-level `partially_received` status but no item-level fulfillment confirmation. The `purchaseOrderItems` table already has a `receivedQuantity` field (line 8613 in schema), but it is not exposed to the vendor portal. The vendor must call/email to explain what they can actually ship.

**Context ChefFlow has:**

- Line items with ordered quantities (`purchaseOrderItems.quantity`)
- `receivedQuantity` field already exists per line item (currently only updated from chef-side receiving)
- `varianceNotes` field per line item for discrepancy explanations
- Event date for urgency (chef needs to know early if items are short)

**Data source?** No. Fulfillment confirmation comes from the vendor's warehouse/picking operation.

**Client-collaborative angle:** None. This is between vendor and chef. However, the chef may need to adjust menus or find alternative sources based on partial fulfillment, which could cascade to client communication.

**Physical reality:** Warehouse pickers confirm quantities as they pull orders. A mobile-friendly per-line quantity input is ideal. Large touch targets for the picker working in a warehouse with gloves.

**Compounding:** Medium. Patterns of partial fulfillment per vendor feed reliability scoring. If a vendor frequently shorts certain items, the chef learns to over-order or switch suppliers.

**Solution design:**

- Add a "Confirm Fulfillment" view to the vendor order detail that shows each line item with the ordered quantity and an editable "shipping quantity" field
- Pre-fill shipping quantity with ordered quantity (vendor only changes lines they cannot fully fill)
- When any line is reduced, auto-set order status to `partially_received` or a new `confirmed_partial` status
- Store vendor-confirmed quantities in `receivedQuantity` (or a new `confirmedQuantity` field to distinguish from chef-side receiving)
- Add `varianceNotes` input per line for the vendor to explain shortages
- Notify chef immediately when partial fulfillment is confirmed, highlighting shorted items

**Where it appears:**

- `/vendor/orders/[id]` (new "Confirm Fulfillment" action with per-line quantity inputs)
- Chef-side PO detail (show confirmed vs. ordered quantities, highlight variances)
- Chef notifications (alert on partial fulfillment with specific items affected)

**What remains as permanent exit:**
None for the confirmation itself. Complex explanations may still require a phone call, but quantity confirmation should be entirely in-app.

**Priority:** High frequency (partial shipments are common in food supply) x Medium effort (per-line UI + quantity storage) = **High priority**
**Spec needed?** Yes (this shares spec with #18, accept-with-changes workflow)

---

## Scenario #21: Confirm delivery date changes

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why vendor leaves:** The vendor cannot deliver on the expected date (truck breakdown, weather, production delay) and needs to communicate a new ETA. The `purchaseOrders.expectedDeliveryDate` field exists and is displayed to the vendor, but there is no vendor-side mechanism to propose a date change.

**Context ChefFlow has:**

- Expected delivery date on the PO (`purchaseOrders.expectedDeliveryDate`)
- Event date (for urgency: if delivery is for a specific dinner, late delivery = crisis)
- Chef contact info for escalation

**Data source?** No. Date changes are vendor operational decisions.

**Client-collaborative angle:** Indirect. If the delivery is for a specific event, a date change may cascade to client communication (menu adjustment, timeline shift). The chef needs to know immediately.

**Physical reality:** Vendors often text or call the chef morning-of when delivery will be late. An in-app "update delivery window" is faster and creates a record. The vendor may be on their phone (mobile-first).

**Compounding:** Medium. Delivery reliability patterns per vendor feed into trust scoring. Seasonal patterns (holidays, weather) become predictable over time.

**Solution design:**

- Add a "Propose New Delivery Date" action on the vendor order detail page
- Vendor selects a new date and optionally provides a reason (enum: "production delay", "logistics issue", "weather", "other" + free text)
- This creates a proposal state: `delivery_date_proposed` (chef must acknowledge or the system auto-accepts after 24h)
- Immediate notification to chef with urgency flag if the new date is after the linked event date
- Chef can accept, counter-propose, or escalate
- Feed date changes into vendor trust ledger

**Where it appears:**

- `/vendor/orders/[id]` (new "Update Delivery Date" button with date picker + reason)
- Chef-side PO detail (show proposed date change, accept/reject)
- Chef notifications (urgent if delivery date moves past event date)
- Vendor Trust Ledger (delivery reliability tracking)

**What remains as permanent exit:**
None for the date change communication itself. Same-day urgent delays may still warrant a phone call for immediate human attention.

**Priority:** Medium frequency (delivery changes happen weekly for active chefs) x Low effort (date field + notification) = **Medium-high priority**
**Spec needed?** No (straightforward date proposal field with notification)

---

## Scenario #22: Print or pick the order for warehouse work

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why vendor leaves:** The vendor's warehouse team needs to physically pick items off shelves. They use printed pick lists, warehouse management system (WMS) screens, or handheld scanners. This is the vendor's internal fulfillment operation that ChefFlow should never attempt to replace. The vendor's warehouse may handle hundreds of orders from many customers; ChefFlow represents just one.

**Context ChefFlow has:**

- Complete line-item detail (item name, quantity, unit, notes)
- PO number for reference
- Expected delivery date
- Chef notes

**Data source?** No. The vendor's WMS/ERP is their picking system.

**Client-collaborative angle:** None. This is pure vendor internal operations.

**Physical reality:** Warehouse workers need paper (printed pick sheets) or handheld devices. A clean print view of the PO optimized for warehouse work (large font, checkbox per item, barcode-friendly PO number) is the maximum useful contribution. Many small vendors literally print the email or order page.

**Compounding:** Low. Each pick is transactional. No historical value from the picking act itself.

**Solution design:**

- Add a print-optimized view of the vendor order (`/vendor/orders/[id]/print` or browser print stylesheet)
- Format: PO number as header, date, large item list with checkboxes, quantity + unit prominently displayed
- Include any chef notes or special handling instructions
- Support PDF download for vendors who prefer to save/forward rather than print directly
- Keep it simple: this is a warehouse document, not a branded deliverable

**Where it appears:**

- `/vendor/orders/[id]` (print button in header area)
- Print stylesheet or dedicated print route
- PDF download option

**What remains as permanent exit:**
The vendor will always use their own WMS for complex multi-order picking. ChefFlow provides a clean printable single-order view that small vendors can use directly and large vendors can reference.

**Priority:** High frequency (every order gets picked) x Very low effort (print CSS + PDF button) = **Quick win**
**Spec needed?** No (print stylesheet is standard pattern)

---

## Scenario #23: Assign the order to an internal driver or picker

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why vendor leaves:** The vendor's dispatch manager assigns orders to specific warehouse staff or delivery drivers. This is vendor-side workforce management. ChefFlow does not know the vendor's staff, their schedules, their routes, or their capabilities.

**Context ChefFlow has:**

- PO details and delivery date
- Delivery address (if surfaced from event/venue profile)
- Order weight/volume (not currently captured, but could be estimated from item quantities)

**Data source?** No. Vendor staffing and dispatch is entirely internal.

**Client-collaborative angle:** None.

**Physical reality:** Dispatch happens on whiteboards, WMS screens, or driver apps. The vendor's dispatcher assigns based on route efficiency, driver availability, and vehicle capacity. ChefFlow is one order among many.

**Compounding:** Low. Assignment is transactional and vendor-internal.

**Solution design:**

- Do not attempt to build vendor staff management or dispatch
- Optionally accept a vendor-provided "assigned driver" name or "delivery contact" for the chef's reference
- Store vendor-provided delivery status updates (see scenario #27 in delivery-logistics eval)
- The print/PDF view (from #22) is the vendor's tool for handing off the order to their assigned person

**Where it appears:**

- `/vendor/orders/[id]` (optional "Assigned to" field the vendor can fill, visible to chef)
- Chef-side PO detail (show assigned driver/contact if provided)

**What remains as permanent exit:**
All staff assignment, route planning, and driver management remains in vendor's own systems. ChefFlow only receives the name of who is handling the delivery.

**Priority:** Low frequency (chef rarely needs to know who the driver is) x Very low effort (optional text field) = **Low priority**
**Spec needed?** No

---

## Scenario #24: Merge multiple chef orders

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why vendor leaves:** A supplier serving multiple ChefFlow chefs (or the same chef with multiple events) may want to consolidate orders for efficient picking and delivery. The vendor portal is scoped to one vendor-chef relationship, showing only orders from that chef. The vendor's ERP handles cross-customer consolidation.

**Context ChefFlow has:**

- All POs for this vendor from this chef (the current `/vendor/orders` list)
- Cannot see orders from other chefs (correct tenant isolation)

**Data source?** No. Cross-customer order consolidation is vendor ERP logic.

**Client-collaborative angle:** None. This is vendor operational efficiency across their customer base.

**Physical reality:** Vendors merge orders in their picking system to minimize warehouse passes. A single vendor delivery truck often carries orders for multiple customers. This is fundamental vendor logistics that ChefFlow should not replicate.

**Compounding:** Low. Consolidation is per-delivery-day operational logic.

**Solution design:**

- Provide a clean CSV/JSON export of all open orders for this chef so the vendor can import into their consolidation workflow
- If a vendor serves multiple ChefFlow chefs (future multi-chef vendor workspace, scenario #7), allow a combined order view within ChefFlow for that vendor's convenience
- Add date-range filtering on the vendor orders list to help vendors see all orders for a delivery date
- Do not attempt to replicate ERP-level order consolidation

**Where it appears:**

- `/vendor/orders` (add date filter, export button)
- Future multi-chef vendor workspace (combined view across chef relationships)

**What remains as permanent exit:**
Cross-customer order merging and warehouse consolidation always stays in vendor ERP. ChefFlow provides clean per-chef exports and date-filtered views.

**Priority:** Low frequency (only relevant for vendors serving multiple ChefFlow chefs, which is rare today) x Medium effort (export + filtering) = **Low priority**
**Spec needed?** No

---

## Scenario #25: Handle emergency short stock

**Original classification:** Bridgeable
**Reclassified to:** Bridgeable

**Why vendor leaves:** Mid-fulfillment, the vendor discovers they cannot provide a critical item (spoiled product, supplier chain failure, miscounted inventory). This is urgent and requires immediate human communication. The vendor calls or texts the chef to propose alternatives, adjust quantities, or warn of the gap. Speed matters more than structure in emergencies.

**Context ChefFlow has:**

- Full PO with line items (what was ordered)
- Event date and menu context (urgency signal: is this for tonight's dinner?)
- Chef's phone number and communication preferences
- Alternative vendor suggestions (from vendor comparison data in `lib/vendors/vendor-comparison-actions.ts`)
- Ingredient substitution intelligence (from `lib/calling/vendor-action-extraction.ts` which captures call outcomes like `unavailable_item`, `confirmed_item`)

**Data source?** No. Emergency stock status is real-time vendor warehouse knowledge.

**Client-collaborative angle:** Indirect. If the short stock affects a key menu item, the chef may need to communicate with the client about a substitution. This cascades but starts as a vendor-chef conversation.

**Physical reality:** This is a phone call or urgent text. The vendor is on the warehouse floor, discovers the issue during picking, and needs to reach the chef NOW. Voice or SMS is the natural channel. Any app-based solution is secondary to the immediate human contact.

**Compounding:** Medium. If ChefFlow captures the outcome of emergency short-stock situations (what was substituted, what was sourced elsewhere), it builds intelligence for future purchasing decisions. The `vendor-action-extraction.ts` types already model call outcomes including `unavailable_item`.

**Solution design:**

- Add an "Alert: Item Unavailable" quick-action on the vendor order detail that marks a specific line item as short and sends an immediate push/SMS notification to the chef
- Pre-populate with item context (what is short, how much was ordered, event date)
- After the emergency resolves (phone call happens), provide a structured "Record Outcome" form: substituted with X, quantity reduced to Y, sourced from alternative vendor Z
- Feed the outcome back into the PO line items (`varianceNotes`) and vendor reliability scoring
- Do not try to replace the phone call; bridge the outcome back into structured data

**Where it appears:**

- `/vendor/orders/[id]` (per-line "Flag Unavailable" action)
- Chef notifications (urgent alert with item context and event urgency)
- Vendor order detail (outcome recording after resolution)
- Vendor Trust Ledger (short-stock frequency tracking)

**What remains as permanent exit:**
The phone call or urgent text will always happen for true emergencies. ChefFlow captures the alert trigger and the outcome, but does not replace the human-to-human urgent communication.

**Priority:** Low frequency (emergencies are rare) x Medium effort (alert + outcome capture) = **Medium priority**
**Spec needed?** No (the alert is a lightweight addition to the accept-with-changes workflow)

---

## Batch Summary

| #   | Title                                                | Reclassified To | Spec Needed?          |
| --- | ---------------------------------------------------- | --------------- | --------------------- |
| 17  | Receive purchase orders in the normal sales workflow | Permanent       | No                    |
| 18  | Accept an order with changes                         | Reducible       | Yes                   |
| 19  | Reject an order                                      | Reducible       | No                    |
| 20  | Confirm partial line fulfillment                     | Reducible       | Yes (shared with #18) |
| 21  | Confirm delivery date changes                        | Reducible       | No                    |
| 22  | Print or pick the order for warehouse work           | Permanent       | No                    |
| 23  | Assign the order to an internal driver or picker     | Permanent       | No                    |
| 24  | Merge multiple chef orders                           | Permanent       | No                    |
| 25  | Handle emergency short stock                         | Bridgeable      | No                    |

---

## Codebase Evidence Summary

**Current vendor order infrastructure:**

- Schema: `purchaseOrders` table with statuses `draft`, `sent`, `acknowledged`, `partially_received`, `received`, `cancelled` (schema.ts line 8559-8601)
- Schema: `purchaseOrderItems` with `receivedQuantity` and `varianceNotes` fields already present (schema.ts line 8603-8630)
- Vendor portal: `/vendor/orders` list page, `/vendor/orders/[id]` detail page
- Vendor actions: Only `Acknowledge`, `Mark Partially Received`, `Mark Received` transitions exist (`vendor-order-actions.tsx`)
- Server action: `updateOrderStatus` in `lib/vendors/order-actions.ts` validates transitions and updates status
- No reject, no accept-with-changes, no line-level vendor confirmation, no print/PDF, no date change proposal

**Related infrastructure that supports these scenarios:**

- `lib/vendors/vendor-trust-ledger-contract.ts`: Vendor reliability scoring (feeds from rejection/shortage data)
- `lib/calling/vendor-action-extraction.ts`: Models vendor call outcomes including `unavailable_item`, `confirmed_item`
- `lib/vendors/vendor-coordination-actions.ts`: Chef-side vendor contact logging with follow-ups
- `lib/ui/print-share-actions.ts`: Print/PDF/share infrastructure (not yet wired to vendor orders)
- `lib/vendors/vendor-communication-types.ts`: Full type system for vendor orders and communication

**Key gaps to close:**

1. Vendor-side rejection path (status + reason)
2. Line-item proposal/change workflow (accept-with-changes)
3. Line-level quantity confirmation (leveraging existing `receivedQuantity` field)
4. Delivery date proposal mechanism
5. Print/PDF view for vendor orders
6. Emergency short-stock alert and outcome capture
