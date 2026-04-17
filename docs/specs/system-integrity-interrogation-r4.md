# System Integrity Interrogation - Round 4

> **Purpose:** High-leverage Q&A targeting automations engine, file storage, SSE realtime, client portal, calling system, and cancellation flow.
> **Status:** P0 complete, P1 in queue
> **Created:** 2026-04-15
> **Scope:** arbitrary file uploads, unauthenticated data access, IDOR vulnerabilities, over-refund gaps, orphaned resources

Each question tagged with failure type, current behavior, gap, and build path.

---

## K. File Storage

### K1. Public storage route serves ANY bucket without auth

**Failure type:** unauthorized access to private files
**Current behavior:** `/api/storage/public/[...path]/route.ts` serves files from any bucket without authentication. No allowlist restricts which buckets are public. If someone guesses a path in `receipts`, `chat-attachments`, or `client-photos`, they can access it via the public route. Storage paths follow predictable patterns (`{tenantId}/{entityId}/{filename}`).
**File:** `app/api/storage/public/[...path]/route.ts:6-56`
**Impact:** Financial receipts, chat attachments, client photos, and other private files accessible to anyone who knows or guesses the path.
**Build path:** Add allowlist of public-only buckets (e.g., `dish-photos`, `chef-logos`, `chef-profile-images`). Reject requests to any bucket not on the list.
**Priority:** P0 - FIXED

### K2. Guest photo upload has no file type validation (public endpoint)

**Failure type:** arbitrary file upload by unauthenticated users
**Current behavior:** `uploadGuestPhoto` (`lib/guest-photos/actions.ts:15-99`) checks file size (10MB) but performs zero file type validation. Extension derived from `file.name.split('.').pop()` (attacker-controlled). Any file type (.exe, .html, .js, .svg) can be uploaded.
**File:** `lib/guest-photos/actions.ts:15-99`
**Impact:** Storage of arbitrary file types. Combined with K1, dangerous files could be served.
**Build path:** Add same `ALLOWED_MIME_TYPES` check used in `lib/events/photo-actions.ts:19-23` (JPEG, PNG, HEIC, HEIF, WebP). Derive extension from MIME type.
**Priority:** P1

### K3. Hub media upload has no file type or size validation

**Failure type:** arbitrary file upload with no limits
**Current behavior:** `uploadHubMediaFile` (`lib/hub/media-actions.ts:26-60`) has no type check, no size limit. Requires `can_post` group permission, but any member can upload anything of any size.
**File:** `lib/hub/media-actions.ts:26-60`
**Impact:** Disk exhaustion. Executable content upload.
**Build path:** Add `MAX_FILE_SIZE_BYTES` (25MB), `ALLOWED_MIME_TYPES` allowlist, derive extension from MIME type.
**Priority:** P1

### K4. No file cleanup when events/clients are soft-deleted

**Failure type:** orphaned files on disk
**Current behavior:** Soft-delete (sets `deleted_at`) has no file cleanup. Photos in `event-photos`, `client-photos`, `dish-photos`, `receipts`, `guest-photos`, `chat-attachments` remain forever. Only `cleanupStorageBuckets` during full account deletion (30-day grace period) cleans up.
**File:** `lib/events/actions.ts:608-623`, `lib/clients/actions.ts:845-861`
**Impact:** Disk usage grows indefinitely on self-hosted server.
**Build path:** Scheduled cleanup for entities with `deleted_at` older than 30 days.
**Priority:** P2

### K5. No global max file size at storage layer

**Failure type:** defense-in-depth gap
**Current behavior:** Core `upload()` in `lib/storage/index.ts:35-69` has no `maxSize` parameter. Size limits implemented per-endpoint. Missing from hub media and guest photos.
**File:** `lib/storage/index.ts:35-69`
**Impact:** New upload surfaces without size checks have no safety net.
**Build path:** Add optional `maxSizeBytes` parameter to `upload()`. Global default (50MB).
**Priority:** P2

### K6. File extension derived from filename (not MIME) in guest photos and hub media

**Failure type:** extension spoofing
**Current behavior:** Both derive extension from `file.name.split('.').pop()` (attacker-controlled) instead of MIME type lookup.
**File:** `lib/guest-photos/actions.ts:68`, `lib/hub/media-actions.ts:38`
**Impact:** File stored with misleading extension.
**Build path:** Use `MIME_TO_EXT` lookup as in the protected endpoints.
**Priority:** P2

### K7. Null byte not rejected in private signed URL route

**Failure type:** inconsistent path traversal defense
**Current behavior:** Public route checks for `'\0'` but private route does not.
**File:** `app/api/storage/[...path]/route.ts:17` vs `app/api/storage/public/[...path]/route.ts:20`
**Impact:** Low on modern Node.js. Defense-in-depth inconsistency.
**Build path:** Add `seg.includes('\0')` to private route.
**Priority:** P3

---

## L. Client Portal & Hub

### L1. Hub server actions expose all group data without auth/membership check

**Failure type:** unauthorized data access (IDOR)
**Current behavior:** These `'use server'` exports take a UUID `groupId` with NO authentication and NO membership verification:

- `getHubMessages({ groupId })` - all messages + author profiles
- `searchHubMessages({ groupId, query })` - full text search
- `getGroupNotes(groupId)` - pinned notes
- `getPinnedMessages(groupId)` - pinned messages
- `getGroupMedia({ groupId })` - all uploaded media
- `getMealBoard({ groupId })` - meal board entries
- `getGroupAvailability(groupId)` - availability data
- `getGroupMembers(groupId)` - all members with profile data
  **File:** `lib/hub/message-actions.ts:170,640,729`, `lib/hub/media-actions.ts:113`, `lib/hub/meal-board-actions.ts:53`, `lib/hub/availability-actions.ts:107`, `lib/hub/group-actions.ts:257`
  **Impact:** Full information disclosure. Private dinner circle conversations, dietary restrictions, allergies, contact info accessible to anyone who can guess a UUID.
  **Build path:** Add `requireGroupMembership(groupId, profileToken)` helper. Call at top of every read action.
  **Priority:** P0 - FIXED

### L2. postGuestCountUpdate writes to ANY event without ownership verification

**Failure type:** unauthorized data modification (IDOR)
**Current behavior:** `postGuestCountUpdate` verifies caller's `profileToken` and `can_post` permission, but `eventId` is unchecked. Directly executes `db.from('events').update({ guest_count }).eq('id', eventId)` with admin client. Any circle member can modify guest count of ANY event in the database.
**File:** `lib/hub/client-quick-actions.ts:78`
**Impact:** Critical data integrity violation. Guest counts on events belonging to other chefs/clients can be modified.
**Build path:** Before update, verify event is linked to group: `SELECT id FROM hub_group_events WHERE group_id = groupId AND event_id = eventId`.
**Priority:** P0 - FIXED

### L3. Hub group page exposes all data to unauthenticated visitors via group token

**Failure type:** data over-exposure on public page
**Current behavior:** Public hub page at `app/(public)/hub/g/[groupToken]/page.tsx` renders ALL group data (messages, members, notes, media, availability, events, meal board) to any visitor with the URL. Group token acts as bearer secret. No profile identification required to read.
**File:** `app/(public)/hub/g/[groupToken]/page.tsx:57-75`
**Impact:** If URL is shared/leaked/indexed, all private dinner circle data (including dietary/allergy medical info) is exposed.
**Build path:** Add `noindex` meta tags. Consider requiring profile identification before rendering full content.
**Priority:** P1 - FIXED (noindex added)

### L4. Public hub group page missing noindex meta tag

**Failure type:** information exposure via search engine indexing
**Current behavior:** Hub group pages have no meta robots tags. Compare with guest RSVP portal which sets `robots: { index: false, follow: false, nocache: true }`.
**File:** `app/(public)/hub/g/[groupToken]/page.tsx`
**Impact:** Private dinner circle data could be indexed by search engines.
**Build path:** Add `export const metadata: Metadata = { robots: { index: false, follow: false, nocache: true } }`
**Priority:** P1 - FIXED

### L5. Client event detail supplementary queries not tenant-scoped

**Failure type:** defense-in-depth gap
**Current behavior:** In `getClientEventById`, primary query scopes by `client_id`, but 7 supplementary queries (menus, ledger, financial summary, transitions, photos, contracts, reviews) use only `.eq('event_id', eventId)`.
**File:** `lib/events/client-actions.ts:103-134`
**Impact:** Not directly exploitable today. If primary query gate is ever weakened, supplementary queries leak cross-tenant.
**Build path:** Add `.eq('tenant_id', event.tenant_id)` to each supplementary query.
**Priority:** P2

### L6. Hub message ilike search not escaping LIKE metacharacters

**Failure type:** unexpected query behavior
**Current behavior:** `searchHubMessages` passes user input directly into `.ilike('body', '%${q}%')`. `%` and `_` are LIKE wildcards.
**File:** `lib/hub/message-actions.ts:656`
**Impact:** Unintended broad matches, potentially slow queries.
**Build path:** Escape: `q.replace(/[%_\\]/g, '\\$&')` before interpolation.
**Priority:** P3

---

## M. SSE Realtime

### M1. No per-tenant or per-user SSE connection limit

**Failure type:** denial of service via connection exhaustion
**Current behavior:** SSE endpoint authenticates and authorizes but has no limit on concurrent connections. Global `setMaxListeners(500)` is the only cap, across all channels.
**File:** `lib/realtime/sse-server.ts:4-5`, `app/api/realtime/[channel]/route.ts:27-104`
**Impact:** Single user can degrade realtime for all tenants by opening hundreds of connections.
**Build path:** Per-user connection counter. Reject with 429 above threshold (10/user, 50/tenant).
**Priority:** P1

### M2. Heartbeat timer leak on stream error

**Failure type:** memory/timer leak
**Current behavior:** If `controller.enqueue()` throws in heartbeat or subscription listener, catch block swallows error but doesn't close stream. Timer and listener remain attached to a dead stream.
**File:** `app/api/realtime/[channel]/route.ts:73-88`
**Impact:** Leaked timers accumulate under spotty network conditions.
**Build path:** Call `controller.close()` in catch blocks to trigger cleanup.
**Priority:** P2

### M3. Broadcast payload size unbounded

**Failure type:** memory spike
**Current behavior:** `broadcast()` accepts `data: any` with no size check. Large mutations serialize and push to every client.
**File:** `lib/realtime/sse-server.ts:8-10`
**Impact:** Code error could push megabytes to many clients simultaneously.
**Build path:** Size guard in `broadcast()`: reject/truncate over 64KB.
**Priority:** P3

### M4. Presence store has no upper bound

**Failure type:** unbounded memory growth
**Current behavior:** `presenceStore` Map grows without limit. Cleanup only removes entries older than 2 minutes.
**File:** `lib/realtime/sse-server.ts:29-33`
**Impact:** Low under normal usage.
**Build path:** Max entries per channel (500). Evict oldest on overflow.
**Priority:** P3

---

## N. Automations Engine

### N1. No recursion guard or max depth limit

**Failure type:** potential infinite loop
**Current behavior:** Engine has no `depth` counter, no re-entrance guard, no `MAX_RECURSION_DEPTH`. Currently safe because existing action types don't trigger events. Future action types could introduce unbounded recursion.
**File:** `lib/automations/engine.ts:27-117`
**Impact:** Latent risk. Future action types could exhaust stack.
**Build path:** Add `depth` parameter (default 0, max 3). Pass `depth + 1` on re-trigger.
**Priority:** P2

### N2. Duplicate event fires for non-cooldown triggers

**Failure type:** duplicate automation executions
**Current behavior:** Cooldown dedup only covers 4 of 10 trigger types. Event-driven triggers have no dedup.
**File:** `lib/automations/engine.ts:54-70`
**Impact:** Duplicate notifications, tasks, draft messages on retries or double-clicks.
**Build path:** Idempotency key (`triggerEvent:entityId:ruleId`) in `automation_executions`.
**Priority:** P2

### N3. No per-tenant rate limit on automation fires

**Failure type:** resource exhaustion / notification spam
**Current behavior:** Event-driven triggers have zero cooldown. Bulk import of 100 inquiries \* 50 rules = 5,000 evaluations.
**File:** `lib/automations/engine.ts:16-21`
**Impact:** Latent. Will break at scale.
**Build path:** `MAX_FIRES_PER_TENANT_PER_MINUTE` counter.
**Priority:** P3

### N4. No validation of trigger_event/action_type against enums

**Failure type:** invalid rules persisted
**Current behavior:** `z.string().min(1)` instead of `z.enum()` for trigger/action fields.
**File:** `lib/automations/actions.ts:17-18`
**Impact:** Low. Invalid rules are inert.
**Build path:** Change to `z.enum()`.
**Priority:** P3

---

## O. Calling/Voice System

### O1. Voicemail transcript lost when ai_calls insert fails

**Failure type:** data loss
**Current behavior:** If `ai_calls` insert fails, voicemail callback URL lacks `aiCallId`. Voicemail route returns `{ ok: true }` without persisting transcript or recording URL.
**File:** `app/api/calling/inbound/route.ts:122-126`, `app/api/calling/voicemail/route.ts:27`
**Impact:** Recording exists on Twilio but no reference in ChefFlow. Chef never knows voicemail exists.
**Build path:** Look up call by `CallSid` when `aiCallId` missing. Or create fallback `chef_quick_notes` entry with recording URL.
**Priority:** P1

### O2. E2E bypass flag has no production guard

**Failure type:** security bypass if env var accidentally set in production
**Current behavior:** `DISABLE_TWILIO_SIGNATURE_FOR_E2E=true` completely bypasses webhook auth. No `NODE_ENV === 'production'` check.
**File:** `lib/calling/twilio-webhook-auth.ts:29-30`
**Impact:** If set in production, anyone can POST arbitrary data to calling webhooks.
**Build path:** Add `&& process.env.NODE_ENV !== 'production'` to bypass check.
**Priority:** P2

### O3. Voicemail transcription status ignored

**Failure type:** silent data loss
**Current behavior:** `TranscriptionStatus` read but never checked. Failed transcription indistinguishable from silence.
**File:** `app/api/calling/voicemail/route.ts:22`
**Impact:** Chef misses voicemails that need manual review.
**Build path:** Check status, create "transcription failed, listen to recording" note when failed.
**Priority:** P2

### O4. No voicemail recording cleanup or storage limit

**Failure type:** unbounded Twilio storage costs
**Current behavior:** Recordings stored on Twilio indefinitely. No cleanup job, no TTL.
**File:** `app/api/calling/voicemail/route.ts:37`
**Impact:** Linearly growing cost.
**Build path:** Cron job to delete recordings older than 90 days via Twilio API.
**Priority:** P3

### O5. No monetary spending cap on Twilio calls

**Failure type:** unbounded charges
**Current behavior:** Daily count limit (20/day default) but no dollar spend cap.
**File:** `lib/calling/twilio-actions.ts:238`
**Impact:** Misconfigured limit could allow excessive spending.
**Build path:** `monthly_spend_cap_cents` column with cost tracking.
**Priority:** P3

---

## P. Cancellation Flow

### P1. No over-refund guard in initiateRefund

**Failure type:** refunding more than paid (offline payments)
**Current behavior:** Validates `amountCents > 0` but NOT that it's <= net refundable. Stripe rejects for its payments, but offline refund ledger entries have no upper bound.
**File:** `lib/cancellation/refund-actions.ts:133-138`
**Impact:** Chef can accidentally refund more than client paid. Negative ledger balance.
**Build path:** Query `event_financial_summary` for `netRefundableCents`. Reject if `amountCents > netRefundableCents`.
**Priority:** P1

### P2. Stripe Checkout Sessions not expired on event cancellation

**Failure type:** payment on cancelled event
**Current behavior:** Cancellation flow doesn't cancel active Stripe Checkout Sessions. Client can still complete payment via old link. Webhook tries transition `cancelled -> paid` which FSM blocks, but money is captured.
**File:** `lib/events/transitions.ts` (no Stripe cleanup)
**Impact:** Money captured for cancelled event with no auto-refund.
**Build path:** On cancellation, expire active Checkout Sessions via `stripe.checkout.sessions.expire()`.
**Priority:** P1

### P3. Multiple refunds can exceed total paid

**Failure type:** over-refunding via repeated calls
**Current behavior:** No cumulative refund check. Each `initiateRefund` call creates independent ledger entry. Stripe catches full-refund but not partial accumulation. Offline has no guard.
**File:** `lib/cancellation/refund-actions.ts:157-161`
**Impact:** Multiple partial refunds exceed total paid.
**Build path:** Same fix as P1: check cumulative refunds before issuing.
**Priority:** P1

### P4. Prep blocks and travel legs not cleaned up on cancellation

**Failure type:** orphaned scheduling artifacts
**Current behavior:** Cancellation handles calendar, emails, notifications, but not `chef_prep_blocks` or `event_travel_legs`.
**File:** `lib/events/transitions.ts`
**Impact:** Ghost prep blocks in chef's schedule.
**Build path:** Non-blocking cleanup: set status='cancelled' on prep blocks and travel legs for the event.
**Priority:** P2

### P5. No automatic refund reminder after cancellation

**Failure type:** missing safety net
**Current behavior:** No reminder, alert, or dashboard indicator that a cancelled event has unprocessed refund.
**File:** `lib/events/transitions.ts`
**Impact:** Client's money held indefinitely if chef forgets to refund.
**Build path:** Create `chef_todos` item after cancellation: "Review refund for [event]."
**Priority:** P2

### P6. All cancellation side effects can silently fail

**Failure type:** total notification blackout
**Current behavior:** All side effects wrapped in try/catch (correct pattern). But if ALL fail simultaneously, no alert that notifications failed.
**File:** `lib/events/transitions.ts`
**Impact:** Event cancelled in DB but no human knows.
**Build path:** Track success count. If zero, create high-priority alert.
**Priority:** P2

### P7. Past-event edge case in refund calculation works by accident

**Failure type:** fragile correctness
**Current behavior:** `daysUntilEvent` goes negative for past events, which correctly falls into "no refund" tier. But no explicit guard.
**File:** `lib/cancellation/policy.ts:59-62`
**Impact:** Refactor risk. Currently correct.
**Build path:** Add explicit early return for `daysUntilEvent < 0`.
**Priority:** P3

---

## Priority Execution Order

### P0 (fix now - 3 issues)

| ID  | Title                                       | Domain        |
| --- | ------------------------------------------- | ------------- |
| K1  | Public storage route serves private buckets | Storage       |
| L1  | Hub read actions ungated by auth/membership | Client Portal |
| L2  | postGuestCountUpdate IDOR on any event      | Client Portal |

### P1 (fix next - 8 issues)

| ID  | Title                                    | Domain        |
| --- | ---------------------------------------- | ------------- |
| K2  | Guest photo no file type validation      | Storage       |
| K3  | Hub media no file type/size validation   | Storage       |
| L3  | Hub group page data over-exposure        | Client Portal |
| L4  | Hub group page missing noindex           | Client Portal |
| M1  | No SSE connection limit                  | SSE           |
| O1  | Voicemail transcript lost on insert fail | Calling       |
| P1  | No over-refund guard                     | Cancellation  |
| P2  | Stripe sessions not expired on cancel    | Cancellation  |
| P3  | Multiple refunds exceed total paid       | Cancellation  |

### P2 (10 issues)

K4, K5, K6, L5, M2, N1, N2, O2, O3, P4, P5, P6

### P3 (8 issues)

K7, L6, M3, M4, N3, N4, O4, O5, P7
