# Exit Eval: Vendor / COMPLIANCE, BUSINESS OPS & SUPPLIER SYSTEMS

> Wave 6 | 7 scenarios | Category 7 from `docs/research/vendor-exit-points-analysis.md`
> Evaluated: 2026-05-25 | Mode: Solo | Status: NEEDS-DEVELOPER-REVIEW

---

## Scenario #50: Review supplier legal agreement later

**Original classification:** Bridgeable
**Reclassified to:** Bridgeable

**Why vendor leaves:** The vendor accepted the `vendor_agreement` during signup (`claimVendorInvite` in `lib/vendors/invite-actions.ts`) but later needs to re-read the agreement for internal legal review, share it with their legal team, or check specific clauses. The agreement is hosted at a public ChefFlow page (`/vendor-agreement` per `lib/auth/route-policy.ts`), but internal vendor review workflows (forwarding to a legal department, comparing against their own standard terms, annotating clauses) happen outside ChefFlow.

**Context ChefFlow has:**

- Full versioned vendor agreement text (hosted at `/vendor-agreement`, public route)
- Acceptance record with timestamp, IP hash, user agent (`lib/legal/persistence.ts` records via `recordPolicyAcceptancesForSubject`)
- Policy version tracking in `legal_policy_versions` table with `vendor_agreement` type
- Vendor profile data (business name, contact info)

**Data source?** No. The agreement is already self-hosted. The vendor's internal legal review process is human/organizational.

**Client-collaborative angle:** N/A. This is purely vendor-internal. The chef has no role in the vendor's legal review process.

**Physical reality:** Screen-based. Vendor legal teams want printable PDF of the agreement for filing. Desktop review, not kitchen work.

**Compounding:** Low. Agreement is reviewed once (or at version changes). Not a recurring operational task.

**Solution design:**

- Add a "Download as PDF" button on the public `/vendor-agreement` page
- Show acceptance history (date accepted, version) in vendor profile at `/vendor/profile`
- Send email with agreement link + PDF attachment at time of acceptance
- Notify vendor when agreement version changes, with diff summary

**Where it appears:**

- `/vendor/profile` (acceptance record display)
- `/vendor-agreement` (public page, add PDF download)
- Vendor signup confirmation email

**What remains as permanent exit:**
Vendor's internal legal team review, annotation, and filing in their own document management system. ChefFlow cannot replace a vendor's legal department processes.

**Priority:** Low frequency (once per agreement version) x Low effort = Low priority
**Spec needed?** No. Small UX enhancement (PDF export + acceptance display).

---

## Scenario #51: Provide insurance/licensing certificates

**Original classification:** Reducible
**Reclassified to:** Partially Reducible

**Why vendor leaves:** The vendor needs to provide proof of insurance, food handler licenses, business licenses, or other compliance certificates. Currently, the chef-side has a vetting checklist (`lib/vendors/vetting-actions.ts`) that checks for `supplier_doc` documents in `vendor_document_uploads`, and the document intake system (`lib/vendors/document-intake/`) supports `supplier_doc` type uploads. However, this upload flow is chef-initiated (requires `requireChef()`), not vendor-self-service. The vendor portal has no upload surface.

**Context ChefFlow has:**

- Vendor vetting checklist tracking whether supplier docs exist (`vetting-actions.ts` line 106-110)
- Document upload infrastructure with hash-based dedup, parsing, status tracking (`lib/vendors/document-intake/upload.ts`)
- Allowed file types: CSV, XLSX, PDF, TXT, JPG, JPEG, PNG, WEBP, DOC, DOCX (covers all cert formats)
- 30MB file size limit
- `insurance_licenses` expense category recognized in document parsing (`document-intake-parsers.ts` line 69)
- Chef-side compliance infrastructure with expiry tracking (`lib/compliance/compliance-types.ts`: categories include `insurance`, `food_safety`, `certifications`, `permits`)
- Insurance cert storage on event contracts (`lib/contracts/insurance-actions.ts`)

**Data source?** No. Certificates originate from the vendor's insurance broker, licensing authority, or training provider.

**Client-collaborative angle:** Minimal. A client might request proof of insurance for their venue, but the cert itself comes from the vendor.

**Physical reality:** Screen-based document upload. Vendor obtains cert from broker/authority (PDF or image), uploads to ChefFlow. Desktop workflow.

**Compounding:** High. Insurance renews annually, licenses expire, food handler certs have renewal dates. Once the system tracks expiry dates, it can proactively notify vendors before expiration, eliminating chef follow-up entirely.

**Solution design:**

- Add vendor-side document upload surface at `/vendor/documents` (new page in vendor portal)
- Scope upload to `supplier_doc` type with subcategories: insurance, food_handler, business_license, other_cert
- Capture expiry date metadata per upload
- Auto-notify vendor 30/14/7 days before expiry
- Surface upload status in chef-side vetting checklist (already wired via `supplier_docs` check)
- Chef approval workflow: vendor uploads, chef reviews and accepts/rejects

**Where it appears:**

- `/vendor/documents` (new vendor portal page)
- `/vendor/profile` (cert status badges)
- Chef-side vendor detail page (vetting checklist already reads these)
- Notification system (expiry reminders)

**What remains as permanent exit:**
Obtaining the certificate itself (from insurance broker, state licensing board, ServSafe, etc.). ChefFlow stores proof, not the certification authority relationship.

**Priority:** Medium frequency (annual renewals + initial onboarding) x Medium effort (vendor upload page + approval flow) = Medium-high priority
**Spec needed?** Yes. Requires vendor-side upload page, approval workflow, and expiry notification system.

---

## Scenario #52: Maintain food safety or HACCP records

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why vendor leaves:** The vendor maintains their own HACCP plan, temperature logs, sanitization records, receiving inspection logs, and other food safety documentation as required by their regulatory jurisdiction. These are operational compliance records that the vendor manages daily as part of their own business operations. They are not about the chef relationship; they are about the vendor's own regulatory compliance.

**Context ChefFlow has:**

- Compliance infrastructure with `food_safety` category (`lib/compliance/compliance-types.ts`)
- Vendor vetting checklist can track whether food safety docs are on file
- Document intake can receive `supplier_doc` type files
- Vendor trust ledger tracks `allergen_handling_issue` and `packaging_temperature_issue` events (`lib/vendors/vendor-trust-ledger-contract.ts`)

**Data source?** No. HACCP records are generated by the vendor's own operations (temperature logs, receiving records, cleaning schedules).

**Client-collaborative angle:** None. Food safety records are vendor-internal regulatory compliance.

**Physical reality:** Vendor-side: clipboards, temperature probes, digital food safety apps (e.g., FoodDocs, SafetyChain). This is their operating system, not ours.

**Compounding:** Low for ChefFlow. The vendor's HACCP records compound for the vendor, but ChefFlow only needs event-specific proof (e.g., "temperature log for delivery X on date Y").

**Solution design:**

- Accept optional food safety proof uploads tied to specific purchase orders or deliveries (not full HACCP plan management)
- Store as `supplier_doc` subcategory in existing document intake
- Chef can request proof for specific orders via the vendor portal
- Display "food safety docs on file" badge in vendor vetting checklist (already partially wired)

**Where it appears:**

- `/vendor/orders/[id]` (optional proof attachment per delivery)
- Chef-side vendor detail (vetting badge)

**What remains as permanent exit:**
All daily HACCP record maintenance: temperature logging, receiving inspections, sanitization schedules, corrective action records, employee training records. ChefFlow will never be a food safety compliance platform for suppliers.

**Priority:** Low frequency (only when chef requests proof) x Low effort (minor addition to existing doc intake) = Low priority
**Spec needed?** No. Fits within existing document intake infrastructure with minor extension.

---

## Scenario #53: Manage wholesale account setup

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why vendor leaves:** When a chef wants to buy from a new wholesale supplier (e.g., Restaurant Depot, US Foods, Sysco), the vendor/supplier has their own account creation process: credit applications, business verification, tax ID collection, minimum order agreements, delivery route setup. This is the supplier's own customer onboarding workflow.

**Context ChefFlow has:**

- Vendor record with `category: 'wholesale'` type (`lib/vendors/vendor-actions.ts` line 16)
- Vendor profile stores contact info, website, notes, account preferences
- Communication preferences per vendor (`lib/vendors/vendor-communication-actions.ts`) including lead time, minimums, cutoff times
- Vendor items/catalog linked to vendor ID

**Data source?** No. Wholesale account creation is a human/organizational process involving credit checks, agreements, and physical verification.

**Client-collaborative angle:** None. This is a vendor-chef B2B relationship, not a client concern.

**Physical reality:** Often involves in-person visits (e.g., Restaurant Depot membership), paper applications, or vendor-hosted web portals. Entirely external.

**Compounding:** Medium. Once the account is set up, the account number and terms are static reference data that ChefFlow can store once and use forever.

**Solution design:**

- Store wholesale account metadata on vendor record: account number, account status (pending/active/suspended), setup date, terms
- Add "account status" field to vendor profile (chef-side)
- Surface account number in purchase order generation context
- Vendor portal: display account status and allow vendor to confirm "account active" once setup completes

**Where it appears:**

- Chef-side vendor detail page (account metadata fields)
- `/vendor/profile` (account status confirmation)
- Purchase order generation (account number reference)

**What remains as permanent exit:**
The entire wholesale account application, credit check, business verification, tax ID submission, and account activation process. ChefFlow stores the result, not the process.

**Priority:** Low frequency (one-time per vendor) x Low effort (metadata fields) = Low priority
**Spec needed?** No. Simple field additions to existing vendor schema.

---

## Scenario #54: Manage internal inventory

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why vendor leaves:** The supplier manages their own warehouse inventory: stock levels, reorder points, lot tracking, FIFO rotation, shelf-life monitoring, warehouse locations. This is the vendor's core business operations, entirely independent of their relationship with any specific chef.

**Context ChefFlow has:**

- Vendor catalog items with price and unit info (`vendorItems` table, displayed at `/vendor/catalog`)
- Purchase order history showing what the chef has ordered
- Vendor communication preferences including lead times (`lib/vendors/vendor-communication-actions.ts`)
- No inventory tables, no stock level tracking, no WMS functionality

**Data source?** No. Inventory is the vendor's operational state, managed in their ERP/WMS.

**Client-collaborative angle:** None. Internal vendor inventory is irrelevant to clients.

**Physical reality:** Warehouse operations: barcode scanners, shelf labels, temperature zones, pallet management. Completely external physical systems.

**Compounding:** Low for ChefFlow. ChefFlow only benefits from knowing availability (in/out of stock), not inventory depth.

**Solution design:**

- Accept availability snapshots: vendor can mark items as "in stock", "limited", "out of stock", or "seasonal" in the catalog view
- Add optional availability notes per catalog item (vendor-editable)
- Surface availability status in chef-side ordering context
- Do NOT attempt inventory management, stock counts, or WMS functionality

**Where it appears:**

- `/vendor/catalog` (add availability status toggle per item)
- Chef-side vendor item selection during PO creation

**What remains as permanent exit:**
All internal inventory operations: stock counting, reordering from their suppliers, warehouse organization, lot tracking, expiry management, shrinkage tracking. ChefFlow captures availability signals only.

**Priority:** Medium frequency (availability changes regularly) x Low effort (status field on catalog items) = Medium priority
**Spec needed?** No. Simple field addition to vendor catalog items with vendor-side edit capability.

---

## Scenario #55: Manage staff, routes, payroll, procurement

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why vendor leaves:** The supplier runs their own business: hiring drivers, managing delivery routes, processing payroll, procuring raw materials from their own suppliers. These are fundamental business operations that have nothing to do with ChefFlow or any specific chef customer.

**Context ChefFlow has:**

- No vendor staff management tables
- No vendor route/logistics tables
- No vendor payroll or procurement systems
- Purchase order status transitions (sent -> acknowledged -> received) are the only vendor operational touchpoint
- Vendor trust ledger tracks delivery reliability signals (`on_time_delivery`, `late_delivery`, `missed_delivery`)

**Data source?** No. These are the vendor's own business operations across all their customers.

**Client-collaborative angle:** None. Vendor back-office operations are irrelevant to chefs and clients.

**Physical reality:** Driver dispatch apps, payroll software, fleet management, supplier ordering portals. Entirely separate technology stack.

**Compounding:** None for ChefFlow. These operations do not generate data ChefFlow should capture.

**Solution design:**

- Accept delivery ETA updates or driver contact info per purchase order (status signals only)
- Store vendor-provided "assigned driver" name/phone if they choose to share it
- Do NOT build any vendor staff management, route planning, payroll, or procurement features
- The only integration point is: how does the vendor's internal ops affect this specific chef's order?

**Where it appears:**

- `/vendor/orders/[id]` (optional ETA update, driver info field)
- Chef-side PO detail (display vendor-provided delivery context)

**What remains as permanent exit:**
All vendor business operations: hiring, scheduling, route optimization, payroll processing, fleet maintenance, their own purchasing. ChefFlow is one customer in the vendor's portfolio, not their operating system.

**Priority:** N/A (permanent exit, no build needed) x N/A = No action
**Spec needed?** No. The ETA/driver info fields are covered by the delivery logistics eval (scenarios #26-33).

---

## Scenario #56: Export relationship history for internal CRM

**Original classification:** Bridgeable
**Reclassified to:** Bridgeable

**Why vendor leaves:** The vendor wants to pull their relationship history with this chef into their own CRM, accounting system, or internal records. They need: order history, invoice summaries, communication log, catalog activity, account age, and volume trends. Currently the vendor portal is read-only with no export capability.

**Context ChefFlow has:**

- Full purchase order history per vendor (`purchase_orders` table, visible at `/vendor/orders`)
- Invoice list per vendor (`vendor_invoices` table, visible at `/vendor/invoices`)
- Catalog items per vendor (`vendor_items` table, visible at `/vendor/catalog`)
- Vendor profile metadata
- Order status transitions with timestamps
- Chef-side takeout/export system exists (`lib/exports/takeout-categories.ts`) with a `vendors` category that exports vendors, vendor_items, vendor_invoices, and purchase_orders in JSON/CSV
- No vendor-side export functionality exists

**Data source?** No. The vendor's CRM is the destination, not a source.

**Client-collaborative angle:** None. This is vendor-internal record keeping.

**Physical reality:** Desktop workflow. Vendor downloads CSV/JSON, imports into their own system. Straightforward data export.

**Compounding:** Medium. The export template is reusable, and the data grows over time. A vendor who exports quarterly benefits from consistent format.

**Solution design:**

- Add vendor-side export action at `/vendor/profile` or a dedicated `/vendor/export` page
- Export includes: all POs (with line items and status), all invoices (with status), catalog snapshot, relationship summary (first order date, total order count, total spend)
- Formats: CSV (for spreadsheet import) and JSON (for API/CRM import)
- Scope to vendor-safe data only: exclude chef-private trust scores, internal notes, reliability ratings
- Reuse export infrastructure patterns from `lib/exports/takeout-categories.ts` (table listing, format config)

**Where it appears:**

- `/vendor/profile` (export button)
- Or `/vendor/export` (dedicated export page)
- Email delivery option for large exports

**What remains as permanent exit:**
Importing the data into the vendor's CRM, reconciling it with their internal records, and any analysis they do on the relationship data. ChefFlow provides the data package; the vendor's internal systems consume it.

**Priority:** Low frequency (quarterly or ad-hoc) x Medium effort (export page + format generation) = Medium priority
**Spec needed?** No. Follows established takeout pattern. Implementation is mechanical (query + format + download).

---

## Batch Summary

| #   | Title                                        | Reclassified To     | Spec Needed? |
| --- | -------------------------------------------- | ------------------- | ------------ |
| 50  | Review supplier legal agreement later        | Bridgeable          | No           |
| 51  | Provide insurance/licensing certificates     | Partially Reducible | Yes          |
| 52  | Maintain food safety or HACCP records        | Permanent           | No           |
| 53  | Manage wholesale account setup               | Permanent           | No           |
| 54  | Manage internal inventory                    | Permanent           | No           |
| 55  | Manage staff, routes, payroll, procurement   | Permanent           | No           |
| 56  | Export relationship history for internal CRM | Bridgeable          | No           |

---

## Key Findings

**5 of 7 scenarios confirmed as Permanent or Bridgeable.** This category is dominated by vendor-internal business operations that ChefFlow should never attempt to replace. The vendor portal's role here is to accept proof/status signals and provide clean data exports, not to become a supplier ERP.

**One actionable build: Scenario #51 (certificate upload).** This is the only scenario where ChefFlow infrastructure is 90% built (document intake, file handling, vetting checklist) but the vendor-facing surface is missing. Adding a vendor-side upload page with expiry tracking would close a real gap.

**Pattern:** ChefFlow already has sophisticated chef-side vendor infrastructure (trust ledger, vetting checklist, document intake, compliance tracking). The gap is vendor self-service surfaces, not backend capability.

---

_All scenarios marked NEEDS-DEVELOPER-REVIEW (solo mode, no chef input)._
