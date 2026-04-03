# ChefFlow: Complete System Behavior Specification

> **Created:** 2026-04-03
> **Purpose:** The definitive, ideal behavior of the entire system. Not what exists. What must be true.
> **Rule:** Every statement in this document is a requirement. If the system does not match, the system is wrong.

---

## 1. SYSTEM IDENTITY

ChefFlow is a business operating system for independent food professionals. It manages the complete lifecycle of a food service business: acquiring clients, planning events, executing service, collecting payment, and growing the business over time.

The system serves five actor types:

| Actor        | Definition                                                                                                                  | Authentication                                         |
| ------------ | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| **Operator** | A food professional who runs their business through ChefFlow (private chef, caterer, meal prep service, food truck, bakery) | Email/password or Google OAuth. Session via JWT.       |
| **Client**   | A person who hires an operator for food services                                                                            | Email/password or token-based access. Session via JWT. |
| **Guest**    | A person attending an event managed by an operator                                                                          | Token-based access only. No account required.          |
| **Staff**    | A person employed by an operator                                                                                            | Email/password. Scoped to one operator.                |
| **Visitor**  | An unauthenticated person browsing public pages                                                                             | No authentication.                                     |

Every piece of data in the system belongs to exactly one operator (tenant). No actor can ever read or write data belonging to a different operator's tenant, except through explicitly shared public surfaces.

---

## 2. OPERATOR LIFECYCLE

### 2.1 Account Creation

**Trigger:** Visitor submits signup form.

**Inputs:** Name, email, password (or Google OAuth).

**Process:**

1. Create auth record
2. Create operator record (this is the tenant)
3. Create user_role record linking auth to operator with role "chef"
4. Generate default settings (timezone from browser, currency USD, home base empty)
5. Redirect to dashboard

**Output:** Authenticated session. Empty dashboard with onboarding prompts.

**Done when:** Operator can navigate every page in the application without errors. All pages show empty states (not errors) when no data exists.

### 2.2 Onboarding (Optional, Never Forced)

**Rule:** The operator can use any feature at any time without completing onboarding. Onboarding is a checklist on the dashboard, never a gate or redirect.

**Onboarding steps (all optional, any order):**

1. Complete profile (business name, location, bio, photo)
2. Add first client
3. Add first recipe
4. Add first staff member
5. Configure loyalty program

**Each step:** Shown on dashboard as a checklist. Completed steps show a checkmark. The checklist disappears when all 5 are done or the operator dismisses it.

**Done when:** Operator has addressed or dismissed all 5 steps.

### 2.3 Session Lifecycle

**Login:** Email/password or Google OAuth produces a JWT session token. Session contains: auth user ID, operator ID (tenant), role, admin flag.

**Every authenticated request:** The system extracts the operator ID from the session and scopes all database queries to that tenant. This is non-negotiable. No query ever runs without tenant scoping.

**Logout:** Destroys session. Redirects to login page.

---

## 3. CLIENT ACQUISITION PIPELINE

This is the complete flow from "a potential client expresses interest" to "a confirmed, paying event."

### 3.1 Inquiry Intake

An inquiry enters the system through one of these channels:

| Channel                         | Entry Point                   | Data Captured                                                                                   |
| ------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------- |
| Public profile form             | `/chef/[slug]/inquire`        | Name, email, phone, date, guest count, occasion, dietary needs, budget, location, message       |
| Embeddable widget               | `/embed/inquiry/[chefId]`     | Same as above (iframe on operator's external website)                                           |
| Manual entry by operator        | `/inquiries/new`              | All fields above plus internal notes, channel source, lead score                                |
| AI-parsed text (Smart Fill)     | `/inquiries/new` (paste text) | Freeform text parsed by AI into structured fields. Operator reviews and confirms before saving. |
| Email/message (logged manually) | `/inquiries/new`              | Operator transcribes inquiry details from external communication                                |

**On creation, the system must:**

1. Create inquiry record with status `new`, timestamp, and channel source
2. If client email matches an existing client: link to that client
3. If client email is new: create a new client record with whatever info is available
4. Calculate initial booking score (deterministic formula based on: budget present, date present, guest count present, dietary info present, response speed)
5. Appear in the operator's inquiry pipeline immediately (via realtime SSE or page refresh)
6. Start the response time SLA clock (time until operator first responds)

**Inquiry statuses (strict progression):**

```
new -> awaiting_chef -> awaiting_client -> quoted -> confirmed -> declined
                                                               -> expired
```

- `new`: Just arrived. Operator has not responded.
- `awaiting_chef`: Client has responded. Ball is in operator's court.
- `awaiting_client`: Operator has responded. Waiting for client.
- `quoted`: A formal quote has been attached and sent.
- `confirmed`: Client has accepted. Event will be created.
- `declined`: Client explicitly declined.
- `expired`: No activity for configurable period (default 30 days). System auto-expires.

**Done when:** Every inquiry that enters the system has a status, a linked client, a channel source, and a timestamp. The operator can see all inquiries sorted by priority (needs response first, then follow-up due, then active pipeline, then closed).

### 3.2 Priority Sorting

Inquiries are automatically sorted into four groups, top to bottom:

1. **Needs Your Response** (red): Status is `new` or `awaiting_chef`. Operator has not replied.
2. **Follow-Up Due** (amber): Status is `awaiting_client` and client has not responded for 3+ days.
3. **Active Pipeline** (green): Status is `awaiting_client` (recently active) or `quoted`.
4. **Closed** (collapsed): Status is `confirmed`, `declined`, or `expired`.

This grouping is deterministic. No AI. No configuration. The rules above are the rules.

### 3.3 Communication Log

Every inquiry has a communication log. Every message (email, SMS, phone call, in-person note) is logged with:

- Timestamp
- Direction (inbound/outbound)
- Channel (email, SMS, phone, in-person, portal)
- Content (text of message or summary of call)
- Author (operator or client name)

The log is append-only. Messages cannot be edited or deleted.

**Done when:** The operator can reconstruct the complete history of any inquiry by reading its communication log.

### 3.4 Quote Creation

**Trigger:** Operator decides to send a formal price quote.

**Inputs:**

- Linked inquiry
- Line items (description, quantity, unit price in cents)
- Deposit amount (cents) and deposit due date
- Quote validity period (days)
- Terms and conditions (text)
- Optional: attached menu

**Quote statuses:**

```
draft -> sent -> accepted -> rejected
                          -> expired
```

- `draft`: Operator is still editing. Not visible to client.
- `sent`: Client has received the quote (via email or portal link).
- `accepted`: Client has explicitly accepted.
- `rejected`: Client has explicitly rejected.
- `expired`: Validity period passed without client action.

**On acceptance:**

1. Quote status changes to `accepted`
2. Inquiry status changes to `confirmed`
3. A new event is created in `draft` status, pre-populated from the inquiry and quote data
4. Client is notified (email) with a link to their event portal

**Done when:** The quote contains all pricing, the client can view it without logging in (via token link), and acceptance triggers event creation automatically.

### 3.5 Proposal and Contract

**Proposal:** A formatted document combining the quote, menu, operator bio, and personalized message. Sent to client via token link. Read-only for client.

**Contract:** A legal agreement generated from the event details. Contains: parties, event date/location, services, pricing, deposit schedule, cancellation terms, liability.

**Contract signing:** Client views contract via token link and clicks "Accept." This records: timestamp, client name, IP address, user agent. The signed contract becomes immutable.

**Done when:** The operator can generate a proposal and contract for any quoted event, the client can view and sign without an account, and signed contracts cannot be modified.

---

## 4. EVENT LIFECYCLE

An event is the central business object. It represents one service engagement between the operator and a client.

### 4.1 Event States (Finite State Machine)

```
draft -> proposed -> accepted -> paid -> confirmed -> in_progress -> completed
                                                                  -> cancelled (from any state)
```

**State definitions:**

| State         | Meaning                                           | Who Can Transition                                 | Conditions for Entry                  |
| ------------- | ------------------------------------------------- | -------------------------------------------------- | ------------------------------------- |
| `draft`       | Operator is planning. Nothing sent to client.     | Operator                                           | None (initial state)                  |
| `proposed`    | Quote/proposal sent to client. Awaiting response. | Operator                                           | Quote must exist and be sent          |
| `accepted`    | Client accepted. Awaiting deposit.                | Client (via acceptance) or Operator (manual)       | Quote accepted                        |
| `paid`        | Deposit received. Event is financially committed. | System (on payment recording) or Operator (manual) | Deposit amount met or exceeded        |
| `confirmed`   | All logistics confirmed. Ready for execution.     | Operator                                           | Paid + operator confirms readiness    |
| `in_progress` | Event is happening right now.                     | Operator                                           | Confirmed + operator starts event     |
| `completed`   | Event finished. Post-event tasks begin.           | Operator                                           | In progress + operator marks complete |
| `cancelled`   | Event cancelled from any prior state.             | Operator (with reason)                             | Cancellation reason provided          |

**Transition rules:**

- Every transition is recorded in an immutable `event_transitions` table: event ID, from state, to state, timestamp, actor ID, reason (for cancellations)
- Transitions can only move forward (left to right in the diagram above), except cancellation which can occur from any state
- No state can be skipped (draft cannot jump to confirmed)
- The system must enforce these rules at the database level, not just the UI

**Done when:** Every event has exactly one current state, every state change is recorded immutably, and no invalid transition can occur regardless of how the request is made.

### 4.2 Event Data Model

Every event contains:

| Field                | Type      | Required | When Set                                               |
| -------------------- | --------- | -------- | ------------------------------------------------------ |
| Occasion             | text      | Yes      | Creation                                               |
| Date                 | date      | Yes      | Creation                                               |
| Time                 | time      | No       | Creation or later                                      |
| Client               | reference | Yes      | Creation (linked to client record)                     |
| Guest count          | integer   | Yes      | Creation                                               |
| Location (address)   | text      | No       | Creation or later                                      |
| Special requests     | text      | No       | Creation or later                                      |
| Menu                 | reference | No       | Attached before or after proposal                      |
| Quote                | reference | No       | Created when pricing                                   |
| Status               | enum      | Yes      | Always (FSM state)                                     |
| Dietary restrictions | text      | No       | From client profile or event-specific                  |
| Service style        | enum      | No       | Plated, family style, buffet, stations, tasting, other |
| Cannabis service     | boolean   | No       | Default false                                          |

### 4.3 Event Financial Summary

For every event, the system must compute (never store as a mutable column):

| Metric                    | Formula                                                  |
| ------------------------- | -------------------------------------------------------- |
| **Quoted amount**         | Sum of quote line items (cents)                          |
| **Deposit required**      | From quote deposit field (cents)                         |
| **Total paid**            | Sum of all payment ledger entries for this event (cents) |
| **Balance due**           | Quoted amount minus total paid (cents)                   |
| **Total expenses**        | Sum of all expense ledger entries for this event (cents) |
| **Profit**                | Total paid minus total expenses (cents)                  |
| **Margin %**              | (Profit / total paid) \* 100                             |
| **Food cost %**           | (Food-category expenses / total paid) \* 100             |
| **Effective hourly rate** | Profit / total logged hours                              |

**Rule:** These are always computed from ledger entries. Never stored in a column. Never cached without explicit invalidation. If the ledger changes, the summary changes.

**Done when:** Every event displays accurate financial metrics derived from the ledger, and no financial figure can become stale.

### 4.4 Day-of Execution

When an event reaches `confirmed` status, the system generates a day-of plan:

**Day-of Plan contents:**

- Timeline (hour-by-hour schedule from arrival to departure)
- Prep checklist (tasks grouped by category: shopping, prep, packing, driving, execution)
- Packing list (equipment, ingredients, serving ware grouped into sections)
- Staff assignments (who does what)
- Dietary/allergen summary for this event's guests
- Emergency contacts

**During `in_progress`:**

- Time tracking is available (start/stop per activity: shopping, prep, packing, driving, execution)
- Temperature logging (food item, temperature reading, timestamp, pass/fail against safety thresholds)
- Substitution logging (planned ingredient, actual ingredient, reason)
- Task completion tracking (checklist items marked done with timestamp and actor)

**Done when:** The operator has everything needed to execute the event on a single screen, can track time and tasks in real time, and all execution data is captured for the post-event review.

### 4.5 Event Close-Out

When the operator marks an event `completed`, a close-out flow begins:

**Close-out steps (sequential):**

1. **Tip recording** - Enter any tip received (amount, method)
2. **Receipt capture** - Upload/photograph receipts for expenses
3. **Mileage logging** - Enter total miles driven
4. **Quick reflection** - Rate calm level (1-5), prep level (1-5), note what went well, note what went wrong, note forgotten items
5. **Final confirmation** - Review profit summary, confirm close-out

**On close-out completion:**

- Event is marked financially closed
- All financial data is finalized
- Post-event tasks are triggered: follow-up email prompt, review request prompt, loyalty points awarded

**Done when:** Every completed event has a recorded reflection, accurate financials, and triggered follow-up actions.

---

## 5. FINANCIAL SYSTEM

### 5.1 Ledger (Core Principle)

All money in the system flows through an immutable, append-only ledger. The ledger is the single source of truth for all financial data.

**Ledger entry fields:**

- ID (unique)
- Tenant ID (operator)
- Event ID (optional, for event-linked transactions)
- Type: `revenue`, `expense`, `payment`, `refund`, `adjustment`, `tip`
- Category (for expenses: food, labor, travel, equipment, marketing, software, miscellaneous)
- Amount (cents, always positive)
- Description (text)
- Date
- Created at (timestamp)
- Created by (actor ID)

**Immutability rule:** Once a ledger entry is created, it cannot be modified or deleted. Ever. To correct a mistake, create a reversing entry (same amount, opposite type). The database must enforce this with a trigger that prevents UPDATE and DELETE on the ledger table.

**Done when:** No financial figure in the system can be changed retroactively. Every balance, total, and metric is a sum of immutable ledger entries.

### 5.2 Payments

**Recording a payment:**

1. Operator enters: amount, payment method (cash, check, card, Venmo, Zelle, other), date, optional note
2. System creates a ledger entry of type `payment` linked to the event
3. If the payment meets or exceeds the deposit requirement and the event is in `accepted` state: auto-transition to `paid`

**Recording a refund:**

1. Operator enters: amount, reason
2. System creates a ledger entry of type `refund` linked to the event
3. Refund amount cannot exceed total payments for that event

### 5.3 Expenses

**Recording an expense:**

1. Operator enters: amount, category, description, date, optional event link, optional receipt image
2. System creates a ledger entry of type `expense`
3. If linked to an event: the event's financial summary updates automatically

**Receipt processing:**

- Operator uploads a photo/image of a receipt
- System extracts line items (via OCR/AI)
- Operator reviews and confirms extracted data before it becomes a ledger entry
- AI extraction is a draft; the operator always approves before committing

### 5.4 Financial Reports

The system must produce these reports on demand:

| Report                  | Content                                                       | Derivation                                       |
| ----------------------- | ------------------------------------------------------------- | ------------------------------------------------ |
| **Profit & Loss**       | Revenue, expenses by category, net profit for selected period | Sum of ledger entries by type and category       |
| **Revenue by Month**    | Monthly revenue totals                                        | Sum of payment + tip entries by month            |
| **Revenue by Client**   | Total revenue per client                                      | Sum of payment entries grouped by event's client |
| **Expense by Category** | Expense totals by category                                    | Sum of expense entries by category               |
| **Tax Summary**         | Revenue, deductible expenses, mileage, estimated tax          | Ledger sums + mileage log + tax rate             |
| **Event Profitability** | Per-event revenue, expenses, profit, margin                   | Ledger entries filtered by event ID              |
| **Cash Flow Forecast**  | Projected income and expenses for next 30 days                | Upcoming confirmed events + recurring expenses   |
| **Year-End Summary**    | Full year financials with export                              | All ledger entries for the calendar year         |

**Done when:** Every report produces correct figures derived exclusively from ledger entries, and an operator can export any report as CSV for their accountant.

---

## 6. CLIENT MANAGEMENT

### 6.1 Client Record

Every client belongs to exactly one operator (tenant). A client record contains:

**Core fields (always present):**

- Name
- Email
- Phone (optional)
- Created date
- Status: `active`, `dormant`, `vip`

**Extended profile (all optional, filled over time):**

- Address(es) with kitchen details (size, equipment, constraints)
- Dietary restrictions and allergies (with severity levels)
- Cuisine preferences (loves, dislikes, adventurousness scale)
- Communication preferences (email, phone, text, preferred time)
- Occupation, company, birthday, anniversary
- Social media handles
- Referral source
- Service defaults (preferred service style, typical guest count, budget range)
- Tags (operator-defined labels)

**Computed fields (never stored, always derived):**

- Total events (count of events linked to this client)
- Total spent (sum of payments on this client's events)
- Average event value (total spent / total events)
- Last event date
- Client health (active if event in last 90 days, dormant if not)

### 6.2 Client Dietary and Allergy System

**Allergy record fields:**

- Allergen name
- Severity: `mild`, `moderate`, `severe`, `life_threatening`
- Notes (free text)
- Date recorded

**Allergen cross-checking (deterministic, no AI):**
When a menu is assigned to an event, the system must:

1. Load all dietary restrictions and allergies for the event's client and all RSVPed guests
2. Cross-reference every ingredient in every dish on the menu against known allergens
3. Flag conflicts by severity (red for severe/life-threatening, amber for moderate, yellow for mild)
4. Display per-guest, per-dish conflict detail
5. This runs automatically. No button press required. No AI required.

**Done when:** The operator can never accidentally serve a dish containing a known allergen to a guest without seeing a visible warning.

### 6.3 Client Portal

Clients access their own portal via authentication (email/password) or via token links sent by the operator.

**What clients can see and do:**

| Function                   | Description                                                                                          |
| -------------------------- | ---------------------------------------------------------------------------------------------------- |
| View events                | List of their upcoming and past events with status                                                   |
| View event detail          | Journey stepper showing current stage, event info, menu, payment summary                             |
| Choose menu                | Select from 4 paths: browse past menus, provide ideas, specify exact dishes, or leave it to the chef |
| Approve menu               | View proposed menu with dietary/allergen badges, approve or request changes with per-course feedback |
| View proposal              | Read formatted proposal from operator                                                                |
| Sign contract              | Review and accept contract (records timestamp, name, IP)                                             |
| Make payment               | Pay via Stripe or other configured method                                                            |
| View countdown             | See countdown to event with pre-event info (parking, dress code, what to expect)                     |
| Submit feedback            | Post-event star ratings, highlights, suggestions, testimonial consent                                |
| Manage dietary preferences | Update their allergies, dietary restrictions, cuisine preferences                                    |
| View loyalty               | See points balance, tier, available rewards, transaction history                                     |
| Redeem rewards             | Spend loyalty points on available rewards                                                            |
| Join dinner circles        | Participate in group dining experiences                                                              |

**Done when:** A client can navigate their entire relationship with the operator (past events, current event status, dietary needs, loyalty) without contacting the operator directly.

---

## 7. MENU AND RECIPE SYSTEM

### 7.1 Recipes

A recipe is intellectual property belonging to the operator. The system stores it; AI never creates it.

**Recipe record:**

- Name
- Category (appetizer, entree, dessert, side, sauce, component, other)
- Ingredients list (each: ingredient reference, quantity, unit, preparation notes)
- Method (step-by-step text instructions)
- Yield (servings)
- Difficulty (1-5)
- Prep time, cook time
- Equipment required
- Tags (operator-defined)
- Photos

**Recipe import methods:**

1. Manual entry (form)
2. Text paste (AI parses freeform text into structured fields; operator reviews and confirms)
3. Batch sprint (queue of text entries, one after another, AI-parsed, operator-confirmed)
4. Brain dump (freeform paragraph about multiple recipes; AI separates and structures; operator reviews each)

**Rule:** AI parses and structures. AI never generates, invents, suggests, or fabricates recipe content. The only AI action on recipes is `search` (find recipes the operator already entered).

**Recipe scaling:** Given a recipe with yield X and a target of Y servings, every ingredient quantity is multiplied by (Y / X). This is arithmetic. No AI.

**Done when:** Every recipe the operator enters is structured, scalable, costable, and searchable. No recipe content originates from AI.

### 7.2 Ingredients and Pricing

**Ingredient record:**

- Name
- Category (produce, protein, dairy, pantry, grains, beverages, snacks, frozen, oils/spices, prepared, baking, other)
- Default unit (each, lb, oz, kg, g, cup, tbsp, tsp, ml, L, bunch, head, can, bag)
- Current price (cents per unit)
- Price source (manual, OpenClaw, vendor invoice)
- Price date (when the price was last updated)
- Staple flag (items the operator always has on hand)

**Price resolution (deterministic priority chain):**

1. Operator's manual price (if set and less than 30 days old)
2. Vendor invoice price (if the operator has logged a recent purchase)
3. OpenClaw matched price (from the market data pipeline)
4. USDA average price
5. Mark as "no price available" (never show $0.00; show "N/A")

**Menu costing:**
For a menu assigned to an event, the system computes:

- Per-ingredient cost = (quantity needed for guest count) \* (best available price per unit)
- Per-dish cost = sum of ingredient costs
- Per-course cost = sum of dish costs
- Total menu cost = sum of course costs
- Food cost % = total menu cost / quoted event price \* 100

**Done when:** Every ingredient has a price (or explicitly shows "no price"), every menu shows its total cost, and food cost % is visible on every quoted event.

### 7.3 Menus

A menu is a collection of dishes organized by course, assigned to an event.

**Menu record:**

- Name
- Description
- Courses (ordered list, each containing ordered dishes)
- Each dish: name, description, recipe reference (optional), dietary tags, allergen flags
- Template flag (reusable across events)
- Showcase flag (visible on operator's public profile)

**Menu assembly:**
The operator builds a menu by:

1. Starting from scratch, a template, or a past menu
2. Adding dishes to courses (from recipe book, from past menus, or free-text quick add)
3. Scaling ingredient quantities to the event's guest count
4. Reviewing cost breakdown, allergen matrix, and dietary coverage
5. Saving as draft, then publishing to client for approval

**Menu approval flow:**

```
draft -> sent_to_client -> approved
                        -> revision_requested (returns to draft with feedback)
```

**Done when:** Every event that has a menu shows the complete cost breakdown, allergen cross-check, and client approval status.

---

## 8. STAFF MANAGEMENT

### 8.1 Staff Records

Each staff member belongs to one operator (tenant).

**Staff record:**

- Name
- Email
- Phone
- Role (sous chef, server, bartender, assistant, driver, other)
- Hourly rate (cents)
- Status: `active`, `inactive`
- Hire date
- Portal access: yes/no (if yes, they have login credentials)

### 8.2 Staff Assignment

For each event, the operator assigns staff members:

- Staff member reference
- Role for this event
- Scheduled start time
- Scheduled end time
- Actual hours worked (logged after event)

**Labor cost for an event** = sum of (actual hours \* hourly rate) for each assigned staff member.

### 8.3 Staff Portal

Staff members with portal access can:

- View their upcoming assignments (event name, date, time, role, location)
- View their past assignments
- See their assigned tasks for today
- View station clipboard (if assigned to a station)
- View recipes relevant to their station (read-only)
- Clock in/out (creates time record: start, end, event, staff member)

**Done when:** Every staff member knows their assignments, can track their time, and the operator sees accurate labor costs per event.

### 8.4 Station Clipboard System

A station is a physical prep/cooking area. Each station has:

- Name (e.g., "Hot Line", "Pastry", "Prep", "Garde Manger")
- Assigned menu components
- Assigned staff members

**Clipboard (the core operational interface):**

A grid with one row per item (ingredient or component) and these columns:

- Item name
- Par level (target quantity)
- On hand (current quantity, editable)
- Need to make (par minus on hand, computed)
- Made (quantity completed, editable)
- Need to order (if on hand < par and not being made, computed)
- Waste (quantity wasted, editable)
- Shelf life (expiry info)
- Notes (free text)

**Every edit records:** who changed it, when, and what the previous value was (audit trail).

**86 tracking:** Any item can be marked "86" (unavailable). This flag is immediately visible across all station views.

**Done when:** Every station has a live, editable clipboard; every change is attributed to a person; and 86'd items are visible system-wide.

---

## 9. CALENDAR SYSTEM

### 9.1 Calendar Events

The calendar aggregates all time-bound records:

- Events (from the event system, colored by status)
- Prep blocks (operator-created time blocks for prep work)
- Calls and meetings (from the call system)
- Personal entries (operator-created, not business)
- Staff schedules (from staff assignments)

### 9.2 Calendar Views

| View       | What It Shows                                                                      |
| ---------- | ---------------------------------------------------------------------------------- |
| **Month**  | Grid of days. Each day shows event/block chips. Click day to see detail.           |
| **Week**   | 7-column grid with time slots. Events and blocks as positioned cards.              |
| **Day**    | Single-day timeline from 6 AM to midnight. 30-minute slots.                        |
| **Year**   | 52-week grid. Weeks colored by density/status. Click week to drill into week view. |
| **Agenda** | Chronological list of upcoming items across all types.                             |

### 9.3 Conflict Detection

When the operator creates an event or block that overlaps with an existing event:

- Show a visible warning (amber)
- Allow the operator to proceed (warning, not blocking)
- Never silently overlap

### 9.4 Calendar Sharing

The operator can generate a read-only calendar feed (iCal format) via a token-based URL. This URL can be added to Google Calendar, Apple Calendar, or any iCal-compatible client. The feed updates as the operator's calendar changes.

**Done when:** The operator can see their complete schedule across all views, conflicts are visible, and the calendar syncs to external tools via iCal.

---

## 10. COMMUNICATION SYSTEM

### 10.1 Inbox

The inbox aggregates all inbound communication:

- Client messages (from portal, email, or manually logged)
- Inquiry submissions (from public forms)
- Guest RSVPs and dietary submissions
- Staff messages
- System notifications

**Triage workflow:**

1. Every item arrives in "Unassigned"
2. Operator reviews and either: responds, snoozes (with duration), or marks done
3. Items requiring action move to "Action Required"
4. Snoozed items return to "Action Required" when the snooze expires

**Done when:** No communication is lost. Every inbound message has a disposition (responded, snoozed, or done).

### 10.2 Outbound Communication

The operator can send:

- Email (via connected Gmail or Resend)
- Response drafts (AI generates a draft from context; operator edits and approves before sending)

**Rule:** AI drafts communication. AI never sends communication. The operator must explicitly approve every outbound message.

### 10.3 Notification System

The system generates notifications for:

| Trigger                     | Notification                                |
| --------------------------- | ------------------------------------------- |
| New inquiry received        | "New inquiry from [name] for [date]"        |
| Client responded to message | "Reply from [name] on [event]"              |
| Quote accepted              | "[Name] accepted your quote for [event]"    |
| Payment received            | "Payment of $[amount] received for [event]" |
| Event tomorrow              | "Tomorrow: [event] at [time] for [client]"  |
| Follow-up overdue           | "[Client] hasn't responded in [N] days"     |
| Guest RSVP received         | "[Guest] RSVPed for [event]"                |
| Staff assignment            | "[Staff] assigned to [event]"               |
| Inventory low               | "[Item] below par level at [station]"       |

Each notification has: read/unread status, timestamp, link to relevant page, category.

**Done when:** The operator is informed of every important system event without having to check each module individually.

---

## 11. ANALYTICS AND INTELLIGENCE

### 11.1 Core Principle

All analytics are deterministic. Computed from database queries and arithmetic. No AI. No probabilistic outputs. The same data always produces the same numbers.

### 11.2 Required Metrics

**Revenue metrics:**

- Total revenue (all time, this month, this year)
- Revenue by month (chart)
- Revenue by client (ranked)
- Revenue per guest (total revenue / total guests served)
- Revenue per hour (total revenue / total hours logged)
- Month-over-month growth %
- Year-over-year comparison

**Profitability metrics:**

- Profit per event
- Profit margin % per event
- Food cost % per event and overall
- Labor cost % per event and overall
- Effective hourly rate per event

**Pipeline metrics:**

- Inquiry-to-booking conversion rate (confirmed inquiries / total inquiries)
- Average time from inquiry to confirmed event
- Quote acceptance rate
- Average response time to new inquiries
- Ghost rate (inquiries that go silent)

**Client metrics:**

- Total active clients (event in last 90 days)
- Repeat booking rate
- Client lifetime value (total spend per client over time)
- Client acquisition source breakdown
- At-risk clients (previously active, no event in 90+ days)

**Operational metrics:**

- Events completed (this month, this year)
- Average guests per event
- Average prep time per event
- On-time start rate
- Receipt submission rate

### 11.3 Daily Report

Every day at a configured time, the system produces a daily report:

- Yesterday's completed events and revenue
- Today's schedule
- Open inquiries requiring response
- Overdue follow-ups
- Key metrics snapshot

This report is available on the dashboard and optionally emailed to the operator.

**Done when:** The operator can understand their business health by reading one page. Every number is correct, current, and derived from real data.

---

## 12. LOYALTY SYSTEM

### 12.1 Points

Clients earn points through configurable triggers:

| Trigger                          | Default Points   | Configurable |
| -------------------------------- | ---------------- | ------------ |
| Event completed                  | Per guest count  | Yes          |
| Welcome bonus (first event)      | Fixed amount     | Yes          |
| Referral (referred client books) | Fixed amount     | Yes          |
| Birthday event                   | Bonus multiplier | Yes          |
| Feedback submitted               | Fixed amount     | Yes          |
| Large party (above threshold)    | Bonus amount     | Yes          |

Points are integers. Always positive. Never negative. Point transactions are append-only (like the financial ledger).

### 12.2 Tiers

Three tiers based on cumulative points:

| Tier     | Threshold                   | Perks                    |
| -------- | --------------------------- | ------------------------ |
| Silver   | Configurable (default 500)  | Configurable by operator |
| Gold     | Configurable (default 2000) | Configurable by operator |
| Platinum | Configurable (default 5000) | Configurable by operator |

When the operator changes tier thresholds, all client tiers are immediately recalculated.

### 12.3 Rewards

The operator defines rewards:

- Name, description
- Points required to redeem
- Type: free course, fixed discount (cents), percent discount, free dinner, upgrade

Clients redeem rewards through their portal. Redemption creates a pending record. The operator fulfills it on the next event.

**Done when:** Every client sees their point balance, tier, and available rewards. Every point transaction is traceable. The operator controls all reward definitions and thresholds.

---

## 13. PUBLIC SURFACES

### 13.1 Chef Directory

**Route:** `/chefs`

A searchable, filterable listing of all operators who have enabled public visibility.

**Filters:**

- Location (city, state, radius)
- Cuisine type
- Service type (private dinner, catering, meal prep, food truck, etc.)
- Dietary capability (vegan, gluten-free, kosher, halal, etc.)
- Price range
- Availability (date-based)

**Each listing shows:** Name, photo, tagline, location, cuisine tags, service types, rating (from reviews), starting price.

**Clicking a listing** goes to the operator's public profile.

### 13.2 Operator Public Profile

**Route:** `/chef/[slug]`

Displays:

- Profile photo and banner
- Display name and tagline
- Bio
- Cuisine specialties
- Service types offered
- Location / service area
- Social media links (Instagram, TikTok, Facebook, YouTube, Linktree)
- Reviews and testimonials (aggregate rating, individual reviews with source badges)
- Portfolio photos (if operator has added showcase menus or event photos)
- "Inquire" button linking to the public inquiry form

**SEO:** Each profile includes JSON-LD structured data (LocalBusiness, AggregateRating) for search engine visibility.

**Done when:** A visitor can find an operator through search, evaluate them through their profile, and submit an inquiry without creating an account.

### 13.3 Food Operator Directory

**Route:** `/discover`

A broader directory of food establishments (restaurants, bakeries, food trucks, caterers, chefs) that may or may not use ChefFlow.

**Filters:** Type, cuisine, state, city, price range.

Each listing: business name, type, cuisine, location, contact info, hours, social links.

Operators can claim and enhance their listing. Anyone can nominate a new business for inclusion.

### 13.4 Guest Event Portal

**Route:** `/event/[eventId]/guest/[secureToken]`

No authentication required. Token provides access.

**Guest can:**

1. View event details (date, time, location, menu)
2. RSVP (yes/no)
3. Submit dietary restrictions and allergies
4. Submit accessibility needs
5. View pre-event info (parking, dress code, what to expect)
6. View countdown to event
7. View shared documents (recipe cards, wine pairings)
8. Send message to operator
9. After event: submit feedback and ratings

**Done when:** A guest can complete their entire event participation lifecycle (RSVP through feedback) via one link, with no account creation.

---

## 14. AI SYSTEM (REMY)

### 14.1 Core Rules

1. **AI assists. AI never decides.** Every AI output is a draft that the operator must review and approve before it becomes canonical (stored in database, sent to a client, or displayed as fact).

2. **Formula beats AI. Always.** If a deterministic calculation can produce the correct answer, use it. AI is the fallback for unstructured input, not the default for structured operations.

3. **AI never generates recipes.** It searches the operator's existing recipe book. It parses text into structured recipe data. It never invents, suggests, or fabricates recipe content.

4. **AI never sends messages.** It drafts messages. The operator sends them.

5. **AI never transitions event states.** It never records payments. It never modifies the ledger. It never changes any canonical data without operator approval.

6. **Private data stays private.** Any data containing client PII, financials, dietary info, allergies, or business analytics routes through the private AI provider (Ollama-compatible endpoint). Never through a third-party cloud AI service that could store or train on the data.

### 14.2 Remy Capabilities

| Capability              | Input                                   | Output                                                | Requires Approval                                           |
| ----------------------- | --------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------- |
| **Chat**                | Natural language question               | Conversational response                               | No (read-only)                                              |
| **Draft email**         | Context (inquiry, event, client)        | Email draft text                                      | Yes (operator edits and sends)                              |
| **Parse inquiry**       | Freeform text                           | Structured inquiry fields                             | Yes (operator reviews)                                      |
| **Parse recipe**        | Freeform text or photo                  | Structured recipe fields                              | Yes (operator reviews)                                      |
| **Brain dump**          | Freeform paragraph about multiple items | Separated, categorized structured records             | Yes (operator reviews each)                                 |
| **Parse transcript**    | Call/meeting transcript                 | Extracted action items, client details, event details | Yes (operator reviews)                                      |
| **Search recipes**      | Query text                              | Matching recipes from operator's book                 | No (read-only)                                              |
| **Generate daily plan** | Current schedule + tasks + priorities   | Proposed daily plan with swim lanes                   | Yes (operator approves)                                     |
| **Allergen analysis**   | Menu + guest dietary data               | Deep allergen risk assessment                         | No (informational, displayed alongside deterministic check) |
| **Contract generation** | Event + client + quote data             | Draft contract text                                   | Yes (operator reviews)                                      |
| **Business insights**   | Aggregated business data                | Health score + recommendations                        | No (informational, but deterministic logic preferred)       |

### 14.3 Conversation Storage

All Remy conversations are stored in the browser (IndexedDB). Never on the server. The operator can:

- Organize conversations into projects (folders)
- Pin, archive, or delete conversations
- Search across all conversations
- Export conversations as Markdown or JSON

**Done when:** AI makes the operator more efficient without ever acting autonomously or exposing private data to unauthorized systems.

---

## 15. SAFETY AND COMPLIANCE

### 15.1 Food Safety

**Temperature logging:** For each event, the operator can log food temperatures:

- Food item name
- Temperature (degrees F or C)
- Timestamp
- Pass/fail (against configured safe temperature thresholds)

Failures are flagged in red. The log is immutable (append-only).

**Allergen management:** Covered in section 6.2. Deterministic cross-checking is mandatory for every menu-event combination.

### 15.2 Incident Reporting

**Incident record:**

- Type (food safety, injury, equipment failure, client complaint, other)
- Severity (low, medium, high, critical)
- Date and time
- Location
- Description
- Witnesses
- Status: `reported`, `investigating`, `resolved`
- Resolution notes and timeline

**Done when:** Every food safety event and incident is recorded, trackable, and cannot be silently deleted.

### 15.3 Cannabis Compliance (Where Applicable)

For operators who provide cannabis-infused food services:

- Separate compliance tracking (license status, testing requirements)
- Separate financial ledger (regulatory separation)
- Guest consent and age verification
- Dosage tracking per dish
- Operational handbook

This is a self-contained vertical. It does not affect non-cannabis operations.

---

## 16. REALTIME SYSTEM

### 16.1 Server-Sent Events (SSE)

The system maintains persistent SSE connections for:

- Dashboard data updates (new inquiries, payments, status changes)
- Inbox updates (new messages)
- Client portal updates (menu changes, status changes)
- Station clipboard updates (edits by other staff)
- Presence tracking (who is currently viewing what)

**Behavior:** When a server action mutates data, it broadcasts to all connected clients subscribed to the affected channel. The client receives the event and updates the UI without a page refresh.

**Failure mode:** If the SSE connection drops, the client reconnects automatically. On reconnection, it fetches current state (not replaying missed events).

**Done when:** Multiple users viewing the same data see changes in real time. No user sees stale data for more than the reconnection interval.

---

## 17. INTEGRATION POINTS

### 17.1 Email (Gmail + Resend)

- **Gmail:** Connected via OAuth. Operator can compose and send emails from within ChefFlow using their own Gmail address.
- **Resend:** System-generated transactional emails (notifications, invitations, receipts) sent via Resend with the platform sender address.

### 17.2 Calendar (iCal)

Outbound iCal feed (read-only, token-gated). External calendars subscribe to the feed URL.

### 17.3 Payments (Stripe)

- Checkout: Clients pay via Stripe Checkout
- Subscriptions: Voluntary supporter contributions (recurring)
- Payouts: Stripe Connect for operator payouts (if configured)
- Webhooks: Payment confirmations, subscription changes, disputes

### 17.4 Embeddable Widget

A standalone JavaScript file that operators place on their own website. It renders an inquiry form in an iframe. Submissions create inquiries in ChefFlow. The widget is self-contained, uses inline styles (no external CSS dependency), and works on any website.

### 17.5 Market Price Data (OpenClaw Pipeline)

External system on Raspberry Pi scrapes ingredient prices from 27+ retail sources. Data flows into ChefFlow's ingredient pricing system. The pipeline is:

1. Pi scrapes prices into local SQLite database
2. Sync script pulls data into ChefFlow's PostgreSQL (openclaw.\* tables)
3. Normalization maps scraped ingredient names to canonical ingredients
4. Price resolution (section 7.2) uses this data as one tier in the priority chain

**Failure mode:** If the Pi is offline or sync fails, ChefFlow falls back to the next available price source. It never shows stale Pi data as current (price dates are checked).

---

## 18. DATA INTEGRITY RULES

These rules apply to the entire system. Violations are bugs.

### 18.1 Immutable Records

These records can never be modified or deleted after creation:

- Ledger entries
- Event state transitions
- Quote state transitions
- Signed contracts
- Temperature logs
- Incident reports (status can change; original report content cannot)

### 18.2 Computed Values

These values are never stored in a mutable column. They are always computed from source data:

- Client total spent
- Client event count
- Event financial summary (quoted, paid, balance, profit, margin)
- Loyalty point balance
- Loyalty tier
- Inquiry priority group
- Calendar conflict status

### 18.3 Tenant Isolation

Every database query that reads or writes data must include a tenant scope (operator ID from session). No exceptions. No "select all across tenants" queries in application code. Admin queries that cross tenants are limited to explicitly designated admin functions.

### 18.4 Display Rules

- If data fails to load: show an error state. Never show zero, empty, or default values that could be mistaken for real data.
- If a feature is not functional: hide it or disable it with an explanation. Never render a clickable element that does nothing.
- If a number is displayed: it must come from a real data source. Never hardcode financial figures, counts, or metrics.
- If AI generates content: it must be clearly marked as a draft until the operator approves it.

---

## 19. DEFINITION OF DONE (PER FUNCTION)

| Function              | Done When                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| **Inquiry intake**    | Every inquiry has a status, linked client, channel, timestamp, and appears in priority-sorted pipeline |
| **Quote**             | Contains all pricing, client can view via token link, acceptance auto-creates event                    |
| **Event**             | Has exactly one FSM state, every transition is immutable, financials are ledger-derived                |
| **Event close-out**   | Tip/receipts/mileage/reflection captured, financials finalized, follow-up triggered                    |
| **Payment**           | Ledger entry created, event financial summary updated, auto-transition if deposit met                  |
| **Expense**           | Ledger entry created, categorized, optionally linked to event                                          |
| **Financial report**  | All figures derived from ledger, exportable as CSV                                                     |
| **Client record**     | Core fields present, extended profile grows over time, computed metrics are accurate                   |
| **Allergen check**    | Runs automatically when menu + guests exist, flags all conflicts by severity                           |
| **Recipe**            | Structured, scalable, costable, never AI-generated                                                     |
| **Menu**              | Assembled from recipes/dishes, cost breakdown computed, allergen matrix generated                      |
| **Menu approval**     | Client can view, approve, or request changes via portal                                                |
| **Staff assignment**  | Staff member linked to event, role and schedule defined, labor cost computable                         |
| **Station clipboard** | Live grid, every edit attributed, 86 status visible system-wide                                        |
| **Calendar**          | All time-bound records visible, conflicts detected, iCal feed available                                |
| **Inbox**             | All inbound communication aggregated, every item has a disposition                                     |
| **Analytics**         | All metrics are deterministic, current, derived from real data                                         |
| **Loyalty**           | Points earned per trigger, tiers computed, rewards redeemable                                          |
| **Public profile**    | Discoverable, informative, inquiry form functional, SEO structured data present                        |
| **Guest portal**      | Complete lifecycle (RSVP through feedback) via single token link                                       |
| **AI (Remy)**         | Assists without autonomy, private data stays private, drafts require approval                          |
| **Temperature log**   | Immutable, timestamped, pass/fail flagged                                                              |
| **Incident report**   | Recorded, trackable, original content immutable                                                        |
| **Realtime**          | Multiple users see changes without refresh, reconnection handles dropped connections                   |
| **Notification**      | Every important event produces a notification, all have read/unread and link to source                 |

---

## 20. WHAT "FULLY WORKING" LOOKS LIKE

A fully working ChefFlow instance means:

1. An operator signs up and lands on a functional dashboard with empty states (not errors).
2. They receive an inquiry through any channel. It appears immediately in their pipeline.
3. They respond, create a quote, and send a proposal. The client views it via a token link.
4. The client accepts. An event is auto-created.
5. The operator assigns a menu. Allergen conflicts are flagged automatically.
6. The client approves the menu through their portal.
7. The operator records a deposit. The event transitions to `paid` automatically.
8. The operator confirms the event, assigns staff, and generates a day-of plan.
9. Day of: the operator tracks time, logs temperatures, manages the station clipboard.
10. Post-event: the operator completes the close-out wizard (tip, receipts, mileage, reflection).
11. The client receives a feedback request. They submit ratings and a testimonial.
12. The operator's analytics update to reflect the completed event.
13. The client earns loyalty points. Their tier is recalculated.
14. The next potential client finds the operator through the public directory, reads their reviews, and submits an inquiry. The cycle restarts.

Every step produces real data. Every screen shows real numbers. Every AI output is a draft. Every financial figure comes from the ledger. Every state transition is recorded. Nothing is faked, hidden, or assumed.

That is the system.
