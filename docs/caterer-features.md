# Caterer Archetype Features

Two features added for the Caterer and Restaurant archetypes.

## Feature 1: Caterer Dashboard Defaults

When a chef's archetype is `caterer` or `restaurant`, the dashboard shows caterer-specific widgets above the tabbed dashboard section.

### Components

- **`components/dashboard/caterer-week-glance.tsx`** - "This Week" summary card showing:
  - Revenue / labor cost / profit estimate for the week
  - Week utilization bar (events vs. 7-day capacity)
  - Event list with date, time, occasion, client, guest count, staff count, location, and price
  - Color-coded status dots per event

- **`components/dashboard/staff-availability-widget.tsx`** - Staff availability for the week:
  - Color-coded: available (green), partially booked (yellow), fully booked (blue), double-booked (red)
  - Summary counts at top
  - Sorted with double-booked staff first for immediate visibility

- **`app/(chef)/dashboard/_sections/caterer-cards.tsx`** - Server component that fetches all caterer data and renders the three widgets

### Server Actions (`lib/dashboard/caterer-dashboard-actions.ts`)

- `getCatererWeekAtAGlance()` - Events this week with staff counts, revenue, labor estimates
- `getStaffAvailabilityOverview()` - All staff with assignment counts, double-booking detection
- `getWeeklyLaborSummary()` - Total scheduled hours and estimated labor cost by role

### Integration

Dashboard page (`app/(chef)/dashboard/page.tsx`) detects caterer/restaurant archetype and renders `<CatererCards />` in a Suspense boundary between the priority queue and the tabbed dashboard.

### Widget IDs Added

- `caterer_week_glance` (today category, lg size)
- `staff_availability` (today category, sm size)
- `weekly_labor` (today category, sm size)

## Feature 2: Service Style Templates

Pre-defined service configurations with auto-staffing ratios and equipment lists.

### Templates (`lib/events/service-style-templates.ts`)

Six built-in styles:

| Style              | Servers/Guests | Kitchen/Guests | Guest Range |
| ------------------ | -------------- | -------------- | ----------- |
| Plated Dinner      | 1:20           | 1:40           | 2-200       |
| Buffet Service     | 1:30           | 1:50           | 15-500      |
| Family Style       | 1:25           | 1:40           | 8-150       |
| Cocktail Reception | 1:15           | 1:30           | 20-300      |
| Food Stations      | 1:20           | 1:25           | 30-400      |
| Drop-Off Catering  | 0              | 1:50           | 10-200      |

Each template includes: suggested equipment, typical course count, service notes, and guest range.

### Deterministic Functions (Formula > AI)

- `calculateStaffing(guestCount, ratio)` - Pure math for staff recommendations
- `recommendServiceStyle(guestCount)` - Deterministic best-fit selection
- `getServiceStyleTemplate(id)` - Lookup by ID

### Server Actions (`lib/events/service-style-actions.ts`)

- `getServiceStyleTemplates()` - Returns all built-in templates
- `applyServiceStyleToEvent(eventId, styleId)` - Updates event service_style, returns staffing recommendation
- `getServiceStyleRecommendation(guestCount)` - Returns recommended style and all styles with staffing calculations

### Component (`components/events/service-style-picker.tsx`)

Client component with:

- Grid of style cards with name, description, guest range
- Staffing recommendations calculated from current guest count
- "Recommended" badge on best-fit style
- Expandable details showing equipment list and service notes
- "Apply to Event" button with optimistic UI and rollback on failure
- Guest range validation (outside-range styles shown at reduced opacity)

### Usage

The picker can be used in two modes:

1. **Form integration** - Pass `onSelect` callback, no server action needed
2. **Event detail** - Pass `eventId` and `showApplyButton={true}` to apply style to an existing event

## Architecture Notes

- All calculations are deterministic (Formula > AI). No Ollama or external AI calls.
- All actions use `requireChef()` for auth and tenant scoping via `user.tenantId`.
- Labor estimates use conservative defaults ($25/hr, 6 hours per event) as starting points.
- Service style mapping handles the mismatch between template IDs and the database enum values.
