# Exit Eval: Vendor / CATALOG, PRICE SHEETS & PRODUCT DATA

> Wave 6 | 9 scenarios | Role: VENDOR
> Evaluator: Claude (Solo mode)
> Date: 2026-05-25
> Status: NEEDS-DEVELOPER-REVIEW

---

## Scenario #8: Update a price sheet

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why vendor leaves:** The vendor's prices change (seasonal adjustments, supplier cost increases, new contracts) and they need to communicate updated pricing to the chef. Currently the vendor portal catalog at `/vendor/catalog` is read-only; the vendor can see items but cannot edit prices. So they email a spreadsheet or update their own ERP and notify the chef externally.

**Context ChefFlow has:**

- Full vendor_items table with current prices (`unit_price_cents`), SKUs, unit sizes, measures
- `vendor_price_entries` historical price tracking (records every price change with date)
- `vendor_catalog_import_rows` queue with confidence scoring and chef approval workflow
- `vendor_document_uploads` pipeline for CSV/XLSX intake with auto-parsing
- Price comparison across vendors for same ingredient (`getPriceComparison`, `getPriceComparisonAll`)
- Price insights with alert thresholds (`getVendorPriceInsights`, `setVendorPriceAlertThreshold`)

**Data source?** No. The vendor IS the source. Their ERP/spreadsheet is the system of record for their own prices.

**Client-collaborative angle:** None. Pricing is strictly vendor-to-chef. Clients have no role in supplier pricing.

**Physical reality:** Screen-based. Vendors updating price sheets are at a desk or office, not in a kitchen. File upload (CSV/XLSX) is the natural interface since vendors already maintain spreadsheets.

**Compounding:** High. Every price update feeds: (1) historical price tracking for trend analysis, (2) price comparison intelligence across vendors, (3) PIE accuracy for food costing, (4) alert thresholds for abnormal changes. One upload compounds across all future event costings.

**Solution design:**

- Add vendor-side price update form on `/vendor/catalog` (inline edit per item)
- Add vendor-side CSV/XLSX upload that feeds the existing `queueVendorCatalogRows` pipeline (currently chef-only via `requireChef()`)
- Changes enter as "proposed" status visible to chef on their review queue
- Chef approves/rejects via existing `VendorCatalogReviewQueue` component
- Auto-record to `vendor_price_entries` on approval (already wired via `recordVendorPricePoint`)

**Where it appears:**

- `/vendor/catalog` (add edit/upload actions)
- Chef-side vendor detail page (pending proposals badge)
- Price alert notifications when vendor proposes significant changes

**What remains as permanent exit:**
Vendor still maintains their own ERP/accounting system as source of truth. ChefFlow receives price updates but does not replace the vendor's internal pricing system.

**Priority:** Very High frequency (every vendor updates prices regularly) x Low effort (infrastructure exists, need to expose to vendor role) = P1
**Spec needed?** No (infrastructure fully built; needs role-gate change from `requireChef` to `requireVendor` + approval queue)

---

## Scenario #9: Add new catalog items

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why vendor leaves:** The vendor introduces new products (new season, new supplier relationship, expanded product line) and needs to inform the chef that new items are available for ordering. Currently no vendor-side add flow exists; they email a list or tell the chef by phone.

**Context ChefFlow has:**

- `vendor_items` table with full item schema (name, SKU, price, size, measure, notes)
- `addVendorItem` server action in `lib/vendors/vendor-item-actions.ts` (chef-only)
- Catalog import queue with confidence assessment and auto-apply for high-confidence rows
- Document intake pipeline supporting CSV, XLSX, and PDF parsing
- Column auto-detection for item name, SKU, price, unit size, unit measure, notes

**Data source?** No. The vendor is the source of their own product catalog.

**Client-collaborative angle:** None. Product catalog is vendor-to-chef only.

**Physical reality:** Screen/desk work. Vendors adding items are in an office context. Both single-item form and bulk file upload are appropriate.

**Compounding:** High. New items expand the ingredient-to-vendor mapping, enabling better price comparison and broader sourcing options for all future events. Once an item is in the catalog, it is available for every PO going forward.

**Solution design:**

- Add "Propose New Item" form on `/vendor/catalog` (mirrors `AddVendorItemSchema` fields)
- Add bulk upload (CSV/XLSX) that creates proposals in `vendor_catalog_import_rows` with status `pending`
- Chef sees new-item proposals in existing review queue component
- On approval, items are created via existing `applyNormalizedRowToVendorItems` logic
- Vendor sees proposal status (pending/approved/rejected) on their catalog page

**Where it appears:**

- `/vendor/catalog` (+ Add Item button, bulk upload dropzone)
- Chef-side vendor review queue (new items distinguished from price updates)

**What remains as permanent exit:**
Vendor still manages their full product database in their own ERP. ChefFlow receives the subset relevant to this chef relationship.

**Priority:** High frequency (vendors regularly add products) x Low effort (queue infrastructure exists) = P1
**Spec needed?** No (same infrastructure as #8; vendor-side form + role gate change)

---

## Scenario #10: Remove discontinued items

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why vendor leaves:** A product is no longer available (discontinued by manufacturer, seasonal end, supply chain issue) and the vendor needs to inform the chef so they stop ordering it. Currently no vendor-side status controls exist on items; vendor emails or calls chef.

**Context ChefFlow has:**

- `vendor_items` table (no `status` or `is_active` column currently; items exist or are deleted)
- `deleteVendorItem` action in `lib/vendors/vendor-item-actions.ts` (chef-only, hard delete)
- Vendor trust ledger tracks `missing_item` and `bad_substitution` events
- Purchase order items reference item names but not vendor_item IDs directly

**Data source?** No. The vendor knows which items are discontinued.

**Client-collaborative angle:** None. Discontinuation is vendor-to-chef.

**Physical reality:** Screen-based. Office/desk context for catalog maintenance.

**Compounding:** Medium. Knowing an item is discontinued prevents wasted PO lines and forces the chef to find alternatives proactively. Prevents trust ledger "missing_item" events. But discontinuation is a one-time signal per item, not recurring.

**Solution design:**

- Add `status` column to `vendor_items` (active/discontinued/seasonal_unavailable)
- Add vendor-side "Mark Discontinued" action on `/vendor/catalog` per item
- Discontinuation enters as proposal; chef approves (item gets status change, not deletion)
- Chef-side notification: "Vendor X discontinued Y; find alternative"
- Discontinued items hidden from PO creation dropdowns but preserved for history
- Optional: vendor can add reason/effective date and suggest substitution

**Where it appears:**

- `/vendor/catalog` (status toggle per item)
- Chef-side vendor detail page (discontinued items highlighted)
- PO creation flow (warning if referencing discontinued item)

**What remains as permanent exit:**
Vendor still manages full product lifecycle in their ERP. ChefFlow receives discontinuation signals.

**Priority:** Medium frequency (items discontinued periodically) x Medium effort (needs schema change + new status column) = P2
**Spec needed?** Yes (schema change to vendor_items, new status workflow)

---

## Scenario #11: Attach spec sheets or product docs

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why vendor leaves:** Vendor needs to share product specifications, allergen declarations, nutritional info, handling instructions, or certifications (organic, kosher, etc.) with the chef. Currently there is no vendor-side document upload; chef-side `uploadVendorDocument` exists with type `supplier_doc` but is gated by `requireChef()`.

**Context ChefFlow has:**

- `vendor_document_uploads` table with types: catalog, invoice, expense, `supplier_doc`, other
- Full upload pipeline: file storage, hash deduplication, size validation, extension filtering
- `VENDOR_DOCUMENTS_BUCKET` storage bucket
- Activity logging via `logVendorDocumentActivity`
- `ALLOWED_EXTENSIONS` set for supported file types
- Chef-side document review workflow

**Data source?** No. The vendor produces spec sheets as part of their product offering.

**Client-collaborative angle:** Minimal. Clients may need allergen info, but the chef mediates what is shared. The chef might surface allergen data to Dinner Circles for dietary confirmation.

**Physical reality:** Screen/desk. Document upload is standard office workflow. PDFs, images of labels, spec sheets.

**Compounding:** High. Spec sheets are reference documents used across many events. An allergen declaration for "Product X" applies to every event using that product. Organic/kosher certifications apply broadly. Upload once, reference forever.

**Solution design:**

- Expose `uploadVendorDocument` to vendor role (with type limited to `supplier_doc`)
- Add document upload zone on `/vendor/catalog` or `/vendor/profile`
- Allow linking documents to specific catalog items (spec sheet for item X)
- Chef sees uploaded docs in vendor detail page with approve/flag workflow
- Documents surface in recipe/ingredient context when item is used

**Where it appears:**

- `/vendor/catalog` (attach doc per item, or general upload area)
- `/vendor/profile` (business-level documents like certifications)
- Chef-side vendor detail (document library)
- Recipe/ingredient detail (linked spec sheets)

**What remains as permanent exit:**
Vendor may still host their full document library on their own portal/website. ChefFlow captures the relevant subset for this chef relationship.

**Priority:** Medium frequency (docs uploaded at onboarding + product changes) x Low effort (upload pipeline exists, need role gate change + item linking) = P2
**Spec needed?** No (minor extension of existing pipeline)

---

## Scenario #12: Share seasonal availability

**Original classification:** Bridgeable
**Reclassified to:** Partially Reducible

**Why vendor leaves:** Vendor has products that are only available during certain seasons (spring asparagus, summer stone fruits, fall squash, winter citrus) or has supply constraints (limited harvest windows, weather-dependent). They communicate this via phone, email, newsletter, or text. The chef needs to know what is available when for menu planning.

**Context ChefFlow has:**

- `vendor_items` table (no availability window columns currently)
- Price entries with `recorded_at` dates (can infer historical availability from ordering patterns)
- Vendor notes field (free text, could mention seasons)
- PIE seasonal awareness (pricing intelligence tracks seasonal patterns)
- No structured availability calendar or effective dates per item

**Data source?** Partially. Some availability is predictable (asparagus is always spring), but specific vendor availability depends on their farm/supply chain. The vendor is the authoritative source.

**Client-collaborative angle:** None directly. But seasonal availability influences menu options presented to clients.

**Physical reality:** Screen-based for the vendor (entering dates). But the chef consumes this info during menu planning, which can be screen or print.

**Compounding:** Very High. Seasonal patterns repeat year after year. Once a vendor establishes "asparagus: March-June" that applies every year with minor adjustments. Builds a powerful seasonal intelligence layer over time.

**Solution design:**

- Add `available_from` and `available_until` date columns to `vendor_items` (nullable)
- Add vendor-side availability notes per item on `/vendor/catalog`
- Vendor can set recurring seasonal windows (month ranges) or one-off availability
- Chef-side: items flagged as "currently unavailable" in PO creation
- Menu planning intelligence: warn if recipe uses item outside availability window
- Historical pattern detection: if vendor always has X from March-June, pre-populate next year

**Where it appears:**

- `/vendor/catalog` (availability column/field per item)
- Chef-side PO creation (availability warnings)
- Menu planning (seasonal item indicators)
- PIE seasonal intelligence layer

**What remains as permanent exit:**
Real-time availability (today's harvest, weather events, supply chain disruptions) cannot be fully captured in advance. Vendor still calls/texts for "we're out of X this week" type updates. Structured seasonal windows handle the predictable part; ad-hoc unavailability remains external.

**Priority:** Medium frequency (seasonal, a few times per year per item) x Medium effort (schema additions + UI + menu planning integration) = P2
**Spec needed?** Yes (new schema columns, vendor UI, menu planning integration)

---

## Scenario #13: Share substitutions

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why vendor leaves:** When an ordered item is unavailable at fulfillment time, the vendor needs to propose a substitute (e.g., "out of Fuji apples, can do Honeycrisp at same price"). Currently this happens by phone/email/text. The vendor portal order actions only transition status (acknowledge, partially received, received); there is no item-level substitution proposal.

**Context ChefFlow has:**

- `purchase_order_items` with `item_name`, `quantity`, `unit`, `receivedQuantity`, `varianceNotes`
- Vendor trust ledger events: `bad_substitution`, `approved_substitution`
- `VALID_TRANSITIONS` in order-actions only: sent->acknowledged->partially_received->received
- Vendor order detail page shows items but no per-line actions
- Trust ledger captures substitution outcomes but not the proposal workflow

**Data source?** No. The vendor determines substitutions based on their real-time stock.

**Client-collaborative angle:** Indirect. If substitution affects allergens or dietary needs, chef may need to verify with client. But the initial proposal is vendor-to-chef.

**Physical reality:** Time-critical. Substitution proposals often happen same-day or next-morning when vendor is picking the order. Phone/text is fast. ChefFlow needs to be equally fast (push notification or real-time update).

**Compounding:** Medium. Substitution history informs: (1) which vendors substitute reliably, (2) which items commonly need subs, (3) acceptable sub patterns (chef approved Honeycrisp for Fuji before). Over time, the system can pre-approve known-good substitutions.

**Solution design:**

- Add vendor-side "Propose Substitution" per PO line item on order detail
- Fields: original item, proposed substitute, price difference, reason
- Chef receives notification with approve/reject action
- Approved subs update PO line (with original item preserved in history)
- Feed trust ledger: approved -> `approved_substitution`, rejected + shipped anyway -> `bad_substitution`
- Over time: build substitution pattern memory (auto-suggest common subs)

**Where it appears:**

- `/vendor/orders/[id]` (per-line substitution proposal button)
- Chef-side PO detail (pending substitution approvals)
- Chef notifications (urgent: substitution proposed for tomorrow's delivery)
- Trust ledger (substitution history per vendor)

**What remains as permanent exit:**
Voice/phone for truly urgent same-morning substitutions where the vendor cannot wait for chef approval. The portal handles advance notice; emergency subs may still be phone calls.

**Priority:** High frequency (substitutions happen regularly) x Medium effort (new per-line action workflow, notifications) = P1
**Spec needed?** Yes (new PO line-level proposal workflow, notification system, trust ledger integration)

---

## Scenario #14: Confirm pack size changes

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why vendor leaves:** A product's packaging changes (e.g., "chicken breast was 5lb bags, now 4lb bags at different price point"). Vendor needs to inform chef so recipes and costing stay accurate. Currently the vendor cannot edit `unit_size` or `unit_measure` on their catalog items.

**Context ChefFlow has:**

- `vendor_items.unit_size` (numeric 10,2) and `vendor_items.unit_measure` (text)
- Price normalization logic in `lib/vendors/price-normalization.ts`
- `updateVendorItem` action records price point when size/measure changes
- Recipe ingredient quantities reference unit sizes for yield calculations
- PIE uses unit normalization for cross-vendor comparison

**Data source?** No. The vendor is the authoritative source of their own pack sizes.

**Client-collaborative angle:** None. Pack sizes are vendor-to-chef operational data.

**Physical reality:** Screen-based. Vendor is at a desk communicating product spec changes.

**Compounding:** High. A pack size change affects: (1) all future PO quantities, (2) recipe yield calculations, (3) food cost per portion, (4) price comparison normalization. One update cascades through the entire costing system.

**Solution design:**

- Same mechanism as #8 (vendor proposes price/spec changes)
- Vendor edits unit_size and unit_measure on their catalog item
- Change enters as proposal with clear "was X, now Y" diff visible to chef
- Chef approval triggers: price point recording, PIE recalculation flag
- Optional: system highlights affected recipes when pack size changes

**Where it appears:**

- `/vendor/catalog` (edit pack size/measure per item)
- Chef review queue (pack size change proposals highlighted differently from price-only changes)
- Recipe cost recalculation alerts

**What remains as permanent exit:**
None for this specific action. If vendor can propose pack size changes and chef can approve, the round-trip is complete within ChefFlow.

**Priority:** Medium frequency (pack sizes change occasionally) x Low effort (same infrastructure as #8) = P2
**Spec needed?** No (covered by same vendor catalog edit proposal system as #8)

---

## Scenario #15: Publish bulk discounts or minimums

**Original classification:** Bridgeable
**Reclassified to:** Partially Reducible

**Why vendor leaves:** Vendor offers volume-based pricing tiers, minimum order requirements, or promotional bulk discounts. They communicate these via email, sales rep conversations, or their own portal. Currently `vendors.minimum_order_cents` exists as a single field, but no structured discount tiers or item-level minimums exist.

**Context ChefFlow has:**

- `vendors.minimum_order_cents` (single value per vendor)
- Vendor trust ledger event: `minimum_order_issue`
- Vendor communication types include `minimumOrderCents` in vendor profile
- No price tier/volume discount table
- No item-level minimum quantity

**Data source?** No. The vendor defines their own pricing tiers and minimums.

**Client-collaborative angle:** None. Bulk pricing is vendor-to-chef.

**Physical reality:** Screen-based. Vendor is in an office/sales context when setting terms.

**Compounding:** Medium-High. Discount tiers inform optimal ordering (batch multiple events into one order to hit price breaks). Minimum order data prevents failed orders. This compounds as the chef learns to optimize purchasing across events.

**Solution design:**

- Add `vendor_pricing_tiers` table (vendor_id, item_id nullable, min_quantity, discount_percent or price_cents, effective_from, effective_until)
- Vendor-side UI on `/vendor/catalog` or `/vendor/profile` to set: order minimum, item minimums, volume tiers
- Proposals enter review queue for chef approval
- Chef-side PO creation: show available discounts when quantity thresholds are met
- Smart ordering suggestions: "Add $X more to hit free delivery" or "Order Y more to get bulk price"

**Where it appears:**

- `/vendor/catalog` (tier/minimum settings per item)
- `/vendor/profile` (overall order minimums, delivery minimums)
- Chef-side PO creation (discount opportunity indicators)
- Shopping list optimization (aggregate orders to hit tiers)

**What remains as permanent exit:**
Complex promotional deals, time-limited offers, and negotiated relationship pricing still happen via sales rep conversations. Structured tiers are capturable; bespoke deals are not.

**Priority:** Medium frequency (terms change quarterly or annually) x Medium-High effort (new table, tier logic, PO integration) = P2
**Spec needed?** Yes (new pricing tier schema, PO optimization integration)

---

## Scenario #16: Sync full ERP catalog

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why vendor leaves:** The vendor's ERP (QuickBooks, NetSuite, SAP, or industry-specific system like Sysco's portal) is their system of record for thousands of products. They would never abandon it for a single chef's portal. The vendor manages inventory, pricing, logistics, and thousands of customer relationships in their ERP.

**Context ChefFlow has:**

- Catalog import pipeline that accepts CSV/XLSX (up to 5000 rows per batch)
- Column auto-detection for common spreadsheet formats
- Queue-based processing with confidence scoring
- Deduplication by SKU or item name matching
- Document upload with hash-based duplicate detection
- Price format inference (dollars vs cents)

**Data source?** The vendor's ERP IS the source. ChefFlow should import from it, not replace it.

**Client-collaborative angle:** None. ERP management is purely vendor-internal.

**Physical reality:** System-to-system. This is an integration/automation problem, not a UI problem.

**Compounding:** Very High for the import mechanism. If a vendor can export their catalog and ChefFlow ingests it cleanly, the entire catalog stays current with periodic re-imports. But the ERP itself is permanent external.

**Solution design:**

- Keep current CSV/XLSX import as primary mechanism (most small vendors export to spreadsheet)
- Add scheduled re-import: vendor uploads updated catalog periodically, system diffs against existing
- Add vendor-side "upload updated catalog" (same mechanism as #8/#9 but framed as full sync)
- For large distributors: consider API/EDI intake (future, not MVP)
- Diff reporting: "12 new items, 45 price changes, 3 discontinued" after each sync

**Where it appears:**

- `/vendor/catalog` (re-upload/sync button)
- Chef-side vendor detail (last sync date, diff summary)
- Notifications when significant catalog changes detected

**What remains as permanent exit:**
The vendor will always maintain their ERP as their primary system. ChefFlow receives periodic exports. Full real-time ERP sync (EDI/API) is possible for major distributors but is not ChefFlow's core value proposition. The vendor portal is a collaboration surface, not an ERP replacement.

**Priority:** Low frequency (monthly or quarterly full sync) x Low marginal effort (import pipeline exists; need vendor-side trigger) = P3
**Spec needed?** No (existing import pipeline handles this; just needs vendor-side access and diff reporting)

---

## Batch Summary

| #   | Title                              | Reclassified To     | Spec Needed? |
| --- | ---------------------------------- | ------------------- | ------------ |
| 8   | Update a price sheet               | Reducible           | No           |
| 9   | Add new catalog items              | Reducible           | No           |
| 10  | Remove discontinued items          | Reducible           | Yes          |
| 11  | Attach spec sheets or product docs | Reducible           | No           |
| 12  | Share seasonal availability        | Partially Reducible | Yes          |
| 13  | Share substitutions                | Reducible           | Yes          |
| 14  | Confirm pack size changes          | Reducible           | No           |
| 15  | Publish bulk discounts or minimums | Partially Reducible | Yes          |
| 16  | Sync full ERP catalog              | Permanent           | No           |

---

## Key Findings

**Infrastructure strength:** ChefFlow's chef-side vendor catalog infrastructure is remarkably complete. The `catalog-import-actions.ts` module provides: queue-based import, confidence scoring, auto-apply for high-confidence rows, chef review workflow, bulk approve, price point recording, and column auto-detection. The `document-intake/upload.ts` pipeline handles file storage, hash deduplication, and multi-format parsing (CSV, XLSX, PDF).

**The gap is a role gate, not a missing system.** For scenarios #8, #9, #11, #14, and #16, the primary work is exposing existing chef-side infrastructure to the vendor role. The `requireChef()` gate needs a parallel `requireVendor()` path that creates proposals instead of direct mutations. The approval queue (`VendorCatalogReviewQueue` component) already exists.

**Schema gaps for full coverage:**

- `vendor_items` needs a `status` column (active/discontinued/seasonal_unavailable) for #10
- `vendor_items` needs `available_from`/`available_until` for #12
- New `vendor_pricing_tiers` table needed for #15
- PO line-level substitution proposal table needed for #13

**Biggest compound value:** Scenarios #8 and #12 compound the most. Price updates feed PIE, food costing, and trend analysis. Seasonal availability data builds a perpetual intelligence layer that improves menu planning year over year.
