# System Integrity Question Set: API Routes & Data Safety

> Sweep 17 of the cohesiveness series. 50 binary pass/fail questions across 10 domains.
> Scope: 332 API route files, authentication gates, input validation, tenant scoping, file uploads, webhooks, storage, rate limiting, error handling, CORS.

## Summary

- **Score:** 49/50 PASS (98%) -> 50/50 after fix (100%)
- **Fixes applied:** 1
- **Files modified:** 1

## Fix Applied

| ID  | File                          | Fix                                                                                                                                                                                                                                                        | Severity |
| --- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Q5  | `lib/prospecting/api-auth.ts` | Pipeline key comparison (`pipelineKey === expectedKey`) replaced with `timingSafeEqual` from Node.js crypto. Prevents timing attacks against the shared secret. The webhook/reply route already used `timingSafeEqual` but the shared auth module did not. | MEDIUM   |

---

## Domain 1: Authentication Gates (Q1-Q5)

| #   | Question                                                                   | Result    |
| --- | -------------------------------------------------------------------------- | --------- |
| Q1  | Do all chef-facing API routes use `requireChef()` or equivalent auth gate? | PASS      |
| Q2  | Do all v2 API routes use `withApiAuth()` wrapper with API key validation?  | PASS      |
| Q3  | Do all cron/scheduled routes gate on `verifyCronAuth` before processing?   | PASS      |
| Q4  | Do all admin routes check `getCurrentAdminUser()` or `isAdmin()`?          | PASS      |
| Q5  | Do all API key comparisons use timing-safe comparison?                     | **FIXED** |

## Domain 2: Input Validation (Q6-Q10)

| #   | Question                                                                               | Result |
| --- | -------------------------------------------------------------------------------------- | ------ |
| Q6  | Do POST routes accepting JSON validate with Zod schemas?                               | PASS   |
| Q7  | Does the embed inquiry route use honeypot field for bot detection?                     | PASS   |
| Q8  | Does Remy stream validate input via `validateRemyInput` and `validateRemyRequestBody`? | PASS   |
| Q9  | Does the notification send route validate payload with `NotificationSendSchema`?       | PASS   |
| Q10 | Does the embed inquiry route validate emails with `validateEmailLocal`?                | PASS   |

## Domain 3: Tenant Scoping (Q11-Q15)

| #   | Question                                                                                               | Result |
| --- | ------------------------------------------------------------------------------------------------------ | ------ |
| Q11 | Do v2 routes derive `tenantId` from `ctx.tenantId` (API key), not request body?                        | PASS   |
| Q12 | Do chef-facing routes derive `tenantId` from session via `user.tenantId`?                              | PASS   |
| Q13 | Do v2 DELETE operations include tenant_id/chef_id in WHERE clause?                                     | PASS   |
| Q14 | Does notification send verify recipient is scoped to sender's tenant?                                  | PASS   |
| Q15 | Do v2 routes use tenant scoping on all SELECT/UPDATE/DELETE queries? (187 occurrences across 72 files) | PASS   |

## Domain 4: File Upload Safety (Q16-Q20)

| #   | Question                                                                | Result |
| --- | ----------------------------------------------------------------------- | ------ |
| Q16 | Does menu upload enforce file extension allowlist (ALLOWED_EXTENSIONS)? | PASS   |
| Q17 | Does menu upload enforce max file size (20 MB)?                         | PASS   |
| Q18 | Does menu upload rate limit per IP (10/minute)?                         | PASS   |
| Q19 | Does menu upload verify CSRF origin?                                    | PASS   |
| Q20 | Does menu upload check for duplicate uploads via file hash?             | PASS   |

## Domain 5: Storage & Path Traversal (Q21-Q25)

| #   | Question                                                                                                     | Result |
| --- | ------------------------------------------------------------------------------------------------------------ | ------ |
| Q21 | Does private storage route reject `..`, `.`, `\`, `/` in path segments?                                      | PASS   |
| Q22 | Does private storage route require signed token (HMAC verification)?                                         | PASS   |
| Q23 | Does public storage route restrict to allowlisted PUBLIC_BUCKETS?                                            | PASS   |
| Q24 | Does storage normalize bucket via `path.basename()` to prevent encoding-based traversal?                     | PASS   |
| Q25 | Do storage routes force download for SVG/HTML files (XSS prevention) with `X-Content-Type-Options: nosniff`? | PASS   |

## Domain 6: Webhook Security (Q26-Q30)

| #   | Question                                                                                               | Result |
| --- | ------------------------------------------------------------------------------------------------------ | ------ |
| Q26 | Does Stripe webhook verify signature via `stripe.webhooks.constructEvent`?                             | PASS   |
| Q27 | Does Stripe webhook reject missing signature header with 400?                                          | PASS   |
| Q28 | Does Resend webhook verify HMAC-SHA256 signature?                                                      | PASS   |
| Q29 | Do Twilio webhook routes validate signature via `validateTwilioWebhook` (HMAC-SHA1 + timingSafeEqual)? | PASS   |
| Q30 | Does Stripe webhook check for configured STRIPE_WEBHOOK_SECRET and fail closed?                        | PASS   |

## Domain 7: Rate Limiting (Q31-Q35)

| #   | Question                                                             | Result |
| --- | -------------------------------------------------------------------- | ------ |
| Q31 | Do v2 routes rate limit at 100 req/min per tenant via `withApiAuth`? | PASS   |
| Q32 | Does notification send rate limit at 30/minute per IP?               | PASS   |
| Q33 | Does embed inquiry rate limit per IP?                                | PASS   |
| Q34 | Does Remy stream check rate limit?                                   | PASS   |
| Q35 | Do both rate limiters (auth + API) auto-evict expired entries?       | PASS   |

## Domain 8: Error Handling (Q36-Q40)

| #   | Question                                                                               | Result |
| --- | -------------------------------------------------------------------------------------- | ------ |
| Q36 | Do v2 routes use `apiServerError()` for unhandled exceptions (no stack traces leaked)? | PASS   |
| Q37 | Does storage return generic "File not found" on fs.readFile failure (no path leakage)? | PASS   |
| Q38 | Does the notification route return generic error messages to clients?                  | PASS   |
| Q39 | Does Remy stream use `sanitizeErrorForClient` for SSE error responses?                 | PASS   |
| Q40 | Do webhook routes log errors internally but return minimal JSON to callers?            | PASS   |

## Domain 9: CORS & Headers (Q41-Q45)

| #   | Question                                                                                               | Result |
| --- | ------------------------------------------------------------------------------------------------------ | ------ |
| Q41 | Does embed inquiry set proper CORS headers (Access-Control-Allow-Origin: \*)?                          | PASS   |
| Q42 | Do storage routes set X-Content-Type-Options: nosniff?                                                 | PASS   |
| Q43 | Do CSRF-protected routes check origin via `verifyCsrfOrigin`? (6 routes)                               | PASS   |
| Q44 | Does middleware set X-Request-ID correlation header on every response?                                 | PASS   |
| Q45 | Do API routes return proper HTTP status codes (401 for unauth, 403 for forbidden, 429 for rate limit)? | PASS   |

## Domain 10: v2 API Design (Q46-Q50)

| #   | Question                                                                 | Result |
| --- | ------------------------------------------------------------------------ | ------ |
| Q46 | Does `withApiAuth` check API key expiry (`expires_at < now`)?            | PASS   |
| Q47 | Does `withApiAuth` enforce scope requirements (`hasAllScopes`)?          | PASS   |
| Q48 | Are API keys stored as SHA-256 hashes (not plaintext)?                   | PASS   |
| Q49 | Does `withApiAuth` support optional feature flag gating per route?       | PASS   |
| Q50 | Does `withApiAuth` update `last_used_at` non-blocking (fire-and-forget)? | PASS   |

---

## Structural Notes (Not Fixed)

| Issue                                                                                                                    | Why Deferred                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `verifyCsrfOrigin` only adopted on 6 routes; other POST routes rely on SameSite=Lax + Server Action built-in CSRF        | Adequate for current threat model. Server Actions have native CSRF. API routes are either webhook-verified, API-key-gated, or session-gated. |
| OAuth callback routes (Square, QuickBooks, Instagram, DocuSign, Google) use state parameter validation, not session auth | By design: OAuth callbacks use CSRF state tokens stored in DB, not session auth. State is verified and deleted after use.                    |
| Only simulation route sets `maxDuration`                                                                                 | Other routes complete well within default timeout. No fix needed.                                                                            |

---

_Generated: 2026-04-18 | Sweep 17 of cohesiveness series_
