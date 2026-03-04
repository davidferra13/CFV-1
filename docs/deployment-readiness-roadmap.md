# ChefFlow Deployment Readiness Roadmap

Last updated: 2026-03-02

## Goal

Ship ChefFlow to production with zero known critical risk and a fully verified core experience across all supported user types.

This roadmap is the execution plan for "make it perfect before deployment."

## Deployment Scope Lock (Non-Negotiable)

Before production launch, these three surfaces must be complete and stable:

1. Chef Portal (supports all 6 archetypes)
2. Client Portal (authenticated and token-link flows)
3. Public Surfaces (landing, discovery, booking/inquiry, share/guest flows)

If any of the three fails readiness, launch is blocked.

## Critical Readiness Fronts

## A) Chef Portal Readiness (6 Archetypes)

Archetypes:

- Private Chef
- Caterer
- Meal-Prep Business
- Restaurant
- Food Truck
- Bakery

Chef portal is deployment-ready only if all are true:

- Universal core is stable: clients, transactions/events, finance/ledger, schedule, communication
- Archetype workflows are usable without dead ends
- No role/scope leakage across tenants
- Financial and lifecycle state transitions are correct
- Core chef journeys pass on desktop and mobile

## B) Client Portal Readiness

Client portal is deployment-ready only if all are true:

- Authenticated client flows (`/my-*`) are complete and reliable
- Token-link client portal (`/client/[token]`) is secure and reliable
- Quote/proposal/payment/event visibility flows are clear and working
- Client actions (accept, approve, pay, cancel/request changes) are accurate
- No broken states, fake-success states, or silent failures

## C) Public Surface Readiness

Public surfaces are deployment-ready only if all are true:

- Landing/discovery pages clearly communicate product and convert
- Public booking/inquiry flows create valid records end-to-end
- Embed inquiry and public chef pages are stable
- Guest/share links are secure and function correctly
- SEO, metadata, and performance are acceptable for production

## Scope and Source of Truth

Primary execution checklist:

- `docs/deployment-evaluation-hierarchy.md`

Supporting references:

- `docs/production-hardening-todo.md`
- `docs/beta-testers.md`
- `docs/rollback-plan.md`
- `CLAUDE.md` (3-environment architecture and operating rules)

## User-Type Coverage (Not Chef-Only)

This roadmap is for the entire platform, not only the chef portal.

- [ ] Chef users (`/dashboard`, `/events`, `/clients`, `/finance`, etc.)
- [ ] Client users (authenticated: `/my-*`)
- [ ] Client token portal users (`/client/[token]`)
- [ ] Staff users (`/staff-*`, `/staff-login`)
- [ ] Partner users (`/partner/*`, invite claim flow)
- [ ] Admin users (`/admin/*`)
- [ ] Public users/prospects (`/`, `/chef/[slug]`, `/book/*`, `/embed/*`)
- [ ] Event guests (`/share/[token]`, `/event/[eventId]/guest/[secureToken]`)
- [ ] Kiosk actors (`/kiosk/*`, paired device + staff PIN + walk-up customer)
- [ ] System actors (webhooks, cron, scheduled jobs, API clients)

Coverage rule:

- No phase is complete unless impacted user types are explicitly tested and signed off.

## Quality Standard ("Perfect")

A section is complete only if all are true:

- End-to-end flow works with real data
- No fake-success or placeholder behavior in live paths
- Correct role and permission behavior
- Clear error handling and recovery
- Mobile and desktop usability
- Performance acceptable for normal usage
- Required tests pass
- Documentation updated

## Severity Model

- `P0`: Launch blocker. Must be fixed before deployment.
- `P1`: High-risk issue. Must be fixed before deployment.
- `P2`: Important, fix before scale.
- `P3`: Polish, can ship with planned follow-up.

Deployment rule:

- No open `P0`
- No open `P1` in sections `0` through `10`

## Execution Phases

## Phase 0 - Program Setup (Day 0)

Objective: set a stable baseline and tracking loop.

- [ ] Create a dedicated readiness branch
- [ ] Baseline current state:
  - [ ] `npx tsc --noEmit --skipLibCheck`
  - [ ] `npx next build --no-lint`
  - [ ] Core unit/integration/e2e smoke set
- [ ] Create a single defect tracker with severity tags (`P0-P3`)
- [ ] Freeze non-readiness feature work unless explicitly approved

Exit criteria:

- Baseline report captured
- Single queue of known issues established

## Phase 1 - Hardening Blockers (Days 1-3)

Objective: clear systemic risk before feature-by-feature review.

- [ ] Resolve `P0` and `P1` items from `docs/production-hardening-todo.md`
- [ ] Security/auth hardening complete
- [ ] Critical type-safety/runtime-risk issues addressed
- [ ] Migration/type alignment pass completed for active schemas

Exit criteria:

- Zero open `P0`
- Security/auth blockers closed
- Build and type check stable

## Phase 2 - Core Hierarchy Sweep A (Days 4-8)

Objective: validate the universal business core first.

Sections:

- [ ] 0. Platform Core
- [ ] 1. Dashboard
- [ ] 2. Events
- [ ] 3. Clients
- [ ] 4. Inquiry Pipeline
- [ ] 5. Financials

For each section:

- [ ] Functional audit
- [ ] Permission and role audit
- [ ] Data integrity audit
- [ ] UX/mobile audit
- [ ] Test evidence captured
- [ ] Documentation updated

Exit criteria:

- Sections `0-5` fully checked in hierarchy doc
- No open `P0`/`P1` in these sections

## Phase 3 - Core Hierarchy Sweep B (Days 9-13)

Objective: validate operations and communication surfaces.

Sections:

- [ ] 6. Culinary
- [ ] 7. Calendar
- [ ] 8. Inbox and Messaging
- [ ] 9. Staff
- [ ] 10. Analytics
- [ ] 11. Daily Ops

Exit criteria:

- Sections `6-11` checked
- No open `P0`/`P1` in sections `0-11`

## Phase 4 - Extended Surfaces Sweep (Days 14-18)

Objective: harden secondary and expansion modules.

Sections:

- [ ] 12. Activity and Queue
- [ ] 13. Travel and Operations
- [ ] 14. Reviews and AAR
- [ ] 15. Settings
- [ ] 16. Marketing and Social
- [ ] 17. Network and Community
- [ ] 18. Loyalty Program
- [ ] 19. Safety and Protection
- [ ] 20. Remy (AI Concierge)
- [ ] 21. Onboarding and Import
- [ ] 22. Cannabis Vertical
- [ ] 23. Help Center
- [ ] 24. Games and Gamification
- [ ] 25. Dev Tools
- [ ] 26. Blog and Public Pages

Exit criteria:

- Full hierarchy checked
- Open defects reduced to accepted `P2/P3` only

## Phase 5 - Cross-Role Journey Certification (Days 19-21)

Objective: prove complete journeys by user type.

Chef journeys:

- [ ] Lead -> quote -> event -> payment -> completion
- [ ] Daily ops -> prep -> execution -> closeout/AAR

Client journeys:

- [ ] Public inquiry -> proposal -> acceptance -> payment -> event visibility
- [ ] Client portal (authenticated and token-link) success path

Staff journeys:

- [ ] Login -> schedule -> tasks -> station clipboard -> time tracking

Partner journeys:

- [ ] Invite claim -> partner portal -> profile update -> preview

Admin journeys:

- [ ] Access control -> platform overview -> key admin operations

Public/guest journeys:

- [ ] Chef page -> inquiry
- [ ] Guest share/RSVP flow

Kiosk journeys:

- [ ] Pairing -> PIN -> inquiry submit -> idle reset

Exit criteria:

- All critical cross-role journeys pass end-to-end
- Evidence captured (screenshots/logs/test output)

## Phase 6 - Beta Stabilization Gate (Days 22-26)

Objective: validate production-like behavior with real testers.

- [ ] Execute `docs/beta-testers.md` pre-flight
- [ ] Run Phase 1 smoke test cohort
- [ ] Fix all discovered `P0/P1`
- [ ] Run Phase 2 broader cohort
- [ ] Triage and close launch-critical issues

Exit criteria:

- Beta core flows stable
- No active `P0`
- No unresolved `P1` in core paths

## Phase 7 - Production Go/No-Go (Day 27)

Objective: formal release readiness decision.

Go-live checklist:

- [ ] Hierarchy checklist completed (`docs/deployment-evaluation-hierarchy.md`)
- [ ] `P0 = 0`
- [ ] Core-path `P1 = 0`
- [ ] Build and type checks pass
- [ ] Regression suite pass rate acceptable
- [ ] Environment variables validated for production
- [ ] Database backup completed immediately before release
- [ ] Migration plan reviewed and approved
- [ ] Rollback steps confirmed (`docs/rollback-plan.md`)
- [ ] Monitoring/alerting active and verified

Decision:

- [ ] GO
- [ ] NO-GO (with blocking reasons documented)

## Phase 8 - Deployment and Hypercare (Days 28-30)

Objective: safe launch and rapid stabilization.

- [ ] Deploy production release candidate
- [ ] Verify health endpoints and critical routes
- [ ] Monitor error rates, auth failures, payment flows, queue backlogs
- [ ] Run rollback immediately if thresholds are breached
- [ ] Log all launch incidents and resolutions

Exit criteria:

- 72 hours stable operation
- No critical incident unresolved

## Section Review Template (Use For Every Hierarchy Item)

Copy/paste per section during execution:

- Section:
- Scope routes/components:
- Owner:
- Status: `not started | in progress | blocked | done`
- Defects found (`P0/P1/P2/P3`):
- Fixes completed:
- Tests executed:
- Evidence links:
- Sign-off date:

## Working Cadence

Daily:

- 1. Triage new defects
- 2. Execute one hierarchy section
- 3. Fix blockers
- 4. Re-test and document evidence

End of day:

- [ ] Update hierarchy checklist
- [ ] Update defect tracker
- [ ] Update roadmap status by phase

## Final Launch Condition

ChefFlow is deployment-ready only when:

- All hierarchy sections are evaluated
- Core sections are clean of launch blockers
- Cross-role journeys are certified
- Beta validates real-user behavior
- Rollback readiness is confirmed
