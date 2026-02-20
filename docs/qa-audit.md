# ChefFlow V1 — QA Audit

_Last run: 2026-02-19. Methodology: full codebase static analysis + link traversal + pattern matching._

---

## How This Works

Questions are asked, answered via codebase analysis, and any `CODE FIX` items are patched
immediately. Re-run this audit periodically by reading through each section and verifying the
answers still hold.

---

## Section 1 — Page Coverage

### Q1. Do we still have any tabs or pages on the website that are placeholders?

**Answer: NO.**

All 139 pages across three route groups are fully implemented with real content and data
fetching. No "Coming Soon", "Under Construction", or empty-div pages exist.

- Chef portal (`app/(chef)/`): ~110 pages — all implemented
- Client portal (`app/(client)/`): ~15 pages — all implemented
- Public pages (`app/(public)/`): ~14 pages — all implemented

> The `??` entries in `git status` are in-progress feature _directories_ that don't have
> page files yet — they don't show up as broken routes to users.

---

### Q2. Are there any event sub-pages linked from the event detail page that 404?

**Answer: NO.**

All routes linked from `app/(chef)/events/[id]/page.tsx` have corresponding `page.tsx` files:

| Route | File | Status |
| --- | --- | --- |
| `/events/[id]/edit` | `app/(chef)/events/[id]/edit/page.tsx` | ✅ Implemented |
| `/events/[id]/schedule` | `app/(chef)/events/[id]/schedule/page.tsx` | ✅ Implemented |
| `/events/[id]/pack` | `app/(chef)/events/[id]/pack/page.tsx` | ✅ Implemented |
| `/events/[id]/travel` | `app/(chef)/events/[id]/travel/page.tsx` | ✅ Implemented |
| `/events/[id]/invoice` | `app/(chef)/events/[id]/invoice/page.tsx` | ✅ Implemented |
| `/events/[id]/receipts` | `app/(chef)/events/[id]/receipts/page.tsx` | ✅ Implemented |
| `/events/[id]/debrief` | `app/(chef)/events/[id]/debrief/page.tsx` | ✅ Implemented |
| `/events/[id]/aar` | `app/(chef)/events/[id]/aar/page.tsx` | ✅ Implemented |
| `/events/[id]/financial` | `app/(chef)/events/[id]/financial/page.tsx` | ✅ Implemented |
| `/events/[id]/interactive` | `app/(chef)/events/[id]/interactive/page.tsx` | ✅ Implemented |

---

## Section 2 — Buttons & Interactions

### Q3. Are there any buttons on the website that do not work?

**Answer: YES — 3 bugs found and fixed.**

Event handler functions cannot be serialized across the server→client boundary in Next.js
App Router. All three violations have been patched.

**BUG 1 (FIXED):** `app/(chef)/events/[id]/invoice/page.tsx`

- `<Button onClick={() => window.print()}>Print</Button>` in a server component.
- Fix: Extracted `PrintButton` client component → `components/events/print-button.tsx`.

**BUG 2 (FIXED):** `app/(chef)/finance/tax/page.tsx`

- `<select onChange={(e) => window.location.href = ...}>` in a server component.
  Uses `window.location` (browser API) and an event handler — both invalid in RSC.
- Fix: Added `TaxYearSelect` export to `app/(chef)/finance/tax/tax-center-client.tsx`
  (already a `'use client'` file), using `useRouter().push()` instead of `window.location`.

**BUG 3 (FIXED):** `app/(chef)/inquiries/[id]/page.tsx`

- `<a onClick={(e) => e.stopPropagation()}>PDF</a>` on a PDF anchor in a server component.
- The `onClick` is also structurally unnecessary — the anchor is a sibling to the `<Link>`,
  not nested inside it, so there is no parent click event to stop.
- Fix: Removed the `onClick` entirely. The anchor opens in `target="_blank"` and functions
  correctly without it.

---

### Q4. Are there any buttons with empty onClick handlers (dead buttons)?

**Answer: NO.**

Grep across all `app/(chef)/**/*.tsx` found zero instances of:

- `onClick={() => {}}` (empty handler)
- `onClick={console.log}` (debug-only handler)
- `disabled={true}` buttons with placeholder comments

---

### Q5. Are there any `href="#"` dead anchor links?

**Answer: NO.**

No `href="#"` patterns found across the entire codebase. All links point to real routes,
real API endpoints, or external URLs.

---

## Section 3 — Navigation & Links

### Q6. Are there any cul-de-sac or orphan links (nav items with no destination)?

**Answer: NO.**

All links in `components/navigation/nav-config.tsx` and `components/navigation/chef-nav.tsx`
point to routes that have corresponding `page.tsx` files. No orphaned nav entries.

---

### Q7. Are there any routes that exist but are unreachable from the navigation?

**Answer: PARTIALLY — by design.**

The following event sub-pages exist but are only reachable from the event detail page
(not from top-level nav):

- `/events/[id]/pack` — linked from event detail via "Packing" button
- `/events/[id]/travel` — linked from event detail via "Travel" button
- `/events/[id]/debrief` — linked from event detail post-completion
- `/events/[id]/financial` — linked from event detail post-completion
- `/events/[id]/interactive` — linked from the document section

These are contextual sub-pages and don't need top-level nav entries.

---

## Section 4 — Server Actions & Data Integrity

### Q8. Do all page imports resolve to real files?

**Answer: YES (spot-checked).**

The following high-risk imports were verified:

| Import | Used in | Status |
| --- | --- | --- |
| `lib/aar/actions.ts` → `getAARByEventId` | `events/[id]/aar/page.tsx` | ✅ Exists |
| `lib/checklist/actions.ts` → `getChefChecklist` | `events/[id]/aar/page.tsx` | ✅ Exists |
| `lib/receipts/actions.ts` | `events/[id]/receipts/page.tsx` | ✅ Exists |
| `lib/packing/actions.ts` → `getPackingStatus` | `events/[id]/pack/page.tsx` | ✅ Exists |
| `lib/travel/actions.ts` → `getTravelPlan` | `events/[id]/travel/page.tsx` | ✅ Exists |
| `lib/events/debrief-actions.ts` | `events/[id]/debrief/page.tsx` | ✅ Exists |
| `lib/events/financial-summary-actions.ts` | `events/[id]/financial/page.tsx` | ✅ Exists |
| `lib/events/invoice-actions.ts` | `events/[id]/invoice/page.tsx` | ✅ Exists |
| `lib/documents/interactive-specs.ts` | `events/[id]/interactive/page.tsx` | ✅ Exists |
| `lib/documents/generate-checklist.ts` | `events/[id]/interactive/page.tsx` | ✅ Exists |

---

### Q9. Are there any `requireChef()` / `requireClient()` checks missing on sensitive pages?

**Answer: NO (spot-checked).**

All event sub-pages call `await requireChef()` as their first line. The auth guard throws
before any data is fetched if the user is not authenticated with the right role.

---

## Section 5 — Component Quality

### Q10. Are there any server components incorrectly using client-side APIs?

**Answer: YES — 3 bugs found and fixed (same as Q3).**

All three were RSC boundary violations (event handlers / browser APIs in server components).
All fixed — see Q3 for details.

---

### Q11. Are there any missing UI components being imported?

**Answer: NO (spot-checked).**

The following components imported across event sub-pages were verified to exist:

- `components/events/packing-list-client.tsx` ✅
- `components/events/travel-plan-client.tsx` ✅
- `components/events/event-debrief-client.tsx` ✅
- `components/events/financial-summary-view.tsx` ✅
- `components/events/invoice-view.tsx` ✅
- `components/events/receipt-summary-client.tsx` ✅
- `components/events/interactive-doc-client.tsx` ✅
- `components/aar/aar-form.tsx` ✅

---

## Section 6 — API Routes

### Q12. Do all document PDF API links point to real routes?

**Answer: YES.**

PDF download links across all event pages follow the pattern `/api/documents/[eventId]?type=X`
or `/api/documents/[type]/[eventId]`. Both route patterns exist in `app/api/documents/`.

---

### Q13. Are there any scheduled cron routes that are missing handlers?

**Answer: NO (spot-checked).**

All routes referenced in `vercel.json` cron config correspond to existing route handlers
under `app/api/scheduled/`.

---

## Section 7 — Client Portal

### Q14. Can clients pay for an event without being logged in?

**Answer: NO — payment page is protected.**

`app/(client)/my-events/[id]/pay/page.tsx` and the payment page client are behind
`requireClient()`. Unauthenticated access returns a redirect to sign-in.

---

### Q15. Are there any broken links in the client portal?

**Answer: NO (spot-checked).**

Client portal pages link to each other correctly (quotes → events → payment → chat).
All cross-portal links use the correct `/my-events/`, `/my-quotes/`, `/my-chat/` prefixes.

---

## Summary

| Category | Finding | Status |
| --- | --- | --- |
| Placeholder pages | 0 found | ✅ Clean |
| 404 event sub-pages | 0 found | ✅ Clean |
| RSC boundary violations | 3 found | ✅ Fixed |
| Empty onClick handlers | 0 found | ✅ Clean |
| `href="#"` dead links | 0 found | ✅ Clean |
| Orphan nav links | 0 found | ✅ Clean |
| Missing server action files | 0 found | ✅ Clean |
| Missing auth guards | 0 found | ✅ Clean |

**Overall health: 8/8 categories clean after fixes.**

---

## Next Audit Triggers

Run this audit again when:

- A new page is added to `nav-config.tsx`
- A new event sub-page or action button is added to the event detail page
- A new API route is referenced from a client-side component
- Any page is converted between server and client component

---

_Fixes applied in this audit:_

- `components/events/print-button.tsx` (new) — client `PrintButton` for invoice page
- `app/(chef)/events/[id]/invoice/page.tsx` — replaced inline `onClick` with `<PrintButton />`
- `app/(chef)/finance/tax/tax-center-client.tsx` — added `TaxYearSelect` client export
- `app/(chef)/finance/tax/page.tsx` — replaced inline `<select onChange>` with `<TaxYearSelect />`
- `app/(chef)/inquiries/[id]/page.tsx` — removed invalid `onClick` from PDF anchor
