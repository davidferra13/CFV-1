# Phase 1: Email Platform Parsers — Implementation Report

**Date:** 2026-02-28
**Branch:** `feature/risk-gap-closure`

## Overview

Six new Gmail email parsers that auto-detect and extract structured inquiry data from marketplace platform notification emails. These parsers bypass Ollama entirely — platform emails have consistent formatting that regex handles perfectly. Zero new infrastructure needed — the Gmail sync pipeline already fetches these emails.

## How It Works

1. Chef connects Gmail (existing flow)
2. Gmail sync fetches emails — including platform notifications that may be auto-archived
3. `sync.ts` checks sender domain against `PLATFORM_DOMAINS` → runs a second targeted query for platform senders
4. `processMessage()` checks `is*Email()` for each platform before Ollama classification
5. Platform match → dedicated parser extracts structured fields (name, date, guests, budget, location)
6. Generic handler creates inquiry, client record, notifications, activity log
7. Dedup prevents the same inquiry from being created twice

## Platforms Added

| Platform                   | Parser File                           | Sender Domains                                                      | Email Types                                                                                                                    |
| -------------------------- | ------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Thumbtack**              | `lib/gmail/thumbtack-parser.ts`       | `thumbtack.com`                                                     | `tt_new_lead`, `tt_client_message`, `tt_booking_confirmed`, `tt_payment`, `tt_administrative`                                  |
| **The Knot / WeddingWire** | `lib/gmail/theknot-parser.ts`         | `theknot.com`, `weddingwire.com`, `weddingpro.com`, `theknotww.com` | `knot_new_inquiry`, `knot_client_message`, `knot_booking_confirmed`, `knot_administrative`                                     |
| **Bark**                   | `lib/gmail/bark-parser.ts`            | `bark.com`                                                          | `bark_new_lead`, `bark_client_message`, `bark_lead_update`, `bark_administrative`                                              |
| **Cozymeal**               | `lib/gmail/cozymeal-parser.ts`        | `cozymeal.com`                                                      | `cozymeal_new_booking`, `cozymeal_booking_confirmed`, `cozymeal_client_message`, `cozymeal_payment`, `cozymeal_administrative` |
| **GigSalad**               | `lib/gmail/gigsalad-parser.ts`        | `gigsalad.com`                                                      | `gs_new_lead`, `gs_client_message`, `gs_booking_confirmed`, `gs_quote_requested`, `gs_administrative`                          |
| **Google Business**        | `lib/gmail/google-business-parser.ts` | `google.com` (conservative — only known GBP senders)                | `gbp_new_message`, `gbp_new_review`, `gbp_booking`, `gbp_administrative`                                                       |

## Architecture

### Generic Platform Handler

Rather than writing 200+ lines per platform (like TakeAChef/Yhangry), the 6 new parsers share a **generic handler** in `sync.ts`:

- `handleGenericPlatformEmail()` — routes by email type suffix
- `handleGenericNewLead()` — creates client + inquiry + notifications
- `handleGenericClientMessage()` — finds existing inquiry, advances status
- `handleGenericBookingConfirmed()` — confirms inquiry, notifies chef
- `extractLeadFields()` — normalizes field names across parsers

This means adding a new platform parser in the future requires only:

1. Create the parser file (copy any existing one)
2. Add one `if` block in `processMessage()`
3. Add the domain to `PLATFORM_DOMAINS`
4. Add DB enum value in a migration

### Classify Short-Circuit

`classify.ts` has a `detectPlatformEmail()` function that checks all 8 platforms (2 existing + 6 new) before calling Ollama. Platform emails never hit the LLM.

### Communication Pipeline Integration

All platform emails are ingested into the unified communication pipeline (`ingestCommunicationEvent()`) for the inbox, in addition to creating inquiries.

## Files Changed

### New Files

- `lib/gmail/thumbtack-parser.ts` — Thumbtack parser
- `lib/gmail/theknot-parser.ts` — The Knot / WeddingWire parser
- `lib/gmail/bark-parser.ts` — Bark parser
- `lib/gmail/cozymeal-parser.ts` — Cozymeal parser
- `lib/gmail/gigsalad-parser.ts` — GigSalad parser
- `lib/gmail/google-business-parser.ts` — Google Business Profile parser
- `supabase/migrations/20260329000004_inquiry_channel_marketplace_platforms.sql` — adds 6 enum values

### Modified Files

- `lib/gmail/sync.ts` — imports, PLATFORM_DOMAINS, fast-path routing, generic handler
- `lib/gmail/classify.ts` — short-circuit for all 8 platforms
- `lib/communication/types.ts` — expanded CommunicationSource union type
- `components/inquiries/inquiry-form.tsx` — added 6 new channel options

### Already Complete (no changes needed)

- `lib/communication/channel-meta.ts` — already had all 6 new platforms with colors/icons
- `lib/communication/actions.ts` — `mapSourceToInquiryChannel()` already handled all 6

## Migration

**File:** `supabase/migrations/20260329000004_inquiry_channel_marketplace_platforms.sql`

```sql
ALTER TYPE inquiry_channel ADD VALUE IF NOT EXISTS 'thumbtack';
ALTER TYPE inquiry_channel ADD VALUE IF NOT EXISTS 'theknot';
ALTER TYPE inquiry_channel ADD VALUE IF NOT EXISTS 'bark';
ALTER TYPE inquiry_channel ADD VALUE IF NOT EXISTS 'cozymeal';
ALTER TYPE inquiry_channel ADD VALUE IF NOT EXISTS 'google_business';
ALTER TYPE inquiry_channel ADD VALUE IF NOT EXISTS 'gigsalad';
```

Purely additive — no drops, no renames. Must be applied before platform emails can create inquiries.

## Parser Pattern

Each parser follows the same contract:

```typescript
// 1. Sender detection (called from sync.ts fast-path)
export function is{Platform}Email(fromAddress: string): boolean

// 2. Email type detection (subject + body regex)
export function detect{Platform}EmailType(subject: string, body?: string): EmailType

// 3. Full parse (extracts structured fields)
export function parse{Platform}Email(email: ParsedEmail): ParseResult
```

ParseResult always contains:

- `emailType` — what kind of email this is
- `rawSubject` / `rawBody` — original content
- `parseWarnings` — non-fatal extraction issues
- Platform-specific data under `lead`, `inquiry`, `booking`, `message`, `review`, etc.

## Google Business — Special Case

Google Business emails come from `@google.com`, which also sends tons of non-business emails. The parser uses a **two-function approach**:

- `isGoogleBusinessEmail()` — conservative sender-only check (known GBP senders like `noreply@google.com`)
- `isGoogleBusinessEmailWithSubject()` — sender + subject pattern check (used in sync.ts routing)

This prevents false positives from Google security alerts, Google Workspace emails, etc.

## What's Next

- **Apply migration** (`supabase db push --linked`) to add enum values
- **Connect Gmail** on a test account with platform emails to verify parsing
- **Phase 2:** SMS/WhatsApp upgrade + phone call logging
- **Phase 3:** Instagram/Facebook DM ingestion
