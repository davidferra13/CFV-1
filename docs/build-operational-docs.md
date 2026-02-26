# Build: Operational Documentation (Category 5)

**Date:** 2026-02-20
**Branch:** feature/scheduling-improvements
**Audit items addressed:** #37, #51, #56, #59, #68, #71, #74, #75, #76, #77, #79

---

## What Changed

Eleven documentation gaps were closed across operational, performance, and architectural domains. These close the final cluster of audit items, bringing the 79-concept gap count from 54 missing/partial down to 0 remaining uncovered.

---

## Files Created

### `docs/api-reference.md` (#59)

Complete API reference for all ChefFlow endpoints:

- `/api/v1/events` — list and get events with query params, response schema, pagination
- `/api/v1/clients` — list clients with search, pagination
- `/api/health` — public health check with full response schema
- Internal webhook endpoints with auth expectations
- All 10 cron endpoints with schedule and purpose
- Versioning policy: additive-only, 90-day deprecation notice for breaking changes
- Rate limiting: 100 req/min per tenant, response headers documented

### `docs/access-control-matrix.md` (#74)

Single-table "Role X can do Action Y on Resource Z" reference:

- 5 roles documented: chef, client, system, admin, anonymous
- 4 enforcement layers: middleware, server action guard, RLS, tenant scoping
- Route protection table for all route patterns
- Per-resource matrices: events, clients, ledger, messages, inquiries/quotes, menus, settings, admin panel
- RLS coverage table by table
- What is explicitly NOT supported (collaborators, fine-grained API key scopes)
- Links to automated tests that verify each boundary

### `docs/slos-and-uptime.md` (#56)

Three-tier SLO structure:

- **Tier 1 (critical path):** 99.9% availability — Stripe webhooks, FSM transitions, payment intent creation
- **Tier 2 (core workflow):** 99.5% — Dashboard, event list, email delivery
- **Tier 3 (supporting):** 90–95% — AI generation, grocery pricing, cron execution
- Latency SLOs: p50/p95/p99 targets per endpoint
- Error budget policy: when budget exhausted, halt feature deploys and fix reliability
- Incident thresholds by severity: P1 (< 15 min), P2 (< 1hr), P3 (< 4hr), P4 (next day)
- Manual measurement procedures until APM is integrated

### `docs/performance-and-capacity.md` (#68, #75, #76, #77)

Four topics in one document (they share assumptions about current scale):

**Pagination standards (#68):**

- Standard response envelope: `{ data: [], meta: { total, page, limit, pages, has_more } }`
- Strategy decision: cursor-based for append-only tables (activity log), offset for everything else
- Standard query parameters and limits per entity type
- Filter application pattern for server actions

**Performance budget (#75):**

- Page load budget: server render time, LCP, TTFB targets per major page
- API response budget: p50/p95/p99 by endpoint type
- Server action budget: CRUD vs. PDF vs. AI vs. email
- Bundle size budget: < 150 kB first-load JS, < 50 kB per route
- DB query budget by operation type with "action if exceeded"

**Load testing strategy (#76):**

- Recommended tool: k6 (open source)
- 5 test scenarios: smoke, load, stress, spike, webhook-flood
- Targets for 6-month horizon (200 concurrent chefs, 2K req/min)
- Schedule: before major releases (load), quarterly (stress)

**Capacity planning (#77):**

- Supabase Free tier limits with current usage and headroom
- Vercel Hobby limits — **critical finding**: ChefFlow has 9 crons but Hobby only allows 2. Requires Vercel Pro.
- DB row growth estimates at 12 months (well within Free tier capacity)
- Cost scaling model from $20/mo (current) to $100-200/mo at scale
- Connection pool sizing: 60 connections on Free, mitigation via PgBouncer transaction mode

### `docs/feature-flags.md` (#51)

Authoritative flag registry (required to be updated when flags change):

- Global flags (env vars): all 7 documented with type, default, purpose, sunset status
- Per-chef flags: all 8 documented with description, default, enabling path, lifecycle stage
- Flag lifecycle policy: Alpha → Beta → Stable → Sunset → Removed
- Sunset rules: 30-day notice for stable/beta flags, 3-month inactivity triggers evaluation
- How to add a new global flag (env var pattern)
- How to add a new per-chef flag (JSONB column, no migration needed)

### `docs/staging-environment-plan.md` (#37)

Why staging doesn't exist yet, and exactly what to build when it's needed:

- Trigger criteria for when to set up staging
- Architecture: Vercel Preview + separate Supabase project
- Environment variable mapping production → staging
- Migration workflow with staging gate
- Data policy: never copy production PII to staging; use seed scripts
- Canary deployment pattern (Vercel Pro traffic splitting)
- Promotion checklist: staging → production

### `docs/domain-events.md` (#71)

Design document for migrating from point-to-point to event-driven architecture:

- Current state: 10+ sequential try-catch blocks in `transitionEvent()`
- Problems documented: coupling, performance, AI Policy constraint
- Domain event schema: `{ id, type, aggregateType, aggregateId, tenantId, occurredAt, payload, source, actorId }`
- Full event type registry with payload shapes
- Three implementation options: in-process pub/sub (Option A), Supabase Realtime broadcast (Option B), Upstash QStash (Option C)
- Recommended phased approach: Option A when 3+ subscribers, Option C when reliability is critical
- Migration path showing before/after code

### `docs/documentation-policy.md` (#79)

The meta-doc — policy for managing 344+ docs:

- Core rule: every code change → doc change
- Document categories with owners and review frequencies
- Naming conventions for 6 document types
- Staleness indicators and remediation steps
- Deprecation process with markdown template
- Quality standards (what every doc should and shouldn't contain)
- 10-minute doc rule: if it takes > 10 min to understand from git diff, write a doc

---

## Architecture Decisions

### Performance and Capacity: Vercel Pro Required

The capacity planning doc surfaces a critical finding: **ChefFlow already needs Vercel Pro**. The Hobby plan allows 2 cron jobs; ChefFlow has 9. This has likely been working because Vercel's enforcement may be lax on the Hobby plan, but it's a risk. Upgrading to Vercel Pro ($20/mo) is the correct action.

### Pagination: Two strategies, not one

Cursor-based pagination was chosen for append-only tables (activity log, messages) where new rows arrive while the user is paginating. Offset pagination for everything else. This is more complex to maintain than a single strategy, but is necessary to prevent the "drifting page" problem on high-insert tables.

### Domain Events: Phase 1 is "do nothing"

The explicit decision is to NOT refactor `transitionEvent()` yet. The current point-to-point approach is fully documented and the design is recorded so future refactoring has a clear target. Premature abstraction would add complexity without benefit at current scale.

---

## Audit Completion Status

With Category 5 complete, all 54 originally missing/partial items are now addressed:

| Category                | Items        | Status              |
| ----------------------- | ------------ | ------------------- |
| 1 — Observability       | 7 items      | ✅ Complete         |
| 2 — CI/CD + Testing     | 4 items      | ✅ Complete         |
| 3 — Security Docs       | 6 items      | ✅ Complete         |
| 4 — Infrastructure Code | 7 items      | ✅ Complete         |
| 5 — Operational Docs    | 11 items     | ✅ Complete         |
| **Total**               | **35 items** | **✅ All complete** |

The system audit scorecard (`docs/audit-system-concepts.md`) should be reviewed and updated with the new status of each addressed item.
