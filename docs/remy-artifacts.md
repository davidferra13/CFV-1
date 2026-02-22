# Remy Artifacts — Auto-Save Feature

## What Changed

Everything Remy creates is now **automatically saved** to a persistent `remy_artifacts` table. No manual bookmarking — nothing goes into the abyss.

## How It Works

1. **User chats with Remy** via the floating drawer (any page)
2. **Remy responds** with text and/or task results
3. **Auto-save fires** as a non-blocking side effect — the conversational response and each task result are persisted individually
4. **Errors are skipped** — task results with `status: 'error'` are not saved
5. **Save failures are silent** — they log to console but never interrupt the chat (`try/catch`, project pattern)

## Where to Find Saved Artifacts

- **Sidebar:** "Remy History" nav entry → `/remy`
- **Drawer header:** Clock icon links to `/remy`
- **Welcome message:** Links to Remy History on first open

## History Page Features (`/remy`)

- **Search** — filters by title, content, and source message
- **Type filter** — All, Conversations, Task Results, Email Drafts, Notes
- **Pinned filter** — show only pinned artifacts
- **Pin/Unpin** — mark important artifacts
- **Expand/Collapse** — view full content inline
- **Delete** — remove artifacts you don't need
- **Pagination** — 20 per page with prev/next

## Database

**Table:** `remy_artifacts`
**Migration:** `20260322000032_remy_artifacts.sql`

| Column            | Type              | Purpose                                            |
| ----------------- | ----------------- | -------------------------------------------------- |
| id                | UUID              | Primary key                                        |
| tenant_id         | UUID FK → chefs   | Tenant isolation                                   |
| artifact_type     | TEXT              | note, conversation, task_result, email_draft, etc. |
| title             | TEXT              | Auto-generated from first 60 chars                 |
| content           | TEXT              | Remy's text response                               |
| data              | JSONB             | Structured task result data                        |
| source_message    | TEXT              | What the user asked                                |
| source_task_type  | TEXT              | e.g. 'client.search', 'email.followup'             |
| related_client_id | UUID FK → clients | Optional link                                      |
| related_event_id  | UUID FK → events  | Optional link                                      |
| pinned            | BOOLEAN           | User can pin important items                       |

**Indexes:** tenant+created_at DESC, tenant+type+created_at DESC, partial on pinned=true
**RLS:** 4 policies (SELECT, INSERT, UPDATE, DELETE) — all tenant-scoped via `user_roles`

## Files

| File                                                    | Purpose                                 |
| ------------------------------------------------------- | --------------------------------------- |
| `supabase/migrations/20260322000032_remy_artifacts.sql` | Table, indexes, RLS, trigger            |
| `lib/ai/remy-artifact-actions.ts`                       | Server actions: save, list, pin, delete |
| `components/ai/remy-drawer.tsx`                         | Auto-save on every Remy response        |
| `components/ai/remy-task-card.tsx`                      | Clean task cards (no manual save)       |
| `app/(chef)/remy/page.tsx`                              | History page (server component)         |
| `components/ai/remy-history-list.tsx`                   | History list (client component)         |
| `components/navigation/nav-config.tsx`                  | Sidebar nav entry                       |
