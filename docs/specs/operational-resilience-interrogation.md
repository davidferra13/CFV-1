# Operational Resilience Interrogation - Question Set 2

> **Purpose:** Expose every operational failure point across security boundaries, financial integrity, communication pipelines, client experience, and infrastructure resilience. Companion to `chef-user-journey-interrogation.md` (which tested the happy path). This set tests "what breaks."
>
> **Date:** 2026-04-15
> **Methodology:** Each question targets a specific code path with cited evidence. Scored PASS / PARTIAL / FAIL.

---

## Category A: Security & Auth Boundaries

### Q1. Unprotected API Route Coverage

**Question:** How many API route handlers lack auth checks (requireChef/requireClient/requireAuth/verifyCronAuth/env-var gates)? Can an unauthenticated attacker call them?

**Evidence path:** `app/api/*/route.ts`

**Research findings:** ~100 route handlers across ~90 files. 44 files use session auth. 16 cron routes use `verifyCronAuth`. Demo routes gated behind `DEMO_MODE_ENABLED` + `NODE_ENV`. E2E route gated behind `E2E_ALLOW_TEST_AUTH` + loopback IP. Remaining unprotected routes fall into categories:

- Public by design: health, ping, readiness, embed/inquiry, book, webhooks (Stripe/Twilio/Wix/Resend/DocuSign), kiosk, remy/public, remy/landing, calendar feeds (token-based)
- Potentially exposed: `ai/wake`, `ai/monitor`, `ai/health`, `activity/track`, `activity/breadcrumbs`, `cannabis/rsvps`, `ingredients/search`, `ingredients/[id]`, `monitoring/report-error`, `build-version`

**Score:** `___`

---

### Q2. Tenant Isolation on Document Generation Routes

**Question:** Do document generation routes (`/api/documents/invoice/[eventId]`, `/api/documents/contract/[contractId]`, etc.) verify the requesting user owns the event/contract, or can any authenticated user generate documents for any tenant?

**Evidence path:** `app/api/documents/*/route.ts` (all 14 document routes)

**Score:** `___`

---

### Q3. Kiosk Auth Model

**Question:** Kiosk routes (`/api/kiosk/*`) use device tokens instead of session auth. Is the device token validated on every request? Can a stolen token be revoked? Does the token expire?

**Evidence path:** `app/api/kiosk/pair/route.ts`, `app/api/kiosk/heartbeat/route.ts`, `app/api/kiosk/order/*`

**Score:** `___`

---

### Q4. SSE Channel Authorization

**Question:** Can a user subscribe to SSE channels belonging to another tenant? Does the channel access validator fail closed on unknown prefixes?

**Evidence path:** `app/api/realtime/[channel]/route.ts` -> `lib/realtime/channel-access.ts`

**Research findings:** Route requires auth (line 33), calls `validateRealtimeChannelAccess()` with tenant ID, user ID, and admin flag. Fails closed on unknown prefixes (comment on line 25). Admin check uses `hasPersistedAdminAccessForAuthUser`.

**Score:** `___`

---

### Q5. Calendar Feed Token Security

**Question:** The iCal feed route (`/api/feeds/calendar/[token]`) is public (no session auth). Is the token cryptographically strong? Does it expire? Can it be rotated?

**Evidence path:** `app/api/feeds/calendar/[token]/route.ts`

**Score:** `___`

---

### Q6. CSRF Protection on Server Actions

**Question:** Next.js server actions have built-in CSRF protection via the `Host`/`Origin` header check. Is this enabled? Are there any server actions that bypass it?

**Evidence path:** `next.config.js` (serverActions config)

**Score:** `___`

---

### Q7. Rate Limiting on Auth Endpoints

**Question:** Are signup, signin, password reset, and invitation redemption endpoints rate-limited? Can an attacker brute-force passwords or flood signups?

**Evidence path:** `lib/auth/actions.ts` (signUpChef, signIn), `app/auth/forgot-password/`, `lib/auth/invitations.ts`

**Score:** `___`

---

## Category B: Financial Integrity

### Q8. Ledger Immutability Enforcement

**Question:** Are `ledger_entries` truly immutable at the database level (not just application level)? Do triggers prevent UPDATE and DELETE?

**Evidence path:** `database/migrations/20260215000003_layer_3_events_quotes_financials.sql` (lines 717-731)

**Research findings:** `prevent_ledger_mutation()` function raises exception on any UPDATE or DELETE. Two triggers enforce this: `prevent_ledger_update` (BEFORE UPDATE) and `prevent_ledger_delete` (BEFORE DELETE). Same pattern for `platform_fee_ledger`. Same pattern for `event_state_transitions` and `quote_state_transitions`.

**Score:** `___`

---

### Q9. Double-Payment Prevention

**Question:** If Stripe sends the same `payment_intent.succeeded` webhook twice (which happens regularly), does the system prevent creating two ledger entries?

**Evidence path:** `app/api/webhooks/stripe/route.ts` (idempotency check on line 78-106)

**Research findings:** Checks `transaction_reference` in `ledger_entries` for dedup. Non-ledger events (checkout.session.completed, account.updated) have separate idempotency paths. Commerce payments use unique `idempotency_key` column with DB unique constraint (catches 23505 duplicate key errors).

**Score:** `___`

---

### Q10. Refund Entry Integrity

**Question:** When a refund is processed, does it create a negative ledger entry linked to the original payment? Can the original payment be deleted if a refund references it?

**Evidence path:** `lib/ledger/append.ts`, `database/migrations/20260330000069_fix_ledger_refund_fk_restrict.sql`

**Research findings:** Migration adds ON DELETE RESTRICT to `refunded_entry_id` FK. Combined with the immutability trigger (no DELETE at all), this is belt-and-suspenders.

**Score:** `___`

---

### Q11. Currency Rounding Consistency

**Question:** Are all monetary values stored in cents (integers)? Is there any floating-point arithmetic on financial amounts anywhere in the codebase?

**Evidence path:** grep for `toFixed`, `parseFloat` near financial fields, `/ 100` operations

**Score:** `___`

---

### Q12. Payment Status Derivation

**Question:** Is `events.payment_status` computed by a DB trigger from ledger entries, or can application code write it directly (creating a divergence between ledger truth and displayed status)?

**Evidence path:** `database/migrations/20260215000003_layer_3_events_quotes_financials.sql` (trigger), `event_financial_summary` view

**Score:** `___`

---

### Q13. Gift Card / Voucher Redemption Safety

**Question:** Can a gift card code be redeemed twice? Does the redemption check happen atomically (preventing race conditions between two concurrent requests)?

**Evidence path:** `app/(client)/my-events/[id]/pay/payment-page-client.tsx`, gift card redemption server actions

**Score:** `___`

---

## Category C: Event FSM Resilience

### Q14. CAS Guard on Event Transitions

**Question:** Does `transition_event_atomic()` use a CAS guard (WHERE status = from_status) to prevent two concurrent transitions from both succeeding?

**Evidence path:** `database/migrations/20260320000001_atomic_transition_and_dlq.sql` (line 31-49), `lib/events/transitions.ts` (line 252-293)

**Research findings:** The DB function does NOT check `WHERE status = p_from_status` - it only checks `WHERE id = p_event_id AND tenant_id = p_tenant_id`. However, the application layer has a post-transition verification (lines 266-293) that re-reads the event and detects if another request won the race. Side effects (emails, notifications, PDFs) are skipped if the race was lost. This is a detect-and-skip pattern, not a prevent pattern.

**Score:** `___`

---

### Q15. Invalid Transition Rejection

**Question:** If an API call tries to transition an event from `draft` directly to `completed` (skipping intermediate states), is it rejected?

**Evidence path:** `lib/events/transitions.ts` (TRANSITION_RULES map, line 140)

**Score:** `___`

---

### Q16. Cancelled Event Resurrection

**Question:** Once an event is `cancelled`, can it be transitioned back to any active state? What happens to ledger entries and invoices?

**Evidence path:** `lib/events/transitions.ts` (TRANSITION_RULES for 'cancelled'), `lib/events/cancellation.ts`

**Score:** `___`

---

### Q17. Readiness Gate Enforcement

**Question:** Do hard-block readiness gates (e.g., unconfirmed anaphylaxis allergy) actually prevent transitions, or can they be bypassed?

**Evidence path:** `lib/events/readiness.ts`, `lib/events/transitions.ts` (lines 190-212)

**Score:** `___`

---

### Q18. System (Webhook) Transition Bypass

**Question:** When Stripe triggers a payment-succeeded webhook and the system auto-transitions to `paid`, does it bypass readiness gates? Could this create a dangerous state (e.g., event marked "paid" with unconfirmed severe allergies)?

**Evidence path:** `lib/events/transitions.ts` (line 190: `if (!isSystemTransition)`)

**Score:** `___`

---

## Category D: Communication Pipeline

### Q19. Email Delivery Verification

**Question:** When `sendInquiryReceivedEmail` or `sendNewInquiryChefEmail` fails (Resend API down, bad email address), is the failure logged? Is there a retry mechanism? Does the user get any feedback?

**Evidence path:** `lib/email/notifications.ts`, `app/api/webhooks/resend/route.ts`

**Score:** `___`

---

### Q20. Resend Webhook Processing

**Question:** Does the app process Resend webhooks (delivery, bounce, complaint) to track email delivery status? Are bounced emails flagged so the system stops sending to them?

**Evidence path:** `app/api/webhooks/resend/route.ts`

**Score:** `___`

---

### Q21. Client Notification Completeness

**Question:** At each event state transition, does the client receive appropriate notification? Map every transition to its notification:

- draft -> proposed (client should see proposal)
- proposed -> accepted (chef should see acceptance)
- accepted -> paid (both should get payment confirmation)
- paid -> confirmed (client should get confirmation)
- - -> cancelled (both parties should be notified)

**Evidence path:** `lib/events/transitions.ts` (post-transition side effects), `lib/email/notifications.ts`

**Score:** `___`

---

### Q22. SMS Delivery

**Question:** Does the system send SMS notifications? Is there a Twilio SMS integration for time-sensitive alerts (event day reminders, payment received)?

**Evidence path:** `app/api/comms/sms/route.ts`, `lib/calling/twilio-actions.ts`

**Score:** `___`

---

### Q23. Push Notification Delivery

**Question:** Are web push notifications functional? Do subscribe/unsubscribe endpoints work? Is the VAPID key configured?

**Evidence path:** `app/api/push/subscribe/route.ts`, `app/api/push/unsubscribe/route.ts`, `app/api/push/resubscribe/route.ts`

**Score:** `___`

---

## Category E: Client Portal Experience

### Q24. Client Portal Auth Flow

**Question:** Can a client sign up, sign in, and access their portal? Does the invitation flow work end-to-end (chef invites client -> client receives email -> client signs up -> client sees their events)?

**Evidence path:** `lib/auth/actions.ts` (signUpClient), `lib/auth/invitations.ts`, `app/(client)/layout.tsx`

**Score:** `___`

---

### Q25. Client Data Isolation

**Question:** Can Client A see Client B's events, quotes, or messages? Is tenant scoping enforced on every client portal query?

**Evidence path:** `app/(client)/my-events/*/page.tsx`, `app/(client)/my-quotes/*/page.tsx`, `app/(client)/my-chat/*/page.tsx`

**Score:** `___`

---

### Q26. Client Quote Viewing and Response

**Question:** When a chef sends a quote, can the client view it in their portal? Can they accept/reject it? Does the quote FSM update correctly?

**Evidence path:** `app/(client)/my-quotes/[id]/page.tsx`, `lib/quotes/client-actions.ts`

**Score:** `___`

---

### Q27. Client Payment Flow

**Question:** Can a client pay for an event through the portal? Does Stripe Checkout work? Does the event transition to `paid` after successful payment?

**Evidence path:** `app/(client)/my-events/[id]/pay/page.tsx`, `app/api/webhooks/stripe/route.ts`

**Score:** `___`

---

### Q28. Client Menu Approval Flow

**Question:** When a chef attaches a menu to an event and requests approval, can the client view and approve it in their portal?

**Evidence path:** `app/(client)/my-events/[id]/approve-menu/page.tsx`, `app/(client)/my-events/[id]/choose-menu/page.tsx`

**Score:** `___`

---

### Q29. Client Contract Signing

**Question:** Can a client view and sign a contract through the portal? Does the signature persist? Is there a countersign flow for the chef?

**Evidence path:** `app/(client)/my-events/[id]/contract/page.tsx`, `lib/contracts/`

**Score:** `___`

---

### Q30. Dinner Circle (Hub) Client Experience

**Question:** When an inquiry creates a Dinner Circle, can the client access it via the group token URL? Can they post messages? Is the experience coherent for a first-time visitor?

**Evidence path:** `app/(client)/my-hub/g/[groupToken]/page.tsx`, `lib/hub/group-actions.ts`

**Score:** `___`

---

## Category F: Data Integrity & Consistency

### Q31. Cascading Delete Safety

**Question:** If a chef account is deleted, what happens to their clients, events, ledger entries, and invoices? Is there a cascading delete? Or is deletion soft (flag-based)?

**Evidence path:** Database schema ON DELETE clauses, `lib/auth/account-deletion.ts` or similar

**Score:** `___`

---

### Q32. Orphan Record Prevention

**Question:** If an inquiry is created but the event creation (step 5 in embed route) fails, is the inquiry left orphaned? Does this create a confusing state in the chef's inbox?

**Evidence path:** `app/api/embed/inquiry/route.ts` (lines 288-325)

**Research findings:** Event creation is wrapped in try/catch (non-blocking). If it fails, the inquiry exists but has no linked event. The inquiry appears in the inbox with status `new`. The chef can still see it and manually create an event. Not ideal but not a data integrity violation.

**Score:** `___`

---

### Q33. Cache Invalidation Completeness

**Question:** When a server action mutates data, does it bust every relevant cache? Specifically: does the chef layout cache (`chef-layout-{chefId}`) get busted when the chef updates their profile, business name, or subscription status?

**Evidence path:** `lib/chef/layout-cache.ts`, `lib/chef/layout-data-cache.ts`, search for `revalidateTag('chef-layout')`

**Score:** `___`

---

### Q34. Database Connection Pool Exhaustion

**Question:** With `max: 10` connections and a 30s statement timeout, what happens if 11 concurrent requests hit the database? Does the 11th request queue, timeout, or crash?

**Evidence path:** `lib/db/index.ts` (line 14: `max: 10`)

**Score:** `___`

---

### Q35. Transaction Isolation for Multi-Step Operations

**Question:** The embed inquiry route creates a client, inquiry, event, circle, and sends emails in sequence. If the app crashes mid-sequence, what's the state? Is there any transactional grouping?

**Evidence path:** `app/api/embed/inquiry/route.ts` (steps 2-8)

**Score:** `___`

---

## Category G: AI Degradation

### Q36. Remy Offline Behavior

**Question:** When Ollama is offline, what does the user see when they open the Remy chat? Is there a clear error message, or does the chat just hang?

**Evidence path:** `lib/ai/remy-actions.ts`, `components/ai/remy-drawer.tsx`, `lib/ai/ollama-errors.ts`

**Score:** `___`

---

### Q37. AI Fallback Pattern Consistency

**Question:** Does every AI-powered feature use `withAiFallback` (formula first, AI enhancement optional)? Or do some features hard-depend on Ollama with no fallback?

**Evidence path:** `lib/ai/with-ai-fallback.ts`, search for `parseWithOllama` calls without `withAiFallback` wrapper

**Score:** `___`

---

### Q38. Lead Scoring Failure Mode

**Question:** If the AI lead scoring (`onInquiryCreated` in embed route step 8) fails, does the inquiry still appear in the chef's inbox? Is the lead score shown as "N/A" or does it show a fake score?

**Evidence path:** `app/api/embed/inquiry/route.ts` (lines 407-421), `lib/ai/reactive/hooks.ts`

**Score:** `___`

---

### Q39. AI Context Data Leakage

**Question:** Does Remy's context loader send data from one chef's tenant to another chef's conversation? Is tenant isolation enforced in the AI context assembly?

**Evidence path:** `lib/ai/remy-context.ts`, `lib/ai/remy-actions.ts`

**Score:** `___`

---

## Category H: Infrastructure Resilience

### Q40. Cron Route Authentication

**Question:** Are all cron routes protected by `verifyCronAuth`? Can an external attacker trigger cron jobs by hitting the URL directly?

**Evidence path:** All 16 files in `app/api/cron/*/route.ts`

**Research findings:** All 16 cron route files import and call `verifyCronAuth`. No cron route is publicly callable without the secret.

**Score:** `___`

---

### Q41. Health Check Informativeness

**Question:** Do health endpoints (`/api/health`, `/api/health/readiness`, `/api/health/ping`) expose internal system information to unauthenticated users (database versions, connection strings, internal IPs)?

**Evidence path:** `app/api/health/route.ts`, `app/api/health/readiness/route.ts`, `app/api/health/ping/route.ts`

**Score:** `___`

---

### Q42. Error Response Sanitization

**Question:** When a server action or API route throws an unexpected error, does the error response leak stack traces, file paths, or SQL queries to the client?

**Evidence path:** Global error handling, Next.js error boundaries, API catch blocks

**Score:** `___`

---

### Q43. Database Migration Rollback

**Question:** If a migration fails halfway through, is the database left in a partially migrated state? Are migrations wrapped in transactions?

**Evidence path:** `database/migrations/*.sql`, migration runner configuration

**Score:** `___`

---

### Q44. Storage File Access Control

**Question:** Can an unauthenticated user access stored files (uploaded documents, invoices, contracts) by guessing the URL? Is signed URL verification enforced?

**Evidence path:** `app/api/storage/[...path]/route.ts`, `app/api/storage/public/[...path]/route.ts`, `lib/storage/index.ts`

**Score:** `___`

---

## Category I: Webhook & External Integration

### Q45. Stripe Webhook Signature Verification

**Question:** Does the Stripe webhook handler verify the webhook signature before processing? Can an attacker forge a webhook payload?

**Evidence path:** `app/api/webhooks/stripe/route.ts` (signature verification)

**Score:** `___`

---

### Q46. Twilio Webhook Validation

**Question:** Does the Twilio webhook handler verify the `X-Twilio-Signature` header? Can an attacker forge call status updates?

**Evidence path:** `app/api/webhooks/twilio/route.ts`, `app/api/calling/*/route.ts`

**Score:** `___`

---

### Q47. Wix Webhook Idempotency

**Question:** If Wix sends duplicate form submissions (same `submissionId`), does the system create duplicate inquiries?

**Evidence path:** `app/api/webhooks/wix/route.ts` (idempotency check on lines 80-91)

**Research findings:** Checks `wix_submissions` table for existing submission ID. If found, returns `{ received: true, cached: true }`. Falls back to SHA-256 hash of payload for submissions without IDs. Solid.

**Score:** `___`

---

### Q48. Stripe Connect Onboarding

**Question:** When a chef connects Stripe for the first time, does the `account.updated` webhook correctly update their Stripe account status? Can they accept payments immediately after connecting?

**Evidence path:** `app/api/webhooks/stripe/route.ts` (account.updated handler)

**Score:** `___`

---

## Category J: Operational Safety

### Q49. Demo Mode Isolation

**Question:** When `DEMO_MODE_ENABLED=true` is set, can demo routes affect production data? Is the demo data tenant-scoped?

**Evidence path:** `app/api/demo/data/route.ts`, `app/api/demo/tier/route.ts`, `app/api/demo/switch/route.ts`

**Research findings:** Demo routes check both `NODE_ENV !== 'production'` AND `DEMO_MODE_ENABLED === 'true'`. Demo data operations use a specific demo chef from `.auth/demo-chef.json` and scope operations by tenant ID. Double-gated.

**Score:** `___`

---

### Q50. Admin-Only Feature Gates

**Question:** Are prospecting, calling, and staff management features properly gated behind `isAdmin()` / `adminOnly` / `requireAdmin()`? Can a non-admin user access them via direct URL?

**Evidence path:** `components/navigation/nav-config.tsx` (adminOnly flags), page-level checks

**Score:** `___`

---

## Scorecard

| Q   | Category  | Score       | Evidence Summary                                                                                                                                                           |
| --- | --------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1  | Security  | **PARTIAL** | Most unprotected routes public by design. `ai/wake`, `ai/monitor`, `ingredients/search`, `ingredients/[id]` lack auth but low-risk (no PII).                               |
| Q2  | Security  | **PASS**    | Document routes call requireChef/requireClient and verify tenant ownership.                                                                                                |
| Q3  | Security  | **PASS**    | Kiosk uses hashed device token, rate-limited pairing (5/5min), expiry check, status validation.                                                                            |
| Q4  | Security  | **PASS**    | SSE requires auth + per-channel validation via `validateRealtimeChannelAccess()`. Fails closed on unknown prefixes.                                                        |
| Q5  | Security  | **PASS**    | Calendar feed uses opaque `ical_feed_token`, requires `ical_feed_enabled`, rate-limited 60/min, can be regenerated.                                                        |
| Q6  | Security  | **PASS**    | Next.js 14+ built-in CSRF protection via Origin header check. No bypass configured.                                                                                        |
| Q7  | Security  | **PASS**    | All auth endpoints rate-limited: signUp, signIn, forgotPassword (3/hr), changePassword (5/hr), changeEmail (3/hr).                                                         |
| Q8  | Financial | **PASS**    | DB triggers `prevent_ledger_update` and `prevent_ledger_delete` raise exception on any mutation.                                                                           |
| Q9  | Financial | **PASS**    | `transaction_reference` dedup in ledger_entries + `idempotency_key` unique constraint on commerce_payments.                                                                |
| Q10 | Financial | **PASS**    | ON DELETE RESTRICT on `refunded_entry_id` FK + immutability triggers = belt-and-suspenders.                                                                                |
| Q11 | Financial | **PASS**    | All financial storage uses integer cents. `toFixed` only used for display formatting, never calculation/storage.                                                           |
| Q12 | Financial | **PASS**    | DB trigger is sole writer of payment_status. Removed direct write from `markEventPaidOffline`. Only `payment_method_primary` set directly.                                 |
| Q13 | Financial | **PASS**    | `redeemIncentiveCode()` uses atomic `redeem_incentive()` Postgres RPC. All three writes (ledger, balance, audit) are atomic.                                               |
| Q14 | FSM       | **PASS**    | Migration 20260415000023 added `AND status = p_from_status` CAS guard to `transition_event_atomic`. Race prevented at DB level.                                            |
| Q15 | FSM       | **PASS**    | TRANSITION_RULES map explicitly enumerates valid next states. Invalid transitions throw error.                                                                             |
| Q16 | FSM       | **PASS**    | `cancelled: []` = terminal state. No resurrection possible.                                                                                                                |
| Q17 | FSM       | **PARTIAL** | Hard blocks throw and prevent transition. But readiness evaluator infrastructure errors are swallowed (non-blocking), so a crashing evaluator lets the transition through. |
| Q18 | FSM       | **PARTIAL** | System transitions (Stripe webhooks) skip readiness gates entirely. Payment can land on event with unconfirmed severe allergies. Chef must catch it at paid->confirmed.    |
| Q19 | Comm      | **PASS**    | Email sending has try/catch, 1 automatic retry with backoff, circuit breaker (trips after 5 failures), bounce suppression list.                                            |
| Q20 | Comm      | **PASS**    | Resend webhook tracks bounces/spam on `campaign_recipients`. Send-side bounce detection adds addresses to `email_suppressions` table.                                      |
| Q21 | Comm      | **PASS**    | Client notifications sent for: proposed, paid, confirmed, in_progress, completed, cancelled. Both in-app and email channels.                                               |
| Q22 | Comm      | **PASS**    | SMS fully implemented with Twilio. Inbound handling, HMAC-SHA1 validation, rate limiting, TwiML response.                                                                  |
| Q23 | Comm      | **PASS**    | Web push fully implemented: VAPID key management, RFC 8291 encryption, subscription persistence, SSRF protection, expired subscription detection.                          |
| Q24 | Client    | **PASS**    | Client layout calls `requireClient()`. `signUpClient` creates auth user + client record + user_roles entry atomically.                                                     |
| Q25 | Client    | **PASS**    | All client queries scoped by `.eq('client_id', user.entityId)` where user comes from `requireClient()`.                                                                    |
| Q26 | Client    | **PASS**    | Client can view quote details, accept (atomic RPC), and reject. All scoped by client ownership.                                                                            |
| Q27 | Client    | **PASS**    | Payment page has Stripe Elements integration, gift card redemption, `createPaymentIntent` reads updated outstanding.                                                       |
| Q28 | Client    | **PASS**    | Menu approval page renders menu items with approve/request-revision actions. Status tracking (sent/approved/revision_requested).                                           |
| Q29 | Client    | **PASS**    | Contract signing page has signature capture, view tracking (idempotent), status rendering.                                                                                 |
| Q30 | Client    | **PASS**    | Hub group page auto-joins client, loads full group data (members, notes, media, availability, events, meal board). Supports posting.                                       |
| Q31 | Data      | **PASS**    | Account deletion is soft-delete (30-day grace period via `deletion_requested_at` + auth user ban). Not hard delete.                                                        |
| Q32 | Data      | **PARTIAL** | Inquiry exists without paired event if event creation fails. No explicit UI warning to chef about the missing event link.                                                  |
| Q33 | Data      | **PASS**    | Profile/archetype/nav changes bust layout cache. Stripe webhook now calls `revalidateTag('chef-layout-{chefId}')` after subscription updates.                              |
| Q34 | Data      | **PASS**    | postgres.js `max: 10`, `idle_timeout: 20`, `connect_timeout: 10s`, `statement_timeout: 30s`. Queues when full. Adequate for traffic level.                                 |
| Q35 | Data      | **PASS**    | Embed inquiry route has compensating cleanup: if inquiry insert fails after client creation, newly-created client is deleted. Event creation was already non-blocking.     |
| Q36 | AI        | **PASS**    | `OllamaOfflineError` caught in use-remy-send.ts, displays friendly offline message. Drawer probes `/api/ai/wake` and shows "Limited mode" banner.                          |
| Q37 | AI        | **PARTIAL** | Only 10 of ~57 `parseWithOllama` call sites use `withAiFallback`. Remaining ~47 hard-depend on Ollama with no fallback.                                                    |
| Q38 | AI        | **PASS**    | AI lead scoring is non-blocking try/catch. Inquiry persisted before AI call. Score shown as unavailable if AI fails.                                                       |
| Q39 | AI        | **PASS**    | `remy-context.ts` derives tenantId from `requireChef()`. Every query scoped by `.eq('tenant_id', tenantId)`.                                                               |
| Q40 | Infra     | **PASS**    | All 16 cron routes use `verifyCronAuth`. No public cron access.                                                                                                            |
| Q41 | Infra     | **PARTIAL** | Health endpoint exposes missing env var NAMES (not values), circuit breaker states. No connection strings or IPs. Low risk but aids reconnaissance.                        |
| Q42 | Infra     | **PARTIAL** | 40+ API routes return raw `err.message` in JSON responses. Database errors could leak SQL or internal details.                                                             |
| Q43 | Infra     | **PASS**    | Each migration file now wrapped in BEGIN/COMMIT transaction. Partial failures roll back cleanly. Failed files reported as warnings.                                        |
| Q44 | Infra     | **PASS**    | Private storage requires HMAC signed token. Public storage restricted to safe bucket whitelist. Path traversal protection + XSS-safe download headers.                     |
| Q45 | Webhook   | **PASS**    | `stripe.webhooks.constructEvent()` verifies signature. Missing/invalid signature rejected with audit logging.                                                              |
| Q46 | Webhook   | **PASS**    | Custom HMAC-SHA1 validation with timing-safe comparison. Fail-closed: missing auth token rejects with 503.                                                                 |
| Q47 | Webhook   | **PASS**    | `wix_submissions` table dedup. Falls back to SHA-256 payload hash for submissions without IDs.                                                                             |
| Q48 | Webhook   | **PASS**    | `account.updated` handler calls `updateConnectStatusFromWebhook()` to sync Stripe Connect onboarding status.                                                               |
| Q49 | Ops       | **PASS**    | Double-gated: `NODE_ENV !== 'production'` AND `DEMO_MODE_ENABLED === 'true'`. Tenant-scoped.                                                                               |
| Q50 | Ops       | **PASS**    | All 8 prospecting pages call `requireAdmin()`. Nav items have `adminOnly: true`. Non-admin users blocked at both levels.                                                   |

### Summary

| Category               | Questions | PASS   | PARTIAL | FAIL  |
| ---------------------- | --------- | ------ | ------- | ----- |
| A: Security & Auth     | Q1-Q7     | 6      | 1       | 0     |
| B: Financial Integrity | Q8-Q13    | 6      | 0       | 0     |
| C: Event FSM           | Q14-Q18   | 3      | 2       | 0     |
| D: Communication       | Q19-Q23   | 5      | 0       | 0     |
| E: Client Portal       | Q24-Q30   | 7      | 0       | 0     |
| F: Data Integrity      | Q31-Q35   | 4      | 1       | 0     |
| G: AI Degradation      | Q36-Q39   | 3      | 1       | 0     |
| H: Infrastructure      | Q40-Q44   | 3      | 2       | 0     |
| I: Webhooks            | Q45-Q48   | 4      | 0       | 0     |
| J: Ops Safety          | Q49-Q50   | 2      | 0       | 0     |
| **TOTAL**              | **50**    | **43** | **7**   | **0** |

---

## Fix Priority

### FAIL (fix immediately)

**Q35: Embed inquiry route lacks transaction wrapping**

- File: `app/api/embed/inquiry/route.ts`
- Impact: Partial failures (client created, inquiry fails) leave orphaned records
- Fix: Wrap client + inquiry + event creation in a single DB transaction

**Q43: Migrations not wrapped in transactions**

- File: `scripts/init-local-db.sh`
- Impact: Failed migration mid-file leaves schema in broken state
- Fix: Add `BEGIN;` at top and `COMMIT;` at bottom of each migration, or wrap in the bash runner

### PARTIAL (fix in next wave)

**Q18: System transitions bypass readiness gates (MEDIUM)**

- File: `lib/events/transitions.ts:190`
- Fix: Run readiness gates for system transitions but log warnings instead of blocking
- Impact: Payment can land on event with unconfirmed severe allergies

**Q37: 47 AI call sites hard-depend on Ollama (MEDIUM)**

- Impact: Those features fail entirely when Ollama is offline
- Fix: Wrap remaining parseWithOllama calls in withAiFallback where formula fallback is possible

**Q17: Readiness evaluator crash = transition proceeds (LOW)**

- File: `lib/events/transitions.ts:205-211`
- Fix: Re-throw evaluator crashes (don't swallow), or add a circuit breaker
- Impact: Broken evaluator silently lets all transitions through

**Q42: Raw error messages in API responses (LOW)**

- Fix: Replace `err.message` returns with generic "Internal error" messages
- Impact: SQL or stack traces could leak to client on unexpected errors

**Q41: Health endpoint exposes env var names (LOW)**

- File: `lib/health/public-health.ts:163`
- Fix: Redact missingEnv names (return count only)
- Impact: Aids reconnaissance but no direct exploitation

**Q32: No UI warning for orphaned inquiries (LOW)**

- Fix: Show badge or alert on inquiry detail when `converted_to_event_id` is null and inquiry age > 5 minutes
- Impact: Chef might not notice an event wasn't auto-created

### PASS (38 questions, verified, no action needed)

Q2-Q7, Q8-Q11, Q13, Q15-Q16, Q19-Q31, Q34, Q36, Q38-Q40, Q44-Q50
