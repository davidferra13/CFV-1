# Vendor & Food Cost System + Guest CRM — Implementation Summary

**Date:** 2026-02-24
**Branch:** feature/risk-gap-closure

## Overview

Complete implementation of two major systems:

1. **Vendor & Food Cost System** — vendor management, item pricing, invoice logging, daily revenue tracking, food cost % dashboard with bar charts
2. **Guest CRM** — guest profiles, tag management, comp tracking with redeem flow, visit logging, reservation management, instant search

## Files Created/Modified

### Vendor System — Server Actions

| File                                 | Purpose                                                                         |
| ------------------------------------ | ------------------------------------------------------------------------------- |
| `lib/vendors/actions.ts`             | Vendor CRUD (create, update, deactivate, list, getVendor with items)            |
| `lib/vendors/vendor-item-actions.ts` | Vendor item mapping, price comparison per ingredient and across all ingredients |
| `lib/vendors/invoice-actions.ts`     | Invoice CRUD with line items, filtered listing by vendor/date range             |
| `lib/vendors/revenue-actions.ts`     | Daily revenue upsert (creates or updates), date range listing                   |

### Vendor System — Pages

| File                               | Purpose                                                                    |
| ---------------------------------- | -------------------------------------------------------------------------- |
| `app/(chef)/vendors/page.tsx`      | Vendor list with search, status badges, delivery day chips, add form       |
| `app/(chef)/vendors/[id]/page.tsx` | Vendor detail with info, price list, invoice history, inline edit          |
| `app/(chef)/food-cost/page.tsx`    | Food cost dashboard with date range picker, summary cards, daily breakdown |

### Vendor System — Components

| File                                         | Purpose                                                                     |
| -------------------------------------------- | --------------------------------------------------------------------------- |
| `components/vendors/vendor-form.tsx`         | Create/edit vendor with delivery day multi-select                           |
| `components/vendors/vendor-price-list.tsx`   | Price list table with inline price editing, add/delete items                |
| `components/vendors/price-comparison.tsx`    | Side-by-side price comparison across vendors, cheapest highlighted green    |
| `components/vendors/invoice-form.tsx`        | Manual invoice logging with dynamic line items, auto-calculated totals      |
| `components/vendors/invoice-csv-upload.tsx`  | CSV upload with preview, column mapping, and import                         |
| `components/vendors/food-cost-dashboard.tsx` | Summary cards, div-based bar chart with color coding, daily breakdown table |
| `components/vendors/daily-revenue-form.tsx`  | Date-aware revenue entry, detects existing entries for upsert               |

### Guest CRM — Server Actions

| File                                | Purpose                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------ |
| `lib/guests/actions.ts`             | Guest CRUD, list with tags/comps joined, search, full profile with stats |
| `lib/guests/comp-actions.ts`        | Add comp, redeem comp (timestamp-based), list active/all                 |
| `lib/guests/visit-actions.ts`       | Log visit, list visits, compute visit stats (frequency, avg spend)       |
| `lib/guests/tag-actions.ts`         | Add tag (deduplicated), remove tag, list tags                            |
| `lib/guests/reservation-actions.ts` | Reservation CRUD with cancel, list by date, guest join                   |

### Guest CRM — Pages

| File                              | Purpose                                                             |
| --------------------------------- | ------------------------------------------------------------------- |
| `app/(chef)/guests/page.tsx`      | Guest list with live search, tags, comp indicators, add form        |
| `app/(chef)/guests/[id]/page.tsx` | Full profile: stats, tags, comps, visits, reservations, notes, edit |

### Guest CRM — Components

| File                                     | Purpose                                                           |
| ---------------------------------------- | ----------------------------------------------------------------- |
| `components/guests/guest-form.tsx`       | Create/edit guest form                                            |
| `components/guests/guest-tags.tsx`       | Tag display with colored badges, preset tags + custom input       |
| `components/guests/guest-comp-panel.tsx` | Active comps with redeem button, redeemed comps grayed out        |
| `components/guests/visit-log.tsx`        | Visit history table with inline add form, total spend summary     |
| `components/guests/reservation-form.tsx` | Reservation list with create form, cancel button, status badges   |
| `components/guests/guest-search.tsx`     | Debounced instant search with dropdown results showing tags/comps |

## Database Tables Used

### Vendor tables

- `vendors` — name, contact_name, phone, email, account_number, delivery_days[], payment_terms, notes, status
- `vendor_items` — vendor_id, ingredient_id, vendor_sku, vendor_item_name, unit_price_cents, unit_size, unit_measure
- `vendor_invoices` — vendor_id, invoice_number, invoice_date, total_cents, notes
- `vendor_invoice_line_items` — invoice_id, description, quantity, unit_price_cents, total_cents
- `daily_revenue` — date, total_revenue_cents, source, notes

### Guest tables

- `guests` — name, phone, email, notes
- `guest_tags` — guest_id, tag, color
- `guest_comps` — guest_id, description, created_by, redeemed_at, redeemed_by
- `guest_visits` — guest_id, visit_date, party_size, spend_cents, server_id, notes
- `guest_reservations` — guest_id, reservation_date, reservation_time, party_size, table_number, notes, status

All tables scoped by `chef_id = user.tenantId!`.

## Architecture Notes

- All server actions follow the standard pattern: `'use server'`, `requireChef()`, Zod validation, tenant scoping, `revalidatePath`
- All pages are async server components with `metadata` export
- All client components use `'use client'`, `useState`, `useRouter().refresh()` after mutations
- Food cost % = (purchases / revenue) \* 100, color-coded: green <30%, yellow 30-35%, red >35%
- Comp tracking uses `redeemed_at` timestamp (null = active, set = redeemed) rather than a boolean
- Guest search is debounced (300ms) with dropdown results
- CSV invoice upload uses pure client-side parsing (no AI) with column index selection
- Navigation entries already existed in nav-config.tsx under `vendors` and `guests` groups
