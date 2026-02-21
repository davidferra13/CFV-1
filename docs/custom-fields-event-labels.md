# Custom Fields & Event Labels — Implementation Notes

Feature set: 7.1 (Custom Field Builder) and 7.2 (Custom Event Types / Status Labels)
Branch: fix/grade-improvements
Migrations: 20260311000001, 20260311000002

---

## Feature 7.1 — Custom Field Builder

### What it does

Chefs can add arbitrary metadata fields to events, clients, and recipes without schema changes. Fields are displayed in the settings page and can be read/written alongside the built-in model fields.

### EAV pattern overview

The system uses an Entity-Attribute-Value (EAV) approach:

- `custom_field_definitions` — one row per field a chef defines (the "attribute")
- `custom_field_values` — one row per field value per entity instance (the "value")

Each value row stores only the column that matches its field type:

| Field type     | Column written          |
|----------------|-------------------------|
| text           | `value_text`            |
| number         | `value_number`          |
| date           | `value_date`            |
| toggle         | `value_boolean`         |
| select         | `value_text`            |
| multi_select   | `value_json` (string[]) |

A `UNIQUE (entity_id, field_definition_id)` constraint allows upserts.

### How to read custom field values in a form

```typescript
import {
  getCustomFieldDefinitions,
  getCustomFieldValues,
  saveCustomFieldValues,
} from '@/lib/custom-fields/actions'

// In a server component or action:
const defs = await getCustomFieldDefinitions('event')   // entity_type = 'event' | 'client' | 'recipe'
const valueMap = await getCustomFieldValues(eventId)    // keyed by field_definition_id

// valueMap[def.id].value_text   — for text / select
// valueMap[def.id].value_number — for number
// valueMap[def.id].value_boolean — for toggle
// valueMap[def.id].value_json  — for multi_select (string[])
```

### How to save custom field values

```typescript
// values is Record<field_definition_id, rawValue>
await saveCustomFieldValues(entityId, {
  'uuid-of-def-1': 'Vegan',
  'uuid-of-def-2': 4,
  'uuid-of-def-3': ['Option A', 'Option B'],
})
```

`saveCustomFieldValues` looks up each definition's type and routes the value to the correct column automatically.

### Settings UI

- Page: `app/(chef)/settings/custom-fields/page.tsx`
- Component: `components/settings/custom-field-builder.tsx`

The builder shows three cards (Events / Clients / Recipes), each listing existing fields. A top-level "Add Custom Field" button reveals an inline form.

---

## Feature 7.2 — Custom Event Types / Status Labels

### What it does

Chefs can rename the 6 built-in occasion types (Wedding, Birthday, etc.) and the 8 FSM status labels (draft, proposed, …) to their preferred terminology. The database FSM state values are unchanged — only display labels differ.

### Schema

`chef_event_type_labels` stores one override row per `(tenant_id, default_label, label_type)`. The unique constraint allows a simple upsert. When a chef resets a label to its default, the row is deleted so there is no stale override.

### Using labels in the UI

```typescript
import { getEventLabels, DEFAULT_OCCASION_TYPES, DEFAULT_STATUS_LABELS } from '@/lib/event-labels/actions'
import { buildLabelMap } from '@/lib/event-labels/utils'

const rows = await getEventLabels()
const occasionLabels = buildLabelMap(rows, 'occasion_type', DEFAULT_OCCASION_TYPES)
// occasionLabels['Wedding'] => 'Intimate Dinner'  (or 'Wedding' if not customised)

const statusLabels = buildLabelMap(rows, 'status_label', DEFAULT_STATUS_LABELS)
// statusLabels['draft'] => 'Inquiry'  (or 'draft' if not customised)
```

### Settings UI

- Page: `app/(chef)/settings/event-types/page.tsx`
- Component: `components/settings/event-label-editor.tsx`

The editor renders two cards (Occasion Types / Status Labels). Each row shows the immutable default label (monospace), an arrow, and an editable input. Changes are persisted automatically with a 500 ms debounce — no Save button required. A "Saved" tick confirms the write. A reset button (circular arrow) reverts the label to its default.

---

## Migration apply instructions

> **Back up the database before applying to production.**

```bash
# Apply both migrations via Supabase linked remote (no Docker)
supabase db push --linked
```

The migrations are additive:
- 20260311000001 creates `custom_field_definitions` and `custom_field_values` with RLS.
- 20260311000002 creates `chef_event_type_labels` with RLS.

No existing tables or columns are altered.

---

## RLS pattern

Both features use the same tenant-isolation policy:

```sql
CREATE POLICY "tenant_isolation" ON <table>
  FOR ALL
  USING (
    tenant_id IN (
      SELECT entity_id FROM user_roles
      WHERE auth_user_id = auth.uid()
        AND role = 'chef'
    )
  );
```

This matches the pattern used throughout the rest of the schema.

---

## File summary

| File | Purpose |
|------|---------|
| `supabase/migrations/20260311000001_custom_fields.sql` | EAV schema for custom field definitions and values |
| `supabase/migrations/20260311000002_chef_event_labels.sql` | Schema for per-chef occasion type and status label overrides |
| `lib/custom-fields/actions.ts` | Server actions: get/create/delete definitions, get/save values |
| `lib/event-labels/actions.ts` | Server actions: get/upsert/reset label overrides; default label constants |
| `lib/event-labels/utils.ts` | Pure helper: `buildLabelMap` (usable in both server and client contexts) |
| `app/(chef)/settings/custom-fields/page.tsx` | Settings page — custom fields |
| `app/(chef)/settings/event-types/page.tsx` | Settings page — event types and status labels |
| `components/settings/custom-field-builder.tsx` | Client component — field creation form + list |
| `components/settings/event-label-editor.tsx` | Client component — debounced inline label editor |
