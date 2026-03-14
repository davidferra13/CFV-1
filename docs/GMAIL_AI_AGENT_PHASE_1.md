# Gmail AI Agent — Phase 1 Implementation

## What Changed

Added the Gmail AI Agent foundation: ChefFlow can now connect to a chef's Gmail account, fetch incoming emails, classify them with Gemini AI, and automatically create inquiry records from detected dinner booking requests.

## Architecture

### Processing Pipeline

```
Chef clicks "Sync Now" in Settings
  → triggerGmailSync() server action
  → getGoogleAccessToken() (auto-refreshes if expired)
  → Gmail API: list messages since last sync (incremental via historyId)
  → For each email:
      → Dedup check (gmail_sync_log)
      → Gemini AI classifies: inquiry | existing_thread | personal | spam | marketing
      → INQUIRY: parseInquiryFromText() → createInquiry(channel: 'email') + log message
      → EXISTING_THREAD: find client by email → log message
      → PERSONAL/SPAM/MARKETING: log in sync_log only (skip)
  → Update historyId + last_sync_at
  → Return results to UI
```

### Two Separate Google OAuth Flows

1. **Supabase Google Sign-In** (`/auth/callback`) — authenticates users into ChefFlow
2. **Google Workspace Connect** (`/api/auth/google/connect/callback`) — grants API access to Gmail/Calendar

These are independent. A chef can sign in with email+password and still connect their Gmail for the agent.

### Token Refresh

Google access tokens expire in 1 hour. `getGoogleAccessToken()` transparently refreshes using the stored refresh token, with a 5-minute buffer. If the refresh token is revoked (user disconnected from Google side), the connection is marked as disconnected and the chef is prompted to reconnect.

### Deduplication (3 layers)

1. **History ID high-water mark** — only fetches new messages since last sync
2. **gmail_sync_log unique index** — `(tenant_id, gmail_message_id)` prevents re-processing
3. **messages table unique index** — `(tenant_id, gmail_message_id)` prevents duplicate records

### Error Isolation

Each message is processed independently with try/catch. One failed email does not block others. Errors are logged per-message in `gmail_sync_log.error`.

## Files Created

| File                                                 | Purpose                                                      |
| ---------------------------------------------------- | ------------------------------------------------------------ |
| `supabase/migrations/20260218000001_gmail_agent.sql` | google_connections + gmail_sync_log tables, messages columns |
| `lib/gmail/types.ts`                                 | TypeScript interfaces                                        |
| `lib/gmail/google-auth.ts`                           | OAuth connect, token refresh, disconnect                     |
| `lib/gmail/client.ts`                                | Gmail API wrapper (list, get, parse MIME)                    |
| `lib/gmail/classify.ts`                              | Gemini email classification                                  |
| `lib/gmail/sync.ts`                                  | Core sync engine                                             |
| `lib/gmail/actions.ts`                               | Server actions for UI                                        |
| `app/api/auth/google/connect/callback/route.ts`      | OAuth callback handler                                       |
| `app/api/gmail/sync/route.ts`                        | Cron-compatible sync endpoint                                |
| `components/settings/connected-accounts.tsx`         | Gmail connection UI                                          |

## Files Modified

| File                           | Change                                   |
| ------------------------------ | ---------------------------------------- |
| `app/(chef)/settings/page.tsx` | Added Connected Accounts section         |
| `middleware.ts`                | Allow `/api/auth` and `/api/gmail` paths |
| `.env.local.example`           | Added `CRON_SECRET` variable             |
| `package.json`                 | Added `googleapis` dependency            |

## Existing Code Reused

- `lib/ai/parse.ts` → `parseWithAI()` for email classification
- `lib/ai/parse-inquiry.ts` → `parseInquiryFromText()` for inquiry extraction
- `lib/supabase/server.ts` → `createServerClient({ admin: true })` for session-free DB access
- `lib/auth/get-user.ts` → `requireChef()` for server action auth

## Database Changes

### New: `google_connections`

One row per chef. Stores OAuth tokens, service flags (gmail/calendar), sync state (history_id, last_sync_at, error count).

### New: `gmail_sync_log`

Audit trail for every email processed. Records classification, confidence, action taken, and links to created inquiry/message records.

### Altered: `messages`

Added `gmail_message_id` and `gmail_thread_id` columns with a unique dedup index.

## Setup Prerequisites

1. **Google Cloud Console**: Enable Gmail API in the same project as the OAuth client
2. **OAuth Consent Screen**: Add `gmail.readonly` scope
3. **`.env.local`**: Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
4. **Push migration**: `npx supabase db push --linked`
5. **Regenerate types**: `npx supabase gen types --lang=typescript --project-id luefkpakzvxcsqroxyhz > types/database.ts`

## Phase 2 (Future)

- Draft responses via ACE engine (already exists in `lib/ai/correspondence.ts`)
- Chef approval workflow for outbound emails
- Send approved responses through Gmail API (`gmail.send` scope)
- Follow-up timers on new inquiries
- Real-time Gmail push notifications (Google Pub/Sub) instead of polling
- Automated cron with Vercel Cron Jobs
