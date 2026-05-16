# Spec: Menu Provenance System

> **Status:** SPEC-READY
> **Priority:** P0
> **Depends on:** None (foundational, other menu specs build on this)
> **Estimated complexity:** small (5-7 files)
> **Created:** 2026-05-16
> **Built by:** not started

---

## What This Does (Plain English)

Every menu you create now carries a birth certificate. When you build one from scratch, fork an old dinner, upload a PDF from 2019, or instantiate a template, the system remembers how that menu came to exist. A small badge on the menu detail page shows its origin at a glance. You can filter your menu list by origin type ("show me all my uploaded menus" or "which menus came from templates?"). Over time, analytics reveal which origin types produce the most successful dinners.

---

## Why It Matters

1. **Creative ownership clarity.** A menu you designed from nothing is different from one a client handed you. Knowing the difference affects how you price, how much creative latitude you take, and how proudly you showcase it.
2. **Fork lineage.** When you duplicate a proven 6-course winter menu and adapt it for spring, the original deserves credit. You can trace back through generations of menus to find the "ancestor" that started a pattern.
3. **Template effectiveness.** If templated menus get served 80% of the time but uploaded menus only 40%, you know where to invest energy.
4. **Archive recovery tracking.** Uploaded menus from old PDFs may need modernization. Tagging them means you can batch-review everything recovered from archives.
5. **Recommendation engine fuel.** When the system suggests a menu and you use it, tracking that origin lets the engine learn what suggestions land.

---

## The Problem Today

- `duplicateMenu()` creates a copy with no reference to the original. The parent menu gets no credit, no analytics link.
- `createMenuFromTemplate()` pulls from `menu_templates` but the resulting menu has no record of which template spawned it.
- `processUploadJob()` and `processFromPastedText()` create menus from external text with no origin marker. You cannot distinguish "typed from scratch" from "OCR'd from a photo."
- `createMenu()` is the default path with no differentiation between chef-initiated blank canvas and other creation contexts.
- No way to filter menus by how they were created.
- No analytics on which creation paths produce the best outcomes.

---

## How It Works

### Origin Types (enum)

| Value             | Trigger                                          | Meaning                                 |
| ----------------- | ------------------------------------------------ | --------------------------------------- |
| `chef_created`    | `createMenu()` called directly                   | Chef started from blank canvas          |
| `client_provided` | Future client submission path                    | Client sent the menu, chef is executing |
| `forked`          | `duplicateMenu()` / `cloneMenu()`                | Derivative of an existing menu          |
| `templated`       | `createMenuFromTemplate()`                       | Instantiated from a proven template     |
| `uploaded`        | `processUploadJob()` / `processFromPastedText()` | Recovered from file or pasted text      |
| `suggested`       | Future suggestion engine instantiation           | System recommended, chef accepted       |
| `collaborative`   | Future collaborative creation path               | Built together with client input        |

### Origin Metadata (JSONB, per-type)

```typescript
type OriginMetadata =
  | { type: 'forked'; forked_from_id: string; fork_reason?: string; fork_generation: number }
  | { type: 'templated'; template_id: string; template_name: string; seasonal_context?: string }
  | { type: 'uploaded'; source_filename: string; upload_format: string; parse_confidence?: number }
  | {
      type: 'suggested'
      suggestion_engine: string
      suggestion_reason: string
      suggestion_score?: number
    }
  | {
      type: 'client_provided'
      submission_method: string
      original_text?: string
      client_id?: string
    }
  | { type: 'collaborative'; initiator: string; participant_ids: string[]; turn_count: number }
  | { type: 'chef_created' } // no extra metadata needed
```

### Creation Path Wiring

Each existing function gets a 2-line addition at insert time:

- **`createMenu()`** in `lib/menus/actions.ts`: sets `origin_type: 'chef_created'`, `origin_metadata: {}`
- **`duplicateMenu()`** in `lib/menus/actions.ts`: sets `origin_type: 'forked'`, `origin_metadata: { type: 'forked', forked_from_id: menuId, fork_generation: (original.origin_metadata?.fork_generation ?? 0) + 1 }`
- **`cloneMenu()`** in `lib/menus/actions.ts`: same as duplicateMenu (delegates to it)
- **`createMenuFromTemplate()`** in `lib/menus/template-actions.ts`: sets `origin_type: 'templated'`, `origin_metadata: { type: 'templated', template_id: templateId, template_name: template.name, seasonal_context: template.season }`
- **`processUploadJob()`** in `lib/menus/upload-actions.ts`: sets `origin_type: 'uploaded'`, `origin_metadata: { type: 'uploaded', source_filename: fileName, upload_format: ext, parse_confidence: ocrConfidence }`
- **`processFromPastedText()`** in `lib/menus/upload-actions.ts`: sets `origin_type: 'uploaded'`, `origin_metadata: { type: 'uploaded', source_filename: 'Pasted Text', upload_format: 'text', parse_confidence: 1.0 }`

### UI: Provenance Badge

On the menu detail page (`app/(chef)/culinary/menus/[id]/page.tsx`), a small inline badge appears near the menu title:

- Icon + short label (e.g., fork icon + "Forked from Winter Tasting 2024")
- Clicking the badge on forked menus navigates to the parent menu
- Templated menus link back to the template
- Uploaded menus show the source filename
- Chef-created shows a simple pen icon, no link

### UI: Origin Filter

On the menu list page (`app/(chef)/culinary/menus/page.tsx`), add origin_type to the existing filter controls. Dropdown or pill filter with the 7 origin types.

---

## Files to Create

| File                                                     | Purpose                                              |
| -------------------------------------------------------- | ---------------------------------------------------- |
| `database/migrations/20260516200000_menu_provenance.sql` | Add columns to menus table                           |
| `lib/menus/provenance-types.ts`                          | TypeScript types for origin_type and origin_metadata |
| `components/menus/provenance-badge.tsx`                  | Visual badge component                               |

## Files to Modify

| File                                      | Change                                                                                               |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `lib/menus/actions.ts`                    | Add origin_type + origin_metadata to `createMenu()` and `duplicateMenu()` inserts                    |
| `lib/menus/template-actions.ts`           | Add origin_type + origin_metadata to `createMenuFromTemplate()` insert                               |
| `lib/menus/upload-actions.ts`             | Add origin_type + origin_metadata to `processUploadJob()` and `processFromPastedText()` menu inserts |
| `app/(chef)/culinary/menus/[id]/page.tsx` | Render ProvenanceBadge near menu title                                                               |
| `app/(chef)/culinary/menus/page.tsx`      | Add origin_type filter to list controls                                                              |

---

## Database Changes

### Migration: `20260516200000_menu_provenance.sql`

```sql
-- Menu Provenance System: track how each menu was created
-- ADDITIVE ONLY: two new columns with defaults, no data loss risk

ALTER TABLE menus
  ADD COLUMN IF NOT EXISTS origin_type TEXT NOT NULL DEFAULT 'chef_created';

ALTER TABLE menus
  ADD COLUMN IF NOT EXISTS origin_metadata JSONB NOT NULL DEFAULT '{}';

-- Constrain origin_type to known values
ALTER TABLE menus
  ADD CONSTRAINT menus_origin_type_check
  CHECK (origin_type IN (
    'chef_created',
    'client_provided',
    'forked',
    'templated',
    'uploaded',
    'suggested',
    'collaborative'
  ));

-- Index for filtering by origin type (per tenant)
CREATE INDEX IF NOT EXISTS idx_menus_origin_type
  ON menus (tenant_id, origin_type)
  WHERE deleted_at IS NULL;

-- Backfill: all existing menus default to 'chef_created' (applied by DEFAULT above)
-- No UPDATE needed since DEFAULT handles it for NOT NULL columns

COMMENT ON COLUMN menus.origin_type IS 'How this menu was created: chef_created, forked, templated, uploaded, suggested, client_provided, collaborative';
COMMENT ON COLUMN menus.origin_metadata IS 'Origin-specific data (parent menu ID for forks, template ID for templated, filename for uploads, etc.)';
```

---

## State Machine / Rules

1. **origin_type is immutable.** Once set at creation, it never changes. A menu born from a template is always "templated" even if you later gut it completely.
2. **origin_metadata is append-only.** Additional context can be added (e.g., fork_reason after the fact) but existing keys must not be removed.
3. **fork_generation increments.** Fork of a fork of a fork = generation 3. Allows tracing lineage depth.
4. **Deleted parent menus do not break provenance.** If the forked_from_id menu is deleted, the badge shows "Original menu removed" instead of a dead link.
5. **origin_type defaults to 'chef_created'.** Any menu created through an unpatched code path gets the most conservative default.
6. **Tenant scoping.** origin_metadata references (forked_from_id, template_id) must belong to the same tenant. Cross-tenant provenance is impossible.

---

## Edge Cases

| Scenario                                                                   | Handling                                                                                                     |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Menu forked from a menu that was itself forked                             | fork_generation increments. Badge shows immediate parent only.                                               |
| Template deleted after menu was created from it                            | Badge shows template_name from metadata (stored at creation time). No dead link.                             |
| Upload with 0% OCR confidence                                              | Still marked 'uploaded'. parse_confidence: 0 signals manual review needed.                                   |
| Menu created via AI agent actions (`lib/ai/agent-actions/menu-actions.ts`) | Route through `createMenu()` so inherits 'chef_created'. If AI-suggested path added later, gets 'suggested'. |
| Bulk import of old menus                                                   | All get 'uploaded' with source_filename indicating the batch.                                                |
| Client provides a menu via email (future path)                             | 'client_provided' with submission_method: 'email'.                                                           |
| Menu created via `createMenuWithCourses()`                                 | Delegates to `createMenu()`, inherits 'chef_created'.                                                        |
| origin_type column missing on old DB (migration not yet run)               | Default 'chef_created' ensures no breakage. Code uses optional chaining on origin_metadata.                  |

---

## Definition of Done

- [ ] Migration runs clean on production DB (additive, no data loss)
- [ ] All 6 existing menu creation paths set correct origin_type and origin_metadata
- [ ] `duplicateMenu()` records forked_from_id and increments fork_generation
- [ ] `createMenuFromTemplate()` records template_id and template_name
- [ ] `processUploadJob()` records source_filename, upload_format, and parse_confidence
- [ ] ProvenanceBadge renders on menu detail page for all 7 origin types
- [ ] Forked menu badge links to parent menu (or shows "removed" if parent deleted)
- [ ] Templated menu badge links to template (or shows template name if deleted)
- [ ] Menu list page supports filtering by origin_type
- [ ] Existing menus display as 'chef_created' (the default) with no errors
- [ ] TypeScript types exported from `lib/menus/provenance-types.ts` are used in all creation paths
- [ ] No regressions in `createMenu`, `duplicateMenu`, `cloneMenu`, `createMenuFromTemplate`, `processUploadJob`, `processFromPastedText`
- [ ] origin_type column has CHECK constraint preventing invalid values
- [ ] Index exists for tenant_id + origin_type filtered queries
