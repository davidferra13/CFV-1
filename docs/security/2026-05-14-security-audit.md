# ChefFlow Security Audit - 2026-05-14

## Audit Scope

Full codebase cyber attack vulnerability assessment across 4 domains:

1. Authentication & Session Security
2. Injection & Input Validation
3. Data Exposure & API Security
4. Infrastructure & Dependencies

## Findings Summary

- **1 HIGH** severity (1 RESOLVED)
- **11 MEDIUM** severity
- **20 LOW** severity
- **33 total vulnerabilities** (32 actionable)

---

## HIGH Severity

### H1: Next.js Middleware Bypass CVEs -- RESOLVED

- **CVEs:** CVE-2024-51479, CVE-2025-29927
- **File:** `package.json:313`
- **Detail:** `^14.2.18` semver range may resolve to unpatched version. Attacker spoofs `x-middleware-subrequest` header to bypass all auth middleware.
- **Impact:** Complete auth bypass on all protected routes.
- **Status:** RESOLVED. Lockfile resolves to 14.2.35, which patches all known CVEs. Additionally, middleware already strips `x-middleware-subrequest` header as defense-in-depth.

### H2: E2E Auth Endpoint IP Check Bypassable

- **File:** `app/api/e2e/auth/route.ts:32-38`
- **Detail:** Empty `x-forwarded-for` + `x-real-ip` makes `!remoteIp` evaluate to `true`, passing loopback check. Direct connection without proxy headers bypasses IP restriction.
- **Impact:** If `E2E_ALLOW_TEST_AUTH=true` in production, full authentication bypass (skips rate limiting, brute force protection, MFA, email confirmation, ban checks).
- **Fix:** Require explicit loopback IP match; never trust empty headers as loopback. Consider removing endpoint from production builds entirely.

---

## MEDIUM Severity

### M1: next-auth Beta in Production

- **File:** `package.json:314`
- **Detail:** `5.0.0-beta.30` is a beta release with known unfixed issues.
- **Fix:** Upgrade to latest beta or GA when available.

### M2: Hardcoded DB Fallback Credentials, No SSL

- **File:** `lib/db/index.ts:5`
- **Detail:** `postgres:postgres@127.0.0.1` fallback if `DATABASE_URL` unset. No TLS configuration.
- **Fix:** Throw error in production if DATABASE_URL unset. Add SSL config for remote connections.

### M3: Hardcoded Crypto Fallback Secret

- **File:** `lib/discover/outreach-crypto.ts:7`
- **Detail:** `'dev-secret-do-not-use'` makes encryption predictable if env vars missing.
- **Fix:** Throw in production instead of falling back.

### M4: MFA Scaffolded But Not Enforced

- **File:** `lib/auth/auth-config.ts:133-234`
- **Detail:** `authorize()` never calls MFA challenge. Middleware never checks `mfaPending`. MFA infrastructure exists but is completely bypassed.
- **Fix:** Either wire up MFA enforcement or remove the scaffolding to avoid false security sense.

### M5: Cross-Tenant Permission Modification

- **File:** `lib/auth/permission-actions.ts:35-39`
- **Detail:** `grantPermissionOverride` query lacks `WHERE tenant_id =` on target user validation.
- **Fix:** Add tenant_id check on target user role query.

### M6: JSON-LD Script Injection (XSS)

- **File:** `components/seo/json-ld.tsx:13`
- **Detail:** `JSON.stringify(data)` doesn't escape `</script>`. User-controlled content (chef names, descriptions) could inject malicious scripts.
- **Fix:** `.replace(/</g, '\\u003c')` on JSON.stringify output.

### M7: Middleware Skips E2E and Demo Routes

- **File:** `middleware.ts:215`
- **Detail:** Test/demo infrastructure routes bypass auth middleware in production builds.
- **Fix:** Conditionally exclude test routes based on NODE_ENV.

### M8: SSE No Per-User Connection Limit

- **File:** `lib/realtime/sse-server.ts:5`
- **Detail:** 500 global max listeners. One user could exhaust entire real-time budget.
- **Fix:** Add per-user connection cap (e.g., 5-10 connections per user).

### M9: 50MB Global Server Action Body Limit

- **File:** `next.config.js:39`
- **Detail:** Every server action accepts 50MB payloads. Memory exhaustion vector.
- **Fix:** Reduce to 2-4MB globally; use per-action limits where needed.

### M10: Pi Bridge No Authentication

- **File:** `lib/pricing/pi-bridge.ts:14`
- **Detail:** Plain HTTP to `10.0.0.177:7700`, no auth headers.
- **Fix:** Add shared secret/API key authentication.

### M11: Unvalidated Breadcrumb API

- **File:** `app/api/activity/breadcrumbs/route.ts:32-49`
- **Detail:** Arbitrary fields inserted into DB without Zod schema validation.
- **Fix:** Add Zod schema validation.

---

## LOW Severity

### L1: LIKE Wildcard Injection (~15 instances)

- **Files:** Multiple v2 routes, lib/recipes/actions.ts, lib/staff/actions.ts
- **Fix:** Escape `%`, `_`, `\` in search strings.

### L2: Admin Routes Rely on Page-Level Gating Only

- **File:** `lib/auth/route-policy.ts:368-372`
- **Fix:** Add middleware-level admin check.

### L3: Hardcoded Cookie Signing Fallback

- **File:** `lib/auth/signed-cookie.ts:13`
- **Fix:** Throw in production.

### L4: Client-Side Password Min 8 vs Server 12

- **File:** `lib/auth/website-signup.ts:30`
- **Fix:** Align client to 12 chars.

### L5: Admin Preview Cookie Missing Secure Flag

- **File:** `lib/auth/admin-preview-actions.ts:24-29`
- **Fix:** Add secure flag based on environment.

### L6: E2E Session 30 Days vs Normal 7 Days

- **File:** `app/api/e2e/auth/route.ts:134`
- **Fix:** Align to 7 days or shorter.

### L7: Hardcoded localhost Redirect

- **File:** `app/api/auth/clear/route.ts:9`
- **Fix:** Use relative URL or env var.

### L8: No HSTS Preload

- **File:** `next.config.js:255`
- **Fix:** Add `preload` directive.

### L9: SSRF Guard Missing IPv6 Private Ranges

- **File:** `lib/ai/server-runtime-guard.ts`
- **Fix:** Add fc00::/7, fe80::/10 checks.

### L10: DNS Rebinding Gap in Image Proxy

- **File:** `app/api/openclaw/image/route.ts`
- **Fix:** Pin resolved IP after DNS lookup.

### L11: Cloudflare Tunnel UUID + Path in Repo

- **File:** `.cloudflared/config.yml:16-17`
- **Fix:** Move to .gitignore or use env vars.

### L12: noTLSVerify in Tunnel Config

- **File:** `.cloudflared/config.yml:23`
- **Fix:** Use self-signed cert instead.

### L13: In-Memory Rate Limiter Not Distributed

- **File:** `lib/security/rate-limit.ts`
- **Fix:** Acceptable for single-process; document limitation.

### L14: Log Injection via Unsanitized User Input

- **Files:** Multiple API routes
- **Fix:** Structured JSON logging or strip control chars.

### L15-L17: Missing Zod on Several Server Actions

- **Files:** lib/vendors/order-actions.ts:14, lib/discovery/saved-chefs.ts:22, lib/clients/passport-actions.ts:32
- **Fix:** Add Zod schemas.

### L18: Unvalidated Error Report Tags

- **File:** `app/api/monitoring/report-error/route.ts:21-46`
- **Fix:** Schema-validate tags.

### L19: Unvalidated Connector Result Body

- **File:** `app/api/connector/v1/result/route.ts:20-27`
- **Fix:** Add Zod schema.

### L20: Extensive console.log in Production

- **Files:** Multiple app/api/ routes
- **Fix:** Use structured logger with level control.

### L21: unsafe-inline in CSP script-src

- **File:** `next.config.js:286`
- **Fix:** Next.js 14 limitation. Upgrade to Next.js 15 for nonce support.

### L22: trustHost: true

- **File:** `lib/auth/auth-config.ts:408`
- **Fix:** Document as deployment constraint.

---

## Positive Security Posture

- Bcrypt password hashing with NIST-aligned policy (12 char min, common password blocklist)
- Recovery/email tokens SHA-256 hashed before DB storage
- Internal header stripping (CVE-2025-29927 defense-in-depth already implemented)
- Session versioning with revocation on password change
- CSRF protection on OAuth and server actions
- Timing-safe comparison for cron/URL signing auth
- Storage routes well-defended (path traversal, signed URLs, SVG/HTML forced-download)
- Zero eval() or new Function() usage
- No command injection surfaces (admin exec properly allowlisted)
- Comprehensive CSP, HSTS, X-Frame-Options headers
- SSRF guards on Ollama proxy and image proxy
- V2 API pagination capped at 200
- Access risk scoring with anomaly detection (new device, impossible travel)
- Brute-force protection with escalating lockouts

---

## Research Findings (Completed 2026-05-14)

8 parallel research agents investigated every critical area. Key findings:

### R1: Next.js CVE Status -- RESOLVED

- Lockfile resolves to **14.2.35**, which patches CVE-2024-51479 and CVE-2025-29927
- Middleware already strips `x-middleware-subrequest` header (belt-and-suspenders defense)
- No action needed. H1 downgraded to RESOLVED.

### R2: Auth.js v5 Status

- Auth.js v5 **never reached GA**. Project was acquired by Better Auth (Sep 2025)
- Current version `5.0.0-beta.30` is one patch behind `beta.31`; no critical CVEs between them
- MFA backend is **fully built** (TOTP, recovery codes, challenges, security events, UI page)
- Only gap: middleware enforcement missing; `mfaPending` sessions not blocked from protected routes
- Long-term path: Better Auth migration or stay on frozen beta

### R3: Tenant Isolation -- 4 Cross-Tenant Vulnerabilities Found

- **3 in `permission-actions.ts`**: `grantPermissionOverride` (line 35), `changeTenantRole` lookup (line 134), and `changeTenantRole` UPDATE (line 150, worst: updates ALL tenants)
- **1 in `permissions.ts`**: `resolveTenantRole` (line 136) queries without tenant filter, `LIMIT 1` returns nondeterministic results
- **RLS explicitly disabled** on all tables (migration `20260401000098_disable_rls_all_tables.sql`)
- **No centralized tenant-scoping helper** exists; 250+ server actions each scope manually
- Most actions use `requireChef()` which provides session `tenantId` (safe pattern); the RBAC code is the primary risk surface
- Recommended: create `requireTenantMembership()` helper, medium-term re-enable RLS on sensitive tables

### R4: XSS and CSP

- **17 JSON-LD injection points** across public pages; 13 bypass shared `JsonLd` component
- Fix is 5 lines: `.replace(/</g, '\\u003c')` in shared component, then consolidate all pages to use it
- Highest-risk pages: `/chef/[slug]`, `/e/[shareToken]`, `/nearby/[slug]` (DB-sourced user content)
- CSP nonces **not viable on Next.js 14**; `unsafe-inline` is correct trade-off until Next.js 15 upgrade
- DOMPurify allows `style` attribute (CSS exfiltration risk, low severity)

### R5: SSE and Rate Limiting

- No per-user SSE limit, no max lifetime, no idle timeout; connection exhaustion is real
- Three separate rate limiters with inconsistent interfaces, all fixed-window (burst-at-boundary vulnerable)
- IP extraction uses `x-forwarded-for` instead of `CF-Connecting-IP` (spoofable behind Cloudflare)
- Cloudflare free tier provides **unmetered rate limiting** (since Oct 2022); configure for login + API routes
- 50MB body limit only needed for photo uploads; reduce global default to 2MB

### R6: Hardcoded Secrets -- 3 Runtime Fallbacks Found

- `lib/db/index.ts:5` -- `postgresql://postgres:postgres@127.0.0.1:54322/postgres` (LOW: fails harmlessly in prod)
- `lib/discover/outreach-crypto.ts:7` -- `'dev-secret-do-not-use'` (HIGH: enables decryption of outreach refs)
- `lib/auth/signed-cookie.ts:13` -- `'chefflow-dev-cookie-key'` (MEDIUM: enables role cookie forgery)
- 4 additional fallbacks in scripts/ (acceptable, local-only)
- **No central env validation** exists; recommend `lib/env.ts` with Zod schema
- E2E endpoint fix: middleware block for `/api/e2e/*` in production, or rename to `.e2e.ts` with `pageExtensions`
- Recommend Gitleaks pre-commit hook + one-time TruffleHog history scan

### R7: Input Validation

- **15 unescaped `.ilike()` calls** across v2 routes, recipes, staff, discovery
- **~5 server actions** without Zod validation (order-actions, saved-chefs, passport-actions, error-report, connector)
- Drizzle ORM has no built-in LIKE escaping; need shared `escapeLikePattern()` utility
- Fix pattern: escape `%`, `_`, `\` before passing to `.ilike()`

### R8: OWASP Mapping and Compliance

**OWASP Top 10 2025 distribution of 33 findings:**

| Category                       | Findings                                        | Count |
| ------------------------------ | ----------------------------------------------- | ----- |
| A01: Broken Access Control     | H1, H2, M4, M5, M7, L2, L6, L7                  | 8     |
| A02: Security Misconfiguration | M2, M3, M9, L3, L5, L8, L11, L12, L13, L21, L22 | 11    |
| A03: Software Supply Chain     | M1, L20                                         | 2     |
| A04: Injection                 | M6, M11, L1, L14, L15-L17, L18, L19             | 9     |
| A05: Cryptographic Failures    | M3, L3                                          | 2     |

**PCI DSS:** Stripe Checkout/Elements qualifies for SAQ A (simplest). No card data touches server. PCI DSS 4.0.1 requires payment page script inventory (requirements 6.4.3, 11.6.1).

**Cloudflare free tier provides:** unmetered DDoS mitigation, unmetered rate limiting, 5 custom WAF rules, managed DDoS rules, free SSL/TLS.

---

## Remediation Roadmap

### Phase 1: IMMEDIATE (Week 1, ~2 hours) -- Active Exploit Vectors

| #   | Finding                                 | Fix                                                                                     | Effort |
| --- | --------------------------------------- | --------------------------------------------------------------------------------------- | ------ |
| 1   | H2: E2E auth endpoint                   | Require explicit loopback match; add middleware block for `/api/e2e/*` in production    | 30 min |
| 2   | M5: Cross-tenant permission (3 queries) | Add `WHERE entity_id = tenantId` to all `user_roles` queries in `permission-actions.ts` | 30 min |
| 3   | M5b: Cross-tenant UPDATE                | Scope `changeTenantRole` UPDATE (line 150) by `entity_id`                               | 15 min |
| 4   | M5c: `resolveTenantRole`                | Add `tenantId` parameter and filter in `permissions.ts`                                 | 15 min |
| 5   | M7: Middleware skips test routes        | Wrap E2E/demo exclusions in `NODE_ENV !== 'production'` check                           | 15 min |
| 6   | M2+M3+L3: Hardcoded secret fallbacks    | Throw in production if env var missing (3 files, same pattern)                          | 15 min |

### Phase 2: SHORT-TERM (Weeks 2-3, ~7 hours) -- High-Impact Hardening

| #   | Finding                          | Fix                                                                          | Effort |
| --- | -------------------------------- | ---------------------------------------------------------------------------- | ------ |
| 7   | M6: JSON-LD XSS                  | `.replace(/</g, '\\u003c')` in `json-ld.tsx`; consolidate 13 bypassing pages | 1 hr   |
| 8   | M9: 50MB body limit              | Reduce to `'2mb'` in `next.config.js`                                        | 5 min  |
| 9   | M8: SSE per-user limit           | Add Map tracking connections per userId, cap at 5-10                         | 1 hr   |
| 10  | M11: Breadcrumb validation       | Add Zod schema                                                               | 30 min |
| 11  | L1: LIKE injection (15 calls)    | Create `escapeLikePattern()` utility, apply everywhere                       | 2 hr   |
| 12  | L15-L19: Missing Zod (5 actions) | Add Zod schemas                                                              | 2 hr   |
| 13  | L4: Password min mismatch        | Client-side 8 to 12                                                          | 5 min  |
| 14  | L5: Cookie secure flag           | Add `secure: NODE_ENV === 'production'`                                      | 5 min  |
| 15  | L14: Log injection               | Strip control chars from user input before logging                           | 30 min |

### Phase 3: MEDIUM-TERM (Weeks 4-6, ~10 hours) -- Defense in Depth

| #   | Finding                    | Fix                                                                | Effort |
| --- | -------------------------- | ------------------------------------------------------------------ | ------ |
| 16  | L2: Admin middleware check | Add admin role check in middleware for `/admin` routes             | 1 hr   |
| 17  | M10: Pi Bridge auth        | Add shared secret header                                           | 1 hr   |
| 18  | L8: HSTS preload           | Add `preload` directive                                            | 5 min  |
| 19  | L9: SSRF IPv6              | Add `fc00::/7`, `fe80::/10` to blocklist                           | 30 min |
| 20  | L10: DNS rebinding         | Pin resolved IP after DNS lookup in image proxy                    | 1 hr   |
| 21  | L11+L12: Tunnel config     | Move UUID to env vars; replace `noTLSVerify` with self-signed cert | 1.5 hr |
| 22  | L6+L7: Session/redirect    | Align E2E session to 7 days; use relative URL for redirect         | 10 min |
| 23  | L20: console.log cleanup   | Replace with structured logger (pino) with level control           | 4 hr   |
| 24  | Env validation             | Create `lib/env.ts` with Zod schema for all required vars          | 1 hr   |
| 25  | Tenant helper              | Create `requireTenantMembership()` centralized helper              | 1 hr   |

### Phase 4: STRATEGIC (Weeks 7+) -- Major Upgrades

| #   | Finding                | Fix                                                                     | Effort  |
| --- | ---------------------- | ----------------------------------------------------------------------- | ------- |
| 26  | M1: next-auth beta     | Monitor Better Auth; upgrade when strategy is clear                     | 2-4 hr  |
| 27  | M4: MFA enforcement    | Wire up middleware enforcement or remove scaffolding                    | 8-16 hr |
| 28  | L21: CSP unsafe-inline | Requires Next.js 15 upgrade for nonce support                           | 8-24 hr |
| 29  | RLS re-enablement      | Re-enable RLS on sensitive tables with `SET LOCAL` transaction wrapping | 8-16 hr |

### Cloudflare WAF Rules (Free, 5 Available)

1. Block `x-middleware-subrequest` header (defense-in-depth)
2. Rate limit `/api/auth/*` (login, signup)
3. Rate limit `/api/e2e/*`
4. Block common scanner user-agents
5. Geo-restrict to US (if applicable)

### Recommended Security Tooling

| Tool                               | Purpose                              | Cost           |
| ---------------------------------- | ------------------------------------ | -------------- |
| `npm audit --audit-level=moderate` | Dependency CVEs (run in CI)          | Free           |
| Gitleaks pre-commit hook           | Block secrets before commit          | Free           |
| TruffleHog one-time scan           | Check git history for leaked secrets | Free           |
| OWASP ZAP baseline scan            | Weekly automated security scan       | Free           |
| Cloudflare WAF rules               | Edge-layer protection                | Free (5 rules) |

---

## Audit Methodology

- 4 parallel Opus agents scanning different attack surfaces (auth, injection, data exposure, infrastructure)
- 8 parallel research agents investigating remediation patterns (Next.js CVEs, Auth.js, tenant isolation, XSS/CSP, SSE/rate limiting, hardcoded secrets, input validation, OWASP priorities)
- Full codebase grep/glob across all source files
- OWASP Top 10 2025 checklist applied
- CVE database cross-reference for dependencies
- External web research: OWASP, Vercel, Cloudflare, PCI DSS, Auth.js, Drizzle ORM docs
- Total: 12 specialized agents, ~33 findings cataloged, 29 remediation items prioritized
