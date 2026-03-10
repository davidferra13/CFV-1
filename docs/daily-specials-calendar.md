# Daily Specials Calendar

The Daily Specials Calendar lets restaurant-archetype chefs plan, schedule, and manage daily specials on a weekly grid.

## Location

- **Page:** `/commerce/specials` (Pro commerce module)
- **Server actions:** `lib/commerce/daily-specials-actions.ts`
- **UI component:** `components/commerce/specials-calendar.tsx`
- **Week nav:** `app/(chef)/commerce/specials/specials-client.tsx`
- **Migration:** `supabase/migrations/20260331000013_daily_specials.sql` (base table)
- **Enhancement migration:** `supabase/migrations/20260331000015_daily_specials_enhancements.sql` (sort_order, recipe_id, unique constraint)

## Database Schema

Table: `daily_specials`

| Column        | Type        | Notes                                                |
| ------------- | ----------- | ---------------------------------------------------- |
| id            | uuid        | PK, auto-generated                                   |
| chef_id       | uuid        | FK to chefs(id), tenant scoping                      |
| special_date  | date        | The date this special is scheduled                   |
| name          | text        | Name of the special                                  |
| description   | text        | Optional description                                 |
| price_cents   | integer     | Price in cents (displayed as dollars in UI)          |
| category      | text        | appetizer, entree, dessert, drink, side              |
| product_id    | uuid        | Optional FK to product_projections                   |
| recipe_id     | uuid        | Optional FK to recipes (links to chef's recipe book) |
| is_recurring  | boolean     | Whether this repeats weekly                          |
| recurring_day | integer     | 0-6 (Sun-Sat) for recurring specials                 |
| available     | boolean     | Toggle for sold-out status                           |
| sort_order    | integer     | Display ordering within a day                        |
| image_url     | text        | Optional image                                       |
| notes         | text        | Internal notes                                       |
| created_at    | timestamptz | Auto-set                                             |
| updated_at    | timestamptz | Auto-updated via trigger                             |

Unique constraint: `(chef_id, special_date, name)` prevents duplicate special names on the same day.

RLS: All policies scope to the chef's own records via `auth.uid()`.

## Server Actions

All actions require `requireChef()` auth and `requirePro('commerce')`.

| Action                                    | Purpose                                                            |
| ----------------------------------------- | ------------------------------------------------------------------ |
| `createSpecial(input)`                    | Add a new daily special                                            |
| `updateSpecial(id, input)`                | Edit an existing special                                           |
| `deleteSpecial(id)`                       | Remove a special                                                   |
| `getSpecialsForDate(date)`                | Fetch specials for one date (includes matching recurring specials) |
| `getSpecialsForWeek(weekStart)`           | Fetch all specials for a 7-day range                               |
| `getSpecialsCalendar(startDate, endDate)` | Fetch specials for any date range                                  |
| `getRecurringSpecials()`                  | Fetch all recurring specials                                       |
| `copySpecialsToDate(fromDate, toDate)`    | Duplicate one day's specials to another date (skips duplicates)    |
| `getRecipeSuggestions()`                  | List chef's recipes for linking to specials                        |
| `toggleSpecialAvailability(id)`           | Mark a special as available or sold out                            |

## UI Features

- **7-day calendar grid** (Mon-Sun) showing specials per day
- **Today highlighting** with brand color border
- **Quick add form** per day: name, price, category, description, optional recipe link, recurring toggle
- **Copy to...** button on any day with specials, copies to another day in the week or any custom date
- **Availability toggle** per special (Available / Sold Out)
- **Delete** per special with confirmation
- **Category badges** color-coded by type
- **Recipe link indicator** shows when a special is linked to a recipe
- **Week navigation** with prev/next arrows and "This Week" shortcut
- **Recurring specials** section below the calendar grid

## Design Decisions

- All monetary values stored in cents, displayed as dollars via `/100` formatting
- tenant_id derived from session (never from request body)
- Recipe suggestions fetched client-side on form open (non-blocking)
- Copy operation skips names that already exist on the target date (no duplicates)
- Recurring specials merge with date-specific specials, with date-specific taking precedence
- No AI involvement: all data entry is manual (Formula > AI principle)
