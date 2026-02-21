# Collaboration & Content Features

## Overview

This document describes the collaboration and content features added in this session. Nine files were created covering document version history, community template sharing, a rich text note editor, and an email composer component.

## Files Created

### Database Migrations

**`supabase/migrations/20260310000001_document_versions.sql`**
Creates the `document_versions` table, which stores full JSONB snapshots of menus, quotes, and recipes at each save point. Key columns:
- `entity_type`: constrained to `menu | quote | recipe`
- `entity_id`: UUID reference to the source record (no FK to preserve flexibility across entity tables)
- `version_number`: monotonically incrementing integer per entity
- `snapshot`: full JSONB copy of the entity state at save time
- `change_summary`: optional human-readable description of what changed
- RLS policy: chef can only see/manage versions belonging to their own `tenant_id`

**`supabase/migrations/20260310000002_community_templates.sql`**
Creates the `community_templates` table for cross-chef template sharing. Key columns:
- `template_type`: constrained to `menu | recipe | message | quote`
- `content`: JSONB holding the template body (structure varies by type)
- `tags`, `dietary_tags`: text arrays for filtering
- `is_published`: gates visibility — unpublished templates are only visible to their author
- `download_count`, `avg_rating`: engagement metrics
- Two RLS policies: published templates are SELECT-visible to all chefs; INSERT/UPDATE/DELETE restricted to the author's `tenant_id`

### Server Actions

**`lib/versioning/snapshot.ts`**
Two exported server actions:
- `saveSnapshot(entityType, entityId, snapshot, changeSummary?)` — looks up the current max `version_number` for the entity, increments by 1, and inserts a new row. Uses `as any` cast for the new table name until `types/database.ts` is regenerated.
- `getVersionHistory(entityType, entityId)` — returns the 20 most recent versions for an entity, scoped to the chef's `tenant_id`, newest first.

**`lib/community/template-sharing.ts`**
Four exported server actions:
- `getCommunityTemplates(type?)` — fetches all published templates, optionally filtered by type, ordered by `download_count` descending. Does not require auth (public read via RLS).
- `getMyTemplates()` — fetches all templates owned by the current chef, including unpublished drafts.
- `publishTemplate(input)` — inserts a new published template attributed to the current chef's `tenant_id`.
- `incrementDownloadCount(templateId)` — attempts an RPC call (`increment_template_downloads`) with a fallback direct update. The RPC function is not yet created; the fallback handles the case gracefully.

### React Components

**`components/shared/version-history-panel.tsx`** (Client Component)
A collapsible panel that lazy-loads version history on first expand. Shows:
- Version badge (green "success" for current, stone "default" for older)
- Formatted timestamp
- Optional change summary
- Restore button (ghost variant) for any non-current version — calls the `onRestore` prop with the snapshot data

Uses `useTransition` for async loading. Toasts on error.

**`components/community/community-template-import.tsx`** (Client Component)
A single-button import control used in the community templates grid. Switches from primary to secondary with a checkmark after import, preventing double-imports within the session. Stub implementation currently toasts success; a full implementation would call a server action to create the entity from `template.content`.

**`components/ui/rich-note-editor.tsx`** (Client Component)
A plain-textarea editor with a markdown-shortcut toolbar. Toolbar actions:
- Bold: wraps selection in `**...**`
- Italic: wraps selection in `*...*`
- List: inserts `\n- ` at cursor
- Link: prompts for URL, wraps selection in `[text](url)`

Uses `useRef` to track and restore cursor position after toolbar insertions. Shows a live preview of the raw markdown text at the bottom using `<pre className="whitespace-pre-wrap">` (no react-markdown dependency). Does not use `useCallback` or `useState` for the unused `Image`/`Paperclip` icons that were removed from the original spec — only the four functional toolbar buttons are included.

**`components/communication/email-composer.tsx`** (Client Component)
A self-contained email composition card with:
- "To" display field (read-only)
- Subject input
- Multi-line body textarea (min 160px)
- Template picker dropdown with three built-in templates (Follow-Up After Event, Quote Follow-Up, Booking Confirmation) — templates replace `{{name}}` with the recipient's first name
- Send button: opens `mailto:` link in a new tab as a fallback; production integration point is clearly marked for Resend

**`app/(chef)/community/templates/page.tsx`** (Server Component)
Route: `/community/templates`
- Protected by `requireChef()`
- Fetches published templates server-side
- Renders a responsive 2-column card grid with type/cuisine badges, description, download count, and the `CommunityTemplateImport` client component per card
- Empty state with a globe icon

## Architecture Notes

### `as any` Casts
Both new tables (`document_versions`, `community_templates`) are cast with `as any` in Supabase queries because `types/database.ts` is auto-generated and has not yet been regenerated against the new migrations. Once migrations are applied and `npx supabase gen types typescript --linked` is run, the casts can be removed.

### No Existing Files Modified
All changes are purely additive. No existing files were touched.

### Migration Safety
- Migration timestamps `20260310000001` and `20260310000002` are strictly higher than the previous highest `20260307000006`.
- Both migrations are additive (CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS, no DROP or ALTER on existing tables).

## Next Steps

1. Apply migrations: `npx supabase db push --linked` (back up first)
2. Regenerate types: `npx supabase gen types typescript --linked > types/database.ts`
3. Remove `as any` casts in `lib/versioning/snapshot.ts` and `lib/community/template-sharing.ts`
4. Wire `VersionHistoryPanel` into the menu and quote edit forms
5. Create `app/(chef)/community/templates/share/page.tsx` for template publishing
6. Implement `incrementDownloadCount` RPC in a future migration or replace with a raw SQL increment
7. Add `CommunityTemplateImport` full implementation to actually create entities from template content
8. Add `EmailComposer` to client detail pages and event close-out flow
