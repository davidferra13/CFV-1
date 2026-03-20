# Equipment Maintenance & Calibration Tracking

## What Changed

Added a maintenance and calibration tracking system on top of the existing equipment inventory.

## Database Changes (Migration 20260401000091)

**Additive ALTER TABLE on `equipment_items`:**
- `next_maintenance_due TIMESTAMPTZ` - pre-computed next maintenance date, updated when maintenance is logged
- `calibration_required BOOLEAN DEFAULT false` - flags items needing periodic calibration (thermometers, scales, etc.)

Note: `maintenance_interval_days` and `last_maintained_at` already existed on the table from the original equipment migration.

**New table: `equipment_maintenance_log`**
- Tracks every maintenance event with type (routine, calibration, repair, inspection), cost, notes, performer, and date
- FK to equipment_items and chefs, with RLS policies matching the existing equipment pattern
- Indexed on equipment_id + performed_at for fast history lookups

## Server Actions (`lib/equipment/maintenance-actions.ts`)

| Action | Purpose |
|--------|---------|
| `getMaintenanceSchedule()` | All owned equipment with computed maintenance status (overdue/due_soon/ok/no_schedule), sorted by urgency |
| `logMaintenance(equipmentId, input)` | Records a maintenance event in the log table and updates `last_maintained_at` + `next_maintenance_due` on the equipment item |
| `getMaintenanceHistory(equipmentId)` | Full history of maintenance events for one item, newest first |
| `getOverdueEquipment()` | Filtered subset of schedule showing only overdue items |
| `getOverdueCount()` | Count of overdue items (for badge display) |

All actions are tenant-scoped via `requireChef()`.

## UI Components

**`components/equipment/maintenance-schedule.tsx`**
- Lists all equipment with maintenance status
- Color-coded badges: green (ok), yellow (due soon, within 7 days), red (overdue), gray (no schedule)
- Inline "Log Maintenance" form per item with type, date, cost, performer, and notes
- Calibration-required items get a blue "Calibration" badge
- Auto-defaults to "calibration" type when logging maintenance on calibration-required items

**`components/equipment/maintenance-alert-badge.tsx`**
- Small red badge showing count of overdue items
- Renders nothing when count is 0
- Accepts optional `initialCount` prop for server-side pre-fetch, otherwise fetches on mount
- Designed for nav items or dashboard widgets

## How It Connects

- Builds on the existing `equipment_items` table and `lib/equipment/actions.ts` patterns
- The existing `logMaintenance()` in actions.ts only updated `last_maintained_at` on the item. The new system adds a detailed log table and computes `next_maintenance_due` automatically
- The `getEquipmentDueForMaintenance()` function in actions.ts computed overdue status client-side. The new `next_maintenance_due` column enables server-side filtering
