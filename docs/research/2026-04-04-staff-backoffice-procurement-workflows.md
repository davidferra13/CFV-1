# Research: Back Office / Scheduling / Procurement / Supplier Workflow Reality

> **Date:** 2026-04-04
> **Question:** How do the operational back-office functions of a catering business actually work?
> **Status:** complete

---

## Origin Context

This report covers the back-office operational layer of catering and private chef businesses: scheduling, procurement, and supplier relationships. In a small operation (1-3 person team, which describes most ChefFlow users), these roles collapse into the same person as the chef. This is a deeper-focus follow-up to the April 3 multi-persona workflows report, with primary emphasis on the scheduling and sourcing workflows rather than the HR/compliance layer.

---

## Summary

Scheduling and procurement in small catering operations are almost entirely manual and relationship-driven. Event calendars live in Google Calendar or a whiteboard. Staff scheduling is done by text message. Grocery orders are placed the day before an event or the morning of. Vendor relationships are personal, not transactional. Purchase orders do not exist for most operators at this scale. The back-office system is the chef phone contacts and muscle memory. Breakpoints are predictable: last-minute cancellations, substitution decisions under time pressure, and the gap between what a recipe requires and what was actually available at the store.

---

## Scheduling Reality

### How the event calendar is built

Small caterers and private chefs do not use dedicated scheduling software. The workflow is:

1. Inquiry comes in via text, phone, or DM.
2. Chef checks their personal Google Calendar or a hand-written wall calendar to see if the date is free.
3. Date is blocked once a deposit clears or a verbal commitment is made.
4. Events are typically booked 2-8 weeks in advance for private chef work; larger catering jobs book 3-6 months out.

Dedicated catering platforms (BetterCater, Caterease, Total Party Planner, Planning Pod) exist and cover scheduling, but adoption among independent operators is low. These tools are aimed at catering departments within venues or mid-size companies with dedicated coordinators. A solo private chef does not use them.

### Staff scheduling process

Staff is scheduled 1-3 weeks in advance for known events:

1. Chef reviews upcoming events and estimates staffing needs (1-4 people for a private dinner; roughly 1 server per 10-15 guests).
2. Chef texts or calls their regular pool of freelance helpers (servers, sous chefs, assistants).
3. Availability is confirmed verbally or by text. No formal scheduling system.
4. Role assignments are informal.

Shift management apps (When I Work, Agendrix, Quickstaff) are adopted at the 5+ employee level, not the solo-operator level. The marketing claim of reducing scheduling time from 15-20 hours to 20 minutes reflects a restaurant or catering company problem, not a private chef problem.

### When a staff member cancels 24 hours out

This is one of the most acute pain points in the persona. The real workflow:

1. Chef finds out by text, usually the night before or morning of.
2. Chef burns through their personal contacts list in priority order.
3. If the regular pool is exhausted, chef calls on-demand staffing apps (Instawork, Upshift, Bacon Work) which maintain pools of vetted event workers. Upshift maintains a sub-2% no-show rate; Bacon Work sends a pre-briefed backup for every shift.
4. Industry standard: plan for 10-15% no-shows and keep 1-2 backup staff on standby call for larger events. For small private dinners (6-12 guests), the chef typically absorbs the missing person and adjusts service style (plated becomes family-style, for example).
5. Client is rarely told unless it affects the experience. The chef solves it silently.

### Run-of-show / event timeline documents

The Banquet Event Order (BEO) is the formal industry document. A complete BEO includes:

- Event date, time, venue, client contact
- Guest count (guaranteed vs. estimated)
- Menu in service order with dietary callouts
- Timeline (arrival, setup, first course, breaks, dessert, cleanup)
- Room setup diagram
- Staffing requirements and assignments
- Vendor delivery schedule
- Terms and signatures

For private chefs working alone or with 1-2 assistants, the BEO equivalent is an informal Day-of-Plan document or a printed list. It often exists primarily in their head. Distribution is informal: briefed verbally, texted to staff, or shared as a PDF via WhatsApp.

Catering software platforms auto-generate BEO documents. ChefFlow generates an equivalent via the Day-of-Plan (DOP) at `/events/[id]/schedule`.

---

## Procurement Reality

### How a private chef actually sources ingredients

The procurement cycle for a private event runs roughly like this:

1. Menu is finalized (1-3 days before the event for private work; 1-2 weeks for larger catering jobs).
2. Shopping list is built from the menu, grouped by store or source.
3. Specialty items are ordered first. Anything requiring lead time (specialty cuts, imported ingredients, specific fish) is ordered 48-72 hours ahead. Trusted butchers, fishmongers, and specialty importers are called directly.
4. Commodity items are purchased 1-2 days before or the morning of. Pantry staples (oils, vinegars, spices) are assumed on hand.
5. Day-of shopping is common for proteins and fresh produce when the chef wants peak freshness.

### Do small caterers use purchase orders?

No. POs are a practice for institutions, corporate catering departments, and venues with formal procurement policies. A solo private chef or small caterer buys on a personal credit card, a business card, or cash. The purchase order is a mental note. Receipts are uploaded to an expense tracker after the fact.

Credit terms (Net 30, Net 21) are available from broadline distributors like Sysco and US Foods, but require a commercial account and minimum order volumes. Established restaurants get these terms after 3-5 years. A private chef typically does not qualify or does not bother.

### Ordering lead time by source type

| Source                                     | Lead Time          | Notes                                                |
| ------------------------------------------ | ------------------ | ---------------------------------------------------- |
| Restaurant Depot / cash-and-carry          | Same day (walk in) | Free membership for food businesses                  |
| Broadline distributor (Sysco, US Foods)    | 1-2 business days  | Delivery on scheduled route days; minimums apply     |
| Specialty butcher / fishmonger             | 24-72 hours        | Phone order, pickup or delivery                      |
| Local farm / CSA                           | 1-7 days           | Seasonal, limited selection                          |
| Specialty importer                         | 3-14 days          | Rare items: saffron, aged cheeses, specific proteins |
| Grocery store (Whole Foods, Stop and Shop) | Same day           | Walk-in or Instacart delivery (2-hour window)        |
| Instacart / grocery delivery               | 1-2 hours          | Used for fill-ins; markup vs. in-store               |

### Handling substitutions

When an ingredient is unavailable, the decision tree is:

1. Chef decides. Not the client. The menu is the chef professional judgment. They do not ask permission to substitute chicken stock for veal stock.
2. Same-category sub preferred. A ribeye becomes a NY strip. Wild salmon becomes farmed. The quality adjustment (up or down) is noted internally.
3. Client is told only when it matters. If the menu said dry-aged prime beef and the store was out, the client gets a note at service. For generic substitutions, silence is standard.
4. Price adjustment is logged. If the sub cost more, the chef absorbs it or logs it as an expense variance. If it cost less, it improves margin.

---

## Supplier Relationship Reality

### Who the actual suppliers are

Private chefs and small caterers source from a layered stack:

#### Tier 1: Everyday commodity sourcing (most purchases)

- Restaurant Depot (cash-and-carry warehouse, free membership for food businesses, competitive pricing, bulk format)
- Costco / BJ's Wholesale (staples, dairy, proteins in bulk)
- Standard grocery chains (Whole Foods, Stop and Shop, Trader Joe's, Market Basket for New England)

#### Tier 2: Quality-differentiated sourcing

- Local specialty butchers and fishmongers (personal accounts, phone ordering)
- Farmers markets (seasonal, relationship-based, no formal ordering)
- Local farm CSA or direct farm relationships (vegetables, eggs, dairy)
- Regional specialty distributors (artisan cheeses, charcuterie, specialty oils)

#### Tier 3: Specialty and imported items

- Specialty importers for global cuisine ingredients
- Online specialty retailers (D'Artagnan for game meats, Regalis for truffles, etc.)

#### Tier 4: Broadline distribution (if volume warrants)

- Sysco, US Foods: primarily relevant for caterers doing 20+ events/month or volume catering

Restaurant Depot vs. Sysco for small operators: Restaurant Depot beats Sysco on price for most commodity items and has no minimums. Sysco wins on product breadth (400K+ SKUs), delivery convenience, and account management for established operators. Common pattern: Restaurant Depot for bulk staples, specialty shops for differentiated items.

### How supplier relationships actually work

- They are personal. A trusted butcher picks up the phone. A trusted fish supplier will call when something exceptional arrives. The relationship is a competitive advantage.
- Discovery happens via word of mouth: farmers markets, chef-to-chef referrals, Instagram, and food industry events.
- Suppliers call chefs when interesting product arrives. A specialty importer will text a chef when hand-dived scallops come in. This is not a transaction; it is a curated relationship.
- Reliability over price. Chefs consistently report that a supplier who answers the phone at 8am and solves problems is more valuable than one who is 10% cheaper but unreachable.
- Credit terms. Small operators typically pay on delivery or on personal/business card. Net 30 terms from broadline distributors are available after establishing a 3-5 year track record. Most private chefs never reach this threshold.

### How chefs discover new suppliers

1. Other chefs (the primary vector)
2. Farmers markets (direct relationship with growers)
3. Purveyors who cold-call or approach at food events
4. Food-industry social media (Instagram, LinkedIn for B2B)
5. Distributor sales reps (Sysco/US Foods reps actively prospect restaurants and caterers)

---

## Breakpoints

These are the places where the manual, relationship-based system breaks down:

| Breakpoint                            | What fails                                                      | Consequence                                                  |
| ------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------ |
| Staff cancels day-of                  | No backup system; personal contact list exhausted               | Chef works solo or simplifies service style                  |
| Specialty ingredient unavailable      | No documented substitution policy; decision made under pressure | Quality variance, potential client disappointment            |
| Ordering from memory                  | No consolidated shopping list across multiple upcoming events   | Duplicate purchases, missed items, wasted trips              |
| Credit card as PO                     | Receipts lost or mixed with personal expenses                   | Food cost tracking inaccurate; tax prep is chaotic           |
| Staff schedule in text messages       | No record, no accountability, no visibility                     | Double-bookings, miscommunication on arrival time and role   |
| Vendor relationship in phone contacts | No notes on pricing history, preferences, or reliability        | Institutional knowledge lives in the chef head; not portable |
| DOP exists only in the chef head      | No distribution to staff; no written timeline                   | Staff executing from verbal briefing; errors under pressure  |

---

## ChefFlow Match Analysis

### Strong coverage

| Real-world need                       | ChefFlow feature                                                                                           |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Event calendar with status visibility | `/calendar` (monthly, weekly, year views) + week strip dashboard widget                                    |
| Day-of timeline / run-of-show         | DOP at `/events/[id]/schedule` with toggleable completions                                                 |
| Staff roster and clock-in             | `/staff`, `/staff/schedule`, `/staff/clock`                                                                |
| Shopping list from upcoming events    | Event Shopping Planner at `/culinary/costing` (aggregates ingredients from next N days, runs Pi optimizer) |
| Multi-vendor price comparison         | `/events/[id]/grocery-quote` (USDA/Spoonacular/Kroger/MealMe + Instacart link)                             |
| Ingredient substitution suggestions   | `lib/openclaw/substitute-mapper.ts` (same-category substitutes by price proximity, deterministic, no AI)   |
| Vendor directory                      | `/culinary/vendors` and `/vendors` with invoice history                                                    |
| Price intelligence                    | `/culinary/price-catalog` (32K+ ingredients, 27+ sources, price history)                                   |
| Food cost tracking                    | `/food-cost` with invoice upload; `/inventory/food-cost` for theoretical vs. actual variance               |
| Prep component management             | `/culinary/prep/shopping` (consolidated ingredient list by category), `/culinary/prep/timeline`            |
| Kitchen Clipboard / station ops       | `/stations/clipboard`, `/stations/orders` (unified print-ready order sheet across all stations)            |
| Packing checklist                     | `/events/[id]/pack` (5-section, printable PDF)                                                             |
| Expense capture with receipt OCR      | `/events/[id]/receipts`, `/expenses` with receipt upload                                                   |

### Partial coverage

| Real-world need                      | Gap                                                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Staff availability tracking          | `/staff/availability` exists (7-day grid) but has no advance booking conflict detection          |
| Staff cancellation / backup workflow | No backup pool, no on-call status, no replacement action                                         |
| Vendor credit terms tracking         | `/vendors/[id]` has invoice log but no payment terms field (net-30 status, credit limit)         |
| BEO distribution to staff            | DOP exists but no direct push to staff; staff portal exists at `/staff/[id]`                     |
| Substitution notification to client  | Substitutions are logged in Event Ops tab but no client notification flow                        |
| Consolidated ordering across events  | Event Shopping Planner aggregates ingredients; no send-to-vendor or formal order creation action |

### Genuine gaps (not in the app)

| Real-world need                              | Status                                                                                       |
| -------------------------------------------- | -------------------------------------------------------------------------------------------- |
| On-call backup staff pool                    | Not present. No way to flag a staff member as available on standby for a specific date.      |
| Vendor ordering integration                  | No way to generate a vendor-specific order from ChefFlow and send it directly to a supplier. |
| Purchase order / order confirmation workflow | No formal PO creation; relies on external channels (phone, email).                           |
| Delivery window tracking                     | Vendor invoices are captured but not expected delivery windows.                              |
| Staff briefing broadcast                     | Staff portal exists but no broadcast DOP to all assigned staff action.                       |
| Substitution price variance auto-logging     | Substitutions are noted but price delta is not auto-captured as an expense variance.         |

---

## Gaps and Unknowns

- No primary-source data from ChefFlow actual users on their specific procurement workflows. Elena (grazebyElena) grazing board model likely differs meaningfully from private dinner chef patterns.
- Sysco/US Foods adoption among the target user base is unknown. If users are doing volume (20+ events/month), broadline distributor workflows become relevant.
- Whether ChefFlow users want a digital BEO distribution tool or prefer the current informal model is unvalidated.
- Staff backup pool demand is unvalidated. Most private chefs at the solo or 2-3 person scale absorb cancellations rather than systematize against them.

---

## Recommendations

These are observations for product consideration, not implementation directives. All require validation before building.

1. **Staff on-call status flag.** A simple toggle on `/staff/availability` to mark a person as available on call for a specific date would address the backup staff gap without building a full agency integration. Minimal surface change; the availability grid already exists.

2. **Vendor order sheet email action.** The unified order sheet at `/stations/orders` already exists and is print-ready. Adding an email-to-vendor action (pre-filled with the order items) would close the biggest procurement gap with minimal engineering. Vendor contact info is already in the vendor record.

3. **Substitution price delta logging.** When a chef logs a substitution in the Event Ops tab, prompt for the price difference and auto-create an expense variance entry. This would improve food cost accuracy without any new UI surface.

4. **DOP staff briefing share.** The DOP at `/events/[id]/schedule` already generates a printable document. A share-with-assigned-staff button that pushes a read-only link to each assigned staff member portal notification would close the BEO distribution gap.

5. **Vendor credit terms field.** A simple payment terms field on the vendor record (None, Net 7, Net 14, Net 30, Net 60, COD) would let chefs track which vendors extend credit. No behavioral change required; purely a record-keeping aid.
