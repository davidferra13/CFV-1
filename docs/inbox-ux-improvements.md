# Inbox UX Improvements — Phase 0 Completion

**Date:** 2026-02-28
**Branch:** `feature/risk-gap-closure`

## Overview

Seven improvements to the unified inbox that transform it from a functional message list into a trusted, mobile-ready command center.

## Changes Implemented

### 1. Unread/Read State Tracking

**What:** Threads are marked as read when opened. Unread threads show a bold visual treatment in the inbox.

**How it works:**

- New `conversation_thread_reads` table tracks `(tenant_id, thread_id, last_read_at)`
- `getUnreadThreadCount()` compares `last_activity_at` on threads against the read receipt timestamp
- `markThreadRead()` called automatically when opening a thread in triage view
- Unread count displayed as a red badge in the nav sidebar (polls every 30s)

**Files:**

- `supabase/migrations/20260329000002_inbox_unread_push_subscriptions.sql` — migration
- `lib/communication/actions.ts` — `getUnreadThreadCount()`, `markThreadRead()`
- `components/communication/inbox-unread-badge.tsx` — nav badge component
- `components/navigation/chef-nav.tsx` — badge rendered next to Inbox label
- `app/(chef)/inbox/triage/[threadId]/page.tsx` — marks thread read on open

### 2. Push Notifications

**What:** Browser push notifications when new inbound messages arrive, even if the chef isn't looking at the inbox.

**How it works:**

- Uses existing `push_subscriptions` table and subscription management from `lib/push/subscriptions.ts`
- `sendInboxPushNotification()` fires from `ingestCommunicationEvent()` for inbound messages only
- Service worker (`public/inbox-sw.js`) handles push events and notification clicks
- Expired subscriptions auto-deactivated; transient failures tracked via `failed_count`

**Files:**

- `lib/communication/push-notify.ts` — sends push to all tenant devices
- `public/inbox-sw.js` — service worker for push event handling
- `lib/communication/pipeline.ts` — triggers push on inbound message ingestion

**Env vars needed:**

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — VAPID public key
- `VAPID_PRIVATE_KEY` — VAPID private key

**Dependencies added:**

- `web-push` npm package

### 3. Reply Bar — Actual Send

**What:** The reply bar can now send messages via the original channel (email, SMS, WhatsApp) in addition to log-only mode.

**How it works:**

- Channel detection from thread's primary source and available contact info
- Email: uses Gmail API `sendEmail()` (scope already granted)
- SMS: uses Twilio `sendSMS()`
- WhatsApp: uses Twilio `sendWhatsApp()`
- After sending, the message is logged as an outbound communication event
- Toggle between "Send & Log" and "Log Only" modes

**Files:**

- `lib/communication/actions.ts` — `sendReplyViaChannel()` server action
- `components/communication/thread-detail-client.tsx` — channel-aware reply bar UI

### 4. Empty State Onboarding

**What:** When a chef has no inbox items, they see a rich onboarding card instead of a blank page.

**How it works:**

- Gradient welcome card with clear CTAs: "Connect Gmail", "Log a Phone Call", "Log a Message"
- Three feature cards explaining what the inbox does
- Only shown when `items.length === 0`

**Files:**

- `components/communication/communication-inbox-client.tsx` — empty state section

### 5. Keyboard Shortcuts

**What:** Power users can navigate and act on inbox items without touching the mouse.

**Shortcuts:**

- `j` / `k` — move focus down/up
- `Enter` — open focused thread
- `e` — mark done (resolve)
- `s` — snooze 24h
- `x` — select/deselect for bulk actions
- `*` — toggle star

**How it works:**

- Global `keydown` listener with input/textarea/select exclusion
- Focused card shows a ring-2 highlight
- `scrollIntoView` keeps focused card visible
- Shortcut hint bar at bottom of inbox

**Files:**

- `components/communication/communication-inbox-client.tsx` — keyboard handler + UI

### 6. Mobile Optimization

**What:** Touch-friendly targets, responsive layouts, and smart space usage on small screens.

**Improvements:**

- 44px minimum touch targets on all interactive elements
- `overflow-x-auto` on source filter pills (horizontal scroll instead of wrap)
- Sticky bottom reply bar with responsive padding
- `timeAgo()` on mobile vs full timestamps on desktop
- `line-clamp-3` on message previews
- Responsive card padding and gaps

**Files:**

- `components/communication/communication-inbox-client.tsx` — responsive classes
- `components/communication/thread-detail-client.tsx` — mobile reply bar

### 7. Raw Feed Trust Tab

**What:** A "Raw Feed" view that shows every single message in chronological order — unfiltered, unsorted, no smart triage. This is the "checks and balances" that lets chefs verify the smart filtering is working correctly.

**Why:** Chefs who receive 30+ emails per event need to trust that the smart inbox isn't hiding anything. The raw feed provides transparency — they can see everything, then choose to ignore it once they trust the system.

**How it works:**

- Toggle between "Smart Inbox" and "Raw Feed" view modes
- Raw feed queries `communication_events` directly, ordered by timestamp desc
- Compact list items with source badge, sender, preview, and link to thread
- Smart Inbox tab shows unread count badge

**Files:**

- `lib/communication/actions.ts` — `getRawCommunicationFeed()` server action
- `components/communication/communication-inbox-client.tsx` — view mode toggle + raw feed UI
- `app/(chef)/inbox/page.tsx` — fetches raw feed data

## Architecture Notes

- All push notification handling is non-blocking (try/catch, `.catch()`)
- Read receipts use a separate table rather than a column on threads, allowing per-user tracking
- The raw feed is intentionally simple — no filtering, no grouping, just chronological messages
- Duplicate push subscription CRUD was removed from `lib/communication/actions.ts` — canonical versions live in `lib/push/subscriptions.ts`
- Channel detection for reply-send uses the thread's primary source to determine the right channel
