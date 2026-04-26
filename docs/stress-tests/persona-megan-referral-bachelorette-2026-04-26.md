# PERSONA STRESS TEST: Megan (Referral Bachelorette Coordinator)

## Generated: 2026-04-26

## Prior test: First run

---

## 1. PERSONA PROFILE

```
PERSONA PROFILE
===============
Name/Label:        Megan (Referral Bachelorette)
Type:              Client
Role:              Group event coordinator / booking intermediary
Business Model:    One-time event booker coordinating on behalf of decision-maker (sister/bride)
Scale:             Single event, 6+ attendees, ~$125/head, group split payment
Tech Comfort:      Medium (comfortable with text/screenshots/Venmo, not with portals or dashboards)
Current Tools:     Phone calls, text messages, screenshots, Venmo, memory
Top 3 Pain Points: 1. Relay communication (she books, sister decides)
                   2. No single source of truth for confirmed details
                   3. Can't collect payment without a total number
Deal-Breakers:     - Being forced to create an account to share info with sister
                   - Having to repeat information that was discussed verbally
                   - Not getting a clear total with enough lead time to collect from group
Success Metric:    "One place where I can see what we picked, what it costs, and what logistics are confirmed"
ChefFlow Surface:  Client portal (/my-events, /my-quotes), public share pages (/proposal/[token], /share/[token])
```

---

## 2. WORKFLOW SIMULATION

### Client Journey Mapping

**Megan's natural journey:** Referral -> Phone calls -> Menu review -> Relay to sister -> Confirm picks -> Get total -> Collect from group -> Event day -> Pay

| Stage                | What Megan Does                                                                            | What ChefFlow Offers                                                                        | Gap                                                                                                                                                               | Friction |
| -------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| **Discover**         | Gets referral from cousin's husband via Anthony                                            | Referral source tracking in inquiry pipeline (`lib/inquiries/actions.ts`)                   | Referral chain is flat (one source field, not a chain)                                                                                                            | 1        |
| **Book**             | Phone call with chef, verbal agreement                                                     | Inquiry form (`/book/[chefSlug]`), client portal booking                                    | No phone-call-to-system bridge; chef must manually create the inquiry after call                                                                                  | 2        |
| **Plan (Menu)**      | Receives 20-item menu, forwards to sister, sister highlights picks, Megan screenshots back | Menu choose page (`/my-events/[id]/choose-menu`) with 4 paths                               | Requires Megan to have an account AND be the one picking. No "share this menu with someone else to pick" link. Sister can't pick directly without her own account | 3        |
| **Plan (Logistics)** | Negotiates plates, cleanup, arrival on phone call                                          | Pre-event checklist (`/my-events/[id]/pre-event-checklist`) captures kitchen/parking/access | No "plates arrangement" field, no "cleanup plan" field, no "rental vs home" mode. Checklist only available after event is confirmed/paid                          | 2        |
| **Plan (Surprise)**  | Tells chef "chocolate" for secret dessert element                                          | Chef's internal notes on event/quote (`internal_notes` field)                               | No structured "surprise" field. Notes are free-text, not tied to menu collision detection                                                                         | 2        |
| **Confirm**          | Texts confirmation of sister's picks + logistics                                           | Proposal acceptance (`/my-events/[id]/proposal`)                                            | Good fit IF the chef sends a proposal through the system. But verbal-first workflow means this step might never happen digitally                                  | 2        |
| **Price**            | Asks "what's the total?" and needs a number to distribute                                  | Proposal page shows total, per-person breakdown (`/my-events/[id]/proposal` lines 222-280)  | Total exists but requires chef to generate it in-system. No "quick text the total" export or shareable price summary for group distribution                       | 2        |
| **Collect**          | Tells each girl "Venmo me $X"                                                              | Split billing exists chef-side (`app/(chef)/payments/splitting/page.tsx`)                   | NO client-facing split view. No "here's what each person owes" shareable link. No Venmo/payment integration for group collection                                  | 3        |
| **Pay**              | One person Venmos chef                                                                     | Stripe payment (`/my-events/[id]/pay`) or Venmo (manual)                                    | Stripe works for single payer. But Megan wants to Venmo, not use Stripe. No Venmo link generation. Chef said "Venmo" which is outside the system                  | 2        |
| **Attend**           | Shows up to Airbnb, eats food, enjoys                                                      | Event occurs                                                                                | No gap here                                                                                                                                                       | 0        |
| **Review**           | Might leave feedback                                                                       | Post-event survey, AAR                                                                      | Works if prompted                                                                                                                                                 | 1        |

### First 10 Minutes (Megan's perspective)

Megan would NOT sign up on her own. The chef would need to invite her or send her a link. If the chef sends a proposal link (`/proposal/[token]`), she can view it without an account. But to interact (accept, pay, choose menu), she needs an account.

**Friction:** Megan's communication style is phone + text. Creating an account feels like overhead for a one-time dinner. The system requires account creation for any interactive action.

### First Day

If Megan creates an account and the chef builds the event in ChefFlow:

- She can see the proposal with menu + pricing
- She can choose/approve menu items
- She CANNOT share the menu with her sister for picking (no delegate/proxy feature)
- She CANNOT see a "what to bring" logistics summary

### First Week

Megan would check the system 1-2 times max. She wants to:

1. Forward menu choices to chef (possible via approve-menu if she does it herself)
2. Get the total (possible via proposal)
3. Share the total with the group (must manually screenshot/text it out)

### First Month

N/A. Single event. No retention play. But if the experience is good, she becomes a word-of-mouth source for the chef (high referral value).

---

## 3. CAPABILITY AUDIT

### Domains (Client-adapted)

| Domain                    | Rating    | Key Gap                                                                                |
| ------------------------- | --------- | -------------------------------------------------------------------------------------- |
| Discovery & Booking       | PARTIAL   | No phone-call-to-digital bridge; referral chain is flat                                |
| Menu Browsing & Selection | PARTIAL   | Works for single-decider; no proxy/delegate selection for third party                  |
| Pricing & Transparency    | SUPPORTED | Proposal page shows full breakdown with per-person math                                |
| Payment Flow              | PARTIAL   | Stripe works for single payer; no group split client view, no Venmo                    |
| Logistics Coordination    | PARTIAL   | Pre-event checklist exists but misses plates/cleanup/rental specifics                  |
| Communication             | PARTIAL   | Portal messaging exists but doesn't replace text/phone for this persona                |
| Multiple Contacts         | SUPPORTED | `event_contacts` table with roles (primary, coordinator, host, etc.)                   |
| Share/Forward Capability  | PARTIAL   | Proposal share token works; no menu-selection share for decision-maker                 |
| Group Coordination        | MISSING   | No client-facing split view, no group cost breakdown, no collection tool               |
| Surprise/Secret Elements  | PARTIAL   | Internal notes field exists; no structured surprise tracking with menu collision logic |
| Confirmation Summary      | PARTIAL   | Proposal is close but doesn't capture verbal logistics agreements                      |
| Rental Property Mode      | MISSING   | No rental-specific prompts (kitchen unknown, what to bring, plates negotiation)        |

### Detailed Evidence

**Discovery & Booking - PARTIAL**

- Evidence: `app/book/[chefSlug]/page.tsx` (public booking), `lib/inquiries/public-actions.ts` (inquiry submission)
- Gap: Megan didn't find the chef through the booking page. She got a phone call referral. The chef has to manually create this inquiry. Referral source is a single text field, not a chain (Anthony -> cousin -> Megan).
- Impact: Chef loses context about the trust chain that led to the no-deposit decision.

**Menu Browsing & Selection - PARTIAL**

- Evidence: `app/(client)/my-events/[id]/choose-menu/page.tsx` (4 selection paths), `app/(client)/my-events/[id]/approve-menu/page.tsx`
- Gap: The menu selection flow assumes the logged-in client IS the decision-maker. Megan is not. Her sister needs to see the menu and pick. No "share this selection page" or "let someone else pick" flow.
- Impact: Megan must relay via screenshots. Information loss. Delays. Chef gets picks second-hand.

**Pricing & Transparency - SUPPORTED**

- Evidence: `app/(client)/my-events/[id]/proposal/page.tsx` lines 222-280 (total, per-person, deposit, balance)
- Gap: Minor. Works well IF the chef generates the proposal in-system. The total is visible and clear.
- Impact: Low. This is the one area that mostly works for Megan.

**Payment Flow - PARTIAL**

- Evidence: `app/(client)/my-events/[id]/pay/page.tsx` (Stripe), `lib/commerce/payment-actions.ts` (split_billing JSON)
- Gap: Split billing is chef-managed, not client-facing. No "here's what each person owes" shareable view. Chef said "Venmo" which is completely outside the system.
- Impact: Megan has to manually calculate splits and text everyone. If the total changes, she recommunicates manually.

**Logistics Coordination - PARTIAL**

- Evidence: `components/events/pre-event-checklist-client.tsx` lines 120-151 (parking, access, kitchen size, constraints, equipment)
- Gap: No "plates" field (who provides what tableware for which courses). No "cleanup plan" field. No "this is a rental, we don't know what's there" mode. Checklist only unlocks after paid/confirmed status.
- Impact: The plates/cleanup agreement from the phone call has nowhere to live. Day-of confusion risk.

**Multiple Contacts - SUPPORTED**

- Evidence: `lib/events/contacts.ts` - `event_contacts` table with roles: primary, planner, venue_manager, host, coordinator, assistant, other. Each has visibility levels (full, logistics_only, day_of_only) and notification preferences.
- Gap: None at data layer. The schema supports "Megan = coordinator, Sister = host/primary." Whether the UI surfaces this well to the chef is a separate question.
- Impact: Low. Data model fits.

**Group Coordination - MISSING**

- Evidence: No client-facing split payment UI found. `app/(chef)/payments/splitting/page.tsx` is chef-only.
- Gap: No shareable "here's what everyone owes" page. No per-person payment link. No collection tracking. No "Megan collected from 4/6 people" status.
- Impact: BLOCKER for group events. Megan can't do her core job (collect from everyone) without external tools.

**Rental Property Mode - MISSING**

- Evidence: Pre-event checklist has kitchen fields but no "rental property" specific flow.
- Gap: No prompt for "is this a rental? do you know what's in the kitchen? do you want chef to bring plates?" The plates negotiation that happened on the phone call has no structured home.
- Impact: Medium. Creates day-of logistics confusion when details are forgotten.

---

## 4. FAILURE MAP

### BLOCKER - critical

**What:** No client-facing group payment coordination
**Where:** Gap; no route exists. Chef-side only at `app/(chef)/payments/splitting/page.tsx`
**Persona impact:** Megan cannot tell 6 women what they owe via the system. Must use external tools (calculator + group text). If total changes, re-coordination is manual. This is her #1 job as coordinator.
**Required fix:** Client-facing "Group Split" view: shareable link showing total, per-person amount, who's paid (optional). Could live at `/my-events/[id]/split` or as a shareable token page.
**Scope class:** EXPAND

### BLOCKER - critical

**What:** No menu delegation to non-account third party (decision-maker != booker)
**Where:** `app/(client)/my-events/[id]/choose-menu/page.tsx` requires `requireClient()` (line 8). No proxy flow exists.
**Persona impact:** Sister cannot pick from the menu directly. Everything goes through Megan as relay. Delays, miscommunication, lost context. This is the conversation's #1 pain point.
**Required fix:** "Share menu selection" token that allows a non-authenticated person to browse and pick, with choices flowing back to the event. Like `/proposal/[token]` but interactive for menu picks.
**Scope class:** EXPAND

### MONEY RISK - high

**What:** Verbal pricing with no system-of-record for group events
**Where:** Chef said "I'll text you the total." If chef doesn't generate a proposal in ChefFlow, there's no system record of the price.
**Persona impact:** If price is only in a text thread and someone disputes it, there's no authoritative source. For 6 people splitting, one wrong number cascades.
**Required fix:** Not a code fix per se; this is a chef workflow issue. The system already supports proposals with pricing. The gap is that phone-first workflows bypass the system. A "quick quote" SMS/text feature that auto-generates from event data would bridge this.
**Scope class:** EXPAND

### WORKFLOW BREAK - high

**What:** Phone call agreements have no structured capture point
**Where:** The verbal agreement about plates (apps+entrees on chef's, dessert on theirs, chef leaves during dessert) has no field in the system.
**Persona impact:** If either party forgets this agreement, day-of confusion. Chef shows up with no plates expecting them to have some, or vice versa.
**Required fix:** Add "Service Agreement Notes" section to event detail with structured fields: tableware_plan, cleanup_plan, departure_plan. Or at minimum, a "logistics notes" field visible on the event overview that captures these verbal agreements.
**Scope class:** EXPAND

### WORKFLOW BREAK - medium

**What:** Surprise element has no collision detection with menu picks
**Where:** Chef notes (`internal_notes` in quotes/events) are free text. No link between "surprise = chocolate" and "sister's dessert pick = [something chocolatey]."
**Persona impact:** If sister picks a chocolate dessert AND chef planned a chocolate surprise, it's redundant. Chef said "I'll figure it out" but the system doesn't help him remember or adapt.
**Required fix:** A "surprise/secret" structured field on events with a `conflicts_with` link to menu items. When menu is finalized, flag if surprise overlaps with picks. File: could extend event detail or create `lib/events/surprise-tracking.ts`.
**Scope class:** EXPAND

### DATA DEAD-END - medium

**What:** Referral trust context is invisible in ongoing interactions
**Where:** Referral source is a text field on inquiries (`lib/inquiries/actions.ts`). Once event is created, the trust context (no deposit, flexible payment) isn't surfaced.
**Persona impact:** If chef has 20 active events, he might forget this one came through Anthony and that he waived the deposit. The referral context that shapes the entire relationship is stored once and buried.
**Required fix:** Surface referral badge/context on event detail page. Show "Referral: Anthony (via cousin)" on the event header. Already have the data; just not displaying it post-inquiry.
**Scope class:** REFINE

### Failure Summary

| Category        | Critical | High | Medium |
| --------------- | -------- | ---- | ------ |
| BLOCKER         | 2        | 0    | 0      |
| MONEY RISK      | 0        | 1    | 0      |
| DATA DEAD-END   | 0        | 0    | 1      |
| TRUST VIOLATION | 0        | 0    | 0      |
| WORKFLOW BREAK  | 0        | 1    | 1      |

---

## 5. REQUIRED ADDITIONS

### Quick Wins (< 2 hours each)

1. **Surface referral context on event detail** - `app/(chef)/events/[id]/_components/event-detail-overview-tab.tsx` - Add referral badge from linked inquiry. Resolves: DATA DEAD-END (referral trust invisible). **REFINE**

2. **Add "Service Notes" free-text field to event overview** - `app/(chef)/events/[id]/_components/event-detail-overview-tab.tsx` + schema addition. Captures plates/cleanup/logistics agreements. Resolves: WORKFLOW BREAK (phone call agreements). **EXPAND**

3. **"Copy total" button on proposal page** - `app/(client)/my-events/[id]/proposal/page.tsx` - One-tap copy of "Total: $X ($Y per person for Z guests)" for texting to group. Resolves: helps with MONEY RISK (pricing distribution). **REFINE**

### Medium Builds (2-8 hours each)

4. **Shareable menu selection page (no auth required)** - New route at `app/(public)/menu-pick/[token]/page.tsx`. Chef generates a token; anyone with the link can browse the menu and select items. Picks flow back to event. Resolves: BLOCKER (menu delegation). **EXPAND**

5. **Client-facing group split page** - New route at `app/(client)/my-events/[id]/split/page.tsx` OR shareable token version. Shows: total, per-person amount, optional payment status per member. Resolves: BLOCKER (group payment coordination). **EXPAND**

6. **Rental property logistics prompt** - Extend pre-event checklist with "rental/unfamiliar kitchen" mode: "Do you know what's available?" (yes/no), "Chef should bring plates?" (yes/no/hybrid), "Cleanup plan" (dropdown: chef cleans all, chef cleans main course, self-cleanup). Resolves: MISSING (rental property mode). **EXPAND**

### Large Builds (> 8 hours each)

7. **Phone-to-system bridge (voice note transcription to event record)** - After a phone call, chef records a voice summary or pastes transcription (like this conversation). System extracts: menu picks, logistics agreements, pricing, action items. Auto-populates event fields. Resolves: WORKFLOW BREAK (phone agreements lost) + MONEY RISK (verbal pricing). Spec needed: yes. **EXPAND**

8. **Surprise/Secret tracking with menu collision detection** - Structured "surprise" field on events: type (food/experience/gift), description, constraints, linked_courses. When menu is finalized, system flags conflicts. Resolves: WORKFLOW BREAK (surprise collision). Spec needed: no (small enough to implement directly). **EXPAND**

### Out-of-Scope (documented, not planned)

- **Venmo integration for group collection** - Venmo doesn't offer merchant APIs for this use case. Megan collects from friends externally. ChefFlow can show what's owed but can't collect on her behalf via Venmo. She'd use a shareable split page to know the number.
- **SMS-native interaction (no portal)** - Megan prefers texting. A full SMS-based interaction flow (text to pick menu, text to pay) would serve her perfectly but is a fundamentally different product interface. OUT-OF-SCOPE for V1.

---

## 6. SYSTEM BEHAVIOR REQUIREMENTS

```
BEHAVIOR: Decision-Maker Delegation
  Rule: When an event has multiple contacts where booker != decision-maker, the system must allow the decision-maker to interact with menu selection without requiring full account creation.
  Trigger: Event has event_contacts with roles 'coordinator' (booker) AND 'host' or 'primary' (decision-maker) as separate people.
  Violation example: Sister must create a full ChefFlow account just to pick appetizers from a list.
  Test: Create event with Megan as coordinator, sister as host. Generate menu share token. Sister can pick items via token without logging in.
```

```
BEHAVIOR: Group Total Visibility
  Rule: When an event has split_billing enabled OR guest_count > 4, the client-facing proposal must prominently show per-person cost alongside total, with a "share this" action.
  Trigger: Event guest count > 4 or split_billing is configured.
  Violation example: Megan sees "$750 total" but has to manually divide by 6 and text everyone.
  Test: View proposal for 6-person event. Per-person amount displayed. "Copy for group" button produces text-ready summary.
```

```
BEHAVIOR: Logistics Capture Before Event
  Rule: Any verbal agreement about service logistics (tableware, cleanup, timing, equipment) must have a capture point in the system accessible to both chef and client before the event.
  Trigger: Event status transitions to 'confirmed' or 'paid'.
  Violation example: Chef arrives at Airbnb expecting them to have dessert plates. They forgot. Nobody wrote it down.
  Test: Event detail shows "Service Plan" section with tableware/cleanup/timing notes. Both chef and client can view.
```

```
BEHAVIOR: Referral Trust Persistence
  Rule: When an inquiry has a referral source and converts to an event, the referral context (source, trust level, special terms like "no deposit") must be visible on the event throughout its lifecycle.
  Trigger: Event linked to inquiry with non-empty referral_source.
  Violation example: Chef has 20 events, forgets this one was Anthony's referral, asks for deposit and confuses client.
  Test: Event detail shows referral badge. Any payment/deposit fields show "Deposit waived (referral: Anthony)" if applicable.
```

```
BEHAVIOR: No-Account Menu Interaction
  Rule: A person who receives a menu share link must be able to view the full menu and indicate preferences without creating an account or logging in.
  Trigger: Chef generates a "share menu" token for an event.
  Violation example: Sister clicks link, hits login wall, gives up, texts Megan "just pick whatever."
  Test: Open menu share link in incognito. Full menu visible. Can tap items to indicate picks. Picks saved to event.
```

---

## 7. SCORE

### Score Card

| Dimension                  | Score      | Justification                                                                                                                                                                         |
| -------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workflow Coverage (30%)    | 38         | Two BLOCKER failures (menu delegation, group split) prevent Megan from completing her core coordinator tasks in-system. She must use text/screenshots for her most important jobs.    |
| Data Model Fit (20%)       | 72         | event_contacts table supports booker vs decision-maker roles well. Pricing, menu, and proposal structures capture the data. Gap is in structured logistics and surprise fields.       |
| UX Alignment (15%)         | 45         | Megan is phone/text-native. The system requires portal login for all interactions. Share tokens help but don't cover menu selection. The UX assumes the client IS the decision-maker. |
| Financial Accuracy (15%)   | 65         | Proposal pricing is accurate and well-structured. But the group split has no client surface, and verbal pricing agreements can bypass the system entirely.                            |
| Onboarding Viability (10%) | 40         | Megan would only engage if the chef sends her a link. She won't discover ChefFlow independently. The proposal token page works without auth, but menu interaction requires login.     |
| Retention Likelihood (10%) | 30         | Single-event client. No retention play. But referral value is high if experience is good. System doesn't capture or leverage this (no "refer a friend" for clients).                  |
| **FINAL SCORE**            | **46/100** | **HOSTILE**                                                                                                                                                                           |

**Scoring rule applied:** Two BLOCKER failures cap Workflow Coverage at 49 max. More than 3 MISSING/PARTIAL domains in the audit further depress the score.

---

## 8. VERDICT

**Megan would fail on ChefFlow today.** The system assumes the client who books is the client who decides, and that one person pays one invoice. Megan's reality is: she's a relay for her sister's decisions and a collector for 6 people's money. Neither role has a system surface.

**Single highest-impact change:** A shareable menu selection token (no auth required) that lets the actual decision-maker pick directly. This eliminates the relay problem, the screenshot problem, and the delay problem in one build. It directly maps to the `/proposal/[token]` pattern that already exists but makes it interactive for menu choices.

---

## 9. DELTA

N/A - First run.
