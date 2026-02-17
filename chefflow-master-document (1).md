# CHEFFLOW — THE CANONICAL MASTER DOCUMENT

## Version 1.0 — February 15, 2026

This document is the single source of truth for what ChefFlow is, who it is for, how it works, and what it must do. Every decision about ChefFlow — design, development, behavior, scope — must align with this document. If it contradicts this document, it is wrong.

This document was built from two sources: (1) three years of structured business analysis and system design, and (2) a real-time observation of a complete dinner service on February 14, 2026 — from wake-up through close-out — capturing every decision, friction point, and workflow gap as they happened live.

---

## PART 1: WHAT CHEFFLOW IS

### Definition

ChefFlow is a three-layer, state-driven operating system for independent private chefs. It replaces memory, scattered messages, mental checklists, and improvised documents with a single canonical system that tracks every fact, surfaces every action, and protects the chef's ability to execute calmly.

### The Three Layers

**Public Layer (Marketing + Intake + Conversion)**
The front door. Pages anyone can see without an account. Its job is to convert interest into structured inquiries without back-and-forth chaos. Collects date, guest count, location, occasion, budget, dietary restrictions, and service expectations up front. Produces an Inquiry record in the database instead of a messy text thread.

**Chef Portal (Operational Control Surface)**
The private, authenticated back office where the chef runs the business. This is the canonical source of truth. Every client, every event, every menu, every payment, every message lives here. The Chef Portal answers one question at all times: "What can I safely prepare right now?"

**Client Portal (Controlled Projection Surface)**
A separate authenticated experience for clients. Intentionally limited. Clients review proposals, approve menus, pay, see confirmed details, message with context, and manage preferences. They see a curated projection of chef-owned data. They do not run the business.

### The Core Question

At any moment, ChefFlow must be able to answer:

> "What can I safely prepare right now?"

If nothing is actionable, it says so clearly. If something is blocked, it says what's blocking it. If something becomes fragile if delayed, it surfaces that urgency.

### What ChefFlow Is

- A state-driven execution model
- A stress-reduction engine
- A progressive preparation system
- A memory externalizer
- A calm-preservation tool
- A truth-based workflow (confirmed facts unlock next actions)
- A canonical database of clients, events, menus, proposals, payments, messages
- A proposal and pricing engine with audit history
- A deposit + installment + balance tracking system
- A menu drafting + approval workflow
- A prep planning generator (grocery, timeline, packing, production logic)
- A ledger-first financial record (no silent overwrites)
- A role-enforced, multi-tenant architecture
- A repeat-client memory bank
- A recipe bible that builds over time
- A costing engine that tracks food cost per event
- A scalable foundation that could later support multiple chefs
- A structured replacement for mental load

### What ChefFlow Is NOT

- A marketing automation tool
- A mass email platform
- A social media scheduler
- A staff management system
- A catering logistics platform
- A POS system
- An accounting system
- A generic CRM
- A recipe discovery app
- A SaaS startup experiment
- A food delivery platform
- A marketplace like Take a Chef
- A meal-kit company
- A cooking app
- A public directory of chefs
- An unstructured Notion board
- A task list without state logic
- A system that relies on memory instead of recorded facts
- A phone app you use during service
- A live dashboard you tap while cooking
- An AI that runs your business without you

---

## PART 2: WHO THIS IS FOR

### The Primary User: David

Owner of DF Private Chef LLC. Nearly 10 years of experience. Has cooked for celebrities, professional athletes, high-net-worth families, and everyday clients. Graduated top of his class in culinary school. Built his client base through Take a Chef (200+ reviews, 4.7 stars) and word of mouth. Based in Haverhill, Massachusetts.

**Strengths:**
- Exceptional cook — execution under pressure is flawless
- Strong client relationships — repeat bookings spanning 5+ years
- Creative and intuitive with menus
- Can adapt on the fly during service
- Genuinely cares about clients as people

**Challenges:**
- ADHD — executive dysfunction, attention drift, context switching
- Does not track financial numbers (revenue, food cost, margins)
- Does not record recipes despite 10 years of cooking
- Does not cost out menus before shopping
- Procrastinates on prep until day-of
- Builds all operational documents (grocery lists, prep lists) hours before service
- Forgets items (gloves, parchment paper, cognac, butter)
- Mixes personal and business grocery shopping
- Leaves inquiries unanswered for weeks or months
- Has no structured follow-up process
- No social media consistency despite having content
- Restarts software projects when they feel messy
- Has restarted ChefFlow ~20 times in 2 years

**Operating Reality:**
- One-man operation — no staff, no brigade, no safety net
- Cooks in other people's homes with uncontrolled environments
- Never working on just one dinner — multiple inquiries and events overlap constantly
- Operates on feel and intuition, not spreadsheets
- Revenue target: $10,000/month minimum
- Recently lost anchor client (Celtics player traded) — rebuilding pipeline
- Business partner wants CRM-grade data and professional structure

### Secondary Users

**Repeat Clients (like Michel)**
- Want a frictionless rebooking experience
- Want to feel remembered (preferences, dietary needs, history)
- Want clear communication without chasing the chef
- Want clean payment without awkward money conversations

**New Clients**
- Want to understand what hiring a private chef involves
- Want the booking process to feel safe and professional
- Want clear pricing and expectations up front

**The Business Partner**
- Wants to see data: pipeline, revenue, conversion rates, client records
- Wants professional structure that proves the business is real
- Wants auditability and scalability

**Other Independent Chefs (future)**
- Multi-tenant from day one
- Strict data isolation
- Each chef gets their own tenant with their own clients, events, and data

---

## PART 3: THE REAL PROBLEM

### It Is Not Cooking

The hardest part of being a private chef is not the food. It is everything else:

- Holding multiple dinners in your head at once
- Forgetting details until the day-of
- Realizing you could have prepped something earlier
- Building documents too close to execution
- Discovering missing equipment during packing
- Re-reading menus the morning of because you mentally switched to another event
- Not knowing which inquiry you're even working on
- Reconstructing event details from scattered text threads
- Not knowing your actual food cost or profit margin
- Having no recipe library despite years of cooking
- Missing follow-ups and letting leads die
- Responding to new inquiries while executing a current service

### The Core Problem

> You cannot see what is safely preparable early enough.

Because of that:
- Work stacks late
- Documents get built hours before service
- Shopping happens the afternoon of
- Items get forgotten
- Money goes untracked
- Stress compounds
- The chef feels behind even when they're not

### What Was Observed on February 14, 2026

A complete dinner service was observed in real-time. Four-course Valentine's Day dinner for a repeat client. Four guests. $100/person. Here is what happened:

- Chef woke up at 12:30 PM (planned to wake at 8:00 AM)
- First action was figuring out which inquiry he was working on
- Had to reconstruct the entire event from a text thread
- Built the grocery list at 1:45 PM for a 6:00 PM arrival
- Left for the grocery store at 2:20 PM (20 minutes behind plan)
- Spent $220 mixing business and personal items with no budget
- Forgot parchment paper (store didn't have it — cake later stuck to pan)
- Forgot cognac (required separate liquor store stop)
- Got home at 3:07 PM and started prepping
- Built the prep list at 3:24 PM — 2.5 hours before arrival
- Ran to corner store for parchment paper — didn't have it
- Cake stuck to pan during prep — spent 5 minutes salvaging with offset spatula
- Forgot gloves — caught it while backing out of driveway
- Pushed arrival from 6:00 to 6:30 PM
- Had to ask client for butter during service
- Three new dinner inquiries arrived during service (text, text, Instagram DM)
- Responded to inquiries while driving
- Execution on-site was flawless — client loved everything
- Kitchen fully cleaned before dessert served
- Received $500 ($100 tip) plus handwritten card
- Got home at 10:22 PM, forced himself to reset equipment and start laundry
- No costing done. No recipes recorded. No margin calculated.
- Chef's assessment: "This is exactly how I do everything. Every single dinner."

### The Pattern

Every problem traces to the same root: nothing was done ahead of time. Not because the chef is lazy or incompetent — because there is no system making the preparable window visible before the pressure forces action.

ChefFlow exists to solve naive procrastination caused by partial visibility. Not laziness. Not discipline. Visibility.

---

## PART 4: THE LIFECYCLE

### The 18-Stage Model (137 Micro-Actions)

Every dinner moves through 18 stages. Each stage has explicit prerequisites, confirmed facts, and safe next actions. Nothing moves forward on assumptions.

**Stage 1 — Inquiry Intake (13 actions)**
Receive message, create inquiry record, log verbatim, tag channel, timestamp, create client stub, link client, extract confirmed facts, mark unknowns, generate blocking questions, send first response, set status waiting, start follow-up timer.

**Stage 2 — Qualification (11 actions)**
Receive reply, update confirmed facts only, remove answered blocking questions, add new unknowns, confirm serve time, confirm guest count, confirm location, confirm dietary constraints, confirm service style, decide quote-ready, mark qualified.

**Stage 3 — Menu Development (15 actions)**
Begin internal draft, define course count, identify gravity center per course, break into components, flag high-risk components, flag flexible/market components, draft internal v1, draft client-facing version, send proposal, receive edits, revise, lock structure, confirm headcount deadline, confirm serve time anchor, mark finalized.

**Stage 4 — Pricing & Quote (12 actions)**
Determine pricing model, calculate total, decide deposit vs full, draft quote, send quote, set quoted, receive acceptance, convert to event, snapshot pricing, lock calendar, send confirmation, set booked.

**Stage 5 — Financial Commitment (6 actions)**
Receive payment, create payment record, attach to event, update status, acknowledge, mark financially committed.

**Stage 6 — Grocery List Creation (11 actions)**
Begin planning, break components into shoppable units, list proteins, list produce, list dairy/fats, list pantry, separate already-owned staples, add insurance items, mark flexible items, add quantities, mark ready.

**Stage 7 — Prep List Creation (7 actions)**
Begin planning, separate early-prep vs day-of, write prep outcomes (not instructions), add texture-sensitive exclusions, add storage notes, define 80% calm threshold, mark ready.

**Stage 8 — Equipment Planning (8 actions)**
Begin planning, categorize must-bring, categorize assume-exists, categorize confirm-required, add plating tools, add specialty tools, add redundancy items, mark ready.

**Stage 9 — Packing / Car Load (9 actions)**
Begin packing plan, group by bins (cold/dry/tools), pack cold, pack dry, pack tools, protect fragile, secure liquids, double-check non-negotiables, mark car ready.

**Stage 10 — Timeline Creation (7 actions)**
Anchor serve time, define arrival time, add buffer, sequence courses, identify overlap tasks, identify non-rush moments, mark stable.

**Stage 11 — Travel & Arrival (7 actions)**
Confirm address, confirm access instructions, depart with buffer, arrive on site, conduct kitchen scan, confirm house rules, establish workspace.

**Stage 12 — Execution (10 actions)**
Activate execution list, start heat sources, stage plating tools, execute course 1, reset station, execute course 2, reset station, execute remaining courses, monitor pacing, adapt to constraints.

**Stage 13 — Breakdown (5 actions)**
Clean kitchen to baseline, pack tools, sweep space, say goodbye, leave location.

**Stage 14 — Post-Event Capture (5 actions)**
Create completion record, log client behavior notes, log menu performance notes, log site notes, mark completed.

**Stage 15 — Follow-Up (5 actions)**
Draft follow-up message, reference specific moments, include review link, send, mark sent.

**Stage 16 — Financial Closure (3 actions)**
Confirm final payment status, record add-ons, mark financially closed.

**Stage 17 — Inquiry Closure (3 actions)**
Mark inquiry closed, update client status (repeat-ready), archive event.

**Stage 18 — Post-Service Reset + Retrospective**
Bring everything inside. Break down and clean cooler. Put away leftover food. Dishes in dishwasher. Towels and uniform in wash. Equipment bags emptied and collapsed. Car cleared completely. Fill out After Action Review (retrospective). Assess: what went well, what went wrong, what was forgotten, was the service calm, could anything have been done earlier. Event does not reach terminal state until reset is complete and retrospective is filed.

Terminal state means: no open loops, no financial ambiguity, no pending follow-ups, no dirty equipment, no unanswered messages, everything reset and ready for the next dinner.

---

## PART 5: THE DOCUMENT SYSTEM

### 33 Document Types Across 7 Layers

Every dinner generates up to 33 distinct document types. These are not all created at once — they unlock progressively as facts confirm.

**Layer 1 — Inquiry & Intake:** Inquiry record, raw message log, intake snapshot, blocking questions list, referral record, client stub, communication log, internal qualification notes, lifecycle state history.

**Layer 2 — Menu Development:** Internal menu draft, client-facing menu proposal, menu revision log, finalized menu (locked), component breakdown per course, menu performance notes (post-event).

**Layer 3 — Financial:** Quote/proposal, pricing snapshot (frozen at acceptance), invoice, payment records, adjustment/add-on records, event financial summary, financial closure confirmation.

**Layer 4 — Planning & Production:** Grocery list (structural → quantified → finalized), prep list (early prep → texture-sensitive exclusions → day-of execution), equipment list (must-bring → assume-exists → confirm-required), packing/car-load list (cold → dry → tools → fragile → non-negotiables), timeline/run of show, execution/day-of list (irreversible actions, cascading triggers, easy-to-forget items).

**Layer 5 — Site & Boundary:** Location/site notes, client responsibility checklist, special conditions agreement.

**Layer 6 — Legal Snapshot:** Terms & conditions snapshot, cancellation policy snapshot, liability acknowledgment.

**Layer 7 — Post-Event:** Event completion record, post-event notes, client feedback record, follow-up message draft, review link record, inquiry closure record, client status update, After Action Review (retrospective).

### Progressive Document Unlocking

Documents do not appear all at once. They unlock as facts confirm:

- Menu confirmed → grocery list skeleton unlocks
- Guest count confirmed → grocery list quantities unlock
- Grocery list finalized → prep list unlocks
- Prep complete → packing list unlocks
- Deposit received → event becomes real, execution planning unlocks
- Event completed → post-event capture unlocks
- Follow-up sent + retrospective filed + reset complete → terminal state

Nothing waits for "final lock" if partial information allows safe progress.

### Three Printed Sheets

The chef needs exactly three printed documents per event:

**1. Prep Sheet** — Used at home during cooking. Organized by course order with priority indicators within each course. Longest cook time tasks at top of each course, pack-only tasks at bottom. Gets messy, gets food on it. Dies after prep.

**2. Service Execution Sheet** — Clean, fresh, goes to the client's house. Only shows what happens on site, organized by course. Includes the clean menu for reference so the chef can glance at it and remember what they're making. Component counts per course for packing verification. Dietary restrictions, allergies, and client-specific notes flagged prominently. This is what gets taped to the counter.

**3. Non-Negotiables Checklist** — Gloves, gum/mints, clean uniform, clean shoes, towels, trash bags, parchment paper, salt, oil, pepper, and any other items the chef always needs but frequently forgets. Checked before walking out the door.

---

## PART 6: THE MENU HIERARCHY

### Structure

Menus are not flat lists. They follow a strict hierarchy:

**Menu → Dishes → Components → Recipes → Ingredients**

Example from February 14 dinner:

- **Menu:** Valentine's Day Dinner for Michel
  - **Dish:** Steak Diane with Roasted Smashed Potatoes, Broccoli and Asparagus
    - **Component:** Steak (vacuum sealed with garlic, thyme, butter)
    - **Component:** Diane Sauce
      - **Recipe:** Sear steak, set aside. Sauté shallots and mushrooms. Deglaze with cognac. Add beef stock, cream, worcestershire, dijon. Reduce. Finish with sous vide drippings, lemon, parsley.
        - **Ingredients:** Shallots, mushrooms, cognac, heavy cream, beef stock, worcestershire, dijon mustard, lemon, parsley
    - **Component:** Roasted Smashed Potatoes
      - **Recipe:** Boil potatoes, rice, mix with infused milk (milk, half and half, garlic powder, onion powder, thyme — strained) and buttermilk. Load into casserole dish. Roast on site for crispy top.
        - **Ingredients:** Potatoes, milk, half and half, buttermilk, butter, garlic powder, onion powder, thyme
    - **Component:** Broccoli and Asparagus
    - **Component:** (No component for Evan's modification — tracked as a flag on the dish)

### Why This Matters

When the chef thinks "I'm making steak Diane," that feels like one thing. But the prep list needs to show every production task — not three pretty things on a plate, but every sub-component that needs to be made. The component count is what drives the packing verification: if Course 3 has 5 components, there should be 5 things in the cooler for Course 3.

### Component Counts (February 14 Example)

- Course 1 (Cheese Board): 24 components (expanded from 15-component template)
- Course 2 (Bib Lettuce Salad): 3 components
- Course 3 (Steak Diane + Sides): 5 components
- Course 4 (Dessert): 7 components
- **Total: 39 components to pack and verify**

---

## PART 7: THE RECIPE BIBLE

### The Problem

The chef has been cooking for 10 years and has zero recorded recipes. Every dinner, even for dishes made many times before, requires looking up recipes online, comparing a few, and then cooking from intuition anyway. The recipe that lives in muscle memory never gets written down. This means:

- No standardized portions
- No accurate costing
- No reproducibility
- No cookbook potential
- No ability to hand off a dish to another chef
- Constant re-discovery of known recipes

### The Solution

ChefFlow maintains a digital recipe bible organized by component type. Every recipe includes:

- Component name
- Category (sauce, protein, starch, dessert, etc.)
- Ingredients with exact quantities
- Method (concise — outcomes, not instructions, because the chef knows how to cook)
- Yield (how much it makes)
- Cost per batch (auto-calculated from ingredient prices)
- Cost per portion (auto-calculated from yield and guest count)
- Allergen flags
- Notes (adaptations, shortcuts, "can be made in separate pan ahead")
- Event history (which dinners used this recipe)
- Photo (optional)

### How It Builds

The recipe bible is not built by sitting down and writing a cookbook. It builds over time from real events:

1. Chef confirms a menu with components
2. Any component without a saved recipe gets flagged
3. After the event, the system prompts: "You made Diane Sauce tonight but there's no recipe for it. Want to record it?"
4. Chef can voice-to-text or type: ingredients, quantities, method
5. Recipe is saved, linked to the component, and available for all future events
6. Over time, the chef accumulates hundreds of standardized recipes from real dinners

### Template System

Reusable templates for common builds. Example: the cheese board template for 4 people (15 components: 3 cheeses, 3 meats, 2 crackers/bread, 2 spreads, 2 pickled/briny, 2 fruit, 1 seeds/nuts). Scales by guest count. Respects allergy flags automatically (nut allergy → swap nuts for seeds).

---

## PART 8: THE COSTING ENGINE

### The Problem

The chef has never costed out a menu. Does not know food cost per dinner, profit margin, or true revenue after expenses. Mixes personal and business grocery shopping. Has no budget before shopping. Discovers what he spent at checkout.

### What Was Observed

February 14 dinner: quoted $400 ($100/person x 4). Received $500 ($100 tip). Spent $220 on groceries (mixed business and personal). Additional spend on cognac (amount unknown — receipt on phone). Gas, mileage, and time untracked. Leftover food carried into the next day's dinner (untracked value). Actual profit margin: unknown.

### The Solution

ChefFlow tracks the full financial picture per event:

**Revenue side:**
- Quoted price
- Actual payment received
- Tip amount
- Payment method (cash, Venmo, etc.)
- Payment card used (for cash-back optimization — e.g., Amex 4% on groceries)

**Cost side:**
- Projected food cost (auto-calculated from recipe bible + grocery prices before shopping)
- Actual grocery spend (receipt upload — photo capture, line item extraction)
- Business vs personal separation (flag items as personal at time of capture)
- Additional expenses (liquor store, specialty items, separate stops)
- Gas/mileage (tracked per event)
- Time invested (shopping time, prep time, travel time, service time, reset time)

**Derived metrics:**
- Food cost percentage per event
- Actual profit margin
- Effective hourly rate
- Leftover value carried to next event
- Monthly revenue vs $10K target
- Revenue booked vs revenue received

### Budget Guardrail

Before the chef shops, ChefFlow shows: "This dinner supports $X in groceries at your target margin." Not accounting. Just a number. A ceiling. So splurging is a conscious choice, not an accidental one.

### Leftover Tracking

When surplus from one dinner carries into the next (as observed: cheese, cake, mousse carried from February 14 into February 15 dinner), ChefFlow tracks that transfer. The first dinner's effective cost goes down, the second dinner's cost is partially covered. True cost per dinner becomes more accurate over two-dinner views.

---

## PART 9: THE SCHEDULING + ANTI-PROCRASTINATION ENGINE

### The Problem

The chef has no schedule. Has not had a structured daily routine since going self-employed 3 years ago. Misses the clock-in feeling of employment. Feels like he's always working and sometimes never working. Procrastinates until pressure forces action. Wakes up late. Builds documents hours before service. Shops the afternoon of. This is not laziness — it is the absence of external structure combined with ADHD.

### What Was Observed

February 14: planned to wake at 8 AM, woke at 12:30 PM. Planned to leave for store by 2:00, left at 2:20. Planned to be home by 3:30, arrived 3:07. Had 2.5 hours to prep, build documents, pack, and leave. Pushed arrival 30 minutes late. Everything got done — but at maximum stress.

### The Solution

ChefFlow generates a day-of schedule working backwards from arrival time:

Example for February 14 (what should have existed):
- Arrive at client: 6:00 PM
- Leave house: 5:30 PM
- Car packed: 5:00 PM
- Finish prep: 4:30 PM
- Start prep: 2:30 PM
- Home from shopping: 2:00 PM
- Leave for store: 1:00 PM (grocery store + liquor store mapped)
- Wake up / start day: 12:00 PM (absolute latest)

This schedule should exist the moment the event is confirmed — not the morning of.

### Day-Of Route Plan

ChefFlow maps every stop for the day with addresses:
1. Grocery store (Market Basket, Haverhill)
2. Liquor store (One Stop, Haverhill) — flagged because grocery store doesn't sell alcohol
3. Client's house (Haverhill, ~10 minutes)

No figuring it out in the car. No surprise extra stops.

### Progressive Preparation Prompts

ChefFlow doesn't just show what's due today. It shows what's safely preparable days ahead:

- Menu confirmed (Feb 12) → grocery list available immediately
- Grocery list ready → "You could shop today or tomorrow"
- 48 hours before event → "These prep items are safe to do now: pasta dough, ice cream base, vinaigrette"
- 24 hours before event → "Packing list is ready to review"
- Morning of → "Here's your day schedule. Car should be packed by [time]."

The goal is not nagging. The goal is making the window visible so the chef can choose to act early instead of being forced to act late.

### Weekly Structure

Beyond single events, ChefFlow helps establish a weekly rhythm:
- Which days have events
- Which days are prep days
- Which days are admin days (follow-ups, costing, recipe recording, inquiry responses)
- Burnout threshold warnings when weeks get heavy
- Slack detection when weeks are light (prompt to check Take a Chef, respond to old inquiries)

---

## PART 10: THE CLIENT RELATIONSHIP SYSTEM

### The Problem

Client data lives in the chef's head. After 10 years, there are hundreds of clients but no structured records. Repeat clients require the chef to re-learn preferences from memory. Promises made in text threads get forgotten. Dietary restrictions are buried in old messages. The chef has to reconstruct the full picture of a client before every event.

### What Was Observed

February 14: the chef had to scroll through months of texts with Michel to remember the menu, the timing, and the fact that Evan is picky. The nut allergy was not mentioned anywhere in the thread — it came from memory. This is a 5-year repeat client, and the chef was still re-learning the dinner hours before service.

### The Client Record

Every client in ChefFlow has a canonical record:

**Identity:** Name, email, phone, preferred contact method, how they found you (Take a Chef, referral, Instagram, etc.), referral source name.

**Household:** Partner/spouse name, children, other regular guests (e.g., Evan and Lindsay always come with Michel and Kelly).

**Preferences:** Dietary restrictions, allergies (NUT ALLERGY — flagged permanently), dislikes, spice tolerance, favorite cuisines, favorite dishes from past events, wine/beverage preferences.

**History:** Every event cooked for them, every menu served, every payment, every message thread, every follow-up, every review.

**Site notes:** Address, parking, access instructions (e.g., "enter through garage"), kitchen size/constraints, house rules (e.g., "no shoes"), equipment available vs must-bring.

**Relationship notes:** Vibe, tone, generosity, how they pay, tipping pattern, how they say goodbye, what they care about, personal milestones (birthdays, anniversaries, children born).

**Financial:** Lifetime value, total events booked, average spend per event, payment history, outstanding balances.

**Loyalty:** Points/tier (when loyalty program is active), reward eligibility, referral impact.

**Status:** Active, dormant, repeat-ready, VIP.

### Repeat Client Intelligence

When Michel books next year's Valentine's Day dinner, ChefFlow already knows:
- He books every February for Valentine's Day
- Always 4 guests (Michel, Kelly, Evan, Lindsay)
- Evan is picky — no sauce, plain options
- Nut allergy in the household
- Address in Haverhill, 10 minutes away, enter through garage
- Typical budget: $100/person
- Always pays cash, always tips
- Loves Belgian food (consider waffles)
- Previous menus served (avoid repeats or offer favorites)

The chef opens the event and everything is pre-populated. No re-learning. No scrolling through texts.

---

## PART 11: THE INQUIRY PIPELINE

### The Problem

Inquiries come from everywhere — text, email, Instagram DMs, Take a Chef — and there is no system to track them. Messages get lost. Responses get delayed by days, weeks, or months. The chef currently has unanswered inquiries from January on Take a Chef and an unanswered email from last year.

### What Was Observed

February 14: three new inquiries arrived during a single dinner service. One via text (Murr — repeat client, dinner tomorrow), one via Instagram DM (Cindy — new client, birthday dinner in August), one via phone call (business partner asking to take a gig in Maine). All three required real-time decision-making while the chef was driving, cooking, or changing clothes.

### The Solution

Every inquiry from every channel lands in one unified inbox in ChefFlow. Each inquiry becomes a structured record with:

- Source channel (text, email, Instagram, Take a Chef, referral, phone)
- Timestamp
- Client (linked if existing, stub created if new)
- Confirmed facts extracted (date, guest count, location, occasion, budget, dietary)
- Unknown/blocking questions
- Status (new → awaiting client → awaiting chef → quoted → confirmed → declined → expired)
- Next action required and by whom
- Follow-up timer (if no response in 24 hours, flag it)

### Anti-Time-Waster Guardrails

The public intake form can enforce minimums before an inquiry even reaches the chef:
- Minimum guest count
- Minimum spend
- Minimum lead time
- Service radius
- Required fields (date, location, guest count, dietary)

### Response Templates

Common scenarios get pre-drafted responses in the chef's voice:
- "I'm mid-service right now" (used February 14 for Murr)
- "Thanks for reaching out, here's what I need to know"
- "I'd love to cook for you, let me put together a menu"
- "Unfortunately I'm not available on that date"

All require chef approval before sending. Nothing auto-sends in chef voice.

---

## PART 12: THE MESSAGING SYSTEM

### The Problem

Communication is scattered across text, email, Instagram DMs, and Take a Chef. Event-specific details are buried in general conversations. The chef can't find what was promised, when, or to whom. Response times are inconsistent — sometimes same-day, sometimes weeks or months.

### Design

Messages in ChefFlow are contextual and event-bound:
- Every message is attached to an inquiry or event record
- The full conversation history is visible alongside the event details
- Messages show who said what and when
- Draft messages can be created by the system in chef voice but require approval
- No auto-sending of chef-voice messages — ever

### Channels

ChefFlow captures messages from all channels but the chef primarily communicates via text. The system should be able to log external messages (texts, emails) by linking or importing them to the relevant event.

---

## PART 13: THE PAYMENT SYSTEM

### The Problem

The chef doesn't know his real numbers. Revenue is tracked loosely if at all. Food cost is unknown. Margins are unknown. Tips are not recorded separately. The chef "knows roughly" what he made but cannot produce documentation.

### What Was Observed

February 14: $400 quoted, $500 received (cash in a card), $100 tip. Grocery spend $220 on Amex (4% cash back). Additional spend on cognac (receipt on phone, amount unknown). No costing done. No receipt uploaded. No margin calculated.

### Design

ChefFlow uses a ledger-first financial model:
- Every payment is a ledger entry (append-only, no overwrites)
- Deposits, installments, final payments, tips, refunds — all separate entries
- Each entry is linked to an event
- Payment method recorded (cash, Venmo, PayPal, card, etc.)
- Receipt photos attached to events
- Revenue vs expenses calculated automatically
- Monthly revenue tracked against $10K target
- Outstanding balances visible

### V1 Scope

V1 is manual payment tracking only. No Stripe integration. No online payments. The chef records what was received and how. Receipt upload via photo. This alone is a massive improvement over the current state of zero tracking.

---

## PART 14: THE LOYALTY PROGRAM

### The Problem

The chef wants to reward repeat clients but has no system to track loyalty, calculate rewards, or surface eligibility. Currently gives away free food and extras informally based on feel.

### Design Principles

- Rewards are denominated in service, never cash
- The chef never spends money on loyalty rewards
- Every reward drives a rebooking
- Points accumulate automatically based on total guests served (not just bookings)
- Tiers assign automatically based on lifetime activity

### Reward Examples

- $20 off a future dinner
- 50% off a dinner for two
- Free dinner for two (client covers ingredients only)
- Bonus course on next booking
- Complimentary appetizer or dessert

### Relationship Intelligence Triggers

ChefFlow tracks client milestones and prompts outreach:
- Birthdays
- Wedding anniversaries
- Mother's Day / Father's Day
- Pregnancy / new baby
- Booking anniversaries (e.g., Michel — 5 years of Valentine's dinners)

Outreach is suggested, not automated. Chef approves everything.

---

## PART 15: THE POST-EVENT SYSTEM

### Close-Out Sequence

An event is not closed until all of the following are complete:

1. **On-site:** Kitchen cleaned to baseline, equipment packed, goodbye said, location departed.

2. **At home — Reset:**
   - Everything brought inside
   - Cooler broken down, cleaned, ready for next use
   - Leftover food put away (fridge or toss)
   - Dishes in dishwasher or hand washed
   - Towels and uniform in the wash
   - Equipment bags emptied, cleaned, collapsed
   - Car cleared completely

3. **Follow-up:**
   - Thank-you message sent to client (next day)
   - Reference specific moments from the dinner
   - Include review link
   - Mark follow-up sent

4. **Financial closure:**
   - Payment confirmed and recorded
   - Receipt(s) uploaded
   - Tip recorded separately
   - Food cost entered (or auto-calculated)
   - Event financially closed

5. **After Action Review (Retrospective):**
   - How calm was the service? (1-5)
   - How prepared were you? (1-5)
   - Could anything have been done earlier?
   - Did you forget anything? (list)
   - What went well?
   - What went wrong?
   - Menu performance notes
   - Client behavior notes
   - Site notes (anything new about the location)

6. **Client record update:**
   - Preferences updated
   - Relationship notes updated
   - Status updated (repeat-ready)
   - Event archived

Terminal state: no open loops, no financial ambiguity, no pending follow-ups, no dirty equipment, retrospective filed, client record updated. Ready for the next dinner.

---

## PART 16: TECHNICAL REQUIREMENTS

### Architecture

- Multi-tenant from day one (each chef is a tenant)
- Strict tenant isolation (no cross-tenant data access)
- Role-based access: Chef role and Client role
- No staff role in V1
- Ledger-first financial records (append-only, no silent overwrites)
- Audit log on all mutations (who changed what, when, before/after)

### Stack

- Frontend: Next.js with TypeScript
- Styling: Tailwind CSS
- Database: Supabase (PostgreSQL)
- Auth: Supabase Auth (email/password)
- Chef and client use same auth system
- Client accounts created by chef or invite
- Role stored in user table, JWT includes role + client_id
- Tenant derived from session

### State Machine

Every entity with a lifecycle has explicit states, valid transitions, triggers, and guard clauses:

**Inquiry states:** new → awaiting_client → awaiting_chef → quoted → confirmed → declined → expired

**Quote states:** draft → sent → accepted → rejected → expired

**Event states:** upcoming → in_progress → completed → canceled

**Menu states:** draft → shared → locked → archived

**Message states:** draft → approved → sent → logged

**Payment states:** unpaid → deposit_paid → partial → paid → refunded

No implicit transitions. No invisible assumptions. Every state change is logged.

### The Preparable Work Engine

The core function: GET_PREPARABLE_ACTIONS(current_state)

- Scans confirmed facts only
- Ignores blocked dependencies
- Surfaces stress-reducing work
- Excludes irreversible actions until legally safe
- Returns: what is preparable, what is blocked (and why), what becomes fragile if delayed

This engine powers the dashboard. It answers: "What can I safely prepare right now?"

### Non-Negotiables

- Chef-voice messages never auto-send
- Truth-based state machines (confirmed facts drive behavior, not tasks)
- Progressive document unlocking (documents appear as facts confirm)
- No feature exists unless it directly reduces stacking or memory load
- No phone usage during service — everything is printed beforehand
- Human approval required for all client-facing communication

---

## PART 17: ANTI-BLOAT GUARDRAILS

### The Rule

> If a feature does not reduce stress, prevent stacking, preserve relationship clarity, or track business truth — it does not belong in V1.

### Do NOT Build

- Marketing automation
- Social media scheduling
- Staff management
- Accounting complexity beyond receipt tracking and basic costing
- Predictive AI
- Auto-optimization logic
- Gamification
- Productivity dashboards
- Analytics that increase anxiety
- Features because they "sound smart"
- Edge-case modeling before core stability
- A phone app for use during service
- Live dashboards to tap while cooking

### The Restart Risk

The chef restarts projects when scope creeps, structure feels unclear, the product becomes bloated, or he loses sight of what it is. ChefFlow must stay deterministic, minimal in surface area, deep in behavior, calm in UI, and strict in state transitions. Or it will be restarted again.

### Build Order

1. Lock lifecycle behavior
2. Lock state machines
3. Lock document generation
4. Lock data model
5. Then build UI
6. Then refine

Blueprint first. Stability second. Code third. Never reverse that order.

---

## PART 18: THE REAL KPI

### It Is Not Revenue

Revenue supports survival. The real KPI is:

> Did this dinner feel calm?

A dinner is fully prepared when:
- No grocery uncertainty
- No equipment ambiguity
- No prep stacking risk
- Timeline feels calm
- Financial state is clear
- No hidden unknowns

A day is done when:
- No open loops remain
- Only "waiting on client" items exist
- Reset is complete
- Retrospective is filed

### What Success Looks Like in 6 Months

The chef logs in. The dashboard shows preparable actions. He clears them early. Day-of feels calm. Revenue is predictable. He hits $10K without chaos. Clients rebook. The business partner is impressed. Recipes accumulate. Costing is automatic. Follow-ups go out on time. Inquiries never die in the inbox. The chef stops restarting the project.

He cooks. That's it.

---

## APPENDIX A: OBSERVED WORKFLOW DATA

### February 14, 2026 — Belgium Michel Valentine's Day Dinner

**Client:** Michel (Belgian, repeat client, 5th consecutive Valentine's Day dinner)
**Location:** Haverhill, MA — 10 minutes from chef's home, enter through garage
**Guests:** 4 (Michel, Kelly, Evan, Lindsay)
**Allergy:** Nut allergy (zero nuts, all courses)
**Dietary:** Evan is picky — no sauce on steak, plain vanilla ice cream for dessert
**Quoted:** $100/person ($400 total)
**Received:** $500 cash ($100 tip) + handwritten card + jar of homegrown weed
**Arrive:** 6:30 PM (pushed from 6:00)
**Serve:** 7:30 PM
**Payment method:** Cash
**Shopping method:** Business Amex (4% cash back on groceries)
**Grocery spend:** $220 (mixed business and personal)
**Cognac:** Hennessy, small bottle, price unknown (receipt on phone)
**Grocery store:** Market Basket, Haverhill
**Liquor store:** One Stop, Haverhill

### Menu Served

**Course 1 — Charcuterie Board (24 actual components)**
Gouda, lemon cheese, parmesan, sharp cheddar, garlic herb goat cheese, black truffle cheese, burrata, brie (Vermont), 3 types salami, prosciutto, crackers, ciabatta, honey, orange marmalade, dijon, cornichons, oranges, blackberries, raspberries, strawberries, lemon plums, sunflower seeds, thyme garnish.

**Course 2 — Bib Lettuce Salad (3 components)**
Bib lettuce, French lemon vinaigrette (lemon, shallots, garlic, dijon, salt, pepper, honey, olive oil, thyme), shaved parmesan.

**Course 3 — Steak Diane with Sides (5 components)**
Steak (sous vide then seared), Diane sauce (made backwards in separate pan — shallots, mushrooms, cognac, cream, beef stock, worcestershire, dijon, lemon, parsley, finished with sous vide drippings), roasted smashed potatoes (boiled, riced, infused milk, buttermilk, casserole dish, roasted on site), broccoli and asparagus (trimmed, blanched, sautéed in butter). Evan: plain steak, no sauce.

**Course 4 — Chocolate Layer Cake (7 components)**
Chocolate cake (2 layers, stuck to pan — salvaged), chocolate mousse, strawberry mousse, chocolate simple syrup (brushed on layers), chocolate ganache, brownie brittle crunch, vanilla ice cream with strawberry swirl (churned on site). Evan: plain vanilla ice cream.

### Transport Configuration
1. Ice cream machine
2. Equipment bag #1
3. Equipment bag #2 (cake — fragile)
4. Big cooler (all cold items)
5. Extra food bag (dry goods)
6. Chef jacket + apron on hanger

### Items Forgotten
- Parchment paper (store didn't have it — cake stuck)
- Gloves (caught while backing out of driveway)
- Cognac (separate liquor store trip)
- Butter (had to ask client)
- Gum (skipped)
- Mint and rosemary (store didn't have them)

### Inquiries Received During Service
1. Murr (repeat client) — text — dinner tomorrow, 4 guests, steak + chicken/fish, no mushrooms, Wellesley
2. Cindy (new via Instagram) — DM — birthday dinner August 25/26, Maine near Acadia, for Eric and Anna Gardell (past clients)
3. Business partner — phone call — asking chef to take a gig in Maine tomorrow (declined)

### After Action Review (Retroactive)
- Calm rating: moderate (execution was calm, everything before was chaotic)
- Preparation: poor (all documents built day-of, woke up 4.5 hours late)
- Could have been done earlier: grocery list (2 days), prep list (2 days), shopping (day before or morning of), packing
- Forgotten items: parchment paper, gloves, cognac, butter, gum
- What went well: on-site execution flawless, client loved everything, kitchen cleaned before dessert, $100 tip, forced self to reset at home
- What went wrong: day-of scramble, no budget, overspent, cake stuck, 30 minutes late, no costing, no recipes recorded

---

## APPENDIX B: OPEN ITEMS FOR DEVELOPMENT

### From Other LLM Export (Partially Defined)

1. Database schema exists conceptually (Prisma/SQLite referenced but targeting Supabase/PostgreSQL — needs reconciliation)
2. State machine states defined but formal transition tables with guard clauses not yet written
3. Preparable Work Engine is conceptual only — no pseudocode or dependency graph
4. No payment processor decided (V1 is manual tracking)
5. 172 micro-action expansion referenced but full delta from 137 not provided
6. No SQL migrations, ERD, XState config, or typed API contracts exist yet
7. Frontend routing defined: /login, /register, /dashboard, /chef/*, /client/*, /forbidden, /unauthorized
8. Client Portal V1 scope: view event details, view shared menu, submit inquiry, message thread, view payment status

### From Today's Observation (New Requirements)

9. Recipe bible system (builds from real events, prompts after each dinner)
10. Costing engine (projected food cost before shopping, actual cost from receipts)
11. Budget guardrail (shows target spend before shopping)
12. Receipt upload + photo capture per event
13. Business vs personal expense separation
14. Leftover tracking across events
15. Day-of schedule generator (backwards from arrival time)
16. Day-of route planner (grocery store, liquor store, client — mapped with addresses)
17. Default store preferences per chef
18. Non-negotiables packing checklist
19. Service execution sheet (separate from prep sheet — clean, on-site only)
20. Three distinct printed documents per event
21. Post-service reset checklist
22. After Action Review (retrospective) form
23. Component count per course for packing verification
24. Prep list organized by course order with priority indicators within each course
25. Post-shopping substitution capture (planned vs actual ingredients)
26. Inquiry follow-up timer (flag if no response in 24 hours)
27. Response templates for common scenarios
28. Client milestone tracking (birthdays, anniversaries, Mother's Day, etc.)
29. Loyalty point system (service-denominated, never cash)
30. Take a Chef as an inquiry source channel
31. Weekly schedule structure (event days, prep days, admin days)
32. Mileage/gas tracking per event
33. Time tracking per event phase (shopping, prep, travel, service, reset)
34. Cash-back card optimization tracking
35. Anchor client vs one-off pricing structures

---

END OF DOCUMENT
