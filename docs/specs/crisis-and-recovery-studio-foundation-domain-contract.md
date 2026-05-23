# Crisis And Recovery Studio Foundation Domain Contract

Date: 2026-05-21

Queue item: `BQ-20260520T183100Z-chef-life-crisis-and-recovery-studio-foundation`

Parent program item: `BQ-20260520T183000Z-chef-life-crisis-and-recovery-studio-program`

Source preserved: `docs/specs/chef-life-expansion-swarm-spec-pack.md` remains the swarm prompt source of truth. This document is the fired foundation contract for later Crisis And Recovery Studio slices.

## Goal

Define the smallest compatible Crisis And Recovery Studio contract without creating a duplicate safety incident, file/media, communications, client, event, vendor, staff, compliance, insurance, Remy, or dashboard system. The contract composes current ChefFlow data into a private incident, evidence, recovery, communication, recurrence guard, and dashboard-priority model that later slices can implement.

## Parent Program Closeout

The parent program item is complete at the architecture/build-path layer, not as a hidden mega-build. The source swarm spec remains preserved in `docs/specs/chef-life-expansion-swarm-spec-pack.md`, and this document carries the product domain, data ownership, role boundaries, security/privacy boundaries, integration points, and proof expectations into the fired Crisis And Recovery Studio slice family.

Linked build family:

- `BQ-20260520T183100Z-chef-life-crisis-and-recovery-studio-foundation`: this contract and typed architecture.
- `BQ-20260520T183100Z-chef-life-crisis-and-recovery-studio-surface`: first chef surface, mobile states, empty/loading/error/privacy states, and navigation.
- `BQ-20260520T183100Z-chef-life-crisis-and-recovery-studio-decision-integration`: dashboard, event/client/quote/calendar/Remy/communication/action-center decision hooks.
- `BQ-20260520T183100Z-chef-life-crisis-and-recovery-studio-proof-security`: route access, server action/API/database ownership, client/public/staff filtering, mobile proof, runtime proof, and finish-check readiness.

This umbrella item did not add or change user-facing routes, server actions, API routes, or DB queries. Existing crisis-adjacent server actions in `lib/safety/incident-actions.ts` are chef-gated with `requireChef()` and tenant-scope `chef_incidents` through the authenticated chef tenant. Any later implementation slice that adds runtime behavior must repeat those gates with `requireChef()` or justified `requireAuth()`, and every tenant-data query must scope via `user.entityId` or `user.tenantId`.

## Fire-Time Inspection

Inspected existing crisis-adjacent files and modules:

- `docs/specs/chef-life-expansion-swarm-spec-pack.md`: Program 6 thesis, domain model, swarm prompt, and acceptance criteria.
- `lib/safety/incident-actions.ts`: existing chef server actions for `chef_incidents`. Actions call `requireChef()` and scope reads/writes with `.eq('tenant_id', chef.tenantId!)`.
- `app/api/v2/safety/incidents/*`: existing API v2 safety incident routes. Routes use `withApiAuth` and scope `chef_incidents` queries with `ctx.tenantId`.
- `app/(chef)/settings/compliance/incidents/*` and `components/safety/*`: existing chef incident list, create, detail, and resolution-tracker surfaces.
- `database/migrations/20260322000007_incident_documentation.sql`, `lib/db/schema/schema.ts`, and `lib/db/fk-map.ts`: current `chef_incidents` table, tenant FK, RLS policy, indexes, and existing incident fields.
- `app/(chef)/settings/protection/crisis/page.tsx` and `components/protection/crisis-playbook.tsx`: current static crisis playbook surface.
- `app/(chef)/dashboard/_sections/business-section-loader.ts` and `business-section-metrics.ts`: existing dashboard safety incident rollup and priority signal precedent.
- `lib/templates/email-drafts.ts`: existing food safety incident and formal communication template precedent.
- `lib/incidents/reporter.ts`, `lib/incidents/reader.ts`, and `components/settings/incidents-dashboard.tsx`: developer/runtime incident reporting, which is separate from tenant crisis data and must not be merged into chef-owned incident records.
- Existing foundation contracts in `docs/specs/*-foundation-domain-contract.md` and `lib/intelligence/*-contract.ts`: current pattern for typed contracts, docs, and unit tests.
- `lib/auth/get-user.ts`, `lib/auth/route-policy.ts`, and `lib/api/v2/middleware.ts`: auth, route, API, and tenant-boundary patterns for future implementation.

## No-Duplicate-System Decision

Do not add persistence in this foundation slice. The initial Crisis And Recovery Studio must treat existing systems as source inputs:

- `chef_incidents`: current tenant-owned safety incident table and resolution status source.
- `events`, `clients`, `inquiries`, and quotes/booking records: affected event/client context and future capture entry points.
- Existing documents/media/files: evidence storage, not a new evidence file store.
- Communications, scheduled messages, call notes, and templates: communication source refs and drafted response surfaces.
- Vendors, staff, invoices, payments, insurance claims, and compliance packets: linked recovery, claim, and review context.
- Household memory, client intelligence, and Remy private context: private incident context only when role-safe and tenant-scoped.
- Dashboard and Priority Queue surfaces: private chef priority surfacing only, not a second dashboard system.
- `lib/incidents/*` developer incident reporter: runtime/dev observability only, not chef tenant crisis data.

Later slices may add dedicated tables only when existing `chef_incidents` plus existing media/communication/action systems cannot represent evidence items, recovery promises, recurrence guards, or timeline entries. Any new tables must be additive, tenant-owned, RLS-protected, and must not replace `chef_incidents`.

## Typed Contract

The reusable TypeScript contract lives at `lib/intelligence/crisis-and-recovery-studio-contract.ts`.

It defines:

- `CrisisIncidentContract`: tenant-owned private incident aggregate with incident type, severity, state, affected event/client/vendor/staff refs, owner, risk profile, evidence, recovery actions, communications, recurrence guards, and source refs.
- `CrisisEvidenceItemContract`: evidence timeline item for photos, receipts, messages, call notes, witness notes, logs, invoices, vendor confirmations, public reviews, and policy documents.
- `CrisisRecoveryActionContract`: recovery action for safety stabilization, apology, refund/credit, remake, vendor claim, insurance note, client follow-up, staff coaching, policy change, communication, documentation, and professional review.
- `CrisisCommunicationDraftContract`: communication draft with audience, channel, approval, blocked sensitive factors, and visibility.
- `CrisisRecurrenceGuardContract`: future warning created from an incident and triggered during event planning, quote review, vendor order, staff assignment, service day, or post-event review.
- `CrisisTimelineEntryContract`: auditable incident timeline event.
- `CrisisDashboardPriorityCard`: private chef dashboard/Priority Queue surfacing DTO.
- `ClientSafeCrisisSummary`: narrow client-safe summary that exposes commitments without raw private incident details.

States and helper functions:

- `CrisisIncidentState`: `draft`, `triage`, `active`, `stabilized`, `recovering`, `monitoring`, `resolved`, `archived`, `unknown`.
- `CrisisSeverity`: `low`, `medium`, `high`, `critical`, `unknown`.
- `CrisisRecoveryActionState`: `proposed`, `approved`, `in_progress`, `waiting_on_external_party`, `completed`, `cancelled`, `archived`.
- `CrisisEvidenceState`: `captured`, `needs_review`, `verified`, `disputed`, `redacted`, `archived`.
- `CrisisRecurrenceGuardState`: `proposed`, `active`, `triggered`, `snoozed`, `retired`, `archived`.
- `deriveHighestCrisisSeverity()`: combines severity signals.
- `deriveIncidentSeverityFromRiskProfile()`: derives incident severity from safety, money, privacy, relationship, and public reputation risk.
- `isSensitiveCrisisVisibility()`: guards private, chef-internal, privileged, and never-externalized facts.
- `canSendCrisisCommunicationDraft()`: blocks external communication until approval, safe visibility, and redaction are complete.
- `buildClientSafeCrisisSummary()`: redacts evidence/private factors and exposes only client-safe recovery commitments.
- `buildCrisisDashboardPriorityCards()`: creates private chef priority cards from open incidents, overdue recovery actions, and active recurrence guards.

## Ownership Boundaries

- Owning deterministic contract: `lib/intelligence/crisis-and-recovery-studio-contract.ts`.
- Existing incident record ownership stays in `lib/safety/incident-actions.ts`, `app/api/v2/safety/incidents/*`, and `app/(chef)/settings/compliance/incidents/*`.
- Existing media/document ownership stays in current document/media modules.
- Existing communication ownership stays in communication actions, templates, scheduled messages, call notes, and Remy communication guardrails.
- Existing dashboard/Priority Queue ownership stays in dashboard and queue modules. Crisis only contributes private priority DTOs.
- Existing compliance/insurance ownership stays in compliance and claims modules.
- Existing client/event/vendor/staff ownership stays in their current modules.
- No public, anonymous, client, vendor, partner, or staff module owns raw crisis incident data.

The Crisis And Recovery Studio is a synthesis and orchestration contract. It may read from existing systems and later attach source refs, but it must not become a second safety incident table, a second media vault, a second communication system, or a second dashboard.

## Visibility And Privacy Rules

- Default visibility is `private_incident`.
- Sensitive facts include safety exposure, allergy details, injury notes, payment conflict, private client messages, staff behavior, vendor failure evidence, insurance/legal notes, private household context, identity/privacy incidents, and public complaint strategy.
- Chef-authenticated surfaces may display raw incident details.
- Staff and vendors may see only assigned `staff_safe_action` or `vendor_safe_action` instructions.
- Clients may receive only `client_safe_summary` fields and explicit recovery commitments.
- Public surfaces may receive only approved `public_statement` content.
- Remy chef mode may summarize private crisis context for the chef. Remy client/public mode may not expose private evidence, private notes, source refs, risk profile internals, or professional-review reasoning.
- High-risk safety, legal, insurance, medical, or privacy cases must use professional-review language and must not produce legal or medical advice.

## Role Boundaries

- Chef: can create, read, update, triage, recover, communicate, and close private crisis records for their tenant.
- Client: no raw access to crisis records, evidence, private notes, risk profile, or timeline. May see approved client-safe summary and commitments.
- Public anonymous user: no raw access. May see only approved public statement copy.
- Staff: no raw access by default. May see assigned safe tasks, timing, and need-to-know operational instructions.
- Vendor/partner: no raw access by default. May see assigned safe vendor claims, replacement instructions, or confirmation requests.
- Admin: no routine access to tenant raw crisis data. Any admin diagnostics must be admin-gated and minimize tenant PII.
- Developer/build agents: can edit the contract and later implementation only through fired queue/growth work.

## Route, API, Server Action, And DB Contract

This foundation slice adds no route, API route, server action, migration, or DB query.

All future chef-side Crisis And Recovery Studio server actions must:

- Start with `requireChef()` for chef-only reads/writes, or `requireAuth()` only when a justified multi-role action exists.
- Derive ownership from `user.entityId` or `user.tenantId!`, never from request bodies, client-provided tenant ids, or route params alone.
- Scope every tenant-data query with `.eq('tenant_id', user.tenantId!)`, `.eq('chef_id', user.entityId ?? user.tenantId!)`, or the equivalent table-specific tenant check.
- Verify linked `incident_id`, `event_id`, `client_id`, `vendor_id`, `staff_member_id`, `document_id`, `media_asset_id`, `message_id`, `invoice_id`, `payment_id`, `claim_id`, and `recurrence_guard_id` belong to the same tenant before use.
- Revalidate only affected chef routes such as `/settings/compliance/incidents`, event detail pages, client detail pages, dashboard, Priority Queue, communication drafts, and future Crisis Studio routes.

All future API routes must:

- Use `withApiAuth`, `verifyCronAuth`, webhook signature verification, or an equivalent explicit auth wrapper.
- Scope every DB query with `ctx.tenantId`, `user.tenantId!`, or `user.entityId`.
- Never return private notes, privileged-review details, raw evidence URLs, source refs, professional-review reasoning, or tenant ids to public/client responses.

All future page routes must:

- Add new chef pages to `CHEF_PROTECTED_PATHS` in `lib/auth/route-policy.ts`.
- Add admin pages to the admin route policy and call `requireAdmin()` at runtime.
- Treat UI hiding as convenience only. Server-side route/action/API protection is mandatory.

## Integration Points

- Incident capture: extend existing `chef_incidents` rather than introducing a parallel incident table.
- Event/client context: allow later event/client panels and mobile capture to prefill affected refs after tenant ownership checks.
- Evidence: attach source refs to existing document/media/message/payment records; do not store raw evidence blobs in the contract layer.
- Recovery actions: link client follow-ups, vendor claims, refunds/credits, insurance notes, staff coaching, policy changes, and professional review tasks.
- Communications: use existing templates and communication actions with approval, redaction, and safe audience checks before sending.
- Recurrence guards: convert resolved incident learnings into future warnings for event planning, quotes, vendor orders, staff assignments, service day, and post-event review.
- Dashboard priority: surface only private `CrisisDashboardPriorityCard` DTOs in dashboard/Priority Queue lanes.
- Compliance Concierge: high-risk safety, permits, insurance, allergen, alcohol/cannabis, and privacy cases should source compliance packets when that program exists.
- Household/client memory: recurrence and relationship notes must not leak private incident details into client/public surfaces.
- Remy: Remy may suggest safe next steps and drafts, but must not hallucinate legal/medical advice or bypass approval/redaction.

## Unknown And Stale-State Rules

- Missing severity or risk profile means `unknown`, not low risk.
- Missing event/client/vendor/staff linkage means capture remains incomplete until confirmed.
- Missing evidence means evidence needs are explicit and actionable.
- Missing professional review for safety/legal/insurance/privacy risk blocks external finalization.
- Overdue recovery actions raise private dashboard priority until completed or cancelled.
- Resolved incidents may keep active recurrence guards; closing an incident does not retire future warnings automatically.

## Likely Files For Later Slices

- Contract and deterministic helpers: `lib/intelligence/crisis-and-recovery-studio-contract.ts`, future `lib/intelligence/crisis-and-recovery-studio.ts`.
- Existing incident actions and APIs: `lib/safety/incident-actions.ts`, `app/api/v2/safety/incidents/*`.
- Existing incident surfaces: `app/(chef)/settings/compliance/incidents/*`, `components/safety/*`.
- Crisis playbook/start point: `app/(chef)/settings/protection/crisis/page.tsx`, `components/protection/crisis-playbook.tsx`.
- Event/client panels: event detail routes/components and client detail routes/components.
- Communications: `lib/templates/email-drafts.ts`, communication actions, quick reply actions, scheduled messages, Remy communication guardrails.
- Evidence/media: document, media, upload, and message attachment modules.
- Dashboard/Priority Queue: dashboard loader/metrics/sections, queue providers, Priority Queue surfaces.
- Compliance/claims: compliance packet modules, insurance claim routes/actions, payment/refund modules.
- Auth/security: `lib/auth/get-user.ts`, `lib/auth/route-policy.ts`, `lib/api/v2/middleware.ts`, and security audit prompt.

## Fire-Time Checklist For Later Build Slices

- Re-read this contract, the queue item, and Program 6 in `docs/specs/chef-life-expansion-swarm-spec-pack.md`.
- Run `git status --short` and preserve unrelated dirty work.
- Confirm whether `chef_incidents`, existing evidence/media, communications, claims, compliance, dashboard, or client/event modules already satisfy the requested data need.
- If adding persistence, add `tenant_id` or `chef_id`, RLS, tenant/status/severity indexes, and explicit privacy comments.
- Confirm every server action starts with `requireChef()` or a justified `requireAuth()`.
- Confirm every tenant query uses `user.entityId` or `user.tenantId!` for `.eq('tenant_id', ...)` or `.eq('chef_id', ...)`.
- Confirm every route is registered in `lib/auth/route-policy.ts` when a page route is added.
- Confirm public/client/staff/vendor outputs use only safe DTOs and never raw private incident facts.
- Add tests for severity derivation, communication redaction, client-safe summary filtering, dashboard priority, tenant isolation, route protection, evidence access, recovery completion, recurrence warnings, and mobile capture when behavior is implemented.

## Acceptance Mapping

- Domain objects: defined in `lib/intelligence/crisis-and-recovery-studio-contract.ts`.
- States: incident states, severity states, recovery action states, evidence states, recurrence guard states, communication states, and visibility levels are explicit.
- Ownership: this document assigns Crisis And Recovery Studio to `lib/intelligence` as a synthesis contract while preserving existing safety incident, media, communication, dashboard, compliance, client, event, vendor, staff, and Remy ownership.
- Visibility: private/default, chef-only, privileged, staff-safe, vendor-safe, client-safe, public-statement, and never-externalized boundaries are explicit.
- Likely files: listed above for later slices.
- Role boundaries: chef/client/public/staff/vendor/partner/admin/developer boundaries are explicit.
- Fire-time inspection checklist: included above.
- No duplicate system: existing storage and source modules remain authoritative for the foundation slice.
