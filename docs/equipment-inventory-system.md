# Equipment Inventory System

## What Changed

Added an owned equipment tracker with maintenance scheduling and a rental cost logger that ties into event profit analysis.

## Why

A private chef's equipment kit is a capital investment that depreciates and requires maintenance. Knives need sharpening, pans need seasoning, induction burners need calibration. Before this change, none of this was tracked — and rental costs for events (chafing dishes, extra burners, serving vessels) were either absorbed silently or noted informally.

## What Was Built

### Database

**Migration:** `supabase/migrations/20260303000008_equipment_inventory.sql`

**`equipment_items`** — Owned equipment with:

- `category` enum: `cookware | knives | smallwares | appliances | serving | transport | linen | other`
- `purchase_price_cents`, `current_value_cents` (for depreciation awareness)
- `maintenance_interval_days` + `last_maintained_at` → next due date computed in app
- `status`: `owned | retired`

**`equipment_rentals`** — Per-rental records:

- Optional `event_id` FK so rental costs flow into event P&L
- `vendor_name`, `rental_date`, `return_date`, `cost_cents`

### Server Actions

**File:** `lib/equipment/actions.ts`

| Action                            | What                                       |
| --------------------------------- | ------------------------------------------ |
| `createEquipmentItem(input)`      | Add to inventory                           |
| `updateEquipmentItem(id, input)`  | Edit details                               |
| `retireEquipmentItem(id)`         | Soft retire                                |
| `logMaintenance(id)`              | Sets `last_maintained_at = today`          |
| `getEquipmentDueForMaintenance()` | Items past their maintenance interval      |
| `listEquipment(category?)`        | List active inventory                      |
| `logRental(input)`                | Log a rental, optionally linked to event   |
| `deleteRental(id)`                | Remove a rental entry                      |
| `getRentalCostForEvent(eventId)`  | Sum rental costs for event P&L             |
| `listRentals(eventId?)`           | List rentals, optionally filtered by event |

### UI

- **`app/(chef)/operations/equipment/page.tsx`** — Inventory page with maintenance overdue banner
- **`app/(chef)/operations/equipment/equipment-inventory-client.tsx`** — Two-tab UI: Owned inventory + Rentals. Maintenance logging inline.

## Maintenance Overdue Logic

```
next_due = last_maintained_at + maintenance_interval_days
if next_due < today → status = overdue
if next_due < today + 30 → status = due_soon
```

Items with no `maintenance_interval_days` are excluded from tracking.

## Event P&L Integration

`getRentalCostForEvent(eventId)` can be called from the event profit analysis to add a rental equipment line alongside food cost and labor cost.

## Future Considerations

- Depreciation calculator (purchase price → current book value over time)
- Equipment checkout log for events (what went out, what came back)
- Alert when an item hasn't been serviced before a major event
