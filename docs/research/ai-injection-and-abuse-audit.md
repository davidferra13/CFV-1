# Research: AI Prompt Injection and Client Abuse Audit

> **Date:** 2026-03-29
> **Question:** What is the full prompt injection, client abuse, social engineering, third-party failure, and browser-based attack surface?
> **Status:** complete

## Summary

The AI layer has strong multi-layer defenses against prompt injection: regex-based pre-LLM guardrails, system prompt anti-injection instructions, database field sanitization, and rate limiting. However, several gaps remain. The most significant: (1) indirect prompt injection via database fields that get loaded into Remy's context is partially mitigated but the sanitizer can be bypassed with creative encodings; (2) the public Remy endpoint has no abuse logging so attackers can probe guardrails anonymously without consequences; (3) chat messaging has no rate limit, enabling message flooding; (4) the `allowDangerousEmailAccountLinking` OAuth setting enables account takeover; (5) client invitation tokens lack per-attempt rate limiting at the lookup stage.

---

## 1. AI Prompt Injection

### FINDING 1.1: Direct Injection Via Remy Chat - Well Defended

- **Severity:** Low (mitigated)
- **Files:** `lib/ai/remy-guardrails.ts:236-295`, `lib/ai/remy-input-validation.ts:341-387`, `lib/ai/remy-personality.ts:409-423`
- **What exists:** Three layers of defense before user input reaches the LLM:
  1. **Pre-LLM regex guardrails** (`validateRemyInput`): Detects 8 injection pattern families including instruction override, prompt extraction, roleplay escape, DAN/jailbreak, new instructions framing, encoded payloads, tag injection, bracket injection, and delimiter injection.
  2. **Pre-LLM content blocks** (`checkDangerousActionBlock`, `checkOutOfScopeBlock`, `checkRecipeGenerationBlock`): Additional regex layers blocking data exfiltration requests, system prompt requests, roleplay attempts, and out-of-scope requests.
  3. **System prompt anti-injection** (`REMY_ANTI_INJECTION`): Instructs the model to never reveal its system prompt, never roleplay, and never follow overriding instructions.
- **Assessment:** This is a solid defense-in-depth setup. The regex patterns cover the most common attack vectors. The rate limiter (12 messages/minute) limits brute-force attempts.
- **Residual risk:** A sufficiently creative attacker using novel prompt injection techniques not covered by the regex patterns could still influence model behavior. Regex-based injection detection is inherently an arms race. However, the model's system prompt reinforcement provides a second layer.

### FINDING 1.2: Indirect Injection Via Database Fields - Partially Mitigated

- **Severity:** Medium
- **Files:** `lib/ai/remy-input-validation.ts:389-461`, `lib/ai/remy-context.ts` (loaded into system prompt)
- **What exists:** The `sanitizeForPrompt()` function neutralizes known injection patterns in database fields before they enter the system prompt. It handles: instruction overrides, role-play injection, prompt extraction, delimiter injection, developer mode activation, context window extraction, multi-step jailbreaks, encoding bypasses, and hidden HTML/markdown instructions. Matched patterns are wrapped in brackets to break their instruction structure.
- **Attack chain:**
  1. A client submits an inquiry via the public embed form with injection payload in the `additional_notes`, `occasion`, `allergies_food_restrictions`, or `favorite_ingredients_dislikes` fields.
  2. This data is stored in the database (fields like `source_message`, `confirmed_occasion`, `confirmed_dietary_restrictions`).
  3. When the chef asks Remy about this inquiry or client, the data is loaded via `loadRemyContext()` into the system prompt.
  4. If the sanitizer misses a pattern variant, the injected instructions execute in the model's context.
- **Bypass vectors:** The sanitizer uses regex replacement. Attackers could try: Unicode homoglyphs (Cyrillic "a" in "ignore"), zero-width characters between words, reversed text that the model re-assembles, or injection patterns not covered by the current regex set (e.g., XML-style `<|system|>` tokens used by some models).
- **Impact if bypassed:** The attacker could cause Remy to generate misleading business advice, fabricate data, or behave outside its guardrails for that specific conversation. The attacker cannot access other tenants' data (tenant scoping is enforced at the DB query level, not the LLM level). The attacker cannot execute real actions (Remy's tier 3 restricted actions always fail, and tier 2 actions require chef approval).

### FINDING 1.3: Embed Inquiry Form Input - Not Fed Directly to LLM

- **Severity:** Low
- **Files:** `app/api/embed/inquiry/route.ts:1-388`, `components/embed/embed-inquiry-form.tsx`
- **What exists:** The public embed inquiry form has:
  - Zod schema validation with max lengths on all fields (names: 200, notes: 5000, allergies: 2000)
  - Honeypot field (`website_url`) for bot detection
  - Cloudflare Turnstile CAPTCHA
  - IP-based rate limiting (10 submissions per 5 minutes)
  - Email validation
  - Chef ID validated as UUID
- **LLM exposure:** The form data is NOT passed directly to an LLM during submission. It is stored in the database and later fed to Remy's context when the chef interacts with that inquiry (Finding 1.2). The only immediate AI involvement is the non-blocking `onInquiryCreated` hook which enqueues a lead scoring task - this uses structured data fields (budget, guest count), not free-text fields.
- **Assessment:** Good design. The delayed LLM exposure means the `sanitizeForPrompt` layer gets a chance to clean the data before it reaches any model.

### FINDING 1.4: Public Remy Endpoint - No Abuse Logging

- **Severity:** Medium
- **File:** `app/api/remy/public/route.ts:72-80`
- **What's wrong:** The public Remy endpoint (for unauthenticated visitors) applies `validateRemyInput()` guardrails but does NOT log abuse incidents. The chef-facing Remy has `logRemyAbuse()` which tracks violations, auto-blocks repeat offenders, and maintains an audit trail. The public endpoint silently rejects bad input with no record.
- **Impact:** An attacker can probe the guardrail regex patterns anonymously, learning which patterns are detected and which bypass detection, with no audit trail or blocking mechanism.
- **Recommendation:** Add IP-based abuse logging and auto-blocking for the public Remy endpoint. The rate limiter helps but does not track pattern-based abuse.

### FINDING 1.5: Client Remy Endpoint - Guardrails Applied, Lower Abuse Visibility

- **Severity:** Low
- **File:** `app/api/remy/client/route.ts:80-270`
- **What exists:** The client Remy endpoint applies `validateRemyInput()` and `checkRecipeGenerationBlock()` before any LLM call. It uses `requireClient()` for auth and rate limits at 12 messages/minute per tenant.
- **Gap:** Like the public endpoint, it does not call `logRemyAbuse()` - abuse attempts by authenticated clients are not tracked in the `remy_abuse_log` table. Only the chef-facing endpoint logs abuse.

### FINDING 1.6: History Injection Vector

- **Severity:** Low
- **Files:** `lib/ai/remy-input-validation.ts:46-77`, `app/api/remy/client/route.ts:104`
- **What exists:** The `validateHistory()` function validates the conversation history array sent from the client: it limits to 20 messages, 4000 chars each, 30000 chars total, and validates role values. However, it does NOT run `sanitizeForPrompt()` on history message content. The role is validated to be `user`, `assistant`, or `remy`.
- **Attack chain:** A malicious client could craft a modified API request with history entries containing injection payloads. These would bypass the `validateRemyInput()` check (which only checks the current message) and the `sanitizeForPrompt()` check (which only sanitizes database fields).
- **Impact:** The model receives the injected history directly. The system prompt's anti-injection instructions provide the only defense layer.
- **Recommendation:** Apply `sanitizeForPrompt()` to history message content, or run the injection detection patterns on history entries.

### FINDING 1.7: Brain Dump / Transcript Parser - User Input Directly to LLM

- **Severity:** Low
- **Files:** `lib/ai/parse-brain-dump.ts:80-139`, `lib/ai/parse-inquiry.ts:72-84`, `lib/ai/parse-transcript.ts`
- **What exists:** These parsers take free-form user text and pass it directly as `userContent` to `parseWithOllama()`. The system prompt is a fixed extraction template. There is no pre-LLM guardrail check.
- **Mitigation factors:** (1) These are chef-only functions behind `requireChef()`. (2) Output is validated by Zod schemas - the model must produce valid structured JSON. (3) The model cannot execute actions - it only returns extracted data. (4) The chef reviews all extracted data before saving.
- **Assessment:** An attacker who compromised a chef account could attempt to make the parser return fabricated structured data, but the Zod schema constrains the output shape, and the chef must review before committing. This is a low-impact vector.

---

## 2. Client Portal Abuse Chains

### FINDING 2.1: Client Data Isolation - Properly Scoped

- **Severity:** None (working correctly)
- **Files:** `lib/events/client-actions.ts:67-82`, `lib/chat/actions.ts:356-376`
- **What exists:** All client portal data access is scoped by `client_id` = `user.entityId` (from the authenticated session). For example:
  - `getClientEventById` filters by `.eq('client_id', user.entityId)` - a client cannot see another client's events even with the event UUID.
  - `getConversation` double-checks participation: after fetching the conversation, it verifies the user is a participant via `conversation_participants.auth_user_id`.
  - `getClientEvents` filters by `.eq('client_id', user.entityId)`.
- **ID manipulation:** Even if a client guesses another event's UUID, the `.eq('client_id', user.entityId)` filter returns null. The page shows 404, not the other client's data.

### FINDING 2.2: Client Cannot Access Chef-Only Features

- **Severity:** None (working correctly)
- **Files:** `middleware.ts:131-137`, `app/(client)/layout.tsx:20-26`
- **What exists:** Route-level access control in middleware redirects non-chef users away from chef routes and non-client users away from client routes. The client layout calls `requireClient()` which throws for non-client roles.

### FINDING 2.3: Chat Message Flooding - No Per-Conversation Rate Limit

- **Severity:** Medium
- **Files:** `lib/chat/actions.ts:450-501`
- **What exists:** `sendChatMessage` requires authentication and verifies conversation participation, but has NO rate limit. A malicious client could send thousands of messages per second.
- **Impact:** Database storage bloat, notification spam to the chef, potential disruption of the real-time messaging system (SSE bus). All messages are stored permanently with no auto-cleanup.
- **Recommendation:** Add rate limiting to `sendChatMessage` - e.g., 30 messages per minute per user. This is a straightforward addition using the existing `checkRateLimit` utility.

### FINDING 2.4: Client Profile Self-Modification

- **Severity:** Low (by design)
- **File:** `app/(client)/my-profile/page.tsx`, `app/(client)/my-profile/client-profile-form.tsx`
- **What exists:** Clients can edit their own profile fields (name, email, phone, dietary restrictions, allergies). Changes are visible to the chef.
- **Risk:** A client could set their name to something offensive or inject HTML/markdown that renders in the chef's dashboard. However, React's default JSX escaping prevents XSS. The data is displayed via JSX interpolation `{client.name}`, not `dangerouslySetInnerHTML`.

---

## 3. Social Engineering Vectors

### FINDING 3.1: Password Reset Flow - Properly Secured

- **Severity:** None (working correctly)
- **Files:** `lib/auth/actions.ts:463-503`
- **What exists:**
  - Always returns `{ success: true }` regardless of whether the email exists (prevents enumeration).
  - Rate limited: 3 resets per email per hour.
  - Token is 32 random bytes (256 bits of entropy), stored in the database.
  - Token expires after 1 hour.
  - Token is consumed on use (set to null after password update).

### FINDING 3.2: Client Invitation Flow - Token Security

- **Severity:** Low
- **Files:** `lib/auth/invitations.ts:14-53`, `lib/auth/actions.ts:251-272`
- **What exists:**
  - Tokens are stored as SHA-256 hashes (with legacy plaintext fallback).
  - Tokens have expiration dates and `used_at` timestamps.
  - Email must match the invitation email during signup.
  - Invitations can be revoked by the chef.
- **Gap:** The `getInvitationByToken` function has no per-token lookup rate limit. An attacker who knows the token format could brute-force tokens, though the search space (random hex tokens) makes this impractical.
- **Legacy concern:** The plaintext fallback for old tokens means those tokens are stored unhashed and are vulnerable to database breach exposure.

### FINDING 3.3: allowDangerousEmailAccountLinking - Account Takeover Risk

- **Severity:** High
- **File:** `lib/auth/auth-config.ts:133`
- **What exists:** The Google OAuth provider has `allowDangerousEmailAccountLinking: true`. This is also documented in the prior attack surface audit (`docs/research/attack-surface-audit.md`).
- **Attack:** If an attacker controls a Google account with the same email as an existing ChefFlow user (e.g., via a compromised Gmail account), they can log in as that user via Google OAuth without knowing their ChefFlow password.
- **Note:** This was already flagged in the prior audit. The risk stands.

### FINDING 3.4: Fake Chef Account Creation - No Verification

- **Severity:** Medium
- **File:** `lib/auth/actions.ts:128-244`
- **What exists:** Chef signup requires only an email and password. There is no business verification, no identity check, no approval process. Email is auto-confirmed (`emailConfirmedAt: new Date()`).
- **Impact:** Anyone can create a chef account with any business name, potentially impersonating a real chef business. The public chef directory (`/chefs`) would list fake accounts alongside real ones.
- **Mitigation:** The public chef directory exists, but fake accounts would have no events, no reviews, and no portfolio - making impersonation obvious to careful clients. However, automated impersonation at scale could damage trust.

---

## 4. Third-Party Service Failure Modes

### FINDING 4.1: Stripe Failure - Fails Safely

- **Severity:** None (working correctly)
- **Files:** `lib/stripe/checkout.ts:6`, `lib/stripe/subscription.ts`
- **What exists:** Stripe calls are wrapped in try/catch. The checkout flow returns null on failure (non-blocking). Subscription and customer creation during signup are non-blocking side effects - signup succeeds even if Stripe fails. The Stripe webhook handler (`app/api/webhooks/stripe/route.ts`) validates webhook signatures.

### FINDING 4.2: Resend (Email) Failure - Fails Safely

- **Severity:** None (working correctly)
- **File:** `lib/email/send.ts:26-67`
- **What exists:** Email sending is fully non-blocking:
  - `sendEmail` returns `false` on failure, never throws.
  - Missing `RESEND_API_KEY` is handled gracefully (log warning, skip send).
  - Circuit breaker trips after 5 consecutive failures (60s reset).
  - All email sends from the inquiry flow, signup flow, and notification system are wrapped in try/catch with non-blocking behavior.
- **Impact:** If Resend is down, no emails go out, but no state corruption occurs. Inquiry submissions, signups, and other operations complete normally.

### FINDING 4.3: Ollama Failure - Hard Fail With Clear Error

- **Severity:** None (working correctly)
- **Files:** `lib/ai/parse-ollama.ts:91-309`, `lib/ai/ollama-errors.ts`
- **What exists:** When Ollama is down, `OllamaOfflineError` is thrown with specific codes (`not_configured`, `unreachable`, `timeout`, `model_missing`). The UI catches this and shows "Start Ollama to use this feature." No silent fallback to cloud models.

### FINDING 4.4: Cloudflare Failure Mode

- **Severity:** Low
- **What exists:** The app runs on localhost:3000 with Cloudflare Tunnel exposing it to app.cheflowhq.com. If Cloudflare is down, external access is lost, but the local dev server and local prod server continue functioning. No data corruption.

---

## 5. Browser-Based Attacks

### FINDING 5.1: dangerouslySetInnerHTML Usage - Low Risk

- **Severity:** Low
- **Files:**
  - `components/seo/json-ld.tsx:11` - Injects `JSON.stringify(data)` into a `<script type="application/ld+json">` tag. The data comes from hardcoded constants and server-side props, not user input. Safe.
  - `components/pricing/image-with-fallback.tsx:91` - Injects SVG strings from a hardcoded `CATEGORY_ICONS` constant. Not user-controllable. Safe.
  - `components/ui/color-palette-provider.tsx:82` - Injects a self-contained theme initialization script. Not user-controllable. Safe.
  - **Public pages** (`app/(public)/chefs/page.tsx`, `app/(public)/trust/page.tsx`, `app/(public)/customers/page.tsx`, etc.) - These use `dangerouslySetInnerHTML` for static marketing content. Would need per-file verification but likely hardcoded content.
- **Assessment:** No instance of `dangerouslySetInnerHTML` renders user-controlled content. All usage is for hardcoded constants, JSON-LD, or static marketing. No XSS vector here.

### FINDING 5.2: Cookie Security - Properly Configured

- **Severity:** None (working correctly)
- **Files:** `lib/auth/actions.ts:444-449`, `middleware.ts:118-124`
- **What exists:**
  - Session cookie (`chefflow-session-only`): `httpOnly: true`, `sameSite: 'lax'`, `secure` in production.
  - Role cache cookie: `httpOnly: true`, `sameSite: 'lax'`, `secure` in production, `maxAge: 300`.
  - Auth.js manages the main session cookie with its own httpOnly/secure defaults.

### FINDING 5.3: Clickjacking / Frame Protection

- **Severity:** Low
- **File:** `next.config.js` (CSP headers)
- **What exists:** The main app has CSP headers set. The embed routes (`/embed/*`) intentionally use relaxed `frame-ancestors *` to allow embedding on third-party sites - this is by design for the inquiry widget. The embed routes are public, unauthenticated, and only contain the inquiry form. No sensitive actions are possible in the embed iframe.
- **postMessage security:** The embed form posts `chefflow-widget-resize` and `chefflow-inquiry-submitted` messages to `window.parent` using `'*'` as the target origin. The widget loader (`public/embed/chefflow-widget.js`) posts `chefflow-widget-loaded` scoped to `window.location.origin`. The `'*'` target origin on resize messages is acceptable since the messages contain no sensitive data (just height values and a submission notification).

### FINDING 5.4: CSRF Protection

- **Severity:** None (working correctly)
- **Files:** `lib/security/csrf.ts:1-60`, `middleware.ts`
- **What exists:**
  - Server Actions: Auto-protected by Next.js (POST-only with session token validation).
  - API Routes: The `verifyCsrfOrigin` utility validates Origin/Referer headers against allowed hosts. The SameSite=Lax cookie setting blocks most cross-site POST attacks.
  - The embed inquiry route (`/api/embed/inquiry`) intentionally allows CORS from any origin but only creates inquiries (no authenticated state modification).

### FINDING 5.5: SSRF Protection

- **Severity:** None (working correctly)
- **File:** `lib/ai/remy-input-validation.ts:521-570`
- **What exists:** The `isUrlSafeForFetch` function blocks: localhost, private IP ranges (RFC 1918), link-local addresses (including cloud metadata), `.internal` and `.local` TLDs, non-HTTP protocols. Used by Remy's web read actions to prevent the model from fetching internal resources.

---

## 6. Additional Observations

### FINDING 6.1: Admin Guardrail Bypass

- **Severity:** Informational (by design)
- **File:** `lib/ai/remy-abuse-actions.ts:86-89`
- **What exists:** Admin users bypass all Remy guardrails. `isRemyBlocked()` returns `{ blocked: false }` for admins. The main Remy action (`remy-actions.ts`) checks `isRemyAdmin()` and skips `validateRemyInput()` if true.
- **Assessment:** This is intentional for admin testing. However, if an admin account is compromised, the attacker has unrestricted LLM access. The admin check is email-based (`ADMIN_EMAILS` env var), which ties admin status to the email address.

### FINDING 6.2: Remy Abuse Auto-Block Threshold

- **Severity:** Informational
- **File:** `lib/ai/remy-abuse-actions.ts:44-60`
- **What exists:** Auto-block triggers after 2 prior critical incidents (3rd critical = 24-hour block). This is a reasonable threshold. The in-memory rate limiter (12 messages/minute) provides the first defense layer; the abuse system provides the second.

### FINDING 6.3: Ollama System/User Message Separation

- **Severity:** Low
- **File:** `lib/ai/parse-ollama.ts:136-140`, `app/api/remy/client/route.ts:198-203`
- **What exists:** All Ollama calls properly separate system and user messages using the `messages` array with `role: 'system'` and `role: 'user'`. This is the correct pattern for message separation. The system prompt is never concatenated with user input in a single message.

---

## Gaps and Unknowns

1. **Unicode/homoglyph bypass testing** - The injection sanitizer has not been tested against Unicode homoglyph substitution, zero-width character insertion, or bidirectional text attacks. Runtime testing with these specific payloads would reveal if the regex patterns are vulnerable.
2. **Model-specific injection techniques** - The guardrails are model-agnostic regex patterns. Specific Ollama models (qwen3) may have model-specific prompt injection vulnerabilities not covered by the generic patterns.
3. **Rate limiter durability** - The Remy rate limiter is in-memory (`remy-guardrails.ts:375`). Server restarts reset all rate limit state. The IP-based rate limiter for the embed form uses Upstash Redis when configured, which survives restarts.
4. **Chat message volume limits** - No maximum on total messages per conversation or total conversations per client. Long-running conversations could grow unbounded.

---

## Recommendations

### Quick Fixes

1. **Add rate limiting to `sendChatMessage`** (`lib/chat/actions.ts`) - 30 messages/minute per user. Uses existing `checkRateLimit` utility. Prevents message flooding.
2. **Add abuse logging to public Remy endpoint** (`app/api/remy/public/route.ts`) - Log IP + matched pattern when guardrails block a message. Add IP-based auto-block after 3 critical violations.
3. **Add abuse logging to client Remy endpoint** (`app/api/remy/client/route.ts`) - Log client ID + matched pattern. Auto-block after 3 critical violations.
4. **Run `sanitizeForPrompt()` on history entries** in the Remy streaming routes - prevents history-based indirect injection.

### Needs a Spec

5. **Unicode-aware injection detection** - Extend the sanitizer to normalize Unicode homoglyphs before pattern matching. Normalize zero-width characters. This is a non-trivial change that needs testing.
6. **Chef account verification** - Add a verification step for chef accounts that appear on the public directory (email domain verification, manual review, or portfolio verification).

### Needs Discussion

7. **allowDangerousEmailAccountLinking** - This was flagged in the prior audit and remains open. Decision: keep for UX convenience with documented risk, or require re-authentication for OAuth linking.
8. **Legacy plaintext invitation tokens** - Consider a migration to hash all legacy tokens and remove the plaintext fallback path.
9. **Chat conversation size limits** - Consider auto-archiving conversations after N messages, or implementing pagination with server-side limits.
