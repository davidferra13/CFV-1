# Purchase Orders + Daily Opening/Closing Checklists

Two restaurant-archetype features added for kitchen and vendor operations.

## Feature 1: Purchase Order Workflow

Full PO lifecycle: draft, send, acknowledge, receive, cancel.

### Database

- `purchase_orders` table with chef_id tenant scoping, vendor FK, status FSM, financial columns
- `purchase_order_items` table with line items, quantities, units, costs, received quantities
- RLS policies scoped to chef_id = auth.uid()
- Migration: `20260313000011_purchase_orders.sql`

### Server Actions (`lib/commerce/purchase-order-actions.ts`)

- `createPurchaseOrder(vendorId)` - Creates draft PO with auto-generated PO-YYYY-NNNNN number
- `addItemToPO` / `removeItemFromPO` / `updatePOItem` - Line item CRUD with auto-recalculated totals
- `sendPurchaseOrder(poId)` - Marks sent, emails vendor using purchase-order email template
- `receivePurchaseOrder(poId, items)` - Records received quantities per item, auto-detects partial vs full receipt
- `getPurchaseOrders(filters)` - Filtered list (status, vendor, date range)
- `getPurchaseOrder(poId)` - Single PO with items
- `generatePOFromParLevels()` - Auto-creates item list from station components below par level
- `cancelPurchaseOrder(poId)` - Cancel (not allowed for already-received POs)
- `updatePurchaseOrder(poId, input)` - Update notes, delivery date, tax

### Components

- `components/commerce/purchase-order-form.tsx` - Full PO editing form with vendor info, line items table, add-item row, subtotal/total, "Generate from Par Levels" button, "Send to Vendor" button
- `components/commerce/po-receiving.tsx` - Receiving interface showing ordered vs received quantities per item with discrepancy highlighting (short/over badges)

### Pages

- `/commerce/purchase-orders` - PO list with status badges, vendor names, totals. "New PO" button with vendor picker dropdown
- `/commerce/purchase-orders/[id]` - PO detail with form + receiving section (shown for sent/acknowledged/partially_received/received POs)
- Added Purchase Orders link to Commerce dashboard quick links

### Email Template (`lib/email/templates/purchase-order.tsx`)

- Professional PO email sent to vendor with items table, subtotal/total, notes, delivery date request, restaurant contact info
- Uses BaseLayout with chef branding

## Feature 2: Daily Opening/Closing Templates

Structured checklists for daily restaurant procedures.

### Database

- `daily_checklist_completions` table - Tracks which items are checked off per day per chef
- `daily_checklist_custom_items` table - Chef-defined custom items (active/inactive, sorted)
- Both use chef_id tenant scoping with RLS
- Migration: same file `20260313000011_purchase_orders.sql`

### Default Items

**Opening (17 items):** Facility (4), Kitchen (4), FOH (5), Staff (4)
**Closing (19 items):** Kitchen (5), FOH (5), Facility (5), Admin (4)

### Server Actions (`lib/commerce/daily-checklist-actions.ts`)

- `getOpeningChecklist(date?)` / `getClosingChecklist(date?)` - Returns combined default + custom items with completion status
- `toggleChecklistItem(date, itemKey, type)` - Toggle check/uncheck (insert/delete)
- `getChecklistProgress(date, type)` - Returns completed/total/percent
- `addCustomChecklistItem(type, title, category?)` - Chef adds custom items
- `removeCustomChecklistItem(itemKey)` - Soft-delete custom items
- `getChecklistHistory(days)` - Past N days completion rates

### Component (`components/commerce/daily-checklist.tsx`)

- Tab toggle between Opening / Closing
- Items grouped by category with section headers
- Large 28px checkboxes designed for tablet use in kitchen environment
- Progress bar showing completion percentage
- Completion timestamps per item
- "Add Custom Item" inline form
- Green completion banner when 100%
- Optimistic updates with rollback on failure

### Integration

- Added to Daily Ops page (`app/(chef)/stations/daily-ops/page.tsx`) between the quick action bar and stations section
- Fetches opening + closing checklists in parallel with existing data loads
