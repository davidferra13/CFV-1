# Staff Trust And Delegation System Foundation Domain Contract

Date: 2026-05-21

Queue item: `BQ-20260520T183100Z-chef-life-staff-trust-and-delegation-system-foundation`

Source preserved: `docs/specs/chef-life-expansion-swarm-spec-pack.md` remains the swarm prompt source of truth. This document is the fired foundation contract for later Staff Trust and Delegation System slices.

## Goal

Define the smallest compatible Staff Trust and Delegation System contract without creating a duplicate staff roster, vendor system, delegate-access system, task engine, shift scheduler, staff portal, onboarding checklist, or performance board. The contract composes current ChefFlow staff, vendor, collaborator, delegate, event, assignment, task, training, and post-event sources into one chef-owned trust and assignment model.

## Fire-Time Inspection

Inspected existing staff/delegation-adjacent files and modules:

- `docs/specs/chef-life-expansion-swarm-spec-pack.md`: Program 9 source thesis, domain model, swarm prompt, and acceptance criteria.
- `docs/specs/staff-ops-unified-workflow.md`: existing built workflow that connects event staff assignments, tasks, staff portal context, and notification direction.
- `docs/specs/delegate-access.md`: existing delegate role and permission language for assistants/coordinators who are not staff members.
- `lib/staff/actions.ts`: chef-owned staff roster, event staff assignment, hours, pay, portal-login, and tenant-scoped server action patterns.
- `lib/staff/task-assignment-actions.ts` and `lib/staff/task-assignment-types.ts`: existing `staff_tasks` task board and shift workload model.
- `lib/staff/staffing-actions.ts`, `staff-scheduling-actions.ts`, and `dashboard-actions.ts`: event staffing planner, shifts, availability, and dashboard signals.
- `lib/staff/staff-portal-actions.ts` and `lib/staff/staff-event-portal-actions.ts`: staff-auth and token-scoped staff event views.
- `lib/staff/onboarding-actions.ts` and `onboarding-constants.ts`: existing training/onboarding checklist storage and summaries.
- `lib/staff/performance-actions.ts`: existing staff performance score computation from assignment history.
- `lib/events/collaborator-actions.ts`: event collaborator profile, role, split, status, and chef-owned event collaboration model.
- `lib/delegation/delegate-types.ts` and `delegate-actions.ts`: existing chef delegates, permissions, status, invite tokens, and activity log.
- `lib/vendors/*`, especially `scorecard-actions.ts`, `vendor-actions.ts`, `vendor-communication-actions.ts`, and `vendor_event_assignments`: existing vendor profile, scorecard, event assignment, and communication owners.
- `lib/events/day-of-checklist-actions.ts`, `generate-pre-service-checklist.ts`, and event staff/collaborator panels: current event execution and briefing inputs.
- Migrations for `staff_members`, `event_staff_assignments`, `staff_onboarding_items`, `staff_tasks`, `shift_assignments`, `staff_event_tokens`, `vendor_event_assignments`, `event_collaborators`, `chef_delegates`, and performance/onboarding additions.
- `lib/auth/get-user.ts` and `lib/auth/route-policy.ts`: route/action auth and role-boundary patterns for future implementation.

## No-Duplicate-System Decision

Do not add persistence in this foundation slice. The initial Staff Trust and Delegation System must treat existing storage as source inputs:

- `staff_members`: chef-owned roster, contact, role, status, rates, staff type, certifications/notes fields where available.
- `event_staff_assignments`: event-specific staff role, rate, scheduled/actual hours, status, ratings, and assignment history.
- `staff_tasks`: event/general staff task board with assignee, event linkage, priority, status, and due time.
- `shift_assignments`: shift/workload schedule for staff scheduling and availability.
- `staff_onboarding_items`: training, agreements, certification, code-of-conduct, and readiness checklist source.
- `staff_performance_scores`: computed performance/reliability board.
- `staff_event_tokens`: token-scoped event briefing access for staff.
- `event_collaborators`: multi-chef/collaborator event role, station, split, and status records.
- `vendor_event_assignments`, `vendors`, vendor scorecards, vendor communication, and vendor invoice/order modules: vendor-side assignment and reliability inputs.
- `chef_delegates`: assistant/delegate invite, permissions, lifecycle, and activity source.
- `events`, event day-of checklist, pre-service checklist, loadout, communications, calendar, compliance, crisis/recovery, and post-event learning modules: event need, privacy, and performance evidence sources.

Later slices may add dedicated tables only if existing systems cannot represent trust memories, assignment-scoped briefing approvals, training evidence, or post-event performance capture. Any new table must be additive, tenant-owned, RLS-protected, indexed by tenant/collaborator/event/state, and must not replace the existing roster, vendor, delegate, event assignment, task, shift, onboarding, or performance systems.

## Typed Contract

The reusable TypeScript contract lives at `lib/intelligence/staff-trust-delegation-contract.ts`.

It defines:

- `CollaboratorProfileContract`: normalized profile over staff members, event collaborators, vendors, delegates, household staff, planners, assistants, and contractors.
- `DelegationAssignmentContract`: event assignment with role, check-in state, requested/approved scopes, tasks, stations, training links, trust memory links, and private notes.
- `TrustMemoryContract`: chef-private reliability, skill, communication, confidentiality, client-fit, safety, punctuality, and recovery signals.
- `TrainingChecklistItemContract`: scope-linked training/certification/checklist item that composes existing staff onboarding and future vendor/delegate training requirements.
- `EventStaffingPlannerNeedContract`: event need contract for role, skill, certification, scope, and quantity requirements.
- `PostEventPerformanceCaptureContract`: post-event feedback capture that can create trust memories and follow-up training items.
- `AssignmentScopedBriefingExport`: least-privilege assignment export that strips private notes and excludes private assignments.
- `StaffTrustDelegationSystemContract`: aggregate chef-internal contract.

States and helper functions:

- `CollaboratorKind`: `staff_member`, `event_collaborator`, `vendor`, `delegate`, `household_staff`, `planner`, `assistant`, `contractor`.
- `AssignmentScope`: event overview, schedule, arrival logistics, venue access, prep/station/service/loadout tasks, vendor coordination, communications, guest list, dietary summary, client household memory, pricing/financials, contract/payment, private chef notes, and performance feedback.
- `DelegationVisibilityLevel`: `private_only`, `chef_internal`, `assignment_scoped`, `staff_safe_briefing`, `vendor_safe_briefing`, `client_safe_status`, `pay_private`, `emergency_private`, `public_none`.
- `DelegationAccessState`: `trusted`, `needs_training`, `at_risk`, `blocked`, `unknown`.
- `deriveAssignmentTrustState()`: derives a conservative access state from profile status/restrictions, assignment status/check-in, sensitive scope approvals, required training, and trust memory signals.
- `getDisallowedAssignmentScopes()`: blocks sensitive scopes unless a chef override reason exists, with delegate-specific limits.
- `buildAssignmentScopedBriefingExport()`: filters to assignment-scoped records and strips private notes for staff-safe briefing output.

## Ownership Boundaries

- Owning domain for the deterministic contract: `lib/intelligence`.
- Existing staff roster ownership stays in `lib/staff/actions.ts` and staff pages/components.
- Existing staff task ownership stays in `lib/staff/task-assignment-actions.ts`, staff task types, and staff task surfaces.
- Existing event staffing and shift scheduling ownership stays in `lib/staff/staffing-actions.ts`, `staff-scheduling-actions.ts`, and event staff panels.
- Existing staff portal ownership stays in `lib/staff/staff-portal-actions.ts`, `staff-event-portal-actions.ts`, and `app/(staff)`.
- Existing onboarding/training ownership stays in `lib/staff/onboarding-actions.ts` until a later slice proves a cross-collaborator training table is needed.
- Existing staff performance ownership stays in `lib/staff/performance-actions.ts`.
- Existing event collaborator ownership stays in `lib/events/collaborator-actions.ts`.
- Existing delegate ownership stays in `lib/delegation/*`.
- Existing vendor ownership stays in `lib/vendors/*`, vendor communication modules, and vendor event assignment tables.
- Existing event execution ownership stays in `lib/events/*`, loadout, checklist, communications, calendar, compliance, and post-event learning modules.

The Staff Trust and Delegation System is a synthesis and policy layer. It may read from existing systems and later persist missing trust memory or scoped-briefing state, but it must not become a second staff roster, vendor CRM, delegate system, task board, shift scheduler, onboarding checklist, performance board, or staff portal.

## Visibility Rules

- Default visibility is `chef_internal`.
- Private facts include pay, emergency contact, staff incidents, staff restrictions, client household memory, exact residential access details, private chef notes, performance feedback, vendor reliability concerns, legal/compliance issues, and any named-guest dietary/health detail beyond task need.
- Chef-authenticated surfaces may display full trust and assignment context.
- Staff surfaces may receive only assignment-scoped briefings: event/task/station/schedule/arrival details required for their assignment, with private notes stripped.
- Vendor surfaces may receive only vendor-safe order, delivery, schedule, and contact instructions required for their event assignment.
- Delegate surfaces may receive only explicitly granted host/chef-approved scopes and must never inherit private chef notes or staff performance feedback.
- Client surfaces may receive only explicit client-safe staffing status copy such as "service staff confirmed" or "vendor arrival scheduled," never staff trust memories, pay, incident notes, or private internal restrictions.
- Public anonymous surfaces have no staff trust or delegation access.
- Remy chef mode may summarize private assignment risks. Remy staff/vendor/client/public modes must use safe DTOs only.

## Role Boundaries

- Chef: can read and manage collaborator profiles, assignment scopes, trust memories, training state, staffing planner needs, private notes, and post-event performance captures.
- Staff: can read only their authenticated or token-assigned task/briefing scope. No roster-wide access, pay comparisons, private client memory, staff performance notes, or unassigned event details.
- Vendor: can read only vendor-safe assignment/order/delivery scope for events where the vendor is assigned.
- Delegate/assistant: can read only scopes explicitly granted by the host/chef delegate model. Cannot see private chef notes, staff trust memories, staff pay, or unrelated event data.
- Client/host: may see high-level staffing/vendor status but not internal trust, pay, training, incident, or assignment-risk detail.
- Event collaborator/partner chef: can see the event/collaboration scopes explicitly granted by the collaborator record, not full tenant staff/vendor memory by default.
- Admin/partner: no routine tenant staff trust access. Admin diagnostics must be admin-gated and avoid raw tenant operational details by default.
- Developer/build agents: can edit the contract and later implementation only through fired queue/growth work.

## Route, API, Server Action, And DB Contract

This foundation slice adds no route, API, server action, migration, or DB query.

All future chef-side Staff Trust and Delegation server actions must:

- Start with `requireChef()` for chef-only reads/writes, or `requireAuth()` only when a justified multi-role action exists.
- Derive ownership from `user.entityId` or `user.tenantId!`, never request body fields or route params alone.
- Scope every tenant-data query with `.eq('tenant_id', user.tenantId!)`, `.eq('chef_id', user.entityId ?? user.tenantId!)`, or the equivalent table-specific tenant owner check.
- Verify linked `event_id`, `staff_member_id`, `vendor_id`, `collaborator_id`, `delegate_id`, `task_id`, `shift_id`, `training_item_id`, communication thread, and client/household references belong to the same tenant before using them in trust derivation or mutation.
- Revalidate only affected chef routes such as `/staff`, `/staff/[id]`, `/staff/performance`, `/staff/schedule`, `/events/[id]`, `/events/[id]/staff`, `/vendors`, `/communication`, and dashboard staff widgets.

All future staff/vendor/delegate APIs must:

- Authenticate with an explicit staff auth, vendor auth, delegate auth, collaborator auth, or signed-token boundary before reading anything.
- Resolve the assignment first, then verify the actor is assigned to that event or granted that delegate/vendor scope.
- Return only `AssignmentScopedBriefingExport` or equivalent safe DTOs.
- Avoid exposing tenant ids, private notes, staff trust memories, pay, emergency contacts, internal restrictions, staff performance feedback, private client household memory, guest-level health records, exact residential details beyond task need, vendor reliability notes, and internal risk labels.

All future client/public APIs must:

- Avoid raw staff trust, training, performance, and assignment-scope reads.
- Return only explicit client-safe status copy.
- Never expose staff tasks, pay, incidents, training gaps, trust memories, vendor risk, or private internal planner state.

## Integration Points

- Collaborator profiles: synthesize existing `staff_members`, `event_collaborators`, `vendors`, `chef_delegates`, and household/planner records where available.
- Assignment-scoped access: reuse `event_staff_assignments`, `vendor_event_assignments`, `event_collaborators`, `chef_delegates`, `staff_event_tokens`, and route-policy/auth guards.
- Trust memory: compose from `staff_performance_scores`, event assignment ratings/status, vendor scorecards, communication outcomes, incident/crisis notes, post-event learning, and chef manual notes.
- Training checklists: reuse `staff_onboarding_items`, contractor agreements, code-of-conduct acknowledgments, certification fields, and later vendor/delegate training evidence only if needed.
- Event staffing planner: compose event needs, event prep/loadout, station plans, calendar availability, shift assignments, staff tasks, and staff/vendor capabilities.
- Post-event performance capture: feed event closeout, post-event learning, debrief, assignment completion, no-show/late states, client-safe feedback, and chef observations into private trust memories.
- Communications: future assignment briefing and follow-up messages must route through existing communications controls and never leak private trust memory.
- Remy: chef mode can explain assignment risks, training gaps, and scoped delegation options; staff/vendor/delegate/client modes must use safe briefing/status DTOs.
- Loadout, household memory, crisis/recovery, compliance, calendar, and CIL: later integrations may contribute signals but must preserve assignment scope and visibility rules.

## Unknown-State Rules

Unknowns are first-class:

- Missing role, skills, certification, availability, training, trust history, or assignment scope is `unknown`, not trusted.
- Missing assignment ownership blocks staff/vendor/delegate access.
- Missing event ownership blocks all assignment derivation.
- Missing client/household privacy classification keeps sensitive scopes blocked until reviewed.
- Missing performance history should not punish a collaborator, but it should keep high-sensitivity assignments out of automatic `trusted` state.
- Missing post-event capture leaves trust memory unchanged; it must not invent positive or negative history.

Later UI should show unknowns as actionable missing inputs and assignment-risk cards, not as fake precision.

## Assignment Scope Rules

Assignment scope is least-privilege and event-specific:

- `event_overview`: high-level event facts required for work.
- `schedule`: arrival, departure, shift, and check-in timing.
- `arrival_logistics` and `venue_access`: only task-needed access instructions, not all private household notes.
- `prep_tasks`, `station_tasks`, `service_tasks`, and `loadout_tasks`: concrete work scopes tied to tasks/stations/checklists.
- `vendor_coordination`: order, delivery, pickup, and issue-resolution scope.
- `communication_thread`: only the assigned thread/channel, not all tenant communications.
- `guest_list` and `dietary_summary`: minimized guest/dietary context only when required.
- `client_household_memory`, `pricing_financials`, `contract_payment`, `private_chef_notes`, and `performance_feedback`: sensitive scopes requiring chef-only handling or explicit override.

Sensitive scope grants must be recorded with a reason and must never be inferred from UI visibility alone.

## Likely Files For Later Slices

- Contract and deterministic model: `lib/intelligence/staff-trust-delegation-contract.ts`, future `lib/intelligence/staff-trust-delegation.ts`.
- Existing staff roster and assignment inputs: `lib/staff/actions.ts`, `lib/staff/staffing-actions.ts`, `lib/staff/staff-scheduling-actions.ts`, staff pages/components.
- Existing staff task inputs: `lib/staff/task-assignment-actions.ts`, `lib/staff/task-assignment-types.ts`, staff task portal pages.
- Existing staff portal inputs: `lib/staff/staff-portal-actions.ts`, `lib/staff/staff-event-portal-actions.ts`, `app/(staff)/*`.
- Existing training inputs: `lib/staff/onboarding-actions.ts`, `lib/staff/onboarding-constants.ts`, contractor/code-of-conduct actions.
- Existing performance inputs: `lib/staff/performance-actions.ts`, event closeout/debrief and post-event learning modules.
- Existing vendor inputs: `lib/vendors/*`, `vendor_event_assignments`, vendor communication and scorecard modules.
- Existing delegate inputs: `lib/delegation/*`, delegate access pages/actions.
- Existing collaborator inputs: `lib/events/collaborator-actions.ts`, dinner-circle collaborator bridge modules.
- Existing event/planner inputs: `lib/events/*`, event staff panels, loadout, checklist, stations, communications, calendar, compliance, crisis/recovery, and Remy modules.
- Future chef surfaces: staff trust ledger, event staffing planner, collaborator profile trust tab, training readiness panel, assignment-scope editor, post-event performance capture.
- Future staff/vendor/delegate-safe surfaces: scoped event briefing, assigned tasks, check-in/checkout, safe follow-up questions, and completion capture.

## Fire-Time Checklist For Later Build Slices

- Re-read this contract, the queue item, and Program 9 in `docs/specs/chef-life-expansion-swarm-spec-pack.md`.
- Run `git status --short` and preserve unrelated dirty work.
- Confirm whether existing staff roster, event staff assignment, staff task, shift schedule, staff portal, onboarding, performance, vendor, delegate, collaborator, event checklist, communication, loadout, or post-event modules already satisfy the requested data need.
- If adding private persistence, add `tenant_id` or `chef_id`, RLS, indexes by tenant/collaborator/event/state, and explicit privacy comments.
- Confirm every server action has `requireChef()` or a justified `requireAuth()`.
- Confirm every tenant query uses `user.entityId` or `user.tenantId!` for `.eq('tenant_id', ...)` or `.eq('chef_id', ...)`.
- Confirm route additions are registered in `lib/auth/route-policy.ts`.
- Confirm every route param ID is combined with tenant ownership before data is read or mutated.
- Confirm staff/vendor/delegate outputs use only `AssignmentScopedBriefingExport` or equivalent safe DTOs and never raw private notes, client household memory, pay, emergency contacts, or trust memories.
- Add tests for assignment-scoped access, route guessing, tenant isolation, private note leakage, training-state gating, trust-memory risk, staff mobile briefing flow, vendor/delegate scope boundaries, and post-event performance capture when behavior is implemented.

## Acceptance Mapping

- Domain objects: defined in `lib/intelligence/staff-trust-delegation-contract.ts`.
- States: collaborator status, assignment status, check-in state, training status, trust memory state/signal/dimension, assignment scope, visibility level, and access state are explicit.
- Ownership: this document assigns Staff Trust and Delegation to `lib/intelligence` as a synthesis contract while preserving staff, tasks, shifts, portal, onboarding, performance, vendor, delegate, collaborator, event, communication, loadout, compliance, and post-event ownership.
- Visibility: chef-internal/default, private-only, assignment-scoped, staff-safe briefing, vendor-safe briefing, client-safe status, pay-private, emergency-private, and public non-access boundaries are explicit.
- Likely files: listed above for later slices.
- Role boundaries: chef, staff, vendor, delegate/assistant, client/host, event collaborator/partner chef, admin/partner, and developer boundaries are explicit.
- Fire-time inspection checklist: included above.
- No duplicate system: existing storage and source modules remain authoritative for the foundation slice.
