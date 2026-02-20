# Email Historical Scan System

## What Changed and Why

ChefFlow's Gmail sync previously started from the **last 50 emails** on first connect, then tracked new emails incrementally via Gmail's History API. This meant any chef who already had years of email conversations — booking inquiries, client exchanges — would never have that history surfaced.

The **Historical Email Scan** system fixes this. It's an opt-in background feature that crawls a chef's full Gmail history, classifies each email using the existing AI pipeline, and stages potential missed inquiries in a review queue. The chef decides what to import — nothing is auto-created.

---

## User Flow

1. Chef goes to **Settings → Connected Accounts & Integrations**
2. Under the Gmail section, a new **Historical Email Scan** toggle appears (only when Gmail is connected)
3. Chef enables the toggle → scan starts in the background
4. Every 15 minutes, the cron job processes another 100 emails from that chef's mailbox
5. As findings accumulate, a **"Review Findings →"** link appears in the settings section
6. Chef goes to `/inbox/history-scan` → sees pending findings grouped by classification and confidence
7. For each finding: **Import as Inquiry** (creates inquiry + client record) or **Dismiss**
8. Batch dismiss available for bulk cleanup

---

## Architecture

### Database Changes (`20260302000003_email_history_scan.sql`)

**New columns on `google_connections`:**
| Column | Type | Purpose |
|---|---|---|
| `historical_scan_enabled` | `BOOLEAN DEFAULT false` | Opt-in flag |
| `historical_scan_status` | `TEXT DEFAULT 'idle'` | `idle \| in_progress \| completed \| paused` |
| `historical_scan_page_token` | `TEXT` | Gmail pagination cursor (resume point) |
| `historical_scan_total_processed` | `INTEGER DEFAULT 0` | Running total of emails processed |
| `historical_scan_lookback_days` | `INTEGER DEFAULT 730` | How far back to scan (2 years default) |
| `historical_scan_started_at` | `TIMESTAMPTZ` | When scan first started |
| `historical_scan_completed_at` | `TIMESTAMPTZ` | When scan finished |
| `historical_scan_last_run_at` | `TIMESTAMPTZ` | Last cron batch timestamp |

**New table `gmail_historical_findings`:**
- One row per email that classified as `inquiry` or `existing_thread` at `high` or `medium` confidence
- Unique on `(tenant_id, gmail_message_id)` — same dedup guarantee as `gmail_sync_log`
- Status lifecycle: `pending → imported | dismissed`
- Full RLS: chefs see only their own findings; service role for cron

### Scan Engine (`lib/gmail/historical-scan.ts`)

- **`runHistoricalScanBatch(chefId, tenantId)`** — processes one batch of 100 emails
- Reads `historical_scan_page_token` from `google_connections` to resume exactly where it left off
- Date-bounded search: `after:YYYY/MM/DD` query limits to `lookback_days`
- Dedup: checks `gmail_sync_log` first — emails already processed by live sync are skipped automatically
- Skips outbound (emails sent from the chef's own address)
- Calls existing `classifyEmail()` for each email
- Only saves `inquiry` + `existing_thread` at `high` or `medium` confidence to `gmail_historical_findings`
- Records all processed messages in `gmail_sync_log` with `action_taken = 'historical_scan'`
- Persists pagination token + progress after each batch
- Sets `status = 'completed'` when no `nextPageToken` is returned

### New Gmail Client Function (`lib/gmail/client.ts`)

Added `listMessagesPage(accessToken, { pageToken?, query?, maxResults? })` — a paginated version of the existing `listRecentMessages`. Returns `{ messages, nextPageToken }` so the engine can persist the token between cron runs.

### Server Actions (`lib/gmail/historical-scan-actions.ts`)

| Action | Purpose |
|---|---|
| `enableHistoricalEmailScan()` | Sets `enabled=true, status='idle'` |
| `disableHistoricalEmailScan()` | Sets `enabled=false, status='paused'` — preserves progress |
| `getHistoricalScanStatus()` | Returns scan state for settings display |
| `getHistoricalFindings(filter, limit)` | Fetches findings by status |
| `importHistoricalFinding(findingId)` | Parses email → creates client + inquiry → marks `imported` |
| `dismissHistoricalFinding(findingId)` | Marks single finding as `dismissed` |
| `dismissAllFindings(filter)` | Batch dismiss with optional confidence/classification filter |

### Cron Job (`app/api/scheduled/email-history-scan/route.ts`)

- Runs every 15 minutes (added to `vercel.json`)
- Finds up to 5 chefs with `historical_scan_enabled=true`, `gmail_connected=true`, and `status NOT IN ('completed','paused')`
- Calls `runHistoricalScanBatch()` for each
- Returns summary: chefs processed, emails scanned, findings added

### Settings UI (`components/gmail/historical-scan-section.tsx`)

- Rendered inside the Gmail block in Settings
- Invisible when Gmail is not connected
- Shows toggle + live status text + link to review page
- Uses `useTransition` + optimistic update (same pattern as `DiscoverabilityToggle`)

### Review UI

- **Page:** `app/(chef)/inbox/history-scan/page.tsx`
- **Component:** `components/gmail/historical-findings-list.tsx`
- Three tabs: Pending | Imported | Dismissed
- Per-finding card: sender, subject, date, body preview, classification badge, confidence badge
- Actions: Import as Inquiry, Dismiss, Open in Gmail (external link)
- Batch dismiss with confirmation

---

## How Opt-In / Opt-Out Works

| Action | Result |
|---|---|
| Toggle ON | `enabled=true, status='idle'` → cron picks it up within 15 min |
| Toggle OFF | `enabled=false, status='paused'` → cron skips chef; progress preserved |
| Gmail disconnected | Cron skips because `gmail_connected=false`; scan effectively paused |
| Toggle ON after pause | Resumes from saved `historical_scan_page_token` — does not restart |
| Scan completes | `status='completed'` — cron skips permanently; all findings available to review |

---

## Import Flow

When a chef clicks **Import as Inquiry** on a finding:
1. The finding's `body_preview` (first 500 chars) is parsed by `parseInquiryFromText()` (existing)
2. Sender email/name extracted from `from_address` field
3. `createClientFromLead()` finds or creates the client record (existing)
4. A full `inquiries` row is inserted with all parsed structured data
5. Original email logged as a `messages` row on the inquiry
6. Finding marked `imported` with `imported_inquiry_id` set
7. `revalidatePath('/inquiries')` and `revalidatePath('/inbox/history-scan')` ensure UI refreshes

---

## Connections to Existing Systems

- **`gmail_sync_log`**: The dedup constraint `UNIQUE (tenant_id, gmail_message_id)` is reused — any email the live sync already processed is skipped at zero cost
- **`classifyEmail()`**: Reused as-is from `lib/gmail/classify.ts`
- **`parseInquiryFromText()`**: Reused for the import action, same as live inquiry creation
- **`createClientFromLead()`**: Reused for client find-or-create on import
- **Settings page structure**: Follows the existing `DiscoverabilityToggle` opt-in pattern with `useTransition`

---

## Security

- All server actions call `requireChef()` first
- Every query filters by `tenant_id` matching the authenticated chef
- RLS on `gmail_historical_findings` enforces the same
- Service role used only in the cron path (no user session available in cron context)
- `gmail_sync_log` inserts in the scan engine use `admin` client to match live sync behavior
