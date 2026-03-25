# ChefFlow V1 - Complete System Behavior Map

> Full-system audit of all behaviors: what exists, what executes, how everything connects, and what is disconnected or bypassed.
>
> Generated: 2026-03-20

---

## Table of Contents

1. [System Scale Summary](#1-system-scale-summary)
2. [Authentication & Routing](#2-authentication--routing)
3. [Event FSM & State Machines](#3-event-fsm--state-machines)
4. [Financial / Ledger System](#4-financial--ledger-system)
5. [Billing / Tier / Module System](#5-billing--tier--module-system)
6. [AI Systems (Remy, Ollama, Gemini)](#6-ai-systems)
7. [Server Actions](#7-server-actions)
8. [API Routes](#8-api-routes)
9. [Webhooks & External Integrations](#9-webhooks--external-integrations)
10. [Background & Scheduled Systems](#10-background--scheduled-systems)
11. [Email & Notification System](#11-email--notification-system)
12. [Realtime Subscriptions](#12-realtime-subscriptions)
13. [Client-Side Behaviors](#13-client-side-behaviors)
14. [Embed / Widget System](#14-embed--widget-system)
15. [Public Routes & Token-Protected Pages](#15-public-routes--token-protected-pages)
16. [Kiosk System](#16-kiosk-system)
17. [Mission Control](#17-mission-control)
18. [Deployment Infrastructure](#18-deployment-infrastructure)
19. [Cross-Reference Matrix](#19-cross-reference-matrix)
20. [Disconnected, Shadowed, and Duplicated Behaviors](#20-disconnected-shadowed-and-duplicated-behaviors)
21. [Missing or Regressed Signals](#21-missing-or-regressed-signals)

---

## 1. System Scale Summary

| Category                          | Count                                                         | Status                           |
| --------------------------------- | ------------------------------------------------------------- | -------------------------------- |
| App pages (page.tsx)              | 654                                                           | EXECUTING                        |
| Route groups                      | 8 (chef, client, public, admin, staff, partner, mobile, demo) | EXECUTING                        |
| Server action files               | 574                                                           | EXECUTING                        |
| Exported server action functions  | ~1,500+                                                       | EXECUTING (some UNKNOWN usage)   |
| API route files                   | 284                                                           | EXECUTING                        |
| Webhook handlers                  | 14                                                            | EXECUTING                        |
| Cron endpoints                    | 14                                                            | EXECUTING (requires CRON_SECRET) |
| Scheduled endpoints               | 26                                                            | EXECUTING (requires CRON_SECRET) |
| Inngest background jobs           | 6                                                             | EXECUTING                        |
| AI system files                   | 182                                                           | EXECUTING                        |
| Remy agent action modules         | 25                                                            | EXECUTING                        |
| Custom React hooks                | 26                                                            | EXECUTING                        |
| Context providers                 | 9+                                                            | EXECUTING                        |
| PostgreSQL realtime subscriptions | 5+                                                            | EXECUTING                        |
| Email templates                   | 40+                                                           | EXECUTING                        |
| Notification action types         | 50+                                                           | EXECUTING                        |
| Loading skeleton files            | 152                                                           | EXECUTING                        |

---

## 2. Authentication & Routing

### 2.1 Middleware (`middleware.ts`)

**Status: EXECUTING**

**Entry point:** Every HTTP request to the app.

**Behavior:**

1. Bypasses auth for public assets, API webhooks, health checks, embed routes
2. Allows unauthenticated access to public pages (/about, /pricing, token pages)
3. For protected paths: checks PostgreSQL auth, queries `user_roles` table
4. Sets auth context headers (userId, email, role, entityId, tenantId)
5. Redirects root `/` to role-specific home page
6. Prevents cross-role access (chef can't access /my-events, client can't access /dashboard)

**Calls:** `lib/auth/route-policy.ts` (path categorization), PostgreSQL auth
**Called by:** Next.js runtime (automatic)

### 2.2 Auth Guard Functions (`lib/auth/get-user.ts`)

| Function           | Status    | Used By                              |
| ------------------ | --------- | ------------------------------------ |
| `requireChef()`    | EXECUTING | 500+ server actions, chef layout     |
| `requireClient()`  | EXECUTING | Client portal pages, client actions  |
| `requireAuth()`    | EXECUTING | Generic authenticated operations     |
| `requireAdmin()`   | EXECUTING | Admin pages, admin actions           |
| `requireStaff()`   | EXECUTING | Staff portal pages                   |
| `requirePartner()` | EXECUTING | Partner portal pages                 |
| `isAdmin()`        | EXECUTING | Conditional UI rendering, Pro bypass |

### 2.3 Route Groups

| Group     | Pages | Auth Guard         | Layout Guard     | Status    |
| --------- | ----- | ------------------ | ---------------- | --------- |
| (chef)    | 502   | `requireChef()`    | Yes (layout.tsx) | EXECUTING |
| (client)  | 35    | `requireClient()`  | Yes (layout.tsx) | EXECUTING |
| (public)  | 49    | None               | No               | EXECUTING |
| (admin)   | 32    | `requireAdmin()`   | Yes (layout.tsx) | EXECUTING |
| (staff)   | 6     | `requireStaff()`   | Yes (layout.tsx) | EXECUTING |
| (partner) | 6     | `requirePartner()` | Yes (layout.tsx) | EXECUTING |
| (mobile)  | 2     | None documented    | Unknown          | UNKNOWN   |
| (demo)    | 1     | None               | No               | EXECUTING |
| auth      | 8     | None (pre-auth)    | No               | EXECUTING |

### 2.4 Navigation Configuration (`components/navigation/nav-config.tsx`)

**Status: EXECUTING**

Single source of truth for all sidebar/mobile navigation links:

- `standaloneTop[]` (15 items), `standaloneBottom[]`, `navGroups[]` (22 groups)
- `mobileTabItems[]` (5 items), `settingsShortcutOptions[]` (50+ items)
- `adminOnly: true` flag hides links for non-admins
- `module: 'slug'` ties links to billing module visibility

---

## 3. Event FSM & State Machines

### 3.1 Event FSM (`lib/events/transitions.ts`)

**Status: EXECUTING**

**States:** draft, proposed, accepted, paid, confirmed, in_progress, completed, cancelled

**Transitions:**

```
draft       -> proposed (chef), paid (system/Stripe), cancelled (chef)
proposed    -> accepted (client), cancelled (chef|client)
accepted    -> paid (system/Stripe), cancelled (chef|client)
paid        -> confirmed (chef), cancelled (chef)
confirmed   -> in_progress (chef), cancelled (chef)
in_progress -> completed (chef), cancelled (chef)
completed   -> [TERMINAL]
cancelled   -> [TERMINAL]
```

**Atomic Safety:** Uses `transition_event_atomic()` Postgres function (events.status + event_state_transitions update atomically).

**Readiness Gates** (`lib/events/readiness.ts`):

- `paid -> confirmed`: allergies_verified, documents_generated, deposit_collected
- `confirmed -> in_progress`: packing_reviewed
- `in_progress -> completed`: receipts_uploaded, kitchen_clean, financial_reconciled
- Hard block: Unconfirmed ANAPHYLAXIS allergy (cannot override)
- System transitions (Stripe webhook) skip readiness checks

**Side Effects (Non-Blocking):**

- Chat system message, chef/client notifications, transactional emails
- FOH menu PDF generation, prep sheet PDF, post-event survey
- Loyalty points auto-award, travel legs auto-create, prep blocks auto-place
- Google Calendar sync/delete, automation engine evaluation
- Remy reactive AI task enqueue, push notifications
- Inngest post-event sequence (thank you 3d, review 7d, referral 14d)
- Zapier/Make webhook dispatch, outbound custom webhooks
- Chef activity logging

**Cross-references:**

- UI: `components/events/event-transitions.tsx` renders transition buttons
- Webhook trigger: `/api/webhooks/stripe/route.ts` triggers `accepted -> paid` and `draft -> paid`
- Inngest: `postEventThankYou`, `postEventReviewRequest`, `postEventReferralAsk`

### 3.2 Inquiry FSM (`lib/inquiries/actions.ts`)

**Status: EXECUTING**

**States:** new, awaiting_client, awaiting_chef, quoted, confirmed, declined, expired

```
new            -> awaiting_client, quoted, declined
awaiting_client -> awaiting_chef, quoted, declined, expired
awaiting_chef  -> awaiting_client, quoted, declined
quoted         -> confirmed, declined, expired
confirmed      -> [TERMINAL - converts to event]
declined       -> [TERMINAL]
expired        -> new [revival path]
```

**Skip paths:** `new -> quoted` and `awaiting_client -> quoted` allow jumping steps when quote is sent.

### 3.3 Quote State Machine (`lib/quotes/actions.ts`)

**Status: EXECUTING**

**States:** draft, sent, accepted, rejected, expired

```
draft    -> sent
sent     -> accepted, rejected, expired
accepted -> [TERMINAL]
rejected -> [TERMINAL]
expired  -> draft [revision path]
```

---

## 4. Financial / Ledger System

### 4.1 Ledger (`lib/ledger/append.ts`, `lib/ledger/compute.ts`)

**Status: EXECUTING**

**Architecture:** Append-only, immutable (enforced by database triggers on `ledger_entries`).

**Entry Types:** payment, deposit, installment, final_payment, tip, refund, adjustment, add_on, credit

**Key Functions:**

- `appendLedgerEntryForChef()` - Chef-facing, validates session + tenant_id
- `appendLedgerEntryFromWebhook()` - Stripe webhook safety wrapper
- `createAdjustment()` - Manual adjustment with idempotency_key

**Idempotency:** `transaction_reference` (e.g., Stripe event ID) prevents duplicates.

**Computed Values (never stored):**

- `event_financial_summary` view: quoted*price, total_paid, total_refunded, outstanding_balance, net_revenue, profit, margin, food_cost*%
- `getTenantFinancialSummary()`: tenant-wide totals
- `computeProfitAndLoss(year)`: annual P&L

**Cross-references:**

- Triggered by: Stripe webhook, manual entry UI, commerce POS
- Read by: Dashboard widgets, event detail, financial reports, analytics

---

## 5. Billing / Tier / Module System

### 5.1 Tier Resolution (`lib/billing/tier.ts`)

**Status: EXECUTING**

```
grandfathered -> Pro (forever)
active        -> Pro
trialing      -> Pro (if trial_ends_at > now), else Free
past_due      -> Pro (grace period)
canceled      -> Free
unpaid        -> Free
null          -> Free
Admin bypass  -> Always Pro
```

### 5.2 Module System (`lib/billing/modules.ts`)

**Status: EXECUTING**

**Dual concept:**

1. **Tier** (monetization): What you CAN access (Free vs Pro)
2. **Enabled Modules** (UX): What you SEE (chef_preferences.enabled_modules)

**Modules (8):**

- Free (always): dashboard, pipeline, events, culinary, clients, finance
- Pro: protection, more, commerce, social-hub

### 5.3 Pro Feature Gating

**Status: EXECUTING**

- 34 registered Pro features in `lib/billing/pro-features.ts`
- Server: `requirePro(featureSlug)` throws `ProFeatureRequiredError`
- UI: `<UpgradeGate>` component (modes: block, blur, hide)
- Nav: `getVisibleNavGroupIds()` filters by enabled modules + tier

### 5.4 Module Settings API (`/api/v2/settings/modules`)

**Status: EXECUTING**

- GET: returns full module list with enabled status
- PATCH: updates `chef_preferences.enabled_modules`

---

## 6. AI Systems

### 6.1 Remy AI Agent

**Status: EXECUTING**

**Core entry:** `lib/ai/remy-actions.ts` (sendRemyMessage)
**Streaming:** `/api/remy/stream/route.ts` (SSE)
**UI:** `components/ai/remy-drawer.tsx`

**Architecture:**

- Intent classification (task vs conversational)
- Command orchestrator for task execution
- Agent registry with tier 2/3 approval gates
- Memory system (persistent context)
- Rate limiting (12 msgs/min), abuse detection, input validation

**25 Agent Action Modules:**

- briefing, calendar, client, draft-email, event, event-ops, financial-call
- grocery, inquiry, inquiry-response, intake, lifecycle-circle, menu
- menu-edit, menu-proposal, notes-tags, operations, proactive, quote
- recipe (read-only), restricted, staff, and more

**Permanently Restricted Actions:**

- `agent.create_recipe`, `agent.update_recipe`, `agent.add_ingredient` (chef IP)
- `agent.ledger_write`, `agent.refund` (financial immutability)
- `agent.send_email` (drafts only)
- `agent.delete_data`, `agent.modify_roles` (security)

### 6.2 AI Parse/Extract Functions

**Status: EXECUTING (76 files using parseWithOllama)**

Key functions: parse-recipe, parse-brain-dump, parse-inquiry, parse-document-text, parse-client, parse-transcript, parse-event-from-text, parse-menu-text

### 6.3 AI Draft/Generation Functions

**Status: EXECUTING (all require chef approval)**

draft-actions (12 templates), aar-generator, contract-generator, chef-bio, campaign-outreach, quote-draft

### 6.4 AI Analysis Functions

**Status: EXECUTING**

allergen-risk, chat-insights, client-preference-profile, contingency-ai, grocery-consolidation, menu-suggestions, pricing-intelligence, recipe-scaling, gratuity-framing, tax-deduction-identifier, equipment-depreciation-explainer

### 6.5 Privacy Boundary

| Backend        | Purpose                                             | Status    |
| -------------- | --------------------------------------------------- | --------- |
| Ollama (local) | Private data (client PII, financials, recipes)      | EXECUTING |
| Gemini (cloud) | Generic tasks only (technique lists, kitchen specs) | EXECUTING |

**Enforcement:** `parseWithOllama` throws `OllamaOfflineError` if Ollama unavailable. Never falls back to cloud.

### 6.6 Remy Public Endpoint (`/api/remy/public`)

**Status: EXECUTING**

- Unauthenticated, rate limited (5/min/IP)
- Generic site assistance only, no PII

### 6.7 Remy Client Endpoint (`/api/remy/client`)

**Status: EXECUTING**

- Authenticated client-facing Remy

---

## 7. Server Actions

### 7.1 Overview

**574 server action files, ~1,500+ exported functions**

**Status: EXECUTING (bulk)**

Top domains by file count:

- finance (31), events (27), clients (27), ai (25), commerce (22)
- ai/agent-actions (22), inventory (18), hub (18), staff (14)
- scheduling (11), menus (11), vendors (10), recipes (9), inquiries (9)

### 7.2 Auth Compliance

All sampled functions use proper auth guards:

- `requireChef()` on all chef-facing operations
- `requireClient()` on client-facing operations
- `requireAdmin()` on admin operations
- `requirePro()` on gated features

### 7.3 Tenant Isolation

All database operations include `.eq('tenant_id', user.tenantId!)` or equivalent. tenant_id always derived from session, never from request body.

### 7.4 @ts-nocheck Files (3 found, all safe)

| File                             | Exports                 | Risk                            |
| -------------------------------- | ----------------------- | ------------------------------- |
| `lib/waste/actions.ts`           | Types/constants only    | SAFE - no server action exports |
| `lib/events/fire-order.ts`       | Commented-out functions | SAFE - nothing callable         |
| `lib/scheduling/generate-ics.ts` | Pure function           | SAFE - no DB access             |

---

## 8. API Routes

### 8.1 V2 API (Primary - ~200 routes)

**Status: EXECUTING**

Major resource groups: clients, events, inquiries, quotes, recipes, menus, finance, invoices, documents, notifications, commerce, loyalty, marketing, partners, staff, goals, webhooks, settings, search

### 8.2 V1 API (Legacy - 2 routes)

**Status: EXECUTING but DEPRECATED**

- `/api/v1/clients/` and `/api/v1/events/`
- V2 is canonical

### 8.3 Document Generation (10 routes)

**Status: EXECUTING**

Invoice, quote, contract, receipt, FOH menu, financial summary, commerce receipt, shift report PDFs

### 8.4 Health & Monitoring (5 routes)

**Status: EXECUTING**

- `/api/health/ping`, `/api/health/readiness`, `/api/health`
- `/api/ai/health`, `/api/ai/monitor`, `/api/ai/wake`
- `/api/ollama-status`
- `/api/monitoring/report-error`

---

## 9. Webhooks & External Integrations

### 9.1 Stripe Webhook (`/api/webhooks/stripe`)

**Status: EXECUTING**

| Event                           | Handler                    | Effect                                     |
| ------------------------------- | -------------------------- | ------------------------------------------ |
| `payment_intent.succeeded`      | `handlePaymentSucceeded()` | Ledger append + event transition to `paid` |
| `payment_intent.payment_failed` | `handlePaymentFailed()`    | Notification only                          |
| `charge.refunded`               | `handleRefund()`           | Refund ledger entry                        |
| `charge.dispute.created`        | `handleDisputeCreated()`   | Dispute logging                            |
| `account.updated`               | `handleAccountUpdated()`   | Connect account status                     |
| `checkout.session.completed`    | Handler                    | Gift card processing                       |
| `customer.subscription.*`       | Handler                    | Subscription status                        |
| `transfer.*`, `payout.*`        | Handler                    | Payout tracking                            |

**Security:** Signature verification required. Idempotency via `transaction_reference`. Metadata ownership validation.

### 9.2 Other Webhooks

| Webhook           | Endpoint                         | Status    | Purpose                            |
| ----------------- | -------------------------------- | --------- | ---------------------------------- |
| Resend            | `/api/webhooks/resend`           | EXECUTING | Email open/click tracking          |
| Twilio            | `/api/webhooks/twilio`           | EXECUTING | Inbound SMS                        |
| DocuSign          | `/api/webhooks/docusign`         | EXECUTING | Contract signature completion      |
| Wix               | `/api/webhooks/wix`              | EXECUTING | Third-party inquiry ingestion      |
| Prospecting Reply | `/api/prospecting/webhook/reply` | EXECUTING | Email reply ingestion              |
| Custom Webhooks   | `/api/v2/webhooks/[id]`          | EXECUTING | Chef-defined webhook subscriptions |

### 9.3 Gmail/Calendar Integration

**Status: EXECUTING**

- OAuth via `/api/auth/google/connect/callback`
- Stores tokens in `google_connections` table
- Gmail sync via scheduled job `/api/scheduled/email-history-scan`
- Calendar sync: iCal feed at `/api/feeds/calendar/[token]`

### 9.4 Stripe Connect

**Status: EXECUTING**

- Onboarding callback at `/api/stripe/connect/callback`
- Express account setup flow

### 9.5 Social Media

**Status: EXECUTING**

- Instagram, TikTok, Meta OAuth flows at `/api/integrations/social/connect/[platform]`
- Scheduled publishing via `/api/scheduled/social-publish`

### 9.6 Other Integrations

| Integration | Status    | Purpose              |
| ----------- | --------- | -------------------- |
| Square      | EXECUTING | POS integration      |
| QuickBooks  | EXECUTING | Accounting sync      |
| Zapier      | EXECUTING | Automation triggers  |
| DocuSign    | EXECUTING | Contract signing     |
| Inngest     | EXECUTING | Background job queue |

---

## 10. Background & Scheduled Systems

### 10.1 Cron Jobs (`/api/cron/*`)

**Status: EXECUTING (14 endpoints, all require CRON_SECRET)**

| Job               | Purpose                        |
| ----------------- | ------------------------------ |
| account-purge     | Delete inactive accounts       |
| brand-monitor     | Brand mention monitoring       |
| circle-digest     | Community group digest email   |
| cooling-alert     | Temperature monitoring alerts  |
| developer-digest  | Developer admin summary        |
| momentum-snapshot | Performance metrics            |
| morning-briefing  | Daily briefing generation      |
| quarterly-checkin | Quarterly check-ins            |
| recall-check      | Food safety recall checks      |
| renewal-reminders | Contract renewal notifications |

### 10.2 Scheduled Tasks (`/api/scheduled/*`)

**Status: EXECUTING (26 endpoints, all require CRON_SECRET)**

**Automation:** automations, campaigns, sequences, follow-ups, call-reminders, rsvp-reminders, rsvp-retention, lifecycle, loyalty-expiry, waitlist-sweep

**Integrations:** integrations/pull, integrations/retry, email-history-scan, social-publish, reviews-sync, wix-process

**Reporting:** daily-report, monitor

**Cleanup:** activity-cleanup, push-cleanup

**Engagement:** raffle-draw, copilot, wellbeing-signals, revenue-goals

**Simulation:** simulation, simulation/check

### 10.3 Inngest Job Queue

**Status: EXECUTING (6 functions)**

| Function                      | Trigger                                | Purpose                      |
| ----------------------------- | -------------------------------------- | ---------------------------- |
| postEventThankYou             | `chefflow/event.completed`             | Thank you email (3d delay)   |
| postEventReviewRequest        | `chefflow/event.completed`             | Review request (7d delay)    |
| postEventReferralAsk          | `chefflow/event.completed`             | Referral request (14d delay) |
| commerceDayCloseout           | `chefflow/commerce.day-closeout`       | POS daily reconciliation     |
| commercePaymentReconciliation | `chefflow/commerce.reconcile-payments` | Payment matching             |
| commerceSettlementMapping     | `chefflow/commerce.map-settlement`     | Stripe settlement tracking   |

---

## 11. Email & Notification System

### 11.1 Email Sending (`lib/email/send.ts`)

**Status: EXECUTING**

- Provider: Resend
- Non-blocking (logs errors, never throws from side effects)
- Circuit breaker: 5 consecutive failures -> 60s cooldown
- Sender: `CheFlow <noreply@cheflowhq.com>`
- 40+ email templates

### 11.2 Notification System (`lib/notifications/`)

**Status: EXECUTING**

**Channels:** In-app (always), Email (via Resend), SMS (Twilio), Push (OneSignal/PWA)

**50+ notification action types** covering events, quotes, inquiries, clients, commerce, loyalty, campaigns, and more.

**Channel routing:** `lib/notifications/channel-router.ts` routes by chef preference + off-hours checking.

**Preferences:** `notification_preferences` table, per-chef configuration.

---

## 12. Realtime Subscriptions

**Status: EXECUTING (all with proper cleanup)**

| Component               | Table             | Filter       | Events        | Cleanup       |
| ----------------------- | ----------------- | ------------ | ------------- | ------------- |
| live-inbox-widget       | unified_inbox     | tenant_id    | INSERT        | removeChannel |
| live-presence-panel     | activity_events   | tenant_id    | INSERT        | removeChannel |
| client-presence-monitor | activity_events   | client scope | INSERT        | removeChannel |
| hub-feed                | hub posts/circles | multiple     | INSERT/UPDATE | removeChannel |
| admin-presence-panel    | activity_events   | admin scope  | INSERT        | removeChannel |

**Chat Realtime** (`lib/chat/realtime.ts`):

- Messages: `chat:{conversationId}`
- Inbox: `inbox:{tenantId}`
- Typing: `typing:{conversationId}` (ephemeral broadcast)
- Presence: user presence tracking

**Hub Realtime** (`lib/hub/realtime.ts`):

- Messages: `hub:{groupId}`
- Updates: `hub-updates:{groupId}`
- Typing: `hub-typing:{groupId}`

---

## 13. Client-Side Behaviors

### 13.1 Context Providers (9 active)

| Provider                        | Purpose                                    | Status    |
| ------------------------------- | ------------------------------------------ | --------- |
| RemyProvider                    | Drawer state, mascot animation, lip-sync   | EXECUTING |
| ShortcutProvider                | Global keyboard shortcuts                  | EXECUTING |
| OfflineProvider                 | Connectivity, pending queue, sync progress | EXECUTING |
| GlobalTooltipProvider           | Tooltip rendering (10+ event listeners)    | EXECUTING |
| DashboardCollapseProvider       | Dashboard section collapse state           | EXECUTING |
| ClientDashboardCollapseProvider | Client portal collapse state               | EXECUTING |
| NotificationProvider            | Toast/notification state                   | EXECUTING |
| PostHogProvider                 | Analytics integration                      | EXECUTING |
| ColorPaletteProvider            | Theme color context                        | EXECUTING |

### 13.2 Custom Hooks (26 active, 0 orphaned)

All hooks actively used. Key hooks:

- `useServerAction` (517+ components) - standardized error handling with toast
- `useCheckedAction` (~100+ components) - variant for `{success, error}` returns
- `useRemySend` - Remy message streaming + local storage
- `useIdempotentMutation` - offline queue support
- `useDebounce` (30+), `useThrottle` (15+)
- `useVoiceInput` - Speech-to-text via Web Speech API
- `useKitchenMode` - continuous listening with wake word
- `useProtectedForm` - unsaved changes protection
- `useDurableDraft` - IndexedDB-backed draft auto-save
- `usePersistentViewState` - localStorage-backed view state

### 13.3 useEffect Cleanup Audit

**Result: 98% proper cleanup**

- Timer-based: All `setInterval` have `clearInterval` in cleanup
- Event listeners: All 10+ listener types properly removed
- PostgreSQL subscriptions: All use `removeChannel` in cleanup
- RAF/Animation: `cancelAnimationFrame` in cleanup
- AudioContext: Proper close via oscillator `onended`

### 13.4 Offline State Management

**Status: EXECUTING**

- IndexedDB: Draft storage, action log, pending queue
- `useIdempotentMutation`: retry logic + optimistic results
- `useNetworkStatus`: online/offline detection
- `OfflineProvider`: central context
- Sync engine: `replayPendingActions()` on reconnect

### 13.5 PWA

**Status: EXECUTING**

- Service worker registration in `components/pwa/sw-register.tsx`
- Proper update handling (SKIP_WAITING)
- Offline caching strategy
- Only active when `ENABLE_PWA_BUILD=1`

---

## 14. Embed / Widget System

**Status: EXECUTING**

**Files:** `public/embed/chefflow-widget.js`, `app/embed/`, `components/embed/`, `app/api/embed/`

**Flow:**

1. External site drops `<script>` with `data-chef-id="UUID"`
2. Script creates iframe -> `/embed/inquiry/[chefId]`
3. Form validates locally, submits to `/api/embed/inquiry` (CORS POST)
4. API creates: client (idempotent) -> inquiry -> draft event -> Dinner Circle -> email -> automations -> Remy scoring
5. Success message posted back to parent via postMessage

**Security:** Honeypot field, Turnstile CAPTCHA, 10/5min/IP rate limit, origin-checked postMessage

---

## 15. Public Routes & Token-Protected Pages

### 15.1 Marketing/Directory (13 pages)

Homepage, about, pricing, trust, compare, customers, FAQ, contact, privacy, terms

### 15.2 Chef Discovery (13 pages)

Chef profiles, chef directory, discover (universal food services directory), marketplace

### 15.3 Token-Protected (14+ pages)

| Route                                  | Purpose                   |
| -------------------------------------- | ------------------------- |
| `/proposal/[token]`                    | Public proposal view      |
| `/share/[token]`                       | Event share portal        |
| `/review/[token]`                      | Review submission         |
| `/feedback/[token]`                    | Event feedback            |
| `/guest-feedback/[token]`              | Guest satisfaction survey |
| `/tip/[token]`                         | Gratuity submission       |
| `/worksheet/[token]`                   | Event worksheet           |
| `/event/[eventId]/guest/[secureToken]` | Guest RSVP portal         |
| `/availability/[token]`                | Staff shift confirmation  |
| `/hub/g/[groupToken]`                  | Dinner Circle view        |
| `/hub/join/[groupToken]`               | Join Dinner Circle        |
| `/hub/me/[profileToken]`               | Profile view              |

---

## 16. Kiosk System

**Status: EXECUTING**

**Endpoints:** `/api/kiosk/*` (pair, status, heartbeat, verify-pin, inquiry, order/catalog, order/checkout, order/drawer, end-session)

**Security:** Device bearer token, 10/5min rate limit, dedup by name+date within 5min

---

## 17. Mission Control

**Status: EXECUTING**

**Files:** `scripts/launcher/index.html`, `scripts/launcher/server.mjs`

**Capabilities:** File watcher, activity summary, SSE real-time feed, service health checks (dev/beta/prod/Ollama), git monitoring, process control, log viewer

**APIs:** `/api/activity/summary`, `/api/manual/scan`, `/api/git/status`, `/api/services/health`

---

## 18. Deployment Infrastructure

**Status: EXECUTING**

| Environment | Port | Domain             | Directory |
| ----------- | ---- | ------------------ | --------- |
| Development | 3100 | localhost          | CFv1      |
| Beta        | 3200 | beta.cheflowhq.com | CFv1-beta |
| Production  | 3300 | app.cheflowhq.com  | CFv1-prod |

**Deploy scripts:** `scripts/deploy-beta.sh`, `scripts/deploy-prod.sh`
**Rollback scripts:** `scripts/rollback-beta.sh`, `scripts/rollback-prod.sh`
**Start scripts:** `scripts/start-beta.ps1`, `scripts/start-prod.ps1`

All three environments share the same PostgreSQL database and Ollama instance.

---

## 19. Cross-Reference Matrix

### Event Lifecycle (full execution path)

```
Inquiry Received (embed/kiosk/manual)
  -> lib/inquiries/actions.ts: createInquiry()
  -> Automation evaluation
  -> Remy reactive task enqueue
  -> Notification to chef
  |
  v
Quote Created
  -> lib/quotes/actions.ts: createQuote()
  -> Quote state: draft
  |
  v
Quote Sent
  -> transitionQuote('sent')
  -> Email to client with proposal link (/proposal/[token])
  -> Inquiry state: quoted
  |
  v
Event Created (from quote acceptance or manual)
  -> lib/events/actions.ts: createEvent()
  -> Event FSM: draft
  |
  v
Event Proposed
  -> lib/events/transitions.ts: transitionEvent('proposed')
  -> Email + notification to client
  -> Client sees event in /my-events
  |
  v
Client Accepts
  -> transitionEvent('accepted')
  -> Notification to chef
  |
  v
Payment Received (Stripe webhook)
  -> /api/webhooks/stripe: payment_intent.succeeded
  -> lib/ledger/append.ts: appendLedgerEntryFromWebhook()
  -> transitionEvent('paid') [system, skips readiness]
  |
  v
Chef Confirms (readiness gates checked)
  -> transitionEvent('confirmed')
  -> Travel legs auto-create
  -> Prep blocks auto-place
  -> Google Calendar sync
  -> Automation evaluation
  |
  v
Event In Progress
  -> transitionEvent('in_progress')
  |
  v
Event Completed
  -> transitionEvent('completed')
  -> Inngest: postEventThankYou (3d)
  -> Inngest: postEventReviewRequest (7d)
  -> Inngest: postEventReferralAsk (14d)
  -> Loyalty points auto-award
  -> Post-event survey creation
  -> AAR generation available
```

### Remy Execution Path

```
User types message in Remy drawer
  -> components/ai/remy-drawer.tsx (client)
  -> useRemySend hook
  -> POST /api/remy/stream (SSE)
  -> lib/ai/remy-actions.ts: sendRemyMessage()
  -> Rate limit check (12/min)
  -> Input validation (lib/ai/remy-input-validation.ts)
  -> Intent classification (lib/ai/remy-classifier.ts)
  |
  ├─ Memory intent -> Remy memory actions
  ├─ Task intent -> Command orchestrator -> Agent registry -> Agent action module
  └─ Conversational -> Ollama (parseWithOllama) -> Streaming response
  |
  v
Response streamed back to client via SSE
  -> Remy mascot lip-sync animation
  -> Action approval UI (if tier 2/3)
```

### Financial Data Flow

```
Stripe webhook / Manual entry / POS sale
  -> lib/ledger/append.ts: appendLedgerEntry*()
  -> ledger_entries table (immutable, append-only)
  |
  v
event_financial_summary view (auto-computed)
  -> Dashboard widgets read from view
  -> Event detail page reads from view
  -> Financial reports read from view
  |
  v
getTenantFinancialSummary() / computeProfitAndLoss()
  -> Overall business financials
  -> Tax preparation
  -> Analytics dashboards
```

### Notification Dispatch Flow

```
Business event occurs (transition, creation, etc.)
  -> lib/notifications/send.ts: sendNotification()
  -> lib/notifications/channel-router.ts: route by preference
  |
  ├─ In-app: INSERT into notifications table
  │   -> SSE realtime -> Client component update
  ├─ Email: lib/email/send.ts -> Resend API
  │   -> Circuit breaker (5 failures -> 60s cooldown)
  ├─ SMS: Twilio API
  └─ Push: OneSignal / Web Push API
```

---

## 20. Disconnected, Shadowed, and Duplicated Behaviors

### DISCONNECTED

| Behavior                           | Location                              | Evidence                                                                                           | Severity                              |
| ---------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------- |
| V1 API routes                      | `/api/v1/clients/`, `/api/v1/events/` | Deprecated, V2 is canonical. No known callers within the app.                                      | LOW - dead code, no runtime impact    |
| (mobile) route group               | `app/(mobile)/` (2 pages)             | No navigation links point here. No documented auth guard. Unknown if any external app calls these. | MEDIUM - may be orphaned              |
| (demo) route group                 | `app/(demo)/demo/demo`                | Single page, no nav link. May only be accessed via direct URL.                                     | LOW - likely intentional              |
| Some deeply nested settings routes | Various `/settings/**`                | 50+ settings sub-routes, some may lack nav links. Accessible only by direct URL.                   | LOW - functional if accessed directly |
| `/dev/simulate`                    | `app/(chef)/dev/simulate/`            | Dev tools page, no nav link. Intentionally hidden.                                                 | NONE - by design                      |

### SHADOWED

| Behavior                              | Shadowed By | Evidence | Severity |
| ------------------------------------- | ----------- | -------- | -------- |
| No confirmed shadowed behaviors found | -           | -        | -        |

### DUPLICATED

| Behavior         | Locations                                                                                                      | Evidence                                                                                                                                             | Severity                     |
| ---------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Inquiry creation | Embed API (`/api/embed/inquiry`), Kiosk API (`/api/kiosk/inquiry`), Server action (`lib/inquiries/actions.ts`) | Three entry points for creating inquiries. Each has different validation, rate limiting, and context. This is intentional (different auth contexts). | NONE - by design             |
| Client creation  | Multiple server actions + embed + kiosk                                                                        | Idempotent by email across all entry points.                                                                                                         | NONE - properly deduplicated |

### UNKNOWN EXECUTION STATUS

| Behavior                      | Location                                | Reason                                                                                                                                                                  |
| ----------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Some scheduled task endpoints | `/api/scheduled/*`                      | Execution depends on external cron scheduler (e.g., Vercel Cron, external cron service). Cannot verify if scheduler is actually configured and calling these endpoints. |
| Inngest functions             | `/api/inngest`                          | Execution depends on Inngest cloud service being configured with correct event key. Graceful no-op if key not set.                                                      |
| Social media publishing       | `/api/scheduled/social-publish`         | Depends on social OAuth tokens being valid and social accounts connected.                                                                                               |
| Square POS integration        | `/api/integrations/square/callback`     | Depends on Square account being connected.                                                                                                                              |
| QuickBooks integration        | `/api/integrations/quickbooks/callback` | Depends on QuickBooks account being connected.                                                                                                                          |

---

## 21. Missing or Regressed Signals

### Page-Level Auth Guard Gaps

| Page                                                           | Issue                                                                   | Risk                                                                     |
| -------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `/admin/reconciliation/page.tsx`                               | Missing explicit `requireAdmin()` call. Protected only by layout guard. | LOW - layout guard covers it, but defense-in-depth missing               |
| `/admin/animations/page.tsx`                                   | Client component, no server-side guard.                                 | LOW - layout guard covers it                                             |
| Chef portal pages (activity, analytics/daily-report, calls/\*) | No page-level `requireChef()`. Rely on layout-level guard.              | LOW - layout guard covers it, but if layout changes these become exposed |

### Prospecting Admin-Only Gating

| Issue                                                                                                                                           | Evidence                                                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Prospecting routes rely on nav-level hiding (`adminOnly: true`) but some `/api/prospecting/*` API routes may not check `isAdmin()` server-side. | Nav filtering is the primary gate. API routes should also verify for defense-in-depth. |

### Webhook Readiness Gate Bypass

| Issue                                                                                                                                                       | Evidence                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Stripe webhooks that transition events to `paid` skip readiness checks (by design). This means anaphylaxis hard blocks are bypassed for system transitions. | Documented design decision, but should be explicitly noted. |

### Commerce Payment Metadata Validation

| Issue                                                                                                                                    | Evidence                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Event payment webhook validates `event_id` ownership against `tenant_id`. Commerce payment webhook may have a different validation path. | Should verify `sale_id` ownership check is as robust. |

### Minor Client-Side Issues

| Issue                                   | Location                        | Severity                          |
| --------------------------------------- | ------------------------------- | --------------------------------- |
| `setTimeout` without cleanup on unmount | `live-inbox-widget.tsx` line 92 | LOW - state-based, no memory leak |

---

## Appendix: File Inventory (Key Files Only)

### State Machines

- `lib/events/transitions.ts` - Event FSM
- `lib/events/readiness.ts` - Readiness gates
- `lib/inquiries/actions.ts` - Inquiry FSM
- `lib/quotes/actions.ts` - Quote FSM

### Financial

- `lib/ledger/append.ts` - Ledger append (immutable)
- `lib/ledger/compute.ts` - Financial computations
- `lib/billing/tier.ts` - Tier resolution
- `lib/billing/modules.ts` - Module definitions
- `lib/billing/pro-features.ts` - Pro feature registry
- `lib/billing/require-pro.ts` - Server-side Pro enforcement

### AI

- `lib/ai/remy-actions.ts` - Remy entry point
- `lib/ai/remy-classifier.ts` - Intent classification
- `lib/ai/command-orchestrator.ts` - Task execution
- `lib/ai/agent-registry.ts` - Action registry
- `lib/ai/agent-actions/restricted-actions.ts` - Permanent restrictions
- `lib/ai/parse-ollama.ts` - Base Ollama parser
- `lib/ai/providers.ts` - AI provider config

### Auth

- `middleware.ts` - Request-level auth
- `lib/auth/get-user.ts` - Auth guard functions
- `lib/auth/route-policy.ts` - Path categorization
- `lib/auth/admin.ts` - Admin checks

### Webhooks

- `app/api/webhooks/stripe/route.ts` - Stripe
- `app/api/webhooks/resend/route.ts` - Resend email tracking
- `app/api/webhooks/twilio/route.ts` - SMS
- `app/api/webhooks/docusign/route.ts` - Contract signing
- `app/api/webhooks/wix/route.ts` - Wix bookings

### Email & Notifications

- `lib/email/send.ts` - Email dispatch
- `lib/email/route-email.ts` - Email routing
- `lib/notifications/send.ts` - Notification creation
- `lib/notifications/channel-router.ts` - Channel routing
- `lib/notifications/realtime.ts` - Realtime notifications

### Navigation

- `components/navigation/nav-config.tsx` - All nav links
- `components/navigation/chef-nav-config.ts` - Sidebar structure

### Embed

- `public/embed/chefflow-widget.js` - Widget script
- `app/embed/inquiry/[chefId]/page.tsx` - Embed form page
- `components/embed/embed-inquiry-form.tsx` - Form component
- `app/api/embed/inquiry/route.ts` - Form submission API

### Deploy

- `scripts/deploy-beta.sh` - Beta deploy
- `scripts/deploy-prod.sh` - Prod deploy
- `scripts/rollback-beta.sh` - Beta rollback
- `scripts/rollback-prod.sh` - Prod rollback
