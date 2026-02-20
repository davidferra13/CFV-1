# Vendor / Supplier Management

## What Changed
Added a structured vendor directory with contact info, preferred supplier flagging, and a price point history log. Chefs can now track where they source ingredients and how prices change over time.

## Why
Private chefs develop relationships with specific butchers, farms, specialty importers, and fishmongers that directly affect the quality and consistency of their work. Before this change, all that knowledge lived in the chef's head or scattered across contacts apps and notes. Price comparison and sourcing decisions were entirely manual. This puts the supplier relationship data where it belongs — in the business system.

## What Was Built

### Database
**Migration:** `supabase/migrations/20260303000015_vendor_management.sql`

**`vendors`**
- `name`, `vendor_type` enum (grocery, specialty, butcher, fishmonger, farm, liquor, equipment, bakery, produce, dairy, other)
- `phone`, `email`, `address`, `website`, `notes`
- `is_preferred BOOLEAN DEFAULT false` — marks go-to suppliers
- `status` enum: `active`, `inactive`
- Indexed by `chef_id + status` and `chef_id + is_preferred`

**`vendor_price_points`**
- `vendor_id FK`, `ingredient_id FK nullable`, `item_name` (always stored)
- `price_cents`, `unit` (lb, each, case, etc.), `recorded_at DATE`
- Builds a historical price log per item per vendor

### Server Actions
**File:** `lib/vendors/actions.ts`

| Action | What |
|--------|------|
| `createVendor(input)` | Add a vendor to the directory |
| `updateVendor(id, input)` | Edit vendor details |
| `deleteVendor(id)` | Remove a vendor |
| `listVendors(type?)` | All active vendors, preferred first; optional type filter |
| `setVendorPreferred(id, isPreferred)` | Star/unstar a vendor |
| `recordPricePoint(input)` | Log current price for an item at a vendor |
| `deletePricePoint(id)` | Remove a price record |
| `getPriceHistory(vendorId?, ingredientId?)` | Historical prices with vendor name join |
| `getPricePointsForVendor(vendorId)` | All price records for one vendor |

Exports `VENDOR_TYPE_LABELS` for display.

### UI
- **`app/(chef)/culinary/vendors/page.tsx`** — Directory page with preferred/all split
- **`app/(chef)/culinary/vendors/vendor-directory-client.tsx`** — Full client UI: vendor cards, preferred star/unstar, delete, add form with all fields

## Data Design Notes
`item_name` is always stored in `vendor_price_points` even when `ingredient_id` is set. This ensures price history is legible even if the linked ingredient is later deleted or renamed.

## Future Considerations
- Price trend chart per ingredient across vendors
- "Best price today" comparison when building grocery lists
- Alert when a price point for a key ingredient hasn't been updated in 30+ days
- Vendor contact tags on grocery list generation (who to call for what)
