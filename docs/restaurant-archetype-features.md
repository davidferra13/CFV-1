# Restaurant Archetype Features

Three features built for the Restaurant archetype: daily compliance forms, staff punch clock with break tracking, and menu allergen flagging.

## Feature 1: Temperature & Cleaning Logs

Daily food-safety compliance forms separate from the event-based `event_temp_logs` table.

### Database

- `compliance_temp_logs` - daily temperature readings by location (walk-in cooler, freezer, etc.)
- `compliance_cleaning_logs` - daily cleaning checklists grouped by area (kitchen, FOH, restroom, storage)
- Migration: `20260331000031_restaurant_compliance_and_breaks.sql`

### Default Temperature Targets

| Location        | Min F | Max F |
| --------------- | ----- | ----- |
| Walk-in Cooler  | 33    | 40    |
| Walk-in Freezer | -10   | 0     |
| Prep Fridge     | 33    | 40    |
| Hot Holding     | 135   | 165   |
| Cold Holding    | 33    | 40    |
| Dish Machine    | 180   | 220   |

### Files

- `lib/haccp/compliance-log-actions.ts` - server actions
- `components/haccp/temperature-log-form.tsx` - temp reading form with auto-flagging
- `components/haccp/cleaning-checklist.tsx` - checkbox tasks grouped by area
- `app/(chef)/compliance/daily/page.tsx` - page with tab toggle
- `app/(chef)/compliance/daily/client.tsx` - client wrapper

### Behavior

- Temperature readings auto-flag as red when out of range
- Out-of-range readings require a corrective action note
- Cleaning checklists auto-seed with default tasks on first load per date
- Progress bars show completion percentage per area

## Feature 2: Staff Time Tracking (Punch Clock)

Extends the existing `staff_clock_entries` table with break tracking, approval workflow, and payroll preview.

### Database

- Added columns to `staff_clock_entries`: `break_start_at`, `break_end_at`, `break_minutes`, `notes`, `approved`, `approved_by`
- Migration: same file as Feature 1

### Files

- `lib/staff/time-tracking-actions.ts` - break management, approval, labor summaries, payroll preview
- `components/staff/time-clock.tsx` - punch clock UI with break buttons
- `app/(chef)/staff/clock/page.tsx` - updated to show TimeClock + labor summary
- `app/(chef)/staff/clock/daily-labor-summary.tsx` - daily totals card

### Behavior

- Staff can be clocked in, take breaks (tracked separately), and clock out
- Break time is deducted from total work time when computing pay
- Daily labor summary shows total hours and cost by staff member
- Weekly payroll preview aggregates completed shifts per staff member
- Time entries can be approved by the chef/manager
- Existing `TimeTracker` component preserved as fallback when no staff members exist

## Feature 3: Menu Allergen Flagging

Allergen labels and dietary flags on product projections. The columns (`allergen_flags TEXT[]`, `dietary_tags TEXT[]`) already existed in the `product_projections` table from the commerce engine foundation migration.

### No Migration Needed

Columns already exist. No schema changes required.

### Constants

- Allergens (FDA Big 9): milk, eggs, fish, shellfish, tree_nuts, peanuts, wheat, soy, sesame
- Dietary flags: vegetarian, vegan, gluten_free, dairy_free, nut_free, keto, halal, kosher

### Files

- `lib/commerce/allergen-actions.ts` - CRUD for allergens, matrix view, dietary filtering
- `components/commerce/allergen-editor.tsx` - checkbox grid for allergens + dietary flags
- `components/commerce/allergen-badges.tsx` - reusable colored badges for display

### Behavior

- Allergen editor shows FDA Big 9 allergens with icons in a grid
- Dietary flags shown as colored pills
- `AllergenBadges` component reusable on product cards, menu displays, KDS tickets
- `AllergenIcons` compact variant for tight spaces (icons only)
- `getMenuAllergenMatrix()` returns all products with their allergens for printing an allergen chart
- `filterMenuByDietary()` filters products by dietary requirements
