# Codex Task: ChefFlow V1 Security, Route, and Tenant Isolation Audit

> **Purpose:** Comprehensive audit of every route, server action, API endpoint, and database query for auth protection, tenant scoping, and direct-access safety. The UI is NOT a security boundary. Every protection must exist server-side.
>
> **Generated:** 2026-05-14 from live repo inspection (1,200 routes, 1,192 server actions, 397 API routes, ~685 tables).

---

## 1. Project Context

**App:** ChefFlow V1 -- a multi-tenant private chef operations platform.
**Live production app with real client data.** Data loss and cross-tenant leakage are unacceptable.

### Stack

| Layer     | Technology                                                                                 |
| --------- | ------------------------------------------------------------------------------------------ |
| Framework | Next.js 15 (App Router)                                                                    |
| Auth      | Auth.js v5 (NextAuth v5) -- JWT strategy, 7-day max age                                    |
| Database  | PostgreSQL via Drizzle ORM + custom PostgREST-compatible compat layer (`lib/db/compat.ts`) |
| DB Driver | postgres.js (direct connection, NOT Supabase PostgREST)                                    |
| Schemas   | `public`, `auth`, `openclaw` (3 PostgreSQL schemas)                                        |
| Payments  | Stripe                                                                                     |
| Runtime   | Node.js (server actions/API) + Edge (middleware only)                                      |
| Testing   | Playwright (E2E) + Node test runner (unit)                                                 |

### Multi-Tenancy Model

- Single database, shared schema. Tenant = chef (private chef business).
- `tenant_id` or `chef_id` column on virtually every table, FK to `chefs.id`.
- **Naming is inconsistent:** some tables use `tenant_id`, others use `chef_id` for the same concept.
- Tenant scoping is **manual per query** -- no automatic middleware or query helper injects the tenant filter.
- RLS policies are defined in schema but **the app connects as DB owner**, so RLS is likely bypassed. Application-layer `.eq('tenant_id', ...)` is the actual enforcement boundary.

### Roles

| Role      | Guard Function     | Home Path            |
| --------- | ------------------ | -------------------- |
| `chef`    | `requireChef()`    | `/dashboard`         |
| `client`  | `requireClient()`  | `/my-events`         |
| `staff`   | `requireStaff()`   | `/staff-dashboard`   |
| `partner` | `requirePartner()` | `/partner/dashboard` |
| `admin`   | `requireAdmin()`   | `/admin`             |

Additional: `requireAuth()` (any role), `requirePro()` (currently a no-op stub delegating to `requireChef()`), `requirePermission(domain, action)` (granular RBAC).

---

## 2. Security Architecture (4 Layers)

### Layer 1: Middleware (`middleware.ts`)

Edge-level gate using Auth.js v5. The `config.matcher` regex excludes static assets and many API prefixes from middleware entirely.

**Key file:** `middleware.ts` (root)

- Strips all `x-cf-*` internal headers from incoming requests (anti-spoofing)
- Strips `x-middleware-subrequest` (CVE-2025-29927 mitigation)
- Unauthenticated requests to non-public paths: redirect to `/auth/signin` (pages) or 401 JSON (API)
- Authenticated users without a role: redirect to `/auth/role-selection`
- Cross-role blocking: chef can't access client paths, client can't access chef paths, etc.

### Layer 2: Route Policy (`lib/auth/route-policy.ts`)

Single source of truth for path classification. Defines explicit arrays:

- `PUBLIC_UNAUTHENTICATED_PATHS` (~55 prefix entries)
- `CHEF_PROTECTED_PATHS` (~108 prefix entries)
- `CLIENT_PROTECTED_PATHS` (~30 prefix entries)
- `STAFF_PROTECTED_PATHS` (6 entries)
- `PARTNER_PROTECTED_PATHS` (1 entry: `/partner`)
- `ADMIN_PATHS` (1 entry: `/admin`)
- `API_SKIP_AUTH_PREFIXES` (~30 entries)

### Layer 3: Layout Guards

Each route group layout calls a `require*()` function that throws on failure:

- `app/(chef)/layout.tsx` -> `requireChef()`
- `app/(client)/layout.tsx` -> `requireClient()`
- `app/(admin)/admin/layout.tsx` -> `requireAdmin()`
- `app/(staff)/layout.tsx` -> `requireStaff()`
- `app/(partner)/partner/layout.tsx` -> `requirePartner()`

### Layer 4: Server Action / API Auth

Every `'use server'` export and API `route.ts` handler should call an auth gate before accessing data.

---

## 3. Known Gaps to Investigate and Fix

### CRITICAL: Verify These First

| ID  | Gap                                                                                                                                                                                                                                                                                      | Location                                                                        | Risk                       |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------- |
| G1  | **Admin middleware pass-through.** Middleware does NOT block non-admin users from `/admin` paths. It returns `allowed: true` with `reason: admin_runtime_gate`. If ANY admin page/action is missing `requireAdmin()`, it is exploitable.                                                 | `lib/auth/route-policy.ts` lines 355-360, every file under `app/(admin)/admin/` | Cross-role escalation      |
| G2  | **`requirePro()` is a no-op.** Subscription gating just calls `requireChef()`. Every chef gets full access regardless of plan.                                                                                                                                                           | `lib/billing/require-pro.ts`                                                    | Business logic bypass      |
| G3  | **`getCurrentUser()` rejects staff and partner roles.** Lines 99-100 of `get-user.ts` return `null` for staff/partner. Any code using generic `requireAuth()` will reject staff/partner users. `requireStaff()` and `requirePartner()` work around this by reading the session directly. | `lib/auth/get-user.ts`                                                          | Staff/partner lockout      |
| G4  | **Large API skip-auth surface.** ~250 API routes are excluded from middleware auth. Each must self-authenticate. The surface is large enough that individual routes could be missed.                                                                                                     | `middleware.ts` matcher regex + `API_SKIP_AUTH_PREFIXES`                        | Unauthenticated API access |
| G5  | **Intake token pages blocked by middleware.** `app/intake/[token]/page.tsx` comments say "no auth required" but `/intake` is NOT in `PUBLIC_UNAUTHENTICATED_PATHS`. Unauthenticated visitors get redirected to signin.                                                                   | `lib/auth/route-policy.ts`, `app/intake/[token]/page.tsx`                       | Broken public flow         |
| G6  | **Mobile chef dashboard may be public.** `/chef/` IS in `PUBLIC_UNAUTHENTICATED_PATHS` (prefix match), so `app/(mobile)/chef/[slug]/dashboard/page.tsx` would be treated as public. If it shows private data, this is an exposure.                                                       | `app/(mobile)/chef/[slug]/dashboard/page.tsx`                                   | Data exposure              |
| G7  | **Client token pages blocked.** `app/client/[token]/*` (3 pages) are tokenized portals, but `/client` is not in public paths. If meant for unauthenticated access, they are currently blocked.                                                                                           | `app/client/[token]/*.tsx`                                                      | Broken public flow         |
| G8  | **RLS defined but bypassed.** RLS policies exist in Drizzle schema but the direct postgres.js connection likely runs as DB owner. Application-layer tenant filtering is the real boundary.                                                                                               | `lib/db/index.ts`, `lib/db/schema/schema.ts`                                    | Defense-in-depth gap       |
| G9  | **Stale JWT sessions after client deletion.** Soft-deleted clients are blocked at login, but existing JWTs remain valid until expiry. The session version mechanism exists but the deletion flow must explicitly trigger it.                                                             | `lib/auth/auth-config.ts`                                                       | Zombie sessions            |
| G10 | **API key auth uses legacy Supabase client.** `lib/api/auth-api-key.ts` uses `createServerClient({ admin: true })` with fire-and-forget error handling on `last_used_at` update.                                                                                                         | `lib/api/auth-api-key.ts`                                                       | Silent failures            |

### SECONDARY: Routes Missing from Explicit Arrays

These routes are protected by fallback (middleware redirects non-public, non-matching paths to signin + layout guards), but are not in the explicit `CHEF_PROTECTED_PATHS` array. Cross-role blocking (`getRoutePolicyDecisionForRole`) may not catch them:

- `/pie-cart`
- `/food-cost`
- `/guest-analytics`
- `/guest-leads`
- `/capture`
- `/consulting`
- `/content`

Audit `app/(chef)/` directories against `CHEF_PROTECTED_PATHS` for completeness.

---

## 4. Audit Plan

### Phase 1: Route Protection Completeness

**Goal:** Every route in `app/` is either explicitly in a protection array or intentionally unprotected.

```bash
# Get all page routes
find app/ -name "page.tsx" -o -name "page.ts" | sort > /tmp/all-pages.txt

# Get all API routes
find app/api -name "route.ts" -o -name "route.tsx" | sort > /tmp/all-api-routes.txt
```

For each route:

1. Is it in `PUBLIC_UNAUTHENTICATED_PATHS`? If yes, verify it should be public.
2. Is it in a protected paths array? If yes, verify it matches the right role.
3. Is it in neither? Flag it. Check if middleware fallback + layout guard covers it.
4. For API routes: is it in `API_SKIP_AUTH_PREFIXES`? If yes, verify it self-authenticates.

**Key files:**

- `lib/auth/route-policy.ts` -- all path arrays
- `lib/auth/route-access-registry.ts` -- structured registry for auditing
- `middleware.ts` -- matcher regex and skip logic

**Deliverable:** `docs/audit/route-protection-matrix.md` -- every route with its protection status.

### Phase 2: Admin Route Hardening

**Goal:** Every admin page and server action has `requireAdmin()`.

```bash
# All admin pages
find app/\(admin\)/admin -name "page.tsx" | sort

# All admin actions (grep for 'use server' in admin-related files)
grep -rl "use server" lib/admin/ lib/platform/ --include="*.ts"
```

For each file: verify `requireAdmin()` is called before any data access. Since middleware passes admin routes through with `admin_runtime_gate`, a missing guard = exploitable.

**Deliverable:** `docs/audit/admin-hardening-report.md`

### Phase 3: Server Action Auth Audit

**Goal:** Every `'use server'` export has an auth gate and tenant scoping.

```bash
# All server action files
grep -rl "use server" lib/ app/ --include="*.ts" --include="*.tsx" | sort
```

For each file:

1. Does every exported function call `requireChef()`, `requireClient()`, `requireAuth()`, or equivalent?
2. Does every DB query scope by `tenant_id` or `chef_id`?
3. Are there any DELETE/UPDATE operations without auth?
4. Is Zod validation present for user inputs?

**Pattern to grep for missing auth:**

```bash
# Server action files that DON'T import any auth function
grep -rL "requireChef\|requireClient\|requireAuth\|requireAdmin\|requireStaff\|requirePartner\|verifyCronAuth\|withApiAuth" $(grep -rl "use server" lib/ app/ --include="*.ts" --include="*.tsx")
```

**Deliverable:** `docs/audit/server-action-auth-matrix.md`

### Phase 4: API Route Auth Audit

**Goal:** Every API route either (a) goes through middleware auth, or (b) self-authenticates.

```bash
# All API routes
find app/api -name "route.ts" -o -name "route.tsx" | sort

# API routes that skip middleware auth
# Cross-reference with API_SKIP_AUTH_PREFIXES in route-policy.ts

# API routes without auth imports
grep -rL "requireChef\|requireClient\|requireAuth\|requireAdmin\|verifyCronAuth\|withApiAuth\|validateProspectingAuth\|stripe.webhooks.constructEvent" app/api/ --include="route.ts"
```

For each unauthenticated API route: verify it is intentionally public and exposes no PII or tenant data.

**Deliverable:** `docs/audit/api-route-auth-matrix.md`

### Phase 5: Tenant Isolation Audit

**Goal:** No query can return data from another tenant.

Two query APIs to audit:

**Compat layer queries** (dominant pattern):

```bash
# Find queries that use .from() but might miss tenant scoping
grep -rn "\.from(" lib/ --include="*.ts" | grep -v "\.eq('tenant_id'" | grep -v "\.eq('chef_id'" | head -50
```

**Drizzle ORM queries:**

```bash
# Find Drizzle select/insert/update/delete without tenant filter
grep -rn "db\.\(select\|insert\|update\|delete\)" lib/ --include="*.ts" | head -50
```

For each query:

1. Is it scoped by `tenant_id` or `chef_id`?
2. If not, is it a platform-level/system query (intentionally unscoped)?
3. For dynamic route params like `[id]`, `[eventId]`, `[clientId]`: does the query scope by BOTH the param AND the tenant? A query like `.eq('id', params.eventId)` without `.eq('tenant_id', ...)` allows cross-tenant access by guessing IDs.

**High-risk patterns to find:**

```bash
# Queries using dynamic params without tenant scoping
grep -rn "params\." lib/ --include="*.ts" | grep -v "tenantId\|tenant_id\|chef_id" | head -50
```

**Deliverable:** `docs/audit/tenant-isolation-matrix.md`

### Phase 6: UI Navigation vs Server-Side Auth

**Goal:** Verify that hiding a UI element is never the sole protection mechanism.

**Key files:**

- `components/navigation/nav-config.tsx` -- chef sidebar config
- `components/navigation/client-nav.tsx` -- client sidebar
- `components/navigation/admin-shell.tsx` -- admin sidebar
- `lib/surfaces/resolve-chef-surfaces.ts` -- dynamic nav hiding (surface graph)

For each hidden nav item:

1. Is the underlying route still server-side protected?
2. If a user types the URL directly, do they get blocked?
3. Focus mode / workspace density hiding: do the hidden routes still have auth?

**Deliverable:** Section in route-protection-matrix.md.

### Phase 7: Build and Type Safety Verification

```bash
# TypeCheck (must exit 0)
npx tsc --noEmit --skipLibCheck

# Next.js build (must exit 0)
npx next build --no-lint

# Unit tests
npm run test:unit

# Critical path tests (ledger, FSM, quotes, auth)
npm run test:critical

# Auth-specific tests
npm run test:unit:auth

# E2E smoke
npm run test:e2e:smoke
```

**Deliverable:** Build log with pass/fail status.

---

## 5. Files and Directories That Matter

### Auth System

- `middleware.ts` -- Edge auth gate
- `lib/auth/route-policy.ts` -- Path classification (SINGLE SOURCE OF TRUTH)
- `lib/auth/route-access-registry.ts` -- Route-role audit registry
- `lib/auth/index.ts` -- Auth.js entry (exports `auth()`)
- `lib/auth/auth-config.ts` -- Auth.js config (providers, JWT callbacks, role resolution)
- `lib/auth/get-user.ts` -- `requireChef()`, `requireClient()`, `requireAuth()`, `getCurrentUser()`
- `lib/auth/admin.ts` -- `requireAdmin()`
- `lib/auth/admin-access.ts` -- Admin access levels (owner/admin/vip)
- `lib/auth/permissions.ts` -- RBAC permission engine
- `lib/auth/cron-auth.ts` -- Cron auth (CRON_SECRET)
- `lib/auth/signed-cookie.ts` -- HMAC-signed role cookies
- `lib/billing/require-pro.ts` -- Subscription gate (currently no-op)
- `lib/api/v2/middleware.ts` -- V2 API auth (API keys, rate limiting)
- `lib/api/auth-api-key.ts` -- Legacy API key auth (Supabase client)
- `lib/security/brute-force.ts` -- Brute-force protection
- `lib/security/audit.ts` -- Security event logging

### Database

- `lib/db/index.ts` -- Drizzle client creation
- `lib/db/compat.ts` -- PostgREST-compatible query builder
- `lib/db/schema/schema.ts` -- Main schema (~685 tables)
- `lib/db/schema/auth.ts` -- Auth schema mapping
- `lib/db/schema/security.ts` -- Security tables
- `lib/db/fk-map.ts` -- FK map for compat layer joins
- `database/migrations/` -- 870 SQL migration files

### Route Groups

- `app/(public)/` -- Public pages (~95)
- `app/(chef)/` -- Chef-protected pages (~670)
- `app/(client)/` -- Client-protected pages (~65)
- `app/(admin)/admin/` -- Admin pages (~43)
- `app/(staff)/` -- Staff pages (6)
- `app/(partner)/partner/` -- Partner pages (6)
- `app/(bare)/` -- Bare layout pages (edge cases)
- `app/(mobile)/` -- Mobile-optimized pages (edge cases)
- `app/api/` -- API routes (~397)

### Navigation

- `components/navigation/nav-config.tsx` -- Chef sidebar config
- `components/navigation/chef-nav.tsx` -- Chef sidebar component
- `components/navigation/client-nav.tsx` -- Client sidebar
- `components/navigation/admin-shell.tsx` -- Admin sidebar
- `lib/surfaces/resolve-chef-surfaces.ts` -- Dynamic nav hiding

### Server Actions (1,192 files)

- `lib/events/actions.ts` -- Event CRUD (exemplary pattern)
- `lib/clients/actions.ts` -- Client CRUD
- `lib/recipes/actions.ts` -- Recipe CRUD
- `lib/quotes/actions.ts` -- Quote CRUD
- `lib/menus/actions.ts` -- Menu CRUD
- `lib/contracts/actions.ts` -- Multi-role contract actions
- `lib/finance/` -- Financial actions (high sensitivity)
- `lib/admin/` -- Admin actions (require `requireAdmin()`)

---

## 6. Concrete Deliverables

After completing the audit, produce these files:

| File                                      | Contents                                              |
| ----------------------------------------- | ----------------------------------------------------- |
| `docs/audit/route-protection-matrix.md`   | Every route with protection status, role, and gaps    |
| `docs/audit/admin-hardening-report.md`    | Admin route/action audit results                      |
| `docs/audit/server-action-auth-matrix.md` | Every server action file with auth/tenant status      |
| `docs/audit/api-route-auth-matrix.md`     | Every API route with auth mechanism and status        |
| `docs/audit/tenant-isolation-matrix.md`   | Query-level tenant scoping audit                      |
| `docs/audit/security-findings.md`         | All findings with severity (CRITICAL/HIGH/MEDIUM/LOW) |
| `docs/audit/fixes-applied.md`             | Log of all fixes made during audit                    |

### Fixes to Apply During Audit

For each finding:

1. **CRITICAL/HIGH:** Fix immediately. Add missing `requireAdmin()`, `requireChef()`, tenant scoping, etc.
2. **MEDIUM:** Fix if straightforward. Document if complex.
3. **LOW:** Document only.

When fixing:

- Add the route to the correct protection array in `route-policy.ts` if missing
- Add auth gates to server actions/API routes if missing
- Add `.eq('tenant_id', user.tenantId!)` to unscoped queries
- Never remove existing protections
- Never modify database schema or run migrations
- Run `npx tsc --noEmit --skipLibCheck` after changes to verify type safety

---

## 7. Done-When Criteria

The audit is complete when ALL of the following are true:

- [ ] Every `page.tsx` in `app/` is accounted for in a protection matrix
- [ ] Every `route.ts` in `app/api/` is accounted for in an auth matrix
- [ ] Every file with `'use server'` has been checked for auth gates
- [ ] All admin pages/actions verified to have `requireAdmin()`
- [ ] All routes in `(bare)`, `(mobile)`, standalone groups verified
- [ ] Cross-reference: every route in `CHEF_PROTECTED_PATHS` exists; every chef route is in the array
- [ ] Cross-reference: every route in `CLIENT_PROTECTED_PATHS` exists; every client route is in the array
- [ ] Gaps G1-G10 from Section 3 have been investigated and either fixed or documented with rationale
- [ ] Routes missing from explicit arrays have been added or documented
- [ ] `npx tsc --noEmit --skipLibCheck` exits 0
- [ ] `npm run test:critical` passes
- [ ] `npm run test:unit:auth` passes
- [ ] All 7 deliverable files exist in `docs/audit/`
- [ ] No new `@ts-nocheck` files created

---

## 8. Safety Rules

- **NEVER** `DROP TABLE`, `DROP COLUMN`, `DELETE`, `TRUNCATE` without approval
- **NEVER** modify column types or run `drizzle-kit push`
- **NEVER** delete production data or user accounts
- **NEVER** remove existing auth checks or protections
- **NEVER** modify the `chefs`, `clients`, `user_roles`, or `auth.users` tables
- All changes must be additive (adding auth gates, adding to protection arrays)
- If a finding requires schema changes, document it but do not execute
- Commit with conventional commit format: `fix: add missing requireAdmin to /admin/[page]`
- If unsure whether something is intentionally unprotected, document it rather than adding auth
