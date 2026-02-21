# ChefFlow V1 — Full System Audit
## 79 Concepts Named, Numbered, and Evaluated

**Legend:** ✅ Implemented · ⚠️ Partial · ❌ Missing/Not Documented

---

## 1. Cron
**Status:** ✅ Implemented
**What exists:** 18 scheduled job handlers under `app/api/scheduled/`. Each validates `Authorization: Bearer ${CRON_SECRET}` before executing. Declared in `vercel.json` (crons block). Intervals range from every 5 minutes to daily.
**Key file:** `app/api/scheduled/` (18 route handlers), `vercel.json`
**Gap:** No idempotency guarantees on re-triggered crons; no UI dashboard for cron health status.

---

## 2. Scheduler
**Status:** ✅ Implemented
**What exists:** Vercel cron scheduler via `vercel.json`. Endpoints include automations (15 min), follow-ups, lifecycle events, revenue goals, social publishing, Gmail sync, loyalty expiry, waitlist sweeps, and more.
**Key file:** `vercel.json`, `app/api/scheduled/*`
**Gap:** No declarative schedule registry in code (schedules live in Vercel dashboard + vercel.json). Missed run detection not implemented.

---

## 3. Trigger
**Status:** ✅ Implemented (multiple kinds)
**What exists:**
- **DB triggers:** `validate_event_state_transition()` (blocks invalid FSM transitions), immutability triggers on `ledger_entries` and `*_state_transitions` tables, `log_event_state_transition()` auto-fills audit log.
- **App triggers:** `transitionEvent()` in `lib/events/transitions.ts` manually evaluates automations, sends notifications, logs activity — all triggered by FSM transitions.
- **Webhook triggers:** Stripe webhooks trigger ledger entries and event state changes.
**Key files:** `supabase/migrations/20260306000001_event_immutability_triggers.sql`, `lib/events/transitions.ts`
**Gap:** Triggers are scattered across migrations with no central registry. No trigger unit tests.

---

## 4. Webhook
**Status:** ✅ Implemented
**What exists:**
- **Inbound:** `app/api/webhooks/stripe` (HMAC signature verified), `app/api/webhooks/resend` (email bounce/complaint), `app/api/webhooks/wix` (form ingestion), `app/api/webhooks/[provider]` (generic).
- **Outbound (chef-configured):** `webhook_endpoints` table stores per-chef webhook URLs with HMAC-SHA256 signing; deliveries recorded in `webhook_deliveries`.
**Key files:** `app/api/webhooks/stripe/route.ts`, `supabase/migrations/20260309000002_webhook_endpoints.sql`
**Gap:** No retry/backoff strategy for outbound webhook delivery. No webhook event schema versioning. No DLQ for failed deliveries.

---

## 5. Endpoint
**Status:** ✅ Implemented (52+ endpoints)
**What exists:** Complete endpoint inventory across: auth, webhooks, cron, documents (PDF generation), push notifications, social OAuth, integration callbacks, API v1, activity tracking, Stripe Connect.
**Key paths:** `app/api/` (52 documented endpoints)
**Gap:** No centralized endpoint inventory document. No deprecation policy.

---

## 6. API Route
**Status:** ✅ Implemented
**What exists:** Next.js App Router `route.ts` files throughout `app/api/`. Public REST API at `/api/v1/events` and `/api/v1/clients` with Bearer API key auth and Upstash rate limiting.
**Key files:** `app/api/v1/events/route.ts`, `app/api/v1/clients/route.ts`
**Gap:** No OpenAPI spec. No machine-readable contract for API consumers.

---

## 7. Middleware
**Status:** ✅ Implemented
**What exists:** `middleware.ts` (203 lines) handles: session refresh on every request, role-based route protection (chef/client/admin routes), role caching via cookie (5-min TTL), session-only mode (strips maxAge when "remember me" unchecked), redirect with cookie preservation.
**Key file:** `middleware.ts`
**Gap:** No request correlation ID injected. No real-IP logging. CSP uses `unsafe-inline` (no nonce generation).

---

## 8. Authentication
**Status:** ✅ Implemented
**What exists:** Supabase Auth (email + password). `lib/auth/actions.ts` handles signup (chef + client), sign-in (rate-limited 5 attempts/15 min), password reset. Client invitation tokens (DB-backed JWTless flow). Middleware refreshes tokens on every navigation.
**Key files:** `lib/auth/actions.ts`, `lib/auth/get-user.ts`, `lib/auth/invitations.ts`
**Gap:** No 2FA/MFA. No passwordless (magic links/passkeys). No account lockout after N failed attempts. No session inventory UI. No OAuth login (social OAuth is for integrations only, not sign-in).

---

## 9. Authorization
**Status:** ✅ Implemented
**What exists:** Role-based auth via `requireChef()`, `requireClient()`, `requireAuth()` — called at the top of every server action. `user_roles` table is single source of truth (entity_id + auth_user_id + role enum). React `cache()` wraps `getCurrentUser()` for one DB query per request. Admin gated by `ADMIN_EMAILS` env var.
**Key files:** `lib/auth/get-user.ts`, `lib/auth/admin.ts`
**Gap:** No granular permission scopes (read vs. write). No collaborator/shared-access model. No audit trail for role changes. No formal access control matrix document.

---

## 10. Row Level Security (RLS)
**Status:** ✅ Implemented
**What exists:** RLS enabled on all 60+ tables. Chef access uses `get_current_tenant_id()` helper. Client access uses `get_current_client_id()`. Ledger and transition tables have SELECT-only policies (no UPDATE/DELETE). RLS bugs were discovered and patched in migrations `20260217000001` and `20260307000001`.
**Key files:** `supabase/migrations/20260215000001_layer_1_foundation.sql` (and all subsequent layers)
**Gap:** `user_roles.entity_id` lacks explicit FK to chefs/clients (design choice — polymorphic). No automated multi-tenant isolation verification tests.

---

## 11. Policy
**Status:** ✅ Implemented
**What exists:** 80+ `CREATE POLICY` statements across all migrations. Granular per-role, per-operation policies (SELECT/INSERT/UPDATE). Immutable tables (ledger, transitions) have no WRITE policies. All key chef/client/admin access paths covered.
**Key files:** All `supabase/migrations/*.sql` files
**Gap:** No policy registry document. Policy count and coverage not audited programmatically.

---

## 12. Service Role Key
**Status:** ✅ Implemented
**What exists:** `SUPABASE_SERVICE_ROLE_KEY` used server-side for admin operations (user creation during signup, bypassing RLS for system-level writes like Stripe webhook ledger entries). Never exposed to client.
**Key files:** `lib/auth/actions.ts`, `lib/supabase/server.ts`
**Gap:** No key rotation schedule documented. No audit of all call sites that use service role (could inadvertently bypass RLS if misused).

---

## 13. Edge Function
**Status:** ❌ Not Used
**What exists:** Nothing. No Supabase Edge Functions (Deno) deployed. All business logic lives in Next.js server actions and API routes (Vercel Functions, Node.js runtime).
**Gap:** Intentional architectural choice — not a gap per se, but worth tracking. If latency-sensitive operations arise (auth token validation, geo-routing), Edge Functions would be the answer.

---

## 14. Transaction
**Status:** ⚠️ Partial
**What exists:** Migration files applied atomically by Supabase migration runner. App-level: ledger uses idempotency keys (UNIQUE constraint on `transaction_reference`) instead of explicit transactions. No explicit `BEGIN/COMMIT` in server actions.
**Key file:** `lib/ledger/append.ts`
**Gap:** Multi-step server actions (e.g., create event + insert transition + send notification) are NOT wrapped in a database transaction. A partial failure leaves inconsistent state. Supabase supports transactions via RPC but none are implemented.

---

## 15. Constraint
**Status:** ✅ Implemented
**What exists:** 30+ database-level constraints:
- `NOT NULL` on all critical columns (event_date, guest_count, ledger amounts, statuses)
- `CHECK` constraints: `inquiry.next_action_by IN ('chef','client')`, `recipe_ingredients.quantity > 0`, `components.scale_factor > 0`, `loyalty_config` ascending tier thresholds, non-negative prices/times
- `UNIQUE` constraints: `clients(tenant_id, email)`, recipe names per tenant, one loyalty config per tenant, one default contract template, course numbers per menu, etc.
**Key files:** All migration files
**Gap:** No constraint documentation. Some tables (newer feature tables) have lighter constraint coverage.

---

## 16. Foreign Key
**Status:** ✅ Implemented
**What exists:** Comprehensive FK coverage with intelligent ON DELETE actions: `CASCADE` (child data follows parent deletion), `RESTRICT` (blocks deletion if child records exist — e.g., `events.client_id` RESTRICT, `ledger_entries.client_id` RESTRICT), `SET NULL` (optional links — `events.inquiry_id`, `menus.event_id`). All tenant_id columns FK → `chefs.id`.
**Key files:** `supabase/migrations/20260215000001-003` (core FKs), later migrations
**Gap:** `user_roles.entity_id` has no FK (polymorphic design). Some newer integration tables have `tenant_id` without explicit FK check.

---

## 17. Index
**Status:** ✅ Implemented
**What exists:** 100+ indexes across:
- Tenant isolation: `idx_events_tenant_id`, `idx_clients_tenant`, etc.
- FK performance: `idx_events_client_id`, `idx_ledger_entries_event_id`, etc.
- Status/state filtering: `idx_events_status`, `idx_inquiries_tenant_status`, etc.
- Time-based: `idx_events_event_date`, `idx_audit_changed_at DESC`, `idx_inquiries_follow_up_due_at WHERE IS NOT NULL`
- Uniqueness: `idx_chefs_auth_user UNIQUE`, `idx_loyalty_config_tenant UNIQUE`, etc.
**Key files:** All migration files
**Gap:** No index performance analysis or query explain plans documented. Some newer tables may lack covering indexes for common query patterns.

---

## 18. Idempotent
**Status:** ⚠️ Partial
**What exists:** Ledger entries: UNIQUE on `transaction_reference` — duplicate returns `{ duplicate: true }` without error. Stripe webhook IDs stored as `transaction_reference`. FSM transitions: terminal states block re-transition. Prep block creation: `idempotent: true` flag. Google Calendar sync: checks existing sync state.
**Key files:** `lib/ledger/append.ts`, `lib/events/transitions.ts`, `lib/scheduling/prep-block-actions.ts`
**Gap:** Automation executions have no idempotency key (could fire multiple times on webhook retry). General chat messages lack dedup (only Gmail messages have `idx_messages_gmail_dedup`).

---

## 19. Validation
**Status:** ⚠️ Partial
**What exists:** Zod v4.3.6 installed. Used for: activity tracking payload schemas (`lib/activity/schemas.ts`), AI parsing outputs (`lib/ai/parse-client-schema.ts`, `lib/ai/parse-recipe-schema.ts`). Database-level constraints provide a safety net.
**Key files:** `lib/activity/schemas.ts`, `lib/ai/parse-client-schema.ts`
**Gap:** No comprehensive Zod validation on server actions before DB writes. Most server actions do not validate input shape/types before calling Supabase. Validation is inconsistent — some paths rely entirely on DB constraints as the first line of defense.

---

## 20. Rate Limit
**Status:** ✅ Implemented
**What exists:**
- **Auth:** `lib/rateLimit.ts` — 5 attempts per 15 min per email. Primary: Upstash Redis; Fallback: in-memory Map. Applied to `signUpChef()`, `signUpClient()`, `signIn()`.
- **API v1:** `lib/api/rate-limit.ts` — 100 req/min per tenant (Upstash). Applied to `/api/v1/events`, `/api/v1/clients`.
**Key files:** `lib/rateLimit.ts`, `lib/api/rate-limit.ts`
**Gap:** No `RateLimit-*` response headers on API routes. Rate limits are per-email (not per-IP) for auth — vulnerable to distributed brute force. No rate limit alerting or analytics.

---

## 21. Queue
**Status:** ⚠️ Partial (Cron-only)
**What exists:** Vercel cron jobs act as a primitive job queue. `cron_executions` table (`20260306000002`) logs execution state. Social publishing engine has queue-like logic in `lib/social/publishing/engine.ts`.
**Key files:** `vercel.json`, `supabase/migrations/20260306000002_cron_executions.sql`
**Gap:** No persistent message queue (Bull, BullMQ, RabbitMQ, Upstash QStash). No ordered, guaranteed-delivery job processing. Failed jobs are not automatically retried via queue semantics.

---

## 22. Worker
**Status:** ⚠️ Partial (Serverless only)
**What exists:** Vercel serverless functions (Node.js) process all background work. Cron endpoints are "workers" that execute on a schedule. No persistent worker processes.
**Key files:** `app/api/scheduled/*`
**Gap:** No persistent worker pool. No work stealing or concurrency controls. Workers are single-use serverless invocations with no shared state.

---

## 23. Cache
**Status:** ⚠️ Partial
**What exists:** Role cache cookie (5-min TTL, set in middleware — avoids DB round-trip per page load). React `cache()` wraps `getCurrentUser()` (one DB query per server render). Next.js built-in caching via fetch directives. No Redis/edge cache.
**Key files:** `middleware.ts`, `lib/auth/get-user.ts`
**Gap:** No explicit `unstable_cache()` for expensive queries. No Redis cache layer. No cache invalidation strategy. No CDN cache for static assets beyond Vercel defaults.

---

## 24. State
**Status:** ✅ Implemented
**What exists:** UI state: React `useState`, `useCallback`, `useMemo`, `useReducer` (local to components — no global store). Business state: 8-state FSM for events (draft → proposed → accepted → paid → confirmed → in_progress → completed | cancelled). FSM enforced at DB (trigger) + app (TypeScript transitions rules).
**Key files:** `lib/events/transitions.ts`, all `components/**/*.tsx`
**Gap:** No Zustand/Redux for shared UI state. Complex multi-step forms manage state locally (risk of lost state on navigation). No state persistence across sessions (beyond DB).

---

## 25. Debounce
**Status:** ⚠️ Partial (UI only)
**What exists:** Manual debounce using `useRef + setTimeout` in client-side search components (e.g., `app/(chef)/network/chef-search.tsx`, 250ms). No library-based debounce.
**Key files:** `app/(chef)/network/chef-search.tsx`
**Gap:** Inconsistent implementation across search inputs. No server-side debounce for expensive operations. No standard debounce utility exported from a shared hook.

---

## 26. Throttle
**Status:** ⚠️ Partial (API only)
**What exists:** Upstash `@upstash/ratelimit` library (sliding window throttle) applied to auth endpoints and API v1. `lib/api/rate-limit.ts` uses 100 req/min throttle per tenant.
**Key files:** `lib/api/rate-limit.ts`, `lib/rateLimit.ts`
**Gap:** No client-side throttle for form submissions or button clicks. No per-endpoint throttle for expensive server actions (menu generation, grocery pricing calls).

---

## 27. CRUD
**Status:** ✅ Implemented
**What exists:** Full CRUD server actions for all major entities: events, clients, inquiries, quotes, recipes, ingredients, dishes, menus, expenses, loyalty, staff, equipment, contracts, etc. All via `'use server'` actions with `requireChef()` guards and tenant scoping.
**Key pattern:** `lib/*/actions.ts` files throughout codebase
**Gap:** Deletes are soft or RESTRICT-gated (safe). No bulk CRUD operations (bulk update/delete events). No undo/redo for destructive actions.

---

## 28. Migration
**Status:** ✅ Implemented
**What exists:** 179 migration files using `supabase db push --linked`. Date-based naming (`YYYYMMDD000NNN`). Additive-only by policy (CLAUDE.md). CLAUDE.md mandates checking highest timestamp before creating new migration. Multi-agent collision prevention documented.
**Key files:** `supabase/migrations/` (179 files, 20260215000001 → 20260313000004)
**Gap:** No rollback migrations (Supabase doesn't support rollback; must write compensating migration). No migration dry-run in CI. No migration test against a clean DB snapshot.

---

## 29. Schema
**Status:** ✅ Implemented
**What exists:** ~120+ tables across 7 foundational layers + extended feature layers. Auto-generated TypeScript types at `types/database.ts` (synced via `npx supabase gen types typescript --linked`). Schema is additive, normalized, and multi-tenant-scoped.
**Key files:** `types/database.ts`, `supabase/migrations/*`
**Gap:** No schema diagram or ERD document. `types/database.ts` can drift if not regenerated after migrations. No schema validation in CI.

---

## 30. Logging
**Status:** ⚠️ Partial
**What exists:** `console.log/warn/error` throughout codebase. Custom structured logging in `lib/activity/observability.ts` (`{ scope, level, message, context, at }`). `chef_activity_log` table stores human-readable action records. Email send logging in `lib/email/send.ts`.
**Key files:** `lib/activity/observability.ts`, `lib/activity/track.ts`
**Gap:** No centralized logging service (Axiom, Logtail, Datadog). No log aggregation. Activity observability module is in-memory only (resets on deploy). No log levels enforced globally. Stack traces are console-only in production.

---

## 31. Monitoring
**Status:** ❌ Missing
**What exists:** Nothing. No monitoring service integrated.
**Gap:** No Sentry, Datadog, New Relic, Grafana, or Vercel monitoring configured. Production errors are invisible unless a user reports them. Vercel dashboard provides basic request metrics but no custom monitoring.

---

## 32. Metrics
**Status:** ⚠️ Minimal
**What exists:** In-memory counters in `lib/activity/observability.ts`: `activity.track.success`, `activity.track.failure`, `activity.track.invalid_payload`, `activity.track.unauthorized`. Resets on every cold start.
**Key files:** `lib/activity/observability.ts`
**Gap:** No persistent metrics. No Prometheus/StatsD export. No business metrics (conversion rate, ARPU, churn) collected automatically. No dashboards.

---

## 33. Error Tracking
**Status:** ⚠️ Partial (Error Boundaries only)
**What exists:** Next.js error boundary components: `app/error.tsx`, `app/(chef)/error.tsx`, `app/(client)/error.tsx`, `app/(admin)/error.tsx`, `app/(public)/error.tsx`, `app/auth/error.tsx`. Each shows user-friendly error UI with digest ID. Errors logged to console only.
**Key files:** `app/error.tsx`, `app/(chef)/error.tsx`
**Gap:** No Sentry or similar. No automatic error reporting. No error grouping, deduplication, or alerting. Production errors are invisible to the development team.

---

## 34. Audit Log
**Status:** ✅ Implemented
**What exists:**
- `audit_log` table (Layer 1): General INSERT/UPDATE/DELETE log with before/after JSONB values, tenant-scoped.
- `event_state_transitions` table: Append-only, immutable FSM transition history.
- `inquiry_state_transitions`, `quote_state_transitions`, `menu_state_transitions`: Per-entity immutable logs.
- `chef_activity_log`: Human-readable action history per chef.
- `admin_audit_log` (`20260306000010`): Immutable sensitive platform admin action log.
- `webhook_deliveries`: Append-only record of outbound webhook attempts.
**Key files:** `supabase/migrations/20260215000001_layer_1_foundation.sql`, `20260306000010_admin_audit_log.sql`
**Gap:** Audit log purging policy not defined. No way to export audit log to compliance tools. `user_roles` changes not explicitly audit-logged.

---

## 35. Environment Variables
**Status:** ✅ Implemented
**What exists:** `.env.local.example` documents required and optional vars. Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CRON_SECRET`. Optional: Gemini, Resend, Google Maps, MealMe, Kroger, Spoonacular, Upstash, Instagram, ADMIN_EMAILS, feature flags.
**Key file:** `.env.local.example`
**Gap:** No startup validation script (no fail-fast if required vars missing). Some optional vars not in example file. No environment-specific `.env.staging.example`.

---

## 36. Secrets Management
**Status:** ⚠️ Partial
**What exists:** Secrets in Vercel environment variables (production), `.env.local` (local, gitignored). No secrets in source code (verified). API keys hashed with SHA-256 before DB storage (plaintext shown once). Service role key never logged.
**Key files:** `.env.local.example`, `lib/auth/admin.ts`
**Gap:** No secrets vault (HashiCorp Vault, AWS Secrets Manager). No rotation policy or schedule. No emergency revocation procedure. No secret scanning in CI (no TruffleHog). No audit of who accessed which secret in Vercel.

---

## 37. Dev / Staging / Production Separation
**Status:** ❌ Missing (Production + Local only)
**What exists:** `NODE_ENV` flag (`development` vs `production`). Middleware sets `secure` flag on cookies only in production. `lib/auth/actions.ts` guards against localhost Supabase URL in production. E2E tests gated by `SUPABASE_E2E_ALLOW_REMOTE` env var.
**Key files:** `middleware.ts`, `lib/auth/actions.ts`
**Gap:** No staging environment (no `staging.cheflowhq.com`, no staging Supabase project). Both local dev and production share the same remote Supabase database. No feature flags per environment. No canary deployments.

---

## 38. API Versioning
**Status:** ⚠️ Partial
**What exists:** `/api/v1/events` and `/api/v1/clients` — versioned REST API with Bearer API key auth and Upstash rate limiting (100 req/min). Response shape: `{ data: [], meta: { total, limit, page } }`.
**Key files:** `app/api/v1/events/route.ts`, `app/api/v1/clients/route.ts`
**Gap:** No v2 plan. No backwards compatibility policy. No deprecation timeline for v1. No OpenAPI spec. No version negotiation via Accept header. No schema versioning for response payloads.

---

## 39. Database Versioning Strategy
**Status:** ✅ Implemented
**What exists:** Date-based migration timestamps (`YYYYMMDD000NNN`). 179 files spanning 20260215000001 → 20260313000004. CLAUDE.md mandates checking highest existing timestamp before creating new migration (multi-agent collision prevention). All migrations are additive (no DROP/TRUNCATE without approval).
**Key files:** `supabase/migrations/` (all 179 files), `CLAUDE.md`
**Gap:** No rollback migrations (only compensating migrations). No migration test against clean DB. No automated check in CI that migration timestamps are monotonically increasing.

---

## 40. Unit Testing
**Status:** ⚠️ Minimal
**What exists:** 4 unit test files using Node.js native test runner (`node --test --import tsx`):
- `tests/unit/activity.merge.test.ts`
- `tests/unit/activity.schemas.test.ts`
- `tests/unit/pricing.evaluate.test.ts`
- `tests/unit/revenue-goals.engine.test.ts`

Command: `npm run test:unit`
**Gap:** ~4 tests cover less than 1% of codebase logic. No Jest/Vitest config. No component tests. No server action tests. No FSM logic unit tests (critical gap for `lib/events/transitions.ts`).

---

## 41. Integration Testing
**Status:** ❌ Missing
**What exists:** Nothing distinct. E2E tests cover some integration scenarios (see #42).
**Gap:** No dedicated integration test layer. No tests that exercise server actions + database together without a full browser. No database test helpers isolated from E2E suite.

---

## 42. End-to-End Testing
**Status:** ✅ Implemented
**What exists:** Playwright 1.50.0. 11 test projects:
- `smoke` — unauthenticated smoke tests
- `chef` / `client` / `public` — role-based E2E flows (spec files 01-16)
- `coverage-public/chef/client/admin/auth-boundaries/api` — exhaustive route coverage
- `interactions-chef` / `interactions-client` — FSM transitions, form validation, quote flows

`tests/helpers/global-setup.ts` seeds data and establishes auth state. Single worker, sequential execution.
**Key files:** `playwright.config.ts`, `tests/` directory
**Gap:** Tests run only locally against `localhost:3100`. No CI pipeline to run them automatically. Remote DB used for E2E (no local DB isolation).

---

## 43. CI/CD Pipeline
**Status:** ❌ Missing
**What exists:** Nothing. No `.github/workflows/` directory. No automated test execution on commit/PR.
**Gap:** Critical gap. No automated quality gates before deployment. TypeScript checks, linting, and tests must be run manually. A bad commit can reach production with no automated guard.

---

## 44. Build Process
**Status:** ✅ Implemented
**What exists:** `npx next build --no-lint` (ESLint disabled during build; type safety via `npx tsc --noEmit --skipLibCheck`). `next.config.js`: PWA disabled by default (enabled via `ENABLE_PWA_BUILD=1`), fixed build ID (`chefflow-build`), security headers, image optimization. `package.json` scripts: `dev`, `build`, `start`, `lint`, `test:e2e`, `test:unit`, `test:coverage`, `test:interactions`.
**Key files:** `next.config.js`, `package.json`
**Gap:** Build is manual only (no CI trigger). `ENOTEMPTY` manifest errors on Windows require `rm -rf .next/` workaround. PWA dual-pipeline can corrupt build-manifest on Windows if `ENABLE_PWA_BUILD=1`.

---

## 45. Deployment Strategy
**Status:** ⚠️ Partial (Manual Vercel)
**What exists:** Vercel Hobby tier. Domain: `cheflowhq.com` (Cloudflare Registrar). Region: `iad1`. Deployment: `npx vercel deploy --prod --yes` (manual CLI). GitHub connected but no automated deploys. ~2 minute deploy time. Documented in `docs/DEPLOYMENT_AND_DOMAIN_SETUP.md`.
**Key files:** `docs/DEPLOYMENT_AND_DOMAIN_SETUP.md`, `vercel.json`
**Gap:** No staging environment. No canary deployments. No rollback procedure documented. No blue/green deployment. Manual process is error-prone.

---

## 46. Realtime Subscriptions / WebSockets
**Status:** ❌ Not Implemented
**What exists:** Nothing. Supabase Realtime is available (WSS noted in CSP: `wss://*.supabase.co`) but no subscriptions are set up in the codebase. Polling-based architecture (activity feed uses cursor-based pagination).
**Gap:** Chat, notifications, and activity feeds require manual refresh or polling. No live event status updates. No realtime collaboration features. Significant UX gap for a platform where chefs and clients interact.

---

## 47. Background Job Retry Strategy
**Status:** ⚠️ Partial (Scattered)
**What exists:** `lib/social/publishing/engine.ts` has retry logic for transient errors. Integration retry cron at `app/api/scheduled/integrations/retry/route.ts`. `cron_executions` table tracks execution state.
**Key files:** `app/api/scheduled/integrations/retry/route.ts`, `lib/social/publishing/engine.ts`
**Gap:** No centralized retry policy. No exponential backoff standard. Most cron jobs do not retry on failure. No max-retry tracking with alerting on exhaustion.

---

## 48. Dead Letter Queue
**Status:** ❌ Missing
**What exists:** Nothing. Failed jobs are logged (if implemented in the handler) but not queued for retry or inspection.
**Gap:** Failed automation executions, failed webhook deliveries, and failed cron runs have no DLQ. No way to inspect or replay failed jobs.

---

## 49. Circuit Breaker
**Status:** ❌ Missing
**What exists:** Nothing.
**Gap:** No circuit breaker pattern. If Stripe, Resend, MealMe, or Kroger APIs are down, calls fail silently or throw errors that bubble to the user. No fallback/degradation logic. No half-open/open state tracking.

---

## 50. Health Checks
**Status:** ⚠️ Partial
**What exists:** `app/api/scheduled/monitor/route.ts` — aggregates cron health into JSON response. `app/api/scheduled/email-history-scan/route.ts` — doubles as a health ping (documented in comments). Both gated by `CRON_SECRET`.
**Key files:** `app/api/scheduled/monitor/route.ts`
**Gap:** No public `/api/health` endpoint. Health checks don't test DB connectivity, Redis, or external API reachability. No integration with uptime monitoring (UptimeRobot, Better Uptime). No SLA-triggered alerting.

---

## 51. Feature Flags
**Status:** ✅ Implemented
**What exists:**
- **Global flags** (env vars): `COMM_TRIAGE_ENABLED`, `OPS_COPILOT_ENABLED`, `OPS_AUTONOMY_LEVEL` in `lib/features.ts`.
- **Per-chef flags**: `chef_feature_flags` table (`20260306000011`). Admin actions in `lib/admin/flag-actions.ts`: `toggleChefFlag()`, `setBulkChefFlags()`. Changes audit-logged via `logAdminAction()`.
**Key files:** `lib/features.ts`, `lib/admin/flag-actions.ts`, `supabase/migrations/20260306000011_chef_feature_flags.sql`
**Gap:** No centralized flag registry/documentation. No A/B testing framework. No flag expiry/sunset rules. No flag changelog.

---

## 52. Backup Strategy
**Status:** ❌ Not Documented
**What exists:** Supabase handles automatic daily backups for the production database (implicit, platform-provided). `lib/finance/export-actions.ts` exports financial data as Excel (reporting, not backup). GDPR data export at `lib/compliance/data-export.ts`.
**Gap:** No documented backup strategy. No point-in-time restore procedure. No backup verification. No backup for Vercel function code beyond git history. No file/attachment backup strategy.

---

## 53. Disaster Recovery Plan
**Status:** ❌ Missing
**What exists:** Nothing documented.
**Gap:** No runbook for: database corruption, data breach, key compromise, DNS hijack, Vercel account compromise, Stripe account suspension, or extended outage. No RTO/RPO targets defined.

---

## 54. Tracing (Distributed Traces)
**Status:** ❌ Missing
**What exists:** Nothing. No OpenTelemetry, Jaeger, Zipkin, or similar.
**Gap:** No end-to-end request tracing across Vercel functions → Supabase → external APIs. Multi-step failures (e.g., Stripe webhook → ledger → notification) are impossible to trace without manual console.log hunting.

---

## 55. Alerting (On-Call Notifications)
**Status:** ❌ Missing
**What exists:** Nothing. No PagerDuty, OpsGenie, Slack alerts, or email alerts on system failures.
**Gap:** Production errors surface only if a user reports them or the developer happens to check Vercel logs. No on-call rotation. No escalation policy. No alert on cron failure, error spike, or rate limit breach.

---

## 56. SLOs / Uptime Targets
**Status:** ❌ Not Defined
**What exists:** Nothing. No SLO document. No uptime tracking.
**Gap:** No defined availability target (99.9%? 99%?). No error budget. No latency SLO per endpoint. No performance budget for page loads. This means there's no objective standard for "is the system healthy?"

---

## 57. Request Correlation IDs
**Status:** ❌ Missing
**What exists:** Middleware sets `x-pathname` header (route information). No unique request ID.
**Gap:** No `X-Request-ID` or `X-Correlation-ID` header generated per request. Multi-step workflows (webhook → ledger → notification) cannot be correlated in logs. Debugging production issues requires manual log timestamp matching.

---

## 58. Structured Log Format
**Status:** ⚠️ Partial
**What exists:** `lib/activity/observability.ts` uses structured format: `{ scope, level, message, context, at }`. Rest of codebase uses unstructured `console.log('some message', variable)`.
**Key files:** `lib/activity/observability.ts`
**Gap:** No global log format standard enforced. No log aggregation service. In-memory observability resets on cold start. No log levels (DEBUG/INFO/WARN/ERROR) enforced globally. No log sampling for high-volume events.

---

## 59. API Documentation (OpenAPI/Swagger)
**Status:** ❌ Missing
**What exists:** Nothing. No OpenAPI spec, no Swagger UI, no Redoc, no Postman collection.
**Gap:** 52+ API endpoints with no machine-readable contract. `/api/v1/` endpoints (public REST API) are undocumented for third-party integrators. No SDK generation possible. No automated contract testing.

---

## 60. CORS Policy
**Status:** ✅ Implemented (via CSP)
**What exists:** `next.config.js` headers include `Content-Security-Policy` with `connect-src` whitelist: `'self'`, `https://*.supabase.co`, `wss://*.supabase.co`, `https://api.stripe.com`, `https://hooks.stripe.com`, `https://accounts.google.com`. HSTS header: `max-age=31536000; includeSubDomains`.
**Key file:** `next.config.js`
**Gap:** No explicit `Access-Control-Allow-Origin` headers (not needed for same-origin app, but public API at `/api/v1/` has no documented CORS behavior for third-party callers). No OPTIONS preflight handling explicitly defined.

---

## 61. CSRF Protection (Cookie-Based Auth)
**Status:** ✅ Inherited (Next.js App Router)
**What exists:** Next.js App Router provides built-in CSRF protection for server actions invoked via forms. Supabase auth cookies use `SameSite=lax` (blocks cross-origin form submissions). Session-only cookie mode strips maxAge.
**Key files:** `middleware.ts` (cookie `sameSite: 'lax'`)
**Gap:** No explicit CSRF token visible in code (relies on opaque Next.js mechanism). API routes at `/api/v1/` don't validate `X-CSRF-Token`. Webhook routes don't validate origin. No CSRF documentation in security docs.

---

## 62. Session Management (Refresh/Expiry Rules)
**Status:** ✅ Implemented
**What exists:** Supabase session cookies: `sb-<projectid>-auth-token` (httpOnly, secure, SameSite=lax). Middleware calls `getUser()` on every navigation — implicitly refreshes expired access tokens. "Remember me" toggle: if unchecked, sets `chefflow-session-only=1` → middleware strips maxAge → session expires on browser close. Role cached in `chefflow-role-cache` (5-min TTL).
**Key file:** `middleware.ts`, `lib/auth/actions.ts`
**Gap:** Token expiry not documented (Supabase defaults: ~1hr access, ~7d refresh). No session inventory UI. No concurrent session limit. Sessions not invalidated on password change. No device fingerprinting.

---

## 63. Encryption at Rest / in Transit (Explicitly Tracked)
**Status:** ⚠️ Partial (In-transit explicit, at-rest implicit)
**What exists:**
- **In transit:** HSTS header (`max-age=31536000; includeSubDomains`). TLS 1.2+ (Vercel default). Supabase WSS for realtime.
- **At rest:** Supabase PostgreSQL encrypted at rest (AWS KMS, AES-256) — platform-provided, not explicitly configured or documented in repo. Supabase Storage (S3) encrypted with AES-256. API keys hashed SHA-256 before storage.
**Key files:** `next.config.js` (HSTS header)
**Gap:** No explicit encryption documentation in repo. No field-level encryption for PII (email, phone stored in plaintext). No end-to-end encryption. No KMS rotation policy. No data classification document labeling sensitivity levels.

---

## 64. Key Rotation Policy
**Status:** ❌ Not Documented
**What exists:** Keys exist in Vercel env vars and are manually rotatable via each service's dashboard (Supabase, Stripe, Google). No documented procedure or schedule.
**Gap:** No rotation schedule (quarterly? annual?). No rotation procedure without downtime. No multi-key support (single active key means instant revocation causes downtime). No emergency revocation runbook. No rotation audit log.

---

## 65. Data Retention Policy
**Status:** ❌ Not Documented
**What exists:** `app/api/scheduled/activity-cleanup` — cleans up old activity events. `app/api/scheduled/push-cleanup` — cleans push subscriptions. No formal policy document.
**Gap:** No documented retention schedule per data type. No legal compliance mapping (GDPR = 7yr financial records? CCPA?). No automated purging for PII beyond selective cron cleanup. No audit retention policy. No backup retention policy.

---

## 66. PII Handling / Privacy Controls
**Status:** ⚠️ Partial
**What exists:** GDPR data export: `lib/compliance/data-export.ts` — exports all chef-owned data as JSON. UI at `settings/compliance/gdpr`. Account deletion cascades via FK constraints. `clients.full_name`, `clients.email`, `clients.phone` stored in plaintext in DB. `/privacy` public page exists.
**Key files:** `lib/compliance/data-export.ts`, `app/(chef)/settings/compliance/gdpr/`
**Gap:** No data minimization strategy. No consent tracking (no record of what user agreed to). No third-party data sharing disclosure in code. No PII anonymization for analysis/testing. No data breach notification procedure. No pseudonymization. No data residency documentation.

---

## 67. Backup Restore Testing (Not Just Backups)
**Status:** ❌ Not Documented
**What exists:** Nothing. Supabase provides backups; no restore procedure is documented or tested.
**Gap:** "Having backups" does not equal "being able to restore." No documented restore procedure. No tested restore runbook. No RTO measured. No periodic restore drills.

---

## 68. Pagination + Sorting + Filtering Standards
**Status:** ⚠️ Partial
**What exists:** Cursor-based pagination in activity feed (`lib/activity/actions.ts`): `limit` (1-100, default 25), `cursor` (ISO date string), `hasMore` flag returned. API v1: `limit` (max 200 for events, max 500 for clients), `status` filter param. Expenses and events: date range filters.
**Key files:** `lib/activity/actions.ts`, `app/api/v1/events/route.ts`
**Gap:** No unified pagination standard across all server actions. Some endpoints use offset-based pagination (inconsistent with cursor-based). No sorting parameters on most list endpoints. No filtering standards document.

---

## 69. Rollback Plan for Deployments and Migrations
**Status:** ❌ Not Documented
**What exists:** Vercel CLI supports `vercel rollback` (redeployment of previous build). No documented procedure.
**Gap:** No documented deployment rollback steps. No migration rollback strategy (Supabase doesn't support rollback — requires compensating migration). No "break glass" runbook. No tested rollback drill.

---

## 70. Linting / Formatting / Type-Checking Gates (Quality Controls)
**Status:** ⚠️ Partial (Manual only)
**What exists:**
- **TypeScript:** `npx tsc --noEmit --skipLibCheck` must exit 0 (documented in CLAUDE.md + `docs/AGENT-WORKFLOW.md`). `strict: true` in `tsconfig.json`.
- **ESLint:** `next lint` configured (`.eslintrc.json` extends `next/core-web-vitals`). Disabled during build (errors caught by tsc).
- No Prettier config. No pre-commit hooks (Husky/lint-staged). No CI enforcement.
**Key files:** `tsconfig.json`, `.eslintrc.json`, `CLAUDE.md`
**Gap:** Quality gates are manual (developer must remember to run). No automated enforcement on commit or PR. No Prettier for consistent formatting. No import sorting or unused variable rules.

---

## 71. Domain Event System (Internal Event Bus)
**Status:** ❌ Not Implemented
**What exists:** FSM transitions in `lib/events/transitions.ts` manually call: automation evaluation, notification creation, activity logging, Google Calendar sync — all hardcoded in sequence. No publish/subscribe event bus. No event sourcing.
**Key file:** `lib/events/transitions.ts`
**Gap:** No centralized event emitter. Adding a new side effect to a transition requires modifying `transitionEvent()` directly. No async event processing. No event handler registry. AI Policy (`docs/AI_POLICY.md`) prohibits autonomous event creation — the manual approach is intentional for now, but will become a maintenance burden as side effects multiply.

---

## 72. Deterministic State Machine Enforcement (Formalized Transitions)
**Status:** ✅ Implemented (Dual-layer)
**What exists:**
- **DB layer:** `validate_event_state_transition()` trigger on `BEFORE UPDATE OF status ON events` — raises exception on invalid transition. Same pattern for quotes, inquiries, menus.
- **App layer:** `TRANSITION_RULES` and `TRANSITION_PERMISSIONS` in `lib/events/transitions.ts` — enforces who can trigger each transition (chef/client/system). Terminal states (`completed`, `cancelled`) have empty allowed transitions.
**Key files:** `lib/events/transitions.ts`, `supabase/migrations/20260306000001_event_immutability_triggers.sql`
**Gap:** No formal FSM specification document (only code). No unit tests for FSM transition rules. Inquiry/quote FSMs are less formally documented than event FSM.

---

## 73. Data Seeding Strategy (Dev + Staging Consistency)
**Status:** ⚠️ Minimal
**What exists:** `.auth/seed-ids.json` — deterministic chef/client IDs for local testing. `tests/helpers/global-setup.ts` — Playwright global setup creates seed data via API calls before E2E tests. `supabase/migrations/20260307000007_demo_data_flag.sql` — `is_demo_data` flag column exists on entities.
**Key files:** `.auth/seed-ids.json`, `tests/helpers/global-setup.ts`
**Gap:** No SQL seed files in `supabase/seeds/`. No `supabase seed` compatible seed data. No environment-specific seeds (dev vs. staging vs. load test). Staging is the same as production (no separate seed dataset). No data generation scripts for volume testing.

---

## 74. Access Control Matrix (Role-Permission Mapping Document)
**Status:** ⚠️ Partial (Implicit)
**What exists:** Role enforcement is comprehensive but scattered: middleware (route protection), server actions (`requireChef()`/`requireClient()`), RLS policies (60+ tables), admin email gating. `docs/admin-dashboard.md` covers admin access. `docs/api-security-compliance.md` covers API security.
**Key files:** `middleware.ts`, `lib/auth/get-user.ts`, `docs/admin-dashboard.md`, `docs/api-security-compliance.md`
**Gap:** No single document mapping "Role X can perform Action Y on Resource Z." No formal access control matrix table. No automated test that verifies role A cannot access role B's data. Multi-tenant isolation verified only via RLS (no dedicated isolation test suite).

---

## 75. Performance Budget (Defined Limits per Endpoint)
**Status:** ❌ Not Defined
**What exists:** Nothing. No Lighthouse CI, no bundle size limits, no response time targets.
**Gap:** No defined budget for: page load time, Time to First Byte, Largest Contentful Paint, API response time (P50/P95/P99), bundle size per route. No automated performance regression detection.

---

## 76. Load Testing Strategy
**Status:** ❌ Missing
**What exists:** Nothing.
**Gap:** No k6, Artillery, JMeter, or Locust setup. No baseline performance measurements. No test for: concurrent user capacity, database connection pool limits, Vercel function concurrency limits, Supabase row-reads-per-second limit.

---

## 77. Capacity Planning
**Status:** ❌ Not Documented
**What exists:** Nothing formally documented.
**Gap:** No documented plan for: how many chefs can the system support, Supabase connection pool sizing, Vercel function concurrency limits, storage growth projections, database row growth estimates, cost scaling model.

---

## 78. Multi-Tenant Isolation Verification Testing
**Status:** ⚠️ Partial
**What exists:** RLS policies enforce isolation at DB level. App-level `requireChef()` enforces tenant scoping. Two RLS recursion bugs were discovered and patched (`20260217000001`, `20260307000001`), indicating past isolation vulnerabilities were caught and fixed.
**Key files:** `supabase/migrations/20260217000001_client_rls_and_fixes.sql`, `supabase/migrations/20260307000001_fix_events_rls_recursion.sql`
**Gap:** No dedicated multi-tenant isolation test suite. No automated test that verifies Chef A cannot read Chef B's data. E2E tests do not test cross-tenant access (they only test within a single tenant). RLS correctness is unverified by automated tests.

---

## 79. Documentation Version Control Policy
**Status:** ❌ Not Defined
**What exists:** 344+ `.md` files in `docs/`. All committed to git (implicitly versioned with code). No semantic versioning for docs. No changelog for doc updates. No doc deprecation process.
**Key directory:** `docs/`
**Gap:** No policy for: when docs must be updated alongside code changes, who owns each doc, how to deprecate old docs, doc naming conventions, or how to flag docs as stale.

---

## Summary Scorecard

| # | Concept | Status |
|---|---------|--------|
| 1 | Cron | ✅ |
| 2 | Scheduler | ✅ |
| 3 | Trigger | ✅ |
| 4 | Webhook | ✅ |
| 5 | Endpoint | ✅ |
| 6 | API Route | ✅ |
| 7 | Middleware | ✅ |
| 8 | Authentication | ✅ |
| 9 | Authorization | ✅ |
| 10 | Row Level Security | ✅ |
| 11 | Policy | ✅ |
| 12 | Service Role Key | ✅ |
| 13 | Edge Function | ❌ (intentional) |
| 14 | Transaction | ⚠️ |
| 15 | Constraint | ✅ |
| 16 | Foreign Key | ✅ |
| 17 | Index | ✅ |
| 18 | Idempotent | ⚠️ |
| 19 | Validation | ⚠️ |
| 20 | Rate Limit | ✅ |
| 21 | Queue | ⚠️ |
| 22 | Worker | ⚠️ |
| 23 | Cache | ⚠️ |
| 24 | State | ✅ |
| 25 | Debounce | ⚠️ |
| 26 | Throttle | ⚠️ |
| 27 | CRUD | ✅ |
| 28 | Migration | ✅ |
| 29 | Schema | ✅ |
| 30 | Logging | ⚠️ |
| 31 | Monitoring | ❌ |
| 32 | Metrics | ⚠️ |
| 33 | Error Tracking | ⚠️ |
| 34 | Audit Log | ✅ |
| 35 | Environment Variables | ✅ |
| 36 | Secrets Management | ⚠️ |
| 37 | Dev / Staging / Prod Separation | ❌ |
| 38 | API Versioning | ⚠️ |
| 39 | Database Versioning Strategy | ✅ |
| 40 | Unit Testing | ⚠️ |
| 41 | Integration Testing | ❌ |
| 42 | End-to-End Testing | ✅ |
| 43 | CI/CD Pipeline | ❌ |
| 44 | Build Process | ✅ |
| 45 | Deployment Strategy | ⚠️ |
| 46 | Realtime Subscriptions / WebSockets | ❌ |
| 47 | Background Job Retry Strategy | ⚠️ |
| 48 | Dead Letter Queue | ❌ |
| 49 | Circuit Breaker | ❌ |
| 50 | Health Checks | ⚠️ |
| 51 | Feature Flags | ✅ |
| 52 | Backup Strategy | ❌ |
| 53 | Disaster Recovery Plan | ❌ |
| 54 | Tracing (Distributed Traces) | ❌ |
| 55 | Alerting (On-Call Notifications) | ❌ |
| 56 | SLOs / Uptime Targets | ❌ |
| 57 | Request Correlation IDs | ❌ |
| 58 | Structured Log Format | ⚠️ |
| 59 | API Documentation (OpenAPI/Swagger) | ❌ |
| 60 | CORS Policy | ✅ |
| 61 | CSRF Protection | ✅ |
| 62 | Session Management | ✅ |
| 63 | Encryption at Rest / In Transit | ⚠️ |
| 64 | Key Rotation Policy | ❌ |
| 65 | Data Retention Policy | ❌ |
| 66 | PII Handling / Privacy Controls | ⚠️ |
| 67 | Backup Restore Testing | ❌ |
| 68 | Pagination + Sorting + Filtering Standards | ⚠️ |
| 69 | Rollback Plan | ❌ |
| 70 | Linting / Formatting / Type-Checking Gates | ⚠️ |
| 71 | Domain Event System | ❌ |
| 72 | Deterministic State Machine | ✅ |
| 73 | Data Seeding Strategy | ⚠️ |
| 74 | Access Control Matrix | ⚠️ |
| 75 | Performance Budget | ❌ |
| 76 | Load Testing Strategy | ❌ |
| 77 | Capacity Planning | ❌ |
| 78 | Multi-Tenant Isolation Verification Testing | ⚠️ |
| 79 | Documentation Version Control Policy | ❌ |

**Totals: ✅ 25 Implemented · ⚠️ 24 Partial · ❌ 30 Missing/Not Documented**

---

*Generated: 2026-02-20. Read-only audit — no code was changed to produce this document.*
