# Chef Navigation Decision Contract

Status: approved decision layer for future navigation overhaul work  
Scope: chef-facing navigation system, contextual navigation, action surfaces, and admin/internal separation  
Purpose: convert completed research into binding structural decisions before any implementation or redesign

Basis:

- [chef-navigation-map.md](/c:/Users/david/Documents/CFv1/chef-navigation-map.md)
- [chef-navigation-normalization-plan.md](/c:/Users/david/Documents/CFv1/chef-navigation-normalization-plan.md)
- [chef-navigation-overhaul-research-brief.md](/c:/Users/david/Documents/CFv1/docs/chef-navigation-overhaul-research-brief.md)

This document is not a design proposal. It is the canonical structural contract that future navigation work must follow.

## Decision Priority

The following decisions are locked in this order:

1. Primary domains
2. Canonical ownership
3. Navigation layer assignment
4. Duplicate disposition
5. Route and label governance

No visual redesign, component rebuild, or implementation planning should proceed against a different order.

## 1. Primary Domain Set

The chef-facing primary navigation must be reduced to a small, stable set of top-level domains aligned to chef workflow.

Approved primary domains:

- Today
- Inbox
- Events
- Clients
- Culinary
- Finance

Interpretation:

- `Today` is the operational starting point for what needs attention now. It may map to the current dashboard/home construct.
- `Inbox` remains a first-class destination because message triage is a distinct chef behavior.
- `Events` is the canonical project/workflow domain.
- `Clients` is the canonical relationship domain.
- `Culinary` is the canonical menu/recipe/prep/reference execution domain.
- `Finance` is the canonical money/payments/invoices/reporting domain.

Primary domains explicitly not approved as top-level persistent navigation:

- Analytics
- Commerce
- Marketing
- Network
- Operations
- Pipeline
- Protection
- Supply Chain
- Tools
- Settings
- Admin
- Growth
- Dinner Circles

Disposition:

- These remain valid domains or surfaces, but they are not primary top-level navigation.
- They must live in secondary, contextual, action, or internal layers.

## 2. Canonical Ownership Rules

Every route must have exactly one owning domain.

Approved canonical ownership map:

- `Today`
  - `/dashboard`
  - global summary and cross-domain attention surfaces

- `Inbox`
  - `/inbox`
  - inbox triage and message-centric processing

- `Events`
  - event calendar
  - event status views
  - feedback/reviews tied to events
  - event creation flows
  - waitlist and event scheduling views

- `Clients`
  - client directory
  - client history
  - client insights
  - guest directory
  - loyalty
  - partner/referral relationships
  - client preferences and dietary references

- `Culinary`
  - menus
  - recipes
  - prep
  - costing tied to food/menu/recipe work
  - ingredients
  - substitutions
  - culinary vendor references

- `Finance`
  - payments
  - invoices
  - expenses
  - payouts
  - payroll
  - tax
  - financial reporting

- `Operations`
  - daily ops
  - staffing
  - tasks
  - station clipboards
  - travel/team operations

- `Pipeline`
  - inquiries
  - calls
  - leads
  - proposals
  - quotes
  - prospecting
  - contracts
  - marketplace capture/broadcast flows

- `Analytics`
  - analytics, intelligence, surveys, reporting not owned by a workflow domain

- `Commerce`
  - POS/register, commerce operations, product/commercial transaction systems

- `Marketing`
  - social, content, campaign, reputation, portfolio promotion surfaces

- `Network`
  - chef network, collaborations, community, community impact

- `Protection`
  - safety, insurance, incidents, business continuity, compliance-protection surfaces

- `Supply Chain`
  - inventory, procurement, purchase orders, audits, purveyors, waste, storage

- `Tools`
  - generic tools, imports, command utilities, help, non-domain-specific utilities

- `Settings`
  - system/account/profile/configuration surfaces

- `Admin`
  - all admin-only, internal, or system-management surfaces

Ownership constraints:

- A route may appear elsewhere, but its owner does not change.
- Contextual links do not create alternate owners.
- Action launchers do not create alternate owners.

## 3. Navigation Layer Assignment

Every navigation item must belong to exactly one primary layer.

Approved layers:

- `primary`
  - persistent chef-facing top-level workflow destinations

- `secondary`
  - lower-frequency domain/system destinations available from a global system index

- `contextual`
  - local subnavigation only visible within a domain, page, or workflow context

- `action`
  - create/launch/trigger items that start work but are not canonical destinations

- `internal`
  - admin-only, role-gated, or non-chef-facing routes

Binding assignment rules:

- `Today`, `Inbox`, `Events`, `Clients`, `Culinary`, `Finance` are `primary`
- `Operations`, `Pipeline`, `Analytics`, `Commerce`, `Marketing`, `Network`, `Protection`, `Supply Chain`, `Tools`, `Settings` are `secondary`
- page tabs, local filters, local section nav, and in-domain sibling navigation are `contextual`
- `New Event`, `New Quote`, `Add Client`, `Upload Menu`, `Add Expense`, similar launch items are `action`
- all `/admin/*` routes are `internal`

Explicit layer decisions for ambiguous current domains:

- `Operations` is secondary, not primary
- `Pipeline` is secondary, not primary
- `Network` is secondary, not primary
- `Growth` is not a standalone primary domain; it is absorbed by `Pipeline`, `Marketing`, and `Analytics`
- `Dinner Circles` is not a top-level primary domain; it belongs under `Marketing` or `Network` depending on route intent

## 4. Duplicate Disposition Rules

Duplicates are allowed only when the duplicate serves a different layer role.

Approved duplicate types:

- canonical destination + contextual shortcut
- canonical destination + action launcher
- canonical destination + internal/admin access

Disallowed duplicate types:

- canonical destination + another global destination of equal weight
- same route with multiple competing labels in the same global layer
- same label for multiple unrelated routes without a domain qualifier

Mandatory outcomes:

- Same route, multiple labels:
  - one label must become canonical
  - others must be merged or deprecated

- Same label, multiple routes:
  - one route keeps the unqualified label
  - the others must be renamed with domain-qualified specificity or marked internal

- Duplicate top-level entry points:
  - only one may remain primary
  - others must become contextual, action, secondary, or internal

## 5. Canonical Label Governance

One route gets one canonical label.

Binding rules:

- Labels must reflect user meaning, not implementation terms
- Labels must stay stable across surfaces unless the surface role is explicitly different
- If a route is the same, the default label should be the same
- If a label is reused for different routes, at least one instance must be renamed

Approved label policy examples:

- `Clients` stays the canonical label for the client home route
- `Events` stays the canonical label for the event home route
- `Finance` stays the canonical label for the finance home route
- `Today` replaces dashboard/home ambiguity at the conceptual level

## 6. Route Governance

One route must be treated as the canonical path for each major entity.

Approved canonical entity routes:

- Today -> `/dashboard`
- Inbox -> `/inbox`
- Events -> `/events`
- Clients -> `/clients`
- Culinary -> `/culinary`
- Finance -> `/financials`
- Operations -> `/operations`
- Pipeline -> `/inquiries`
- Analytics -> `/analytics/benchmarks`
- Commerce -> `/commerce`
- Marketing -> `/marketing`
- Network -> `/network`
- Protection -> `/settings/protection`
- Supply Chain -> `/inventory`
- Tools -> `/activity`
- Settings -> `/settings`
- Admin -> `/admin`

Notes:

- These are canonical access anchors, not the only valid routes in the domain.
- They are chosen to create one stable “home” per domain before redesign.

## 7. Settings Boundary Decision

Settings is not a feature index.

Binding decision:

- Settings owns configuration
- Settings does not own the canonical home for operational domains
- Domain-owned functionality currently reachable through settings remains configuration-only unless proven to be system/account setup

Implication:

- settings cards can continue as access paths during transition
- but they are not canonical homes for domain destinations

## 8. Admin Boundary Decision

Admin is a separate system.

Binding decision:

- admin routes are internal by default
- admin links must not shape the chef-facing primary IA
- admin duplication inside chef-visible surfaces must be treated as internal exceptions, not chef workflow structure

## 9. Orphan Route Decision

Known orphan routes require explicit ownership, but no automatic promotion.

Binding decisions:

- `/chef/cannabis/handbook` -> keep hidden/internal until ownership is justified
- `/chef/cannabis/rsvps` -> keep hidden/internal until ownership is justified
- `/prospecting/openclaw` -> keep hidden/internal under `Pipeline` until justified
- `/stations/orders/print` -> keep hidden/contextual under `Operations` until justified

No orphan route should be promoted into persistent navigation without a layer and ownership decision.

## 10. Unresolved Route Decision

Known unresolved target:

- `/social/compose`

Binding decision:

- treat as unresolved
- do not use it as a canonical route in any future IA proposal
- verify implementation before it is considered for promotion or merge decisions

## 11. What Future Work Is Allowed To Do

Future navigation work may:

- rearrange exposure layers
- consolidate duplicate labels
- move actions out of global navigation
- create a secondary system index
- shift local depth into contextual navigation
- remove top-level prominence from non-primary domains

Future navigation work may not:

- invent new domains without evidence
- create alternate canonical homes
- keep global duplicates without a role distinction
- blur admin and chef-facing IA
- treat settings as the home of workflow domains

## 12. Required Validation For Any Future Nav Proposal

Any proposed overhaul must prove:

- every major route has exactly one owner
- every primary item belongs to one of the approved primary domains
- every duplicate has a distinct role or is removed
- every action is separated from destination navigation
- every contextual item is visible only when relevant
- every internal route is isolated appropriately
- no unresolved route becomes canonical

## 13. Immediate Next Deliverable

The next artifact after this contract should be:

`chef-navigation-ia-options-study.md`

It should compare candidate information architectures against this contract, not against intuition.

Required evaluation criteria:

- compliance with primary domain set
- compliance with ownership rules
- compliance with layer assignment
- duplicate reduction quality
- contextual depth handling
- chef workflow alignment
- admin isolation

## Final Decision Statement

From this point forward, the ChefFlow navigation system is to be treated as:

- a small primary workflow navigation
- a controlled secondary system index
- a set of contextual local navigations
- a separate action layer
- a separate internal/admin layer

Every route has one home.  
Every concept has one canonical label.  
Every duplicate must justify its existence by role.  
Everything else is transitional debt.
