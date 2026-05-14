# Discovery Rail Role Portal Spec

> Status: product and implementation spec
> Date: 2026-05-13
> Scope: Define where the Discovery Rail lives across ChefFlow role portals, what each role can see/do, and how rail interactions become reusable food graph signals without crossing permission boundaries.

## Problem Statement

ChefFlow has a strong public Discovery Rail model, but the product is not one generic consumer app. ChefFlow is a chef-first operating system with multiple role-aware surfaces: public discovery, chef/operator workspace, client portal, guest token flows, staff execution views, partner/referral views, admin mission control, and background automation.

If the Discovery Rail is implemented as one global sidebar, it will create three product failures:

1. It will leak context across roles.
2. It will become decorative chrome instead of a food-decision system.
3. It will flatten different jobs into the same UI: consumer browsing, chef planning, client approval, guest preference capture, staff execution, partner handoff, admin governance, and system automation.

The Discovery Rail must instead become a role-specific presentation of a shared food signal engine.

## Solution

Implement a portal-aware Discovery Rail system with one shared signal layer and separate rail policies per role, portal, surface mode, and page context.

The rail should make every food interaction reusable, but only inside the correct boundary:

- Public and consumer discovery can collect broad taste, craving, occasion, location, chef, menu, and circle intent.
- Chef/operator surfaces can reuse food signals for menus, events, clients, recipes, sourcing, pricing, and retention.
- Client/host surfaces can reuse food signals for household preferences, event planning, menu approval, circles, and rebooking.
- Guest surfaces can collect narrow event-scoped dietary, RSVP, and feedback signals.
- Staff surfaces can expose execution signals, not consumer discovery.
- Partner surfaces can expose referral and fit signals, not private operations.
- Admin surfaces can expose governance and moderation signals, not a consumer rail.
- System automation can process and score signals, but should not render a visible rail.

## Current Repo Anchors

- `CONTEXT.md` defines Chef, Client, Guest, Staff Member, Partner, Admin, and System boundaries.
- `docs/discovery-rail-taxonomy.md` defines public lanes: Taste, Occasion, ChefFlow Picks, and Mobile Projection.
- `lib/interface/surface-governance.ts` defines portal surface modes: triage, planning, editing, reviewing, monitoring, configuring, browsing.
- Authenticated layouts publish `data-cf-portal` and `data-cf-surface` for chef, client, staff, partner, admin, and public shells.
- `lib/discovery/rail-contract-registry.ts` currently supports `public`, `guest`, `client`, `chef`, and `admin`, but not `staff`, `partner`, or `system`.
- `lib/discovery/discovery-destination-contract.ts` currently validates public discovery destinations and blocks private paths.
- `lib/discovery/source-policy.ts` correctly prohibits private ChefFlow data from powering public discovery.

## Goals

1. Define exactly where the Discovery Rail lives for each role.
2. Define whether it is persistent, contextual, collapsible, page-specific, hidden by default, or absent.
3. Define role-specific signal visibility.
4. Define role-specific rail actions.
5. Prevent cross-role and cross-tenant leakage.
6. Convert rail interactions into structured reusable food graph signals.
7. Preserve public discovery without forcing public UX patterns into private operator workflows.
8. Give engineers a policy interface that can be tested independently from UI components.

## Non-Goals

- Do not build a single global sidebar.
- Do not make public discovery read from private tenant data.
- Do not let saved discovery items automatically create inquiries, bookings, events, menus, or circles.
- Do not expose chef food cost, recipes, client details, guest details, or staff information outside their permission boundary.
- Do not replace existing navigation.
- Do not rename every rail surface to "Discovery Rail" in UI. Some contexts should use names like "Planning Signals", "Execution Signals", or "Governance Signals".

## Core Product Principle

The Discovery Rail is ChefFlow's food-decision nervous system. It is not generic UI chrome.

Every rail item must answer:

1. Who is the actor?
2. What portal and surface is the actor in?
3. What object is the actor acting on?
4. What signal is being shown?
5. What action is allowed?
6. What graph edge will be created, updated, or suppressed?
7. What must never be visible in this role context?

## Rail Item Lifecycle

Every rail item should move through a clear lifecycle. This prevents the rail from becoming a random recommendation feed.

Recommended lifecycle:

1. `candidate` - a possible signal exists, but has not passed policy, priority, or freshness checks.
2. `eligible` - the signal is valid for the actor, portal, surface, context, source policy, and permission boundary.
3. `shown` - the signal was rendered to the actor.
4. `acted_on` - the actor clicked, selected, hid, saved, pinned, locked, compared, shared, acknowledged, or flagged it.
5. `attached` - the signal was applied to a durable object such as Client, Household, Event, Menu, Recipe, Ingredient, Vendor, Circle, Partner, Listing, or Admin Case.
6. `learned` - the signal changed future scoring, preference memory, graph confidence, suppression, or recommendation behavior.
7. `expired` - the signal became stale and no longer deserves rail space.
8. `suppressed` - the signal was blocked by privacy, source policy, quality, user dismissal, admin moderation, or role mismatch.

Lifecycle rules:

- A rail item may render only after it reaches `eligible`.
- A rail item should record `shown` before user action is possible.
- A rail item should not become `learned` unless the action or outcome is meaningful.
- `hide`, `dismiss`, and admin suppression are learning events.
- Expired signals should remain auditable if they affected past recommendations.
- Suppressed signals should not be deleted when auditability matters.

## Signal Priority Model

The rail should not sort by novelty or engagement alone. ChefFlow is an operating system; urgency and safety come first.

Default priority order:

1. **Safety** - allergies, dietary conflicts, cross-contact risks, missing guest info, unsafe substitutions, food safety notes.
2. **Active event context** - today, tomorrow, this week, current inquiry, current event, current client, current menu, current station.
3. **Money impact** - pricing confidence, sourcing warnings, margin risk, deposit/final payment context, high-value repeat-client signals.
4. **Relationship impact** - VIP preferences, repeat-client history, rebooking opportunities, household memory, client trust signals.
5. **Operational friction** - missing prep, staff gaps, vendor uncertainty, station delays, equipment needs, unresolved decisions.
6. **Food fit** - cuisine, craving, menu item, recipe, ingredient, seasonal, technique, pairing, and service-style relevance.
7. **Discovery and exploration** - chef recommendations, restaurant/menu/library results, surprise items, stories, public browsing.

Tie-breakers:

- Prefer current object context over global context.
- Prefer explicit user input over inferred behavior.
- Prefer recent confirmed facts over stale patterns.
- Prefer high-confidence source data over weak scraped or inferred data.
- Prefer actionable items over informational items.
- Suppress anything that cannot be acted on, attached, learned from, or audited.

## Memory and Consent

The rail turns behavior into memory, so memory rules must be explicit.

### Remember Automatically

These may be remembered automatically inside the correct scope:

- anonymous public rail clicks as anonymous/session discovery signals
- authenticated client saves, hides, pins, and compares
- chef actions attaching signals to client, event, menu, recipe, vendor, or circle
- staff execution acknowledgements, substitutions, shortages, and allergen flags
- partner referral and handoff actions
- admin moderation and taxonomy decisions
- system-computed freshness, confidence, and suppression state

### Require Explicit Confirmation

These require explicit confirmation before becoming durable profile memory:

- client or guest allergies
- client or guest dietary restrictions
- household-level preferences inferred from one person
- health-sensitive or religion-sensitive food constraints
- guest preferences promoted into client/household memory
- inferred budget comfort attached to a named client
- any signal that changes what the chef sees on future events

### Editable and Deletable Memory

Clients should be able to review, edit, or delete:

- saved cuisines
- saved chefs
- saved menu items
- preference tags
- household dietary notes
- disliked/hidden discovery items
- discovery history where privacy policy allows

Guests should be able to correct their own RSVP, allergy, dietary, and feedback inputs while the event token remains valid.

Chefs should be able to edit or detach signals from their own tenant objects. They should not be able to silently change a client's self-declared allergy into a weaker preference.

### Expiry Rules

Recommended defaults:

- anonymous public recents: short-lived
- public browsing preferences: durable only after save, pin, long dwell, or repeat behavior
- event planning signals: expire or demote after event closeout unless attached
- guest token signals: remain event-scoped; aggregate only where allowed
- staff execution signals: remain attached to event AAR, station history, and operational improvement
- partner referral signals: persist with referral/event attribution
- admin governance signals: persist for audit

## Bad Rail Examples

These are explicit anti-patterns. They should fail product review.

- Showing "You may also like Italian" beside staff station tasks.
- Showing chef recommendations inside admin audit pages.
- Showing public discovery items on private event execution pages unless they are attached to the event.
- Showing guest-specific dietary data to other guests.
- Showing a client rail item that reveals chef margin, food cost, vendor price, or staff pay.
- Showing a partner rail item that exposes private event notes or client PII beyond consent.
- Showing a chef rail item from another chef's private tenant data.
- Showing an admin rail item as consumer-style personalization instead of governance/inspection.
- Showing a rail item with no allowed action, graph write, audit value, or suppression reason.
- Letting a saved item automatically create an inquiry, booking, event, menu, or circle.
- Letting public discovery use private recipes, costing, private menus, or internal event records.
- Passing tenant id, event id, client id, staff id, or partner id as authoritative client-submitted rail state.

## Recommended Architecture

### Deep Module 1: Rail Policy Resolver

Create a pure policy module that resolves rail behavior from role, portal, surface mode, path, and optional object context.

Inputs:

- actor role
- portal
- surface mode
- pathname
- tenant id if authenticated
- event id if scoped
- client id if scoped
- guest token context if tokenized
- partner id if partner-scoped
- admin support mode if admin-scoped

Output:

- rail visibility: `none`, `hidden_by_default`, `page_specific`, `contextual`, `persistent`
- rail placement: `right_rail`, `inline_panel`, `bottom_sheet`, `modal_drawer`, `admin_inspector`, `none`
- signal families allowed
- actions allowed
- destinations allowed
- graph write scope
- privacy guards required

This should be testable without rendering React.

### Deep Module 2: Signal Visibility Guard

Create a guard that filters candidate signals before UI receives them.

It must enforce:

- tenant isolation for chef/operator data
- event membership for clients, guests, and staff
- partner assignment for referral/partner data
- admin governance mode for cross-tenant inspection
- token scope for public guest/client tokenized pages
- source policy for public discovery

No UI component should decide whether a private signal is safe.

### Deep Module 3: Food Graph Signal Writer

Create a normalized writer for rail interactions.

Each interaction should persist:

- actor type
- actor id or anonymous/session id
- portal
- surface mode
- source context
- object scope
- item type
- item value
- action
- visibility
- provenance
- created timestamp

Actions should include: impression, click, select, save, pin, hide, dismiss, compare, share, lock, attach, apply_to_event, apply_to_client, apply_to_menu, flag_issue, acknowledge, approve, quarantine.

### Deep Module 4: Role Rail Presenters

Build separate presentation adapters for:

- public/consumer discovery rail
- chef/operator planning rail
- client/host planning rail
- guest event rail
- staff execution rail
- partner handoff rail
- admin governance rail

These presenters may share primitives but must not share one role-blind component contract.

## Role Rules

## 1. Chef / Operator

### Should See Rail

Yes. This is the richest rail and the only one that should approach a persistent app-level rail.

### Placement

Place as a right-side contextual rail in the authenticated operator workspace.

Primary placements:

- `/dashboard`
- `/daily`
- `/inquiries`
- `/inquiries/[id]`
- `/clients`
- `/clients/[id]`
- `/events`
- `/events/[id]`
- `/menus`
- `/menus/[id]`
- `/recipes`
- `/culinary`
- `/culinary/price-catalog`
- `/network`
- `/my-kitchen`
- `/shopping`

### Persistence

- Persistent on triage and planning surfaces.
- Collapsible on reviewing surfaces.
- Hidden by default on editing surfaces.
- Hidden on immersive menu editor, kitchen execution, and welcome/onboarding unless explicitly opened.
- Mobile should use a bottom sheet, not a second sidebar.

### Signals

Allowed:

- client preferences
- household preferences
- guest dietary rollups
- event occasion and service style
- inquiry intent
- saved dishes
- saved menu patterns
- reusable menu items
- recipe/library matches
- seasonal ingredient signals
- price confidence and sourcing signals
- vendor availability signals
- dinner circle activity
- chef network recommendations
- public discovery performance
- past event outcomes
- post-event feedback themes
- unmet client cravings
- repeat-client rebooking signals

### Actions

Allowed:

- save signal
- pin signal
- hide signal
- attach to client
- attach to event
- attach to menu
- create menu draft
- create dish idea
- convert inquiry signal to quote context
- add ingredient to sourcing list
- open related recipe/menu/client/event
- ask Remy to summarize
- create circle or add to circle
- compare menu/chef/vendor candidates
- mark signal as resolved

### Never Show

- another chef tenant's private recipes
- another chef tenant's food cost
- another chef tenant's client list
- private data from unrelated clients
- identifiable guest dietary information outside assigned event context
- staff pay details unless the chef is on an owner/finance surface with permission
- admin-only moderation state
- raw system internals or hidden OpenClaw names in user-facing UI

### Privacy Boundary

All chef rail reads must derive tenant from session, never from request body or query string. Internal rail URLs must use server-authorized entity references, not public query params containing private UUIDs.

### Food Graph Contribution

Chef interactions write tenant-scoped graph edges:

- client likes dish
- event needs cuisine/style
- menu contains reusable signal
- recipe satisfies dietary constraint
- vendor supports ingredient
- inquiry implies occasion/craving/budget
- completed event validates or weakens a recommendation

## 2. Client / Host

### Should See Rail

Yes, but only as a contextual planning rail.

### Placement

Place inside the client portal on:

- `/my-hub`
- `/my-events`
- `/my-events/[id]`
- `/my-events/[id]/choose-menu`
- `/my-events/[id]/approve-menu`
- `/book-now`
- `/my-preferences/discovery`
- `/my-hub/g/[groupToken]`
- `/my-hub/g/[groupToken]/meal-board`

### Persistence

- Contextual and collapsible.
- Visible by default only on planning and browsing surfaces.
- Hidden by default on spending, documents, receipts, account, profile deletion, help, notifications.
- Mobile should render as a planning drawer or bottom sheet.

### Signals

Allowed:

- own preferences
- household preferences
- saved chefs
- saved cuisines
- saved menu items
- dietary needs
- event menu options
- guest dietary aggregate where host has permission
- active event timeline
- circle intent
- rebooking prompts
- gift card/reward relevance
- past event history with this client
- public chef recommendations

### Actions

Allowed:

- save
- pin
- hide
- compare chefs or menu options
- send preference to chef
- lock dietary constraint
- invite guests
- add item to circle
- start rebooking
- approve or request menu revision where the page already permits it
- update household preference

### Never Show

- chef food cost
- chef margin
- internal recipes
- staff notes
- private chef notes
- other clients
- other households
- named guest dietary details unless explicitly host-visible
- admin moderation state
- private sourcing/vendor data

### Privacy Boundary

Client rail data must be scoped by authenticated client identity and event/client relationship. A client can see their own event context and household context, but not the chef's operating layer.

### Food Graph Contribution

Client interactions write client and household-scoped graph edges:

- client likes cuisine
- household avoids ingredient
- event host prefers service style
- circle shortlisted menu
- client rebooked from prior signal

## 3. Guest

### Should See Rail

Yes, narrowly. The guest version should not feel like a sidebar. It is a lightweight event preference collector.

### Placement

Place only in tokenized or event-scoped guest flows:

- RSVP portal
- dietary form
- countdown page
- menu preview when chef/client has shared it
- feedback page
- kiosk guest flows
- public event guest token pages

### Persistence

- Page-specific.
- Never persistent across the app.
- Hidden after the guest completes the required action unless optional follow-up is useful.

### Signals

Allowed:

- own RSVP
- own dietary needs
- own allergies
- own preferences
- own menu reactions
- event arrival/timing instructions
- chef/client-approved menu context
- own feedback

### Actions

Allowed:

- RSVP
- submit allergy
- submit preference
- react to shared menu item
- ask question
- leave feedback
- consent to photos
- save public chef/menu if authenticated or later converted to client context

### Never Show

- client payment details
- quote details
- chef internal notes
- staff notes
- other guest dietary details
- full guest list unless explicitly shared
- private event records
- tenant IDs or event IDs in unsafe URLs

### Privacy Boundary

Guest rail must be token-scoped. Tokens authorize only the event and guest fields explicitly needed for the guest flow.

### Food Graph Contribution

Guest interactions write event-guest scoped signals. Aggregation into chef or client preference summaries must remove unauthorized identity detail.

## 4. Staff Member

### Should See Rail

Yes, but it should be framed as an Execution Signal Rail, not consumer discovery.

### Placement

Place on:

- `/staff-dashboard`
- `/staff-station`
- `/staff-tasks`
- `/staff-schedule`
- `/staff-recipes`
- chef-side station/service views where staff context is active

### Persistence

- Persistent during station/service mode.
- Contextual on task/schedule pages.
- Hidden on time review unless a discrepancy or event context exists.

### Signals

Allowed:

- assigned event menu items
- assigned station tasks
- prep components
- timing changes
- guest count
- allergen flags
- substitution notes
- packing needs
- equipment needs
- service-day changes
- chef-approved recipe/prep instructions

### Actions

Allowed:

- acknowledge update
- mark task complete
- flag shortage
- flag allergen concern
- log substitution
- add station note
- request chef review
- start/stop task timer where allowed

### Never Show

- client spend
- quotes
- invoices
- profit
- chef business analytics
- unrelated events
- private client history
- named guest details beyond operational need
- staff pay for other workers
- admin moderation state

### Privacy Boundary

Staff rail data must be limited to assigned events, assigned stations, and role permissions. Staff should not infer client wealth, chef margin, or private relationship notes from food signals.

### Food Graph Contribution

Staff interactions write execution signals:

- prep completed
- ingredient shortage
- substitution used
- allergen concern raised
- menu item caused service friction
- station timing drifted

## 5. Partner / Referral Partner

### Should See Rail

Yes, narrowly.

### Placement

Place as a compact contextual panel on:

- `/partner/dashboard`
- `/partner/events`
- `/partner/preview`
- partner report/token pages
- partner location pages only when showing public listing impact

### Persistence

- Hidden by default.
- Contextual on dashboard/events.
- Page-specific on preview/report pages.
- Do not create a persistent partner sidebar rail.

### Signals

Allowed:

- referral status
- public chef/listing metadata
- location fit
- venue fit
- service type fit
- partner-attributed inquiries
- partner-attributed events
- public menu/listing tags
- handoff status
- conversion summaries where allowed

### Actions

Allowed:

- submit referral
- share chef/listing
- recommend chef
- recommend venue/location
- update public location metadata
- annotate handoff
- view conversion status
- request correction

### Never Show

- chef private operations
- client PII beyond consent
- guest dietary details
- food cost
- private menus
- recipes
- internal event notes
- other partners' pipelines
- admin moderation internals

### Privacy Boundary

Partner rail must be scoped by partner account and explicit relationship to chef, event, referral, or location. Partner access is read-mostly and should not become a backdoor into tenant operations.

### Food Graph Contribution

Partner interactions write attribution and fit signals:

- referral source
- venue fit
- partner-introduced event
- public listing correction
- chef/service match
- geographic service fit

## 6. Platform Admin

### Should See Rail

Yes, but only as governance and inspection tooling.

### Placement

Place as a hidden-by-default admin inspector on:

- `/admin/directory`
- `/admin/directory-listings`
- `/admin/inquiries`
- `/admin/events`
- `/admin/hub`
- `/admin/price-catalog`
- `/admin/feedback`
- `/admin/command-center`
- `/admin/analytics`
- `/admin/users/[chefId]`

### Persistence

- Hidden by default.
- Opened intentionally as an inspector.
- Persistent only inside admin command center or monitoring views.

### Signals

Allowed:

- public-source provenance
- suppressed discovery items
- quarantined listings
- taxonomy gaps
- duplicate signals
- rail analytics
- cross-tenant aggregate trends
- quality warnings
- public profile completeness
- support context
- source freshness
- moderation queue state

### Actions

Allowed:

- inspect
- quarantine
- approve
- suppress
- feature/unfeature
- correct taxonomy
- inspect sanitized graph path
- rerun scoring
- resolve source policy issue
- view audit trail

### Never Show

- private tenant content as a decorative discovery rail
- private recipes unless explicit support/admin inspection requires it
- client or guest PII without admin purpose
- raw secrets
- payment method details
- unredacted tokens

### Privacy Boundary

Admin rail must distinguish normal governance mode from explicit support/break-glass inspection. Break-glass access must be audited with admin id, target entity, reason, timestamp, and data class.

### Food Graph Contribution

Admin interactions write governance metadata:

- source approved
- source suppressed
- taxonomy corrected
- duplicate merged
- listing quarantined
- recommendation demoted
- public claim verified

## 7. System / Automation

### Should See Rail

No visible rail.

### Placement

None. The system powers the rail through APIs, scheduled jobs, webhooks, Remy, pricing, ranking, dedupe, and privacy filters.

### Persistence

Always-on background processing. No UI.

### Signals

Processed:

- discovery interactions
- saves
- pins
- dismissals
- inquiries
- quote outcomes
- event outcomes
- menu approvals
- guest dietary inputs
- circle activity
- sourcing data
- price confidence
- feedback
- stale signals

### Actions

Allowed:

- normalize
- dedupe
- score
- aggregate
- suppress
- expire
- recommend
- audit
- enforce visibility
- compute next-best rail items

### Never Do

- expose private data to public discovery
- create booking/event/menu/circle from a save alone
- infer sensitive identity across scopes
- leak tenant IDs in public URLs
- bypass source policy
- bypass role policy

### Privacy Boundary

System jobs must fail closed. If actor, tenant, token, partner, or provenance cannot be resolved, the signal should be suppressed or stored as internal-only pending review.

### Food Graph Contribution

System actions maintain graph health:

- freshness
- confidence
- provenance
- suppression state
- dedupe links
- aggregate summaries
- recommendation scores

## Placement Matrix

| Role            | Should See Rail | Primary Placement                | Behavior                                                                                       |
| --------------- | --------------- | -------------------------------- | ---------------------------------------------------------------------------------------------- |
| Chef / Operator | Yes             | Operator workspace right rail    | Persistent in triage/planning, collapsible in reviewing, hidden in immersive execution/editing |
| Client / Host   | Yes             | Client planning/event pages      | Contextual, collapsible, hidden on finance/account/help pages                                  |
| Guest           | Yes             | Tokenized event pages            | Page-specific, lightweight, never persistent                                                   |
| Staff Member    | Yes             | Staff station/tasks/schedule     | Execution rail, persistent only during station/service mode                                    |
| Partner         | Yes             | Partner dashboard/events/reports | Compact contextual panel, hidden by default                                                    |
| Admin           | Yes             | Admin inspector                  | Hidden by default, governance-focused                                                          |
| System          | No              | Background jobs/APIs             | No UI                                                                                          |

## Permission Rules

1. Actor identity must come from session, token, partner assignment, or admin guard.
2. Tenant id must never be trusted from client input.
3. Public discovery may use only public, operator-controlled, partner-authorized, or policy-approved attributed data.
4. Chef private data may power only chef/operator rails inside that tenant.
5. Client data may power only the owning client/household/event context and chef tenant views where the chef owns the relationship.
6. Guest data may power only event guest flows and approved aggregate rollups.
7. Staff data may power only assigned event execution contexts.
8. Partner data may power only partner-attributed referrals, locations, and public metadata.
9. Admin cross-tenant visibility must be governance-only by default and audited when sensitive.
10. System automation must fail closed when provenance or scope is ambiguous.

## Data Model Recommendations

Use a normalized signal model rather than role-specific ad hoc tables where possible.

Recommended canonical fields:

- `id`
- `actor_type`
- `actor_id`
- `portal`
- `surface_mode`
- `tenant_id`
- `scope_type`
- `scope_id`
- `source_type`
- `source_id`
- `item_type`
- `item_value`
- `item_label`
- `action`
- `visibility`
- `provenance`
- `confidence`
- `metadata`
- `created_at`
- `expires_at`

Recommended `actor_type` values:

- `anonymous`
- `chef`
- `client`
- `guest`
- `staff`
- `partner`
- `admin`
- `system`

Recommended `scope_type` values:

- `public_session`
- `tenant`
- `client`
- `household`
- `guest`
- `event`
- `menu`
- `recipe`
- `ingredient`
- `vendor`
- `circle`
- `partner`
- `listing`
- `admin_case`

Recommended `visibility` values:

- `public`
- `authenticated_consumer`
- `client_private`
- `household_private`
- `event_guest_private`
- `event_aggregate`
- `staff_assigned`
- `chef_private`
- `partner_scoped`
- `admin_governance`
- `internal_only`
- `suppressed`

## API Contract Recommendations

Create read endpoints or server actions that return already-filtered rail state.

Recommended read contract:

- request: role, portal, path, optional context reference
- response: rail policy, sections, items, allowed actions, analytics context

Recommended mutation contract:

- request: item id or inline item payload, action, context
- server resolves actor and permissions
- server validates action and graph write
- response returns updated rail item state and graph mutation summary

Never let the client submit tenant id as the authority for a rail mutation.

## Rail Item Contract

A rail item should include:

- stable id
- item type
- label
- short supporting reason
- source/provenance label
- confidence level
- destination
- allowed actions
- visibility
- scope
- graph write preview

Rail items should not include:

- private IDs in public URLs
- hidden metadata needed only by server
- raw PII
- raw tokens
- unfiltered internal notes
- private cost data unless inside chef finance context

## UX Rules

1. Rail copy should name the signal, not explain the feature.
2. The rail should never compete with primary page work.
3. Persistent rail is chef-only by default.
4. Guest rail must be fast enough for 2-minute flows.
5. Staff rail must prioritize action and clarity over discovery/browsing.
6. Admin rail must look like an inspector, not a consumer recommendation surface.
7. Mobile rail should be a bottom sheet or contextual drawer.
8. Empty rails should collapse instead of showing decorative placeholders.
9. Every rail item must have a reason and a valid action or be suppressed.
10. A rail item without graph value should not render.

## User Stories

1. As a chef, I want client taste signals beside an inquiry, so that I can quote and propose without rereading every message.
2. As a chef, I want past menu outcomes beside a new event, so that I do not repeat weak dishes or miss proven winners.
3. As a chef, I want seasonal and price signals beside menu planning, so that my menus reflect availability and margin.
4. As a chef, I want guest dietary rollups beside an event, so that I can plan safely without seeing unnecessary guest details.
5. As a chef, I want to attach a craving signal to a menu, so that client intent becomes reusable.
6. As a chef, I want to hide irrelevant rail signals, so that the system learns what not to suggest.
7. As a client, I want saved preferences in my event planning page, so that my chef sees what matters.
8. As a client, I want to compare menu options, so that approval feels confident instead of scattered.
9. As a client, I want household dietary needs to carry forward, so that repeat bookings do not restart from zero.
10. As a guest, I want to submit allergies quickly, so that the chef can plan safely.
11. As a guest, I want to react to a shared menu item, so that my preference can inform the event without exposing unrelated data.
12. As a staff member, I want allergen and prep signals beside station tasks, so that I know what needs care during execution.
13. As a staff member, I want to flag a shortage from the rail, so that the chef sees the operational issue in context.
14. As a partner, I want referral and venue-fit signals, so that I can understand whether my handoff is working.
15. As a partner, I want only public or consented data, so that I do not become a privacy risk.
16. As an admin, I want to inspect suppressed discovery items, so that I can govern quality without browsing private operations.
17. As an admin, I want source provenance visible, so that I know which public claims are safe.
18. As the system, I want to score and suppress stale signals, so that recommendations stay useful.
19. As the system, I want to fail closed when scope is ambiguous, so that privacy is preserved.
20. As ChefFlow, I want every rail action to create a graph signal, so that the rail becomes infrastructure instead of decoration.

## Implementation Plan

### MVP Vertical Slice

Build the first version only on chef inquiry detail and chef event detail. This proves the rail as operator infrastructure before expanding across all portals.

MVP pages:

- inquiry detail
- event detail

MVP signals:

- inquiry intent
- client preferences
- household preferences where confirmed
- guest dietary aggregate
- saved menu ideas
- relevant past menu/event outcomes
- price confidence warnings
- sourcing warnings

MVP actions:

- attach to client
- attach to event
- attach to menu draft
- hide/dismiss
- pin
- ask Remy to summarize

MVP privacy rules:

- tenant comes from session only
- no public routes receive private IDs
- guest dietary data is aggregate unless the chef already has event-level permission to see named guest records
- client/household memory is not updated from inferred signals without confirmation

MVP done means:

- a chef can open an inquiry or event and see scoped food signals
- the chef can attach useful signals to durable objects
- hidden/dismissed signals affect future rail scoring
- every action writes a structured graph signal
- wrong-tenant, wrong-role, and private-ID-leak tests pass

### Phase 1: Policy Foundation

- Add staff, partner, and system to the discovery actor model or create a new multi-portal rail actor model.
- Add a rail policy resolver keyed by role, portal, surface mode, path, and context.
- Add tests for each role and surface mode.
- Keep existing public Discovery Rail behavior unchanged.

### Phase 2: Visibility and Source Guards

- Add signal visibility guard.
- Enforce tenant/session/token/partner/admin boundaries.
- Extend source policy checks so private data cannot cross into public discovery.
- Add tests for public/private leakage, wrong tenant, wrong event, wrong partner, wrong staff assignment, and admin governance mode.

### Phase 3: Chef Operator Rail

- Build chef rail presenter.
- Start on dashboard, inquiry detail, event detail, menu planning, client detail, and culinary/price-catalog pages.
- Support attach-to-client, attach-to-event, attach-to-menu, save, hide, and ask-Remy actions.

### Phase 4: Client and Guest Rails

- Build client planning rail.
- Build guest token rail.
- Wire household, event, menu approval, circle, RSVP, dietary, and feedback signals.
- Keep guest flows fast and page-specific.

### Phase 5: Staff and Partner Rails

- Build staff execution rail.
- Build partner handoff rail.
- Enforce assignment and partner scoping.
- Add action logging for execution and referral signals.

### Phase 6: Admin Governance Rail

- Build admin inspector.
- Wire provenance, suppression, quarantine, scoring, and taxonomy controls.
- Add break-glass audit flow for sensitive inspection.

### Phase 7: Signal Graph Hardening

- Normalize graph writes across all rails.
- Add freshness, confidence, provenance, and expiry.
- Add analytics readouts and pruning rules.
- Add data export/visibility audit where relevant.

## Testing Decisions

Good tests should verify external behavior and policy outcomes, not component internals.

Required test groups:

- policy resolver tests for every role
- destination contract tests for public vs private rail destinations
- source policy tests for public discovery
- signal visibility tests for tenant/event/client/staff/partner/admin boundaries
- mutation tests for allowed and forbidden rail actions
- graph writer tests for scope and visibility
- regression tests for private identifier leakage
- admin break-glass audit tests
- guest token scope tests
- staff assignment scope tests

Existing test style to follow:

- discovery rail contract tests
- discovery destination contract tests
- source policy tests
- multi-role wrong-context contract tests
- hub/member permission tests
- middleware route policy tests

## Acceptance Criteria

1. Each role has an explicit rail policy.
2. No role uses a global generic rail by default.
3. Chef rail is persistent only where operator work benefits from it.
4. Client rail is contextual and does not expose chef operations.
5. Guest rail is token-scoped and page-specific.
6. Staff rail exposes execution signals only for assigned work.
7. Partner rail exposes referral/public fit signals only.
8. Admin rail is governance-focused and hidden by default.
9. System has no UI rail.
10. Public discovery cannot render private ChefFlow data.
11. Private IDs are not leaked in public rail destinations.
12. Every rail action writes or updates a structured signal, or it is not rendered.
13. Ambiguous scope fails closed.
14. Tests cover every role boundary.
15. Every rendered rail item has a lifecycle state.
16. Rail sorting follows the signal priority model.
17. Memory rules distinguish automatic learning from explicit confirmation.
18. MVP ships as a narrow chef inquiry/event slice before broad portal rollout.

## Open Questions

1. Should chef-side rail be user-configurable by workspace density, or only by surface mode?
2. Should client household preferences be shared with chef automatically after booking, or only after explicit client confirmation?
3. Should guest menu reactions be visible to hosts individually, aggregated, or only visible to the chef?
4. Should partner rails support commission/revenue visibility, or only conversion status?
5. What admin actions require break-glass versus ordinary governance permission?
6. Should the rail graph live in existing discovery tables or a new generalized food signal table?
7. How long should stale signals persist before demotion or expiry?
8. Which memory categories should be user-exportable in account settings?
9. Which signal types should require human confirmation before Remy can use them in a draft?

## Rollout Recommendation

Start with the policy resolver and tests before UI. Then ship Chef Operator Rail first, because ChefFlow is operator-first and that rail has the highest business value. After that, add Client/Guest planning and preference capture, then Staff execution, then Partner/Admin governance.

The first production milestone should not be "a rail appears everywhere." It should be:

> Chef inquiry and event pages can surface scoped, reusable food signals and attach them safely to client, event, and menu context without leaking data across roles.
