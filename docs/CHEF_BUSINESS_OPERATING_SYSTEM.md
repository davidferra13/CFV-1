# Private Chef Business Operating System

## The Complete Hierarchy of Everything That Matters

**Version:** 1.0
**Date:** 2026-02-19
**Authority:** This document is the north star for ChefFlow. Every feature, migration, and server action must trace back to at least one domain listed here.

---

## How to Use This Document

This is not organized alphabetically. It is not organized by department.

It is organized by **what kills the business first if it's neglected.**

Every domain has:

- **What it includes** — the key components, with nothing left out
- **ChefFlow coverage** — ✅ Built / ⚠️ Partial / ❌ Missing
- **What breaks** if the domain is neglected

Work top to bottom. The higher the tier, the more urgent the neglect.

---

## The Ten Hats

A solo private chef is simultaneously:

| Hat                | Function                                             |
| ------------------ | ---------------------------------------------------- |
| CEO                | Strategy, pricing, positioning, planning             |
| Chef               | Recipes, menus, food safety, culinary execution      |
| Sales Rep          | Leads, inquiry conversion, proposals                 |
| Account Manager    | Client relationships, retention, follow-up           |
| Operations Manager | Logistics, scheduling, procurement, day-of execution |
| Bookkeeper         | Invoicing, expenses, tax compliance                  |
| Marketer           | Social media, website, referrals, brand              |
| HR Manager         | Hiring assistants, managing coverage, onboarding     |
| IT Director        | Systems, tools, automations, integrations            |
| Customer Service   | Problem handling, complaints, reputation             |

No domain in this document is optional. Every hat must be worn. The only question is whether a system wears it — or whether the chef carries it alone in their head until something breaks.

---

# TIER 1 — EXISTENTIAL

**If these fail, the business collapses within weeks.**

---

## 1.1 Inquiry Capture

> Every lead from every channel must be captured, routed, and acknowledged. Missing a single lead is not just lost revenue — it is a person who will tell others you didn't respond.

**What it includes:**

- Receiving inquiries from: email, website contact form, referral phone calls, Instagram DMs, text messages, Wix submissions, word-of-mouth handoffs
- Routing all channels into a single unified inbox — no lead lives only in Gmail, only in a DM, only in a voicemail
- Acknowledging every inquiry within a defined response window
- Classifying: legitimate lead / spam / general question / existing client follow-up
- Capturing: service type requested, event date, guest count, budget signal, source (how they heard of you)
- Thread continuity — if the same person emails twice, it is one conversation, not two
- Expiry logic — leads that go cold after a defined window are closed, not abandoned forever

**ChefFlow coverage: ✅ Built**
Gmail OAuth sync, Wix webhook ingestion, the unified communication inbox with triage/pending/resolved tabs, the inquiry FSM (new → awaiting_chef → awaiting_client → quoted → confirmed → declined → expired), AI-powered correspondence drafting, and automated expiry rules are all operational.

**Gaps:** SMS inbound channel, Instagram/Facebook DM ingestion, Calendly widget integration.

**What breaks if neglected:** Leads fall through. The chef doesn't know about business that wanted to hire them. Revenue never materializes from people who tried.

---

## 1.2 Pricing and Proposal

> The chef must be able to produce a clear, accurate price and a professional proposal document without doing math by hand each time. One mispriced event is a night of work done at a loss.

**What it includes:**

- A deterministic pricing engine (inputs → exact price, not an estimate)
- Per-person vs. flat-rate vs. package pricing modes
- Guest count tiers (couples vs. groups vs. large parties)
- Holiday and premium-date surcharges
- Travel and accommodation calculation
- Deposit amount and payment schedule
- Professional proposal document delivered to the client (PDF or link)
- Quote expiry logic (proposals don't hang open forever)
- Scope change handling (client requests more courses after quote is sent)
- Revision history (what was changed from quote v1 to v2)

**ChefFlow coverage: ✅ Built**
The pricing engine at [lib/pricing/compute.ts](lib/pricing/compute.ts) handles all modes, holiday premiums, deposit math, and travel. The quote FSM (draft / sent / accepted / rejected / expired) with immutable state transitions is fully operational. AI-assisted proposal drafting exists.

**Gaps:** No contract or terms-of-service delivered alongside the proposal. Multi-installment payment schedules beyond deposit + balance are not supported.

**What breaks if neglected:** The chef undercharges. Or spends 45 minutes doing math every time. Or delivers proposals that look unprofessional and lose the booking.

---

## 1.3 Payment Collection

> Every dollar owed must be collected, recorded, and traceable. A chef who cannot clearly answer "has this client paid in full?" has a financial risk, not just an accounting inconvenience.

**What it includes:**

- Online card payment via Stripe (deposit and balance)
- Offline payment recording: Venmo, Zelle, PayPal, cash, check, ACH
- Automated payment reminders at configured intervals before the event
- Immutable ledger — every transaction is a permanent record, never edited or deleted
- Refund processing linked to a configurable cancellation policy
- Tip recording (separate from service fee)
- Final financial receipt delivered to client after payment
- Client-visible payment history (what they paid, when)

**ChefFlow coverage: ✅ Built**
Stripe integration, immutable ledger with append-only `ledger_entries`, offline payment recording, automated reminders, configurable cancellation policy (pure function, configurable cutoff days), Stripe refund initiation, and receipt delivery are all operational.

**Gaps:** No payment installment plans beyond the 2-payment structure. No ACH as a Stripe payment method option.

**What breaks if neglected:** Clients owe money and the chef isn't sure. Reminders never go out. The chef feels awkward chasing manually. Revenue is recognized incorrectly.

---

## 1.4 Event Lifecycle — The 8-State Machine

> At any moment, the chef must be able to look at any event and know exactly where it stands. No ambiguity. No guessing. No "I think it's confirmed but I'm not sure if they signed."

**The 8 states:**

```
draft → proposed → accepted → paid → confirmed → in_progress → completed
                                                              ↘ cancelled
```

Any non-terminal state can transition to `cancelled`. `completed` and `cancelled` are permanent.

**What it includes:**

- Enforced, irreversible state transitions — you cannot go backward
- Immutable audit trail of every status change (who, when, from, to)
- State-gated document generation (grocery list not available until confirmed; receipt not available until completed)
- Automated actions triggered by state changes (confirmation email at `confirmed`, debrief prompt at `completed`)
- No ambiguity about whether a client has paid, accepted, or confirmed

**ChefFlow coverage: ✅ Built**
The 8-state FSM with immutable `event_state_transitions` audit log, server-side validation, and the full agent lifecycle document (00-INBOUND through 10-CLOSED) are the architectural backbone of the platform. This is solid.

**What breaks if neglected:** The chef doesn't know if they have a confirmed booking or a verbal agreement. Two things happen simultaneously when they shouldn't. Money is collected for events that were never confirmed.

---

## 1.5 Legal Compliance

> The chef must be legally permitted to operate. If they are not, the business does not exist.

**What it includes:**

- Food handler certification / ServSafe (current, not expired)
- Liability insurance (general + professional, adequate coverage limits)
- Business entity filing (LLC, sole proprietor, etc.)
- Business banking (separate from personal)
- Any required local catering permits or home kitchen licenses
- Sales tax compliance (does your state tax catering services?)
- Worker's compensation if hiring any employees

**ChefFlow coverage: ❌ Missing**
ChefFlow does not track certifications, insurance policies, licenses, or compliance deadlines. This is deliberate — it is a business management platform, not a legal system. But the gap must be acknowledged.

**Recommended approach:** At minimum, a settings section where the chef can log expiration dates for critical documents (ServSafe, insurance renewal) with automated reminders before they lapse.

**What breaks if neglected:** The chef operates without insurance, an incident occurs, and the business is wiped out financially. Or a certification lapses and they legally cannot operate the event they have booked.

---

## 1.6 Reputation Management

> A private chef business lives and dies on word-of-mouth and reviews. One unaddressed disaster can undo years of goodwill. One outstanding event, when properly captured, compounds for years.

**What it includes:**

- Systematic post-event review requests to every client
- Capture and display of internal reviews (submitted through ChefFlow)
- External review monitoring (Google, Yelp, Facebook, Resy, OpenTable)
- Import of external reviews into a unified reputation record
- Chef's ability to respond to reviews
- Public profile display of top reviews
- Reputation trend tracking over time (are ratings improving or declining?)
- Crisis protocol: what to do when something goes very wrong

**ChefFlow coverage: ✅ Built**
Internal reviews from clients, external review import from multiple platforms, unified reviews page, public profile review display, and reputation trend tracking are all implemented.

**Gaps:** Automated post-event review requests (currently manual). No direct Google Business Profile API integration. No in-platform review response workflow.

**What breaks if neglected:** Good events happen and leave no trace. Bad reviews go unanswered. The chef's Google rating drifts without them noticing. New clients cannot find evidence that the chef is excellent.

---

## 1.7 Emergency Coverage

> The chef will get sick. A family emergency will happen. The question is not whether — it is whether there is a plan.

**What it includes:**

- A list of trusted colleagues who can cover at short notice
- A handoff document: what the cover chef needs to know (menu, client notes, kitchen layout, key contacts)
- Client notification templates for unexpected coverage situations
- Emergency rescheduling workflow
- Clear policy communicated to clients in the contract about force majeure situations
- Chef's own criteria for when to push through vs. when to call for coverage

**ChefFlow coverage: ❌ Missing**
The chef network and connections system exists for professional discovery. But there is no structured emergency coverage workflow, no handoff document generator, and no client notification flow for illness-related cancellations.

**What breaks if neglected:** The chef gets sick night-of a $4,000 dinner party. They have no coverage contact. They have no way to communicate professionally with the client. The event is cancelled in chaos. The client tells ten people.

---

## 1.8 Financial Close Per Event

> Every event must end with a complete financial record before it is marked complete. Money in, money out, everything reconciled.

**What it includes:**

- Balance payment collection or confirmation before completion
- Tip recording
- Grocery receipt reconciliation (what was actually spent vs. quoted food cost)
- Final ledger balance = $0 outstanding (or documented exception)
- Client receipt generated and delivered
- All expense receipts scanned and categorized
- Event marked complete only after financial closure is confirmed

**ChefFlow coverage: ⚠️ Partial**
Offline payment recording, tip logging, AI-powered receipt scanning, and expense categorization are all built. Client receipt PDF generation exists. However, the event can be marked `completed` with an outstanding balance — there is no enforced financial closure gate.

**What breaks if neglected:** Events are closed without collecting the final payment. The chef realizes weeks later that a client owes $400. Confronting this becomes awkward. Cash flow suffers.

---

# TIER 2 — OPERATIONAL CORE

**If these fail, individual events go badly. This is the machinery of service delivery.**

---

## 2.1 Menu Design and Client Approval

> The menu is the product. It must be designed with the client's specific needs in mind, documented precisely, approved before any food is purchased, and locked before prep begins.

**What it includes:**

- A recipe library with method notes, timing, allergen flags, and dietary tags
- Menu templates that can be reused and customized per event
- Per-dish component tracking (each dish has 2-6 components, each with prep requirements)
- Allergen and dietary mapping at the dish and menu level
- A formal "client approves this menu" step before the menu is locked
- Menu version history (what changed between draft v1 and final)
- Make-ahead component identification (what can be prepped days in advance)
- Seasonal dish palette suggestions

**ChefFlow coverage: ⚠️ Partial**
The full culinary data model, recipe library, allergen/dietary flags, seasonal palettes, and make-ahead tracking are all built. The post-event debrief writes recipe notes back to the recipe record.

**Gap:** There is no formal "client approves menu" workflow step before the menu is locked. Menus can be edited up to the day of the event with no lock mechanism.

**What breaks if neglected:** The chef preps a dish the client assumed had been changed. A dietary restriction is missed. The chef discovers the night before that the client was expecting something different from what was planned.

---

## 2.2 Day-Of Document Suite

> Six documents must be ready and correct before the chef leaves for the event. If any one is missing, incomplete, or wrong, the event is harder than it needs to be.

**The six documents:**

| Document            | Audience           | Purpose                                                   |
| ------------------- | ------------------ | --------------------------------------------------------- |
| Grocery List        | Chef (shopping)    | What to buy, where, budget, organized by store stop       |
| Prep Sheet          | Chef (at-home)     | At-home vs. on-site tasks, priority order, departure time |
| Packing List        | Chef (loading car) | Food by transport zone, equipment, verification counts    |
| Execution Sheet     | Chef (on-site)     | Clean timeline, fire order, allergen warnings             |
| Front-of-House Menu | Client (table)     | What's being served, beautifully formatted                |
| Receipt / Invoice   | Client (payment)   | Financial summary, amounts paid, balance due              |

**ChefFlow coverage: ✅ Built**
All six documents are implemented as generated PDFs. The grocery list handles stop-by-stop organization. The prep sheet has AT HOME / BEFORE LEAVING / ON-SITE sections with priority ordering. The packing list has transport zones (cold, frozen, room_temp, fragile, liquid) with equipment from three sources. The FOH menu auto-delivers to the client at confirmation.

**Gaps:** Interactive digital check-off on the prep sheet. Carry-forward detection for the grocery list (items in the pantry from a previous event). `visit_count` tracking for first-time venue warnings.

**What breaks if neglected:** The chef arrives at the event and realizes they didn't pack the immersion circulator. Or buys ingredients they already had at home. Or the client's table has no menu because the FOH doc wasn't generated.

---

## 2.3 Procurement and Shopping

> The grocery run is the most expensive, time-consuming, and error-prone step of every event. An undisciplined procurement process directly costs money.

**What it includes:**

- Finalized grocery list with quantities pulled from recipe ingredients, scaled to guest count
- Budget guardrail (estimated food cost vs. quoted amount)
- Store routing (which items come from which store, in travel order)
- Staple deduction (don't buy what you already have)
- Substitution recording (what was actually bought vs. what was listed)
- Post-shopping receipt capture with AI line-item extraction
- Expense categorization: groceries, protein, produce, dry goods, specialty
- Ingredient price history for future quote accuracy
- Leftover ingredient logging after the event

**ChefFlow coverage: ⚠️ Partial**
Grocery list generation, AI receipt scanning with line-item extraction, expense categorization, ingredient price history, substitution recording, and leftover capture are all built.

**Gap:** The grocery list is stateless — it generates on demand but has no "shopping complete" confirmation. There is no pantry/inventory system to deduct on-hand items. Every event starts from zero.

**What breaks if neglected:** The chef buys $80 of olive oil they already have. Or arrives at the event missing a key protein because it wasn't on the list. Or spends 30 minutes re-calculating what they need because there's no reliable list.

---

## 2.4 Scheduling and Availability

> The chef has one body. They can only be in one place. Double-booking is not a minor inconvenience — it is a business-ending failure.

**What it includes:**

- A calendar view of all events by date
- Hard enforcement: no two confirmed events on the same date
- Soft-hold for proposed events (prevent other bookings from being confirmed on that date)
- Prep buffer blocks (the day before a major event should not accept a second event)
- Recovery buffer blocks (the day after a demanding event)
- Minimum lead time (the chef needs at least X days to plan properly — bookings cannot be confirmed within this window without explicit override)
- Maximum events per week / month thresholds
- Calendar export for external tools (iCal, Google Calendar)

**ChefFlow coverage: ❌ Missing — CRITICAL**
The events table has `event_date` but no `start_ts / end_ts`. There is no overlap detection, no soft-hold, and no calendar integration. Multiple events can share the same date with no enforcement or warning.

**This is the single highest-priority missing feature in Tier 2.**

**What breaks if neglected:** The chef accepts two events on the same night. This has happened. It will happen again without a system.

---

## 2.5 Time Tracking Per Event

> If the chef doesn't know how many hours each event actually takes, they cannot know their true hourly rate. A $3,000 event that takes 22 hours is $136/hr. A $2,000 event that takes 8 hours is $250/hr.

**What it includes:**

- Phase-level time tracking: shopping, prep, travel, setup, service, cleanup, debrief
- Comparison of actual time vs. historical average for the same event type
- Cumulative hours per period (monthly, annual)
- Effective hourly rate calculation per event
- Labor cost as a percentage of revenue
- Insights by event type: dinner parties take X hours on average; corporate events take Y

**ChefFlow coverage: ✅ Built**
Phase-level time fields, insights analytics with phase time breakdowns and service-minutes-per-guest, and automated time tracking reminders are all built.

**Gaps:** No live timer / stopwatch for real-time tracking during the event. Manual entry only.

**What breaks if neglected:** The chef doesn't know they're effectively working for $90/hr because an event type consistently runs long. Pricing is never adjusted to reflect reality.

---

## 2.6 Post-Event Debrief (After Action Review)

> Every event is an opportunity to improve. Without a structured debrief, lessons evaporate by the next morning. With one, the chef gets better every single time.

**What it includes:**

- Rating dimensions: calm under pressure, preparation quality, execution quality, client satisfaction
- What went well (positive reinforcement)
- What broke or was forgotten (feeds the non-negotiables checklist)
- Recipe adjustments (what to change next time you make this dish)
- Client observations (new preferences noted, relationship signals)
- Would you do this event type again? Under what conditions?
- Historical trend of AAR ratings over time (are things improving?)

**ChefFlow coverage: ✅ Built**
The post-event debrief system is complete. It uses fill-in-the-blanks detection (only shows gaps, not a full form), writes back to recipes, clients, and the events table, feeds the forgotten items analysis, and tracks AAR rating trends over 12 months.

**What breaks if neglected:** The chef makes the same mistake at the same client's house for the third time. A dish that failed twice keeps appearing on menus. Lessons learned die with the event.

---

## 2.7 Client Communication During Events

> Clients have questions before, during, and after their event. Unanswered questions create anxiety and reduce perceived value.

**What it includes:**

- Real-time chat between chef and client
- File and image sharing in chat (menu updates, shopping confirmations)
- Message history preserved and searchable
- Typing indicators and read receipts
- Clear communication about what stage the event is in (confirmed, shopping, prepping, en route)
- Post-event thank-you and follow-up
- Inquiry response templates for common questions

**ChefFlow coverage: ✅ Built**
Real-time chat with file/image sharing, history, typing indicators, presence, search, and template-based drafting are all operational.

**What breaks if neglected:** Clients feel ignored. They don't know if the chef received their dietary update. They email and text and call, creating chaos and a perception of disorganization.

---

# TIER 3 — BUSINESS MANAGEMENT

**If these fail, the business degrades slowly and quietly until it is too late to reverse.**

---

## 3.1 Client Relationship Intelligence

> The best private chef businesses are built on deep relationships. Clients return not because the food was good — but because the chef remembered that their daughter is lactose intolerant and their husband won't drink Chardonnay.

**What it includes:**

- Complete profile per client: name, contact, location, dietary restrictions, allergies, preferences, occasion history
- Kitchen notes (equipment available, oven model, parking instructions)
- Household notes (pets, access codes, table setup preferences)
- Personal milestones: birthdays, anniversaries, children's names
- Event history: every event, date, menu, amount spent
- Lifetime value calculation (total revenue from this client)
- Loyalty tier and points balance
- Fun Q&A capture (personal interest questions that deepen the relationship)
- Dormancy detection (hasn't booked in X months → flag for re-engagement)
- Client financial behavior (payment speed, tip patterns, deposit compliance)

**ChefFlow coverage: ✅ Built**
All of the above is implemented. Client profiles, dietary/allergy/preference data, kitchen notes, milestones, event history, LTV computed by trigger, loyalty program with configurable tiers, fun Q&A, activity tracking, dormancy detection, and financial behavior tracking are all operational.

**Gaps:** No retainer/subscription client management. No multi-location support per client (clients with multiple homes have one profile).

**What breaks if neglected:** The chef asks a client if they have any allergies at their fifth dinner together. The client's anniversary is in two weeks and the chef doesn't know to reach out. A loyal client books elsewhere because they felt like just another booking.

---

## 3.2 Financial Reporting and P&L

> The chef must know, at any moment, whether they are making money. Not just whether revenue is coming in — but whether each event type, each client, and each month is actually profitable.

**What it includes:**

- Revenue tracking by period, client, and event type
- Expense tracking by category with receipt documentation
- Per-event P&L: service fee received minus food cost (gross margin)
- Business-level monthly P&L (all revenue minus all expenses)
- Revenue goal tracking (actual vs. target)
- Top clients by revenue, top event types by margin
- Seasonal patterns (which months are slow, which are peak)
- Financial export for accountant (CSV)

**ChefFlow coverage: ⚠️ Partial**
The ledger is immutable and accurate. Revenue tracking, expense categorization, goals, seasonal patterns, top client rankings, and export are all built.

**Gaps:** No per-event P&L view (food cost vs. service fee margin in a single view per event). No business-level P&L statement (total revenue minus total expenses = net income).

**What breaks if neglected:** The chef thinks they're thriving because revenue is up 20%. But food costs went up 35% and effective hourly rate is down. They don't notice until the bank account tells them.

---

## 3.3 Tax Preparation

> April is not the time to reconstruct a year of finances. Tax preparation is a year-round discipline, not an annual emergency.

**What it includes:**

- Annual income summary (total gross receipts, categorized by quarter)
- 1099-ready summary (total earned from each payment method, deductible amounts)
- Self-employment tax estimation (15.3% on net earnings)
- Mileage log: event date, destination, miles driven, IRS rate applied
- Categorized expense report mapped to IRS Schedule C categories:
  - Cost of goods sold (food and supplies)
  - Meals and entertainment (tastings, business meals)
  - Vehicle (mileage or actual)
  - Home office (if applicable)
  - Equipment and depreciation
  - Professional services (accountant, legal)
  - Marketing and advertising
  - Insurance
  - Education and training
- QuickBooks / Wave / FreshBooks export (or compatible format)

**ChefFlow coverage: ❌ Missing**
Financial export as CSV exists. Expense categories are rich and well-structured. But no 1099 summary, no self-employment tax estimate, no mileage log, and no accounting software integration exist.

**What breaks if neglected:** The chef hands a box of receipts to their accountant in April and pays $800 for bookkeeping that should have been zero. Or worse — misses deductions because records weren't kept, and overpays the IRS by thousands.

---

## 3.4 Automation and Follow-Up Rules

> The chef cannot personally follow up on every lead, every unpaid invoice, every dormant client, and every post-event review request. These must run automatically.

**What it includes:**

- Quote expiry reminders to clients (before auto-expiry)
- Payment reminders at configurable intervals before the event
- Post-event review request (3 days after completion)
- Inquiry auto-expiry (no response in X days → closed)
- Client dormancy alert to chef (client hasn't booked in 6 months)
- Follow-up sequence on sent quotes that haven't been accepted
- Per-client opt-out from automated emails
- Rule builder for custom automation logic

**ChefFlow coverage: ✅ Built**
The full automation engine with built-in rules, a custom rule builder with guided dropdowns, cooldown deduplication, execution logs, and per-client email opt-out are all operational after the automations overhaul.

**Gaps:** No SMS automation channel. No conditional sequences (if client doesn't open reminder 1, send reminder 2 with different copy).

**What breaks if neglected:** Quotes expire without warning. Invoices go unpaid because no one followed up. Clients who would have re-booked forgot about the chef because they never heard back.

---

## 3.5 Partner and Referral Network

> The majority of private chef clients come from referrals. Knowing which sources generate which revenue — and nurturing those sources — is fundamental to sustainable growth.

**What it includes:**

- Partner profiles: event planners, concierges, florists, venues, real estate agents, nannies
- Attribution: which partner sent which client, which events resulted
- Revenue by partner source
- Partner performance reporting (shareable link)
- Acknowledgment workflow (did the chef thank the referral source?)
- Partner-specific notes and relationship history

**ChefFlow coverage: ✅ Built**
Partner profiles, attribution, revenue tracking, analytics, shareable report links with token-based access, and bulk event assignment are all built.

**Gaps:** No formal partner portal (partners view only a shared link, cannot log in). No commission / kickback tracking.

**What breaks if neglected:** A hotel concierge who sent three clients in a row never hears from the chef again. They send the next three to someone else. The chef's best lead source dries up and they don't know why.

---

## 3.6 Goals and Business Planning

> Without a target, every month is just survival. With one, every month has a measurable progress signal.

**What it includes:**

- Annual revenue target broken into monthly milestones
- Booking count targets (events per month)
- New client acquisition goals
- Repeat booking rate targets
- Revenue gap analysis ("you need $4,200 more this month — here's how many events that is at your current rate")
- Pricing scenario modeling ("if I raise my per-person rate by $30, how does that change my required event count?")
- Specific dormant client outreach recommendations to close gaps
- Progress snapshots with trend history

**ChefFlow coverage: ✅ Built**
The multi-goal system with six goal types, a 4-step setup wizard, monthly snapshot history, 5-scenario pricing tables, and dormant client suggestion cards are all operational.

**What breaks if neglected:** The chef works hard without knowing whether the work is moving in the right direction. A slow month feels like failure. A busy month feels like success. Neither impression is calibrated.

---

## 3.7 Contracts and Legal Documents

> A handshake is not a contract. Every event requires a written agreement — not because clients are untrustworthy, but because clarity prevents conflict.

**What it includes:**

- Contract templates with variable fields: client name, event date, location, scope, menu summary, payment terms, cancellation policy
- E-signature workflow (client signs digitally; signature is timestamped and stored)
- Contract stored and linked to the event record
- Cancellation policy embedded and legally enforceable
- Change request addenda (new agreement if scope changes materially)
- Version history (who signed what on what date)
- NDA option for high-profile clients

**ChefFlow coverage: ❌ Missing**
The cancellation policy engine exists and is displayed to clients on the payment page. But there are no contract templates, no e-signature integration, and no stored contracts linked to events.

**Recommended integration:** HelloSign or DocuSign API, or a simpler approach: chef composes contract from template → PDF generated → client timestamp-accepts via a secure link → stored against the event.

**What breaks if neglected:** A client cancels two days before and demands a full refund. There is no signed agreement that defines the cancellation policy. The chef is in a dispute with no documentation.

---

# TIER 4 — GROWTH ENGINE

**If these fail, the business stagnates. Revenue plateaus. New clients don't come. The business becomes a treadmill.**

---

## 4.1 Lead Pipeline Analytics

> Knowing that 40 inquiries came in last quarter means nothing if you don't know that 30% became quotes, 15% became bookings, and that the ones who ghosted all came from Instagram.

**What it includes:**

- Conversion rate at each pipeline stage (inquiry → quote → accepted → paid)
- Win/loss analysis (why did leads go cold? what stage do most drop off?)
- Source attribution (which channels produce the highest-converting leads?)
- Follow-up timing analysis (leads contacted within 2 hours convert at 3x the rate of leads contacted after 24 hours)
- Average time from inquiry to booking
- Average deal size by source
- Lead volume trends (is the pipeline growing?)

**ChefFlow coverage: ⚠️ Partial**
The inquiry FSM tracks stages. Source attribution exists. The unified inbox handles threading. The insights page has some conversion data.

**Gaps:** No formal conversion funnel view. No win/loss reason capture. No source-to-conversion ROI analysis.

**What breaks if neglected:** The chef spends 4 hours a week on Instagram because "that's where clients come from" — but actually 80% of their bookings come from a hotel concierge who needs a thank-you gift and more relationship investment.

---

## 4.2 Email Broadcast and Campaigns

> The chef's existing client list is the most valuable asset they have. Most of them would book again — they just need a reason to remember.

**What it includes:**

- Email broadcast to all clients or a defined segment (all clients who haven't booked in 6 months)
- Seasonal promotions (summer menu launch, holiday availability announcement)
- Re-engagement campaigns (we miss you — here's something special)
- Event-triggered campaigns (client birthday is in 3 weeks → send a note)
- Campaign performance tracking (opens, clicks, bookings generated)
- Unsubscribe management (CAN-SPAM compliance)
- Template library for common campaign types

**ChefFlow coverage: ❌ Missing**
The transactional email system is complete (event confirmations, payment receipts, etc.). But there is no broadcast or marketing email capability.

**What breaks if neglected:** The chef has 200 past clients who loved their service, and those 200 people never hear from them again unless they remember to reach out individually. A seasonal campaign could book 8 events in a week. That opportunity doesn't exist without a broadcast system.

---

## 4.3 Social Media Content Engine

> Social media is the chef's portfolio in motion. It is evidence of craft, consistency, and creativity to every potential client who looks them up.

**What it includes:**

- Annual content calendar with 52 planned posting weeks
- Content vault: event photos, dish photos, behind-the-scenes videos, quotes, testimonials
- Post drafting with platform-specific caption and hashtag sets (Instagram, TikTok, Facebook, Pinterest)
- Scheduling queue with publication timing
- **Actual publishing to platforms** (not just queue management — the content reaches its destination without manual steps)
- Performance tracking (reach, engagement, saves, profile visits)
- Content repurposing: event photos → social posts → email campaign → website update
- Hashtag strategy and audience signal analysis

**ChefFlow coverage: ⚠️ Partial**
The social queue system with annual generation, content vault, post editing, preflight gates, hot-swap workflow, and CSV export by platform is all built. However, **publishing is not implemented** — content is queued and exported as CSV for manual upload to scheduling tools like Buffer or Later.

**Gaps:** No direct API connection to Instagram, TikTok, or Facebook. The queue system is sophisticated but stops at the last mile.

**What breaks if neglected:** Photos from beautiful events sit on the chef's phone. The public portfolio shows nothing. Potential clients who look them up see a sparse profile and move on.

---

## 4.4 Public Profile and Discovery

> The chef's public page is their storefront. Someone who hears about them through a referral will look them up before calling. What they find determines whether they contact the chef at all.

**What it includes:**

- Public chef profile at a memorable URL (cheflowhq.com/chef/[name])
- High-quality bio, cuisine style, service description
- Portfolio gallery (a selection of past event photos, with client permission)
- Embedded public inquiry form
- Reviews displayed prominently
- Availability indicator ("accepting new bookings for Q3")
- SEO-optimized (shows up when someone searches "private chef [city]")
- Connection to the chef's external website

**ChefFlow coverage: ✅ Built**
Public profile page, public inquiry form, network opt-in/out, and the integration platform plan are all built.

**Gaps:** No public portfolio/gallery (event photos are private). No availability indicator. SEO meta tags are basic and not optimized for local search.

**What breaks if neglected:** Referrals look the chef up and find a page that doesn't inspire confidence. Or they can't find the page at all because it doesn't rank for local searches.

---

## 4.5 Gift Cards and Loyalty Programs

> Gift cards require zero chef time to sell and can be redeemed months later. Loyalty tiers give existing clients a reason to stay loyal rather than try someone new.

**What it includes:**

- Self-serve gift card purchase page (client buys a gift card without chef involvement)
- Gift card issuance and delivery via email
- Redemption at checkout with ledger credit
- Loyalty points accumulated on every booking
- Tier progression (bronze → silver → gold → platinum) based on lifetime spend
- Tier-specific perks (priority booking, complimentary courses, anniversary gifts)
- Milestone rewards (10th event, birthday perk, referral bonus)

**ChefFlow coverage: ✅ Built**
Gift card purchase, issuance, and redemption workflows, the loyalty program with configurable tiers, points per dollar, and milestone rewards are all operational.

**Gaps:** No public-facing self-serve gift card purchase page (gift cards can be issued by the chef, but clients cannot purchase on their own).

**What breaks if neglected:** A client's spouse wants to give a private chef experience as a birthday gift. They cannot buy it online. They email the chef on a Sunday. The chef misses it. The booking never happens.

---

## 4.6 Reviews and Public Reputation

> Revenue at the end of the year is largely a function of reviews collected all year. Reviews are compounding — the chef with 80 five-star reviews will convert referrals at a higher rate than the chef with 8.

**What it includes:**

- Post-event review request sent automatically at a defined interval after completion
- Internal review collection (star rating + written feedback)
- External review monitoring (Google Business Profile, Yelp, Facebook)
- Import of external reviews into a unified reputation record
- Chef's ability to respond to reviews from within the platform
- Reviews displayed on the public profile
- Reputation score trend over time (rolling 12-month average)

**ChefFlow coverage: ✅ Built**
Internal review collection, external review import, unified reviews page, and public profile display are all built.

**Gaps:** Automated post-event review request (currently manual). No direct Google Business Profile API. No in-platform review response UI.

**What breaks if neglected:** Review volume stays low because clients intend to leave one but forget. The chef has 200 happy past clients and 12 reviews. That ratio hurts conversion.

---

# TIER 5 — OPTIMIZATION

**If these fail, the business is chronically inefficient. Time is wasted. Money is left on the table. Stress accumulates.**

---

## 5.1 Inventory and Pantry Management

> Every event that starts with a blank grocery list re-buys everything. Every event that checks what's on hand first saves money and a second shopping trip.

**What it includes:**

- On-hand pantry inventory (staples, leftover event ingredients, specialty items)
- Carry-forward detection: when generating a grocery list, check pantry first and deduct what's on hand
- Post-event leftover logging: ingredients not used get added to pantry inventory
- Expiration date tracking with alerts for near-expiry items
- Reorder thresholds for high-frequency staples (fleur de sel, olive oil, parchment paper)
- Cost basis for on-hand items (for accurate per-event COGS)

**ChefFlow coverage: ❌ Missing**
The grocery list generator has a placeholder for this. The `unused_ingredients` table exists in the schema. But no inventory system, pantry UI, or carry-forward logic has been built.

**What breaks if neglected:** The chef buys 6 eggs when they have 14 at home. Buys high-quality olive oil for the third time this month. Throws away $40 of expensive mushrooms that were left over from last week and never used. Multiplied across 80 events per year, this is real money.

---

## 5.2 Equipment Inventory and Maintenance

> Equipment fails at the worst possible moment when it's not tracked. And nobody can claim a replacement on insurance without an inventory list.

**What it includes:**

- Master equipment list: every item the chef owns and uses professionally
- Condition tracking (excellent, good, needs repair, needs replacement)
- Maintenance schedule: knife sharpening, cutting board oil, deep cleaning dates
- Damage logging from post-event debriefs (client's dog knocked over the induction burner)
- Missing item alerts (item was packed but not returned — where is it?)
- Insurance inventory list (for replacement claims)
- Expansion planning: rent vs. buy decision tracker

**ChefFlow coverage: ❌ Missing**
Equipment is tracked only at the event level (what to bring to this specific event). No master inventory, condition tracking, maintenance log, or replacement planning exists.

**What breaks if neglected:** The chef shows up to an event and their immersion circulator doesn't work. It needed maintenance 6 months ago but no one tracked it. Or they spend 20 minutes looking for a piece of equipment that was left at a client's house three events ago.

---

## 5.3 Subscription and Retainer Client Billing

> Weekly meal prep clients are the most stable revenue a private chef can have. Managing them with individual events is possible but inefficient. They need a dedicated billing model.

**What it includes:**

- Recurring service agreements (weekly, bi-weekly, monthly)
- Automatic billing at the start of each service period
- Automatic event creation per service date
- Priority calendar blocking for retainer clients
- Retainer discount tier (clients who commit to recurring service get a preferred rate)
- Agreement modification workflow (adjusting scope, pausing, cancelling)
- Retainer client distinction in analytics (MRR vs. project revenue)

**ChefFlow coverage: ❌ Missing**
Individual events are fully supported. Recurring billing, subscription management, and retainer workflows do not exist. Stripe has native subscription support — the integration is buildable.

**What breaks if neglected:** The chef with 3 weekly meal prep clients creates a new event manually each week, invoices manually each week, and chases payment manually each week. 3 clients × 52 weeks = 156 manual invoicing operations per year that should be zero.

---

## 5.4 Template and Knowledge Library

> Every time the chef writes the same response from scratch, they're wasting time that a saved template could give back. Every lesson that isn't written down is forgotten within a week.

**What it includes:**

- Response templates: inquiry acknowledgment, quote follow-up, payment reminder, post-event thank-you
- SOP documents: how to set up for a formal dinner, how to handle a dietary emergency on-site, how to handle a last-minute guest count increase
- Chef journal: private space for reflection, growth observations, lessons from difficult events
- Recipe library (as a culinary knowledge base, not just a document)
- The AI agent brain: encoded business rules, pricing logic, communication style, edge cases

**ChefFlow coverage: ⚠️ Partial**
Response templates exist. The AI agent brain is built (static documents, not dynamically updated). The chef journal exists. The recipe library is the culinary knowledge base.

**Gaps:** No SOP builder for operational procedures beyond recipes. The agent brain is static — chef feedback from events doesn't automatically improve it.

**What breaks if neglected:** Every inquiry gets a different response depending on how tired the chef is. The chef re-invents the same mental process every time something goes slightly wrong on an event. Institutional knowledge exists only in the chef's head.

---

## 5.5 Scheduling Intelligence

> It is not enough to know what events exist. The system must understand that the chef needs time before, between, and after events — and enforce it automatically.

**What it includes:**

- Prep buffer enforcement: the day before a 12-person dinner party should not accept another event without an explicit override
- Recovery buffer: the day after a demanding event should not be booked for prep-heavy work
- Minimum lead time: the system should refuse to confirm events booked with less than X days notice unless overridden
- Capacity thresholds: the chef can comfortably do N events per week before quality degrades
- Seasonal availability adjustment: more capacity in summer, less in winter (or vice versa)

**ChefFlow coverage: ❌ Missing**
This connects directly to the critical gap in Tier 2.4 (Scheduling and Availability). Nothing in this domain is built.

**What breaks if neglected:** The chef accepts a last-minute event with 6 hours notice and has no time to shop, prep, or prepare. Or books two events in the same week and delivers the second one exhausted and with lower quality.

---

## 5.6 Mileage and Travel Logging

> Every mile driven for business is a deductible expense. Without a log, the deduction is lost. A private chef can drive 10,000+ business miles per year — at the IRS rate, that is thousands of dollars in deductions.

**What it includes:**

- Trip log linked to events (going to shop, going to client, returning home)
- Auto-populated from event location when possible
- IRS standard mileage rate applied automatically
- Annual mileage summary for Schedule C
- Option to use actual expenses vs. standard mileage method
- Odometer start/end recording for documentation

**ChefFlow coverage: ❌ Missing**
The pricing engine uses mileage to calculate travel costs for quotes. But there is no trip log, no running mileage total, and no tax-year mileage summary.

**What breaks if neglected:** The chef drives 9,000 business miles in a year and has zero documentation. The IRS deduction is worth approximately $5,850 at the 2025 rate. Without a log, the accountant can't use it. That's $5,850 paid in taxes that didn't have to be.

---

# TIER 6 — SCALE

**If these fail, the business hits a ceiling. These matter when the chef is no longer solo.**

---

## 6.1 Team and Assistant Management

> The moment the chef hires a prep cook, a server, or a sous chef — even for one event — they need a system for that person.

**What it includes:**

- Team member accounts with event-scoped access (the assistant can see this event's prep sheet but not the client's payment history)
- Role-based permissions: assistant vs. sous chef vs. event coordinator
- Task assignment with deadlines
- Team communication separate from client communication
- Time tracking for non-chef staff
- Contractor payment tracking (for 1099 reporting if they earn >$600/year)
- Onboarding documentation for new team members

**ChefFlow coverage: ❌ Missing**
The platform is currently single-user per chef tenant. The architecture (tenant scoping, user_roles table) supports multi-user, but no team invitation system, role hierarchy, or permission management exists beyond chef/client.

**What breaks if neglected:** The chef hires a prep cook and texts them the grocery list from their personal phone. The prep cook shows up late because they misread the time. The chef does not have a system for this relationship — just a phone number and a prayer.

---

## 6.2 Emergency Coverage Network

> The chef's trusted peers are also their safety net. A structured coverage protocol turns a disaster scenario into a managed handoff.

**What it includes:**

- Coverage contact list: trusted colleagues with their availability and cuisine specialties
- Handoff document generator: produces a single PDF with everything a coverage chef needs (menu, client profile, kitchen notes, timeline, access instructions)
- Client notification workflow: professional communication explaining the situation without panic
- Rescheduling workflow as an alternative to coverage
- Post-incident documentation (what happened, how it was handled, what to do differently)

**ChefFlow coverage: ❌ Missing**
The chef network and connection system exists for discovery. No coverage workflow, handoff document, or emergency protocol system exists.

**What breaks if neglected:** The chef texts three colleagues at 7pm on a Friday night, panicking, with no documentation, no plan, and no way to brief a cover. The client gets a terrible experience from whoever shows up unprepared.

---

## 6.3 Multi-Brand and Service Line Support

> Some chefs run two distinct service lines: intimate dinner experiences at one price point and corporate catering at another. These require different menus, pricing, branding, and communication styles.

**What it includes:**

- Multiple brand profiles under one operator account
- Separate pricing, menus, and branding per service line
- Separate public profiles and inquiry forms
- Staff assigned to specific lines
- Consolidated financial reporting across all lines

**ChefFlow coverage: ❌ Missing**
Single brand per chef tenant. No sub-brand or service line segmentation exists.

**What breaks if neglected:** The chef's premium intimate dinner brand and their corporate catering brand are mixed in the same client list, the same financials, and the same public profile. High-end private clients see corporate catering references that undercut the luxury positioning.

---

## 6.4 Platform Integrations

> The chef's business does not live only in ChefFlow. Clients schedule calls through Calendly. Accountants use QuickBooks. The chef's schedule should be visible in Google Calendar.

**Priority integration list:**

| Integration                                | Value                                                                               | Priority     |
| ------------------------------------------ | ----------------------------------------------------------------------------------- | ------------ |
| Google Calendar (two-way sync)             | Chef's events appear on personal calendar; blocks from calendar reflect in ChefFlow | **Critical** |
| iCal export / subscription feed            | One-click subscribe for external calendar apps                                      | High         |
| QuickBooks / Wave (financial export)       | Accountant-ready export without re-entering data                                    | High         |
| Calendly / Acuity (intake scheduling)      | Discovery calls book automatically                                                  | Medium       |
| Instagram / TikTok / Facebook (publishing) | Social queue publishes without manual steps                                         | Medium       |
| Zapier / Make (custom automation)          | Chef connects ChefFlow to any other tool                                            | Medium       |
| Square / Clover (POS)                      | On-site point-of-sale for event-day add-ons                                         | Low          |

**ChefFlow coverage: ⚠️ Partial**
Gmail OAuth and Wix webhook ingestion are live. The Integration Platform Master Plan with the provider-agnostic hub architecture is fully designed. Google Calendar sync is designed but not implemented.

---

## 6.5 Advanced Analytics and Forecasting

> At scale, hindsight is not enough. The chef needs to know what is likely to happen next month based on what is in the pipeline today.

**What it includes:**

- Revenue forecasting: pipeline-weighted forward projections (confirmed events + probable conversions)
- Demand forecasting: which months will be slow based on 3 years of history?
- Client lifetime value prediction: which new clients are likely to become repeat bookers?
- Referral channel ROI: which source generates the highest-LTV clients, not just the most inquiries?
- Menu engineering: which dishes correlate with higher tips and repeat bookings?
- Pricing optimization: at what price point does conversion drop and by how much?
- Cohort analysis: do clients acquired in 2024 behave differently from clients acquired in 2022?

**ChefFlow coverage: ⚠️ Partial**
The insights page with 14 analytics dimensions, menu engineering, revenue engine, partner analytics, and the goals system with pricing scenarios are all built and strong for a solo operator.

**Gaps:** No forward revenue forecasting. No cohort analysis. No demand prediction.

---

# Build Priority Matrix

## Do These Now

| #   | Feature                              | Tier | Why                                                            |
| --- | ------------------------------------ | ---- | -------------------------------------------------------------- |
| 1   | Calendar + double-booking prevention | 2    | One double-booking is catastrophic and irreversible            |
| 2   | Contract + e-signature system        | 3    | Every event needs a signed agreement; currently unprotected    |
| 3   | Email broadcast + campaigns          | 4    | 200 past clients, zero outreach capability; direct revenue     |
| 4   | 1099 + tax preparation summary       | 5    | Annual pain point; April is not the time to reconstruct a year |

## Build in the Next 90 Days

| #   | Feature                         | Tier | Why                                                         |
| --- | ------------------------------- | ---- | ----------------------------------------------------------- |
| 5   | Inventory + pantry management   | 5    | Real money wasted every event on re-buying on-hand items    |
| 6   | Subscription + retainer billing | 5    | Weekly clients need automation, not manual invoicing        |
| 7   | Social media publishing         | 4    | Queue system built; last mile is publishing                 |
| 8   | Self-serve gift card purchase   | 4    | Zero-labor revenue; client can buy without chef involvement |

## Build in 6 Months

| #   | Feature                             | Tier | Why                                                          |
| --- | ----------------------------------- | ---- | ------------------------------------------------------------ |
| 9   | Lead conversion funnel analytics    | 4    | Understand which follow-up behaviors actually close business |
| 10  | Mileage log                         | 5    | Thousands in IRS deductions lost without documentation       |
| 11  | Menu approval workflow              | 2    | Client sign-off before menu is locked                        |
| 12  | Per-event P&L view                  | 3    | Margin visibility per engagement                             |
| 13  | Automated post-event review request | 4    | Increases review volume without chef effort                  |
| 14  | Emergency coverage protocol         | 1    | One sick night without a system ends a relationship          |

## Scale Phase

| #   | Feature                                        | Tier | Trigger             |
| --- | ---------------------------------------------- | ---- | ------------------- |
| 15  | Team + assistant management                    | 6    | First hire          |
| 16  | Multi-brand support                            | 6    | Second service line |
| 17  | Platform integrations (QuickBooks, publishing) | 6    | 100+ events/year    |
| 18  | Revenue forecasting + cohort analytics         | 6    | 3 years of data     |

---

# Architectural Principles

Every domain in this system is built on these non-negotiable constraints. Any feature that violates them is rejected:

1. **Tenant isolation is absolute.** Every database row belongs to exactly one chef. No query may cross tenant boundaries. There is no global view of any client data.

2. **The ledger is append-only.** Money is never edited or deleted. A correction is a new ledger entry. The history is permanent.

3. **AI assists, never owns.** No AI output may mutate canonical state without explicit chef confirmation. The chef is always the final authority. Unplug AI — the system must still function completely.

4. **The event FSM is the spine.** Every operational domain connects to event lifecycle state. Documents, payments, communications, and analytics all hang off this backbone. State cannot be skipped or reversed.

5. **All monetary amounts are in cents.** No floating-point arithmetic anywhere in the financial system. $250.00 is stored as 25000.

6. **Server actions for all business logic.** No business logic in client components. Every mutation goes through a `'use server'` action with role checks.

7. **Role checks on every action.** `requireChef()`, `requireClient()`, or `requireAuth()` on every server action without exception. Tenant ID is always derived from the authenticated session, never from user input.

8. **Migrations are additive by default.** New tables, new columns, new indexes. Removing or altering existing structures requires explicit approval and a backup.

---

_This document is the north star for ChefFlow. When in doubt about what to build next, start here. When a feature request arrives, find where it lives in this hierarchy. When something falls through the cracks, find the gap in this document and fix it._
