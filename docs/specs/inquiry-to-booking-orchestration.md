# Inquiry-to-Booking Orchestration

> **Status:** SPEC-READY
> **Priority:** P0
> **Origin:** "Picky Client" persona stress test (2026-05-16)
> **Pillar:** SELL (Inquiry to Booking)

---

## Problem Statement

ChefFlow has built every individual component of the inquiry-to-booking pipeline: inquiry intake (6 lanes), client portal (token + auth), sample menus (shareable), chef profiles (public), lifecycle intelligence (10 stages), response time tracking (urgency levels), Remy (AI concierge), dinner circles, and referral codes.

But these pieces are not wired into a single, orchestrated flow. A client reaching out today can still fall into the same 4-month black hole described in the "Picky Client" scenario because:

1. **Referral links don't deep-link to inquiry forms.** Sharing a chef link requires the client to find the inquiry button themselves.
2. **No proactive lifecycle status updates flow TO the client.** The chef sees lifecycle progress; the client sees nothing unless they check the portal.
3. **Response time tracking is passive.** The system tracks urgency but doesn't enforce it or auto-escalate.
4. **Quote generation requires manual chef effort every time.** No pre-built quote templates that auto-populate from lifecycle data.
5. **The handoff points between stages are implicit.** No automation fires when one stage completes to kick off the next.
6. **The email-to-portal bridge is drafted but not wired.** Clients stay in email/text instead of seeing their event status.

This spec defines the orchestration layer that connects all built components into a deterministic, client-facing pipeline targeting a **5-day inquiry-to-deposit flow**.

---

## Success Criteria

A referral source (friend, daughter, website visitor) shares a link. The client:

1. Lands on a pre-contextualized inquiry form (Day 1)
2. Receives instant confirmation with 24h response promise (Day 1)
3. Gets sample menu options from the chef within 24h (Day 2)
4. Selects/customizes a menu and receives a quote (Day 3)
5. Reviews and approves the quote, receives contract (Day 4)
6. Signs contract and pays deposit (Day 5)
7. Has permanent portal access showing live event status (Day 5+)

At no point does the client wonder "do I have a chef or not?"

---

## Deliverables

### 1. Referral-to-Inquiry Deep Link

**What exists:** Referral codes, `copy-referral-link-button.tsx`, public chef profile at `/chef/[slug]`, inquiry form at `/chef/[slug]/inquire` accepting `ref` and `loc` search params.

**What to build:**

- **Smart referral URL generator.** When a client or dinner circle member shares a chef, generate a URL like `/chef/[slug]/inquire?ref=[code]&via=[referrerName]`. The `via` param displays "Referred by [Name]" on the form, building immediate trust.
- **Pre-fill from referrer context.** If the referrer is in a dinner circle with dietary/preference data, pre-populate known fields (location, dietary basics).
- **One-tap share from client portal.** Add a "Share [Chef Name]" button to `my-hub` that generates the deep link with the client's referral code embedded. Copy to clipboard + native share sheet on mobile.
- **Referral attribution on submission.** When the inquiry is created with a `ref` param, auto-link the referral record. The chef sees "Referred by [Name]" on the inquiry card.

**Files likely touched:**

- `app/(public)/chef/[slug]/inquire/page.tsx` (accept `via` param, display referrer)
- `components/hub/share-chef-button.tsx` (new or enhance existing)
- `lib/inquiries/public-actions.ts` (link referral on creation)
- `lib/referrals/client-referral-actions.ts` (deep link generation)
- `components/inquiries/inquiry-summary.tsx` (show referral source)

---

### 2. Automated Lifecycle Progression Triggers

**What exists:** Lifecycle stages (10), checkpoint detection, critical path tracking, FSM transitions, next-action-banner.

**What to build:**

A trigger engine that fires actions when lifecycle checkpoints are satisfied:

| Trigger Condition                                   | Auto-Action                                                                              |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Inquiry submitted with date + guest count + dietary | Fast-track: skip deep discovery, surface sample menus to chef with "ready to quote" flag |
| Chef sends first response                           | Update client portal status to "Discovery"                                               |
| All 10 critical path items satisfied                | Auto-generate deposit invoice draft for chef review                                      |
| Quote sent to client                                | Start 48h acceptance timer; if no response, Remy drafts gentle follow-up                 |
| Quote accepted                                      | Auto-generate contract from template, notify chef                                        |
| Contract signed                                     | Surface deposit payment link to client                                                   |
| Deposit received                                    | Transition event to "confirmed", send confirmation email to all circle members           |
| 7 days before event                                 | Send pre-event checklist to client portal                                                |

**Architecture:**

- `lib/lifecycle/trigger-engine.ts` (new) -- deterministic trigger rules, no LLM dependency
- Triggered by existing lifecycle checkpoint updates in `lib/lifecycle/detector.ts`
- Each trigger produces a `LifecycleAction` (email, status update, draft creation, notification)
- Chef can disable individual triggers in settings (opt-out, not opt-in)
- All auto-actions create drafts/notifications, never send without chef's configured consent level

**Consent levels (per chef, per trigger):**

- `auto` -- fires without approval (confirmations, status updates)
- `draft` -- creates draft for chef review (quotes, follow-ups)
- `notify` -- notifies chef to take manual action (contracts, invoices)

---

### 3. Client-Facing Proactive Status Updates

**What exists:** Client portal with event list. Token-based access. Email templates for inquiry received and declined.

**What to build:**

- **Lifecycle status email sequence.** At each major stage transition, send the client a brief email with:
  - Current status in plain language ("Your menu is being prepared")
  - Next expected step ("You'll receive menu options by [date]")
  - One-tap portal link to see full details
  - "At a Glance" footer (per existing email snapshot spec)

- **Portal status timeline.** On the client portal event page, render a visual timeline showing:
  - Completed stages (green checkmarks)
  - Current stage (highlighted, with "what's happening now" copy)
  - Upcoming stages (gray, with "what to expect" copy)
  - Estimated dates where available

- **Push/SMS notifications (future, flag only).** Design the status update system with a notification channel abstraction so push/SMS can be added without refactoring. V1 = email only.

**Files likely touched:**

- `lib/email/templates/lifecycle-status-update.tsx` (new template)
- `lib/lifecycle/client-notifications.ts` (new, orchestrates which updates to send)
- `app/client/[token]/page.tsx` (add timeline component)
- `components/client-portal/lifecycle-timeline.tsx` (new component)
- `lib/lifecycle/trigger-engine.ts` (emits client notification actions)

---

### 4. Response Time Enforcement

**What exists:** Urgency levels (ok/warm/hot), SLA metrics (4h/24h), stale inquiry detection, follow-up draft cadence.

**What to build:**

- **Escalation ladder.** Convert passive tracking into active enforcement:

| Time Since Last Response | Action                                                                                    |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| 4 hours                  | Yellow badge on inquiry card                                                              |
| 12 hours                 | Remy dashboard alert: "Client waiting"                                                    |
| 24 hours                 | Remy drafts a holding message: "Working on your request, will have options by [tomorrow]" |
| 48 hours                 | Red badge + priority queue bump + morning briefing callout                                |
| 72 hours                 | Auto-send holding message (if chef has auto-response enabled)                             |

- **Client expectation setting.** On inquiry confirmation email, include the chef's typical response time (calculated from historical data, not self-reported). "Chef [Name] typically responds within [X] hours."

- **Response time display on chef profile.** Show average response time on the public chef profile (like Airbnb's response rate). Only display if positive (< 24h average).

**Files likely touched:**

- `lib/inquiries/follow-up-actions.ts` (add escalation tiers)
- `lib/ai/remy-nudge-rules.ts` (add response-time escalation rules)
- `lib/email/templates/inquiry-received.tsx` (add response time expectation)
- `lib/public/chef-profile-readiness.ts` (compute and expose response time metric)
- `app/(public)/chef/[slug]/page.tsx` (display response time)
- `components/inquiries/inquiry-status-badge.tsx` (escalation badge colors)

---

### 5. Sample Menu Quick-Send

**What exists:** Menu templates, public menu sharing via token, showcase menus on chef profile, menu approval flow.

**What to build:**

- **"Send Sample Menus" action on inquiry detail.** One-click action that:
  1. Shows chef's existing menu templates filtered by occasion/season
  2. Chef picks 2-3, optionally tweaks
  3. Sends client an email with menu cards (image + title + description + price per person)
  4. Each menu card links to the full public menu view (`/menu/[token]`)
  5. Client can "Select This Menu" directly from the email/portal, which auto-creates a quote draft

- **Menu browsing on client portal.** When sample menus are sent, they appear on the client's portal event page as browsable cards with select/customize actions.

**Files likely touched:**

- `components/inquiries/send-sample-menus-action.tsx` (new)
- `lib/menus/sample-menu-actions.ts` (new, filter templates, generate share tokens, create quote draft)
- `lib/email/templates/sample-menus-sent.tsx` (new template)
- `app/client/[token]/page.tsx` (render sent menus)
- `components/client-portal/menu-selection-cards.tsx` (new)

---

### 6. Quote-from-Menu Auto-Generation

**What exists:** Quote builder, pricing intelligence (PIE), menu cost estimator spec, chef pricing overrides.

**What to build:**

- **Auto-populate quote from selected menu.** When a client selects a sample menu:
  1. Pull ingredient costs from PIE for the menu's dishes
  2. Apply chef's pricing overrides (labor, markup, travel)
  3. Generate a quote draft with line items: food cost, labor, travel, service fee
  4. Chef reviews and sends (one click, not rebuilding from scratch)

- **Quote template library.** Chefs save quote structures (pricing formulas, standard add-ons, payment terms) as templates. New quotes pre-populate from the template matching the event type.

**Files likely touched:**

- `lib/quotes/auto-generate.ts` (new)
- `lib/quotes/templates.ts` (new or extend existing)
- `lib/pricing/resolve-menu-cost.ts` (new, uses PIE bridge)
- `components/quotes/quote-from-menu-button.tsx` (new)

---

### 7. End-to-End Journey Wiring

**What exists:** All individual stages are built. Handoffs between stages are manual.

**What to build:**

- **Journey orchestrator.** A lightweight state coordinator in `lib/lifecycle/journey-orchestrator.ts` that:
  1. Listens to lifecycle checkpoint completions
  2. Fires the appropriate trigger from the trigger engine (#2 above)
  3. Updates client-facing status (#3 above)
  4. Logs the journey timeline for the chef's event history

- **Journey health dashboard widget.** On the chef dashboard, show a pipeline view of all active inquiries/events with:
  - Current stage
  - Days in stage
  - Next action needed (by chef or client)
  - Risk indicator (stale, blocked, waiting)

- **"Picky Client" test scenario.** A Playwright E2E test that simulates the full journey:
  1. Referral link click -> inquiry submission
  2. Chef receives notification -> sends sample menus
  3. Client selects menu -> quote auto-generated
  4. Client accepts quote -> contract sent
  5. Client signs -> deposit paid -> confirmed
  6. Verify client portal shows correct status at each step

**Files likely touched:**

- `lib/lifecycle/journey-orchestrator.ts` (new)
- `components/dashboard/pipeline-health-widget.tsx` (new)
- `tests/e2e/inquiry-to-booking-journey.spec.ts` (new)

---

## Dependency Map

```
Referral Deep Link (1) -----> Inquiry Created
                                    |
                         Trigger Engine (2) detects fast-track eligibility
                                    |
                         Sample Menu Quick-Send (5) -----> Client selects menu
                                    |
                         Quote Auto-Generation (6) -----> Client accepts quote
                                    |
                         Trigger Engine (2) generates contract
                                    |
                         Client signs + pays deposit
                                    |
                         Trigger Engine (2) confirms event
                                    |
                    Throughout: Client Status Updates (3) + Response Enforcement (4)
                    Orchestration: Journey Orchestrator (7)
```

**Build sequence:**

1. Trigger engine (#2) -- foundation for everything else
2. Client status updates (#3) -- solves the "am I in the dark?" problem
3. Response time enforcement (#4) -- solves the "week-long silence" problem
4. Referral deep link (#1) -- solves the "telephone through the daughter" problem
5. Sample menu quick-send (#5) -- solves the "what do you want to eat?" problem
6. Quote auto-generation (#6) -- accelerates Days 3-4
7. Journey orchestrator + E2E test (#7) -- ties everything together, proves it works

---

## What This Does NOT Cover

- **Remy auto-response to clients.** Remy stays chef-facing. All client communication flows through chef-approved channels. This spec automates the chef's workflow, not the client's conversation.
- **New database tables.** All data structures exist. This spec wires existing tables and actions together.
- **Mobile app.** Client portal works on mobile web. Native app is a separate concern.
- **Payment processing changes.** Stripe integration exists. This spec triggers existing payment flows at the right lifecycle moment.

---

## Verification

- [ ] Referral link from dinner circle member opens pre-filled inquiry form
- [ ] Inquiry submission triggers instant confirmation email with response time expectation
- [ ] Chef sees urgency badge escalation at 4h/12h/24h/48h/72h
- [ ] Chef can send 2-3 sample menus in one click from inquiry detail
- [ ] Client receives menu email with "Select This Menu" action
- [ ] Menu selection auto-generates quote draft for chef review
- [ ] Client portal shows lifecycle timeline with current stage highlighted
- [ ] Quote acceptance triggers contract generation
- [ ] Contract signing surfaces deposit payment link
- [ ] Deposit receipt confirms event and notifies all circle members
- [ ] Full E2E Playwright test passes
- [ ] "Picky Client" persona re-run produces satisfaction, not frustration

---

## Origin Story

This spec was born from a persona stress test where a wealthy, organized client described a 4-month nightmare trying to book a private chef through her daughter. Every frustration mapped to a feature ChefFlow already has -- but those features weren't orchestrated into a continuous flow. The pipeline had all the pipes; it just needed the water to flow.
