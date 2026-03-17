# ChefFlow Development Backlog - 2026-03-15

Comprehensive, prioritized list of all identified tasks to improve performance, stability, security, and user experience. Derived from automated QA testing, codebase scanning, accessibility audit, SEO audit, and error handling review.

## Completion Status

| Task                          | Status                                                 | Commit               |
| ----------------------------- | ------------------------------------------------------ | -------------------- |
| S-1 Cron auth bypass          | DONE                                                   | `1f3c960`            |
| S-2 Insurance crash risk      | DONE                                                   | `1f3c960`            |
| S-3 CRON_SECRET in dev        | Needs developer input (.env.local)                     |                      |
| C-1 /about page               | FALSE POSITIVE (no nav link exists)                    |                      |
| C-2 /privacy-policy redirect  | DONE                                                   | `e8e8616`            |
| C-3 Em dash removal           | DONE (1,079 files)                                     | `5bc5e9e`            |
| C-4 Test credentials          | Needs developer input                                  |                      |
| P-5 Health ping endpoint      | DONE                                                   | `94ea1c1`            |
| P-6 Google Fonts              | Already using display:swap                             |                      |
| Q-3 Form name attributes      | DONE (all auth forms)                                  | `94ea1c1`, `aa4cf12` |
| A-2 Heading hierarchy         | DONE                                                   | `94ea1c1`            |
| SEO-1 Pricing metadata        | DONE                                                   | `94ea1c1`            |
| SEO-2 Contact metadata        | Already had metadata via layout                        |                      |
| SEO-3 Blog metadata           | DONE                                                   | `94ea1c1`            |
| SEO-4 FAQ JSON-LD             | Already had JSON-LD                                    |                      |
| SEO-5 Pricing JSON-LD         | DONE                                                   | `7467fc0`            |
| SEO-6 Canonical URLs          | DONE                                                   | `94ea1c1`            |
| L-1 Chef loading states       | DONE (34 routes)                                       | `7467fc0`            |
| L-2 Client loading states     | DONE (9 routes)                                        | `7467fc0`            |
| Q-2 console.log cleanup       | DONE (3 high-impact files)                             | `7467fc0`            |
| R-1 Sentry error context      | DONE                                                   | `aa4cf12`            |
| F-4 Inquiry rate limiting     | Already had rate limiting                              |                      |
| A-1 Color contrast            | Verified: brand-600 fails WCAG AA, needs visual review |                      |
| P-1-P-4 Performance           | REMAINING                                              |                      |
| A-3 Sign-in validation        | REMAINING                                              |                      |
| Q-1 startTransition migration | REMAINING (ongoing)                                    |                      |
| Q-4 API 404 handling          | REMAINING                                              |                      |
| R-2 Uptime monitoring         | REMAINING (after P-5)                                  |                      |
| F-1-F-3 Future enhancements   | REMAINING                                              |                      |

---

## TIER 0: Security (fix before any feature work)

### S-1. Cron morning-briefing auth bypass

**Type:** Correction
**File:** `app/api/cron/morning-briefing/route.ts`
**Issue:** Inline auth check uses `if (cronSecret && ...)` which silently allows unauthenticated access when `CRON_SECRET` is unset. All 26 other cron endpoints correctly use `verifyCronAuth()`.
**Fix:** Replace inline check with `verifyCronAuth(request.headers.get('authorization'))`.
**Effort:** 5 minutes

### S-2. Insurance actions crash risk

**Type:** Correction
**File:** `lib/compliance/insurance-actions.ts`
**Issue:** Has `@ts-nocheck` and exports async functions referencing tables that don't exist. Any import + call = runtime crash.
**Fix:** Remove exports and add `// DEFERRED: awaiting insurance_policies table migration` comment, matching the pattern in `lib/waste/actions.ts`.
**Effort:** 5 minutes

### S-3. Set CRON_SECRET in development

**Type:** Addition
**File:** `.env.local`
**Issue:** `CRON_SECRET` is not set in local dev environment, meaning all cron endpoints using the vulnerable morning-briefing pattern would be open.
**Fix:** Add `CRON_SECRET=dev-local-secret-$(openssl rand -hex 16)` to `.env.local`.
**Effort:** 2 minutes

---

## TIER 1: Critical UX Corrections

### C-1. /about page missing (nav link leads to sign-in)

**Type:** Correction
**Issue:** Public nav has an "About" link but no `/about` route exists. Middleware redirects to sign-in.
**Fix:** Either create `app/(public)/about/page.tsx` with company info and add `/about` to `PUBLIC_UNAUTHENTICATED_PATHS` in `lib/auth/route-policy.ts`, or remove the nav link.
**Effort:** 30 minutes (create page) or 5 minutes (remove link)

### C-2. /privacy-policy path not in public allowlist

**Type:** Correction
**File:** `lib/auth/route-policy.ts`
**Issue:** The actual privacy page is at `/privacy`, but `/privacy-policy` (a common URL pattern) redirects to sign-in. Any external link using `/privacy-policy` is broken.
**Fix:** Add `/privacy-policy` to `PUBLIC_UNAUTHENTICATED_PATHS` and create a redirect from `/privacy-policy` to `/privacy`.
**Effort:** 10 minutes

### C-3. Em dash removal (104 violations, zero-tolerance rule)

**Type:** Correction
**Files:** 98 files across the codebase
**Issue:** Page metadata titles use `"Page Name — ChefFlow"` with em dashes. CLAUDE.md mandates zero em dashes anywhere.
**Fix:** Batch replace `—` with `|` in all page metadata `title` fields. Also fix:

- `components/beta-survey/beta-survey-banner.tsx:47` (rendered UI text)
- `app/opengraph-image.tsx:4` (OG meta tag)
- `components/automations/rule-builder.tsx` (4 instances in user-facing templates)
  **Effort:** 45 minutes (batch operation)

### C-4. Update test account credentials

**Type:** Correction
**Files:** `.auth/developer.json`, `.auth/agent.json`
**Issue:** Both stored passwords are invalid. Blocks all automated testing.
**Fix:** Developer to update `.auth/developer.json` with current password. Re-run `npm run agent:setup` for agent account.
**Effort:** 5 minutes (requires developer input)

---

## TIER 2: Performance Optimization

### P-1. Pricing page rendering optimization

**Type:** Modification
**File:** `app/(public)/pricing/page.tsx`
**Issue:** 11.3s load time. Renders 80+ feature definitions and a full comparison matrix at page render time.
**Fix:**

- Extract the feature comparison table into a lazy-loaded client component with `dynamic(() => import(...), { ssr: false })`
- Pre-compute feature groupings at build time or cache with `unstable_cache`
- Consider static generation (`generateStaticParams` + ISR) since pricing rarely changes
  **Effort:** 2 hours

### P-2. Terms page code splitting

**Type:** Modification
**File:** `app/(public)/terms/page.tsx`
**Issue:** 9.7s load time. 1,094 lines of dense JSX in a single component.
**Fix:**

- Split into section components (lazy-loaded below the fold)
- Use `Suspense` boundaries with skeleton fallbacks for below-fold sections
- Consider rendering from markdown source instead of raw JSX
  **Effort:** 1.5 hours

### P-3. Contact form server action optimization

**Type:** Modification
**Files:** `app/(public)/contact/page.tsx`, `lib/contact/actions.ts`
**Issue:** 15.1s load time. Server action chains 2-3 sequential Supabase operations.
**Fix:**

- Page load should be static (no server-side data fetching needed for a form)
- Parallelize Supabase operations in the submit action where possible
- Add loading state so users see immediate feedback
  **Effort:** 1 hour

### P-4. Partner signup async chain reduction

**Type:** Modification
**File:** `app/auth/partner-signup/page.tsx`
**Issue:** 29.3s load time. Multiple sequential async operations: server action, Supabase client init, auth sign-in, route navigation.
**Fix:**

- Defer non-critical operations (partner invite claim) to after page render
- Reduce Supabase round-trips by combining operations
- Add a loading skeleton while the Suspense boundary resolves
  **Effort:** 1.5 hours

### P-5. Health endpoint response time

**Type:** Modification
**File:** `app/api/health/route.ts`
**Issue:** 6.3s response time. Health endpoints should return in <500ms for monitoring tools.
**Fix:**

- Return a simple `{ status: "ok", timestamp }` without database checks
- Add a separate `/api/health/deep` endpoint for full system checks
- Cache the response for 10 seconds
  **Effort:** 30 minutes

### P-6. Google Fonts loading strategy

**Type:** Modification
**File:** `app/layout.tsx`
**Issue:** DM Sans and DM Serif Display loaded synchronously, blocking initial render across all pages.
**Fix:**

- Use Next.js `next/font/google` with `display: 'swap'` and `preload: true` (if not already)
- Verify fonts aren't render-blocking via `font-display: optional` for secondary font
  **Effort:** 30 minutes

---

## TIER 3: Missing Loading States

### L-1. Add loading.tsx to 46 chef portal routes

**Type:** Addition
**Issue:** 46 of 85 chef portal routes lack `loading.tsx` files, causing layout shifts during navigation.
**Priority routes** (most visited):

- `app/(chef)/expenses/loading.tsx`
- `app/(chef)/documents/loading.tsx`
- `app/(chef)/contracts/loading.tsx`
- `app/(chef)/daily/loading.tsx`
- `app/(chef)/briefing/loading.tsx`
- `app/(chef)/circles/loading.tsx`
- `app/(chef)/commerce/loading.tsx`
- `app/(chef)/community/loading.tsx`
- Plus 38 more
  **Fix:** Create consistent skeleton loading components. Use the existing loading patterns from `app/(chef)/dashboard/loading.tsx` as template.
  **Effort:** 3 hours (batch create with consistent pattern)

### L-2. Add loading.tsx to client portal routes

**Type:** Addition
**Issue:** 10 client portal routes missing loading states.
**Routes:** `my-cannabis/`, `my-chat/`, `my-hub/`, `my-inquiries/`, `my-profile/`, `my-quotes/`, `my-rewards/`, `my-spending/`, `survey/`, `book-now/`
**Effort:** 1 hour

---

## TIER 4: SEO Improvements

### SEO-1. Add metadata to pricing page

**Type:** Addition
**File:** `app/(public)/pricing/page.tsx`
**Issue:** No custom metadata export. Falls back to root layout generic description.
**Fix:** Add `export const metadata` with pricing-specific title, description, OG tags, and canonical URL.
**Effort:** 15 minutes

### SEO-2. Add metadata to contact page

**Type:** Modification
**File:** `app/(public)/contact/page.tsx`
**Issue:** Client component, no metadata export possible via standard export.
**Fix:** Convert to server component wrapper with metadata export, rendering a client-side form component.
**Effort:** 30 minutes

### SEO-3. Add metadata to blog index

**Type:** Addition
**File:** `app/(public)/blog/page.tsx`
**Issue:** No custom metadata. Blog index should have unique title/description for SEO.
**Effort:** 15 minutes

### SEO-4. Add FAQPage JSON-LD to /faq

**Type:** Addition
**File:** `app/(public)/faq/page.tsx`
**Issue:** FAQPage schema component exists but is not injected on the actual FAQ page. FAQ content renders as HTML `<details>` elements without structured data.
**Fix:** Import and render the FAQPage JSON-LD component alongside the existing FAQ rendering.
**Effort:** 20 minutes

### SEO-5. Add Product/Offer schema to pricing tiers

**Type:** Addition
**File:** `app/(public)/pricing/page.tsx`
**Issue:** SoftwareApplication schema has one generic offer. Three distinct pricing tiers (Free, Pro $29, Custom) should each have their own Offer markup for rich results.
**Effort:** 30 minutes

### SEO-6. Add canonical URLs to remaining pages

**Type:** Addition
**Issue:** Missing canonical URLs on `/contact`, `/blog` (index), `/chef/[slug]/inquire`.
**Effort:** 15 minutes

---

## TIER 5: Accessibility

### A-1. Color contrast verification

**Type:** Correction
**Issue:** `brand-600` (#B15C26, dark orange/brown) on `stone-900` (#1c1917, dark background) may fail WCAG AA 4.5:1 contrast ratio for normal text. Used extensively for links and interactive text.
**Fix:** Run automated contrast check. If failing, adjust `brand-600` to a lighter value or use `brand-500` (#EDA86B) for text on dark backgrounds.
**Effort:** 1 hour (audit + potential CSS variable adjustments)

### A-2. Heading hierarchy on public inquiry form

**Type:** Correction
**File:** `components/public/public-inquiry-form.tsx:409`
**Issue:** Uses `<h2>` ("Send inquiry") as the primary page heading. Should be `<h1>` when it's the main content heading.
**Effort:** 5 minutes

### A-3. Sign-in form custom validation messages

**Type:** Modification
**File:** `app/auth/signin/page.tsx`
**Issue:** Empty form submission shows browser-native tooltip. Breaks visual consistency with the branded dark theme.
**Fix:** Add custom client-side validation that displays styled inline error messages matching the app's design system.
**Effort:** 30 minutes

---

## TIER 6: Code Quality & Standards

### Q-1. Migrate startTransition calls to useServerAction hook

**Type:** Modification
**Issue:** 519 files use direct `startTransition` without consistent error handling. The project has a `useServerAction` hook (`lib/hooks/use-server-action.ts`) that properly handles try/catch, rollback, and user feedback. Adoption is inconsistent.
**Fix:** Prioritize migration in files that call server actions within `startTransition`. Pure state updates (no server calls) can remain as-is.
**Priority files:** Any component calling a server action inside `startTransition` without try/catch.
**Effort:** Ongoing (migrate 5-10 files per session)

### Q-2. Remove production console.log statements

**Type:** Correction
**Issue:** 105 `console.log` calls across 75 files. Acceptable in dev/monitoring code, but should be `console.info` or removed for production builds.
**Key files to clean:**

- `app/api/webhooks/stripe/route.ts` (35 instances, should be structured logging)
- `lib/ai/queue/worker.ts` (11 instances)
- `lib/follow-up/sequence-engine.ts` (5 instances)
  **Fix:** Replace with structured logging or `console.info`/`console.warn` as appropriate. Consider adding an ESLint rule `no-console` with exceptions for `warn` and `error`.
  **Effort:** 2 hours

### Q-3. Add `name` attributes to sign-up form fields

**Type:** Correction
**File:** `app/auth/signup/page.tsx`
**Issue:** Input fields lack `name` attributes, breaking browser autofill.
**Fix:** Add `name="email"`, `name="password"`, `name="businessName"`, `name="phone"` to respective inputs.
**Effort:** 10 minutes

### Q-4. Fix /api/nonexistent returning 200

**Type:** Correction
**Issue:** Non-existent API routes return 200 instead of 404. Makes debugging harder and violates REST conventions.
**Fix:** Check for catch-all API route or Next.js configuration. Add proper 404 handling for unmatched API routes.
**Effort:** 30 minutes

---

## TIER 7: Resilience & Monitoring

### R-1. Sentry structured error context

**Type:** Enhancement
**Issue:** Error boundaries report to Sentry but could benefit from more structured context (user role, tenant ID, page route).
**Fix:** Enrich Sentry scope with user metadata in error boundaries.
**Effort:** 1 hour

### R-2. Uptime monitoring for health endpoint

**Type:** Enhancement
**Issue:** Health endpoint takes 6.3s. External monitors with <5s timeout will report false downtimes.
**Fix:** After P-5 is done, configure uptime monitoring service (e.g., Vercel's built-in checks, or UptimeRobot) against the fast health endpoint.
**Effort:** 30 minutes

---

## TIER 8: Future Enhancements (non-blocking)

### F-1. Lazy-load below-fold sections on landing page

**Type:** Enhancement
**Issue:** Landing page loads in 948ms (good) but could be better with intersection observer-based lazy loading for sections below the initial viewport.
**Effort:** 1 hour

### F-2. Add OG images to pricing and contact pages

**Type:** Enhancement
**Issue:** These pages use the generic fallback OG image. Custom images would improve social sharing appearance.
**Effort:** 1 hour per page

### F-3. Service worker caching strategy review

**Type:** Enhancement
**Issue:** SW is registered but caching strategy for static assets and API responses could be optimized for offline-first PWA experience.
**Effort:** 3 hours

### F-4. Add rate limiting to public inquiry form

**Type:** Enhancement
**Issue:** Public inquiry form at `/chef/[slug]/inquire` should have rate limiting to prevent spam submissions.
**Effort:** 30 minutes

---

## Standards Going Forward

### Coding Standards (enforce on all new code)

1. **Every server action call must use `useServerAction` hook or equivalent try/catch + rollback + toast pattern.** No bare `startTransition` wrapping server actions.

2. **Every new page must have:**
   - `export const metadata` with unique title (no em dashes), description, and canonical URL
   - A `loading.tsx` sibling file with skeleton UI
   - An `error.tsx` in its route group (already covered for all groups)

3. **Every new API endpoint must:**
   - Return proper HTTP status codes (200, 201, 400, 401, 404, 500)
   - Use `verifyCronAuth()` for scheduled/cron endpoints (never inline auth checks)
   - Include rate limiting for public-facing endpoints

4. **Zero em dashes.** Use `|` for title separators, hyphens with spaces for inline breaks, or restructure the sentence.

5. **No `@ts-nocheck` on files with exports.** If types aren't ready, don't export. Mark as DEFERRED with a comment.

6. **No `console.log` in production paths.** Use `console.info` for operational messages, `console.warn` for non-critical issues, `console.error` for errors. Consider structured logging for API routes.

7. **Public routes must be explicitly registered** in `PUBLIC_UNAUTHENTICATED_PATHS` in `lib/auth/route-policy.ts`. If a page should be public, add it to the allowlist. Don't assume middleware will pass it through.

8. **Financial values from constants or queries only.** Never hardcode dollar amounts in JSX. Extract to `lib/billing/constants.ts` or fetch from database.

9. **All images must have `alt` attributes.** Decorative images use `alt=""`. Informational images describe the content.

10. **Forms must have `name` attributes on all inputs** for browser autofill compatibility.
