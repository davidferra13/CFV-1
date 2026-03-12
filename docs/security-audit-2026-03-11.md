# ChefFlow V1 - Verified Security Audit

**Date:** 2026-03-11
**Trigger:** Firehound/Chat & Ask AI data leak (388M+ chats exposed via Firebase misconfiguration)
**Method:** 12 AI agents (7 standard + 5 adversarial red-team), then manual code verification of every finding
**Verification:** Every CRITICAL/HIGH finding was verified by reading the actual source code. Agent-reported findings that were exaggerated or wrong were downgraded or removed.

---

## Threat Model

Before ranking anything, who are we defending against?

| Threat Actor                             | Access Level                      | Motivation                                         | Realistic?                             |
| ---------------------------------------- | --------------------------------- | -------------------------------------------------- | -------------------------------------- |
| **Random internet attacker**             | No auth, can hit public endpoints | Data harvesting, spam, opportunistic               | YES (most likely)                      |
| **Malicious client**                     | Authenticated client role         | Access other clients' data, abuse services         | POSSIBLE                               |
| **Rogue chef**                           | Authenticated chef role           | Access other chefs' data, abuse AI                 | UNLIKELY (4 beta testers, all known)   |
| **Competitor**                           | No auth                           | Scrape pricing, client info, business intelligence | POSSIBLE                               |
| **Security researcher (Firehound-type)** | No auth, automated scanning       | Find exposed databases, public endpoints           | YES (this is what triggered the audit) |

**Primary defense targets:**

1. Prevent any unauthenticated data access beyond what's intentionally public
2. Enforce tenant isolation (chef A can't see chef B's data)
3. Protect health data (allergies, dietary restrictions, cannabis preferences)
4. Prevent AI pipeline exploitation

---

## What's Live vs. Feature Branch

**This changes everything about priority.** Most findings are on the feature branch, not deployed.

| Feature                        | On Main (Production)? | On Feature Branch? |
| ------------------------------ | --------------------- | ------------------ |
| Client lookup endpoint         | NO                    | YES                |
| Rebook tokens                  | NO                    | YES                |
| Client referrals               | NO                    | YES                |
| Guest event profile (cannabis) | NO                    | YES                |
| iCal calendar feed             | NO                    | YES                |
| V1 API (events/clients)        | NO                    | YES                |
| Kiosk system                   | YES                   | YES                |
| Invitation system              | YES                   | YES                |
| Remy AI context                | YES (older version)   | YES (current)      |
| Signed cookie (CRON_SECRET)    | NO                    | YES                |

---

## TIER 1: Fix NOW (Live in Production)

### 1. Invitation Token Race Condition (TOCTOU)

**Verified:** YES. Read the code at [lib/auth/invitations.ts:34-48](lib/auth/invitations.ts#L34-L48).
**On main:** YES (deployed)
**Exploitability:** Requires two concurrent HTTP requests with the same token. Achievable with a simple script.

`markInvitationUsed()` line 40 does `.eq('id', invitationId)` without `.is('used_at', null)`. Two concurrent signup requests with the same invitation token both succeed, creating duplicate accounts in the same tenant.

Ironic: `revokeInvitation()` at line 63 correctly has `.is('used_at', null)`. The safe pattern exists in the same file but wasn't applied to the critical function.

**Fix (15 min):**

```typescript
// line 37-40: add .is('used_at', null) and check result
const { data: updated, error } = await supabase
  .from('client_invitations')
  .update({ used_at: new Date().toISOString() })
  .eq('id', invitationId)
  .is('used_at', null) // ADD THIS
  .select('id')
  .single()
if (!updated) throw new Error('Invitation already used')
```

---

### 2. Kiosk Checkout Has Zero Rate Limiting

**Verified:** YES. Grep for `checkRateLimit` in [app/api/kiosk/order/checkout/route.ts](app/api/kiosk/order/checkout/route.ts) returns zero matches.
**On main:** YES (deployed)
**Exploitability:** Requires a valid device token. If a kiosk device is compromised or token is intercepted, unlimited orders can be submitted.

**Fix (15 min):** Add rate limiting at the top of the POST handler:

```typescript
await checkRateLimit(`kiosk-checkout:${device.id}`, 10, 60_000)
```

---

### 3. npm Vulnerabilities

**Verified:** YES (from npm audit output)
**On main:** YES
**Exploitability:** Varies. Next.js DoS vectors are remotely exploitable. xlsx prototype pollution requires crafted input.

**Fix (15 min):** Run `npm audit fix`. Replace xlsx separately.

---

## TIER 2: Fix Before Merging Feature Branch

These are real vulnerabilities but NOT live in production. They must be fixed before this branch merges to main.

### 4. Public Client Lookup Returns Health Data Without Auth

**Verified:** YES. [app/api/public/client-lookup/route.ts:56-100](app/api/public/client-lookup/route.ts#L56-L100)
**On main:** NO
**Exploitability:** HIGH. Any person who knows a chef's public slug (visible on marketplace, embed widget) and a client's email can retrieve: full name, phone number, allergies, dietary restrictions, last event location/occasion/guest count. Rate limit is 5/min per IP, trivially bypassed.

This is the finding that would put us on Firehound's list. Allergies are protected health information.

**Fix (30 min):** Strip PII from response. Return only `{ found: true, prefill: { occasion, guest_count, serve_time } }`. Move name/phone/allergies behind authentication (require client to sign in to see their own pre-filled data).

---

### 5. Two Tables Missing RLS Entirely

**Verified:** YES. [supabase/migrations/20260330000088_rebook_tokens.sql](supabase/migrations/20260330000088_rebook_tokens.sql) and [supabase/migrations/20260330000089_client_referral_codes.sql](supabase/migrations/20260330000089_client_referral_codes.sql) - no `ENABLE ROW LEVEL SECURITY` in either file.
**On main:** NO (migrations not merged)
**Exploitability:** If merged as-is, any authenticated Supabase client could read/write all rows. However, these are only accessed via server actions using admin client, so the Supabase REST API would need to be directly targeted.

**Fix (30 min):** Add RLS migration before merging.

---

### 6. Guest Event Profile USING(true) Exposes Cannabis/Dietary Data

**Verified:** YES. [supabase/migrations/20260326000004_guest_event_profile.sql:79-87](supabase/migrations/20260326000004_guest_event_profile.sql#L79-L87) - three policies with `USING (true)` plus `GRANT SELECT, INSERT, UPDATE ON guest_event_profile TO anon`.
**On main:** NO
**Exploitability:** HIGH if merged. The `anon` role can SELECT all rows (cannabis participation, familiarity level, dosage preferences, dietary notes, accessibility notes), INSERT fake profiles, and UPDATE anyone's declared allergies. Modifying someone's allergy declarations could cause physical harm.

**Fix (1 hr):** Replace USING(true) with token-scoped database-level policies. The comment on line 76-77 says "App layer MUST filter by exact guest_token + event_id" but that's not defense-in-depth; that's hoping nobody makes a mistake.

---

### 7. iCal Feed Tokens Never Expire

**Verified:** YES. [app/api/feeds/calendar/\[token\]/route.ts](app/api/feeds/calendar/[token]/route.ts) - no expiration check. Token is static. Returns location, guest count, notes, occasion for all events including 30 days of past events.
**On main:** NO
**Exploitability:** MEDIUM. Requires obtaining a token (social engineering, intercepted link). But once obtained, it's permanent surveillance.

**Fix (1 hr):** Add expiration field, rotation endpoint, and "last accessed" tracking.

---

### 8. API Key Scopes Not Enforced

**Verified:** YES. [lib/api/auth-api-key.ts:48](lib/api/auth-api-key.ts#L48) returns scopes but [app/api/v1/clients/route.ts](app/api/v1/clients/route.ts) never checks them.
**On main:** NO
**Exploitability:** LOW. Only affects users with API keys (developer-facing feature, not yet launched).

**Fix (1 hr):** Add `requireScope(ctx, 'clients:read')` to each route.

---

### 9. Client Lookup Also Returns Last Event Location

**Verified:** YES. Same endpoint as #4. Lines 67-77 fetch and return `location_address, location_city, location_state, location_zip` from the client's last completed event. This is a physical safety concern (enables tracking where someone had a private event).
**On main:** NO
**Combined with fix for #4.**

---

## TIER 3: Improvements (Real Gaps, Lower Urgency)

### 10. Remy Prompt Sanitization Inconsistency

**Verified:** PARTIALLY. `sanitizeForPrompt()` is used 17 times in remy-context.ts but skipped on: `revision_notes` (1643), `vendor_name` (1697), `exp.description` (1698), `item_description` (1751), `data.description` (2246). The `client.email` and `client.phone` fields (1649-1650) are structured data, not realistic injection vectors.

**Severity re-assessment:** The real injection risks are `vendor_name` and `exp.description` (chef-controlled free-text fields). But the attacker IS the chef, attacking their own Remy. A chef injecting their own expense vendor name to trick their own AI is a strange threat model. The concern is more about: what if a chef copy-pastes text from an email that contains injection? That's indirect injection, which is real but lower severity.

**Fix (1 hr):** Apply `sanitizeForPrompt()` to all remaining free-text fields. Easy, defensive, no downside.

---

### 11. CRON_SECRET Reused as Cookie Signing Key

**Verified:** YES, but severity was exaggerated. [lib/auth/signed-cookie.ts:10-14](lib/auth/signed-cookie.ts#L10-L14) uses CRON_SECRET. But the cookie only stores a role string (chef/client/staff/partner) used as a middleware performance cache. Every request STILL calls `requireChef()` which validates against the database. Forging this cookie saves one DB lookup per request. It doesn't bypass auth.

**Severity:** MEDIUM. Still bad practice (don't reuse secrets across security domains), but not the "complete admin compromise" the agent reported.

**Fix (15 min):** Add a separate `COOKIE_SIGNING_KEY` env var.

---

### 12. Embed Form Input Not HTML-Sanitized on Submission

**Verified:** Input goes into DB unsanitized. But React's default `{text}` rendering auto-escapes. Only exploitable if a display page uses `dangerouslySetInnerHTML` on inquiry fields.

**Severity:** HIGH (defense-in-depth issue). We should sanitize on input regardless.

**Fix (30 min):** Strip HTML tags from all freetext fields before DB insert.

---

### 13. Unicode/Multi-Message Guardrail Bypasses

**Verified:** Theoretically true. Regex patterns don't handle Unicode homoglyphs. History messages aren't checked for cross-message injection patterns.

**Severity:** MEDIUM. All Remy interactions require authentication. The attacker is a logged-in user attacking their own AI instance. Not an external threat.

**Fix (2 hr):** Add Unicode normalization + cross-message scanning. Good hardening, not urgent.

---

### 14. Document Routes Missing Ownership Validation

**Verified:** YES (2026-03-12). All 17 document/PDF routes audited line-by-line. Every route uses `requireChef()`/`requireClient()`/`requireAuth()` AND scopes database queries by `tenant_id` or `client_id`. No gaps found. The original agent claim was incorrect.

**Severity:** FALSE POSITIVE. No fix needed.

---

## What Was WRONG or EXAGGERATED (Removed from Report)

| Agent Claim                                  | Reality                                                                                                                                        |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| "CRON_SECRET = complete admin compromise"    | Cookie is a performance cache, not an auth mechanism. `requireChef()` still validates on every request.                                        |
| "Lethal Trifecta = one-click exfiltration"   | Requires 4-step chain: malicious DB field + successful injection + LLM drafts email + chef approves. Not one-click.                            |
| "Embed XSS = session hijacking + ransomware" | Only if a display page uses dangerouslySetInnerHTML on inquiry fields. React auto-escapes by default.                                          |
| "Kiosk token brute force = inventory theft"  | Device tokens are 32-byte crypto.randomBytes (256-bit entropy). Not brute-forceable. The real issue is MISSING RATE LIMITING, not weak tokens. |

---

## Action Plan (Verified, Prioritized)

### Today (live in production)

| #   | Fix                                                                | Time   | Severity                 |
| --- | ------------------------------------------------------------------ | ------ | ------------------------ |
| 1   | Invitation token: add `.is('used_at', null)` to markInvitationUsed | 15 min | Real race condition      |
| 2   | Kiosk checkout: add rate limiting                                  | 15 min | Missing basic protection |
| 3   | `npm audit fix`                                                    | 15 min | Known CVEs               |

### Before Merging Feature Branch

| #   | Fix                                                                 | Time   | Severity                       |
| --- | ------------------------------------------------------------------- | ------ | ------------------------------ |
| 4   | Client-lookup: strip PII from unauthenticated response              | 30 min | Health data exposure           |
| 5   | RLS migration for rebook_tokens + client_referrals                  | 30 min | Zero RLS                       |
| 6   | Guest event profile: replace USING(true) with token-scoped policies | 1 hr   | Cannabis/dietary data exposure |
| 7   | iCal feed: add token expiration                                     | 1 hr   | Permanent surveillance vector  |
| 8   | API key scope enforcement                                           | 1 hr   | Scope escalation               |
| 9   | Sanitize embed form inputs (strip HTML tags)                        | 30 min | Defense-in-depth               |

### Next Sprint

| #   | Fix                                                               | Time   |
| --- | ----------------------------------------------------------------- | ------ |
| 10  | Apply sanitizeForPrompt to remaining DB fields in remy-context.ts | 1 hr   |
| 11  | Separate COOKIE_SIGNING_KEY from CRON_SECRET                      | 15 min |
| 12  | Unicode normalization on guardrail regexes                        | 2 hr   |
| 13  | Cross-message injection detection                                 | 2 hr   |
| 14  | Verify document route ownership validation                        | 1 hr   |
| 15  | Replace xlsx package                                              | 1 hr   |
| 16  | PDF Content-Disposition: attachment instead of inline             | 15 min |

---

## Honest Assessment

**Would Firehound flag us today (what's on main)?**
Probably not. Our production deployment has proper auth on all routes, RLS on all deployed tables, and no exposed databases. The invitation race condition and missing kiosk rate limiting are real but not the kind of wide-open-database vulnerability Firehound scans for.

**Would Firehound flag us if we merged this feature branch as-is?**
YES. The public client-lookup endpoint returning allergies without auth is exactly the kind of thing they find. The USING(true) guest profile policies would be flagged too.

**What's genuinely strong:**

- Ollama privacy model (PII never leaves the machine)
- Core RLS on layers 1-4 (tenant isolation)
- Auth architecture (middleware-first, 2,770+ checks)
- Ledger immutability
- Cookie security (httpOnly, Secure, SameSite)

**What needs work:**

- Newer features shipped without the same security rigor as the core
- Consistency: sanitizeForPrompt used in 17 places, skipped in 5
- Public endpoints return too much data
- Token-based access relies on app layer, not database enforcement

---

## References

- [Firehound - CovertLabs](https://firehound.covertlabs.io/)
- [Every AI App Data Breach Since Jan 2025 (Barrack.ai)](https://blog.barrack.ai/every-ai-app-data-breach-2025-2026/)
- [OWASP Top 10 for LLM Applications 2025](https://genai.owasp.org/resource/owasp-top-10-for-llm-applications-2025/)
- [Supabase RLS Best Practices](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Hacking Thousands of Misconfigured Supabase Instances](https://deepstrike.io/blog/hacking-thousands-of-misconfigured-supabase-instances-at-scale)
