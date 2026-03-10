# Caterer Archetype: Equipment Checklist + Station Assignments

Two new features for the caterer archetype, integrated into the event detail Ops tab.

## Feature 1: Equipment Checklist Per Event

Allocates specific equipment items to an event with pack/return tracking.

### Database

- **Table:** `event_equipment_checklist`
- **Migration:** `20260331000005_equipment_checklist_and_station_assignments.sql`
- **Fields:** equipment_name, category (cooking/serving/transport/setup/cleaning/other), quantity, source (owned/rental/venue_provided), packed, returned, notes
- **RLS:** chef_id = auth.uid()
- **Unique constraint:** (event_id, equipment_name, chef_id)

### Server Actions

- **File:** `lib/events/event-equipment-actions.ts`
- `addEquipmentToChecklist()` - Add item to event
- `removeEquipmentFromChecklist()` - Remove item
- `getEventEquipmentChecklist()` - Get all items grouped by category
- `toggleEquipmentPacked()` - Toggle packed status
- `toggleEquipmentReturned()` - Toggle returned status
- `getEquipmentPackingProgress()` - Returns { packed, returned, total }
- `generateDefaultChecklist()` - Auto-populates based on guest count, service style, and venue type

### Component

- **File:** `components/events/event-equipment-checklist.tsx`
- Pack/Return toggle view with progress bar
- Items grouped by category with source badges (owned/rental/venue)
- Add item form with category, quantity, source, notes
- Generate Default button for smart auto-population
- Integrated into event detail Ops tab

### Default Checklist Logic

- All events: serving utensils, tongs, cutting boards, knives, towels, first aid kit, sheet pans, gloves, trash bags
- 50+ guests: chafing dishes, sterno, extra sheet pans
- 100+ guests: bus tubs, extra trash bags, hand washing station
- Outdoor: tent weights, extension cords, portable hand wash
- Plated service: plate covers, garnish containers
- Buffet service: chafing dishes, serving spoons, sneeze guards

## Feature 2: Station-to-Staff Assignment

Assigns staff members to specific kitchen stations for an event.

### Database

- **Table:** `event_station_assignments`
- **Migration:** Same file as above
- **Fields:** event_id, chef_id, station_id, staff_member_id, role_notes
- **RLS:** chef_id = auth.uid()
- **Unique constraint:** (event_id, station_id, staff_member_id)

### Server Actions

- **File:** `lib/events/station-assignment-actions.ts`
- `assignStaffToStation()` - Assign with optional role notes
- `removeStaffFromStation()` - Remove assignment
- `getEventStationAssignments()` - Returns stations with their assigned staff
- `getStationAssignmentSummary()` - Quick summary (station name, staff count, names)
- `getUnassignedStaff()` - Staff on event roster but not yet assigned to a station
- `autoAssignStaffToStations()` - Round-robin distribution of unassigned staff
- `clearAllStationAssignments()` - Remove all assignments for an event

### Component

- **File:** `components/events/station-staff-assignment.tsx`
- Unassigned staff section at top
- Station cards in a grid layout with assigned staff listed
- Assign staff via dropdown per station
- Auto-Assign button (round-robin)
- Clear All button
- Role badges on staff
- Shown on event detail Ops tab when stations exist

### Integration

Both features are loaded in the event detail page (`app/(chef)/events/[id]/page.tsx`) via Promise.all and passed to the Ops tab component. Equipment checklist is always visible (non-draft/cancelled events). Station assignments are only visible when the chef has configured stations.

### Note on Existing File

There was already a `lib/events/equipment-checklist-actions.ts` that stores equipment data in the `event_safety_checklists` JSONB column. The new `lib/events/event-equipment-actions.ts` uses a proper dedicated table (`event_equipment_checklist`) with per-item packed/returned tracking. Both files coexist; the old one is used by the safety checklist system.
