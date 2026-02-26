# Inventory & Food Cost Server Actions

**Date:** 2026-02-20
**Branch:** `feature/scheduling-improvements`
**Files created:** 4 server action modules in `lib/inventory/`

---

## What Changed

Four new server action files were created to support inventory management and food cost tracking. All files follow the established ChefFlow server action patterns exactly.

### Files Created

| File                                      | Table(s)                                               | Purpose                                                    |
| ----------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------- |
| `lib/inventory/count-actions.ts`          | `inventory_counts`                                     | Inventory level tracking, par alerts, reorder suggestions  |
| `lib/inventory/waste-actions.ts`          | `waste_logs`                                           | Food waste logging, dashboard, trend analysis              |
| `lib/inventory/vendor-invoice-actions.ts` | `vendor_invoices`, `vendor_invoice_items`              | Invoice upload, item matching, price change flagging       |
| `lib/inventory/price-cascade-actions.ts`  | `vendor_price_points`, `recipe_ingredients`, `recipes` | Price impact preview and cascading updates to recipe costs |

---

## Pattern Compliance

Every file follows the exact same conventions as existing server actions (e.g., `lib/finance/bank-feed-actions.ts`, `lib/expenses/actions.ts`):

- **`'use server'`** directive at file top
- **`requireChef()`** for auth + role enforcement on every action
- **`createServerClient()`** for Supabase client
- **`(supabase as any)`** cast for all new-table queries (tables not yet in generated types)
- **`.eq('chef_id', user.tenantId!)`** tenant scoping on every query
- **Zod schemas** for input validation with `.parse()` before DB writes
- **`revalidatePath()`** after mutations
- **Snake_case to camelCase** mapping in all return objects
- **All monetary values in cents** (integers)
- **Exported TypeScript types** for all return shapes

---

## Exported Actions Summary

### count-actions.ts

| Action                        | Type     | Description                                        |
| ----------------------------- | -------- | -------------------------------------------------- |
| `updateInventoryCount(input)` | Mutation | Upsert inventory item by chef_id + ingredient_name |
| `getInventoryCounts()`        | Query    | All inventory items ordered by name                |
| `getParAlerts()`              | Query    | Items where current_qty < par_level                |
| `getReorderSuggestions()`     | Query    | Below-par items grouped by vendor                  |

### waste-actions.ts

| Action                                    | Type     | Description                               |
| ----------------------------------------- | -------- | ----------------------------------------- |
| `logWaste(input)`                         | Mutation | Insert waste entry with reason enum       |
| `getWasteDashboard(startDate?, endDate?)` | Query    | Totals by reason with cost sums           |
| `getWasteTrend(months)`                   | Query    | Monthly waste cost trend with gap-filling |
| `getWasteByEvent(eventId)`                | Query    | Waste entries for a specific event        |

### vendor-invoice-actions.ts

| Action                                  | Type     | Description                                                            |
| --------------------------------------- | -------- | ---------------------------------------------------------------------- |
| `uploadVendorInvoice(input)`            | Mutation | Insert invoice header + line items                                     |
| `matchInvoiceItems(invoiceId, matches)` | Mutation | Link items to ingredients; auto-sets status to 'matched' when all done |
| `getVendorInvoices(filters?)`           | Query    | List invoices with embedded items, filterable by vendor/status/date    |
| `flagPriceChange(invoiceItemId)`        | Mutation | Mark an item's price as changed                                        |

### price-cascade-actions.ts

| Action                                                | Type     | Description                                               |
| ----------------------------------------------------- | -------- | --------------------------------------------------------- |
| `previewPriceCascade(ingredientId, newPriceCents)`    | Query    | Read-only preview of recipe cost impacts                  |
| `cascadeIngredientPrice(ingredientId, newPriceCents)` | Mutation | Insert new price point + update all affected recipe costs |

---

## How It Connects to the System

These actions fill the **inventory and food cost management** gap in ChefFlow:

1. **Inventory Counts** enable par-level tracking so chefs know what to reorder before shopping for an event (connects to the budget guardrail in `lib/expenses/actions.ts`)

2. **Waste Logs** provide data for the action inventory's post-event accountability (Stage 14+), helping chefs track and reduce food waste over time

3. **Vendor Invoices** create a paper trail for supplier pricing and enable automatic price-change detection, which feeds into...

4. **Price Cascade** propagates vendor price changes through `recipe_ingredients` and `recipes`, keeping recipe costs accurate without manual recalculation. This follows the existing recipe costing model from Layer 4 (`supabase/migrations/20260215000004_layer_4_menus_recipes_costing.sql`)

---

## Database Dependencies

These actions depend on tables that may need migrations:

- `inventory_counts` — new table (needs migration)
- `waste_logs` — new table (needs migration)
- `vendor_invoices` — new table (needs migration)
- `vendor_invoice_items` — new table with CASCADE FK to vendor_invoices (needs migration)
- `vendor_price_points` — assumed existing from Layer 4 or gap-closure migrations
- `recipe_ingredients` — existing from Layer 4
- `recipes` — existing from Layer 4

**Note:** Migrations for the new tables are NOT included in this change. They should be created separately following the migration safety protocol in CLAUDE.md.

---

## Next Steps

- [ ] Create database migrations for `inventory_counts`, `waste_logs`, `vendor_invoices`, `vendor_invoice_items`
- [ ] Build UI pages at `/inventory`, `/inventory/waste`, `/inventory/invoices`
- [ ] Wire reorder suggestions into the pre-event shopping checklist
- [ ] Connect waste logging to the event close-out wizard
- [ ] Add price cascade confirmation dialog in recipe management UI
