# Manual "Add" Capabilities Audit & Implementation

**Date:** 2026-02-17
**Trigger:** User noticed the Leads page has no manual add capability and requested a full audit of all dashboard sections.

---

## Problem

ChefFlow's dashboard had inconsistent manual data entry capabilities. Some sections (Events, Inquiries, Menus, Recipes, Expenses, etc.) had clear "Add" buttons, while others required data to enter only through automated flows or external pages. This meant chefs couldn't capture information from offline sources like phone calls, in-person conversations, or external review platforms.

## Audit Results

A comprehensive audit of all 20 chef dashboard sections found:
- **10 sections** already had manual add capabilities
- **4 sections** were missing manual add where it should exist
- **6 sections** were appropriately read-only (reporting, discovery, automation)

## What Changed

### Feature 1: Leads — Manual Lead Entry

**Files modified:**
- `app/(chef)/leads/page.tsx` — Added "+ Log Manual Lead" button in header
- `components/leads/leads-list.tsx` — Added button in empty state
- `components/inquiries/inquiry-form.tsx` — Added `referral` and `walk_in` channel options
- `lib/inquiries/actions.ts` — Updated Zod schema with new channel values

**Migration:** `20260221000011_add_inquiry_channels.sql` — Extends `inquiry_channel` enum

**Design decision:** Manual leads route to the existing inquiry form (`/inquiries/new`) rather than creating a separate leads form. Rationale: a manually-entered lead is already "claimed" by the chef, so the lead stage (shared unclaimed pool) doesn't apply. Going straight to inquiry is the correct pipeline step and avoids duplicating form infrastructure.

### Feature 2: Chat — New Conversation from Inbox

**Files modified:**
- `app/(chef)/chat/page.tsx` — Added `NewConversationButton` in header
- `components/chat/chat-inbox.tsx` — Updated empty state text

**Files created:**
- `components/chat/new-conversation-button.tsx` — Client picker modal with search

**Design decision:** Reuses existing `getOrCreateConversation()` with `context_type: 'standalone'`, which handles deduplication. If a standalone conversation already exists with the selected client, it navigates there instead of creating a duplicate.

### Feature 3: AAR — File AAR from List Page

**Files modified:**
- `app/(chef)/aar/page.tsx` — Added `FileAARButton` in header and empty state
- `lib/aar/actions.ts` — Added `getEventsWithoutAAR()` query

**Files created:**
- `components/aar/file-aar-button.tsx` — Event picker modal showing completed events without AARs

**Design decision:** Shows all completed events without time limit (no date cutoff). Chefs may want to retroactively file AARs for old events. The picker navigates to the existing AAR form at `/events/{id}/aar`.

### Feature 4: Reviews — Chef Feedback Logging

**Files modified:**
- `app/(chef)/reviews/page.tsx` — Added `LogFeedbackButton` and fetches chef feedback
- `components/reviews/chef-reviews-list.tsx` — Added "Logged Feedback" section below client reviews

**Files created:**
- `supabase/migrations/20260221000012_chef_feedback.sql` — New `chef_feedback` table
- `lib/reviews/chef-feedback-actions.ts` — `logChefFeedback()` and `getChefFeedback()` actions
- `components/reviews/log-feedback-button.tsx` — Feedback logging modal form

**Design decision:** Created a separate `chef_feedback` table instead of extending `client_reviews`. Rationale:
- `client_reviews` has `NOT NULL` constraints on `event_id` and `client_id`, plus a `UNIQUE` on `event_id`. External feedback often has neither.
- RLS policies on `client_reviews` only allow client inserts. Adding chef insert would change the security model.
- Separate table keeps client-submitted reviews pure and untainted.

## Architecture Notes

- All new components follow the existing modal pattern from `components/import/smart-fill-modal.tsx`
- All server actions use `requireChef()` for role checks and tenant scoping
- New `chef_feedback` table uses the same RLS pattern as `client_reviews` (user_roles subquery)
- Two new migrations are additive only — no existing tables modified

## Post-Migration

After applying migrations to the remote database:
```bash
npx supabase db push --linked
npx supabase gen types typescript --linked > types/database.ts
```

## Verification

1. **Leads:** `/leads` → "+ Log Manual Lead" → arrives at `/inquiries/new` → `referral` and `walk_in` channels visible
2. **Chat:** `/chat` → "+ New Conversation" → client picker → select client → conversation opens
3. **AAR:** `/aar` → "+ File AAR" → event picker → select completed event → AAR form
4. **Reviews:** `/reviews` → "+ Log Feedback" → fill form → feedback appears in "Logged Feedback" section
