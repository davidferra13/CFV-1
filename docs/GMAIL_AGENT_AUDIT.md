# Gmail Agent — Audit & Fix

**Date:** 2026-02-19
**Branch:** `fix/cron-get-post-mismatch`
**Companion doc:** [GMAIL_AI_AGENT_PHASE_1.md](./GMAIL_AI_AGENT_PHASE_1.md)

---

## What Was Audited

A full audit of the Gmail email agent was performed, tracing every layer:

- OAuth connect/disconnect flow
- Token storage and auto-refresh
- Gmail sync engine (History API incremental sync)
- AI email classification (Gemini)
- Inquiry auto-creation from inbound emails
- Thread linking for reply chains
- AI draft generation (ACE correspondence engine)
- Approve & send via Gmail API with RFC 2822 threading
- Vercel Cron Job configuration
- All 9 scheduled/cron API route handlers

---

## Critical Bug Found & Fixed

### Root Cause: GET/POST Mismatch on All Vercel Cron Routes

**Vercel Cron Jobs send HTTP GET requests** to the registered endpoint path. Every cron route handler in this project was exporting only a `POST` handler. As a result, Vercel Cron was calling `GET /api/gmail/sync` (and all other cron paths) and receiving a **405 Method Not Allowed** response.

**Impact:** Auto-sync has never fired automatically since the project was deployed. Chefs had to manually click "Sync Now" in Settings → Connected Accounts every time they wanted to check their Gmail inbox.

### The Fix

Each route was refactored to extract the handler body into a private function, then export it as both GET and POST. No business logic was changed — only the function naming and exports.

```typescript
// BEFORE — only POST, Vercel Cron gets 405:
export async function POST(request: NextRequest) { ... }

// AFTER — GET for cron, POST for manual calls, same logic:
async function handleXxx(request: NextRequest): Promise<NextResponse> {
  // identical body
}
export { handleXxx as GET, handleXxx as POST }
```

Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` on GET requests — the existing auth check inside each handler is fully compatible.

### All 10 Routes Fixed

| Route                                           | Schedule     | Handler Function          |
| ----------------------------------------------- | ------------ | ------------------------- |
| `app/api/gmail/sync/route.ts`                   | every 5 min  | `handleGmailSync`         |
| `app/api/scheduled/integrations/pull/route.ts`  | every 5 min  | `handleIntegrationsPull`  |
| `app/api/scheduled/wix-process/route.ts`        | every 5 min  | `handleWixProcess`        |
| `app/api/scheduled/automations/route.ts`        | every 15 min | `handleAutomations`       |
| `app/api/scheduled/copilot/route.ts`            | every 15 min | `handleCopilot`           |
| `app/api/scheduled/revenue-goals/route.ts`      | every 6 hr   | `handleRevenueGoals`      |
| `app/api/scheduled/follow-ups/route.ts`         | every 6 hr   | `handleFollowUps`         |
| `app/api/scheduled/reviews-sync/route.ts`       | every 6 hr   | `handleReviewsSync`       |
| `app/api/scheduled/integrations/retry/route.ts` | every 1 hr   | `handleIntegrationsRetry` |
| `app/api/scheduled/lifecycle/route.ts`          | daily 3am    | `handleLifecycle`         |

**Not changed** (not in `vercel.json` crons):

- `app/api/scheduled/activity-cleanup/route.ts`

---

## What's Already Working (No Changes Required)

| Feature                           | File                                                                          | Status     |
| --------------------------------- | ----------------------------------------------------------------------------- | ---------- |
| OAuth Connect/Disconnect          | `components/settings/connected-accounts.tsx` → `lib/gmail/google-auth.ts`     | ✅ Working |
| Token auto-refresh (5-min buffer) | `lib/gmail/google-auth.ts:getGoogleAccessToken()`                             | ✅ Working |
| Manual "Sync Now" button          | `lib/gmail/actions.ts:triggerGmailSync()` (server action, bypasses API route) | ✅ Working |
| Email classification AI           | `lib/gmail/classify.ts` → Gemini                                              | ✅ Working |
| Inquiry auto-creation             | `lib/gmail/sync.ts:handleInquiry()`                                           | ✅ Working |
| Thread linking on reply           | `lib/gmail/sync.ts:handleExistingThread()`                                    | ✅ Working |
| AI draft generation               | `lib/ai/correspondence.ts:draftResponseForInquiry()`                          | ✅ Working |
| Response composer UI              | `components/inquiries/inquiry-response-composer.tsx`                          | ✅ Working |
| Approve & send via Gmail API      | `lib/gmail/actions.ts:approveAndSendMessage()`                                | ✅ Working |
| Email threading (RFC 2822)        | `lib/gmail/client.ts:sendEmail()` with In-Reply-To/References                 | ✅ Working |
| Settings page integration         | `app/(chef)/settings/page.tsx` → `ConnectedAccounts`                          | ✅ Working |
| Deduplication                     | `gmail_sync_log` table + unique indexes on `messages`                         | ✅ Working |

---

## How the Gmail Agent Works (Full Flow)

### 1. Chef Connects Gmail (one-time setup)

1. Chef goes to **Settings → Connected Accounts & Integrations → Connect Gmail**
2. `initiateGoogleConnect(['gmail.readonly', 'gmail.send'])` generates a CSRF token (stored in httpOnly cookie) and builds the Google OAuth URL
3. Chef approves on Google → callback at `/api/auth/google/connect/callback`
4. Callback: validates CSRF, exchanges code for tokens, upserts `google_connections` table
5. Chef is redirected to `/settings?connected=gmail`

### 2. Auto-Sync (every 5 minutes via Vercel Cron)

1. Vercel sends `GET /api/gmail/sync` with `Authorization: Bearer <CRON_SECRET>`
2. Route fetches all chefs with `gmail_connected = true` from `google_connections`
3. For each chef: `syncGmailInbox(chefId, tenantId)` runs
4. Sync fetches new messages via Gmail History API (incremental) or falls back to last 50
5. Each message is classified by Gemini AI: `inquiry | existing_thread | personal | spam | marketing`
6. `inquiry` → auto-creates client + inquiry record + logs message + notifies chef
7. `existing_thread` → logs message, links to inquiry by `gmail_thread_id`, auto-advances inquiry status
8. `personal/spam/marketing` → logged in `gmail_sync_log`, no action

### 3. Chef Reviews & Responds (inquiry detail page)

1. Chef opens **Inquiries → [inquiry]**
2. `InquiryResponseComposer` renders at the bottom of the page
3. Chef clicks **Generate Draft** → `draftResponseForInquiry()` pulls all context (inquiry facts, client history, conversation depth, calendar availability) and generates a lifecycle-aware draft via Gemini
4. Draft shows with confidence badge, flags, and missing-data warnings
5. Chef edits subject/body directly in the UI
6. Chef clicks **Approve & Send** → `approveAndSendMessage()` sends via Gmail API
7. Message is sent in the correct Gmail thread (RFC 2822 threading preserved)
8. Inquiry status auto-advances to `awaiting_client`; 48h follow-up timer is set

### 4. Client Replies

1. Next auto-sync picks up the reply
2. Reply is classified as `existing_thread` (sender is a known client)
3. Reply is linked to the inquiry via `gmail_thread_id`
4. Inquiry auto-advances from `awaiting_client` → `awaiting_chef`
5. Chef gets notified "Client replied"

---

## Environment Variable Checklist

Before Gmail will work in production, confirm these are set in the Vercel environment:

| Variable               | Required For                         | Notes                                                        |
| ---------------------- | ------------------------------------ | ------------------------------------------------------------ |
| `GOOGLE_CLIENT_ID`     | Gmail OAuth                          | From Google Cloud Console → Credentials                      |
| `GOOGLE_CLIENT_SECRET` | Gmail OAuth                          | Same project                                                 |
| `CRON_SECRET`          | All 9 cron jobs                      | Any strong random string; `openssl rand -hex 32`             |
| `NEXT_PUBLIC_SITE_URL` | OAuth redirect URI                   | Must match exactly what's registered in Google Cloud Console |
| `GEMINI_API_KEY`       | AI classification + draft generation | From ai.google.dev                                           |

### Google Cloud Console Setup Checklist

1. Create a project at [console.cloud.google.com](https://console.cloud.google.com)
2. Enable **Gmail API** (APIs & Services → Library → search "Gmail API")
3. Go to **APIs & Services → Credentials → OAuth 2.0 Client IDs**
4. Add these Authorized redirect URIs:
   - `http://localhost:3100/api/auth/google/connect/callback` (development)
   - `https://cheflowhq.com/api/auth/google/connect/callback` (production)
5. Set the OAuth consent screen scopes:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.send`

---

## How to Verify the Cron Fix

### Local Test (before deploy)

```bash
# Replace with your actual CRON_SECRET value
curl -X GET http://localhost:3100/api/gmail/sync \
  -H "Authorization: Bearer your-cron-secret-here"

# Expected: 200 OK with { synced: N, failed: 0, results: [...] }
# Before fix: 405 Method Not Allowed
```

### After Deploy to Vercel

1. Go to **Vercel Dashboard → your project → Deployments → Functions → Cron Jobs**
2. Each cron job should show status `200` in execution history
3. Previously all would have been `405` (silent failure)
4. Check the function logs for `[Gmail Cron]` log lines

### Database Check

After 5 minutes post-deploy (or trigger manually from Vercel dashboard):

```sql
SELECT gmail_message_id, from_address, classification, action_taken, synced_at
FROM gmail_sync_log
ORDER BY synced_at DESC
LIMIT 10;
```

New entries with recent `synced_at` timestamps should appear without manually clicking "Sync Now."

### End-to-End Test

1. Send a test email to the connected Gmail address with subject like "Hi, I'd love to book a private dinner for 8 guests on March 15th"
2. Wait up to 5 minutes (next cron cycle)
3. Check `/inquiries` — a new inquiry should appear automatically
4. Open the inquiry → click "Generate Draft" → verify AI draft is contextual
5. Edit draft → click "Approve & Send" → verify email appears in Gmail Sent folder
6. Reply to the sent email from the client's email
7. Wait up to 5 minutes → check the inquiry — status should auto-advance to `awaiting_chef`

---

## Architecture Notes

- **Manual "Sync Now"** calls `triggerGmailSync()` server action in `lib/gmail/actions.ts`, which directly calls `syncGmailInbox()`. It does **not** go through the API route and is unaffected by this fix.
- **Token refresh** is automatic with a 5-minute buffer. If the refresh token is revoked by Google, `gmail_connected` is set to `false` and the chef must reconnect in Settings.
- **AI Policy compliance:** All AI output is draft-only. The chef must explicitly click "Approve & Send" — no autonomous sending ever occurs.
- **Deduplication** happens at three layers: Gmail history ID watermark, `gmail_sync_log` unique index on `(tenant_id, gmail_message_id)`, and `messages` unique index on `(tenant_id, gmail_message_id)`.
- **Tenant isolation:** Every query in the sync engine is scoped to `tenant_id`. RLS policies enforce this at the database layer as well.
