# Caterer Archetype Features: Vendor Deliveries + Staff Events

Date: 2026-03-10
Branch: feature/risk-gap-closure

## Feature 1: Vendor Delivery Schedule Per Event

Tracks when each vendor arrives and delivers for a specific event. Supports both linked vendors (from the vendors table) and one-off vendors.

### What changed

- **Migration:** `supabase/migrations/20260331000006_event_vendor_deliveries.sql`
  - New `event_vendor_deliveries` table with delivery type enum, status tracking, scheduled/actual arrival times
  - RLS policies scoped to chef tenant
  - Indexes on event_id, chef_id, vendor_id, and composite event+status

- **Server actions:** `lib/events/vendor-delivery-actions.ts`
  - `addVendorDelivery()` - add delivery to event schedule
  - `updateVendorDelivery()` - update details, time, status
  - `deleteVendorDelivery()` - remove delivery
  - `getEventVendorDeliveries()` - list sorted by scheduled_time
  - `markDeliveryArrived()` - set status + record actual_arrival_time
  - `markDeliveryComplete()` - mark done
  - `getVendorDeliverySummary()` - quick stats (total, arrived, pending, etc.)

- **Component:** `components/events/vendor-delivery-timeline.tsx`
  - Vertical timeline with color-coded status dots
  - Delivery type badges (food, equipment, rentals, flowers, etc.)
  - Status flow: scheduled -> confirmed -> arrived -> completed (or cancelled/no_show)
  - Inline add form with vendor picker (auto-fills contact info from vendor record)
  - Expandable detail per entry (contact info, special instructions, notes)
  - Optimistic updates with rollback on failure

- **Integration:** Added to event detail Ops tab (`event-detail-ops-tab.tsx`)
  - Shows after Station Assignments, before AI Staff Briefing
  - Data fetched in the main event detail page's Promise.all
  - Vendor list fetched for the add form dropdown

### Delivery types

food, equipment, rentals, flowers, av, linen, ice, beverage, other

### Status flow

scheduled -> confirmed -> arrived -> completed
scheduled/confirmed -> cancelled
scheduled/confirmed -> no_show

---

## Feature 2: Staff Portal "My Events" View

Lets staff members see their upcoming event assignments with BEO and timeline details.

### What changed

- **Server actions:** `lib/staff/my-events-actions.ts`
  - `getMyUpcomingEvents()` - upcoming assigned events with role, hours, location
  - `getMyEventDetail(eventId)` - full detail including BEO, team, tasks, dietary info
  - `getMyEventHistory()` - past events worked

- **List page:** `app/(staff)/staff-events/page.tsx`
  - Upcoming tab (default) - cards with date, occasion, location, role, hours
  - Past tab - history with hours worked
  - Links to individual event detail

- **Detail page:** `app/(staff)/staff-events/[id]/page.tsx`
  - My Role: assigned role, station, scheduled/actual hours
  - Event Info: times, guest count, location
  - Timeline: arrival, service start, service complete (with live status dots)
  - Team: all staff on this event
  - Menu: courses and dishes (kitchen-only BEO, no financials)
  - Special Notes: allergies (red badges), dietary restrictions (yellow badges), kitchen notes
  - My Tasks: tasks for this event's date with checkbox completion

- **Navigation:** Added "My Events" to staff nav (`components/staff/staff-nav.tsx`)
  - Positioned second after Dashboard

### Security

- All actions use `requireStaff()` for auth
- Queries scoped by `chef_id` (tenant) AND `staff_member_id`
- Staff can only see events they are assigned to
- No client PII exposed (no client name, email, phone)
- BEO is kitchen-only (no financial data)
