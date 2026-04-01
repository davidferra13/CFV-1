# Research: External Entrypoint Classification

> **Date:** 2026-04-01
> **Question:** Which `app/**/route.ts` files serve external callers (webhooks, OAuth callbacks, cron jobs, integrations) vs internal callers only?
> **Status:** complete

---

## Methodology

1. All `app/**/route.ts` files were enumerated via filesystem scan (163 files total).
2. HTTP methods were extracted by checking `export async function GET/POST/PUT/DELETE/PATCH` and `export const GET/POST = withApiAuth(...)` patterns.
3. Files using `withApiAuth` from `lib/api/v2` are v2 REST routes authenticated by API key or session. They are intended for internal client use (app pages calling the API) but may also be used by external integrations.
4. Files containing `verifyCronAuth` indicate cron/scheduled execution; they require a `CRON_SECRET` bearer token.
5. Classification:
   - `internal`: called only by the app's own client-side or server-side code
   - `webhook`: receives POST from an external service (Stripe, Twilio, Resend, Wix, DocuSign, Instantly.ai)
   - `oauth`: OAuth 2.0 callback or connect flow
   - `cron`: invoked by a time-based scheduler (self-hosted or Vercel cron)
   - `external_integration`: integration endpoint accessible by external authorized callers (kiosk, embed, calendar feed, Zapier)
   - `health_monitor`: status and health check endpoints, may be called by uptime monitors
   - `unknown`: insufficient evidence to classify confidently

---

## Authentication Boundary Note

The v2 API routes use `withApiAuth()` from `lib/api/v2`, which enforces authentication. These routes ARE callable externally if a valid session or API key is provided. However, they are designed primarily for use by the ChefFlow app itself. They are classified as `internal` in this report unless evidence of external consumption exists.

---

## Cron and Scheduled Routes

All cron routes use `verifyCronAuth()` which validates a `CRON_SECRET` bearer token. They are designed to be called by a scheduler on a fixed interval.

| Route                         | Methods   | Classification                         |
| ----------------------------- | --------- | -------------------------------------- |
| `/api/cron/account-purge`     | GET       | `cron`                                 |
| `/api/cron/brand-monitor`     | GET       | `cron`                                 |
| `/api/cron/circle-digest`     | GET       | `cron`                                 |
| `/api/cron/cooling-alert`     | GET       | `cron`                                 |
| `/api/cron/developer-digest`  | GET       | `cron`                                 |
| `/api/cron/event-progression` | GET       | `cron`                                 |
| `/api/cron/momentum-snapshot` | GET       | `cron`                                 |
| `/api/cron/morning-briefing`  | GET       | `cron`                                 |
| `/api/cron/openclaw-polish`   | GET, POST | `cron`                                 |
| `/api/cron/openclaw-sync`     | GET, POST | `cron`                                 |
| `/api/cron/price-sync`        | GET       | `cron`                                 |
| `/api/cron/quarterly-checkin` | GET       | `cron`                                 |
| `/api/cron/recall-check`      | GET       | `cron`                                 |
| `/api/cron/renewal-reminders` | GET       | `cron`                                 |
| `/api/gmail/sync`             | GET, POST | `cron` (comment: "scheduled cron job") |

**Scheduled routes** (all use identical GET/POST dual-method pattern with cron auth, some show empty method detection due to export pattern):

| Route                               | Methods   | Classification |
| ----------------------------------- | --------- | -------------- |
| `/api/scheduled/activity-cleanup`   | GET, POST | `cron`         |
| `/api/scheduled/automations`        | GET, POST | `cron`         |
| `/api/scheduled/call-reminders`     | GET, POST | `cron`         |
| `/api/scheduled/campaigns`          | GET       | `cron`         |
| `/api/scheduled/copilot`            | GET, POST | `cron`         |
| `/api/scheduled/daily-report`       | GET       | `cron`         |
| `/api/scheduled/email-history-scan` | GET, POST | `cron`         |
| `/api/scheduled/follow-ups`         | GET, POST | `cron`         |
| `/api/scheduled/integrations/pull`  | GET, POST | `cron`         |
| `/api/scheduled/integrations/retry` | GET, POST | `cron`         |
| `/api/scheduled/lifecycle`          | GET, POST | `cron`         |
| `/api/scheduled/loyalty-expiry`     | GET, POST | `cron`         |
| `/api/scheduled/monitor`            | GET, POST | `cron`         |
| `/api/scheduled/push-cleanup`       | GET, POST | `cron`         |
| `/api/scheduled/raffle-draw`        | GET, POST | `cron`         |
| `/api/scheduled/revenue-goals`      | GET, POST | `cron`         |
| `/api/scheduled/reviews-sync`       | GET, POST | `cron`         |
| `/api/scheduled/rsvp-reminders`     | GET, POST | `cron`         |
| `/api/scheduled/rsvp-retention`     | GET, POST | `cron`         |
| `/api/scheduled/sequences`          | GET       | `cron`         |
| `/api/scheduled/simulation`         | GET, POST | `cron`         |
| `/api/scheduled/social-publish`     | GET, POST | `cron`         |
| `/api/scheduled/stale-leads`        | GET, POST | `cron`         |
| `/api/scheduled/waitlist-sweep`     | GET, POST | `cron`         |
| `/api/scheduled/wellbeing-signals`  | GET, POST | `cron`         |
| `/api/scheduled/wix-process`        | GET, POST | `cron`         |

**Notes on scheduled route method detection:** Several scheduled routes showed empty method strings during the initial scan. This is because they use a shared `handleX` function and then `export { handleX as GET, handleX as POST }` or similar, which the simple regex did not match. The route file headers confirm they are all GET/POST cron routes. No scheduled routes should be classified as dead.

---

## Webhook Routes

These receive HTTP POST from external services. They must never be classified as dead regardless of import status.

| Route                            | Methods | External Caller                                                                                                       | Classification |
| -------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------- | -------------- |
| `/api/webhooks/stripe`           | POST    | Stripe payment events                                                                                                 | `webhook`      |
| `/api/webhooks/twilio`           | POST    | Twilio SMS delivery status                                                                                            | `webhook`      |
| `/api/webhooks/resend`           | POST    | Resend email delivery events                                                                                          | `webhook`      |
| `/api/webhooks/docusign`         | POST    | DocuSign signature events                                                                                             | `webhook`      |
| `/api/webhooks/wix`              | POST    | Wix form submissions                                                                                                  | `webhook`      |
| `/api/webhooks/[provider]`       | POST    | Generic provider webhook receiver                                                                                     | `webhook`      |
| `/api/prospecting/webhook/reply` | POST    | Instantly.ai reply webhook (comment in file: "When a prospect replies to a cold email, Instantly fires this webhook") | `webhook`      |

---

## OAuth Callback Routes

These receive GET callbacks from OAuth providers after authorization. They must never be classified as dead.

| Route                                            | Methods   | Provider                               | Classification |
| ------------------------------------------------ | --------- | -------------------------------------- | -------------- |
| `/api/auth/[...nextauth]`                        | GET, POST | Auth.js v5 (credentials, Google OAuth) | `oauth`        |
| `/auth/callback`                                 | GET       | Auth redirect callback                 | `oauth`        |
| `/api/auth/google/connect/callback`              | GET       | Google calendar/email OAuth connect    | `oauth`        |
| `/api/auth/google/connect`                       | GET       | Google OAuth connect initiation        | `oauth`        |
| `/api/integrations/[provider]/callback`          | GET       | Generic integration OAuth callback     | `oauth`        |
| `/api/integrations/[provider]/connect`           | GET, POST | Generic integration OAuth connect      | `oauth`        |
| `/api/integrations/docusign/callback`            | GET       | DocuSign OAuth callback                | `oauth`        |
| `/api/integrations/quickbooks/callback`          | GET       | QuickBooks OAuth callback              | `oauth`        |
| `/api/integrations/square/callback`              | GET       | Square OAuth callback                  | `oauth`        |
| `/api/integrations/social/callback/[platform]`   | GET       | Social platform OAuth callback         | `oauth`        |
| `/api/integrations/social/connect/[platform]`    | GET       | Social OAuth connect                   | `oauth`        |
| `/api/integrations/social/disconnect/[platform]` | GET       | Social OAuth disconnect                | `oauth`        |
| `/api/stripe/connect/callback`                   | GET       | Stripe Connect OAuth callback          | `oauth`        |
| `/api/social/google/callback`                    | GET       | Google social connect callback         | `oauth`        |
| `/api/social/instagram/callback`                 | GET       | Instagram social connect callback      | `oauth`        |

---

## External Integration Routes

These are called by external devices, embedded widgets, or integration partners, not by the app's own UI.

| Route                                | Methods           | External Consumer                                                      | Classification         |
| ------------------------------------ | ----------------- | ---------------------------------------------------------------------- | ---------------------- |
| `/api/embed/inquiry`                 | POST              | Embedded inquiry widget on external websites                           | `external_integration` |
| `/api/feeds/calendar/[token]`        | GET               | Calendar apps (Google Calendar, Apple Calendar, etc.) via iCal token   | `external_integration` |
| `/api/kiosk/end-session`             | POST              | Kiosk device                                                           | `external_integration` |
| `/api/kiosk/heartbeat`               | POST              | Kiosk device keepalive                                                 | `external_integration` |
| `/api/kiosk/inquiry`                 | POST              | Kiosk device inquiry submission                                        | `external_integration` |
| `/api/kiosk/order/catalog`           | GET               | Kiosk device order catalog                                             | `external_integration` |
| `/api/kiosk/order/checkout`          | POST              | Kiosk device checkout                                                  | `external_integration` |
| `/api/kiosk/order/drawer`            | GET               | Kiosk device cash drawer                                               | `external_integration` |
| `/api/kiosk/pair`                    | POST              | Kiosk device pairing                                                   | `external_integration` |
| `/api/kiosk/status`                  | GET               | Kiosk device status check                                              | `external_integration` |
| `/api/kiosk/verify-pin`              | POST              | Kiosk device PIN verification                                          | `external_integration` |
| `/api/public/client-lookup`          | POST              | Client token-based lookup from public pages                            | `external_integration` |
| `/api/sentinel/auth`                 | POST              | OpenClaw Pi sentinel authentication                                    | `external_integration` |
| `/api/sentinel/health`               | GET               | OpenClaw Pi sentinel health check                                      | `external_integration` |
| `/api/sentinel/sync-status`          | GET               | OpenClaw Pi sentinel sync status                                       | `external_integration` |
| `/api/integrations/zapier/subscribe` | GET, POST, DELETE | Zapier subscription management                                         | `external_integration` |
| `/api/v2/partners/[id]/share-link`   | GET               | Partner share link generation                                          | `external_integration` |
| `/api/admin/directory/image-queue`   | GET               | OpenClaw Pi image queue seeding (comment in file confirms Pi consumer) | `external_integration` |

---

## Health and Monitoring Routes

| Route                          | Methods | Classification                                |
| ------------------------------ | ------- | --------------------------------------------- |
| `/api/health`                  | GET     | `health_monitor`                              |
| `/api/health/ping`             | GET     | `health_monitor`                              |
| `/api/health/readiness`        | GET     | `health_monitor`                              |
| `/api/system/health`           | GET     | `health_monitor`                              |
| `/api/system/heal`             | POST    | `internal` (admin action)                     |
| `/api/ai/health`               | GET     | `health_monitor`                              |
| `/api/ai/monitor`              | GET     | `health_monitor`                              |
| `/api/ollama-status`           | GET     | `health_monitor`                              |
| `/api/build-version`           | GET     | `internal` (version check by app or monitors) |
| `/api/monitoring/report-error` | POST    | `internal` (client-side error reporting)      |

---

## Inngest Route

| Route          | Methods        | Classification                                                                                  |
| -------------- | -------------- | ----------------------------------------------------------------------------------------------- |
| `/api/inngest` | GET, POST, PUT | `external_integration` (Inngest serverless task queue; receives and serves Inngest HTTP events) |

---

## Internal Application Routes

These routes are called by the application's own pages and server actions. They have no external callers based on available evidence.

**Document generation and export:**

| Route                                              | Methods | Classification |
| -------------------------------------------------- | ------- | -------------- |
| `/api/documents/[eventId]/bulk-generate`           | POST    | `internal`     |
| `/api/documents/[eventId]`                         | GET     | `internal`     |
| `/api/documents/commerce-receipt/[saleId]`         | GET     | `internal`     |
| `/api/documents/commerce-shift-report/[sessionId]` | GET     | `internal`     |
| `/api/documents/consolidated-grocery`              | GET     | `internal`     |
| `/api/documents/contract/[contractId]`             | GET     | `internal`     |
| `/api/documents/financial-summary/[eventId]`       | GET     | `internal`     |
| `/api/documents/foh-menu/[eventId]`                | GET     | `internal`     |
| `/api/documents/foh-preview/[menuId]`              | GET     | `internal`     |
| `/api/documents/invoice-pdf/[eventId]`             | GET     | `internal`     |
| `/api/documents/invoice/[eventId]`                 | GET     | `internal`     |
| `/api/documents/quote-client/[quoteId]`            | GET     | `internal`     |
| `/api/documents/quote/[quoteId]`                   | GET     | `internal`     |
| `/api/documents/receipt/[eventId]`                 | GET     | `internal`     |
| `/api/documents/snapshots/[snapshotId]`            | GET     | `internal`     |
| `/api/documents/snapshots/export`                  | GET     | `internal`     |
| `/api/documents/templates/[template]`              | GET     | `internal`     |
| `/(chef)/clients/csv-export`                       | GET     | `internal`     |
| `/(chef)/events/csv-export`                        | GET     | `internal`     |
| `/(chef)/finance/export`                           | GET     | `internal`     |
| `/(chef)/finance/year-end/export`                  | GET     | `internal`     |
| `/(admin)/admin/price-catalog/csv-export`          | GET     | `internal`     |

**Realtime / SSE:**

| Route                     | Methods | Classification                                       |
| ------------------------- | ------- | ---------------------------------------------------- |
| `/api/realtime/[channel]` | GET     | `internal` (SSE stream, consumed by `useSSE()` hook) |
| `/api/realtime/presence`  | POST    | `internal`                                           |
| `/api/realtime/typing`    | POST    | `internal`                                           |

**Push notifications:**

| Route                        | Methods | Classification |
| ---------------------------- | ------- | -------------- |
| `/api/push/subscribe`        | POST    | `internal`     |
| `/api/push/unsubscribe`      | POST    | `internal`     |
| `/api/push/resubscribe`      | POST    | `internal`     |
| `/api/push/vapid-public-key` | GET     | `internal`     |

**AI and Remy:**

| Route               | Methods   | Classification                  |
| ------------------- | --------- | ------------------------------- |
| `/api/remy/client`  | POST      | `internal` (client-portal Remy) |
| `/api/remy/landing` | POST      | `internal` (landing page Remy)  |
| `/api/remy/public`  | POST      | `internal` (public widget Remy) |
| `/api/remy/stream`  | POST      | `internal` (chef Remy stream)   |
| `/api/remy/warmup`  | POST      | `internal` (Ollama warmup)      |
| `/api/ai/wake`      | GET, POST | `internal` (Ollama wake-up)     |

**Activity tracking:**

| Route                       | Methods | Classification |
| --------------------------- | ------- | -------------- |
| `/api/activity/track`       | POST    | `internal`     |
| `/api/activity/feed`        | GET     | `internal`     |
| `/api/activity/breadcrumbs` | POST    | `internal`     |

**Cannabis and misc:**

| Route                                   | Methods   | Classification                                                                 |
| --------------------------------------- | --------- | ------------------------------------------------------------------------------ |
| `/api/cannabis/rsvps/[eventId]/summary` | GET       | `internal`                                                                     |
| `/api/clients/preferences`              | POST      | `internal`                                                                     |
| `/api/comms/sms`                        | POST      | `internal` (outbound SMS initiation)                                           |
| `/api/menus/upload`                     | POST      | `internal`                                                                     |
| `/api/notifications/send`               | POST      | `internal`                                                                     |
| `/api/scheduling/availability`          | GET       | `internal`                                                                     |
| `/api/qol/metrics`                      | POST      | `internal`                                                                     |
| `/api/social/google/connect`            | GET       | `oauth`                                                                        |
| `/api/social/google/sync`               | GET, POST | `cron` (can also be triggered manually)                                        |
| `/api/social/instagram/connect`         | GET       | `oauth`                                                                        |
| `/api/social/instagram/sync`            | GET, POST | `cron` (can also be triggered manually)                                        |
| `/api/integrations/connect`             | POST      | `internal`                                                                     |
| `/api/e2e/auth`                         | POST      | `internal` (agent test account sign-in only)                                   |
| `/api/book`                             | POST      | `internal` (booking form submission)                                           |
| `/api/demo/data`                        | POST      | `internal`                                                                     |
| `/api/demo/switch`                      | POST      | `internal`                                                                     |
| `/api/demo/tier`                        | POST      | `internal`                                                                     |
| `/api/reports/financial`                | GET       | `internal`                                                                     |
| `/feed.xml`                             | GET       | `external_integration` (RSS feed, consumed by feed readers)                    |
| `/book/[chefSlug]/availability`         | GET       | `external_integration` (called by booking form; may also be called externally) |

**Storage:**

| Route                           | Methods | Classification                                                |
| ------------------------------- | ------- | ------------------------------------------------------------- |
| `/api/storage/[...path]`        | GET     | `internal` (signed URL file delivery)                         |
| `/api/storage/public/[...path]` | GET     | `external_integration` (unauthenticated public file delivery) |

**v2 API routes (internal REST API, potentially externally callable with auth):**

The full v2 surface (`/api/v2/*`) contains 80+ endpoints across events, clients, quotes, loyalty, marketing, commerce, goals, staff, vendors, partners, webhooks, and more. All use `withApiAuth()`. Classification is `internal` with a note that they could be called externally by any authenticated integration, similar to a REST API.

| Group                      | Route Pattern                          | Methods                  | Classification |
| -------------------------- | -------------------------------------- | ------------------------ | -------------- |
| Events                     | `/api/v2/events` and sub-routes        | GET, POST, PATCH, DELETE | `internal`     |
| Clients                    | `/api/v2/clients` and sub-routes       | GET, POST, PATCH, DELETE | `internal`     |
| Quotes                     | `/api/v2/quotes` and sub-routes        | GET, POST, PATCH         | `internal`     |
| Invoices                   | `/api/v2/invoices` and sub-routes      | GET, POST, PATCH         | `internal`     |
| Expenses                   | `/api/v2/expenses` and sub-routes      | GET, POST, PATCH, DELETE | `internal`     |
| Payments                   | `/api/v2/payments`                     | POST                     | `internal`     |
| Ledger                     | `/api/v2/ledger`                       | GET                      | `internal`     |
| Goals                      | `/api/v2/goals` and sub-routes         | GET, POST, PATCH, DELETE | `internal`     |
| Commerce                   | `/api/v2/commerce/*`                   | GET, POST, PATCH, DELETE | `internal`     |
| Loyalty                    | `/api/v2/loyalty/*`                    | GET, POST, PATCH, DELETE | `internal`     |
| Marketing                  | `/api/v2/marketing/*`                  | GET, POST, PATCH, DELETE | `internal`     |
| Staff                      | `/api/v2/staff` and sub-routes         | GET, POST, PATCH, DELETE | `internal`     |
| Vendors                    | `/api/v2/vendors` and sub-routes       | GET, POST, PATCH, DELETE | `internal`     |
| Partners                   | `/api/v2/partners` and sub-routes      | GET, POST, PATCH, DELETE | `internal`     |
| Safety                     | `/api/v2/safety/*`                     | GET, POST, PATCH         | `internal`     |
| Recipes                    | `/api/v2/recipes` and sub-routes       | GET, POST, PATCH         | `internal`     |
| Menus                      | `/api/v2/menus` and sub-routes         | GET, POST, PATCH         | `internal`     |
| Notifications              | `/api/v2/notifications/*`              | GET, POST, PATCH, DELETE | `internal`     |
| Settings                   | `/api/v2/settings/*`                   | GET, POST, PATCH         | `internal`     |
| Taxonomy                   | `/api/v2/taxonomy` and sub-routes      | GET, POST, PATCH, DELETE | `internal`     |
| Inventory                  | `/api/v2/inventory` and sub-routes     | GET, POST, PATCH, DELETE | `internal`     |
| Webhooks (outbound config) | `/api/v2/webhooks/*`                   | GET, POST, PATCH, DELETE | `internal`     |
| Documents                  | `/api/v2/documents/*`                  | GET, POST                | `internal`     |
| Calls                      | `/api/v2/calls` and sub-routes         | GET, POST, PATCH, DELETE | `internal`     |
| Search                     | `/api/v2/search`                       | GET                      | `internal`     |
| Queue                      | `/api/v2/queue`                        | GET                      | `internal`     |
| Financials                 | `/api/v2/financials/summary`           | GET                      | `internal`     |
| Remy policies              | `/api/v2/remy/policies` and sub-routes | GET, POST, PATCH, DELETE | `internal`     |
| Booking                    | `/api/v2/booking/instant-checkout`     | POST                     | `internal`     |

---

## Unknown / Needs Investigation

| Route                                | Reason                                                                                              |
| ------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `/api/prospecting/[id]/convert`      | Only method extraction showed nothing (possible export pattern variation). Needs manual inspection. |
| `/api/prospecting/[id]/draft-email`  | Same.                                                                                               |
| `/api/prospecting/[id]/enrich`       | Same.                                                                                               |
| `/api/prospecting/[id]/log-outreach` | Same.                                                                                               |
| `/api/prospecting/by-email`          | GET, assumed internal.                                                                              |
| `/api/prospecting/check-dups`        | POST, assumed internal.                                                                             |
| `/api/prospecting/import`            | POST, assumed internal.                                                                             |
| `/api/prospecting/queue`             | GET, assumed internal.                                                                              |

---

## Summary Counts

| Classification         | Count                                          |
| ---------------------- | ---------------------------------------------- |
| `cron`                 | 41 (14 `/cron/` + 26 `/scheduled/` + 1 gmail)  |
| `webhook`              | 7                                              |
| `oauth`                | 15                                             |
| `external_integration` | 16                                             |
| `health_monitor`       | 7                                              |
| `internal`             | 80+ (v2 REST + documents + misc)               |
| `unknown`              | ~8 (prospecting sub-routes needing inspection) |

---

## Key Finding

The cron and scheduled surface is substantial (41 routes). All of them use `verifyCronAuth()` and are designed for the self-hosted cron system. None should be classified as dead code based on static import analysis. Similarly, the 15 OAuth routes and 7 webhook routes are externally triggered and invisible to static import scanners.

The `/api/admin/directory/image-queue` route is a notable external-integration route where the OpenClaw Pi is the consumer, confirming the separation described in `CLAUDE.md` (OpenClaw reads from ChefFlow via API).
