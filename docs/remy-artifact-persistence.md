# Remy Artifact Persistence

## What Changed

Remy can now **save anything it creates** to the chef's profile. Nothing goes into the abyss — every conversation response, task result, email draft, or data lookup can be saved with one click and retrieved later from a dedicated Remy History page.

## Why

Previously, everything Remy created lived only in the drawer's in-memory state. Close the drawer or refresh the page, and it was gone. The user explicitly requested: "We need to allow Remy to create anything you want and have it saved on your profile... there should be a brand new tab that just basically has like everything Remy's ever made."

## Architecture

### Database: `remy_artifacts` table

New migration `20260322000032_remy_artifacts.sql` creates a single table with:

- `artifact_type` — categorizes the artifact (conversation, task_result, email_draft, note, etc.)
- `title` — human-readable title (auto-generated from content, up to 60 chars)
- `content` — the main text content (Remy's response, drafted email, etc.)
- `data` — JSONB for structured data (task results, search results, financial snapshots)
- `source_message` — the user's original message that prompted Remy
- `source_task_type` — e.g. 'email.followup', 'client.search'
- `related_client_id` / `related_event_id` — optional FK references for linking to entities
- `pinned` — boolean for marking important artifacts

RLS policies ensure tenant isolation — chefs can only access their own artifacts.

### Save UI

**In the Remy Drawer:**

- Every Remy message bubble has a **bookmark icon** (appears on hover) to save the response
- Every task result card has a **bookmark icon** in the header to save the result
- Saved items show a filled bookmark (BookmarkCheck) and can't be double-saved
- Toast confirms each save

**In the Header:**

- A **History icon** (clock) in the Remy drawer header links to `/remy` — the full history page

### Remy History Page (`/remy`)

Full-page view of all saved artifacts with:

- **Search** — client-side text search across title, content, and source message
- **Type filter** — dropdown to filter by artifact type (conversations, task results, email drafts, notes)
- **Pinned filter** — toggle to show only pinned artifacts
- **Expand/collapse** — each card expands to show full content and raw data
- **Pin/unpin** — star important artifacts so they're easy to find
- **Delete** — remove artifacts you no longer need
- **Pagination** — 20 items per page with previous/next controls
- **Relative timestamps** — "5m ago", "2h ago", "3d ago" for recent items

### Navigation

- Added to `standaloneTop` in `nav-config.tsx` as "Remy History" (right next to Command Center)
- Added `/remy` to Remy's own NAV_ROUTE_MAP so it can suggest the history page when relevant

## Files Created

| File                                                    | Purpose                                 |
| ------------------------------------------------------- | --------------------------------------- |
| `supabase/migrations/20260322000032_remy_artifacts.sql` | Database table + RLS + indexes          |
| `lib/ai/remy-artifact-actions.ts`                       | Server actions: save, list, pin, delete |
| `components/ai/remy-history-list.tsx`                   | Full history page list component        |
| `app/(chef)/remy/page.tsx`                              | Remy History page                       |

## Files Modified

| File                                   | Change                                                           |
| -------------------------------------- | ---------------------------------------------------------------- |
| `components/ai/remy-task-card.tsx`     | Added `onSave` and `saved` props, bookmark button in header      |
| `components/ai/remy-drawer.tsx`        | Added save handlers for messages + tasks, history link in header |
| `components/navigation/nav-config.tsx` | Added Remy History to standaloneTop nav                          |
| `lib/ai/remy-actions.ts`               | Added /remy to NAV_ROUTE_MAP                                     |

## Server Actions

| Action                           | Purpose                                        |
| -------------------------------- | ---------------------------------------------- |
| `saveRemyArtifact(input)`        | Generic save — any artifact type               |
| `saveRemyMessage(input)`         | Convenience wrapper for conversation responses |
| `saveRemyTaskResult(input)`      | Convenience wrapper for task results           |
| `listRemyArtifacts(options?)`    | List with type/pinned filters + pagination     |
| `toggleArtifactPin(id, pinned)`  | Pin or unpin an artifact                       |
| `updateArtifactTitle(id, title)` | Rename an artifact                             |
| `deleteRemyArtifact(id)`         | Delete an artifact                             |

## AI Policy Compliance

- Saving is always initiated by the chef (click the save button) — Remy never auto-saves
- All data stays in Supabase (same security model as all other chef data)
- RLS ensures strict tenant isolation
- No AI processing involved in save/list/delete — pure CRUD operations
