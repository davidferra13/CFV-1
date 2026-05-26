# Every Scenario Where a Vendor Still Leaves ChefFlow

> **Purpose:** Map every moment a vendor, supplier, purveyor, farm, distributor, or other
> supplier-side partner exits ChefFlow to use another tool.
> This is grounded in the current vendor role implementation: invited vendors authenticate through
> `/auth/vendor-signup`, land in the protected `/vendor` portal, and can view orders, invoices,
> catalog items, and profile data. Chef-side supplier management is much broader than vendor-side
> self-service today.
>
> **Companion docs:**
>
> - `docs/research/vendor-never-leaves-analysis.md` (60 vendor-side workflows that stay in-app)
> - `docs/research/chef-exit-points-analysis.md` (chef-side exit scenarios)
> - `docs/research/client-exit-points-analysis.md` (client-side exit scenarios)
>
> **Date:** 2026-05-25

---

## Category 1: INVITE, ACCOUNT & ACCESS BOUNDARIES

| #   | Scenario                              | Where They Go                                             | Why They Leave                                                   | Exit Type  | ChefFlow Could...                                                               |
| --- | ------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------- |
| 1   | Receive the vendor invite             | Email client                                              | The invite URL originates outside the portal                     | Bridgeable | Keep invite links clean, branded, and resumable                                 |
| 2   | Find a lost invite                    | Email search, chef text, phone call                       | Vendor signup requires a valid token                             | Reducible  | Add resend/status tools for the chef and clearer expired-token recovery         |
| 3   | Confirm which email was invited       | Email, chef contact                                       | `claimVendorInvite` requires email match                         | Bridgeable | Show masked invited email and a contact-chef path                               |
| 4   | Store or retrieve password            | Password manager, browser keychain                        | Credential storage lives outside ChefFlow                        | Permanent  | Support standard password-manager behavior                                      |
| 5   | Resolve sign-in trouble               | Email, phone, support channel                             | No vendor self-service support surface is visible in the portal  | Reducible  | Add vendor account recovery and support intake                                  |
| 6   | Change business user access           | Email with chef/admin                                     | Vendor role maps to a single vendor entity                       | Reducible  | Add vendor-side user/contact management later                                   |
| 7   | Switch between multiple chef accounts | Email, separate accounts, role switcher only when present | Current vendor context is tenant-scoped to one chef relationship | Reducible  | Add multi-chef vendor workspace if suppliers commonly serve many ChefFlow chefs |

---

## Category 2: CATALOG, PRICE SHEETS & PRODUCT DATA

| #   | Scenario                           | Where They Go                             | Why They Leave                                                       | Exit Type  | ChefFlow Could...                                                         |
| --- | ---------------------------------- | ----------------------------------------- | -------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------- |
| 8   | Update a price sheet               | Spreadsheet, email attachment, vendor ERP | `/vendor/catalog` is read-only for the vendor                        | Reducible  | Add vendor-side catalog upload/edit with chef approval                    |
| 9   | Add new catalog items              | Vendor ERP, spreadsheet, email            | Vendor portal lists items but has no add flow                        | Reducible  | Let vendors propose item additions into the existing catalog review queue |
| 10  | Remove discontinued items          | Vendor ERP, email to chef                 | No vendor-side item status controls                                  | Reducible  | Add active/discontinued proposals with chef approval                      |
| 11  | Attach spec sheets or product docs | PDF email, Dropbox, vendor portal         | Chef-side document intake exists, vendor-side upload does not        | Reducible  | Expose a scoped supplier document inbox to vendors                        |
| 12  | Share seasonal availability        | Phone, email, text, vendor newsletter     | Catalog rows do not express live availability windows                | Bridgeable | Add availability notes and effective dates per item                       |
| 13  | Share substitutions                | Phone, email, SMS                         | Order actions only change status, not item-level substitution detail | Reducible  | Add substitution proposals per purchase-order line                        |
| 14  | Confirm pack size changes          | Email, spreadsheet                        | Catalog displays unit size/measure but vendor cannot edit it         | Reducible  | Add proposed pack-size update flow                                        |
| 15  | Publish bulk discounts or minimums | Vendor portal, sales rep email            | Vendor terms live mostly in chef-owned vendor records                | Bridgeable | Add vendor-visible terms and minimum-order update requests                |
| 16  | Sync full ERP catalog              | ERP, EDI, distributor portal              | ChefFlow is not the supplier's system of record                      | Permanent  | Import/export instead of replacing supplier catalog systems               |

---

## Category 3: PURCHASE ORDER FULFILLMENT

| #   | Scenario                                             | Where They Go                        | Why They Leave                                                                    | Exit Type  | ChefFlow Could...                                         |
| --- | ---------------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------- |
| 17  | Receive purchase orders in the normal sales workflow | Email, vendor portal, EDI, ERP queue | ChefFlow PO list is a supplier-side view, not the supplier's order system         | Permanent  | Provide printable/exportable PO packets                   |
| 18  | Accept an order with changes                         | Phone, email, ERP                    | Current vendor actions acknowledge or mark received, but do not negotiate changes | Reducible  | Add accept-with-changes workflow                          |
| 19  | Reject an order                                      | Phone, email                         | Vendor action transitions do not include rejection/cancellation                   | Reducible  | Add vendor-side reject/cannot-fulfill state with reason   |
| 20  | Confirm partial line fulfillment                     | Phone, email, delivery paperwork     | Portal has order-level `partially_received`, not item-level partial fulfillment   | Reducible  | Add line-level quantity confirmation                      |
| 21  | Confirm delivery date changes                        | Phone, email, logistics system       | Expected date is shown but not editable by vendor                                 | Reducible  | Add proposed delivery-window changes                      |
| 22  | Print or pick the order for warehouse work           | ERP, printer, warehouse system       | Vendor operations happen in their own physical and software systems               | Permanent  | Add clean print/export, not warehouse replacement         |
| 23  | Assign the order to an internal driver or picker     | Vendor dispatch/WMS                  | ChefFlow does not manage supplier staff                                           | Permanent  | Store vendor-provided delivery status only                |
| 24  | Merge multiple chef orders                           | Vendor ERP/spreadsheet               | The portal is scoped to one vendor/chef relationship view                         | Permanent  | Support exports that suppliers can reconcile externally   |
| 25  | Handle emergency short stock                         | Phone, SMS, email                    | Urgent substitutions need human confirmation                                      | Bridgeable | Capture the outcome back onto the order and event context |

---

## Category 4: DELIVERY, LOGISTICS & PHYSICAL FULFILLMENT

| #   | Scenario                               | Where They Go                              | Why They Leave                                                                    | Exit Type  | ChefFlow Could...                                                 |
| --- | -------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------- |
| 26  | Route delivery                         | Google Maps, dispatch software, driver app | Routing belongs to logistics tools                                                | Permanent  | Store ETA and map/tracking links                                  |
| 27  | Track truck status                     | Dispatch system, GPS app, phone call       | Real-time driver telemetry is external                                            | Permanent  | Accept vendor ETA updates or tracking URLs                        |
| 28  | Document proof of delivery             | Paper POD, driver app, photo app           | Delivery proof capture is not in the vendor portal                                | Bridgeable | Add scoped upload/photo proof tied to PO                          |
| 29  | Report delivery issue                  | Phone, text, email                         | No vendor issue-reporting form on order detail                                    | Reducible  | Add issue report with category, impact, and requested resolution  |
| 30  | Coordinate loading dock or access      | Phone, venue contact, maps                 | Venue/building access lives outside vendor portal                                 | Bridgeable | Surface chef-provided access notes and let vendor confirm receipt |
| 31  | Handle same-day route changes          | Driver app, phone dispatch                 | Day-of movement changes too quickly for current portal                            | Permanent  | Add light ETA/status capture, not full dispatch                   |
| 32  | Confirm cold-chain or handling details | Delivery paperwork, compliance logs        | ChefFlow does not capture supplier temperature/chain-of-custody proof vendor-side | Bridgeable | Add optional compliance proof upload per delivery                 |
| 33  | Collect signature or receiving name    | Driver app, paper invoice                  | Supplier proof-of-delivery systems own this                                       | Permanent  | Store imported POD or receiving name when provided                |

---

## Category 5: INVOICES, PAYMENTS & ACCOUNTING

| #   | Scenario                      | Where They Go                             | Why They Leave                                                 | Exit Type  | ChefFlow Could...                                                |
| --- | ----------------------------- | ----------------------------------------- | -------------------------------------------------------------- | ---------- | ---------------------------------------------------------------- |
| 34  | Submit an invoice             | Email, accounting software, vendor portal | `/vendor/invoices` is read-only; invoice creation is chef-side | Reducible  | Add vendor-side invoice submission into existing document intake |
| 35  | Correct an invoice            | Email, accounting software                | No vendor-side invoice edit/dispute flow                       | Reducible  | Add correction requests with chef approval                       |
| 36  | Send credit memo              | Accounting software, email PDF            | Credit memo object is not visible in vendor portal             | Reducible  | Add credit/adjustment document type                              |
| 37  | Check payment clearing        | Bank portal, accounting system            | ChefFlow shows invoice status, not vendor bank settlement      | Permanent  | Show chef-side payment status if available, but not bank rails   |
| 38  | Reconcile open AR             | QuickBooks, NetSuite, spreadsheet         | Supplier accounting remains external                           | Permanent  | Export invoice/order status for reconciliation                   |
| 39  | Update payment terms          | Email, contract docs                      | Terms are chef-owned vendor metadata                           | Bridgeable | Add vendor request-to-update terms                               |
| 40  | Collect tax forms or W-9s     | Email, accounting portal                  | Supplier tax compliance workflows are external                 | Bridgeable | Add secure document vault intake for required files              |
| 41  | Handle collections/escalation | Phone, email, AR system                   | Collections is outside ChefFlow's operating domain             | Permanent  | Keep status notes and escalation trail                           |

---

## Category 6: COMMUNICATION, DISPUTES & RELATIONSHIP MEMORY

| #   | Scenario                               | Where They Go                        | Why They Leave                                             | Exit Type  | ChefFlow Could...                                                |
| --- | -------------------------------------- | ------------------------------------ | ---------------------------------------------------------- | ---------- | ---------------------------------------------------------------- |
| 42  | Message the chef from the portal       | Email, phone, SMS                    | Vendor portal has no vendor-facing message composer        | Reducible  | Add order-scoped message thread                                  |
| 43  | Respond to AI or chef supplier calls   | Phone, voicemail                     | Voice Hub and call action extraction are chef-side         | Bridgeable | Tie call outcomes back to vendor-visible order context when safe |
| 44  | Clarify ambiguous PO notes             | Email, phone                         | Notes are displayed, but there is no question/comment lane | Reducible  | Add vendor questions on a PO                                     |
| 45  | Dispute missing/late/quality issue     | Email, phone, meeting                | Vendor Trust Ledger is chef-private by design              | Bridgeable | Expose only vendor-safe follow-up summaries                      |
| 46  | Negotiate pricing relationship         | Phone, rep meeting, email            | Relationship negotiation is human and contextual           | Permanent  | Store final agreed terms and next follow-up                      |
| 47  | Send marketing/new product updates     | Email newsletter, sales rep outreach | ChefFlow is not a vendor marketing platform                | Permanent  | Allow chef to pin relevant vendor updates                        |
| 48  | Coordinate with non-chef event parties | Email, phone, planner tools          | Vendor may need venue/planner contacts outside ChefFlow    | Bridgeable | Share event-safe contact packet when authorized                  |
| 49  | Ask for technical support              | Email/support desk                   | No vendor support center is in the portal                  | Reducible  | Add lightweight vendor help/support request                      |

---

## Category 7: COMPLIANCE, BUSINESS OPS & SUPPLIER SYSTEMS

| #   | Scenario                                     | Where They Go                                | Why They Leave                                                       | Exit Type  | ChefFlow Could...                                               |
| --- | -------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------- | ---------- | --------------------------------------------------------------- |
| 50  | Review supplier legal agreement later        | ChefFlow public page, internal legal archive | Agreement is public in-app, but internal review may happen elsewhere | Bridgeable | Keep versioned vendor agreement links and acceptance records    |
| 51  | Provide insurance/licensing certificates     | Email, DocuSign, broker portal               | No vendor-side compliance upload surface                             | Reducible  | Add certificate upload and expiry metadata                      |
| 52  | Maintain food safety or HACCP records        | Supplier compliance system                   | Supplier compliance system is separate                               | Permanent  | Store event/order-specific proof only when needed               |
| 53  | Manage wholesale account setup               | ERP/account portal, sales rep workflow       | ChefFlow does not own supplier account creation                      | Permanent  | Store account number and onboarding status                      |
| 54  | Manage internal inventory                    | ERP, WMS, spreadsheets                       | Supplier stock is external to ChefFlow                               | Permanent  | Capture availability snapshots, not inventory management        |
| 55  | Manage staff, routes, payroll, procurement   | Supplier back-office tools                   | Vendor business operations are not ChefFlow's domain                 | Permanent  | Integrate only status/proof that affects chef orders            |
| 56  | Export relationship history for internal CRM | CRM, spreadsheet                             | Vendor portal has no export/history package                          | Bridgeable | Add vendor-safe export of own POs, invoices, and status changes |

---

## THE PATTERN: Three Types of Vendor Exits

### 1. PERMANENT EXITS (ChefFlow should never try to replace these)

Supplier-owned systems and physical operations. ChefFlow's job: clean boundaries and context capture.

- Supplier ERP, WMS, EDI, accounting, AR, and dispatch systems (16-17, 22-24, 26-27, 31, 33, 37-38, 41, 53-55)
- Physical delivery, picking, route management, and proof systems (22-23, 26-27, 31, 33)
- Human relationship negotiation and marketing outreach (46-47)
- Supplier compliance systems of record (52)

**Strategy:** Export cleanly, accept proof/status back, and avoid pretending ChefFlow is the supplier's operating system.

### 2. REDUCIBLE EXITS (ChefFlow could eliminate or reduce these)

Vendor leaves because the current vendor portal is mostly read-only.

- Catalog and price-sheet updates (8-11, 14)
- Order change/reject/partial fulfillment flows (18-21, 29)
- Invoice submission, correction, and credit documents (34-36)
- Vendor-to-chef questions, support, and account recovery (5-7, 42, 44, 49)
- Compliance certificate upload (51)

**Strategy:** Add vendor-side proposals and uploads with chef approval, not unreviewed supplier mutation.

### 3. BRIDGEABLE EXITS (Vendor will still go external, but ChefFlow can smooth the round-trip)

- Invite delivery and email identity checks -> clearer recovery paths (1, 3)
- Seasonal availability, substitutions, minimums, terms -> structured update requests (12-13, 15, 39)
- Emergency short stock and delivery proof -> event/order capture (25, 28, 30, 32)
- Supplier calls and disputes -> vendor-safe summaries only (43, 45)
- Event-party coordination -> event-safe contact packet (48)
- Legal/tax/account history -> document vault and export (40, 50, 56)

**Strategy:** Make it easy to bring external supplier truth back into the chef-owned record without exposing private chef trust memory.

---

## PRIORITY RANKING (By Vendor Pain)

**Leaves most often for:**

1. Email/phone for PO questions, substitutions, and short stock
2. Accounting software/email for invoice submission and corrections
3. Spreadsheet/ERP for catalog and price-sheet updates
4. Dispatch/maps for delivery ETA and proof
5. Email/search for invite and access recovery
6. Bank/accounting tools for payment reconciliation
7. Compliance portals or email for certificates and tax documents
8. Vendor CRM/ERP for multi-chef account history
9. Phone calls for dispute resolution
10. Internal warehouse systems for picking and fulfillment

**Highest-impact improvements:**

1. **Vendor-side document upload** = reduces invoice, catalog, certificate, and spec-sheet exits
2. **Order comments/questions** = reduces email/phone clarification loops
3. **Accept with changes / reject with reason** = reduces substitution and fulfillment exits
4. **Line-level fulfillment confirmation** = turns order status from coarse to operationally useful
5. **ETA and delivery proof capture** = bridges logistics without building dispatch software
6. **Vendor account recovery/help** = reduces access support friction
7. **Vendor-safe follow-up DTOs** = bridges disputes without leaking chef-private trust data
8. **Multi-chef vendor workspace** = reduces repeated login/context switching if suppliers serve many chefs
9. **Terms/certificate expiry requests** = keeps relationship admin in context
10. **Vendor export pack** = lets suppliers reconcile ChefFlow activity inside their own systems

---

_56 vendor exit scenarios. 23 permanent. 16 reducible. 17 bridgeable._
_The vendor portal should become a controlled collaboration surface, not a replacement for supplier ERP, dispatch, accounting, or human sales relationships._
