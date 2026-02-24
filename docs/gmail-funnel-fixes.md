# Gmail Funnel Fixes — TakeAChef, Yhangry, and Messaging UX

**Date:** 2026-02-23
**Branch:** `feature/risk-gap-closure`

---

## What Changed

### 1. Gmail Sync — Platform Email Broadening

**Problem:** The Gmail sync query `in:inbox -in:sent` missed platform emails (TakeAChef, Yhangry) that Gmail auto-archives via filters or categorization rules. Zero TakeAChef emails were captured on first real sync.

**Fix:** After the main inbox query, a second targeted query runs for known platform domains:

```
from:privatechefmanager.com OR from:takeachef.com OR from:yhangry.com
```

Results are merged (deduplicated by message ID). The existing `gmail_sync_log` dedup at the message level prevents re-processing.

**File:** `lib/gmail/sync.ts`

### 2. Yhangry Platform Integration

**Problem:** Yhangry (yhangry.com) is a UK-based private chef marketplace the developer uses. Emails from Yhangry were being captured by the generic Ollama classifier as "inquiry" — which worked but produced:

- Wrong client name (platform rep "Dikshita" instead of actual client — Yhangry doesn't reveal the client name in the initial email)
- Channel labeled "Email" instead of "Yhangry"
- No structured parsing of location, date, or quote URL

**Fix:** Added a dedicated Yhangry parser (`lib/gmail/yhangry-parser.ts`) with:

- Domain detection: `yhangry.com`
- Email type detection: new inquiry, booking confirmed, client message, administrative
- Regex-based field extraction: location, date, event type, quote URL + ID
- Platform dedup using the generalized dedup module
- Channel set to `'yhangry'` (new enum value via migration)
- `external_platform: 'yhangry'` for proper tracking

**New files:**

- `lib/gmail/yhangry-parser.ts` — parser + detection
- `lib/gmail/platform-dedup.ts` — generalized dedup (replaces TakeAChef-specific version)
- `supabase/migrations/20260322000054_inquiry_channel_yhangry.sql` — adds `yhangry` to `inquiry_channel` enum

### 3. TakeAChef Dedup Fix

**Problem:** The TakeAChef dedup check at `sync.ts:616` never passed the `externalId` (the `ctaLink` extracted by the parser), making the most reliable dedup strategy (external ID match) unreachable.

**Fix:** Now passes `inquiry.ctaLink` as `externalId` to the dedup function.

### 4. Generalized Platform Dedup

**Problem:** The TakeAChef-specific dedup was hardcoded. Adding Yhangry would require duplicating the same logic.

**Fix:** Created `lib/gmail/platform-dedup.ts` with `checkPlatformInquiryDuplicate()` and `findPlatformInquiryByContext()` that accept a `channel` parameter. Both TakeAChef and Yhangry handlers use the same functions.

### 5. Messaging "Needs First Contact" Section

**Problem:** New inquiries didn't appear on the Messaging page (`/chat`). Chefs had no prompt to reach out to new leads. The messaging page was blank until a conversation was manually created.

**Fix:** Added a "Needs First Contact" section at the top of the `/chat` page:

- Queries for inquiries with `status = 'new'` or `'awaiting_chef'` that have no outbound messages and no linked conversation
- Shows an amber banner: "6 leads need your first message"
- Each card shows: client name, channel badge (Email/Yhangry/TakeAChef/Website), date, occasion, location
- "Respond" button links to the inquiry detail page for full context
- Animated ping indicator on each card's avatar for urgency

**New files:**

- `components/chat/needs-first-contact.tsx` — the UI component
- Query: `getInquiriesNeedingFirstContact()` in `lib/inquiries/actions.ts`

### 6. UI Updates

- **Inquiry status badge:** Added `yhangry` channel badge (amber/warning variant)
- **Inquiry form:** Added "Yhangry" to the manual channel dropdown
- **Inquiry list page:** Added "Yhangry" filter button next to "TakeAChef"

---

## Architecture Notes

### Platform Email Detection Order (in sync.ts processMessage)

```
1. gmail_sync_log dedup (skip if already processed)
2. Fetch full message
3. Self-filter (skip chef's own outbound)
4. TakeAChef fast path → dedicated parser
5. Yhangry fast path → dedicated parser
6. Communication triage ingestion (if enabled)
7. Ollama classification → generic inquiry/thread/spam handling
```

### Known Platform Domains (searched outside inbox)

| Platform  | Domains                                   |
| --------- | ----------------------------------------- |
| TakeAChef | `privatechefmanager.com`, `takeachef.com` |
| Yhangry   | `yhangry.com`                             |

To add a new platform in the future:

1. Add domain to `PLATFORM_DOMAINS` array in `sync.ts`
2. Create `{platform}-parser.ts` with detection + parsing functions
3. Add fast path check in `processMessage()`
4. Add handler functions (new inquiry, message, booking confirmed)
5. Add to `inquiry_channel` enum via migration
6. Update UI: status badge, form dropdown, filter buttons

---

## Testing

1. **Gmail sync:** Trigger manual sync from Settings → verify TakeAChef and Yhangry emails appear in `gmail_sync_log`
2. **Yhangry parsing:** Check that new Yhangry inquiries have `channel: 'yhangry'`, correct location/date, and quote URL
3. **Dedup:** Run sync twice → second run should skip all already-processed emails
4. **Messaging page:** Navigate to `/chat` → see "Needs First Contact" cards for all un-responded inquiries
5. **Inquiry filters:** Check that "Yhangry" filter button works on the inquiry list page
