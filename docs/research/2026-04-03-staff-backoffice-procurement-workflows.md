# Research: Staff, Back Office, and Procurement Real-World Workflows

> **Date:** 2026-04-03
> **Question:** How do employees, contractors, admins, managers, back-office staff, schedulers, procurement teams, and suppliers actually work in food service operations? What are the real workflows, breakpoints, workarounds, and missing pieces?
> **Status:** complete
> **Companion:** `docs/research/staff-ops-competitive-landscape.md` (tooling landscape, completed 2026-03-31)

---

## GROUP 1: EMPLOYEES / CONTRACTORS / ADMIN / MANAGER

---

### 1.1 Employees (Line Cooks, Servers, Prep Staff)

#### How They Receive Assignments

**Restaurant model (brick-and-mortar):**

- The kitchen brigade system is the standard hierarchy. The head chef (or sous chef) assigns duties at the start of each shift during a pre-shift briefing.
- Line cooks are assigned to a specific station (saute, grill, fry, garde manger) and are responsible for all food coming off that station for the entire service.
- Prep cooks work off a "par sheet," a document that lists every ingredient that needs to be prepped and in what quantity, based on estimated covers for the day. If the restaurant expects to sell 25 burgers, the prep cook makes 25 patties, slices the tomatoes, and portions the toppings.
- Servers receive table assignments from the floor manager or host, usually posted on a whiteboard or communicated verbally at pre-shift.

**Private chef / catering model:**

- Assignments are event-driven, not station-driven. The lead chef tells assistants what to prep for a specific client's dinner, not for a station.
- Communication is almost always verbal or via text message. There is no formal par sheet; the chef just tells their assistant "prep the salmon, blanch the green beans, make the vinaigrette."
- For larger events (50+ guests), a typed prep list or run sheet may exist, often created in Google Docs or a notes app and shared via text/email.

#### How They Track Hours

- In restaurants: POS-integrated time clocks (Toast, Square), kiosk punch-in, or manager-verified paper timesheets.
- In private chef operations: almost never tracked formally. Assistants and helpers are paid a flat rate per event or per day. Hourly tracking, when it exists, is done via text confirmation ("started at 2pm, ended at 10pm") or a simple spreadsheet.
- Freelance event staff: staffing platforms (Qwick, Upshift, Poached Shifts) track hours through their own apps with check-in/check-out timestamps.

#### How They Communicate

- **During service:** Call-and-response verbal system. The expeditor (expo) calls out tickets, cooks respond with "heard" or "yes chef." Positional callouts ("behind," "corner," "hot") are standard safety communication. No digital tools during active service.
- **Outside service:** Group texts (iMessage, WhatsApp) are the default for small teams. Larger operations may use Slack or the messaging features built into scheduling tools (7shifts, Homebase). Schedule changes, sick calls, and shift swaps happen over text.
- **Private chef teams:** Almost exclusively text messages and phone calls. Group chats for event coordination are common. Formal tools are rare in teams under 5 people.

#### Real Breakpoints

1. **Par sheets are manual and fragile.** They depend on the chef or sous chef remembering to update them. Overprep wastes money; underprep causes service chaos.
2. **No written record of assignments.** When communication is purely verbal, there is no trail. If a prep cook forgets something, there is nothing to reference.
3. **Text-based scheduling is error-prone.** "Can you work Saturday?" in a group chat gets buried under other messages. Confirmations get lost.
4. **Freelance staff arrive without context.** A per-event hire shows up not knowing the client's allergies, the kitchen layout, or the service timeline. The chef briefs them on arrival, burning prep time.

#### Workarounds

- Experienced chefs create personal templates (Google Sheets prep lists, reusable run sheets) that they clone for each event.
- Some use shared Google Calendar entries with notes for staff to reference.
- Larger catering companies build internal "event bibles" (printed packets with menu, timeline, floor plan, dietary notes) handed to staff on arrival.

#### Missing Pieces

- No system connects event details (client preferences, allergies, menu, timeline) to staff-facing task lists. This connection is always manual.
- No lightweight way for a private chef to say "I need 1 helper for Saturday, here's what they need to know" and have that context travel with the assignment.
- Hourly tracking for per-event helpers is too informal to be useful for tax or payroll purposes.

---

### 1.2 Contractors (Freelance Sous Chefs, Event Staff)

#### How They Get Hired Per-Event

**Three main channels:**

1. **Personal network (most common for private chefs).** The chef texts someone they've worked with before: "I have a dinner for 12 on Saturday, 3pm-10pm, $300. You in?" The entire hiring process is one text thread.

2. **Staffing agencies and platforms.** Qwick, Upshift, GigSmart, Party Host Helpers, and Poached Shifts connect food service businesses with pre-vetted per-event workers. The business posts a shift (date, time, role, pay rate), and available workers claim it or get matched. These platforms handle payment processing and, in some cases, worker classification.

3. **Job boards for recurring gigs.** ZipRecruiter, Indeed, and Upwork list freelance chef positions. These tend to be for longer engagements (weekly meal prep clients, seasonal placements) rather than single events. Pay ranges from $25-$60/hour depending on market and skill level, with full-day rates of $500-$800 for experienced freelance chefs.

#### Paperwork and Classification

**The 1099 vs. W-2 question is the single biggest compliance risk in food service staffing.**

- The IRS uses three tests: behavioral control (do you direct how the work is done?), financial control (who provides equipment, who bears profit/loss risk?), and relationship type (is it ongoing, are benefits provided?).
- Most per-event food service helpers are classified as 1099 independent contractors. The chef does not direct how they chop onions (behavioral), the helper may bring their own knives (financial), and the relationship is project-based (type).
- However, some states (California's ABC Test, New York, Massachusetts) apply stricter standards. In these states, a freelance sous chef who works regularly for one chef and uses the chef's kitchen and tools may legally be an employee, not a contractor.
- If you pay a contractor $600 or more in a calendar year, you must issue a 1099-NEC. For 2026, this threshold increases to $2,000.
- Misclassification penalties can reach 41.5% of the worker's earnings in back taxes and penalties.

**What actually happens in practice:**

- Most private chefs pay helpers in cash or Venmo with no paperwork. This is technically non-compliant but extremely common in operations earning under $200K.
- Larger catering companies use staffing agencies specifically to offload classification liability. The agency is the employer of record; the catering company pays the agency.
- Some platforms (Upshift) classify workers as W-2 employees and handle workers' comp and unemployment insurance. Others (Poached Shifts) treat them as 1099 contractors.

#### How They Get Paid

- **Cash or Venmo:** Same day, no paperwork. The default for personal-network hires.
- **Staffing platform:** Platform processes payment, typically within 1-3 business days. Some offer same-day pay (Qwick).
- **Direct deposit / check:** Used by more established catering companies with regular freelancers. Usually paid within 1-2 weeks.
- **Per-event flat rate** is far more common than hourly for private chef assistants. "I'll pay you $250 for the night" is standard.

#### Real Breakpoints

1. **No paper trail on cash payments.** Creates tax liability for both chef and contractor.
2. **Classification confusion.** Most private chefs have no idea whether their regular helper should be 1099 or W-2.
3. **No onboarding.** Freelance staff arrive cold. There is no system to share event context (menu, allergies, timeline, client preferences) before the day of.
4. **Insurance gaps.** If a freelance helper burns themselves in a client's kitchen, who pays? The chef's general liability may not cover contractors. Workers' comp only applies to W-2 employees.

#### Workarounds

- Chefs build a "trusted roster" of 3-5 people they rotate through, avoiding the need for formal hiring.
- Some chefs send a "pre-event packet" via email or text (menu, timeline, address, parking instructions) the day before.
- Larger operations use staffing agencies to handle all paperwork, classification, and insurance, accepting the markup (typically 25-40% above the worker's pay rate).

#### Missing Pieces

- No system tracks which freelancers a chef has used, what events they worked, how they performed, or how much they were paid year-to-date (critical for 1099 threshold tracking).
- No way to share event context digitally with per-event staff before they arrive.
- No lightweight contractor agreement or liability waiver workflow.

---

### 1.3 Admin (Who Handles the Business When the Chef Can't)

#### Who Actually Does This

**For solo private chefs (majority of the market):**
The chef does everything. They are simultaneously the cook, the admin, the bookkeeper, the scheduler, and the salesperson. Admin tasks happen at night, on days off, or between prep sessions. This is the core pain point that drives burnout.

**For growing operations ($150K+ revenue):**
Three patterns emerge:

1. **Spouse or family member.** Handles client emails, invoicing, bookkeeping, and scheduling while the chef cooks. This is the most common "admin" in private chef operations. No formal title, no formal hours, no formal compensation structure.

2. **Virtual assistant (VA).** Remote support for $15-$30/hour. Handles email responses, social media, calendar management, invoice follow-up. Services like Stealth Agents and Persona Talent specifically market VAs to private chefs. The VA has no food service knowledge; they handle purely administrative tasks.

3. **Part-time office manager.** Rare, seen only in operations with 10+ events/month. Handles client communication, vendor relationships, bookkeeping, and scheduling. Usually paid $20-$35/hour for 10-20 hours/week.

#### What They Actually Do

| Task                         | Frequency         | Tool Used                                        |
| ---------------------------- | ----------------- | ------------------------------------------------ |
| Respond to client inquiries  | Daily             | Email, text, Instagram DMs                       |
| Send quotes and invoices     | Per event         | QuickBooks, Wave, Square Invoices, PDF templates |
| Chase unpaid invoices        | Weekly            | Email, phone calls                               |
| Schedule events on calendar  | Per booking       | Google Calendar, iCal                            |
| Coordinate with vendors      | Per event         | Phone calls, text                                |
| Track expenses and receipts  | Weekly or monthly | QuickBooks, spreadsheets, shoe boxes             |
| Manage social media          | 2-3x/week         | Instagram, Facebook, phone camera                |
| Handle cancellations/changes | As needed         | Email, text                                      |
| File quarterly taxes         | Quarterly         | TurboTax, accountant                             |
| Renew permits and insurance  | Annually          | Paper mail, phone calls                          |

#### Real Breakpoints

1. **Context loss when the chef delegates.** The chef knows the client wants "that salmon thing from last time." The VA or family member does not. Client communication requires culinary context that admin staff lack.
2. **No single source of truth.** Client info is in texts, event details are in Google Calendar, financial records are in QuickBooks, recipes are in the chef's head. The admin has to piece everything together across 4-6 tools.
3. **Invoicing is reactive.** Many private chefs invoice after the event (sometimes weeks after). Chasing payments is the most hated admin task.
4. **Receipt tracking falls apart.** Grocery receipts get lost, cash purchases go unrecorded, and expense categorization happens in a panic before quarterly tax deadlines.

#### Workarounds

- Some chefs create a shared Google Drive with folders per client containing all communication, menus, and invoices.
- Others use CRM tools (HoneyBook, Dubsado) designed for event professionals, bending them to fit food service.
- A few use Private Chef Manager or Traqly, but these tools have limited admin delegation features.

#### Missing Pieces

- No system lets an admin see the full context of a client relationship (past events, dietary needs, payment history, communication log) in one place.
- No "delegate this task" workflow where the chef can hand off a specific action (follow up with Mrs. Johnson about the deposit) to an admin with all the context attached.
- No role-based access that lets an admin handle billing and scheduling without seeing recipes or cost data the chef considers proprietary.

---

### 1.4 Manager (Kitchen/Ops Manager in Larger Operations)

#### When This Role Appears

The "manager" role does not exist in most private chef operations. It appears when:

- A catering company runs 5+ events per week with multiple teams deployed simultaneously.
- A private chef has grown to the point where they have 3+ regular staff and 15+ events per month.
- Estate/household operations where the chef manages a kitchen team as part of a larger domestic staff structure.

#### What the Kitchen/Ops Manager Actually Does

**Morning (7am-10am):**

- Review the day's events and staff assignments. Confirm all staff are showing up.
- Check deliveries: inspect produce quality, verify quantities against purchase orders, reject damaged goods, update inventory records.
- Conduct pre-shift briefing: communicate the day's menu, timing, special requests, dietary restrictions.
- Review and adjust the prep schedule based on what was and was not completed the previous day.

**Midday (10am-2pm):**

- Monitor prep progress. Reallocate staff if one station is behind.
- Handle vendor calls: negotiate pricing, resolve delivery issues, place restock orders.
- Review labor costs against the event budget. Adjust staffing for upcoming events if over budget.
- Handle client-facing communication that the chef is too busy to manage during prep.

**Service (varies by event):**

- Coordinate kitchen and front-of-house timing. Ensure courses go out at the right intervals.
- Monitor ticket times and plate presentation.
- Handle any service problems (missing ingredients, equipment failure, staffing no-shows) in real time.
- Act as the liaison between the chef and the client during the event.

**End of Day:**

- Complete closing checklists: kitchen cleanliness, equipment status, food storage compliance.
- Document what went well and what did not for each event.
- Update scheduling for the next 48-72 hours based on what they learned today.
- Reconcile the day's expenses (receipts from last-minute purchases, delivery invoices).

**Weekly:**

- Compile labor hours and submit for payroll.
- Review food cost percentages against targets.
- Schedule the upcoming week's staff based on event bookings, staff availability, and budget.
- Handle any HR issues: performance conversations, conflict resolution, onboarding new hires.

#### Real Breakpoints

1. **Information fragmentation.** The manager needs to see events, staff schedules, vendor deliveries, budgets, and client preferences simultaneously. These live in 5+ different tools.
2. **The manager is the single point of failure.** If the ops manager is sick, nobody knows the full picture. All the coordination lives in their head and their phone.
3. **No real-time visibility into labor cost vs. event revenue.** The manager has to manually calculate whether staffing an extra helper for a Saturday event is profitable.
4. **Communication overhead.** The manager spends 2-3 hours daily on phone calls and texts that could be automated (confirming shifts, sending event details, chasing vendor deliveries).

#### Workarounds

- Experienced managers create personal dashboards in Google Sheets: one tab for the week's events, one for staff schedules, one for vendor orders, one for budget tracking.
- Some use project management tools (Trello, Asana, Monday.com) to track event prep timelines, but these have no food-service awareness.
- The best managers keep a physical clipboard with the day's event bibles (printed packets with all details) and mark them up as the day progresses.

#### Missing Pieces

- No unified view that shows "here are today's events, here's who's working each one, here's what needs to be prepped, here's the budget, here's the delivery schedule."
- No way for the manager to see labor cost as a percentage of event revenue in real time.
- No delegation/escalation workflow: the manager cannot digitally assign a task to a specific staff member and track its completion.

---

## GROUP 2: BACK OFFICE / SCHEDULING / PROCUREMENT / SUPPLIERS

---

### 2.1 Back Office (Bookkeeping, Tax Prep, Insurance, Permits)

#### Bookkeeping

**How it actually works for small food businesses:**

- **Solo operators ($0-$100K):** Shoe box of receipts, bank statement review at tax time, maybe a spreadsheet. QuickBooks Self-Employed or Wave (free tier) if they are organized. Many just hand everything to an accountant once a year and hope for the best.
- **Growing operations ($100K-$500K):** QuickBooks Online is the dominant tool. Some use Wave (free), FreshBooks, or Xero. Bookkeeping happens weekly or monthly, not daily. The biggest pain point is categorizing grocery purchases (is this salmon for the Johnson dinner or the weekly meal prep client?).
- **Established catering ($500K+):** Dedicated bookkeeper or outsourced bookkeeping service (Bench, Remote Books). QuickBooks or Xero with proper chart of accounts. Weekly reconciliation.

**Key financial tasks:**

- Categorize income by client/event (for profitability analysis)
- Categorize expenses (food costs, supplies, labor, travel, equipment)
- Track mileage (driving to clients, grocery runs, vendor pickups). Average private chef drives 15,000-25,000 business miles per year.
- Reconcile bank and credit card statements
- Generate profit/loss by month and by quarter
- Prepare quarterly estimated tax payments (Schedule SE + income tax)

**Tools used:**

- QuickBooks Online: $30-$90/month. The industry standard.
- Wave: Free accounting, paid payroll. Popular with solo operators.
- FreshBooks: $17-$55/month. Stronger invoicing, weaker bookkeeping.
- Square Invoices: Free with Square payment processing. Basic but sufficient for simple operations.
- Expensify or Dext (formerly Receipt Bank): receipt scanning and expense categorization, $5-$15/month.

#### Tax Prep

**What food businesses need to file:**

- Schedule C (sole proprietor) or S-Corp/LLC return
- Schedule SE (self-employment tax: 15.3% on net earnings)
- Quarterly estimated payments (Form 1040-ES)
- 1099-NEC for any contractor paid $600+ (threshold rising to $2,000 for 2026 payments)
- Sales tax returns (if applicable in their state)
- Annual business license renewal
- State-specific food service tax obligations

**Common mistakes:**

- Not tracking cash payments to helpers (creates 1099 liability)
- Not separating personal and business grocery purchases
- Not tracking mileage (the standard mileage deduction at $0.70/mile for 2025 is one of the biggest deductions available)
- Not making quarterly estimated payments (results in penalties and a large tax bill in April)

**Who does the taxes:**

- Solo chefs: TurboTax Self-Employed ($120-$200) or a local accountant ($300-$800 for Schedule C)
- Growing operations: CPA or accounting firm ($1,000-$3,000/year)
- Established catering: Dedicated accountant or bookkeeping service with tax prep included

#### Insurance

**Required coverage for food service businesses:**

| Type                          | What It Covers                                                                             | Typical Cost (monthly)      | Required?                                                |
| ----------------------------- | ------------------------------------------------------------------------------------------ | --------------------------- | -------------------------------------------------------- |
| General liability             | Third-party bodily injury, property damage (e.g., a guest gets food poisoning)             | $76-$111                    | Yes (most venues and clients require it)                 |
| Workers' compensation         | Employee injuries on the job (burns, cuts, falls)                                          | $64-$106                    | Yes, if you have W-2 employees (required in most states) |
| Professional liability (E&O)  | Claims that your service caused harm (e.g., allergic reaction from undisclosed ingredient) | $68-$92                     | Recommended                                              |
| Commercial auto               | Vehicles used for business (delivery, catering vans)                                       | Varies                      | Yes, if business vehicles are used                       |
| Business owner's policy (BOP) | Bundles general liability + commercial property at a discount                              | $84-$115                    | Recommended                                              |
| Product liability             | Food product defects (contamination, foreign objects)                                      | Bundled with GL or separate | Sometimes required by venues                             |

**The insurance gap for private chefs:**

- Many private chefs carry only general liability ($1M-$2M coverage) because clients and venues require a certificate of insurance (COI).
- Workers' comp is often skipped when the chef only uses 1099 contractors (not legally required for contractors, but creates risk).
- If a freelance helper injures themselves in a client's kitchen, the chef's general liability may not cover it. The client's homeowner's policy may not cover it either. This is a real gap.

#### Permits and Licenses

**Standard requirements (varies heavily by state):**

| Permit/License               | What                                              | Cost                     | Renewal            |
| ---------------------------- | ------------------------------------------------- | ------------------------ | ------------------ |
| Business license             | General authorization to operate                  | $50-$500                 | Annual             |
| Food service license         | Permission to prepare and serve food              | $100-$1,000              | Annual             |
| Food handler permit          | Individual certification (ServSafe or equivalent) | $15-$50 per person       | Every 2-3 years    |
| Food manager certification   | Required for the person in charge                 | $75-$200                 | Every 5 years      |
| Health department inspection | On-site verification of food safety compliance    | $0-$300 (inspection fee) | Annual or biennial |
| Liquor license               | Permission to serve alcohol at events             | $500-$5,000+             | Annual             |
| Cottage food permit          | For certain home-based food operations            | $0-$100                  | Annual             |
| Catering permit              | Specific to off-premise food service              | $100-$500                | Annual             |

**The compliance pain point:**

- Every state (and sometimes every county) has different requirements. A private chef who operates across state or county lines may need multiple permits.
- Renewal dates are scattered throughout the year. There is no centralized reminder system; chefs rely on paper mail and memory.
- Health department inspections for caterers are less predictable than for restaurants. Some jurisdictions require advance notice of catered events.

#### Real Breakpoints

1. **Bookkeeping is the last priority.** Chefs cook first, admin later. Receipts pile up, expense categorization falls behind, and quarterly taxes get missed.
2. **No connection between bookkeeping and event data.** The accountant sees "$347.82 at Whole Foods" but not "that was for the Martinez anniversary dinner." Attribution of costs to specific events requires manual effort.
3. **Insurance certificates are requested constantly.** Every new venue or client asks for a COI. Generating and sending these is repetitive and time-consuming.
4. **Permit tracking is entirely manual.** There is no system that reminds a chef their food handler certificate expires in 30 days.

#### Workarounds

- Chefs photograph receipts immediately after purchase and store them in a dedicated photo album on their phone.
- Some write the client/event name on each receipt before photographing it (attributing cost to event at point of purchase).
- A few use receipt-scanning apps (Expensify, QuickBooks mobile) but adoption is low because the apps are not food-service-aware.
- Insurance brokers who specialize in food service (NEXT Insurance, Insureon) offer instant COI generation.

#### Missing Pieces

- No system that automatically attributes a grocery expense to a specific event based on timing, menu, and shopping list.
- No permit/license tracker with renewal reminders.
- No integrated view of "event revenue minus event expenses (food, labor, travel) equals event profit."
- No 1099 threshold tracking that warns: "You've paid this contractor $500 this year, approaching the filing threshold."

---

### 2.2 Scheduling (Shift, Event, and Prep Scheduling)

#### How Event Scheduling Works

**The chain of events:**

1. Client books an event (date, time, guest count, menu preferences).
2. Chef confirms the date on their personal calendar (usually Google Calendar).
3. Chef determines staffing needs based on guest count and complexity.
4. Chef contacts potential helpers via text or phone.
5. Staff confirm availability.
6. Chef creates a prep timeline: what needs to happen and when (2 days before, 1 day before, morning of, on-site).
7. On event day, the chef and staff execute the timeline.

**Where this breaks down:**

- Steps 2-5 are entirely manual and happen in scattered text threads.
- There is no system that says "for an event of this size and complexity, you need X prep hours and Y service staff."
- Double-booking is caught only when the chef manually checks their calendar.

#### How Prep Scheduling Works

**For private chefs:**

- Prep is the most time-consuming part of the business (often 2-3x the time of actual service).
- Most chefs prep in their own home kitchen, a commissary kitchen, or the client's kitchen.
- The "schedule" is a mental model: "I'll prep the sauces Monday, the proteins Tuesday, assemble Wednesday morning, serve Wednesday evening."
- For weekly meal-prep clients, the cycle is: shop Monday, prep Tuesday, deliver Tuesday evening or Wednesday morning.

**For catering operations:**

- Prep is organized around a "prep sheet" or "production schedule": a list of every dish component, quantity needed, who is responsible, and when it must be done.
- Larger operations create prep schedules 48-72 hours in advance and assign specific tasks to specific staff members.
- The prep schedule is usually a printed spreadsheet posted on the kitchen wall or shared via text/email.

**Tools currently used:**

- Google Calendar (the universal default)
- Printed prep sheets (Google Sheets or Excel, printed and taped to the wall)
- Scheduling software (7shifts, Sling, Homebase) for restaurant-style operations, but these are shift-based and do not understand event-based workflows
- Quickstaff Pro: specifically designed for catering event staffing; uses an invitation-based system where on-demand staff confirm availability per event
- Roosted HR: catering-specific scheduling with role-based event assignments

#### How Shift Scheduling Works (Larger Operations)

- Managers create weekly schedules based on event bookings and staff availability.
- Staff submit availability preferences and time-off requests (via text, app, or paper).
- The manager builds the schedule manually, balancing coverage needs against availability and labor budget.
- Published schedules go out 1-2 weeks in advance. Late publishing is a top source of staff frustration.
- Shift swaps: staff negotiate swaps among themselves (usually via group text), then get manager approval.

**Catering-specific scheduling challenges:**

- Staff headcount varies dramatically week to week. A Tuesday might need 2 people; a Saturday wedding needs 15.
- On-call/per-event staff need to be contacted and confirmed for each event separately.
- Event schedules include not just service time but load-in, setup, service, teardown, and travel, which all need to be accounted for.
- Caterers report spending up to 15 hours per week on scheduling and administrative tasks that could be automated.

#### Real Breakpoints

1. **No link between the event and the schedule.** The event has guest count, menu, location, and timeline. The schedule has names and times. These live in separate systems with no connection.
2. **Prep scheduling is invisible.** It happens in the chef's head or on a sticky note. There is no system that derives prep tasks from a menu and generates a timeline.
3. **On-call staff confirmation is tedious.** Texting 5 people "can you work Saturday?" and tracking responses is a manual process that consumes significant time.
4. **No labor cost visibility at the event level.** The chef knows they are paying staff, but cannot easily see "this event costs $600 in labor against $2,000 in revenue."

#### Workarounds

- Chefs create "event template" documents that list standard prep timelines for common event types (dinner for 12, cocktail party for 30).
- Some use Doodle polls or WhatsApp polls to check staff availability for specific dates.
- A few catering companies use Quickstaff Pro's invitation system, where staff self-select into available events.

#### Missing Pieces

- No system that takes an event (date, guest count, menu) and generates a prep schedule with tasks, durations, and assignments.
- No staff availability view overlaid on the event calendar ("I have a dinner Saturday but none of my helpers are available").
- No "offer this shift" workflow that lets the chef broadcast an event to their staff roster and collect responses.
- No travel-time calculation between events on the same day.

---

### 2.3 Procurement (Ingredient Sourcing, Ordering, Tracking)

#### How Ingredients Get Sourced

**Private chefs use a layered sourcing strategy:**

| Source                                                  | What They Buy                                    | Frequency          | Ordering Method                      |
| ------------------------------------------------------- | ------------------------------------------------ | ------------------ | ------------------------------------ |
| Grocery stores (Whole Foods, local markets)             | Produce, dairy, specialty items                  | Per event          | In person, walk the aisles           |
| Wholesale cash-and-carry (Restaurant Depot, CHEF'STORE) | Proteins, bulk staples, supplies                 | Weekly or biweekly | In person (membership card required) |
| Farmers markets                                         | Seasonal produce, artisan products               | Weekly (seasonal)  | In person, cash or card              |
| Online specialty (Amazon, specialty importers)          | Hard-to-find ingredients, spices, specialty oils | As needed          | Online order, 2-5 day delivery       |
| Direct farm relationships                               | Specialty produce, eggs, honey                   | Weekly (seasonal)  | Phone, text, or email order          |
| Local butchers/fishmongers                              | Premium proteins, custom cuts                    | Per event          | Phone order, pickup or delivery      |

**Catering companies add:**

| Source                                    | What They Buy                      | Frequency                 | Ordering Method                                                         |
| ----------------------------------------- | ---------------------------------- | ------------------------- | ----------------------------------------------------------------------- |
| Broadline distributors (Sysco, US Foods)  | Full-range food and supplies       | Weekly scheduled delivery | Online portal or phone, cutoff times (e.g., 10pm for next-day delivery) |
| Specialty distributors (Chef's Warehouse) | Gourmet items, imported goods      | As needed                 | Online portal or sales rep                                              |
| Beverage distributors                     | Wine, beer, spirits, non-alcoholic | Per event or weekly       | Sales rep, phone, minimum orders                                        |
| Paper/supply distributors                 | Disposables, equipment, cleaning   | Monthly                   | Online or phone                                                         |

#### The Ordering Workflow

**For a private chef preparing a dinner for 8:**

1. Finalize menu with client (2-7 days before event).
2. Write a shopping list by hand or in a notes app, derived from recipes and the guest count.
3. Check what is already in stock (personal pantry, commissary inventory).
4. Group the list by store (proteins from the butcher, produce from the farmers market, staples from Whole Foods).
5. Shop in person, making substitutions on the fly based on availability and quality.
6. Return home, sort into prep categories, begin work.

**For a catering company serving 150 at a wedding:**

1. Menu finalized 2-4 weeks before.
2. Recipes scaled to guest count; a purchase order (PO) or order guide is generated.
3. Vendor orders placed via online portals or phone calls, typically 3-5 days before the event.
4. Deliveries received at the commissary kitchen. Someone (usually the kitchen manager) inspects quality, checks quantities against the PO, rejects damaged goods, and updates inventory.
5. Invoice reconciliation: the received delivery is matched against the original PO and the vendor invoice. Discrepancies (short shipments, substitutions, price changes) are flagged and resolved.
6. Payment: net 15 or net 30 terms are standard for broadline distributors. Cash-and-carry and retail purchases are paid at point of sale.

#### Cost Tracking

- **Per-event food cost tracking** is the holy grail but rarely achieved. It requires attributing every ingredient purchase to a specific event, accounting for partial-use items (you bought a $40 bottle of olive oil but only used $5 worth for this dinner), and tracking waste.
- Most private chefs estimate food cost as a percentage of revenue (target: 25-35% for private dinners, 30-40% for catering). They know the rough number but cannot tell you the exact food cost of a specific event.
- Larger operations calculate theoretical food cost (what it should have cost based on recipes) vs. actual food cost (what was spent). The gap reveals waste, theft, or pricing problems.

#### Real Breakpoints

1. **Shopping lists are manual.** The chef mentally translates a menu into ingredients, then into quantities, then into a shopping list. This is error-prone, especially for large events.
2. **No price memory.** The chef has no record of what salmon cost last month vs. this month. They cannot spot price trends or identify when a vendor's pricing has drifted.
3. **Partial-use attribution is impossible without a system.** If the chef buys a case of lemons, uses half for one event and half for another, the full cost gets attributed to whichever event was shopped for first.
4. **Vendor management is informal.** The chef may have relationships with 5-10 vendors but no central record of pricing, lead times, minimum orders, or contact information.
5. **No receiving workflow for small operations.** The chef grabs groceries, throws them in the fridge, and starts prepping. There is no inspection, no quantity check, no invoice reconciliation. Errors (missing items, bad quality) are caught during prep, when it is too late to get replacements.

#### Workarounds

- Some chefs maintain a "price book" (spreadsheet of what they paid for common items at different vendors) to compare prices and track inflation.
- A few use inventory management features in apps like MarketMan or BlueCart, but these are designed for restaurants and feel heavy for a 1-person operation.
- Some photograph every receipt and annotate it with the event name for later cost attribution.
- Experienced chefs over-order staples by 10-15% as a buffer against quality issues and substitutions.

#### Missing Pieces

- No system that takes a menu and guest count and generates a shopping list with quantities, grouped by vendor/store.
- No price history for ingredients that shows trends over time ("salmon is up 20% this quarter").
- No way to attribute a purchase (or partial purchase) to a specific event for per-event profitability.
- No vendor directory with pricing, lead times, minimum orders, delivery schedules, and contact info.
- No "order again" workflow that lets the chef reorder a previous event's ingredient list when a client rebooks.

---

### 2.4 Suppliers (How Vendors/Distributors Work with Small Food Businesses)

#### Types of Suppliers

**Broadline distributors (Sysco, US Foods, Performance Food Group):**

- Full-range suppliers: proteins, produce, dairy, frozen, dry goods, beverages, paper, cleaning, equipment.
- Delivery to your door on a set schedule (2-3 times per week).
- Minimum order requirements (typically $300-$500 per delivery).
- Net 15 or net 30 payment terms.
- Assigned sales rep who manages the account, suggests products, and handles issues.
- Online ordering portals with order history, favorites, and search.
- Best pricing at volume; not competitive for small orders.

**Specialty distributors (Chef's Warehouse, specialty importers):**

- Focus on premium and hard-to-find items: artisan cheeses, charcuterie, truffles, specialty oils, imported goods.
- Higher price points, lower minimums.
- Often serve high-end restaurants and private chefs who need specific products.
- Sales reps with product expertise who can recommend alternatives.

**Cash-and-carry wholesale (Restaurant Depot, CHEF'STORE, Costco Business Center):**

- Walk-in warehouse model: no delivery, no minimums.
- Membership required (Restaurant Depot requires a business license; CHEF'STORE is open to anyone).
- Lower prices than retail, higher than broadline delivery.
- Ideal for small operations that cannot meet minimum order requirements from broadline distributors.
- No sales rep, no credit terms; pay at the register.

**Local/specialty (farmers, butchers, fishmongers, bakeries):**

- Direct relationships, often built over years.
- Pricing is negotiated informally, sometimes varies by order.
- Ordering via phone call, text, or in person at the market.
- Payment is immediate (cash, card, Venmo) or net 7.
- Quality is the primary reason for using these sources; chefs pay a premium for specific products.

#### How the Vendor Relationship Works

**For a small operation (private chef, small caterer):**

- The chef has 3-8 vendors they use regularly.
- There is no formal vendor agreement or contract. The relationship is based on trust and repeat business.
- Pricing is checked periodically but not negotiated aggressively (small volume = low leverage).
- Communication is via phone, text, or email. There is no EDI (electronic data interchange) or formal purchasing system.
- The chef visits the vendor (farmers market, Restaurant Depot) or the vendor delivers on a schedule.

**For a larger catering operation:**

- Formal vendor agreements with negotiated pricing (often reviewed quarterly or annually).
- Purchase orders (POs) for each delivery.
- Three-way matching: PO, delivery receipt, and invoice must all agree before payment is released.
- Vendor performance tracking: on-time delivery rate, fill rate (percentage of ordered items actually delivered), quality rejection rate.
- Multiple vendors for the same product category to maintain competitive pricing and backup supply.

#### The Information Flow

```
Menu -> Shopping list -> Order -> Delivery -> Inspection -> Prep -> Service
                                      |
                                  Invoice -> Reconciliation -> Payment
```

At each step, information is created that should flow to the next step but often does not:

- The menu should inform the shopping list (but it is manually transcribed).
- The shopping list should become the order (but it is rewritten for each vendor).
- The order should be checked against the delivery (but small operations skip this).
- The invoice should be reconciled against the order (but this often happens weeks later, if at all).

#### Real Breakpoints

1. **Minimum order requirements lock out small operators.** A private chef who needs $150 of product from Sysco cannot meet the $400 minimum. They pay retail prices instead.
2. **No price comparison across vendors.** The chef knows chicken breast costs X at Restaurant Depot and Y at Whole Foods, but they have no system that compares prices across all their vendors for a given ingredient.
3. **Delivery windows conflict with event prep.** Broadline deliveries arrive in a 4-hour window. If the chef is at a client's house during that window, they miss the delivery.
4. **Invoice disputes are common.** Short shipments, substitutions without notice, and price changes between order and invoice are regular occurrences. Without comparing the PO to the invoice, these go unnoticed.
5. **Seasonal availability is unpredictable.** A chef who plans a menu around local asparagus in April may find the farmer's crop was hit by a late frost. There is no system that tracks supplier availability forecasts.

#### Workarounds

- Chefs consolidate weekly orders to meet minimums (ordering for multiple events at once).
- Some form informal buying groups with other chefs to pool orders and meet minimums.
- Chefs maintain relationships with backup vendors for critical items (if the butcher is out of lamb, the chef knows a second source).
- A few use apps like BlueCart or Choco to centralize vendor communication and ordering, but adoption is low in private chef operations.

#### Missing Pieces

- No vendor directory that stores contact info, pricing, minimums, delivery schedules, and order history for each of the chef's suppliers.
- No price comparison tool that shows the same ingredient across multiple vendors.
- No order history that lets the chef see what they bought from each vendor over the past year (for volume negotiation leverage).
- No automated reorder workflow based on upcoming event menus and current inventory.
- No delivery tracking or receiving workflow for small operations.

---

## CROSS-CUTTING ANALYSIS

### The Core Problem Across All Groups

The fundamental issue across every role and function is **information fragmentation**. Every piece of information (event details, client preferences, staff availability, ingredient prices, financial records) exists in a different tool, a different format, and a different person's head. The cost of this fragmentation manifests differently by role:

| Role           | How Fragmentation Hurts                                                     |
| -------------- | --------------------------------------------------------------------------- |
| Employee/staff | Shows up to events without context; wastes first 30 minutes getting briefed |
| Contractor     | No paper trail on payments; classification risk; no performance history     |
| Admin          | Spends hours stitching information together from 4-6 tools                  |
| Manager        | Cannot see the full picture (events + staff + budget + vendors) in one view |
| Back office    | Bookkeeping is disconnected from event data; cost attribution is manual     |
| Scheduling     | Event details and staff schedules live in separate systems                  |
| Procurement    | Shopping lists are manually derived from menus; no price memory             |
| Suppliers      | No centralized vendor management; ordering is fragmented across channels    |

### What ChefFlow Already Has (from app-complete-audit.md)

ChefFlow already covers significant ground:

- **Events** with full lifecycle management (8-state FSM)
- **Clients** with dietary restrictions, preferences, and communication history
- **Menus and recipes** with ingredient lists and costing
- **Financial hub** with ledger-first accounting, expenses, invoices, payments, payroll section
- **Staff section** with tasks, stations (kitchen clipboard), and a staff portal
- **Vendors** section under culinary
- **Inventory** management
- **Calendar** integration
- **Ingredient pricing** via the data engine
- **Prep** section under culinary

### Where the Gaps Are (Informed by This Research)

| Gap                                                                                            | Impact                                                        | Difficulty                              |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------- |
| **Event-to-staff assignment workflow** (assign specific staff to specific events with context) | High: every private chef who hires help needs this            | Medium                                  |
| **Contractor payment tracking with 1099 threshold warnings**                                   | High: tax compliance risk                                     | Low                                     |
| **Prep schedule generation from menu + guest count**                                           | High: saves 30-60 min of manual planning per event            | Medium                                  |
| **Staff availability + event calendar overlay**                                                | Medium: prevents scheduling conflicts                         | Low                                     |
| **Per-event profitability** (revenue - food cost - labor - travel)                             | High: the metric every chef wants but nobody tracks           | Medium (data exists; needs aggregation) |
| **Vendor directory with pricing, minimums, and order history**                                 | Medium: the existing Vendors section may partially cover this | Low-Medium                              |
| **Shopping list generation from event menu**                                                   | High: saves significant time, reduces errors                  | Medium                                  |
| **Receipt-to-event attribution**                                                               | Medium: critical for accurate food cost tracking              | Medium                                  |
| **Permit and license renewal tracking**                                                        | Low: useful but not a daily pain point                        | Low                                     |
| **Pre-event context packet for staff** (auto-generated from event data)                        | Medium: reduces briefing time, fewer errors                   | Low                                     |
| **Shift broadcast and confirmation** ("who can work Saturday?")                                | Medium: replaces tedious text-based coordination              | Low-Medium                              |

---

## KEY SOURCES

- [Toast POS scheduling](https://pos.toasttab.com/products/restaurant-employee-scheduling-software)
- [Sling scheduling and pricing](https://getsling.com/pricing/)
- [7shifts pricing](https://www.7shifts.com/pricing/)
- [Cloud Catering Manager: staff scheduling](https://cloudcateringmanager.com/staff-scheduling-with-catering-software/)
- [Quickstaff Pro: catering shift management](https://www.quickstaffpro.com/event-staff-scheduling/best-catering-shift-management-tools)
- [Qwick hospitality staffing](https://www.qwick.com/)
- [Upshift event staffing](https://upshift.work/for-business/event-staffing/)
- [IRS: independent contractor or employee](https://www.irs.gov/businesses/small-businesses-self-employed/independent-contractor-self-employed-or-employee)
- [1099 vs W-2 classification (OnPay)](https://onpay.com/insights/employee-vs-independent-contractor/)
- [W-2 vs 1099 in 2026 (BlueWave HR)](https://bluewavehr.com/blog/w2-vs-1099-worker-classification.html)
- [BLS: Food Service Managers](https://www.bls.gov/ooh/management/food-service-managers.htm)
- [Kitchen manager duties (Rezku)](https://rezku.com/blog/what-does-a-kitchen-manager-do/)
- [Food service manager duties (RestaurantTimes)](https://www.restauranttimes.com/blogs/operations/food-service-manager-duties/)
- [Virtual assistants for private chefs (Stealth Agents)](https://stealthagents.com/virtual-assistants-for-personal-chef-services/)
- [Executive assistants for private chefs (Persona Talent)](https://www.personatalent.com/executive-assistants/for-private-chefs/)
- [Toast: catering licenses and permits](https://pos.toasttab.com/blog/on-the-line/catering-licenses-and-permits)
- [NEXT Insurance: food business insurance](https://www.nextinsurance.com/industry/restaurant-food-and-bar-insurance/)
- [NEXT Insurance: workers' comp for food services](https://www.nextinsurance.com/workers-compensation-insurance/food-services/)
- [MoneyGeek: catering business insurance 2026](https://www.moneygeek.com/insurance/business/food/catering/)
- [Toast: catering business insurance guide](https://pos.toasttab.com/blog/on-the-line/catering-business-insurance)
- [QuickBooks: restaurant bookkeeping](https://quickbooks.intuit.com/r/bookkeeping/restaurant-bookkeeping/)
- [QuickBooks: small business tax prep checklist 2026](https://quickbooks.intuit.com/r/taxes/small-business-tax-prep-checklist/)
- [IRS Publication 334: Tax Guide for Small Business](https://www.irs.gov/publications/p334)
- [Food procurement strategies (Folio3)](https://foodtech.folio3.com/blog/food-procurement-strategies-explained/)
- [Restaurant procurement guide (Supy)](https://supy.io/blog/restaurant-procurement-top-tips-to-run-it-efficiently)
- [Restaurant procurement best practices (Fourth)](https://www.fourth.com/article/restaurant-procurement)
- [F&B procurement guide 2025 (Simfoni)](https://simfoni.com/food-beverage-procurement/)
- [Food suppliers for restaurants (TouchBistro)](https://www.touchbistro.com/blog/food-suppliers-for-restaurants/)
- [Where do restaurants buy food (Carolina Food Service)](https://carolinafoodservice.com/blog/where-do-restaurants-buy-their-food)
- [CHEF'STORE wholesale](https://www.chefstore.com/about/)
- [Effective communication in the kitchen (Escoffier)](https://www.escoffier.edu/blog/culinary-arts/a-look-at-effective-communication-in-the-kitchen/)
- [Kitchen brigade system (Chefs Resources)](https://www.chefs-resources.com/kitchen-management-tools/kitchen-management-alley/modern-kitchen-brigade-system/)
- [Line cook training (Toast)](https://pos.toasttab.com/blog/on-the-line/line-cook-training)
- [Traqly: personal chef software](https://www.gotraqly.com/)
- [Private Chef Manager](https://www.privatechefmanager.com)
- [Restaurant tech fragmentation (SynergySuite)](https://www.synergysuite.com/blog/most-restaurant-tech-stacks-are-set-up-to-fail-heres-how-to-future-proof-yours/)
- [Tech stack consolidation (TotalFood)](https://totalfood.com/tech-stack-holding-you-back-modern-restaurant-needs/)
- [Tripleseat: how to hire event staff](https://tripleseat.com/blog/how-to-hire-event-staff-5-tips-to-find-your-best-catering-and-event-team/)
- [Workstaff: how to hire catering staff](https://workstaff.app/blog/how-to-hire-catering-staff)
