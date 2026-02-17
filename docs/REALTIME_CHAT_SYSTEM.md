# Real-Time Chat System — Phase 1

## What Changed

Phase 1 introduces **real-time instant messaging** between chefs and their clients. This sits alongside the existing communication log system (the `messages` table) which remains for CRM record-keeping of multi-channel conversations (email, text, phone, Instagram).

### New Database Objects (Layer 6)

**Migration:** `supabase/migrations/20260219000001_layer_6_realtime_chat.sql`

| Table | Purpose |
|---|---|
| `conversations` | Groups messages between participants. Optionally linked to an inquiry or event. Denormalized `last_message_at/preview` for inbox performance. |
| `conversation_participants` | Join table linking users to conversations. Supports N participants (designed for Phase 2 groups). Tracks `last_read_at` for unread computation. |
| `chat_messages` | The messages themselves. Supports 5 types: text, image, link, event_ref, system. Soft-delete via `deleted_at`. |

**Enums:** `chat_message_type`, `conversation_context_type`

**Functions:**
- `is_conversation_participant(conv_id)` — RLS helper
- `get_unread_counts(user_id)` — Per-conversation unread counts
- `get_total_unread_count(user_id)` — Scalar for nav badge

**Triggers:**
- `update_conversation_last_message()` — Denormalizes latest message onto conversations table after each INSERT

**RLS:** Participant-based access. Users can only see/send messages in conversations they belong to. Chefs create conversations within their tenant. No hard deletes allowed.

### New Files

```
lib/chat/
  types.ts              — TypeScript types for chat entities
  actions.ts            — Server actions (create conversation, send message, inbox, pagination, read receipts, image upload)
  realtime.ts           — Supabase Realtime subscriptions (messages, inbox updates, typing, presence)
  system-messages.ts    — Auto-posts system messages on event transitions

components/chat/
  chat-inbox.tsx        — Conversation list with realtime reordering
  chat-inbox-item.tsx   — Single conversation row
  chat-view.tsx         — Full conversation screen (realtime, infinite scroll, typing, presence)
  chat-message-bubble.tsx — Message rendering by type
  chat-input-bar.tsx    — Message composition with typing indicator
  chat-image-upload.tsx — Image preview and upload
  chat-header.tsx       — Conversation header with presence
  chat-typing-indicator.tsx — Animated typing dots
  chat-system-message.tsx   — Centered system message pill
  chat-event-ref-card.tsx   — Embedded event card
  chat-presence-dot.tsx     — Online/offline indicator
  chat-unread-badge.tsx     — Red count badge

app/(chef)/chat/
  page.tsx              — Chef inbox
  [id]/page.tsx         — Chef conversation view

app/(client)/my-chat/
  page.tsx              — Client inbox
  [id]/page.tsx         — Client conversation view
```

### Modified Files

| File | Change |
|---|---|
| `middleware.ts` | Added `/chat` to `chefPaths`, `/my-chat` to `clientPaths` |
| `components/navigation/chef-nav.tsx` | Added Messages icon to sidebar standalone items + mobile bottom tab bar |
| `components/navigation/client-nav.tsx` | Added Messages nav item |
| `lib/events/transitions.ts` | Added system message side-effect in `transitionEvent()` |

## Why

ChefFlow's existing messaging was a **communication log** — chefs manually recording past conversations across channels. Clients had no way to directly message their chef through the platform. This gap meant all real-time communication happened outside ChefFlow (text, WhatsApp, email), creating fragmented records.

Phase 1 solves this by adding instant, in-platform messaging between chef and client. Each conversation can be linked to a specific inquiry or event, keeping context attached to the business relationship.

## How It Connects

### Architecture

- **Existing `messages` table** (Layer 2): Untouched. Still used for CRM logging of external communications.
- **New `chat_messages` table** (Layer 6): Live chat. Different name to prevent confusion.
- **Supabase Realtime**: Used for instant message delivery (`postgres_changes`), typing indicators (`broadcast`), and online presence (`presence`).
- **Supabase Storage**: New `chat-attachments` bucket for image sharing (private, signed URLs).

### Data Flow

1. Chef creates a conversation with a client (from client profile, event, or inquiry page)
2. Both participants join via `conversation_participants`
3. Messages sent via `sendChatMessage()` or `sendImageMessage()` server actions
4. Supabase Realtime pushes new messages to all participants' browsers
5. Read receipts tracked per-participant via `last_read_at` — unread counts computed from this
6. Event transitions auto-post system messages into linked conversations

### Security

- All server actions use `requireAuth()` with participant verification
- RLS policies enforce participant-only access at the database level
- Image uploads validated (type + size) and stored in tenant-scoped paths
- Signed URLs expire after 1 hour

### Performance

- **Inbox**: Denormalized `last_message_at/preview` on conversations avoids JOIN on every inbox load
- **Pagination**: Cursor-based (by `created_at`) with partial index on `(conversation_id, created_at DESC) WHERE deleted_at IS NULL`
- **Unread counts**: Single query via `get_unread_counts()` function using `last_read_at` comparison
- **Realtime**: Filtered by `conversation_id` so clients only receive events for active conversations

## Phase 2 Extensibility

The schema was designed for Phase 2 without requiring rewrites:

- **Chef-to-chef messaging**: `conversation_participants` already supports N participants. Add new context types to the enum.
- **Group conversations**: Same join table, just more participant rows per conversation.
- **Chef connections**: New `chef_connections` table; conversations between chefs gate on accepted connection.
- **Co-hosted events**: Multi-chef conversation with shared event context.
- **Data sharing**: System messages with sharing metadata (recipe_shared, menu_shared).

## Manual Setup Required

1. **Supabase Storage**: Create `chat-attachments` bucket (private, 10MB file size limit)
2. **Database Migration**: Run `supabase db push --linked` to apply Layer 6
3. **Type Regeneration**: Run `supabase gen types typescript --linked > types/database.ts`
