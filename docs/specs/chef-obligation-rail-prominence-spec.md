# Chef Obligation Rail Prominence Spec

> Status: spec-ready
> Date: 2026-05-19
> Scope: Universal Rail, Contextual Rail, God Mode Rail, lifecycle commitments, chef obligations, obligation coverage audit

## Purpose

ChefFlow should make a chef's obligations impossible to lose.

The Rail must not merely show helpful links, generic intelligence, or recent activity. It must surface the obligations that define whether the chef is professionally, financially, legally, operationally, and personally on track.

From any Rail context, the chef should be able to answer:

- What am I obligated to do now?
- Who am I obligated to respond to?
- What am I waiting on from someone else?
- What money, contract, or payment obligation is exposed?
- What safety, dietary, compliance, or insurance obligation is exposed?
- What service, menu, prep, travel, staffing, vendor, or closeout obligation is slipping?
- What commitment did I make to myself or the business that this page is putting at risk?
- What proof says this obligation is complete, waiting, blocked, overridden, or intentionally suppressed?

## Verdict On Current State

Current Rail architecture is partial.

ChefFlow already has strong pieces:

- `lib/discovery/rail-profiles.ts` defines contextual rails by surface.
- `lib/discovery/contextual-rail-types.ts` defines the main categories: readiness, money, people, time, risk, intelligence, communication, actions.
- `lib/discovery/rail-tier-assigner.ts` tiers items into critical, action, awareness, and opportunity.
- `lib/lifecycle/commitment-catalog.ts` describes the full service journey obligations.
- `lib/commitment/types.ts` describes chef-declared business and personal integrity commitments.
- `docs/specs/universal-rail-wiring-contract-and-access-surface-map.md` already establishes that important capabilities must be wired to the Rail or explicitly excluded.

The missing layer is first-class obligation modeling. Today, obligations are implied by resolver names, lifecycle widgets, tasks, messages, and payment items. They are not normalized, audited, or guaranteed to be front and center in every Rail profile.

## Product Promise

Every Rail must include an Obligation Lens.

The lens does not show every obligation at once. It ranks obligations by consequence, due window, role ownership, page affinity, proof quality, and recoverability.

An obligation can be hidden only if:

- it is genuinely irrelevant to the current role/context,
- it is lower-priority and still reachable through "more" or drill-in,
- it is suppressed by a documented rule,
- it is completed with proof,
- or it is intentionally excluded with a reason.

Unknown obligation coverage is a product defect.

## Required Vocabulary

| Term                 | Meaning                                                                                                                                                                            |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Obligation           | A concrete thing the chef, client, staff member, partner, system, or business must do, monitor, prove, collect, decide, or recover.                                                |
| Commitment           | A chef-declared or system-suggested rule the chef wants to hold, such as pricing floor, response SLA, no unsafe dietary shortcuts, or protected rest time.                         |
| Lifecycle obligation | An obligation from the service journey, such as respond to inquiry, collect dietary details, send quote, confirm menu, collect deposit, prep, serve, close out, or request review. |
| Front and center     | Visible in the collapsed Rail, critical/action tier, or first expanded view without requiring search or page navigation.                                                           |
| Available in context | Not in the first view, but reachable from the Rail's current context, category, proof, or more surface.                                                                            |
| Suppressed           | Hidden by a documented freshness, privacy, role, cooldown, or relevance rule.                                                                                                      |
| Proven               | Marked complete by a linked source of truth, not just absent from the Rail.                                                                                                        |

## Obligation Domains

The Rail should normalize obligations into these domains.

```ts
export type ChefObligationDomain =
  | 'service_lifecycle'
  | 'client_communication'
  | 'client_relationship'
  | 'money'
  | 'contract_scope'
  | 'menu_integrity'
  | 'dietary_safety'
  | 'food_safety'
  | 'prep_sourcing'
  | 'service_execution'
  | 'staff_vendor'
  | 'travel_logistics'
  | 'compliance'
  | 'business_health'
  | 'personal_capacity'
  | 'reputation'
  | 'automation_recovery'
  | 'proof_closeout'
```

These domains map onto the existing Rail categories:

| Obligation domain    | Primary Rail category | Secondary Rail categories            |
| -------------------- | --------------------- | ------------------------------------ |
| service_lifecycle    | readiness             | time, actions, risk                  |
| client_communication | communication         | people, time, actions                |
| client_relationship  | people                | communication, intelligence, money   |
| money                | money                 | risk, time, actions                  |
| contract_scope       | risk                  | money, readiness, actions            |
| menu_integrity       | readiness             | intelligence, risk, actions          |
| dietary_safety       | risk                  | readiness, people, actions           |
| food_safety          | risk                  | readiness, time, actions             |
| prep_sourcing        | readiness             | time, money, risk, actions           |
| service_execution    | time                  | readiness, risk, actions             |
| staff_vendor         | people                | time, risk, actions                  |
| travel_logistics     | time                  | risk, money, actions                 |
| compliance           | risk                  | time, proof_closeout, actions        |
| business_health      | money                 | risk, intelligence, actions          |
| personal_capacity    | risk                  | time, intelligence, actions          |
| reputation           | people                | communication, intelligence, actions |
| automation_recovery  | actions               | risk, intelligence, proof_closeout   |
| proof_closeout       | actions               | money, risk, intelligence            |

## Source Systems

Obligation detection should combine these existing sources:

- Service journey catalog: `lib/lifecycle/commitment-catalog.ts`
- Chef commitment rules: `lib/commitment/types.ts`
- Contextual Rail profiles: `lib/discovery/rail-profiles.ts`
- God Mode resolved items: `lib/discovery/god-mode-types.ts`
- Universal Rail wiring contract: `docs/specs/universal-rail-wiring-contract-and-access-surface-map.md`
- Event operating spine: `lib/events/operating-spine.ts`
- Action center feed: `lib/action-center/feed.ts`
- CIL commitment signals: `docs/specs/cil-commitment-analyzer.md`
- Page X-Ray and Wiring Audit proof packs

## Obligation Contract

Every surfaced obligation should normalize to this shape or a stricter compatible type.

```ts
export type ObligationOwner =
  | 'chef'
  | 'client'
  | 'staff'
  | 'partner'
  | 'vendor'
  | 'system'
  | 'shared'

export type ObligationState =
  | 'active'
  | 'due_now'
  | 'due_today'
  | 'due_soon'
  | 'waiting_on_other'
  | 'blocked'
  | 'at_risk'
  | 'overdue'
  | 'completed'
  | 'overridden'
  | 'suppressed'
  | 'not_applicable'
  | 'unknown'

export type ObligationProofState =
  | 'confirmed'
  | 'computed'
  | 'user_entered'
  | 'inferred'
  | 'missing'
  | 'stale'
  | 'disputed'

export type ObligationProminence =
  | 'front_and_center'
  | 'available_in_context'
  | 'reachable_through_more'
  | 'feeds_rail'
  | 'suppressed'
  | 'intentionally_excluded'
  | 'unknown'

export type ChefObligation = {
  id: string
  domain: ChefObligationDomain
  title: string
  reason: string
  owner: ObligationOwner
  state: ObligationState
  prominence: ObligationProminence
  railCategory: RailCategory
  railTier: 'critical' | 'action' | 'awareness' | 'opportunity'
  role: 'chef' | 'client' | 'staff' | 'admin' | 'partner' | 'vendor' | 'public'
  routePattern?: string
  entityType?: 'event' | 'client' | 'menu' | 'recipe' | 'inquiry' | 'page'
  entityId?: string
  dueAt?: string
  escalatesAt?: string
  waitingOn?: {
    owner: ObligationOwner
    name?: string
    followUpAt?: string
  }
  actionLabel?: string
  actionHref?: string
  proofHref?: string
  proofState: ObligationProofState
  confidence: number
  sourceRefs: Array<{
    sourceType:
      | 'lifecycle_catalog'
      | 'commitment_rule'
      | 'event_spine'
      | 'task'
      | 'message'
      | 'payment'
      | 'contract'
      | 'cil_signal'
      | 'wiring_audit'
      | 'manual'
    sourceId: string
    sourceFile?: string
  }>
  suppressionReason?: string
  exclusionReason?: string
  createdAt: string
  updatedAt: string
}
```

## Front-And-Center Rules

An obligation must be front and center when any of these are true:

- It is `overdue`, `blocked`, `due_now`, or `at_risk` with business, safety, legal, money, client trust, or service-day consequence.
- It is owned by the chef and due within the current operating window.
- It is waiting on a client, staff member, partner, vendor, or system and requires chef follow-up.
- It affects dietary safety, allergy safety, insurance, certification, contract scope, payment collection, refund exposure, or cancellation exposure.
- It threatens an event within 14 days, a service within 72 hours, or a same-day service path.
- It violates or is about to violate an active chef commitment rule.
- It is a failed automation, failed message, failed payment, failed webhook, failed draft, or failed lifecycle transition that changes what the chef believes is handled.
- It has no proof but the page implies completion.

An obligation can be awareness/opportunity only when:

- no immediate action exists,
- no deadline is inside the current operating window,
- it is informational and not hiding professional consequence,
- or it has strong proof and only needs future monitoring.

## Scoring Model

Obligation score should be additive on top of existing Rail score, then clamped to 0-100.

```ts
score =
  baseUrgency +
  consequenceWeight +
  dueWindowWeight +
  ownerWeight +
  pageAffinityWeight +
  proofRiskWeight +
  commitmentViolationWeight +
  recoveryWeight -
  suppressionWeight
```

Recommended weights:

| Factor                                                              |  Weight |
| ------------------------------------------------------------------- | ------: |
| Safety, legal, payment, active service, or client trust consequence |     +20 |
| Due now or overdue                                                  |     +20 |
| Due today                                                           |     +14 |
| Due within 72 hours                                                 |     +10 |
| Chef-owned action                                                   |      +8 |
| Waiting on other but chef follow-up required                        |      +7 |
| Current page entity match                                           |     +10 |
| Missing, stale, or disputed proof                                   |      +8 |
| Active commitment violation                                         |     +12 |
| Failed automation or recoverable error                              |     +10 |
| Completed with confirmed proof                                      |     -30 |
| Suppressed by cooldown                                              |     -15 |
| Not applicable to role/context                                      | exclude |

Tier thresholds:

- `critical`: score >= 80
- `action`: score >= 55
- `awareness`: score >= 25
- `opportunity`: score < 25

## Rail Profile Coverage Requirements

Every `RAIL_PROFILES` entry should declare an `obligationCoverage` contract.

```ts
export type RailObligationCoverage = {
  requiredDomains: ChefObligationDomain[]
  optionalDomains: ChefObligationDomain[]
  excludedDomains: Array<{
    domain: ChefObligationDomain
    reason: string
  }>
  minFrontAndCenter: number
  maxFrontAndCenter: number
  proofRequired: boolean
}
```

### Event Detail Rail

Current categories: readiness, money, people, time, risk, intelligence, actions.

Required obligation domains:

- service_lifecycle
- client_communication
- money
- contract_scope
- menu_integrity
- dietary_safety
- food_safety
- prep_sourcing
- service_execution
- staff_vendor
- travel_logistics
- compliance
- proof_closeout

Front-and-center examples:

- Deposit unpaid after acceptance.
- Menu sent but not approved.
- Dietary data missing for named guests.
- Ingredient sourcing incomplete inside prep window.
- Venue access, travel, parking, equipment, or staffing blocker.
- Insurance certificate or permit required for venue.
- Event completed but invoice, review, AAR, or cost reconciliation missing.

Gap from current profile:

- Strongest existing coverage, but personal capacity, compliance, and proof closeout are not guaranteed as first-class obligation domains.

### Client Detail Rail

Current categories: people, money, communication, risk, intelligence.

Required obligation domains:

- client_relationship
- client_communication
- money
- contract_scope
- service_lifecycle
- reputation
- proof_closeout

Front-and-center examples:

- Client follow-up due.
- Outstanding balance.
- Quote accepted but contract not complete.
- Repeat client has dormant cadence break.
- Review request overdue.
- Client has open issue or complaint.

Gap from current profile:

- It lacks an explicit `actions` category and can hide the next obligation as an insight instead of an action.

### Menu Detail Rail

Current categories: readiness, money, people, intelligence, actions.

Required obligation domains:

- menu_integrity
- dietary_safety
- prep_sourcing
- money
- client_communication
- proof_closeout

Front-and-center examples:

- Menu changed after approval.
- Allergen compatibility not proven.
- Recipe missing for a locked dish.
- Menu margin below floor.
- Client feedback unresolved.
- Shopping list not generated from final menu.

Gap from current profile:

- Risk is not an explicit category even though dietary and allergen failures are risk obligations.

### Calendar Rail

Current categories: time, risk, intelligence.

Required obligation domains:

- service_lifecycle
- travel_logistics
- personal_capacity
- staff_vendor
- client_communication
- money

Front-and-center examples:

- Same-day or next-day event blocker.
- Overlapping events, travel conflict, prep-time compression.
- Personal protected time conflict.
- Staff assignment missing for event size.
- Payment or contract missing before event date.

Gap from current profile:

- Money, communication, and actions are not categories, but time views often expose those obligations first.

### Inquiries Rail

Current categories: communication, time, people, money, actions.

Required obligation domains:

- client_communication
- service_lifecycle
- client_relationship
- money
- contract_scope
- reputation

Front-and-center examples:

- Inquiry response SLA at risk.
- Discovery call not scheduled.
- Quote follow-up overdue.
- Budget/scope mismatch unresolved.
- Referral source needs acknowledgment.

Gap from current profile:

- Risk is absent, so misleading terms, unsafe assumptions, or bad-fit leads can be underplayed.

### Recipe Detail Rail

Current categories: readiness, intelligence, actions.

Required obligation domains:

- menu_integrity
- dietary_safety
- food_safety
- prep_sourcing
- proof_closeout

Front-and-center examples:

- Recipe required before menu lock.
- Allergen notes missing.
- Yield not matching event guest count.
- Prep method incomplete.
- Provenance or version state ambiguous.

Gap from current profile:

- Too narrow for obligations that recipes create downstream: safety, sourcing, cost, and event readiness.

### Finance Rail

Current categories: money, risk, time.

Required obligation domains:

- money
- contract_scope
- compliance
- business_health
- proof_closeout
- client_communication

Front-and-center examples:

- Overdue invoice.
- Deposit missing for accepted event.
- Refund decision due.
- Receipt capture required.
- Tax-category ambiguity.
- Reconciliation mismatch.

Gap from current profile:

- No `actions` category, despite finance obligations needing immediate action.

### Prep/Shopping Rail

Current categories: readiness, time, actions.

Required obligation domains:

- prep_sourcing
- dietary_safety
- food_safety
- service_execution
- staff_vendor
- travel_logistics
- money

Front-and-center examples:

- Unsourced critical ingredient.
- Allergy-safe substitution not approved.
- Cold-chain or storage issue.
- Packing checklist incomplete.
- Vendor delivery late.
- Ingredient cost spike affects margin.

Gap from current profile:

- Risk and money are not explicit categories even though prep creates both.

### Analytics Rail

Current categories: money, intelligence.

Required obligation domains:

- business_health
- pricing
- personal_capacity
- compliance
- reputation
- proof_closeout

Front-and-center examples:

- Pricing floor repeatedly overridden.
- Margin below target for upcoming bookings.
- Too many unclosed events.
- Quarterly rate review due.
- Certification, tax, or insurance review due.

Gap from current profile:

- Analytics can become passive reporting unless obligations and actions are promoted.

### Fallback Rail

Current categories: actions, risk.

Required obligation domains:

- automation_recovery
- service_lifecycle
- proof_closeout

Front-and-center examples:

- Current route has no specific profile but a critical obligation exists.
- Rail cannot classify this route's obligations.
- Page X-Ray or Wiring Audit found unknown coverage.

Gap from current profile:

- Fallback must explicitly show "unknown obligation coverage" as a defect, not silently degrade.

## CLO-40 Check

Artifact: Chef Obligation Rail Prominence

Verdict: coherent, but only if obligation coverage becomes first-class and auditable.

Primary categories:

- #7 Dietary Needs, Allergies, and Nutrition: safety obligations must outrank ordinary readiness.
- #9 Kitchen Execution and Service Flow: prep, service, timing, and event-day blockers define whether the chef can deliver.
- #16 Client Discovery and Relationship Memory: obligations often arise from remembered client facts.
- #17 Client Communication: response SLAs, follow-ups, approvals, and recovery are constant obligations.
- #18 Proposals, Contracts, and Scope: terms, deposits, approvals, and scope boundaries are professional obligations.
- #19 Pricing, Profit, and Cost Control: margin and pricing commitments must not hide inside analytics.
- #20 Invoicing, Payments, and Bookkeeping: collection, reconciliation, refunds, and receipts need visible action.
- #21 Taxes, Legal, Insurance, and Compliance: compliance must surface before it becomes a crisis.
- #23 Operations and Logistics: venue, equipment, parking, travel, and delivery obligations belong in the Rail.
- #24 Scheduling and Time Management: due windows and capacity conflicts decide prominence.
- #27 Conflict, Complaints, Recovery, and Crisis Handling: recovery obligations need direct rail action.
- #28 Technology, Data, Automation, and AI: automation failures are obligations when the chef believes something is handled.
- #32 Personal Health, Injury, Sleep, and Aging: capacity commitments should appear when the calendar or workload violates them.
- #33 Mental Health, Burnout, Addiction Risk, and Recovery: the product should not bury burnout-relevant overload signals.
- #35 Personal Finances, Housing, Debt, and Stability: business-health obligations connect to the chef's real stability.

Secondary categories:

- #1 Culinary Craft: recipe, quality, and menu integrity obligations.
- #5 Menu Design: approvals, locks, revisions, and guest fit.
- #6 Ingredients and Sourcing: sourcing, substitutions, vendor readiness.
- #10 Equipment, Tools, and Facilities: packing, repair, rental, kitchen constraints.
- #11 Quality Control and Feedback: post-event review and service improvement.
- #12 Waste, Sustainability, and Ethics: sourcing and leftovers can become obligations.
- #14 Reputation, Brand, and Public Image: reviews, complaints, response quality.
- #25 Vendors, Partners, and Professional Network: partner and vendor handoffs.
- #26 Hiring, Training, Leadership, and Team Culture: staff assignments and delegation.
- #38 Workplace Power, Exploitation, Discrimination, and Safety: staff/vendor/client safety and professional boundaries.

Blind spots:

- The Rail may over-index on event operations and under-model personal capacity, compliance, tax, insurance, and business survivability.
- The current categories do not force every profile to include actions even when obligations require action.
- Current item labels do not always distinguish "interesting signal" from "binding obligation."
- Completed obligations need proof, not disappearance.

Day-to-day coverage: strong potential across event detail, inquiries, finance, prep, and calendar once obligations are normalized.

Lifetime coverage: partial. Must add capacity, business-health, compliance, and personal finance obligations to avoid being only an event ops tool.

Cohesion move: add an Obligation Contract, profile-level obligation coverage, obligation-aware scoring, and a wiring audit gate.

Recommendation: queue as a Rail contract deepening build, then implement in phases.

## UX Requirements

### Collapsed Rail

The collapsed Rail should show:

- count of front-and-center obligations,
- highest-severity obligation label,
- due window or owner,
- proof risk if proof is missing/stale/disputed,
- and a direct action when safe.

Example:

```txt
3 obligations | Dietary guest data missing | due before menu lock
```

### Expanded Rail

The first expanded view should include an "Obligations" lane before lower-priority intelligence.

Obligation rows should show:

- title,
- owner,
- state,
- due/escalation label,
- proof pill,
- one primary action,
- optional "why" detail,
- optional "waiting on" line.

Obligation rows must not be indistinguishable from generic recommendations.

### Category Behavior

If an obligation maps to a category absent from the current profile, it still must be eligible for front-and-center display through the Obligation Lens.

Example: a money obligation on Calendar should not disappear just because Calendar currently has only time, risk, and intelligence categories.

### Suppression and Completion

Completed obligations should be hidden from the first view only when they have proof.

Suppressed obligations must retain a reason:

- low relevance,
- completed with proof,
- cooldown,
- not current role,
- not current entity,
- snoozed by chef,
- duplicate of higher-priority item,
- privacy blocked,
- or intentionally excluded.

## Technical Requirements

### New Obligation Resolver Layer

Create an obligation resolver layer that can run alongside existing God Mode and Universal Rail resolvers.

Recommended module:

```txt
lib/discovery/obligations/
  obligation-types.ts
  obligation-resolvers.ts
  obligation-scoring.ts
  obligation-profile-coverage.ts
  obligation-adapter.ts
```

Responsibilities:

- gather obligation candidates from lifecycle, commitments, action center, payments, messages, event spine, CIL, and wiring audit outputs,
- normalize into `ChefObligation`,
- score and tier obligations,
- adapt obligations into `GodModeResolvedItem` for existing renderers,
- emit coverage findings for required domains with no candidates or explicit exclusion.

### Adapter Into Existing Rail

Obligation items should adapt into `GodModeResolvedItem` with:

- `definitionId`: `obligation.${domain}.${id}`
- `sourceKind`: `task`, `event`, `payment`, `message`, or nearest existing source kind
- `loopState`: mapped from obligation state
- `evidenceLabel`: mapped from proof state
- `confidence`: obligation confidence
- `proofHref`: proof path
- `nextAction`: action label
- `data.obligationDomain`
- `data.obligationOwner`
- `data.obligationState`
- `data.obligationProminence`

### Profile Coverage

`RailProfile` should gain optional obligation coverage:

```ts
obligationCoverage?: RailObligationCoverage
```

During assembly:

1. Resolve regular rail items.
2. Resolve obligation candidates for current role/path/entity.
3. Promote front-and-center obligations regardless of category gaps.
4. Deduplicate obligations against existing items that represent the same source.
5. Preserve obligation metadata on the surviving item.
6. Emit coverage findings for required domains that are missing, unknown, or excluded.

### Dedupe Rules

Two items are duplicates when they share:

- same entity,
- same domain,
- same source ref,
- same action href,
- or same proof href and due window.

When duplicate, keep the item with:

1. higher obligation tier,
2. clearer action,
3. better proof path,
4. higher score,
5. more specific page affinity.

### Privacy and Auth

Obligation resolution must obey all existing auth and tenant rules.

- Chef obligations must call `requireChef()` before tenant data access.
- Client obligations must use client-scoped auth and never expose chef internal margin, private notes, or other clients.
- Staff obligations must be scoped to assigned events/tasks.
- Partner/vendor obligations must be scoped to their partner/vendor relationship.
- Admin obligations must call `requireAdmin()` for admin-only surfaces.
- Public routes must surface only non-PII, non-tenant-sensitive obligations.

## Acceptance Criteria

- Every Rail profile has an `obligationCoverage` declaration or an explicit reason it does not need one.
- Every required obligation domain either produces a candidate, is proven not applicable, or is intentionally excluded.
- Critical obligations are visible in collapsed Rail or first expanded view.
- Obligation items include owner, state, due/escalation label, action path, and proof state.
- Obligations can cross category boundaries when the current profile lacks the natural category.
- Completed obligations require proof before disappearing.
- Suppressed obligations retain a suppression reason.
- Fallback rail surfaces unknown obligation coverage as a defect.
- Dietary, payment, contract, event-day, failed automation, and compliance obligations outrank generic intelligence.
- Existing God Mode and Universal Rail items still render.
- No role sees obligations outside its authorization boundary.
- Page X-Ray and Wiring Audit report obligation coverage.

## Verification

Focused checks:

- Unit tests for obligation scoring thresholds.
- Unit tests for profile required-domain coverage.
- Unit tests for obligation-to-GodMode adapter.
- Unit tests for category-gap promotion.
- Unit tests for completed-without-proof still surfacing.
- Route/profile coverage test asserting every `RAIL_PROFILES` entry has coverage metadata.

Runtime checks:

- Event detail with missing dietary data shows dietary safety obligation.
- Event detail with unpaid deposit shows money obligation.
- Calendar with upcoming event payment blocker shows obligation despite category mismatch.
- Prep/shopping with allergen substitution issue shows risk obligation.
- Finance with overdue invoice shows actionable obligation.
- Analytics with repeated pricing override shows business health obligation.
- Fallback route with no obligation mapping shows unknown coverage finding.

Finish gate:

- Run type check and targeted unit tests.
- Run the app at `http://localhost:3100`.
- Hard refresh affected routes.
- Check console, network, server logs, and runtime errors.
- Run `/wiring-audit` and confirm obligation coverage appears in proof output.
- Capture screenshot proof for event, calendar, finance, prep/shopping, analytics, and fallback rail.

## Feature Deepener Pass

Feature read:

The feature is the Obligation Lens inside the Rail. It serves chefs who need one trusted place to see the work they are professionally bound to handle across events, clients, money, safety, communication, compliance, and self-declared business commitments. It lives primarily in contextual Rail assembly and rendering, with source data coming from lifecycle, action-center, event spine, commitments, payment, message, and CIL systems.

Verdict: useful but partial until the first build proves obligations can be normalized, scored, promoted, rendered, and audited without becoming a second task system.

### Best Improvements

1. **Add an obligation-first vertical slice before broad resolver coverage.**
   Start with five high-consequence domains: `dietary_safety`, `money`, `client_communication`, `service_lifecycle`, and `proof_closeout`. These domains are already represented by existing resolvers and app concepts, so the build can prove the contract without inventing a new persistence model.

2. **Make "front and center" a deterministic function.**
   The first build should not rely on copy, component placement, or resolver order. Add a pure scorer and promoter that returns `front_and_center` when consequence, due window, owner, proof risk, and page affinity cross the threshold.

3. **Render obligations as obligations, not generic rail recommendations.**
   Add compact metadata to the row: owner, state, due label, proof state, and one action. The UI can reuse existing Rail row structure, but the user must be able to distinguish "interesting signal" from "binding obligation."

4. **Prove category-gap promotion.**
   Calendar, finance, prep/shopping, and client detail already expose the problem: obligations can naturally belong to categories absent from the current rail profile. The first build should include a test where a money obligation appears on Calendar and a risk obligation appears on Prep/Shopping.

5. **Treat missing proof as active work.**
   A completed-looking obligation with missing, stale, or disputed proof should remain visible. This is the core trust improvement over ordinary task feeds.

### Action Surface

Obligation rows need these actions:

- Open source: navigate to the event, client, invoice, message, menu, or proof source.
- Resolve/mark handled: only when an existing canonical action exists.
- Snooze: allowed for low-risk or non-safety obligations, never for hard safety/legal/payment blockers without a reason.
- Inspect proof: opens the proof source or audit trace.
- Recover: visible for failed automation, failed message, failed payment, or failed lifecycle transition.

Command surface:

- Add command palette entries only for global obligation actions: "Open obligation center", "Show overdue obligations", "Show missing proof", and "Show obligations for current page."
- Do not add separate commands for every domain in v1.

Rail surface:

- Collapsed Rail shows count plus highest-severity label.
- Expanded Rail shows an Obligation lane before intelligence.
- Existing category sections still render below, preserving current Rail architecture.

### Product Polish

Labels should be short and operational:

- Use "Deposit unpaid" instead of "Payment obligation is exposed."
- Use "Dietary data missing" instead of "Guest nutrition obligations incomplete."
- Use "Waiting on client approval" instead of "Client must perform pending action."
- Use "Proof missing" instead of "Evidence state unavailable."

States should be visibly distinct:

- `overdue`, `blocked`, `due_now`, and `at_risk` get critical treatment.
- `waiting_on_other` shows owner and follow-up due.
- `completed` appears only in proof/history, not first view.
- `suppressed` appears only in debug/audit output unless the suppression itself is risky.

Empty state:

- If no obligations exist and coverage is complete, show nothing or a compact "clear" state.
- If no obligations exist because coverage is unknown, show an audit finding.

### Data And Logic

V1 should compute obligations from existing sources, not persist a new obligations table.

Persist only per-user Rail item state that already fits the existing rail state model: seen, dismissed, snoozed, acted, resolved, expired. If later builds need historical obligation analytics, introduce append-only obligation events after the computed model is proven.

Canonical source rules:

- Payment truth comes from ledger/invoice/payment sources.
- Service lifecycle truth comes from event status, lifecycle progress, and event spine.
- Communication truth comes from messages, scheduled messages, inquiry follow-ups, and action center due dates.
- Dietary/menu truth comes from event guest data, menu approval status, recipe/menu validation, and existing dietary checks.
- Commitment truth comes from `commitments`, `commitment_overrides`, and CIL commitment signals.
- Proof truth comes from linked source records and Wiring Audit/Page X-Ray outputs, not from the obligation item itself.

Freshness:

- Service-day, safety, payment, and failed automation obligations should refresh with the Rail.
- Analytics and business-health obligations can use cached or daily freshness rules.
- Unknown freshness should lower confidence and raise proof risk.

### Smallest High-Leverage Batch

Batch 1 should not build every obligation domain. It should prove the spine:

- Add obligation types and pure scoring/adapter utilities.
- Add `obligationCoverage` metadata to all current chef `RAIL_PROFILES`.
- Implement computed obligation candidates for five domains: dietary safety, money, client communication, service lifecycle, and proof closeout.
- Merge obligations into contextual rail assembly with category-gap promotion and dedupe.
- Add compact obligation metadata to the existing Rail row or a small Obligation lane.
- Add focused tests for scoring, adapter, profile coverage, category-gap promotion, and proof-missing behavior.

Likely file ownership:

- `lib/discovery/contextual-rail-types.ts`
- `lib/discovery/rail-profiles.ts`
- `lib/discovery/contextual-rail-assembly.ts`
- `lib/discovery/obligations/*`
- `components/rail/*`
- `tests/unit/*obligation*.test.ts`

Do not touch admin/staff/partner/client portal resolver expansion in Batch 1 unless required by type compatibility.

### Deepened Acceptance Criteria

- Given an event with missing dietary evidence, the event Rail shows a critical or action-tier dietary obligation with owner, due label, action, and proof state.
- Given an accepted event with unpaid deposit, event and calendar Rail both surface the money obligation even if Calendar lacks the money category.
- Given a follow-up due today, inquiry/client Rail surfaces a communication obligation with `waitingOn` or chef-owned action.
- Given a completed-looking obligation with missing proof, it remains visible as proof-closeout work.
- Given a route profile with required domains but no candidates or exclusions, the assembly emits an unknown/missing coverage finding.
- Given duplicate existing resolver and obligation items for the same source, the Rail keeps the item with clearer obligation metadata and action.
- Given a client/staff/partner/public role, obligation output is role-safe and does not expose chef-only financial, private-note, or tenant data.

### Cut List

Skip these in the first build:

- Persistent obligation tables.
- Custom chef-defined obligation domains.
- Full admin/staff/partner/vendor obligation support.
- Remy autonomous obligation resolution.
- New dashboard-wide obligation center.
- Broad analytics around obligation history.
- Full Page X-Ray hard failure until the computed obligation model is stable.

## Implementation Phases

### Phase 1: Contract and Coverage Metadata

- Add obligation types.
- Add `obligationCoverage` to `RailProfile`.
- Add coverage declarations for current profiles.
- Add tests that fail when a profile has unknown obligation coverage.

### Phase 2: Resolver and Adapter

- Implement obligation resolver aggregator.
- Implement lifecycle, commitment, action-center, payment, message, and event-spine source adapters.
- Adapt obligations to existing Rail item shape.
- Add scoring tests.

### Phase 3: Rail Assembly Integration

- Merge obligations into contextual rail assembly.
- Promote front-and-center obligations across category gaps.
- Dedupe against existing items.
- Add collapsed Rail obligation metrics.

### Phase 4: UI Prominence

- Add an Obligation lane to expanded Rail.
- Add owner/state/due/proof display.
- Add direct primary action.
- Preserve compact density and prevent generic intelligence from outranking obligations.

### Phase 5: Audit and Proof

- Extend Page X-Ray and Wiring Audit with obligation coverage.
- Emit unknown, missing, suppressed, and intentionally excluded obligation states.
- Add proof-pack output.

## Build Queue Shape

Recommended queue item:

```md
Title: Make chef obligations front and center in every Rail

Goal:
Add a first-class obligation layer to the Rail so every contextual rail profile surfaces urgent chef obligations, proves completed obligations, and reports unknown/missing coverage.

Scope:

- Obligation taxonomy and normalized contract
- Rail profile obligation coverage metadata
- Obligation resolver/adapter/scoring layer
- Assembly integration with category-gap promotion
- Obligation lane or equivalent first-view UI prominence
- Page X-Ray/Wiring Audit obligation coverage proof

Acceptance:

- Every Rail profile declares required/optional/excluded obligation domains
- Critical obligations surface in collapsed Rail or first expanded view
- Completed obligations require proof before suppression
- Unknown obligation coverage appears as an audit defect
- No role/tenant leakage
- Focused tests, type check, runtime smoke, wiring audit, and screenshots pass

Risks:

- Duplicate items if obligation resolver and existing resolvers emit the same source
- Overcrowding the Rail if front-and-center rules are too permissive
- Role/privacy leakage for client/staff/partner obligations
- Treating inferred obligations as confirmed proof

Verification:

- Unit tests for scoring, coverage, adapter, dedupe, proof suppression
- Runtime checks on event, client, calendar, inquiries, menu, recipe, finance, prep/shopping, analytics, fallback
- Wiring Audit proof pack
```

## Non-Goals

- Do not replace the existing Rail category model.
- Do not show every obligation at once.
- Do not turn the Rail into a generic task list.
- Do not auto-execute lifecycle transitions.
- Do not expose private financial or client data across roles.
- Do not count a hidden/completed obligation as handled without proof.

## Open Questions

- Should obligations have a persistent table, or should v1 compute them from existing sources only?
- Should chefs be able to declare custom obligation domains beyond the built-in taxonomy?
- Should personal capacity obligations be hidden behind a privacy toggle by default?
- Should Page X-Ray fail builds when a required obligation domain is missing, or only warn during the first rollout?
- Should client/staff/partner rails show their own obligations or only obligations relevant to the chef's view of them?
