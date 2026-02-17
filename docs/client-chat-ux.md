# Client Chat UX Enhancements

**Date:** 2026-02-20
**Branch:** `feature/chat-file-sharing` (combined with Phase 1)
**Phase:** 2 of 5 (Messaging & Households Epic)

---

## What Changed

Enhanced the client-side messaging experience so clients feel completely comfortable reaching out to their chef from anywhere in the portal.

## Why

Previously, only chefs could initiate conversations. Clients had to wait for the chef to message first, or navigate to the chat inbox manually. This phase makes messaging accessible from every key client page and adds quality-of-life features like quick replies, search, and read receipts.

## Changes

### Database

**Migration:** `supabase/migrations/20260220000002_client_conversation_create.sql`

- RLS INSERT policy on `conversations` allowing clients to create conversations in their tenant
- RLS INSERT policy on `conversation_participants` allowing clients to add themselves as participants

### Server Actions

**Modified:** `lib/chat/actions.ts`

- Added `clientGetOrCreateConversation()` -- client can start a conversation with their chef
  - Finds existing standalone conversation or creates one
  - Adds both client and chef as participants
  - Supports context linking (event/inquiry)
- Added `searchChatMessages(conversationId, query)` -- full-text search within conversations using `ilike`

### New Components

**`components/chat/message-chef-button.tsx`**
- Reusable "Message Chef" button for the client portal
- Two variants: `button` (inline) and `fab` (floating action button)
- Supports context linking (event_id, inquiry_id) for contextual conversations
- Auto-creates conversation and navigates to chat

**`components/chat/chat-quick-replies.tsx`**
- Contextual quick-reply chips shown to clients above the input bar
- Appears when the last message is from the chef
- Options: "Sounds great!", "Can we adjust the menu?", "I have a question", "When works best?"

**`components/chat/chat-search.tsx`**
- Search bar in the chat header
- Full-text search within conversation messages
- Results with highlighted matches and timestamps
- Click to navigate to message

### Modified Components

**`components/chat/chat-header.tsx`**
- Added search toggle button (magnifying glass icon)

**`components/chat/chat-view.tsx`**
- Integrated ChatSearch overlay
- Integrated ChatQuickReplies above input bar
- Passes `otherParticipantLastReadAt` to message bubbles for read receipts

**`components/chat/chat-message-bubble.tsx`**
- Added read receipt display: "Read" indicator on own messages when the other participant has seen them
- Uses `otherParticipantLastReadAt` prop to determine read status

### Client Page Integration

**`app/(client)/my-events/page.tsx`**
- Added floating "Message Chef" FAB button

**`app/(client)/my-events/[id]/page.tsx`**
- Added inline "Message Chef" button in event header (context-linked to event)

**`app/(client)/my-quotes/[id]/page.tsx`**
- Added "Have a question? Message your chef" button at bottom

## How It Connects

- Builds on Phase 1's file sharing -- clients can now share documents directly from these conversation entry points
- The `MessageChefButton` uses `clientGetOrCreateConversation` which respects context linking, so event-specific conversations stay organized
- Read receipts use the existing `last_read_at` field from `conversation_participants` (no schema changes needed)
- Search uses simple `ilike` on the `body` field -- sufficient for V1, can be upgraded to full-text search later
