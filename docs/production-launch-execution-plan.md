# Production Launch Execution Plan

> Exhaustive, line-by-line roadmap to take ChefFlow from current state to publicly usable product.
> Generated 2026-03-17 from full codebase audit.

---

## Status Key

- `[ ]` Not started
- `[~]` In progress
- `[x]` Complete

---

## TIER 1: MUST COMPLETE BEFORE ANY PUBLIC USER

### 1.1 Resolve All Type Errors

The build passes only because `ignoreBuildErrors: true` skips type checking. Every unresolved type error is a potential runtime crash.

```
[ ] 1.1.1  Run `npm run typecheck` (uses tsconfig.typecheck.json, 8GB heap)
[ ] 1.1.2  Capture the full error output to a file: `npm run typecheck 2>&1 | tee typecheck-errors.txt`
[ ] 1.1.3  Count total errors: `grep "error TS" typecheck-errors.txt | wc -l`
[ ] 1.1.4  Categorize errors by type:
           a. Missing property errors (TS2339) - likely from stale database types
           b. Type mismatch errors (TS2322) - likely from incorrect function signatures
           c. Cannot find module errors (TS2307) - likely from missing imports
           d. Null/undefined access errors (TS18048) - likely missing null checks
[ ] 1.1.5  For each error in user-facing pages (app/(chef)/, app/(client)/, app/(public)/):
           a. Read the file at the error line
           b. Determine root cause (wrong type, stale DB types, missing null check)
           c. Fix the error
           d. Re-run typecheck on that file: `npx tsc --noEmit --skipLibCheck [file]`
[ ] 1.1.6  For errors in admin-only pages (app/(admin)/):
           a. Fix if simple (wrong import, missing null check)
           b. Add @ts-expect-error with explanation if complex and admin-only
[ ] 1.1.7  For errors in lib/ server actions:
           a. These WILL crash at runtime - fix every one
           b. Pay special attention to database query types (supabase .from().select())
           c. Verify against types/database.ts for correct column names
[ ] 1.1.8  Re-run full typecheck: `npm run typecheck`
[ ] 1.1.9  Confirm zero errors
[ ] 1.1.10 If types/database.ts is stale, regenerate:
           a. `npx supabase gen types typescript --linked > types/database.ts`
           b. Re-run typecheck after regeneration
           c. Fix any new errors from schema changes
[ ] 1.1.11 Commit: `fix: resolve all typecheck errors for production safety`
```

### 1.2 Production Supabase Project

Dev and beta share one Supabase project. A bad migration or test data leak hits real users.

```
[ ] 1.2.1  Create new Supabase project:
           a. Go to supabase.com/dashboard
           b. Create new project named "chefflow-production" in same org
           c. Select region closest to users (us-east-1 to match Vercel iad1)
           d. Save the project ID, URL, anon key, and service role key
[ ] 1.2.2  Apply all migrations to production project:
           a. Link to new project: `npx supabase link --project-ref <new-project-id>`
           b. WARNING: This changes the linked project. Save current link first.
           c. Run: `npx supabase db push` (applies all migrations in order)
           d. Verify all migrations applied: `npx supabase migration list`
           e. Re-link back to dev project: `npx supabase link --project-ref luefkpakzvxcsqroxyhz`
[ ] 1.2.3  Configure production auth:
           a. In Supabase dashboard for production project:
           b. Set Site URL to `https://app.cheflowhq.com`
           c. Add redirect URLs: `https://app.cheflowhq.com/**`
           d. Configure Google OAuth provider with production credentials
           e. Set email templates (confirm signup, reset password, magic link)
           f. Enable email confirmations
           g. Set JWT expiry (default 3600s is fine)
[ ] 1.2.4  Configure production RLS policies:
           a. Verify all tables have RLS enabled: query pg_tables + pg_policies
           b. Verify tenant isolation policies exist on every table with tenant_id/chef_id
           c. Test: create two test chefs, verify one cannot read the other's data
[ ] 1.2.5  Set production environment variables in Vercel:
           a. NEXT_PUBLIC_SUPABASE_URL = production project URL
           b. NEXT_PUBLIC_SUPABASE_ANON_KEY = production anon key
           c. SUPABASE_SERVICE_ROLE_KEY = production service role key
           d. Scope all three to "Production" environment only
[ ] 1.2.6  Verify dev environment still uses dev project:
           a. Check .env.local has dev project URL
           b. Check .env.local.beta has dev project URL
           c. Neither should reference the production project
[ ] 1.2.7  Set up production database backups:
           a. Enable Point-in-Time Recovery in Supabase dashboard (Pro plan required)
           b. Set up daily automated backup script:
              `npx supabase db dump --linked > backups/prod-$(date +%Y%m%d).sql`
           c. Add to cron or scheduled task
[ ] 1.2.8  Document the setup in docs/production-database.md
```

### 1.3 Stripe Live Mode

Currently test mode. Real payments require live keys and verified Connect setup.

```
[ ] 1.3.1  Verify Stripe account is activated:
           a. Log in to dashboard.stripe.com
           b. Check that account is out of "test mode only" status
           c. Complete any pending verification (business info, bank account, identity)
[ ] 1.3.2  Get live API keys:
           a. Dashboard > Developers > API keys
           b. Copy publishable key (pk_live_...)
           c. Copy secret key (sk_live_...)
[ ] 1.3.3  Set up live webhook endpoint:
           a. Dashboard > Developers > Webhooks > Add endpoint
           b. URL: https://app.cheflowhq.com/api/webhooks/stripe
           c. Events to listen for (match current test config):
              - payment_intent.succeeded
              - payment_intent.payment_failed
              - charge.refunded
              - customer.subscription.created
              - customer.subscription.updated
              - customer.subscription.deleted
              - checkout.session.completed
              - transfer.created
              - transfer.updated
              - transfer.reversed
              - account.updated
              - payout.created
              - payout.paid
              - payout.failed
              - application_fee.created
           d. Copy the webhook signing secret (whsec_...)
[ ] 1.3.4  Configure Stripe Connect for chef payouts:
           a. Dashboard > Connect > Settings
           b. Set platform name: ChefFlow
           c. Set branding (icon, color)
           d. Set the redirect URI: https://app.cheflowhq.com/settings/stripe-connect
           e. Set the refresh URL: https://app.cheflowhq.com/settings/stripe-connect
           f. Set the return URL: https://app.cheflowhq.com/settings/stripe-connect
           g. Verify fee structure (application_fee_amount in webhook handler)
[ ] 1.3.5  Set Vercel production environment variables:
           a. STRIPE_SECRET_KEY = sk_live_...
           b. NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = pk_live_...
           c. STRIPE_WEBHOOK_SECRET = whsec_... (from step 1.3.3d)
           d. Scope all to "Production" environment only
[ ] 1.3.6  Verify dev/beta still use test keys:
           a. .env.local should have sk_test_... and pk_test_...
           b. .env.local.beta has Stripe disabled (empty keys) - correct
[ ] 1.3.7  Test the live payment flow end-to-end:
           a. Create a real event with a small amount ($1.00)
           b. Go through the full flow: inquiry > event > quote > send > accept > pay
           c. Verify payment appears in Stripe dashboard (live mode)
           d. Verify ledger entry created in production database
           e. Verify event transitions to "paid" status
           f. Refund the test payment
           g. Verify refund ledger entry created
[ ] 1.3.8  Document in docs/stripe-production-setup.md
```

### 1.4 Legal Pages Review

ToS and Privacy Policy exist with real legal content (last updated March 1, 2026). They need professional review.

```
[ ] 1.4.1  Review Terms of Service (app/(public)/terms/page.tsx):
           a. Read through all 16 sections
           b. Verify subscription pricing matches actual plans ($X/month)
           c. Verify 14-day free trial language matches implementation
           d. Verify cancellation policy matches Stripe subscription config
           e. Verify dispute resolution process is workable
           f. Check governing law jurisdiction is correct
           g. Verify contact email (support@cheflowhq.com) actually receives mail
[ ] 1.4.2  Review Privacy Policy (app/(public)/privacy/page.tsx):
           a. Verify all third-party services are disclosed:
              - Supabase (database/auth) [x currently listed]
              - Stripe (payments) [x currently listed]
              - Resend (email) [x currently listed]
              - Vercel (hosting) [x currently listed]
              - Sentry (error monitoring) [check if listed]
              - PostHog (analytics) [check if listed]
              - Cloudinary (images) [check if listed]
              - Google OAuth (authentication) [check if listed]
              - Ollama (AI - local only) [check if listed, note local-only]
           b. Verify data retention periods match implementation
           c. Verify user rights (access, deletion, portability) have working mechanisms
           d. Verify contact emails (privacy@cheflowhq.com, security@cheflowhq.com) receive mail
[ ] 1.4.3  Professional legal review (recommended):
           a. Send both documents to a business attorney
           b. Or use Termly/Iubenda for compliance-checked templates
           c. Focus areas: liability limitations, indemnification, CCPA/GDPR compliance
[ ] 1.4.4  Update "last updated" dates after any changes
[ ] 1.4.5  Verify /privacy-policy redirects to /privacy (already implemented)
[ ] 1.4.6  Add cookie consent banner if not present:
           a. Check if a cookie consent component exists
           b. If not, required for GDPR compliance (PostHog sets cookies)
           c. Implement using a lightweight banner with accept/reject
```

### 1.5 Environment Variable Audit for Production

Every env var must be correctly scoped. Missing or wrong values cause silent failures.

```
[ ] 1.5.1  Compile the full list of required env vars:
           a. Read .env.local and .env.local.beta to identify all vars
           b. Search codebase for process.env.* references
           c. Categorize: required vs optional, public vs private
[ ] 1.5.2  Set each in Vercel (Production scope only):
           Database:
           a. NEXT_PUBLIC_SUPABASE_URL = production Supabase URL
           b. NEXT_PUBLIC_SUPABASE_ANON_KEY = production anon key
           c. SUPABASE_SERVICE_ROLE_KEY = production service role key

           Payments:
           d. STRIPE_SECRET_KEY = sk_live_...
           e. NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = pk_live_...
           f. STRIPE_WEBHOOK_SECRET = whsec_... (production endpoint)

           Email:
           g. RESEND_API_KEY = production Resend key
           h. RESEND_FROM_EMAIL = info@cheflowhq.com

           Auth:
           i. GOOGLE_CLIENT_ID = production OAuth client ID
           j. GOOGLE_CLIENT_SECRET = production OAuth client secret

           Monitoring:
           k. SENTRY_DSN = production Sentry DSN
           l. SENTRY_AUTH_TOKEN = for source map uploads
           m. NEXT_PUBLIC_POSTHOG_KEY = production PostHog key
           n. NEXT_PUBLIC_POSTHOG_HOST = PostHog host URL

           App:
           o. NEXT_PUBLIC_SITE_URL = https://app.cheflowhq.com
           p. APP_ENV = production
           q. ADMIN_EMAILS = davidferra13@gmail.com

           AI (if applicable on Vercel):
           r. GEMINI_API_KEY = for non-private AI tasks
           s. GROQ_API_KEY = for non-private AI tasks
           t. Note: OLLAMA_URL should NOT be set in production (local-only)

           Rate limiting:
           u. UPSTASH_REDIS_REST_URL = production Redis URL
           v. UPSTASH_REDIS_REST_TOKEN = production Redis token

           Optional:
           w. CLOUDINARY_URL = if using Cloudinary
           x. TURNSTILE_SECRET_KEY = for CAPTCHA verification
           y. NEXT_PUBLIC_TURNSTILE_SITE_KEY = for CAPTCHA widget

[ ] 1.5.3  Verify NO dev/test values leak to production:
           a. No sk_test_ keys in production
           b. No localhost URLs in production
           c. No dev Supabase URL in production
           d. NEXT_PUBLIC_SITE_URL is NOT localhost
[ ] 1.5.4  Verify dev .env.local still has all dev values (unchanged)
[ ] 1.5.5  Document all env vars in docs/environment-variables.md
```

---

## TIER 2: SHOULD COMPLETE BEFORE BETA USERS

### 2.1 Vercel Build Memory Configuration

The build OOMs without 12GB heap. Vercel needs to handle this.

```
[ ] 2.1.1  Check current Vercel plan memory limits:
           a. Free: 1024MB build memory
           b. Pro: 8192MB build memory
           c. Enterprise: configurable
[ ] 2.1.2  If on Free plan, upgrade to Pro ($20/month) for 8GB build memory
[ ] 2.1.3  Set build environment variable in Vercel:
           NODE_OPTIONS = --max-old-space-size=8192
[ ] 2.1.4  Verify ignoreBuildErrors is true in next.config.js (already set):
           a. This means the build skips in-process type checking
           b. Type errors are caught by the separate typecheck step (1.1)
           c. This is the correct architecture for a 632-page app
[ ] 2.1.5  Test a Vercel build:
           a. Push to a preview branch (not main)
           b. Check Vercel build logs for memory-related failures
           c. If it still OOMs at 8GB, consider:
              - Splitting the app into smaller build targets
              - Using Vercel's remote caching
              - Reducing page count (audit for unused pages)
[ ] 2.1.6  Set up the build command in Vercel:
           a. Build command: `next build --no-lint`
           b. Output directory: .next
           c. Install command: npm install
           d. Node.js version: 20.x (match local)
[ ] 2.1.7  Verify Vercel ignoreCommand works:
           a. Push to a feature branch
           b. Confirm Vercel shows "Build skipped" (not "Build failed")
           c. Push to main (when ready) to trigger actual build
```

### 2.2 Demo Data Isolation

Demo data exists with `is_demo` flags but UI visibility needs verification.

```
[ ] 2.2.1  Trace demo data creation:
           a. Read lib/onboarding/demo-data-core.ts (creates 3 sample clients, 3 events, 1 inquiry)
           b. Verify all demo records have is_demo flag in unknown_fields JSONB
           c. Verify demo client emails use @example.com domain
[ ] 2.2.2  Audit UI consumption of demo data:
           a. Search for "is_demo" in components/ and app/ directories
           b. Check if client list (app/(chef)/clients/) filters or badges demo clients
           c. Check if event list (app/(chef)/events/) filters or badges demo events
           d. Check if inquiry list (app/(chef)/inquiries/) filters or badges demo inquiries
           e. Check if dashboard widgets exclude demo data from counts/metrics
[ ] 2.2.3  If demo data is NOT visually distinguished:
           a. Add a "Demo" badge to demo client rows in the client table
           b. Add a "Demo" badge to demo event rows in the event table
           c. Add a "Demo" badge to demo inquiry rows in the inquiry table
           d. Exclude demo records from dashboard financial summaries
           e. Exclude demo records from analytics/reporting
[ ] 2.2.4  Add a "Clear demo data" button in onboarding or settings:
           a. Check if lib/onboarding/demo-data-core.ts has a cleanup function
           b. If not, create one that deletes all records where is_demo = true
           c. Wire to a button in Settings or Onboarding completion
[ ] 2.2.5  Verify demo data cannot corrupt real analytics:
           a. Check revenue calculations exclude demo events
           b. Check client count excludes demo clients
           c. Check lead scoring excludes demo inquiries
[ ] 2.2.6  Commit: `fix: isolate demo data from production views and metrics`
```

### 2.3 Rate Limiting Verification

Rate limiting exists (lib/rateLimit.ts + lib/sms/rate-limit.ts) but needs production backend.

```
[ ] 2.3.1  Verify Upstash Redis is configured for production:
           a. If not, create an Upstash Redis database at upstash.com
           b. Get REST URL and REST token
           c. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel
           d. Without Upstash, rate limiting falls back to in-memory (resets on deploy)
[ ] 2.3.2  Audit which public endpoints have rate limiting:
           a. Search for `rateLimit` usage in app/api/ routes
           b. Verify these public endpoints are protected:
              - POST /api/embed/inquiry (public inquiry submission)
              - POST /api/webhooks/stripe (already has signature verification)
              - GET /api/health (should NOT be rate limited)
              - Any public form submission endpoints
[ ] 2.3.3  Verify rate limit thresholds are appropriate:
           a. Default: 5 attempts per 15 minutes
           b. Inquiry submission: should allow reasonable use (10/hour?)
           c. Auth endpoints: 5 per 15 minutes is appropriate
           d. API endpoints used by the app itself: higher limits (100/min)
[ ] 2.3.4  Add rate limiting to any unprotected public endpoints found in 2.3.2
[ ] 2.3.5  Test rate limiting:
           a. Hit a rate-limited endpoint 6+ times rapidly
           b. Verify the 6th request is rejected with appropriate error
           c. Verify the error message is user-friendly
```

### 2.4 Email Delivery Verification

Resend is configured with info@cheflowhq.com but DNS records need verification.

```
[ ] 2.4.1  Verify Resend domain authentication:
           a. Log in to resend.com/domains
           b. Verify cheflowhq.com is added and verified
           c. Check DNS records are set:
              - SPF record on cheflowhq.com
              - DKIM records (resend._domainkey.cheflowhq.com)
              - DMARC record (_dmarc.cheflowhq.com)
[ ] 2.4.2  Test email delivery:
           a. Send a test email via Resend dashboard
           b. Check it arrives in inbox (not spam)
           c. Check email headers for SPF pass, DKIM pass, DMARC pass
[ ] 2.4.3  Verify all email contact addresses work:
           a. support@cheflowhq.com (referenced in ToS)
           b. privacy@cheflowhq.com (referenced in Privacy Policy)
           c. security@cheflowhq.com (referenced in Privacy Policy)
           d. If these don't exist, create them (email forwarding to developer's inbox)
[ ] 2.4.4  Verify email templates render correctly:
           a. Test client invitation email
           b. Test quote sent notification
           c. Test event confirmation
           d. Test password reset
           e. Check for broken images, wrong links, formatting issues
[ ] 2.4.5  Set Resend production API key in Vercel:
           a. RESEND_API_KEY = production key (not test key)
           b. RESEND_FROM_EMAIL = info@cheflowhq.com
```

### 2.5 Ollama / AI Feature Graceful Degradation on Vercel

Ollama runs locally on the developer's PC. It will NOT be available on Vercel.

```
[ ] 2.5.1  Audit which features require Ollama:
           a. Remy AI concierge (lib/ai/remy-actions.ts)
           b. Recipe parsing (lib/ai/parse-recipe.ts)
           c. Brain dump parsing (lib/ai/parse-brain-dump.ts)
           d. Email field extraction (lib/ai/parse-ollama.ts)
           e. Campaign personalization (lib/ai/campaign-outreach.ts)
           f. Chef bio generation (lib/ai/chef-bio.ts)
           g. Contract generation (lib/ai/contract-generator.ts)
           h. AAR generation (lib/ai/aar-generator.ts)
           i. Contingency planning (lib/ai/contingency-ai.ts)
           j. Grocery consolidation (lib/ai/grocery-consolidation.ts)
           k. Equipment depreciation (lib/ai/equipment-depreciation-explainer.ts)
[ ] 2.5.2  Verify OllamaOfflineError is thrown properly:
           a. parseWithOllama should throw OllamaOfflineError when Ollama is unreachable
           b. All callers must catch and re-throw OllamaOfflineError
           c. UI must show "Start Ollama to use this feature" (not a crash)
[ ] 2.5.3  Verify Gemini/Groq features work independently:
           a. Gemini-only features (technique lists, kitchen specs) should work on Vercel
           b. Groq-only features (generic parsing) should work on Vercel
           c. Test with OLLAMA_URL unset
[ ] 2.5.4  Decide production AI strategy:
           OPTION A: Ollama features are disabled on Vercel (current behavior)
              - Users see "AI features require local setup" messages
              - Core workflow (inquiries, events, quotes, payments) works without AI
              - This is acceptable for launch
           OPTION B: Set up a cloud Ollama instance
              - Deploy Ollama on a GPU cloud provider (Runpod, Lambda, etc.)
              - Set OLLAMA_URL in Vercel env vars
              - Monthly cost: $50-200+ depending on GPU
           OPTION C: Replace Ollama calls with Groq for non-private features
              - Only for features where data is NOT private (see AI boundary table)
              - Private data features remain Ollama-only (offline on Vercel)
[ ] 2.5.5  Document the chosen strategy in docs/production-ai-strategy.md
```

---

## TIER 3: SHOULD COMPLETE BEFORE GENERAL AVAILABILITY

### 3.1 End-to-End Test Suite Verification

Existing Playwright tests need to pass against the current codebase.

```
[ ] 3.1.1  Check test configuration:
           a. Read playwright.config.ts for base URL, timeouts, retries
           b. Verify test auth setup (tests/helpers/global-setup.ts)
           c. Verify test seed data (tests/helpers/e2e-seed.ts)
[ ] 3.1.2  Run the full E2E suite:
           a. Start dev server: npm run dev (port 3100)
           b. Run: npx playwright test
           c. Capture results to file
[ ] 3.1.3  For each failing test:
           a. Read the test to understand what it expects
           b. Determine if the failure is a test bug or an app bug
           c. Fix the app bug or update the test
           d. Re-run the individual test to verify
[ ] 3.1.4  Verify critical path tests exist and pass:
           a. Sign up / sign in flow
           b. Create client
           c. Create inquiry
           d. Convert inquiry to event
           e. Create and send quote
           f. Accept quote (as client)
           g. Make payment
           h. Event state transitions through full FSM
           i. Recipe CRUD
           j. Calendar view
[ ] 3.1.5  Add missing critical path tests if any don't exist
[ ] 3.1.6  Run tests 3x to verify no flaky failures
[ ] 3.1.7  Commit any test fixes: `test: fix E2E suite for current codebase state`
```

### 3.2 Performance / Lighthouse Audit

```
[ ] 3.2.1  Build the production version:
           a. NODE_OPTIONS="--max-old-space-size=12288" npx next build --no-lint
           b. Start production server: npx next start -p 3100
[ ] 3.2.2  Run Lighthouse on key pages:
           a. / (landing page) - target: Performance > 80, LCP < 2.5s
           b. /dashboard (chef dashboard) - target: Performance > 70
           c. /events (event list) - target: Performance > 70
           d. /clients (client list) - target: Performance > 70
           e. /recipes (recipe list) - target: Performance > 70
           f. /inquiries (inquiry list) - target: Performance > 70
[ ] 3.2.3  For each page below target:
           a. Check largest contentful paint (LCP) - optimize images, reduce blocking resources
           b. Check total blocking time (TBT) - reduce JS bundle size, defer non-critical scripts
           c. Check cumulative layout shift (CLS) - add explicit dimensions to images/embeds
           d. Check first input delay (FID) - reduce main thread work
[ ] 3.2.4  Check bundle sizes:
           a. Run: npx @next/bundle-analyzer (if installed)
           b. Or check .next/build-manifest.json for large chunks
           c. Identify any page importing > 200KB of JS
           d. Split large imports with dynamic import()
[ ] 3.2.5  Check for N+1 database queries:
           a. Enable Supabase query logging temporarily
           b. Load dashboard page
           c. Count queries - should be < 10 for initial page load
           d. Fix any N+1 patterns with batch queries or joins
[ ] 3.2.6  Document findings in docs/performance-audit.md
```

### 3.3 Accessibility Audit

```
[ ] 3.3.1  Run automated a11y check:
           a. Install axe-core: npm install -D @axe-core/playwright (if not present)
           b. Run axe on landing page, dashboard, event form, client form
           c. Or use browser extension: axe DevTools
[ ] 3.3.2  Fix critical a11y violations (WCAG 2.1 Level A):
           a. All images must have alt text
           b. All form inputs must have associated labels
           c. All interactive elements must be keyboard accessible
           d. Color contrast ratio must be >= 4.5:1 for normal text
           e. Page must have a single <h1>
           f. Focus must be visible on all interactive elements
[ ] 3.3.3  Fix important a11y violations (WCAG 2.1 Level AA):
           a. Error messages must be associated with form fields (aria-describedby)
           b. Status messages must use aria-live regions
           c. Modal dialogs must trap focus
           d. Navigation must be consistent across pages
           e. Skip-to-content link at top of page
[ ] 3.3.4  Keyboard navigation test:
           a. Tab through the entire dashboard without a mouse
           b. Tab through the event creation form
           c. Tab through the client creation form
           d. Verify all buttons, links, and form fields are reachable
           e. Verify Escape closes modals and drawers
[ ] 3.3.5  Screen reader test (optional but recommended):
           a. Test with NVDA (Windows) or VoiceOver (Mac)
           b. Navigate the dashboard
           c. Fill out the inquiry form
           d. Verify all interactive elements are announced
[ ] 3.3.6  Document findings and fixes in docs/accessibility-audit.md
```

### 3.4 Mobile Responsiveness Audit

```
[ ] 3.4.1  Test on mobile viewport (375px width - iPhone SE):
           a. Landing page: all text readable, no horizontal scroll
           b. Dashboard: cards stack vertically, all data visible
           c. Event list: table or cards adapt to narrow width
           d. Client list: same
           e. Navigation: hamburger menu works, all items reachable
           f. Forms: all inputs full-width, keyboard doesn't obscure fields
           g. Remy drawer: opens and functions on mobile
[ ] 3.4.2  Test on tablet viewport (768px width - iPad):
           a. Same pages as above
           b. Sidebar should collapse or overlay
           c. Tables should be readable without horizontal scroll
[ ] 3.4.3  Test PWA installation:
           a. Open app.cheflowhq.com in mobile Chrome
           b. Check "Add to Home Screen" prompt appears
           c. Install and verify app opens in standalone mode
           d. Verify offline page shows when network is unavailable
           e. Verify service worker registers (public/sw.js)
[ ] 3.4.4  Fix any responsive breakage found:
           a. Add responsive utility classes (sm:, md:, lg:)
           b. Convert fixed-width elements to max-w-full
           c. Ensure touch targets are >= 44x44px
[ ] 3.4.5  Test on real device if possible (not just browser DevTools)
```

### 3.5 Backup and Recovery Plan

```
[ ] 3.5.1  Document database backup procedure:
           a. Automated: Supabase PITR (if Pro plan)
           b. Manual: `npx supabase db dump --linked > backup-YYYYMMDD.sql`
           c. Schedule: daily automated, manual before any migration
           d. Storage: keep 30 days of daily backups
           e. Test restoration: restore a backup to a test project, verify data integrity
[ ] 3.5.2  Document application rollback procedure:
           a. Vercel: instant rollback via dashboard (previous deployment)
           b. Beta: `bash scripts/rollback-beta.sh` (redeploys previous commit)
           c. Database: restore from PITR or SQL dump
           d. Combined: rollback app first, then database if needed
[ ] 3.5.3  Document incident response process:
           a. Detection: Sentry alerts, health check monitoring, user reports
           b. Triage: determine severity (data loss, payment failure, UI broken, degraded)
           c. Response times:
              - P0 (data loss, payment failure): immediate action
              - P1 (core feature broken): fix within 4 hours
              - P2 (non-core feature broken): fix within 24 hours
              - P3 (cosmetic/minor): next session
           d. Communication: notify affected users via email
           e. Post-mortem: document what happened, root cause, fix, prevention
[ ] 3.5.4  Set up monitoring alerts:
           a. Sentry: alert on new unhandled errors
           b. Health check: set up external ping (UptimeRobot, Better Uptime)
              - Monitor: https://app.cheflowhq.com/api/health?strict=1
              - Alert if 503 (degraded) or timeout
              - Check interval: 5 minutes
           c. Stripe: enable webhook failure notifications
           d. Supabase: enable database size and connection count alerts
[ ] 3.5.5  Write docs/incident-response.md with all of the above
```

---

## TIER 4: FIRST-WEEK-POST-LAUNCH

### 4.1 Production Domain and DNS

```
[ ] 4.1.1  Verify DNS configuration for app.cheflowhq.com:
           a. Check A/CNAME record points to Vercel
           b. Verify SSL certificate is valid (Vercel auto-provisions)
           c. Test: curl -I https://app.cheflowhq.com (should return 200/302)
[ ] 4.1.2  Verify DNS for cheflowhq.com (root domain):
           a. Should redirect to app.cheflowhq.com or show landing page
           b. Check www.cheflowhq.com redirects properly
[ ] 4.1.3  Verify email DNS records:
           a. SPF: v=spf1 include:resend.com ~all
           b. DKIM: resend._domainkey.cheflowhq.com
           c. DMARC: _dmarc.cheflowhq.com v=DMARC1; p=quarantine
           d. Test with mail-tester.com or mxtoolbox.com
[ ] 4.1.4  Set up redirects if needed:
           a. cheflowhq.com -> app.cheflowhq.com (if not already)
           b. www.cheflowhq.com -> app.cheflowhq.com
```

### 4.2 Production Deployment (The Actual Push to Main)

```
[ ] 4.2.1  Pre-deployment checklist (ALL must be true):
           a. [ ] All typecheck errors resolved (1.1)
           b. [ ] Production Supabase project configured (1.2)
           c. [ ] Stripe live mode configured (1.3)
           d. [ ] Legal pages reviewed (1.4)
           e. [ ] All Vercel env vars set (1.5)
           f. [ ] Vercel build tested on preview branch (2.1)
           g. [ ] Demo data isolated (2.2)
           h. [ ] Rate limiting backend configured (2.3)
           i. [ ] Email delivery verified (2.4)
           j. [ ] AI degradation strategy decided (2.5)
[ ] 4.2.2  Create release branch:
           a. git checkout main
           b. git pull origin main
           c. git merge feature/openclaw-adoption
           d. Resolve any merge conflicts
           e. Run full build: NODE_OPTIONS="--max-old-space-size=12288" npx next build --no-lint
           f. Run typecheck: npm run typecheck
           g. Both must pass with zero errors
[ ] 4.2.3  Push to main (triggers Vercel deployment):
           a. REQUIRES EXPLICIT DEVELOPER APPROVAL
           b. git push origin main
           c. Monitor Vercel build logs for failures
           d. Wait for deployment to complete (~5-10 minutes)
[ ] 4.2.4  Post-deployment verification:
           a. Visit https://app.cheflowhq.com - landing page loads
           b. Sign in with developer account
           c. Check dashboard loads with real data
           d. Create a test inquiry
           e. Check health endpoint: https://app.cheflowhq.com/api/health
           f. Verify Stripe webhook endpoint responds (check Stripe dashboard)
           g. Send a test email (invitation or notification)
           h. Check Sentry for any new errors
[ ] 4.2.5  If anything fails:
           a. Rollback via Vercel dashboard (instant, previous deployment)
           b. Diagnose the issue
           c. Fix on feature branch
           d. Re-deploy
```

### 4.3 Post-Launch Monitoring (First 72 Hours)

```
[ ] 4.3.1  Monitor Sentry for unhandled errors:
           a. Check hourly for first 24 hours
           b. Check 3x daily for next 48 hours
           c. Fix any P0/P1 errors immediately
[ ] 4.3.2  Monitor Stripe for payment issues:
           a. Check webhook delivery success rate
           b. Verify no failed webhooks
           c. Check for any stuck payment intents
[ ] 4.3.3  Monitor health endpoint:
           a. Set up external monitoring (UptimeRobot)
           b. Verify all background crons are running
           c. Check for degraded status
[ ] 4.3.4  Monitor database:
           a. Check connection count (should be < 60% of limit)
           b. Check storage usage
           c. Check for slow queries (> 1s) in Supabase logs
[ ] 4.3.5  Gather first user feedback:
           a. The app has a feedback form (components/feedback/)
           b. Check for submissions
           c. Prioritize and address critical feedback
```

---

## DEPENDENCY GRAPH

```
1.1 (Type errors)     ─┐
1.2 (Prod Supabase)   ─┤
1.3 (Stripe live)     ─┼──> 4.2 (Deploy to main) ──> 4.3 (Monitor)
1.4 (Legal review)    ─┤
1.5 (Env vars)        ─┘
                        │
2.1 (Vercel memory)   ─┤
2.2 (Demo data)       ─┤
2.3 (Rate limiting)   ─┤  (should do before deploy, but not hard blockers)
2.4 (Email DNS)       ─┤
2.5 (AI strategy)     ─┘
                        │
3.1 (E2E tests)       ─┤
3.2 (Performance)     ─┤  (can do after deploy if under time pressure)
3.3 (Accessibility)   ─┤
3.4 (Mobile)          ─┤
3.5 (Backup plan)     ─┘
```

**Minimum viable launch path:** 1.1 + 1.2 + 1.3 + 1.5 + 2.1 -> 4.2 -> 4.3

**Recommended launch path:** All of Tier 1 + Tier 2 -> 4.2 -> 4.3 -> Tier 3

---

## WHAT IS ALREADY DONE (No Action Needed)

These items from the thread summary require zero additional work:

- [x] Build compiles (632 pages, exit 0 with 12GB heap)
- [x] All 14 'use server' non-async export violations fixed
- [x] Webpack module resolution fixed (tsconfigPath removed)
- [x] Typecheck separated from build (ignoreBuildErrors: true)
- [x] All startTransition calls have try/catch with error feedback
- [x] All route groups have error boundaries
- [x] Behavioral segment delete uses real server action with rollback
- [x] Onboarding wizard redirects to real pages (no fake "Mark Complete")
- [x] All "coming soon" text removed from user-facing UI (7 instances)
- [x] Core business workflows fully implemented (inquiries, events, quotes, payments, clients, recipes, scheduling)
- [x] Immutable append-only ledger for financials
- [x] Stripe webhook handler with idempotency
- [x] 8-state event FSM with atomic transitions and audit trail
- [x] Rate limiting system exists (lib/rateLimit.ts + lib/sms/rate-limit.ts)
- [x] Legal pages exist with real content (ToS + Privacy Policy)
- [x] Email sending configured (Resend, info@cheflowhq.com)
- [x] Health check endpoint with 23 background job monitors
- [x] Security headers configured (CSP, X-Frame-Options, Permissions-Policy)
- [x] Role-based auth middleware with tenant scoping
- [x] 3-environment architecture (dev/beta/production)
- [x] Beta deploy with zero-downtime, auto-rollback
- [x] Vercel ignoreCommand prevents accidental feature branch deploys
