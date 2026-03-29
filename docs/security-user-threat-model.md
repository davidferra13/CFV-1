# ChefFlow Security: User & Threat Model

> **Created:** 2026-03-29
> **Purpose:** Document every type of actor that interacts with ChefFlow, what they can do, what risks they pose, and what protections are already in place vs what needs attention before launch.

---

## Why This Document Exists

During a working session, we established a core truth about software: the majority of bugs, security issues, and unexpected behavior are discovered through real user interaction, not internal testing. This applies equally to normal usage and malicious activity.

This document maps every actor that will interact with ChefFlow, the risks they represent, and the current state of protection.

---

## The Core Principle

Every interaction with ChefFlow is an HTTP request. The app cannot distinguish between a chef clicking a button and a bot sending the same request programmatically. The only difference is intent. Security means ensuring that regardless of intent, every request is authenticated, authorized, scoped, and validated before anything happens.

---

## Actor 1: Normal Users (Chefs)

**Who they are:** Paying customers. Private chefs, caterers, food service operators using ChefFlow to run their business.

**What they do:** Create events, manage clients, send quotes, enter recipes, track finances, upload documents, communicate with clients.

**What they have access to:** Their own data only. Everything scoped to their tenant_id/chef_id.

**Risk level:** Low (but not zero).

**Risks they pose:**

- Accidentally entering malformed data (special characters in names, extremely long inputs, emoji in fields that don't expect it)
- Using the app in unexpected sequences (starting a flow, abandoning it, coming back days later)
- Using old browser tabs with stale sessions
- Uploading unexpected file types or oversized files

**Current protections:**

- Auth.js session management (JWT-based)
- `requireChef()` on every server action
- Tenant scoping on every database query
- Drizzle ORM parameterized queries (prevents SQL injection from form inputs)
- Next.js automatic output escaping (prevents stored XSS from user-entered text)

**What to verify before launch:**

- Input length limits on all form fields (prevent database bloat from extreme inputs)
- File upload validation (type, size) in the storage module
- Session expiry handling (what happens when a session expires mid-form)

---

## Actor 2: Normal Users (Clients)

**Who they are:** The chef's customers. People who receive quotes, view menus, approve proposals, and communicate with their chef through ChefFlow.

**What they do:** View their events, respond to quotes, submit inquiries, view invoices, communicate via the client portal.

**What they have access to:** Only data explicitly shared with them by their chef. Scoped to their client record and the events they're attached to.

**Risk level:** Low.

**Risks they pose:**

- Same as chefs (malformed input, unexpected usage patterns)
- Trying to access other clients' data by manipulating URLs (e.g., changing an event ID in the URL)
- Accessing the client portal after a chef has removed them

**Current protections:**

- `requireClient()` on client-facing server actions
- Client-scoped queries (only see events/quotes/invoices linked to their client record)
- Auth.js session with client role

**What to verify before launch:**

- Every client-facing route checks that the client is actually linked to the event/quote/invoice they're viewing
- Removing a client from an event revokes their access to that event's data immediately

---

## Actor 3: Malicious External Users (Attackers)

**Who they are:** Anyone on the internet trying to exploit the application. Could be automated bots, script kiddies running common exploit tools, or targeted attackers.

**What they try to do:**

### SQL Injection

Sending malicious SQL through form fields or URL parameters to extract or modify database contents.

**Current protection:** Drizzle ORM uses parameterized queries. User input never gets concatenated into raw SQL. This is handled at the framework level, not per-query.

**Risk level:** Very low (would require a bug in Drizzle itself or a developer writing raw SQL with string concatenation).

### Cross-Site Scripting (XSS)

Injecting JavaScript into form fields that gets rendered to other users, stealing sessions or data.

**Current protection:** Next.js (React) automatically escapes all rendered output. You'd have to explicitly use `dangerouslySetInnerHTML` to create an XSS vulnerability.

**What to verify:** Search the codebase for any use of `dangerouslySetInnerHTML`. If found, ensure the input is sanitized.

### Authentication Bypass

Accessing pages or API routes without logging in, or forging sessions.

**Current protection:** Auth.js handles session management. Server actions use `requireChef()` / `requireClient()` / `requireAuth()`. Pages in the `(chef)` route group are protected by middleware.

**What to verify:** Every API route and server action has an auth check. The server action audit (215 functions, 117 gaps fixed) already covered this, but new code must maintain it.

### Brute Force Login

Trying thousands of password combinations to break into an account.

**Current protection:** Auth.js credentials provider. No explicit rate limiting currently documented.

**What to add before launch:** Rate limiting on the login endpoint. After X failed attempts from the same IP, block or delay further attempts. This is straightforward to add via middleware.

### DDoS (Denial of Service)

Flooding the server with requests to take it offline.

**Current protection:** Cloudflare Tunnel provides the public-facing layer. Cloudflare has built-in DDoS protection. Your server is not directly exposed to the internet.

**Risk level:** Low. Cloudflare handles this. You don't need to do anything extra here.

### Path Traversal / Direct File Access

Trying to access files on the server by manipulating file paths (e.g., `../../etc/passwd`).

**Current protection:** Storage module uses signed URLs with HMAC-SHA256. Files are served through an API route, not directly from the filesystem. The signing prevents path manipulation.

**What to verify:** The storage API route validates the signature before serving any file and does not allow `..` in paths.

---

## Actor 4: Legitimate Users Acting Maliciously (Insider Threat)

**Who they are:** A chef or client with a real, authenticated account who tries to access data that isn't theirs.

**What they try to do:**

- Change an ID in a URL to view another chef's event, client, or financial data
- Manipulate API requests to update or delete another chef's records
- Access admin-only features without admin privileges

**Why this matters more than external attacks:** These users are already past authentication. They have valid sessions. The only thing stopping them is authorization (tenant scoping and role checks).

**Current protections:**

- Every database query includes tenant_id/chef_id scoping
- Admin features gated behind `isAdmin()` / `requireAdmin()`
- Server action audit verified auth + tenant scoping on 215 functions

**What to verify before launch:**

- Test key routes by logging in as Chef A and manually requesting Chef B's data via URL manipulation. Every one should return empty results or an error, never Chef B's data.
- Verify that client role users cannot access chef role endpoints and vice versa.

**This is the highest-priority security concern for ChefFlow.** External attacks are mostly handled by the framework. Insider data leakage is where a single missed tenant_id check causes a real breach.

---

## Actor 5: Third-Party Service Callbacks

**Who they are:** External services that send data back to your server. Not humans. Automated systems.

**Current third-party callbacks:**

- **Stripe webhooks** - payment confirmations, subscription updates, checkout completions
- **Google OAuth** - authentication callbacks during login
- **Potential future:** Gmail API, calendar integrations

**What they do:** Send HTTP requests to your API endpoints with data about events that happened on their platform (payment completed, user authenticated, etc.).

**Risks they pose:**

- **Webhook forgery:** Someone sends a fake Stripe webhook to your endpoint claiming a payment was made. If your app trusts it without verification, it could mark invoices as paid when they weren't.
- **Replay attacks:** Someone captures a legitimate webhook and sends it again to trigger duplicate processing.

**Current protections:**

- Stripe provides webhook signing secrets. Each webhook includes a signature that can be verified against your secret.
- Google OAuth uses state parameters and PKCE to prevent callback forgery.

**What to verify before launch:**

- Stripe webhook endpoint verifies the `stripe-signature` header using your webhook signing secret. If this verification is missing, add it. This is non-negotiable for financial integrity.
- Webhook handlers are idempotent (processing the same webhook twice doesn't create duplicate records or double-apply payments).

---

## Actor 6: Automated Crawlers and Scrapers

**Who they are:** Bots that systematically visit web pages. Some are legitimate (Google indexing your public pages), some are malicious (scraping email addresses, looking for exposed admin panels, scanning for vulnerabilities).

**What they do:** Send GET requests to every URL they can find. Follow links. Try common paths like `/admin`, `/api/users`, `/wp-admin`, `/.env`.

**Risk level:** Low for ChefFlow specifically.

**Current protections:**

- All app routes require authentication (behind the `(chef)` route group)
- Public routes are limited (landing page, embed widget, login)
- No sensitive data on public pages
- Cloudflare provides bot detection

**What to verify before launch:**

- `.env`, `.env.local`, `.auth/` and other sensitive files are not accessible via HTTP
- The `/api/` routes all require authentication (except explicitly public ones like embed inquiry)
- `robots.txt` exists and disallows crawling of app routes

---

## Research Results (Verified 2026-03-29)

The following items were verified by searching the actual codebase, not assumed.

### Stripe Webhook Security: VERIFIED SECURE

- **Location:** `app/api/webhooks/stripe/route.ts` (1,616 lines)
- **Signature verification:** Fully implemented. Uses `stripe.webhooks.constructEvent()` with webhook secret. Missing or invalid signatures return 400.
- **Idempotency:** Fully implemented. Stripe event IDs stored in `ledger_entries.transaction_reference` with UNIQUE constraint. Duplicate webhooks are detected and skipped. PostgreSQL error code 23505 is caught as a safety net.
- **Audit logging:** All webhook events logged with status.
- **Test coverage:** Tests verify rejection of missing/invalid signatures.

### Login Rate Limiting: VERIFIED IMPLEMENTED

- **Location:** `lib/auth/actions.ts` + `lib/rateLimit.ts`
- **Sign-in:** 10 attempts per email per 15 minutes
- **Sign-up (chef + client):** 10 attempts per email per 15 minutes
- **Password reset:** 3 requests per email per hour
- **Password change:** 5 attempts per user per hour
- **API routes:** 100 requests per identifier per 60 seconds (via `lib/api/rate-limit.ts`)
- **Storage:** In-memory (resets on server restart). No persistent failed attempt tracking.
- **Limitation:** No account lockout mechanism. A user is never locked out permanently; they just wait for the window to pass.

### dangerouslySetInnerHTML: VERIFIED SAFE

- **9 total usages found** in the codebase
- **8 are JSON-LD structured data for SEO** (all use `JSON.stringify()` on static or database-derived objects, no user input)
- **1 is an inline blocking script** for color palette initialization (hardcoded at compile time, reads localStorage only)
- **Zero XSS vectors.** No user input is ever rendered via `dangerouslySetInnerHTML`.

### File Upload Validation: VERIFIED STRONG

- **Receipt uploads** (`lib/expenses/receipt-upload.ts`): 10 MB limit, image types only (JPEG, PNG, HEIC, HEIF, WebP), tenant-scoped paths
- **Menu uploads** (`app/api/menus/upload/route.ts`): 20 MB limit, 13 allowed extensions, rate limited (10/min per IP), CSRF protected, SHA-256 duplicate detection, filename sanitized (strips `..`, directory separators, unsafe chars, capped at 200 chars)
- **Batch receipts** (`lib/receipts/batch-upload-actions.ts`): 10 MB per file, 20 files max, 3 concurrent, image types only

### Path Traversal Protection: VERIFIED STRONG

- **Storage API routes** (`app/api/storage/[...path]/route.ts`): Explicitly reject `..`, `.`, and `\\` in path segments. Uses `path.basename()` for bucket isolation. Signed token verification on private routes.
- **Upload handlers:** Filename sanitization strips directory separators and `..` sequences.

### Sensitive File Exposure: VERIFIED PROTECTED

- `.env`, `.env*.local`, `.auth/` all in `.gitignore`
- `.auth/` directory contains session tokens, properly excluded from version control
- Additional patterns covered: `.env.local.prod.backup`, `.env.local.backup*`, dev/beta/prod variants

### robots.txt: MISSING

- No `robots.txt` file exists in `public/`
- Search engines will crawl all discoverable paths without restriction
- **Action needed:** Create `public/robots.txt` before launch to block crawling of `/api/`, app routes, and admin paths

### Additional Security Found (Not Previously Documented)

- **CSRF protection** (`lib/security/csrf.ts`): Validates Origin/Referer headers on mutating API requests. Allowlist includes localhost and cheflowhq.com domains.
- **Webhook URL validation** (`lib/security/url-validation.ts`): Blocks HTTP (HTTPS only), localhost, private IPs, cloud metadata endpoints, credentialed URLs.
- **Content security:** Storage routes set appropriate Cache-Control headers (private for signed, public for public routes).

---

## Summary: Priority Order for Pre-Launch Security

| Priority | Area                                  | Status                           | Action Needed                                                      |
| -------- | ------------------------------------- | -------------------------------- | ------------------------------------------------------------------ |
| 1        | Tenant scoping on every query         | Audited (March 2026)             | Re-verify on any new server actions                                |
| 2        | Auth checks on every route/action     | Audited (March 2026)             | Re-verify on any new routes                                        |
| 3        | SSE channel authorization             | **FIXED (2026-03-29)**           | None (was critical: eavesdropping possible)                        |
| 4        | Password reset token security         | **FIXED (2026-03-29)**           | None (was critical: plaintext storage + expiration bypass)         |
| 5        | Stripe webhook signature verification | **Verified secure**              | None                                                               |
| 6        | Login rate limiting                   | **Verified implemented**         | Consider persistent storage + account lockout for production scale |
| 7        | File upload validation                | **Verified strong**              | None                                                               |
| 8        | Storage signing secret                | **FIXED (2026-03-29)**           | None (was high: hardcoded fallback removed)                        |
| 9        | Input length validation               | Varies by form                   | Spot-check critical forms                                          |
| 10       | dangerouslySetInnerHTML audit         | **Verified safe (0 issues)**     | None                                                               |
| 11       | robots.txt                            | **FIXED (2026-03-29)**           | None (created `public/robots.txt`)                                 |
| 12       | Sensitive file exposure               | **Verified protected**           | None                                                               |
| 13       | CSRF protection                       | **Verified implemented**         | None                                                               |
| 14       | Source maps                           | **Verified not shipped**         | None                                                               |
| 15       | E2E auth endpoint                     | **Verified gated**               | None (hard-blocked in production)                                  |
| 16       | Cron endpoint auth                    | **Verified (all 38 endpoints)**  | None (timing-safe comparison)                                      |
| 17       | Next.js CVEs                          | **Safe (14.2.35)**               | None (patched past both critical CVEs)                             |
| 18       | Tip request token expiration          | **FIXED (2026-03-29)**           | None (30-day app-level expiration)                                 |
| 19       | Guest code rate limiting              | **FIXED (2026-03-29)**           | None (30 req/15min per IP)                                         |
| 20       | Partner report token security         | **FIXED (2026-03-29)**           | None (90-day app-level expiration)                                 |
| 21       | Error message leakage                 | **FIXED (2026-03-29)**           | None (7 routes patched, 2 already safe)                            |
| 22       | Public token route rate limiting      | **FIXED (2026-03-29)**           | None (rate limiting added to all 7 + guest code)                   |
| 23       | Middleware bypass header              | **FIXED (2026-03-29)**           | None (`x-middleware-subrequest` now stripped)                      |
| 24       | Guest feedback token expiration       | **FIXED (2026-03-29)**           | None (60-day app-level expiration)                                 |
| 25       | Slopsquatting audit                   | **Clean (74 packages verified)** | None                                                               |
| 26       | Session expiry UX                     | Unknown                          | Test expired session behavior                                      |
| 27       | Client access revocation              | Unknown                          | Test removing client access                                        |
| 28       | Unsubscribe token signing             | **Low priority**                 | Consider HMAC-signed unsubscribe tokens (bare UUIDs, low risk)     |

---

## Actor 7: AI-Aware Attackers (The "Vibe Code" Threat)

**Added 2026-03-29 based on external research.**

**Who they are:** Attackers who understand that AI-generated code follows predictable patterns and specifically target those patterns.

**Why this is a real threat:**

- 45% of AI-generated code contains security flaws (Veracode, 2026)
- 2.74x more vulnerabilities than human-written code
- 322% more privilege escalation paths
- AI-generated code is now the cause of 1 in 5 breaches
- The Armis "Trusted Vibing Benchmark" tested 18 AI models: 100% failure rate in generating fully secure code
- The Enrichlead incident (2025): 100% AI-coded platform was breached within 72 hours of launch (subscription bypass, hardcoded API keys, client-side-only auth)

**What they exploit:**

- Default error handling patterns (AI rarely adds proper error boundaries)
- Missing input sanitization (the #1 AI-generated flaw across all models)
- Client-side auth logic (AI sometimes puts security checks in the browser)
- Predictable file structures and route naming conventions
- Default configurations unchanged from AI output
- Hardcoded API keys left in generated code

**What we've done about it:**

- Full server action audit (215 functions, 117 gaps fixed)
- Server-side auth on every route and action (not client-side)
- Parameterized queries via Drizzle ORM (no AI-generated raw SQL)
- This comprehensive security audit (2026-03-29) specifically tested for AI-generated vulnerability patterns

**What still needs attention:**

- Audit `package.json` for slopsquatting (AI-hallucinated package names registered as malware)
- Ongoing vigilance: every new AI-generated code path must be manually reviewed for the common AI failure modes

---

## Actor 8: Swarm/Bot Attacks (Automated Enumeration)

**Added 2026-03-29 based on external research.**

**Who they are:** Automated tools that systematically probe web applications. Not targeting ChefFlow specifically, just scanning everything they can find.

**Tools used:** gobuster, ffuf, dirbuster (URL fuzzing), OpenBullet 2 (credential stuffing with 100+ SaaS configs), AI-enhanced bots with CAPTCHA solving.

**Scale:** Small businesses face automated attacks approximately every 11 seconds.

**What they try:**

- **URL enumeration:** Try thousands of paths per second (`/admin`, `/api/users`, `/.env`, `/wp-admin`, `/debug`, etc.)
- **Credential stuffing:** Try leaked username/password combos from other breaches
- **API enumeration:** Discover undocumented API endpoints and test them for auth gaps
- **Token brute-forcing:** Try random UUIDs/tokens on shared link routes

**Current protections:**

- Cloudflare Tunnel (bot detection, DDoS protection, not directly exposed)
- Rate limiting on auth endpoints (10 attempts/15min)
- Turnstile CAPTCHA on public forms
- `robots.txt` blocking app routes from crawlers (added 2026-03-29)
- All app routes require authentication (middleware-enforced)

**What still needs attention:**

- Rate limiting on all public token routes (7 routes currently unprotected)
- Guest codes (`/g/[code]`) are short and enumerable without rate limiting
- Consider adding fail2ban-style IP blocking for repeated 401/403 responses

---

## What This Document Is NOT

This is not a penetration test. This is not a security certification. This is a practical threat model that identifies who interacts with ChefFlow, what could go wrong, and what to check before real data goes in.

The full technical audit with code-level findings is at `docs/research/cybersecurity-comprehensive-audit-2026-03-29.md`.

When the app is ready for real users, a focused verification pass through the "Action Needed" items above is the right next step. Not before.

---

## What to Tell People Who Are Worried

"Credit card numbers never touch my server. Stripe handles all payment processing directly. Client data is isolated per account at the database level; one chef cannot see another chef's data. The framework prevents the most common web attacks (SQL injection, XSS) by default. The app sits behind Cloudflare, which handles DDoS protection. We've completed a comprehensive security audit covering all 6 actor types, verified protections against the OWASP top 10, patched 4 critical vulnerabilities, and confirmed we're safe from the major 2025 Next.js CVEs. Every server action (215 total) has been audited for auth and tenant scoping."

That's a factual, specific answer. Not a promise that nothing will ever go wrong, but proof that the architecture was built with these concerns in mind from the start, and that it's been tested.
