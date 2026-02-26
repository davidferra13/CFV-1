# Gmail Integration Audit

**Date:** 2026-02-19
**Branch:** feature/packing-list-system
**Status:** Gaps fixed — full funnel now operational

---

## Overview

ChefFlow's Gmail integration creates a bidirectional email funnel:

1. Client emails arrive in the chef's Gmail inbox
2. Vercel Cron polls every 5 minutes via the Gmail History API
3. Emails are AI-classified and either create new inquiries or log replies to existing ones
4. Both inbound and outbound messages are ingested into the unified communication inbox
5. Chef can reply from ChefFlow — emails are sent via the Gmail API and stay in the same Gmail thread

---

## Full Flow Diagram

```
Chef connects Gmail (Settings → Connected Accounts → "Connect Gmail")
  └─ OAuth redirects to Google, grants gmail.readonly + gmail.send
  └─ /api/auth/google/connect/callback exchanges code for tokens
  └─ Tokens stored in google_connections table
  └─ gmail_connected = true, gmail_history_id = null (first sync will bootstrap)

Every 5 minutes (Vercel Cron → GET /api/gmail/sync)
  └─ Finds all chefs with gmail_connected = true
  └─ For each chef: calls syncGmailInbox(chefId, tenantId)
      ├─ Gets valid access token (auto-refreshes if expired)
      ├─ If first sync: fetches last 50 inbox messages (in:inbox -in:sent)
      │    + bootstraps gmail_history_id for future incremental syncs
      ├─ If incremental: fetches messages added since last history ID
      │    (if history ID is stale: falls back to last 50 inbox messages)
      └─ For each message:
            ├─ Dedup check (gmail_sync_log)
            ├─ Skip if sender == chef's own email (outbound mail)
            ├─ If COMM_TRIAGE_ENABLED: ingestCommunicationEvent (direction: inbound)
            │    → creates/updates conversation_thread
            │    → creates communication_event
            │    → creates 24-hour follow_up_timer
            │    → generates suggested_links (AI confidence scores)
            └─ AI classification: inquiry / existing_thread / personal / spam / marketing
                  ├─ inquiry → creates inquiry record + client record + notification
                  ├─ existing_thread → logs message + links to inquiry + auto-advances status
                  └─ others → logged as skipped in gmail_sync_log

Chef replies from ChefFlow (Inquiries page → approve draft)
  └─ approveAndSendMessage(messageId)
      ├─ Sends via Gmail API (with proper In-Reply-To threading headers)
      ├─ Updates messages table: draft → sent
      ├─ If COMM_TRIAGE_ENABLED: ingestCommunicationEvent (direction: outbound)
      │    → same conversation_thread as inbound messages (via gmail threadId)
      │    → chef reply now appears in inbox thread alongside client messages
      └─ Advances inquiry status: new/awaiting_chef → awaiting_client

Client replies to chef's Gmail email
  └─ Next cron cycle picks it up
  └─ classified as existing_thread
  └─ inquiry auto-advanced: awaiting_client → awaiting_chef
  └─ Chef notified in-app
```

---

## Required Environment Variables

| Variable               | Purpose                                               | Where to verify                                              |
| ---------------------- | ----------------------------------------------------- | ------------------------------------------------------------ |
| `GOOGLE_CLIENT_ID`     | OAuth app client ID                                   | Vercel → Settings → Environment Variables                    |
| `GOOGLE_CLIENT_SECRET` | OAuth app client secret                               | Vercel → Settings → Environment Variables                    |
| `NEXT_PUBLIC_SITE_URL` | Base URL for OAuth redirect                           | Must match redirect URI in Google Cloud Console              |
| `CRON_SECRET`          | Authenticates Vercel Cron requests                    | Vercel auto-injects as `Authorization: Bearer {CRON_SECRET}` |
| `COMM_TRIAGE_ENABLED`  | Must be `true` to enable communication inbox pipeline | Set to `true` in Vercel env                                  |

**Google Cloud Console redirect URI must be:**

```
https://cheflowhq.com/api/auth/google/connect/callback
```

---

## Diagnosing Issues

### Cron not running

- Vercel Dashboard → Cron Jobs → `/api/gmail/sync`
- If returning 500: `CRON_SECRET` is not set in environment
- If returning 401: `CRON_SECRET` value doesn't match what Vercel is sending

### Gmail disconnects (expired token)

- Symptoms: `gmail_sync_errors` counter rising, `gmail_connected = false`
- Chef sees: Amber banner on `/inbox` saying "Gmail is disconnected"
- Fix: Settings → Connected Accounts → "Connect Gmail" (re-authorizes)
- Root cause: Google revokes tokens after long inactivity or if user revokes access

### Emails not appearing in inbox

- Check `gmail_sync_log` in Supabase for the tenant — see what classifications are happening
- If `COMM_TRIAGE_ENABLED` is not `true`, emails create inquiries/messages records but NOT communication_events, so they won't appear in the unified inbox
- Check the inbox page URL — triage mode is at `/inbox`, thread detail at `/inbox/triage/{threadId}`

### Chef replies not in inbox thread

- After this audit fix (2026-02-19), outbound messages are now ingested into `communication_events`
- If `COMM_TRIAGE_ENABLED` is false, outbound ingestion is also skipped (by design)

---

## Key Files

| File                                            | Purpose                                                                       |
| ----------------------------------------------- | ----------------------------------------------------------------------------- |
| `lib/gmail/sync.ts`                             | Main sync engine — classification, inquiry creation, thread linking           |
| `lib/gmail/google-auth.ts`                      | OAuth initiation, token refresh, connection status, disconnect                |
| `lib/gmail/actions.ts`                          | Server actions — triggerGmailSync, approveAndSendMessage, getGmailSyncHistory |
| `lib/gmail/client.ts`                           | Gmail API wrapper — list messages, fetch message, send email                  |
| `lib/gmail/classify.ts`                         | AI email classification (Gemini/Claude)                                       |
| `lib/communication/pipeline.ts`                 | Communication event ingestion pipeline                                        |
| `lib/communication/actions.ts`                  | Thread management — snooze, link, resolve, star                               |
| `app/api/gmail/sync/route.ts`                   | Cron endpoint — runs for all connected chefs                                  |
| `app/api/auth/google/connect/callback/route.ts` | OAuth callback — exchanges code for tokens                                    |
| `components/settings/connected-accounts.tsx`    | Settings UI — connect, sync, disconnect                                       |
| `app/(chef)/inbox/page.tsx`                     | Inbox page — triage mode or legacy mode                                       |

---

## Changes Made in This Audit (2026-02-19)

1. **Outbound email funnel** (`lib/gmail/actions.ts` — `approveAndSendMessage`): Chef replies sent via Gmail API are now ingested into the communication pipeline as `direction: 'outbound'`. Inbox threads now show both directions.

2. **Inbox revalidation** (`lib/gmail/actions.ts` — `triggerGmailSync`): Added `revalidatePath('/inbox')` and `revalidatePath('/inbox/triage')` so the inbox refreshes after manual sync.

3. **Connection health alert** (`app/(chef)/inbox/page.tsx`): When `gmail_connected = false`, an amber banner appears at the top of the inbox with a link to Settings to reconnect.

4. **First-sync filter** (`lib/gmail/sync.ts`): Initial and history-fallback syncs now use `query: 'in:inbox -in:sent'` to avoid pulling Sent mail and Drafts into the classification pipeline.
