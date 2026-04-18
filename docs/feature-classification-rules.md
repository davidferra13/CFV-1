# Feature Classification Rules

## Purpose

This document defines the deterministic classifier that the feature inventory plugs into.

The classifier must answer four questions for every feature:

1. What is the current surface?
2. What is the correct surface?
3. Which roles should use it?
4. What is the exposure level?

## Type Contract

The canonical shared types live in `types/system.ts`. The classifier produces values that conform to these types:

```ts
type Surface = 'public' | 'chef' | 'client' | 'admin' | 'partner'
type Role = 'chef' | 'staff' | 'client' | 'partner' | 'admin'
type Exposure = 'visible' | 'hidden' | 'gated' | 'internal'

type FeaturePlacement = {
  featureId: string
  currentSurface?: Surface
  correctSurface: Surface
  roles: Role[]
  exposure: Exposure
  notes?: string
}
```

- `Surface`: where an interaction belongs architecturally.
- `Role`: who is allowed to use it. Not every role that can indirectly observe a side effect.
- `Exposure`: how reachable the feature is within its owning surface (`visible` = normal nav, `gated` = token/module/invite, `hidden` = deep-link only, `internal` = platform-only).
- `FeaturePlacement`: the canonical output of classification.

## Classification Inputs

Each inventory item should collect these signals when possible:

- route path
- route group or file location
- layout shell or portal marker
- auth guard used by page or server action
- primary data owners and tables touched
- primary actor and business outcome
- navigation placement
- token or invite requirement
- cross-tenant or tenant-scoped behavior
- preview, support, or override behavior

## Surface Definitions For Classification

### `public`

Use when the feature is for anonymous discovery, intake, marketing, claim, or external delivery.

### `chef`

Use when the feature is part of tenant operations. Staff features also resolve to `chef` because staff is a role lane inside the chef surface.

### `client`

Use when the feature is for ongoing client self-service, approvals, payments, profile control, or client communication.

### `partner`

Use when the feature is for external collaborators managing their own relationship context.

### `admin`

Use when the feature is internal, cross-tenant, or able to override platform state.

## Rule Set

### 1. Determine `currentSurface`

Use the implementation location first.

### Route and folder rules

| Signal                                                                                              | `currentSurface` |
| --------------------------------------------------------------------------------------------------- | ---------------- |
| `app/(public)` or route in public unauthenticated policy                                            | `public`         |
| `app/(chef)`                                                                                        | `chef`           |
| `app/(staff)` or `/staff-*` route                                                                   | `chef`           |
| `app/(client)` or `/my-*` route                                                                     | `client`         |
| `app/(partner)/partner/**` or `/partner/**` route                                                   | `partner`        |
| `app/(admin)` or `/admin/**` route                                                                  | `admin`          |
| top-level public token routes such as `/client/[token]`, `/intake/[token]`, `/book/**`, `/embed/**` | `public`         |

### Shell and layout rules

Use these when route structure is ambiguous:

- `data-cf-portal="chef"` -> `chef`
- `data-cf-portal="client"` -> `client`
- `data-cf-portal="partner"` -> `partner`
- `data-cf-portal="admin"` -> `admin`
- public layout with anonymous header/footer and no auth guard -> `public`

### 2. Determine candidate roles

Start from auth enforcement.

| Signal                                   | Roles         |
| ---------------------------------------- | ------------- |
| `requireChef()`                          | `['chef']`    |
| `requireStaff()`                         | `['staff']`   |
| `requireClient()`                        | `['client']`  |
| `requirePartner()`                       | `['partner']` |
| `requireAdmin()` or platform-admin guard | `['admin']`   |

### No-auth routes

No auth does not mean no role.

Use feature behavior:

- proposal acceptance, payment, survey, review, household, client portal -> `['client']`
- partner report, partner claim, partner location contribution -> `['partner']`
- staff briefing, staff event packet, staff station handoff -> `['staff']`
- marketing, discovery, public chef profile, anonymous intake -> `[]` until a role is attached downstream

### Shared capabilities

If the same business capability genuinely spans roles, split the feature into role-specific placements unless the UI and permissions are materially identical.

Examples:

- chef chat view and client chat view should be separate placements
- chef quote drafting and client quote acceptance should be separate placements
- chef partner management and partner self-service should be separate placements

### 3. Determine `correctSurface`

This is the architectural owner. Use the first matching rule below.

### Rule 1: Cross-tenant beats everything

If the feature can inspect, moderate, reconcile, flag, or override more than one tenant, `correctSurface = 'admin'`.

Signals:

- platform admin guard
- platform tables or support-only actions
- feature flags
- global observability
- cross-tenant analytics
- account suspension or override tools

### Rule 2: Staff resolves into chef

If the primary actor is staff or the feature exists for staff execution inside a tenant, `correctSurface = 'chef'` and roles include `staff`.

Signals:

- staff schedule, tasks, station, time, event briefing
- tenant-scoped execution actions

### Rule 3: Client self-service resolves into client

If the primary actor is client and the feature is about approval, payment, event visibility, household data, or client messaging, `correctSurface = 'client'`.

Signals:

- quotes to review
- menu approvals
- contracts to sign
- invoices or payment plans
- client profile, rewards, surveys

### Rule 4: Partner self-service resolves into partner

If the primary actor is partner and the feature is for partner-facing performance, location, attribution, or profile work, `correctSurface = 'partner'`.

Signals:

- partner dashboard
- location profile
- partner attribution report
- partner claim and onboarding

### Rule 5: Chef operations resolve into chef

If the feature exists so the tenant can run the business, `correctSurface = 'chef'`.

Signals:

- inquiries, events, menus, recipes, inventory, prep, finance, staff management
- chef-side partner management
- chef-side client CRM
- chef settings, modules, AI controls

### Rule 6: True public entry resolves into public

If the feature is discovery, anonymous intake, embed, or a public artifact that is intentionally external and not part of a persistent signed-in workspace, `correctSurface = 'public'`.

Signals:

- marketing and compare pages
- directory and discovery
- contact and booking forms
- anonymous submit and unsubscribe flows
- public chef profile

### 4. Determine `exposure`

### `visible`

Use when the feature is intentionally navigable in its owning surface.

Signals:

- present in primary nav
- linked from normal page flows
- standard portal page

### `gated`

Use when the feature is user-facing but conditionally reachable.

Signals:

- token or invite required
- feature module or billing gate
- claim flow
- authenticated but not in everyday navigation

### `hidden`

Use when the feature exists but is intentionally tucked away.

Signals:

- deep-link only
- preview mode
- beta-only or feature-flag-only UI
- support or QA page reachable by URL but not normal nav

### `internal`

Use when the feature is only for internal platform use.

Signals:

- admin-only
- observability or system health
- moderation or support intervention
- cross-tenant operations

## Mapping Heuristics

### A. Route structure heuristics

Apply in this order:

1. Identify route group or prefix.
2. Normalize `(staff)` into `chef`.
3. Mark top-level token routes as `currentSurface = 'public'`.
4. Let auth and business outcome override route delivery when computing `correctSurface`.

### B. Component and shell heuristics

Use when routes are mixed or legacy:

- shared chef nav, chef main content, chef portal markers -> chef candidate
- client nav or client portal markers -> client candidate
- partner nav or partner portal markers -> partner candidate
- admin-only nav items, admin presence tools, admin layout -> admin candidate
- public header/footer or anonymous wrappers -> public candidate

### C. Data ownership heuristics

Ask who owns the action result.

| Data ownership pattern                                                          | Correct surface |
| ------------------------------------------------------------------------------- | --------------- |
| anonymous lead, public directory, campaign landing                              | `public`        |
| tenant configuration, event execution, pricing, prep, finance, staff management | `chef`          |
| customer approval, payment, profile, household, survey                          | `client`        |
| referral performance, partner location, partner claim/profile                   | `partner`       |
| cross-tenant review, moderation, flags, reconciliation, health                  | `admin`         |

Important:

- Shared tables do not imply a shared owning surface.
- Use actor + business outcome, not just schema names.

### D. Preview rules

Preview features belong to the actor who is previewing, not the audience being previewed.

Examples:

- chef preview of client portal -> `chef`
- admin preview of chef experience -> `admin`

### E. Token rules

Token delivery does not automatically make a feature public.

Examples:

- `/client/[token]`: current public, correct client
- `/partner-report/[token]`: current public, correct partner
- `/staff-portal/[id]`: current public, correct chef with role `staff`

## Misplacement Detection Rules

Flag a feature as misplaced when any of these are true.

### 1. Admin-in-chef leak

The feature lives in chef routes or shared chef navigation, but it:

- acts across tenants
- exposes platform health
- manages flags or support overrides
- reconciles global systems
- exists only for internal operations

Result:

- `currentSurface = 'chef'`
- `correctSurface = 'admin'`

### 2. Public overflow

The feature is delivered from a public route, but the job is part of an ongoing client, partner, or staff workspace.

Result:

- `currentSurface = 'public'`
- `correctSurface = target surface`

### 3. Staff escalation

The feature is reachable by staff, but it edits owner finance, tenant settings, pricing policy, or unrestricted client records.

Result:

- role mismatch
- likely split required between chef setup and staff execution

### 4. Partner confusion

The feature is labeled partner-related, but the primary actor is actually chef managing partner records.

Result:

- keep chef ownership for management pages
- reserve partner ownership for self-service and partner-facing reporting

### 5. Client confusion

The feature is exposed as client-facing, but it reveals internal cost, staffing, or operator-only notes.

Result:

- move or split into chef-visible internal section and client-visible external section

## Duplicate Logic Detection Rules

Flag duplicate logic when the same capability appears in more than one surface without a clear owner split.

Signals:

- same tables plus same action semantics across multiple route trees
- same server action powering both an admin and chef UI without a role-specific wrapper
- same feature delivered through token flow and authenticated portal with no explicit surface ownership note
- same business object rendered in two surfaces with identical controls instead of actor-specific controls

## Split Detection Rules

A feature should be split when one unit mixes more than one of these concerns:

- tenant operation and platform oversight
- chef management and client approval
- chef management and partner self-service
- chef authority and staff execution
- public intake and authenticated workspace continuation

Typical split pattern:

- operator side stays in `chef`
- customer side moves to `client`
- collaborator side moves to `partner`
- internal oversight moves to `admin`
- anonymous entry stays in `public`

## Classification Output Contract

Every inventory row should be transformable into:

```ts
type FeaturePlacement = {
  featureId: string
  currentSurface?: Surface
  correctSurface: Surface
  roles: Role[]
  exposure: 'visible' | 'hidden' | 'gated' | 'internal'
  notes?: string
}
```

## Recommended Notes Format

Use `notes` to record why a placement differs from its route location.

Recommended phrases:

- `public delivery for client-owned workflow`
- `staff execution inside chef surface`
- `admin capability leaking through chef shell`
- `chef-side partner CRM, not partner self-service`
- `preview route owned by source actor`
- `split required: operator setup and external approval are mixed`

## Worked Examples

Each example shows the full classification for a specific feature pattern.

### 1. Authenticated chef page (e.g. `/events/[id]`)

```ts
{
  featureId: 'chef.event-detail',
  currentSurface: 'chef',
  correctSurface: 'chef',
  roles: ['chef'],
  exposure: 'visible',
}
```

Route is `app/(chef)/events/[id]`, auth guard is `requireChef()`, primary actor is chef, business outcome is event management. Straightforward.

### 2. Authenticated client page (e.g. `/my-events`)

```ts
{
  featureId: 'client.my-events',
  currentSurface: 'client',
  correctSurface: 'client',
  roles: ['client'],
  exposure: 'visible',
}
```

Route is `app/(client)/my-events`, auth guard is `requireClient()`, primary actor is client viewing their bookings.

### 3. Authenticated partner page (e.g. `/partner/dashboard`)

```ts
{
  featureId: 'partner.dashboard',
  currentSurface: 'partner',
  correctSurface: 'partner',
  roles: ['partner'],
  exposure: 'visible',
}
```

Route is `app/(partner)/partner/dashboard`, auth guard is `requirePartner()`, primary actor is partner viewing referral performance.

### 4. Staff portal page (e.g. `/staff-portal/[id]`)

```ts
{
  featureId: 'staff.event-briefing.link',
  currentSurface: 'public',
  correctSurface: 'chef',
  roles: ['staff'],
  exposure: 'gated',
  notes: 'staff execution inside chef surface, delivered via public token route',
}
```

Route is `app/(public)/staff-portal/[id]` (public delivery), but the feature is staff operational briefing owned by the chef tenant. Token gated.

### 5. Public client token page (e.g. `/client/[token]`)

```ts
{
  featureId: 'client.portal.token-access',
  currentSurface: 'public',
  correctSurface: 'client',
  roles: ['client'],
  exposure: 'gated',
  notes: 'public delivery for client-owned workflow',
}
```

Route is `app/client/[token]` (public, unauthenticated), but the feature is client portal access. Token gated delivery does not change ownership.

### 6. Public staff briefing link

```ts
{
  featureId: 'staff.event-packet',
  currentSurface: 'public',
  correctSurface: 'chef',
  roles: ['staff'],
  exposure: 'gated',
  notes: 'chef-generated staff briefing delivered via public link',
}
```

Chef generates a link that staff opens. Public delivery, chef ownership, staff role.

### 7. Public partner report (e.g. `/partner-report/[token]`)

```ts
{
  featureId: 'partner.performance-report',
  currentSurface: 'public',
  correctSurface: 'partner',
  roles: ['partner'],
  exposure: 'gated',
  notes: 'public delivery for partner-owned reporting workflow',
}
```

### 8. Chef-side client preview (e.g. `/settings/client-preview`)

```ts
{
  featureId: 'chef.client-preview',
  currentSurface: 'chef',
  correctSurface: 'chef',
  roles: ['chef'],
  exposure: 'visible',
  notes: 'preview route owned by source actor (chef), not the audience (client)',
}
```

Chef is the actor. Chef is previewing what client would see. Ownership stays with the actor, not the audience.

### 9. Admin tool rendered through chef shell (e.g. admin pages in chef nav)

```ts
{
  featureId: 'admin.feature-flags',
  currentSurface: 'chef',
  correctSurface: 'admin',
  roles: ['admin'],
  exposure: 'internal',
  notes: 'admin capability leaking through chef shell; misplaced',
}
```

Currently lives in chef navigation with `adminOnly: true` gating. The feature is cross-tenant or platform-level, so `correctSurface` is admin. This is a misplacement.

### 10. Public directory / discovery

```ts
{
  featureId: 'public.discovery.directory',
  currentSurface: 'public',
  correctSurface: 'public',
  roles: [],
  exposure: 'visible',
}
```

### 11. Chef-side partner management

```ts
{
  featureId: 'chef.partner-management',
  currentSurface: 'chef',
  correctSurface: 'chef',
  roles: ['chef'],
  exposure: 'visible',
  notes: 'chef-side partner CRM, not partner self-service',
}
```

## Companion Workflow: How the Inventory Agent Uses This Classifier

When the inventory agent discovers a feature, apply this workflow:

1. **Collect signals**: route path, auth guard, layout shell, data tables, actor, business outcome.
2. **Determine `currentSurface`**: use route/folder rules (Section 1), then shell/layout rules if ambiguous.
3. **Determine candidate roles**: use auth guard mapping (Section 2). For no-auth routes, use behavior signals.
4. **Determine `correctSurface`**: apply Rules 1-6 in precedence order (Section 3). Use the first matching rule.
5. **Determine `exposure`**: use navigability, gating, and internal-only signals (Section 4).
6. **Check for misplacement**: compare `currentSurface` vs `correctSurface`. If different, flag and record why.
7. **Check for duplication**: scan for same capability in multiple surfaces without clear owner split.
8. **Check for split need**: does one feature mix operator + customer + oversight concerns? Split if so.
9. **Record the `FeaturePlacement`**: populate all fields. Use `notes` for any non-obvious classification reasoning.

The inventory agent should not invent policy. If a feature does not clearly match any rule, record it with `notes: 'unclassifiable; needs manual review'` and move on.

## Lifecycle Splitting

One named business workflow often requires multiple `FeaturePlacement` records because ownership shifts across surfaces as the workflow progresses.

### Example: Inquiry -> Quote -> Booking

| Stage                 | Feature ID                | Surface  | Roles        | Notes                            |
| --------------------- | ------------------------- | -------- | ------------ | -------------------------------- |
| Public inquiry form   | `public.inquiry-form`     | `public` | `[]`         | Anonymous intake                 |
| Chef receives inquiry | `chef.inquiry-triage`     | `chef`   | `['chef']`   | Operator triages and responds    |
| Chef drafts quote     | `chef.quote-drafting`     | `chef`   | `['chef']`   | Internal pricing and proposal    |
| Client reviews quote  | `client.quote-approval`   | `client` | `['client']` | May be delivered via token       |
| Client pays deposit   | `client.payment`          | `client` | `['client']` | Payment and booking confirmation |
| Chef confirms booking | `chef.event-confirmation` | `chef`   | `['chef']`   | Event enters confirmed state     |

### Example: Partner referral attribution

| Stage                  | Feature ID                   | Surface   | Roles         | Notes                      |
| ---------------------- | ---------------------------- | --------- | ------------- | -------------------------- |
| Chef creates partner   | `chef.partner-management`    | `chef`    | `['chef']`    | Chef-side CRM              |
| Partner claims profile | `partner.claim-flow`         | `partner` | `['partner']` | Gated claim from invite    |
| Partner views report   | `partner.performance-report` | `partner` | `['partner']` | May be delivered via token |

### Rules for lifecycle splitting

1. Each actor-owned stage gets its own `FeaturePlacement`.
2. If two stages share the same actor and surface, they can be one placement.
3. Token delivery shifts `currentSurface` but not `correctSurface`.
4. Staff participation in chef-owned stages does not create a separate placement; add `'staff'` to the `roles` array of the chef placement.
5. Admin observation of any stage is a separate admin placement only if a distinct admin UI exists for it. Passive DB access does not create a placement.
