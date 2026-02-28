# ChefFlow Production Hardening — Master TODO

> **Generated:** 2026-02-28
> **Branch:** `feature/risk-gap-closure`
> **Purpose:** Complete audit of every item that must be addressed before production deployment.

---

## How to Use This Document

Every item is tagged with a priority:

- **P0** — Must fix before production. App is broken, insecure, or will crash without this.
- **P1** — Fix before launch. High risk of user-facing bugs, data issues, or security gaps.
- **P2** — Fix before scale. Will cause problems as user base grows.
- **P3** — Quality / polish. Won't break anything but affects professionalism and maintainability.

---

## 1. SECURITY & AUTH HARDENING

### P0

- [ ] **Remove `ignoreBuildErrors: true` from `next.config.js`** — TypeScript errors silently ship to production. This is the single biggest safety net missing. (`next.config.js:47`)
- [ ] **Fix E2E auth endpoint production guard** — `app/api/e2e/auth/route.ts` accepts unauthenticated sign-in if `SUPABASE_E2E_ALLOW_REMOTE=true` is accidentally set on Vercel. Add `if (process.env.NODE_ENV === 'production') return 403` hard stop. (`app/api/e2e/auth/route.ts:12`)
- [ ] **Fix 2 cron routes that bypass auth when `CRON_SECRET` unset** — `if (secret && authHeader !== ...)` short-circuits to no auth when secret is empty. Must fail closed: `if (!secret) return 500`. (`app/api/scheduled/campaigns/route.ts:12`, `app/api/scheduled/sequences/route.ts:13`)
- [ ] **`SOCIAL_TOKEN_ENCRYPTION_KEY` — verify it is set in production** — Without it, OAuth tokens are stored in plaintext in the database. (`lib/integrations/core/token-crypto.ts`)

### P1

- [ ] **Add admin email check to middleware for `/admin` paths** — Currently any authenticated user can reach `/admin/*` routes; security depends entirely on the layout calling `requireAdmin()`. Add defense-in-depth in middleware. (`middleware.ts:250-256`)
- [ ] **Remove `any` casts from core auth file** — `lib/auth/get-user.ts` casts `supabase` to `any` in every auth function (`getCurrentUser`, `requireChef`, `requirePartner`, `requireStaff`, `requireAdmin`). Zero type safety on auth queries. (`lib/auth/get-user.ts:38,108,156,181,207,232`)
- [ ] **Implement Twilio signature verification on inbound SMS** — Any HTTP client can send form-urlencoded payloads and bypass the bearer token check. Must verify `x-twilio-signature`. (`app/api/comms/sms/route.ts:19-24`)
- [ ] **Consolidate duplicate `requireAdmin()` exports** — Two implementations with different signatures exist at `lib/auth/admin.ts` and `lib/auth/get-user.ts:257`. Pick one, delete the other.
- [ ] **Remove webhook secret from URL query parameter** — `req.nextUrl.searchParams.get('secret')` puts the secret in access logs. Require `x-chefflow-webhook-secret` header only. (`app/api/webhooks/[provider]/route.ts:35`)
- [ ] **Use `crypto.timingSafeEqual()` for CRON_SECRET comparison** — String equality is vulnerable to timing attacks. Apply to all 32 cron/scheduled route handlers.

### P2

- [ ] **Sanitize blog markdown renderer** — Link URLs pass through unsanitized (javascript: URLs possible). Table cells and list items not HTML-escaped. Add DOMPurify or allowlist protocols. (`components/blog/blog-markdown.tsx:76-81`)
- [ ] **Sanitize email template HTML preview** — `dangerouslySetInnerHTML={{ __html: previewTemplate.bodyHtml }}` renders chef-authored HTML without sanitization. (`components/marketing/email-builder.tsx:289`)
- [ ] **Gate AI health/monitor endpoints with admin auth** — `/api/ai/monitor` and `/api/ai/health` expose internal infra details (including Pi LAN IP `10.0.0.177:11434`) to any unauthenticated caller. (`app/api/ai/monitor/route.ts`, `app/api/ai/health/route.ts`)
- [ ] **Add rate limiting to error reporting endpoint** — `/api/monitoring/report-error` has no auth and no rate limiting. Can be flooded. (`app/api/monitoring/report-error/route.ts`)
- [ ] **Sign the role cache cookie** — `chefflow-role-cache` cookie is `httpOnly` but unsigned. HMAC-sign the value. (`middleware.ts:176-239`)
- [ ] **Audit `observability.ts` payload for PII** — `console.log(payload)` logs full payload without inspection. (`lib/activity/observability.ts:41`)
- [ ] **Remove PII from production logs** — 4 files log email addresses to Vercel function logs:
  - `app/api/cron/cooling-alert/route.ts:63` (client name)
  - `lib/email/send.ts:35` (email address)
  - `lib/campaigns/push-dinner-actions.ts:394` (email)
  - `lib/marketing/actions.ts:386` (email)

---

## 2. TYPE SAFETY & `@ts-nocheck` FILES

### P0

- [ ] **Fix or gate 46 `@ts-nocheck` files that export callable functions** — These will crash at runtime if they reference non-existent tables/columns. Must either fix types + remove `@ts-nocheck`, remove exports, or add runtime guards. Files grouped by risk:

  **Server action files (`'use server'`) — highest crash risk:**
  - [ ] `lib/travel/actions.ts`
  - [ ] `lib/events/fire-order.ts`
  - [ ] `lib/campaigns/public-booking-actions.ts`
  - [ ] `lib/campaigns/targeting-actions.ts`

  **Cron/API routes — crashes affect automated systems:**
  - [ ] `app/api/scheduled/lifecycle/route.ts` (runs daily at 3am)
  - [ ] `app/api/social/google/callback/route.ts`
  - [ ] `app/api/social/instagram/callback/route.ts`
  - [ ] `app/api/social/instagram/sync/route.ts`

  **Client-facing pages — crashes affect end users:**
  - [ ] `app/(client)/my-spending/page.tsx`
  - [ ] `app/(client)/my-profile/page.tsx`
  - [ ] `app/(client)/my-events/[id]/pre-event-checklist/page.tsx`

  **AI modules — deferred schema:**
  - [ ] `lib/ai/aar-generator.ts`
  - [ ] `lib/ai/business-insights.ts`
  - [ ] `lib/ai/carry-forward-match.ts`
  - [ ] `lib/ai/chef-bio.ts`
  - [ ] `lib/ai/client-preference-profile.ts`
  - [ ] `lib/ai/contingency-ai.ts`
  - [ ] `lib/ai/equipment-depreciation-explainer.ts`
  - [ ] `lib/ai/gratuity-framing.ts`
  - [ ] `lib/ai/grocery-consolidation.ts`
  - [ ] `lib/ai/import-take-a-chef-action.ts`
  - [ ] `lib/ai/lead-scoring.ts`
  - [ ] `lib/ai/menu-nutritional.ts`
  - [ ] `lib/ai/prep-timeline.ts`
  - [ ] `lib/ai/pricing-intelligence.ts`
  - [ ] `lib/ai/recipe-scaling.ts`
  - [ ] `lib/ai/review-request.ts`
  - [ ] `lib/ai/sentiment-analysis.ts`
  - [ ] `lib/ai/service-timeline.ts`
  - [ ] `lib/ai/social-captions.ts`
  - [ ] `lib/ai/staff-briefing-ai.ts`
  - [ ] `lib/ai/tax-deduction-identifier.ts`
  - [ ] `lib/ai/temp-log-anomaly.ts`
  - [ ] `lib/ai/testimonial-selection.ts`

  **Analytics — wrong column references:**
  - [ ] `lib/analytics/revenue-engine.ts` (references `total_price`, `menu_items` — doesn't exist)
  - [ ] `lib/analytics/menu-engineering.ts` (references `menu_items` — doesn't exist)
  - [ ] `lib/analytics/operations-analytics.ts`
  - [ ] `lib/analytics/pipeline-analytics.ts`
  - [ ] `lib/analytics/marketing-analytics.ts`
  - [ ] `lib/analytics/social-analytics.ts`

  **Other:**
  - [ ] `lib/clients/spending-actions.ts`
  - [ ] `lib/gmail/sync.ts`
  - [ ] `lib/inquiries/take-a-chef-capture-actions.ts`
  - [ ] `lib/scheduling/prep-block-actions.ts`
  - [ ] `lib/simulation/simulation-runner.ts`
  - [ ] `lib/social/hashtag-actions.ts`
  - [ ] `lib/waste/actions.ts`
  - [ ] `components/ai/command-result-card.tsx`
  - [ ] `components/import/take-a-chef-import.tsx`

### P1

- [ ] **Remove file-level `/* eslint-disable */`** from 2 OAuth files — both handle tokens, security-critical:
  - [ ] `app/api/integrations/social/connect/[platform]/route.ts`
  - [ ] `lib/social/oauth/token-store.ts`
- [ ] **Reduce `as any` count (2,842 occurrences / 532 files)** — Most are Supabase type workarounds. Highest-risk files:
  - [ ] `lib/sharing/actions.ts` (96 casts)
  - [ ] `lib/communication/actions.ts` (50 casts)
  - [ ] `app/api/webhooks/stripe/route.ts` (42 casts)
  - [ ] `lib/clients/actions.ts` (32 casts)
  - [ ] `lib/social/actions.ts` (25 casts)
- [ ] **Also remove `eslint-disable` for `react-hooks/exhaustive-deps`** — 4 instances that could cause stale state bugs:
  - [ ] `components/ui/keyboard-shortcut-provider.tsx:110`
  - [ ] `components/commerce/pos-register.tsx:217`
  - [ ] `components/social/social-story-bar.tsx:130`
  - [ ] `lib/realtime/subscriptions.ts:261`

### P2

- [ ] **Push all pending migrations to remote Supabase + regenerate `types/database.ts`** — This eliminates the root cause of most `as any` casts and `@ts-nocheck` files. Requires backup first.
- [ ] **Remove `ignoreDuringBuilds: true` for ESLint** — Security-relevant ESLint rules not enforced at build time. (`next.config.js`)

---

## 3. ZERO HALLUCINATION VIOLATIONS

### P0

- [ ] **`lib/stripe/actions.ts` — `getEventPaymentStatus` returns $0 on DB failure** — Ignores Supabase `.error` field. A query failure shows `$0 outstanding` and `unpaid` as if real. Zero Hallucination Law 2 violation. (`lib/stripe/actions.ts:152-157`)
- [ ] **`lib/analytics/revenue-engine.ts` — `computeDashboardKPIs` returns zeros on fetch failure** — `allEvents = events || []` substitutes zeros when query fails. Chef sees $0 revenue dashboard. (`lib/analytics/revenue-engine.ts:100`)

### P1

- [ ] **84+ `startTransition` components with no `try/catch`** — Server action failures leave UI in optimistic state with no rollback and no error toast. Highest-risk instances:
  - [ ] `components/events/alcohol-service-log.tsx` (compliance logging — silent fail = missing records)
  - [ ] `app/(chef)/settings/modules/modules-client.tsx` (sidebar module toggles — UI permanently wrong)
  - [ ] `components/calendar/availability-share-settings.tsx` (security token generation — silent fail)
  - [ ] `components/events/scope-drift-banner.tsx` (operational acknowledgment)
  - [ ] `components/commerce/pos-register.tsx` (POS — financial transactions)
  - [ ] `components/events/record-payment-modal.tsx` (payment recording)
  - [ ] `components/admin/admin-credit-form.tsx`
  - [ ] `components/admin/announcement-form.tsx`
  - [ ] `components/admin/broadcast-email-form.tsx`
  - [ ] `components/admin/direct-email-form.tsx`
  - [ ] `components/admin/chef-danger-zone.tsx`
  - [ ] `components/events/budget-tracker.tsx`
  - [ ] `components/events/event-photo-gallery.tsx`
  - [ ] `components/events/pre-service-safety-checklist.tsx`
  - [ ] `components/events/quick-receipt-capture.tsx`
  - [ ] `components/events/travel-plan-client.tsx`
  - [ ] `components/feedback/feedback-form.tsx`
  - [ ] `components/finance/bank-feed-panel.tsx`
  - [ ] `components/finance/cash-flow-chart.tsx`
  - [ ] `components/dishes/dish-photo-upload.tsx`
  - [ ] `components/equipment/depreciation-schedule-panel.tsx`
  - [ ] `components/events/event-debrief-client.tsx`
  - [ ] `components/daily-ops/plan-item.tsx`
  - [ ] `components/dashboard/chef-todo-widget.tsx`
  - [ ] `components/dashboard/holiday-outreach-panel.tsx`
  - [ ] _(~60 more in `components/` + 8 in `app/`)_
- [ ] **`lib/stripe/actions.ts` — `createPaymentIntent` throws raw errors** — Should return `{ success: false, error }` instead of `throw`. Client sees unhandled error. (`lib/stripe/actions.ts:40-42`)

### P2

- [ ] **`is_demo` flag not consumed by UI** — Demo data has no visual badge distinguishing it from real data. (`lib/onboarding/demo-data.ts`)
- [ ] **`$29/month` hardcoded on pricing page** — Not from Stripe, not from a constant. (`app/(public)/pricing/page.tsx`)
- [ ] **`menu-engineering.ts` uses `salesCount = 1` placeholder** — Fake data used in calculations. (`lib/analytics/menu-engineering.ts`)
- [ ] **Multi-night package prices = `$0`** — Default pricing constant. (`lib/pricing/constants.ts`)
- [ ] **CAC metric always `$0`** — `marketing_spend_log` table doesn't exist. (`lib/analytics/client-analytics.ts`)

---

## 4. STUB FEATURES & NO-OP UI

### P1

- [ ] **Event Creation Wizard is a complete stub on a live route** — `/events/new/wizard` renders "coming soon" text. Either remove the route or build the wizard. (`components/events/event-creation-wizard.tsx`, `app/(chef)/events/new/wizard/page.tsx`)
- [ ] **Print button `onClick={() => {}}` does nothing** — Label says "Print (Ctrl+P)" but the button is a no-op. Add `window.print()`. (`app/(chef)/stations/[id]/clipboard/print/page.tsx:101-107`)
- [ ] **Broken route: `/community/templates/share`** — "Share a Template" button links to a route with no `page.tsx`. 404 for users. (`app/(chef)/community/templates/page.tsx:31`)
- [ ] **Disconnect Gmail button is a no-op** — Button exists but does nothing. (`components/integrations/take-a-chef-setup.tsx`)

### P2

- [ ] **Push dinner menu picker shows "coming soon"** — Inside a live, working feature. (`components/campaigns/push-dinner-builder.tsx:623`)
- [ ] **Desktop app download shows "coming soon"** — In Settings. (`components/settings/desktop-app-settings.tsx:69`)
- [ ] **Public chefs directory shows "coming soon"** — Empty state when no approved chefs. (`app/(public)/chefs/page.tsx:204`)
- [ ] **Missing list page for `/wix-submissions`** — Only `[id]` detail exists, no index. (`app/(chef)/wix-submissions/`)
- [ ] **Missing list page for `/contracts`** — Only `[id]/history` exists, no index. (`app/(chef)/contracts/`)
- [ ] **Calendar entry notifications never sent** — TODO comment: `// TODO: trigger actual email/push notification`. (`lib/calendar/entry-actions.ts:377`)

---

## 5. ERROR BOUNDARIES & LOADING STATES

### P1

- [ ] **`app/(mobile)/` has no `error.tsx`** — Mobile users see the generic desktop error page on crash.
- [ ] **Public-facing pages missing error boundaries** — `app/book/`, `app/menus/[id]`, `app/recipes/[id]` have no `error.tsx`. Users see internal dark error UI.
- [ ] **Public-facing pages missing loading states** — `app/book/[chefSlug]/`, `app/menus/[id]`, `app/recipes/[id]` have no `loading.tsx`. No skeleton/spinner during data fetch.
- [ ] **No per-group `not-found.tsx`** — `(chef)`, `(client)`, `(admin)`, `(public)`, `(partner)` all fall through to root. Users lose layout context on 404.

### P2

- [ ] **Admin sub-pages have no loading states** — All `app/(admin)/admin/*/` routes.
- [ ] **Partner portal has no loading states** — All `app/(partner)/partner/` subtree.
- [ ] **Mobile views have no loading states** — All `app/(mobile)/` subtree.
- [ ] **No custom offline page in service worker** — Users see browser's native offline page instead of ChefFlow-branded offline page (though `public/offline.html` exists, verify it's wired into the SW).

---

## 6. PERFORMANCE & BUNDLE SIZE

### P1

- [ ] **Dynamically import Recharts** — 14 chart components statically import Recharts (~300 KB). None use `next/dynamic`. Every page with charts loads the full bundle.
  - `components/analytics/analytics-hub-client.tsx`
  - `components/analytics/benchmark-dashboard.tsx`
  - `components/analytics/client-ltv-chart.tsx`
  - `components/analytics/insights-charts.tsx`
  - `components/analytics/pipeline-forecast.tsx`
  - `components/analytics/referral-analytics-dashboard.tsx`
  - `components/analytics/report-builder.tsx`
  - `components/analytics/source-charts.tsx`
  - `components/finance/cash-flow-chart.tsx`
  - `components/finance/forecast-chart.tsx`
  - `components/goals/life-balance-wheel.tsx`
  - `components/inventory/waste-dashboard.tsx`
  - `components/marketing/campaign-performance.tsx`
  - `components/staff/labor-dashboard.tsx`
- [ ] **Dynamically import Remotion** — 13 video explainer components statically import `@remotion/player` (~1.5 MB). None use `next/dynamic`.
  - `components/public/product-explainer-player.tsx`
  - `components/explainers/event-lifecycle-player.tsx`
  - `components/explainers/client-journey-player.tsx`
  - `components/ai-privacy/privacy-schematic-player.tsx`
  - `components/admin/system-architecture-player.tsx`
  - _(8 more in `components/explainers/`)_
- [ ] **Dynamically import FullCalendar** — 5 packages statically imported (~400 KB) in `components/scheduling/calendar-view.tsx`.
- [ ] **Dynamically import `react-markdown` in Remy drawer** — The drawer is always mounted in the chef layout. `react-markdown` + `remark-gfm` + `rehype-raw` load on every single chef page even when the drawer is closed. (`components/ai/remy-drawer.tsx`)
- [ ] **Verify Tesseract.js is server-only** — ~4 MB library. If it leaks into the client bundle, catastrophic. (In `package.json`)

### P2

- [ ] **Fix N+1 query in cooling-alert cron** — O(chefs × clients) database queries per run. With 100 chefs and 50 clients each = 10,000+ queries. Rewrite as single SQL with window function. (`app/api/cron/cooling-alert/route.ts`)
- [ ] **Fix N+1 query in brand-monitor cron** — Same per-chef loop pattern. (`app/api/cron/brand-monitor/route.ts`)
- [ ] **Narrow `select('*')` on high-traffic paths** — 211 files use `.select('*')`. Priority files:
  - [ ] `lib/chat/actions.ts` (6 occurrences)
  - [ ] `lib/automations/engine.ts` (scanned every 15-min cron)
  - [ ] `lib/activity/actions.ts`
  - [ ] `lib/campaigns/push-dinner-actions.ts` (5 occurrences)
- [ ] **Make public pages server components** — `/pricing` and `/contact` are `'use client'` preventing static generation. (`app/(public)/pricing/page.tsx`, `app/(public)/contact/page.tsx`)
- [ ] **Replace `<img>` with `next/image` `<Image>`** — 54 raw `<img>` tags causing CLS and skipping optimization. Priority:
  - [ ] `components/network/chef-card.tsx:44` (no width/height)
  - [ ] `components/sharing/recap-photo-grid.tsx` (event photos)
  - [ ] `components/sharing/guest-photo-gallery.tsx` (guest photos)
  - [ ] `components/events/event-photo-gallery.tsx:515`
  - [ ] `app/(partner)/partner/preview/page.tsx` (3 images)
  - [ ] `app/(partner)/partner/locations/[id]/page.tsx:81`
  - [ ] `app/(chef)/settings/profile/profile-form.tsx:142`
- [ ] **Fix static build ID** — `generateBuildId: 'chefflow-build'` means manifest files aren't cache-busted between deployments. (`next.config.js`)
- [ ] **Add `Cache-Control: no-store, private` to document API routes** — Invoice and quote PDF routes have no explicit cache headers. (`/api/documents/invoice/[eventId]`, `/api/documents/quote/[quoteId]`)

---

## 7. MEMORY LEAKS & CLEANUP

### P2

- [ ] **`components/menus/menu-doc-editor.tsx`** — Debounced auto-save timers stored in ref map with no useEffect cleanup. Server action fires after unmount. (`menu-doc-editor.tsx:137-142`)
- [ ] **`components/notifications/notification-provider.tsx`** — Calls `subscribeToNotifications()` without verifying cleanup return. (`notification-provider.tsx:271`)
- [ ] **`components/pwa/sw-register.tsx`** — `addEventListener` without `removeEventListener`.
- [ ] **`components/culinary/list-view.tsx` and `board-view.tsx`** — `addEventListener` without `removeEventListener`.
- [ ] **`components/dashboard/system-nerve-center.tsx`** — Async callback inside `setTimeout` can cause state update after unmount. (`system-nerve-center.tsx:111`)
- [ ] **`components/activity/activity-tracker.tsx`** — `metadata` object dependency in useEffect causes re-fire on every render when caller passes inline object. (`activity-tracker.tsx:29`)

---

## 8. DATABASE & MIGRATIONS

### P0

- [ ] **Fix 4 migration timestamp collisions** — Two pairs share the same timestamp. `supabase db push` will have unpredictable ordering:
  - `20260328000001_commerce_engine_foundation.sql` vs `20260328000001_rsvp_viewer_invites.sql`
  - `20260328000002_commerce_register_sessions.sql` vs `20260328000002_rsvp_enhancements_wave2.sql`
- [ ] **Remove backup SQL files from repo root** — 6 `backup-*.sql` files checked into git. If repo ever goes public = full DB schema leak. Move to `.gitignore`.
  - `backup-20260221-025345.sql`
  - `backup-20260221-025539.sql`
  - `backup-20260221-risk-gap.sql`
  - `backup-20260222.sql`
  - `backup-20260224.sql`
  - `backup-20260227.sql`

### P1

- [ ] **Investigate missing migration `20260327000010`** — Gap in sequence between `000009` and `000011`. Verify if intentional or a lost migration.
- [ ] **Apply all pending migrations to remote Supabase** — 315 migration files locally, many not pushed to remote. Requires backup + explicit approval.
- [ ] **Regenerate `types/database.ts`** — After migration push, run `supabase gen types typescript --linked > types/database.ts` to eliminate `as any` casts.

### P2

- [ ] **Create rollback scripts for critical migrations** — Zero down/rollback SQL exists. Emergency recovery requires full snapshot restore.
- [ ] **124 Supabase queries drop the `error` field** — `const { data } = await supabase.from(...)` pattern. Most are fine for empty states, but financial queries must check errors.

---

## 9. DEPLOYMENT & OPS

### P0

- [ ] **Verify `vercel.json` `ignoreCommand` behavior** — Current config: `[ "$VERCEL_GIT_COMMIT_REF" = "main" ]`. This may cause feature branch pushes to trigger paid Vercel preview deployments (opposite of documented behavior). Verify in Vercel project settings. (`vercel.json:2`)

### P1

- [ ] **Document 60+ undocumented environment variables** — `.env.local.example` documents ~22 vars but code uses ~103. New developer setup will silently fail on most features. Key undocumented vars:
  - `STRIPE_SUBSCRIPTION_PRICE_ID` (throws if missing)
  - `SOCIAL_TOKEN_ENCRYPTION_KEY` (falls back to plaintext)
  - `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_CONTACT_EMAIL` (throws if missing)
  - `TURNSTILE_SECRET_KEY` (bypasses bot protection if missing)
  - All DocuSign, social media, grocery API, Twilio, OneSignal, Mapbox, PostHog vars
- [ ] **Enable Sentry source map uploads** — `disableServerWebpackPlugin: true` and `disableClientWebpackPlugin: true` mean Sentry stack traces show minified code. Unreadable in production. (`next.config.js`)
- [ ] **Set up PostHog for production** — `NEXT_PUBLIC_POSTHOG_KEY` not in `.env.local.example`, likely unset on Vercel. Zero product analytics.
- [ ] **Review Vercel cron schedule vs plan limits** — 24 cron endpoints, 4 at 5-minute intervals = continuous function invocations 24/7. May exhaust Hobby plan compute budget.

### P2

- [ ] **Implement structured logging** — All 1,647 `console.*` calls. No log aggregation, no correlation IDs, no structured JSON. Consider Pino or Winston.
- [ ] **Set up external uptime monitoring** — Health check endpoints exist but no external monitor (UptimeRobot, Better Uptime) is configured.
- [ ] **Upgrade Supabase to Pro plan** — Free plan has 24-hour RPO (daily snapshots only). Pro gives PITR with ~5-minute RPO.
- [ ] **PWA service worker drift** — `public/sw.js` is a static artifact from a previous build. New builds don't regenerate it unless `ENABLE_PWA_BUILD=1`. Precache list can drift.
- [ ] **Remove `CHEFFLOW_V1_SCOPE_LOCK.md` reference from README** — File doesn't exist. (`README.md`)
- [ ] **No infrastructure-as-code** — Vercel, Supabase, Cloudflare all configured manually. No Terraform/Pulumi for disaster rebuild.

---

## 10. TESTING

### P0

- [ ] **Execute `codex-full-test-suite.md` prompt** — ~5% test coverage (27 test files vs ~896 lib files). The prompt is fully written and ready in `prompts/queue/`.

### P1

- [ ] **Write unit tests for Stripe subscription lifecycle** — `handleSubscriptionUpdated`, `handleSubscriptionDeleted`, `createStripeCustomer`, `startTrial` have no unit tests. A regression silently breaks tier gating. (`lib/stripe/subscription.ts`)
- [ ] **Write unit tests for Stripe checkout, refund, deferred transfers** — (`lib/stripe/checkout.ts`, `lib/stripe/refund.ts`, `lib/stripe/deferred-transfers.ts`)
- [ ] **Write unit tests for `lib/billing/require-pro.ts`** — Gate enforcement not directly tested.
- [ ] **Write unit tests for email sending** — `lib/communication/`, `lib/queue/providers/` completely untested.
- [ ] **Write unit tests for all API route handlers** — `app/api/` routes only tested via E2E.
- [ ] **Add integration tests to CI** — Currently only smoke tests run, and only on PRs to main.
- [ ] **Run E2E tests on feature branch pushes** — Currently CI only runs E2E on PRs to main.

### P2

- [ ] **Execute `remy-onboarding-personality-persistence.md` prompt** — Fully spec'd onboarding experience in `prompts/queue/`.

---

## 11. ACCESSIBILITY

### P1

- [ ] **Add skip links to `(client)`, `(public)`, `(partner)`, `(staff)` layouts** — Only `(chef)` layout has one.
- [ ] **Add `role="button"` and `tabIndex` to clickable `<div>` elements:**
  - [ ] `components/tasks/template-page-client.tsx:172`
  - [ ] `components/social/social-story-bar.tsx:168` (full-screen overlay not keyboard-dismissible)
  - [ ] Multiple modal backdrop divs in aar-form, goals, social components

### P2

- [ ] **Add meaningful alt text to non-decorative images:**
  - [ ] `components/events/event-collaborators-panel.tsx:288` (avatar — user unidentifiable)
  - [ ] `components/menus/cocktail-browser-panel.tsx:248,285` (product images)
  - [ ] `components/recipes/nutrition-lookup-panel.tsx:139`
  - [ ] `components/recipes/product-lookup-panel.tsx:68,257`
- [ ] **Increase minimum text size** — `text-[9px]` and `text-[10px]` in activity components below WCAG readable minimum:
  - [ ] `components/activity/activity-dot.tsx:106` (9px)
  - [ ] `components/activity/retrace-timeline.tsx` (10px)
  - [ ] `components/aar/aar-form.tsx` (10px)
- [ ] **Add `aria-label` to icon-only buttons** — Notification bell and other icon-only controls.
- [ ] **Replace `confirm()` with modal** — Native `confirm()` blocked in some contexts. (`components/devices/staff-pin-manager.tsx:55`)
- [ ] **Add landmark roles to all layouts** — Verify `<main>` landmarks in client/public/partner layouts.

---

## 12. UX POLISH

### P2

- [ ] **Add empty state to My Kitchen** — First-time users see form with no explanation. (`app/(chef)/culinary/my-kitchen/page.tsx`)
- [ ] **Add empty state to recipe production log** — Returns `null` (blank page). (`app/(chef)/recipes/production-log/production-log-client.tsx:45`)
- [ ] **Add required field indicators (`*`) to all forms** — Required nature only revealed after failed submission.
- [ ] **Standardize date formatting** — Mixed use of `date-fns format()`, `toLocaleDateString()`, `Intl.DateTimeFormat`, and raw ISO strings across the app.
- [ ] **Use shared `formatCurrency` everywhere** — Admin pages define local `formatCents` helpers instead. (`app/(admin)/admin/users/page.tsx`)
- [ ] **Add timezone auto-detection** — Calendar/schedule display may show server time, not chef's local time.

---

## 13. CACHE INVALIDATION

### P2

- [ ] **Bust `chef-layout-{chefId}` tag in booking settings** — `lib/booking/booking-settings-actions.ts` updates `chefs` table but doesn't invalidate layout cache. Chef's business name change stale for 60s.
- [ ] **Bust `chef-layout-{chefId}` tag in network actions** — `lib/network/actions.ts` updates chef profile without tag invalidation.

---

## 14. RATE LIMITING & ABUSE

### P1

- [ ] **Add rate limiting to these unauthenticated/semi-authenticated endpoints:**
  - [ ] `/api/activity/track` (called on every page view, no rate limiting)
  - [ ] `/api/activity/breadcrumbs` (called on every page view, no rate limiting)
  - [ ] `/api/notifications/send` (no rate limiting)
  - [ ] `/api/menus/upload` (file upload, no rate limiting = storage abuse)
  - [ ] `/api/comms/sms` (verify `lib/sms/rate-limit.ts` is actually imported in route)
  - [ ] `/api/monitoring/report-error` (no auth, no rate limiting)

### P2

- [ ] **Replace in-memory rate limiter on embed route** — Per-process Map resets on cold start. Use existing Upstash Redis limiter. (`app/api/embed/inquiry/route.ts`)

---

## 15. LEGAL & COMPLIANCE

### P2

- [ ] **Verify GDPR client-side data deletion** — Chef GDPR tools exist at `/settings/compliance/gdpr/`. Verify that _clients_ can also request data export/deletion.
- [ ] **Review cookie consent granularity** — Cookie consent mechanism exists but verify it distinguishes between necessary, analytics, and marketing cookies.

---

## 16. OPEN BRANCHES

### P2 — Review, merge, or close these 10 stale branches:

- [ ] `feature/add-client-button`
- [ ] `feature/chat-file-sharing`
- [ ] `feature/domain-migration-cheflowhq`
- [ ] `feature/packing-list-system`
- [ ] `feature/resend-email`
- [ ] `feature/scheduling-improvements`
- [ ] `feature/wix-integration`
- [ ] `fix/cron-get-post-mismatch`
- [ ] `fix/grade-improvements`

---

## SUMMARY BY PRIORITY

| Priority  | Count    | Description                                                             |
| --------- | -------- | ----------------------------------------------------------------------- |
| **P0**    | ~58      | Security holes, crash-risk exports, migration collisions, data exposure |
| **P1**    | ~120     | Missing try/catch, missing tests, auth gaps, stub routes, rate limiting |
| **P2**    | ~65      | Performance, a11y, UX polish, logging, caching, bundle size             |
| **P3**    | ~10      | Date formatting, timezone detection, i18n prep                          |
| **Total** | **~253** |                                                                         |

---

## WHAT'S ALREADY DONE WELL (preserve these)

These patterns are production-grade and should not be changed:

- Tenant isolation — `tenantId` always from session, never request body, consistently enforced
- Ledger immutability — append-only with DB triggers, tested
- Event FSM — pure logic module with 100% transition matrix test coverage
- Circuit breakers — Stripe, Resend, Gemini, Supabase all wrapped
- Email sending — non-blocking, circuit-breaker protected, returns boolean
- Embed widget security — honeypot, Turnstile, IP rate limiting, Zod validation
- Stripe webhook verification — HMAC-SHA256 signature verification
- Security headers — HSTS, X-Frame-Options, CSP properly configured
- API key hashing — SHA-256 before storage, never plaintext
- Kiosk PIN rate limiting — DB-backed failure counter (works across processes)
- Account deletion lifecycle — soft-delete with 30-day grace period
- Demo endpoint production guard — `NODE_ENV === 'production'` hard stop
- Error boundaries — 15 route groups have dedicated `error.tsx`
- 985 database indexes across migrations
- Idempotency on ledger entries and mutations
- RLS integration tests for cross-tenant isolation
- Soak tests using Chrome DevTools Protocol for real heap measurement
