# Dinner Circle - Gap Closure (2026-03-06)

Three gaps identified and closed in the Dinner Circle feature.

## 1. Per-Message Read Receipts ("Seen by")

**Problem:** `last_read_at` existed at the group level for unread counts, but there was no way to see who had read a specific message.

**Solution:**

- **Migration** `20260330000060`: New `hub_message_reads` table (message_id, profile_id, read_at) with unique constraint and RLS
- **Server actions** in `lib/hub/message-actions.ts`:
  - `recordMessageReads()` - bulk-upserts per-message reads when `markHubRead()` is called
  - `getMessageReaders(messageId)` - returns display_name + avatar for up to 20 readers
- **UI** in `components/hub/hub-message.tsx`:
  - `SeenByIndicator` component below own messages
  - Lazy-loads readers on hover (no extra queries until user interacts)
  - Shows "Seen by Name" (1 reader) or "Seen by N" (multiple) with expandable list
  - Double-checkmark icon for visual clarity

**Architecture:** Per-message reads are a non-blocking side effect of the existing `markHubRead()` flow. If the insert fails, the group-level read still works.

## 2. Inline Media in Messages

**Problem:** File uploads worked (storage + `hub_media` table), but shared images appeared as plain text ("Shared: photo.jpg") instead of rendering inline in the chat.

**Solution:**

- **`components/hub/hub-file-share.tsx`**: Now distinguishes images from documents:
  - Images: gets a signed URL via `getMediaUrl()`, passes it as `media_urls` to `postHubMessage()`, which renders inline
  - Documents: still posts a text message with file icon (PDFs, Word, Excel, CSV don't render inline)
- **`components/hub/hub-message.tsx`**: Image rendering upgraded with clickable links (opens full-size in new tab) and hover scale effect

**No migration needed.** The `media_urls` column on `hub_messages` already existed and `postHubMessage()` already accepted and inserted it. The only gap was the UI not passing URLs through.

## 3. Notification Throttling (Email Rate Limiting)

**Problem:** Every single message in a circle triggered an immediate email to all members. In an active conversation, this could mean 20+ emails in 5 minutes.

**Solution:**

- **Migration** `20260330000060`: Added `last_notified_at` column to `hub_group_members`
- **`lib/hub/circle-notification-actions.ts`**: 5-minute cooldown per member per circle
  - If a member was emailed within the last 5 minutes, the email is skipped
  - Push notifications are always sent (lightweight, no inbox clutter)
  - `last_notified_at` is updated after each email send

**Behavior:** First message in a conversation triggers an email immediately. Subsequent messages within 5 minutes only trigger push notifications. After the cooldown expires, the next message triggers another email.

## Files Changed

| File                                                                           | Change                                                                       |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `supabase/migrations/20260330000060_hub_message_reads_and_notify_throttle.sql` | New table + column                                                           |
| `lib/hub/message-actions.ts`                                                   | Added `recordMessageReads()`, `getMessageReaders()`, updated `markHubRead()` |
| `components/hub/hub-message.tsx`                                               | Added `SeenByIndicator` component, improved inline image rendering           |
| `components/hub/hub-file-share.tsx`                                            | Images now pass signed URLs as `media_urls` for inline rendering             |
| `lib/hub/circle-notification-actions.ts`                                       | 5-minute email throttle per member per circle                                |
