# Wix Integration — Phase 1 Reflection

## What Changed

Added a direct pipeline from Wix form submissions into ChefFlow's inquiry system. When someone fills out a form on the chef's Wix marketing site, it now creates an inquiry in ChefFlow automatically — no manual re-entry needed.

## Why

The chef's Wix site is the public marketing front door. Dinner inquiries come in as Wix form submissions, which previously only flowed to Gmail. While the existing Gmail sync captures some of these (via Gemini AI classification), it's:
- **Delayed** — Gmail sync is polling-based (manual or cron), not real-time
- **Unreliable** — AI classification occasionally misses Wix form emails
- **Unlabeled** — Captured inquiries show as channel `email`, not `wix`

The direct webhook gives real-time delivery, reliable structured capture, and proper source labeling.

## Architecture

### Accept Fast, Process Async

The design uses a **staging table pattern** (same as `gmail_sync_log`):

1. **Webhook endpoint** (`/api/webhooks/wix`) accepts the POST, stores the raw payload in `wix_submissions`, and returns 200 within Wix's 1250ms deadline
2. **Async processor** (`lib/wix/process.ts`) handles the heavy work: field extraction, AI parsing, client matching, inquiry creation, and chef notification
3. **Cron backup** (`/api/scheduled/wix-process`) picks up any submissions that weren't processed inline

This separation is necessary because Wix drops webhook deliveries if the response takes longer than 1250ms. AI parsing + client creation + inquiry creation cannot reliably complete in that window.

### Dedup Strategy

Since Wix form submissions also arrive as notification emails in Gmail, both pipelines can capture the same lead. The dedup logic:
- **Wix processor** checks `gmail_sync_log` for matching email within a 10-minute window
- **Gmail sync** should check `wix_submissions` (future enhancement) for matching email
- First to process wins; second marks as `duplicate` with a cross-reference

### Authentication

Each chef gets a unique webhook secret (32-byte random hex). The secret is passed as a query parameter in the webhook URL: `/api/webhooks/wix?secret=<hex>`. The endpoint looks up `wix_connections` by secret to identify the tenant. No Wix OAuth needed — this uses Wix Automations' "Send HTTP Request" action.

## Files Created

| File | Purpose |
|---|---|
| `supabase/migrations/20260221000015_wix_integration.sql` | Schema: `wix_connections`, `wix_submissions` tables + RLS |
| `lib/wix/types.ts` | TypeScript type definitions |
| `lib/wix/process.ts` | Core processing pipeline (extract, dedup, parse, create) |
| `lib/wix/actions.ts` | Server actions (setup, disconnect, list, retry) |
| `app/api/webhooks/wix/route.ts` | Webhook endpoint (accepts Wix POST) |
| `app/api/scheduled/wix-process/route.ts` | Cron endpoint (processes pending) |
| `components/wix/wix-connection.tsx` | Settings UI (connection management) |

## Files Modified

| File | Change |
|---|---|
| `lib/notifications/types.ts` | Added `wix_submission` notification action |
| `app/(chef)/settings/page.tsx` | Integrated Wix connection card alongside Gmail |

## How It Connects

```
Wix Marketing Site
  └─ Form submitted
      └─ Wix Automation: POST → /api/webhooks/wix?secret=<hex>
          └─ Raw payload stored in wix_submissions (status: pending)
              └─ Async processor:
                  ├─ Extract contact info (name, email, phone)
                  ├─ Dedup check vs gmail_sync_log
                  ├─ parseInquiryFromText() → structured inquiry data
                  ├─ createClientFromLead() → find/create client
                  ├─ Insert inquiry (channel: 'wix')
                  ├─ Insert CRM message (logged)
                  └─ createNotification() → chef alerted
```

## Setup for the Chef

1. Go to Settings → Connected Accounts → Wix Integration
2. Click "Connect Wix" (generates webhook URL + secret)
3. Copy the webhook URL
4. In Wix Dashboard → Automations → New Automation:
   - Trigger: "Form is submitted"
   - Action: "Send an HTTP request" → POST → paste URL
   - Body: "Send entire trigger payload"
5. Save and activate

## Deployment Steps

1. **Back up the database** before migration
2. Apply migration: `supabase db push --linked`
3. Regenerate types: `supabase gen types typescript --linked > types/database.ts`
4. Add to Vercel Cron (optional — only needed if inline processing fails):
   ```json
   { "path": "/api/scheduled/wix-process", "schedule": "*/5 * * * *" }
   ```
5. No new environment variables needed (uses existing `CRON_SECRET` and `NEXT_PUBLIC_SITE_URL`)

## Future Enhancements

- **Phase 2**: Unified Inbox aggregating Wix + Chat + CRM messages + notifications
- **Phase 3**: Automations engine (rule-based triggers on submission events)
- **Phase 4**: Activity dashboard (real-time client engagement tracking)
- **Gmail dedup**: Add reverse check in Gmail sync to detect Wix-originated emails
- **Form field mapping**: Chef-configurable mapping UI (currently uses smart extraction)
