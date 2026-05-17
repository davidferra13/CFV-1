# Cannabis Dining + Portal - Intensify Log

## Deep-Pass Run 2026-05-17

STATUS: fresh
DEPTH: normal

SURFACED:

- COA cannabinoid panel values have NO upper-bound range validation. THC=99999% causes server crash via RangeError in assertFraction(), not graceful validation error
- guest_event_profile table has NO tenant_id column. RLS policies are anon-permissive. Token-only security for cannabis guest intake data across all tenants
- Age verification self-attestation never sets expires_at. Guard code checks expiry but column never populated. Once attested, persists forever
- 5 of 6 cannabis notification dispatch functions are dead code (only closeout is called)
- Admin cannabis request review/convert pipeline is backend-complete but has zero UI surface
- CIL has zero cannabis awareness across all 7 analyzers
- Remy has 2 one-liner instructions about cannabis, zero context loading for cannabis events
- Communication pipeline has zero cannabis awareness; cannabis events get same reminders as birthday dinners
- getCannabisClientIntelligence() and getCannabisGuestIntelligence() are fully dead code (zero callers)
- sendCannabisInvite has no UI caller; invite page is read-only
- Reconciliation audit log references mismatchSummary.hasIssues which doesn't exist on the type; audit always records undefined
- Cannabis readiness gates silently block transitions with no chef-facing visibility
- Print layout overflows for 20+ guests x 10+ courses
- Completion contract and cannabis readiness are parallel, disconnected systems

LENSES_USED:

- Cannabis Compliance Officer: regulated product safety, chain of custody, audit trail integrity
- Private Event Chef (cannabis-experienced): operational workflow, service-time safety
- Hospitality UX Designer: guest onboarding friction, trust signals, communication gaps
- Multi-tenant SaaS Security Architect: data isolation, access control, tenant scoping
- AI Product Manager: intelligence layer integration, copilot effectiveness

EXPERT_VALIDATION:

- COA range validation: endorsed (Compliance CRITICAL, Security endorses) - absurd potency cascades through dosing chain
- guest_event_profile tenant isolation: endorsed (Security CRITICAL, Compliance endorses) - most dangerous finding
- Age attestation expiry: endorsed (Compliance CRITICAL, UX endorses annual checkbox) - liability for regulated activity
- Wire 5 dead notifications: endorsed (all 5 lenses) - silent lifecycle erodes trust
- Admin request review UI: endorsed (all 5 lenses) - pipeline dead-ends at database
- CIL cannabis analyzer: endorsed (AI PM strong, Chef endorses) - single highest-leverage integration
- Remy cannabis context: endorsed (AI PM + Chef strong) - copilot blind to compliance-heavy feature
- Cannabis lifecycle emails: endorsed (Compliance + Chef + UX) - automated reminders create audit trail
- Wire intelligence UI: endorsed (Chef + Compliance) - cannabis history critical for safety
- Wire invite send: endorsed (Chef) - page is read-only
- Reconciliation audit bug: endorsed (Compliance) - audit trail gap
- Readiness dashboard: endorsed (Chef + UX) - "tell me what's missing"
- Completion contract merge: endorsed (AI PM) - dual systems confuse consumers
- Print layout pagination: endorsed (Chef) - "20-30 guests need readable packet"

EXPERT_ADDITIONS:

- Compliance Officer: Audit trail export capability for regulatory inspection
- Private Chef: Pre-event cannabis checklist (COA printed, batch records, dosing packet, syringe kit)
- Hospitality UX: Post-event guest experience survey feeding intelligence layer

REJECTED:

- Recipe infusion markers: Compliance Officer rejects. "Don't embed regulated dosing data in general recipe system. Per-course event-level config is correct regulatory boundary."
- Cannabis circle activation: Chef cautions. "Too early. Get basic wiring working first."
- Menu-to-course auto-population: Depends on menu system maturity. Skip until basic wiring solid.

ACTED ON:

- COA range validation: two-layer defense (input Zod + evaluation flags)
- guest_event_profile tenant isolation: migration + 13 files + 18 query sites scoped
- Age attestation expiry: 1-year expiry on new attestations + renewAgeAttestation() action
- Reconciliation audit bug: hasIssues replaced with actual type property checks
- 5 dead notification functions wired into admin/client trigger points
- Admin cannabis request review/convert UI (Requests tab)
- Guest intelligence wired into RSVP dashboard (per-guest history)
- CIL cannabis analyzer: 4 signal types, registered as analyzer
- Remy event context: 4 parallel cannabis sub-queries in loadEventEntity()
- Cannabis cadence touchpoints: 3 lifecycle emails + conditional checks
- Readiness dashboard: 10 gates in two-column layout on control packet page
- Invite send form: name required, rate limit info, router.refresh()
- Completion contract: cannabis gates merged as category:'cannabis' requirements

SKIPPED:

- PIE pricing for cannabis: regulatory complexity, correct to exclude
- Chef nav activation: intentionally disabled for feature gating
- Finalization lock admin override: irreversibility is a compliance feature

BUILD_PROMPTS:

- Wave 1 (4 agents, parallel): coa-range-validation (haiku), guest-profile-tenant-isolation (opus), age-attestation-expiry (haiku), reconciliation-audit-bug (haiku) - STATUS: DISPATCHED 2026-05-17, ALL COMPLETE
- Wave 2 (3 agents, parallel): wire-cannabis-notifications (haiku), admin-cannabis-request-ui (opus), wire-client-intelligence (haiku) - STATUS: DISPATCHED 2026-05-17, ALL COMPLETE
- Wave 3 (3 agents, parallel): cil-cannabis-analyzer (opus), remy-cannabis-context (opus), cannabis-cadence-touchpoints (opus) - STATUS: DISPATCHED 2026-05-17, ALL COMPLETE
- Wave 4 (3 agents, parallel): cannabis-readiness-dashboard (haiku), wire-invite-send-ui (haiku), completion-contract-cannabis (haiku) - STATUS: DISPATCHED 2026-05-17, ALL COMPLETE

Total: 13 agents dispatched, 13 complete. 6 post-agent type errors fixed manually.

CROSS_REFS:

- [[client-portal]]: token unification from prior run affects cannabis portal email links
- [[cil]]: cannabis analyzer would be 8th CIL analyzer, follows existing patterns
- [[communication]]: cannabis cadence touchpoints extend existing lifecycle pipeline
- [[intelligence]]: client intelligence dead code affects cannabis + general client profiles

NEXT TRIGGER: All three original triggers completed (tenant_id, CIL analyzer, notifications). Zone is now partially-mined. Next triggers: print layout pagination for large events, cannabis passport section, IRC 280E tax ledger implementation, audit trail export capability.
