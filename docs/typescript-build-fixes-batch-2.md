# TypeScript Build Error Fixes and PWA Build Stabilization

## Overview

This document records all fixes applied to achieve a passing next build after the feature/packing-list-system branch accumulated a large number of new features. The build went from a complete crash to exit code 0 with 260/260 static pages generated.

---

## 1. PWA Package Swap: next-pwa to @ducanh2912/next-pwa

**Problem:** next-pwa@5.6.0 is a Pages Router-only package, incompatible with Next.js 14 App Router. It crashed the build worker silently, producing only ENOENT on pages-manifest.json.

**Fix:** Uninstalled next-pwa and installed @ducanh2912/next-pwa (v10.2.9). The next.config.js already had a try/catch loading the new package - it simply was not installed.

---

## 2. PWA Build ID Mismatch Fix (generateBuildId)

**Problem:** After installing @ducanh2912/next-pwa, builds succeeded through 260/260 pages but crashed at finalization with ENOENT on \_ssgManifest.js.

**Root cause:** The PWA wrapper runs a separate webpack pass that generates a different build ID from the main Next.js build. The two IDs produce different .next/static/<buildId>/ directories. When Next.js writes \_ssgManifest.js it uses the ID from the main build, but the directory was partially created by the PWA pass with a different ID.

**Fix:** Added generateBuildId to next.config.js:
generateBuildId: async () => "chefflow-build"

This pins a stable ID so both passes use the same .next/static/chefflow-build/ directory.

**File:** next.config.js

---

## 3. Stripe Webhook Route: Variable Name Error

**Problem:** app/api/webhooks/stripe/route.ts - Cannot find name supabase. Did you mean supabaseAdmin?

**Root cause:** handlePaymentSucceeded declared const supabaseAdmin but referenced it as supabase in 4 places.

**Fix:** Replaced all 4 occurrences with supabaseAdmin.

**File:** app/api/webhooks/stripe/route.ts

---

## 4. use server Export Violations

Next.js enforces that use server files may only export async functions. Exporting const objects or non-async values crashes the build worker.

### 4a. lib/vendors/actions.ts

Removed export const VENDOR_TYPE_LABELS. Already existed in lib/vendors/constants.ts.

### 4b. lib/events/fire-order.ts

Removed export from COURSE_COLORS, COURSE_ORDER, STATION_LABELS (all internal-only).

### 4c. lib/waste/actions.ts

Removed export from WASTE_REASONS and UNITS (internal-only).

### 4d. lib/chat/actions.ts

Removed export from getChatImageUrl (internal-only).

### 4e. lib/professional/actions.ts + new lib/professional/constants.ts

ACHIEVE_TYPE_LABELS and GOAL_CATEGORY_LABELS were used externally. Created lib/professional/constants.ts and updated both consumer pages to import from there.

### 4f. lib/auth/get-user.ts

Removed the use server directive. The file exports getCurrentUser = cache(async () => ...) which is a React cache wrapper, not a plain async function export.

---

## 5. cron_executions Table: Missing Type Definitions

**Problem:** Type "cron_executions" not assignable to keyof Database public Tables.

**Fix:** Cast supabase as any for the query. Added explicit any[] type for the result.

**File:** app/api/scheduled/monitor/route.ts

---

## 6. debrief-actions.ts: Two TypeScript Errors

### 6a. event.menus cast through unknown

event.menus is typed as Json | null. Direct cast to any[] triggers TS2352. Fixed by casting through unknown: ((event.menus as unknown) as any[])

### 6b. response.text getter accessor

Google Generative AI SDK exposes response.text as a getter, not a callable function. Fixed by using (response.text ?? "") as string directly.

**File:** lib/events/debrief-actions.ts

---

## 7. financial-summary-actions.ts: shopping_minutes Column

**Problem:** Property shopping_minutes does not exist. Column added via migration after types/database.ts was last regenerated.

**Fix:** Cast the events query: (supabase as any).from("events").select(...)

**File:** lib/events/financial-summary-actions.ts

---

## 8. pages/500.tsx and pages/\_app.tsx

**Problem:** Next.js 14 with a Pages Router present requires pages/500.tsx. Without it, the build attempts useDefaultStatic500 which renames export/500.html to server/pages/500.html - but the export directory is never created.

**Fix:** Created pages/500.tsx with getStaticProps and pages/\_app.tsx as a minimal wrapper.

---

## Final Build Result

- Exit code: 0
- Route (app): ~260 dynamic routes (server-rendered on demand)
- Route (pages): /\_app and /500 (SSG)
- First Load JS shared: 89.8 kB
- PWA service worker: public/sw.js, scope /

---

## Files Changed

| File                                                                 | Change                                                           |
| -------------------------------------------------------------------- | ---------------------------------------------------------------- |
| next.config.js                                                       | Added generateBuildId: async () => "chefflow-build"              |
| package.json                                                         | Replaced next-pwa with @ducanh2912/next-pwa                      |
| app/api/webhooks/stripe/route.ts                                     | Fixed supabase -> supabaseAdmin in handlePaymentSucceeded        |
| lib/vendors/actions.ts                                               | Removed export const VENDOR_TYPE_LABELS                          |
| lib/events/fire-order.ts                                             | Removed export from 3 constants                                  |
| lib/waste/actions.ts                                                 | Removed export from WASTE_REASONS and UNITS                      |
| lib/chat/actions.ts                                                  | Removed export from getChatImageUrl                              |
| lib/professional/actions.ts                                          | Removed export from ACHIEVE_TYPE_LABELS and GOAL_CATEGORY_LABELS |
| lib/professional/constants.ts                                        | CREATED - moved constants here                                   |
| app/(chef)/settings/professional/page.tsx                            | Updated import to use constants file                             |
| app/(chef)/settings/professional/professional-development-client.tsx | Updated import                                                   |
| lib/auth/get-user.ts                                                 | Removed use server directive                                     |
| app/api/scheduled/monitor/route.ts                                   | Cast cron_executions query as any                                |
| lib/events/debrief-actions.ts                                        | Fixed menus cast and response.text accessor                      |
| lib/events/financial-summary-actions.ts                              | Cast events query as any for shopping_minutes                    |
| pages/500.tsx                                                        | CREATED - static 500 error page                                  |
| pages/\_app.tsx                                                      | CREATED - minimal App wrapper                                    |
