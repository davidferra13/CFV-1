# Equipment & Packing Checklist (Feature 2.6)

## Overview

Auto-generate what equipment to bring to a client's kitchen based on what the chef owns. Tracks packing status before events and return status after events.

## How It Works

1. **Chef adds their equipment** to a personal inventory, organized by category (cookware, knives, appliances, etc.)
2. **Before an event**, the chef generates a packing checklist from their equipment inventory
3. **Gap analysis** (deterministic, no AI): compares chef's equipment against client kitchen inventory to show only what the client doesn't have. Until client kitchen inventory exists (feature 2.5), all equipment is included.
4. **During packing**, the chef checks off items as they pack them. A progress bar shows completion.
5. **After the event**, the chef marks items as returned to ensure nothing gets left behind.

## Database Tables

- `chef_equipment` - Chef's personal equipment inventory (name, category, quantity, notes). UNIQUE on (chef_id, name).
- `packing_checklists` - One per event (or standalone). Links to chef, event, and optionally client.
- `packing_checklist_items` - Individual items on a checklist with packed/returned toggles.

All tables have RLS scoped to the chef via `chef_id`.

## Key Files

| File | Purpose |
|------|---------|
| `supabase/migrations/20260401000032_packing_checklists.sql` | Schema |
| `lib/equipment/packing-actions.ts` | Server actions (CRUD, gap analysis, checklist generation) |
| `components/equipment/equipment-inventory.tsx` | Equipment management UI |
| `components/equipment/packing-checklist.tsx` | Checklist view with pack/return toggles |
| `components/events/packing-checklist-button.tsx` | Event detail integration button |

## Equipment Categories

cookware, bakeware, knives, utensils, appliances, serving, transport, cleaning, specialty, other

## Design Decisions

- **Formula over AI**: Gap analysis and checklist generation use pure deterministic logic. No Ollama calls.
- **Print-friendly view**: The checklist has a print mode for chefs who want a physical list.
- **Return tracking**: Post-event, chefs can mark items as returned. Helps prevent leaving equipment at client locations.
- **Manual items**: Chefs can add one-off items to any checklist beyond their standard inventory.
- **Existing checklist reuse**: If a checklist already exists for an event, it opens that instead of creating a duplicate.

## Future Integration Points

- Client kitchen inventory (feature 2.5): Once available, `getClientKitchenGaps()` will filter equipment to only items the client lacks.
- Menu/recipe equipment requirements: Could cross-reference recipe equipment needs with chef inventory.
- AAR (After Action Review): Forgotten items from AARs could auto-populate future checklists.
