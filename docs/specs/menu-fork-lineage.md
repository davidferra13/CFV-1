# Spec: Menu Fork Lineage

> **Status:** SPEC-READY
> **Priority:** P1
> **Depends on:** client-provided-menus.md (shares origin_type column)
> **Estimated complexity:** medium (8-10 files)
> **Created:** 2026-05-16
> **Built by:** not started

---

## What This Does (Plain English)

Every time a menu gets duplicated, cloned, instantiated from a template, or applied to an event, the new menu remembers where it came from. You can trace any menu back to its original ancestor and see every version that branched off it. Menus that get forked a lot automatically surface as your strongest templates.

Think of it like a family tree for menus. The original is the root. Every copy, customization, or seasonal refresh is a branch. You always know the full history.

---

## Why It Matters

1. **Client conversations become traceable.** "I liked that menu from your portfolio, but swap the fish" creates a fork. Six months later you can see exactly which showcase menu inspired it.
2. **Your best work surfaces automatically.** A menu forked 12 times is clearly a winner. That signal feeds template suggestions, so your proven menus get recommended first.
3. **Revision history lives in the data.** When you iterate with a client (original, v1, v2, final), the chain is visible. No guessing which version came from where.
4. **Recipe improvements propagate visibility.** If you improve a recipe, you can see every menu that descended from a template using that recipe, so you know who benefits.
5. **Portfolio intelligence.** "Which of my showcase menus actually convert into real dinners?" becomes answerable.

---

## The Problem Today

`duplicateMenu()` does a full deep copy (menu, dishes, components) but the new menu has zero memory of its parent. Same with `cloneMenu()`, `createMenuFromTemplate()`, and `applyMenuToEvent()`. Every copy is an orphan.

You cannot answer:

- Which showcase menu inspired this client's dinner menu?
- How many times has this template been forked (beyond the `times_used` counter)?
- What is the revision chain for this client's menu iterations?
- Which of my original menus are the most productive ancestors?

The `recipes` table already has `forked_from_id` (migration `20260510000015`). Menus need the same treatment, extended with generation tracking and fork-reason tagging.

---

## How It Works

### Fork Recording

Every function that creates a menu from an existing menu sets three new columns:

| Column            | Value                                  |
| ----------------- | -------------------------------------- |
| `forked_from_id`  | The UUID of the source menu            |
| `fork_generation` | Source menu's `fork_generation + 1`    |
| `fork_reason`     | Why the fork happened (enum-like TEXT) |

Fork reasons:

| Reason                   | When                                                              |
| ------------------------ | ----------------------------------------------------------------- |
| `client_customization`   | Chef duplicates a menu to tailor it for a specific client request |
| `chef_iteration`         | Chef clones their own working menu to try a new direction         |
| `template_instantiation` | `createMenuFromTemplate()` or `applyMenuToEvent()` on a template  |
| `proposal_variant`       | Chef creates multiple menu options for a client to choose from    |
| `seasonal_refresh`       | Chef updates a menu for a new season (forking the old version)    |

The `fork_reason` defaults to `chef_iteration` when called via `duplicateMenu()`/`cloneMenu()` directly. Callers can override it.

### Lineage Queries

Two query directions from any menu:

1. **Ancestors (walk up):** Follow `forked_from_id` recursively until `forked_from_id IS NULL` (the root). Returns the full chain from current menu to original.
2. **Descendants (walk down):** Find all menus where `forked_from_id = this menu's id`, then recurse. Returns the full tree of forks.

Both use a recursive CTE, bounded by `fork_generation` (safety cap at 50 to prevent runaway recursion on corrupted data).

### Fork Count

A menu's "fork count" is `SELECT COUNT(*) FROM menus WHERE forked_from_id = :id AND deleted_at IS NULL`. This is a live query, not a cached counter, because menus can be deleted. The existing `times_used` column on templates stays as-is (it tracks event attachment, not forking).

### Template Suggestion Boost

`suggestTemplate()` in `lib/menus/template-actions.ts` currently orders by `times_used ASC, last_used_at ASC` (least-used first). Add a secondary ranking signal: menus with high fork counts get a boost score. This does not replace the existing rotation logic; it breaks ties.

### Lineage UI

On the menu detail page, if `forked_from_id` is set:

- Show a small badge: "Forked from [Parent Menu Name]" with a link to the parent
- If the parent is deleted, show "Forked from [deleted menu]" (no link)

On any menu that has been forked (fork count > 0):

- Show a badge: "Forked N times"
- Clicking it expands an inline list of direct children (one level, not full tree)

### Visual Lineage Tree (v2, optional)

A dedicated "Lineage" tab or panel on the menu detail page showing the full ancestor/descendant tree as a vertical node graph. Not required for v1 of this spec.

---

## Files to Create

| File                                                       | Purpose                                                                                                    |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `database/migrations/20260516200000_menu_fork_lineage.sql` | Migration: add columns + indexes                                                                           |
| `lib/menus/lineage-actions.ts`                             | Server actions: `getMenuLineage()`, `getMenuDescendants()`, `getMenuForkCount()`, `getMenuAncestorChain()` |
| `components/menus/menu-lineage-badge.tsx`                  | "Forked from X" badge + "Forked N times" badge                                                             |

---

## Files to Modify

| File                                           | Change                                                                                                                                                                                                                                                                    |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/menus/actions.ts`                         | `duplicateMenu()`: accept optional `forkReason`, set `forked_from_id`, `fork_generation`, `fork_reason` on insert. `cloneMenu()`: pass `chef_iteration` as default reason. `applyMenuToEvent()`: when duplicating template/showcase, set `template_instantiation` reason. |
| `lib/menus/template-actions.ts`                | `createMenuFromTemplate()`: set `forked_from_id` (to the template's source menu if one exists, or null), `fork_generation: 0`, `fork_reason: 'template_instantiation'`. `suggestTemplate()`: add fork-count boost to ranking.                                             |
| `app/(chef)/menus/[id]/page.tsx`               | Import and render `MenuLineageBadge`, pass `forked_from_id` and fork count.                                                                                                                                                                                               |
| `app/(chef)/menus/[id]/menu-detail-client.tsx` | Accept lineage props, render badge in header area.                                                                                                                                                                                                                        |
| `types/database.ts`                            | Add `forked_from_id`, `fork_generation`, `fork_reason` to Menu type.                                                                                                                                                                                                      |
| `lib/menus/index.ts`                           | Re-export lineage actions.                                                                                                                                                                                                                                                |

---

## Database Changes

### Migration: `20260516200000_menu_fork_lineage.sql`

```sql
-- Menu Fork Lineage: track parent-child relationships between menus
-- Additive only. No existing data modified.

-- 1. Add lineage columns to menus
ALTER TABLE menus ADD COLUMN IF NOT EXISTS forked_from_id UUID REFERENCES menus(id) ON DELETE SET NULL;
ALTER TABLE menus ADD COLUMN IF NOT EXISTS fork_generation INTEGER NOT NULL DEFAULT 0;
ALTER TABLE menus ADD COLUMN IF NOT EXISTS fork_reason TEXT;

COMMENT ON COLUMN menus.forked_from_id IS 'The menu this was forked/duplicated from. NULL = original.';
COMMENT ON COLUMN menus.fork_generation IS '0 = original, 1 = first fork, 2 = fork of a fork, etc.';
COMMENT ON COLUMN menus.fork_reason IS 'Why the fork was created: client_customization, chef_iteration, template_instantiation, proposal_variant, seasonal_refresh.';

-- 2. Index for lineage lookups (children of a parent)
CREATE INDEX IF NOT EXISTS idx_menus_forked_from
  ON menus(forked_from_id)
  WHERE forked_from_id IS NOT NULL;

-- 3. Index for fork-count aggregations (popular templates)
CREATE INDEX IF NOT EXISTS idx_menus_fork_generation
  ON menus(tenant_id, fork_generation);

-- 4. RLS: forked_from_id inherits existing menus RLS policies.
--    No new policies needed because SELECT/INSERT/UPDATE on menus
--    already enforce tenant_id scoping. The FK just points to another
--    row in the same table under the same tenant.

-- 5. Constraint: fork_generation must be non-negative
ALTER TABLE menus ADD CONSTRAINT chk_menus_fork_generation_positive CHECK (fork_generation >= 0);

-- 6. Constraint: fork_reason must be a known value (or NULL for originals)
ALTER TABLE menus ADD CONSTRAINT chk_menus_fork_reason_valid
  CHECK (fork_reason IS NULL OR fork_reason IN (
    'client_customization',
    'chef_iteration',
    'template_instantiation',
    'proposal_variant',
    'seasonal_refresh'
  ));
```

### Recursive CTE for Ancestor Chain

```sql
-- Walk up from a menu to its root ancestor
WITH RECURSIVE ancestors AS (
  SELECT id, forked_from_id, fork_generation, fork_reason, name, 1 AS depth
  FROM menus
  WHERE id = :menu_id AND tenant_id = :tenant_id

  UNION ALL

  SELECT m.id, m.forked_from_id, m.fork_generation, m.fork_reason, m.name, a.depth + 1
  FROM menus m
  JOIN ancestors a ON m.id = a.forked_from_id
  WHERE m.tenant_id = :tenant_id AND a.depth < 50
)
SELECT * FROM ancestors ORDER BY depth ASC;
```

### Recursive CTE for Descendants

```sql
-- Walk down from a menu to all its forks (full tree)
WITH RECURSIVE descendants AS (
  SELECT id, forked_from_id, fork_generation, fork_reason, name, 0 AS depth
  FROM menus
  WHERE id = :menu_id AND tenant_id = :tenant_id

  UNION ALL

  SELECT m.id, m.forked_from_id, m.fork_generation, m.fork_reason, m.name, d.depth + 1
  FROM menus m
  JOIN descendants d ON m.forked_from_id = d.id
  WHERE m.tenant_id = :tenant_id AND m.deleted_at IS NULL AND d.depth < 50
)
SELECT * FROM descendants WHERE depth > 0 ORDER BY depth ASC, name ASC;
```

---

## State Machine / Rules

1. **Fork recording is write-once.** Once `forked_from_id` is set on a menu, it never changes. The lineage is immutable. You can delete a forked menu, but you cannot re-parent it.

2. **Deleted parents do not break children.** `ON DELETE SET NULL` means if the parent menu is deleted, `forked_from_id` becomes NULL. The child still exists; it just loses its parent link. `fork_generation` and `fork_reason` remain intact so the history is not fully lost.

3. **Cross-tenant forking is impossible.** The FK references `menus(id)` and all queries filter by `tenant_id`. A chef can only fork their own menus.

4. **Template instantiation lineage.** `createMenuFromTemplate()` creates from JSONB (not a real menu row), so `forked_from_id` stays NULL for template-instantiated menus unless the template itself was derived from a real menu. The `fork_reason` is still set to `template_instantiation` for tracking purposes.

5. **Generation is computed at fork time, not dynamically.** This avoids expensive recursive lookups on every read. If a parent is deleted (breaking the chain), the child's `fork_generation` remains accurate as of when it was forked.

6. **Fork reason can be set by the caller.** `duplicateMenu()` accepts an optional `forkReason` parameter. If not provided, it defaults to `chef_iteration`. UI can pass the appropriate reason based on context (e.g., the "Create Proposal Variant" button passes `proposal_variant`).

---

## Edge Cases

| Scenario                                             | Handling                                                                                                                                                                                                                                                                                     |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fork a fork of a fork**                            | Works naturally. Generation increments each time. CTE recursion cap (50) prevents infinite loops on corrupted data.                                                                                                                                                                          |
| **Delete the root menu**                             | All direct children get `forked_from_id = NULL` (ON DELETE SET NULL). Grandchildren are unaffected (they point to the children, not the root). The tree becomes a forest.                                                                                                                    |
| **Fork a menu from a different tenant**              | Impossible. All queries and inserts are tenant-scoped. The FK constraint plus RLS prevent cross-tenant references.                                                                                                                                                                           |
| **Bulk import / migration of old menus**             | Existing menus get `forked_from_id = NULL`, `fork_generation = 0`, `fork_reason = NULL`. They are all "originals." No backfill needed.                                                                                                                                                       |
| **Menu restored from soft-delete**                   | `forked_from_id` persists through soft-delete. Restoring a menu restores its lineage link.                                                                                                                                                                                                   |
| **Circular reference**                               | Impossible by construction. A menu can only be forked from an existing menu (which already has its generation set). You cannot fork a menu from itself, and the generation always increments, so cycles cannot form.                                                                         |
| **Template JSONB instantiation**                     | `createMenuFromTemplate()` works from `menu_templates` (JSONB), not `menus`. The resulting menu gets `forked_from_id = NULL` (no real menu parent) but `fork_reason = 'template_instantiation'`. If a future feature links `menu_templates` to source `menus`, the FK can be populated then. |
| **`applyMenuToEvent()` on a non-template menu**      | No duplication happens (menu is attached directly). No lineage columns are set. This is correct: no fork occurred.                                                                                                                                                                           |
| **`applyMenuToEvent()` on a template/showcase menu** | Duplication happens via `duplicateMenu()`. The new menu gets `forked_from_id` pointing to the template/showcase menu, `fork_reason = 'template_instantiation'`.                                                                                                                              |
| **High fork count performance**                      | Fork count is a simple `COUNT(*)` with an indexed column (`idx_menus_forked_from`). Even at 1000+ forks per menu, this is sub-millisecond on the partial index.                                                                                                                              |
| **Concurrent forks of the same menu**                | No conflict. Each fork creates a new row. `fork_generation` is computed from the parent's value at fork time, not from a counter. Two simultaneous forks of the same parent both get `parent.fork_generation + 1`.                                                                           |

---

## Definition of Done

- [ ] Migration `20260516200000_menu_fork_lineage.sql` applied. Columns, indexes, constraints exist.
- [ ] `duplicateMenu()` sets `forked_from_id`, `fork_generation`, `fork_reason` on the new menu. Accepts optional `forkReason` parameter (defaults to `chef_iteration`).
- [ ] `cloneMenu()` passes `chef_iteration` as fork reason through to `duplicateMenu()`.
- [ ] `applyMenuToEvent()` passes `template_instantiation` when duplicating a template/showcase.
- [ ] `createMenuFromTemplate()` sets `fork_reason = 'template_instantiation'` on the new menu. Sets `forked_from_id = NULL` (JSONB source, no real menu parent).
- [ ] `getMenuAncestorChain(menuId)` returns ordered array from current menu to root.
- [ ] `getMenuDescendants(menuId)` returns tree of all forks (with depth).
- [ ] `getMenuForkCount(menuId)` returns count of direct children (not deleted).
- [ ] `MenuLineageBadge` renders "Forked from [Name]" with link when `forked_from_id` is set.
- [ ] `MenuLineageBadge` renders "Forked N times" when fork count > 0.
- [ ] Menu detail page (`app/(chef)/menus/[id]/page.tsx`) shows lineage badge.
- [ ] `suggestTemplate()` uses fork count as a tiebreaker signal in ranking.
- [ ] Types updated in `types/database.ts` for new columns.
- [ ] Existing menus unaffected (default values: `NULL`, `0`, `NULL`).
- [ ] `npx tsc --noEmit --skipLibCheck` passes.
- [ ] `npx next build --no-lint` passes.
