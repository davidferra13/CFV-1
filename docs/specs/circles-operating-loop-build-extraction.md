# Spec: Circles As The Shared Operating Loop

> **Status:** draft
> **Priority:** P0
> **Depends on:** `docs/domain/circles.md`, `docs/architecture/circles-current-state-inventory.md`, `docs/specs/chef-operating-loop-external-memory.md`, `docs/specs/truth-net-evidence-labels.md`
> **Source research:** `docs/research/2026-05-15-chefflow-operating-loop-verbatim-research.md`
> **Estimated complexity:** large, multi-wave
> **Implementation rule:** queue/firing required before app-code changes.

## Raw Signal

The developer clarified that users live in portals and Circles. If a user is not doing private/canonical work in a role portal, the work is happening inside a Circle of some sort.

The May 15 research frames human systems as living loops: sensing, communication, boundaries, feedback, repair, memory, handoffs, support networks, passive capture, evidence labeling, waiting states, and reducing friction between intention and action.

The product conclusion is that Circles should not be treated as a dinner-specific chat feature. Circles are ChefFlow's shared operating loop for relationships and multi-party work.

## Product Thesis

ChefFlow has two places where users live:

- **Portal:** private cockpit for a role.
- **Circle:** shared operating space for relationships, coordination, context, memory, and handoffs.

Anything private or canonical belongs in a portal. Anything relational or shared belongs in a Circle or is projected into one.

## Product Promise

Circles should make shared work restartable, visible, and trustworthy.

A participant should never have to reconstruct the thread from memory, search across email/texts/notes, or guess whether something is confirmed. A Circle should show what happened, what changed, what is waiting, who owns the next action, and which facts are confirmed versus claimed, inferred, stale, unknown, or disputed.

The highest-value outcome is not "more chat." It is less operational friction between intention and action.

## What This Does

Elevates Circles from a Dinner Circle/Hub feature into a first-class ChefFlow domain:

- defines Circle type taxonomy
- defines Circle ownership modes
- defines role-specific creation rules
- defines linked-object access rules
- separates Circle coordination from canonical source-of-truth ownership
- makes `/circles` the command center for shared work
- gives every Circle activity/status/memory/handoff/proof concepts
- maps existing Dinner Circle and Crew Circle infrastructure into the universal model

## User Roles And Jobs

| Role    | Primary job inside Circles                                      | Must be able to do                                                                                                                                  | Must not be able to do                                                                                                 |
| ------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Chef    | Control shared work without holding every thread in memory.     | Create/manage tenant Circles, inspect status, see next handoffs, invite participants, view chef-safe linked records, archive/restore where allowed. | Leak tenant data across clients, expose internal notes/payment/risk to guests, treat Circle claims as canonical facts. |
| Client  | Coordinate their service relationship with less email friction. | See client-safe status, menu, decisions, requests, messages, event facts, and their own profile/household context.                                  | See other clients, chef-only notes, lead score, internal risk, unrelated ledger data.                                  |
| Guest   | Participate in an event safely and with low friction.           | Join by token, see guest-safe event/menu/status, RSVP, share dietary info, message where allowed.                                                   | See payment/deposit state, private host/chef notes, other Circles, unrelated household/private CRM data.               |
| Staff   | Execute assigned operational work without relayed texts.        | See assigned Crew Circle, prep-safe event facts, messages, handoffs, schedule/proof where allowed.                                                  | See client financials, unrelated client CRM notes, other tenant data, guest-private details beyond safety need.        |
| Vendor  | Coordinate scoped sourcing/order work.                          | See vendor-safe order/sourcing context, messages, files/proof, delivery/pickup handoffs when policy enables it.                                     | See client private data, chef financial internals, other vendor orders.                                                |
| Partner | Coordinate referral/venue/planner relationship work.            | See partner-safe referral/event context, messages, follow-ups when policy enables it.                                                               | See unrelated clients, full event ops, chef financial internals.                                                       |
| Admin   | Govern and diagnose platform Circle behavior.                   | Inspect/moderate through runtime-gated admin surfaces.                                                                                              | Rely on middleware-only admin protection or bypass audit expectations.                                                 |

## Role Journey Requirements

### Chef

1. Opens `/circles`.
2. Sees shared work grouped by attention, waiting, active, event-linked, crew, client/community, and archived where applicable.
3. Can tell what changed since last read.
4. Opens a Circle and sees status, handoffs, members, linked records, messages, memory/proof, and role-specific actions.
5. Creates permitted Circle types or launches a creation request from the correct canonical context.
6. Archives or transfers ownership only where policy allows.

### Client Or Host

1. Enters from client portal or Circle invitation.
2. Sees relationship/event context that is safe for them.
3. Answers open questions, confirms details, approves/rejects requests, and messages.
4. Claims are labeled as claims until the owning domain updates canonical state.
5. Never sees chef-only operational or financial internals.

### Guest

1. Enters through `/hub/g/[groupToken]` or an invite link.
2. Joins with low friction and gets profile/member identity through token flow.
3. Sees only event/guest-safe status, menu, RSVP, dietary, members, photos, notes, and messages.
4. Posts only when membership/profile-token permissions allow.
5. Cannot infer deposit/payment state or access unrelated Circle data by URL guessing.

### Staff

1. Enters from staff portal or event assignment.
2. Sees Crew Circle context for assigned event work.
3. Sees prep-safe details, handoffs, schedule/proof, and messages.
4. Updates assigned operational handoffs where allowed.
5. Cannot see guest/client data beyond safety and assignment need.

### Vendor Or Partner

V1 should define policy before implementation. Vendor/Partner Circle creation is deferred unless the fired item includes route/auth proof.

1. Enters from their portal or scoped invite.
2. Sees only relationship-scoped context.
3. Messages and provides files/proof where allowed.
4. Cannot discover or enumerate tenant Circles.

## Information Architecture

### Chef Portal

| Surface                       | Purpose                                                               |
| ----------------------------- | --------------------------------------------------------------------- |
| `/circles`                    | Shared-work command center.                                           |
| `/circles/[id]`               | Chef Circle detail/control surface.                                   |
| Dashboard Circles widget      | Top shared-work changes and next handoffs.                            |
| Event/Inquiry/Client surfaces | Canonical records with Circle entry points and shared-work summaries. |

### Public / Token Surface

| Surface                  | Purpose                                                               |
| ------------------------ | --------------------------------------------------------------------- |
| `/hub/g/[groupToken]`    | Token-access Circle view. Guest-level and member-token behavior only. |
| `/hub/join/[groupToken]` | Join/recovery flow.                                                   |
| `/hub/circles`           | Public/community/open Circle discovery only.                          |

### Future Role Portals

| Portal         | Circle role                                                 |
| -------------- | ----------------------------------------------------------- |
| Client portal  | Own relationship/event Circles and approved shared history. |
| Staff portal   | Assigned Crew Circles and staff-safe handoffs.              |
| Vendor portal  | Vendor-scoped Circle context once policy exists.            |
| Partner portal | Partner/referral Circle context once policy exists.         |

## Route And Auth Matrix

Current route policy already treats `/circles` as chef-protected and `/hub` as public unauthenticated/token space. New work must preserve that distinction unless route-policy changes are explicitly part of a fired item.

| Route/surface                       | Current or target role    | Auth model                                               | Circle responsibility                       | Notes                                                                         |
| ----------------------------------- | ------------------------- | -------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------- |
| `/circles`                          | Chef                      | `CHEF_PROTECTED_PATHS` / `requireChef()` in data actions | Chef command center for tenant/shared work. | V1 primary command surface.                                                   |
| `/circles/[id]`                     | Chef                      | Chef route + tenant/member/collab data policy            | Chef detail/control surface.                | Dynamic ID must not be sole DB filter.                                        |
| `/hub/g/[groupToken]`               | Public/guest/member token | Public route, token credential                           | Guest/member Circle workspace.              | Must sanitize aggressively.                                                   |
| `/hub/join/[groupToken]`            | Public/guest              | Public route, token credential                           | Join/recovery entry.                        | Profile-token writes require membership.                                      |
| `/hub/circles`                      | Public/community          | Public route                                             | Public/open/community discovery.            | Must filter to public/open/active.                                            |
| `/my-hub`                           | Client                    | `CLIENT_PROTECTED_PATHS` / `requireClient()`             | Client Circle home.                         | Existing surface; future client Circle work should route here where possible. |
| `/my-hub/g/[groupToken]`            | Client                    | Client route + token/member policy                       | Client-authenticated Circle view.           | Can reuse public view only after client-safe projection.                      |
| `/staff-dashboard` and staff routes | Staff                     | `STAFF_PROTECTED_PATHS` / `requireStaff()`               | Staff home for Crew Circle entry.           | Do not force staff to raw public token route long term.                       |
| `/partner/**`                       | Partner                   | `PARTNER_PROTECTED_PATHS` / `requirePartner()`           | Future Partner Circle home.                 | Partner Circles deferred until policy and route proof exist.                  |
| `/vendor/**`                        | Vendor                    | `VENDOR_PROTECTED_PATHS` / vendor guard                  | Future Vendor Circle home.                  | Vendor Circles deferred until policy and route proof exist.                   |
| `/admin/hub/**`                     | Admin                     | `ADMIN_PATHS` plus runtime `requireAdmin()`              | Platform moderation/diagnosis.              | Middleware alone is not enough.                                               |

Route additions must update `lib/auth/route-policy.ts` and route-policy tests.

## What Already Exists

Verified current primitives:

- `CONTEXT.md` now defines Circle as the shared relationship workspace and Dinner Circle as a Circle type.
- `hub_groups` backs shared Circle-style work.
- `lib/hub/types.ts` defines `HubGroup`, `HubGroupMember`, messages, notes, media, polls, and related primitives.
- `lib/hub/group-actions.ts` provides public token group lookup through `getGroupByToken()`.
- `app/(public)/hub/g/[groupToken]/page.tsx` and `hub-group-view.tsx` provide public token-access Circle views.
- `app/(chef)/circles/page.tsx` is the chef Circles dashboard.
- `lib/hub/chef-circle-actions.ts` fetches tenant-scoped Circles for chefs.
- `lib/hub/crew-circle-actions.ts` already creates staff coordination Circles with `group_type = 'crew'`.
- `lib/hub/circle-access-policy.ts` already centralizes some Circle permissions.
- Existing specs cover Dinner Circle critical path onboarding and Crew Circles.
- `docs/agent-contexts/circles-domain.md` is the agent context brief and has been updated to distinguish Circle from Dinner Circle.
- `docs/architecture/circles-current-state-inventory.md` inventories current implementation evidence, tests, routes, and mismatches.
- `docs/architecture/circles-policy-matrix.md` defines type, ownership, creation, access, and linked-object visibility rules for the first foundation implementation.
- `docs/architecture/circles-source-of-truth-boundaries.md` defines what Circles may coordinate versus what canonical domains own.
- `docs/architecture/circles-swarm-execution-plan.md` defines the fresh-context wave plan for fired Circles work.

## Current Mismatch

The implementation has many useful hub pieces, but the domain is still narrower than the north star:

- "Dinner Circle" language dominates even though Circle is the universal primitive.
- `group_type` is loose and partially under-modeled.
- ownership modes are implicit rather than explicit.
- role creation policy is not documented as a product contract.
- `/circles` reads as a dashboard/list rather than the universal shared-work command center.
- Circle status/handoff/proof/memory concepts exist in fragments, not as a consistent model.
- Circle source-of-truth boundaries are not explicit enough to prevent duplicate Event/Menu/Client/Payment systems.

## Domain Model

### Circle

Backed by `hub_groups`. A permissioned workspace for shared relational work.

### Circle Type

Canonical types:

- `dinner`
- `crew`
- `client`
- `vendor`
- `partner`
- `community`
- `planning`
- `bridge`

Compatibility note: existing `group_type = 'circle'` likely maps to Dinner Circle until a migration or compatibility layer decides otherwise.

### Ownership Mode

Canonical modes:

- `personal`
- `tenant`
- `shared`
- `linked_object`
- `platform`

### Linked Object

The canonical object that gives the Circle meaning and access scope:

- Inquiry
- Event
- Client
- Household
- Staff assignment
- Vendor relationship/order
- Partner relationship/referral
- Community/platform thread

### Circle Activity

Shared concepts:

- message
- status update
- signal
- handoff
- memory
- proof
- unknown
- dispute
- system event

## Circle State Model

Every Circle should have a derived or stored state. V1 can derive state from existing fields; migration comes later only if needed.

| State       | Meaning                                                                                                 | Example                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `active`    | Shared work is moving and has recent activity.                                                          | Client replied with menu feedback.                             |
| `attention` | Chef/owner should review or act.                                                                        | Guest submitted allergy conflict.                              |
| `waiting`   | The Circle is waiting on a person, time, decision, payment-domain action, vendor, staff, or system job. | Waiting on host address.                                       |
| `blocked`   | Work cannot proceed until a required dependency clears.                                                 | No exact address, unresolved allergy, no staff confirmation.   |
| `stale`     | The Circle has not moved within the expected window.                                                    | Inquiry Circle has no client visit/reply after first response. |
| `completed` | The linked workflow concluded.                                                                          | Event completed and follow-up sent.                            |
| `archived`  | The Circle is retained as memory but no longer active.                                                  | Old planning Circle closed.                                    |

State derivation must be evidence-labeled. A stale guess is not a confirmed blocker.

## State Derivation Rules

V1 should derive state without adding columns. The derivation can later become durable if tests prove it is needed.

| Derived state | Source signals                                                                                                                                            | Evidence label                                                                          | Notes                                                         |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `attention`   | unread chef-targeted message, safety-sensitive dietary update, disputed claim, failed side effect, blocked lifecycle transition                           | `confirmed` for source event, `inferred` for priority                                   | Should outrank simple recency.                                |
| `waiting`     | inquiry status awaiting client/chef, open request, pending approval, pending RSVP, pending staff assignment, pending vendor response, scheduled follow-up | `confirmed` when source record has waiting status; `inferred` from stale message timing | Must include waiting-on actor if known.                       |
| `blocked`     | critical path blocker, missing address, unresolved allergy, no menu approval, missing staff, failed payment-domain prerequisite                           | `computed` or `confirmed`                                                               | Guest view must not expose financial/payment blocker details. |
| `active`      | recent message/activity, active linked Event, active planning brief, open menu poll                                                                       | `confirmed`                                                                             | Recent activity alone does not imply needs attention.         |
| `stale`       | no activity past threshold for Circle type/stage                                                                                                          | `inferred` or `stale`                                                                   | Must not shame users; use as chef triage signal.              |
| `completed`   | linked Event completed, planning Circle closed, community thread resolved                                                                                 | `confirmed`                                                                             | Still may appear in follow-up window.                         |
| `archived`    | `is_active = false` or future archive marker                                                                                                              | `confirmed`                                                                             | Retained as memory, not active work.                          |

Derivation precedence:

1. `archived`
2. `blocked`
3. `attention`
4. `waiting`
5. `active`
6. `stale`
7. `completed`

If multiple signals conflict, show the highest-priority state plus a `disputed` or mixed evidence detail.

## Circle Activity Contract

| Activity kind   | Owned by Circle?                                               | Purpose                                                                        |
| --------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `message`       | yes                                                            | Human/system communication.                                                    |
| `system_event`  | yes                                                            | Structured update from canonical workflow.                                     |
| `status_update` | yes, as projection                                             | Human-readable state change; canonical source remains outside when applicable. |
| `handoff`       | yes, if Circle-specific; otherwise projected                   | Who needs to do what next.                                                     |
| `memory`        | yes, if shared context; canonical profile data remains outside | Durable shared context useful later.                                           |
| `proof`         | yes, if message/media/note; domain proof remains outside       | Evidence of decision/change.                                                   |
| `unknown`       | yes, as a visible gap                                          | Missing info that should not be guessed.                                       |
| `dispute`       | yes, as conflict marker                                        | Conflicting facts/claims needing resolution.                                   |

## Data Contract Sketches

These are acceptance-level implementation targets for the policy/command-center slices. Field names can evolve during implementation, but every Circle command summary must preserve the same concepts: canonical type, ownership mode, work state, evidence label, role-safe linked object, next handoff, last change, unread count, member count, and safe route/action.

```ts
type CanonicalCircleType =
  | 'dinner'
  | 'client'
  | 'crew'
  | 'planning'
  | 'bridge'
  | 'community'
  | 'vendor'
  | 'partner'

type CircleOwnershipMode = 'personal' | 'tenant' | 'shared' | 'linked_object' | 'platform'

type CircleWorkState =
  | 'active'
  | 'attention'
  | 'waiting'
  | 'blocked'
  | 'stale'
  | 'completed'
  | 'archived'

type CircleEvidenceLabel =
  | 'confirmed'
  | 'computed'
  | 'claimed'
  | 'inferred'
  | 'stale'
  | 'unknown'
  | 'disputed'

type CircleLinkedObjectType =
  | 'inquiry'
  | 'event'
  | 'client'
  | 'household'
  | 'staff_assignment'
  | 'vendor_order'
  | 'partner_referral'
  | 'community_thread'
```

Core output for command surfaces:

```ts
type CircleCommandSummary = {
  id: string
  groupToken: string
  name: string
  type: CanonicalCircleType
  ownershipMode: CircleOwnershipMode
  workState: CircleWorkState
  evidenceLabel: CircleEvidenceLabel
  visibility: 'public' | 'private' | 'secret'
  linkedObject: {
    type: CircleLinkedObjectType
    id: string
    label: string
    clientSafe: boolean
  } | null
  nextHandoff: {
    label: string
    ownerRole: 'chef' | 'client' | 'guest' | 'staff' | 'vendor' | 'partner' | 'system'
    dueAt: string | null
    route: string | null
  } | null
  lastChangedAt: string | null
  unreadCount: number
  memberCount: number
}
```

## MVP Boundaries

### V1 Must Include

- Circle doctrine and glossary alignment.
- Canonical type/ownership compatibility layer.
- Access policy separating Circle workspace access from linked-object access.
- Chef `/circles` command-center grouping.
- Guest token view privacy preservation.
- Dinner/Crew compatibility with no regression.
- Focused regression tests for type mapping, token access, member permissions, and linked-object visibility.

### V1 May Include

- Client Circle as a read-only relationship summary if derived safely.
- Staff portal entry to Crew Circle if route/auth ownership is clear.
- Basic next-handoff display for chef command center.

### V1 Must Not Include

- Vendor/Partner creation flows without dedicated auth/route policy.
- Cross-tenant shared Circles without explicit collaborator access proof.
- Database migrations before compatibility layer proves need.
- Circle-owned payment/menu/event/client canonical copies.
- AI automation that turns inferred Circle signals into canonical changes without approval.

## Files To Create

| File                                     | Purpose                                                                                               |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `lib/hub/circle-types.ts`                | Canonical Circle taxonomy, legacy `group_type` mapping, labels, allowed linked objects, default tabs. |
| `lib/hub/circle-ownership.ts`            | Ownership mode definitions and helpers.                                                               |
| `lib/hub/circle-creation-policy.ts`      | Role/type creation matrix and validation helpers.                                                     |
| `lib/hub/circle-linked-object-policy.ts` | Linked-object access and visibility rules.                                                            |
| `lib/hub/circle-activity-model.ts`       | Shared activity/status/handoff/memory/proof vocabulary.                                               |
| `tests/unit/hub/circle-policy.test.ts`   | Type/ownership/creation/linked-object policy coverage.                                                |

## Files To Modify

| File                                                 | What To Change                                                                                  |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `CONTEXT.md`                                         | Add Circle as the universal primitive and narrow Dinner Circle to a type.                       |
| `lib/hub/types.ts`                                   | Align `HubGroup.group_type` typing with universal Circle types or compatibility aliases.        |
| `lib/hub/circle-access-policy.ts`                    | Consume type/ownership/linked-object policy helpers.                                            |
| `lib/hub/group-actions.ts`                           | Validate creation against Circle policy where user-created Circles are introduced.              |
| `lib/hub/chef-circle-actions.ts`                     | Return enriched Circle type/ownership/status metadata for `/circles`.                           |
| `app/(chef)/circles/page.tsx`                        | Reframe as shared-work command center.                                                          |
| `components/hub/circles-page-tabs.tsx`               | Group by attention, waiting, active events, client, crew, community, archived where applicable. |
| `app/(public)/hub/g/[groupToken]/hub-group-view.tsx` | Keep token view role-safe while adopting shared Circle activity/status semantics.               |
| `lib/auth/route-policy.ts`                           | Register any new role-specific Circle routes if added.                                          |

## Database Changes

V1 should avoid migrations unless the policy layer proves existing `hub_groups` fields are insufficient.

Likely first step is a compatibility layer:

- legacy `group_type = 'circle'` => `dinner`
- existing `group_type = 'crew'` => `crew`
- existing `group_type = 'dinner_club'` => `client` for permissions; public discovery can continue to project visible legacy rows as community-style cards until migration
- existing `group_type = 'planning'` => `planning`
- existing `group_type = 'bridge'` => `bridge`
- existing `group_type = 'community'` => `community`
- unknown `group_type` => fail closed: no creation, linked-object access, public write, or role expansion

Potential later migration:

- `circle_type`
- `ownership_mode`
- `linked_object_type`
- `linked_object_id`
- `circle_status`
- `archived_at`

Do not add these until compatibility-layer tests prove the migration is needed.

## Server Actions

Any new server action must be role-gated before data access:

| Action                      | Auth                              | Notes                                                                                |
| --------------------------- | --------------------------------- | ------------------------------------------------------------------------------------ |
| `createCircle()`            | role-specific guard               | Must validate type, ownership, linked object, tenant scope, and creator permissions. |
| `transferCircleOwnership()` | manager/admin guard               | Must block protected role demotion and cross-tenant transfer.                        |
| `archiveCircle()`           | manager/admin guard               | Must preserve canonical records; archives only Circle visibility/state.              |
| `getCircleCommandCenter()`  | `requireChef()` initially         | Must tenant-scope every query.                                                       |
| `getClientCircleView()`     | `requireClient()` or token policy | Must expose only client-safe data.                                                   |

## UX Requirements

### `/circles`

The chef `/circles` surface should answer:

- Which Circles need my attention?
- Which are waiting on clients, staff, vendors, partners, time, payment, or system jobs?
- Which changed since I last looked?
- Which Events have active Dinner or Crew Circles?
- Which Client Circles are stale but valuable?
- Which shared threads are blocked?
- What is the next handoff?

It should be a command center for shared work, not a decorative community page.

### Circle View

Every Circle should expose:

- current status
- recent changes
- active handoffs
- waiting state
- messages
- members
- linked records
- notes/memory
- proof/evidence
- role-specific actions

## Command Center Grouping Rules

The `/circles` command center should group by work need before social category.

Recommended primary sections:

1. **Needs attention:** blocked, disputed, safety-sensitive, or high-priority handoffs.
2. **Waiting:** waiting on client, guest, staff, vendor, partner, time, payment-domain action, system job, or chef decision.
3. **Active events:** Dinner/Crew Circles tied to upcoming or in-progress Events.
4. **Client relationships:** long-running Client Circles and recurring-service context.
5. **Crew and operations:** staff coordination Circles.
6. **Community and discovery:** public/community/open Circles.
7. **Recently completed:** completed Circles still in follow-up window.
8. **Archived:** retained memory, not active work.

Each row/card should show:

- type
- linked object
- state
- evidence label where relevant
- next handoff
- last change
- unread count
- member count
- role-safe route/action

## Empty, Loading, Error, Mobile

- **Loading:** skeletons matching existing dense dashboard style.
- **Empty:** explain which Circles will appear and provide allowed creation/action entry points. Do not show fake stats.
- **Error:** keep page shell usable and show a recoverable error for failed Circle data.
- **Mobile:** prioritize state, next handoff, last change, and primary action. Avoid dense multi-column tables on small screens.

## Observability Requirements

Circle lifecycle and command-center work should be observable:

- creation/adoption helper result
- duplicate prevention result
- failed non-blocking side effect
- notification path chosen
- token access denial reason without logging sensitive token values
- linked-object policy denial reason
- public discovery exclusion reason in tests or debug tooling

Logs must not include raw private notes, payment details, profile tokens, or group tokens.

## Acceptance Criteria

1. Circle domain charter exists and is linked from the spec.
2. `CONTEXT.md` distinguishes Circle from Dinner Circle.
3. Canonical Circle types and ownership modes are documented and implemented in a typed policy module.
4. Legacy `hub_groups.group_type` values map to canonical Circle types without breaking existing Dinner/Crew behavior.
5. Creation policy covers Chef, Client, Guest, Staff, Vendor, Partner, Admin, Public.
6. Access policy distinguishes Circle membership from linked-object data access.
7. `/circles` groups Circles by shared-work state, not only by list/feed.
8. Guest token views remain client-safe.
9. Tests cover type mapping, ownership policy, creation permission, and linked-object access.
10. Proof pack includes tenant-scope review, token-access review, route screenshots, and focused tests.

## Role Acceptance Criteria

### Chef

- Can see all tenant-owned Circles they are authorized to manage.
- Can identify what needs attention, what is waiting, and what changed.
- Can open canonical record routes from Circle summaries.
- Cannot see another tenant's private Circle by guessing URL or ID.

### Client

- Can see only their client-safe relationship/event Circle context.
- Can answer requests or confirm details through safe flows.
- Cannot see chef-only notes, lead score, or unrelated client/event data.

### Guest

- Can enter token Circle and participate within member/profile permissions.
- Can see only guest-safe event/menu/status context.
- Cannot post without profile/member permission.
- Cannot see deposit/payment/internal risk state.

### Staff

- Can see Crew Circles for assigned event work.
- Can see only assignment-safe linked object details.
- Cannot access unrelated client/private tenant data.

### Vendor/Partner

- V1 must either block creation/use or prove route/auth policy before exposing vendor/partner Circle features.
- If exposed, visibility must be relationship-scoped.

### Admin

- Admin routes/actions call `requireAdmin()`.
- Admin access is auditable and runtime-gated.

## Regression Test Targets

Initial focused tests should cover:

- legacy `group_type` mapping, including live `crew`
- unknown group type fails closed
- private Circle denies non-member
- public Circle read does not imply write
- profile-token write requires membership
- host cannot manage protected chef/owner/admin cases
- Circle member cannot see chef-only linked object
- guest token view excludes payment/deposit/internal fields
- public discovery excludes private/secret/inactive Circles
- chef tenant query cannot return another tenant's Circle
- admin page/action has runtime guard

## Security Requirements

- Every server action touching tenant data calls the correct role guard before data access.
- Every tenant query includes `tenant_id` or `chef_id` scope.
- Dynamic route params are never sole filters for tenant data.
- Token access is treated as guest-level access only.
- Financial data, lead scoring, chef-only notes, private household detail, and internal risk signals do not leak to guest/client/vendor/partner Circles unless explicitly allowed by policy.
- Admin Circle tooling calls `requireAdmin()` at runtime.
- UI hiding is not accepted as a security boundary.

## Build Queue Slices

### Slice 1: Circles Domain Charter And Glossary

- **Goal:** Make Circle the universal shared-work primitive in docs.
- **Scope:** `CONTEXT.md`, `docs/domain/circles.md`, `docs/agent-contexts/circles-domain.md`, this spec.
- **Inputs:** May 15 operating-loop research, existing Circles agent context, current implementation inventory.
- **Outputs:** Canonical docs, contradiction list, implementation queue alignment.
- **Acceptance:** Portal/Circle boundary and source-of-truth boundary are documented.
- **Verification:** docs review and queue finish-check.
- **Proof:** file diff, stale-term scan, linked artifacts list.

### Slice 2: Circle Taxonomy And Ownership Policy

- **Goal:** Add typed Circle type, ownership, and legacy mapping helpers.
- **Scope:** `lib/hub/circle-types.ts`, `lib/hub/circle-ownership.ts`, `docs/architecture/circles-policy-matrix.md`, tests.
- **Inputs:** `docs/architecture/circles-policy-matrix.md`, current `lib/hub/types.ts`, current `lib/hub/circle-access-policy.ts`.
- **Outputs:** Typed compatibility helpers and no-behavior-change tests.
- **Acceptance:** Existing group types map safely to canonical types; ownership modes are typed and tested.
- **Verification:** unit tests and typecheck.
- **Proof:** type mapping examples for `circle`, `crew`, `dinner_club`, `planning`, `bridge`, `community`, and unknown type.

### Slice 3: Circle Creation And Linked-Object Access Policy

- **Goal:** Define who can create/manage which Circle types and what linked data they can see.
- **Scope:** `lib/hub/circle-creation-policy.ts`, `lib/hub/circle-linked-object-policy.ts`, access-policy integration tests.
- **Inputs:** route/auth matrix, source-of-truth boundary contract, current access policy tests.
- **Outputs:** explicit create/manage/linked-object decisions for chef/client/guest/staff/vendor/partner/admin/system.
- **Acceptance:** Role/type/object matrix blocks unsafe creation and visibility.
- **Verification:** focused policy tests and security review.
- **Proof:** negative tests for guest creation, vendor/partner deferred types, Circle member seeing chef-only linked object, and public token write denial.

### Slice 4: Circles Command Center

- **Goal:** Reframe `/circles` around shared-work state.
- **Scope:** `lib/hub/chef-circle-actions.ts`, `app/(chef)/circles/page.tsx`, `components/hub/circles-page-tabs.tsx`, supporting components.
- **Inputs:** `CircleCommandSummary`, state derivation rules, existing `getChefCircles()`, existing Circle dashboard components.
- **Outputs:** grouped command center with attention/waiting/active/client/crew/community/completed/archived sections.
- **Acceptance:** Chef sees active, waiting, attention, event-linked, crew, client/community groups with next-handoff cues.
- **Verification:** route screenshot, console clean, tenant-scope review.
- **Proof:** `/circles` screenshot, empty-state screenshot if no data, focused data-shape test, tenant filter review.

### Slice 5: Universal Circle Activity Model

- **Goal:** Add consistent status, signal, handoff, memory, proof, unknown, and dispute semantics to Circle views.
- **Scope:** `lib/hub/circle-activity-model.ts`, selected Circle view/components.
- **Inputs:** activity contract, evidence labels, existing message/system event types.
- **Outputs:** reusable activity model and first Dinner/Crew projection.
- **Acceptance:** At least Dinner and Crew Circles show consistent status/handoff/proof concepts without losing existing chat/media/notes.
- **Verification:** public token view screenshot, chef view screenshot, privacy review.
- **Proof:** guest-safe projection evidence, chef-safe projection evidence, no hidden financial/internal fields in serialized props.

### Slice 6: Role-Specific Circle Creation Flows

- **Goal:** Allow permitted roles to create/request Circles from the right contexts.
- **Scope:** create actions and UI entry points per approved role.
- **Inputs:** creation policy, route/auth matrix, ownership policy.
- **Outputs:** chef/system creation first; other role flows blocked, deferred, or implemented with proof.
- **Acceptance:** Chef creation works first; client/staff/vendor/partner creation is gated to allowed contexts or explicitly deferred.
- **Verification:** route/action tests, browser proof, blocked-role tests.
- **Proof:** successful chef creation, denied guest/vendor/partner creation where deferred, route-policy updates where added.

## Finish-Gate Proof Pack Requirements

Every fired Circles item needs a proof pack. Minimum contents:

- queue item ID and run ID
- changed files
- source-of-truth boundary review
- role/privacy review
- auth guard and tenant-scope evidence for touched routes/actions
- token access review if `/hub/g`, `/hub/join`, `/hub/circles`, or public APIs are touched
- screenshots for UI changes
- test commands and output
- partial-work notes and known deferrals
- `finish-check` result

Do not move a Circles queue item to `done` if:

- guest/client/public views expose private data
- implementation duplicates canonical Event/Menu/Quote/Client/Ledger/Staff/Vendor/Partner truth
- a dynamic route param is the sole tenant data filter
- a new route is missing from `lib/auth/route-policy.ts`
- a server action touches tenant data before a guard
- screenshots or focused tests are missing for UI work

## Recommended Swarm Plan After Queue Fire

Detailed runbook: `docs/architecture/circles-swarm-execution-plan.md`.

Wave 1 foundation:

- Lane A: taxonomy/ownership typed modules and tests.
- Lane B: linked-object/security policy tests.
- Lane C: docs/glossary/spec alignment.

Wave 2 product surface:

- Lane A: chef `/circles` command center data.
- Lane B: Circle UI grouping/status components.
- Lane C: Dinner/Crew compatibility checks.

Wave 3 creation flows:

- One role at a time, starting with Chef.
- Do not parallelize actions touching the same policy modules.

Wave 4 hardening:

- token guest view privacy
- tenant route tampering
- server action abuse
- empty/error/loading/mobile states
- proof packs and finish-check

## Rollout Gates

Do not proceed to the next gate until the previous gate has proof.

| Gate                         | Required proof                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------ |
| Gate 0: Docs                 | Domain charter, inventory, policy matrix, source-of-truth boundary, and queue items are aligned. |
| Gate 1: Policy               | Type/ownership/access policy tests pass with no UI changes.                                      |
| Gate 2: Lifecycle            | Creation/adoption helpers are idempotent and tenant-safe.                                        |
| Gate 3: Chef command center  | `/circles` shows real grouped Circle state with route screenshots and tenant proof.              |
| Gate 4: Public/client safety | `/hub/g/[groupToken]` remains token-safe and excludes private fields.                            |
| Gate 5: Role expansion       | New role creation flows have route policy, server action guards, and negative tests.             |
| Gate 6: Regression harness   | Focused Circles security/regression command is documented and passing.                           |

## Out Of Scope

- Replacing Events, Menus, Quotes, Clients, Staff, Vendors, Partners, Ledger, or Inventory.
- Making Circle membership grant full linked-record access.
- Building all role creation flows before the creation policy is tested.
- Adding migrations before compatibility-layer evidence.
- Decorative social graph work.
- Public claims of perfect transparency.

## Open Product Decisions

- Can guests create Circles, or only participate?
- Is Client Circle one long-lived relationship Circle by default, or opt-in after Dinner Circle maturity?
- Can a Circle span multiple chef tenants?
- Should Vendor and Partner Circles be v1 or a later expansion?
- What is the ownership transfer UX?
- Does `/circles` become the default shared-work home for all roles or chef first?

## Proposed Defaults For Open Decisions

Use these defaults unless the developer overrides them before implementation:

- Guests participate; they do not create Circles in V1.
- Client Circle is opt-in/derived after Dinner Circle maturity, not automatic for every client in V1.
- Cross-tenant Circles are blocked except explicit chef collaboration/bridge flows with accepted collaborator proof.
- Vendor and Partner Circles are deferred until their portal/auth policies are explicit.
- Ownership transfer is manager/admin only in V1.
- `/circles` becomes chef-first in V1; client/staff/vendor/partner Circle homes come later through their portals.

## Decision Log

| Decision                                | Default  | Rationale                                                                | Revisit when                                                                    |
| --------------------------------------- | -------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Circle is universal primitive           | Accepted | User clarified shared work lives in Circles.                             | Only if portal/Circle distinction causes UX harm.                               |
| Portal owns canonical mutation          | Accepted | Prevents duplicate Event/Menu/Client/Payment systems.                    | If a canonical domain explicitly delegates a mutation flow to Circle UI.        |
| Dinner Circle is a type                 | Accepted | Existing Dinner Circle remains important but is not the whole domain.    | Never rename user-facing Dinner Circle until migration/UX plan exists.          |
| V1 avoids DB migrations                 | Accepted | Compatibility layer reduces risk and protects dirty workspace.           | When tests prove current `group_type` and `hub_groups` fields are insufficient. |
| Chef command center first               | Accepted | Chef is tenant owner and safest first role for broad Circle control.     | After chef surface and policy tests pass.                                       |
| Guests cannot create Circles in V1      | Accepted | Token access is participation, not workspace ownership.                  | If a public planning/product flow needs guest-created Planning Circles.         |
| Vendor/Partner Circles deferred         | Accepted | Their portals/auth boundaries need explicit route and data policy first. | When vendor/partner queue item is fired with auth proof.                        |
| Cross-tenant Circles blocked by default | Accepted | Cross-tenant access is high risk.                                        | Only for explicit Bridge/collaboration flows with accepted relationship proof.  |

## Terminology Rules

- Use **Circle** for the universal shared-work primitive.
- Use **Dinner Circle** only for the client dinner/inquiry/event Circle type.
- Use **Crew Circle** only for event staff coordination.
- Use **Hub** for existing technical module names where they already exist; avoid introducing new product copy that calls all Circles "Hub."
- Use **portal** for role-owned private/canonical spaces.
- Avoid "chat group" as the definition. Chat is one capability inside a Circle.

## Builder Checklist

Before editing app code for any Circles item:

- [ ] Read `docs/domain/circles.md`.
- [ ] Read `docs/architecture/circles-current-state-inventory.md`.
- [ ] Read `docs/architecture/circles-policy-matrix.md`.
- [ ] Read `docs/architecture/circles-source-of-truth-boundaries.md`.
- [ ] Read the fired queue item.
- [ ] Check `git status --short`.
- [ ] Identify exact write scope and dirty-file conflicts.
- [ ] Identify role guard and tenant-scope requirements.
- [ ] Identify whether public token access is involved.
- [ ] Identify canonical owners for every linked object shown or mutated.

Before finishing:

- [ ] Run focused tests.
- [ ] Check route policy if routes changed.
- [ ] Review serialized props or response data for private fields.
- [ ] Capture screenshots for UI.
- [ ] Fill proof pack.
- [ ] Run `finish-check`.
