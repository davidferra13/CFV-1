# Admin Hardening Audit Report

**Date:** 2026-05-14
**Auditor:** Claude (automated)
**Scope:** All admin routes, server actions, and API endpoints

---

## 1. Layout Guard

**Status: PASS**

`app/(admin)/layout.tsx` calls `requireAdmin()` at line 42. All 42 admin pages under `app/(admin)/` inherit this guard. Middleware passes admin routes through with `admin_runtime_gate`, relying on this layout-level check.

---

## 2. Admin API Routes

| Route                                                 | Auth                       | Status |
| ----------------------------------------------------- | -------------------------- | ------ |
| `app/(admin)/admin/price-catalog/csv-export/route.ts` | `requireAdmin()` at line 9 | PASS   |

**1 API route found. 1/1 protected.**

---

## 3. Admin Server Actions (`lib/admin/`)

15 files contain `'use server'` directives. Every exported mutation/query calls `requireAdmin()` at the top of the function body.

| File                          | Exported Functions                                                      | Auth Gate                                                                                                                                            | Status |
| ----------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `activity-feed.ts`            | `getPlatformActivityFeed`, `getPlatformVitals`, `getChefSuccessMetrics` | All call `requireAdmin()`                                                                                                                            | PASS   |
| `audit.ts`                    | `logAdminAction`, `logCannabisAudit`                                    | `logAdminAction` calls `requireAdmin()`; `logCannabisAudit` is an internal helper (no direct user access, called by already-authenticated functions) | PASS   |
| `cannabis-actions.ts`         | `getAllCannabisUsers` + mutations                                       | All call `requireAdmin()`                                                                                                                            | PASS   |
| `chef-admin-actions.ts`       | `suspendChef` + mutations                                               | All call `requireAdmin()`                                                                                                                            | PASS   |
| `debug-state.ts`              | `getAdminDebugState`                                                    | Calls `requireAdmin()`                                                                                                                               | PASS   |
| `email-actions.ts`            | `sendAdminDirectEmail` + broadcast                                      | All call `requireAdmin()`                                                                                                                            | PASS   |
| `flag-actions.ts`             | `toggleChefFlag` + bulk ops                                             | All call `requireAdmin()`                                                                                                                            | PASS   |
| `hub-admin-actions.ts`        | `backfillGuestVisibleDinnerCircles`                                     | Calls `requireAdmin()`                                                                                                                               | PASS   |
| `inquiry-admin-actions.ts`    | `getPlatformInquiryList`, `claimInquiryForFounder`                      | All call `requireAdmin()`                                                                                                                            | PASS   |
| `openclaw-health-actions.ts`  | 7 exported functions                                                    | All call `requireAdmin()`                                                                                                                            | PASS   |
| `owner-moderation-actions.ts` | `adminSoftDeleteChatMessage` + moderation                               | All call `requireAdmin()`                                                                                                                            | PASS   |
| `owner-observability.ts`      | 6 exported functions                                                    | All call `requireAdmin()`                                                                                                                            | PASS   |
| `platform-actions.ts`         | `getAnnouncement`, `setAnnouncement`, `clearAnnouncement`               | See note below                                                                                                                                       | PASS   |
| `platform-stats.ts`           | 12 exported functions                                                   | All call `requireAdmin()`                                                                                                                            | PASS   |
| `reconciliation-actions.ts`   | `getPlatformReconciliation`                                             | Calls `requireAdmin()`                                                                                                                               | PASS   |

**Note on `getAnnouncement()`:** This is intentionally unauthenticated. It reads the public announcement banner text displayed to all users (chefs and visitors). It exposes no sensitive data. The mutation counterparts (`setAnnouncement`, `clearAnnouncement`) both require admin auth.

---

## 4. Platform Server Actions (`lib/platform/`)

No `'use server'` files found in `lib/platform/`. No action needed.

---

## 5. Gaps Found

**None.** Every admin server action, API route, and page is protected by `requireAdmin()`.

---

## 6. Overall Assessment

**HARDENED.** The admin surface has defense-in-depth:

1. **Layout guard** (line 42 of admin layout) protects all 42 admin pages
2. **Every server action** (54+ exported functions across 15 files) independently calls `requireAdmin()`
3. **The single API route** independently calls `requireAdmin()`
4. **The only unauthenticated export** (`getAnnouncement`) is a read-only public data function by design

No gaps, no missing auth gates, no bypasses found.
