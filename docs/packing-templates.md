# Equipment Packing Templates

## What It Is

Reusable packing list templates by event type. Instead of building a packing list from scratch for every event, the chef selects a template and customizes.

Examples: "Intimate Dinner for 2" always needs knife roll, cutting board, saute pan. "Corporate Lunch for 50" needs sheet trays, chafing dishes, serving utensils.

## Database

**Table:** `packing_templates`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | Auto-generated |
| chef_id | uuid FK -> chefs | Scoped to chef |
| name | text | Template name |
| description | text | Optional description |
| items | jsonb | Array of {name, quantity, category, notes} |
| event_type | text | Optional, for auto-suggesting matching templates |
| is_default | boolean | Chef's go-to template (shown first) |
| created_at | timestamptz | Auto-set |
| updated_at | timestamptz | Auto-updated via trigger |

**RLS:** chef_id scoping via user_roles join.

**Migration:** `supabase/migrations/20260330000077_packing_templates.sql`

## Server Actions

**File:** `lib/packing/template-actions.ts`

- `createPackingTemplate(data)` - Create a new template
- `updatePackingTemplate(id, data)` - Update an existing template
- `deletePackingTemplate(id)` - Delete a template
- `getPackingTemplates()` - Get all templates for the current chef
- `getPackingTemplate(id)` - Get a single template
- `applyTemplateToEvent(templateId, eventId)` - Returns template items for client-side use
- `saveEventPackingAsTemplate(eventId, name)` - Save current event's packing data as a template
- `getTemplatesForEventType(eventType)` - Get templates matching an event type (for auto-suggest)

All actions use `requireChef()` for auth and `chef_id` from session.

## UI Components

### Template Manager Page
- **Route:** `/packing-templates`
- **Files:** `app/(chef)/packing-templates/page.tsx`, `app/(chef)/packing-templates/packing-templates-client.tsx`
- Lists all templates as cards with name, item count, category breakdown, event type tag
- Create/edit/delete operations
- Editor component inline (no separate route)

### Template Editor
- **File:** `components/packing/packing-template-editor.tsx`
- Name, description, event type dropdown, default toggle
- Items list with add/remove/reorder
- Each item: name, quantity, category (Knives/Cookware/Utensils/Serving/Storage/Linens/Misc), notes

### Event Pack Page Integration
- **File:** `components/packing/pack-page-template-bar.tsx`
- Added to `app/(chef)/events/[id]/pack/page.tsx` above the interactive checklist
- "Load Template" dropdown to pre-fill from a saved template
- "Save as Template" to save current event's packing list
- "Manage Templates" link to the templates page

### Load Template Dropdown
- **File:** `components/packing/load-template-dropdown.tsx`
- Reusable dropdown that fetches templates on open and applies them

## How It Connects

The existing packing system generates packing lists dynamically from event/menu data (food items by transport zone, equipment from client and event settings). Templates are a complementary layer: the chef can pre-load equipment items from a template, and the auto-generated food items still come from the menu.
