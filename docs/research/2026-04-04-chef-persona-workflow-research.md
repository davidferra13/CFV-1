# Research: Private Chef / Executive Chef / Sous Chef Workflow Reality

> **Date:** 2026-04-04
> **Question:** How do private/executive/sous chefs actually work, and where does ChefFlow match or miss their real workflows?
> **Status:** complete

---

## Origin Context

ChefFlow entered a validation phase on 2026-04-01 (anti-clutter rule). The core question: before adding any feature, does it match how chefs in this persona group actually work? Previous research (2026-04-03 multi-persona report) surfaced that private/solo chefs are the primary target. This report goes deeper on the three title-level personas (private chef, executive chef, sous chef) to distinguish their workflows and sharpen where ChefFlow fits best versus where it is building for the wrong mental model.

---

## Summary

Private chefs are solo operators who run a client-services business and need tools for the full booking-to-payment lifecycle plus menu history tracking per client. Executive chefs in venues are kitchen department heads who need staff scheduling, food cost control, and systems that connect to POS/inventory. Sous chefs are execution-layer workers who consume prep lists and task assignments from above. ChefFlow is a strong fit for solo private chefs. Its current scope does not match how executive chefs or sous chefs actually work, and building toward them would require fundamentally different product surfaces.

---

## Real Workflows

### Private Chef (Solo Operator)

A private chef typically runs an independent business serving multiple clients. Work is event-based (dinner parties, weekly meal prep, vacation cooking, recurring household service). They are a one-person operation: they source ingredients, cook, plate, clean, and also do all the business admin.

**A typical cook-day cycle:**

1. Before the cook date: confirm menu with client via text or email, note dietary restrictions and preferences, print (or screenshot) the menu and shopping list
2. Morning of cook date: grocery shop (typically 60-90 minutes, two or three stores), then drive to client's home
3. At client's kitchen: set up mise en place, cook, plate, label containers (for meal prep jobs), clean and reset kitchen
4. After service: send a thank-you message, sometimes invoice on the same day, more often at end of week
5. Admin week: update records, respond to new inquiries, plan menus for next cook dates

**Client management reality:**

- Most private chefs manage 3-8 recurring clients. They need to track what was served to each client and when, to avoid repeating dishes too soon.
- Dietary restrictions and dislikes are critical and deeply personal. A chef who serves a client a dish with an ingredient they dislike - even if technically safe - damages the relationship.
- Intake questionnaires are a real practice: chefs ask new clients about allergies, intolerances, preferences, and household members before the first cook date.
- Menus are often confirmed via text/WhatsApp 3-5 days before a cook date. Some chefs batch this by sending a short menu proposal and letting clients pick.

**The admin burden:**

- Chefs report averaging 18 emails per booking using unspecialized tools (source: Epicurate user testimonial, chef.tech). Specialized tools reduce this to 2.
- Most chefs are using Google Docs, Excel, email, WhatsApp, Notion, QuickBooks, and paper in combination. No tool in that stack was designed for the chef workflow.
- Invoicing is consistently described as the most annoying task. Chefs undercharge when they forget to log hours or groceries.
- Recipe organization is mostly informal: Pinterest boards by client, phone photo albums, handwritten notebooks, or Google Docs folders.

**Financial reality:**

- Private chefs price by the day, by the meal, or by the hour. Most use a flat service fee plus grocery pass-through.
- Grocery cost tracking is a real pain point: chefs shop with their own card and need to document exactly what was purchased per client, then either bill for actuals or a flat grocery allowance.
- Per-event profitability is almost never calculated. Chefs quote intuitively from experience.

### Executive Chef (Venue / Restaurant / Hotel / Club)

An executive chef oversees all kitchen operations in a commercial establishment. They lead a team (sous chefs, line cooks, pastry, prep), set culinary direction, control food cost, hire and fire, and are ultimately accountable for quality and profitability of the food program.

**Daily workflow:**

- Morning: review prep lists, check what came in from vendors, walk the line, brief sous chef on day's priorities
- Mid-day: during service, responsible for quality at the pass; out front for special tables
- Afternoon (between services): ordering, scheduling, recipe development, staff issues, cost reports
- Night: debrief service, review food waste, update prep needs for tomorrow

**Tools they actually use:**

- POS system (Toast, Square, Aloha): the center of the universe, connected to kitchen display and order flow
- Kitchen Display System (KDS): real-time ticket management, reduces errors
- Scheduling software (7shifts, HotSchedules, Homebase): weekly schedule, time tracking, labor cost
- Inventory / ordering (BlueCart, xtraCHEF, MarketMan, or just spreadsheets): vendor ordering, invoice capture
- Recipe costing tools (meez, Apicbase, WISK): yield percentages, portion cost, menu engineering
- HR and payroll (ADP, Gusto): for staff of 15-40+ people

**What they do NOT use:**

- Client-facing CRM. Their "clients" are restaurant patrons. They do not manage individual relationships at scale.
- Booking/proposal systems for individual events. Events (buyouts, private dining rooms) are handled by a sales/events team, not by the executive chef.
- Personal invoice tools. Billing is through the restaurant's POS and accounting system.

**Conclusion on executive chefs:** They live in a completely different tool ecosystem centered on team management, food cost control, and real-time service execution. A solo-chef-focused tool does not map to their world at all.

### Sous Chef

The sous chef is the executive chef's second-in-command in a restaurant kitchen. Their role is operational execution, not business management.

**Daily reality:**

- Receives direction from the executive chef, translates it into prep lists and station task lists
- Manages prep cooks and line cooks directly: assigns tasks, checks quality, handles callouts
- Owns mise en place: everything is in place and ready before service starts
- During service: often runs their own station while supervising the team
- Post-service: checks inventory vs. what was used, flags what needs ordering, resets for next service

**Tools they use:**

- Mostly paper: handwritten prep lists, printed station sheets, physical ticket rails
- Digital tools when provided by the employer (KDS, scheduling apps)
- They do not own or choose their tools - the employer selects them
- Personal phone for internal team communication (text/GroupMe/WhatsApp with the kitchen crew)

**Conclusion on sous chefs:** They are employees working inside a system their employer controls. They are not buyers of software and do not manage a business. A tool designed for them would need to be team-facing and employer-provisioned, not a solo product.

---

## Breakpoints

### Private Chef Breakpoints

1. **Menu repetition anxiety.** No memory of what was served to each client means chefs either keep their own notebook or risk embarrassing repeats. Managing this manually across 5-8 clients becomes a real burden after 3-6 months.

2. **Dietary restriction scatter.** Restrictions are collected at onboarding but stored informally (phone notes, old emails). When a guest joins a dinner or a client adds a family member, the update is never captured systematically.

3. **Grocery-to-invoice gap.** Chefs shop, but receipt capture and linking receipts to specific clients is fragmented. Many chefs under-bill because they forget to log a store run.

4. **18-email-per-booking overhead.** Most of this back-and-forth is: confirming availability, agreeing on menu, confirming dietary notes, sending invoice, following up on payment. All of it is improvised.

5. **Recipe-to-client history mismatch.** Recipes live separately from client history. A chef who cooked a dish for a client has no easy way to know when it was last served to that specific person.

6. **Quoting inconsistency.** Without a template, chefs quote differently each time and forget to include travel, extra hours, or specialty ingredient costs.

### Executive Chef Breakpoints (separate domain - listed for boundary clarity)

1. Food cost variance between theoretical and actual is almost never tracked in real time.
2. Labor scheduling is time-consuming and error-prone at 15-40+ staff.
3. Recipe scaling and yield calculations are manual.
4. Vendor ordering is fragmented across multiple contacts and platforms.

### Sous Chef Breakpoints (separate domain)

1. Prep lists are handwritten and lost. No institutional memory.
2. Staff communication during service relies on shouting or informal texts.
3. No digital handoff between shifts: "verbal" is the default.

---

## Workarounds They Use

Private chefs (the core persona):

- **Client binder:** A physical binder or Google Drive folder per client with their intake form, past menus, and notes. Updated manually after each cook date.
- **Photo album as recipe book:** Chefs photograph finished dishes on their phone. This becomes their actual recipe history.
- **WhatsApp for everything:** Booking confirmation, menu approval, payment reminder, follow-up - all in one WhatsApp thread per client. Nothing is organized but everything is findable by scrolling.
- **Excel quote template:** A copy-pasted spreadsheet that gets manually modified for each event. Easily forgotten line items (travel, last-minute extra time) are never captured consistently.
- **Pinterest boards per client:** Chefs build boards tagged with the client's name to track what they have served or planned to serve.
- **Paper prep lists:** Even chefs who use software often print or rewrite prep lists by hand on the day of the event.
- **GroupMe/iMessage for kitchen team:** For chefs who hire a helper for large events, they coordinate via group text with no structure.

---

## ChefFlow Match Analysis

### Strong Matches

**Client profiles with dietary restrictions and allergies**
ChefFlow's client create form captures `allergies` and `dietary_restrictions` as typed arrays (`app/(chef)/clients/new/client-create-form.tsx`, lines 298-299, 715-722). A dedicated dietary restrictions view exists at `/clients/preferences/dietary-restrictions`. This directly addresses the dietary-restriction-scatter breakpoint.

**Served dish history and menu service history**
Two database tables exist: `served_dish_history` and `menu_service_history` (`lib/db/schema/schema.ts`, lines 13292 and 20753). `served_dish_history` includes `client_reaction` (loved/liked/neutral/disliked). `client_meal_requests` table includes `repeat_dish`, `new_idea`, `avoid_dish` request types. This infrastructure directly addresses the menu-repetition-anxiety breakpoint. A panel exists at `app/(chef)/clients/[id]/recurring/client-meal-requests-panel.tsx`.

**Event form with booking essentials**
`components/events/event-form.tsx` captures: client, occasion, event date, serve time, guest count, address, special requests, quoted price, deposit amount, referral partner. This is the standard set of fields for a private chef booking.

**8-state event FSM**
The transition model at `lib/events/transitions.ts` (draft > proposed > accepted > paid > confirmed > in_progress > completed | cancelled) maps well to the private chef booking lifecycle. Auto-sending FOH menu PDFs and prep sheets on `confirmed` is a real workflow need.

**Grocery and shopping list generation**
`app/(chef)/culinary/prep/shopping/page.tsx` generates a consolidated shopping list from planned events, adjusted by on-hand stock. This addresses the grocery-planning workflow directly.

**Inquiry pipeline**
The full inquiry > quote > event flow maps to the 18-email-per-booking problem. A structured flow replaces ad-hoc WhatsApp/email threads.

**Recipe library linked to events and menus**
Recipes tie to menus, which tie to events. This is the connective tissue between the recipe book and the served-dish history.

**Post-event automation chain**
`lib/events/transitions.ts` (lines 676-842): on `completed`, the system auto-deducts inventory, checks food cost variance, awards loyalty points, creates a post-event survey, and enqueues a 3-day/7-day/14-day follow-up email sequence. These are exactly the tasks a private chef does manually and often forgets.

### Partial Matches

**Financial tracking**
ChefFlow has ledger, expenses, invoices, and a tax center. What is less clear is whether grocery receipt capture with per-client attribution is fully supported. The receipt-scan feature exists (`app/(chef)/culinary/ingredients/receipt-scan/`) but it connects to ingredient pricing, not necessarily to per-event cost attribution. This is a partial match: the infrastructure exists but the grocery-to-invoice linkage for billing clients may not be complete.

**Client communication inbox**
Messaging exists in ChefFlow. Whether it replaces WhatsApp in practice depends on client adoption of the portal. The chef-facing inbox is built; the client-side engagement is the uncertain variable.

### Gaps

**No executive chef mode**
ChefFlow does not have staff scheduling, labor cost tracking, POS integration, or KDS connectivity. This is a conscious boundary: executive chefs need those tools, but they are a different product category. This is not a gap to fill - it is a product boundary to maintain.

**No sous chef tooling**
Sous chefs need employer-provisioned tools with prep list assignment, task tracking, and shift handoff. This requires a multi-user team model with role-based access for staff. ChefFlow has `staff_members` and a staff portal, but the kitchen-floor operational tools (station task lists, prep countdown, real-time task completion) are not the primary focus.

**Grocery receipt-to-client billing linkage**
Private chefs pass grocery costs to clients, but receipt capture in ChefFlow currently connects to ingredient pricing, not to per-event cost attribution and billing. A chef cannot currently take a grocery receipt, link it to Event X, and have it auto-populate the invoice line item for "groceries."

**No menu proposal surface for clients**
Clients need to review and approve menus before a cook date. ChefFlow has a client portal and event detail, but there is no "here is my proposed menu, please confirm" flow with a client-facing approve button. This is one of the highest-frequency interactions in a private chef's week.

**Intake questionnaire flow for new clients**
Chefs use structured intake questionnaires (dietary needs, likes, dislikes, household members, kitchen notes). ChefFlow has fields for this data but no guided intake questionnaire form that chefs can share with a new client as a self-service link.

---

## Gaps and Unknowns

- How often do private chefs actually capture recipes in a recipe management system vs. keeping them in their heads or in phone photos? The adoption rate of the recipe library is unknown.
- Does the client portal see enough real usage to replace WhatsApp threads? This is a behavioral adoption question that only live user data can answer.
- The `served_dish_history` and `menu_service_history` tables exist but it is unclear how they are populated in practice. If they require manual entry, chefs will not maintain them.
- Whether the consolidated shopping list output is usable on a phone in a grocery store is unverified.

---

## Recommendations

**Quick fix: Verify and surface the menu repetition guard**
The `served_dish_history` infrastructure is in place. Verify that when a chef builds a menu for a client, the UI shows which dishes have been recently served to that client. If not surfaced, this is a fast UI wire-up, not a new feature.
Tag: `quick fix`

**Quick fix: Verify allergy warnings propagate from client profile to menu/event context**
Dietary restrictions and allergies are stored on the client profile. Verify they appear as visible warnings when a chef is building a menu or editing an event for that client. This is a safety-critical surfacing question, not a data gap.
Tag: `quick fix`

**Needs discussion: Client-facing menu approval flow**
Private chefs need to share a proposed menu with a client and get a simple "looks good" or change request back. This is distinct from the quote approval flow. It is about culinary content confirmation. Whether this belongs in the existing client portal or as a new lightweight surface requires a design conversation.
Tag: `needs discussion`

**Needs discussion: Grocery receipt to per-event billing**
Receipt scan currently feeds ingredient pricing. Linking a receipt to a specific event and surfacing the total as an invoice line item would close the grocery-to-invoice gap that causes private chefs to under-bill. This touches the expense, ledger, and invoice systems.
Tag: `needs discussion`

**Needs discussion: New client intake questionnaire share link**
A shareable link (no login required) that a chef sends to a new client to fill out their dietary profile, household composition, kitchen notes, and food preferences. Data lands in the client record. This removes a common manual step in the private chef onboarding flow.
Tag: `needs discussion`

**Don't build: Executive chef tooling**
POS integration, KDS connectivity, labor scheduling for teams of 15-40, and multi-location kitchen management are a different product category. Executive chefs are not the target persona. Building toward them would fragment the product and dilute the solo-operator focus that makes ChefFlow work for its actual users.
Tag: `don't build`

**Don't build: Sous chef station management / kitchen display**
Real-time kitchen display systems for ticket flow are a restaurant infrastructure product. A sous chef in a restaurant would use the restaurant's KDS. This is not a private chef need.
Tag: `don't build`
