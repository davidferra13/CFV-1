# Client Household Operating Memory Foundation Domain Contract

Date: 2026-05-21

Queue item: `BQ-20260520T183100Z-chef-life-client-household-operating-memory-foundation`

Source preserved: `docs/specs/chef-life-expansion-swarm-spec-pack.md` remains the swarm prompt source of truth. This document is the fired foundation contract for later Client Household Operating Memory slices.

## Goal

Define the smallest compatible Client Household Operating Memory contract without creating a duplicate client profile, Dinner Circle household, venue, kitchen inventory, staff, communication, or Remy memory system. The contract composes current ChefFlow household and event operations data into a private, role-aware household operating model that later slices can implement.

## Fire-Time Inspection

Inspected existing household, client, event, staff, venue, and intelligence files:

- `docs/specs/chef-life-expansion-swarm-spec-pack.md`: Program 5 source thesis, data model, swarm prompt, and cross-program privacy rules.
- `docs/specs/household-profiles.md` and `database/migrations/20260401000125_hub_household_members.sql`: existing Dinner Circle household member model for per-person dietary/allergy records, relationships, assistants, house managers, and nannies.
- `lib/hub/household-actions.ts`: existing household member actions and chef-side client household bridge. Chef-side mutations call `requireChef()` and scope through client ownership; token/profile flows remain separate Dinner Circle access paths.
- `app/api/clients/[clientId]/household/route.ts`: chef-only API wrapper around client household mutations; each verb calls `requireChef()` before delegating to the action layer.
- `app/(chef)/clients/[id]/page.tsx` and `components/clients/client-household-panel.tsx`: current chef client detail integration point for household members, pets, parking, access instructions, kitchen notes, and household panel display.
- `app/(client)/my-profile/client-profile-form.tsx` and `lib/clients/client-profile-actions.ts`: client-owned profile fields for parking instructions, access instructions, kitchen constraints, house rules, equipment, children, family notes, allergies, and dietary data.
- `lib/clients/actions.ts`: chef-owned client create/update path already includes pets, parking instructions, access instructions, kitchen constraints, equipment, and household tag fields.
- `database/migrations/20260401000008_client_kitchen_inventory.sql`: tenant-owned `client_kitchen_inventory` and chef equipment master tables for kitchen capability and equipment gap data.
- `database/migrations/20260401000007_client_preferences.sql`, `lib/clients/preference-actions.ts`, `lib/clients/taste-profile-actions.ts`, and `lib/clients/dietary-dashboard-actions.ts`: current client preference, taste, allergy, and household dietary summary lanes.
- `database/migrations/20260425000011_client_passports_and_delegation.sql`, `database/migrations/20260426000003_client_passports.sql`, `database/migrations/20260517200019_client_passport.sql`, and `lib/passport/client-passport-actions.ts`: communication mode, delegation, standing instructions, default locations, delegate contact, confidential client notes, and special date ownership.
- `lib/hub/delegation-actions.ts`, `lib/hub/group-actions.ts`, and `lib/hub/types.ts`: Dinner Circle delegate roles and on-behalf-of patterns for assistants and household representatives.
- `database/migrations/20260510000014_venue_profiles.sql`, `lib/venues/recon-actions.ts`, `lib/venues/recon-types.ts`, and `lib/events/venue-details-actions.ts`: venue/location capability and event venue detail patterns, including parking and access instructions.
- `lib/staff/actions.ts`, `app/(chef)/events/[id]/staff/page.tsx`, `app/(staff)/staff-tasks/page.tsx`, and `app/(staff)/staff-dashboard/page.tsx`: chef-owned staff roster, event assignments, staff task context, and staff portal boundaries.
- `app/(chef)/events/[id]/briefing/page.tsx`, `lib/mobile/drive-briefing`, and event detail sections: current event briefing surfaces where access instructions, kitchen notes, client context, and guest safety details are reused.
- `lib/events/carry-forward.ts`, `lib/events/transitions.ts`, and Remy context loaders: existing event reuse, post-event processing, notification, and chef-only intelligence patterns.
- `lib/auth/get-user.ts` and `lib/auth/route-policy.ts`: required auth and route classification patterns for future routes/actions.

## No-Duplicate-System Decision

Do not add persistence in this foundation slice. The initial Household Operating Memory contract must treat existing systems as source inputs:

- `clients`: address, pets, parking/access instructions, house rules, family notes, kitchen notes, client-owned profile fields, and chef-entered operational context.
- `hub_household_members` and `hub_guest_profiles`: per-person household dietary/allergy records and declared household relationships.
- `client_passports`, `client_notes`, and `client_special_dates`: delegation, standing instructions, confidential notes, important dates, and client-safe communication preferences.
- `client_kitchen_inventory`, `chef_equipment_master`, `event_venue_details`, and `venue_profiles`: kitchen capability, property setup, equipment gaps, venue access, parking, water/power, and service-path context.
- `events`, `event_guests`, event notes, event venue fields, event staff assignments, tasks, and service-day briefings: event-specific reuse and day-of execution context.
- Staff/vendor modules: assignment-scoped task and briefing surfaces only; they do not own raw household memory.
- CIL and Remy: may suggest or summarize facts for the chef, but confirmed household memory remains governed by explicit visibility and source references.

Later slices may add dedicated tables only if existing storage cannot represent access instructions, property quirks, authority maps, fact state, visibility, source evidence, stale review, or event reuse. Any new table must be additive, tenant-owned, RLS-protected, and must not replace client profile, Dinner Circle household member, venue, kitchen inventory, passport, notes, staff, or event systems.

## Typed Contract

The reusable TypeScript contract lives at `lib/intelligence/client-household-operating-memory-contract.ts`.

It defines:

- `HouseholdProfileContract`: chef-owned private household operating aggregate.
- `HouseholdOperationalFact`: source-backed operational fact for addresses, access, parking, service routes, pets, household staff, authority, kitchen quirks, equipment, family schedules, privacy rules, house rules, incidents, client corrections, and event reuse notes.
- `HouseholdAuthorityRecord`: authority map for who can approve booking, menu, dietary, budget, payment, access, schedule, staff direction, privacy, emergency, and post-event correction decisions.
- `HouseholdPrivacyRule`: role-aware privacy constraints for household facts.
- `HouseholdUnknown`: missing household input that may block service.
- `StaffSafeHouseholdBriefing`: staff/vendor briefing DTO generated only from staff-safe or vendor-safe facts.
- `ClientSafeHouseholdCorrection`: narrow correction DTO for facts the client is allowed to review.
- `EventHouseholdReuseDecision`: event reuse output with reused facts, stale facts, unknowns, and redaction count.

States and helper functions:

- `HouseholdMemoryFactState`: `draft`, `observed`, `confirmed`, `client_corrected`, `disputed`, `stale`, `archived`, `unknown`.
- `HouseholdMemoryVisibility`: `private_chef_only`, `chef_internal`, `staff_safe`, `vendor_safe`, `client_safe_correction`, `public_never`.
- `deriveMostRestrictiveHouseholdFactState()`: returns the riskiest combined fact state.
- `isStaffSafeHouseholdVisibility()`: guards staff/vendor briefing inclusion.
- `isClientCorrectableHouseholdVisibility()`: guards client correction exposure.
- `buildStaffSafeHouseholdBriefing()`: redacts private facts and returns only staff-safe data with warning labels.

## Ownership Boundaries

- Owning deterministic contract: `lib/intelligence`.
- Client profile ownership stays in `lib/clients/*`, client portal profile pages, and chef client detail pages.
- Dinner Circle household-member ownership stays in `lib/hub/household-actions.ts`, hub profile/member components, and `hub_household_members`.
- Client passport/delegation ownership stays in `lib/passport/*`, `lib/hub/delegation-actions.ts`, and `client_passports`.
- Venue and kitchen capability ownership stays in `lib/events/venue-details-actions.ts`, `lib/venues/*`, `client_kitchen_inventory`, `chef_equipment_master`, and `venue_profiles`.
- Event reuse ownership stays in event planning, event detail, service-day, carry-forward, and transition modules.
- Staff/vendor briefing ownership stays in staff assignment and staff portal modules, but those modules may receive only safe briefing DTOs.
- Remy/CIL may consume chef-only summaries and propose candidate facts, but they do not write trusted household memory without chef confirmation.

The Household Operating Memory layer is a synthesis and visibility contract. It may read from existing systems, but it must not become a second client profile editor, a second Dinner Circle household system, a second venue profile, a second staff portal, or an unreviewed AI memory store.

## Visibility And Privacy Rules

- Default visibility is `private_chef_only`.
- Public visibility is never allowed for raw household operating memory.
- Private chef-only facts include family dynamics, emotional context, privacy expectations, security patterns, locked doors, sensitive access details, staff reliability concerns, conflict history, and private chef judgments.
- `chef_internal` may be shown on authenticated chef routes and Remy chef mode.
- `staff_safe` and `vendor_safe` may contain only operational facts needed for assigned event work, such as parking, arrival route, service entrance, equipment availability, pet warnings, and approved house rules.
- `client_safe_correction` may contain only facts the client is allowed to review or correct, such as parking, preferred door, kitchen equipment, contact role, or house rule wording.
- Staff/vendor briefings must include a redacted fact count when private facts were excluded.
- Client corrections must never expose chef-only notes, private incidents, staff judgments, family dynamics, confidential client notes, or facts marked `public_never`.
- Stale, disputed, or unknown facts must not be silently reused as confirmed truth.

## Role Boundaries

- Chef: can read and manage private household memory, authority maps, visibility, stale review, and event reuse decisions.
- Client: can review and correct only `client_safe_correction` facts. Client access does not imply access to chef-only household notes.
- Public anonymous user: no access to household operating memory.
- Staff: can see only assignment-scoped `staff_safe` briefing facts for the event they are assigned to.
- Vendor/partner: can see only explicitly `vendor_safe` operational facts for a scoped event or partner location workflow.
- Admin: no routine access to raw tenant household memory. Admin diagnostics must be `requireAdmin()` gated and should inspect system health, not private facts by default.
- Developer/build agents: can edit this contract and future implementation only through fired queue/growth work.

## Route, API, Server Action, And DB Contract

This foundation slice adds no route, API, server action, migration, or DB query.

All future chef-side Household Operating Memory server actions must:

- Start with `requireChef()` for chef-only reads/writes, or `requireAuth()` only when the action is explicitly multi-role.
- Derive ownership from `user.entityId` or `user.tenantId!`, never request body fields or route params alone.
- Scope every tenant-data query with `.eq('tenant_id', user.tenantId!)`, `.eq('chef_id', user.entityId ?? user.tenantId!)`, or the equivalent table-specific tenant check.
- Verify linked `client_id`, `household_id`, `event_id`, `staff_member_id`, `profile_id`, `venue_profile_id`, and `fact_id` belong to the same tenant before reading, writing, briefing, correcting, or reusing data.
- Treat route params such as `params.clientId` or `params.eventId` as selectors only after tenant ownership is proven.
- Revalidate only affected chef routes such as `/clients/[id]`, `/events/[id]`, `/events/[id]/briefing`, `/events/[id]/staff`, and future household memory routes.

All future client correction actions must:

- Call `requireAuth()` or `requireClient()` according to the route audience.
- Resolve the client from the authenticated user or a hardened token flow before querying.
- Return only `ClientSafeHouseholdCorrection` fields.
- Write correction proposals as client-safe facts or review requests; they must not overwrite private chef-only memory without chef acceptance.

All future staff/vendor briefing actions or APIs must:

- Require staff/vendor/partner auth or a scoped event token.
- Confirm assignment or scoped event access before reading any briefing.
- Build output from `staff_safe` or `vendor_safe` facts only.
- Never query household memory by event/client route params without tenant and assignment checks.

When future routes are added, register them in `lib/auth/route-policy.ts` under the correct chef, client, staff, partner, admin, or public bucket.

## Integration Points

- Client profile: reuse existing pets, parking instructions, access instructions, house rules, family notes, kitchen constraints, equipment, allergies, and dietary fields as source refs.
- Dinner Circle household: reuse `hub_household_members` for per-person household dietary/allergy context and relationship labels; do not duplicate household-member CRUD.
- Client passport and delegation: reuse communication mode, delegate contacts, standing instructions, default locations, and on-behalf-of patterns for authority map candidates.
- Authority map: derive initial records from primary client, partner, delegate, assistant, house manager, payer, day-of contact, property contact, and restricted contact signals.
- Access instructions: normalize parking, service entrance, elevator, gate, doorman, lockbox, loading, pets, and site-contact data into facts with visibility and stale review.
- Property quirks: reference kitchen inventory, event venue details, venue recon, prior event kitchen notes, equipment gaps, and service path constraints.
- Household staff: represent house manager, assistant, nanny, doorman, property manager, and other household operators as authority/context records, not staff portal users unless they are actually ChefFlow staff.
- Safe staff briefings: generate event-scoped handoff summaries from approved operational facts only; exclude client history, private judgments, household conflict, and confidential notes.
- Client-safe corrections: expose only correction prompts for safe facts such as parking, preferred entrance, equipment, house rules, and contact authority.
- Event reuse: when building an event packet or service-day briefing, reuse only current confirmed/client-corrected facts; stale/disputed facts become review warnings.
- Warnings: surface missing access, parking, authority, kitchen, pet, and privacy facts as `HouseholdUnknown` blockers when they could affect service.
- Remy and CIL: allow candidate fact suggestions with source refs and confidence; require chef review before promoting suggestions to trusted household memory.

## State Rules

- `draft`: captured but not yet trusted.
- `observed`: chef or staff noticed it, but it has not been verified.
- `confirmed`: trusted for event reuse until stale.
- `client_corrected`: client reviewed a client-safe fact and corrected it.
- `disputed`: sources conflict or the chef/client/staff disagree.
- `stale`: fact is too old, event-specific, or likely changed.
- `archived`: retained for audit/history but not reused.
- `unknown`: required fact is missing.

Event reuse must prefer `confirmed` and `client_corrected`, warn on `observed`, block or ask on `disputed`, `stale`, and `unknown`, and ignore `archived`.

## Likely Files For Later Slices

- Contract and deterministic filtering: `lib/intelligence/client-household-operating-memory-contract.ts`, future `lib/intelligence/client-household-operating-memory.ts`.
- Chef client surface: `app/(chef)/clients/[id]/page.tsx`, `components/clients/client-household-panel.tsx`, future household memory panel component.
- Chef event surface: event detail sections, `app/(chef)/events/[id]/briefing/page.tsx`, `app/(chef)/events/[id]/staff/page.tsx`, service-day and event packet components.
- Existing client/profile inputs: `lib/clients/actions.ts`, `lib/clients/client-profile-actions.ts`, `app/(client)/my-profile/client-profile-form.tsx`, `lib/clients/dietary-dashboard-actions.ts`.
- Dinner Circle household inputs: `lib/hub/household-actions.ts`, hub profile/member components, `hub_household_members`.
- Passport/delegation inputs: `lib/passport/client-passport-actions.ts`, `lib/hub/delegation-actions.ts`, `client_passports`, `client_notes`, `client_special_dates`.
- Property and kitchen inputs: `lib/clients/kitchen-inventory-actions.ts`, `lib/events/venue-details-actions.ts`, `lib/venues/recon-actions.ts`, `client_kitchen_inventory`, `event_venue_details`, `venue_profiles`.
- Staff/vendor outputs: `lib/staff/actions.ts`, staff portal actions, event staff panel, staff briefing components.
- Remy/CIL integration: `lib/ai/remy-context.ts`, `lib/remy/*`, `lib/cil/*`.
- Security registration: `lib/auth/get-user.ts`, `lib/auth/route-policy.ts`, route/API files added by later slices.

## Fire-Time Checklist For Later Build Slices

- Re-read this contract, the queue item, and Program 5 in `docs/specs/chef-life-expansion-swarm-spec-pack.md`.
- Run `git status --short` and preserve unrelated dirty work.
- Confirm whether existing client profile, Dinner Circle household, passport/delegation, venue, kitchen inventory, staff assignment, event, Remy, or CIL modules already satisfy the requested data need.
- If adding persistence, add `tenant_id` or `chef_id`, RLS, tenant/status/visibility indexes, source refs, stale review fields, and explicit privacy comments.
- Confirm every server action starts with `requireChef()` or a justified `requireAuth()`.
- Confirm every tenant query uses `user.entityId` or `user.tenantId!` for `.eq('tenant_id', ...)` or `.eq('chef_id', ...)`.
- Confirm route params are always paired with tenant ownership checks.
- Confirm every new page route is classified in `lib/auth/route-policy.ts`.
- Confirm staff/vendor outputs use only `staff_safe` or `vendor_safe` DTOs and assignment scope.
- Confirm client outputs use only `ClientSafeHouseholdCorrection` or equivalent safe DTOs.
- Add tests for visibility filtering, staff briefing redaction, client correction redaction, stale/disputed fact reuse, route param tampering, tenant isolation, and cross-role non-access when behavior is implemented.

## Acceptance Mapping

- Domain objects: defined in `lib/intelligence/client-household-operating-memory-contract.ts`.
- States: fact states, visibility levels, authority roles/scopes, unknowns, stale/disputed rules, and event reuse states are explicit.
- Ownership: this document assigns deterministic synthesis to `lib/intelligence` while preserving client profile, Dinner Circle household, passport/delegation, venue, kitchen, event, staff, Remy, and CIL ownership.
- Visibility: private chef-only, chef-internal, staff-safe, vendor-safe, client-safe correction, and public-never boundaries are explicit.
- Likely files: listed above for later slices.
- Role boundaries: chef/client/public/staff/vendor/partner/admin/developer boundaries are explicit.
- Fire-time inspection checklist: included above.
- No duplicate system: existing storage and source modules remain authoritative for the foundation slice.
