# ChefFlow System Architecture

## Purpose

This document defines the canonical structure that the feature inventory must map into.

Project identity, audience, and scope are governed by `docs/project-definition-and-scope.md`. This document defines structural ownership and surface boundaries inside that scope.

ChefFlow is one system. It is not a collection of separate apps. The system is a unified operating model with multiple surfaces, multiple roles, and shared domain objects.

The core rule is simple:

- Surfaces describe where an interaction belongs.
- Roles describe who is allowed to use it.
- Routes and folders are implementation details, not the final truth.

## Canonical Shape

```text
ChefFlow OS
|
+-- Public Surface
+-- Chef Portal
|   +-- Chef role
|   +-- Staff role
+-- Client Portal
+-- Partner Surface
+-- Admin / Mission Control
```

## System Principles

1. ChefFlow has one shared domain model.
2. The same entity can appear in multiple surfaces for different reasons.
3. Surface ownership is determined by primary actor, trust level, and business outcome.
4. A public route can deliver a client, partner, or staff experience without owning that feature.
5. Staff is a restricted operational role inside the chef surface, not a chef variant.
6. Partner is an external relationship role, not a chef variant.
7. Admin is a platform authority layer. It is a system role for classification, even though implementation uses separate persisted admin access.

## Surfaces

### Public Surface

**Purpose**

Anonymous or low-trust entry into ChefFlow. This is where discovery, marketing, intake, claim links, and controlled public artifacts live.

**Belongs here**

- Marketing pages
- Discovery and directory browsing
- Public chef profiles
- Intake and booking forms
- Claim, invite, and sign-up flows before authenticated access exists
- Read-only or token-gated artifacts intended for external delivery
- Embeds and lightweight unauthenticated widgets

**Must not live here**

- Persistent operator workflows
- Tenant operations
- Platform mission control
- Long-lived authenticated client, partner, or staff workspaces
- Internal notes, margins, staff rosters, or cross-tenant data

**Boundary**

Public is an entry surface, not an overflow bucket. If a feature is repeatedly used by a signed-in actor as part of ongoing work, it does not belong here even if the current route is token-based.

### Chef Surface

**Purpose**

Primary tenant operating workspace. This is the system of execution for the chef business.

**Belongs here**

- Event lifecycle management
- Inquiries, quotes, proposals, and client relationship management from the operator side
- Menu, recipe, ingredient, prep, production, inventory, and purchasing workflows
- Operational finance and tenant-level reporting
- Chef settings, modules, automations, compliance, safety, and internal AI tooling
- Staff management performed by the chef
- Partner management performed by the chef
- Restricted staff execution workflows

**Must not live here**

- Platform-wide moderation
- Cross-tenant analytics or intervention tools
- Global feature flags and system health dashboards
- Partner self-service
- Client self-service as the canonical owner experience

**Boundary**

Chef is the owner/operator surface. If the primary question is "how does the business run?", the feature belongs here. Staff features remain chef-owned because they are operational execution under a tenant, not a separate product.

### Client Surface

**Purpose**

Client relationship layer for ongoing customer interaction with a chef.

**Belongs here**

- Client portal and authenticated client dashboard
- Event visibility from the client perspective
- Quote review, acceptance, and payment
- Contract review and signing
- Menu review and approvals
- Client profile, household, preferences, rewards, and communication
- Client-side messaging, surveys, and post-event follow-up

**Must not live here**

- Internal prep details
- Costing and margin data
- Staffing and scheduling internals
- Platform-level support or moderation tools
- Chef-only notes, overrides, or intervention controls

**Boundary**

Client owns self-service, approvals, and visibility. A chef preview of the client experience is still a chef feature, not a client feature.

### Partner Surface

**Purpose**

External collaborator workspace for referral and relationship partners.

**Belongs here**

- Partner dashboard
- Partner profile and location management
- Referred event visibility that is scoped to the partner relationship
- Partner performance reporting
- Claim flow that converts a public invite into a partner-owned workspace
- Partner-specific collaboration that does not require access to chef operations

**Must not live here**

- Chef CRM
- Full client records
- Internal pricing, operational notes, or staff operations
- Platform-wide analytics
- Other partners' data

**Boundary**

Partner is not an internal operator role. Chef-facing management of partners belongs in chef. Partner-facing self-service belongs in partner.

### Admin Surface

**Purpose**

Internal mission control for platform staff.

**Belongs here**

- Cross-tenant oversight
- Platform analytics and observability
- System health, silent failure tracking, reconciliation, and debugging
- Feature flags and policy controls
- Moderation, support intervention, account suspension, and override tools
- Global catalogs, directory operations, and internal communications
- Admin preview and support instrumentation

**Must not live here**

- Normal tenant execution workflows
- Chef-facing settings as primary ownership
- Client self-service
- Partner self-service

**Boundary**

Admin is internal-only. If the feature can affect multiple tenants, inspect multiple tenants, or override tenant state, it belongs here.

## Roles

### Chef

**Can access**

- Public surface as any visitor
- Chef surface as the full operator
- Client or partner previews only when acting from chef or admin tools

**Should never see as a normal tenant role**

- Platform-only mission control
- Cross-tenant moderation and observability
- Internal admin-only control planes

**Differs from similar roles**

Chef is the tenant owner/operator. Chef can manage staff and partners, but chef is not staff and is not partner.

### Staff

**Can access**

- Restricted chef-surface workflows for execution
- Staff dashboard, tasks, station, schedule, recipe views, time tracking
- Temporary operational briefing links when explicitly shared

**Should never see**

- Tenant billing ownership controls
- Profit margins and owner finance
- Chef-only settings and strategy tools
- Platform admin tools
- Full client CRM or unrestricted record editing

**Differs from similar roles**

Staff is a constrained execution role. It is not a reduced chef account and should never inherit owner authority by convenience.

### Client

**Can access**

- Client portal
- Client-targeted public links for approvals, payments, surveys, and event visibility

**Should never see**

- Internal prep and staffing
- Chef-only notes and financial internals
- Other clients' information
- Platform admin tools

**Differs from similar roles**

Client is the customer relationship role. Client can approve and pay, but does not operate the business.

### Partner

**Can access**

- Partner surface
- Partner-targeted public claim or report links

**Should never see**

- Chef operations
- Unnecessary client PII
- Internal finance beyond partner-scoped reporting
- Platform admin tools

**Differs from similar roles**

Partner is an external collaborator. Partner can contribute referrals or location context, but is not staff and is not chef.

### Admin

**Can access**

- Admin surface
- Controlled preview of other surfaces for support and QA

**Should never see as the default working mode**

- Tenant workflows mixed into the primary admin information architecture

**Differs from similar roles**

Admin is platform authority, not tenant ownership. In implementation, admin access is persisted separately from tenant user-role rows, but for classification it is still a first-class system role.

## Surface Responsibilities

| Surface   | Primary actor                                 | Trust level | Allowed feature types                                          |
| --------- | --------------------------------------------- | ----------- | -------------------------------------------------------------- |
| `public`  | anonymous, prospective, invited external user | low         | marketing, discovery, intake, claim, public artifact delivery  |
| `chef`    | chef, staff                                   | high        | operations, execution, tenant configuration, internal CRM      |
| `client`  | client                                        | medium      | approvals, payment, self-service, visibility, client messaging |
| `partner` | partner                                       | medium      | referral collaboration, partner reporting, partner profiles    |
| `admin`   | admin                                         | very high   | cross-tenant control, observability, moderation, override      |

## Ownership Rules

### Domain ownership is not table ownership alone

A domain object can support multiple surfaces.

- `events` belong to chef for planning and execution
- `events` belong to client for visibility and approval
- `events` belong to partner only for scoped referral attribution
- `events` belong to admin only for oversight

The owning surface is determined by the actor's job, not by the table name.

### Delivery route is not always owning surface

Examples:

- A tokenized client page delivered from a public route is still a client-owned feature.
- A shared partner report delivered publicly is still a partner-owned feature.
- A public staff briefing link is still chef-owned because staff is a role inside chef operations.
- A chef preview of client experience remains chef-owned because the actor is chef.

## Current Architectural Risks

### 1. Admin tools are blended into the chef shell

Current admin pages run inside a chef-styled layout and shared navigation. That makes mission control look like a chef extension instead of a separate internal surface.

### 2. Admin enforcement is not centralized enough

Route policy knows about admin paths, but middleware currently does not perform explicit admin route gating. Protection relies on layout and server-action guards. That is functional, but structurally weaker than the other surface boundaries.

### 3. Partner ownership is split across chef, public, and partner delivery

Chef-side partner CRM exists, partner public reports exist, and partner authenticated pages exist. Without explicit ownership tagging, partner capabilities can be misclassified as chef or public features.

### 4. Staff boundary can collapse into chef-lite

Staff has its own restricted portal, but operational briefing links and chef-side staff tooling are both present. Without a strict rule set, staff can inherit chef responsibilities by accident.

### 5. Client surface is split between authenticated and token delivery

The system already has an authenticated client portal and tokenized client access. That is acceptable as delivery, but it must be treated as one client surface in the model.

### 6. Public routes are carrying non-public business interactions

Public routing currently delivers client, partner, and staff artifacts. Those routes are valid delivery mechanisms, but they should not redefine surface ownership.

### 7. Mission control lacks a hard structural boundary

Internal observability, flags, support, and reconciliation exist, but the information architecture still feels partially embedded in operator space instead of operating as a clean mission-control layer.

### 8. Auth-context mismatch

Middleware request auth context (`lib/auth/request-auth-context.ts`) currently only carries chef/client roles. Staff, partner, and admin are resolved downstream via separate helpers (`requireStaff`, `requirePartner`, `isAdmin`). This means surface-level middleware cannot make staff/partner/admin routing decisions. The middleware knows about staff and admin route families but cannot verify the role in the shared auth context header.

### 9. Terminology drift

Navigation and UI labels are inconsistent across surfaces:

- "Finance" vs "Money" vs "Financials" in different nav sections and page titles
- "My Profile" (chef settings) vs "Network Profile" (public chef profile)
- "Prospecting" vs "Leads" vs "Pipeline" in different contexts
- "Events" (operator view) vs "Bookings" (client view) for the same underlying entity
- "Culinary" (nav section) vs "Kitchen" (some page headers) for recipe/ingredient features

These are not bugs; they are classification signals. When a builder sees conflicting labels, the correct response is to record the label discrepancy in the feature placement, not to rename things in this spec.

## Lifecycle Ownership

One named business workflow spans multiple surfaces. The lifecycle stages are not owned by a single surface; ownership shifts as the workflow progresses:

| Lifecycle Stage      | Primary Surface | Roles Involved    | Notes                                             |
| -------------------- | --------------- | ----------------- | ------------------------------------------------- |
| Discovery            | public          | anonymous         | Chef profiles, directory, marketing pages         |
| Intake / Inquiry     | public -> chef  | anonymous -> chef | Public form submits; chef receives and triages    |
| Proposal / Quote     | chef -> client  | chef, client      | Chef drafts; client reviews and approves          |
| Booking / Payment    | client          | client, chef      | Client pays; chef confirms                        |
| Planning             | chef            | chef, staff       | Menus, recipes, prep timelines, shopping lists    |
| Execution            | chef            | chef, staff       | Day-of production, station assignments, temp logs |
| Close-out / AAR      | chef            | chef              | Financials, after-action review, leftover logging |
| Post-event follow-up | client          | client, chef      | Surveys, reviews, rebook prompts                  |
| Partner attribution  | partner         | partner           | Referral tracking, partner reporting              |

Key rules:

- A single feature like "quote" has at least two placements: chef (drafting) and client (review/approval).
- Staff participates in planning and execution but never owns those stages; the chef surface owns them with staff as a restricted role.
- Partner only appears for attribution and scoped reporting; partners never enter the core event lifecycle.
- Admin can observe any stage but does not own any lifecycle stage; admin ownership is cross-tenant oversight, not event execution.
- Token-delivered artifacts (proposal links, approval pages) shift `currentSurface` to public but `correctSurface` stays with the owning actor (chef for proposal drafting, client for approval).

## Target Architecture

### Public Surface

- Owns discovery, intake, anonymous trust-building, and controlled edge delivery
- Contains no tenant control plane logic
- Treat token delivery as a gateway, not as long-term ownership

### Chef Portal

- Owns business operations
- Contains two role lanes:
- `chef`: full tenant authority
- `staff`: restricted execution authority
- Keeps operator-side management of clients, partners, menus, finance, and operations

### Client Portal

- Owns ongoing client relationship workflows
- Absorbs client approvals, payments, household data, messaging, and event visibility
- May be delivered by authenticated pages or temporary token links, but the owning surface is still client

### Partner Surface

- Owns partner self-service and collaboration
- Receives partner reporting, location context, attribution visibility, and claim-to-account flows
- Stays distinct from chef-side partner management

### Admin / Mission Control

- Owns cross-tenant oversight and platform intervention
- Contains observability, moderation, support, feature flags, and system health
- Never depends on chef-surface placement for its identity

## What the Inventory Must Produce

Every feature in the inventory must be classifiable into this model:

```ts
type Surface = 'public' | 'chef' | 'client' | 'admin' | 'partner'
type Role = 'chef' | 'staff' | 'client' | 'partner' | 'admin'

type FeaturePlacement = {
  featureId: string
  currentSurface?: Surface
  correctSurface: Surface
  roles: Role[]
  exposure: 'visible' | 'hidden' | 'gated' | 'internal'
  notes?: string
}
```

`currentSurface` records where the feature is implemented today.

`correctSurface` records where it belongs architecturally.

If those values differ, the feature is misplaced or is using a temporary delivery path that should be called out explicitly.
