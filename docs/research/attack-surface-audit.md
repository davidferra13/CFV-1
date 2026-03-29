# Research: Attack Surface Audit

> **Date:** 2026-03-29
> **Question:** What are all possible attack vectors against the ChefFlow application?
> **Status:** complete

## Summary

The application has a solid security foundation: CSP headers, signed storage URLs, bcrypt passwords, HMAC-verified webhooks, CRON_SECRET-protected scheduled routes, and Zod validation on most inputs. However, there are several findings ranging from critical to informational that warrant attention. The most significant issues are: (1) the SSE realtime channel has zero authentication, allowing cross-tenant data eavesdropping; (2) the DocuSign webhook skips signature verification when the HMAC key is not configured; (3) the `allowDangerousEmailAccountLinking` in Google OAuth could allow account takeover; (4) the prospecting webhook uses non-timing-safe string comparison for its API key; and (5) document API routes bypass middleware auth but implement their own auth internally (defense-in-depth gap).

---

## 1. SSE/Realtime Channel Security

### FINDING 1.1: SSE Channel Has No Authentication or Authorization

- **Severity:** Critical
- **File:** `app/api/realtime/[channel]/route.ts:7-68`
- **What's wrong:** The SSE endpoint accepts any channel name as a URL parameter and subscribes the caller to it. There is no authentication check (no `requireChef()`, `requireClient()`, or `requireAuth()`). The route is in the middleware skip list (`/api/realtime` is in `API_SKIP_AUTH_PREFIXES` at `lib/auth/route-policy.ts:190`).
- **Attack chain:**
  1. Attacker discovers channel naming convention (e.g., `tenant:{chef-id}`, `presence:dashboard:{chef-id}`)
  2. Attacker opens `GET /api/realtime/tenant:{victim-chef-id}` from any browser
  3. Attacker receives all real-time broadcasts for that tenant: new inquiries, event updates, financial changes, typing indicators, presence data
  4. If UUIDs are known (from public chef profiles or embed widgets), any tenant's channel is subscribable
- **Status:** Vulnerable

### FINDING 1.2: SSE Presence Data Leaks to Unauthenticated Users

- **Severity:** High
- **File:** `lib/realtime/sse-server.ts:29-34`, `app/api/realtime/[channel]/route.ts:27-34`
- **What's wrong:** When connecting to a `presence:` channel, the server immediately sends the full presence state (who is online, with their data). No authorization check.
- **Attack chain:** Same as 1.1 but specifically targeting presence channels to enumerate active users and their session data.
- **Status:** Vulnerable

---

## 2. Authentication & Session Security

### FINDING 2.1: Google OAuth allowDangerousEmailAccountLinking

- **Severity:** High
- **File:** `lib/auth/auth-config.ts:133`
- **What's wrong:** `allowDangerousEmailAccountLinking: true` is set on the Google OAuth provider. This means if an attacker controls a Google account with the same email as an existing ChefFlow user, they can log in as that user without knowing their password. Auth.js explicitly warns this is dangerous.
- **Attack chain:**
  1. Attacker knows victim's email (e.g., from a public chef profile)
  2. Attacker creates or controls a Google account with that email
  3. Attacker signs in via Google OAuth
  4. Auth.js links to the existing `auth.users` record by email match (`auth-config.ts:159-173`)
  5. Attacker gets full access to the victim's account
- **Mitigation factor:** Google requires email verification, so the attacker would need to actually own/control that email address. The risk is real for compromised email accounts.
- **Status:** Needs Discussion (this is an intentional tradeoff for UX, but should be documented as a known risk)

### FINDING 2.2: 30-Day JWT Session with No Rotation

- **Severity:** Medium
- **File:** `lib/auth/auth-config.ts:139`
- **What's wrong:** JWT sessions last 30 days (`maxAge: 30 * 24 * 60 * 60`). There is no token rotation, no refresh token mechanism, and no server-side session revocation capability. If a JWT is stolen (e.g., via XSS in a dependency), it remains valid for 30 days with no way to revoke it.
- **Attack chain:**
  1. Attacker steals JWT cookie via browser extension, shoulder surfing, or dependency vulnerability
  2. JWT works for 30 days; no server-side check can invalidate it
  3. Changing password does not invalidate existing sessions
- **Mitigation factor:** Cookies are HttpOnly and SameSite=Lax, reducing XSS cookie theft risk.
- **Status:** Needs Discussion (acceptable for self-hosted, but should be documented)

### FINDING 2.3: E2E Auth Route Production Guard

- **Severity:** Low
- **File:** `app/api/e2e/auth/route.ts:19-29`
- **What's wrong:** The E2E auth route has a `NODE_ENV === 'production'` guard plus an env var check. However, the route is in the middleware skip list (`/api/e2e` in `API_SKIP_AUTH_PREFIXES`). If somehow `NODE_ENV` is not `production` on the live server (e.g., misconfigured start script), this endpoint would be accessible.
- **Status:** Protected (defense in depth is adequate; the double-gate pattern is good)

### FINDING 2.4: No Account Lockout After Failed Attempts

- **Severity:** Medium
- **File:** `lib/rateLimit.ts:14-32`, `lib/auth/actions.ts:404-415`
- **What's wrong:** The rate limiter allows 10 attempts per 15 minutes per email. After the window resets, the attacker gets 10 more attempts. There is no escalating lockout, no CAPTCHA on login, and no account lockout after N failures.
- **Attack chain:**
  1. Attacker targets a specific email
  2. Tries 10 passwords, waits 15 minutes, tries 10 more
  3. At 40 attempts/hour, 960 attempts/day - slow brute force is viable for weak passwords
- **Status:** Needs Improvement

---

## 3. Webhook Signature Verification

### FINDING 3.1: DocuSign Webhook Skips Verification When HMAC Key Missing

- **Severity:** High
- **File:** `app/api/webhooks/docusign/route.ts:9-18`
- **What's wrong:** The `verifyHmacSignature` function returns `true` when `DOCUSIGN_CONNECT_HMAC_KEY` is not configured. Combined with the logic at line 26 (`if (signature && !verify...)`), if no signature header is present AND no HMAC key is configured, the webhook accepts any payload.
- **Attack chain:**
  1. Attacker discovers `/api/webhooks/docusign` endpoint
  2. If `DOCUSIGN_CONNECT_HMAC_KEY` is not set (which the code explicitly handles as "dev mode")
  3. Attacker sends `POST /api/webhooks/docusign` with `{"envelopeId": "<target>", "status": "completed"}`
  4. The webhook marks the contract as signed without actual DocuSign confirmation
- **Mitigation factor:** Only exploitable if the env var is not set in production.
- **Status:** Vulnerable (fail-open, unlike Resend and Twilio which fail-closed)

### FINDING 3.2: Stripe Webhook - Properly Protected

- **File:** `app/api/webhooks/stripe/route.ts:25-49`
- **What's right:** Signature is required, verified via `stripe.webhooks.constructEvent()`, fails if missing or invalid.
- **Status:** Protected

### FINDING 3.3: Resend Webhook - Properly Protected

- **File:** `app/api/webhooks/resend/route.ts:56-73`
- **What's right:** HMAC verification, fail-closed when secret not configured.
- **Status:** Protected

### FINDING 3.4: Twilio Webhook - Properly Protected

- **File:** `app/api/webhooks/twilio/route.ts:34-66`
- **What's right:** Signature validation, timing-safe comparison, fail-closed when auth token not configured.
- **Status:** Protected

### FINDING 3.5: Wix Webhook - Properly Protected

- **File:** `app/api/webhooks/wix/route.ts:18-71`
- **What's right:** Secret via header only (not URL), DB lookup, timing-safe comparison.
- **Status:** Protected

### FINDING 3.6: Generic Provider Webhook - Adequately Protected

- **File:** `app/api/webhooks/[provider]/route.ts:35-48`
- **What's right:** Requires `x-chefflow-webhook-secret` header, validates against DB.
- **Status:** Protected

---

## 4. Prospecting Webhook

### FINDING 4.1: Non-Timing-Safe API Key Comparison

- **Severity:** Medium
- **File:** `app/api/prospecting/webhook/reply/route.ts:38`
- **What's wrong:** `pipelineKey !== expectedKey` uses JavaScript's native string comparison, which is not timing-safe. An attacker can use timing side-channels to determine the API key one character at a time.
- **Attack chain:**
  1. Attacker sends requests with incrementally correct key prefixes
  2. Measures response time differences
  3. Over many requests, reconstructs the full API key
- **Mitigation factor:** Requires many requests and precise timing measurements; the rate limiter (30 req/min) makes this harder but not impossible over time.
- **Status:** Vulnerable (should use `crypto.timingSafeEqual`)

---

## 5. API Route Auth Coverage

### FINDING 5.1: Document API Routes Bypass Middleware Auth but Have Internal Auth

- **Severity:** Low
- **File:** `lib/auth/route-policy.ts:180` (`/api/documents` in `API_SKIP_AUTH_PREFIXES`)
- **What's wrong:** All `/api/documents/*` routes are in the middleware bypass list. However, each individual route handler does call `requireChef()`, `requireClient()`, or `requireAuth()` internally. This means auth IS enforced, but there's a defense-in-depth gap: if a developer adds a new document route and forgets the auth call, it would be public.
- **Status:** Protected (but fragile; consider removing from bypass list)

### FINDING 5.2: Inngest Route Has No Custom Auth

- **Severity:** Medium
- **File:** `app/api/inngest/route.ts:1-28`
- **What's wrong:** The Inngest route (`/api/inngest`) is in the middleware bypass list. It uses `serve()` from the Inngest SDK which has its own signing key verification. However, if `INNGEST_SIGNING_KEY` is not configured, the SDK may accept unsigned requests.
- **Attack chain:**
  1. Attacker discovers `/api/inngest` endpoint
  2. If signing key is not configured, attacker can invoke any registered Inngest function
  3. This could trigger thank-you emails, review requests, referral asks, commerce reconciliation
- **Status:** Needs Testing (depends on Inngest SDK configuration)

### FINDING 5.3: V2 API Routes Use API Key Auth (Properly)

- **File:** `lib/api/v2/middleware.ts:47-92`
- **What's right:** All v2 routes use `withApiAuth` which validates API keys, enforces rate limits, checks scopes.
- **Status:** Protected

### FINDING 5.4: All 27 Scheduled Routes Use verifyCronAuth

- **What's right:** Every file in `app/api/scheduled/` uses `verifyCronAuth` with `CRON_SECRET`.
- **Status:** Protected

### FINDING 5.5: Both Cron Routes Use verifyCronAuth

- **File:** `app/api/cron/circle-digest/route.ts:12`, `app/api/cron/developer-digest/route.ts:15`
- **Status:** Protected

---

## 6. Rate Limiting Gaps

### FINDING 6.1: In-Memory Rate Limiter Resets on Restart

- **Severity:** Medium
- **File:** `lib/rateLimit.ts:4`
- **What's wrong:** The rate limiter uses an in-memory `Map`. When the server restarts (deploy, crash, `npm run prod`), all rate limit state is lost. An attacker who notices a restart gets a fresh window.
- **Status:** Needs Discussion (acceptable for self-hosted single-process)

### FINDING 6.2: Endpoints Without Rate Limiting

- **Severity:** Medium
- **What's wrong:** The following API routes accept user input but have no rate limiting:
  - `app/api/push/subscribe/route.ts` - push subscription registration
  - `app/api/push/unsubscribe/route.ts` - push unsubscribe (has rate limiting)
  - `app/api/push/resubscribe/route.ts` - push resubscribe (has rate limiting)
  - `app/api/activity/feed/route.ts` - activity feed queries (authenticated but unbounded)
  - `app/api/reports/financial/route.ts` - financial report generation
  - `app/api/scheduling/availability/route.ts` - availability queries
  - `app/api/notifications/send/route.ts` - notification dispatch
  - Most document generation routes (`/api/documents/*`) - PDF generation is CPU-intensive
- **Attack chain:** Authenticated attacker rapidly generates PDFs or queries, consuming server resources (DoS against self-hosted machine).
- **Status:** Needs Improvement (especially for CPU-intensive PDF routes)

---

## 7. File Storage Attack Surface

### FINDING 7.1: Path Traversal Protection (Adequate)

- **File:** `lib/storage/index.ts:16-26`, `app/api/storage/[...path]/route.ts:29-33`
- **What's right:** Both the storage lib and API route check for `..` and `.` segments. `path.basename()` sanitizes bucket names.
- **Status:** Protected

### FINDING 7.2: Signed URLs Use Timing-Safe Comparison

- **File:** `lib/storage/index.ts:123-133`
- **What's right:** `crypto.timingSafeEqual` for HMAC verification.
- **Status:** Protected

### FINDING 7.3: Public Storage Route Has No Auth

- **Severity:** Low
- **File:** `app/api/storage/public/[...path]/route.ts:1-40`
- **What's wrong:** The public storage route serves any file from the storage directory without authentication or signed tokens. If a file is placed in storage (intended to be private) but is accessible via the public path pattern, it can be accessed by anyone.
- **Mitigation factor:** Requires knowing the exact bucket and file path. Files are stored with UUIDs.
- **Status:** Protected (by design; public bucket for public assets)

### FINDING 7.4: Storage Signing Secret Fallback

- **Severity:** Medium
- **File:** `lib/storage/index.ts:7`
- **What's wrong:** If neither `NEXTAUTH_SECRET` nor `AUTH_SECRET` is set, the signing secret falls back to `'dev-signing-secret'`. In production, if secrets are misconfigured, all signed URLs would use a known, guessable key.
- **Status:** Needs Testing (verify production has the env var set)

---

## 8. Input Validation

### FINDING 8.1: SQL Injection Protection (Adequate)

- **File:** `lib/documents/snapshot-actions.ts:480-484`, `lib/openclaw/catalog-actions.ts:465`
- **What's right:** All SQL uses Drizzle ORM parameterized queries or the `sql` tagged template literal which auto-parameterizes. No raw string concatenation found.
- **Status:** Protected

### FINDING 8.2: dangerouslySetInnerHTML Usage

- **Severity:** Low
- **Files:** 14 files use `dangerouslySetInnerHTML`
- **What's right:** Most uses are for JSON-LD (`components/seo/json-ld.tsx:11`) which uses `JSON.stringify(data)` on server-controlled data, or for color palette injection (`components/ui/color-palette-provider.tsx`) with CSS variables. The public-facing pages (`app/(public)/chef/[slug]/page.tsx`, `app/(public)/customers/[slug]/page.tsx`, etc.) use it for rendering markdown/HTML content.
- **Risk:** If any user-controlled content is stored as HTML and rendered via `dangerouslySetInnerHTML` on public pages (e.g., chef bios, customer testimonials), there is a stored XSS risk.
- **Status:** Needs Testing (audit each `dangerouslySetInnerHTML` call site for user input)

### FINDING 8.3: Server Action Body Size Limit

- **Severity:** Info
- **File:** `next.config.js:47`
- **What's noted:** `bodySizeLimit: '50mb'` for server actions is generous. While needed for photo uploads, it means any server action can receive 50MB payloads.
- **Status:** Info (acceptable for the use case)

---

## 9. CORS/CSP Configuration

### FINDING 9.1: CSP Is Well-Configured

- **File:** `next.config.js:117-261`
- **What's right:** Proper CSP with `default-src 'self'`, no `unsafe-eval` in production, `frame-ancestors 'none'` for main app (only `*` for embed routes, which is intentional). HSTS, X-Content-Type-Options, X-Frame-Options all set.
- **Status:** Protected

### FINDING 9.2: Embed Route CORS Is Wildcard (By Design)

- **File:** `app/api/embed/inquiry/route.ts:14-18`
- **What's noted:** `Access-Control-Allow-Origin: *` is set. This is intentional for embeddable widgets.
- **Status:** Protected (by design; rate-limited and validated)

### FINDING 9.3: unsafe-inline in Script-Src

- **Severity:** Info
- **File:** `next.config.js:246`
- **What's noted:** `script-src 'self' 'unsafe-inline'` is required by Next.js App Router for hydration scripts. This is a known limitation. Without nonce support in Next.js 14, this cannot be eliminated.
- **Status:** Info (known Next.js limitation)

---

## 10. CSRF Protection

### FINDING 10.1: CSRF Bypass When No Origin/Referer

- **Severity:** Low
- **File:** `lib/security/csrf.ts:22-24`
- **What's wrong:** `verifyCsrfOrigin` returns `null` (allow) when neither Origin nor Referer headers are present. The comment explains the rationale (some browsers strip these), but this means a request from a tool like `curl` or a stripped-header browser extension would bypass CSRF checks.
- **Mitigation factor:** SameSite=Lax cookies provide primary CSRF protection. The Origin check is defense-in-depth.
- **Status:** Protected (SameSite=Lax is the primary defense)

---

## 11. Error Information Leakage

### FINDING 11.1: Source Maps Hidden in Production

- **File:** `next.config.js:292`
- **What's right:** `hideSourceMaps: true` in Sentry config.
- **Status:** Protected

### FINDING 11.2: Error Messages Are Generic in API Responses

- **What's right:** Most catch blocks return generic messages like "Failed to generate invoice" while logging the full error server-side. Example: `app/api/documents/invoice/[eventId]/route.ts:39-48`.
- **Status:** Protected

### FINDING 11.3: E2E Auth Route Leaks Stack Traces

- **Severity:** Low
- **File:** `app/api/e2e/auth/route.ts:128`
- **What's wrong:** `err?.message` is returned to the client on error. Could contain internal details.
- **Mitigation factor:** Only accessible in non-production mode.
- **Status:** Protected (non-production only)

---

## 12. Specific Attack Chains

### Attack Chain A: Cross-Tenant Data Exfiltration via SSE (Critical)

1. Attacker creates a ChefFlow account (free, no verification needed beyond email)
2. Attacker finds target chef's UUID from public profile page, embed widget, or API
3. Attacker opens `EventSource('https://app.cheflowhq.com/api/realtime/tenant:{target-uuid}')`
4. Attacker receives all real-time events: new inquiries (with client PII), event updates, financial changes, typing indicators
5. No authentication required; no rate limiting on SSE connections

### Attack Chain B: Fake Contract Signing via DocuSign (High)

1. Attacker discovers `/api/webhooks/docusign` endpoint
2. If `DOCUSIGN_CONNECT_HMAC_KEY` is not set in production
3. Attacker crafts `POST /api/webhooks/docusign` with `{"envelopeId": "<known-id>", "status": "completed", "completedDateTime": "2026-03-29T..."}`
4. Contract status changes to "signed" without actual DocuSign verification
5. This could trigger downstream automations (Zapier webhooks for contract.signed)

### Attack Chain C: Slow Brute Force Against Known Chef Emails (Medium)

1. Attacker collects chef emails from public profiles at `/chefs`
2. Attacker sends 10 password attempts per 15-minute window per email
3. No CAPTCHA, no escalating lockout, no notification to the user
4. At 960 attempts/day, common passwords can be tested within days

---

## Gaps and Unknowns

1. **Inngest signing key configuration** - Could not determine if `INNGEST_SIGNING_KEY` is set in production without checking `.env.local` (gitignored)
2. **Storage signing secret in production** - Same; need to verify `NEXTAUTH_SECRET` or `AUTH_SECRET` is set
3. **DocuSign HMAC key in production** - Need to verify `DOCUSIGN_CONNECT_HMAC_KEY` is configured
4. **dangerouslySetInnerHTML content sources** - Would need runtime testing to verify if any user-controlled HTML is rendered unsafely on public pages
5. **Turnstile configuration in production** - If `TURNSTILE_SECRET_KEY` is not set, the embed inquiry form has no CAPTCHA protection (but this is fail-closed in production per `lib/security/turnstile.ts:31-33`)

---

## Recommendations

### Quick Fixes

1. **Add auth to SSE endpoint** - Add `requireAuth()` or at minimum validate the channel name contains the authenticated user's tenant ID. This is the highest priority fix. (`app/api/realtime/[channel]/route.ts`)
2. **Make DocuSign webhook fail-closed** - Change `verifyHmacSignature` to return `false` when secret is not configured (same pattern as Resend/Twilio). (`app/api/webhooks/docusign/route.ts:12`)
3. **Use timing-safe comparison for prospecting webhook** - Replace `pipelineKey !== expectedKey` with `crypto.timingSafeEqual`. (`app/api/prospecting/webhook/reply/route.ts:38`)

### Needs a Spec

4. **Session revocation** - Implement a server-side session blacklist (e.g., store revoked JTIs in the database) so that password changes invalidate all sessions. Alternatively, reduce JWT maxAge to 24 hours and implement silent refresh.
5. **Login security hardening** - Add CAPTCHA (Turnstile) on login after N failed attempts. Implement escalating lockout (e.g., 10 failures = 1hr lockout, 20 = 24hr).
6. **Rate limiting for document generation** - Add per-user rate limits on CPU-intensive PDF generation routes.

### Needs Discussion

7. **allowDangerousEmailAccountLinking** - Decide whether the UX benefit of seamless Google linking outweighs the account takeover risk for compromised email accounts. If keeping it, document it as a known risk.
8. **Remove /api/documents from middleware bypass** - These routes already have internal auth, but being in the bypass list creates a defense-in-depth gap.
9. **In-memory rate limiter durability** - For a single-process self-hosted app, this is acceptable. If multi-process or multi-instance is ever considered, this needs to move to Redis/SQLite.
