# Menu Context Dock

**Date:** 2026-03-26
**Status:** Implemented (pending migration)

## What Changed

Added a "Context Dock" to the menu editor sidebar that lets chefs optionally attach context assets to any menu, with or without an event linked.

### New Database Columns (menus table)

| Column        | Type                           | Purpose                      |
| ------------- | ------------------------------ | ---------------------------- |
| `season`      | TEXT (nullable)                | spring, summer, fall, winter |
| `client_id`   | UUID (nullable, FK to clients) | Direct client association    |
| `target_date` | DATE (nullable)                | When this menu is for        |

Migration: `20260401000106_menu_context_columns.sql`

### Context Dock UI

Located at the top of the menu editor sidebar. Three toggleable assets:

1. **Season** - Four pill buttons (Spring, Summer, Fall, Winter). Click to toggle on/off. Shows seasonal ingredient suggestions when active. Auto-saves.

2. **Target Date** - Date picker. Independent of any linked event's date. Auto-saves.

3. **Client** - Searchable client picker. Shows dietary restrictions and allergies inline when a client is linked. Loads the chef's client list on demand (lazy). When a client is linked directly, previous menus for that client appear in the sidebar. Auto-saves.

### How It Works

- All three fields auto-save via the existing `updateMenuMeta` debounced save mechanism (1.5s debounce)
- Season in the dock takes priority over season derived from event date
- Client in the dock works independently of event client (for standalone menus)
- Previous menus sidebar now also shows menus linked to the same client via `client_id` (not just through events)
- Create menu form (Step 1) now includes Season and Target Date fields

### Files Changed

| File                                                          | What                                                                   |
| ------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `database/migrations/20260401000106_menu_context_columns.sql` | New columns                                                            |
| `lib/menus/editor-actions.ts`                                 | EditorMenu type, updateMenuMeta, getEditorContext, getEditorClientList |
| `lib/menus/actions.ts`                                        | CreateMenuSchema, UpdateMenuSchema                                     |
| `components/menus/menu-doc-editor.tsx`                        | ContextDock component, ContextSidebar updates                          |
| `app/(chef)/menus/[id]/editor/page.tsx`                       | Pass directClient prop                                                 |
| `app/(chef)/menus/new/create-menu-form.tsx`                   | Season + target date in create wizard                                  |
