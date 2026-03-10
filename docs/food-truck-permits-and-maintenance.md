# Food Truck: Permit Registry + Vehicle Maintenance

Two new food truck features for tracking permits/licenses and vehicle maintenance history.

## Feature 1: Permit Registry

### What It Does

Tracks all permits a food truck operator needs (health department, city business license, fire department, parking permits, vendor permits, mobile food permits). Shows expiry alerts so permits never lapse.

### Database

- Table: `permits` (migration `20260331000016`)
- Columns: name, permit_type, issuing_authority, permit_number, issue/expiry dates, renewal_lead_days, cost_cents, status
- RLS scoped to tenant_id
- Indexed on (tenant_id, expiry_date) and (tenant_id, status)

### Server Actions

File: `lib/food-truck/permit-actions.ts`

- `createPermit(data)` - add a new permit
- `updatePermit(id, data)` - update permit details
- `deletePermit(id)` - remove a permit
- `getPermits()` - all permits sorted by expiry date
- `getExpiringPermits(daysAhead?)` - permits expiring within N days (default 30)
- `getExpiredPermits()` - permits past their expiry date
- `renewPermit(id, newExpiryDate, newCostCents?)` - renew with new expiry
- `getPermitCostSummary()` - total annual permit costs by type

### UI

File: `components/food-truck/permit-registry.tsx`
Page: `app/(chef)/food-truck/permits/page.tsx`

- Dashboard grouped by status: Expiring Soon (yellow/red), Active (green), Expired (red)
- Each card shows: name, type badge, permit number, expiry date, issuing authority, cost
- Expiry countdown badges with color coding
- Calendar strip showing upcoming expirations
- Add Permit modal with full form
- Renew modal for quick renewal
- Annual cost summary at top
- All mutations use startTransition with try/catch and rollback

## Feature 2: Vehicle Maintenance Log

### What It Does

Tracks all truck maintenance: oil changes, tire rotations, brake service, inspections, electrical work, body repairs, cleaning. Shows upcoming and overdue maintenance.

### Database

- Table: `vehicle_maintenance` (same migration `20260331000016`)
- Columns: vehicle_name, maintenance_type, description, date_performed, next_due_date, next_due_mileage, cost_cents, vendor_name, odometer_reading
- RLS scoped to tenant_id
- Indexed on (tenant_id, next_due_date) and (tenant_id, date_performed)

### Server Actions

File: `lib/food-truck/vehicle-maintenance-actions.ts`

- `createMaintenanceEntry(data)` - log a maintenance event
- `updateMaintenanceEntry(id, data)` - update entry
- `deleteMaintenanceEntry(id)` - remove entry
- `getMaintenanceHistory(vehicleName?)` - all entries sorted by date
- `getUpcomingMaintenance()` - entries with future next_due_date
- `getOverdueMaintenance()` - entries with past next_due_date
- `getMaintenanceCostSummary(year?)` - costs broken down by type
- `getCurrentOdometer()` - latest odometer reading from any entry

### UI

File: `components/food-truck/vehicle-maintenance.tsx`
Page: `app/(chef)/food-truck/maintenance/page.tsx`

- Summary bar: total cost this year, current odometer, add button
- Sections: Overdue (red), Upcoming (amber), History
- Color coding: red = overdue, yellow = due within 7 days, green = ok
- Each card: description, type badge, date, cost, vendor, odometer, next due
- Log Maintenance modal: type dropdown, description, date, cost, vendor, odometer, next due date/mileage
- Cost breakdown table by maintenance type
- All mutations use startTransition with try/catch and rollback

## Design Decisions

- All amounts in cents (consistent with ChefFlow convention)
- tenant_id from session (never from request body)
- All deterministic, no AI dependency
- Both tables use the same dark stone/amber design system as the rest of ChefFlow
- Permits support 7 types: health, business, fire, parking, vendor, mobile_food, other
- Maintenance supports 9 types: oil_change, tire_rotation, brake_service, engine, electrical, body_work, inspection, cleaning, other
- `renewal_lead_days` is configurable per permit (default 30) so the chef can set different alert windows
