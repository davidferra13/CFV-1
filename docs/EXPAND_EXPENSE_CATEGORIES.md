# Expand Expense Categories

**Date:** 2026-02-17
**Scope:** Database enum, shared constants, UI (form + filters + detail page)

## What Changed

Added 10 new values to the `expense_category` PostgreSQL enum, bringing the total from 7 to 17. This lets chefs log every type of business expense — not just food and event costs.

### New Categories

| Value                   | Label                 | Example Use                              |
| ----------------------- | --------------------- | ---------------------------------------- |
| `vehicle`               | Vehicle               | Parking, tolls, car wash, maintenance    |
| `venue_rental`          | Venue/Rental          | Venue fees, kitchen rental, event space  |
| `subscriptions`         | Subscriptions         | Wix, software, online tools              |
| `marketing`             | Marketing             | Ads, business cards, social media        |
| `labor`                 | Labor                 | Hired sous chefs, servers, assistants    |
| `insurance_licenses`    | Insurance/Licenses    | Business insurance, food handler permits |
| `professional_services` | Professional Services | Accountant, lawyer, consulting           |
| `education`             | Education             | Classes, certifications, culinary books  |
| `uniforms`              | Uniforms              | Chef coats, aprons, laundry              |
| `utilities`             | Utilities             | Business phone, internet                 |

### gas_mileage vs vehicle

`gas_mileage` retains its special mileage-tracking fields (`mileage_miles`, `mileage_rate_per_mile_cents`). `vehicle` is for non-mileage vehicle expenses like parking, tolls, and car maintenance.

## Architecture Improvement: Shared Constants

Previously, category labels, colors, and option lists were duplicated across 5 files. Extracted into a single source of truth:

**`lib/constants/expense-categories.ts`** exports:

- `EXPENSE_CATEGORIES` — flat map of all 17 categories with labels and colors
- `EXPENSE_CATEGORY_GROUPS` — 5 groups for organized UI display
- `EXPENSE_CATEGORY_VALUES` — tuple for Zod validation
- `EXPENSE_CATEGORY_OPTIONS` — flat array for simple selects
- `getCategoryLabel()` / `getCategoryColor()` — helpers

### Category Groups

| Group             | Categories                                                                                |
| ----------------- | ----------------------------------------------------------------------------------------- |
| Food & Drink      | Groceries, Alcohol, Specialty Items                                                       |
| Travel & Vehicle  | Gas/Mileage, Vehicle                                                                      |
| Operations        | Equipment, Supplies, Venue/Rental, Labor, Uniforms                                        |
| Business Overhead | Subscriptions, Marketing, Insurance/Licenses, Professional Services, Education, Utilities |
| Other             | Other                                                                                     |

## UI Changes

- **Expense form:** Category dropdown now uses `<optgroup>` elements organized by group
- **Filter bar:** Redesigned from flat 7-button row to grouped layout with section labels
- **Select component:** Added `groups` prop for `<optgroup>` support (backward-compatible)

## Profit Summary Impact

None. The `getEventProfitSummary()` switch statement tracks food costs (groceries, alcohol, specialty_items) and travel (gas_mileage) explicitly. All new categories fall into the existing `default: otherCents` bucket — correct behavior since overhead expenses are not per-event food costs.

## Files Modified

| File                                                               | Change                                          |
| ------------------------------------------------------------------ | ----------------------------------------------- |
| `lib/constants/expense-categories.ts`                              | NEW — shared constants module                   |
| `components/ui/select.tsx`                                         | Added `groups` prop for optgroup support        |
| `lib/expenses/actions.ts`                                          | Zod enum now imports from shared constants      |
| `components/expenses/expense-form.tsx`                             | Uses grouped select for category dropdown       |
| `app/(chef)/expenses/page.tsx`                                     | Grouped filter bar, uses shared helpers         |
| `app/(chef)/expenses/[id]/page.tsx`                                | Uses `getCategoryLabel()` from shared constants |
| `components/import/smart-import-hub.tsx`                           | Uses shared `EXPENSE_CATEGORY_OPTIONS`          |
| `types/database.ts`                                                | Manually added 10 new enum values               |
| `supabase/migrations/20260218000001_expand_expense_categories.sql` | NEW — ALTER TYPE for each new value             |

## Migration

```sql
ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'vehicle';
ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'venue_rental';
-- ... (10 statements total)
```

Deploy with: `supabase db push --linked`

## Backward Compatibility

All existing expense records with old categories continue to work unchanged. The `event_id` field was already nullable, so general business overhead expenses (not linked to any event) were already supported.
