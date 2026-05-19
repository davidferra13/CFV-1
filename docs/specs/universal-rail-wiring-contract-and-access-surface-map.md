# Universal Rail Wiring Contract and Access Surface Map

> Status: spec-ready
> Date: 2026-05-19
> Scope: Universal Rail, Access Surface Map, Access Surface Rail, Page X-Ray, Wiring Audit, route/access verification

## Purpose

The Rail is ChefFlow's universal wiring surface.

Its sole purpose is to prove that everything important in ChefFlow is wired into the user's current context, prioritized correctly, role-safe, fresh enough to trust, and actionable.

Nothing important should exist in ChefFlow without a contextual path to awareness, action, recovery, or proof.

The Rail is not a sidebar, URL list, widget, feed, or decorative assistant panel. It is the codebase-to-product wiring contract. Every route, entity, signal, action, permission, workflow, risk, recovery path, proof artifact, and system capability must either:

- appear front and center on the Rail,
- be available in context from the Rail,
- be reachable through the Rail's lower-priority surfaces,
- feed the Rail as source intelligence,
- or be explicitly excluded with a documented reason.

Unknown wiring is a product defect.

## Operating Promise

Wherever a user enters ChefFlow, the Rail refreshes into that access point's truth:

- what matters now,
- what the user can do from here,
- what is at risk,
- what changed,
- what needs approval,
- what is stale or blocked,
- what the system knows that is not obvious on the page,
- what can be trusted,
- what needs recovery,
- and where the user should go next.

The Rail continuously evaluates everything relevant, but it does not display everything at once. It shows the highest-priority subset, keeps lower-priority items discoverable, and documents why anything important is hidden or excluded.

## Required Vocabulary

Use this terminology consistently in specs, code, Page X-Ray, build queue items, and UI copy:

| Term                           | Meaning                                                                                                    |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| URL                            | A concrete browser address, such as `/clients/client_123`.                                                 |
| Route                          | An app-defined route pattern, such as `/clients/[id]`.                                                     |
| Surface                        | Anything a user or system can reach, run, observe, or trigger.                                             |
| Access Surface                 | A surface plus role access, auth policy, reachability, and exposure.                                       |
| Rail                           | ChefFlow's always-on contextual wiring and prioritization layer.                                           |
| Access Surface Map             | The generated matrix of routes, actions, endpoints, policies, reachability, and risks.                     |
| Access Surface Rail            | The route-aware rail view for the current access point.                                                    |
| Route Access Matrix            | The audit/report output proving route/access coverage.                                                     |
| Rail Surfacing Contract        | The contract that says what must, may, must not, or can conditionally surface on the Rail.                 |
| Universal Rail Wiring Contract | The global invariant that every important codebase capability is wired to the Rail or explicitly excluded. |

Avoid the term "URL Rail" except as a temporary compatibility alias while migrating existing code.

## User Questions The Rail Must Always Answer

From any access point, for the current role and context, the Rail must be able to answer:

- What matters right now?
- What is the one most important action or blocker?
- What is urgent today?
- What can I do from here?
- What am I allowed to do?
- What is blocked?
- What is stale?
- What changed?
- What needs approval?
- What is waiting on me?
- What is waiting on someone else?
- What is risky?
- What is missing?
- What has failed?
- What has been handled automatically?
- What is hidden because of role, sensitivity, or context?
- What does the system know that the page is not showing?
- What proof exists?
- Can I trust this page?
- Where should I go next?

## Rail Wiring State

Every important codebase capability must have exactly one current wiring state:

```ts
export type RailWiringState =
  | 'front_and_center'
  | 'available_in_context'
  | 'reachable_through_more'
  | 'feeds_rail'
  | 'intentionally_excluded'
  | 'unknown'
```

`unknown` is allowed only during discovery and must be emitted as a finding. A build is not complete if changed surfaces remain `unknown`.

## What Must Be Wired

The Universal Rail Wiring Contract covers:

- every `app/**/page.tsx` route,
- every `app/**/route.ts` route handler,
- every API endpoint that affects user-visible state,
- every server action,
- every navigation item,
- every command palette action,
- every important button, link, menu item, toolbar control, shortcut, and contextual action,
- every important empty, loading, error, disabled, success, stale, and recovery state,
- every domain entity: client, event, menu, recipe, quote, invoice, payment, task, message, vendor, ingredient, location, staff member, partner, review, lead, inquiry, document, commitment, ledger entry,
- every CIL signal,
- every Remy draft, explanation, preparation, or suggested action,
- every Page X-Ray finding,
- every Wiring Audit proof artifact,
- every build queue or proof-pack item that affects the current surface,
- every security, auth, permission, and tenant-scope state relevant to the user,
- every notification, reminder, deadline, escalation, approval, and handoff,
- every automation outcome that changes what the user needs to know,
- and every route/access mismatch or product dead zone.

## Universal Rail Contract

Every discovered source should normalize into this contract or an equivalent stricter type:

```ts
export type RailSourceType =
  | 'route'
  | 'api'
  | 'server-action'
  | 'component-action'
  | 'entity'
  | 'signal'
  | 'workflow'
  | 'proof'
  | 'recovery'
  | 'navigation'
  | 'command'
  | 'automation'
  | 'xray'
  | 'wiring-audit'

export type RailZone =
  | 'now'
  | 'watch'
  | 'context'
  | 'actions'
  | 'recovery'
  | 'proof'
  | 'more'
  | 'excluded'

export type UniversalRailContract = {
  id: string
  sourceType: RailSourceType
  sourceFile: string
  routePattern?: string
  entityType?: string
  entityIdParam?: string
  roles: Array<'public' | 'chef' | 'client' | 'admin' | 'staff' | 'partner' | 'vendor'>
  wiringState: RailWiringState
  priority: 'critical' | 'high' | 'medium' | 'low' | 'ambient'
  urgency: 'now' | 'today' | 'soon' | 'background'
  railZone: RailZone
  actionPath?: string
  proofPath?: string
  recoveryPath?: string
  freshnessRule: 'realtime' | 'polling' | 'event-driven' | 'cached' | 'static' | 'unknown'
  confidence: number
  risks: RailRisk[]
  exclusionReason?: string
  suppressionRule?: string
  lastEvaluatedAt: string
}
```

## Access Surface Record

The Access Surface Map should generate route/access records from the codebase and enrich them with curated Rail contracts:

```ts
export type AccessSurfaceRecord = {
  routePattern: string
  exampleUrl?: string
  sourceFile: string
  surfaceType:
    | 'page'
    | 'api'
    | 'route-handler'
    | 'server-action'
    | 'redirect'
    | 'nav-link'
    | 'command'
  roles: Array<'public' | 'chef' | 'client' | 'admin' | 'staff' | 'partner' | 'vendor' | 'unknown'>
  policySource?: string
  policyState: 'aligned' | 'missing' | 'stale' | 'conflict' | 'unknown'
  middlewareProtected: boolean
  runtimeGuard: 'present' | 'missing' | 'not-required' | 'unknown'
  navigationExposure:
    | 'primary-nav'
    | 'secondary-nav'
    | 'command'
    | 'linked'
    | 'deep-link'
    | 'hidden'
    | 'unknown'
  dynamicParams: string[]
  railWiringState: RailWiringState
  railContractId?: string
  risks: RailRisk[]
  confidence: number
}
```

## Rail Risk Model

Risks must be typed and severity-ranked. Do not collapse every mismatch into generic "needs review."

```ts
export type RailRiskSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info'

export type RailRisk = {
  id: string
  severity: RailRiskSeverity
  category:
    | 'auth'
    | 'tenant-scope'
    | 'route-policy'
    | 'runtime-guard'
    | 'reachability'
    | 'navigation'
    | 'missing-action'
    | 'missing-recovery'
    | 'stale-data'
    | 'low-confidence'
    | 'xray-finding'
    | 'wiring-gap'
    | 'sensitive-data'
    | 'dead-zone'
  message: string
  sourceFile?: string
  routePattern?: string
  proofPath?: string
}
```

Severity rules:

- `critical`: public/protected auth mismatch, missing admin runtime guard, API auth missing, tenant data exposed without tenant scope, client/staff/partner sees restricted data, destructive action exposed unsafely.
- `high`: route exists but policy is unknown, nav exposes a blocked route, critical/high signal is not surfaced, recovery path missing for failed state.
- `medium`: hidden route lacks documented reason, stale X-Ray contract, server action guard unknown, important action only reachable indirectly.
- `low`: missing example URL, weak label, missing proof link, stale confidence label.
- `info`: intentionally deep-linked only, intentionally excluded, role-safe suppression.

## Rail Zones

The Rail must support these zones on every access point. The visual treatment can vary by viewport, but the model must remain stable.

### Now

One dominant current truth:

- the highest-priority blocker,
- the next best action,
- the most urgent deadline,
- or the most important proof/recovery state.

This zone must not rotate while the user is reading or interacting.

### Watch

Urgent risks, anomalies, deadlines, waiting states, failed syncs, payment risks, client-facing issues, and soon-to-expire commitments.

### Context

Facts about the current route, entity, workflow, role, and operating moment. Examples:

- on `/clients/[id]`: client health, current relationship state, open events, preferences, spend, communication risk;
- on `/events/[id]`: readiness, menu, guests, staffing, payments, communication, production, timeline;
- on `/menus/[id]`: costing, approvals, dietary conflicts, ingredients, production state;
- on dashboard: global operating truth.

### Actions

Allowed actions for the current role and context. Every visible signal should have an action, proof link, recovery path, or explicit read-only reason.

### Recovery

Ways to fix broken, stale, missing, blocked, failed, or ambiguous states.

### Proof

Source, confidence, freshness, Page X-Ray status, route policy alignment, audit trail, wiring proof, and runtime verification.

### More

Lower-priority valid actions, advanced controls, grouped contextual commands, and infrequent surfaces.

### Excluded

Items intentionally not surfaced because of role, sensitivity, density, legal/privacy, irrelevant context, or product decision. Every excluded item needs a reason.

## Front-And-Center Rule

The Rail must always reserve its top visible area for the strongest current truth. Priority order:

1. Critical blockers: auth/security gap, tenant-scope risk, broken route, failed sync, missing runtime guard, client-facing failure.
2. Time-sensitive commitments: event deadlines, pending approvals, prep windows, overdue invoices, waiting client replies, staff conflicts.
3. Next best action: the most useful allowed action for this user at this access point.
4. Entity risk: current client/event/menu/recipe/finance/communication risk.
5. Proof and trust: X-Ray status, policy alignment, data freshness, confidence, source trail.

Everything else is grouped, collapsed, or sent to command/search.

## Priority Engine

Rail ordering must be deterministic whenever possible. AI may summarize or explain, but it must not own canonical priority state.

```ts
priorityScore =
  severityWeight +
  urgencyWeight +
  roleRelevanceWeight +
  entityRelevanceWeight +
  freshnessWeight +
  confidenceWeight +
  businessImpactWeight +
  userIntentWeight -
  suppressionPenalty -
  fatiguePenalty
```

Inputs:

- severity,
- urgency,
- role relevance,
- current route/entity relevance,
- deadline proximity,
- client/revenue/business impact,
- freshness,
- confidence,
- actionability,
- user intent,
- prior dismissals/snoozes,
- role permissions,
- viewport/density budget.

Rules:

- `critical` and `high` items cannot disappear into ambient UI.
- A `critical` item must be in `now` or `watch`.
- A `high` item must be in `now`, `watch`, or `actions`.
- A suppressed item must have a suppression rule.
- A dismissed item must be recoverable from history or "More" if it can still matter.
- A stale item can surface only with freshness/proof labeling.

## Refresh Contract

The Rail is always-on and context-aware. It must refresh from:

- route changes,
- role/session changes,
- current entity changes,
- live data changes,
- X-Ray findings,
- CIL signals,
- Remy insights,
- deadlines,
- payments,
- approvals,
- communications,
- workflow state changes,
- automation runs,
- API/server action failures,
- and build/proof changes where relevant.

Refresh should be bounded and calm:

- event-driven where possible,
- polling only where needed,
- stale labels when freshness is uncertain,
- no layout shift around primary actions,
- no continuous movement of warnings or clickable actions,
- pause or freeze behavior when the user is reading, hovering, focusing, touching, or opening details.

## Missing Surface Detection

The build must flag when important state exists but has no Rail representation. Examples:

- route has policy risk but Rail does not show it,
- page has pending approval but no action,
- event has deadline but no reminder,
- client has risk signal but no follow-up path,
- payment is overdue but not on the Rail,
- API/server action error affects page but no recovery path,
- X-Ray finding exists but Rail hides it,
- CIL/Remy insight exists but has no visible action path,
- nav item exists but corresponding access surface is unknown,
- command exists but no role/access proof exists,
- hidden route has no exclusion reason.

## Access Surface Map

The Access Surface Map is the generated foundation for the Rail contract.

It must inventory:

- `app/**/page.tsx`,
- `app/**/route.ts`,
- route groups such as `(chef)`, `(client)`, `(admin)`, `(bare)`,
- dynamic route params such as `[id]`,
- API route handlers,
- route redirects and rewrites,
- server actions,
- navigation config,
- command palette config,
- `Link href`,
- `router.push`,
- `redirect`,
- existing URL capability contracts,
- existing Universal Rail registries and item definitions,
- Page X-Ray records,
- and Wiring Audit proof.

Generated outputs:

- `artifacts/access-surface/route-access-matrix.json`
- `artifacts/access-surface/route-access-matrix.md`

The generated matrix should be the baseline. Curated contracts enrich the baseline, but should not be the only source of truth.

## Policy Mapping

Every discovered route must be compared against:

- `CHEF_PROTECTED_PATHS`,
- `CLIENT_PROTECTED_PATHS`,
- `STAFF_PROTECTED_PATHS`,
- `PARTNER_PROTECTED_PATHS`,
- `VENDOR_PROTECTED_PATHS`,
- `ADMIN_PATHS`,
- `PUBLIC_UNAUTHENTICATED_PATHS`,
- API skip/auth prefixes,
- `middleware.ts`,
- runtime guards such as `requireChef()`, `requireClient()`, `requireAuth()`, `requireAdmin()`, `requireStaff()`, and `requirePartner()`.

Admin paths require special handling:

- Middleware can allow authenticated users to `/admin`.
- Every admin page and admin server action must call `requireAdmin()`.
- Missing runtime admin guard is a critical risk.

Tenant routes require special handling:

- tenant data queries must include tenant scoping,
- dynamic route params cannot be the sole data filter,
- missing tenant scope is critical where tenant data is returned or mutated.

## Role-Safe Surfacing

Rail surfacing must respect:

- public,
- chef,
- client,
- staff,
- partner,
- vendor,
- admin.

Rules:

- UI visibility is not a security boundary.
- The Rail must not reveal restricted data, labels, counts, names, or hints to unauthorized roles.
- Hidden sensitive items should be suppressed completely, not blurred into existence.
- Authorized users may see proof that something is hidden from another role.
- Role-specific Rails should share the same contract model but render different facts, actions, and proof.

## Page X-Ray Updates

Page X-Ray must evolve from exhaustive URL/page interrogation into exhaustive route, page, endpoint, action, and access-surface interrogation.

Update `.claude/skills/page-xray/SKILL.md`, `.claude/skills/page-xray/SCHEMAS.md`, and `.claude/skills/page-xray/XRAY-SURVEY.md` to include access-surface scope.

New invocations:

```text
/page-xray --access-surfaces
/page-xray --route-matrix
/page-xray --policy-mismatches
/page-xray --unclassified-routes
/page-xray --hidden-surfaces
/page-xray /clients/[id] --access-only
/page-xray /clients/[id] --surface-rail
```

Each scan record should include:

```ts
access_surface: {
  routePattern: string
  exampleUrl?: string
  sourceFile: string
  surfaceType: string
  roles: string[]
  policySource?: string
  policyState: string
  middlewareProtected: boolean
  runtimeGuard: 'present' | 'missing' | 'not-required' | 'unknown'
  navigationExposure: string
  dynamicParams: string[]
  railWiringState: RailWiringState
  railContractId?: string
  accessRisks: RailRisk[]
  registryStatus: 'covered' | 'missing' | 'partial' | 'stale'
}
```

Page X-Ray must ask:

- What route pattern is this?
- What file owns it?
- What role can access it?
- Is it registered in route policy?
- Does policy match the actual route group?
- Is it middleware-protected?
- Is a runtime guard required and present?
- Does it read or write tenant data?
- Is tenant scoping visible in the data path?
- Is it reachable through nav, command palette, links, redirect, or deep link?
- Is hidden/deep-link behavior intentional?
- What must be front and center on this route?
- What should be available but collapsed?
- What should never surface for this role?
- What important data exists but has no Rail slot?
- What action does every visible signal lead to?
- What stale, risky, or low-confidence data needs proof?
- Does the Rail know this route?
- Does the Access Surface Map know this route?
- Does this route have open X-Ray findings that must surface?

Important governance change:

- Page X-Ray may recommend rail/profile/build changes.
- Page X-Ray may write scan reports.
- Page X-Ray must not silently edit app code.
- Page X-Ray must not auto-queue work unless the user explicitly asks to queue.
- Build opportunities should be emitted as queue-ready recommendations.

## Wiring Audit Updates

Wiring Audit must treat access-surface proof as a closeout gate.

For every affected route or surface, Wiring Audit must verify:

- route exists in the Access Surface Map,
- route policy matches expected access,
- runtime guard exists where required,
- server actions/API routes are authenticated where required,
- tenant scoping is present where protected tenant data is used,
- nav/command/deep-link exposure is intentional,
- Rail contract exists or exclusion is documented,
- `critical` and `high` signals are surfaced in `now`, `watch`, or `actions`,
- hidden surfaces have suppression/exclusion reasons,
- proof/freshness/confidence are visible for risky or stale data,
- Page X-Ray access-surface scan ran or the proof pack explains why no route was affected.

Wiring Audit should fail if:

- a changed route has no access-surface record,
- a route has no Rail contract and no exclusion reason,
- an admin route lacks runtime admin guard,
- an API/server action has unknown auth state,
- a critical/high signal is unsurfaced,
- a user-visible state has no action, proof, recovery, or read-only reason,
- or Page X-Ray and Access Surface Map disagree.

## Existing Prototype Migration

Existing prototype files:

- `lib/navigation/url-capability-registry.ts`
- `components/rail/url-capability-rail.tsx`
- `tests/unit/url-capability-registry.test.ts`

Migration path:

1. Keep compatibility aliases for existing `UrlCapability*` exports.
2. Introduce `AccessSurface*` and `UniversalRailContract*` types.
3. Rename user-facing language from URL Capability to Access Surface.
4. Treat existing static contracts as curated overlays.
5. Generate baseline route/access records from the codebase.
6. Merge curated overlays with generated records.
7. Emit stale/missing contract findings instead of hiding gaps.

Do not add hundreds of hand-maintained URL records as the primary implementation.

## UI Requirements

The Access Surface Rail should show a compact user/admin version by default:

- current route/entity context,
- access role,
- top current truth,
- urgent watch items,
- allowed actions,
- recovery actions,
- proof/freshness/confidence,
- X-Ray status,
- route policy alignment,
- risks by severity.

Developer/admin expansion can show:

- route pattern,
- source file,
- policy source,
- route group,
- dynamic params,
- runtime guard status,
- middleware state,
- nav/command exposure source,
- related APIs/actions,
- Rail contract id,
- Access Surface Map record,
- X-Ray findings,
- Wiring Audit proof.

Mobile rules:

- critical/current truth remains visible,
- details move into a bottom sheet or grouped drawer,
- primary action stays reachable in thumb range,
- no text overflow,
- no action buttons moving while interacting,
- reduced-motion respected.

## Actions and Affordances

Every visible Rail item should expose one of:

- primary action,
- secondary action,
- recovery action,
- proof action,
- explain action,
- snooze/mute/dismiss where safe,
- open source/entity,
- read-only reason.

Missing action path is itself a finding unless the item is explicitly proof-only or read-only.

## Remy Contract

Remy may:

- explain what matters,
- summarize what changed,
- prepare a draft,
- recommend safe next actions,
- interpret Rail proof,
- help the user understand risks.

Remy must not:

- own canonical priority state,
- silently mutate records,
- expose restricted information,
- replace deterministic route/access/security checks,
- invent facts without proof.

Remy suggestions must route through Rail actions with approval where state changes are involved.

## God Mode Requirements

The Rail feels like God Mode only when it behaves like ChefFlow's live operating intelligence: aware of the current access point, aware of the whole business context, continuously refreshed, predictive, actionable, proof-backed, role-safe, and calm enough that the most important thing is always obvious.

This is not a visual style. It is a capability bar.

### Situation Awareness Layer

The Rail must know the full operating moment, not just the current route.

It should derive and expose:

- current route and route group,
- current role and permission state,
- current entity and entity lifecycle state,
- current day/time and timezone,
- event proximity,
- service/prep/admin/follow-up mode,
- active chef operating mode,
- client-facing vs internal-only context,
- current workflow stage,
- cross-entity dependencies,
- waiting-on state,
- stale/blocked/error state,
- and the reason each surfaced item matters now.

Required derived modes:

```ts
export type RailOperatingMode =
  | 'triage'
  | 'planning'
  | 'prep'
  | 'service'
  | 'follow-up'
  | 'admin'
  | 'recovery'
  | 'review'
  | 'monitoring'
  | 'configuration'
```

Every Rail item should be able to answer: "Why is this relevant from this access point right now?"

### Command Layer

The Rail must not only surface information. It must let the user act immediately when action is safe and allowed.

Each actionable item should support one or more command affordances:

- primary action,
- secondary actions,
- approve/reject,
- resolve,
- snooze,
- mute,
- dismiss,
- assign/delegate,
- open source,
- open related entity,
- ask Remy to prepare,
- view proof,
- view history,
- undo/revert where possible,
- retry failed automation,
- recover missing setup,
- create follow-up,
- escalate,
- share/send when role-safe.

Every Rail item should answer: "What can I do about this right now?"

If no action is available, the item must declare one of:

- `read_only_context`,
- `proof_only`,
- `blocked_by_permission`,
- `blocked_by_missing_data`,
- `blocked_by_policy`,
- `waiting_on_external_party`,
- `not_actionable_yet`.

### Prediction Layer

The Rail should provide foresight before problems become emergencies.

Predictive signals should include:

- event likely to become risky,
- client likely to churn,
- invoice likely to go overdue,
- quote likely to stall,
- menu likely to miss margin,
- prep window likely too tight,
- staffing conflict likely,
- vendor/order deadline likely to be missed,
- route/workflow likely to regress,
- automation likely to fail,
- stale data likely to mislead,
- client waiting longer than normal,
- opportunity likely to expire soon.

Prediction must be deterministic where possible. Remy may explain or summarize prediction but must not invent the underlying state.

Each prediction needs:

- source,
- reason,
- confidence,
- freshness,
- horizon,
- suggested action,
- suppression rule,
- proof path.

### Simulation Layer

The Rail should let users reason about likely consequences before taking high-impact actions.

Supported simulation prompts should include:

- What happens if I move this event?
- What happens if I raise the price?
- What happens if I discount this quote?
- What happens if I swap this ingredient?
- What happens if I delay this quote?
- What happens if I ignore this client for 24 hours?
- What happens if I approve this menu?
- What happens if I cancel this vendor order?
- What happens if I mark this event ready?
- What happens if I dismiss this risk?

Simulation outputs must distinguish:

- deterministic calculation,
- known historical pattern,
- current system state,
- Remy explanation,
- uncertain forecast.

Simulation must not mutate canonical state until the user confirms a concrete action.

### Memory Layer

The Rail must remember the user's relationship to each surfaced item.

Track:

- seen/unseen,
- first seen,
- last seen,
- changed since last viewed,
- dismissed,
- snoozed until,
- muted,
- pinned,
- delegated,
- handled,
- reopened,
- repeated warning count,
- escalation history,
- user preference,
- route where the item was last handled.

Memory should prevent noise while preserving accountability:

- handled items should not keep resurfacing unless they changed,
- ignored critical items should escalate,
- dismissed non-critical items should stay recoverable,
- snoozed items should return at the promised time,
- repeated warnings should explain what changed or why they came back.

### Confidence And Proof Layer

God Mode fails if the user cannot tell whether the Rail is right.

Every non-trivial Rail item needs trust metadata:

- source,
- computed from,
- last refreshed,
- freshness,
- confidence,
- proof link,
- X-Ray link where relevant,
- audit trail where relevant,
- waiting-on state,
- role/access basis,
- data owner,
- stale reason,
- uncertainty reason.

The Rail should make weak certainty visible without burying the user in implementation detail:

- high confidence: normal display,
- medium confidence: subtle proof/freshness label,
- low confidence: warning or collapsed proof state,
- unknown confidence: do not treat as primary truth unless it is a safety/security concern.

### Cross-Page Continuity

The Rail must preserve the user's operational thread as they move through the app.

Example:

1. User starts on dashboard and sees a risky event.
2. User opens the client.
3. User opens the event.
4. User opens the menu.
5. The Rail keeps the same event/client/menu thread alive while changing the contextual details.

Add an active thread model:

```ts
export type ActiveRailThread = {
  id: string
  originRoute: string
  currentRoute: string
  primaryEntityType: string
  primaryEntityId?: string
  relatedEntityIds: Record<string, string[]>
  activeQuestion?: string
  currentObjective?: string
  startedAt: string
  lastAdvancedAt: string
  state: 'active' | 'paused' | 'resolved' | 'abandoned'
}
```

Thread continuity should support:

- resume where the user left off,
- show what changed since the thread began,
- preserve the primary objective,
- keep related proof/action paths nearby,
- avoid losing urgent global risks while in deep entity context.

### Escalation Rules

Important items must climb automatically when they become more urgent or risky.

Escalation inputs:

- time,
- severity,
- event proximity,
- payment/revenue impact,
- client-facing impact,
- security/privacy impact,
- failed automation,
- failed retry,
- repeated dismissal,
- repeated stale data,
- missed deadline,
- unresolved X-Ray finding,
- broken route/access proof,
- role-sensitive exposure.

Escalation actions:

- move from `more` to `watch`,
- move from `watch` to `now`,
- pin,
- require acknowledgement,
- require proof,
- trigger recovery action,
- notify or remind,
- block unsafe action,
- open Page X-Ray/Wiring Audit proof.

Escalation must explain why it happened.

### Suppression Rules

God Mode also means restraint. The Rail must know what not to show.

Suppress or demote items when:

- already handled,
- irrelevant to the current access point,
- wrong role,
- insufficient confidence,
- duplicate of a stronger item,
- stale and untrusted,
- sensitive,
- not actionable yet,
- outside operating mode,
- lower priority than available viewport budget,
- user explicitly snoozed or muted it,
- legal/privacy policy forbids surfacing.

Every suppression needs:

- suppression reason,
- suppressed until or invalidation condition,
- recovery path if the user needs to inspect hidden items,
- proof that suppression is role-safe.

### Global Now Thread

The Rail must always be able to produce one top-level answer:

> The most important thing in ChefFlow right now is \_\_\_.

This may be:

- global,
- route-specific,
- entity-specific,
- role-specific,
- workflow-specific,
- or safety/security-specific.

The Global Now Thread must include:

- title,
- reason,
- priority,
- action path,
- proof path,
- freshness,
- confidence,
- what changed,
- what happens if ignored,
- and why it outranks other candidates.

### God Mode Item Contract

Rail items should normalize into a richer item contract when they are eligible for God Mode surfacing:

```ts
export type GodModeRailItem = UniversalRailContract & {
  operatingMode: RailOperatingMode
  whyNow: string
  commandState:
    | 'actionable'
    | 'read_only_context'
    | 'proof_only'
    | 'blocked_by_permission'
    | 'blocked_by_missing_data'
    | 'blocked_by_policy'
    | 'waiting_on_external_party'
    | 'not_actionable_yet'
  commands: Array<{
    id: string
    label: string
    kind:
      | 'primary'
      | 'secondary'
      | 'approve'
      | 'reject'
      | 'resolve'
      | 'snooze'
      | 'delegate'
      | 'recover'
      | 'proof'
      | 'simulate'
      | 'explain'
      | 'undo'
    href?: string
    requiresConfirmation?: boolean
    requiresApproval?: boolean
    disabledReason?: string
  }>
  prediction?: {
    horizon: 'hours' | 'today' | 'week' | 'month'
    outcome: string
    confidence: number
    reason: string
    proofPath?: string
  }
  simulationPrompts?: string[]
  memory: {
    seen: boolean
    firstSeenAt?: string
    lastSeenAt?: string
    changedSinceLastSeen: boolean
    dismissedAt?: string
    snoozedUntil?: string
    pinned: boolean
    repeatedWarningCount: number
  }
  thread?: ActiveRailThread
  escalation: {
    level: 'none' | 'watch' | 'now' | 'pinned' | 'blocking'
    reason?: string
    escalatedAt?: string
  }
}
```

## Feature Deepener Addendum

This section tightens the spec from "powerful system" into "complete product." The Rail should not merely contain everything. It should make the user faster, calmer, safer, and more certain at the exact moment they need help.

### Real-Use Completeness Test

The Rail is incomplete if a real user can land on any ChefFlow access point and still ask:

- What should I pay attention to?
- What should I do first?
- Why is this here?
- Is this fresh?
- Is this safe to act on?
- Who can see this?
- What happens if I ignore it?
- Where is the proof?
- How do I recover if this is wrong?
- Why did this disappear?
- Why did this come back?

Each route and role should be tested against those questions.

### Operating Scenarios

God Mode must prove itself in representative scenarios, not only unit tests.

Required scenario packs:

- Chef morning triage: dashboard, overdue payment, today's event, waiting client, prep deadline.
- Chef event prep: event detail, menu risk, staffing issue, shopping list, production timing.
- Chef client recovery: client profile, dormant client, unresolved follow-up, relationship risk, next action.
- Chef finance recovery: invoice overdue, payment schedule, revenue risk, proof and recovery path.
- Chef menu readiness: menu route, margin risk, dietary conflict, approval state, ingredient issue.
- Client portal: client can see only client-safe context, approvals, receipts, preferences, event status.
- Staff portal: staff sees assigned work, station timing, safe handoff context, no private chef/client finance.
- Admin route: admin sees route/access/security proof, policy mismatches, runtime guard risks.
- Public route: anonymous user sees only public-safe discovery/booking context.
- Broken state: failed sync, missing data, stale cache, API failure, route policy mismatch.

Each scenario should assert:

- Global Now is correct.
- Critical/high signals are visible.
- Actions are role-safe.
- Proof/freshness is available.
- Suppressed items have reasons.
- No restricted data leaks across roles.

### Noise Budget

God Mode fails if it becomes noisy.

Every Rail viewport needs a strict density budget:

- one Global Now item,
- zero to three Watch items,
- two to six contextual facts/actions depending on viewport,
- grouped More for everything else,
- proof available but not visually dominant unless risk is high.

Rules:

- Critical items can exceed the normal budget.
- Duplicate items must collapse into the strongest representative.
- Similar low-priority items must group.
- Repeated items must explain what changed.
- Items without action, proof, or context should not occupy prime space.
- Ambient information must never compete with urgent action.

### Role-Specific God Mode

The same Rail contract should produce different experiences by role:

- Chef: business operations, clients, events, revenue, prep, communication, recovery, growth.
- Client: event status, approvals, preferences, receipts, communications, safe next steps.
- Staff: assigned tasks, timing, station state, handoffs, safety notes, operational context.
- Partner: shared opportunities, referrals, collaboration handoffs, settlement-safe proof.
- Vendor: orders, deadlines, delivery, substitutions, payment-safe context where applicable.
- Admin: access surfaces, route policy, runtime guards, tenant risks, build proof, system health.
- Public: booking/discovery intent, trust proof, availability, safe conversion paths.

Role-specific Rails must not only hide data. They must change priority, copy, actions, and proof to match the role's job.

### Source Adapter Contract

Every system feeding the Rail should do so through adapters instead of custom one-off mapping.

Adapter responsibilities:

- fetch or receive source state,
- normalize into Rail item candidates,
- attach source/proof/freshness,
- attach role visibility,
- attach entity scope,
- attach action/recovery/proof paths,
- declare confidence,
- declare suppression and escalation rules,
- avoid leaking unauthorized facts,
- avoid duplicate item creation.

Adapter families:

- route/access adapter,
- Page X-Ray adapter,
- Wiring Audit adapter,
- CIL adapter,
- Remy adapter,
- Priority Queue adapter,
- client intelligence adapter,
- event readiness adapter,
- menu intelligence adapter,
- finance/payment adapter,
- communication adapter,
- automation adapter,
- lifecycle/ledger adapter,
- navigation/command adapter.

### Observability And Health

The Rail needs its own health model.

Track:

- last assembled at,
- source adapter durations,
- source adapter failures,
- item count by zone,
- suppressed count by reason,
- critical/high item count,
- stale item count,
- hidden sensitive item count,
- role-filtered item count,
- duplicate collapse count,
- Global Now selected item and runner-up candidates,
- scoring inputs for top items,
- refresh age,
- route/access matrix freshness,
- Page X-Ray freshness,
- Wiring Audit freshness.

Expose admin/developer proof:

- Rail assembly trace,
- why this item won,
- why this item was suppressed,
- which adapter produced it,
- which proof path backs it,
- which role filter allowed it.

### Value Metrics

The Rail should prove that it improves ChefFlow, not just that it renders.

Track product metrics:

- time to first useful action,
- critical issue acknowledgement time,
- overdue item recovery rate,
- stale data exposure count,
- role-leak prevention count,
- route/access mismatch count,
- user dismissed-as-not-useful rate,
- snooze-return completion rate,
- command completion rate,
- recovery action success rate,
- Page X-Ray finding surfaced rate,
- hidden-surface-without-reason count,
- Global Now accuracy review score in QA.

These metrics should be available to admin/developer surfaces and proof packs.

### Empty, Error, Loading, And Offline States

The Rail must be useful even when data is missing.

Required states:

- loading: show stable skeleton zones without layout shift,
- partial loading: show available high-confidence items and mark missing sources,
- empty: explain whether nothing is urgent or sources are unavailable,
- error: show source-specific recovery and proof,
- stale: show last known state with freshness warning,
- offline/degraded: show cached safe items and disable unsafe actions,
- unauthorized: suppress sensitive context and show role-safe route state,
- unknown route: show access-surface fallback and report missing contract,
- failed action: show retry, undo/recovery, proof, and support/developer trace where appropriate.

### Change Explanation

When the Rail changes, the user should understand why.

For important items, support:

- new,
- changed,
- escalated,
- de-escalated,
- resolved,
- snoozed,
- returned,
- hidden,
- replaced by stronger item,
- stale,
- failed,
- recovered.

Any item that moves into Global Now should carry a change explanation.

### Manual Control

God Mode must not trap the user inside automation.

User controls:

- pin,
- unpin,
- snooze,
- mute category,
- dismiss,
- mark handled,
- explain why,
- open proof,
- open source,
- show hidden/suppressed,
- restore dismissed,
- pause motion,
- reduce density,
- expand developer proof if authorized.

Manual control must respect role and security boundaries.

### Rollout Gates

Build this in gates so unfinished intelligence does not become noisy UI:

1. Generated Access Surface Map works without UI dependency.
2. Static Access Surface Rail reads generated records.
3. Priority/zone engine ranks deterministic items.
4. Global Now resolver works for dashboard and one entity route.
5. Role-safe rendering passes chef/client/admin checks.
6. Memory/snooze/dismiss works for recurring items.
7. Prediction/simulation are added only after proof and confidence rules exist.
8. Page X-Ray and Wiring Audit enforce access-surface proof.
9. Full scenario packs pass.

Do not ship predictive or simulation UI before proof/confidence/source metadata exists.

### Feature Deepener Acceptance Criteria

- The Rail can explain why every visible primary item is present.
- The Rail can explain why every top candidate did or did not become Global Now.
- The Rail has a bounded density budget per viewport.
- The Rail has role-specific command/copy/proof behavior for chef, client, staff, partner, vendor, admin, and public contexts.
- Every adapter emits source, freshness, confidence, role visibility, entity scope, and proof path.
- Admin/developer proof can show assembly trace and scoring rationale.
- Scenario packs verify chef morning triage, event prep, client recovery, finance recovery, menu readiness, client portal, staff portal, admin route, public route, and broken states.
- Empty/error/loading/stale/offline/unauthorized/unknown-route states produce useful Rail output.
- Important changes explain why they appeared, moved, disappeared, or returned.
- Manual controls exist for pin, snooze, dismiss, mute, proof, source, and hidden/suppressed review.
- Predictive/simulation items cannot ship without confidence, freshness, proof, and non-mutating preview rules.

## Complete Platform Hardening Addendum

This section adds the engineering and operating substrate required for "everything is wired" to stay true over time.

### Entity Graph Backbone

The Rail needs a canonical entity graph so cross-page context is not guessed from URLs.

Required entity nodes:

- chef,
- client,
- household,
- guest,
- event,
- menu,
- recipe,
- ingredient,
- vendor,
- quote,
- proposal,
- contract,
- invoice,
- payment,
- task,
- message,
- conversation,
- document,
- staff member,
- partner,
- location,
- review,
- inquiry,
- lead,
- commitment,
- automation run,
- X-Ray finding,
- wiring audit proof.

Required graph edges:

- owns,
- belongs_to,
- related_to,
- waiting_on,
- blocks,
- unblocks,
- depends_on,
- affects,
- references,
- supersedes,
- duplicates,
- resolves,
- generated_by,
- verified_by,
- visible_to,
- hidden_from.

Each Rail item should know its entity node and the most important neighboring nodes. This lets the Rail follow context from dashboard to client to event to menu without losing the active thread.

### Canonical Intent Model

The Rail should understand what the user is trying to do, not only where they are.

Supported intents:

- decide,
- approve,
- recover,
- prepare,
- follow_up,
- collect_payment,
- schedule,
- communicate,
- price,
- cost,
- staff,
- shop,
- cook,
- document,
- review,
- configure,
- audit,
- learn,
- sell,
- delegate,
- verify.

Each intent should map to:

- allowed roles,
- likely entities,
- priority weights,
- action templates,
- proof needs,
- recovery needs,
- suppression rules.

### Refresh Topology

The Rail should refresh through a layered topology:

- route change: immediate context refresh,
- entity mutation: targeted entity refresh,
- server action completion: optimistic reconcile then authoritative refresh,
- API/webhook event: adapter-specific refresh,
- scheduled tick: deadline/escalation refresh,
- visibility change: refetch stale high-priority sources,
- role/session change: full role-safe rebuild,
- X-Ray/Wiring Audit update: proof/risk refresh,
- offline/online change: cached-safe rebuild then network reconcile.

Refresh budgets:

- route context target: under 250ms from cached/generated data,
- high-priority source refresh target: under 2s where network is required,
- full Rail assembly target: under 5s with partial results allowed,
- stale label required when source freshness exceeds contract,
- critical source failure must surface as a recovery/proof item.

### Safe Action Execution Contract

Rail actions need a shared execution contract so inline commands are safe.

Every command must declare:

- action id,
- owning domain,
- required role,
- required permission,
- required confirmation,
- destructive/sensitive flag,
- server action or route target,
- idempotency key strategy,
- optimistic update policy,
- rollback policy,
- audit log event,
- success state,
- failure state,
- retry policy,
- undo availability,
- proof update.

Rules:

- destructive actions require confirmation and proof.
- client-visible actions require safe preview when possible.
- state-changing Remy-prepared actions require approval.
- failed actions must return to Recovery with context.
- actions must not be rendered if the server-side guard would reject the role.

### Persistence Contract

The Rail needs persistent state, but not everything should become permanent.

Persist:

- dismissals,
- snoozes,
- mutes,
- pins,
- seen/unseen,
- changed-since-last-seen,
- user density preference,
- role-safe rail preferences,
- active thread state,
- acknowledgement of critical items,
- manual overrides.

Do not persist:

- stale predictions as facts,
- temporary low-confidence guesses,
- unauthorized suppressed item details,
- Remy draft text as canonical state unless approved,
- simulation outputs as state changes.

Persistence must be tenant-scoped and role-safe.

### Dedupe And Collision Rules

Many sources will report the same underlying issue. The Rail must collapse duplicates.

Duplicate examples:

- overdue invoice from finance and event readiness,
- client waiting from inbox and client intelligence,
- menu margin risk from PIE and menu intelligence,
- route mismatch from Page X-Ray and Access Surface Map,
- failed automation from automation logs and dashboard alert.

Dedupe keys should include:

- entity type,
- entity id,
- risk category,
- action path,
- proof path,
- source priority,
- time window.

Collision rules:

- keep the strongest severity,
- preserve all proof sources,
- merge commands,
- show one user-facing item,
- expose source list in proof,
- avoid double-counting in metrics.

### Ranking Explainability

Every top Rail decision must be explainable.

For Global Now, Now, and Watch items, store:

- input candidates,
- score components,
- winning reason,
- runner-up reason,
- suppression reasons,
- role filter result,
- freshness result,
- confidence result,
- escalation result,
- final zone.

Admin/developer mode should show this as "Why this is here."

### Security And Privacy Invariants

The Rail is powerful enough to leak sensitive context if poorly implemented. Treat it as a security surface.

Required invariants:

- server-side auth remains mandatory,
- tenant scoping remains mandatory,
- UI hiding is never treated as authorization,
- role filters must run before labels/counts/details are assembled,
- unauthorized users must not see hints that reveal restricted records,
- proof links must be role-safe,
- suppressed sensitive items must not include sensitive text in client payloads,
- admin/security findings must not leak into public/client/staff rails,
- logs must avoid PII unless explicitly protected,
- Rail cache keys must include tenant and role.

### Accessibility And Interaction Rules

The Rail must be usable under pressure.

Requirements:

- keyboard navigation for all commands,
- visible focus states,
- reduced-motion support,
- screen-reader labels for urgency, freshness, and action state,
- no auto-moving critical items,
- no auto-moving buttons,
- no text overflow in compact zones,
- hit targets large enough on mobile,
- grouped commands with clear names,
- confirmation dialogs for destructive/sensitive actions,
- no color-only severity communication.

### Performance Guardrails

The Rail should not slow down ChefFlow.

Rules:

- generated route/access matrix should be precomputed or cached,
- source adapters should run in bounded parallel groups,
- slow adapters should degrade gracefully,
- critical cached items may render before warm sources finish,
- heavy proof details load on expansion,
- no source adapter should block the full Rail indefinitely,
- route changes should not trigger full-codebase scans in the browser,
- Page X-Ray and Wiring Audit outputs feed runtime state through artifacts/summary data, not live exhaustive scans.

### Versioning And Migration

Because existing rail systems already exist, migration must be explicit.

Versioned artifacts:

- Access Surface Map schema version,
- Universal Rail Contract schema version,
- God Mode Rail Item schema version,
- Page X-Ray access-surface schema version,
- Wiring Audit access-surface proof schema version.

Migration rules:

- keep `UrlCapability*` aliases until all call sites migrate,
- keep old rail item renderers until parity proof exists,
- add compatibility tests before deleting old exports,
- generate deprecation warnings in tests/docs, not user UI,
- migrate one role/route family at a time,
- do not delete existing rail registries until generated+curated parity is proven.

### Admin Control Plane

Admins and developers need a control surface for Rail health.

Admin capabilities:

- view route/access matrix,
- view missing contracts,
- view unknown surfaces,
- view hidden/excluded surfaces,
- view policy mismatches,
- view critical/high unsurfaced items,
- inspect Rail assembly trace,
- inspect role filtering,
- inspect adapter health,
- inspect stale sources,
- inspect Page X-Ray freshness,
- inspect Wiring Audit proof,
- force refresh,
- export proof pack,
- open source files/reports where appropriate.

This control plane should be admin-only and runtime-guarded.

### Quality Gates

Add build quality gates:

- no unknown changed route,
- no unknown changed action,
- no unclassified changed API route,
- no critical/high unsurfaced signal,
- no missing admin runtime guard,
- no tenant-scope unknown for protected tenant data,
- no visible Rail item without role-safe proof,
- no Global Now without explanation,
- no adapter without freshness/confidence,
- no prediction without proof,
- no simulation that mutates before confirmation,
- no critical auto-motion or layout shift.

### Regression Firewall

The Rail should prevent product regressions and detect its own.

Regression checks:

- route added without Access Surface Map record,
- route added without Rail contract or exclusion,
- nav item added without route policy alignment,
- server action added without guard,
- API route added without auth classification,
- Page X-Ray finding added but not surfaced,
- Wiring Audit proof missing for changed route,
- existing Global Now scenario ranking changed unexpectedly,
- existing critical item no longer visible,
- role-safe suppression regressed,
- mobile critical zone overflowed or disappeared.

### Documentation And Agent Instructions

Update supporting docs and skills when this build fires:

- Page X-Ray skill,
- Wiring Audit skill,
- builder/finish-gate references,
- route/access audit prompt if needed,
- rail architecture docs,
- Access Surface Map schema docs,
- admin control plane docs,
- proof pack template,
- queue item closeout checklist.

Agent instructions should say:

- every route/action/signal change must consider the Rail contract,
- Page X-Ray must include access-surface and God Mode questions,
- Wiring Audit must fail missing access-surface proof,
- critical/high items must be surfaced or explicitly suppressed,
- Remy cannot own canonical priority/access state.

### Open Product Decisions

These are decisions to make before final build execution:

- Which route family becomes the first God Mode pilot: dashboard, clients, events, or menus?
- Which roles are in MVP: chef/admin only, or chef/client/admin?
- Where should persistent Rail memory live?
- Which existing rail implementation becomes the primary renderer?
- How much of the admin control plane ships in the first pass?
- Which Page X-Ray schema migration strategy is preferred?
- What is the minimum acceptable Global Now accuracy threshold in QA?
- Which predictive signals are allowed in v1?
- Which simulations are allowed in v1?

## Build Plan

### Phase 1: Access Surface Scanner

- Add scanner for `app/**/page.tsx` and `app/**/route.ts`.
- Normalize route groups out of public URL patterns.
- Extract dynamic params.
- Classify page vs API/route-handler.
- Generate initial route matrix.

### Phase 2: Policy Reconciler

- Compare discovered routes to `lib/auth/route-policy.ts`.
- Identify route-only, policy-only, conflict, unknown, and aligned states.
- Detect admin runtime guard requirements.
- Detect API auth requirements.

### Phase 3: Reachability Reconciler

- Scan nav config, command palette, `Link href`, `router.push`, `redirect`.
- Mark primary-nav, secondary-nav, command, linked, deep-link, hidden, unknown.
- Flag hidden routes without exclusion reason.

### Phase 4: Universal Rail Contract Layer

- Add canonical Rail contract types.
- Merge generated Access Surface records with curated Rail contracts.
- Add priority engine and Rail zone assignment.
- Add missing surface detection.

### Phase 5: God Mode Intelligence Layer

- Add situation awareness model.
- Add command-state model.
- Add predictive signal contract.
- Add simulation prompt contract.
- Add memory state for seen/dismissed/snoozed/pinned/changed items.
- Add active Rail thread model.
- Add escalation and suppression rules.
- Add Global Now Thread resolver.

### Phase 6: Platform Hardening Layer

- Add entity graph mapping for Rail context.
- Add canonical intent model.
- Add refresh topology and source adapter budgets.
- Add safe action execution contract.
- Add persistence contract for memory/preferences.
- Add dedupe and collision rules.
- Add ranking explainability traces.
- Add security/privacy invariants for Rail payloads and cache keys.
- Add performance guardrails and degraded-source behavior.
- Add schema versioning and migration rules.

### Phase 7: Rail UI Upgrade

- Upgrade URL Capability Rail into Access Surface Rail.
- Show Now, Watch, Context, Actions, Recovery, Proof, More.
- Show Global Now Thread.
- Show why-now copy for primary items.
- Show command affordances without overcrowding.
- Show prediction, simulation, memory, escalation, and proof states when relevant.
- Preserve layout stability.
- Add role-safe rendering.
- Add mobile bottom-sheet behavior if needed.

### Phase 8: Admin Control Plane

- Add admin-only surface for route/access matrix, missing contracts, unknown surfaces, policy mismatches, adapter health, assembly traces, stale sources, Page X-Ray freshness, and Wiring Audit proof.
- Runtime-gate the admin control plane with `requireAdmin()`.
- Add force refresh/export proof pack actions with audit logging.

### Phase 9: Page X-Ray Update

- Update skill instructions and schema.
- Add access-surface modes.
- Add access-surface questions.
- Add God Mode questions for situation awareness, commandability, prediction, simulation, memory, proof, continuity, escalation, and suppression.
- Include Rail surfacing contract in scan output.

### Phase 10: Wiring Audit Update

- Add access-surface proof gate.
- Require Page X-Ray access-surface check for affected routes.
- Fail on missing critical/high Rail surfacing.
- Fail when Global Now Thread is missing or cannot explain why it outranks alternatives.
- Fail when a critical item has no action, recovery, proof, or explicit blocking reason.
- Fail on platform hardening quality gate violations.

### Phase 11: Tests and Proof

- Unit tests for route normalization.
- Unit tests for dynamic route matching.
- Unit tests for policy reconciliation.
- Unit tests for risk severity classification.
- Unit tests for Rail priority/zone assignment.
- Unit tests for Global Now Thread ranking.
- Unit tests for escalation and suppression.
- Unit tests for seen/dismissed/snoozed/pinned memory behavior.
- Unit tests for command-state classification.
- Unit tests for source adapter normalization.
- Unit tests for dedupe/collision behavior.
- Unit tests for safe action execution metadata.
- Unit tests for role-safe cache/payload filtering.
- Unit tests for degraded-source behavior.
- Unit tests for role filtering.
- Compatibility tests for existing `UrlCapability*` APIs.
- Smoke test canonical app route at `http://localhost:3100`.
- UI proof for rail rendering on desktop and mobile.
- Wiring Audit proof pack.

## Acceptance Criteria

- Every `app/**/page.tsx` appears in the Access Surface Map.
- Every `app/**/route.ts` appears in the Access Surface Map.
- Route groups normalize correctly.
- Dynamic route params are captured.
- Every route has a role classification or an `unknown` finding.
- Every policy-only path without a route is reported.
- Every route-only path without policy coverage is reported.
- Existing URL capability contracts are included as curated overlays.
- Every changed route has a Rail contract or documented exclusion.
- Every `critical` signal appears in `now` or `watch`.
- Every `high` signal appears in `now`, `watch`, or `actions`.
- Every visible signal has an action, proof link, recovery path, or read-only reason.
- Every suppressed signal has a suppression rule.
- Every excluded surface has an exclusion reason.
- Role-gated signals do not appear for unauthorized users.
- Admin routes report missing `requireAdmin()` as critical.
- API/server action auth unknowns are reported.
- Tenant-scope risks are reported where protected tenant data is involved.
- Page X-Ray emits `access_surface` data.
- Wiring Audit requires access-surface verification.
- The Rail refreshes on route/context changes.
- The Rail displays freshness/confidence where data may be stale.
- The Rail can derive current operating mode for the active access point.
- The Rail can produce a Global Now Thread with reason, action, proof, freshness, confidence, and ignore consequence.
- The Global Now Thread explains why it outranks other candidates.
- Every primary Rail item has `whyNow` context.
- Every actionable Rail item exposes at least one safe command.
- Every non-actionable Rail item declares a valid command blocking/read-only state.
- Predictive items include horizon, reason, confidence, freshness, and proof path.
- Simulation prompts never mutate canonical state before confirmation.
- Seen, dismissed, snoozed, pinned, changed-since-last-seen, and repeated-warning states are tracked for Rail items that recur.
- Ignored critical items escalate according to documented rules.
- Suppressed items declare reason, invalidation condition, and recovery path.
- Active Rail thread continuity works across dashboard -> client -> event -> menu style navigation.
- Critical items can require acknowledgement or recovery before being demoted.
- Entity graph context can connect dashboard, client, event, menu, payment, communication, and proof items.
- Intent classification exists for primary Rail commands.
- Refresh topology supports route change, entity mutation, scheduled escalation, role/session change, and proof update.
- Safe action metadata exists for every state-changing command.
- Dedupe collapses duplicate risks while preserving all proof sources.
- Ranking explainability is available for Global Now and Watch items.
- Role-safe filtering occurs before sensitive labels/details are assembled.
- Rail cache keys include tenant and role where cached.
- Adapter failures degrade gracefully and surface source-specific recovery/proof.
- Admin-only control plane exposes matrix health, missing contracts, unknown surfaces, adapter health, and assembly traces.
- Schema versions are declared for Access Surface Map, Universal Rail Contract, God Mode Rail Item, Page X-Ray access-surface data, and Wiring Audit proof.
- Quality gates catch unknown changed routes/actions/API routes, missing Rail contracts, and unsurfaced critical/high items.
- The running app shows the rail without layout regression.
- Reports are generated at `artifacts/access-surface/route-access-matrix.json` and `.md`.

## Non-Goals For First Build

- Enumerating every database-generated concrete URL.
- Replacing all auth logic.
- Automatically fixing all security findings.
- Auto-queueing Page X-Ray opportunities without explicit user request.
- Rebuilding the entire navigation system.
- Letting AI own canonical priority or access classifications.
- Showing every item visibly at once.
- Making Remy the source of truth for predictions or simulations.
- Allowing continuous motion/auto-scroll for critical warnings or primary actions.
- Building every open product decision in the first pass before choosing a pilot route family.
- Broad architecture cleanup outside the Rail/access-surface contract.

## Queue-Ready Build Title

Build the Universal Rail Wiring Contract, Access Surface Map, and God Mode Rail layer so every ChefFlow route, action, entity, signal, workflow, risk, proof artifact, and recovery path is wired to the Rail, prioritized by context, role-safe, always refreshing, predictive, actionable, proof-backed, and explicitly excluded only when justified.

## Queue-Ready Goal

Create a generated Access Surface Map, upgrade URL Capability Rail into Access Surface Rail, introduce Universal Rail Wiring Contracts, Rail Surfacing Contracts, Global Now Thread, situation awareness, commandability, prediction, simulation, memory, escalation, suppression, proof, and continuity layers, and update Page X-Ray/Wiring Audit so future builds prove that every important codebase capability is surfaced, actionable, recoverable, provable, or intentionally excluded.

## Queue-Ready Verification

- Run focused unit tests for access-surface scanning, policy reconciliation, priority scoring, Global Now Thread ranking, command-state classification, memory, escalation, suppression, role filtering, and legacy URL capability compatibility.
- Run Page X-Ray access-surface check for affected routes.
- Run Wiring Audit with access-surface proof.
- Verify canonical app at `http://localhost:3100`.
- Capture desktop and mobile rail proof for Global Now, Watch, Actions, Recovery, Proof, More, and mobile bottom-sheet behavior.
- Generate route access matrix JSON and Markdown.
- Keep any incomplete or unproven item out of `done`.
