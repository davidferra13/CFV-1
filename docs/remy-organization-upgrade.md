# Remy Organization Upgrade — Phase 1 Complete

**Date:** 2026-02-26
**Status:** Complete
**Branch:** `feature/risk-gap-closure`
**Reference Plan:** Gustav → Remy best-of-both merge (Phase 1 of 3)

## Summary

Brought Gustav's organizational excellence to Remy. Remy now has project folders, full-text search, an action audit log, saved templates, pin/archive, bookmarks, context menus, and auto-project suggestions — all stored privately in browser IndexedDB.

## What Changed

### 1. Data Model Expansion (IndexedDB v1 → v2)

**File:** `lib/ai/remy-local-storage.ts` — complete rewrite (~700 lines)

| New Store   | Fields                                                                             |
| ----------- | ---------------------------------------------------------------------------------- |
| `projects`  | id, name, icon, createdAt, updatedAt, sortOrder                                    |
| `templates` | id, name, prompt, projectId, icon, sortOrder, createdAt                            |
| `actionLog` | id, conversationId, messageId, action, params, status, result, duration, createdAt |

| Existing Store  | New Fields                                   |
| --------------- | -------------------------------------------- |
| `conversations` | + projectId, pinned, archived, bookmarkCount |
| `messages`      | + bookmarked                                 |

**Migration:** v1 → v2 is automatic. Existing conversations get `projectId: null`, `pinned: false`, `archived: false`, `bookmarkCount: 0`. Existing messages get `bookmarked: false`. Zero data loss.

**~25 new exported functions** including:

- Project CRUD: `createProject`, `getProjects`, `updateProject`, `deleteProject`
- Template CRUD: `createTemplate`, `getTemplates`, `updateTemplate`, `deleteTemplate`
- Action log: `logAction`, `getActionLog`, `getActionsByConversation`
- Organization: `togglePin`, `toggleArchive`, `moveConversation`, `toggleBookmark`, `getBookmarkedMessages`
- Search: `searchConversations` (full-text across titles + message content, returns snippets)
- Export: `exportConversationMarkdown`, `exportConversationJSON`, `exportProjectJSON`
- Smart helpers: `autoSuggestProject` (keyword-based), `autoTitle` (strips filler words), `getStats`

**File:** `lib/ai/remy-types.ts` — Added `LocalProject`, `LocalTemplate`, `ActionLogEntry`, `SearchResult` interfaces

### 2. Action Tracking

**File:** `components/ai/remy-drawer.tsx` — client-side logging

After every task execution (success or failure), logs to IndexedDB via `logAction()`:

- Action name (e.g., `client.search`, `email.followup`)
- Parameters (truncated to 500 chars)
- Status (success/error)
- Result summary (truncated to 200 chars)
- Conversation ID for linking back

Design decision: Logging happens client-side (not in `command-orchestrator.ts`) because IndexedDB is browser-only and the orchestrator is a `'use server'` file.

### 3. 5-View Architecture

**File:** `components/ai/remy-drawer.tsx` — major refactor

Replaced `showConversationList` boolean with `drawerView` enum state machine:

| View      | Icon          | Component                    | What It Does                        |
| --------- | ------------- | ---------------------------- | ----------------------------------- |
| Chat      | MessageSquare | Existing chat                | All current chat features preserved |
| List      | List          | `remy-conversation-list.tsx` | Project-grouped conversations       |
| Search    | Search        | `remy-search-view.tsx`       | Full-text search with highlights    |
| Actions   | Activity      | `remy-action-log.tsx`        | Audit trail of task executions      |
| Templates | BookTemplate  | `remy-templates-view.tsx`    | Saved starter prompts               |

**Header:** 5 icon tabs + Info button, with active state highlighting (brand color).

### 4. Conversation List with Context Menus

**New file:** `components/ai/remy-conversation-list.tsx`

- **Sections:** Pinned (top) → Projects (collapsible) → Uncategorized → Archived (collapsed)
- **Context menu (right-click):** Rename, Move to project, Pin/Unpin, Export Markdown, Export JSON, Archive/Unarchive, Delete
- **Project management:** Create project (with emoji picker), rename, export all, delete
- **Inline rename** for both conversations and projects
- **Collapse state** persisted to localStorage
- Relative timestamps (`timeAgo` helper)

### 5. Full-Text Search

**New file:** `components/ai/remy-search-view.tsx`

- Debounced input (300ms)
- Searches conversation titles + message content
- Keyword highlighting with `<mark>` tags
- Shows match source (title vs. message), snippet, time-ago
- Click result → opens conversation in Chat view

### 6. Action Log

**New file:** `components/ai/remy-action-log.tsx`

- Grouped by date (Today, Yesterday, or formatted date)
- Each entry: status icon, action name (monospace), time, duration
- Click entry → jumps to source conversation
- Loads last 200 actions

### 7. Templates

**New file:** `components/ai/remy-templates-view.tsx`

- Create/edit/delete templates with emoji icon, name, prompt text
- Optional project assignment
- "Run" button creates new conversation and auto-fills the prompt
- Hover actions: Run (green), Edit, Delete (red)

### 8. Auto-Project Suggestion

After the first message in a new conversation, a dismissable banner appears:

> 🎉 Move to **Events**? [Yes] [Dismiss]

Keyword map (deterministic, no AI cost):

- Events: event, dinner, party, guest, catering, brunch, reception, gala
- Recipes & Menus: recipe, menu, ingredient, dish, plating, course, appetizer, dessert
- Clients: client, follow-up, inquiry, lead, booking, prospect
- Finance: revenue, payment, invoice, expense, profit, budget, quote, pricing
- Communications: email, draft, message, reply, thank you, follow up, outreach
- Planning: prep, timeline, schedule, calendar, availability, block, date

Auto-creates the project if it doesn't exist yet.

### 9. Smart Auto-Title

Improved from simple truncation to `autoTitle()`:

- Strips filler words (can you, please, hey, remy, tell me, show me, etc.)
- Capitalizes first letter
- Truncates at word boundary (~50 chars)

## Privacy

All new features maintain the privacy-by-architecture principle:

- Projects, templates, action log, bookmarks, search — all stored in browser IndexedDB
- Nothing transmitted to servers
- Chef can clear all history at any time via `clearAllHistory()`

## Files Modified

| File                                       | Changes                                                                          |
| ------------------------------------------ | -------------------------------------------------------------------------------- |
| `lib/ai/remy-local-storage.ts`             | Complete rewrite: DB v2, 5 stores, ~25 new functions                             |
| `lib/ai/remy-types.ts`                     | 4 new interfaces                                                                 |
| `components/ai/remy-drawer.tsx`            | 5-view state machine, icon tabs, action logging, auto-project banner, auto-title |
| `components/ai/remy-conversation-list.tsx` | **NEW** — project-grouped list + context menus                                   |
| `components/ai/remy-search-view.tsx`       | **NEW** — full-text search                                                       |
| `components/ai/remy-action-log.tsx`        | **NEW** — audit trail                                                            |
| `components/ai/remy-templates-view.tsx`    | **NEW** — template management                                                    |

## What's Next

- **Phase 2:** Gustav gets Remy's polish (cancel button, streaming cursor, sound, memory system, file attachments)
- **Phase 3:** Final review pass — side-by-side feature audit, polish, documentation updates
