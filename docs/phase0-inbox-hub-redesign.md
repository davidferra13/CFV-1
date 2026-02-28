# Phase 0: Inbox Hub Redesign — Implementation Summary

**Date:** 2026-02-28
**Branch:** `feature/risk-gap-closure`
**Status:** Complete

---

## What Changed

Phase 0 transforms the communication inbox from a flat message list into a unified, color-coded command center. Every channel added in later phases (Phases 1-5) automatically inherits color coding, noise filtering, source badges, and cross-channel merging.

### A. Channel Metadata Foundation

**New file:** `lib/communication/channel-meta.ts`

Single source of truth for all channel display properties (25+ channels). Every channel gets:

- Tailwind color classes (text, bg, ring)
- Lucide icon name
- Full label + short label
- Accent hex color for inline styles

**New file:** `components/communication/source-badge.tsx`

Reusable color-coded badge component with three sizes:

- `sm` — icon-only dot (22px circle)
- `md` — icon + short label pill
- `lg` — icon + full label pill

Also exports `SourceBadgeRow` for multi-channel thread display (deduplicates sources automatically).

### B. Noise Filtering in Gmail Sync

**Modified:** `lib/gmail/sync.ts`

- Removed pre-classification `ingestCommunicationEvent()` call that was ingesting ALL emails (including spam/marketing) into the inbox
- Added `ingestEmailIntoCommunicationPipeline()` helper that only runs for actionable email types
- TakeAChef: only `tac_new_inquiry`, `tac_client_message`, `tac_booking_confirmed`, `tac_customer_info` are ingested. Payment receipts and admin emails are noise-filtered (logged to `gmail_sync_log` but not shown in inbox)
- Yhangry: same pattern — only actionable types ingested
- Generic emails: only `inquiry` and `existing_thread` classifications are ingested (not `personal`, `spam`, `marketing`)

### C. First-Sync Upgrade

**Modified:** `lib/gmail/sync.ts`

Changed first-sync from `maxResults: 50` to `maxResults: 500`. A chef connecting Gmail for the first time now sees a comprehensive view of their recent email history.

### D. Inbox UI — Color-Coded Cards

**Modified:** `components/communication/communication-inbox-client.tsx`

- Source filter buttons now use `SourceBadge` components with opacity toggle
- Each inbox card has a colored left-border accent stripe matching the channel color
- Source text in card headers replaced with `SourceBadge` components
- Local `sourceLabel()` function removed in favor of `channelLabel()` from `channel-meta.ts`

**Modified:** `components/communication/thread-detail-client.tsx`

- Source labels replaced with `SourceBadge` components
- Local `sourceLabel()` function removed

### E. Cross-Channel Client Matching

**Modified:** `lib/communication/pipeline.ts`

Enhanced `getOrCreateThread()` with a new step: when a client is resolved (matched by email or phone), the system checks if they already have an active thread from ANY source. If found, it reuses that thread instead of creating a new one. This means:

- Client emails from Gmail + TakeAChef inquiries from the same person = one unified thread
- Thread shows multiple source badges (one per channel used)
- No duplicate threads for the same client across channels

### F. Sync Now Button

**New file:** `components/communication/sync-now-button.tsx`

Client component in the inbox header (only shown when Gmail is connected). One click triggers a full Gmail sync and shows results: "3 new inquiries, 2 messages" or "Up to date".

**Modified:** `app/(chef)/inbox/page.tsx` — Added SyncNowButton to inbox header.

### G. Thread Activity Timeline

**Modified:** `lib/communication/actions.ts`

- Added `TimelineSystemEvent` type
- `getThreadWithEvents()` now fetches system events from:
  - `communication_action_log` (thread actions: snoozed, starred, linked, etc.)
  - `inquiry_state_transitions` (if thread is linked to an inquiry)
  - `event_state_transitions` (if thread is linked to an event)
- System events skip noisy entries (ingested, classified) and show meaningful ones (follow-up timer set, inquiry created, status changed)

**Modified:** `components/communication/thread-detail-client.tsx`

- Timeline now interleaves messages and system events chronologically
- System events rendered as centered pills with color coding:
  - Inquiry transitions: violet
  - Event transitions: blue
  - Thread actions: stone/gray
- Messages remain as left/right aligned chat bubbles

### H. Expanded Source Types

**Modified:** `lib/communication/types.ts`

`CommunicationSource` expanded from 6 to 16 sources:
`email`, `website_form`, `sms`, `whatsapp`, `instagram`, `facebook`, `takeachef`, `yhangry`, `theknot`, `thumbtack`, `bark`, `cozymeal`, `google_business`, `gigsalad`, `phone`, `manual_log`

**Modified:** `lib/communication/actions.ts`

`mapSourceToInquiryChannel()` expanded from 5 to 14 mappings.

---

## Files Created

- `lib/communication/channel-meta.ts`
- `components/communication/source-badge.tsx`
- `components/communication/sync-now-button.tsx`
- `docs/phase0-inbox-hub-redesign.md` (this file)

## Files Modified

- `lib/gmail/sync.ts` — noise filtering, first-sync upgrade, platform ingestion
- `lib/communication/pipeline.ts` — cross-channel client matching
- `lib/communication/types.ts` — expanded CommunicationSource
- `lib/communication/actions.ts` — timeline system events, expanded channel mapping
- `components/communication/communication-inbox-client.tsx` — SourceBadge, accent stripes
- `components/communication/thread-detail-client.tsx` — SourceBadge, interleaved timeline
- `app/(chef)/inbox/page.tsx` — SyncNowButton

---

## What's Next (Phases 1-5)

| Phase | Summary                                                                                |
| ----- | -------------------------------------------------------------------------------------- |
| 1     | Email platform parsers (TheKnot, Thumbtack, Bark, Cozymeal, Google Business, GigSalad) |
| 2     | SMS + WhatsApp webhook upgrade, phone call logging                                     |
| 3     | Instagram + Facebook DM ingestion via Meta Webhooks                                    |
| 4     | Catch-all inbound email, referral tracking, channel analytics                          |
| 5     | Unified "Inquiry Channels" settings page                                               |

All future phases feed through `ingestCommunicationEvent()` and automatically inherit the color coding, noise filtering, cross-channel merging, and timeline features built in Phase 0.
