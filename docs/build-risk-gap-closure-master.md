# ChefFlow Risk Gap Closure — Master Build List

**Source:** Full 20-category risk audit against the Private Chef Business Destruction Framework
**Purpose:** Close every gap identified in the audit. Build what protects the chef, the business, and the person running it.
**Stagnation note:** A 21st theme was added — Professional Momentum — based on the real and common experience of chefs feeling stale, unchallenged, and like they've stopped growing. This is distinct from burnout and distinct from skill gaps. It's the absence of forward trajectory, and it causes silent decline.

---

## How This List Is Organized

Eight build phases, ordered by impact and urgency:

| Phase | Theme                          | Audit Grade | Priority |
| ----- | ------------------------------ | ----------- | -------- |
| 1     | Business Protection Foundation | F / D       | Critical |
| 2     | Operational Safety Net         | D / C-      | High     |
| 3     | Personal Protection Layer      | F / D       | High     |
| 4     | Reputation & Trust Protection  | C- / D      | High     |
| 5     | Financial & Legal Health       | B- / D      | Medium   |
| 6     | Professional Momentum & Growth | C / F       | Medium   |
| 7     | Staff & HR Improvements        | C+          | Medium   |
| 8     | Digital & Portfolio Protection | B- / D      | Medium   |

---

## Phase 1: Business Protection Foundation

_Addresses the most catastrophic gaps — things that can end the business in one event. Chefs run through ChefFlow today without any protection in these areas._

### 1.1 Insurance Module

**Risk category:** 6 (Insurance Gaps) — Grade F
**What it is:** A structured record of every insurance policy the chef holds, with coverage type, carrier, expiry date, and renewal reminders. Not a marketplace — just a tracking layer with an alerting system.

**Build items:**

- Insurance profile section in Settings (or standalone page under Settings > Protection)
- Policy record: type (GL, liquor liability, vehicle, workers comp, professional liability, disability, health), carrier, policy number, coverage limit, expiry date
- Renewal reminders at 90/60/30 days before expiry (notification + email)
- Coverage gap checker — when a chef creates an event, cross-reference the event type against policies on file:
  - Alcohol being served + no liquor liability policy → warning banner on event
  - Staff being brought + no workers comp policy → warning banner
  - Off-site catering + no vehicle use coverage → warning banner
- Coverage gap summary on the dashboard — one card that shows insurance health (green/yellow/red)
- No external API required — this is entirely self-reported data with smart alerting

**Why it matters:** A chef can operate their entire business through ChefFlow today and have zero insurance coverage. One in-home accident ends everything. This is the most preventable catastrophic failure in the audit.

---

### 1.2 Business Health Checklist

**Risk categories:** 6, 16, 17 (Insurance, Legal Structure, Certifications) — All D or F
**What it is:** A single-page checklist that tells a chef whether their business is structurally protected. Persistent, always visible, nags until complete.

**Build items:**

- Business Health page (Settings > Business Health or top-level nav)
- Checklist items (all self-reported, chef checks them off with optional documentation):
  - [ ] LLC or business entity formed
  - [ ] Separate business bank account
  - [ ] General liability insurance active
  - [ ] Food handler certification current
  - [ ] ServSafe (or equivalent) certification current
  - [ ] Signed contract template reviewed by an attorney
  - [ ] Business and personal finances separated
  - [ ] At least one trusted backup chef contact
  - [ ] Emergency business contact documented
  - [ ] Client photo permission policy in place
- Each item: status (complete/incomplete/not applicable), optional note field, optional document upload
- Health score: % complete, shown on dashboard as a card
- Incomplete items surface as a persistent low-priority notification until resolved
- "Not applicable" is a valid state (e.g., chef has employees but no LLC for a solo contractor) — suppresses nagging but logs the decision

**Why it matters:** Most chefs don't know what they're missing. This makes it visible and creates an action list from day one.

---

### 1.3 Certification Tracker

**Risk category:** 17 (Professional Certifications & Standing) — Grade D
**What it is:** A dedicated module for tracking every professional certification — food safety, alcohol service, CPR, culinary credentials, professional memberships — with expiry and renewal reminders.

**Build items:**

- Certifications section (Settings > Certifications, or within Business Health checklist)
- Certification record: name, issuing body, issue date, expiry date, renewal URL or notes, document upload
- Default certification types pre-populated (ServSafe, Food Handler, TIPS/alcohol service, CPR/First Aid, business license)
- Chef can add custom certifications (culinary school diplomas, guild memberships, etc.)
- Renewal reminders: 90/60/30 days (notification + email)
- Event-level certification gate: if event type is "alcohol service," check for active TIPS/alcohol cert. If missing or expired → warning on event form
- Certification health indicator on dashboard (same card family as insurance)
- Integration with Business Health checklist — certifications feed the checklist automatically

**Why it matters:** A chef can be operating illegally without knowing it. This is low-complexity to build and high-value to the chef.

---

### 1.4 NDA Management

**Risk category:** 3 (Client Trust & Confidentiality) — Grade C
**What it is:** A per-client record of whether an NDA exists, what it covers, and when it expires. Connected to the photo system and the social composer.

**Build items:**

- NDA toggle on client profile (yes/no/in negotiation)
- NDA detail fields: coverage scope (photos, mentions, all information), effective date, expiry date (or perpetual), document upload
- Photo permission field on client profile — separate from NDA:
  - Options: No photos permitted / Chef use only (portfolio, not public) / Public with approval / Public freely
  - This field travels with the client and applies to all events
- Social composer pre-flight: when adding a photo to a post, check originating client's photo permission. If "no photos" → block. If "with approval" → prompt for confirmation. Log the decision.
- Event gallery: photos tagged to clients inherit client's permission status. Restricted photos show a lock icon and cannot be downloaded or shared from the gallery without explicit override.
- NDA breach alert: if a chef attempts to post, share, or export content linked to a client with an active NDA → hard warning with NDA details shown

**Why it matters:** A single NDA violation can result in a lawsuit and career-ending reputation damage in the private chef network. The system should make compliance automatic, not manual.

---

### 1.5 Incident Documentation Module

**Risk categories:** 1, 2 (Food Safety, Physical Safety)
**What it is:** A formal log for any in-service incident — food safety issue, guest injury, equipment failure, near-miss. Creates a paper trail, tracks resolution, and preserves the chef's account of events.

**Build items:**

- Incident report form (accessible from event detail page and from a top-level Safety menu)
- Fields: incident date/time, event ID (optional link), incident type (food safety / guest injury / property damage / equipment failure / near-miss / other), description, parties involved, immediate action taken, follow-up steps, resolution status, documentation uploads (photos, medical reports, etc.)
- Incident log page — private to the chef, never shared, full history
- Resolution tracking — open / in progress / resolved
- Export function — PDF export of a single incident report (for insurance claims, legal purposes)
- Link to event record — incident appears as a timeline entry on the linked event
- Reminder system — open incidents with pending follow-up steps trigger reminders

**Why it matters:** If something goes wrong, the chef's contemporaneous written account is the most important document they have. The system should make it easy to create one immediately, not as an afterthought.

---

## Phase 2: Operational Safety Net

_Addresses failures that don't end the business in one event but erode it reliably over time, or create single-event catastrophes from preventable operational gaps._

### 2.1 Pre-Service Kitchen Safety Checklist

**Risk category:** 2 (Physical Safety & Accidents) — Grade D
**What it is:** A required checklist completed before service begins at any client location. Confirms the chef has assessed the kitchen for basic safety.

**Build items:**

- Pre-service checklist in event DOP (Day-of-Protocol) section, required before event status advances to `in_progress`
- Default checklist items:
  - [ ] Fire extinguisher location confirmed and accessible
  - [ ] Gas shutoff valve located
  - [ ] First aid kit present (chef's own kit)
  - [ ] Slip hazards identified and mitigated
  - [ ] Smoke detector functional (test if accessible)
  - [ ] Client emergency contacts confirmed
  - [ ] Allergy/dietary restrictions reviewed with household contact
  - [ ] Exit routes clear
- Chef can add custom items per event
- Skippable with override (e.g., recurring client with known-safe kitchen) but override is logged
- Completion recorded as a DOP milestone

**Why it matters:** In-home kitchens vary enormously. A systematic pre-service check creates both safety and legal protection.

---

### 2.2 Alcohol Service Log

**Risk category:** 2, 4 (Physical Safety, Legal & Regulatory) — Grade D
**What it is:** A service-time log of alcohol served at events, creating a liability protection record.

**Build items:**

- Alcohol service toggle on event form ("Alcohol being served at this event?")
- If yes: TIPS/alcohol service certification check (from Category 1.3) + permit check
- During service: optional alcohol log (accessible from mobile event view)
  - Log entries: time, drink type, guest count served
  - "Last call" timestamp
  - Notes (any guest concerns noted)
- This is entirely optional to use during service — the point is that the option exists and creates a habit
- Log stored with event record, private to chef

**Why it matters:** Dram shop liability is real. A timestamped record of responsible service is a meaningful legal defense.

---

### 2.3 Backup Chef Protocol

**Risk category:** 7 (Operational Failures) — Grade C-
**What it is:** A structured contact list of trusted substitute chefs, with their specialties and a handoff protocol for when the chef cannot execute a booked event.

**Build items:**

- Backup Chef section in Settings > Operations
- Backup chef record: name, phone, email, cuisine specialties, service sizes they can handle, relationship (colleague, former employee, culinary school contact), availability notes
- Per-event: "Backup plan" field on event detail — who would cover this event if needed, and what do they need to know
- Emergency handoff checklist template (pre-built, customizable):
  - [ ] Client contacted and situation explained
  - [ ] Backup chef briefed (menu, allergies, logistics)
  - [ ] Client intro made
  - [ ] Access to event documents shared
  - [ ] Payment arrangement confirmed with backup
- If event status is approaching and chef marks themselves unavailable → system surfaces the backup contact and the handoff checklist

**Why it matters:** Canceling a confirmed event with no viable substitute is career-defining in the worst way. This makes the backup system explicit and actionable.

---

### 2.4 FDA/USDA Recall Monitoring

**Risk category:** 1 (Food Safety) — Grade C+
**What it is:** Integration with FDA and USDA recall feeds to alert chefs when an ingredient they commonly use or have recently purchased is under active recall.

**Build items:**

- Background service polling FDA Recalls API and USDA FSIS Recall API (both free, public)
- Chef maintains a "common ingredients" list (already partially exists via recipe library)
- Recall matching: new recall alerts are checked against the chef's ingredient library and recent grocery/recipe activity
- Alert surfaces in dashboard notification and optionally via email/push
- Recall detail page: product name, UPC/lot codes, recall reason, what to do
- "Mark as reviewed" to dismiss
- No ongoing purchases required — the system checks what the chef cooks with

**Why it matters:** Ignorance of a recall is not a legal defense. One contaminated product served to a client is a food safety incident. This is preventable with a simple feed integration.

---

### 2.5 Scope Drift Detection

**Risk category:** 7 (Operational Failures)
**What it is:** Automatic comparison of the original quote scope to the current event state. Surfaces when material changes have occurred that weren't formally agreed to.

**Build items:**

- On event detail, compare current values against the quote that converted to this event:
  - Guest count changed by more than ±20% → yellow flag
  - Menu significantly changed (>50% of dishes different) → yellow flag
  - Location changed → blue notice
  - Date changed → blue notice
  - Service hours changed significantly → yellow flag
- Scope drift banner on event header when flags exist: "This event has changed materially from the original quote. Consider issuing an amended quote or change order."
- One-click "Issue Change Order" button → opens a pre-filled quote amendment
- Drift history logged with timestamps

**Why it matters:** Scope creep is one of the most common causes of client resentment and unpaid disputes. Making it visible and addressable prevents it from becoming a relationship-ending surprise.

---

### 2.6 Cross-Contamination Protocol Checklist

**Risk category:** 1 (Food Safety) — Grade C+
**What it is:** A per-event checklist specifically for allergen cross-contamination prevention, separate from the general allergy disclosure process.

**Build items:**

- Appears on event prep when event has guests with allergies on file
- Default items:
  - [ ] Dedicated cutting board for allergen-free prep
  - [ ] Dedicated utensils for allergen-free dishes
  - [ ] Allergen-containing ingredients prepped after safe dishes
  - [ ] Separate serving vessels confirmed
  - [ ] Dish labels prepared for allergen-free items
  - [ ] Verbal confirmation with client on allergen protocol
  - [ ] Chef and staff aware of specific allergens for this event
- Pre-populated with the specific allergens for the event's guests
- Completion logged as a DOP milestone
- Cannot be skipped when allergens are flagged (hard gate)

**Why it matters:** Allergen disclosure is not the same as allergen management. A chef can know about a nut allergy and still cross-contaminate. This makes the protocol physical and documented.

---

### 2.7 Equipment Redundancy Checklist

**Risk category:** 7 (Operational Failures)
**What it is:** A per-event equipment checklist that flags single points of failure in the chef's kit.

**Build items:**

- Equipment section on event prep form
- Chef lists equipment they're bringing to the event
- System flags items with no documented backup:
  - Probe thermometer (critical — flag if only one)
  - Primary knife (flag if no backup)
  - Induction unit (flag if rented/borrowed with no alternative)
  - Portable cooler (flag if used for transport)
- "Backup plan" field for flagged items
- Optional — chef can dismiss flags for familiar setups

---

## Phase 3: Personal Protection Layer

_Protects the person behind the business. The most underbuilt area in ChefFlow. If the chef breaks down, everything breaks down._

### 3.1 Burnout Risk Indicator

**Risk category:** 14 (Mental Health & Burnout) — Grade D
**What it is:** A composite signal that surfaces when a chef is operating at risk of burnout, based on real scheduling and behavioral data already in the system.

**Build items:**

- Burnout signal computed from:
  - Hours booked per week (from time tracking and event duration data)
  - Events per week vs. chef's self-set capacity ceiling (see 3.2)
  - Time since last rest day (from calendar)
  - Goal check-in sentiment trend (from goals system — already exists)
  - Time since last non-work calendar entry
  - Days since last personal journal entry (if chef uses the journal)
- Burnout risk level: Low / Moderate / High (not shown as a scary label — shown as a gentle "wellbeing check")
- Shown on dashboard as a quiet card, not an alarm
- At "High": soft nudge with specific suggestion ("You've worked 14 days straight — you have no events Saturday, consider blocking it")
- Weekly summary email option: "Here's your workload this week and a suggestion for next week"
- All signals are local to the chef — never shared, never visible to admin

**Why it matters:** Burnout in private chefs is severe, common, and almost never caught before it affects quality. The system already has the data to detect it — it just doesn't use it.

---

### 3.2 Capacity Ceiling & Workload Protection

**Risk category:** 5, 13, 14 (Financial Viability, Physical Health, Mental Health)
**What it is:** Chef-configurable limits on how much work they can accept, enforced by the booking and scheduling system.

**Build items:**

- Capacity settings in Settings > Schedule:
  - Maximum events per week (soft limit — warning shown, not hard block)
  - Maximum events per month
  - Maximum consecutive working days
  - Minimum rest days per week
  - Maximum total hours per week (estimated from event durations)
- When a new event is booked or scheduled and it would breach any limit → warning banner: "This booking puts you at [X] events this week, above your limit of [Y]. Proceed anyway?"
- Override is always possible — the point is awareness, not control
- Capacity utilization shown on the dashboard (like a fuel gauge — how full is your schedule vs. your limits?)
- Soft suggestion when consistently ignoring capacity warnings: "You've exceeded your weekly limit 4 weeks in a row"

---

### 3.3 Rest Day & Protected Time Blocking

**Risk category:** 13, 14, 15 (Physical Health, Mental Health, Personal Relationships)
**What it is:** A calendar block type specifically for protected personal time that cannot be booked against without explicit override.

**Build items:**

- New calendar block type: "Protected Time" (distinct from events, prep blocks, etc.)
- Protected time blocks: label (Rest Day / Family / Personal / Health), date/time, recurring option
- Protected time shows on chef's calendar as non-bookable
- If a client or inquiry requests a date with protected time → booking system surfaces a notice: "You have protected time on this date"
- Override requires a deliberate click — not an accidental booking
- Protected time is private — never visible in client portal or shareable availability views
- Recurring protected time setup in onboarding ("When do you want to be off every week?")

---

### 3.4 Shareable Availability View

**Risk category:** 15 (Key Personal Relationships)
**What it is:** A clean, shareable one-page view of the chef's availability that can be sent to family members or partners so they can see when the chef is and isn't working.

**Build items:**

- "Share my schedule" option in calendar settings
- Generates a clean monthly view showing: busy days (events, prep), available days, protected time (shown as "unavailable" without detail)
- No client names, no event details — just working/available/protected
- Shareable as: link (read-only, auto-expiring) or PDF export
- Optionally updatable in real-time (living link) or static snapshot
- "Who can see this?" setting — chef controls whether the link is active

**Why it matters:** A partner who can see the schedule is a partner who can plan around it. Removes the "I didn't know you were working this weekend" friction that strains relationships.

---

### 3.5 Off-Hours Notification Protection

**Risk category:** 14, 15 (Mental Health, Personal Relationships)
**What it is:** A guided setup for when notifications stop, enforced by the notification system.

**Build items:**

- Off-hours setup in onboarding (not optional to skip — must be configured or explicitly dismissed)
- Chef sets: off-hours start time, off-hours end time, off days
- During off-hours: push notifications suppressed, email notifications batched to morning digest
- Exception categories: emergency-flagged notifications still come through (e.g., an event is tomorrow and payment hasn't been confirmed)
- "Do not disturb" visual indicator when off-hours is active
- Client auto-responder: when a client messages during off-hours, they receive a configured auto-response ("I'm offline right now and will respond by [time]")
- This should be a default, not something the chef has to discover and enable manually

---

## Phase 4: Reputation & Trust Protection

_Protects the brand — the most valuable intangible asset in a referral-driven business._

### 4.1 Social Post Pre-Flight Check

**Risk categories:** 3, 10 (Client Trust, Reputation) — Grade C / C-
**What it is:** A guardrail in the social media composer that checks for potential client disclosure before publishing.

**Build items:**

- Pre-flight check runs when a post contains images or is about to be published
- Checks performed:
  - Image linked to a client with "no photos" permission → hard block with explanation
  - Image linked to a client with "approval required" → prompt to confirm approval received, log the confirmation
  - Post text contains a client name or location (basic NLP match against client database) → soft warning
  - Post is tagged with a location that matches a client's address → warning
- Pre-flight results shown in a summary before the publish button is active
- Chef can override soft warnings with a deliberate acknowledgment
- Hard blocks cannot be overridden — the photo must be swapped or the post must be rescheduled
- All pre-flight results logged (what was checked, what was found, what decision was made)

---

### 4.2 Brand Mention Monitoring

**Risk category:** 10 (Reputation & Social) — Grade C-
**What it is:** A background service that monitors the web for mentions of the chef's name, business name, and public handles.

**Build items:**

- Setup: chef provides their full name, business name, public social handles, website URL
- Monitoring via: Google Alerts API equivalent (web search polling), social search for handle mentions
- Alert types: new review found (Google, Yelp, etc.), name mentioned in a web article, social mention found
- Mention feed in app: date, source, excerpt, link, sentiment (positive/neutral/negative — basic classification)
- Response options from feed: mark reviewed, open source URL, flag for response
- Daily or weekly digest option (not real-time for most mentions)
- High-urgency alert (push notification) for: new 1-star review, mention with negative sentiment in a news source

**Why it matters:** Chefs currently find out about reputation damage through word of mouth, which means they find out late. Early detection allows early response.

---

### 4.3 Crisis Response Protocol

**Risk category:** 10 (Reputation & Social) — Grade C-
**What it is:** A pre-built crisis response checklist and communication template library for when something goes wrong publicly.

**Build items:**

- Crisis response section under Settings > Protection (same area as insurance and business health)
- Pre-built crisis response playbook by scenario:
  - Food safety incident
  - Negative viral social post
  - False review campaign
  - Client dispute gone public
  - Social media account hacked
- Each playbook: step-by-step checklist, suggested communications, what NOT to do, timeline guidance (first 2 hours, first 24 hours, first week)
- "Activate crisis mode" button — chef clicks this when something goes wrong. System:
  - Creates a private incident log for this event
  - Shows the relevant playbook
  - Temporarily increases notification monitoring
  - Optionally suppresses scheduled social posts (don't keep posting while a crisis is unfolding)
- Communication templates: holding statement, client apology, social post correction — all require chef to personalize and approve before sending

---

### 4.4 Referral Chain Health Score

**Risk category:** 11 (Relationships & Follow-Through) — Grade B-
**What it is:** A metric that shows whether the chef's referral network is growing, stable, or declining.

**Build items:**

- Referral chain analytics page (or widget on the existing referral tree view)
- Metrics:
  - New referral nodes added this quarter vs. last quarter
  - Active referral nodes (clients referred by someone who have booked in the last 12 months)
  - Dormant referral nodes (referred clients who haven't booked in 18+ months)
  - Referral chain depth (average chain length — client → referred client → their referral, etc.)
  - Top referrers by revenue generated
- Trend chart: referral network size over time
- Alert when referral network is net-shrinking (losing nodes faster than gaining)
- Action suggestions: which dormant referred clients are worth a re-engagement touchpoint

---

### 4.5 Relationship Cooling Alert

**Risk category:** 11 (Relationships & Follow-Through) — Grade B-
**What it is:** An alert when a high-value client has gone quiet — no bookings, no messages, no engagement — for longer than a configured threshold.

**Build items:**

- Cooling threshold configurable per client tier:
  - Tier A clients (top 20% by LTV): alert after 60 days of no contact
  - Tier B clients: alert after 90 days
  - Tier C clients: alert after 180 days
- Cooling alert surfaces as a "relationship health" card in the client dashboard
- Alert includes: last contact date, last booking date, suggested action (touchpoint, check-in, special offer)
- One-click to trigger a follow-up sequence or draft a personal message
- "Intentionally inactive" option — chef can flag a client as intentionally paused (preventing false alerts)

---

## Phase 5: Financial & Legal Health

_Addresses strategic financial health gaps. ChefFlow's financial tracking is strong — these build items add the strategic layer on top._

### 5.1 Client Revenue Concentration Warning

**Risk category:** 5 (Financial & Business Viability) — Grade B-
**What it is:** An alert when the chef's revenue is dangerously concentrated in a small number of clients.

**Build items:**

- Concentration analysis in the finance dashboard
- Alert thresholds (configurable):
  - Any single client >30% of trailing 12-month revenue → orange warning
  - Any single client >50% → red warning
  - Top 3 clients >70% of revenue → orange warning
- Visual: revenue concentration pie chart showing top 5 clients as % of total
- Suggested action when threshold exceeded: "Your business health depends heavily on [Client Name]. Consider a diversification strategy — your revenue path calculator can help model new service slots."
- Link to service mix calculator and revenue path tools (already built)

---

### 5.2 Break-Even Calculator

**Risk category:** 5 (Financial & Business Viability)
**What it is:** A tool that calculates the chef's true cost of service and the minimum revenue needed to cover costs before profit begins.

**Build items:**

- Break-even calculator page under Finance > Planning
- Inputs (all pulled from existing data where available):
  - Monthly fixed costs (equipment, insurance, software, certifications — auto-populated from expense data)
  - Average variable cost per event (ingredients, travel, staff — from event cost history)
  - Average selling price per event type (from quote history)
  - Target income (from goals system)
- Outputs:
  - Break-even events per month by service type
  - Break-even revenue per month
  - Events needed to hit income target
  - Current pace vs. break-even (are they profitable right now?)
- Connects to service mix calculator — "adjust your mix to reach break-even faster"

---

### 5.3 Business Continuity Plan Template

**Risk category:** 5 (Financial & Business Viability)
**What it is:** A structured plan for what happens to the business if the chef is incapacitated for 1 week, 1 month, or permanently.

**Build items:**

- Business Continuity section in Settings > Protection
- Three plan horizons: Short-term (1-2 weeks), Medium-term (1-3 months), Long-term / permanent
- For each horizon, guided fill-in:
  - Who contacts clients? (contact name, phone)
  - Who handles refunds? (access instructions)
  - Who manages the booking system? (agent access)
  - What events must be cancelled vs. handed off? (priority logic)
  - Emergency financial access (bank account signatory, Stripe access)
  - Who knows where the chef's key documents are?
- Plan stored privately
- PDF export for sharing with a trusted person (attorney, family member, partner)
- Annual review reminder

---

### 5.4 Chargeback Rate Monitor

**Risk category:** 18 (Credit) — Grade D
**What it is:** A running metric on chargeback rate with trend alerting.

**Build items:**

- Chargeback rate added to finance dashboard (already has dispute tracking)
- Metric: chargebacks as % of total transactions, trailing 90 days
- Threshold alert: >1% → warning (Stripe terminates accounts at ~1% for sustained periods)
- Trend chart: chargeback rate over time
- Pattern analysis: which event types, client segments, or payment methods are associated with chargebacks

---

### 5.5 Vendor Payment Aging

**Risk category:** 18 (Credit) — Grade D
**What it is:** A tracker showing how old outstanding payables to vendors and suppliers are.

**Build items:**

- Vendor payables section in Finance > Vendors (or within existing vendor management)
- For each vendor: outstanding balance, invoice date, age bucket (current / 30 / 60 / 90+ days)
- Aging report summary: how much is owed to vendors by age bucket
- Alerts when a payable goes past 45 days unpaid

---

### 5.6 Legal Structure Business Milestone Checklist

**Risk category:** 16 (Legal Identity & Business Structure) — Grade D
**What it is:** A guided checklist for chefs to confirm their business is legally structured correctly. Part of the Business Health Checklist (Phase 1.2) but with guided context for each item.

**Build items:**

- Each item in the Business Health checklist (Phase 1.2) includes:
  - Why it matters (1-2 sentences, plain language)
  - What to do if you haven't done it yet (action link or resource)
  - "I've done this" confirmation with optional document upload
- Legal items specifically:
  - LLC or entity formed → links to state secretary of state website
  - Business bank account → notes why commingling destroys LLC protection
  - Attorney-reviewed contract → links to resources for finding a business attorney
  - Trademark check → explains when to pursue this and when it's overkill
- Legal disclaimer on all AI-generated contracts: "This contract was generated by AI and has not been reviewed by an attorney. Have a licensed attorney review before using with clients." — verify this exists and add if missing.

---

## Phase 6: Professional Momentum & Growth

_Addresses stagnation — the quiet killer. Chefs who stop growing stop being interesting to their best clients. The system should make growth visible and push for it._

### 6.1 Professional Momentum Dashboard

**Risk categories:** 9, 14, 20 (Skill/Quality, Mental Health, Love of Craft) — all C or below
**What it is:** A dedicated page (or section of professional development) that shows a chef's growth trajectory — are they expanding, maintaining, or contracting?

**Build items:**

- Professional Momentum page under Professional Development
- Momentum signals:
  - New dishes added to recipe library in last 90 days (are you creating?)
  - New cuisines represented in recent menus vs. 12 months ago (are you expanding?)
  - New clients booked vs. previous period (are you growing your network?)
  - Certifications or education logged in last 12 months (are you learning?)
  - Creative projects logged in last 90 days (are you cooking for yourself?)
  - Satisfaction score trend from event debriefs (are you engaged?)
- Momentum score: a simple directional indicator — "Growing / Maintaining / Stagnating" (not a number — just a direction)
- If "Stagnating" for 90+ days → gentle prompt: "It looks like things have been steady for a while. Are you pushing yourself? Here are some ideas."
- Suggestions when stagnating: add a new dish this week, try a cuisine outside your usual range, log a continuing education activity, cook something just for yourself

---

### 6.2 Capability Inventory

**Risk category:** 9 (Skill, Quality & Professional Standing) — Grade C
**What it is:** A self-documented record of what the chef is actually qualified to do, preventing overbooking into areas beyond their competence.

**Build items:**

- Capability profile page under Professional > Skills
- Chef self-rates confidence level (Expert / Proficient / Learning / Not my specialty) for:
  - Cuisine categories (French, Italian, Japanese, Indian, Mexican, etc. — comprehensive list)
  - Dietary specializations (vegan, gluten-free, keto, allergen-free, etc.)
  - Service types (intimate dinner 2-6, dinner party 6-12, large event 12-30, corporate, etc.)
  - Specific techniques (butchery, pastry, fermentation, live fire, etc.)
- Capability inventory is private — chef's reference, not shown to clients
- Integration with quote form: if a client's inquiry mentions a cuisine the chef has rated "Not my specialty" → soft flag on the quote form: "This client mentioned [X] — this isn't in your primary repertoire. Proceed thoughtfully."
- Growth tracking: chef can see their skill profile at 6-month intervals and compare — am I more capable than I was?

---

### 6.3 Lost Quote Reason Tracker

**Risk category:** 9 (Skill, Quality & Professional Standing)
**What it is:** A systematic capture of why quotes don't convert, surfacing skill and positioning gaps over time.

**Build items:**

- When a quote is marked as rejected or expired, prompt: "Why didn't this convert?" (optional but encouraged)
- Reason categories: Price too high / Client chose another chef / Date not available / Cuisine/menu not right fit / Client lost interest / Other
- Free-text notes field
- Loss analysis report: reason distribution over trailing 12 months
- Pattern surfacing: if "Cuisine/menu not right fit" is trending up → suggest reviewing capability inventory and expanding repertoire
- If "Price too high" is >40% of losses → flag in pricing intelligence panel

---

### 6.4 Continuing Education Log

**Risk category:** 9, 17 (Skill/Quality, Professional Certifications)
**What it is:** A dedicated log of professional learning activities with goal-setting.

**Build items:**

- Continuing education section under Professional Development
- Log entry types: Online course / Book / Stage (working in another kitchen) / Travel (culinary travel) / Conference / Workshop / Mentorship / Personal experimentation
- Fields: date, type, title/description, what I learned, how it changed my cooking
- Annual goal: "I want to complete [X] learning activities this year"
- Progress bar and activity log view
- Momentum integration: feeds the Professional Momentum dashboard (Phase 6.1)
- Nudge if no entries in 90 days: "You haven't logged any learning recently. Even reading a cookbook counts."

---

### 6.5 Creative Project Space

**Risk categories:** 14, 20 (Mental Health, Love of Craft) — Grade D / F
**What it is:** A dedicated space for cooking that has nothing to do with clients — personal experiments, dishes being developed, cuisines being explored.

**Build items:**

- "My Kitchen" section (or tab within Recipe Library) — clearly separate from client-facing content
- Creative project record: dish name, cuisine, date, notes, photos (all private)
- Status: Experimenting / Nearly there / Mastered / Abandoned
- No cost tracking, no client link, no event association — this is purely personal
- Optional: share a project to the Chef Community (anonymized or attributed, chef's choice)
- Momentum integration: creative projects logged feeds the momentum score
- No pressure, no gamification — just a home for the work that feeds the passion

---

### 6.6 Menu Diversity & Repetition Tracker

**Risk category:** 9, 20 (Skill/Quality, Love of Craft)
**What it is:** A signal that surfaces when the chef's menus are becoming repetitive over time — the same dishes served again and again with no new additions.

**Build items:**

- Analytics metric: % of dishes served in the last 90 days that are "new" (never served before or not served in 12+ months)
- Shown on the Professional Momentum dashboard
- Alert when: same top 10 dishes served for 6+ consecutive months with no new dishes added
- Not a judgment — framed as: "Your current repertoire is well-established. Are you adding anything new?"
- Suggestion: "Your clients love [Dish X]. What's a variation or adjacent dish you've been curious about?"

---

### 6.7 Quarterly Growth Check-In

**Risk categories:** 9, 14, 20 (Skill/Quality, Mental Health, Love of Craft)
**What it is:** A structured quarterly prompt that asks the chef to reflect on professional growth, satisfaction, and direction.

**Build items:**

- Triggered every 90 days (configurable, dismissible)
- Short form (5 questions max):
  1. On a scale of 1-10, how satisfied are you with your work right now?
  2. What's one thing you learned or tried for the first time this quarter?
  3. What's one thing that's been draining you?
  4. What's one goal for next quarter?
  5. Is there anything you want the system to help you track?
- Responses stored privately, shown as a timeline the chef can look back on
- Satisfaction score trend feeds the burnout risk indicator
- If satisfaction trend is declining: gentle acknowledgment and suggestion to review goals, consider a rest, or explore community connection
- No algorithmic judgment — the responses are for the chef, not the system

---

## Phase 7: Staff & HR Improvements

_Closes remaining gaps in staff management that create legal and reputational exposure._

### 7.1 Staff Onboarding Checklist

**Risk category:** 8 (Staff & Hiring) — Grade C+
**What it is:** A per-staff-member onboarding checklist ensuring every person working for the chef has been properly vetted and documented.

**Build items:**

- Staff onboarding checklist on each staff member's profile
- Default items:
  - [ ] Background check completed
  - [ ] Food handler certification verified
  - [ ] Code of conduct signed and on file
  - [ ] NDA signed (if applicable)
  - [ ] Emergency contact provided
  - [ ] Social media policy acknowledged
  - [ ] Client confidentiality briefed
  - [ ] W9 collected (for contractors)
  - [ ] Contractor service agreement signed
- Document upload slot for each item
- Incomplete onboarding: staff member flagged as "incomplete" — warning when assigning to an event
- Completion percentage shown on staff list view

---

### 7.2 Per-Event Staff Code of Conduct Sign-Off

**Risk category:** 8 (Staff & Hiring)
**What it is:** A quick acknowledgment from each staff member before each event confirming they understand the specific expectations for that event.

**Build items:**

- When staff are assigned to an event, they receive a pre-event briefing (already built) + a code of conduct acknowledgment
- Acknowledgment items (pre-built, editable):
  - No personal phone use in client home
  - No photos of client home, guests, or food without explicit permission
  - All client information is confidential
  - [Event-specific notes from chef]
- Acknowledgment sent via SMS or email link (simple one-tap confirm)
- Confirmation recorded on event record
- Chef can see which staff members have and haven't acknowledged before the event starts

---

### 7.3 Contractor Service Agreement Tracker

**Risk category:** 8 (Staff & Hiring)
**What it is:** A record of the actual service agreement with each contractor — separate from the W9 tax form, covering the actual terms of engagement.

**Build items:**

- Contractor agreements section on staff profile (separate from the 1099/W9 section)
- Agreement record: effective date, scope of work, rate, payment terms, IP/work product clause, confidentiality clause, document upload
- Status: active / expired / not on file
- Alert when a contractor is assigned to an event without an active agreement on file
- Simple agreement template provided (customizable) — not a legal document, but a starting point for the chef to take to an attorney

---

## Phase 8: Digital & Portfolio Protection

_Protects the chef's online assets and ensures their digital presence works for them, not against them._

### 8.1 Portfolio Permission Management

**Risk categories:** 3, 19 (Client Trust, Portfolio) — Grade C / D
**What it is:** A unified system where photo permission is set per client, travels with every asset created from their events, and enforces those permissions throughout the system.

**Build items:**

- Photo permission field on client profile (already in NDA module — Phase 1.4)
- Every photo uploaded to an event is tagged with the originating client (already partially true — photos are linked to events)
- Permission propagation:
  - Social composer: permission check before any photo can be added to a post
  - Public portfolio: photos with "no public use" permission excluded from public gallery automatically
  - Document sharing: photos in shared documents inherit the permission check
- Permission audit: chef can view all photos in the system filtered by permission status
- Bulk permission update: if a client's status changes (e.g., they sign an NDA after the fact), all their photos update automatically

---

### 8.2 Portfolio Removal Request Workflow

**Risk categories:** 3, 19 (Client Trust, Portfolio) — Grade C / D
**What it is:** A formal process for handling a client's request to have their content removed from the chef's portfolio and digital presence.

**Build items:**

- "Removal request" action on client profile (chef-initiated when client makes a request)
- Removal request creates a task list:
  - [ ] Identify all photos/content linked to this client
  - [ ] Remove from public portfolio
  - [ ] Remove from social media (with links to specific posts)
  - [ ] Remove from any marketing materials
  - [ ] Confirm removal with client
  - [ ] Archive request with date and completion confirmation
- Each task checked off individually
- Request marked complete only when all tasks are confirmed
- Completion certificate generated (timestamped PDF confirming removal for the chef's records)

---

### 8.3 Google Business Profile Integration

**Risk category:** 12 (Digital & Online Presence) — Grade B-
**What it is:** Integration with Google Business Profile API to allow chefs to manage their Google presence and respond to Google reviews from within ChefFlow.

**Build items:**

- Google Business Profile connection in Settings > Integrations
- Sync: pull Google reviews into the existing review aggregation system (already exists for other platforms)
- Review response: respond to Google reviews from within ChefFlow (without opening Google Business Profile separately)
- Basic profile management: update business hours, contact info, photos from within ChefFlow
- Review request tool: generate a direct Google review link to send to satisfied clients (already exists for other platforms — extend to Google)

---

### 8.4 Public Portal SEO Health

**Risk category:** 12 (Digital & Online Presence) — Grade B-
**What it is:** A basic SEO health indicator for the chef's ChefFlow public portal page.

**Build items:**

- SEO health panel in Settings > Public Portal
- Checks:
  - Page title set and unique? (green/red)
  - Meta description present? (green/red)
  - At least 3 portfolio photos? (green/red)
  - Chef bio present and >100 words? (green/red)
  - Contact/booking method visible? (green/red)
  - Page accessible to search engines (not robots.txt blocked)? (green/red)
- Overall health score (% of checks passing)
- Each failing check has a "fix it" link that goes directly to the relevant setting

---

## Summary: Complete Build Item List

### Phase 1 — Business Protection Foundation (6 items)

1. Insurance Module
2. Business Health Checklist
3. Certification Tracker
4. NDA Management
5. Incident Documentation Module
6. (Legal disclaimer verification on AI contracts — quick check)

### Phase 2 — Operational Safety Net (7 items)

7. Pre-Service Kitchen Safety Checklist
8. Alcohol Service Log
9. Backup Chef Protocol
10. FDA/USDA Recall Monitoring
11. Scope Drift Detection
12. Cross-Contamination Protocol Checklist
13. Equipment Redundancy Checklist

### Phase 3 — Personal Protection Layer (5 items)

14. Burnout Risk Indicator
15. Capacity Ceiling & Workload Protection
16. Rest Day & Protected Time Blocking
17. Shareable Availability View
18. Off-Hours Notification Protection

### Phase 4 — Reputation & Trust Protection (5 items)

19. Social Post Pre-Flight Check
20. Brand Mention Monitoring
21. Crisis Response Protocol
22. Referral Chain Health Score
23. Relationship Cooling Alert

### Phase 5 — Financial & Legal Health (6 items)

24. Client Revenue Concentration Warning
25. Break-Even Calculator
26. Business Continuity Plan Template
27. Chargeback Rate Monitor
28. Vendor Payment Aging
29. Legal Structure Business Milestone Checklist

### Phase 6 — Professional Momentum & Growth (7 items)

30. Professional Momentum Dashboard
31. Capability Inventory
32. Lost Quote Reason Tracker
33. Continuing Education Log
34. Creative Project Space ("My Kitchen")
35. Menu Diversity & Repetition Tracker
36. Quarterly Growth Check-In

### Phase 7 — Staff & HR Improvements (3 items)

37. Staff Onboarding Checklist
38. Per-Event Staff Code of Conduct Sign-Off
39. Contractor Service Agreement Tracker

### Phase 8 — Digital & Portfolio Protection (4 items)

40. Portfolio Permission Management
41. Portfolio Removal Request Workflow
42. Google Business Profile Integration
43. Public Portal SEO Health

---

**Total: 43 build items across 8 phases**

The first 6 (Phase 1) are the foundation. Nothing else matters as much if a chef has no insurance, no business structure, and no incident documentation. Build those first.

The stagnation items (Phase 6) are what will differentiate ChefFlow from any other chef software. Every other platform thinks the job is managing events. Only ChefFlow is asking: is the chef still growing? Are they still in love with the work? That's the moat.
