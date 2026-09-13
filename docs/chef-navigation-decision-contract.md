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

---

## Amendment 1 (2026-07-10): Tiered IA per the Rescue Blueprint

Filed per Section 13 of this contract. The study is `docs/discovery/2026-07-10-chefflow-rescue-blueprint.md`. This amendment records, in writing, the changes that blueprint makes to locked decisions:

1. **Inquiries joins the floor.** The Tier 0 door set is: Today (dashboard), Inbox, Inquiries, Quotes, Events, Calendar, Clients, Menus, Recipes, Culinary, Finance, Receipts. This supersedes "Pipeline is secondary" at the earlier decision in this contract.
2. **The word "Pipeline" is retired from the UI entirely.** The route `/inquiries` is labeled "Inquiries" on every surface. `/pipeline` becomes a redirect shell to `/inquiries`.
3. **The money door is labeled "Finance"** (as this contract already fixed). The current nav label "Money" is a drift defect and is corrected. Owner may veto at amendment review (blueprint open question 7).
4. **`/settings/modules` is the single module gallery.** `/features` and `/onboarding/features` become redirect shells into it in the same commit. Acceptance check preserving Principle 8 (the directory is sacred): the regrouped directory inside the gallery contains every one of the 474 existing links.
5. **Tables bottom tab (mobile):** moves behind the Labs flag pending owner sign-off (blueprint open question 4). The convergence thesis stays on record.
6. **The Six Pillars remain the completeness ledger; this contract's domains remain the IA.** They are not interchangeable.
7. **Module naming table:** the chef-facing module names and their slugs are recorded in Appendix A below (filled by the module vocabulary task).
8. **Tier vocabulary is internal.** The chef sees door names and module names only; "Tier", "Standard", "Labs", "Shell" never render in the UI.

### Appendix A: module vocabulary (filled by the module vocabulary task)

| Chef-facing name                                  | Billing slug | Sections it covers | Gate keys | Plan tier |
| ------------------------------------------------- | ------------ | ------------------ | --------- | --------- |
| (filled by lib/billing/modules.ts extension task) |              |                    |           |           |

---

## Amendment 2 (2026-09-12): The comfort model. Archetype gating, nothing removed

Filed from owner direction given 2026-09-12. Chefs he interviewed, including chefs he looks
up to, told him ChefFlow is far more than they need and that the interface is exhausting.
Several said they would not use it because there is too much going on at once.

The owner's correction, recorded as direction and not as interpretation:

- The app is not too big. The app is close to done and is probably already enough for most
  food operators, from a preschool kitchen to a caterer to a restaurant.
- The interface is the defect. Too much is shown at once.
- The fix is hiding, not deleting. Nothing is removed, nothing is pruned.
- Defaults come from the operator's archetype. If you are not a caterer, catering is off.
- Every hidden thing stays reachable and togglable by the chef, the way a phone ships with
  apps most people never open but anyone can open.
- The target is the most versatile, most customizable, most tailored experience of any tool
  in this category.

### Measured starting state, read-only audit, 2026-09-12

Audit scripts, gitignored, `scripts/scratch/audit-archetype-visibility.ts`,
`audit-proposed-archetypes.ts`, `audit-module-coverage.ts`. Run with
`node --import tsx <path>`. They import the live `nav-config`, `presets`, `surface-graph`
and `modules` and change nothing.

| Fact                                                             | Number                                                                         |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Chef sidebar entries as authored                                 | 654 entries, 470 unique routes                                                 |
| Nav groups                                                       | 13 groups plus 5 standalone top items plus 14 hidden groups                    |
| Largest groups                                                   | finance 77, culinary 69, clients 52, pipeline 51, operations 48, tools 39      |
| Modules defined in `lib/billing/modules.ts`                      | 13                                                                             |
| Modules each of the 6 archetypes enables today                   | 12 of 13, identical for all six                                                |
| Routes a brand-new chef sees                                     | 22 of 470                                                                      |
| Routes an established chef sees                                  | 458 of 470, identical for all six archetypes                                   |
| Routes no module toggle can ever hide                            | 99 (settings 23, studio 7, partners 6, import 4, remy 4, and 44 more segments) |
| Routes a private chef would see with a differentiated module set | 335 of 470                                                                     |

Read these four rows together, because they are the whole diagnosis:

1. **What exists today is a maturity ramp, not an archetype filter.** Visibility is driven by
   data presence. Day one the chef sees 22 routes and the app looks broken. The moment they
   have real data, 458 routes appear at once. Every chef the owner interviewed is in the
   second state. That is the exhaustion they described.
2. **The archetype picker is currently cosmetic.** All six archetypes share the same
   `ALWAYS_ON` list in `lib/archetypes/presets.ts`, which holds 12 of the 13 modules. The
   only real difference between a private chef and a restaurant today is 7 shortcut buttons
   and 5 mobile tabs.
3. **Module toggles cannot reach most of the app.** `findModuleForRoute` in
   `lib/surfaces/surface-graph.ts` maps first path segments to modules and covers 50 of them.
   99 routes have no owning module, so no toggle, preset or archetype can hide them.
4. **The wiring is already built and already correct.** `app/(chef)/layout.tsx` calls
   `resolveHiddenNavRoutes`, which calls the surface graph, which wraps all six visibility
   systems, and passes the result to `chef-nav.tsx` as `hiddenRoutes`. Nothing new needs to
   be invented. The data feeding it is empty.

### Binding decisions

1. **Nothing retires.** 470 stays 470. Cardinality lock applies: no route, section, module or
   nav entry may be deleted, merged away, sampled or reordered out of existence as part of
   comfort work. Hidden is a default, not a removal. Any diff that reduces the route
   inventory fails this amendment.
2. **Archetype presets must differentiate.** `ALWAYS_ON` in `lib/archetypes/presets.ts` is the
   named defect. It is replaced by a small always-on core plus a per-archetype set. Core:
   `dashboard`, `events`, `culinary`, `clients`, `finance`. Everything else is per archetype.
   Owner sets the per-archetype table; the audit script reports the resulting count per
   archetype so the table is chosen against numbers, not intuition.
3. **Every route gets exactly one owning module.** Section 2 of this contract already requires
   one owner per route for humans. This amendment makes it machine-readable: the
   route-to-module map must cover all 470 routes, so that every route is reachable by some
   toggle. Coverage is an acceptance number, not a goal: 470 of 470.
4. **The sidebar ships the 7 daily drivers plus one index.** Daily drivers, per
   `docs/WHERE-TO-IMPROVE.md`: dashboard, calendar, events, clients, menus, inbox, finance.
   Everything else lives behind the module gallery and contextual navigation. This is
   compatible with the Tier 0 door set in Amendment 1; the door set is the IA, the 7 drivers
   are what is persistent by default.
5. **Settings is the toggle surface, and both surfaces already exist.**
   `app/(chef)/settings/modules` is the module gallery and `app/(chef)/settings/navigation` is
   the nav customizer. The chef must be able to switch archetype, and to toggle any module on
   or off individually regardless of archetype, from there. An archetype is a starting set,
   never a lock.
6. **Archetype is not a plan and not a role.** It never gates billing and never gates
   permissions. It selects defaults only. Switching archetype must never destroy the chef's
   own toggles: an explicit chef choice outranks any preset, on switch and on every later
   preset change.

7. **The 99-row evidence table resolves without pruning.**
   `docs/audit/2026-09-12-chef-surface-evidence-table.md` has a blank Decision column per
   section. Under this amendment that column is not keep/demote/retire. It is
   `owning module` plus `default-on for which archetypes`. No row may be marked retire.
8. **The archetype list is owner-owned and open.** Six exist today: private chef, caterer,
   meal prep, restaurant, food truck, bakery. The owner's examples include operators none of
   these cover, such as a school or preschool kitchen, an institutional or mall food
   operation, and a teaching or consulting chef. New archetypes are additive: a new archetype
   adds a preset row and never adds a route or removes one.
9. **Tier vocabulary stays internal** per Amendment 1. Archetype names are chef-facing;
   "tier", "module", "gate" and "shell" are not.

### Acceptance for any implementation of this amendment

- Route inventory before equals route inventory after. 470 unique, counted programmatically.
- Route-to-module coverage reports 470 of 470 owned.
- The audit script prints a materially different visible count per archetype. Six identical
  numbers is a failed implementation.
- A chef can turn any hidden module back on from `settings/modules` in one interaction, and
  the sidebar reflects it without a sign-out.
- Switching archetype twice and back leaves the chef's explicit toggles intact.
- Screenshots at 375px and desktop, per archetype, before and after.

### Lifecycle state of this amendment

Decision recorded. Not implemented. No application code was changed when this was filed.
Execution is queued as `BQ-20260913T000000Z-archetype-comfort-model-chef-interface`.

Correction to the line above, same session: the queue item was created by
`build-queue.mjs add` and its real id is
`BQ-20260912T234820Z-archetype-comfort-model-for-the-chef-interface-hide-by-defau`, in
`.agents/build-queue/active/`. The placeholder id printed earlier in this amendment was
written before the item existed and is not a real queue id.
