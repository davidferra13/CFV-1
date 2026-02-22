# Manual Add Buttons — Session Doc

**Date:** 2026-02-22
**Branch:** `feature/risk-gap-closure`

## Problem

Multiple list/entity pages across the chef portal had no way to manually add new items. Users could only get data into these pages through indirect means (e.g., ingredients only appeared when recipes were created; components only appeared when building menus).

## What Changed

### New Client Components Created

| Component                  | File                                                  | Purpose                                                                                     |
| -------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `AddIngredientForm`        | `components/culinary/add-ingredient-form.tsx`         | Inline form for creating standalone ingredients with category, unit, price, and staple flag |
| `AddComponentForm`         | `components/culinary/add-component-form.tsx`          | Inline form for adding menu components to any dish, with category pre-selection             |
| `UploadVendorInvoiceForm`  | `components/inventory/upload-vendor-invoice-form.tsx` | Multi-line-item form for manually entering vendor invoices                                  |
| `AddInventoryItemForm`     | `components/inventory/add-inventory-item-form.tsx`    | Form for tracking new inventory items with quantity and par level                           |
| `AddManualTransactionForm` | `components/finance/add-manual-transaction-form.tsx`  | Form for adding manual bank transactions for reconciliation                                 |

### Server Actions Added

| Action                   | File                               | Purpose                                                                 |
| ------------------------ | ---------------------------------- | ----------------------------------------------------------------------- |
| `getAllDishes()`         | `lib/menus/actions.ts`             | Fetches all dishes across all menus (for component assignment dropdown) |
| `addManualTransaction()` | `lib/finance/bank-feed-actions.ts` | Creates a manual bank transaction entry for reconciliation              |

### Pages Updated (12 total)

**Culinary section (7 pages):**

- `/culinary/ingredients` — "+ Add Ingredient" button with inline form
- `/culinary/components` — "+ Add Component" button with dish selector
- `/culinary/components/sauces` — "+ Add Component" (pre-selected: sauce)
- `/culinary/components/garnishes` — "+ Add Component" (pre-selected: garnish)
- `/culinary/components/stocks` — "+ Add Component" (pre-selected: base)
- `/culinary/components/ferments` — "+ Add Component" (pre-selected: other)
- `/culinary/components/shared-elements` — "+ Add Component"

**Inventory section (2 pages):**

- `/inventory/vendor-invoices` — "+ Upload Invoice" button with line item entry
- `/inventory/counts` — "+ Track Item" button for manual inventory tracking

**Finance section (3 pages):**

- `/finance/expenses` — "+ Add Expense" button linking to `/expenses/new`
- `/finance/invoices` — "+ Create Event / Invoice" button linking to `/events/new`
- `/finance/bank-feed` — "+ Add Transaction" button with inline form (both error state and normal state)

## Design Decisions

- All add forms use the **toggle pattern**: button click reveals an inline form card, cancel hides it. No page navigation needed.
- Component forms accept a `defaultCategory` prop to pre-select the category based on which sub-page you're on, but the user can change it to anything.
- Finance hub pages (expenses, invoices) link to existing create routes rather than duplicating forms.
- Bank feed manual transactions are inserted as `pending` status for reconciliation review.
- Vendor invoice form supports multiple line items with quantity and unit price.

## Pages NOT Changed (by design)

The following page types were intentionally left as display-only:

- **Analytics dashboards** — read-only computed views
- **Calendar views** — display scheduling data
- **Filtered list views** — sub-views of entities that already have add buttons on their parent page (e.g., `/clients/active`, `/events/completed`)
- **Derived data pages** — prep timelines, shopping lists, costing summaries
