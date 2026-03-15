# ChefFlow Comprehensive QA Report - 2026-03-15

**Test method:** Automated Playwright browser testing + codebase scanning
**Environment:** localhost:3100 (dev server, PC at max capacity)
**Auth note:** Developer credentials in `.auth/developer.json` are outdated (password changed). Agent test account credentials also invalid. Testing focused on public pages, API endpoints, and codebase patterns. Authenticated (chef portal) pages were not testable this session.

---

## CRITICAL FINDINGS (Fix Immediately)

### 1. `/about` page does not exist - redirects to sign-in

**Severity:** CRITICAL (public-facing, SEO impact)
**Root cause:** No `/about` route exists in `app/(public)/`. The middleware redirects unauthenticated users to sign-in for any path not in `PUBLIC_UNAUTHENTICATED_PATHS` in `lib/auth/route-policy.ts`.
**Impact:** Users clicking "About" in the nav hit the sign-in page. Broken user experience.
**Fix:** Either create `app/(public)/about/page.tsx` and add `/about` to `PUBLIC_UNAUTHENTICATED_PATHS`, or remove the "About" link from public navigation.

### 2. `/privacy-policy` URL redirects to sign-in (wrong path)

**Severity:** CRITICAL (legal compliance)
**Root cause:** The actual privacy page lives at `/privacy` (`app/(public)/privacy/page.tsx`), but `/privacy-policy` is not in the allowlist. If any links point to `/privacy-policy`, they hit auth redirect.
**Impact:** Users following a `/privacy-policy` link (common URL pattern) get sent to sign-in instead of seeing the privacy policy.
**Fix:** Add `/privacy-policy` to `PUBLIC_UNAUTHENTICATED_PATHS` and either create a redirect or alias page.

### 3. Cron endpoint security vulnerability (`/api/cron/morning-briefing`)

**Severity:** CRITICAL (security)
**Root cause:** Uses inline auth check instead of `verifyCronAuth()`. Logic flaw: `if (cronSecret && authHeader !== ...)` - if `CRON_SECRET` is not set, the endpoint allows unauthenticated access.
**Impact:** Anyone can trigger morning briefing emails to all chefs. In dev (where CRON_SECRET is likely unset), this endpoint is completely open.
**Fix:** Replace inline auth check with `verifyCronAuth()` from `lib/auth/cron-auth.ts`.

### 4. `lib/compliance/insurance-actions.ts` has `@ts-nocheck` with exported functions

**Severity:** CRITICAL (crash risk)
**Root cause:** File references tables/columns that don't exist yet. Has `@ts-nocheck` to suppress type errors but exports `async function` that other code could import and call.
**Impact:** Runtime crash if any code path calls these functions.
**Fix:** Remove exports or add deferred marker comment, like `lib/waste/actions.ts`.

---

## HIGH SEVERITY FINDINGS

### 5. 104 em dash violations across codebase

**Severity:** HIGH (brand credibility, CLAUDE.md zero-tolerance rule)
**Root cause:** 102 page metadata title tags use "X - ChefFlow" pattern with em dashes. 2 additional instances in rendered UI text.
**Key locations:**

- Public pages: Terms, Privacy, Reactivate, Gift Cards, Cannabis (11 instances)
- All chef portal page titles (88+ instances): Calendar, Events, Menu, Finance, etc.
- Beta survey banner: rendered em dash between title and description
- OG image meta tag: "ChefFlow - Ops for Artists"
  **Fix:** Batch replace all `—` in page metadata with `-` (hyphen with spaces) or `|`.

### 6. Extremely slow page loads under load

**Severity:** HIGH (user experience, especially on loaded PC)
**Measurements:**
| Page | Load Time | Notes |
|------|-----------|-------|
| Partner Sign Up | 29.3s | Multiple async chains (server action + Supabase init + auth) |
| Contact | 15.1s | Server action with 2-3 Supabase operations |
| Pricing | 11.3s | 80+ feature definitions rendered at page time |
| Terms | 9.7s | 1,094 lines of JSX, no code splitting |
| Chef Sign Up | 7.3s | |
| Client Sign Up | 8.2s | |
| Landing | 948ms | (baseline, acceptable) |
**Root causes:** Google Fonts blocking, PostHog init, large component trees, multiple Supabase round-trips.
**Note:** PC at max capacity amplifies these issues. Under normal load these may be acceptable, but they indicate optimization opportunities.

### 7. Embed inquiry form renders for invalid chef IDs

**Severity:** HIGH (UX issue)
**Current behavior:** `/embed/inquiry/invalid-uuid` loads and shows "This booking form is no longer available or the link is incorrect." This is actually GOOD error handling, but the page title still says "Book Private Chef - ChefFlow" which could be misleading.

---

## MEDIUM SEVERITY FINDINGS

### 8. Chef profile "david-ferrara" returns 404

**Severity:** MEDIUM
**Current behavior:** `/chef/david-ferrara` shows "Page not found - The page you're looking for doesn't exist." This could mean the developer's chef profile slug is different, or the profile is not set to public.
**Impact:** If this is the developer's business profile, potential clients can't find it.

### 9. Sign-in form validation is browser-native only

**Severity:** MEDIUM (UX polish)
**Current behavior:** Empty form submission shows browser tooltip "Please fill out this field." No custom styled validation messages.
**Impact:** Functional but looks unpolished. The orange/brown branded UI gets interrupted by a white browser tooltip.

### 10. `GET /api/nonexistent` returns 200 instead of 404

**Severity:** MEDIUM
**Root cause:** Likely a catch-all route or Next.js configuration that handles unknown API routes with a 200 response.
**Impact:** Makes debugging harder, masks routing errors.

### 11. `GET /api/health` takes 6.3 seconds

**Severity:** MEDIUM (monitoring)
**Impact:** Health check endpoints should return in <500ms. Uptime monitors may report false positives if the timeout is set low.

### 12. startTransition without error handling (519 files)

**Severity:** MEDIUM (Zero Hallucination Law 1)
**Root cause:** `useServerAction` hook exists with proper try/catch/rollback, but many files use direct `startTransition` without it.
**Impact:** If server actions fail, users may see stale/incorrect state without error feedback.
**Mitigation:** Gradual migration to `useServerAction` hook recommended.

---

## LOW SEVERITY FINDINGS

### 13. Mobile viewport navigation

**Testing:** Mobile landing page (375x812) renders correctly. Content is responsive and readable. Cookie banner present. Could not test hamburger menu interactions due to timeout.

### 14. Chef inquiry form for 404 chef still shows email input

**Location:** `/chef/david-ferrara/inquire` shows a "Chef Not Found" page but still has a visible email input field and a honeypot "website" field.
**Impact:** Minor confusion but not exploitable.

### 15. Sign-up form fields lack `name` attributes

**Impact:** Form autofill may not work properly. Minor UX issue.

### 16. `return { success: true }` pattern (180 files)

**Assessment:** Most are legitimate early returns (e.g., "no changes to save"). 2-3 deferred features in compliance/waste modules. Not currently a hallucination risk but worth periodic review.

---

## WHAT'S WORKING WELL

- **Landing page** loads fast (948ms), looks polished, responsive on mobile
- **Chef directory** loads fast (526ms), filter UI is clean and functional
- **Cookie consent banner** works correctly (shows, Accept dismisses it)
- **Sign-in/Sign-up pages** render correctly with proper branding
- **Embed widget JS** (`/embed/chefflow-widget.js`) loads correctly (8.7KB, self-contained)
- **404 handling** for non-existent chef profiles works correctly
- **Embed form error state** for invalid chef IDs handles gracefully
- **API endpoint responses** are consistent (proper status codes, JSON responses)
- **Most cron endpoints** (26/27) properly authenticated via `verifyCronAuth()`
- **Financial values** properly sourced from database queries (minimal hardcoding)
- **No true empty onClick handlers** found (all 137 matches are legitimate state updates)

---

## RECOMMENDED PRIORITY ORDER

1. Fix cron morning-briefing auth vulnerability (security, 5 min)
2. Fix insurance-actions.ts crash risk (remove exports, 2 min)
3. Add `/about` page or remove nav link (public-facing, 15 min)
4. Add `/privacy-policy` to public paths allowlist (legal, 2 min)
5. Batch-replace em dashes in page titles (credibility, 30 min)
6. Update `.auth/developer.json` with current password (testing, 1 min)
7. Investigate slow page loads under load (performance, ongoing)
8. Add health endpoint caching/optimization (monitoring, 15 min)
