# System Integrity Question Set: Authentication & Authorization

> Sweep 16 of the cohesiveness series (re-audit of sweep 10). 50 binary pass/fail questions across 10 domains.
> Scope: Credential security, JWT sessions, rate limiting, middleware routing, RBAC, account lifecycle, OAuth, cookies, access monitoring, enumeration prevention.

## Summary

- **Score:** 49/50 PASS (98%) -> 50/50 after fix (100%)
- **Fixes applied:** 1
- **Files modified:** 2

## Fix Applied

| ID  | File                                         | Fix                                                                                                                                                                                                                                                                                                          | Severity |
| --- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| Q20 | `middleware.ts` + `lib/auth/route-policy.ts` | Added `PARTNER_PROTECTED_PATHS` and `isPartnerRoutePath()` to route-policy. Added partner route enforcement in middleware (redirects non-partner users away from `/partner/*`). Previously chef/client/staff had middleware-level protection; partner routes relied solely on page-level `requirePartner()`. | MEDIUM   |

---

## Domain 1: Credential Security (Q1-Q5)

| #   | Question                                                               | Result |
| --- | ---------------------------------------------------------------------- | ------ |
| Q1  | Does password hashing use bcrypt with cost factor >= 10?               | PASS   |
| Q2  | Are recovery tokens hashed (SHA-256) before database storage?          | PASS   |
| Q3  | Do password reset tokens expire after 1 hour?                          | PASS   |
| Q4  | Does the password policy enforce minimum 12 characters via Zod schema? | PASS   |
| Q5  | Is the recovery token cleared from DB after successful password reset? | PASS   |

## Domain 2: Session Management (Q6-Q10)

| #   | Question                                                                        | Result |
| --- | ------------------------------------------------------------------------------- | ------ |
| Q6  | Is JWT session maxAge set to 7 days or less?                                    | PASS   |
| Q7  | Does the session version mechanism enable global session revocation?            | PASS   |
| Q8  | Does password change trigger `revokeAllSessionsForUser` for all devices?        | PASS   |
| Q9  | Are banned/deleted users' JWTs invalidated via `shouldInvalidateJwtSession`?    | PASS   |
| Q10 | Does the session control DB query have a timeout to prevent middleware hanging? | PASS   |

## Domain 3: Rate Limiting & Brute Force (Q11-Q15)

| #   | Question                                                                  | Result |
| --- | ------------------------------------------------------------------------- | ------ |
| Q11 | Is sign-in rate limited per email address?                                | PASS   |
| Q12 | Is password change rate limited per user (5/hour)?                        | PASS   |
| Q13 | Is password reset rate limited per email (3/hour)?                        | PASS   |
| Q14 | Is email change rate limited per user (3/hour)?                           | PASS   |
| Q15 | Does the rate limiter auto-evict expired entries to prevent memory leaks? | PASS   |

## Domain 4: Middleware & Route Protection (Q16-Q20)

| #   | Question                                                                              | Result    |
| --- | ------------------------------------------------------------------------------------- | --------- |
| Q16 | Does middleware strip internal auth headers (x-cf-\*) on all public/skip-auth paths?  | PASS      |
| Q17 | Is CVE-2025-29927 defended against (x-middleware-subrequest stripped)?                | PASS      |
| Q18 | Does `readRequestAuthContext` require pathname sentinel before trusting auth headers? | PASS      |
| Q19 | Does middleware enforce chef/client/staff route protection via role redirect?         | PASS      |
| Q20 | Does middleware enforce partner route protection?                                     | **FIXED** |

## Domain 5: RBAC (Q21-Q25)

| #   | Question                                                                      | Result |
| --- | ----------------------------------------------------------------------------- | ------ |
| Q21 | Does permission resolution merge role defaults + per-user overrides?          | PASS   |
| Q22 | Does 'manage' action imply all other actions in PermissionSet?                | PASS   |
| Q23 | Is permission resolution cached per-request via React `cache()`?              | PASS   |
| Q24 | Does `requirePermission` throw on denial with domain:action detail?           | PASS   |
| Q25 | Does tenant role fallback correctly map legacy 'chef' role to 'tenant_owner'? | PASS   |

## Domain 6: Account Lifecycle (Q26-Q30)

| #   | Question                                                                     | Result |
| --- | ---------------------------------------------------------------------------- | ------ |
| Q26 | Does signup validate email + password with Zod schemas?                      | PASS   |
| Q27 | Is email normalized (trim + lowercase) on all auth paths?                    | PASS   |
| Q28 | Is the auth user record cleaned up on signup failure?                        | PASS   |
| Q29 | Are soft-deleted/GDPR-scheduled clients blocked from authentication?         | PASS   |
| Q30 | Are suspended chef accounts blocked at `requireChef` via `_checkSuspension`? | PASS   |

## Domain 7: OAuth & External Auth (Q31-Q35)

| #   | Question                                                                                       | Result |
| --- | ---------------------------------------------------------------------------------------------- | ------ |
| Q31 | Is `allowDangerousEmailAccountLinking` set to false?                                           | PASS   |
| Q32 | Are OAuth users without a role redirected to `/auth/role-selection`?                           | PASS   |
| Q33 | Does Google OAuth signIn callback match existing auth.users by email?                          | PASS   |
| Q34 | Does OAuth role assignment create full profile (chef/client record + user_role + preferences)? | PASS   |
| Q35 | Does OAuth role assignment clear role cache cookie and revalidate paths?                       | PASS   |

## Domain 8: Cookie & Token Security (Q36-Q40)

| #   | Question                                                                                  | Result |
| --- | ----------------------------------------------------------------------------------------- | ------ |
| Q36 | Does `signRoleCookie` use HMAC-SHA256 via Web Crypto API?                                 | PASS   |
| Q37 | Does `verifyRoleCookie` reject unknown role values before comparing signature?            | PASS   |
| Q38 | Does signed cookie comparison iterate all characters without early break (constant-time)? | PASS   |
| Q39 | Does session-only cookie use httpOnly + sameSite=lax?                                     | PASS   |
| Q40 | Does cookie secure flag adapt to protocol via `resolveAuthCookieOptions`?                 | PASS   |

## Domain 9: Access Monitoring & Risk Detection (Q41-Q45)

| #   | Question                                                                                      | Result |
| --- | --------------------------------------------------------------------------------------------- | ------ |
| Q41 | Are sign-in events recorded with device, location, IP, and auth provider?                     | PASS   |
| Q42 | Does risk scoring use 4 signals (new_device, new_location, impossible_travel, session_burst)? | PASS   |
| Q43 | Do high-risk sign-ins trigger in-app notification (`account_access_alert`)?                   | PASS   |
| Q44 | Are IP addresses masked in user-facing displays?                                              | PASS   |
| Q45 | Does impossible travel detection use haversine distance with time-based thresholds?           | PASS   |

## Domain 10: Input Validation & Enumeration Prevention (Q46-Q50)

| #   | Question                                                                     | Result |
| --- | ---------------------------------------------------------------------------- | ------ |
| Q46 | Does signup return a generic error regardless of email existence?            | PASS   |
| Q47 | Does password reset always return success regardless of email existence?     | PASS   |
| Q48 | Does email change re-check uniqueness at confirmation time (TOCTOU defense)? | PASS   |
| Q49 | Is email confirmation required before credentials login?                     | PASS   |
| Q50 | Do sign-in errors use generic "Invalid email or password" (no distinction)?  | PASS   |

---

## Structural Notes (Not Fixed)

| ID  | Issue                                                                               | Why Deferred                                                                                                                |
| --- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| N/A | Middleware only sets auth context headers for chef/client roles (not staff/partner) | By design: `RequestPortalAuthContext` type only supports chef/client. Staff/partner use `auth()` directly. No security gap. |
| N/A | Role cache cookie unsigned in middleware (signed-cookie.ts exists but not wired in) | httpOnly cookie with 300s TTL, not used for auth decisions. Low risk.                                                       |
| N/A | In-memory rate limiter resets on server restart                                     | Acknowledged design choice for self-hosted single-process deployment.                                                       |

---

_Generated: 2026-04-18 | Sweep 16 of cohesiveness series (re-audit of sweep 10)_
