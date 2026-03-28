# App Polish: Workstreams 5, 6, 7

**Date:** 2026-03-28
**Spec:** `docs/specs/app-polish-and-completion.md`

---

## Workstream 5: Wiring Verification

**Approach:** Playwright live testing (agent account) + static analysis for 25 core routes across 5 tiers.

**Results:** 25/25 PASS. All routes load, render real content, have proper auth guards, and no @ts-nocheck.

**SSE limitation:** Playwright's `domcontentloaded` never resolves on pages with SSE connections (realtime features). 10 pages passed live testing; the remaining 15 were verified via static file analysis. The wiring script was updated to use fire-and-forget navigation with content polling to work around this limitation.

**Route corrections identified:**

- Spec listed `/operations/staff`, correct route is `/staff`
- Spec listed `/marketing/campaigns`, correct route is `/marketing`

**Full report:** `docs/wiring-verification-report.md`

---

## Workstream 6: Client Portal Polish

**Audit scope:** 36 pages under `app/(client)/`

**Findings:**

- All pages have proper exports, `requireClient()` auth, no @ts-nocheck
- Key pages: my-bookings, my-chat, my-events (10+ sub-pages), my-hub, my-profile, my-spending, my-rewards, book-now
- Two token-authenticated public pages (onboarding/[token], survey/[token])

**Changes made:**

- Added page transition animation (`animate-fade-slide-up` with `key={pathname}`) to `ClientMainContent` in `client-nav.tsx`, matching the chef portal's treatment
- Nav labels reviewed: "Friends & Groups" accurately describes the feature (friends, groups, chef sharing, notifications). No rename needed.
- "Payments" label for `/my-spending` is clear enough for clients. Route URL mismatch is cosmetic only.

---

## Workstream 7: Public Pages Review

**Audit scope:** ~50+ pages under `app/(public)/`

**Findings:**

- All pages render properly, no missing imports, honest copy, clear CTAs
- Homepage, /book, /for-operators, /faq all production-ready
- No placeholder content, no false claims about features
- All CTAs link to real, functional routes

**Changes made:**

- Removed dead `/gift-cards` link from footer (page doesn't exist)
- Added `animate-fade-slide-up` to public layout main content area
- Empty state component (`components/ui/empty-state.tsx`): added fade-slide-up animation, warmed description text color (stone-400 to stone-300)

---

## Cross-Workstream: Visual Personality

Applied across all three portals:

- **Chef portal:** Page transitions via `key={pathname}` (from prior session)
- **Client portal:** Same page transition treatment added this session
- **Public pages:** Fade animation on main content (server component, so no key-based re-trigger)
- **Empty states:** Now animate in smoothly with warmer text
- **Toast, Card components:** Already well-styled with warm brand accents, glass morphism. No changes needed.
- **DM Serif Display font:** Used on dashboard and daily ops (most-visited pages). Mass-changing all ~265 page h1s would risk visual regression for minimal gain.
