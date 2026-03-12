# Event Templates - Build Notes

**Date:** 2026-03-12
**Branch:** `feature/risk-gap-closure`
**Roadmap item:** #3

## What was built

Reusable event templates that let chefs save event configurations and apply them when creating new events.

### Database

- **Migration:** `20260401000003_event_templates.sql`
- **Table:** `event_templates` with RLS (tenant-scoped)
- **Fields stored:** occasion, service style, guest count, timing defaults, location defaults, pricing defaults, dietary defaults, notes
- **Tracking:** `usage_count` and `last_used_at` for most-used sorting

### Server Actions

- **File:** `lib/events/template-actions.ts`
- `listEventTemplates()` - sorted by most-used
- `createEventTemplate()` - from scratch
- `createTemplateFromEvent()` - save existing event as template
- `updateEventTemplate()` - edit template
- `deleteEventTemplate()` - remove template
- `recordTemplateUsage()` - non-blocking counter increment

### UI Components

- **Save as Template button:** `components/events/save-as-template-button.tsx`
  - Added to event detail page action bar
  - Inline name input with Enter/Escape keyboard support
  - Toast feedback on success/failure

- **Template Picker:** `components/events/event-template-picker.tsx`
  - Shown in create mode at top of Step 1
  - Auto-hides when no templates exist (zero state handled)
  - Pre-fills: occasion, serve time, guest count, location, pricing, deposit
  - Does NOT override client selection or date (those are event-specific)

## How it connects

- Templates build on the same field set as `cloneEvent()` (clone-actions.ts)
- Templates are tenant-scoped (chef's own templates only)
- The template picker is lazy-loaded and invisible until the chef saves their first template
- Usage tracking enables "most used" sorting for power users with many templates

## Migration safety

- Additive only (new table, no existing tables modified)
- No DROP, DELETE, or ALTER on existing structures
