# Unified Inbox — Phase 2 Reflection

## What Changed

Added a unified `/inbox` page that aggregates chat conversations, CRM messages, Wix form submissions, and notifications into a single chronological feed with source filters. Replaced the top-level "Messages" nav item with "Inbox".

## Why

Chefs were context-switching between multiple pages to stay on top of communication:

- `/chat` for real-time conversations
- `/inquiries/{id}` for CRM message threads
- Settings for Wix submissions
- Bell icon for notifications

The Unified Inbox gives one place to see "what's new" across all channels, with filters to focus on specific sources.

## Architecture

### Database VIEW (Not Materialized)

The `unified_inbox` is a SQL VIEW that UNIONs four tables:

1. **conversations** — Real-time chat (using last_message_preview for efficiency)
2. **messages** — CRM communication log (sent + logged only)
3. **wix_submissions** — Wix form submissions
4. **notifications** — System notifications (excluding archived)

A VIEW (vs materialized) was chosen because:

- All underlying tables are well-indexed on `(tenant_id, created_at DESC)`
- Chat and notifications already use Supabase Realtime
- No trigger maintenance needed — always current
- Paginated queries are fast with LIMIT/OFFSET on the view

### Common Schema

All items share: `id, tenant_id, source, preview, activity_at, actor_id, inquiry_id, event_id, client_id, content_type, is_read`

### Navigation Change

`/chat` "Messages" → `/inbox` "Inbox" in the top-level nav. The `/chat` page still exists and is accessible from inbox item links.

## Files Created

| File                                                   | Purpose                                |
| ------------------------------------------------------ | -------------------------------------- |
| `supabase/migrations/20260221000016_unified_inbox.sql` | VIEW definition                        |
| `lib/inbox/types.ts`                                   | TypeScript types                       |
| `lib/inbox/actions.ts`                                 | `getUnifiedInbox()`, `getInboxStats()` |
| `app/(chef)/inbox/page.tsx`                            | Inbox page                             |
| `components/inbox/inbox-feed.tsx`                      | Feed with source filters               |
| `components/inbox/inbox-item-card.tsx`                 | Per-source card renderer               |
| `components/inbox/inbox-filters.tsx`                   | Source toggle pills                    |

## Files Modified

| File                                 | Change                              |
| ------------------------------------ | ----------------------------------- |
| `components/navigation/chef-nav.tsx` | `/chat` → `/inbox` in standaloneTop |

## How It Connects

```
/inbox page
  └─ getUnifiedInbox() → queries unified_inbox VIEW
      └─ UNION ALL:
          ├─ conversations (chat) → links to /chat/{id}
          ├─ messages (CRM) → links to /inquiries/{id} or /events/{id}
          ├─ wix_submissions → links to /inquiries/{id}
          └─ notifications → links to action_url
```

Each card renders differently by source (color-coded badge, icon) and links to the native detail page for interaction.
