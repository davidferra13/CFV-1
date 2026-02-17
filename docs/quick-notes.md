# Chef Quick Notes System

**Date:** 2026-02-20
**Branch:** `feature/chat-file-sharing` (combined with Phases 1-2)
**Phase:** 3 of 5 (Messaging & Households Epic)

---

## What Changed

Added a dedicated quick notes system for chefs to capture observations about clients. Separate from the CRM message log (Layer 2), these are lightweight internal notes with categories, pinning, and chat sidebar integration.

## Why

The existing CRM message log (`messages` table with `internal_note` channel) is designed for formal communication tracking. Chefs need something faster -- a quick way to jot down "allergic to shellfish" or "always tips 25%" without the overhead of a full message form. These notes also appear in the chat sidebar so the chef has context while messaging.

## Changes

### Database

**Migration:** `supabase/migrations/20260220000003_client_notes.sql`

- New enum `note_category`: general, dietary, preference, logistics, relationship
- New table `client_notes`: id, tenant_id, client_id, event_id (optional), note_text, category, pinned, source, timestamps
- RLS: chef-only within tenant
- Indexes on (tenant_id, client_id) and (tenant_id, client_id, pinned DESC, created_at DESC)

### Server Actions

**Created:** `lib/notes/actions.ts`

- `addClientNote()` -- create a note with category
- `updateClientNote()` -- update text/category
- `deleteClientNote()` -- remove a note
- `toggleNotePin()` -- toggle pinned state
- `getClientNotes()` -- fetch with optional filters (pinned_only, event_id, category)

### Components

**Created:** `components/clients/quick-notes.tsx`
- Full notes panel with header, inline add form, note list
- Category badges (color-coded: red=dietary, blue=preference, green=logistics, purple=relationship, gray=general)
- Pin/unpin, edit, delete actions on hover
- Optimistic re-sorting when pin state changes

**Created:** `components/clients/quick-note-form.tsx`
- Compact form: textarea + category dropdown
- Used for both adding and editing notes
- Reused in both client detail page and chat sidebar

**Created:** `components/chat/chat-sidebar.tsx`
- Collapsible right panel in chef's chat view
- Shows client name (linked to profile), pinned notes, add note button
- Collapses to a thin icon strip to maximize chat space

### Integration

**Modified:** `app/(chef)/clients/[id]/page.tsx`
- Added QuickNotes section between PersonalInfoEditor and Milestones
- Notes fetched in parallel with other client data

**Modified:** `app/(chef)/chat/[id]/page.tsx`
- Added ChatSidebar alongside ChatView
- Resolves client entity ID from conversation participant
- Fetches pinned notes for sidebar display
- Flex layout: chat view takes remaining space, sidebar is 288px wide

## How It Connects

- The `source` field on notes supports 'manual' and 'ai_insight' -- Phase 4 (AI Insights) will create notes with `source: 'ai_insight'` when chefs accept extracted insights
- The ChatSidebar will be extended in Phase 4 to show AI-suggested insights below the pinned notes
- Notes are independent of the CRM message log -- both systems coexist
