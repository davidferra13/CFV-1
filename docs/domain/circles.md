# Circles Domain Charter

> **Status:** canonical draft
> **Source research:** `docs/research/2026-05-15-chefflow-operating-loop-verbatim-research.md`
> **Applies to:** Hub, Dinner Circles, Crew Circles, client/guest/staff/vendor/partner shared work, community, and relationship memory
> **Implementation rule:** use this as domain doctrine and build-queue shaping guidance until a queue item is fired.

## Companion Artifacts

| Artifact                                                  | Purpose                                                                                  |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `docs/architecture/circles-current-state-inventory.md`    | Current implementation inventory and known mismatches.                                   |
| `docs/architecture/circles-policy-matrix.md`              | Type, ownership, creation, access, and linked-object visibility implementation contract. |
| `docs/architecture/circles-source-of-truth-boundaries.md` | Boundary contract for what Circles can coordinate versus what canonical domains own.     |
| `docs/architecture/circles-swarm-execution-plan.md`       | Wave-based fresh-context execution plan for fired queue work.                            |
| `docs/agent-contexts/circles-domain.md`                   | Agent context brief for anyone touching Circle/Hub-related files.                        |
| `docs/specs/circles-operating-loop-build-extraction.md`   | Build extraction and queue slicing for the Circles primitive.                            |

## Thesis

Users live in portals and Circles.

The portal is a role's private cockpit. It is where a chef, client, staff member, partner, vendor, or admin manages private work, canonical records, settings, source-of-truth edits, and role-specific operations.

The Circle is the shared world. It is where relational work happens: people, context, messages, decisions, status, trust, evidence, next actions, approvals, visibility, handoffs, and memory.

If work is private or canonical, it belongs in a portal. If work involves other people or shared context, it should happen in a Circle or be projected into one.

## Core Definition

A **Circle** is a permissioned relationship workspace that keeps a chef's event, client relationship, crew operation, vendor relationship, partner workflow, or community thread operationally coherent.

Circles move context, care, resources, trust, messages, decisions, status, and next actions between participants so work can continue with less friction and less reliance on memory.

Circles are backed by `hub_groups`. They coordinate around canonical records, but they do not own Event, Menu, Quote, Client, Staff, Vendor, Partner, Inventory, Contract, or financial truth.

## Research Grounding

The May 15 operating-loop research says stable systems need communication, boundaries, energy flow, feedback, repair, and adaptation. It also defines support infrastructure as people and information moving in the right direction so others can act with less confusion, delay, and burden.

For ChefFlow, Circles are that support infrastructure.

A Circle should help participants know:

- what happened
- who was involved
- what changed
- what is confirmed
- what is claimed
- what is inferred
- what is unknown
- what is disputed
- what needs attention
- who owns the next action
- what is waiting
- what proof exists
- what should be remembered next time

The product bar is simple:

Everything shared has a place. Everything active has a next action. Everything waiting has a follow-up. Everything inferred has a label. Everything important has proof or an honest unknown. Everything finished becomes memory.

## Portal Versus Circle Boundary

Portal-owned work:

- authentication, account setup, role switching, settings, and preferences
- canonical Event, Menu, Quote, Client, Staff, Vendor, Partner, Inventory, Contract, Ledger, and payment edits
- chef-only internal notes and financial analysis
- admin/security/platform operations
- source-of-truth management and destructive actions

Circle-owned work:

- shared conversation and updates
- participant membership and role-safe visibility
- approvals, consent, confirmations, and follow-up questions
- guest, staff, vendor, partner, and client handoffs
- shared status, shared memory, and shared proof
- relationship continuity across messages, notes, photos, polls, RSVP, dietary context, and decisions
- role-specific projections of canonical records

The rule:

> Portals own private control and canonical mutation. Circles own shared coordination and continuity.

## Source Of Truth Invariant

A Circle is not the source of truth for business records.

| Canonical truth                              | Owning domain                              |
| -------------------------------------------- | ------------------------------------------ |
| Event lifecycle, date, address, status       | Events                                     |
| Menu contents, approval state, revisions     | Menus                                      |
| Quote pricing, quote state, line items       | Quotes                                     |
| Payments, deposits, balance, refunds         | Ledger / financials                        |
| Client CRM identity and relationship history | Clients                                    |
| Guest dietary facts and RSVP facts           | Guests / event guests / hub profile inputs |
| Staff identity and assignments               | Staff                                      |
| Vendor identity, sourcing, orders            | Vendors / purchasing                       |
| Contract status and document state           | Contracts                                  |

Circles may display, discuss, request, confirm, or route edits to these records. They must not create duplicate canonical models for them.

## Canonical Circle Contract

This section is the normative contract for implementation work until a later ADR supersedes it.

### Circle Versus Portal

- A **portal** is the private role cockpit for canonical mutation, private analysis, settings, billing, admin work, and source-of-truth editing.
- A **Circle** is the shared relationship workspace for coordination, conversation, visibility, memory, evidence, approvals, handoffs, waiting states, and role-safe projections of canonical records.
- A Circle can initiate or request a canonical change, but the owning domain must validate and apply the change.
- A Circle member is not automatically allowed to read or mutate the linked Event, Menu, Quote, Client, Staff, Vendor, Partner, Inventory, Contract, Ledger, or payment record.

### Backing Tables

| Table / model                                                                                   | Circle responsibility                                                                                                        | Canonical or supporting owner                                     |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `hub_groups`                                                                                    | Circle container, token, visibility, linked IDs, type discriminator, active/open-table metadata, denormalized message state. | Hub / Circles substrate                                           |
| `hub_group_members`                                                                             | Membership, Circle role, post/invite/pin permissions, read state, notification preferences.                                  | Hub / Circles substrate                                           |
| `hub_messages`                                                                                  | Conversation, system events, provenance, action links, notification messages.                                                | Hub / Circles substrate                                           |
| `hub_guest_profiles`                                                                            | Guest/member identity and volunteered profile context.                                                                       | Hub profile inputs; canonical Client/Guest records remain outside |
| `hub_media`, notes, polls, reactions                                                            | Circle-owned collaboration artifacts and proof where applicable.                                                             | Hub / Circles substrate                                           |
| `event_share_settings.circle_config`                                                            | Event-specific Dinner Circle projection/configuration.                                                                       | Event/Menu/Circle projection, not Circle identity                 |
| Event, Inquiry, Menu, Quote, Ledger, Client, Staff, Vendor, Partner, Inventory, Contract tables | Canonical business truth.                                                                                                    | Owning domain, never `hub_groups`                                 |

### Compatibility Map

`hub_groups.group_type` is a text discriminator, not the product primitive. The product primitive is `Circle`; `group_type` values map into canonical Circle types through policy.

| Stored `group_type` | Canonical Circle type | Current status                                | Auto-created by default                                                        | Notes                                                                                                                                                                                                                 |
| ------------------- | --------------------- | --------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `circle`            | `dinner`              | live                                          | yes for inquiry/event share and recurring/event bridge paths where implemented | Default legacy Dinner Circle value.                                                                                                                                                                                   |
| `dinner_club`       | `client`              | live legacy recurring/client Circle           | yes where recurring setup uses it                                              | Treat as recurring relationship/client policy. Public discovery may legacy-project visible rows as community-style cards until migration, but permissions must not treat `dinner_club` as a general Community Circle. |
| `crew`              | `crew`                | live but under-modeled in shared TS/Zod types | yes on first staff assignment where implemented                                | `lib/hub/crew-circle-actions.ts` inserts it directly; `HubGroup.group_type` and `CreateGroupSchema` do not currently include it.                                                                                      |
| `community`         | `community`           | live                                          | manual/system                                                                  | Public/community discovery may include it when visibility permits.                                                                                                                                                    |
| `planning`          | `planning`            | live                                          | manual/system                                                                  | Pre-booking collaborative planning.                                                                                                                                                                                   |
| `bridge`            | `bridge`              | live                                          | manual/system                                                                  | Intro/collaboration handoff workspace.                                                                                                                                                                                |
| `client`            | `client`              | planned                                       | not automatic in V1                                                            | Requires policy and migration/compat decision.                                                                                                                                                                        |
| `vendor`            | `vendor`              | planned/deferred                              | no                                                                             | Block until vendor auth/route policy is proven.                                                                                                                                                                       |
| `partner`           | `partner`             | planned/deferred                              | no                                                                             | Block until partner auth/route policy is proven.                                                                                                                                                                      |
| unknown value       | none                  | unsupported                                   | no                                                                             | Must fail closed in policy and tests: no creation, linked-object access, public write, or role expansion.                                                                                                             |

Do not add ad hoc `group_type` strings from feature code. Add or map them through the Circle taxonomy and access policy first.

### Auto-Creation Rules

| Flow                                       | Actor / trigger                   | Auth and scope requirement                                                          | Idempotency key                   | Required result                                                                              |
| ------------------------------------------ | --------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------- |
| Inquiry arrives or converts                | system/chef workflow              | `requireChef()` or trusted backend tenant context before tenant data access         | tenant + inquiry/event            | Create/adopt one Dinner Circle and join the safe client/host profile when available.         |
| Event share enabled                        | chef                              | `requireChef()`, event `.eq('tenant_id', user.tenantId!)`                           | tenant + event                    | Create/adopt Dinner Circle and expose only client/guest-safe projection through token route. |
| Guest joins by token                       | public guest/profile token        | token lookup plus group/member policy; no tenant-wide access from token alone       | group token + profile/email       | Create/reuse profile, create membership, apply permissions, no linked-object overexposure.   |
| Staff assignment creates coordination need | chef/staff assignment workflow    | `requireChef()` or staff assignment proof scoped to tenant/event                    | tenant + event + staff role       | Create/adopt Crew Circle and join assigned staff with staff-safe role.                       |
| Recurring/client relationship starts       | chef/recurring workflow           | `requireChef()`, client `.eq('tenant_id', user.tenantId!)`                          | tenant + client/recurring service | Create/adopt Client Circle only when recurring-service policy explicitly calls for it.       |
| Planning Circle creation                   | approved public/client/chef flow  | flow-specific token/profile/chef policy                                             | creator profile + planning brief  | Create Planning Circle without granting canonical Event/Client access.                       |
| Bridge/introduction handoff                | trusted bridge/collab flow        | accepted relationship proof; no implicit cross-tenant access                        | bridge/introduction id            | Create Bridge Circle semantics without silently upgrading to cross-tenant collaboration.     |
| Community Circle creation                  | admin/system/approved public flow | community policy and visibility validation                                          | creator + community slug/name     | Create Community Circle with public/private visibility rules.                                |
| Vendor/Partner Circle creation             | deferred                          | vendor/partner auth, route, relationship, and linked-object policy must exist first | TBD                               | Block in V1 until proven.                                                                    |
| Guest-created Circle                       | guest                             | not allowed in V1                                                                   | none                              | Block; guests participate through token/profile/member flows.                                |

Every auto-create/adopt helper must be idempotent, tenant/relationship scoped, and safe under retries.

### Membership And Read/Write Rules

| Actor       | Can create                                                                       | Can read                                                      | Can write/post                                              | Can manage                                             | Must never see by default                                                          |
| ----------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Chef        | Tenant and linked-object Circles for their tenant.                               | Tenant Circles and linked data allowed by role/domain policy. | Yes where Circle policy permits.                            | Owner/admin/chef manager actions where policy permits. | Other tenants' Circles.                                                            |
| Client/Host | Only where client-safe policy allows or by request.                              | Their client-safe relationship/event Circle context.          | Requests, confirmations, messages where membership permits. | Host/member management only where policy permits.      | Other clients, chef-only notes, lead score, internal risk, unrelated ledger data.  |
| Guest       | No V1 creation.                                                                  | Token/member-safe Dinner/Community/Planning view.             | Only with profile/member permission.                        | No protected management.                               | Payment/deposit state, private host/chef notes, other Circles, unrelated CRM data. |
| Staff       | Staff/crew-scoped Circle creation only when assigned or explicitly permissioned. | Assigned Crew Circle and prep-safe linked context.            | Staff-safe updates/handoffs where allowed.                  | Limited staff coordination only.                       | Client financials, unrelated CRM notes, unrelated tenant data.                     |
| Vendor      | Deferred.                                                                        | Vendor-safe scoped context only when implemented.             | Deferred or relationship-scoped.                            | Deferred.                                              | Client private data, chef financial internals, other vendor orders.                |
| Partner     | Deferred.                                                                        | Partner-safe scoped context only when implemented.            | Deferred or relationship-scoped.                            | Deferred.                                              | Unrelated clients, full event ops, chef financial internals.                       |
| Admin       | Platform/admin Circles through runtime-gated admin tools.                        | Govern/moderate/diagnose with `requireAdmin()`.               | Admin actions where audited.                                | Platform governance.                                   | Nothing via middleware-only admin access; runtime guard is mandatory.              |

Write permission is more specific than read permission. Public token read never implies post, invite, pin, manage, or linked-object access.

### Required Join Flows

These flows must join or link participants to the right Circle instead of creating parallel conversation systems:

- Inquiry arrives or converts: create/adopt Dinner Circle and join the client/host profile when safe.
- Event share is enabled: create/adopt Dinner Circle and expose only client/guest-safe projection through the token route.
- Guest joins by token: create/reuse guest profile, create membership, apply member permissions, and avoid linked-object overexposure.
- Staff assignment creates coordination need: create/adopt Crew Circle and join assigned staff with staff-safe role.
- Menu poll, approval, sourcing, RSVP, dietary, photo, and lifecycle updates: post Circle evidence/system messages while canonical owner remains outside the Circle.
- Bridge/introduction handoff: use Bridge Circle semantics and do not silently upgrade to cross-tenant collaboration without accepted relationship proof.
- Public join/recovery copy: render by canonical Circle type, not by `community` versus "everything else is Dinner Circle."

### Contradictions To Resolve

- `docs/domain/circles.md` and the current product language treat `crew` as a canonical Circle type, but `lib/hub/types.ts` and `CreateGroupSchema` still omit `crew`.
- `dinner_club` is now canonically a legacy recurring/client Circle for policy, but some public discovery code still includes it beside `community`. The taxonomy helper must preserve existing discovery behavior while preventing community permissions from being inferred.
- Public join and email copy still treat non-community groups as Dinner Circles in `lib/hub/group-actions.ts`; Planning, Bridge, Client, and Crew copy must use the canonical type helper.
- `getGroupByToken()` uses admin DB access and returns broad group rows. Token/client/public routes must pass through a whitelist/projection step before data crosses the boundary.
- Some historical specs propose `chef_collab` or `event_collab`; current canonical default is `bridge` until a fired policy item accepts new cross-tenant collaboration types.
- Existing public/token hub routes are intentionally low-friction, but they use admin DB access internally. Every expansion must prove the returned projection is token-safe.
- Existing "Hub" technical module names remain valid, but product copy should use "Circle" for the shared-work primitive.

## Circle Types

### Dinner Circle

The canonical Circle for an Inquiry or Event. It gives the chef, client, host, and guests a shared place for event status, menu visibility, dietary context, RSVP, messages, notes, photos, decisions, and follow-up.

Dinner Circles must be client-safe by default. Guests must not see chef-only notes, lead score, quote internals, deposit/payment state, internal risk scoring, or unrelated tenant data.

### Crew Circle

The operational Circle for event staff coordination. It gives the chef and assigned staff a shared coordination space for event execution, updates, handoffs, and team memory without changing guest-facing Dinner Circle behavior.

### Client Circle

A long-lived relationship Circle around a Client, Household, or key relationship. It preserves shared relationship continuity across Events without replacing the Client record.

### Vendor Circle

A scoped Circle for vendor, sourcing, order, substitution, pickup, delivery, or product issue coordination. It must expose only vendor-safe context.

### Partner Circle

A scoped Circle for referral partners, venues, planners, property managers, or other business partners. It coordinates relationship state and handoffs without exposing private client or chef financial data.

### Community Circle

A chef/community Circle for discussion, shared templates, collaboration, support, and platform-level community workflows.

### Planning Circle

A speculative or early-stage Circle before an Inquiry or Event has become concrete. It may later link to an Inquiry or Event.

### Bridge Circle

A cross-context handoff Circle used when multiple parties or workflows need shared coordination but no single Event or Client fully owns the thread.

## Ownership Model

Every Circle needs explicit ownership.

| Ownership mode  | Meaning                                                                                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `personal`      | One creator/profile owns the Circle.                                                                                                                       |
| `tenant`        | A chef/business tenant owns the Circle.                                                                                                                    |
| `shared`        | Multiple owners/admins manage the Circle.                                                                                                                  |
| `linked_object` | Ownership and access inherit from a linked Event, Inquiry, Client, Staff assignment, Vendor relationship, Partner relationship, or other canonical object. |
| `platform`      | Platform/admin/community policy owns moderation and governance.                                                                                            |

Ownership must determine who can see, invite, post, pin, approve, archive, transfer ownership, view linked object details, and perform destructive actions.

## Creation Policy

Any role can create a Circle only where policy allows it.

Default creation rules:

- Chef: can create tenant Circles and linked-object Circles for their tenant.
- Client: can create or request client-safe Circles within their relationship boundaries.
- Guest: can participate through token/profile access; guest-created Circles require a product decision before implementation.
- Staff: can create staff/crew-scoped Circles only when assigned or explicitly permissioned.
- Vendor: can create or participate in vendor-scoped Circles only for their relationship.
- Partner: can create or participate in partner-scoped Circles only for their relationship.
- Admin: can create, inspect, moderate, and govern platform Circles through runtime-gated admin access.

## Permission Questions Every Circle Must Answer

- Who can see this Circle?
- Who can post?
- Who can invite?
- Who can pin or mark important context?
- Who can approve, confirm, or reject a proposed change?
- Who can see linked canonical object details?
- Who can see chef-only or internal fields?
- Who can transfer ownership?
- Who can archive or restore?
- Who owns the data?
- Which tenant or relationship scopes every query?
- What is intentionally public, if anything?

UI hiding is not a security boundary. Server-side auth, token, tenant, role, and linked-object checks are mandatory.

## Circle Activity Model

A Circle should contain more than messages.

Core activity concepts:

- **Message:** human or system communication.
- **Status:** current shared state, such as active, waiting, blocked, confirmed, completed, stale, or archived.
- **Signal:** meaningful change that should be surfaced.
- **Handoff:** a next action transferred to a person, role, or system.
- **Memory:** durable context useful later.
- **Proof:** evidence that something happened or was decided.
- **Unknown:** an explicit gap that should not be guessed away.
- **Dispute:** conflicting facts or claims requiring resolution.

## Evidence Standard

Circles must label truth honestly:

- `confirmed`: verified by canonical record, direct user confirmation, accepted/signed/paid/approved state, or directly observed source.
- `computed`: deterministic calculation from trusted data.
- `claimed`: user or external statement not independently verified.
- `inferred`: pattern-derived or AI/system assumption.
- `stale`: once useful, now old enough to reduce confidence.
- `unknown`: missing or not yet asked.
- `disputed`: conflicting sources exist.

Guest-facing and shared Circles must never convert chef-only inference into confident public fact.

## User Experience Standard

A Circle must help users act without reassembling context.

Every major Circle view should answer:

- What matters now?
- What changed since I last looked?
- What is waiting on me?
- What is waiting on someone else?
- What can I safely ignore?
- What should happen next?
- Where is the proof?

`/circles` should become the command center for shared work, not merely a list of groups.

## Security And Privacy Invariants

- Tenant data must be scoped by `tenant_id` or `chef_id` wherever applicable.
- Public token access must be intentionally narrow and client-safe.
- Admin access must be runtime-gated by `requireAdmin()`.
- Chef-side actions must call `requireChef()` before tenant data access.
- Staff, vendor, partner, client, and guest access must be linked-object scoped.
- Financial state, internal notes, lead scoring, private household details, and chef-only risk assessment are never guest-visible by default.
- Circle membership does not automatically grant full access to linked canonical records.

## Build Implications

The Circles feature should evolve in this order:

1. Canonical Circle type and ownership taxonomy.
2. Role and linked-object permission matrix.
3. Circle creation and invitation policy per role.
4. Circle command center redesign for `/circles`.
5. Circle activity/status/handoff/memory/proof model.
6. Dinner Circle alignment to universal Circle primitives.
7. Crew, Client, Vendor, Partner, Community, Planning, and Bridge variants.
8. Security audit for token, tenant, role, and linked-object access.

Do not start by adding random tabs or isolated UI. The first real work is the policy and taxonomy layer that prevents Circles from becoming a second source-of-truth system.
