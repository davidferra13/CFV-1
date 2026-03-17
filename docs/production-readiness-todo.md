# ChefFlow Production Readiness: Complete To-Do List

> Generated 2026-03-16 from full codebase audit across build, tests, security, UI/UX, data integrity, and deployment.
> This is the single source of truth for what remains before ChefFlow is a finished, production-ready product.

---

## How to Read This Document

- **Phases are sequential** (Phase 1 before Phase 2, etc.) but tasks within a phase can be parallelized
- **Priority tags:** P0 = blocks everything, P1 = blocks launch, P2 = should fix before launch, P3 = polish/nice-to-have
- **Effort estimates:** S = < 1 hour, M = 1-4 hours, L = 4-8 hours, XL = 1-2 days
- **Status:** Use `[ ]` unchecked / `[x]` checked as work completes

---

## PHASE 0: MAKE IT BUILD (P0 - Nothing Else Matters Until This Passes)

The build is broken. No feature work, no testing, no deployment until `npm run build` exits 0.

### 0.1 TypeScript & Build Fixes

- [ ] **Fix `npm run build` to exit 0** [L]
  - Run build, catalog every error, fix in dependency order
  - Do NOT use `@ts-nocheck` or `as any` to paper over errors
- [ ] **Fix `npm run typecheck` to exit 0** [M]
  - `tsconfig.ci.json` must compile clean
- [ ] **Audit and fix all 19 `@ts-nocheck` files** [L]
  - 2 in production code: `app/(admin)/admin/beta-surveys/page.tsx`, `app/(admin)/admin/beta-surveys/[id]/page.tsx`
  - 9 in scripts/tests (acceptable but review)
  - Either fix the types or remove the exports so they can't crash at runtime
  - `lib/compliance/insurance-actions.ts` is the highest risk (exports functions referencing non-existent table)
- [ ] **Reduce `as any` count from ~959** [XL - ongoing]
  - Catalog by category (integration, analytics, admin, workspace)
  - Prioritize files that handle money, auth, or client data
  - Target: eliminate `as any` in `lib/ledger/`, `lib/stripe/`, `lib/auth/`, `lib/billing/`
- [ ] **Fix server rendering crash: `@phosphor-icons/react`** [S]
  - `components/ui/icons.ts` re-exports client-only module
  - Move to `@phosphor-icons/react/ssr` for server components
  - Routes like `/marketplace-chefs`, `/beta` crash with "createContext is not a function"

### 0.2 Lint & Release Gate

- [ ] **Fix `npm run lint:strict` to exit 0 (zero warnings)** [M]
- [ ] **Fix `npm run verify:release:web-beta` to pass all steps** [L]
  - Secrets scan, typecheck, lint, critical tests, build, smoke tests
- [ ] **Fix `npm run test:unit` baseline** [L]
  - Run full suite, catalog failures
  - Fix or quarantine (with documented reason) every failing test
  - Establish green baseline that CI enforces

---

## PHASE 1: CRITICAL SECURITY FIXES (P0 - Exploitable in Production)

### 1.1 Authentication & Authorization

- [ ] **Audit all cron routes for CRON_SECRET verification** [M]
  - ~25 routes in `/api/scheduled/*` and `/api/cron/*` need verification
  - Every cron route MUST call `verifyCronAuth()` at the top
  - Without this, anyone can trigger campaigns, sequences, cleanup jobs
- [ ] **Gate `/api/ollama-status` behind auth** [S]
  - Currently exposes internal infrastructure (Ollama URL, model state)
  - Add `requireAdmin()` or remove from production
- [ ] **Fix `.single()` crash in `lib/auth/get-user.ts:68`** [S]
  - Change to `.maybeSingle()` with null check
  - Middleware already does this correctly; server action code is inconsistent
- [ ] **Verify all webhook signature validation** [M]
  - Stripe: confirmed
  - DocuSign: confirmed (HMAC + timingSafeEqual)
  - Resend: confirmed (HMAC-SHA256)
  - Twilio: needs verification
  - Wix: needs verification

### 1.2 Token & Session Security

- [ ] **Implement iCal feed token rotation** [M]
  - `/api/feeds/calendar/[token]` tokens are static, never expire
  - Add `ical_feed_token_rotated_at` column, regenerate monthly
  - Leaked token = permanent calendar access
- [ ] **Add rate limiting to token-based endpoints** [S]
  - iCal feed token enumeration has no rate limit

### 1.3 Data Protection

- [ ] **Migrate `lib/ai/parse-document-vision.ts` to Ollama** [L]
  - Currently uses Gemini for document parsing that may contain PII
  - Violates privacy architecture (client data must stay local)
  - Requires local vision model availability

---

## PHASE 2: ZERO HALLUCINATION COMPLIANCE (P1 - Users See Lies)

### 2.1 Silent Failure Patterns (30+ instances)

Every `.catch(() => default)` that returns zero/null/empty without UI error state must be fixed. Users currently cannot distinguish "no data" from "failed to load."

- [ ] **Fix client dashboard silent failures** [L]
  - `lib/client-dashboard/actions.ts`: 10+ catches returning null/[]
  - Affected: My Events, My Quotes, My Rewards, My Profile, Friends, Groups, RSVP
  - Each must return `{ data, error }` or throw so UI shows error state
- [ ] **Fix auth silent failures** [M]
  - `lib/auth/`: 6 instances of `.catch(() => false)` on admin checks
  - `isAdmin()` returns false on ANY auth error (silently demotes admins)
  - `lib/billing/require-pro.ts`: admin bypass fails silently
- [ ] **Fix invoice loyalty credit silent failure** [M]
  - `lib/events/invoice-actions.ts`: loyalty credits silently disappear on fetch error
  - Client gets charged full price when they had credits
- [ ] **Fix pre-service checklist silent failure** [S]
  - `lib/events/generate-pre-service-checklist.ts`: returns empty on error
- [ ] **Fix integration status silent failures** [S]
  - `lib/integrations/core/connection-status-actions.ts`: shows "disconnected" on error
- [ ] **Fix 14+ analytics pages that return `[]` on fetch failure** [L]
  - `app/(chef)/analytics/*` pages show empty dashboards on errors
  - Must show error state: "Could not load data"

### 2.2 Cron Route Error Reporting

- [ ] **Make cron routes return proper HTTP status on failure** [M]
  - 21+ cron routes currently return 200 even on total failure
  - External monitors can't detect cron failures
  - Return 500 + error details when operations fail

### 2.3 Fake/Stub Data Displayed as Real

- [ ] **Fix CAC (Customer Acquisition Cost) showing $0** [S]
  - `lib/analytics/client-analytics.ts`: `marketing_spend_log` table doesn't exist
  - Show "N/A" or hide the metric entirely
- [ ] **Fix menu engineering sales count hardcoded to 1** [S]
  - `lib/analytics/menu-engineering.ts`: needs actual dish appearance data
- [ ] **Fix recall dismiss returning fake success** [M]
  - `lib/safety/recall-actions.ts`: says it worked but does nothing
- [ ] **Fix addon toggle not persisting to DB** [M]
  - `lib/proposals/addon-actions.ts`: needs `quote_line_items` implementation

### 2.4 Cache Invalidation Gaps

- [ ] **Add invalidation for deletion status cache** [S]
  - Chef requests account deletion but UI is stale for 60s
- [ ] **Add invalidation for booking page chef cache** [S]
  - Chef profile changes not reflected on public booking page

---

## PHASE 3: CORE FEATURE COMPLETION (P1 - Broken User Journeys)

### 3.1 Public-Facing Pages

- [ ] **Fix `/privacy-policy` redirect** [S]
  - Currently redirects to sign-in; should alias to `/privacy`
  - Legal compliance issue
- [ ] **Fix public asset auth redirects** [M]
  - `manifest.json`, `robots.txt`, `sitemap.xml`, `sw.js`, `inbox-sw.js` all flow through auth middleware
  - Add explicit public-asset classification in route policy
- [ ] **Remove 104 em dash violations** [M]
  - Across metadata + UI text
  - Violates absolute zero-tolerance rule

### 3.2 Product Positioning Decision (BLOCKING - Developer Decision Required)

- [ ] **Resolve positioning contradiction** [Developer Decision]
  - Homepage says "Private Chef Operating System"
  - Pricing says "$29/month with 14-day trial"
  - Strategy doc says "Consumer-first discovery marketplace"
  - Pick ONE positioning for beta launch, align all copy

### 3.3 Onboarding & First-Run Experience

- [ ] **Fix onboarding prompt collision** [L]
  - 8 prompts compete on first run: welcome modal, checklist, spotlight tour, beta survey, push permission, feedback nudge, mobile quick capture, milestone overlay
  - Implement priority queue / sequencing so they don't stack
- [ ] **Add loading.tsx for 10 client portal routes** [M]
  - `/my-cannabis/`, `/my-chat/`, `/my-hub/`, `/my-inquiries/`, `/my-profile/`, `/my-quotes/`, `/my-rewards/`, `/my-spending/`, `/survey/`, `/book-now/`

### 3.4 Incomplete Features (Ship or Hide)

For each: either finish it or remove it from the UI. No broken buttons in production.

- [ ] **Event creation wizard** - stub with "coming soon" label [S - decide: finish or hide]
- [ ] **Menu picker in push dinner builder** - stub with "coming soon" [S - decide: finish or hide]
- [ ] **Desktop app download** - gated with italic note [S - decide: finish or hide]
- [ ] **Insurance policies CRUD** - `@ts-nocheck` with exports that crash [M - remove exports or fix]
- [ ] **`intentionally_inactive` client field** - hardcoded false [S - add column or remove feature]
- [ ] **Beta survey pages** - `@ts-nocheck`, tables don't exist [M - create migration or hide pages]

### 3.5 Integration Completeness

8 of 25 listed integrations are complete. Decide for each stub: ship without it or implement.

**Complete (no action needed):** Stripe, DocuSign, Resend, Square, QuickBooks, Gmail, Zapier, iCal, Yelp

**Partial (finish or remove):**

- [ ] **Wix integration** [L - webhook exists, full sync unclear]
- [ ] **TakeAChef integration** [L - finance actions + page capture, incomplete]

**Stubs (hide from UI or defer explicitly):**

- [ ] **HubSpot, Salesforce** - CRM stubs, interface only [S - hide or document as future]
- [ ] **Shopify POS, Clover, Toast, Lightspeed** - POS stubs [S - hide or document as future]
- [ ] **Calendly, Google Calendar** - scheduling stubs [S - hide or document as future]

---

## PHASE 4: TEST COVERAGE (P1 - Confidence for Launch)

### 4.1 Critical Path Tests (MUST HAVE before launch)

- [ ] **Stripe payment actions - unit tests** [XL]
  - `lib/stripe/actions.ts`: `createPaymentIntent()`, `getEventPaymentStatus()` - ZERO tests
  - `lib/stripe/refund.ts`: `createStripeRefund()` - ZERO tests
  - `lib/stripe/connect.ts`: account links, status, webhooks - ZERO tests
  - `lib/stripe/payout-actions.ts`: payout summary, transfers - ZERO tests
  - `lib/stripe/subscription.ts`: customer, trial, status, webhooks, checkout - ZERO tests
  - This is the money path. It has no unit tests.
- [ ] **End-to-end: chef sign-up through first event** [L]
  - Sign up, onboard, create client, create event, send quote, accept, pay
  - Must complete without errors in real browser
- [ ] **End-to-end: client feedback flow** [M]
  - Currently broken per QA report
  - Client receives event, submits feedback, chef sees it
- [ ] **Verify Stripe mode (test vs live) for beta** [S]
  - Environment isolation check

### 4.2 Fix Skipped Tests (22 instances)

- [ ] **Fix seed-data dependent skips** [M]
  - 12 tests skip because seeded data (inquiry ID, quote ID, client portal token) missing
  - Fix seed helper to provide required data
- [ ] **Fix UI-dependent skips** [S]
  - 5 tests skip because UI elements not found (tagline field, tip buttons)
  - Either fix UI or update test selectors

### 4.3 Missing Test Infrastructure

- [ ] **Add code coverage reporting** [M]
  - No `--coverage` flag in any test script
  - No coverage thresholds enforced
  - Add coverage to CI, set minimum threshold (start at 40%, increase over time)
- [ ] **Add unit-level mocking capability** [L]
  - Currently no way to test Stripe API timeouts, Supabase RLS violations without real services
  - Consider adding `vitest` or a thin mock layer for isolation tests
- [ ] **Create test strategy documentation** [M]
  - No master guide explaining what to test and how
  - Document the test pyramid (unit/integration/E2E/journey/soak/stress)

### 4.4 Webhook & Integration Tests

- [ ] **Gmail sync unit tests** [M] - `lib/gmail/sync.ts` has zero unit tests
- [ ] **Zapier webhook unit tests** [M] - `lib/integrations/zapier/zapier-webhooks.ts` untested
- [ ] **Notification delivery tests** [M] - realtime notification flow mostly untested

### 4.5 Soak & Stress Validation

- [ ] **Run `npm run test:soak:quick`** [S] - verify no memory/DOM leaks
- [ ] **Run `npm run test:stress:ollama`** [S] - verify AI queue at expected load
- [ ] **Run full Remy quality suite** [M] - `scripts/test-remy-sample.mjs` (30 tests)

---

## PHASE 5: DEPLOYMENT & OPERATIONS (P1 - Production Infrastructure)

### 5.1 Environment Configuration

- [ ] **Prepare production `.env.local`** [M]
  - All required vars documented in `.env.example`
  - Critical: Supabase URL/keys, Stripe keys, Resend API key, Google OAuth, CRON_SECRET
- [ ] **Configure Supabase auth callback URLs for `app.cheflowhq.com`** [S]
- [ ] **Configure Google OAuth callback for production domain** [S]
- [ ] **Configure Stripe webhook endpoint for production** [S]
- [ ] **Rotate CRON_SECRET for production** [S]
- [ ] **Add environment variable validation at startup** [M]
  - Catch misconfiguration early instead of runtime crashes

### 5.2 Database Production Setup

- [ ] **Create production Supabase project (separate from dev/beta)** [M]
  - Beta currently shares dev database
- [ ] **Run all migrations on production database** [M]
- [ ] **Configure database connection pooling** [S]
- [ ] **Set up automated backup schedule with offsite storage** [L]
  - Current: `scripts/backup-db.sh` exists but no offsite/verification
  - Need: automated daily backups to cloud storage
- [ ] **Test backup restore procedure** [M]
  - Prove that backups actually work
- [ ] **Define RTO/RPO targets** [S]
  - Recovery Time Objective / Recovery Point Objective

### 5.3 Monitoring & Alerting

- [ ] **Configure uptime monitor** [S]
  - Target: `/api/health/readiness?strict=1`
  - Alert on: response time > 5s, status != 200
- [ ] **Optimize health endpoint latency** [M]
  - Currently 6.3s (should be < 500ms)
- [ ] **Configure Sentry for production environment** [S]
  - Set environment tag, alert rules, quota management
- [ ] **Set up cron job failure alerting** [M]
  - Vercel Cron Monitor or external watchdog
  - Alert when scheduled jobs stop running or return errors
- [ ] **Establish performance baselines** [M]
  - P50, P95, P99 latencies for key routes
  - Database query performance baselines

### 5.4 Rate Limiting for Production

- [ ] **Configure Upstash Redis for production** [S]
  - In-memory fallback is unsafe (resets on deploy)
- [ ] **Add rate-limit headers to responses** [S]
  - Clients need visibility into remaining quota
- [ ] **Test rate limits under expected load** [M]

### 5.5 CI/CD Pipeline

- [ ] **Verify GitHub Actions CI passes on current branch** [M]
  - 4 jobs: typecheck+lint, critical tests, unit tests, build check
  - Smoke tests on PRs to main
- [ ] **Add post-deploy smoke test automation** [L]
  - Currently manual verification after deploy
- [ ] **Document deployment approval workflow** [S]
  - Who approves production deploys, what checks must pass

### 5.6 PWA Decision

- [ ] **Decide: enable PWA build for production or defer** [Developer Decision]
  - Currently disabled (Windows build corruption)
  - If enabling: fix webpack dual-pass issue
  - If deferring: document timeline and what users lose

---

## PHASE 6: UX POLISH & ACCESSIBILITY (P2 - Quality Bar)

### 6.1 Accessibility

- [ ] **Verify color contrast (brand-600 on stone-900)** [S]
  - Potential WCAG AA failure (4.5:1 ratio)
- [ ] **Replace browser-default form validation with styled inline errors** [M]
  - `app/auth/signin/page.tsx` uses browser defaults
- [ ] **Audit all interactive elements for keyboard navigation** [L]
- [ ] **Add skip-to-content link** [S]
- [ ] **Screen reader testing on critical flows** [L]

### 6.2 Mobile Responsiveness

- [ ] **Fix floating checklist on mobile** [S]
  - Needs collapse behavior adjustment
- [ ] **Fix bottom nav collision with mobile quick capture** [S]
- [ ] **Test all critical flows on mobile viewport** [M]

### 6.3 Error Experience

- [ ] **Improve error boundaries with actionable recovery** [M]
  - All major portals have error.tsx (good)
  - Add "retry" buttons, clear error descriptions, support contact
- [ ] **Add offline detection and graceful degradation** [L]
  - Service worker exists but offline UX is minimal

### 6.4 Performance

- [ ] **Bundle size audit and optimization** [L]
  - No bundle budget enforcement currently
  - Audit largest chunks, code-split where needed
- [ ] **Image optimization verification** [S]
  - Next.js Image component in use but optimization config not verified
- [ ] **Lazy load below-fold content on public pages** [M]

---

## PHASE 7: LEGAL & COMPLIANCE (P2 - Required for Commercial Launch)

- [ ] **Finalize and publish privacy policy** [M]
  - Route exists at `/privacy` but content needs legal review
- [ ] **Finalize and publish terms of service** [M]
- [ ] **Document data retention policies** [M]
- [ ] **GDPR/CCPA compliance audit** [L]
  - Data export, deletion requests, consent management
  - Account deletion already partially implemented
- [ ] **Cookie consent banner** [M]
  - PostHog + analytics tracking requires consent in EU
- [ ] **Document PII handling for Sentry/PostHog** [S]
  - Sentry has PII masking enabled (good)
  - PostHog privacy implications not documented

---

## PHASE 8: OPERATIONAL READINESS (P2 - Day-1 Support)

- [ ] **Create incident response playbook** [M]
  - What to do when: site down, database error, payment failure, data breach
- [ ] **Set up status page** [M]
  - `status.cheflowhq.com` or similar
- [ ] **Create user communication templates** [S]
  - Incident notification, scheduled maintenance, feature announcements
- [ ] **Document on-call rotation** [S]
  - Who watches beta, who responds to issues
- [ ] **Create user onboarding documentation** [L]
  - Help center, FAQ, getting started guide
- [ ] **Set up feedback collection pipeline** [M]
  - In-app feedback form exists; need triage/response workflow

---

## PHASE 9: PRODUCTION LAUNCH (P1 - The Push)

All previous phases must be complete before starting this phase.

- [ ] **Run full `npm run verify:release`** [M]
  - Secrets, typecheck, lint, critical tests, unit tests, build, smoke tests
- [ ] **Run soak test (`npm run test:soak:quick`)** [S]
- [ ] **Run stress test (`npm run test:stress:ollama`)** [S]
- [ ] **Manual smoke test: 10 critical user journeys** [L]
  1. Chef sign-up + onboarding
  2. Create first client
  3. Create event from inquiry
  4. Build and send quote
  5. Client accepts quote + pays
  6. Chef manages event lifecycle (draft to completed)
  7. Client submits post-event feedback
  8. Chef views dashboard analytics
  9. Remy AI conversation (chef-facing)
  10. Public booking page inquiry submission
- [ ] **Verify all 28 Vercel cron jobs** [L]
  - Each must: authenticate, execute, return proper status
- [ ] **Database backup before launch** [S]
- [ ] **Deploy to Vercel production** [M]
  - Merge feature branch to `main`
  - Verify Vercel build succeeds
  - Verify production health endpoint
- [ ] **Post-deploy verification** [M]
  - Run smoke tests against `app.cheflowhq.com`
  - Verify auth flows with production OAuth
  - Verify Stripe webhook delivery
  - Verify cron jobs are firing

---

## SUMMARY BY EFFORT

| Phase                           | Tasks         | Total Effort         | Priority |
| ------------------------------- | ------------- | -------------------- | -------- |
| **Phase 0: Build**              | 7             | ~3 days              | P0       |
| **Phase 1: Security**           | 8             | ~1.5 days            | P0       |
| **Phase 2: Zero Hallucination** | 14            | ~3 days              | P1       |
| **Phase 3: Feature Completion** | 18            | ~3 days              | P1       |
| **Phase 4: Test Coverage**      | 16            | ~4 days              | P1       |
| **Phase 5: Deployment**         | 18            | ~3 days              | P1       |
| **Phase 6: UX Polish**          | 11            | ~2 days              | P2       |
| **Phase 7: Legal**              | 6             | ~2 days              | P2       |
| **Phase 8: Operations**         | 6             | ~1.5 days            | P2       |
| **Phase 9: Launch**             | 8             | ~2 days              | P1       |
| **TOTAL**                       | **112 tasks** | **~25 working days** |          |

> **Realistic timeline:** 3-5 weeks with focused daily sessions, depending on how many issues surface during Phase 0 (build fixes often cascade).

---

## WHAT'S ALREADY DONE (No Action Needed)

These are strengths. Don't rebuild or refactor them.

- Core event FSM (8 states, well-tested)
- Ledger-first financial model (immutable, append-only, unit tested)
- Auth architecture (role-based, tenant-scoped, middleware-enforced)
- Remy AI concierge (100% sample test pass rate)
- GOLDMINE email intelligence (extraction + scoring)
- 265+ pages built and audited
- Realtime subscriptions (zero leak risk, proper cleanup)
- Webhook handlers (Stripe, DocuSign, Resend all signature-verified)
- Error boundaries on all major portals
- Sentry + PostHog configured
- Beta deployment pipeline (zero-downtime, auto-rollback)
- CI/CD pipeline structure (4 parallel jobs)
- 1,000+ existing tests across 12 test categories
- Freemium tier system (free/pro with module gating)
- Embeddable inquiry widget
- SSRF, XSS, SQL injection protections all solid
