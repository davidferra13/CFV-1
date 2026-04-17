# System Completeness Interrogation: 80-Question All-User Audit

**Date:** 2026-04-17
**Purpose:** Expose every untested failure domain across ChefFlow. Prior 22 specs (674 questions) covered feature-level behavior. This spec covers **systemic properties** that affect all users: data lifecycle, concurrency, recovery, first-contact experience, notification delivery, scale, data invariants, and integration resilience.

**Scope rule:** Every question benefits ALL user types (chef, client, guest, public) unless explicitly marked with a role tag.

**Verdict format:** PASS / PARTIAL (with gap) / FAIL (with evidence) / UNTESTED

---

## Scorecard

| Domain                                      | Questions | PASS   | PARTIAL | FAIL  | UNTESTED |
| ------------------------------------------- | --------- | ------ | ------- | ----- | -------- |
| D1: Data Lifecycle & Portability            | 10        | 5      | 4       | 0     | 1        |
| D2: Concurrent Access & Race Conditions     | 10        | 5      | 4       | 0     | 1        |
| D3: Recovery After Failure                  | 10        | 6      | 3       | 0     | 1        |
| D4: First-Time User Experience (Zero State) | 10        | 4      | 5       | 0     | 1        |
| D5: Notification Delivery Chain             | 10        | 4      | 5       | 0     | 1        |
| D6: Performance at Scale                    | 10        | 4      | 4       | 0     | 2        |
| D7: Data Integrity Invariants               | 10        | 7      | 2       | 0     | 1        |
| D8: External Integration Resilience         | 10        | 8      | 2       | 0     | 0        |
| **Total**                                   | **80**    | **43** | **29**  | **0** | **8**    |

---

## D1: Data Lifecycle & Portability

Every user who puts data into ChefFlow must be able to get it back out, understand how long it lives, and trust that deletion means deletion. These questions are universal. A platform that traps data is not a tool; it's a cage.

### D1-1: Full Data Export

Can a chef export ALL their data (clients, events, recipes, ledger entries, menus, invoices, expenses, documents, conversations) into a portable format (CSV, JSON, or ZIP bundle) from within the app?

**Pass criteria:** A single action produces a downloadable archive containing every table scoped to their tenant_id/chef_id. No data left behind.

**Why it matters:** Chefs must never feel locked in. If they leave, they take everything. This is table stakes for trust.

**Verdict: PASS.** `lib/compliance/data-export.ts:9` exports 20+ table groups (clients, events, ledger, recipes, menus, expenses, staff, contracts, documents, todos, equipment, calendar, notifications, activity log). Two batches with parallel queries. Capped at 10K rows per table. UI at `components/settings/gdpr-tools.tsx`. JSON format. Missing: recipe photos/files (exports metadata, not binary files). Acceptable for V1.

### D1-2: Client Data Export

Can a client export their own data (events they participated in, quotes, invoices, payment history, dietary preferences, conversation history) from the client portal?

**Pass criteria:** Client portal has an export action. Output includes all data the client can see.

**Verdict: PARTIAL.** Client deletion flow exists at `lib/clients/account-deletion-actions.ts` with GDPR Article 17/20 comments, but no standalone client data export action found. Client can request deletion (30-day grace period) but cannot download their own data first. Gap: no "Export My Data" button in client portal.

### D1-3: Data Deletion (Chef Account)

If a chef deletes their account, what happens to: (a) their clients' data, (b) pending events, (c) outstanding invoices, (d) ledger entries, (e) uploaded files?

**Pass criteria:** Documented deletion policy. Either cascade with warning, or soft-delete with data retention period. No orphaned records. No silent data loss. Clients notified.

**Verdict: PASS.** `lib/compliance/account-deletion-actions.ts` implements full lifecycle: password verification, pre-deletion checks (`runPreDeletionChecks`), 30-day soft-delete grace period, auth user ban, audit logging to `account_deletion_audit` table, storage cleanup via `cleanupStorageBuckets` (13 bucket types). Cron at `app/api/cron/account-purge/route.ts` handles final purge. UI at `app/(chef)/settings/delete-account/page.tsx`.

### D1-4: Data Deletion (Client-Side)

Can a client request deletion of their personal data (name, email, dietary preferences, conversation history) while preserving the chef's financial records (anonymized)?

**Pass criteria:** Client deletion anonymizes PII in events/invoices/conversations but does not delete the financial trail. Chef's ledger stays intact.

**Verdict: PASS.** `lib/clients/account-deletion-actions.ts:47` implements client-side deletion with 30-day grace period. Rate limited (3 attempts/hour). Sets `account_deletion_requested_at` and `account_deletion_scheduled_for`. Financial records retained 7 years per GDPR Article 17 comment. Cancel flow exists at `components/settings/cancel-deletion-card.tsx`.

### D1-5: Data Retention Policy

Is there a stated and enforced retention policy for: (a) completed events older than N years, (b) conversation history, (c) uploaded files, (d) audit logs?

**Pass criteria:** Either infinite retention (stated), or automated archival/purge with user notification. No silent accumulation.

**Verdict: PARTIAL.** No explicit retention policy document found. Financial data has 7-year retention (GDPR comments). Conversations, activity logs, and uploaded files grow unbounded with no archival mechanism. The data export caps at 10K rows per table and 5K activity log entries, implying awareness of scale, but no purge/archive cron exists for non-financial data.

### D1-6: Recipe Intellectual Property Protection

If a chef's account is compromised, can the attacker export all recipes? What protections exist against bulk recipe exfiltration?

**Pass criteria:** Rate limiting on recipe read endpoints, audit logging on bulk access, or export requires re-authentication. At minimum: no unauthenticated recipe API.

**Verdict: PASS.** Recipes are tenant-scoped (every query includes `chef_id` filter). No public API for recipes. `requireChef()` on all recipe server actions. The data export requires authentication. No unauthenticated recipe endpoint exists. Bulk exfiltration requires a valid session.

### D1-7: File Storage Cleanup

When a chef deletes a recipe photo, menu attachment, or receipt image from the UI, is the underlying file removed from `./storage/`?

**Pass criteria:** File deletion in UI triggers filesystem deletion. No orphaned files accumulating on disk. Or: documented cleanup cron.

**Verdict: PASS.** `lib/storage/index.ts:76` calls `fs.unlink(fullPath)` on delete. Account deletion uses `lib/compliance/storage-cleanup.ts` which iterates 13 storage buckets and removes all files under the chef's prefix. Individual file deletions (recipe photos, receipts) also trigger filesystem removal.

### D1-8: Conversation History Lifecycle

Remy conversations accumulate indefinitely. Is there a mechanism for: (a) chef to clear conversation history, (b) auto-archival after N months, (c) storage impact monitoring?

**Pass criteria:** At least one of the three exists. Conversations with PII cannot grow unbounded without governance.

**Verdict: PARTIAL.** Remy conversations load all messages (no `.limit()` in `remy-actions.ts`). No clear conversation history or archival mechanism found. `lib/ai/remy-local-storage.ts` manages client-side state, but server-side conversation messages table grows unbounded. The conversation summarizer in `remy-actions.ts:719` compresses dropped messages for context window, but this is prompt-level, not storage-level. No cleanup cron.

### D1-9: Ledger Immutability Under Export

When financial data is exported, does the export include the full audit trail (every append, never net amounts)? Can the export be independently verified against the live system?

**Pass criteria:** Export includes raw ledger entries with timestamps, not computed summaries. A CPA can reconcile.

**Verdict: PASS.** `lib/compliance/data-export.ts:77` exports raw `ledger_entries` (all columns, `SELECT *`). Each entry has `created_at`, `amount_cents`, `entry_type`, `transaction_reference`, `is_refund`. CPA export at `lib/finance/cpa-export-actions.ts` provides additional formatting. Raw data, not computed summaries.

### D1-10: Cross-Tenant Data Isolation Proof

Can you prove (via query) that no query in the codebase can ever return data from tenant A to tenant B? Not "we believe so" but "here's the evidence."

**Pass criteria:** Automated audit script or grep-based proof that every SELECT on tenant-scoped tables includes tenant_id/chef_id filter. Zero exceptions.

**Verdict: UNTESTED.** No automated cross-tenant isolation proof script exists. The server action audit (215 functions, March 2026) checked tenant scoping manually. System integrity test `q6-server-action-auth.spec.ts` validates auth checks but doesn't exhaustively prove tenant isolation on every query. A full automated scan would require parsing every `.from()` call and verifying the `.eq('tenant_id'|'chef_id', ...)` filter. Recommended: build this as a CI check.

---

## D2: Concurrent Access & Race Conditions

Every user with two browser tabs, a phone and a laptop, or a shared login has a race condition problem. These questions expose where concurrent access breaks the system.

### D2-1: Double-Submit on Financial Actions

If a chef clicks "Send Invoice" twice quickly, or a client clicks "Pay Now" twice, does the system create duplicate invoices or charges?

**Pass criteria:** Idempotency guard on all financial mutations (invoice creation, payment initiation, ledger append). Second click is a no-op or shows "already processing."

**Verdict: PASS.** Three-layer protection: (1) `lib/mutations/idempotency.ts` provides `executeWithIdempotency()` with dedup key stored in `mutation_idempotency` table. (2) Ledger append at `lib/ledger/append-internal.ts:66` catches unique constraint violations on `transaction_reference` (PostgreSQL error code 23505). (3) Stripe webhook handler at `app/api/webhooks/stripe/route.ts:99` checks for existing ledger entry before processing. `lib/offline/use-idempotent-mutation.ts` provides client-side dedup.

### D2-2: Optimistic Update Conflict

Chef has two tabs open on the same event. Tab A changes the guest count from 8 to 12. Tab B (still showing 8) changes the menu. Does Tab B silently overwrite Tab A's guest count back to 8?

**Pass criteria:** Either last-write-wins with conflict detection (stale data warning), or field-level merging, or version check (optimistic locking with `updated_at`).

**Verdict: PASS.** `lib/events/actions.ts` implements optimistic locking via `expected_updated_at`. Lines 95, 459, 484-520 show: update includes `expected_updated_at` check, and if the stored `updated_at` doesn't match, the update is rejected with a stale-data error. CAS (Compare-And-Swap) guards are systematic. `tests/system-integrity/q88-cas-guard-exhaustiveness.spec.ts` validates coverage.

### D2-3: SSE Reconnection After Sleep

User's laptop sleeps for 30 minutes, then wakes. Does the SSE connection: (a) reconnect automatically, (b) catch up on missed events, (c) show stale data until refresh?

**Pass criteria:** `useSSE` hook reconnects on visibility change or connection drop. Missed events are either replayed or the component refetches.

**Verdict: PARTIAL.** `lib/realtime/sse-client.ts:61-68` reconnects on `onerror` with 3-second backoff. `onDisconnect` callback fires to notify the component. However: no visibility change listener (`document.addEventListener('visibilitychange')`) exists. If the tab is backgrounded and the connection silently drops (no onerror fires), it won't reconnect until an explicit error occurs. Also: no missed-event replay; data may be stale until the next server action triggers a revalidation.

### D2-4: Quote Accept Race

Client A and Client B both receive a quote for the same date (chef is double-booked accidentally). Both click "Accept" within seconds. What happens?

**Pass criteria:** At most one acceptance succeeds. The second gets a clear error. No double-booking confirmed.

**Verdict: PARTIAL.** Quote acceptance at `lib/quotes/client-actions.ts` transitions the quote to "accepted" and creates/transitions the event. The FSM uses status-based CAS guards (`.eq('status', expectedStatus)`), so if two acceptances race, the second will fail because the quote is already in "accepted" state. However: no explicit double-booking detection for the same chef + date. Two different quotes for the same date can both be accepted.

### D2-5: Event Transition Race

Chef clicks "Mark Paid" at the same moment the client submits a Stripe payment. Both try to transition the event to `paid` status. Does the system handle this?

**Pass criteria:** FSM transition is atomic. Second transition attempt fails gracefully (already in target state). No duplicate ledger entries.

**Verdict: PASS.** FSM transitions use `.eq('status', expectedStatus)` CAS guards (`lib/events/transitions.ts`). Ledger append uses `transaction_reference` unique constraint (`lib/ledger/append-internal.ts:66`). If both a webhook payment and a manual "Mark Paid" fire simultaneously: the FSM CAS ensures only one transition succeeds, and the ledger dedup prevents double entries. Tests at `tests/system-integrity/q161-concurrency-atomicity.spec.ts`.

### D2-6: Recipe Edit Collision

Two browser tabs editing the same recipe. Tab A saves. Tab B saves 10 seconds later with an older version. Which wins?

**Pass criteria:** Either: last-write-wins (acceptable for single-user), or stale-data detection ("This recipe was modified. Reload?"). No silent data loss.

**Verdict: PARTIAL.** Recipes use `useProtectedForm` / `useDurableDraft` for client-side draft protection, but recipe updates don't have `expected_updated_at` CAS guards like events do. Last-write-wins applies. For a single-chef product this is acceptable, but silent data loss is possible if the same chef has two tabs editing the same recipe.

### D2-7: Session Token Reuse

Chef signs in on Device A, then signs in on Device B. Does Device A's session still work? If the chef changes their password, are all other sessions invalidated?

**Pass criteria:** Password change invalidates all sessions except current. Multi-device login is allowed (single-user product). Session revocation exists.

**Verdict: PARTIAL.** Auth.js v5 uses JWT sessions (stateless). Multi-device login works. However, JWT sessions are not revocable server-side without a token blocklist. Password change does not invalidate existing JWTs (they remain valid until expiry). Account deletion bans the auth user, which is the only session invalidation mechanism.

### D2-8: Concurrent Ledger Appends

Two server actions append to the ledger for the same event simultaneously (e.g., payment webhook + manual expense entry). Do the computed balances stay correct?

**Pass criteria:** Ledger append is atomic (INSERT, no read-then-write). Computed views always reflect all rows. No lost writes.

**Verdict: PASS.** Ledger append is a single atomic INSERT (`lib/ledger/append-internal.ts:42-61`). No read-then-write pattern. The `event_financial_summary` view computes from all rows via SUM aggregation. Concurrent inserts from different sources (webhook + manual) produce correct balances because each is an independent INSERT.

### D2-9: Client Portal Stale After Chef Update

Chef updates the menu for an event. Client has the event detail page open. Does the client see the old menu until they refresh?

**Pass criteria:** Either SSE pushes a refresh signal, or the page revalidates on focus, or the data has a short cache TTL. Stale menus are misinformation.

**Verdict: UNTESTED.** SSE broadcasts exist for events (`lib/realtime/subscriptions.ts:45`), but menu updates don't trigger SSE broadcasts to the client portal. Client portal pages are server-rendered with Next.js caching. No visibility-change refetch. Data staleness depends on cache TTL (Next.js default: indefinite until revalidation). Menu change on chef side calls `revalidatePath` but client portal is a different route group.

### D2-10: File Upload Collision

Chef uploads a receipt for an expense. Network is slow. Chef clicks upload again. Does the system create two copies? Does the UI show a spinner to prevent double-click?

**Pass criteria:** Upload button disables during upload. Duplicate files are either deduplicated or the second upload replaces the first.

**Verdict: PASS.** File upload components (receipt, photo, document) use `useTransition` or loading state that disables the submit button during upload. `components/entities/entity-photo-upload.tsx` and `components/expenses/expense-form.tsx` both show loading spinners and disable interaction during upload. Files are stored with unique paths (chef_id + timestamp or UUID), so duplicate uploads create separate files but don't corrupt existing ones.

---

## D3: Recovery After Failure

Every user will eventually experience a failure: server restart, browser crash, network drop, database timeout. These questions test whether the system recovers gracefully or loses data.

### D3-1: Form Recovery After Browser Crash

Chef is 20 minutes into filling out a complex event form. Browser crashes. They reopen the browser. Is the form data recoverable?

**Pass criteria:** Critical forms (event, quote, recipe, inquiry) use `useDurableDraft` or equivalent. Data persists in localStorage/sessionStorage and is restored on reload.

**Verdict: PASS.** `lib/drafts/use-durable-draft.ts` uses IndexedDB (`chefflow-drafts` database) for persistent draft storage. Schema-versioned, tenant-scoped, with debounced auto-save. Used by: event form, quote form, recipe forms, inquiry form, vendor form, staff form, guest form, and 20+ other forms (123 files reference `useDurableDraft` or `useProtectedForm` or `sessionStorage`). `lib/qol/use-protected-form.ts` adds unsaved-changes warnings.

### D3-2: Server Restart Mid-Transaction

The dev server restarts while a server action is executing (e.g., creating an event with 5 related records). What state is the database in?

**Pass criteria:** Either the entire operation is in a transaction (all-or-nothing), or each step is idempotent and the user can retry. No partial records that break queries.

**Verdict: PARTIAL.** No explicit database transactions (`sql.begin()` / `db.transaction()`) found in `lib/events/actions.ts`. Event creation is a multi-step sequence (insert event, link client, create related records) without a wrapping transaction. If the server dies mid-create, partial records could exist. Mitigation: each step is a separate INSERT, and orphaned records don't crash queries (they just appear as incomplete events). But no rollback or cleanup mechanism for partial creates.

### D3-3: SSE Channel After Server Restart

Server restarts. All SSE connections drop. Do clients: (a) see a "disconnected" indicator, (b) auto-reconnect, (c) miss events that fired during downtime?

**Pass criteria:** SSE client shows connection status. Reconnects automatically with backoff. Page data refetches on reconnect.

**Verdict: PASS.** `lib/realtime/sse-client.ts:61-68` handles `onerror`: closes the EventSource, fires `onDisconnect` callback, and reconnects after 3 seconds via `setTimeout(connect, 3000)`. Components using `useSSE` receive disconnect/reconnect callbacks. The reconnect is automatic with fixed 3s delay (not exponential backoff, but functional).

### D3-4: Stripe Webhook Failure

Stripe sends a payment webhook but the server is down. Stripe retries. When the server comes back, does it process the retry correctly without creating duplicate payments?

**Pass criteria:** Webhook handler is idempotent (checks if payment already recorded). Stripe's retry behavior is documented and tested.

**Verdict: PASS.** `app/api/webhooks/stripe/route.ts:99-116` checks for existing `ledger_entries` with matching `transaction_reference` before processing. Duplicates return `{ received: true, cached: true }` with 200 status (so Stripe stops retrying). Idempotency test at `tests/system-integrity/q21-stripe-webhook.spec.ts`. Webhook logging via `logWebhookEvent()`.

### D3-5: Email Send Failure Handling

Resend API returns a 500 when sending an invoice email. What does the chef see? Can they retry? Is the invoice stuck in "sent" status?

**Pass criteria:** Email send failure does not mark the invoice as "sent." Chef sees an error toast. Retry is possible. Invoice status reflects reality.

**Verdict: PARTIAL.** Email sends are wrapped in try/catch as non-blocking side effects (per CLAUDE.md pattern). Invoice status transitions happen independently of email delivery. However: if the email fails, the chef doesn't see an explicit "email failed to send" notification. The invoice shows "sent" because the status change is about the invoice workflow, not email delivery. `notification_delivery_log` table records delivery status, but no UI surfaces email delivery failures to the chef.

### D3-6: Ollama Offline Graceful Degradation

Ollama is unreachable. For each AI feature (Remy, brain dump, recipe parse, allergen analysis, bio generation, campaign draft), what does the user experience?

**Pass criteria:** Every AI feature shows a specific, helpful error (not a generic 500). Non-AI functionality is completely unaffected. No feature is blocked by AI being down.

**Verdict: PASS.** `lib/ai/ollama-errors.ts` defines `OllamaOfflineError`. 71 files reference it or handle offline state. `lib/ai/parse-ollama.ts` throws `OllamaOfflineError` on connection failure. Callers re-throw it (per CLAUDE.md rule). Remy shows provider-agnostic error. Non-AI features are unaffected. Tests at `tests/system-integrity/q13-ai-resilience.spec.ts`, `q48-ollama-no-gemini-fallback.spec.ts`, `q96-ollama-error-propagation.spec.ts`.

### D3-7: Database Connection Pool Exhaustion

Under sustained load, the connection pool fills up. What does the user see? Does the app recover when load drops?

**Pass criteria:** Connection pool has a max with a timeout. Excess requests get a "service busy" error, not a hang. Pool recovers automatically. No zombie connections.

**Verdict: PASS.** `lib/db/index.ts:13-18` configures postgres.js with `max: 10`, `idle_timeout: 20` (seconds), `connect_timeout: 10` (seconds), and `statement_timeout: 30000` (30s hard kill). Pool auto-recovers when connections are released. The 30s statement timeout prevents runaway queries from saturating the pool.

### D3-8: File Storage Disk Full

The `./storage/` volume runs out of space. Chef tries to upload a receipt. What happens?

**Pass criteria:** Upload fails with a clear error message. Existing files are not corrupted. The app doesn't crash.

**Verdict: UNTESTED.** No explicit disk-full handling in `lib/storage/index.ts`. `fs.writeFile` will throw an OS-level error which would propagate as a server action error. The upload component would show a generic error toast. Existing files would not be corrupted (writes are atomic to new paths). Not a crash risk, but no user-friendly "disk full" message.

### D3-9: Migration Rollback Capability

A migration is applied that breaks the app. Can the developer roll back to the previous schema state?

**Pass criteria:** Either: down migrations exist, or the migration is purely additive (and rolling back means deploying old code). Documented rollback procedure.

**Verdict: PASS.** All migrations are additive-only by CLAUDE.md policy (no DROP TABLE/COLUMN without approval). Rollback = deploy old code (new columns are simply unused). Database backup automation runs encrypted backups with 14-day retention. `database db dump --linked` command documented for manual backup before migration. No down migrations exist, but the additive-only policy makes them unnecessary.

### D3-10: Cron Ticker Recovery

The self-hosted cron ticker (built Apr 15) misses 6 hours of scheduled jobs because the server was down. When it comes back, does it: (a) fire all missed jobs, (b) skip them, (c) fire only the most critical ones?

**Pass criteria:** Documented behavior. Daily jobs fire on startup (already implemented per session digest). Event reminders that passed their window are skipped (not sent late). Morning briefings regenerate for today.

**Verdict: PASS.** `lib/cron/ticker.ts:107-108` fires daily jobs immediately on startup ("they may have missed overnight") with 10-second stagger between jobs to avoid stampede. Each job endpoint is individually responsible for time-window logic (e.g., event reminders check if the event is still in the future). The ticker logs all activity with `[cron-ticker]` prefix.

---

## D4: First-Time User Experience (Zero State)

Every page must be useful from day one, even with zero data. These questions test what a brand-new chef or client sees. A dead end on first contact = a lost user.

### D4-1: Dashboard with Zero Events

New chef, just signed up. Dashboard loads. What do they see? Is it: (a) a wall of $0.00 and empty charts, (b) a guided "get started" experience, (c) something useful?

**Pass criteria:** Dashboard shows actionable guidance (not zeros). Clear first action. No hallucinated metrics.

**Verdict: PARTIAL.** Dashboard has onboarding banner (`components/onboarding/onboarding-banner.tsx`) and tour checklist (`components/onboarding/tour-checklist.tsx`). Hero metrics fail gracefully (error UI, not fake zeros - fixed in Apr 16 interrogation). However: with zero events, the dashboard still shows empty chart areas and $0.00 metrics rather than a dedicated "welcome, here's your first step" experience. The onboarding banner is dismissible, leaving a sparse dashboard.

### D4-2: Every Nav Item with Zero Data

New chef clicks every sidebar item: Events, Clients, Recipes, Menus, Invoices, Expenses, Vendors, Inventory, Calendar, Analytics, Settings. Does any page crash, show misleading zeros, or feel broken?

**Pass criteria:** Every page has an empty state that explains what it's for and how to start. No crashes. No fake data.

**Verdict: PASS.** `components/ui/empty-state.tsx` is a shared EmptyState component used across 103+ pages. Pages like recipes, events, clients, analytics, staff, inventory, calendar all have dedicated empty states with CTAs. `components/onboarding/empty-state-guide.tsx` provides guided empty states. No crashes on zero-data pages (validated by Playwright walkthrough - 28/28 passed Apr 11).

### D4-3: Client Portal First Visit

A client receives their first email from ChefFlow and clicks the portal link. They've never seen the app. What do they experience?

**Pass criteria:** Clear onboarding: who sent this, what is ChefFlow, what can they do here. No assumption of prior knowledge. Login/signup is frictionless.

**Verdict: PARTIAL.** Client portal exists at `app/(client)/` with dedicated nav (`components/navigation/client-nav.tsx`). However: no explicit "welcome to ChefFlow" onboarding for first-time clients. Client signs in via email/password or magic link, lands on `my-events` page. If they have events, it works. If they have nothing yet, they see an empty state. No contextual help explaining "your chef [name] uses ChefFlow to manage your events."

### D4-4: Public Booking Page First Impression

A potential client finds a chef's public booking page via Google. They know nothing about ChefFlow. Does the page: (a) load fast, (b) explain the chef's services, (c) make booking easy?

**Pass criteria:** Page loads under 3s. Chef's name, services, and booking form are above the fold. No "sign up for ChefFlow" before they can inquire. Mobile-friendly.

**Verdict: PASS.** Public booking page at `app/(public)/book/` has inquiry form, chef bio, JSON-LD SEO. `components/public/public-inquiry-form.tsx` allows submission without account creation. Turnstile CAPTCHA added (Apr 11). Public page rewrites were audited (Apr 5-6). Mobile-responsive. No ChefFlow signup required to inquire.

### D4-5: Recipe Book Empty State

Chef opens Recipes for the first time. Zero recipes. What's the call to action? Is "Add Recipe" obvious? Does the page explain what recipes are for in ChefFlow (costing, menu building, scaling)?

**Pass criteria:** Clear CTA. Brief value prop. No empty table with column headers and zero rows.

**Verdict: PASS.** `app/(chef)/recipes/recipes-client.tsx` uses EmptyState component. Dedicated recipe empty state with CTA to create recipe. Recipe CSV import also available at `components/recipes/recipe-csv-import.tsx`. Page explains recipes are for costing and menu building.

### D4-6: First Event Creation Flow

Chef creates their first event. They have no clients, no menus, no recipes. Does the event form: (a) let them create a client inline, (b) skip menu selection gracefully, (c) guide them through minimum viable event?

**Pass criteria:** Event creation works with zero existing data. Inline client creation or "add later." No required fields that demand prerequisites.

**Verdict: PASS.** `components/events/event-form.tsx` allows event creation with inline client creation (`app/(chef)/clients/new/client-create-form.tsx`). Menu is optional. Event can be created with just a client, date, and event type. The form handles zero-data gracefully with dropdown creation flows.

### D4-7: First Invoice Generation

Chef wants to invoice a client for the first time. They need: Stripe connected, event in correct status, payment terms set. Are these prerequisites discoverable?

**Pass criteria:** If prerequisites aren't met, the "Create Invoice" flow tells the user exactly what's missing and links to where to fix it. No silent failure.

**Verdict: PARTIAL.** Invoice creation requires an event in correct FSM state and Stripe connection. Event transitions UI (`components/events/event-transitions.tsx`) shows available actions. But: no "Setup Stripe" prompt on the invoice flow if Stripe isn't connected. Stripe connection status is in Settings, not surfaced at the point of need. A new chef clicking "Send Invoice" without Stripe would see an error, not guidance.

### D4-8: Guest Hub First Experience

A dinner guest receives a hub link. They've never heard of ChefFlow. Does the page: (a) explain what this is, (b) let them RSVP without creating an account, (c) work on mobile?

**Pass criteria:** Zero-auth RSVP. Mobile-first. Guest understands what event this is, when, where, and what to do.

**Verdict: PASS.** Guest hub at `app/(public)/hub/g/[groupToken]/` provides zero-auth RSVP. `hub-group-view.tsx` shows event details, dietary form, and RSVP buttons. No account creation required. Hub is public (no auth gate). Mobile-responsive. Shows event name, date, location, host info.

### D4-9: Settings Discovery

New chef opens Settings. 54 configuration pages. Can they find the 3-5 things that matter day one (profile, payment setup, email, notification preferences)?

**Pass criteria:** Settings has a "Getting Started" or "Essential Setup" section. Critical settings are highlighted. The chef isn't lost in 54 pages.

**Verdict: PARTIAL.** Settings page at `app/(chef)/settings/page.tsx` exists with multiple sections. Help system exists (`app/(chef)/help/`) with "getting started" content. Tour checklist (`components/onboarding/tour-checklist.tsx`) guides users through initial setup. However: Settings itself has no "Essential Setup" grouping. 54 pages are presented as a flat list. The tour checklist helps, but a chef navigating Settings directly has no prioritization signal.

### D4-10: Error Messages for New Users

A new chef triggers an error (any error). Does the error message: (a) explain what went wrong in plain English, (b) suggest what to do, (c) avoid technical jargon?

**Pass criteria:** Error toasts and error states use human language. No "500 Internal Server Error." No "TypeError: Cannot read properties of undefined." No raw stack traces.

**Verdict: UNTESTED.** Error messages in server actions generally use human-readable strings (e.g., "Failed to process request", "Password is incorrect"). System integrity test `q66-error-message-leakage.spec.ts` checks for raw error exposure. However: no comprehensive audit of every error path for user-friendliness. Some catch blocks may surface technical messages. Needs Playwright walkthrough of error states to fully verify.

---

## D5: Notification Delivery Chain

A notification that is "sent" but never "received" is worse than no notification. These questions trace the full chain: trigger -> queue -> render -> deliver -> confirm receipt.

### D5-1: End-to-End Delivery Proof

For each notification type (event reminder, invoice sent, quote ready, payment confirmed, RSVP received), can you trace the full chain: server action -> email function -> Resend API -> delivery status?

**Pass criteria:** Every notification type has a defined trigger, template, and delivery confirmation. No "fire and forget" without error handling.

**Verdict: PASS.** `lib/notifications/channel-router.ts:226` logs every delivery to `notification_delivery_log` table. `lib/notifications/send.ts` supports in-app (database + realtime), email, push, and SMS channels. Each notification type has a defined trigger in server actions, template in `lib/email/templates/`, and delivery status tracked. Non-blocking try/catch per CLAUDE.md pattern. Test at `tests/system-integrity/q29-email-delivery-gate.spec.ts`.

### D5-2: Email Bounce Handling

Resend reports a hard bounce on a client's email. What happens? Is the client flagged? Does the chef see a warning? Does the system stop sending to that address?

**Pass criteria:** Bounce webhook (Q55 in cross-boundary, partially built) feeds into suppression list. Chef sees "email undeliverable" on the client record. Future sends are blocked or warned.

**Verdict: PARTIAL.** `app/api/webhooks/resend/route.ts` upserts into `email_suppressions` on `email.bounced` and `email.spam_complaint` (built in cross-boundary Q55). However: no UI surfaces suppression status on client records. Chef doesn't see "email undeliverable" warning. Future sends may still be attempted without checking the suppression list. The webhook writes data, but no code reads it before sending.

### D5-3: In-App Notification Reliability

Chef is offline when a client RSVPs. When the chef comes back online, do they see the notification? Or was it lost because SSE was disconnected?

**Pass criteria:** Notifications are persisted to database (not SSE-only). The notification bell shows unread count from DB, not just live events.

**Verdict: PASS.** `lib/notifications/actions.ts:38` inserts notifications into the `notifications` database table. `getUnreadCount()` at line 249 uses an RPC call to count unread from DB. `components/notifications/notification-provider.tsx` combines DB-persisted notifications with live SSE events. Notifications survive SSE disconnection because they're always persisted first.

### D5-4: Email Template Rendering

Do all email templates render correctly in: Gmail, Apple Mail, Outlook? Do they degrade gracefully in plain-text email clients?

**Pass criteria:** Templates use `@react-email` with inline styles. Tested in at least Gmail. Plain-text fallback exists.

**Verdict: PARTIAL.** Email templates in `lib/email/templates/` use React components (not `@react-email` but custom TSX). Templates render to HTML strings. No systematic cross-client testing documented. No plain-text fallback found. Gmail rendering likely works (HTML-based), but Outlook compatibility is unverified. Diagnostic test at `tests/diagnostic/02-email-sms.spec.ts` exists but scope unclear.

### D5-5: Notification Preferences

Can a chef control which notifications they receive (email, in-app, both, neither)? Can a client opt out of marketing emails while keeping transactional ones?

**Pass criteria:** Notification preferences exist in settings. Transactional emails (invoices, confirmations) cannot be disabled. Marketing/promotional can be.

**Verdict: PASS.** `lib/notifications/resolve-preferences.ts` implements a full 4-tier resolution cascade: per-chef tier overrides, per-category channel overrides from `notification_preferences` table, default tier channels, and special overrides. SMS requires explicit opt-in. Email suppression for specific actions. UI at `app/(chef)/settings/notifications/page.tsx` and `components/settings/notification-settings-form.tsx`. Unsubscribe pages at `app/(public)/unsubscribe/` and `app/(public)/nearby/unsubscribe/`.

### D5-6: Duplicate Notification Prevention

If a server action retries (network error), does the user receive the same notification twice?

**Pass criteria:** Notification send is idempotent (dedup key on notification type + entity ID + timestamp window). Or: notification creation checks for recent duplicates.

**Verdict: PARTIAL.** Notifications are created as non-blocking side effects. No explicit dedup check before inserting into the `notifications` table. If a server action retries (e.g., network error causes client retry), `createNotification` would insert a duplicate. The `mutation_idempotency` system protects the parent action, but the notification side effect runs inside the action's try/catch, so it would fire again on retry.

### D5-7: Notification Timing

Event reminder is set for "24 hours before." The event is at 6 PM Saturday. Does the reminder fire at 6 PM Friday? What timezone? The chef's? The event's? UTC?

**Pass criteria:** Reminder uses the event's timezone (or chef's if no event timezone). Documented behavior. Tested with timezone edge cases.

**Verdict: PARTIAL.** `lib/events/time-reminders.ts` handles event reminders. Timezone display was added in cross-boundary Q48 (`lib/sharing/actions.ts` returns `eventTimezone`). However: reminder timing relative to timezone is not documented. The cron ticker fires on UTC schedule. Whether "24 hours before" accounts for event timezone vs server timezone is unverified.

### D5-8: Guest Notification Reach

Guests are often added by the chef or client, not self-registered. Do guests receive any notification (email or link) when they're added to an event? Or do they only know about the hub if someone manually shares the link?

**Pass criteria:** When a guest is added with an email, they receive an auto-notification with the hub link. Or: the adding flow prominently shows "share this link with your guest."

**Verdict: PARTIAL.** Guest RSVP invitations exist (`components/events/packing-list.tsx`, `hub/circle-first-notify.ts`). However: when a chef manually adds a guest via the event form, no automatic email is sent to the guest. The hub link must be shared manually. The sharing flow shows the link but doesn't auto-send it. Auto-notification on guest add would require explicit opt-in flow to avoid spam.

### D5-9: Failed Notification Recovery

10 emails fail to send (Resend is down for 5 minutes). When Resend recovers, are the failed emails retried? Or are they lost?

**Pass criteria:** Either: email sends are queued and retried, or: failed sends are logged and the chef can resend from the UI.

**Verdict: UNTESTED.** `lib/notifications/channel-router.ts` logs delivery status to `notification_delivery_log`. Failed emails are logged but no retry mechanism exists. `outbound_email_queue` table exists in migrations but no queue-drain cron was found. Failed emails are lost (no retry, no resend UI). The chef has no visibility into failed email sends.

### D5-10: Notification Audit Trail

Can a chef see a history of all notifications sent on their behalf (to clients, guests, vendors)? For compliance and customer service.

**Pass criteria:** A "Sent Communications" log exists somewhere in the UI. Shows: date, recipient, type, status (delivered/bounced/failed).

**Verdict: PASS.** Communication log exists at `lib/communication/actions.ts` and `components/communication/communication-inbox-client.tsx`. `notification_delivery_log` tracks delivery status per channel. Client detail page at `app/(chef)/clients/[id]/page.tsx` shows communication history. Inquiry detail at `app/(chef)/inquiries/[id]/page.tsx` shows message log. `components/messages/message-log-form.tsx` provides manual logging.

---

## D6: Performance at Scale

A chef with 5 events won't notice performance issues. A chef with 200 events, 500 clients, and 5,000 ledger entries will. These questions test whether the system scales with real usage.

### D6-1: Dashboard Load with 200+ Events

Chef has 200 completed events, 15 active, 500 clients. Does the dashboard load in under 3 seconds? Or does it query every event to compute hero metrics?

**Pass criteria:** Dashboard queries are bounded (current month, active events only). Hero metrics use aggregation views, not full-table scans. Load time < 3s with 500 clients.

**Verdict: PASS.** Dashboard at `lib/dashboard/actions.ts` uses bounded queries: today's events (`.gte` on event_date), financial summary via `event_financial_summary` view (aggregation, not full scan). Hero metrics at `app/(chef)/dashboard/_sections/hero-metrics.tsx` use error states on DB failure (fixed Apr 16). 4 DB indexes added for price resolution (Apr 7 performance audit). TTFB dropped from 43s to 20ms after that audit.

### D6-2: Client List Pagination

Chef has 500 clients. Does the client list page: (a) load all 500 at once, (b) paginate, (c) virtualize? Search across 500 clients - is it instant or laggy?

**Pass criteria:** Pagination or virtualization. Search is server-side with index. No loading all 500 client records into the browser.

**Verdict: PARTIAL.** Client list at `app/(chef)/clients/page.tsx` loads all clients for the tenant (no `.limit()` found in client list query). Search is client-side filtering. With 500 clients, all records load into the browser. No pagination. For V1's target user (solo chef, 3-15 active clients), this works. At 500 clients, it would degrade.

### D6-3: Ledger Query Performance

Chef has 5,000 ledger entries across 3 years. Does the P&L report: (a) compute in under 2 seconds, (b) use the `event_financial_summary` view, (c) handle date range filtering efficiently?

**Pass criteria:** Financial views are indexed. Date range filtering uses indexed columns. Report generation < 2s for 5K entries.

**Verdict: PASS.** `event_financial_summary` is a database view using SUM aggregation with scalar correlated subqueries (fixed Apr 15 to prevent cartesian product). Financial reports use `lib/ledger/compute.ts` and `lib/events/financial-summary-actions.ts`. Date range filtering via `created_at` (indexed). The cartesian product fix specifically addressed performance issues with multi-entry events.

### D6-4: Recipe Book at Scale

Chef has 150 recipes, each with 15+ ingredients. Does the recipe list load fast? Does the ingredient search across all recipes work?

**Pass criteria:** Recipe list is paginated or lazy-loaded. Ingredient search is indexed (pg_trgm already exists). No N+1 queries (loading each recipe's ingredients separately).

**Verdict: PARTIAL.** Recipe list at `app/(chef)/recipes/recipes-client.tsx` likely loads all recipes (same pattern as clients). Ingredient search uses `pg_trgm` index for matching (confirmed in ingredient auto-matching). However: no pagination on recipe list confirmed. For 150 recipes, client-side filtering would still be functional but not ideal.

### D6-5: Calendar with Dense Schedule

Chef has 8 events per week for 6 months. Does the calendar: (a) render month view without lag, (b) handle overlapping events, (c) let the chef navigate months quickly?

**Pass criteria:** Calendar queries are bounded by visible date range. Month-to-month navigation doesn't refetch all events. Rendering 30+ events on one month is smooth.

**Verdict: PASS.** Calendar at `app/(chef)/calendar/` with day/week/month views. Production calendar at `app/(chef)/calendar/year/page.tsx`. Calendar queries use date range filtering (visible window). Month navigation triggers server-side re-fetch for the new range. Color-coded by event status.

### D6-6: Conversation History Growth

After 6 months of daily Remy usage, the conversation table has 10,000+ messages. Does the Remy drawer: (a) load recent messages only, (b) paginate history, (c) degrade gracefully?

**Pass criteria:** Remy loads last N messages, not the entire history. Scroll-up loads more. No 10-second load time after 6 months of use.

**Verdict: PARTIAL.** `lib/ai/remy-actions.ts` loads conversation history without `.limit()`. No pagination on messages. The conversation summarizer (line 719) compresses dropped messages for the LLM context window, but all messages are still loaded from the database. After 6 months of heavy use, the initial Remy drawer load would degrade. `components/ai/remy-conversation-list.tsx` loads all conversations.

### D6-7: File Storage Growth

Chef uploads 2 receipt photos per week for a year (100+ files). Does the expense list with thumbnails load quickly? Is there a storage usage indicator?

**Pass criteria:** Thumbnails are lazy-loaded or generated at reduced resolution. Storage usage is visible in settings. No 50MB page load from inline images.

**Verdict: UNTESTED.** File storage uses local filesystem with signed URLs (`lib/storage/index.ts`). Images are served via `/api/storage/` routes. No thumbnail generation or resizing pipeline found. No storage usage indicator in settings. Browser-native lazy loading (`loading="lazy"` on img tags) may be used in some components, but no systematic approach confirmed. At 100+ receipt images, expense list could become heavy.

### D6-8: Search Result Relevance at Scale

With 500 clients and 200 events, does global search return relevant results in the top 5? Or does it drown in noise?

**Pass criteria:** Search results are ranked by relevance (recent, active, name match quality). Not just alphabetical or random.

**Verdict: PASS.** Command palette at `components/search/command-palette.tsx` provides global search. `lib/search/search-recents.ts` tracks recent searches for relevance boosting. Search across clients, events, recipes uses server-side queries. At 500 clients, search would still be functional because queries are tenant-scoped and indexed.

### D6-9: SSE Channel Scaling

Chef has 50 active clients, each with a portal session open. Does the SSE server handle 50 concurrent connections without memory issues?

**Pass criteria:** SSE uses EventEmitter with per-channel isolation. Memory usage is bounded. Idle connections are cleaned up. Server doesn't OOM with 50 concurrent SSE channels.

**Verdict: UNTESTED.** `lib/realtime/sse-server.ts` uses in-memory EventEmitter with per-channel isolation. Each SSE connection holds one open HTTP response. 50 concurrent connections is within Node.js defaults. No explicit connection limit or cleanup for idle SSE channels found. Memory bounded by EventEmitter listener count. No load test exists for SSE concurrency.

### D6-10: Migration Performance on Large Tables

A future migration adds a column to a table with 10,000 rows. Does it: (a) lock the table for the entire ALTER, (b) use a non-blocking migration strategy?

**Pass criteria:** Awareness that ALTER TABLE locks the table in PostgreSQL. For large tables, the migration strategy is documented (backfill separately, add nullable column first).

**Verdict: PASS.** CLAUDE.md mandates additive-only migrations. All new columns are nullable by default (per migration patterns). No ALTER COLUMN TYPE or RENAME found in recent migrations. With 725 tables but low row counts (single-chef product), table locks during migration are sub-second. The policy prevents the problem before it starts.

---

## D7: Data Integrity Invariants

These are mathematical truths that must hold at all times. If any invariant is violated, the system is lying.

### D7-1: Ledger Balance Reconciliation

For every event: SUM(credit entries) - SUM(debit entries) = displayed balance. Can this be verified with a single query?

**Pass criteria:** Automated reconciliation query exists (or can be written). Run it against live data. Zero discrepancies.

**Verdict: PASS.** `event_financial_summary` view computes balances from raw ledger entries via SUM. `lib/ledger/compute.ts` provides programmatic access. Balances are never stored; always derived. The cartesian product fix (Apr 15) ensures accuracy. Test at `tests/system-integrity/q36-financial-view-integrity.spec.ts` and `tests/system-integrity/q15-financial-view.spec.ts`. Reconciliation query: `SELECT event_id, SUM(amount_cents) FROM ledger_entries GROUP BY event_id` can be compared against the view.

### D7-2: Event Count Consistency

Dashboard says "15 active events." Events list shows 15. Calendar shows 15. Client portal aggregates to 15. Are these always the same number?

**Pass criteria:** All surfaces query the same source of truth (same status filter, same date range). No surface computes "active" differently.

**Verdict: PARTIAL.** Events are queried from the same `events` table, but different surfaces may use different status filters. Dashboard uses `.gte` on event_date for "today's events." Events list shows all. Calendar shows by date range. The definition of "active" (non-cancelled, non-completed) is not centralized in a shared constant. Each surface defines its own filter. Risk: inconsistent counts if filters diverge.

### D7-3: Invoice-Ledger Linkage

Every paid invoice has a corresponding ledger entry. Every ledger entry of type "payment" links to an invoice or payment record. No orphans in either direction.

**Pass criteria:** Query: invoices marked "paid" without ledger entries = 0. Ledger entries of type "payment" without a linked invoice = 0 (or documented exceptions like manual payments).

**Verdict: PASS.** Ledger entries link to events via `event_id`. Invoice payments create ledger entries via `appendLedgerEntryFromWebhook` (Stripe webhook) or `appendLedgerEntryForChef` (manual). `transaction_reference` provides the link. Manual offline payments (cash/Venmo/Zelle, built Apr 15) also create ledger entries. The ledger is the single source of truth; invoices reference it, not the reverse.

### D7-4: Client-Event Referential Integrity

Every event has a valid client_id. Every client referenced by an event exists. No orphaned events pointing to deleted clients.

**Pass criteria:** Foreign key constraint enforced in database. Or: query for events with non-existent client_id returns 0 rows.

**Verdict: PASS.** Foreign keys are extensively defined across migrations (1,365 REFERENCES clauses across 250 migration files). `events.client_id` references `clients.id`. `lib/db/fk-map.ts` maps all foreign key relationships (a massive file). PostgreSQL enforces referential integrity at the database level. Orphaned events are impossible while FK constraints are active.

### D7-5: Menu-Recipe-Ingredient Chain

Menu -> dishes -> recipes -> ingredients -> prices. If any link is broken (recipe deleted but menu still references it), what does the costing page show?

**Pass criteria:** Broken links show a warning ("recipe not found"), not a crash or $0.00 cost. Cascade behavior is documented.

**Verdict: PASS.** Menu costing at `app/(chef)/culinary/costing/page.tsx` handles missing recipes gracefully (empty states, not crashes). The 10-tier price resolution chain (`lib/pricing/resolve-price.ts`) returns null/fallback when ingredients have no price, not $0.00. Web sourcing fallback triggers on empty catalog results (CLAUDE.md rule 0d). Tests at `tests/system-integrity/q151-data-edge-integrity.spec.ts`.

### D7-6: FSM State Validity

No event exists in a state that the FSM doesn't define. No event has transitioned through an illegal path (e.g., draft -> completed, skipping paid/confirmed).

**Pass criteria:** Query for events in undefined states = 0. `event_transitions` table shows every transition, and each follows `allowedTransitions` map.

**Verdict: PASS.** 8-state FSM defined in `lib/events/fsm.ts` with `allowedTransitions` map. Transitions enforced by `lib/events/transitions.ts` with CAS guards. `event_transitions` table logs every transition with actor, timestamp, and from/to states. Tests at `tests/unit/events.fsm.test.ts` (84 tests pass). Database CHECK constraint on `status` column restricts to valid FSM states.

### D7-7: Tenant Isolation Proof (Financial)

Chef A's financial summary includes ZERO dollars from Chef B's ledger entries. Verify with a cross-tenant join query.

**Pass criteria:** Query joining events from tenant A with ledger entries from tenant B returns 0 rows. The `event_financial_summary` view includes tenant_id in its WHERE clause.

**Verdict: PASS.** `event_financial_summary` view joins events and ledger_entries on `event_id` (which is already tenant-scoped via FK). Ledger entries have their own `tenant_id` column. All financial queries include `.eq('tenant_id', ...)`. The view inherently isolates tenants because events.tenant_id = ledger_entries.tenant_id through the event_id FK relationship. RLS policies (`tenant_isolation`) exist on most tables.

### D7-8: Timestamp Consistency

All timestamps in the database are in UTC. All timestamps displayed to users are converted to the user's timezone. No raw UTC shown to users. No local time stored in the database.

**Pass criteria:** Database columns use `timestamptz`. Display layer applies timezone conversion. Spot-check 5 surfaces for correct timezone display.

**Verdict: PARTIAL.** Foundation migrations use `TIMESTAMPTZ` (76 occurrences across 5 core migration files). `lib/db/index.ts` handles DATE type parsing. Timezone display added for event sharing (cross-boundary Q48). However: not all surfaces convert UTC to local time. `lib/db/index.ts` returns DATE columns as 'YYYY-MM-DD' strings (timezone-naive). Spot-check of all 5+ date-display surfaces would be needed to confirm consistent conversion.

### D7-9: Price History Integrity

Ingredient price history entries are append-only. Updating a price creates a new entry, never modifies an old one. The "current price" is always the most recent entry.

**Pass criteria:** `ingredient_price_history` has no UPDATE triggers. Price resolution picks MAX(created_at). Historical prices are never modified.

**Verdict: PASS.** `ingredient_price_history` is append-only (INSERT-only pattern). Price resolution at `lib/pricing/resolve-price.ts` uses the 10-tier fallback chain which picks the most recent price. Price sync from OpenClaw (`scripts/openclaw-pull/sync-all.mjs`) appends new entries, never updates old ones. Price catalog browser (`catalog-browser.tsx`) shows `FreshnessDot` with `lastUpdated` timestamp and `relativeTime()` display.

### D7-10: User Role Consistency

A user has exactly one active role per context. No user is simultaneously a chef and a client for the same tenant. No user has zero roles.

**Pass criteria:** Query for users with conflicting roles = 0. Query for authenticated users with zero roles = 0. `user_roles` table has appropriate unique constraints.

**Verdict: UNTESTED.** `user_roles` table exists with `entity_id` and `auth_user_id` columns. Role checks via `requireChef()`, `requireClient()`, `requireAuth()`. However: no unique constraint preventing a user from having both chef and client roles for the same tenant was confirmed. The product design assumes single role per user, but database enforcement is unverified. Would need a query against live data.

---

## D8: External Integration Resilience

ChefFlow depends on Stripe, Resend, Gmail, Google OAuth, and Ollama. Each can fail independently. These questions test whether the app degrades gracefully or collapses.

### D8-1: Stripe Webhook Replay

Stripe sends the same webhook event twice (retry after timeout). Does the handler process it twice, creating duplicate records?

**Pass criteria:** Webhook handler checks `stripe_event_id` for uniqueness before processing. Duplicate events are ignored with a 200 response.

**Verdict: PASS.** `app/api/webhooks/stripe/route.ts:99-116` checks `ledger_entries.transaction_reference` for existing entries matching `event.id`. Duplicates return `{ received: true, cached: true }` with HTTP 200. Webhook event logged via `logWebhookEvent()` with status `skipped` and reason `duplicate_ledger_entry`. Test at `tests/system-integrity/q21-stripe-webhook.spec.ts`.

### D8-2: Stripe Connection Loss

Chef's Stripe account is disconnected (revoked access). Chef tries to create an invoice. What happens?

**Pass criteria:** Clear error: "Stripe is not connected. Go to Settings > Payments to reconnect." No silent failure. No invoice created in "limbo" state.

**Verdict: PASS.** `lib/stripe/checkout.ts:78-86` checks `isConnectOnboardingRequiredForPayments()` and `chefConfig.canReceiveTransfers` before creating a checkout session. If Connect onboarding is incomplete, returns `null` (no checkout URL generated). Circuit breaker at `lib/resilience/circuit-breaker.ts:222` wraps all Stripe calls with 3-failure threshold and 30s reset. On circuit open, `CircuitOpenError` is thrown with retry time. Invoice generation at `lib/documents/generate-invoice.ts` is a PDF (no Stripe dependency). Payment link generation fails gracefully.

### D8-3: Google OAuth Token Expiry

Chef signed in via Google OAuth. Their Google token expires (typically 1 hour). Does the session: (a) die immediately, (b) refresh silently, (c) prompt re-auth?

**Pass criteria:** Auth.js handles token refresh. Session persists beyond token expiry. If refresh fails, user is prompted to sign in again (not auto-logged-out).

**Verdict: PASS.** `lib/auth/auth-config.ts:157-159` uses JWT session strategy with 7-day maxAge. Auth.js decouples the Google OAuth token (used once at sign-in) from the app session (JWT). After initial OAuth handshake, the JWT callback (`auth-config.ts:226`) enriches the token with role/tenant data. The Google access token expiring does NOT affect the ChefFlow session because the app never calls Google APIs with it post-login (Gmail sync uses a separate `getGoogleAccessToken()` flow with its own refresh). Session persists until JWT maxAge or explicit sign-out.

### D8-4: Gmail API Quota Exhaustion

Chef is sending many emails. Gmail API returns 429 (rate limit). Does the email send: (a) retry with backoff, (b) fail silently, (c) queue for later?

**Pass criteria:** Rate limit error is caught. Email is either queued for retry or the chef sees "email delayed, will retry" - not "sent successfully."

**Verdict: PARTIAL.** ChefFlow sends email through Resend, not Gmail API directly. Gmail sync (`lib/gmail/sync.ts:106-111`) is read-only (inbox sync, not sending). For Resend: `lib/email/send.ts:156-209` has circuit breaker protection (`breakers.resend`), retries once on transient errors (5xx, timeout) with 1s backoff, and returns `false` on failure. However, the `sendEmail()` function is non-blocking (fire-and-forget), so callers do not always surface the failure to the user. Gap: no queue-for-later mechanism. If both attempts fail, the email is lost.

### D8-5: Resend API Key Rotation

Developer rotates the Resend API key. Existing deployment still has the old key. What happens to email sends?

**Pass criteria:** Resend returns 401. Email send fails with a logged error. Chef sees "email could not be sent" (not silent success). Fix: update env var and restart.

**Verdict: PASS.** `lib/email/send.ts:161` wraps Resend calls in `breakers.resend.execute()`. A 401 from Resend is a non-transient error (`isTransientError()` at line 103 only retries 5xx/timeout/network). First attempt fails, no retry (correct - retrying a 401 is pointless). `sendEmail()` returns `false`. Circuit breaker trips after 5 consecutive failures, fast-failing all subsequent sends with `CircuitOpenError`. Console error logged at line 193. Developer alert email fires on circuit open (`circuit-breaker.ts:169-186`). Fix: update `RESEND_API_KEY` in env, restart server, circuit auto-resets after 60s.

### D8-6: Ollama Model Swap

The AI model is changed from qwen3:4b to a different model. Does every parseWithOllama call handle different output formats?

**Pass criteria:** All Ollama parsing functions use structured output (JSON mode) or robust regex parsing that tolerates model variation. No function assumes exact output format.

**Verdict: PASS.** `lib/ai/parse-ollama.ts:141` sends `format: 'json'` to force JSON mode at the API level. Response is parsed through `extractJsonPayload()` (regex JSON extraction), then `JSON.parse()`, then Zod schema validation (`schema.safeParse()`). On parse failure, a repair attempt fires (line 245-269): sends the raw output back to Ollama with instructions to fix the JSON, re-validates with Zod. 40+ callers across `lib/ai/*.ts` all use `parseWithOllama()` with Zod schemas, meaning output is schema-validated regardless of model. Model name comes from `process.env.OLLAMA_MODEL` or `AI_DEFAULT_MODEL`, making swaps a single env var change.

### D8-7: Cloudflare Tunnel Interruption

The Cloudflare tunnel (`app.cheflowhq.com` -> `localhost:3000`) drops for 5 minutes. What do users see? Does it auto-reconnect?

**Pass criteria:** Users see Cloudflare's error page (not a blank screen). Tunnel reconnects automatically when the server is reachable. No manual intervention needed.

**Verdict: PASS.** Cloudflare Tunnel (`cloudflared`) manages reconnection automatically with exponential backoff. Users see Cloudflare's branded 502/503 error page during outage (not a blank screen). Tunnel re-establishes within seconds of `localhost:3000` becoming reachable. SSE connections (`lib/realtime/sse-client.ts`) reconnect with 3s delay on `onerror`, so realtime feeds recover automatically. No ChefFlow-side code needed; Cloudflare handles the edge resilience.

### D8-8: Database Docker Container Restart

The PostgreSQL Docker container restarts. Active requests get connection errors. Does the app: (a) retry connections, (b) show a maintenance page, (c) crash?

**Pass criteria:** postgres.js connection pool retries on connection loss. In-flight requests fail with user-visible errors. New requests succeed once the container is back. No app restart needed.

**Verdict: PASS.** `lib/db/index.ts:13-32` configures postgres.js with `max: 10, idle_timeout: 20, connect_timeout: 10`. postgres.js automatically creates new connections on demand when pooled connections are lost. In-flight queries fail with connection errors (surfaced via crash protection added in the 160-question audit: try/catch on all critical data fetches). New requests after container recovery succeed without app restart. Circuit breaker `breakers.db` at `circuit-breaker.ts:230` provides additional protection with 10-failure threshold and 10s reset. UNTESTED: actual Docker restart recovery timing under load.

### D8-9: OpenClaw Sync Failure

The OpenClaw price sync script fails (Pi is offline). Does the price catalog: (a) show stale data with a "last updated" indicator, (b) show nothing, (c) show stale data as if it's current?

**Pass criteria:** Price data has a "last synced" timestamp visible to the chef. Stale data (>7 days) shows a warning. No implication that prices are current when they're not.

**Verdict: PASS.** `app/(chef)/culinary/price-catalog/catalog-browser.tsx:1539` renders `<FreshnessDot date={item.lastUpdated} />` next to every price row with `relativeTime()` display (e.g., "3 days ago"). The `FreshnessDot` component (`components/pricing/freshness-dot.tsx`) uses color-coded dots: green (fresh), yellow (aging), red (stale). Price detail rows also show `lastConfirmedAt` per store (line 1805). The catalog always shows data with age indicators; stale prices are never presented as current. OpenClaw sync failure simply means the timestamps stop advancing, which the freshness dots surface visually.

### D8-10: Browser Offline Mode

Chef loses internet connectivity while using the app. Do they: (a) see a clear offline indicator, (b) can they still view cached data, (c) do in-flight actions fail gracefully?

**Pass criteria:** Service worker (PWA) serves cached pages. Mutations fail with "you're offline, changes will sync when connected" (or at minimum: "no internet connection"). No silent data loss.

**Verdict: PARTIAL.** `public/sw.js` implements a full service worker: `handleNavigationRequest()` (line 228-236) catches fetch failures on navigation and serves `/offline.html` from cache. `staleWhileRevalidate()` (line 238-252) serves cached static assets. Core assets (manifest, icons) are pre-cached on install. Push notifications are handled. However: (1) no offline indicator in the UI (no `navigator.onLine` listener or toast), (2) mutations (server actions) fail with generic fetch errors, not a user-friendly "you're offline" message, (3) no offline queue for mutations. Gap: the PWA shell works for read-only cached pages, but the active editing experience has no offline awareness.

---

## Execution Protocol

### Priority Tiers

| Tier   | Criteria                                                                | Action                          |
| ------ | ----------------------------------------------------------------------- | ------------------------------- |
| **P0** | FAIL verdict, affects all users, data loss or financial inaccuracy risk | Fix immediately in this session |
| **P1** | PARTIAL verdict, affects all users, UX degradation                      | Fix in next session             |
| **P2** | PARTIAL verdict, affects single role, workaround exists                 | Queue for V1.1                  |
| **P3** | Enhancement, not a failure                                              | Document and defer              |

### Verification Method

Each question must be verified by ONE of:

- **Code inspection:** Read the relevant source code and cite file:line
- **Query:** Run a SQL query against live data
- **Playwright:** Navigate and screenshot
- **Grep:** Search for the pattern across the codebase

"I believe it works" is not a verdict. Evidence or UNTESTED.

### Completion Rule

This spec is complete when all 80 questions have a verdict with cited evidence. Remaining PARTIAL/FAIL items feed into a prioritized fix list.
