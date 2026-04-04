Audit and harden ChefFlow against unauthorized visibility, broken access control, privilege escalation, cross-tenant data leakage, and any exposure of information to users who are not explicitly permitted to access it.

You are not doing a superficial UI review. You must verify the real enforcement path across routes, layouts, server actions, API handlers, queries, caching, serialized data, client state, and any user-facing error or metadata surface.

This is a production application with real user data. Any unauthorized exposure of data, admin capability, internal system detail, developer-only functionality, or hidden implementation detail is unacceptable and must be treated as a release-blocking issue.

---

## Your mission

1. Determine exactly what each role is allowed to see and do
2. Identify anything each role can currently see, infer, access, or trigger that they should not
3. Confirm whether protection exists in the UI only or is actually enforced on the server and in data access
4. Fix every safe, local issue you can fix without destructive changes
5. Verify every fix with evidence
6. Produce a final, evidence-backed access control audit

---

## Project-specific rules (mandatory)

- Read and follow CLAUDE.md before doing anything else
- Read `docs/app-complete-audit.md` first to locate routes, screens, components, forms, modals, and flows before broad code searching
- Read the last 5 entries of `docs/session-log.md`
- Read `docs/build-state.md` before starting work
- Respect the Zero Hallucination rules in CLAUDE.md
- Never claim something is protected unless the enforcement is confirmed in code
- Never rely on hidden UI alone as proof of security
- Never make destructive schema changes or destructive data operations
- Never expose internal platform terms (OpenClaw), secrets, stack traces, or developer-only concepts on any public or role-limited surface
- Keep fixes minimal, correct, and aligned with the existing architecture
- Cite exact file paths and line numbers for every claim

---

## Roles and scenarios to audit

### Authenticated roles (from `user_roles` table, enum: `chef | client | staff | partner | system`)

| Role        | Auth guard                                          | Portal            | Tenant model                                              |
| ----------- | --------------------------------------------------- | ----------------- | --------------------------------------------------------- |
| **chef**    | `requireChef()`                                     | `app/(chef)/*`    | IS the tenant (`tenantId = chef.id`)                      |
| **client**  | `requireClient()`                                   | `app/(client)/*`  | Belongs to a tenant (`tenantId = client.tenant_id`)       |
| **staff**   | `requireStaff()`                                    | `app/(staff)/*`   | Scoped to chef (`tenantId = staff_members.chef_id`)       |
| **partner** | `requirePartner()`                                  | `app/(partner)/*` | Scoped to chef (`tenantId = referral_partners.tenant_id`) |
| **admin**   | `requireAdmin()` (separate `platform_admins` table) | `app/(admin)/*`   | Platform-wide                                             |

### Unauthenticated surfaces

| Surface                | Expected access                                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Public marketing pages | No auth required                                                                                                                     |
| `/embed/*` routes      | Public by design, relaxed CSP (`frame-ancestors *`), no auth. **High-priority audit target** (widest unauthenticated attack surface) |
| `/api/embed/*`         | Public API for embeddable widget                                                                                                     |
| Auth pages (`/auth/*`) | No auth required                                                                                                                     |

### Attack scenarios (must be explicitly tested)

- Unauthenticated visitor accessing any protected route by direct URL
- Client accessing chef portal routes by URL
- Chef accessing another chef's data (cross-tenant)
- Client accessing another chef's client data (cross-tenant)
- Staff accessing data outside their assigned chef's tenant
- Partner accessing chef data beyond their referral scope
- Non-admin accessing admin routes and actions
- Any role calling server actions intended for a different role
- Route guessing (predictable IDs, sequential URLs, common admin paths)
- Stale session or cached data serving wrong role/tenant after logout or role change
- Hidden UI elements that still leave backend actions callable
- Embed routes leaking chef data beyond what the widget needs

---

## For each role or scenario, determine

1. Which pages can be accessed
2. Which data can be viewed
3. Which actions can be performed
4. Which pages, data, and actions must be forbidden
5. Whether enforcement exists in the UI
6. Whether enforcement exists in layouts and page loaders
7. Whether enforcement exists in server actions and API handlers
8. Whether database queries are correctly tenant-scoped
9. Whether serialized props, API responses, caches, or client state leak restricted data
10. Whether error messages, metadata, debug output, or hidden states expose forbidden information
11. Whether tenant boundaries are enforced consistently

---

## Mandatory technical checks

- Route protection (middleware + layout auth enforcement)
- Page-level auth checks (`requireChef`, `requireClient`, `requireStaff`, `requirePartner`, `requireAdmin`)
- Server action guards (every exported `async function` in `'use server'` files)
- API route auth and authorization (`app/api/*`)
- Tenant scoping on every relevant database query (`.eq('tenant_id', ...)` or `.eq('chef_id', ...)`)
- Admin-only screens and actions (`isAdmin()`, `requireAdmin()`, `requireChefAdmin()`, `adminOnly` flag in nav config)
- Hidden buttons or disabled UI that still call working server actions
- Direct URL access to restricted routes
- Sensitive fields leaking into client component props
- Secrets or internal operational details leaking through error messages or API responses
- `unstable_cache` entries being served to wrong role, tenant, or session
- Optimistic UI that implies success or access when backend enforcement fails
- Places where UI denies access but the server still performs the action
- Places where failure is disguised as empty, safe-looking, or normal data
- Places where a user can infer forbidden information even if it is not directly displayed
- Embed routes (`/embed/*`, `/api/embed/*`) exposing more chef/client data than intended
- E2E auth endpoint (`/api/e2e/auth`) accessibility in production
- Storage API routes (`/api/storage/*`) authorization and path traversal

---

## Execution requirements

- Inspect real code, not just filenames or route names
- Follow all relevant references until the full enforcement path is understood
- Distinguish clearly between **confirmed secure**, **likely risky**, and **confirmed broken**
- Do not guess
- If an issue is confirmed, explain the root cause
- If a fix is safe and local, implement it immediately
- After each fix, run `npx tsc --noEmit --skipLibCheck` and verify the issue is resolved
- If a fix would require destructive database work or risky architectural change, do not apply it without explicit approval
- Treat any unauthorized data exposure as Critical by default unless evidence clearly supports a lower severity

---

## Evidence standard

Every finding must include exact evidence with file paths and line numbers. No vague claims. No assumptions. No "probably secure." No "seems fine." If you cannot verify it, mark it as **unverified** and explain why.

---

## Required output format

### 1. Executive summary

- Overall risk level
- Top critical findings
- Roles most at risk
- Summary of fixes applied

### 2. Role-by-role access matrix

For each role:

- Allowed pages
- Allowed data
- Allowed actions
- Forbidden pages, data, and actions
- Enforcement status: **UI only** | **server enforced** | **database scoped** | **partially enforced** | **broken**
- Findings and severity

### 3. Detailed findings

For each finding:

- **Title**
- **Severity:** Critical / High / Medium / Low
- **Affected role or scenario**
- **What is exposed or improperly accessible**
- **Why it is dangerous**
- **Exact evidence** (file paths and line numbers)
- **Root cause**
- **Recommended fix**
- **Status:** fixed / not fixed / needs approval

### 4. Fixes applied

- Files changed
- What changed
- Why the change closes the gap
- How it was verified

### 5. Remaining risks

- Issue
- Why it remains
- Exact next step required
- Whether approval is needed

---

## Success criteria

- No role can access anything not explicitly intended for that role
- No UI-only protection exists without server enforcement for sensitive data or actions
- No cross-tenant data leakage exists
- No internal-only information (OpenClaw, stack traces, debug data) appears on restricted or public surfaces
- All claims are backed by code evidence
- Every implemented fix is verified
- Any unresolved risk is clearly documented with the exact blocker

Do not stop at reporting. If a fix is safe, local, and non-destructive, implement it, verify it, and include proof that the issue is resolved. If you find any place where information is visible to a party forbidden from accessing it, treat it as a release-blocking issue and prioritize fixing it immediately.
