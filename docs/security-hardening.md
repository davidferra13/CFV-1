# Security Hardening — ChefFlow V1

**Date:** 2026-02-19
**Branch:** feature/packing-list-system
**Audit scope:** Auth, middleware, server actions, RLS, API routes, environment, HTTP headers, dependencies

---

## What We Found (and Fixed)

### Pre-existing Strengths

Before this audit, the following security foundations were already in place:

| Area | Status |
| --- | --- |
| Supabase RLS enabled on all tables | ✅ Solid |
| Stripe webhook signature verification | ✅ Solid |
| All server actions call requireChef()/requireClient() | ✅ Solid |
| Zod validation on every server action input | ✅ Solid |
| Cron/scheduled routes protected by CRON_SECRET | ✅ Solid |
| No eval(), no SQL concatenation, no dangerouslySetInnerHTML | ✅ Solid |
| No hardcoded secrets in source code | ✅ Solid |
| Immutable ledger enforced by DB triggers | ✅ Solid |
| FSM state transitions validated in code + DB | ✅ Solid |

---

## Changes Made

### Fix 1 — HTTP Security Headers (`next.config.js`)

**What was missing:** The existing headers covered HSTS, X-Content-Type-Options, X-Frame-Options, and Referrer-Policy. Three headers were absent.

**What was added:**

| Header | Value | Purpose |
| --- | --- | --- |
| `X-XSS-Protection` | `1; mode=block` | Legacy XSS filter for older browsers |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=(), payment=(self "https://js.stripe.com")` | Restricts browser API access |
| `Content-Security-Policy` | See below | Blocks code injection, clickjacking, data exfiltration |

**CSP breakdown:**

- `script-src 'self' 'unsafe-inline' https://js.stripe.com` — `unsafe-inline` required by Next.js 14 RSC hydration; restricted to Stripe.js externally
- `connect-src` locked to Supabase, Stripe, and Google OAuth origins
- `frame-src https://js.stripe.com` — Stripe Elements iframes only
- `frame-ancestors 'none'` — modern clickjacking prevention (supersedes X-Frame-Options for CSP-capable browsers)
- `object-src 'none'` — blocks Flash/plugins
- `base-uri 'self'` — prevents base-tag injection attacks

**Note on `unsafe-inline`:** Removing it from `script-src` requires a nonce-based CSP, which is a larger refactor involving Next.js middleware generating per-request nonces. The current CSP still provides meaningful protection via `object-src`, `base-uri`, `connect-src`, and `frame-ancestors`.

**File changed:** `next.config.js`

---

### Fix 2 — Open Redirect in Signin Page (`app/auth/signin/page.tsx`)

**Vulnerability:** The `?redirect=` query parameter was passed directly to `router.push()` without validation. An attacker could send a phishing link like:

```text
https://yoursite.com/auth/signin?redirect=https://evil.com
```

After login, the user would be sent to `evil.com` with no warning.

**Fix:** Added a `safeRedirectPath()` guard that:

1. Parses the raw path using the `URL` constructor
2. Rejects anything with an external origin (only allows same-origin paths)
3. Falls back to `/` on any invalid input

The guard function is defined at module scope (outside the component) so it is not recreated on every render.

**File changed:** `app/auth/signin/page.tsx`

**Note:** The signup pages (`/auth/signup`, `/auth/client-signup`) always redirect to `/auth/signin` on success with no dynamic redirect parameter — no change needed there.

---

### Fix 3 — `getEventById()` Tenant Scoping (Reviewed, No Change)

**Audit flag:** The function at `lib/events/actions.ts:225` does not include an explicit `.eq('tenant_id', user.tenantId!)` filter.

**Resolution:** This is **intentional and correct**. The comment at lines 219–223 explains:

> Access is enforced entirely by RLS: event owners via the existing tenant_id policy; accepted collaborators via the `collaborators_can_view_events` policy (migration 20260304000008). The explicit tenant_id filter has been removed so both groups can load the page.

Adding back the filter would break collaborator access to shared events. The RLS policy is the correct enforcement layer here.

**Action taken:** No code change. The exception is documented and intentional.

---

### Fix 4 — Persistent Rate Limiting (`lib/rateLimit.ts`, `lib/auth/actions.ts`)

**Vulnerability:** The previous rate limiter was an in-memory Map that:

- Reset on every deploy
- Was per-process (bypassed on multi-instance Vercel deployments)
- Could be exhausted across N servers with N×5 attempts per window

**Fix:** Created `lib/rateLimit.ts` — a unified rate limiter that:

1. Uses **Upstash Redis** (free tier, persistent) when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` env vars are set
2. Falls back to the in-memory limiter automatically if Upstash is not configured
3. Uses sliding window algorithm (Upstash mode) for accurate rate counting

Updated `lib/auth/actions.ts` to import from `lib/rateLimit.ts` and `await` all three call sites (`signUpChef`, `signUpClient`, `signIn`).

**To activate Upstash (free):**

1. Create a free database at <https://upstash.com> (free tier: 10,000 commands/day)
2. Copy the REST URL and token
3. Add to Vercel environment variables:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. Redeploy — the limiter automatically switches to persistent mode

**Note:** Even without Upstash, Supabase Auth has its own built-in rate limiting as a second layer.

**Files changed:** `lib/rateLimit.ts` (created), `lib/auth/actions.ts`

---

### Fix 5 — Stripe Webhook Metadata Validation (`app/api/webhooks/stripe/route.ts`)

**Vulnerability:** The `handlePaymentSucceeded` function extracted `event_id` and `tenant_id` from `paymentIntent.metadata` but did not verify these values against the database before writing to the ledger. A crafted PaymentIntent with arbitrary metadata could potentially trigger a ledger entry for an event the payer doesn't own.

**Fix:** Added a DB ownership check immediately after metadata extraction:

```typescript
const { data: ownershipCheck } = await supabaseAdmin
  .from('events')
  .select('id')
  .eq('id', event_id)
  .eq('tenant_id', tenant_id)
  .single()

if (!ownershipCheck) {
  throw new Error('Payment metadata does not match a known event for this tenant')
}
```

If the check fails, the handler throws (returning HTTP 500 to Stripe for retry), and no ledger entry is written.

Also: Removed a redundant `createServerClient({ admin: true })` call — the function now reuses the single `supabaseAdmin` client for both the ownership check and the financial summary query.

**File changed:** `app/api/webhooks/stripe/route.ts`

---

### Fix 6 — Gift Card Code Entropy (`app/api/webhooks/stripe/route.ts`)

**Issue:** Gift card codes were generated with `crypto.randomBytes(4)` = 32 bits of entropy (~4 billion possible codes). While brute force is impractical with rate limiting, it's below the 64-bit minimum recommended for secret tokens.

**Fix:** Changed to `crypto.randomBytes(8)` = 64 bits of entropy (18 quintillion possible codes). One-character change at the point of code generation.

**File changed:** `app/api/webhooks/stripe/route.ts`

---

### Fix 7 — Gitignore Backup Env Files (`.gitignore`)

**Issue:** `.env.local.backup-20260219-012523` appeared in `git status` as untracked. While not yet committed, it was at risk of being accidentally staged.

**Fix:** Added two patterns to `.gitignore`:

```text
.env.local.backup*
.env.local.dev
```

**File changed:** `.gitignore`

---

## Remaining Vulnerabilities (Require Separate Decision)

### Next.js 14.x → 16.x Upgrade (Medium Risk, Breaking Change)

`npm audit` reports two CVEs against `next@14.2.x`:

| CVE | Description | Our Risk |
| --- | --- | --- |
| `GHSA-9g9p-9gw9-jx7f` | Image Optimizer DoS via wildcard remotePatterns | **Low** — our remotePatterns uses a specific hostname, not a wildcard |
| `GHSA-h25m-26qc-wcjf` | RSC deserialization DoS | **Medium** — we use RSC; Vercel DDoS protection mitigates impact |

**Fix:** `npm install next@16` — however, this is a major version bump and requires testing for breaking changes. Recommended as a separate tracked task.

### Dev-Tool Vulnerabilities (Low Risk, No Production Impact)

The following packages have vulnerabilities that only affect the build/linting toolchain, not the running production app:

- `ajv` (ReDoS in ESLint)
- `glob`, `minimatch` (ReDoS/command injection in Webpack/ESLint)
- `ejs`, `del`, `rimraf`, `clean-webpack-plugin` (in next-pwa build tooling)

These are **not exploitable at runtime** — they only run locally during `npm run build`. They can be resolved by upgrading to next-pwa's newer fork (`@ducanh2912/next-pwa`) or by removing next-pwa entirely.

---

## How to Verify These Changes

| Fix | Verification |
| --- | --- |
| HTTP headers | Deploy preview → [securityheaders.com](https://securityheaders.com) — should score A or better |
| Open redirect | Browse to `/auth/signin?redirect=https://evil.com` → must land on `/` after login, not evil.com |
| Rate limiter | Attempt signin 6× with same email in 15 min → 6th attempt must be rejected |
| Upstash (when configured) | Check Upstash dashboard for command counts after login attempts |
| Stripe metadata validation | Confirmed by code review; visible in server logs if triggered |
| Gift card entropy | `crypto.randomBytes(8)` confirmed in source |
| Gitignore | `git status` must no longer show `.env.local.backup*` files |

---

## Packages Updated by `npm audit fix`

| Package | From | To | Vulnerability |
| --- | --- | --- | --- |
| `jspdf` | 4.1.0 | 4.2.0 | PDF injection via AcroForm and addJS |
| `tar` | 7.5.7 | 7.5.9 | Arbitrary file read/write via symlink |
| `supabase` CLI | 2.76.8 | 2.76.11 | Inherited tar fix |
| `@typescript-eslint/*` | 8.55.0 | 8.56.0 | minimatch ReDoS in linting tools |
