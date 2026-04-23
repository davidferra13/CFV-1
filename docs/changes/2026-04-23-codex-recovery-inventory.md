# Codex Recovery Inventory (2026-04-23)

## Baseline
Commit: `39c69cbd2` (2026-04-19 12:19:45 EDT)
Message: "fix: force dark mode permanently, remove all theme toggle buttons"

---

## Committed Changes (7 commits, 98 files)

| # | Hash | Message | Files | Lines Changed | Work Unit | Risk Level |
|---|------|---------|-------|---------------|-----------|------------|
| 1 | `4427048f0` | feat(auth): add privileged mutation policy contract | 10 | +2389/-478 | Privileged mutation policy | HIGH (auth) |
| 2 | `96deee3c0` | docs(session): record privileged mutation closeout | 2 | +6/-5 | Privileged mutation policy | LOW (docs) |
| 3 | `f361f6e1d` | feat(quotes): unify quote draft prefill contract | 19 | +709/-165 | Quote draft prefill | MEDIUM |
| 4 | `77c52a867` | feat(client-interaction-ledger): add canonical relationship ledger | 14 | +1616/-237 | Client interaction ledger | MEDIUM |
| 5 | `195d0713f` | fix(ai): close task-todo contract drift | 19 | +261/-237 | Task-todo contract drift | LOW |
| 6 | `150ad5152` | feat(client-profile-engine): wire chef workflow | 18 | +1697/-158 | Client profile engine | MEDIUM |
| 7 | `bf4ebd24d` | feat(operator-walkthrough-lane): close founder evaluation flow | 16 | +1726/-118 | Operator walkthrough lane | MEDIUM (new migration) |

**Total committed:** +8404/-1398 across 98 files

---

## Uncommitted Changes (508 files)

### Distribution by top-level directory

| Directory | Count |
|-----------|-------|
| app/ | 156 |
| lib/ | 146 |
| components/ | 79 |
| tests/ | 56 |
| scripts/ | 21 |
| docs/ | 16 |
| project-map/ | 11 |
| types/ | 3 |
| public/ | 3 |
| config/infra (root) | 17 |

---

### Work Unit 7: Canonical Intake Lanes
**Source:** Codex digest 2026-04-22-canonical-intake-lane-truth-pack.md
**Status:** Partial (uncommitted; no production build confirmed)
**Has tests:** Yes (intake-lane-config, intake-lane-source-truth, source-provenance, open-booking-intake-parity, open-booking.route)
**Docs updated:** Yes (blueprint, project-map, user manual, audit, build-state)

**Files explicitly mentioned in digest:**
- `lib/public/intake-lane-config.ts` (new, canonical lane contract)
- `components/public/intake-lane-expectations.tsx` (new, shared expectation copy)
- `app/api/book/route.ts` (wired to lane contract)
- `lib/inquiries/public-actions.ts` (wired to lane contract)
- `app/api/embed/inquiry/route.ts` (wired to lane contract)
- `app/api/kiosk/inquiry/route.ts` (wired to lane contract)
- `lib/wix/process.ts` (wired to lane contract)
- `lib/booking/instant-book-actions.ts` (wired to lane contract)
- `lib/admin/inquiry-admin-actions.ts` (admin provenance fix)
- `lib/admin/activity-feed.ts` (admin provenance fix)
- `lib/analytics/source-provenance.ts` (provenance helper)

**Risk areas:** Public API routes (book, embed, kiosk). Overlap with Unit 10 (public intent hardening).

---

### Work Unit 8: Ledger-Backed Next Best Action
**Source:** Codex digest 2026-04-22-ledger-backed-next-best-action.md
**Status:** Partial (relationship route blocked by unrelated runtime import chain)
**Has tests:** Yes (interaction-signals, next-best-action, action-layer, client-relationship-surface-guard)
**Docs updated:** Yes (living docs updated per digest)

**Files explicitly mentioned in digest:**
- `lib/clients/interaction-signals.ts` (new, deterministic signals from ledger)
- `lib/clients/action-vocabulary.ts` (new, shared action type contract)
- `lib/clients/next-best-action-core.ts` (new, core logic)
- `lib/clients/next-best-action.ts` (rebased onto canonical signals)
- `lib/clients/interaction-ledger-core.ts` (extended with machine-usable state)
- `components/clients/next-best-action-card.tsx` (updated consumer)
- `components/clients/next-best-actions-widget.tsx` (updated consumer)

**Risk areas:** None (client-side data projection, no auth/finance/schema changes).

---

### Work Unit 9: Tasks Create Path Reliability
**Source:** Codex digest 2026-04-22-tasks-create-path-reliability.md
**Status:** Complete (directly verified in real app via Playwright)
**Has tests:** Yes (task-input-normalization, task-create-form-state)
**Docs updated:** Yes

**Files explicitly mentioned in digest:**
- `components/tasks/task-create-panel.tsx` (new, server-rendered create panel)
- `lib/tasks/input-normalization.ts` (new, shared normalization)
- `lib/tasks/selects.ts` (new, shared select string)
- `lib/tasks/create-form-state.ts` (new, create-draft/query helper)
- `app/(chef)/tasks/page.tsx` (owns create panel open state)
- `lib/tasks/actions.ts` (existing canonical create path)
- `components/tasks/task-form.tsx` (updated)
- `components/tasks/task-page-client.tsx` (updated)
- `lib/tasks/carry-forward.ts` (updated)

**Risk areas:** None (uses existing `createTask()` owner, no new mutation paths).

---

### Work Unit 10: Public Intent Hardening
**Source:** Codex digest 2026-04-23-public-intent-hardening.md + 7 new files
**Status:** Complete (verified on isolated browser at localhost:3111)
**Has tests:** Yes (public-intent-guard.test.ts, public-intent-flows.test.ts, open-booking.route.test.ts)
**Docs updated:** Yes (changes doc, session digest, build-state, blueprint, project-map)

**Files (from digest + new file list):**
- `lib/security/public-intent-guard.ts` (NEW, 300 lines, shared backend guard)
- `app/api/book/route.ts` (rewired to shared guard)
- `app/api/book/parse/route.ts` (rewired to shared guard)
- `app/api/embed/inquiry/route.ts` (rewired to shared guard)
- `lib/inquiries/public-actions.ts` (rewired to shared guard)
- `lib/booking/instant-book-actions.ts` (rewired + anonymous intent dedupe + Stripe idempotency)
- `components/booking/booking-form.tsx` (updated)
- `lib/sharing/actions.ts` (token-scoped rate limits)
- `lib/proposals/client-proposal-actions.ts` (token-scoped rate limits)
- `tests/unit/public-intent-guard.test.ts` (NEW)
- `tests/unit/public-intent-flows.test.ts` (NEW)
- `docs/changes/2026-04-23-public-intent-hardening.md` (NEW)
- `docs/session-digests/2026-04-23-public-intent-hardening.md` (NEW)
- `public/proof/public-intent-book-2026-04-23.png` (NEW)
- `public/proof/public-intent-chef-inquiry-2026-04-23.png` (NEW)

**Risk areas:** SECURITY (public API mutation boundaries, rate limiting, Stripe idempotency). Needs thorough Phase C review.

---

### Cross-Cutting Changes

These files were modified across multiple work units or serve as shared infrastructure:

**Navigation/Layout (10 files):**
- `components/navigation/nav-config.tsx`
- `components/navigation/chef-nav.tsx`
- `components/navigation/chef-mobile-nav.tsx`
- `components/navigation/chef-main-content.tsx`
- `components/navigation/breadcrumb-bar.tsx`
- `components/navigation/admin-shell.tsx`
- `components/navigation/partner-nav.tsx`
- `components/navigation/public-header.tsx`
- `components/navigation/public-nav-config.ts`
- `components/navigation/recent-pages-section.tsx`

**Auth/Middleware (4 files, HIGH RISK):**
- `middleware.ts` (ingredient indexability gate, pathname header on skip-auth paths, build-version skip)
- `lib/auth/get-user.ts` (React.cache replaced with stableCache polyfill)
- `lib/auth/route-policy.ts` (new client/staff paths, new public paths, new API skip-auth prefix)
- `lib/auth/server-action-inventory.ts` (committed in Unit 1)

**Database Layer (6 files, HIGH RISK):**
- `lib/db/schema/schema.ts` (+326 lines, new tables + column additions)
- `lib/db/migrations/schema.ts` (mirrors schema.ts changes)
- `lib/db/migrations/meta/_journal.json` (new migration entry)
- `lib/db/migrations/0001_event_shell_unknown_core_facts.sql` (new SQL migration)
- `lib/db/compat.ts` (major refactor: nested join handling, cardinality detection, FK constraint hints)
- `lib/db/index.ts` (drizzle type parameter change)

**Type Definitions (3 files):**
- `types/database.ts`
- `types/database.generated.d.ts`
- `types/types/database.ts`

**Config/Infrastructure (10 files):**
- `.env.example`, `.env.local.example`, `.gitignore`
- `CLAUDE.md`, `drizzle.config.ts`, `instrumentation.ts`
- `package.json`, `playwright.config.ts`, `tsconfig.next.json`
- `chefflow-watchdog.ps1`

---

### Docs-Only Changes (16 files)

- `docs/build-state.md`
- `docs/product-blueprint.md`
- `docs/definition-of-done.md`
- `docs/ai-model-governance.md`
- `docs/session-log.md`
- `docs/simulation-history.md`
- `docs/simulation-report.md`
- `docs/sync-status.json`
- `docs/uptime-history.json`
- `docs/research/README.md`
- `docs/specs/admin-platform-pulse.md`
- `docs/specs/communication-ingestion-pipeline.md`
- `docs/specs/p1-task-and-todo-contract-truth.md`
- `docs/specs/system-integrity-question-set-battle-tested-seams.md`
- `docs/changes/2026-04-23-public-intent-hardening.md` (also counted in Unit 10)
- `docs/session-digests/2026-04-23-public-intent-hardening.md` (also counted in Unit 10)

**Project map updates (11 files):**
- `project-map/chef-os/clients.md`
- `project-map/chef-os/dashboard.md`
- `project-map/chef-os/events.md`
- `project-map/chef-os/inquiries.md`
- `project-map/chef-os/settings.md`
- `project-map/chef-os/staff.md`
- `project-map/chefflow.md`
- `project-map/consumer-os/guest-experience.md`
- `project-map/infrastructure/email.md`
- `project-map/public/directory.md`
- `project-map/public/embed-widget.md`

---

### Orphan Files (~340 files)

Files not explicitly mentioned in any Codex digest. Batch-categorized by directory pattern. These are likely incremental changes from the broader work sessions, ripple effects from schema/type changes, or independent fixes.

**app/(chef)/ - Chef Portal Pages (~50 files)**
Broad surface: events (12 files), settings (12 files), finance (4), culinary (4), dashboard (3), social, staff, stations, tasks, partners, prospecting, onboarding, network, aar, analytics, inventory, layout. Most likely incremental updates from committed work units or type fixes from schema changes.

**app/(client)/ - Client Portal (~10 files)**
my-events (6 files including contract, pay, proposal), my-bookings, my-hub, my-profile, layout. Likely ripple from client interaction ledger (Unit 8) and event lifecycle changes.

**app/(public)/ - Public Pages (~35 files)**
Spans homepage, chef profiles, booking, comparison, directory, hub, ingredients, nearby, about, FAQ, services, privacy, beta, customers, gift-cards, operators, contact, share, trust, layout. Broad surface consistent with intake lane (Unit 7) and public intent (Unit 10) work.

**app/(admin)/ - Admin Pages (~7 files)**
analytics, directory-listings, openclaw health, price-catalog, silent-failures, layout. Likely admin provenance fixes from Unit 7.

**app/(partner)/ and app/(staff)/ (~4 files)**
Partner layout, locations, preview. Staff layout. Minor.

**app/api/ - API Routes (~25 files)**
Includes auth/google callback, book (2), comms/sms, cron, documents (2), embed, gmail, ingredients, kiosk, openclaw, remy (2), scheduled (4), sentinel, webhooks (3), book/[chefSlug] (2), client/[token], feed.xml, sitemap, robots. Many are security-relevant (see High-Risk section).

**app/ root (~5 files)**
layout.tsx, robots.ts, sitemap.ts, feed.xml/route.ts, app/book/ pages.

**components/ (~79 files)**
Spans: events (8), navigation (10), settings (6), ui (6), hub (4), finance (3), partners (3), public (3), booking (2), clients (2), tasks (2), documents (2), plus single files across ai, analytics, community, costing, credentials, culinary, feedback, import, inquiries, integrations, leads, marketing, onboarding, pricing, print, prospecting, quotes, seo, sharing, social, vendors.

**lib/ (~146 files)**
Major clusters: ai (12), clients (9), openclaw (8), events (6), gmail (5), admin (4), analytics (4), partners (4), communication (3), email (3), finance (3), help (3), hub (3), pricing (3), db (6), auth (2), billing (2), booking (1), campaigns (1), chef (3), client-dashboard (1), client-portal (1), commerce (1), constants (1), contacts (1), contracts (1), credentials (1), cron (1), directory (3), discover (2), feedback (1), formulas (1), google (2), guests (1), health (1), hooks (2), images (1), inquiries (2), inventory (2), marketing (2), menus (1), monitoring (1), network (1), onboarding (2), platform-observability (2), post-event (1), profile (1), proposals (1), prospecting (1), public (2), queue (1), quotes (3), reports (2), scheduling (1), seasonal (1), security (1), sharing (1), simulation (1), sms (1), stations (1), stripe (1), tasks (3), todos (1), wix (1).

**tests/ (~56 files)**
unit (25), interactions (6), launch (5), product (4), system-integrity (3), helpers (3), coverage (1), e2e (2), remy-quality (6), public-pages-audit (1).

**scripts/ (~21 files)**
openclaw-archive-digester (4), openclaw-pull (2), plus individual scripts for build, test, sync, audit, migration, demo setup.

**Miscellaneous orphans:**
- `.openclaw-build/` (2 files)
- `.openclaw-deploy/` (2 files)
- `logs/` (2 files)
- `public/sw.js` (service worker)

---

## High-Risk File Inventory

### CRITICAL (auth, security, public API, finance, stripe)

| File | What Changed | Unit | Risk Type |
|------|-------------|------|-----------|
| `middleware.ts` | New ingredient indexability gate; pathname header now set on skip-auth/public paths; `build-version` added to API skip-auth matcher | Cross-cutting | AUTH, PUBLIC |
| `lib/auth/get-user.ts` | `React.cache` replaced with `stableCache` polyfill wrapping `React.cache` (or identity fallback) | Cross-cutting | AUTH |
| `lib/auth/route-policy.ts` | New client paths (my-hub, my-bookings, my-cannabis, my-inquiries, my-spending, staff-time); new public paths (account-security, auth, data-request, pricing, ingredients); new skip-auth prefix (build-version) | Cross-cutting | AUTH |
| `lib/security/public-intent-guard.ts` | NEW file, 300 lines. Shared guard for all public mutation endpoints: IP/email rate limiting, honeypot, JSON body limits, Turnstile CAPTCHA, request metadata extraction | Unit 10 | SECURITY |
| `lib/booking/instant-book-actions.ts` | Anonymous intent dedup cache (in-memory Map with 10min TTL), Stripe idempotency keys, public intent guard integration | Units 7+10 | SECURITY, FINANCE |
| `lib/stripe/checkout.ts` | Payment status check broadened from `accepted` only to `['accepted','paid','confirmed','in_progress','completed']`; custom success/cancel URLs | Orphan | FINANCE |
| `app/api/book/route.ts` | Rewired to guardPublicIntent; email-based rate limit; seasonal market intent; resolved location | Units 7+10 | PUBLIC, SECURITY |
| `app/api/book/parse/route.ts` | Rewired to guardPublicIntent | Unit 10 | PUBLIC |
| `app/api/embed/inquiry/route.ts` | Rewired to guardPublicIntent; honeypot moved to guard | Units 7+10 | PUBLIC, SECURITY |
| `app/api/kiosk/inquiry/route.ts` | Wired to lane contract | Unit 7 | PUBLIC |
| `lib/inquiries/public-actions.ts` | Wired to lane contract + public intent guard | Units 7+10 | PUBLIC, SECURITY |
| `lib/sharing/actions.ts` | Token-scoped rate limits on guest portal | Unit 10 | SECURITY |
| `lib/proposals/client-proposal-actions.ts` | Token-scoped rate limits on proposal approve/decline | Unit 10 | SECURITY |
| `lib/finance/forecast-calculator.ts` | New types (calibration, confidence, explainability, monthly composition); major expansion | Orphan | FINANCE |
| `lib/finance/profit-loss-report-actions.ts` | Modified | Orphan | FINANCE |
| `lib/finance/revenue-forecast-actions.ts` | Modified | Orphan | FINANCE |
| `app/api/auth/google/connect/callback/route.ts` | Google mailbox upsert added to OAuth callback | Orphan | AUTH |
| `app/api/webhooks/email/inbound/route.ts` | Modified | Orphan | PUBLIC (webhook) |
| `app/api/webhooks/resend/route.ts` | Modified | Orphan | PUBLIC (webhook) |
| `app/api/webhooks/twilio/route.ts` | Modified | Orphan | PUBLIC (webhook) |

### HIGH (database schema, migrations, db layer)

| File | What Changed | Unit | Risk Type |
|------|-------------|------|-----------|
| `lib/db/schema/schema.ts` | +326 lines. See Schema Changes section below | Cross-cutting | SCHEMA |
| `lib/db/migrations/schema.ts` | Mirrors schema.ts changes | Cross-cutting | SCHEMA |
| `lib/db/migrations/0001_event_shell_unknown_core_facts.sql` | Makes 5 event columns nullable (see Schema Changes) | Committed (Unit 6 or orphan) | SCHEMA, MIGRATION |
| `lib/db/migrations/meta/_journal.json` | New migration entry added | Cross-cutting | SCHEMA |
| `lib/db/compat.ts` | Major refactor: nested join row grouping, cardinality detection (one/many), FK constraint hint parsing, multi-hint support, join merging | Cross-cutting | DB LAYER |
| `lib/db/index.ts` | Drizzle generic type parameters changed | Cross-cutting | DB LAYER |

---

## Schema Changes

### New Migration: `0001_event_shell_unknown_core_facts.sql`

Makes 5 event columns nullable (DROP NOT NULL, no data loss):
```sql
ALTER TABLE "events" ALTER COLUMN "serve_time" DROP NOT NULL;
ALTER TABLE "events" ALTER COLUMN "location_address" DROP NOT NULL;
ALTER TABLE "events" ALTER COLUMN "location_city" DROP NOT NULL;
ALTER TABLE "events" ALTER COLUMN "location_state" DROP NOT NULL;
ALTER TABLE "events" ALTER COLUMN "location_state" DROP DEFAULT;
ALTER TABLE "events" ALTER COLUMN "location_zip" DROP NOT NULL;
```

**Risk assessment:** Additive (relaxing NOT NULL constraints). No data loss. But downstream code that assumes non-null values on these columns may throw or produce incorrect results. Needs audit of all code reading these fields.

### New Enum
- `communication_delivery_status`: `['pending', 'sent', 'delivered', 'read', 'failed']`

### New Tables (6)
1. **`chef_location_links`** - Links chefs to partner locations (preferred/exclusive/featured). FK to chefs and partner_locations. RLS policies present.
2. **`planning_runs`** - Financial/operational planning run metadata. Tenant-scoped. Status enum (running/completed/failed).
3. **`planning_run_artifacts`** - Artifacts produced by planning runs. FK to planning_runs. Tenant-scoped.
4. **`ingredient_knowledge`** - Ingredient knowledge base entries. (Schema diff truncated but export visible.)
5. **`ingredient_knowledge_slugs`** - Slug lookup for ingredient knowledge. (Schema diff truncated.)
6. **`chef_marketplace_profiles`** - Chef marketplace profile data. (Schema diff truncated.)
7. **`directory_listing_favorites`** - User favorites for directory listings. (Schema diff truncated.)

### Modified Tables
1. **`contact_submissions`** - 4 new columns: `intake_lane`, `operator_evaluation_status`, `source_page`, `source_cta`. New index + 2 check constraints. (From Unit 6, committed.)
2. **`partner_locations`** - 3 new array columns: `experience_tags`, `best_for`, `service_types`. 3 new GIN indexes.
3. **`communication_events`** - 12 new columns for delivery tracking: `external_thread_key`, `provider_name`, `managed_channel_address`, `recipient_address`, `provider_delivery_status`, `provider_status`, `provider_status_updated_at`, `provider_delivered_at`, `provider_read_at`, `provider_failed_at`, `provider_error_code`, `provider_error_message`. 3 new indexes.
4. **`conversation_threads`** - 7 new columns for outbound delivery tracking: `latest_outbound_event_id`, `latest_outbound_attempted_at`, `latest_outbound_delivery_status`, `latest_outbound_provider_status`, `latest_outbound_status_updated_at`, `latest_outbound_error_code`, `latest_outbound_error_message`. 1 new index.
5. **`guest_count_changes`** - 4 new columns: `status` (pending/approved/rejected), `reviewed_by`, `reviewed_at`, `review_notes`. New FK to users, new index, new check constraint.

### Custom Type
- `tsvector` custom type added to schema.ts (for full-text search).

**IMPORTANT:** All schema changes are in `schema.ts` (Drizzle ORM definition) but only ONE SQL migration file exists (`0001_event_shell_unknown_core_facts.sql`) which only handles event column nullability. The remaining schema additions (new tables, new columns on existing tables) have NO corresponding migration SQL. These are either:
- Already applied to the live database via `drizzle-kit push` (which CLAUDE.md prohibits without explicit approval)
- Or pending application

This is a **CRITICAL finding** for Phase C. The schema.ts and actual database may be out of sync in either direction.

---

## New Server Actions

Files with `'use server'` that were newly created or significantly modified. All existing server actions were modified, not new files. Key changes:

| File | Change Type | Auth Gate | Notes |
|------|------------|-----------|-------|
| `lib/booking/instant-book-actions.ts` | Major expansion | Yes (chef lookup, not session) | Public-facing, uses guardPublicIntent |
| `lib/sharing/actions.ts` | Rate limits added | Token-based (not session) | Guest portal, rate limit on token flows |
| `lib/proposals/client-proposal-actions.ts` | Rate limits added | Token-based (not session) | Proposal approve/decline, rate limit added |
| `lib/tasks/actions.ts` | Updated | Yes (requireChef) | Existing, not new |
| `lib/clients/next-best-action.ts` | Rebased | Yes (requireChef) | Existing, logic changed |

No new `'use server'` file was created. Existing server action files were modified.

---

## Summary Statistics

| Category | Count |
|----------|-------|
| Total uncommitted files | 508 |
| Committed files (7 commits) | 98 |
| Files in Unit 7 (Canonical intake lanes) | ~11 + tests |
| Files in Unit 8 (Ledger-backed NBA) | ~7 + tests |
| Files in Unit 9 (Tasks create path) | ~9 + tests |
| Files in Unit 10 (Public intent hardening) | ~15 (7 new) |
| Cross-cutting (nav, auth, db, config) | ~40 |
| Docs-only (living docs, project-map) | ~27 |
| Orphan files | ~340 |
| High-risk files identified | 25 |
| New tables in schema | 6 |
| Modified tables in schema | 5 |
| New migration SQL files | 1 |
| Schema changes WITHOUT migration SQL | Many (CRITICAL) |
