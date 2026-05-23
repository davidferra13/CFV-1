# Chef Life Expansion Swarm Spec Pack

Date: 2026-05-20

Source: Build queue pattern audit across recent ChefFlow queue items, with CLO-40 blind-spot check.

Purpose: Convert the biggest product/codebase gaps into deep, swarm-ready build specs. This is not a fired run and does not implement app code. Each section can become a queue item family or a direct Codex swarm prompt when the queue is fired.

## Executive Pattern

The current build queue is strongest around ChefFlow's nervous system: navigation, rails, proof, UI coherence, relationship memory, pricing intelligence, communications, recovery states, dashboard calm, and unknown-dependency reasoning.

The underbuilt opportunity is ChefFlow's chef-world body: health, legal exposure, insurance, permits, sanitation, procurement, facilities, staff trust, household complexity, personal finances, career arc, crisis response, family constraints, sustainability, and long-term ownership.

The next product leap is to make ChefFlow a private operating memory for the chef's whole life and business, not only a polished workflow shell.

## Program 1 - Chef Capacity Twin

### Product Thesis

ChefFlow should know whether the chef can safely take, prep, staff, travel to, execute, and recover from a job. The chef's body is the business. Capacity cannot be reduced to open calendar slots.

### CLO-40 Coverage

- #9 Kitchen Execution and Service Flow: workload, prep, service, cleanup, and recovery capacity.
- #23 Operations and Logistics: travel, errands, loadout, staging, and sequencing.
- #24 Scheduling and Time Management: truthful availability rather than empty time blocks.
- #32 Personal Health, Injury, Sleep, and Aging: body-aware workload planning.
- #33 Mental Health, Burnout, Addiction Risk, and Recovery: boundary setting and overload prevention.
- #35 Personal Finances, Housing, Debt, and Stability: capacity decisions affect cash runway.

### Primary User Outcomes

- Chef can see whether a week is physically and operationally overloaded before accepting more work.
- Chef can distinguish calendar availability from real capacity.
- Chef can enter private constraints such as injury, sleep debt, recovery needs, caregiving windows, travel strain, or burnout risk.
- ChefFlow can warn when an inquiry, quote, or client request would create unsafe or unsustainable load.
- ChefFlow can recommend safer alternatives: higher price, different date, staff help, narrower scope, prep split, or decline.

### Domain Model

- Capacity profile: chef-owned private settings for max prep hours, max service hours, max travel time, recovery needs, preferred work cadence, rest days, injury limits, no-lift limits, cognitive load tolerance, and stress triggers.
- Workload estimate: event/menu/client/location-derived estimate for prep, shopping, admin, travel, service, cleanup, recovery, and communication.
- Capacity state: available, tight, overloaded, unsafe, recovery-required, unknown.
- Constraint source: manual chef input, event plan, menu plan, quote, calendar, staff availability, travel estimate, prior event history, or Remy/manual note.
- Override record: chef can knowingly override a warning with reason and expiry.
- Privacy model: private_only by default; never public or client-facing unless explicitly converted into a client-safe scheduling explanation.

### Key Surfaces

- Chef dashboard capacity strip.
- Calendar capacity overlay.
- Inquiry/quote acceptance gate.
- Event detail capacity panel.
- Remy answer boundary: Remy can explain capacity, but cannot expose sensitive health details to clients.
- Client-safe alternative proposal copy: "The earliest realistic date is..." without exposing personal health or family constraints.

### Swarm Build Prompt

```text
Use a wave-based parallel swarm build for this task:

Build Chef Capacity Twin: a private, body-aware and operations-aware capacity system that predicts whether the chef can safely accept and execute work. It must distinguish open calendar time from real prep/service/recovery capacity, integrate with inquiries, quotes, calendar, event plans, dashboard, Remy, and client-safe communication boundaries.

Core operating rule:
Build in parallel. Merge serially. Verify before the next wave.

Before coding, create a concise wave plan with wave names, agent lanes, file ownership boundaries, correct module/domain placement, user roles affected, data ownership rules, security risks, and verification steps.

Wave 1 - Domain/Data/Security:
- Inspect existing calendar, availability, event, inquiry, quote, dashboard, Remy, and client communication modules.
- Add the smallest compatible capacity domain model.
- Define chef-owned private capacity profile, workload estimates, capacity states, constraint sources, and override records.
- Enforce server-side chef tenant ownership for all private capacity data.
- Do not expose health, injury, sleep, family, burnout, or recovery details to client/public users.

Wave 2 - Estimation Engine:
- Build deterministic workload estimation from event date, guest count, menu complexity, service style, travel/location, staff plan, prep plan, shopping needs, cleanup, admin, and communication load.
- Include unknown-state handling when input data is missing.
- Add explainable factors and confidence levels.
- Avoid fake stats; omit values that cannot be derived.

Wave 3 - Chef Surfaces:
- Add capacity strip to chef dashboard.
- Add capacity overlay to calendar/availability.
- Add capacity panel to event and quote/inquiry decision points.
- Include loading, empty, error, mobile, and accessibility states.
- Use existing design system and navigation patterns.

Wave 4 - Decision/Communication Integration:
- Gate inquiry acceptance and quote approval with capacity warnings.
- Provide chef-only override with reason.
- Generate client-safe date/scope alternatives without exposing private constraints.
- Teach Remy to reference capacity state safely and privately.

Wave 5 - Hardening/Verification:
- Verify URL guessing, route param tampering, server action abuse, cross-user leakage, and frontend-only security risks.
- Run focused tests for capacity estimation, tenant isolation, privacy filtering, and UI states.
- Verify the running app at http://localhost:3100 with relevant chef routes, console/network checks, mobile viewport checks, and proof screenshots.
- Produce a proof pack and do not mark complete if private constraints leak or surfaces are unwired.

Report each wave with files changed, roles affected, security checks, verification, and risks.
```

### Acceptance Criteria

- Chef can configure capacity constraints privately.
- Events/inquiries/quotes compute explainable capacity impact.
- Capacity state appears at the point where the chef makes acceptance and scheduling decisions.
- Client-facing surfaces never expose private health, family, burnout, injury, sleep, or recovery data.
- Unknown workload factors are visible and actionable rather than silently ignored.
- Mobile and desktop layouts are usable.
- Tenant scoping is enforced server-side.

## Program 2 - Compliance Concierge

### Product Thesis

ChefFlow should help chefs understand whether a job is legally, safely, and commercially risky before they commit. Private chef work crosses homes, venues, alcohol, cannabis, allergens, labor, insurance, food safety, permits, and local regulation.

### CLO-40 Coverage

- #7 Dietary Needs, Allergies, and Nutrition.
- #8 Food Safety and Sanitation.
- #21 Taxes, Legal, Insurance, and Compliance.
- #22 Licensing, Permits, and Regulation.
- #27 Conflict, Complaints, Recovery, and Crisis Handling.
- #38 Workplace Power, Exploitation, Discrimination, and Safety.

### Primary User Outcomes

- Chef can see compliance risks by event type, location, menu, guest count, venue, service style, alcohol/cannabis, allergens, staffing, and client claims.
- Chef can keep private documents and proof: licenses, insurance, permits, food safety certs, cannabis documentation, vendor certificates.
- ChefFlow can produce a non-legal-advice checklist and escalation prompt.
- Chef can gate high-risk events before quote, contract, and service day.

### Domain Model

- Compliance profile: chef-owned credentials, licenses, insurance, food safety certs, permit jurisdictions, regulated-service flags.
- Event risk factors: location, venue type, public/private, guest count, allergens, alcohol/cannabis, service style, staff/vendor involvement, transport, rented kitchen, reheating, leftovers, vulnerable diners.
- Compliance rule: region/service scoped checklist item with evidence requirement, freshness, severity, and recommendation.
- Compliance packet: event-specific readiness report.
- Disclaimer policy: product guidance, not legal advice.

### Key Surfaces

- Compliance center.
- Event compliance packet.
- Quote acceptance compliance gate.
- Public/profile proof chips only for explicitly public-safe credentials.
- Admin/support diagnostics for missing or stale proof without exposing private documents broadly.

### Swarm Build Prompt

```text
Use a wave-based parallel swarm build for this task:

Build Compliance Concierge: a chef-owned compliance and risk readiness system for legal, insurance, permit, sanitation, allergen, cannabis/alcohol, staff/vendor, and venue risks. It must create private compliance profiles, event-specific readiness packets, and safe quote/event gates without giving legal advice.

Core operating rule:
Build in parallel. Merge serially. Verify before the next wave.

Wave 1 - Domain/Data/Security:
- Inspect existing auth, profile, credentials, event, quote, cannabis, dietary, document/media, and public profile systems.
- Add compliance profile, document proof, event risk factor, compliance rule, and event compliance packet models using existing patterns.
- Enforce tenant ownership and role gates server-side.
- Mark credential visibility explicitly: private_only, chef_internal, client_safe, public_profile, requires_evidence, expired, never_publish.

Wave 2 - Risk Engine:
- Build deterministic risk classification for event type, location, venue, guest count, allergen severity, alcohol/cannabis, staff/vendor involvement, transport, rented facilities, leftovers, and vulnerable diners.
- Return readiness states: clear, needs-review, blocked, expired-proof, unknown-jurisdiction, consult-professional.
- Include jurisdiction as an explicit unknown when not modeled.

Wave 3 - Chef Surfaces:
- Add Compliance Center with credential vault, expiry reminders, missing proof, event-risk rollups, and private notes.
- Add event compliance packet on event detail.
- Add quote/contract gate when high-risk factors exist.
- Add mobile, empty, loading, error, and accessibility states.

Wave 4 - Safe Externalization:
- Public profile may show only explicitly public-safe verified credential chips.
- Client-facing event packet may show only client-safe readiness summaries, not private documents unless explicitly approved.
- Remy must not hallucinate legal advice and must route high-risk cases to review.

Wave 5 - Verification:
- Test visibility filtering, expired proof, unknown jurisdictions, tenant isolation, route protection, server action authorization, and public profile leakage.
- Verify running app routes at http://localhost:3100 with console/network checks and proof screenshots.
- Produce proof pack with acceptance evidence and remaining jurisdiction limitations.
```

### Acceptance Criteria

- Chef can store private compliance credentials and proof.
- Event-level compliance packet identifies risk factors and missing proof.
- Quote/event flow blocks or warns on high-risk missing compliance data.
- Public/client views never expose private documents by default.
- The product labels jurisdiction gaps and avoids pretending to give legal advice.

## Program 3 - Physical Event Loadout Brain

### Product Thesis

Menu intelligence is incomplete until it becomes physical execution: tools, pans, burners, station flow, packaging, transport, backups, setup, service, cleanup, and return-home checks.

### CLO-40 Coverage

- #5 Menu Design.
- #6 Ingredients and Sourcing.
- #9 Kitchen Execution and Service Flow.
- #10 Equipment, Tools, and Facilities.
- #23 Operations and Logistics.
- #27 Conflict, Complaints, Recovery, and Crisis Handling.

### Primary User Outcomes

- Chef can generate a loadout plan from menu, guest count, venue, service style, weather, staffing, and client/household constraints.
- ChefFlow can flag missing equipment, uncertain venue capabilities, risky dishes, long holding times, transport fragility, and recovery backups.
- Staff/vendor can receive limited task lists without full client/private data.

### Domain Model

- Equipment item: owned, rented, borrowed, venue-provided, vendor-provided, disposable, consumable.
- Loadout requirement: derived from dish/menu/station/service type.
- Venue capability: burners, oven, refrigeration, counter space, sink, parking, load-in, power, elevator, service path, storage.
- Pack state: needed, packed, staged, loaded, used, returned, damaged, missing.
- Station plan: prep, hot, cold, plating, beverage, dishwashing, storage, waste.

### Swarm Build Prompt

```text
Use a wave-based parallel swarm build for this task:

Build Physical Event Loadout Brain: a menu-to-equipment-to-venue execution system that creates pack lists, station plans, venue capability checks, missing-equipment risks, and staff-safe task lists from real event/menu/client/location data.

Core operating rule:
Build in parallel. Merge serially. Verify before the next wave.

Wave 1 - Inventory/Equipment Domain:
- Inspect event, menu, recipe, venue/location, staff/vendor, documents/media, and client preference modules.
- Add equipment item, venue capability, loadout requirement, station plan, and pack-state models.
- Enforce chef tenant ownership; staff/vendor access must be scoped to assigned event tasks only.

Wave 2 - Derivation Engine:
- Derive loadout requirements from menu dishes, guest count, service style, dietary risks, venue capabilities, weather, transport, and staffing.
- Flag unknown venue capabilities and missing equipment.
- Generate backup suggestions for fragile, hot-held, frozen, or allergy-sensitive dishes.

Wave 3 - User Surfaces:
- Add event loadout tab/panel.
- Add checklist modes: planning, packing, vehicle load, on-site setup, service, cleanup, return-home.
- Add station map/list surface.
- Add staff-safe task export without private client intelligence.

Wave 4 - Integration:
- Connect to event timeline, menu intelligence, client household memory, calendar/day-of mode, and Remy.
- Add reminders for rental pickup, vendor handoff, and damaged/missing equipment.
- Avoid duplicate inventory systems; reuse existing modules where possible.

Wave 5 - Verification:
- Test tenant scoping, staff scoped access, pack-state transitions, missing-equipment warnings, unknown venue data, mobile checklist usability, and public/client non-access.
- Verify running app at http://localhost:3100 with route proof, mobile proof, console/network checks, and proof pack.
```

### Acceptance Criteria

- A real event can produce a loadout plan from existing menu/event/location data.
- Unknown venue capability is treated as a first-class risk.
- Pack/checklist state persists and is tenant scoped.
- Staff/vendor view is limited and cannot expose private client memory.
- Mobile packing mode is usable one-handed.

## Program 4 - Vendor Trust Ledger

### Product Thesis

Pricing and menu planning depend on actual supplier reliability, not just nominal prices. ChefFlow should remember who delivers, who substitutes poorly, who runs late, who has quality issues, and who is safe for which clients/events.

### CLO-40 Coverage

- #6 Ingredients and Sourcing.
- #19 Pricing, Profit, and Cost Control.
- #23 Operations and Logistics.
- #25 Vendors, Partners, and Professional Network.
- #27 Conflict, Complaints, Recovery, and Crisis Handling.

### Primary User Outcomes

- Chef can track vendor reliability, quality, substitutions, lead times, delivery behavior, minimums, and relationship notes.
- PIE can prefer not just cheaper vendors, but safer vendors for a specific event.
- ChefFlow can detect vendor risk before menu promises are made.

### Domain Model

- Vendor profile, location, delivery zones, product categories, lead times, contact methods.
- Vendor performance event: on-time, late, missing item, bad substitution, quality issue, overcharge, refund, exceptional quality.
- Trust score by category, route, event type, season, product, and client importance.
- Vendor risk: unknown, price volatile, unreliable delivery, quality drift, allergen handling unknown, luxury proof weak.

### Swarm Build Prompt

```text
Use a wave-based parallel swarm build for this task:

Build Vendor Trust Ledger: a chef-owned vendor reliability and sourcing memory system that informs PIE pricing, menu planning, event readiness, procurement, and recovery decisions.

Core operating rule:
Build in parallel. Merge serially. Verify before the next wave.

Wave 1 - Domain/Data/Security:
- Inspect vendor/supplier, pricing/PIE, recipe/menu, event, procurement/shopping, communication, and notes modules.
- Add or extend vendor profile, vendor performance event, category trust score, and sourcing risk models.
- Enforce chef tenant ownership and private notes boundaries.

Wave 2 - Trust Engine:
- Compute explainable vendor trust by product category, event type, delivery route, season, substitution quality, issue history, and recency.
- Include unknown vendor state.
- Do not use fake confidence; expose missing evidence.

Wave 3 - Surfaces:
- Add vendor trust ledger surface.
- Add vendor risk card in menu planning, PIE, procurement, and event readiness.
- Add issue capture after shopping/delivery/service.
- Add mobile quick capture for vendor incidents.

Wave 4 - Integration:
- Connect vendor trust to PIE recommendations, substitution suggestions, event loadout, and Remy.
- Add safe communication templates for vendor follow-up.
- Avoid duplicate vendor systems.

Wave 5 - Verification:
- Test trust computation, tenant scoping, private note leakage, PIE integration, event risk visibility, mobile capture, and empty/error/loading states.
- Verify running app and produce proof pack.
```

### Acceptance Criteria

- Vendor performance can be recorded and later influence sourcing decisions.
- PIE can surface reliability risk alongside cost.
- Unknown vendor reliability is explicit.
- Private vendor notes do not leak to clients/public.

## Program 5 - Client Household Operating Memory

### Product Thesis

Private chef work is not only client preference. It is household operating reality: parking, pets, staff, elevators, kitchen quirks, allergies, family dynamics, privacy expectations, event authority, locked doors, service paths, house rules, and emotional context.

### CLO-40 Coverage

- #16 Client Discovery and Relationship Memory.
- #17 Client Communication.
- #23 Operations and Logistics.
- #34 Family, Relationships, Parenting, and Caregiving.
- #38 Workplace Power, Exploitation, Discrimination, and Safety.

### Primary User Outcomes

- Chef can maintain household-specific operational memory.
- Event planning can reuse the memory without exposing sensitive facts broadly.
- Staff/vendor get only the safe operational subset they need.
- Client can correct client-safe facts without seeing internal chef notes.

### Domain Model

- Household profile: addresses, access instructions, parking, service route, pets, household staff, kitchen quirks, equipment, family schedule, privacy rules.
- Authority map: booker, payer, host, hidden influencer, day-of decision maker, dietary owner.
- Sensitivity flag: private chef-only, staff-safe, client-safe, public never.
- Household incident: access issue, communication issue, conflict, safety issue, successful workaround.

### Swarm Build Prompt

```text
Use a wave-based parallel swarm build for this task:

Build Client Household Operating Memory: a private, role-aware household memory system for operational facts, property quirks, authority maps, access paths, staff/vendor-safe instructions, client-safe corrections, and event reuse.

Core operating rule:
Build in parallel. Merge serially. Verify before the next wave.

Wave 1 - Data/Security:
- Inspect client, event, preference, guest, communication, venue/location, staff/vendor, and CIL modules.
- Add household profile, household fact, authority map, access instruction, property quirk, and household incident models.
- Every fact must carry visibility, sensitivity, source, confidence, freshness, and owner.
- Enforce tenant scoping and role-specific server-side access.

Wave 2 - Chef Surfaces:
- Add household memory panel on client profile and event detail.
- Add quick capture for access/parking/pet/kitchen/staff quirks.
- Add authority map editor.
- Add stale fact review and conflict resolution.

Wave 3 - Client/Staff Safe Views:
- Add client-safe correction surface for facts the client is allowed to review.
- Add staff/vendor-safe briefing generated only from approved operational facts.
- Prevent private chef notes from leaking.

Wave 4 - Integration:
- Feed event readiness, loadout, capacity, communication, Remy, and client portal.
- Add warnings when household unknowns could block service.
- Avoid duplicate preference or venue systems.

Wave 5 - Verification:
- Test route param tampering, client access, staff scoped access, private note leakage, tenant isolation, stale fact states, and mobile layouts.
- Verify running app with proof pack.
```

### Acceptance Criteria

- Household facts are reusable across events.
- Visibility is enforced server-side.
- Staff/vendor only see assigned safe instructions.
- Client correction does not expose chef-only memory.

## Program 6 - Crisis And Recovery Studio

### Product Thesis

ChefFlow should help chefs handle things going wrong: allergic scare, broken equipment, missing vendor order, angry client, staff no-show, weather, payment conflict, spoiled ingredient, privacy incident, or public complaint.

### CLO-40 Coverage

- #7 Dietary Needs, Allergies, and Nutrition.
- #8 Food Safety and Sanitation.
- #11 Quality Control and Feedback.
- #20 Invoicing, Payments, and Bookkeeping.
- #27 Conflict, Complaints, Recovery, and Crisis Handling.
- #38 Workplace Power, Exploitation, Discrimination, and Safety.

### Primary User Outcomes

- Chef can start a crisis record quickly.
- ChefFlow can guide triage, preserve evidence, suggest communication, track follow-up, and prevent recurrence.
- Sensitive incidents remain private and role gated.
- Recovery promises become future reminders.

### Domain Model

- Incident: type, severity, affected event/client, safety risk, financial risk, privacy risk, evidence, timeline, owner, status.
- Recovery action: apology, refund, remake, vendor claim, insurance note, client follow-up, policy change, staff coaching.
- Evidence item: photo, receipt, message, note, witness, timestamp.
- Recurrence guard: future warning created from incident.

### Swarm Build Prompt

```text
Use a wave-based parallel swarm build for this task:

Build Crisis and Recovery Studio: a private incident, evidence, recovery, communication, and recurrence-prevention system for food safety, allergy, vendor, client, staff, payment, privacy, weather, equipment, and reputation crises.

Core operating rule:
Build in parallel. Merge serially. Verify before the next wave.

Wave 1 - Incident Domain/Security:
- Inspect events, clients, communications, payments, files/media, safety, staff/vendor, Remy, and audit trail modules.
- Add incident, recovery action, evidence item, recurrence guard, and timeline models.
- Enforce strict tenant ownership and sensitive incident access boundaries.

Wave 2 - Triage Engine:
- Build deterministic triage by severity, safety risk, money risk, privacy risk, client relationship risk, public reputation risk, and deadline.
- Include recommended next actions and evidence needs.
- Avoid legal/medical advice; route high-risk safety/legal cases to professional review language.

Wave 3 - Surfaces:
- Add Crisis Studio surface.
- Add event/client incident panels.
- Add mobile quick incident capture.
- Add recovery action board and promise tracker.

Wave 4 - Integration:
- Connect to communications templates, vendor trust, household memory, compliance concierge, client relationship memory, Remy, and dashboard priority queue.
- Add recurrence guards that warn on future similar events.

Wave 5 - Verification:
- Test privacy, tenant isolation, evidence access, role gates, route protection, incident creation, recovery completion, recurrence warnings, and mobile capture.
- Verify running app and proof pack.
```

### Acceptance Criteria

- Incident can be captured from event/client context.
- Evidence and recovery actions are linked.
- Sensitive incident data is private by default.
- Recovery promises become tracked future obligations.

## Program 7 - Private Chef Financial Cockpit

### Product Thesis

The chef needs to know cash runway, tax risk, unpaid invoices, seasonal volatility, client concentration, debt pressure, insurance cost, food cost, labor cost, and whether taking a job helps or harms stability.

### CLO-40 Coverage

- #19 Pricing, Profit, and Cost Control.
- #20 Invoicing, Payments, and Bookkeeping.
- #21 Taxes, Legal, Insurance, and Compliance.
- #31 Business Ownership, Assets, Exit, and Succession.
- #35 Personal Finances, Housing, Debt, and Stability.
- #37 Macroeconomic and Industry Forces.

### Primary User Outcomes

- Chef can see actual financial pressure, not vanity revenue.
- ChefFlow can forecast cash gaps and tax obligations.
- Client concentration and seasonality risk become visible.
- Quote/pricing decisions connect to financial goals.

### Domain Model

- Cash runway: cash on hand, expected receivables, expected expenses, tax set-aside, known obligations.
- Financial risk: unpaid invoice, late payment, concentration, seasonal dip, margin leak, debt pressure, insurance renewal, tax quarter.
- Scenario: accept job, decline job, raise price, require deposit, staff up, buy equipment, take class/product revenue.

### Swarm Build Prompt

```text
Use a wave-based parallel swarm build for this task:

Build Private Chef Financial Cockpit: a private finance intelligence surface connecting invoices, payments, expenses, PIE margins, taxes, insurance, debt/stability notes, client concentration, seasonality, cash runway, and quote decisions.

Core operating rule:
Build in parallel. Merge serially. Verify before the next wave.

Wave 1 - Data/Security:
- Inspect payments, invoices, expenses, PIE, clients, events, pricing, dashboard, and settings.
- Add financial cockpit read model and risk types using existing finance data first.
- Add private manual inputs only where source data does not exist.
- Enforce tenant scoping and private financial data access.

Wave 2 - Financial Engine:
- Compute runway, receivables, overdue amounts, margin trend, tax set-aside estimate placeholder with disclaimer, client concentration, seasonal forecast, and risk flags.
- Avoid fake bank balances unless actual data or manual input exists.
- Expose confidence and missing data.

Wave 3 - Surfaces:
- Add chef financial cockpit surface.
- Add dashboard summary card.
- Add client/event/quote financial implications panel.
- Include empty/error/loading/mobile/accessibility states.

Wave 4 - Decisions:
- Connect to quote pricing, deposit requirements, client contribution intelligence, PIE, and Remy.
- Generate actions: follow up invoice, raise deposit, adjust price, reduce scope, chase missing expense data, set aside tax estimate.

Wave 5 - Verification:
- Test tenant isolation, private finance leakage, calculations, missing data states, quote integration, dashboard wiring, and mobile view.
- Verify running app and proof pack.
```

### Acceptance Criteria

- Chef can see runway and risk using real available data.
- Missing data is explicit.
- Financial data never leaks to clients/public/staff.
- Quote decisions can reference financial pressure privately.

## Program 8 - Craft Evolution Lab

### Product Thesis

ChefFlow should remember not only what the chef cooked, but what they are becoming creatively: cuisine identity, signature dishes, R&D, inspirations, client reactions, seasonal ideas, technique growth, and public proof.

### CLO-40 Coverage

- #1 Culinary Craft.
- #2 Training and Skill Development.
- #3 Cuisine Identity and Creative Style.
- #4 Recipe Development.
- #5 Menu Design.
- #13 Career Path and Professional Growth.
- #14 Reputation, Brand, and Public Image.

### Primary User Outcomes

- Chef can capture experiments, inspirations, dish versions, tasting notes, client feedback, and signature ideas.
- ChefFlow can connect craft development to menus, profile, discovery, classes, and public reputation.
- Public profile can show only approved craft proof.

### Domain Model

- Craft note, dish experiment, signature dish candidate, technique goal, inspiration source, tasting result, client reaction, public proof candidate.
- Visibility: private_only, chef_internal, client_safe, public_profile, website_only, requires_evidence, never_publish.
- Evolution timeline: draft, tested, served, signature, retired.

### Swarm Build Prompt

```text
Use a wave-based parallel swarm build for this task:

Build Craft Evolution Lab: a private culinary R&D and cuisine identity memory system that tracks dish experiments, signature dishes, technique growth, inspiration, client reactions, public proof candidates, and safe public-profile outputs.

Core operating rule:
Build in parallel. Merge serially. Verify before the next wave.

Wave 1 - Domain/Data/Security:
- Inspect recipes, menus, chef profile, public profile, media, client feedback, notes/ChefTips, and discovery modules.
- Add craft note, dish experiment, signature candidate, technique goal, inspiration source, tasting result, and proof candidate models.
- Enforce chef ownership and visibility metadata.

Wave 2 - Capture/Memory:
- Add quick capture from menu/event/post-event/profile contexts.
- Add experiment lifecycle states: idea, test, served, refined, signature, retired.
- Add media/proof attachments using existing asset systems.

Wave 3 - Surfaces:
- Add Craft Lab chef surface.
- Add dish evolution timeline.
- Add signature dish board.
- Add technique growth and cuisine identity panels.

Wave 4 - Public/Client Integration:
- Feed approved facts into public profile, discovery, portfolio, classes/products, and client-safe menu stories.
- Prevent raw private notes from public rendering.
- Add Remy craft summary with visibility guardrails.

Wave 5 - Verification:
- Test visibility filtering, public profile leakage, client-safe outputs, media access, tenant isolation, mobile layouts, and empty/error/loading states.
- Verify running app and proof pack.
```

### Acceptance Criteria

- Chef can track culinary R&D over time.
- Signature dish candidates can graduate from private idea to public proof.
- Public profile uses only approved public facts/assets.

## Program 9 - Staff Trust And Delegation System

### Product Thesis

Private chefs often rely on assistants, servers, vendors, planners, and house staff. ChefFlow needs a trust and delegation model that knows who can handle what, who should not see what, and who has failed or excelled before.

### CLO-40 Coverage

- #23 Operations and Logistics.
- #25 Vendors, Partners, and Professional Network.
- #26 Hiring, Training, Leadership, and Team Culture.
- #27 Conflict, Complaints, Recovery, and Crisis Handling.
- #38 Workplace Power, Exploitation, Discrimination, and Safety.

### Primary User Outcomes

- Chef can assign event roles safely.
- ChefFlow remembers staff strengths, limitations, incidents, reliability, and client fit.
- Staff/vendor users see only their task scope.
- Sensitive client/household data remains protected.

### Domain Model

- Collaborator profile: role, skills, certifications, availability, trust tags, restrictions, pay notes, contact, emergency contact.
- Assignment: event, role, task scope, visibility scope, check-in state.
- Performance memory: reliability, skill, communication, incident, client fit, confidentiality.
- Training checklist and delegation templates.

### Swarm Build Prompt

```text
Use a wave-based parallel swarm build for this task:

Build Staff Trust and Delegation System: a role-aware collaborator memory, assignment, training, trust, scoped-access, and performance system for assistants, servers, planners, vendors, and household staff.

Core operating rule:
Build in parallel. Merge serially. Verify before the next wave.

Wave 1 - Domain/Security:
- Inspect staff/vendor, event, tasks, portal, household memory, client privacy, auth, and route policy modules.
- Add collaborator profile, assignment, skill/trust memory, training checklist, scoped briefing, and performance note models.
- Enforce server-side role gates and assignment-scoped access.

Wave 2 - Assignment Engine:
- Match collaborator skills, availability, trust, restrictions, event needs, and privacy sensitivity.
- Flag assignment risks and unknowns.
- Support manual override with reason.

Wave 3 - Surfaces:
- Add collaborator trust ledger.
- Add event staffing planner.
- Add staff/vendor task briefing surface.
- Add post-event performance capture.

Wave 4 - Integration:
- Connect to loadout, household memory, crisis studio, compliance, calendar, communications, and Remy.
- Ensure staff/vendor cannot see private client intelligence beyond approved assignment scope.

Wave 5 - Verification:
- Test assignment-scoped access, route guessing, tenant boundaries, private note leakage, staff mobile task flow, and performance memory.
- Verify running app and proof pack.
```

### Acceptance Criteria

- Staff/vendor access is assignment scoped.
- Chef can track reliability and skill memories privately.
- Event staffing can be planned from actual event needs.

## Program 10 - Chef Life Strategy Map

### Product Thesis

ChefFlow should help the chef connect daily work to long-term direction: reputation, craft, money, burnout, client mix, geography, family constraints, new revenue, public identity, and eventual exit.

### CLO-40 Coverage

- #13 Career Path and Professional Growth.
- #14 Reputation, Brand, and Public Image.
- #29 Marketing, Media, PR, and Social Platforms.
- #30 Expansion, Products, Teaching, and New Revenue Streams.
- #31 Business Ownership, Assets, Exit, and Succession.
- #34 Family, Relationships, Parenting, and Caregiving.
- #39 Personal Identity, Values, Faith, Sobriety, and Transformation.
- #40 Legacy, Retirement, Death, and Exceptional Events.

### Primary User Outcomes

- Chef can define what kind of business/life they are building.
- ChefFlow can compare current work against that direction.
- Queue, dashboard, pricing, profile, and client decisions can reference strategic fit.

### Domain Model

- Life strategy: target client mix, cuisine identity, income needs, capacity boundaries, family constraints, reputation goals, geography, new revenue, values, exit/legacy notes.
- Strategy signal: aligned, neutral, misaligned, risky, unknown.
- Strategy review cadence: monthly/quarterly/seasonal.
- Private by default.

### Swarm Build Prompt

```text
Use a wave-based parallel swarm build for this task:

Build Chef Life Strategy Map: a private long-range strategy system that connects client mix, reputation, cuisine identity, income, capacity, family constraints, geography, new revenue, values, exit planning, and legacy to day-to-day ChefFlow decisions.

Core operating rule:
Build in parallel. Merge serially. Verify before the next wave.

Wave 1 - Domain/Security:
- Inspect profile, clients, pricing, calendar, dashboard, public discovery, Remy, notes, and finance modules.
- Add life strategy, strategy goal, strategic constraint, strategy signal, and review cadence models.
- Enforce private chef-only access by default.

Wave 2 - Signal Engine:
- Compare inquiries, clients, events, pricing, public profile, capacity, and revenue against strategy goals.
- Explain alignment/misalignment without fake precision.
- Include unknowns and stale strategy warnings.

Wave 3 - Surfaces:
- Add Life Strategy Map surface.
- Add dashboard strategy pulse.
- Add strategic fit cards on client, inquiry, quote, and public profile settings.
- Add review ritual and seasonal planning.

Wave 4 - Integration:
- Connect to Remy, financial cockpit, capacity twin, craft lab, client contribution intelligence, and public profile guardrails.
- Keep family/identity/values/private strategy out of client/public views.

Wave 5 - Verification:
- Test private access, tenant scoping, signal correctness, stale goals, dashboard wiring, and mobile layouts.
- Verify running app and proof pack.
```

### Acceptance Criteria

- Chef can record long-range strategy privately.
- Current clients/events/inquiries can show strategic fit.
- Sensitive life strategy never leaks outside chef-owned surfaces.

## Program 11 - New Revenue Engine

### Product Thesis

ChefFlow can help chefs move beyond one-off service revenue into classes, retainers, products, meal prep, gift cards, memberships, content, partnerships, and premium experiences without fragmenting the business.

### CLO-40 Coverage

- #14 Reputation, Brand, and Public Image.
- #15 Sales, Leads, and Client Acquisition.
- #18 Proposals, Contracts, and Scope.
- #19 Pricing, Profit, and Cost Control.
- #29 Marketing, Media, PR, and Social Platforms.
- #30 Expansion, Products, Teaching, and New Revenue Streams.

### Primary User Outcomes

- Chef can define new offers and test demand.
- ChefFlow can connect offer viability to capacity, margin, audience, public profile, and client base.
- Public surfaces can promote approved offers.
- Existing clients can be invited without spam or privacy leakage.

### Domain Model

- Offer: class, product, meal prep, retainer, gift card, subscription, tasting, content, event package.
- Offer economics: price, cost, margin, capacity, fulfillment complexity.
- Audience fit: existing clients, public, guests, partners, corporate, local.
- Launch state: idea, validate, draft, live, paused, retired.

### Swarm Build Prompt

```text
Use a wave-based parallel swarm build for this task:

Build New Revenue Engine: an offer strategy, economics, launch, audience-fit, public promotion, and client-safe outreach system for classes, retainers, meal prep, products, gift cards, memberships, content, partnerships, and premium experiences.

Core operating rule:
Build in parallel. Merge serially. Verify before the next wave.

Wave 1 - Domain/Data/Security:
- Inspect public profile, discovery, pricing/PIE, billing/feature gates, clients, communications, calendar, capacity, and profile settings.
- Add offer, offer economics, launch state, audience fit, and outreach policy models.
- Enforce chef ownership and public visibility controls.

Wave 2 - Offer Economics:
- Compute margin/capacity implications from real or manual cost inputs.
- Connect to PIE where applicable.
- Show missing inputs and confidence.

Wave 3 - Surfaces:
- Add chef offer studio.
- Add public-safe offer cards on profile/discovery when approved.
- Add client-safe outreach planner.
- Add launch checklist and pause/retire controls.

Wave 4 - Integration:
- Connect to capacity twin, financial cockpit, craft lab, communications, public profile, and client contribution intelligence.
- Prevent spammy or privacy-unsafe outreach.

Wave 5 - Verification:
- Test public visibility, client outreach permissions, tenant scoping, economics, mobile public cards, empty/error/loading states, and feature gates if relevant.
- Verify running app and proof pack.
```

### Acceptance Criteria

- Chef can create and manage new revenue offers.
- Public display requires explicit approval.
- Offer economics and capacity impact are visible.
- Outreach respects privacy and permissions.

## Program 12 - Sustainability, Waste, And Ethics Ledger

### Product Thesis

Waste, sourcing ethics, leftovers, packaging, donations, composting, dietary respect, and client expectations are both operational and brand issues. ChefFlow should make them actionable rather than vague values.

### CLO-40 Coverage

- #6 Ingredients and Sourcing.
- #8 Food Safety and Sanitation.
- #11 Quality Control and Feedback.
- #12 Waste, Sustainability, and Ethics.
- #14 Reputation, Brand, and Public Image.
- #23 Operations and Logistics.

### Primary User Outcomes

- Chef can track waste sources, overproduction, leftover plans, packaging, donation constraints, composting, and ethical sourcing claims.
- ChefFlow can recommend waste-reduction changes without compromising service quality or safety.
- Public claims require evidence and chef approval.

### Domain Model

- Waste event: ingredient, dish, event, cause, amount, preventability, disposal path.
- Sustainability preference: chef-owned and client-specific values.
- Leftover plan: client keeps, staff meal, donation, compost, discard, safety blocked.
- Sourcing claim: local, organic, regenerative, fair-trade, foraged, seasonal, low-waste, evidence required.

### Swarm Build Prompt

```text
Use a wave-based parallel swarm build for this task:

Build Sustainability, Waste, and Ethics Ledger: a chef-owned system for tracking food waste, leftover plans, packaging, sourcing ethics, donation/compost paths, evidence-backed public claims, and waste-reduction recommendations.

Core operating rule:
Build in parallel. Merge serially. Verify before the next wave.

Wave 1 - Domain/Security:
- Inspect events, menus, recipes, procurement, vendors, public profile, client preferences, compliance/safety, media/evidence, and post-event memory.
- Add waste event, leftover plan, sustainability preference, sourcing claim, evidence, and recommendation models.
- Enforce chef tenant ownership and visibility rules.

Wave 2 - Recommendation Engine:
- Identify overproduction, repeated waste, packaging issues, unsafe leftover paths, and evidence gaps.
- Recommend menu, portion, sourcing, and procurement adjustments.
- Never recommend unsafe donation/leftover paths.

Wave 3 - Surfaces:
- Add post-event waste capture.
- Add event leftover plan.
- Add sustainability ledger and trend view.
- Add public claim approval/evidence surface.

Wave 4 - Integration:
- Connect to vendor trust, PIE, menu planning, craft lab, public profile, and client communication.
- Keep unsupported sustainability claims off public pages.

Wave 5 - Verification:
- Test safety blocking, public claim filtering, evidence requirements, tenant isolation, mobile post-event capture, and empty/error/loading states.
- Verify running app and proof pack.
```

### Acceptance Criteria

- Waste and leftovers can be tracked at event level.
- Recommendations are safe and evidence-aware.
- Public sustainability claims require approval and evidence.
- Client-specific values can inform planning without overriding safety.

## Cross-Program Architecture Contracts

Every program above should honor these shared contracts:

- Chef-owned private memory by default.
- Visibility metadata on sensitive facts.
- Public/client/staff views are derived read models, not direct private memory reads.
- Unknowns are first-class states, not silent blanks.
- Remy cannot expose private facts to unauthorized roles.
- Every user-facing claim needs source, confidence, and freshness when it can affect trust, money, safety, or compliance.
- Every implementation must reuse existing route, auth, tenant, design-system, dashboard, rail, and proof-pack patterns.
- No duplicate systems for clients, events, notes, vendors, profile facts, files/media, pricing, or permissions.

## Recommended Research Order

1. Compliance Concierge: highest safety/legal leverage and weakest current coverage.
2. Chef Capacity Twin: strongest differentiator and ties directly to burnout, scheduling, pricing, and acceptance.
3. Physical Event Loadout Brain: turns intelligence into real service execution.
4. Client Household Operating Memory: deepens private-chef specificity.
5. Vendor Trust Ledger: improves PIE and sourcing truth.
6. Crisis and Recovery Studio: converts failures into memory and future prevention.
7. Private Chef Financial Cockpit: connects work choices to survival and growth.
8. Staff Trust and Delegation System: needed before scaling service complexity.
9. Craft Evolution Lab: strengthens chef identity and public differentiation.
10. New Revenue Engine: expands beyond service revenue once capacity/finance are grounded.
11. Sustainability, Waste, and Ethics Ledger: strong brand/operations layer after sourcing and event capture exist.
12. Chef Life Strategy Map: best as the synthesis layer once several lower-level signals exist, though private strategy capture can start early.

## Queue Intake Recommendation

Do not queue all twelve as one mega-build. Convert each program into a program family with 4-8 queue items:

- Foundation/domain contract.
- First chef-owned data and privacy model.
- First visible chef surface.
- First decision integration.
- First proof pack/security gate.
- Follow-up role/client/public integration where needed.

Fire only one or two adjacent program families at a time. The safest first batch is:

- Compliance Concierge foundation and event packet.
- Chef Capacity Twin foundation and quote/calendar gate.
- Physical Event Loadout Brain foundation and event checklist.
