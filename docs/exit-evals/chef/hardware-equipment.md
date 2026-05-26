# Exit Evaluation: Chef / HARDWARE & EQUIPMENT

> **Batch:** Wave 1 | **Role:** Chef | **Category:** Hardware & Equipment
> **Evaluated:** 2026-05-25 | **Mode:** Solo (NEEDS-DEVELOPER-REVIEW)
> **Scenarios:** #62, #63, #64

---

## Scenario #62: Buy kitchen equipment

**Original classification:** Permanent exit. Could track equipment inventory.
**Reclassified to:** Partially Reducible

**Why chef leaves:** The chef needs to replace a broken tool, upgrade for a specific gig, or expand their kit. The real decision is: "What do I need, what brand/model, and where do I get the best price?" The operational trigger is often event-driven (upcoming dinner requires equipment the chef doesn't own) or maintenance-driven (item broke, needs replacement). The chef goes to Amazon, WebstaurantStore, or a local restaurant supply store to browse, compare, and purchase.

**Context ChefFlow has:**

- Full equipment inventory with categories (cookware, knives, smallwares, appliances, serving, transport, linen) via `lib/equipment/actions.ts`
- Equipment registry with portable flag via `lib/equipment/packing-list-actions.ts`
- Purchase date, purchase price, serial number, current value on every item
- Maintenance schedule with overdue/due-soon status via `lib/equipment/maintenance-actions.ts`
- Depreciation tracking (Section 179 and straight-line) via `lib/equipment/depreciation-actions.ts`
- Technique-to-equipment mapping that knows what gear each cooking method requires via `lib/equipment/technique-equipment-map.ts`
- Packing list auto-generation that detects equipment gaps per event
- Vendor system with "Equipment Rental" vendor type via `lib/vendors/constants.ts`
- Event menus, recipes, guest counts, service styles
- Rental cost tracking per event

**Data source?** Partially. Product catalogs (Amazon, WebstaurantStore) have APIs or affiliate feeds, but they are primarily transactional platforms, not pure data sources. Price comparison could be sourced. Product specs and reviews are harder to ingest programmatically.

**Client-collaborative angle:** Minimal for purchasing. However, the client's kitchen profile (stored in ChefFlow, never-leaves item #72) tells the chef what the venue already has, which directly affects what the chef needs to buy or bring. The Circle can collect "Does your kitchen have a stand mixer / food processor / immersion blender?" to reduce unnecessary purchases.

**Physical reality:** Equipment shopping is often done on a phone or laptop between events. Not a messy-hands moment. Screen is the natural interface. The chef may want to browse on their own time. Print not relevant here.

**Compounding:** High. Equipment inventory is permanent. Every item added (with purchase date, price, serial number) compounds:

- Depreciation schedules auto-generate for tax season
- Packing lists auto-populate from registry
- Maintenance alerts prevent breakdowns before events
- Technique-equipment mapping gets smarter as the registry grows
- Rental-vs-buy decisions improve with historical cost data

**Solution design:**

- Surface "equipment gaps" proactively: when a new event's menu uses techniques (sous vide, grilling, etc.) that require equipment the chef doesn't own, show a "You may need" alert on the event detail page with links to purchase
- Add a "replacement needed" status to equipment items (alongside owned/retired) that feeds into a shopping/wishlist view
- Store preferred vendors per equipment category (e.g., "I always buy knives from Korin") as vendor links in the vendor system
- When equipment is marked "retired" or flagged for replacement, auto-suggest the same item via an exit link to WebstaurantStore/Amazon search pre-filled with the item name
- Track total equipment investment over time for business intelligence (already have purchase_price_cents)

**Where it appears:**

- Equipment inventory page (`/ops/equipment`) with "needs replacement" filter
- Event detail page, packing section: "Gap detected: you don't own [item]. Buy or rent?"
- Equipment item detail: "Replace this item" exit link
- Dashboard: "Equipment needing replacement" count badge

**What remains as permanent exit:**
The actual purchase transaction. ChefFlow will never be a store. The chef will always leave to buy the item on Amazon, WebstaurantStore, or at a physical supply store. But ChefFlow can make the exit intelligent: pre-filled search links, item name/model on clipboard, and auto-capture the new item back into inventory on return.

**Priority:** Medium frequency (chefs buy equipment a few times per quarter) x Medium effort (mostly wiring existing systems together) = Medium-high rank signal
**Spec needed?** No. The equipment system is already robust. This is incremental wiring: add "needs replacement" status, surface gaps on event pages, and add exit links. Sprint-doc-only.

---

## Scenario #63: Get equipment serviced/repaired

**Original classification:** Permanent exit. Could store service contacts.
**Reclassified to:** Partially Reducible

**Why chef leaves:** A critical tool is broken or degrading (dull knives, miscalibrated immersion circulator, leaking blender gasket). The chef needs to find a repair service, schedule the work, and track progress. The operational pain is twofold: (1) finding a reliable repair person (Google search, ask other chefs), and (2) tracking when the item will be back in service so they can plan around the gap. The timing matters: if the sous vide circulator is out for repair and a dinner in 3 days requires sous vide, the chef needs to rent a replacement or change the menu.

**Context ChefFlow has:**

- Equipment inventory with maintenance type tracking (routine, calibration, repair, inspection) via `lib/equipment/maintenance-actions.ts`
- Maintenance log with cost tracking (costCents), performed-by field, and notes
- Maintenance schedule with overdue/due-soon/ok status and days-until-due
- Calibration-required flag per equipment item
- Maintenance interval with auto-computed next-due date
- Vendor system that could store repair contacts (vendor type could be extended)
- Event packing lists that know which equipment is needed per event
- Technique-equipment mapping that knows which events depend on which gear

**Data source?** No. Repair services are local businesses found via Google, Yelp, or word of mouth. There is no centralized API for "knife sharpening near me" or "immersion circulator repair." Manufacturer warranty/service portals vary by brand.

**Client-collaborative angle:** None directly. The client doesn't know or care about the chef's equipment maintenance. However, if equipment is out for repair and affects an upcoming event's menu, the client should be informed of any menu changes through the Dinner Circle.

**Physical reality:** Scheduling repair is a phone/screen task, not a kitchen moment. The chef may need the manufacturer's serial number (already stored in ChefFlow), warranty info, and purchase date when calling for service. Having this data on-screen during a phone call is the real value.

**Compounding:** High. Service contacts compound permanently:

- "Last time I sharpened knives, I used [vendor] and paid $X" is invaluable
- Repair history per item shows total cost of ownership
- Preferred service contacts per equipment category (knife sharpener, appliance repair) become a personal vendor directory
- Maintenance patterns (this immersion circulator breaks every 8 months) inform replacement decisions
- Repair turnaround times (this vendor takes 2 weeks) inform event planning

**Solution design:**

- Extend the vendor system with a "Service / Repair" vendor type (currently has "Equipment Rental" but not repair)
- On the equipment item detail, add a "Service Contacts" section linking to vendors tagged for that equipment category
- When logging a maintenance event of type "repair," prompt for vendor name and link to the vendor record
- Surface "equipment out for repair" as a status (alongside owned/retired) that shows on packing lists as a warning: "Immersion circulator is out for repair since [date]"
- When an event's packing list requires equipment currently out for repair, show a conflict alert: "This event needs [item] but it's been at [vendor] for repair since [date]. Rent a replacement?"
- Store manufacturer contact info (support phone, warranty expiration) on the equipment item record

**Where it appears:**

- Equipment item detail: "Service history" tab, "Service contacts" section
- Maintenance schedule view (`/ops/equipment`): items out for repair highlighted
- Event packing list: conflict warning for items out for repair
- Vendor directory: "Service / Repair" filter

**What remains as permanent exit:**
The chef will always leave to call/visit the repair service, drop off equipment, and pick it up. Google/Yelp for finding new service providers stays external. Manufacturer warranty portals stay external. But ChefFlow can eliminate the "what's the serial number?" scramble, track repair status, and flag event conflicts automatically.

**Priority:** Medium-low frequency (equipment breaks occasionally, knives need sharpening quarterly) x Medium effort (vendor type extension, equipment status addition, conflict detection) = Medium rank signal
**Spec needed?** No. The maintenance system already tracks repairs with cost and vendor name. The main gap is an "out for repair" equipment status and conflict detection against packing lists. Sprint-doc-only.

---

## Scenario #64: Research new equipment

**Original classification:** Permanent exit.
**Reclassified to:** Permanent (Bridgeable)

**Why chef leaves:** The chef is evaluating whether a major equipment purchase is worth it. "Is this combi oven worth $8,000?" "Which immersion circulator do professional chefs actually recommend?" This is a research and discovery activity involving YouTube reviews, Amazon reviews, chef forums (ChefTalk, Reddit r/chefit), and word of mouth. The decision factors are: performance, reliability, portability (critical for private chefs who transport everything), price, warranty, and whether it opens new menu possibilities.

**Context ChefFlow has:**

- Equipment inventory showing what the chef already owns and its condition
- Depreciation data showing cost of ownership for current equipment
- Maintenance history showing how often current equipment breaks (repair frequency = upgrade signal)
- Technique-equipment mapping showing which dishes/techniques require which equipment
- Event history showing how often the chef uses techniques that need the equipment in question
- Financial data showing revenue from events that used specific techniques (ROI calculation potential)
- Rental history showing how often the chef rents specific equipment (frequent rental = buy signal)

**Data source?** No. Equipment reviews, chef opinions, and hands-on comparisons are subjective, scattered across YouTube, forums, and social media. There is no single API for "professional chef equipment reviews." Product specs could theoretically be sourced from manufacturer sites, but the decision-making process is inherently exploratory and opinion-driven.

**Client-collaborative angle:** None. Equipment research is entirely the chef's professional domain.

**Physical reality:** This is leisure/research time activity. The chef browses videos and reviews on their phone or laptop between gigs. Not a kitchen moment. Not time-pressured. Screen is natural. No hands-free needs.

**Compounding:** Medium. Research notes on equipment ("tried the PolyScience at a demo, preferred the Anova for portability") compound if stored, but most chefs don't take structured research notes. What compounds more is usage data: ChefFlow can tell the chef "You've used sous vide technique in 23 events this year, generating $X in revenue. An immersion circulator upgrade would impact these events."

**Solution design:**

- On equipment items, add a "Research Notes" field where the chef can jot findings while browsing externally
- Surface usage frequency data: "You've used [technique] in N events this year" on the equipment detail page, helping the chef justify purchases
- Surface rental-vs-buy analysis: "You've rented a combi oven 4 times this year for $Y total. Buying one costs $Z." This is a pure data play using existing rental records
- Add a "Wishlist" or "Considering" status for equipment items not yet purchased, with links to product pages and notes
- Exit links from equipment items to relevant search queries (WebstaurantStore search, Amazon search) pre-filled with the item name

**Where it appears:**

- Equipment inventory: "Wishlist" tab for items being researched
- Equipment item detail: "Usage data" section (technique frequency, revenue impact)
- Equipment item detail: "Rental history" section (rental-vs-buy signal)
- Equipment item detail: "Research" exit links (Amazon, WebstaurantStore, YouTube search)

**What remains as permanent exit:**
All of it. The research itself (watching YouTube reviews, reading forum discussions, comparing specs) is inherently external and exploratory. ChefFlow cannot and should not try to replicate product review content. The chef will always leave for this. But ChefFlow can make the departure intelligent (pre-filled search links) and the return valuable (capture the decision, store research notes, track the eventual purchase).

**Priority:** Low frequency (major equipment research happens a few times per year) x Low effort (wishlist status + exit links + usage data display) = Low rank signal
**Spec needed?** No. This is mostly about adding a "wishlist" equipment status and surfacing existing usage/rental data. Sprint-doc-only.

---

## Batch Summary

| #   | Title                           | Reclassified To        | Spec Needed? | Status                 |
| --- | ------------------------------- | ---------------------- | ------------ | ---------------------- |
| 62  | Buy kitchen equipment           | Partially Reducible    | No           | NEEDS-DEVELOPER-REVIEW |
| 63  | Get equipment serviced/repaired | Partially Reducible    | No           | NEEDS-DEVELOPER-REVIEW |
| 64  | Research new equipment          | Permanent (Bridgeable) | No           | NEEDS-DEVELOPER-REVIEW |

### Key Findings

**ChefFlow's equipment system is remarkably mature.** The codebase already has:

- Full CRUD equipment inventory with 8 categories (`lib/equipment/actions.ts`)
- Maintenance scheduling with overdue detection (`lib/equipment/maintenance-actions.ts`)
- Depreciation tracking with Section 179 and straight-line methods (`lib/equipment/depreciation-actions.ts`)
- Auto-generated packing lists from technique detection (`lib/equipment/packing-list-actions.ts`)
- Technique-to-equipment mapping for 12 cooking methods (`lib/equipment/technique-equipment-map.ts`)
- Equipment registry with portable flag (`lib/equipment/packing-list-types.ts`)
- Personal gear checklist system (`lib/gear/actions.ts`, `lib/gear/defaults.ts`)
- Rental tracking with per-event cost aggregation
- Equipment vendor type in vendor system (`lib/vendors/constants.ts`)
- Multiple equipment-related routes: `/ops/equipment`, `/events/[id]/gear`, `/events/equipment-check`, `/finance/expenses/rentals-equipment`, `/finance/tax/depreciation`

**Incremental wiring needed (no new specs):**

1. Add "needs replacement" and "out for repair" equipment statuses
2. Add "Service / Repair" vendor type alongside existing "Equipment Rental"
3. Surface equipment gap alerts on event detail pages (technique requires gear chef doesn't own)
4. Surface repair conflicts on packing lists (event needs gear that's out for repair)
5. Add "Wishlist" status for equipment being researched
6. Add rental-vs-buy analysis (existing rental data vs purchase price)
7. Exit links from equipment items to WebstaurantStore/Amazon search
