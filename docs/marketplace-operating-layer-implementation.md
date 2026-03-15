# Marketplace Operating Layer: Implementation Summary

**Date:** 2026-03-15
**Branch:** `feature/openclaw-adoption`

## What Changed

This implementation wires the marketplace operating layer (platform_records, platform_snapshots, platform_payouts, platform_action_log) into the live Gmail sync pipeline and the inquiry detail UI. The migration for these 4 tables already existed (`20260331000047_marketplace_operating_layer.sql`). This work connects them to real data flow.

## New Files

| File                                                   | Purpose                                                                                                                                                    |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/gmail/platform-records-writer.ts`                 | Write-through helpers: `ensurePlatformRecord`, `createEmailSnapshot`, `upsertPlatformPayout`, `updatePlatformRecordStatus`, `getPlatformRecordIdByInquiry` |
| `lib/marketplace/platform-record-readers.ts`           | Server actions for reading platform_records, snapshots, payouts, action log, and queue counts                                                              |
| `lib/marketplace/platform-ui-actions.ts`               | Server actions for chef-driven status updates: markResponded, markDeclined, markBooked, markProposalSent, logCustomAction                                  |
| `components/marketplace/marketplace-action-panel.tsx`  | New inquiry detail component: status badges, action buttons, payout info, deep links. Replaces PlatformLinkBanner for platform_records-backed inquiries    |
| `components/marketplace/marketplace-snapshot-card.tsx` | Platform activity timeline showing all snapshots (email captures, page captures)                                                                           |
| `scripts/backfill-platform-records.ts`                 | One-time backfill script to create platform_records from existing marketplace inquiries                                                                    |

## Modified Files

### `lib/gmail/sync.ts`

- Added import for platform-records-writer
- **handleTacNewInquiry**: After inquiry creation, writes platform_record + email snapshot with extracted fields (client name, date, guests, location, occasion, budget, lead score)
- **handleGenericNewLead**: Same write-through for all other platforms (Yhangry, Bark, Thumbtack, etc.)
- **handleTacBookingConfirmed**: Updates platform_record status to 'booked', creates booking snapshot, creates payout record with commission calculation
- **handleGenericBookingConfirmed**: Same for non-TAC platforms
- **handleTacPayment**: Creates/updates platform_payout with actual payment amounts, updates status to 'paid', creates payment snapshot
- **handleTacCustomerInfo**: Creates contact-reveal snapshot, updates status to 'contact_revealed'

All write-throughs are non-blocking (try/catch, logs errors, never throws). The legacy inquiry.external\_\* fields continue to be written in parallel.

### `lib/gmail/platform-dedup.ts`

- Added Layer 0 dedup: checks platform_records table by external_inquiry_id and external_uri_token BEFORE checking legacy inquiry fields
- Both `checkPlatformInquiryDuplicate` and `findPlatformInquiryByContext` now check platform_records first
- Uses unique indexes on (tenant_id, platform, external_inquiry_id) and (tenant_id, platform, external_uri_token) for fast lookups

### `app/(chef)/inquiries/[id]/page.tsx`

- Replaced PlatformLinkBanner import with MarketplaceActionPanel + MarketplaceSnapshotCard + reader imports
- Added platform record data fetching (parallel with other fetches, error-safe)
- Shows MarketplaceActionPanel when platform_record exists, falls back to MarketplaceFallbackBanner for pre-write-through inquiries
- Shows MarketplaceSnapshotCard below the action panel when snapshots exist

## Architecture: Write-Through Pattern

```
Gmail Email → sync.ts handler
  ├── Write to inquiries table (existing, unchanged)
  ├── Write to platform_records (NEW, upsert by inquiry_id)
  ├── Write to platform_snapshots (NEW, append-only)
  └── Write to platform_payouts (NEW, upsert by platform_record_id)
```

Both legacy (inquiry.external\__) and new (platform_records._) are written. Reads are migrating incrementally:

- Inquiry detail page now reads from platform_records when available
- Command center still reads from legacy inquiry fields (next migration step)
- Dedup now checks platform_records first (Layer 0), then falls back to legacy

## Backfill

Run `npx tsx scripts/backfill-platform-records.ts` to create platform_records for existing marketplace inquiries. Use `--dry-run` first.

The backfill script:

- Creates one platform_record per marketplace inquiry
- Creates a backfill snapshot with extracted fields from the inquiry
- Creates a payout record if financial data exists in unknown_fields
- Safe to run multiple times (checks for existing records, skips duplicates)

## UI Component: MarketplaceActionPanel

Shows on the inquiry detail page for marketplace inquiries:

- Platform badge + status badge + link health badge
- "Open in {Platform}" button with deep link
- Action buttons: "I Responded", "Proposal Sent", "Client Booked", "Decline"
- Payout summary: gross, commission %, net take-home, payout status
- Deep links to proposal, booking, guest contact, menu pages (when URLs are captured)
- Falls back to MarketplaceFallbackBanner for pre-migration inquiries

## What's Next

1. Migrate command center reads from legacy inquiry fields to platform_records
2. Add page capture route for bookmarklet-based captures
3. Add link health checking (background ping to detect expired links)
4. Wire platform_records into the marketplace scorecard analytics
