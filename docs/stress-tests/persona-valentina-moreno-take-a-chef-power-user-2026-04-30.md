# PERSONA STRESS TEST: Valentina Moreno, Take a Chef Power User
## Generated: 2026-04-30
## Prior test: First run

## 1. PERSONA PROFILE
Name/Label:        Valentina Moreno, Take a Chef Power User
Type:              chef
Role:              High-volume private dining chef who sources all new business through Take a Chef
Business Model:    Marketplace-led private dining. Take a Chef is the lead source, booking rail, pre-confirmation communication rail, review rail, and payout rail. ChefFlow is expected to run as the internal operating system beside it.
Scale:             18-30 active requests per month, 10-16 booked services per month, mostly premium in-home dinners and multi-day vacation services [inferred]
Tech Comfort:      medium-high [inferred]
Current Tools:     Take a Chef, phone after booking, calendar, notes, spreadsheet costing, receipts folder [inferred]
Top 3 Pain Points: fast proposal race, double entry after marketplace booking, payout and commission reconciliation
Deal-Breakers:     missing a Take a Chef request, violating platform communication rules, wrong commission or payout math, losing menu or allergy details during handoff
Success Metric:    every Take a Chef request, proposal, booking, menu, prep plan, payout, review, and client history is reflected in ChefFlow within the same day without manual reconstruction.
ChefFlow Surface:  `/marketplace`, `/marketplace/capture`, `/import?mode=take-a-chef`, `/inquiries?channel=take_a_chef`, `/events/[id]`, `/clients/[id]`, `/finance/*`, `/insights`

External platform facts used:

- Take a Chef says guests submit event details, local chefs respond with personalized menu and budget proposals, and the selected chef is reserved through the platform. Source: https://www.takeachef.com/en-ae/faqs, lines 47-52 from browser evidence.
- Take a Chef says chefs can sign up free, receive local requests after profile approval, and respond with menu suggestions. Source: https://www.takeachef.com/en-ae/faqs, lines 61-68 from browser evidence.
- Take a Chef says speed matters because guests receive a limited set of proposals and response rate affects prioritization. Source: https://www.takeachef.com/en-ae/faqs, lines 69-72 from browser evidence.
- Take a Chef says pre-booking communication should remain on the platform, and noncompliance may risk suspension or deactivation. Source: https://www.takeachef.com/en-ae/faqs, lines 97-102 from browser evidence.
- Take a Chef official help currently has conflicting commission wording: title and subtitle say 20%, body also references 18%. Source: https://helpcenter.takeachef.com/understanding-our-18-commission, lines 40-45 from browser evidence.

## 2. WORKFLOW SIMULATION
### Stage 1: Inquiry Received
What Valentina does: She receives many Take a Chef requests, must decide quickly which to answer, and cannot let high-value leads age.

What ChefFlow offers: `/marketplace` shows all marketplace leads, untouched leads, stale leads, proposal follow-ups, upcoming bookings, payout watch, and commission mismatches (`app/(chef)/marketplace/page.tsx:117`, `app/(chef)/marketplace/page.tsx:367`, `app/(chef)/marketplace/page.tsx:397`, `app/(chef)/marketplace/page.tsx:403`, `app/(chef)/marketplace/page.tsx:409`). The marketplace command action fetches marketplace inquiries, scopes by tenant, calculates stale leads over 24 hours, and builds linked upcoming bookings (`lib/marketplace/command-center-actions.ts:56`, `lib/marketplace/command-center-actions.ts:64`, `lib/marketplace/command-center-actions.ts:80`, `lib/marketplace/command-center-actions.ts:101`, `lib/marketplace/command-center-actions.ts:106`). The lifecycle blueprint requires source tracking, response target, and response-time tracking (`docs/service-lifecycle-blueprint.md:13`, `docs/service-lifecycle-blueprint.md:14`, `docs/service-lifecycle-blueprint.md:29`, `docs/service-lifecycle-blueprint.md:30`).

Gap analysis: ChefFlow can triage already captured Take a Chef requests, but the evidence does not prove an end-to-end automatic Take a Chef inbox sync. The empty state says to connect Gmail and let ChefFlow pull in requests (`app/(chef)/marketplace/page.tsx:342`, `app/(chef)/marketplace/page.tsx:344`), while the durable current flows are manual import, bookmarklet capture, and marketplace records. For a high-volume TAC-only chef, manual capture is not sufficient.

Friction score: 2

### Stage 2: Discovery
What Valentina does: She reads TAC request fields, asks clarifying questions inside Take a Chef, and keeps all pre-booking communication in TAC.

What ChefFlow offers: Inquiry detail has a TAC workflow guide, TAC capture panels, status-specific TAC panels, transcript prompt, and communication log (`app/(chef)/inquiries/[id]/page.tsx:774`, `app/(chef)/inquiries/[id]/page.tsx:777`, `app/(chef)/inquiries/[id]/page.tsx:859`, `app/(chef)/inquiries/[id]/page.tsx:1220`, `app/(chef)/inquiries/[id]/page.tsx:1230`). Inquiry detail includes a critical path and service lifecycle panel with missing information tracking (`docs/app-complete-audit.md:637`). Discovery requirements include guest list, per-guest restrictions, allergy severity, and direct dietary confirmation where needed (`docs/service-lifecycle-blueprint.md:38`, `docs/service-lifecycle-blueprint.md:40`, `docs/service-lifecycle-blueprint.md:41`, `docs/service-lifecycle-blueprint.md:42`, `docs/service-lifecycle-blueprint.md:44`).

Gap analysis: ChefFlow can store discovery and prompt transcript capture, but it cannot safely replace TAC messaging before booking. It also cannot prove it has the latest TAC thread unless Valentina pastes or captures it.

Friction score: 2

### Stage 3: Quote and Proposal
What Valentina does: She must send a TAC proposal fast, with a menu and budget that fits TAC request constraints.

What ChefFlow offers: `/quotes/new` supports source-aware inquiry prefill, pricing history, smart pricing hints, calculators, pricing model, deposit, validity, and notes (`docs/app-complete-audit.md:650`). `/rate-card` is a mobile pricing reference (`docs/app-complete-audit.md:656`, `docs/app-complete-audit.md:658`, `docs/app-complete-audit.md:660`). Menu creation and editing are complete, with cost, allergen, budget compliance, and client-context sidebars (`docs/app-complete-audit.md:790`, `docs/app-complete-audit.md:792`, `docs/app-complete-audit.md:793`, `docs/app-complete-audit.md:794`). Take a Chef proposal status can be marked from the marketplace panel (`components/marketplace/marketplace-action-panel.tsx:105`, `components/marketplace/marketplace-action-panel.tsx:200`, `components/marketplace/marketplace-action-panel.tsx:205`).

Gap analysis: ChefFlow can draft the operational quote and menu, but there is no evidence it submits the proposal into Take a Chef or reads the final TAC proposal state automatically. Valentina must copy from ChefFlow to TAC, then mark "Proposal Sent."

Friction score: 2

### Stage 4: Booking and Agreement
What Valentina does: Client confirms and pays through Take a Chef. Contact details become available after confirmation, then the chef can finalize details off-platform while preserving TAC records.

What ChefFlow offers: Smart Import creates client, inquiry, draft event, event transition, and optional commission expense from pasted TAC booking text (`lib/ai/import-take-a-chef-action.ts:88`, `lib/ai/import-take-a-chef-action.ts:102`, `lib/ai/import-take-a-chef-action.ts:166`, `lib/ai/import-take-a-chef-action.ts:203`, `lib/ai/import-take-a-chef-action.ts:244`, `lib/ai/import-take-a-chef-action.ts:256`). The TAC import UI explains it extracts client, date, guest count, location, occasion, and dietary notes (`components/import/take-a-chef-import.tsx:153`, `components/import/take-a-chef-import.tsx:158`, `components/import/take-a-chef-import.tsx:162`). Event detail supports contracts and client portal QR (`docs/app-complete-audit.md:419`, `docs/app-complete-audit.md:421`, `docs/app-complete-audit.md:422`).

Gap analysis: Booking import works only after notification text exists and is pasted or saved through capture. Agreement handling is tricky: TAC is the commercial booking authority, so ChefFlow contracts and client portal must be optional internal/supporting records for TAC-origin events, not conflicting acceptance rails.

Friction score: 2

### Stage 5: Menu Planning
What Valentina does: Finalizes menu after client confirmation, often with TAC thread context and post-booking direct contact.

What ChefFlow offers: Menu library picker, menu approval, menu editor, allergen conflict, dietary panels, and client taste context exist (`docs/app-complete-audit.md:445`, `docs/app-complete-audit.md:446`, `docs/app-complete-audit.md:793`, `docs/app-complete-audit.md:794`). Recipes are chef IP and managed manually (`docs/product-blueprint.md:91`, `docs/product-blueprint.md:93`, `docs/product-blueprint.md:95`). The system must not generate recipes (`docs/product-blueprint.md:257`, `docs/product-blueprint.md:259`).

Gap analysis: Strong fit, as long as ChefFlow treats imported TAC menu text as recordkeeping and menu assembly, not AI-generated culinary authorship.

Friction score: 1

### Stage 6: Prep, Shopping, Staff, Service
What Valentina does: Shops, preps, coordinates staff, executes service, and captures day-of changes.

What ChefFlow offers: Event Ops includes time tracking, prep plan, service simulation, staff, temp logging, substitutions, prep docs, and readiness gates (`project-map/chef-os/events.md:14`, `project-map/chef-os/events.md:17`, `project-map/chef-os/events.md:24`). Pre-service checklist generates safety, prep, venue, staff, and service items from event data (`docs/app-complete-audit.md:1152`, `docs/app-complete-audit.md:1154`, `docs/app-complete-audit.md:1156`, `docs/app-complete-audit.md:1168`). Calendar views include events, drafts, prep blocks, calls, personal and business filters (`docs/app-complete-audit.md:872`, `docs/app-complete-audit.md:874`). Culinary costing has event shopping planner, cost impact panel, store scorecard, and price confidence (`docs/app-complete-audit.md:831`, `docs/app-complete-audit.md:833`).

Gap analysis: Strong once the event exists in ChefFlow. Weak if TAC details are stale or incomplete at import.

Friction score: 1

### Stage 7: Payment, Payout, Commission
What Valentina does: She trusts TAC to collect payment, then waits for payout and needs to reconcile commission, payout amount, receipts, and real profit.

What ChefFlow offers: Financial hub, payments, ledger, payouts, reporting, tax, and event profitability exist (`docs/app-complete-audit.md:719`, `docs/app-complete-audit.md:723`, `docs/app-complete-audit.md:741`, `docs/app-complete-audit.md:745`, `docs/app-complete-audit.md:749`, `docs/app-complete-audit.md:753`). TAC finance actions save gross booking, commission percent, payout amount, payout status, arrival date, reference, notes, and sync a commission expense (`lib/integrations/take-a-chef-finance-actions.ts:15`, `lib/integrations/take-a-chef-finance-actions.ts:145`, `lib/integrations/take-a-chef-finance-actions.ts:189`, `lib/integrations/take-a-chef-finance-actions.ts:219`, `lib/integrations/take-a-chef-finance-actions.ts:226`, `lib/integrations/take-a-chef-finance-actions.ts:260`). TAC commission defaults encode legacy 18%, current 20%, and the 2026-03-09 changeover (`lib/integrations/take-a-chef-defaults.ts:1`, `lib/integrations/take-a-chef-defaults.ts:2`, `lib/integrations/take-a-chef-defaults.ts:3`, `lib/integrations/take-a-chef-defaults.ts:32`, `lib/integrations/take-a-chef-defaults.ts:38`).

Gap analysis: The model is strong, but the official TAC commission source is currently inconsistent, and ChefFlow still depends on manual or captured payout data. A TAC-only power user needs a per-booking commission evidence field, not just a default.

Friction score: 1

### Stage 8: Service Day
What Valentina does: Executes the event and must not refer guests to the wrong portal or payment path.

What ChefFlow offers: Guest portal, reminders, dietary confirmations, attendance, documents, feedback, and communication log are available on event detail (`docs/app-complete-audit.md:424`, `docs/app-complete-audit.md:425`, `docs/app-complete-audit.md:426`, `docs/app-complete-audit.md:427`, `docs/app-complete-audit.md:428`, `docs/app-complete-audit.md:431`, `docs/app-complete-audit.md:432`, `docs/app-complete-audit.md:441`).

Gap analysis: Useful after booking. Risky if ChefFlow exposes direct payment or acceptance CTAs on a TAC-origin booking in a way that conflicts with the platform booking source.

Friction score: 1

### Stage 9: Wrap-Up
What Valentina does: Closes event, reconciles payout, requests or tracks TAC review, and logs internal debrief.

What ChefFlow offers: Review import and external review display exist (`docs/app-complete-audit.md:1223`, `docs/app-complete-audit.md:1227`). Event wrap-up captures AAR and lifecycle progress (`project-map/chef-os/events.md:18`). Post-event lifecycle requires thank-you, review request, payment reconciliation, after-action notes, guest preferences, and profitability (`docs/service-lifecycle-blueprint.md:320`, `docs/service-lifecycle-blueprint.md:327`, `docs/service-lifecycle-blueprint.md:336`, `docs/service-lifecycle-blueprint.md:344`, `docs/service-lifecycle-blueprint.md:345`, `docs/service-lifecycle-blueprint.md:350`).

Gap analysis: Good internal closeout, but no evidence of TAC review status import. Reviews can be imported, but the TAC review lifecycle is not first-class enough for someone whose public reputation lives there.

Friction score: 2

### Stage 10: Client Lifecycle
What Valentina does: Maintains TAC reputation and may or may not pursue direct rebooking. For this persona, the user constraint says she only uses Take a Chef, so direct conversion is not the goal.

What ChefFlow offers: Client detail has roughly 30 panels for profile, preferences, spending, communication, milestones, household, kitchen, allergies, timeline, and event history (`docs/app-complete-audit.md:533`, `docs/app-complete-audit.md:543`, `docs/app-complete-audit.md:548`, `docs/app-complete-audit.md:551`, `docs/app-complete-audit.md:558`, `docs/app-complete-audit.md:563`, `docs/app-complete-audit.md:572`, `docs/app-complete-audit.md:573`). ROI analytics explicitly frame Take a Chef as acquisition and ChefFlow as direct relationship conversion (`components/analytics/insights-client.tsx:635`, `components/analytics/insights-client.tsx:637`, `components/analytics/insights-client.tsx:769`, `components/analytics/insights-client.tsx:770`, `components/analytics/insights-client.tsx:771`). Marketplace ROI calculates direct rebooking savings from marketplace-origin clients (`lib/marketplace/roi-actions.ts:28`, `lib/marketplace/roi-actions.ts:39`, `lib/marketplace/roi-actions.ts:145`, `lib/marketplace/roi-actions.ts:151`).

Gap analysis: Client memory is excellent. Product framing is partially misaligned for a TAC-only chef because it nudges "capture, convert, keep the client" rather than "operate flawlessly inside TAC."

Friction score: 2

### First 10 Minutes
Valentina can find `/marketplace`, `/import?mode=take-a-chef`, and `/marketplace/capture`. She can paste one booking notification and get a client, inquiry, draft event, and commission expense. If she expects automatic TAC sync immediately, she will not see proof.

### First Day
She can import recent bookings, capture live TAC pages, and start working event detail, menu, prep, calendar, and finance. The pain is volume: each TAC thread and proposal still needs manual capture or confirmation.

### First Week
She can run booked services well once captured. The largest operational break is keeping TAC proposal, message, booking, payout, and review state current while she is busy responding fast.

### First Month
Retention depends on whether Marketplace Command Center becomes the daily source of truth. Today it is a strong shadow ledger for captured data, not a complete TAC twin.

## 3. CAPABILITY AUDIT
Onboarding & Setup - PARTIAL
  Evidence: Smart Import has a Take a Chef tab (`app/(chef)/import/page.tsx:30`, `app/(chef)/import/page.tsx:36`, `components/import/smart-import-hub.tsx:47`, `components/import/smart-import-hub.tsx:131`).
  Gap: No guided "TAC-only operating mode" that says exactly what to connect, what remains manual, and what should never be done before TAC confirmation.
  Impact: High-volume chef may trust an incomplete sync model.

Client Management - SUPPORTED
  Evidence: Client detail includes preferences, household, allergy, kitchen, address, communication, timeline, and event history panels (`docs/app-complete-audit.md:533`, `docs/app-complete-audit.md:563`, `docs/app-complete-audit.md:564`, `docs/app-complete-audit.md:568`, `docs/app-complete-audit.md:569`, `docs/app-complete-audit.md:572`, `docs/app-complete-audit.md:573`).
  Gap: None for internal memory.
  Impact: This is one of ChefFlow's strongest surfaces for TAC aftercare.

Inquiry Pipeline - PARTIAL
  Evidence: `/inquiries` has a TakeAChef filter and inquiry detail has TAC-specific panels (`docs/app-complete-audit.md:630`, `app/(chef)/inquiries/[id]/page.tsx:859`).
  Gap: No proven automatic TAC message or request sync.
  Impact: Missed TAC requests cost revenue and platform ranking.

Event Lifecycle - SUPPORTED
  Evidence: Event detail has operating spine lanes, readiness, finance, communication, and lifecycle panels (`docs/app-complete-audit.md:389`, `docs/app-complete-audit.md:391`, `docs/app-complete-audit.md:393`, `docs/app-complete-audit.md:397`, `docs/app-complete-audit.md:415`).
  Gap: TAC-origin guardrails around platform-owned booking state need to be clearer.
  Impact: Event execution works after capture.

Menu & Recipe - SUPPORTED
  Evidence: Menus, menu editor, allergen matrix, client context, and recipe book exist (`docs/app-complete-audit.md:790`, `docs/app-complete-audit.md:793`, `docs/app-complete-audit.md:794`, `docs/app-complete-audit.md:803`).
  Gap: No direct TAC proposal submission.
  Impact: Great internal creation, copy-paste outbound.

Culinary Ops - SUPPORTED
  Evidence: Costing, shopping planner, prep, vendors, inventory, and pre-service checklist exist (`docs/app-complete-audit.md:831`, `docs/app-complete-audit.md:833`, `docs/app-complete-audit.md:839`, `docs/app-complete-audit.md:845`, `docs/app-complete-audit.md:849`, `docs/app-complete-audit.md:1152`).
  Gap: Depends on captured menu and guest data.
  Impact: Strong execution layer.

Financial - PARTIAL
  Evidence: TAC import logs commission expense, payout panel can sync commission expense, and finance pages support payouts and ledger (`lib/ai/import-take-a-chef-action.ts:256`, `lib/integrations/take-a-chef-finance-actions.ts:219`, `docs/app-complete-audit.md:743`, `docs/app-complete-audit.md:747`).
  Gap: Needs per-booking evidence when TAC commission is 18%, 20%, partner split, or otherwise adjusted.
  Impact: Current math is useful but can be wrong if default is trusted over booking evidence.

Calendar & Scheduling - SUPPORTED
  Evidence: Calendar has monthly, day, week, year, share, schedule, and waitlist surfaces (`docs/app-complete-audit.md:868`, `docs/app-complete-audit.md:872`, `docs/app-complete-audit.md:874`, `docs/app-complete-audit.md:876`, `docs/app-complete-audit.md:878`).
  Gap: No direct TAC availability sync evidenced.
  Impact: Good internal schedule, not platform availability authority.

Communication - PARTIAL
  Evidence: Inbox triage, chat, inquiry communication log, transcript prompt, and call recommendations exist (`docs/app-complete-audit.md:884`, `docs/app-complete-audit.md:888`, `docs/app-complete-audit.md:892`, `app/(chef)/inquiries/[id]/page.tsx:1220`, `app/(chef)/inquiries/[id]/page.tsx:1230`).
  Gap: TAC pre-booking communication must stay in TAC, so ChefFlow cannot be the sending surface unless it opens TAC and logs status.
  Impact: Compliance risk if chef confuses ChefFlow messaging with TAC-authorized communication.

Staff & Team - SUPPORTED
  Evidence: Staff list, detail, schedule, availability, clock, performance, and labor exist (`docs/app-complete-audit.md:897`, `docs/app-complete-audit.md:901`, `docs/app-complete-audit.md:903`, `docs/app-complete-audit.md:904`, `docs/app-complete-audit.md:905`, `docs/app-complete-audit.md:907`).
  Gap: None specific to TAC.
  Impact: Works for larger TAC bookings.

Analytics & Intelligence - PARTIAL
  Evidence: Insights has a Take a Chef ROI tab and marketplace ROI tracks direct rebooking savings (`docs/app-complete-audit.md:1013`, `components/analytics/insights-client.tsx:628`, `lib/marketplace/roi-actions.ts:28`).
  Gap: Analytics optimize direct conversion, not TAC-only platform excellence.
  Impact: Wrong success metric for this persona.

Public Presence - PARTIAL
  Evidence: Public chef profile, reviews, direct inquiry page, booking pages, and operator pages exist (`docs/app-complete-audit.md:1229`, `docs/app-complete-audit.md:1236`, `docs/app-complete-audit.md:1245`, `docs/app-complete-audit.md:2042`).
  Gap: Valentina does not want public ChefFlow booking to compete with TAC.
  Impact: Surfaces must be quiet or configured away for TAC-only mode.

### Capability Summary
| Domain | Rating | Key Gap |
|--------|--------|---------|
| Onboarding & Setup | PARTIAL | No TAC-only operating mode |
| Client Management | SUPPORTED | None for internal memory |
| Inquiry Pipeline | PARTIAL | No proven automatic TAC sync |
| Event Lifecycle | SUPPORTED | TAC-origin booking guardrails need clarity |
| Menu & Recipe | SUPPORTED | No direct TAC proposal submission |
| Culinary Ops | SUPPORTED | Depends on fresh captured data |
| Financial | PARTIAL | Commission evidence can differ from defaults |
| Calendar & Scheduling | SUPPORTED | No TAC availability sync evidenced |
| Communication | PARTIAL | TAC messaging cannot be replaced pre-booking |
| Staff & Team | SUPPORTED | None specific to TAC |
| Analytics & Intelligence | PARTIAL | Direct-conversion framing conflicts with TAC-only mode |
| Public Presence | PARTIAL | Public booking may conflict with TAC-only positioning |

## 4. FAILURE MAP
[BLOCKER] [severity: critical]
  What: ChefFlow is not yet a complete, automatic Take a Chef twin. A high-volume TAC-only chef can miss or stale out a request if it is not imported, captured, or synced.
  Where: `/marketplace` and import/capture path. Evidence: manual import and capture flows in `components/import/take-a-chef-import.tsx:153`, `components/marketplace/take-a-chef-capture-tool.tsx:137`, `lib/marketplace/command-center-actions.ts:64`.
  Persona impact: Lost proposal slot, reduced TAC ranking, lost booking.
  Required fix: Add a TAC operating mode checklist and a verified request ingestion status panel on `/marketplace`, backed by `lib/marketplace/command-center-actions.ts` and Gmail/platform ingestion evidence.
  Scope class: EXPAND

[WORKFLOW BREAK] [severity: high]
  What: Pre-booking communication must stay in Take a Chef, but ChefFlow has messaging, AI response, and client portal surfaces that could look like acceptable outbound rails.
  Where: Inquiry communication and client portal surfaces: `docs/app-complete-audit.md:637`, `docs/app-complete-audit.md:884`, `docs/app-complete-audit.md:1948`.
  Persona impact: Suspension risk or record fragmentation.
  Required fix: Add TAC-origin communication guardrails on `app/(chef)/inquiries/[id]/page.tsx` and `components/marketplace/marketplace-action-panel.tsx`: "Open in TAC", "I responded in TAC", "Paste TAC transcript", and suppress direct client messaging before booking confirmation.
  Scope class: REFINE

[MONEY RISK] [severity: high]
  What: TAC commission evidence can vary by date and partnership. Official TAC docs currently expose conflicting 18% and 20% wording, and ChefFlow has defaults.
  Where: `lib/integrations/take-a-chef-defaults.ts:1`, `lib/integrations/take-a-chef-defaults.ts:2`, `lib/integrations/take-a-chef-defaults.ts:3`, `lib/integrations/take-a-chef-finance-actions.ts:224`.
  Persona impact: Wrong profit, wrong tax category, wrong payout expectation.
  Required fix: On TAC finance panel, require or visibly label commission source as booking evidence, derived, or default before syncing expense.
  Scope class: REFINE

[DATA DEAD-END] [severity: high]
  What: Captured TAC proposal/menu/review state is stored as context, but there is no single "TAC event mirror" showing request, proposal, booking, menu, payout, review, and transcript completeness.
  Where: Capture data appears on inquiry detail (`app/(chef)/inquiries/[id]/page.tsx:777`) and marketplace panels, but event and finance surfaces are separate.
  Persona impact: Valentina still checks TAC manually to know whether ChefFlow is current.
  Required fix: Add a TAC Mirror card to `/events/[id]` for TAC-origin events using existing inquiry unknown fields and payout summaries.
  Scope class: EXPAND

[TRUST VIOLATION] [severity: medium]
  What: The product copy emphasizes converting marketplace clients to direct rebooking, but this persona intentionally remains TAC-only.
  Where: `app/(chef)/marketplace/page.tsx:117`, `app/(chef)/marketplace/page.tsx:119`, `components/analytics/insights-client.tsx:769`, `components/analytics/insights-client.tsx:770`.
  Persona impact: Wrong mental model and possible platform-compliance anxiety.
  Required fix: Add a setting for "Marketplace operating model: TAC-only / hybrid / direct-conversion" and change Marketplace/Insights copy accordingly.
  Scope class: REFINE

[WORKFLOW BREAK] [severity: medium]
  What: No first-class TAC review lifecycle, even though TAC reviews drive future bookings.
  Where: Reviews exist generally (`docs/app-complete-audit.md:1227`) but TAC review status is not a dedicated marketplace checkpoint.
  Persona impact: Missed review request, weaker TAC profile, lower future lead quality.
  Required fix: Add "TAC review requested/received/imported/responded" to marketplace follow-up data and event wrap-up.
  Scope class: EXPAND

### Failure Summary
| Category | Critical | High | Medium |
|----------|----------|------|--------|
| BLOCKER | 1 | 0 | 0 |
| MONEY RISK | 0 | 1 | 0 |
| DATA DEAD-END | 0 | 1 | 0 |
| TRUST VIOLATION | 0 | 0 | 1 |
| WORKFLOW BREAK | 0 | 1 | 1 |

## 5. REQUIRED ADDITIONS
Quick Wins (< 2 hours each):

- Add TAC-only operating mode copy to `/marketplace` and `/import?mode=take-a-chef` - files: `app/(chef)/marketplace/page.tsx`, `components/import/take-a-chef-import.tsx` - resolves BLOCKER and TRUST VIOLATION - REFINE
- Add pre-booking communication warning to TAC inquiry detail - file: `app/(chef)/inquiries/[id]/page.tsx` - resolves WORKFLOW BREAK - REFINE
- Add "commission source" label wherever TAC commission is displayed - files: `components/marketplace/marketplace-action-panel.tsx`, TAC finance panel owner - resolves MONEY RISK - REFINE
- Rename or mode-gate direct-conversion ROI copy for TAC-only operators - files: `app/(chef)/marketplace/page.tsx`, `components/analytics/insights-client.tsx` - resolves TRUST VIOLATION - REFINE

Medium Builds (2-8 hours each):

- TAC Mirror card on event detail - files: `app/(chef)/events/[id]/page.tsx`, marketplace/TAC finance readers - resolves DATA DEAD-END - EXPAND
- TAC review lifecycle fields and wrap-up prompts - files: marketplace command center, reviews/AAR surfaces, event wrap-up surface - resolves WORKFLOW BREAK - EXPAND
- Verified ingestion health panel - files: `lib/marketplace/command-center-actions.ts`, `app/(chef)/marketplace/page.tsx` - resolves BLOCKER - EXPAND

Large Builds (> 8 hours each):

- Automatic TAC request/thread sync through email or authorized platform capture - scope: ingestion worker, dedupe, platform record snapshots, dashboard freshness, failure states - resolves BLOCKER and DATA DEAD-END - spec needed: yes - EXPAND
- TAC proposal round-trip support without violating TAC terms - scope: draft in ChefFlow, open TAC composer, capture sent state, require user confirmation - resolves WORKFLOW BREAK - spec needed: yes - EXPAND

Out-of-Scope:

- Direct API integration with Take a Chef if no supported chef API exists - outside ChefFlow control. The persona must use email/capture/bookmarklet or official export paths instead.
- Replacing TAC payments, reviews, or marketplace ranking - conflicts with "only uses Take a Chef." ChefFlow should mirror and reconcile, not replace.

## 6. SYSTEM BEHAVIOR REQUIREMENTS
BEHAVIOR: TAC is the platform authority
  Rule: For TAC-origin inquiries before confirmation, ChefFlow must never imply that direct ChefFlow messaging, payment, or booking acceptance replaces Take a Chef.
  Trigger: Inquiry channel or external platform is `take_a_chef`.
  Violation example: A chef sends a ChefFlow client portal payment link before TAC confirmation.
  Test: Open a TAC new inquiry and confirm only "Open in TAC", "I responded in TAC", and transcript/capture actions are prominent.

BEHAVIOR: Captured freshness is visible
  Rule: Every TAC-origin record must show when it was last captured or synced, and what source was used.
  Trigger: TAC inquiry or event detail page.
  Violation example: Event appears current even though the TAC thread changed after last capture.
  Test: Save a page capture, then verify inquiry/event displays captured_at and capture_type.

BEHAVIOR: Commission math is evidence-ranked
  Rule: Commission calculations must prefer booking-specific evidence, then stored event metadata, then current default, and must display the source.
  Trigger: Import, payout panel, marketplace watchlist, ROI.
  Violation example: A partner-sourced TAC booking at 30% is reconciled at 20% without warning.
  Test: Save finance details with explicit commission, then clear it and verify the UI labels default-based estimates.

BEHAVIOR: TAC-only mode suppresses direct-conversion framing
  Rule: If the chef selects TAC-only, Marketplace and Insights copy must optimize response speed, platform reputation, payout accuracy, and repeat TAC readiness, not direct conversion.
  Trigger: Marketplace operating model setting.
  Violation example: Dashboard celebrates direct rebooking savings for an operator who intentionally keeps everything on TAC.
  Test: Toggle TAC-only and verify ROI copy changes or is replaced by TAC performance metrics.

BEHAVIOR: Manual capture cannot masquerade as automation
  Rule: If a TAC request exists only because of manual paste/bookmarklet capture, ChefFlow must say so.
  Trigger: Smart Import, capture, marketplace queue, event mirror.
  Violation example: "All TAC requests synced" appears when only one page was captured.
  Test: Create manual import and verify source labels say manual import or page capture.

## 7. SCORE
Workflow Coverage: 58/100. ChefFlow covers captured event execution very well, but automatic TAC request/thread/proposal freshness is not proven (`components/import/take-a-chef-import.tsx:153`, `components/marketplace/take-a-chef-capture-tool.tsx:137`).
Data Model Fit: 72/100. TAC channel, platform records, unknown_fields, payout metadata, commission expenses, clients, inquiries, and events can represent the workflow (`lib/ai/import-take-a-chef-action.ts:157`, `lib/integrations/take-a-chef-finance-actions.ts:189`, `lib/analytics/source-provenance.ts:18`, `lib/analytics/source-provenance.ts:106`).
UX Alignment: 61/100. Marketplace Command Center exists, but direct-conversion framing conflicts with TAC-only use (`app/(chef)/marketplace/page.tsx:117`, `components/analytics/insights-client.tsx:769`).
Financial Accuracy: 59/100. Finance support is real, but a MONEY RISK caps this dimension because commission defaults can diverge from booking-specific evidence (`lib/integrations/take-a-chef-defaults.ts:1`, `lib/integrations/take-a-chef-defaults.ts:2`, `lib/integrations/take-a-chef-finance-actions.ts:224`).
Onboarding Viability: 62/100. A chef can import one booking quickly, but no TAC-only setup proof exists (`app/(chef)/import/page.tsx:61`, `components/import/take-a-chef-import.tsx:217`).
Retention Likelihood: 64/100. Captured bookings become valuable operational records, but high-volume TAC-only retention depends on ingestion reliability and platform-compliance clarity.

### Score Card
| Dimension | Score | Justification |
|-----------|-------|--------------|
| Workflow Coverage (30%) | 58 | Captured events run well, but no complete automatic TAC twin is proven. |
| Data Model Fit (20%) | 72 | Existing channel, inquiry, event, client, capture, finance, and provenance structures fit TAC mirroring. |
| UX Alignment (15%) | 61 | Marketplace UI exists but optimizes hybrid/direct conversion more than TAC-only excellence. |
| Financial Accuracy (15%) | 59 | TAC commission/payout tools exist, but booking-specific evidence must outrank defaults. |
| Onboarding Viability (10%) | 62 | First booking import is viable, full TAC-only setup is not self-proving. |
| Retention Likelihood (10%) | 64 | Strong after capture, weak if capture freshness is manual. |
| **FINAL SCORE** | **62/100** | **USABLE** |

## 8. VERDICT
Valentina can use ChefFlow today as a strong internal operating layer for Take a Chef bookings after they are captured. She cannot yet use it as a complete tandem system because the critical path still depends on manual TAC import/capture and does not clearly enforce TAC's pre-booking communication boundary.

The single highest-impact change is a TAC Mirror surface that proves ingestion freshness, platform status, proposal state, transcript state, payout state, commission evidence, and review state for every TAC-origin event.
