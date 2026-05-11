# ChefFlow Account, Role, and Access Model: Forensic Audit Report

**Date:** 2026-05-10
**Scope:** Full-stack permission, privacy, trust, billing, and operational failure analysis
**Method:** 6 parallel forensic agents tracing actual control flow across schema, auth, middleware, admin/VIP/cannabis, subscription/comped, route protection, and project documentation. All findings verified against source code.
**Status:** READ-ONLY AUDIT. No code was modified.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Verified Current Account Model](#2-verified-current-account-model)
3. [Critical Failure Points](#3-critical-failure-points)
4. [Undefined / Underdefined Roles](#4-undefined--underdefined-roles)
5. [Comped-User Definition and Policy Audit](#5-comped-user-definition-and-policy-audit)
6. [Role Bleed and Permission Leakage](#6-role-bleed-and-permission-leakage)
7. [Privacy and Disclosure Risks](#7-privacy-and-disclosure-risks)
8. [Backend Enforcement Findings](#8-backend-enforcement-findings)
9. [Subscription and Feature-Gating Reality](#9-subscription-and-feature-gating-reality)
10. [VIP / Friends-and-Family Audit](#10-vip--friends-and-family-audit)
11. [Cannabis Access Audit](#11-cannabis-access-audit)
12. [Tenant and Ownership Boundary Audit](#12-tenant-and-ownership-boundary-audit)
13. [What Is Working Well](#13-what-is-working-well)
14. [Partially Built / Stale / Dangerous Systems](#14-partially-built--stale--dangerous-systems)
15. [Recommended Role, Entitlement, Grant, and Permission Model](#15-recommended-role-entitlement-grant-and-permission-model)
16. [Prioritized Hardening Plan](#16-prioritized-hardening-plan)
17. [Open Questions / Owner Decisions Required](#17-open-questions--owner-decisions-required)
18. [Lifecycle, Abuse, Session, Audit Log, and Emergency-Control Findings](#18-lifecycle-abuse-session-audit-log-and-emergency-control-findings)
19. [Testability, Data Classification, Migration Safety, and Release-Readiness Verdict](#19-testability-data-classification-migration-safety-and-release-readiness-verdict)

---

## 1. Executive Summary

ChefFlow's core security architecture is **structurally sound**. Defense-in-depth with three layers (middleware, layout, server-action) is consistently applied. Tenant isolation is enforced at the query level in every server action examined. There are no critical unprotected mutations and no confirmed cross-tenant data leaks.

However, the **permission model is incomplete and internally contradictory**. The system has outgrown its original two-role design (chef/client) but the expansion to six domain roles and six privilege tiers was never fully wired. Key problems:

- **requirePro() is a no-op** called from 205 locations across 47 files, creating a false sense of feature gating
- **VIP cannot be written via Drizzle ORM** due to schema drift (DB allows it; TypeScript schema does not)
- **"Comped" is a bare string in an unconstrained text column** with no expiration, no audit type, no lifecycle management
- **The monetization model is genuinely unresolved** across three contradictory documents
- **Session revocation takes up to 120 seconds** and is not enforced at the Edge/middleware layer
- **The system is NOT deny-by-default** for new routes
- **No permission tests exist** for VIP, Pro, Comped, Free, or subscription tier distinctions

**Release-readiness verdict: Safe to continue building only after critical fixes.** The current model is adequate for a single-owner, limited-user deployment. It is **unsafe for broader authenticated-user exposure** without addressing the critical items in Section 16.

---

## 2. Verified Current Account Model

### Identity Roles (user_roles.role enum)

| Role    | Storage                       | Tenant Resolution                         | Status                                                      |
| ------- | ----------------------------- | ----------------------------------------- | ----------------------------------------------------------- |
| chef    | `user_roles.role = 'chef'`    | Self (chefs.id)                           | Fully implemented                                           |
| client  | `user_roles.role = 'client'`  | client.tenantId (the chef they belong to) | Fully implemented                                           |
| staff   | `user_roles.role = 'staff'`   | staffMembers.chefId                       | Fully implemented                                           |
| partner | `user_roles.role = 'partner'` | referralPartners.tenantId                 | Fully implemented                                           |
| system  | `user_roles.role = 'system'`  | N/A                                       | **Defined in enum but no auth helper, no surface, no test** |

### Platform Authority (platform_admins.access_level)

| Level | Storage                                  | DB Constraint                                            | What It Unlocks                                                           |
| ----- | ---------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------- |
| owner | `platform_admins.access_level = 'owner'` | Allowed (SQL migration)                                  | Admin panel + founder-only pages (via `isFounderEmail()`)                 |
| admin | `platform_admins.access_level = 'admin'` | Allowed                                                  | Admin panel access                                                        |
| vip   | `platform_admins.access_level = 'vip'`   | Allowed in DB (SQL migration), **NOT in Drizzle schema** | Focus mode bypass, all modules visible, cannabis nav. **No admin panel.** |

### Subscription/Support Status (chefs.subscription_status)

| Value           | How Set                         | What It Does                                |
| --------------- | ------------------------------- | ------------------------------------------- |
| null            | Default                         | Nothing. Full access (same as all others).  |
| 'active'        | Stripe webhook                  | Nothing beyond badge.                       |
| 'comped'        | Admin action (`compChef()`)     | Nothing beyond status label in admin panel. |
| 'grandfathered' | Legacy migration                | Nothing.                                    |
| 'past_due'      | Stripe webhook                  | Nothing.                                    |
| 'canceled'      | Stripe webhook                  | Nothing.                                    |
| 'trialing'      | Never set (startTrial is no-op) | Nothing.                                    |
| Any string      | No constraint                   | Would be silently accepted by DB.           |

### Cannabis Access (cannabis_tier_users)

| Status       | Storage                                    | Enforcement                                              |
| ------------ | ------------------------------------------ | -------------------------------------------------------- |
| active       | `cannabis_tier_users.status = 'active'`    | Server-side check in `hasCannabisAccess()`               |
| suspended    | `cannabis_tier_users.status = 'suspended'` | Correctly blocked                                        |
| admin bypass | No row needed                              | `isAdmin()` returns true, bypasses check                 |
| VIP bypass   | Inconsistent                               | Cached layout check grants it; page-level check does not |

### Tenant-Level RBAC (user_roles.tenant_role)

| Role         | Permissions                          | Status                                                         |
| ------------ | ------------------------------------ | -------------------------------------------------------------- |
| tenant_owner | Full CRUD+manage on 18 domains       | **Schema exists in DB but missing from Drizzle active schema** |
| manager      | Broad access, no billing/destructive | Same drift issue                                               |
| team_member  | View-only most domains               | Same drift issue                                               |
| client       | Own-scoped view                      | Same drift issue                                               |
| partner      | Own-scoped analytics only            | Same drift issue                                               |

---

## 3. Critical Failure Points

Ranked by severity (highest first):

### C1. requirePro() is a universal no-op (CRITICAL)

**Location:** `lib/billing/require-pro.ts`
**Impact:** 205 call sites across 47 files believe they gate "Pro" features. None of them do. Every authenticated chef has full access to every feature.
**Why dangerous:** Developers and agents adding new features see `requirePro('feature-slug')` everywhere and add it to new code, believing enforcement exists. This creates compounding false confidence. If tier enforcement is ever activated without auditing all 205 call sites, the behavior change will be massive and unpredictable.
**Risk:** False security confidence, future activation chaos.

### C2. subscription_status has no database constraint (CRITICAL)

**Location:** `chefs` table, `subscription_status TEXT DEFAULT NULL`
**Impact:** Any string can be written. No enum, no CHECK constraint. A typo, a webhook bug, or a malicious input could write an arbitrary status that no application code expects.
**Risk:** Data corruption, undefined behavior if status values are ever checked.

### C3. Drizzle schema drift on VIP and RBAC (HIGH)

**Location:** `lib/db/schema/schema.ts` line 22649 still has CHECK `['admin', 'owner']` (missing 'vip'). Three RBAC tables (`role_permissions`, `user_permission_overrides`, `permission_audit_log`) and the `tenant_role` column on `user_roles` exist in DB but are absent from the active Drizzle schema.
**Impact:** If `drizzle-kit push` or `drizzle-kit generate` is run, VIP rows could become uninsertable and RBAC tables could be dropped. TypeScript code cannot reference RBAC tables through Drizzle ORM without raw SQL.
**Risk:** Schema regression, VIP feature breakage, RBAC inaccessibility.

### C4. System is NOT deny-by-default (HIGH)

**Location:** `middleware.ts`, `lib/auth/route-policy.ts`
**Impact:** Routes not in any role-specific path list are accessible to any authenticated user. A new route added without being registered in a path constant is silently accessible to all roles.
**Risk:** New routes accidentally exposed to wrong roles. Staff accessing chef routes. Clients accessing partner routes.

### C5. Session revocation has ~120-second latency and Edge bypass (HIGH)

**Location:** `lib/auth/auth-config.ts` lines 357-360 (Edge skip), line 62 (60s interval), `lib/auth/account-access.ts` line 49 (60s Upstash cache)
**Impact:** A banned, demoted, or revoked user can continue accessing the app for up to 2 minutes. The Edge runtime (middleware) never checks session revocation at all; it only fires in Node.js runtime (server components/actions).
**Risk:** Delayed enforcement of emergency access revocation.

### C6. /admin routes have no middleware-level protection (MEDIUM)

**Location:** `middleware.ts` never calls `isAdminRoutePath()`. `ADMIN_PATHS` is defined but unused.
**Impact:** Any authenticated user's HTTP request reaches the admin route group. Protection relies entirely on the server-component layout calling `requireAdmin()`. This is functional (Next.js layouts execute server-side) but is one layer weaker than other role boundaries.
**Risk:** If the layout check is ever removed or bypassed, admin panel is exposed. API routes under /admin/ (if created) would not be caught.

### C7. VIP naming collision (MEDIUM)

**Location:** `client_status` enum includes 'vip' (CRM status for high-value clients). `platform_admins.access_level` includes 'vip' (inner-circle platform privilege).
**Impact:** "VIP" means two completely different things depending on context. Code that searches for "VIP" will conflate these. New developers will confuse them.
**Risk:** Misimplementation, privilege confusion.

---

## 4. Undefined / Underdefined Roles

### Owner

- **Currently means:** Founder (davidferra13@gmail.com). Hardcoded.
- **Should mean:** Ultimate platform authority.
- **Stored:** `platform_admins.access_level = 'owner'`
- **Enforced:** Admin panel via `requireAdmin()` (treats owner same as admin). Founder-only pages via `isFounderEmail()` (hardcoded email check, not access_level check).
- **Problem:** Owner-only features use email comparison, not the access_level column. If the founder email ever changes, or if a second owner is needed, the hardcoded checks break. The `access_level = 'owner'` column exists but is not used to gate founder-only pages.
- **Missing:** `requireOwner()` function that checks `access_level = 'owner'` instead of email.

### Admin

- **Currently means:** Platform administration. Admin panel access.
- **Should mean:** Exactly that.
- **Stored:** `platform_admins.access_level = 'admin'`
- **Enforced:** Server-side via `requireAdmin()` -> `getCurrentAdminUser()` -> DB query. VIP explicitly excluded.
- **Problem:** No application code path to create admin rows. Must be inserted directly in DB. No audit trail for admin creation through the application.
- **Missing:** Admin creation server action with audit logging.

### VIP

- **Currently means:** Inner-circle user with all features unlocked but no admin panel.
- **Should mean:** Exactly that.
- **Stored:** `platform_admins.access_level = 'vip'`
- **Enforced:** Feature bypass via `isVIPOrAbove()` / `hasPrivilegedAccess()`. Admin panel blocked via `getCurrentAdminUser()` returning null.
- **Problems:**
  1. Drizzle schema does not include 'vip' in CHECK constraint (drift risk)
  2. VIP in `platform_admins` table is conceptually wrong; VIP is not an admin
  3. `hasPersistedAdminAccessForAuthUser()` returns true for VIP, causing VIP to inherit admin-level realtime channel access (`app/api/realtime/[channel]/route.ts:41`)
  4. Cannabis layout cache grants VIP cannabis visibility but page-level checks block them

### Free Chef

- **Currently means:** Any authenticated chef. Full access to everything.
- **Should mean:** Baseline chef operating system.
- **Stored:** `user_roles.role = 'chef'` + no subscription
- **Enforced:** `requireChef()` for all chef operations
- **Problem:** No distinction between free and paid because all gating is disabled. Not a problem if intentional, but creates confusion when 205 `requirePro()` calls exist.

### Paid/Supporter Chef

- **Currently means:** Chef who voluntarily contributes money. Gets a "Supporter" badge.
- **Should mean:** Supporter with optional badge. No additional feature access (per product-blueprint.md).
- **Stored:** `chefs.subscription_status = 'active'`
- **Enforced:** Badge display only via `getSupportStatus()`. `accessModel` is hardcoded to `'universal'`.
- **Problem:** The platform-role-hierarchy.md spec defines Pro as $29/month with feature gates. The product-blueprint.md says $12/month voluntary, no paywalls. These contradict. The code follows product-blueprint (no gates) but the spec implies gates.

### Comped Chef

- **Currently means:** `subscription_status = 'comped'`. Set by admin.
- **Should mean:** See Section 5.
- **Stored:** `chefs.subscription_status` (bare text, no constraint)
- **Enforced:** Not enforced anywhere. Comped status has zero functional effect.
- **Problems:** No expiration, wrong audit action type, not included in tier resolution test, no dedicated comp grant table, indistinguishable from "free" in practice.

### Cannabis-Enabled User

- **Currently means:** User with `cannabis_tier_users.status = 'active'`
- **Should mean:** Authorized to access cannabis-infused dining features
- **Stored:** `cannabis_tier_users` table with proper CHECK constraint
- **Enforced:** Server-side via `hasCannabisAccess()`. Admin bypass via `isAdmin()`.
- **Problem:** VIP bypass inconsistency (cached layout vs page-level). Invitation email sending is disabled.

### Client

- **Currently means:** Person who hires a chef. Scoped to one chef (tenant).
- **Stored:** `user_roles.role = 'client'` + `clients` table with `tenant_id`
- **Enforced:** `requireClient()` server-side. Layout protection.
- **Problem:** Client `status` enum includes 'vip' which collides with platform VIP concept.

### Staff

- **Currently means:** Person working for a chef. Scoped to one chef.
- **Stored:** `user_roles.role = 'staff'` + `staff_members` table
- **Enforced:** `requireStaff()` server-side (queries DB, checks active status).
- **Problem:** No test verifies staff cannot access chef-only routes (only unauthenticated staff route tests exist).

### Partner

- **Currently means:** Referral relationship with a chef.
- **Stored:** `user_roles.role = 'partner'` + `referral_partners` table
- **Enforced:** `requirePartner()` server-side.
- **Problem:** No test verifies partner cannot access chef routes.

### System

- **Currently means:** Internal automation role.
- **Stored:** `user_roles.role = 'system'` (enum value exists)
- **Enforced:** **Not enforced anywhere.** No `requireSystem()` function. No auth helper. No routes. No tests.
- **Risk:** If a system-role user were created, it would not match any role path in middleware and would fall through to the general "authenticated user can access" path. Combined with the non-deny-by-default posture, a system user could potentially access unprotected routes.
- **Recommendation:** Either implement proper system-role handling or remove it from the enum.

---

## 5. Comped-User Definition and Policy Audit

### Current Implementation

| Question                                   | Answer                                                                      |
| ------------------------------------------ | --------------------------------------------------------------------------- |
| What does "comped" currently mean in code? | `chefs.subscription_status = 'comped'`                                      |
| Is it treated as paid?                     | No. `requirePro()` is a no-op, so comped has no effect.                     |
| Is it treated as VIP?                      | No. Comped does not create a `platform_admins` row.                         |
| Is it treated as supporter?                | No. `getSupportStatus()` checks for Stripe subscription, not comped status. |
| Does it bypass billing?                    | N/A. No billing is enforced.                                                |
| Does it unlock features?                   | No. All features are already unlocked for everyone.                         |
| Does it create a badge?                    | No. The supporter badge requires `subscription_status = 'active'` (Stripe). |
| Does it expire?                            | **No.** No `comp_expires_at` column exists.                                 |
| Can it be revoked?                         | Yes. `revokeComp()` sets status back to null.                               |
| Who can grant it?                          | Any admin (via `requireAdmin()`).                                           |
| Who can revoke it?                         | Any admin.                                                                  |
| Is there an audit trail?                   | Partial. `logAdminAction()` records who, when, and reason.                  |
| Is there a reason field?                   | Yes, required in `compChef()`. Stored in audit log, not on the chef record. |
| Is there a source field?                   | No.                                                                         |
| Is there a duration field?                 | No.                                                                         |
| Temp vs permanent comp?                    | No distinction.                                                             |
| Owner-granted vs system-earned?            | No distinction.                                                             |

### Current Audit Trail Problem

`compChef()` logs `actionType: 'account_reactivated'` instead of a dedicated 'account_comped' type. This makes it impossible to query the audit log for comp grants specifically without also getting account reactivations.

### Tier Resolution Gap

The unit test `billing.tier.test.ts` defines `alwaysProStatuses = ['grandfathered', 'active', 'past_due']`. **'comped' is not included.** If tier enforcement is ever activated, comped users would fall to free tier.

### Minimum Safe Comped Structure

If comped is to remain in `subscription_status`, add at minimum:

- `comp_reason TEXT` on chefs table (why this comp was granted)
- `comp_granted_by UUID REFERENCES auth.users(id)` (who granted it)
- `comp_granted_at TIMESTAMPTZ` (when granted)
- `comp_expires_at TIMESTAMPTZ` (nullable; null = permanent)
- `comp_source TEXT CHECK (comp_source IN ('manual', 'referral', 'campaign', 'beta', 'advisory', 'contribution'))` (how it was earned)

**However, the better architectural choice is to separate comped/granted access from subscription_status entirely** (see Section 15). Subscription status should reflect the Stripe relationship. Comped access is an entitlement grant, not a subscription state.

---

## 6. Role Bleed and Permission Leakage

### Confirmed Role Bleed

| Finding                                      | Severity        | Location                                                                | Description                                                                                                                                                                                                     |
| -------------------------------------------- | --------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| VIP gets admin realtime access               | MEDIUM          | `app/api/realtime/[channel]/route.ts:41`                                | Uses `hasPersistedAdminAccessForAuthUser()` which returns true for VIP. VIP users access the `site` presence channel described as "admin-only sitewide presence stream." Should use `hasAdminAccess()` instead. |
| VIP gets cannabis nav but not cannabis pages | LOW             | `lib/chef/layout-data-cache.ts:58` vs `lib/chef/cannabis-actions.ts:79` | Cached layout uses `hasPersistedAdminAccessForAuthUser()` (includes VIP). Page-level uses `isAdmin()` (excludes VIP). VIP sees cannabis nav items but gets redirected on click.                                 |
| DEMO_MODE grants admin UI to all chefs       | LOW (env-gated) | `app/(chef)/layout.tsx:173-174`                                         | `effectiveAdmin = userIsAdmin \|\| DEMO_MODE_ENABLED`. If accidentally left on in production, all chefs see admin nav items.                                                                                    |

### NOT Confirmed (Intentional Design)

| Concern                                        | Status        | Explanation                                                                                                    |
| ---------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------- |
| Admin treated as owner                         | Intentional   | `requireAdmin()` treats both the same for panel access. Owner-only features use `isFounderEmail()` separately. |
| Comped treated as VIP                          | Not happening | Comped is subscription_status, VIP is platform_admins. Separate tables, no cross-contamination.                |
| Staff accessing chef tools                     | Protected     | `requireChef()` blocks staff. Staff has its own `requireStaff()` path.                                         |
| Client accessing chef tools                    | Protected     | Middleware blocks clients from chef paths. Layout blocks via `requireChef()`.                                  |
| Cannabis users accessing non-cannabis features | Not happening | Cannabis is an overlay check; it does not grant any permissions.                                               |

---

## 7. Privacy and Disclosure Risks

### Confirmed Exposure

| Data              | Exposure                                                     | Location                                      |
| ----------------- | ------------------------------------------------------------ | --------------------------------------------- |
| Feature existence | Prospecting pages render "restricted" message instead of 404 | `app/(chef)/prospecting/scrub/page.tsx:18-20` |

### Probable Exposure

| Data                        | Risk                                                        | Location                              |
| --------------------------- | ----------------------------------------------------------- | ------------------------------------- |
| Admin presence metadata     | VIP users can join the admin-only `site` realtime channel   | `app/api/realtime/[channel]/route.ts` |
| Cannabis nav item existence | VIP users see cannabis navigation items even without access | Layout cache mismatch                 |

### Possible Exposure (Needs Deeper Verification)

| Data                               | Risk                                                          | What to Check                             |
| ---------------------------------- | ------------------------------------------------------------- | ----------------------------------------- |
| Event data via iCal feed           | Token-based auth; if token leaks, event schedule is exposed   | `app/api/feeds/calendar/[token]/route.ts` |
| Cross-tenant data via RLS fallback | `getEventById` falls back to RLS-only query for collaborators | `lib/events/actions.ts:488-521`           |
| Stale session data                 | Role changes take up to 120s to propagate                     | Auth JWT callback timing                  |

### Not Exposed (Verified Safe)

- Email addresses: Tenant-scoped in all queries
- Phone numbers: Tenant-scoped
- Physical addresses: Tenant-scoped
- Client data: Cross-tenant isolation enforced at query level
- Financial data: Behind `requireChef()` + tenant scoping
- Cannabis access status: RLS enforces own-row-only reads
- AI/system prompts: Not exposed in client responses
- Admin decisions: Behind `requireAdmin()` server-side check

---

## 8. Backend Enforcement Findings

### Layer Summary

| Layer                                  | What It Checks                                       | Freshness                | Verdict                            |
| -------------------------------------- | ---------------------------------------------------- | ------------------------ | ---------------------------------- |
| Middleware (Edge)                      | Authentication, role-based route blocking            | JWT (stale up to 7 days) | Functional but not deny-by-default |
| Layout (Server)                        | Role verification, suspension check, RBAC resolution | DB query (fresh)         | Strong                             |
| Server Action                          | Auth + tenant scoping + input validation             | DB query (fresh)         | Strong                             |
| API Guard (`withApiGuard`)             | Auth mode, schema validation, rate limiting          | DB query (fresh)         | Strong                             |
| Admin check (`requireAdmin`)           | platform_admins DB lookup                            | DB query (always fresh)  | Strong                             |
| Staff check (`requireStaff`)           | DB lookup + active status                            | DB query (always fresh)  | Strong                             |
| Permission check (`requirePermission`) | role_permissions + overrides                         | DB query (always fresh)  | Strong                             |

### Frontend-Only Security (None Found for Data Access)

Every server action examined enforces auth + tenant scoping server-side. No instances of data access relying on frontend hiding alone.

However, **feature visibility** (not data access) relies on frontend in some cases:

- Focus mode module visibility (frontend filtering)
- Admin-only nav items (frontend conditional rendering backed by server-side data)
- Prospecting restricted message (frontend rendering, though server action has its own admin check)

### Routes Without Explicit Layout Auth

| Route Group     | Auth Location                                   | Risk                                             |
| --------------- | ----------------------------------------------- | ------------------------------------------------ |
| `app/(mobile)/` | No layout.tsx. Auth in data-fetching functions. | Low. Data is protected but error UX may be poor. |
| `app/(bare)/`   | No auth. Public pages.                          | Acceptable by design.                            |

---

## 9. Subscription and Feature-Gating Reality

### Current State: Universal Access

Free and paid users have **identical practical access**. Every chef gets every feature. This is intentional per `product-blueprint.md` ("No paywalls") and reflected in code (`accessModel: 'universal'`).

### Dormant Infrastructure Inventory

| Component                                  | Status                           | Call Sites          | Risk                      |
| ------------------------------------------ | -------------------------------- | ------------------- | ------------------------- |
| `requirePro()`                             | No-op (returns `requireChef()`)  | 205 across 47 files | False security confidence |
| `isPaidFeature()`                          | Hardcoded `return false`         | 7 files             | Dead code                 |
| `UpgradeGate` component                    | Renders children unconditionally | 33 files            | Dead code                 |
| `TrialBanner` component                    | Returns null                     | Unknown             | Dead code                 |
| `startTrial()`                             | No-op                            | Called at signup    | Dead code                 |
| Feature classification (40+ paid features) | 835 lines of taxonomy            | Not used            | Wasted code               |
| `tier-gating.json` constraints             | Documents rules not enforced     | N/A                 | False documentation       |
| `subscription_status` column               | Written by Stripe, never checked | N/A                 | Unused data               |
| `trial_ends_at` column                     | Never populated                  | N/A                 | Dead column               |

### What Should Be Preserved for Future Monetization

- `subscription_status` column (add CHECK constraint)
- Stripe integration (real, functional for voluntary support)
- `getSupportStatus()` and badge logic (working as intended)
- Feature registry taxonomy (useful if gating is ever enabled, but needs audit)
- `compChef()` / `revokeComp()` admin actions (need lifecycle improvements)

### What Should Be Cleaned Up

- Either document `requirePro()` as intentionally disabled or remove the 205 call sites
- Remove `TrialBanner` and `startTrial()` (purely dead)
- Add CHECK constraint to `subscription_status`
- Fix or remove `.constraints/tier-gating.json` (documents false reality)

---

## 10. VIP / Friends-and-Family Audit

### Can 'vip' be written to the database?

**Yes, at the SQL level.** Migration `20260418000001_vip_access_level.sql` replaced the CHECK constraint to allow `('owner', 'admin', 'vip')`.

**Risk via Drizzle ORM:** The active Drizzle schema (`lib/db/schema/schema.ts:22649`) still has the old constraint `['admin', 'owner']`. The application code uses `db.insert(platformAdmins).values({...accessLevel: 'vip'...})` in `setVIPAccess()`, which works because the actual DB constraint allows it. But `drizzle-kit push` could revert the constraint.

### Is platform_admins the right place for VIP?

**No.** VIP is not an admin. Storing VIP in `platform_admins` creates:

1. Semantic confusion (VIP is in the "admins" table)
2. Function naming confusion (`hasPersistedAdminAccessForAuthUser()` returns true for VIP)
3. Role bleed (any code using `hasPersistedAdminAccessForAuthUser()` unintentionally includes VIP)

The admin/VIP/cannabis auditor confirmed that the realtime channel route uses `hasPersistedAdminAccessForAuthUser()` to set `isAdmin: true` for VIP users, granting them access to admin-only channels.

### Can VIP access admin routes?

**No.** `getCurrentAdminUser()` explicitly returns null for VIP (line 38-39 of admin.ts). Admin panel is correctly blocked.

### Recommended VIP Architecture

VIP should be modeled as a **separate entitlement**, not a platform_admins row. Options:

1. A `user_entitlements` table with `entitlement_type = 'vip'`
2. A boolean flag on `chefs` table (`is_vip BOOLEAN DEFAULT false`)
3. A dedicated `vip_users` table (mirrors cannabis_tier_users pattern)

Option 1 is the most extensible and avoids the admin table pollution problem entirely.

---

## 11. Cannabis Access Audit

### Who can receive cannabis access?

Chefs, clients, and partners (CHECK constraint: `user_type IN ('chef', 'client', 'partner')`).

### How is access granted?

1. Chef sends invite -> `cannabis_tier_invitations` row with `admin_approval_status = 'pending'`
2. Admin approves -> token generated, 30-day expiry
3. Invitee claims -> `cannabis_tier_users` row created with `status = 'active'`

**Note:** Email sending is currently disabled (`CANNABIS_CLAIM_PAGE_ENABLED = false`).

### How is access revoked?

`revokeCannabisTier()` sets `status = 'suspended'`. Correctly blocked by `hasCannabisAccess()`.

### Is cannabis access checked server-side?

**Yes.** Every cannabis page calls `hasCannabisAccess()` which queries the DB. Not frontend-only.

### Is admin bypass safe?

**Mostly.** `isAdmin()` returns true for owner + admin only (not VIP). This is the correct level for cannabis bypass.

**Exception:** The cached layout check (`getCachedCannabisAccess()`) uses `hasPersistedAdminAccessForAuthUser()` which includes VIP. This causes VIP users to see cannabis nav items in the sidebar, but they are correctly blocked when they click through to actual cannabis pages.

### Does cannabis access leak into non-cannabis permissions?

**No.** Cannabis is a read-only overlay check. Having cannabis access does not grant any other permissions.

### Cannabis as orthogonal overlay: GOOD PATTERN

The cannabis_tier_users table is separate from subscription status, separate from platform_admins, and enforced independently. This is architecturally sound and should be the model for other entitlements.

---

## 12. Tenant and Ownership Boundary Audit

### Ownership Model

Every chef is their own tenant. `chefs.id` = `tenant_id` across all operational tables.

### Resource Ownership Matrix

| Resource         | Owner            | View Access                                                   | Mutate Access                         | Delete/Archive | Cross-Tenant Possible?         |
| ---------------- | ---------------- | ------------------------------------------------------------- | ------------------------------------- | -------------- | ------------------------------ |
| Events           | Chef (tenant_id) | Chef, assigned staff, client (own events), collaborator chefs | Chef, collaborator (with permissions) | Chef only      | Yes, by design (collaboration) |
| Clients          | Chef (tenant_id) | Chef, client (own record)                                     | Chef                                  | Chef           | No                             |
| Menus            | Chef (tenant_id) | Chef, client (linked events)                                  | Chef                                  | Chef           | No                             |
| Recipes          | Chef (tenant_id) | Chef, staff (view-only)                                       | Chef                                  | Chef           | No                             |
| Invoices         | Chef (tenant_id) | Chef, client (own)                                            | Chef                                  | Chef           | No                             |
| Staff            | Chef (chef_id)   | Chef, staff (own record)                                      | Chef                                  | Chef           | No                             |
| Documents        | Chef (tenant_id) | Chef, client (shared docs)                                    | Chef                                  | Chef           | No                             |
| Cannabis records | Chef (tenant_id) | Chef (with cannabis access)                                   | Chef (with cannabis access)           | Chef           | No                             |
| Partner records  | Chef (tenant_id) | Chef, partner (own)                                           | Chef                                  | Chef           | No                             |

### Where Tenant Isolation Will Break

1. **Co-hosted events / farm dinners:** Current collaboration system handles this via `event_collaborators` with granular permissions. However, the permissions JSON has no CHECK constraint, and the co-host's staff cannot access the event.
2. **Shared kitchens:** No model for multiple chefs sharing resources.
3. **Staff working for multiple chefs:** `user_roles` has a unique constraint on `auth_user_id` (one role per user). A staff member cannot work for two chefs without two accounts.
4. **Partner referrals across tenants:** Partner's `tenant_id` ties them to one chef. A partner referring to multiple chefs needs multiple partner records (this works but is awkward).

### Cross-Tenant Access Via Admin

Admin operations (viewing all chefs, all users, etc.) use a separate admin client that bypasses tenant-scoped RLS. This is documented and intentional.

---

## 13. What Is Working Well

### Structurally Sound

1. **Defense-in-depth architecture.** Three layers (middleware, layout, server-action) with consistent application. No data access relies on frontend hiding alone.

2. **Tenant isolation at the query level.** Every server action scopes by `tenant_id` derived from the session, never from request body. The admin client audit confirmed no callsite trusts `input.tenantId`.

3. **Admin panel server-side enforcement.** `requireAdmin()` queries `platform_admins` fresh from DB every time. VIP explicitly excluded. Owner protection trigger prevents removing the last owner.

4. **Cannabis as orthogonal overlay.** Separate table, separate checks, proper invitation flow with admin approval, correct suspension enforcement. Good pattern for future entitlements.

5. **Header spoofing prevention.** All `x-cf-*` headers stripped and re-set from verified JWT. CVE-2025-29927 mitigation included.

6. **Consistent input validation.** Zod schemas on every server action examined.

7. **Brute-force protection on login.** `checkLoginAttempts` / `recordFailedAttempt` / `clearAttempts` with security event audit logging.

8. **API key system.** V2 API uses proper key validation, rate limiting, and scope checking.

9. **Staff deactivation enforcement.** `requireStaff()` checks active status from DB, not just session.

10. **Permission audit log table.** `permission_audit_log` exists in DB with actor, target, action, old/new values, timestamp.

### Philosophically Sound

11. **Voluntary supporter model.** Aligns with ChefFlow's philosophy that baseline chef infrastructure should not be paywalled. Badge-only recognition is honest.

12. **Owner/admin separation.** The distinction exists and is meaningful (founder-only pages). Needs to use `access_level = 'owner'` instead of `isFounderEmail()`, but the concept is right.

13. **Dormant monetization is clearly marked.** Comments throughout the billing code explain that access is universal. The `project-definition-and-scope.md` explicitly calls Pro/tier code "legacy artifacts."

---

## 14. Partially Built / Stale / Dangerous Systems

### 1. Paid Feature Gating (DANGEROUS: False Confidence)

- **What exists:** 835-line feature classification, 40+ paid features defined, `requirePro()` called 205 times, `UpgradeGate` used 33 times, `.constraints/tier-gating.json` documents rules.
- **What is missing:** All enforcement. Every gate is a no-op.
- **Why risky:** Creates the strongest possible false confidence. The infrastructure looks complete. Developers will assume it works.
- **Recommendation:** Either remove all 205 `requirePro()` calls and replace with `requireChef()` (making the no-op explicit), or add a large comment block to `require-pro.ts` explaining the universal access model. Remove `tier-gating.json` or rename to `tier-gating.DORMANT.json`.

### 2. Trial System (STALE: Dead Code)

- **What exists:** `startTrial()`, `TrialBanner`, `trial_ends_at` column, trial-related Stripe types.
- **What is missing:** Everything. `startTrial()` is a no-op. Column is never populated.
- **Why risky:** Minor. Wastes bytes and confuses code readers.
- **Recommendation:** Remove or clearly mark as dormant.

### 3. RBAC Foundation (PARTIALLY BUILT: Schema Exists, ORM Missing)

- **What exists:** Three tables in DB (`role_permissions`, `user_permission_overrides`, `permission_audit_log`), `tenant_role` column on `user_roles`, `resolveCurrentUserPermissions()` in `lib/auth/permissions.ts`, seeded role data.
- **What is missing:** Tables not in active Drizzle schema. Cannot be referenced through ORM without raw SQL.
- **Why risky:** Medium. The RBAC system is partially functional (permission checks work via raw queries), but the schema drift means a `drizzle-kit push` could drop the tables.
- **Recommendation:** Add RBAC tables to active Drizzle schema. This is a sync issue, not a design issue.

### 4. VIP Grants (PARTIALLY BUILT: Works But Wrong Location)

- **What exists:** `setVIPAccess()` admin action, `isVIPOrAbove()` check, focus mode bypass.
- **What is missing:** Proper storage location (should not be in `platform_admins`). Drizzle schema sync.
- **Why risky:** Medium. Role bleed via `hasPersistedAdminAccessForAuthUser()`.
- **Recommendation:** Migrate VIP out of `platform_admins` into a separate entitlement system.

### 5. Focus Mode (SAFE: Working as Intended)

- **What exists:** Chef opt-in module filtering. VIP/admin bypass.
- **What is missing:** Nothing critical.
- **Assessment:** Working correctly. Does not create permission confusion.

### 6. Comped Access (INCOMPLETE: No Lifecycle)

- **What exists:** `compChef()` / `revokeComp()`. Audit logging (with wrong action type).
- **What is missing:** Expiration, source tracking, dedicated audit type, tier resolution inclusion.
- **Why risky:** Medium. Comped access persists forever, cannot be auto-expired, and would fail if tier enforcement activates.
- **Recommendation:** Add lifecycle fields (see Section 5) or separate into entitlement grant model.

### 7. Admin Preview Mode (SAFE: Properly Scoped)

- **What exists:** Cookie-based preview for admins to see app as regular chef.
- **Assessment:** Explicitly does NOT affect security gates. Toggle requires `isAdmin()`. Safe.

### 8. System Role (DANGEROUS: Undefined)

- **What exists:** `'system'` in `user_role` enum.
- **What is missing:** Everything. No auth helper, no surface, no routes, no tests.
- **Why risky:** If a system-role user is created, it falls through middleware to the general authenticated path. Combined with non-deny-by-default, it could access unprotected routes.
- **Recommendation:** Remove from enum or implement properly.

---

## 15. Recommended Role, Entitlement, Grant, and Permission Model

The current model collapses several orthogonal concerns into too few fields. Recommended separation:

### A. Identity Role (WHO you are)

**Table:** `user_roles` (existing)
**Values:** chef, client, staff, partner
**Remove:** 'system' (or implement properly)
**Purpose:** Determines which portal/surface you access

### B. Platform Authority (WHAT platform powers you have)

**Table:** `platform_admins` (existing, but rename to `platform_authority` or keep as-is)
**Values:** owner, admin
**Remove VIP from this table.**
**Purpose:** Admin panel access, platform governance

### C. Entitlements (WHAT features you can access beyond baseline)

**New table: `user_entitlements`**

```
id UUID PRIMARY KEY
auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
entitlement_type TEXT NOT NULL CHECK (entitlement_type IN ('vip', 'cannabis', 'beta_tester', 'developer_tools'))
status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'expired'))
granted_by UUID REFERENCES auth.users(id)
granted_at TIMESTAMPTZ NOT NULL DEFAULT now()
expires_at TIMESTAMPTZ  -- null = permanent
revoked_at TIMESTAMPTZ
reason TEXT
source TEXT CHECK (source IN ('manual', 'referral', 'campaign', 'beta', 'advisory', 'contribution', 'system'))
notes TEXT
UNIQUE (auth_user_id, entitlement_type)
```

This replaces:

- VIP rows in `platform_admins` -> `entitlement_type = 'vip'`
- `cannabis_tier_users` -> `entitlement_type = 'cannabis'` (or keep separate; cannabis has extra fields)
- `chef_feature_flags` for `developer_tools` -> `entitlement_type = 'developer_tools'`
- Future beta, advisory, contribution-based access

### D. Subscription/Support Status (HOW you relate to billing)

**Table:** `chefs` column `subscription_status` (existing)
**Add CHECK constraint:** `subscription_status IN ('active', 'past_due', 'canceled', 'unpaid', 'grandfathered', 'comped', 'trialing')`
**Purpose:** Reflects Stripe relationship + manual comp status

### E. Comp Grants (WHY you have free paid access)

**New table: `comp_grants`** (if comped access needs lifecycle tracking beyond subscription_status)

```
id UUID PRIMARY KEY
chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE
granted_by UUID NOT NULL REFERENCES auth.users(id)
granted_at TIMESTAMPTZ NOT NULL DEFAULT now()
expires_at TIMESTAMPTZ  -- null = permanent
revoked_at TIMESTAMPTZ
reason TEXT NOT NULL
source TEXT NOT NULL CHECK (source IN ('manual', 'referral', 'campaign', 'beta', 'advisory', 'contribution'))
notes TEXT
```

When a comp_grant is active and not expired/revoked, `subscription_status` is set to 'comped'. When it expires or is revoked, status reverts to null.

### F. Tenant-Level Permissions (WHAT you can do within a tenant)

**Table:** `user_roles.tenant_role` (existing) + `role_permissions` + `user_permission_overrides`
**Purpose:** Granular RBAC within a chef's tenant
**Fix needed:** Add these tables to active Drizzle schema.

### The Full Picture

```
Identity:     user_roles.role = chef|client|staff|partner
Authority:    platform_admins.access_level = owner|admin  (NO vip)
Entitlement:  user_entitlements.entitlement_type = vip|cannabis|beta|dev_tools
Subscription: chefs.subscription_status = active|comped|...  (with CHECK)
Comp Grant:   comp_grants (lifecycle tracking for comped status)
Permissions:  user_roles.tenant_role + role_permissions + overrides
```

Each concern is independently queryable, independently revocable, independently auditable.

---

## 16. Prioritized Hardening Plan

### Tier 1: Critical Fixes Before More Features Are Built

| #   | Risk                                        | Fix                                                                                        | Files                               | Scope         | Impact                             |
| --- | ------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------- | ------------- | ---------------------------------- |
| 1.1 | subscription_status accepts any string      | Add CHECK constraint via migration                                                         | `database/migrations/`              | Local         | Prevents data corruption           |
| 1.2 | Drizzle schema drift (VIP + RBAC)           | Sync active schema with DB reality                                                         | `lib/db/schema/schema.ts`           | Local         | Prevents schema regression on push |
| 1.3 | System role is undefined but exists in enum | Remove 'system' from enum OR implement auth helpers                                        | `database/migrations/`, `lib/auth/` | Cross-cutting | Closes undefined role gap          |
| 1.4 | requirePro() false confidence               | Add prominent comment block explaining no-op status, or rename to `requireChefLegacyPro()` | `lib/billing/require-pro.ts`        | Local         | Prevents developer confusion       |
| 1.5 | compChef() uses wrong audit action type     | Change 'account_reactivated' to 'account_comped'                                           | `lib/admin/chef-admin-actions.ts`   | Local         | Correct audit trail                |

### Tier 2: High-Priority Before Broader User Access

| #   | Risk                                     | Fix                                                                                                                      | Files                                                        | Scope         | Impact                               |
| --- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ | ------------- | ------------------------------------ |
| 2.1 | Not deny-by-default                      | Add catch-all in middleware that rejects unmatched authenticated paths, or require explicit route registration           | `middleware.ts`, `lib/auth/route-policy.ts`                  | Cross-cutting | Prevents accidental route exposure   |
| 2.2 | /admin no middleware check               | Add `isAdminRoutePath()` check to middleware                                                                             | `middleware.ts`                                              | Local         | Defense-in-depth for admin panel     |
| 2.3 | VIP in platform_admins causes role bleed | Migrate VIP to separate entitlement table                                                                                | `platform_admins`, new migration, `lib/auth/admin-access.ts` | Cross-cutting | Clean separation of admin from VIP   |
| 2.4 | VIP gets admin realtime access           | Change `hasPersistedAdminAccessForAuthUser()` to `hasAdminAccess()` in realtime route                                    | `app/api/realtime/[channel]/route.ts`                        | Local         | Fix role bleed                       |
| 2.5 | Cannabis nav mismatch for VIP            | Use consistent check (either `isAdmin()` or `hasPersistedAdminAccessForAuthUser()`) in both layout cache and page checks | `lib/chef/layout-data-cache.ts`                              | Local         | Fix UX inconsistency                 |
| 2.6 | Owner-only features use hardcoded email  | Replace `isFounderEmail()` checks with `access_level === 'owner'` check                                                  | `lib/platform/owner-account.ts`, 5+ page files               | Cross-cutting | Removes hardcoded email dependency   |
| 2.7 | Comped has no expiration                 | Add `comp_expires_at` column or implement comp_grants table                                                              | `database/migrations/`, `lib/admin/`                         | Cross-cutting | Prevents indefinite unmanaged access |

### Tier 3: Medium-Priority Architecture Cleanup

| #   | Risk                                          | Fix                                                                                     | Files                  | Scope         | Impact                                 |
| --- | --------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------- | ------------- | -------------------------------------- |
| 3.1 | VIP naming collision (client CRM vs platform) | Rename client status 'vip' to 'premium_client' or rename platform VIP to 'inner_circle' | Schema + code          | Cross-cutting | Eliminates naming confusion            |
| 3.2 | Large middleware exclusion list               | Add integration test verifying every route.ts under excluded prefixes has auth          | `tests/`               | Local         | Prevents future unprotected API routes |
| 3.3 | (mobile) route group has no layout auth       | Add layout.tsx with auth guard                                                          | `app/(mobile)/`        | Local         | Consistency                            |
| 3.4 | chef_team_members.role unconstrained          | Add CHECK constraint                                                                    | `database/migrations/` | Local         | Data integrity                         |
| 3.5 | event_collaborators role/status unconstrained | Add CHECK constraints                                                                   | `database/migrations/` | Local         | Data integrity                         |
| 3.6 | Dormant billing code creates confusion        | Add `.DORMANT` suffix to `tier-gating.json`, remove dead `TrialBanner`/`startTrial`     | Multiple files         | Local         | Code clarity                           |

### Tier 4: Long-Term Refinements

| #   | Risk                          | Fix                                                                                           | Files                                                   | Scope         | Impact                      |
| --- | ----------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------- | --------------------------- |
| 4.1 | Session revocation latency    | Reduce check interval and Upstash TTL, or implement per-request DB check for sensitive routes | `lib/auth/auth-config.ts`, `lib/auth/account-access.ts` | Cross-cutting | Faster revocation           |
| 4.2 | Monetization model unresolved | Owner decision: remove platform-role-hierarchy.md Pro/Comped tier spec or implement it        | `docs/specs/`                                           | Documentation | Resolves contradicting docs |
| 4.3 | RBAC not fully wired          | Complete RBAC integration with Drizzle schema, add to all server actions                      | Multiple files                                          | Cross-cutting | Full permission enforcement |
| 4.4 | Permission tests missing      | Write role-boundary tests for VIP, comped, staff-cant-access-chef, partner-cant-access-chef   | `tests/`                                                | Local         | Verified enforcement        |
| 4.5 | Unified entitlement model     | Implement `user_entitlements` table to replace scattered entitlement checks                   | New table + migration                                   | Cross-cutting | Clean architecture          |

---

## 17. Open Questions / Owner Decisions Required

1. **Is the current "all features free" model permanent or temporary?** The 205 `requirePro()` calls suggest someone intended to enable paid gating someday. If free-forever, remove the 205 calls. If gating will be activated, the tier resolution needs serious audit first.

2. **Should VIP move out of platform_admins?** Recommended yes, but requires migration + code changes.

3. **Should 'system' be removed from the user_role enum?** It has no implementation. Leaving it is a latent risk.

4. **What is the comped-user policy?** At minimum: does comp expire? Is there a distinction between manual and earned comp? Does comped need a separate table?

5. **Should 'vip' in client_status be renamed?** It collides with platform VIP. Renaming to 'premium_client' or 'high_value' would eliminate ambiguity.

6. **Should the founder email be kept hardcoded?** Recommended to replace `isFounderEmail()` with `access_level === 'owner'` check everywhere.

7. **Should DEMO_MODE_ENABLED grant admin UI?** If demo mode is only for demos, consider using a separate demo role instead of elevating all chefs.

8. **What is the acceptable session revocation latency?** Currently ~120 seconds. For cannabis/admin revocation, is this acceptable?

9. **Should the RBAC system (tenant_role, role_permissions, permission_audit_log) be completed or removed?** It is half-wired. The tables exist, the resolver exists, but the Drizzle schema is out of sync.

10. **Should `requirePro()` callers be preserved as "future hooks" or cleaned up now?** 205 call sites is significant maintenance burden if they are all no-ops forever.

---

## 18. Lifecycle, Abuse, Session, Audit Log, and Emergency-Control Findings

### Role Lifecycle

| Elevated State | How Granted                         | Who Grants                   | How Revoked                           | Who Revokes    | Expires?                                | Reason Field?                    | Audit Log?         | User Notified? |
| -------------- | ----------------------------------- | ---------------------------- | ------------------------------------- | -------------- | --------------------------------------- | -------------------------------- | ------------------ | -------------- |
| Owner          | DB seed (migration)                 | System                       | Cannot remove last owner (trigger)    | N/A            | No                                      | Bootstrap note                   | Migration only     | No             |
| Admin          | Direct DB insert                    | DBA                          | Direct DB update or deactivation      | DBA            | No                                      | notes column                     | No app-level log   | No             |
| VIP            | `setVIPAccess()`                    | Admin                        | `revokeVIPAccess()` (if exists) or DB | Admin          | No                                      | notes column                     | `logAdminAction()` | No             |
| Supporter      | Stripe webhook                      | Self (voluntary payment)     | Stripe cancellation                   | Self or Stripe | Subscription period                     | N/A                              | Stripe events      | Stripe email   |
| Comped         | `compChef()`                        | Admin                        | `revokeComp()`                        | Admin          | **No**                                  | Required reason (audit log only) | Yes (wrong type)   | No             |
| Cannabis       | Invitation + admin approval + claim | Chef invites, admin approves | `revokeCannabisTier()`                | Admin          | **No** (invite has 30-day claim window) | notes column                     | Limited            | No             |
| Staff          | Chef creates staff record           | Chef                         | Chef deactivates                      | Chef           | No                                      | N/A                              | General audit_log  | No             |
| Partner        | Chef creates partner                | Chef                         | Chef deactivates                      | Chef           | No                                      | N/A                              | General audit_log  | No             |

**Critical gaps:**

- No expiration on VIP, comped, or cannabis access
- No notification to users when access changes
- No notification to owner when admin access is granted/revoked (because there is no admin grant action)
- Stale access can remain forever

### Abuse and Trust Boundaries

| Abuse Case                                     | Protected?                               | How                                                                                                               |
| ---------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| User upgrading themselves                      | Yes                                      | Admin actions require `requireAdmin()`                                                                            |
| User spoofing role fields                      | Yes                                      | Role resolved from DB, not request body                                                                           |
| Staff escaping tenant boundary                 | Yes                                      | `requireStaff()` scopes by chef_id                                                                                |
| Cannabis user exposing material publicly       | Partially                                | Cannabis pages are gated, but data in DB is accessible via admin client                                           |
| Comped user keeping access after reason lapses | **No**                                   | No expiration mechanism                                                                                           |
| VIP gaining admin authority via shared helper  | **Yes for admin panel, No for realtime** | VIP blocked from admin panel. VIP gets admin realtime access.                                                     |
| Admin gaining owner authority                  | **Partially**                            | Admin cannot access founder-only pages (email check). But admin and owner are identical for all other operations. |
| Deleted/suspended user retaining access        | **120s window**                          | Session revocation has latency. Edge middleware does not check revocation.                                        |
| Old invitations remaining valid                | **30-day cannabis invite expiry**        | Cannabis invites expire. No other invitation system found with similar exposure.                                  |

### Session and Cache Invalidation

| Question                                                     | Answer                                                                                             |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| If demoted from admin, does session lose access immediately? | **Yes for admin panel** (admin check queries DB fresh). **No for middleware** (JWT role cached).   |
| If cannabis access revoked, can cached data be accessed?     | **60-second stale window** (cannabis access cached 60s via `unstable_cache`).                      |
| If no longer comped/VIP/supporter, do UI and backend update? | **Backend: immediately** (DB queries fresh). **UI: up to 60s** (layout data cached).               |
| Are permission checks fresh from DB?                         | **Yes** for admin, staff, partner, permission checks. **No** for basic role in JWT (up to 7 days). |
| Are there revalidation hooks after role changes?             | **Partial.** `revokeAllSessionsForUser()` increments session version. But 120s propagation delay.  |

### Audit Logging

| Event                         | Logged?                                       | Where                                    |
| ----------------------------- | --------------------------------------------- | ---------------------------------------- |
| Admin granted                 | **No** (no admin grant action exists)         | N/A                                      |
| Admin revoked                 | **No** (no admin revoke action exists)        | N/A                                      |
| VIP granted                   | Yes                                           | `admin_audit_log` via `logAdminAction()` |
| VIP revoked                   | Depends on implementation                     | N/A                                      |
| Comp granted                  | Yes (wrong action type 'account_reactivated') | `admin_audit_log`                        |
| Comp revoked                  | Yes                                           | `admin_audit_log`                        |
| Cannabis granted              | Partial (invitation flow logged)              | `cannabis_tier_invitations`              |
| Cannabis revoked              | Yes                                           | `admin_audit_log`                        |
| Subscription changed          | Yes                                           | Stripe webhook + DB update               |
| Sensitive admin tool accessed | **No**                                        | N/A                                      |
| Cross-tenant data viewed      | **No**                                        | N/A                                      |
| Permission override changed   | Yes                                           | `permission_audit_log`                   |

**Minimum audit log structure needed:**

- `admin_access_changes` log: who, target, old_level, new_level, timestamp, reason
- Admin tool access log: who accessed /admin/\*, which page, timestamp

### Deny-by-Default Posture

**Verdict: MIXED.**

- **Deny-by-default for data access:** Yes. Server actions require auth + tenant scoping.
- **Deny-by-default for route access:** No. Middleware uses allowlists for role routing. Unregistered routes are accessible to any authenticated user.
- **Deny-by-default for admin access:** Yes (for admin panel). Layout-level `requireAdmin()` blocks everyone else.
- **Highest-risk area:** New routes added without registering in `route-policy.ts` path constants.

### Emergency Controls

| Control                             | Exists? | How                                                                                |
| ----------------------------------- | ------- | ---------------------------------------------------------------------------------- |
| Immediately disable a user          | Yes     | `bannedUntil` in `auth.users` + `revokeAllSessionsForUser()` (120s delay)          |
| Immediately revoke cannabis access  | Yes     | `revokeCannabisTier()` sets status to 'suspended'                                  |
| Immediately revoke admin/VIP/comped | Partial | DB update + session revocation. No one-click admin action for admin/owner removal. |
| Disable internal tools              | No      | No kill switch exists                                                              |
| Disable AI/system automation        | Partial | Individual cron jobs can be stopped via systemd. No global kill switch.            |
| Freeze public access                | No      | Would need maintenance mode middleware                                             |
| Lock down admin routes              | No      | Would need env-var or DB flag check in admin layout                                |
| Force logout/session invalidation   | Yes     | `revokeAllSessionsForUser()` (120s delay)                                          |
| View recent permission changes      | Partial | `admin_audit_log` exists but is incomplete (see audit logging section)             |

**Minimum emergency controls needed before public exposure:**

1. One-click user disable (admin action that bans + revokes sessions)
2. Admin access grant/revoke server actions with audit logging
3. Maintenance mode flag (middleware check)
4. Reduce session revocation latency for emergency cases

---

## 19. Testability, Data Classification, Migration Safety, and Release-Readiness Verdict

### Permission Test Coverage

| Role/State                       | Tested?  | Test File                                                                                       | What's Tested                                                      |
| -------------------------------- | -------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Public (unauthenticated)         | Yes      | `tests/coverage/05-auth-boundaries.spec.ts`                                                     | Redirects to sign-in                                               |
| Chef access                      | Yes      | Same                                                                                            | Cannot access client/admin routes                                  |
| Client access                    | Yes      | Same                                                                                            | Cannot access chef/admin routes                                    |
| Admin access                     | Yes      | Same                                                                                            | Unauthenticated blocked. Q52 test verifies nav parity.             |
| Staff access                     | Partial  | Same                                                                                            | Unauthenticated blocked. **No test for staff-cant-access-chef.**   |
| Partner access                   | Partial  | Same                                                                                            | Unauthenticated blocked. **No test for partner-cant-access-chef.** |
| VIP access                       | **No**   | N/A                                                                                             | No test verifies VIP bypass or VIP-blocked-from-admin              |
| Pro/Paid access                  | **No**   | N/A                                                                                             | No test (requirePro is no-op, nothing to test)                     |
| Comped access                    | **No**   | N/A                                                                                             | No test                                                            |
| Free access                      | **No**   | N/A                                                                                             | No test distinguishes free from paid                               |
| Cannabis access                  | **No**   | N/A                                                                                             | No automated test for cannabis gating                              |
| System role                      | **No**   | N/A                                                                                             | No test (role is undefined)                                        |
| Cross-tenant denial              | Yes      | `tests/e2e/17-tenant-isolation.spec.ts`, `tests/interactions/30-multi-tenant-isolation.spec.ts` | Comprehensive                                                      |
| Revoked access                   | **No**   | N/A                                                                                             | No test for post-revocation behavior                               |
| Suspended access                 | **No**   | N/A                                                                                             | No test for suspended chef blocked                                 |
| Expired access                   | **No**   | N/A                                                                                             | No expiration mechanism exists                                     |
| Frontend route protection        | Yes      | Auth boundary tests                                                                             | Redirect verification                                              |
| Backend server-action protection | Implicit | Tenant isolation tests                                                                          | Cross-tenant queries blocked                                       |
| Database-level filtering         | Yes      | Tenant isolation tests                                                                          | RLS verified                                                       |

**Missing tests (by priority):**

1. Staff cannot access chef-only routes/actions
2. Partner cannot access chef-only routes/actions
3. VIP cannot access admin panel
4. VIP gets feature bypass (focus mode, modules)
5. Suspended chef is blocked
6. Revoked session is blocked (within latency window)
7. Cannabis access correctly gates cannabis pages

### Permission Matrix

**No formal permission matrix exists in the codebase.** The closest is `docs/specs/platform-role-hierarchy.md` which defines a 6-tier capability matrix, but it is aspirational (references tiers that are not enforced).

**Recommended matrix structure:**

```
Role/State       | Admin Panel | Chef Portal | Client Portal | Staff Portal | Partner Portal | Cannabis | Focus Bypass | All Modules |
owner            | Yes         | Yes         | No            | No           | No             | Bypass   | Yes          | Yes         |
admin            | Yes         | Yes         | No            | No           | No             | Bypass   | Yes          | Yes         |
vip              | No          | Yes         | No            | No           | No             | *See 2.5*| Yes          | Yes         |
chef (free)      | No          | Yes         | No            | No           | No             | If granted| No          | Per toggle  |
chef (supporter) | No          | Yes         | No            | No           | No             | If granted| No          | Per toggle  |
chef (comped)    | No          | Yes         | No            | No           | No             | If granted| No          | Per toggle  |
client           | No          | No          | Yes           | No           | No             | If granted| N/A         | N/A         |
staff            | No          | No          | No            | Yes          | No             | No        | N/A         | N/A         |
partner          | No          | No          | No            | No           | Yes            | No        | N/A         | N/A         |
```

### Data Classification

**No formal data classification exists.** Recommended minimum:

| Classification       | Examples                                                   | Who Can Access                                       |
| -------------------- | ---------------------------------------------------------- | ---------------------------------------------------- |
| Public               | Directory listings, public chef profiles, marketing pages  | Anyone                                               |
| Authenticated        | User's own profile, own events                             | Authenticated owner of the data                      |
| Tenant-Private       | Events, clients, menus, recipes, invoices, expenses, staff | Chef (tenant owner) + authorized staff/collaborators |
| Chef-Private         | Financial summaries, profit margins, strategy notes        | Chef only (not staff)                                |
| Client-Private       | Client personal info, dietary needs, addresses             | Chef + client (own record)                           |
| Staff/Vendor-Private | Staff pay rates, SSN/EIN, contractor details               | Chef only                                            |
| Cannabis-Sensitive   | Cannabis event details, dosage, compliance                 | Chef + cannabis-authorized users only                |
| Billing/Subscription | Stripe data, subscription status, payment history          | Chef + admin                                         |
| Admin-Only           | Platform metrics, all-user lists, audit logs               | Admin + owner                                        |
| Owner-Only           | Pricing health, OpenClaw, system diagnostics               | Owner only                                           |
| System/Internal      | API keys, session tokens, encryption keys                  | System only                                          |

### Migration Safety

If the recommended changes in Section 15 are implemented:

| Risk                                       | Mitigation                                                                             |
| ------------------------------------------ | -------------------------------------------------------------------------------------- |
| VIP rows in platform_admins need migration | Create `user_entitlements` rows from existing platform_admins VIP rows before dropping |
| subscription_status CHECK constraint       | Audit existing values first. Any non-standard values would block the ALTER.            |
| RBAC schema sync                           | Non-destructive. Adding tables to Drizzle schema does not affect DB.                   |
| Removing 'system' from enum                | Verify no user_roles rows with role='system' exist first.                              |
| Owner email de-hardcoding                  | Safe. `access_level = 'owner'` already stored. Just change the check logic.            |
| Comp grants table                          | New table, no existing data to migrate. Backfill from admin_audit_log if needed.       |

**Safe migration strategy:**

1. Add new tables/columns first (additive)
2. Backfill data from existing sources
3. Deploy new code that reads from new locations
4. Verify new code works with existing data
5. Only then remove old locations (if ever)

Never drop columns, rename columns, or change constraints without auditing existing data first.

### Release-Readiness Verdict

**Safe to continue building only after critical fixes.**

ChefFlow's core security architecture is solid. Defense-in-depth works. Tenant isolation is enforced. Admin panel is properly gated. No confirmed cross-tenant data leaks.

However, the permission model has accumulated enough ambiguity, drift, and dead code that building more features on top of it will compound the confusion. Specifically:

1. The 205 `requirePro()` no-op calls will mislead every future developer or agent
2. The Drizzle schema drift will cause a regression if schema tools are ever run
3. The undefined 'system' role is a latent gap in a non-deny-by-default system
4. The comped-user concept has no lifecycle and would break if tier gating activates
5. VIP in platform_admins causes ongoing role bleed

**For the current single-owner, limited-user deployment:** Adequate. The owner controls all access manually. The attack surface is small.

**For broader authenticated-user exposure:** Unsafe until:

- Tier 1 critical fixes are applied (Section 16)
- Tier 2 high-priority fixes are applied for any user class beyond the owner
- Permission tests are written for role boundaries

**For public/marketplace exposure:** Unsafe until:

- All Tier 1-3 fixes are applied
- Full permission test suite exists
- Deny-by-default posture is implemented
- Session revocation latency is reduced
- Emergency controls are built

The permission model must be corrected before more product work continues on role-sensitive features. Core chef operational features (events, menus, recipes) can continue safely because tenant isolation is solid. Role-boundary features (VIP grants, cannabis access, admin tools, comped access, staff portal expansion) should wait for the hardening plan.

---

_End of forensic audit report._
