# Exit Eval: Chef / Vendor & Supplier Interaction

> **Wave 1 | Batch Mode (Solo) | 6 scenarios**
> **Date:** 2026-05-25
> **Status:** NEEDS-DEVELOPER-REVIEW (all scenarios)

---

## Scenario #8: Browse vendor's full product catalog

**Original classification:** Permanent exit
**Reclassified to:** Permanent (confirmed)

**Why chef leaves:** The chef needs to discover what a vendor actually carries. Not just pricing on known items, but exploring the full product range: seasonal specials, new arrivals, pack sizes, brand options. The vendor's catalog IS their product, updated in real-time by the vendor's merchandising team. No third party can replicate it accurately.

**Context ChefFlow has:**

- Full vendor record (name, type, contact, website, portal URL) in `vendors` table
- Vendor items already tracked in `vendor_items` with price points in `vendor_price_points`
- Vendor catalog import system (`vendor-catalog-import`, `vendor-catalog-review-queue`) that can ingest uploaded catalog files
- Vendor document intake pipeline (`lib/vendors/document-intake/`) supporting catalog, invoice, and expense document types
- Exit link buttons already wired on vendor detail page (Exit 51: Browse vendor catalog/website)

**Data source?** Yes, but not one ChefFlow can drink from. Vendor catalogs are proprietary, behind logins (US Foods Direct, Sysco Shop), and change daily. No public API. The document intake system can ingest uploaded catalog snapshots (PDF/CSV), but these are point-in-time, not live.

**Client-collaborative angle:** None. Clients do not interact with vendor catalogs.

**Physical reality:** Desktop/tablet browsing. Vendor sites are designed for their own ordering flow. Chef often has a laptop open at the kitchen counter or office.

**Compounding:** Medium. Each catalog browse builds the chef's mental model of what a vendor carries. ChefFlow captures this via vendor items and catalog imports, but the live browse is always external.

**Solution design:**

- Already built: Exit link button (Exit 51) on vendor detail page opens vendor website/portal URL in new tab
- Already built: Catalog document intake lets chef upload vendor catalog PDFs/CSVs for parsing into `vendor_items`
- Already built: Vendor catalog review queue for approving imported items
- Enhancement: After returning from catalog browse, surface a "Log new items?" prompt on vendor detail page to capture what was discovered
- Enhancement: Pre-populate the exit link with the vendor's known catalog URL if they have a direct catalog page vs. generic website

**Where it appears:**

- Vendor detail page (`/vendors/[id]`) via `VendorExitLinks` component
- Shopping list page when "browse alternatives" is needed
- Event prep when exploring ingredient options

**What remains as permanent exit:**
The actual catalog browsing. Vendor catalogs are proprietary, login-gated, and real-time. ChefFlow will never replicate US Foods' 400K-item catalog. The chef always leaves for this.

**Priority:** Weekly (per event) x Low effort (exit links already built) = Low remaining work
**Spec needed?** No. Exit link and catalog import are already built. Minor UX polish only.

---

## Scenario #9: Place an order with a vendor

**Original classification:** Permanent exit
**Reclassified to:** Bridgeable

**Why chef leaves:** The chef needs to execute a purchasing transaction: submit item quantities, confirm pricing, select delivery date, apply payment. The vendor's ordering system handles fulfillment, payment processing, credit terms, and delivery scheduling. ChefFlow is not an ordering system and should not become one.

**Context ChefFlow has:**

- Shopping list generation across events (`lib/culinary/shopping-list-actions`)
- Vendor order draft system (`lib/vendors/vendor-order-draft.ts`) that auto-assigns shopping list items to vendors by category and preference
- Vendor communication preferences with preferred channel, order cutoff time, lead time hours (`vendor_communication_preferences` table)
- Vendor order recording system (`lib/vendors/vendor-communication-actions.ts`) that logs orders with status tracking (draft, ready_to_send, sent, confirmed, received)
- Purchase order table (`purchase_orders`) with PO numbers, status, expected delivery date
- Exit link button (Exit 39) for vendor portal ordering
- Vendor minimum order amounts tracked
- Full ingredient-to-vendor matching via `lib/vendors/sourcing-actions.ts`

**Data source?** No. Vendor ordering portals are interactive transactional systems, not data sources.

**Client-collaborative angle:** Minimal. Client's menu choices drive the shopping list, which is already captured. Guest count changes (via Dinner Circle) affect quantities, which flow into shopping list generation automatically.

**Physical reality:** Desktop ordering (vendor portal). Some chefs call in orders by phone. The vendor order draft generates a text summary suitable for reading over the phone or pasting into an email/portal.

**Compounding:** High. Order patterns compound over time. ChefFlow already tracks order history per vendor, enabling: repeat orders, quantity estimation, spend tracking, and vendor reliability scoring.

**Solution design:**

- Already built: Shopping list to vendor order draft pipeline (auto-splits items across vendors)
- Already built: Order recording with status tracking (draft -> sent -> confirmed -> received)
- Already built: Exit link to vendor portal for actual order placement
- Already built: Purchase orders with PO numbers
- Enhancement: "Copy order to clipboard" button on vendor order draft, formatted for pasting into vendor portal or email
- Enhancement: After order is placed externally, one-click "Mark as Sent" status update with timestamp
- Enhancement: Template past orders for quick reorder ("Order like last time for [vendor]")

**Where it appears:**

- Shopping list page (`/culinary/prep/shopping`) with vendor assignment
- Vendor detail page (`/vendors/[id]`) via exit links
- Event execution page when last-minute orders needed
- Bulk buy page (`/shopping/bulk`) for multi-event consolidation

**What remains as permanent exit:**
The actual transaction: submitting the order on the vendor's platform, confirming payment terms, scheduling delivery. ChefFlow generates the order content; the vendor system executes it.

**Priority:** Weekly (per event) x Medium effort (draft system exists, needs clipboard/reorder polish) = Medium
**Spec needed?** No. Core pipeline exists. Enhancements are incremental UX improvements (clipboard copy, reorder template).

---

## Scenario #10: Check order status / delivery tracking

**Original classification:** Permanent exit
**Reclassified to:** Bridgeable

**Why chef leaves:** The chef needs to know: "Did my order ship? When will it arrive? Is the delivery truck on the way?" This requires real-time tracking from the carrier (FedEx, UPS, vendor's own fleet) or the vendor's order management system. No third party can replicate live GPS tracking or warehouse status.

**Context ChefFlow has:**

- Vendor order records with status field (draft, ready_to_send, sent, confirmed, received, cancelled)
- Purchase orders with expected delivery date
- Vendor detail page displays tracking info via `VendorExitLinks` component (Exit 52: Track shipment)
- Vendor record can store `tracking_number` and `portal_url`
- Event timeline with prep blocks that depend on delivery timing

**Data source?** Partially. Carrier tracking APIs exist (FedEx, UPS, USPS have public tracking pages). But most vendor deliveries for food service are direct-delivery (vendor's own truck), not carrier-shipped. No API for "Joe's Fish is on his way."

**Client-collaborative angle:** None. Clients do not track vendor deliveries.

**Physical reality:** Quick phone check. Chef glances at phone while prepping. Needs fast answer: "Is it coming today or not?" Voice query to Remy ("Is my fish delivery coming?") would be ideal for hands-busy moments.

**Compounding:** Low. Each delivery check is transactional. However, delivery reliability data compounds into the vendor scorecard (`lib/vendors/scorecard-actions.ts` already tracks event reliability score).

**Solution design:**

- Already built: Exit link (Exit 52) for shipment tracking when tracking number is stored
- Already built: Vendor order status tracking (sent -> confirmed -> received)
- Already built: Vendor scorecard tracks delivery reliability over time
- Enhancement: "Expected today" badge on dashboard/calendar when a vendor order has `expected_delivery_date` matching today
- Enhancement: One-tap "Received" button on event day view to close the loop on delivery status
- Enhancement: Store tracking URLs (not just numbers) so exit link opens directly to carrier tracking page
- Enhancement: Remy integration: "What deliveries are expected today?" queries vendor_orders by expected_delivery_date

**Where it appears:**

- Vendor detail page (`/vendors/[id]`) via exit links
- Event detail/execution page when waiting for supplies
- Dashboard calendar view showing expected deliveries
- Remy chat for voice/hands-free status checks

**What remains as permanent exit:**
Real-time carrier tracking (GPS, truck location). Direct-delivery vendor status ("is the truck on the way"). ChefFlow can show expected date and provide tracking links, but live tracking stays external.

**Priority:** Weekly x Low effort (exit link exists, enhancements are small) = Low-Medium
**Spec needed?** No. Incremental improvements to existing infrastructure.

---

## Scenario #11: Contact a vendor (call, email, chat)

**Original classification:** Could store vendor contacts + last-contact notes
**Reclassified to:** Bridgeable

**Why chef leaves:** The chef needs to have a real-time conversation with a vendor: ask about availability, negotiate substitutions, confirm delivery windows, resolve quality issues. The conversation itself happens on phone, email, or vendor portal chat. ChefFlow cannot replace the communication channel.

**Context ChefFlow has:**

- Full vendor contact info: phone, email, contact_name, website, address in `vendors` table
- Vendor coordination system (`lib/vendors/vendor-coordination-actions.ts`) that logs vendor contacts into `communication_events` with:
  - Channel tracking (text, call, whatsapp, email, in_person)
  - Status tracking (contacted, waiting, confirmed, issue)
  - Follow-up date with automatic timer creation
  - Notes per contact
  - Linked to events via `linked_entity_id`
- Exit link (Exit 35) for emailing vendor directly from vendor detail page
- Vendor communication preferences with preferred channel per vendor
- Event-scoped vendor coordination view (`getEventVendorCoordination`)

**Data source?** No. The communication channel is the destination, not a data source.

**Client-collaborative angle:** Indirect. Client dietary restrictions or menu changes may drive the vendor conversation ("client added a shellfish-allergic guest, need to swap the shrimp"). This context is already in ChefFlow and could pre-populate a vendor email template.

**Physical reality:** Phone calls are the dominant channel for vendor communication in food service. Chef calls from the kitchen, car, or market. Quick, informal. Voice-first. Email for formal orders or documentation.

**Compounding:** High. Vendor contact history compounds significantly. "What did I ask them last time?" and "Who is my contact there?" are questions answered by the coordination log. Last-contact notes, follow-up dates, and preferred communication channel all improve with each interaction.

**Solution design:**

- Already built: Vendor contact info display on detail page with phone/email
- Already built: Exit link for email (Exit 35)
- Already built: Vendor coordination logging with status, channel, notes, and follow-up timers
- Already built: Event-scoped vendor coordination view
- Enhancement: "Call" exit link (tel: protocol) for one-tap calling from mobile
- Enhancement: Pre-draft email template with event context: "Hi [contact_name], for my [event_date] dinner ([guest_count] guests), I need to confirm [items from shopping list]"
- Enhancement: Post-call quick log: after returning from a phone call, surface a compact "Log this call" form pre-filled with vendor name and timestamp

**Where it appears:**

- Vendor detail page (`/vendors/[id]`) via contact info and exit links
- Event execution page for day-of vendor coordination
- Shopping list page when checking availability before ordering

**What remains as permanent exit:**
The actual conversation (phone call, email exchange, chat). ChefFlow pre-loads context out and captures intel back, but the communication itself is always external.

**Priority:** Weekly+ (multiple vendor calls per event) x Low effort (coordination system already built) = Medium (high frequency, low remaining work)
**Spec needed?** No. Core system is built. Enhancements are polish (tel: links, email templates, post-call logging UX).

---

## Scenario #12: Research new vendors/suppliers

**Original classification:** Vendor directory (future; low priority)
**Reclassified to:** Partially Reducible

**Why chef leaves:** The chef needs to find a new supplier: a better fish purveyor, a specialty mushroom farm, a more reliable produce vendor near a specific event venue. This requires searching across multiple sources: Google, Yelp, industry forums, word of mouth, local food directories.

**Context ChefFlow has:**

- National vendor directory (`national_vendors` table) with OSM-sourced specialty food vendors across all US states
- National vendor search component (`components/vendors/national-vendor-search.tsx`) with filtering by name, type, and state
- Vendor sourcing actions (`lib/vendors/sourcing-actions.ts`) that rank vendors by ingredient relevance, combining saved vendors with national directory matches
- One-click "Add to my vendors" from national search results
- Vendor type taxonomy: butcher, fishmonger, farm, greengrocer, produce, dairy, cheese, organic, specialty, bakery, deli, liquor, equipment, grocery
- Ingredient-to-vendor-type matching (e.g., "salmon" -> fishmonger, "truffle" -> specialty)
- Chef's home state for geographic relevance

**Data source?** Partially. ChefFlow already has a national vendor directory from OSM data. However:

- OSM data is incomplete for food service suppliers (many small purveyors not listed)
- No reviews, ratings, or quality signals from the directory
- Google/Yelp have richer data (reviews, photos, hours, ratings) that ChefFlow does not have
- Word-of-mouth and chef-network recommendations are not capturable

**Client-collaborative angle:** Minimal. Occasionally a client recommends a specific vendor ("my friend has an amazing olive oil from this farm"). Could be captured via Dinner Circle as a vendor suggestion.

**Physical reality:** Desktop research. Multi-tab browsing. Reading reviews, comparing options. Not a mobile/kitchen activity.

**Compounding:** High. Once a chef finds and vets a good vendor, that relationship is stored forever. The national vendor search + one-click add + vetting checklist + scorecard pipeline captures the full lifecycle from discovery to trusted supplier.

**Solution design:**

- Already built: National vendor search with type/state filtering and one-click add
- Already built: Ingredient-to-vendor matching with relevance scoring
- Already built: Vendor vetting checklist (8 criteria) for qualifying new vendors
- Already built: Vendor scorecard for ongoing evaluation (A-F grading)
- Enhancement: "Find vendors near [event venue]" using event location, not just chef home state
- Enhancement: After adding a vendor from national search, auto-open the vetting checklist as next step
- Enhancement: "Vendors other chefs use" community signal (future, requires multi-tenant data sharing consent)

**Where it appears:**

- Vendor list page (`/vendors`) with national search integration
- Shopping list page when no vendor is assigned for an ingredient category
- Sourcing actions when building a vendor call queue for a specific ingredient

**What remains as permanent exit:**
Deep vendor research: reading Google/Yelp reviews, checking social media presence, asking chef colleagues for recommendations, visiting farmers markets. ChefFlow's national directory covers discovery; quality assessment stays partially external.

**Priority:** Monthly (when expanding supplier base) x Low effort (national search already built) = Low-Medium
**Spec needed?** No. National vendor search and vetting pipeline are already built. Location-based enhancement is incremental.

---

## Scenario #13: Compare vendor quality/reliability

**Original classification:** Vendor rating/notes per chef (lightweight CRM)
**Reclassified to:** Reducible

**Why chef leaves:** The chef asks: "Should I switch from Vendor A to Vendor B?" This requires comparing quality, reliability, pricing consistency, and overall experience across vendors. Chefs currently check Google reviews, ask on chef forums, or rely on personal notes.

**Context ChefFlow has:**

- Vendor scorecard system (`lib/vendors/scorecard-actions.ts`) computing 6-metric scores:
  - Order history (invoice count + spend volume, 0-25 pts)
  - Catalog depth (tracked items, 0-15 pts)
  - Price stability (variance across price points, 0-20 pts)
  - Quality rating (manual 1-5 star, 0-20 pts)
  - Event reliability (event assignment count, 0-10 pts)
  - Data completeness (filled fields, 0-10 pts)
  - Overall score 0-100 with A-F grade
- Vendor vetting checklist (`lib/vendors/vetting-actions.ts`) with 8 criteria (contact info, contact person, address, catalog, invoice history, supplier docs, website, preferred status)
- Price comparison page (`/vendors/price-comparison`) and component (`components/vendors/price-comparison.tsx`)
- Cross-vendor price comparison panel on vendor detail page (`VendorComparisonPanel`)
- Vendor price insights with alerts and trends (`lib/vendors/price-insights-actions.ts`)
- Vendor price alert settings with threshold configuration
- Manual rating field (1-5) on vendor record
- Notes field for qualitative observations
- Reliability score field on vendor record
- Invoice history and spend tracking per vendor
- Vendor expense stats with category breakdown and monthly trend

**Data source?** Mostly internal. ChefFlow already has the data to compare vendors on price stability, order history, spend patterns, and data completeness. External sources (Google reviews, chef forum opinions) add subjective quality signals that ChefFlow does not have.

**Client-collaborative angle:** None. Vendor quality comparison is purely a chef-side operational decision.

**Physical reality:** Desktop analysis. Chef sits down to evaluate suppliers, not a kitchen or mobile activity.

**Compounding:** Very high. Every invoice, every price point, every event assignment builds the vendor comparison dataset. The scorecard becomes more accurate over time. This is exactly the kind of intelligence that compounds: the chef's own operational data tells the story better than any external review.

**Solution design:**

- Already built: Vendor scorecard (6-metric, 0-100, A-F grade) on vendor detail page
- Already built: Vendor vetting checklist (8 criteria)
- Already built: Cross-vendor price comparison page and panel
- Already built: Price trend visualization and alerts
- Already built: Manual quality rating (1-5)
- Already built: Vendor expense stats with monthly trends
- Enhancement: Side-by-side scorecard comparison view: select 2-3 vendors and see their scorecards next to each other
- Enhancement: "Vendor comparison report" that summarizes: price competitiveness, delivery reliability, catalog overlap, spend history
- Enhancement: Prompt chef to rate vendor quality after marking an order as "received" (capture quality signal at the moment of truth)

**Where it appears:**

- Vendor detail page (`/vendors/[id]`) with scorecard and vetting checklist
- Vendor price comparison page (`/vendors/price-comparison`)
- Shopping list page when deciding which vendor to assign an ingredient to

**What remains as permanent exit:**
Subjective external quality signals: Google reviews, chef forum discussions, word-of-mouth reputation. ChefFlow's own data (price stability, delivery reliability, spend patterns) handles the quantitative comparison.

**Priority:** Monthly (strategic vendor decisions) x Low effort (core system built) = Low (already mostly solved)
**Spec needed?** No. Scorecard, vetting, and price comparison are all built. Side-by-side view is a UI enhancement, not a spec-level feature.

---

## Batch Summary

| #   | Title                                  | Reclassified To     | Spec Needed? |
| --- | -------------------------------------- | ------------------- | ------------ |
| 8   | Browse vendor's full product catalog   | Permanent           | No           |
| 9   | Place an order with a vendor           | Bridgeable          | No           |
| 10  | Check order status / delivery tracking | Bridgeable          | No           |
| 11  | Contact a vendor (call, email, chat)   | Bridgeable          | No           |
| 12  | Research new vendors/suppliers         | Partially Reducible | No           |
| 13  | Compare vendor quality/reliability     | Reducible           | No           |

**Key finding:** ChefFlow's vendor system is remarkably mature. All 6 scenarios have substantial existing infrastructure. No scenario requires a standalone spec. The vendor module already has: full CRM, scorecard, vetting checklist, order drafting, coordination logging with follow-up timers, national vendor directory with search, price comparison, price alerts/trends, document intake, catalog import, and exit links for external actions. Remaining work is incremental UX polish (clipboard copy, side-by-side comparison, tel: links, post-call logging).

**Reclassification shift from original:**

- #8: Permanent -> Permanent (confirmed, well-bridged)
- #9: Permanent -> Bridgeable (ChefFlow's order draft + recording system bridges this heavily)
- #10: Permanent -> Bridgeable (expected delivery tracking + exit links bridge this)
- #11: Unlabeled -> Bridgeable (coordination system already captures round-trip intel)
- #12: Future/low priority -> Partially Reducible (national vendor search already built)
- #13: Lightweight CRM -> Reducible (scorecard + vetting + price comparison already solve this)
