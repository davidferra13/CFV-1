# AI Security Hardening — February 2026

## What This Changes

Security audit of the local AI system (Ollama/Remy) identified 8 categories of real vulnerabilities. This session fixes all of them.

## Changes Made

### 1. Input Validation (all 4 Remy API routes)

**New file:** `lib/ai/remy-input-validation.ts`

- History array validated: max 20 messages, max 4000 chars per message, max 30,000 chars total
- Request body schema validated via runtime checks (not just TypeScript `as` casts)
- Message capped at 2000 chars, currentPage at 500, tenantId at 100
- Applied to: `/api/remy/stream`, `/api/remy/public`, `/api/remy/client`, `/api/remy/landing`

### 2. SSRF Protection (readWebPage)

**File:** `lib/ai/remy-web-actions.ts`

- New `isUrlSafeForFetch()` blocks: localhost, private IPs (10.x, 192.168.x, 172.16-31.x), link-local (169.254.x), cloud metadata endpoints, .internal/.local TLDs
- Applied before any `fetch()` call in `readWebPage()`

### 3. Prompt Injection Sanitization

**File:** `lib/ai/remy-context.ts`

- New `sanitizeForPrompt()` neutralizes injection patterns in database-sourced fields
- Applied to: `special_requests`, `kitchen_notes`, `vibe_notes`, `menu_revision_notes`, `what_they_care_about`, `payment_behavior`, `tipping_pattern`, `kitchen_constraints`, client notes, client reviews, recipe notes/adaptations, AAR fields (went_well, to_improve, lessons_learned)
- Injection patterns wrapped in brackets to preserve content but break instruction structure

### 4. Error Message Sanitization

**File:** `app/api/remy/stream/route.ts`

- New `sanitizeErrorForClient()` blocks internal paths, database details, stack traces, IP addresses from reaching the client
- Applied to all 4 error paths in the chef stream route (setup, mixed, question, outer catch)
- Raw errors still logged server-side for debugging

### 5. Interactive Lock (reentrant)

**File:** `lib/ai/queue/worker.ts`

- Changed from boolean to counter — supports concurrent Remy streams
- `acquireInteractiveLock()` increments, `releaseInteractiveLock()` decrements
- PC slot only resumes when ALL streams have released (count reaches 0)

### 6. File Size Check

**File:** `components/ai/remy-drawer.tsx`

- 5MB size check before `FileReader.readAsText()` — prevents browser tab crash on huge files
- User-facing toast error with file size

### 7. IndexedDB Auto-Pruning

**File:** `lib/ai/remy-local-storage.ts`

- Max 200 conversations — oldest pruned on new conversation creation
- Max 500 messages per conversation — oldest trimmed after each Remy response
- Non-blocking (errors caught and swallowed)

### 8. Pi URL Redaction

**File:** `app/api/remy/stream/route.ts`

- Admin Pi test no longer sends the internal network URL in success/failure messages
- Prevents internal network topology leakage

## Files Modified

| File                              | Change                                                 |
| --------------------------------- | ------------------------------------------------------ |
| `lib/ai/remy-input-validation.ts` | **NEW** — shared validation utilities                  |
| `app/api/remy/stream/route.ts`    | Input validation, error sanitization, Pi URL redaction |
| `app/api/remy/public/route.ts`    | Input validation                                       |
| `app/api/remy/client/route.ts`    | Input validation                                       |
| `app/api/remy/landing/route.ts`   | Input validation                                       |
| `lib/ai/remy-web-actions.ts`      | SSRF protection                                        |
| `lib/ai/remy-context.ts`          | Prompt injection sanitization                          |
| `lib/ai/queue/worker.ts`          | Reentrant interactive lock                             |
| `components/ai/remy-drawer.tsx`   | File size check, auto-pruning                          |
| `lib/ai/remy-local-storage.ts`    | Auto-pruning functions                                 |

## Known Remaining Items (not fixable in code alone)

- **IP-based rate limits are spoofable** — proper fix requires Vercel/Cloudflare-level IP validation (trusted proxy headers). In-memory rate limiters also don't persist across serverless cold starts.
- **Pi traffic is unencrypted HTTP** — proper fix requires TLS between PC and Pi (mTLS or WireGuard tunnel). This is a network configuration issue, not a code fix.
- **Ollama API has no auth** — upstream Ollama limitation. Mitigated by binding to localhost only.
