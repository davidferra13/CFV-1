# System Integrity Question Set

**Purpose:** Define the complete set of verifiable questions that, when all answered YES, put ChefFlow in a fully specified, trustworthy state. Each question maps to an automated test. Every new feature must extend this set.

**Principle:** A question must be answerable with a binary pass/fail. "Mostly works" is not a passing answer. If the system is ambiguous, the question is not yet specified enough.

---

## Coverage Map

| Q   | Title                         | Test File                              | Status | Tier   |
| --- | ----------------------------- | -------------------------------------- | ------ | ------ |
| Q1  | Zero-Data Bootstrap           | q1-zero-data-bootstrap.spec.ts         | BUILT  | UI     |
| Q2  | Core Mutation Loop            | q2-mutation-loop.spec.ts               | BUILT  | UI+API |
| Q3  | Calling System Integrity      | q3-calling-integrity.spec.ts           | BUILT  | Struct |
| Q4  | Event FSM Integrity           | q4-event-fsm.spec.ts                   | BUILT  | Struct |
| Q5  | Optimistic Rollback           | q5-optimistic-rollback.spec.ts         | BUILT  | UI     |
| Q6  | Server Action Auth            | q6-server-action-auth.spec.ts          | BUILT  | Struct |
| Q7  | Tenant Isolation              | q7-tenant-isolation.spec.ts            | BUILT  | API    |
| Q8  | Module Toggle                 | q8-module-toggle.spec.ts               | BUILT  | UI     |
| Q9  | Nav Completeness              | q9-nav-completeness.spec.ts            | BUILT  | UI     |
| Q10 | Financial Hallucination       | q10-financial-hallucination.spec.ts    | BUILT  | UI     |
| Q11 | Priority Queue Coverage       | q11-queue-coverage.spec.ts             | BUILT  | Struct |
| Q12 | Contract Policy Truth         | q12-contract-truth.spec.ts             | BUILT  | Struct |
| Q13 | AI Resilience                 | q13-ai-resilience.spec.ts              | BUILT  | Struct |
| Q14 | TakeAChef Pipeline            | q14-tac-pipeline.spec.ts               | BUILT  | Struct |
| Q15 | Financial View Integrity      | q15-financial-view.spec.ts             | BUILT  | DB     |
| Q16 | Notification Delivery Chain   | q16-notification-delivery.spec.ts      | BUILT  | Struct |
| Q17 | Embed Widget Atomicity        | q17-embed-atomicity.spec.ts            | BUILT  | API    |
| Q18 | Ledger Immutability           | q18-ledger-immutability.spec.ts        | BUILT  | DB     |
| Q19 | Cache Invalidation Parity     | q19-cache-invalidation.spec.ts         | BUILT  | Struct |
| Q20 | PWA / Service Worker          | q20-pwa.spec.ts                        | BUILT  | UI     |
| Q21 | Stripe Webhook Integrity      | q21-stripe-webhook.spec.ts             | BUILT  | Struct |
| Q22 | Quote State Machine Guards    | q22-quote-fsm.spec.ts                  | BUILT  | Struct |
| Q23 | Commerce Sale Guards          | q23-commerce-guards.spec.ts            | BUILT  | Struct |
| Q24 | SSE Channel Isolation         | q24-sse-isolation.spec.ts              | BUILT  | Struct |
| Q25 | Storage Security              | q25-storage-security.spec.ts           | BUILT  | Struct |
| Q26 | Staff Tenant Scoping          | q26-staff-tenant-scoping.spec.ts       | BUILT  | Struct |
| Q27 | Migration Timestamp Integrity | q27-migration-ordering.spec.ts         | BUILT  | DB     |
| Q28 | Hub Token Security            | q28-hub-token-security.spec.ts         | BUILT  | Struct |
| Q29 | Email Delivery Gate           | q29-email-delivery-gate.spec.ts        | BUILT  | Struct |
| Q30 | Input Validation Surface      | q30-input-validation-surface.spec.ts   | BUILT  | Struct |
| Q31 | Onboarding Integrity          | q31-onboarding-integrity.spec.ts       | BUILT  | Struct |
| Q32 | AI Routing Boundary           | q32-ai-routing-boundary.spec.ts        | BUILT  | Struct |
| Q33 | Ledger Append Idempotency     | q33-ledger-idempotency.spec.ts         | BUILT  | Struct |
| Q34 | Broadcast Tenant Scoping      | q34-broadcast-tenant-scoping.spec.ts   | BUILT  | Struct |
| Q35 | Recipe Generation Block       | q35-recipe-generation-block.spec.ts    | BUILT  | Struct |
| Q36 | Financial View Integrity II   | q36-financial-view-integrity.spec.ts   | BUILT  | DB     |
| Q37 | Embed CORS and Atomicity      | q37-embed-cors-atomicity.spec.ts       | BUILT  | API    |
| Q38 | Calling System Auth Gate      | q38-calling-auth-gate.spec.ts          | BUILT  | Struct |
| Q39 | Event FSM Terminal States     | q39-event-fsm-terminal-states.spec.ts  | BUILT  | Struct |
| Q40 | Staff Action Auth             | q40-staff-action-auth.spec.ts          | BUILT  | Struct |
| Q41 | Remy SSRF Protection          | q41-remy-ssrf-protection.spec.ts       | BUILT  | Struct |
| Q42 | Remy Input Guards             | q42-remy-input-guards.spec.ts          | BUILT  | Struct |
| Q43 | Quote Expiry Guard            | q43-quote-expiry-guard.spec.ts         | BUILT  | Struct |
| Q44 | Installment Void Trigger      | q44-installment-void-trigger.spec.ts   | BUILT  | Struct |
| Q45 | Prospecting Admin Gate        | q45-prospecting-admin-gate.spec.ts     | BUILT  | Struct |
| Q46 | Expense Category Allowlist    | q46-expense-category-allowlist.spec.ts | BUILT  | Struct |
| Q47 | Storage Path Traversal        | q47-storage-path-traversal.spec.ts     | BUILT  | Struct |
| Q48 | Admin Action Boundary         | q48-admin-action-boundary.spec.ts      | BUILT  | Struct |
| Q49 | Cross-Role Action Isolation   | q49-cross-role-isolation.spec.ts       | BUILT  | Struct |
| Q50 | Admin Layout Completeness     | q50-admin-layout-completeness.spec.ts  | BUILT  | Struct |
| Q51 | Client Portal IDOR            | q51-client-portal-idor.spec.ts         | BUILT  | Struct |
| Q52 | Nav Admin Parity              | q52-nav-admin-parity.spec.ts           | BUILT  | Struct |
| Q53 | Session Expiry Fail-Closed    | q53-session-expiry-fail-closed.spec.ts | BUILT  | Struct |
| Q54 | Document Download Auth        | q54-document-download-auth.spec.ts     | BUILT  | Struct |
| Q55 | Loyalty Table Tenant Scoping  | q55-loyalty-table-scoping.spec.ts      | BUILT  | Struct |
| Q56 | Admin Self-Promotion Block    | q56-admin-self-promotion.spec.ts       | BUILT  | Struct |
| Q57 | Remy Admin Action Boundary    | q57-remy-admin-action-boundary.spec.ts | BUILT  | Struct |
| Q58 | Pricing Silent Zero Guard     | q58-pricing-silent-zero.spec.ts        | SPEC   | DB     |
| Q59 | Embed Chef Notification       | q59-embed-chef-notification.spec.ts    | SPEC   | Struct |
| Q60 | Embed Email Rate Limit        | q60-embed-email-rate-limit.spec.ts     | SPEC   | API    |
| Q61 | Stripe Webhook Ledger Safety  | q61-stripe-webhook-ledger.spec.ts      | SPEC   | Struct |
| Q62 | Menu Lock Enforcement         | q62-menu-lock-enforcement.spec.ts      | SPEC   | Struct |
| Q63 | Ingredient Dedup Guard        | q63-ingredient-dedup.spec.ts           | SPEC   | DB     |
| Q64 | Follow-Up Send CAS Guard      | q64-followup-cas-guard.spec.ts         | SPEC   | Struct |
| Q65 | Notification Non-Blocking     | q65-notification-non-blocking.spec.ts  | SPEC   | Struct |
| Q66 | Offline Refund Idempotency    | q66-offline-refund-idempotency.spec.ts | SPEC   | Struct |
| Q67 | Public Storage Bucket Gate    | q67-storage-bucket-gate.spec.ts        | SPEC   | API    |
| Q68 | Hub Read Action Auth          | q68-hub-read-auth.spec.ts              | SPEC   | API    |
| Q69 | Hub Guest Count IDOR          | q69-hub-guest-count-idor.spec.ts       | SPEC   | API    |
| Q70 | Hub Noindex Meta              | q70-hub-noindex.spec.ts                | SPEC   | Struct |
| Q71 | Email Suppression List        | q71-email-suppression.spec.ts          | SPEC   | Struct |
| Q72 | Email Retry on Transient      | q72-email-retry.spec.ts                | SPEC   | Struct |
| Q73 | Over-Refund Guard             | q73-over-refund-guard.spec.ts          | SPEC   | Struct |
| Q74 | Cancel Expires Stripe Session | q74-cancel-stripe-expire.spec.ts       | SPEC   | Struct |
| Q75 | File Upload Type Validation   | q75-upload-type-validation.spec.ts     | SPEC   | API    |

---

## Question Definitions

### Q1: Zero-Data Bootstrap

**Hypothesis:** Every chef route renders without crashing for a new account with no data.  
**Failure:** HTTP 500, blank white screen, "Application error" text.  
**Scope:** All routes in the chef nav.

### Q2: Core Mutation Loop

**Hypothesis:** Create → Read → Update for a client entity persists correctly across page reloads.  
**Failure:** Stale data shown after update, or created entity never appears in list.  
**Scope:** Client entity (the most common mutation target).

### Q3: Calling System Integrity

**Hypothesis:** Twilio webhook auth gate blocks unsigned requests; ai_calls.result column exists; price point writes are idempotent.  
**Failure:** Unsigned requests return 200, duplicate price records created on retry.  
**Scope:** /api/calling/gather, ai_calls schema, twilio-actions.ts.

### Q4: Event FSM Integrity

**Hypothesis:** State transitions use the atomic RPC with CAS guard; cancellation voids installments; ledger entries are immutable.  
**Failure:** Events jump states, double-charge on race condition, installments fire after cancel.  
**Scope:** lib/events/transitions.ts, payment_plan_installments trigger.

### Q5: Optimistic Rollback

**Hypothesis:** Every optimistic UI update has a try/catch that rolls back on server failure.  
**Failure:** UI shows success state after a server action that threw an error.  
**Scope:** All startTransition calls with optimistic updates.

### Q6: Server Action Auth Completeness

**Hypothesis:** Every exported async function in a 'use server' file begins with an auth guard.  
**Failure:** A server action callable without a session, exposing data or allowing mutations.  
**Scope:** All files with 'use server' directive.

### Q7: Tenant Isolation

**Hypothesis:** A chef cannot read another chef's resources by guessing UUIDs.  
**Failure:** A 200 response with actual data for a cross-tenant ID.  
**Scope:** Event, client, and invoice endpoints.

### Q8: Module Toggle

**Hypothesis:** Disabling a billing module hides its UI and blocks its server actions.  
**Failure:** UI renders for disabled module, or server action succeeds for a disabled feature.  
**Scope:** Settings > Modules, require-pro.ts enforcement.

### Q9: Nav Completeness

**Hypothesis:** Every route linked from the nav actually resolves (no 404 dead links).  
**Failure:** A nav link returns 404, crash, or blank screen.  
**Scope:** All items in the chef sidebar nav config.

### Q10: Financial Hallucination

**Hypothesis:** No financial page displays hardcoded sample values as real data.  
**Failure:** A static "$1,234.56" appears on a financial page that could be mistaken for real revenue.  
**Scope:** /dashboard, /finance, /finance/invoices, /expenses, /finance/reporting.

### Q11: Priority Queue Coverage

**Hypothesis:** The financial queue surfaces ALL five types of financial gaps, including TakeAChef no-deposit events (where outstanding_balance_cents=0 but total_paid_cents=0).  
**Failure:** A chef with unpaid TakeAChef bookings sees an empty financial queue.  
**Scope:** lib/queue/providers/financial.ts.

### Q12: Contract Policy Truth

**Hypothesis:** Generated contracts contain real cancellation policy text derived from chef settings, not the placeholder "Per standard cancellation policy."  
**Failure:** A client receives a contract with no meaningful cancellation terms.  
**Scope:** lib/contracts/actions.ts, lib/cancellation/policy.ts.

### Q13: AI Resilience

**Hypothesis:** AI paths fail visibly (not silently); PII routes to Ollama; recipe generation is blocked; think tokens stripped.  
**Failure:** Remy returns empty/fabricated response when Ollama is offline; PII sent to Gemini.  
**Scope:** lib/ai/_, lib/ai/simulation/_.

### Q14: TakeAChef Pipeline Integrity

**Hypothesis:** Gmail sync correctly classifies TAC email types; unmatched messages notify the chef; guest contact capture updates client records.  
**Failure:** Chef never knows a TakeAChef client messaged them; contact info never synced.  
**Scope:** lib/gmail/sync.ts TAC handlers.  
**Test approach:** Structural check for notification block in handleTacClientMessage; email type classification coverage.

### Q15: Financial View Integrity

**Hypothesis:** event_financial_summary excludes soft-deleted events; outstanding_balance_cents correctly handles NULL quoted_price_cents.  
**Failure:** Financial reports show revenue from deleted events; TakeAChef events always show $0 outstanding even with real balance.  
**Scope:** DB view definition in migration 20260415000003.

### Q16: Notification Delivery Chain

**Hypothesis:** Key mutations (event status change, new inquiry, menu edit after approval) fire notifications to the correct recipient.  
**Failure:** Chef unaware of client responses; client unaware of post-approval menu changes.  
**Scope:** lib/events/transitions.ts, lib/menus/actions.ts, lib/gmail/sync.ts.

### Q17: Embed Widget Atomicity

**Hypothesis:** Submitting the embed inquiry form creates client + inquiry + draft event atomically. If any step fails, partial state is not left behind.  
**Failure:** Orphaned clients with no inquiry, or inquiries with no linked event, from failed submissions.  
**Scope:** app/api/embed/inquiry/route.ts.

### Q18: Ledger Immutability

**Hypothesis:** ledger_entries rows cannot be updated or deleted after creation. The DB enforces this with a trigger.  
**Failure:** A financial figure changes retroactively because a ledger entry was edited.  
**Scope:** ledger_entries table, immutability trigger.

### Q19: Cache Invalidation Parity

**Hypothesis:** Every unstable_cache tag has a matching revalidateTag call in all server actions that mutate the cached data.  
**Failure:** Stale cached data shown after a mutation (ghost revenue, old client name).  
**Scope:** All unstable_cache uses and all server action mutations.

### Q20: PWA / Service Worker

**Hypothesis:** The service worker is registered, the app installs, and offline mode shows a meaningful message (not a blank screen).  
**Failure:** App crashes offline; PWA install prompt never fires; service worker errors.  
**Scope:** public/sw.js, next.config.js PWA settings.

### Q48: Admin Action Boundary

**Hypothesis:** Every exported server action whose name begins with "admin" calls `requireAdmin()` before any database operation.  
**Failure:** An authenticated non-admin chef calls an admin-prefixed function and reads or mutates platform-wide data.  
**Scope:** All `'use server'` files. Live incident: `lib/discover/actions.ts` had 5 unguarded admin functions (fixed 2026-04-15).

### Q49: Cross-Role Action Isolation

**Hypothesis:** `requireChef()` rejects client and staff sessions; `requireClient()` rejects chef sessions. Role is derived from the JWT, never from the request body.  
**Failure:** A client session calls a chef server action and reads or mutates chef-owned data.  
**Scope:** lib/auth/ helpers, core chef action files (events, clients, quotes, finance).

### Q50: Admin Layout Completeness

**Hypothesis:** Every page under `app/(admin)/` passes through `app/(admin)/layout.tsx`, which calls `requireAdmin()`. No admin page is reachable outside the admin route group. The cannabis layout hard-redirects all users regardless of auth level.  
**Failure:** An admin page outside the layout tree renders without an auth check.  
**Scope:** `app/(admin)/layout.tsx`, `app/(chef)/cannabis/layout.tsx`, all admin pages.

### Q51: Client Portal IDOR Prevention

**Hypothesis:** Client-facing event and quote queries include both the record id AND the `client_id` from session. A client cannot read another client's data by guessing a UUID.  
**Failure:** A logged-in client fetches another client's event by supplying a foreign event UUID.  
**Scope:** `app/(client)/` pages, client portal server actions.

### Q52: Nav Admin Parity

**Hypothesis:** Every nav item marked `adminOnly: true` that lives in the chef route group also has a page-level `requireAdmin()` or `isAdmin()` gate. UI hiding alone is not security.  
**Failure:** A non-admin chef navigates directly to an admin-only URL and sees real data.  
**Scope:** `components/navigation/nav-config.tsx`, prospecting pages, settings/remy page.

### Q53: Session Expiry Fails Closed

**Hypothesis:** `requireChef()`, `requireAdmin()`, and `requireClient()` throw or redirect when the session is null, expired, or missing. No server action completes successfully after expiry.  
**Failure:** An expired session is treated as a valid session and the operation completes.  
**Scope:** `lib/auth/` helpers, `middleware.ts`, all `requireX()` functions.

### Q54: Document Download Authorization

**Hypothesis:** PDF generation and download routes (invoices, contracts, proposals) validate chef ownership via `requireChef()` before serving any file. Signed storage URLs are used for delivery.  
**Failure:** A chef downloads another chef's contract or invoice by guessing a UUID or file path.  
**Scope:** `lib/contracts/actions.ts`, `lib/documents/`, `lib/storage/index.ts`.

### Q55: Loyalty Guest Milestone Tenant Scoping

**Hypothesis:** The `loyalty_guest_milestones` table (migration 20260415000005) has a `chef_id` or `tenant_id` column with a foreign key to `chefs`. All loyalty server actions scope queries to the session chef's id.  
**Failure:** A loyalty query returns milestones from all chefs (cross-tenant data exposure on a new table).  
**Scope:** `database/migrations/20260415000005_loyalty_guest_milestones.sql`, `lib/loyalty/`.

### Q56: Admin Self-Promotion Prevention

**Hypothesis:** No server action callable by a non-admin chef writes to `platform_admins`. Every mutation of that table requires `requireAdmin()`. A regular chef cannot grant themselves admin access.  
**Failure:** A chef calls a server action that inserts a row into `platform_admins` with their own auth user id.  
**Scope:** All `'use server'` files that reference `platform_admins`.

### Q57: Remy Admin Action Boundary

**Hypothesis:** Remy's action registry does not import from `lib/admin/`. Remy calls `requireChef()` not `requireAdmin()`. Recipe generation, modification, and ingredient addition are permanently restricted via `restricted-actions.ts` and `remy-input-validation.ts`.  
**Failure:** A chef uses natural language to trigger an admin server action through Remy, or Remy generates recipe content.  
**Scope:** `lib/ai/remy-actions.ts`, `lib/ai/agent-actions/`, `lib/ai/restricted-actions.ts`, `lib/ai/remy-input-validation.ts`.

### Q58: Pricing Silent Zero Guard

**Hypothesis:** `compute_recipe_cost_cents()` returns NULL (not 0) when any ingredient has no pricing. `event_inventory_variance.variance_cost_cents` is NULL when `last_price_cents` is NULL. Shopping list does not add $0 for unpriced ingredients.
**Failure:** A recipe with unpriced ingredients shows an understated cost. Inventory variance shows $0 cost impact for unpriced ingredients.
**Scope:** `compute_recipe_cost_cents()` DB function, `event_inventory_variance` view, `lib/menus/actions.ts` shopping list.

### Q59: Embed Chef Notification

**Hypothesis:** When a client submits the embed inquiry widget, the chef receives an email notification via `sendNewInquiryChefEmail()` with `source: 'website'`.
**Failure:** Chef never gets notified of embed widget inquiries. Must manually check dashboard.
**Scope:** `app/api/embed/inquiry/route.ts`, `lib/email/notifications.ts`.

### Q60: Embed Email Rate Limit

**Hypothesis:** The embed inquiry route enforces both IP-based (10/5min) and email-based (3/hour) rate limits. Repeated submissions from the same email are blocked regardless of IP.
**Failure:** A spammer with rotating IPs floods a chef with fake inquiries from the same email.
**Scope:** `app/api/embed/inquiry/route.ts`, `lib/rateLimit.ts`.

### Q61: Stripe Webhook Ledger Safety

**Hypothesis:** Stripe webhook handlers for payment_failed, payment_canceled, and dispute_created do NOT attempt zero-amount ledger entries. Refund handlers pass negative `amount_cents` matching the DB constraint `(is_refund=true AND amount_cents < 0)`. All webhook types return 200 so Stripe does not retry.
**Failure:** Zero-amount or wrong-sign ledger entries throw, return 500, trigger infinite Stripe retries. Chef never notified.
**Scope:** `app/api/webhooks/stripe/route.ts`, `lib/ledger/append-internal.ts`.

### Q62: Menu Lock Enforcement

**Hypothesis:** When a menu's status is `locked`, all mutations on its dishes and components are rejected. This includes `updateDish`, `deleteDish`, `addComponentToDish`, `updateComponent`, `deleteComponent`. The lock check covers both UI and server action paths.
**Failure:** A locked menu's content changes after client approval. Client sees different food than approved.
**Scope:** `lib/menus/actions.ts` dish and component CRUD functions.

### Q63: Ingredient Dedup Guard

**Hypothesis:** The `ingredients` table has a unique constraint on `(tenant_id, lower(name))`. Concurrent `findOrCreateIngredient` calls for the same name cannot create duplicates.
**Failure:** Duplicate ingredients per tenant cause split cost data and inconsistent shopping lists.
**Scope:** `database/migrations/20260415000015`, `lib/recipes/actions.ts`.

### Q64: Follow-Up Send CAS Guard

**Hypothesis:** `processPendingSend` uses a CAS guard (`.eq('status', 'pending')`) on the status update. Concurrent cron runs cannot double-send the same follow-up email. Send failures use `'failed'` status, not `'bounced'`.
**Failure:** Client receives duplicate follow-up emails.
**Scope:** `lib/follow-up/sequence-engine.ts`.

### Q65: Notification Non-Blocking Contract

**Hypothesis:** `createNotification()` never throws on DB insert failure. It returns null or `{ success: false }` and logs the error. Parent operations (webhooks, transitions) are never crashed by notification failures.
**Failure:** DB hiccup during notification insert crashes payment webhook handler.
**Scope:** `lib/notifications/actions.ts`.

### Q66: Offline Refund Idempotency

**Hypothesis:** Offline refund ledger entries have a deterministic `transaction_reference` that prevents duplicate entries via the UNIQUE constraint. Double-click or network retry cannot create two refund records.
**Failure:** Double refund in ledger, corrupting financial reports.
**Scope:** `lib/cancellation/refund-actions.ts`.

### Q67: Public Storage Bucket Gate

**Hypothesis:** The public storage route (`/api/storage/public/`) only serves files from explicitly allowlisted buckets. Private buckets (receipts, chat-attachments, client-photos) return 404.
**Failure:** Private files accessible without authentication via the public route.
**Scope:** `app/api/storage/public/[...path]/route.ts`.

### Q68: Hub Read Action Auth

**Hypothesis:** Hub read server actions (`getHubMessages`, `searchHubMessages`) verify `groupToken` matches `groupId` when called from client code. Providing an arbitrary `groupId` without a valid `groupToken` is rejected.
**Failure:** IDOR - any browser can call server actions with arbitrary group UUIDs and read private dinner circle data.
**Scope:** `lib/hub/message-actions.ts`.

### Q69: Hub Guest Count IDOR

**Hypothesis:** `postGuestCountUpdate` verifies the `eventId` is linked to the `groupId` via `hub_group_events`. Providing an unrelated `eventId` is rejected.
**Failure:** Any circle member can modify guest count on any event in the database.
**Scope:** `lib/hub/client-quick-actions.ts`.

### Q70: Hub Noindex Meta

**Hypothesis:** Public hub group pages (`/hub/g/[groupToken]`) include `robots: { index: false }` metadata. Private dinner circle data is never indexed by search engines.
**Failure:** Search engines index private dinner circle conversations, dietary info, and member names.
**Scope:** `app/(public)/hub/g/[groupToken]/page.tsx`.

### Q71: Email Suppression List

**Hypothesis:** `sendEmail()` checks the `email_suppressions` table before sending. Bounced/invalid addresses are skipped. Hard bounce errors from Resend automatically add the address to the suppression list.
**Failure:** Repeated sends to dead addresses degrade sender reputation and waste API quota.
**Scope:** `lib/email/send.ts`, `database/migrations/20260415000019_email_suppression_list.sql`.

### Q72: Email Retry on Transient

**Hypothesis:** `sendEmail()` retries once with 1s backoff on transient failures (5xx, timeout, network error). Non-retryable errors (4xx) are not retried.
**Failure:** Transient API blip permanently loses payment confirmations and event invitations.
**Scope:** `lib/email/send.ts`.

### Q73: Over-Refund Guard

**Hypothesis:** `initiateRefund` checks cumulative refunds against total paid before issuing. For offline refunds, `amountCents > netRefundableCents` is rejected server-side.
**Failure:** Chef refunds more than client paid. Negative ledger balance corrupts financial reports.
**Scope:** `lib/cancellation/refund-actions.ts`.

### Q74: Cancel Expires Stripe Session

**Hypothesis:** When an event transitions to `cancelled`, any active Stripe Checkout Sessions for that event are expired via `stripe.checkout.sessions.expire()`. Client cannot complete payment on a cancelled event.
**Failure:** Money captured for cancelled event with no automatic refund.
**Scope:** `lib/events/transitions.ts`, `lib/stripe/checkout.ts`.

### Q75: File Upload Type Validation

**Hypothesis:** Guest photo uploads and hub media uploads validate file MIME type against an allowlist. Only image types (JPEG, PNG, HEIC, HEIF, WebP) are accepted. File extension is derived from MIME type, not filename.
**Failure:** Arbitrary file types (.exe, .html, .js) uploaded by unauthenticated users.
**Scope:** `lib/guest-photos/actions.ts`, `lib/hub/media-actions.ts`.

---

## Improvement Principles

These principles guide how new questions are added:

1. **Every new integration surface gets a Q.** When TakeAChef was added, Q14 was born.
2. **Every recent bug gets a regression Q.** Q12 exists because contracts had the wrong policy field for months. Q48 exists because discover.ts had 5 unguarded admin functions.
3. **Every financial path gets a Q.** Revenue is the product. Financial correctness is non-negotiable.
4. **Qs are additive, never retroactively removed.** If a Q is "obviously always true," it costs nothing to keep it passing.
5. **Questions must be durable.** A Q that only passes because of hardcoded test data is not a Q — it's a lie.
6. **Every new table gets a scoping Q.** Any migration that adds a new table must be followed by a Q that verifies tenant scoping. New tables are the highest-risk moment for cross-tenant data leakage.
7. **Every access control layer gets a Q.** UI hiding, layout gates, page guards, and server action guards are four independent layers. A Q must verify each layer independently — UI hiding is not security.

---

## Running the Full Suite

```bash
# Full system-integrity suite
npx playwright test -c playwright.system-integrity.config.ts

# Single question
npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q11-queue-coverage.spec.ts

# All structural tests (fast — no browser needed for struct checks)
npx playwright test -c playwright.system-integrity.config.ts --grep "structural|struct"
```

## When to Run

- After every feature that touches financial logic, auth, AI, or integrations
- Before any merge to main
- As part of the live-ops guardian's weekly sweep
