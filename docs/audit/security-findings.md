# ChefFlow V1 Security Audit Findings

> **Date:** 2026-05-14
> **Scope:** Routes, server actions, API routes, tenant isolation, admin hardening, build safety
> **Audited:** 901 page routes, 1,192 server action files, 400 API routes, ~685 database tables

---

## Summary

| Severity    | Count | Status                          |
| ----------- | ----- | ------------------------------- |
| CRITICAL    | 3     | Unfixed (requires code changes) |
| HIGH        | 3     | Unfixed (requires code changes) |
| MEDIUM-HIGH | 1     | Unfixed (requires code changes) |
| MEDIUM      | 9     | Unfixed (requires code changes) |
| LOW         | 6+    | Documented                      |

**Overall posture: STRONG with targeted gaps.** 95%+ of the codebase follows consistent auth + tenant scoping patterns. The gaps are concentrated in a few files, not systemic.

---

## CRITICAL Findings

### C1: Unauthed theme mutations (privilege escalation + cross-tenant write)

**File:** `lib/themes/actions.ts`
**Functions:** `setEventShareTheme()`, `setGroupTheme()`
**Issue:** Zero auth. Accepts arbitrary IDs. Uses admin DB client. Anyone can change any event or group theme for any tenant.
**Impact:** Cross-tenant data mutation. Attacker can deface shared event pages.
**Fix:** Add `requireChef()` + tenant-scoped ownership check before write.

### C2: Unauthed survey creation and email sending

**File:** `lib/feedback/surveys-actions.ts`
**Functions:** `createPostEventSurvey()`, `sendSurveyEmail()`
**Issue:** No auth. Any caller can create surveys or trigger emails for any event.
**Impact:** Email abuse (send arbitrary emails via the platform), cross-tenant survey injection.
**Fix:** Add `requireChef()` + verify event belongs to tenant before creating survey or sending email.

### C3: Unauthed account location mutations

**File:** `lib/location/account-location.ts`
**Functions:** `getAccountLocation()`, `setAccountLocation()`, `updateAccountRadius()`
**Issue:** Accept an arbitrary `authUserId` parameter with no verification that caller owns that account.
**Impact:** Any authenticated user can read/write any other user's location data.
**Fix:** Derive `authUserId` from session (via `requireAuth()`) instead of accepting as parameter.

---

## HIGH Findings

### H1: Token-based client portal blocked by middleware

**File:** `app/client/[token]/*` (3 pages)
**Issue:** `/client` is not in `PUBLIC_UNAUTHENTICATED_PATHS`. Unauthenticated clients clicking email token links get redirected to signin instead of seeing their portal.
**Impact:** Broken user flow. Clients cannot access token-based portals without logging in first.
**Fix:** Add `/client` to `PUBLIC_UNAUTHENTICATED_PATHS` in `lib/auth/route-policy.ts`.

### H2: Intake token page blocked by middleware

**File:** `app/intake/[token]/page.tsx`
**Issue:** Page comments say "no auth required" but `/intake` is not in `PUBLIC_UNAUTHENTICATED_PATHS`. Middleware redirects unauthenticated visitors.
**Impact:** Broken public intake flow.
**Fix:** Add `/intake` to `PUBLIC_UNAUTHENTICATED_PATHS` in `lib/auth/route-policy.ts`.

### H3: Client onboarding inside requireClient() layout

**File:** `app/(client)/onboarding/[token]/page.tsx`
**Issue:** Inside `(client)` route group which calls `requireClient()`. New users clicking onboarding links must already be signed in as a client, defeating the purpose.
**Impact:** Broken onboarding flow for new clients.
**Fix:** Move to standalone or `(public)` route group with token-based access.

---

## MEDIUM-HIGH Findings

### MH1: Cross-tenant event write via review click tracking

**File:** `lib/reviews/actions.ts:225`
**Function:** `recordGoogleReviewClick()`
**Issue:** Updates ANY event's `review_link_sent` boolean without tenant/client scoping. A client can write to other tenants' events.
**Fix:** Add tenant scoping or client ownership verification before update.

---

## MEDIUM Findings

### M1: IDOR in action center digest

**File:** `lib/action-center/digest.ts`
**Issue:** Accepts optional `recipientId` parameter, allowing cross-tenant notification reads.
**Fix:** Ignore parameter, derive from session.

### M2: Unscoped recipe/menu queries in costing coverage

**File:** `lib/pricing/costing-coverage-actions.ts`
**Issue:** Queries recipes/menus by ID without tenant check.
**Fix:** Add `.eq('tenant_id', user.tenantId!)` to queries.

### M3: Missing tenant scoping in receipt actions

**File:** `lib/expenses/receipt-actions.ts`
**Issue:** `requireChef()` present but no visible tenant scoping in queries.
**Fix:** Add tenant filter to all queries.

### M4: Missing tenant scoping in user feedback actions

**File:** `lib/feedback/user-feedback-actions.ts`
**Issue:** Same pattern as M3.
**Fix:** Add tenant filter.

### M5: Unscoped prep timeline generation

**File:** `lib/events/prep-timeline-actions.ts:174`
**Function:** `generatePrepTimeline()`
**Issue:** Reads event menus, courses, and recipe details without tenant scoping. Leaks chef IP (recipe structure).
**Fix:** Add tenant scoping to all queries in the function.

### M6: Unscoped prep timeline item insertion

**File:** `lib/events/prep-timeline-actions.ts:92`
**Function:** `addPrepTimelineItem()`
**Issue:** Inserts prep items for any event ID without verifying ownership. Sibling functions correctly use `verifyEventAccess()`.
**Fix:** Add `verifyEventAccess()` call consistent with sibling functions.

### M7: Activity tracking trusts request body for tenant

**File:** `/api/activity/track` route
**Issue:** Writes activity records but derives tenant from request body instead of authenticated session.
**Fix:** Derive tenant from session, not request body.

### M8: Interactions endpoint allows anonymous actor

**File:** `/api/interactions` route
**Issue:** `executeInteractionAction` proceeds with anonymous actor when no user found. Middleware blocks today, but route code doesn't enforce.
**Fix:** Add explicit auth check at route level.

### M9: PIE batch pricing no auth check

**File:** `/api/pie/v1/price/batch`
**Issue:** Has rate limiting but no auth check. Middleware protects it currently.
**Fix:** Add explicit auth check for defense-in-depth.

---

## LOW Findings

- `/pie-cart` missing from `CHEF_PROTECTED_PATHS` (layout guard catches it)
- `/print/*` pages missing from `CHEF_PROTECTED_PATHS` (layout guard catches it)
- 6 public pages missing from `PUBLIC_UNAUTHENTICATED_PATHS` (`/catalog-pick`, `/cuisines`, `/discover`, `/menu-pick`, `/menu`, `/split`)
- `/api/pie/v1/health` returns operational metrics with no auth (unlike similar `/api/openclaw/health`)
- `requirePro()` is a no-op stub (business logic, not security)
- `getCurrentUser()` returns null for staff/partner roles (workaround exists via `requireStaff()`/`requirePartner()`)

---

## Structural Observations

### RLS is non-functional

- RLS policies are defined in Drizzle schema but the app connects as DB owner via direct postgres.js
- `createServerClient({ admin: true })` is a complete no-op
- All tenant isolation is purely application-layer `.eq('tenant_id', ...)` filters
- **Recommendation:** Either enable RLS with a non-owner connection role, or accept app-layer-only isolation and ensure 100% query coverage

### Admin routes are runtime-gated only

- Middleware passes `/admin` paths through with `admin_runtime_gate`
- Layout `requireAdmin()` at line 42 catches all 42 pages
- All 15 admin action files (54+ functions) call `requireAdmin()`
- **Status:** HARDENED. No gaps found.

### Dual query API

- Compat layer (PostgREST-style) and Drizzle ORM coexist
- Tenant isolation must be verified in both syntaxes
- Compat layer uses string-based column names without compile-time tenant enforcement

---

## Build Verification

| Check                                       | Result        |
| ------------------------------------------- | ------------- |
| `tsc --noEmit --skipLibCheck`               | PASS (exit 0) |
| `test:critical` (ledger, FSM, quotes, auth) | PASS (exit 0) |
| `test:unit:auth`                            | PASS (exit 0) |

---

## Deliverables Index

| File                                        | Phase                       |
| ------------------------------------------- | --------------------------- |
| `docs/audit/route-protection-matrix.md`     | Phase 1: Route protection   |
| `docs/audit/admin-hardening-report.md`      | Phase 2: Admin hardening    |
| `docs/audit/server-action-auth-matrix.md`   | Phase 3: Server action auth |
| `docs/audit/api-route-auth-matrix.md`       | Phase 4: API route auth     |
| `docs/audit/tenant-isolation-matrix.md`     | Phase 5: Tenant isolation   |
| `docs/audit/security-findings.md`           | This file (consolidated)    |
| `docs/codex-security-route-audit-prompt.md` | Original audit prompt       |
