# Kitchen Rental Tracking

## What Changed

Added a dedicated system for logging commercial kitchen bookings — facility name, date, hours, cost, purpose, and optional event linkage.

## Why

Private chefs frequently rent licensed commercial kitchens for large-batch prep work before events. Before this change, those costs had no home in the system — chefs were either ignoring them in their financials or lumping them into a generic expense category with no detail. This makes them first-class, trackable records.

## What Was Built

### Database

**Migration:** `supabase/migrations/20260303000010_kitchen_rentals.sql`

**`kitchen_rentals`**

- `facility_name`, `address`, `rental_date`, `start_time`, `end_time`
- `hours_booked NUMERIC(4,2)` — can be fractional (e.g. 3.5 hours)
- `cost_cents` — rental cost in cents
- `purpose` — free text description (e.g. "Large batch prep for Smith event")
- `event_id FK nullable` — link rental to a specific event for cost attribution
- `booking_confirmation` — confirmation number for reference
- RLS: chef-scoped only

### Server Actions

**File:** `lib/kitchen-rentals/actions.ts`

| Action                                | What                                                     |
| ------------------------------------- | -------------------------------------------------------- |
| `createKitchenRental(input)`          | Log a new rental                                         |
| `updateKitchenRental(id, input)`      | Edit rental details                                      |
| `deleteKitchenRental(id)`             | Delete a rental record                                   |
| `listKitchenRentals(limit?)`          | All rentals, newest first                                |
| `getKitchenRentalsForEvent(eventId)`  | Rentals linked to a specific event                       |
| `getMonthlyKitchenCosts(year, month)` | Cost rollup: total cents, total hours, count for a month |

### UI

- **`app/(chef)/operations/kitchen-rentals/page.tsx`** — Summary cards (total bookings, hours, cost) + rental list + log form
- **`app/(chef)/operations/kitchen-rentals/kitchen-rental-form.tsx`** — Client form: facility, date, cost, hours, start/end time, purpose, confirmation, notes
- **`app/(chef)/operations/kitchen-rentals/delete-kitchen-rental-button.tsx`** — Client delete button with confirmation dialog

## Cost Integration

`getKitchenRentalsForEvent(eventId)` and `getMonthlyKitchenCosts()` are available for integration into event financial summaries and monthly financial dashboards. Kitchen rental costs are real overhead that affects the true profitability of events.

## Future Considerations

- Link kitchen rental costs into event profit analysis breakdown
- Monthly kitchen cost line in the financials dashboard
- Recurring facility — save frequently used kitchens as saved locations
