# Remy Communication Awareness — Session Doc

**Date:** 2026-02-22
**Branch:** `feature/risk-gap-closure`

---

## What Changed

Remy can now **see, search, and act on every email** in the chef's inbox. Previously, Gmail sync captured and classified emails (Phase 1), but Remy's AI assistant had no access to email content — the two systems were disconnected. This session bridges that gap and adds SMS ingestion as a second communication channel.

### Architecture: Channel-Agnostic Communication Layer

```
Gmail API ──→ gmail sync ──→ gmail_sync_log (body_preview, snippet)
                                   ↓
Twilio SMS ──→ /api/comms/sms ──→ messages table
                                   ↓
                            Remy Context (email digest)
                                   ↓
                         Remy Commands (search, read, reply)
```

All channels feed the same Remy context and command system. Adding Instagram, phone calls, or other channels later requires only:

1. An ingestion endpoint (like `/api/comms/sms/route.ts`)
2. Storing in `messages` table with the appropriate `channel`
3. Remy automatically sees it via the existing context loader

---

## Files Created

| File                                                          | Purpose                                                                                                                                             |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `supabase/migrations/20260322000048_remy_email_awareness.sql` | Adds `body_preview`, `snippet`, `to_address`, `received_at` columns to `gmail_sync_log`                                                             |
| `lib/ai/remy-email-actions.ts`                                | 5 server actions: `getRecentEmails`, `searchEmails`, `getEmailThread`, `summarizeInbox`, `draftEmailReply`, plus `loadEmailDigest` for Remy context |
| `lib/sms/ingest.ts`                                           | Inbound SMS processing — classify with Ollama, match to client, create inquiry if needed                                                            |
| `app/api/comms/sms/route.ts`                                  | Webhook endpoint for Twilio inbound SMS + JSON API for manual forward                                                                               |

## Files Modified

| File                                  | Change                                                                                       |
| ------------------------------------- | -------------------------------------------------------------------------------------------- |
| `lib/gmail/sync.ts`                   | `logSyncEntry()` now stores `body_preview`, `snippet`, `to_address`, `received_at`           |
| `lib/gmail/historical-scan.ts`        | `logScanEntry()` now stores `body_preview`, `snippet`, `received_at`; type signature updated |
| `lib/ai/command-orchestrator.ts`      | Added 5 email executors + registered in `supportedTaskTypes` + switch cases + import         |
| `lib/ai/command-task-descriptions.ts` | 5 new `TaskDescription` entries for email commands                                           |
| `lib/ai/remy-context.ts`              | Loads `emailDigest` from `loadEmailDigest()` as Tier 2b context                              |
| `lib/ai/remy-types.ts`                | Added `emailDigest` to `RemyContext` interface                                               |
| `lib/ai/remy-actions.ts`              | Email digest section added to `buildRemySystemPrompt()`                                      |

---

## New Remy Commands

| Command               | Tier      | What it does                                                     |
| --------------------- | --------- | ---------------------------------------------------------------- |
| `email.recent`        | 1 (auto)  | Show recent emails with sender, subject, classification          |
| `email.search`        | 1 (auto)  | Search emails by sender, subject, or body content                |
| `email.thread`        | 1 (auto)  | Show full email conversation thread                              |
| `email.inbox_summary` | 1 (auto)  | Inbox overview: counts by category, last sync time               |
| `email.draft_reply`   | 2 (draft) | Draft a reply with thread context — chef approves before sending |

### Example Prompts

- "What emails came in today?" → `email.recent`
- "What did Sarah say?" → `email.search` with query "Sarah"
- "Summarize my inbox" → `email.inbox_summary`
- "Draft a reply to that inquiry email" → `email.draft_reply`

---

## SMS Pipeline

### Twilio Webhook

Configure Twilio to POST to `https://app.cheflowhq.com/api/comms/sms` when SMS arrives at the business number.

### Manual Forward (JSON API)

```bash
POST /api/comms/sms
Authorization: Bearer $CRON_SECRET
Content-Type: application/json

{
  "from": "+15551234567",
  "body": "Hi, I'd love to book a private dinner for 8 on March 15th",
  "timestamp": "2026-02-22T10:30:00Z"
}
```

### Processing Flow

1. Match sender phone to known client (fuzzy match on last 10 digits)
2. Classify with Ollama (reuses email classifier)
3. If inquiry → auto-create inquiry + notify chef
4. If existing client → auto-advance any `awaiting_client` inquiry
5. Always stores in `messages` table with `channel: 'sms'`

---

## Privacy

- **All email body content** processed via `parseWithOllama()` — never leaves local machine
- **Email bodies stored** in `gmail_sync_log.body_preview` (first 2000 chars) — encrypted at rest by Supabase
- **SMS classification** uses same local Ollama pipeline
- **Draft replies** generated locally, never auto-sent
- **RLS enforced** on all tables — chefs can only see their own data

---

## Database Migration

Migration `20260322000048_remy_email_awareness.sql` adds:

- `body_preview text` — first 2000 chars of email body
- `snippet text` — first 200 chars for list display
- `to_address text` — recipient email
- `received_at timestamptz` — email received timestamp
- Index on `(tenant_id, received_at DESC)` for efficient recent email queries

**Additive only** — no drops, no renames, no data loss.

---

## Future: Additional Channels

The architecture supports adding more channels with minimal code:

| Channel                   | How to Add                                                                                                                                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Instagram DMs**         | Instagram Business API webhook → `/api/comms/instagram` → `messages` table                                                                                                                              |
| **Phone calls**           | Twilio Voice webhook with transcription → `/api/comms/voice` → `messages` table                                                                                                                         |
| **Website chat**          | Already exists (`lib/chat/`) — could feed into Remy context                                                                                                                                             |
| **Business history scan** | Historical scan already crawls Gmail. Body previews now stored. Could add Ollama summarization pass to extract business intelligence (seasonal patterns, pricing history, client relationship timeline) |

---

## Env Vars Required

```bash
# Gmail (already configured)
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...

# Twilio (for SMS)
TWILIO_ACCOUNT_SID=ACxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxx
TWILIO_FROM_NUMBER=+1xxxxxxxxxx

# Cron / webhook auth
CRON_SECRET=your-random-secret
```
