# Research: Comprehensive Cybersecurity Audit

> **Date:** 2026-03-29
> **Question:** What are all possible cybersecurity threats to ChefFlow, what is currently protected, what was found vulnerable, and what was fixed?
> **Status:** complete

## Summary

A full-stack security audit identified 4 critical vulnerabilities, 7 high-priority issues, and verified 12 security controls as working correctly. The critical issues (SSE channel eavesdropping, plaintext password reset tokens, expiration bypass, hardcoded signing secret) were fixed immediately. External research confirmed that AI-generated code has a 45% vulnerability rate and that ChefFlow's specific stack (Next.js 14, self-hosted) is safe from the two most dangerous 2025 CVEs.

---

## Part 1: External Threat Research

### AI-Generated Code Vulnerability Landscape (2025-2026)

The user's concern that AI-built apps are predictable and exploitable is validated by research:

- **45% of AI-generated code contains security flaws** (Veracode, 100 LLMs tested)
- **2.74x more vulnerabilities** than human-written code
- **322% more privilege escalation paths**
- AI-generated code now causes **1 in 5 breaches**
- Armis "Trusted Vibing Benchmark" found **100% failure rate** in generating fully secure code across 18 models and 31 scenarios
- The #1 AI-generated vulnerability: **missing input sanitization**

**Relevance to ChefFlow:** Every line of code was AI-generated. The audit below specifically tests for the common AI failure modes.

### Slopsquatting (AI Package Hallucination Attack)

AI code generators hallucinate package names. Attackers register those names on npm with malware. 20% of AI-generated code recommends packages that don't exist. 43% of hallucinated names are suggested consistently.

**ChefFlow status:** package.json was not audited for hallucinated dependencies in this session. Flagged for future audit.

### Next.js CVEs (Verified Safe)

| CVE            | Description                                                 | Severity  | ChefFlow Status                             |
| -------------- | ----------------------------------------------------------- | --------- | ------------------------------------------- |
| CVE-2025-29927 | Middleware auth bypass via `x-middleware-subrequest` header | Critical  | **SAFE** - Fixed in 14.2.25, we run 14.2.35 |
| CVE-2025-66478 | Remote code execution via Server Components                 | CVSS 10.0 | **NOT AFFECTED** - Only affects Next.js 15+ |

### Claude Code CVE (Developer Tooling)

| CVE            | Description                                                | Status                                   |
| -------------- | ---------------------------------------------------------- | ---------------------------------------- |
| CVE-2025-59536 | Config injection RCE via malicious `.claude/settings.json` | Fixed in Claude Code v1.0.111 (Oct 2025) |

### Bot/Swarm Attack Landscape

- Small businesses face automated attacks every **11 seconds**
- **OpenBullet 2** is the primary credential stuffing tool with 100+ SaaS-targeting configs
- AI agents now automate credential stuffing with CAPTCHA solving and behavioral simulation
- Average credential stuffing breach cost: **$4.8 million**

---

## Part 2: Vulnerabilities Found and Fixed

### CRITICAL-1: SSE Realtime Channel Eavesdropping (FIXED)

**File:** `app/api/realtime/[channel]/route.ts`
**Before:** Used `channel.includes(tenantId)` for authorization (weak substring match). Channels like `events:{eventId}` and `chat:{conversationId}` don't contain the tenantId, so authentication was effectively bypassed for those channel types.
**Impact:** Any authenticated user could subscribe to any chef's notifications, chat messages, event updates, and activity feeds.
**Fix:** Replaced with `validateChannelAccess()` that:

- Exact-matches tenantId for `notifications:` and `activity:` channels
- Verifies event/conversation ownership via DB query for `events:` and `chat:` channels
- Recursively validates inner channels for `presence:` channels
- Fails closed on unknown channel prefixes

**File:** `app/api/realtime/presence/route.ts`
**Before:** Zero authentication. Any unauthenticated request could inject presence data.
**Fix:** Added `auth()` session check + tenant ID verification.

**File:** `app/api/realtime/typing/route.ts`
**Before:** Zero authentication. Accepted client-supplied `userId` (spoofable).
**Fix:** Added `auth()` session check + tenant ID verification. Uses `session.user.id` instead of client-supplied userId.

### CRITICAL-2: Password Reset Tokens Stored in Plaintext (FIXED)

**File:** `lib/auth/actions.ts:479-486`
**Before:** Raw 256-bit token stored directly in `authUsers.recoveryToken`. If the database is compromised, attacker can reset any account immediately.
**Fix:** Token is now SHA-256 hashed before storage. Only the hash is in the database. The plaintext token is sent via email and never persisted.

### CRITICAL-3: Password Reset Expiration Bypass (FIXED)

**File:** `lib/auth/actions.ts:527-532`
**Before:** Expiration check was `if (user.recoverySentAt)` - if `recoverySentAt` was NULL, the token never expired.
**Fix:** Changed to fail closed. If `recoverySentAt` is missing, the token is rejected.

### CRITICAL-4: Hardcoded Storage Signing Secret (FIXED)

**File:** `lib/storage/index.ts:7`
**Before:** `SIGNING_SECRET` fell back to `'dev-signing-secret'` if environment variables were not set. In production, this would mean all signed URLs use a publicly known secret.
**Fix:** Production now throws a fatal error if no signing secret is configured. Dev fallback is renamed to `'dev-signing-secret-local-only'` to make its scope explicit.

### HIGH-1: Missing robots.txt (FIXED)

**File:** `public/robots.txt` (created)
**Before:** No robots.txt existed. Search engines could crawl all discoverable paths.
**Fix:** Created robots.txt that allows public marketing pages and blocks all app routes, APIs, auth paths, shared links, admin panels, and internal paths.

---

## Part 3: Vulnerabilities Found (Not Yet Fixed - Tracked)

### HIGH-2: Tip Request Tokens Never Expire

**File:** `lib/finance/tip-actions.ts`
**Issue:** `getTipRequestByToken()` has no expiration check. Old tip request tokens work forever.
**Risk:** Financial abuse via old links.
**Fix needed:** Add `expires_at` column to `tip_requests` table and check it.

### HIGH-3: Guest Codes Are Short, No Rate Limiting

**Route:** `/g/[code]`
**Issue:** Short alphanumeric codes (QR-friendly) with no rate limiting on lookups. Brute-forceable.
**Risk:** Enumeration of active events and chef details.
**Fix needed:** Add rate limiting on guest code lookups.

### HIGH-4: Partner Report Tokens Expose Revenue Data

**Route:** `/partner-report/[token]`
**Issue:** Share tokens show revenue data with no expiration and no revocation mechanism.
**Risk:** Financial data exposure via stale links.
**Fix needed:** Add `expires_at` and `is_active` flags.

### HIGH-5: Guest Feedback Tokens Missing Expiration

**Route:** `/guest-feedback/[token]`
**Issue:** Feedback tokens have no expiration check.
**Fix needed:** Add `expires_at` check.

### HIGH-6: 9 API Routes Leak Raw Error Messages (FIXED 2026-03-29)

**Routes:** `e2e/auth`, `demo/switch`, `demo/tier`, `documents/consolidated-grocery`, `cron/circle-digest`, `cron/morning-briefing`, `kiosk/order/catalog`, `book`, `ai/health`
**Issue:** Returned `error.message` directly to clients, which could contain SQL errors, file paths, or internal details.
**Fix:** 7 routes patched to return generic error messages with real errors logged server-side. 2 routes (`kiosk/order/catalog`, `book`) were already safe (intentional user-facing error messages).

### HIGH-7: Missing Rate Limiting on 7 Public Token Routes (FIXED 2026-03-29)

**Routes:** `/proposal/[token]`, `/feedback/[token]`, `/tip/[token]`, `/review/[token]`, `/hub/g/[groupToken]`, `/partner-report/[token]`, `/staff-portal/[id]`
**Fix:** Added `checkRateLimit()` with IP-based rate limiting to all 7 routes (30-60 req/15min per IP).

### HIGH-8: Guest Code Enumeration (FIXED 2026-03-29)

**Route:** `/g/[code]`
**Issue:** Short alphanumeric codes with no rate limiting. Brute-forceable.
**Fix:** Added rate limiting (30 req/15min per IP) to `app/(public)/g/[code]/page.tsx`.

### HIGH-9: Tip Request Tokens Never Expire (FIXED 2026-03-29)

**File:** `lib/finance/tip-actions.ts`
**Issue:** `getTipRequestByToken()` had no expiration check. Old tokens worked forever.
**Fix:** Added application-level 30-day expiration check using `created_at` timestamp.

### MEDIUM-1: Unsubscribe Links Are Bare UUIDs

**File:** `lib/marketing/actions.ts:453`
**Issue:** Unsubscribe uses `campaign_recipients.id` (UUID) with no signature or expiration. Theoretically enumerable.
**Fix needed:** Implement HMAC-signed unsubscribe tokens.

---

## Part 4: Verified Secure (No Action Needed)

| Control                         | File(s)                                              | Status                                                                     |
| ------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------- |
| Next.js version (14.2.35)       | `package.json`                                       | Safe from CVE-2025-29927 and CVE-2025-66478                                |
| Stripe webhook signatures       | `app/api/webhooks/stripe/route.ts`                   | Verified: `constructEvent()` with secret, idempotent via UNIQUE constraint |
| All 38 cron/scheduled endpoints | `app/api/cron/**`, `app/api/scheduled/**`            | All use `verifyCronAuth()` with timing-safe comparison                     |
| Source maps                     | `next.config.js:292`                                 | `hideSourceMaps: true`, not shipped to browser                             |
| `dangerouslySetInnerHTML`       | 10 usages found                                      | All use `JSON.stringify()` on static/DB data, zero XSS vectors             |
| E2E auth endpoint               | `app/api/e2e/auth/route.ts`                          | Hard-gated: `NODE_ENV === 'production'` returns 403                        |
| CSRF protection                 | `lib/security/csrf.ts`                               | Origin/Referer validation on API routes                                    |
| SSRF protection                 | `lib/security/url-validation.ts`                     | Blocks localhost, private IPs, cloud metadata, HTTP                        |
| Turnstile CAPTCHA               | `lib/security/turnstile.ts`                          | Fail-closed in production                                                  |
| CSV formula injection           | `lib/security/csv-sanitize.ts`                       | Prefixes dangerous chars                                                   |
| File upload validation          | Receipt, menu, batch upload handlers                 | Size limits, type restrictions, filename sanitization                      |
| Path traversal protection       | Storage API routes                                   | Reject `..`, `.`, `\\`; use `path.basename()`                              |
| Sensitive file exposure         | `.gitignore`                                         | `.env*`, `.auth/` excluded from version control                            |
| Internal header stripping       | `lib/auth/request-auth-context.ts`                   | Strips `x-cf-*` headers to prevent spoofing                                |
| Middleware auth                 | `middleware.ts`                                      | JWT decode, role checks, unauthenticated redirects                         |
| Rate limiting                   | `lib/rateLimit.ts`                                   | Sign-in 10/15min, sign-up 10/15min, reset 3/hr, change 5/hr                |
| Shared link security            | Most `/share`, `/event`, `/feedback`, `/view` routes | Token validation, expiration, rate limiting                                |
| Invitation token hashing        | `lib/auth/invitations.ts`                            | SHA-256 hashing (new tokens), expiration enforced                          |

---

## Part 5: Complete Private vs Public Data Classification

### Private Data (Must Be Secured)

**Client PII:** Names, emails, phones, addresses, household members, children's names, birthdays, dietary restrictions, allergies, relationship observations

**Financial:** Payments, deposits, tips, refunds, expenses, profit margins, revenue, client lifetime value, tipping patterns (all in cents, ledger-first)

**Business IP:** Recipes, methods, ingredients, menu designs, pricing strategies, event execution details

**Communications:** All messages between chef and client, drafts, approvals, internal notes

**Access Codes:** Gate codes, WiFi passwords, alarm info, security notes, parking/access instructions

**Auth Secrets:** JWT signing key, Stripe keys, webhook secrets, OAuth tokens, cron secrets, all env vars

**File Storage:** Recipe photos, receipts, contracts, chat attachments (tenant-scoped paths)

### Public Data (Intentionally Exposed)

Marketing pages, chef directory profiles, shared links (token-gated), embed widget, auth pages, webhook receivers (signature-verified), health checks, static assets

### Gray Areas (Require Per-Route Verification)

Shared tokenized links (varies by route), SSE channels (now fixed), cron endpoints (secret-gated), public storage paths, error pages, email tokens

---

## Recommendations

### Immediate (DONE - 2026-03-29)

1. ~~Add rate limiting to the 7 unprotected public token routes~~ DONE
2. ~~Add expiration to tip request tokens~~ DONE (30-day app-level check)
3. ~~Sanitize the 9 error-leaking API routes~~ DONE (7 patched, 2 already safe)
4. ~~Add rate limiting to guest code route~~ DONE

### Next Session

1. Audit `package.json` dependencies for slopsquatting (hallucinated packages)

### Before Launch

5. Add persistent rate limiting (Redis or DB-backed) for multi-process deployments
6. Implement HMAC-signed unsubscribe tokens
7. Add partner report token expiration and revocation
8. Test session expiry UX (what happens when JWT expires mid-form)
9. Test client access revocation (removing a client from an event)
10. Add `x-middleware-subrequest` to the header strip list (defense-in-depth)

### Ongoing

11. Every new server action must pass the Server Action Quality Checklist (CLAUDE.md)
12. Every new public route must have rate limiting and input validation
13. Re-audit tenant scoping on any new database queries
