# Kitchen Inventory per Client System

**Date:** 2026-03-15
**Status:** Tables + actions + UI components built; not yet wired into client detail page or event detail page.

## What This Is

Tracks what equipment each client's kitchen has, so chefs know what to bring. Also tracks the chef's own portable equipment. Gap analysis generates a packing list showing what the chef needs to bring (or source externally).

No competitor does this. Private chefs currently track kitchen equipment in their heads or scattered notes.

## Database Tables

### `client_kitchen_inventory`

- Scoped by `tenant_id` + `client_id`
- Categories: cookware, appliance, utensil, storage, servingware, other
- Condition tracking: good, fair, poor, missing
- `last_verified_at` timestamp for freshness tracking

### `chef_equipment_master`

- Scoped by `tenant_id`
- Same categories as client inventory
- `is_portable` boolean (only portable items appear on packing lists)

Both tables have RLS with tenant isolation.

## Server Actions

File: `lib/clients/kitchen-inventory-actions.ts`

- `getClientKitchenInventory(clientId)` / `addKitchenItem` / `updateKitchenItem` / `deleteKitchenItem`
- `getChefEquipment()` / `addChefEquipment` / `updateChefEquipment` / `deleteChefEquipment`
- `generatePackingList(clientId)` - Gap analysis: compares client kitchen vs chef equipment
- `applyKitchenTemplate(clientId, template)` - Pre-populates with common items (minimal/basic/well-equipped)

## UI Components

### `components/clients/kitchen-inventory-panel.tsx`

- Grouped by category with condition badges (green/yellow/red)
- Add/edit/delete inline forms
- "Apply Template" dropdown for quick setup
- Summary footer with condition counts

### `components/events/packing-list.tsx`

- Checklist with checkboxes (state persisted to localStorage per event)
- Groups by category
- Highlights items the chef needs to source externally
- Progress bar showing packing completion

## Packing List Logic

1. For each item in chef's portable equipment, check if client has it in good/fair condition
2. If client is missing it or it's in poor condition, add to packing list
3. Also flag client items marked poor/missing that the chef does NOT own (marked "Need to source")
4. Sort by category, then item name

## Wiring (TODO)

- Add `KitchenInventoryPanel` to client detail page
- Add `PackingList` to event detail page
- Consider adding chef equipment management to Settings
- Tier assignment: this is a Pro feature (equipment management module)
