# Gap 6: Sales Tax Tracking

## What Was Missing

No way to configure sales tax, attach tax to individual events, or track remittances to state authorities.

## What Was Built

### Migration: `20260320000009_sales_tax.sql`

Three new tables:

**`sales_tax_settings`** (one per chef):

- `enabled` toggle, `state` code, `state_rate_bps`, `local_rate_bps`
- Rates stored in basis points (625 bps = 6.25%) to avoid float arithmetic
- `filing_frequency`: monthly | quarterly | annually
- `registration_number`, `notes`

**`event_sales_tax`** (one per event, UNIQUE on event_id):

- `taxable_amount_cents`, `tax_rate_bps`, `tax_collected_cents`
- `tax_collected_cents` computed as `ROUND(taxable × rate_bps / 10000)` — integer math
- `is_exempt` + `exemption_reason`
- `remitted` boolean, `remitted_at`, `remittance_period`

**`sales_tax_remittances`** (append-only filing records):

- `period`, `period_start/end`, `amount_remitted_cents`
- `remitted_at`, `confirmation_number`

All tables: RLS (4-policy chef-only), update triggers, indexes.

### Lib Files

**`lib/finance/sales-tax-constants.ts`** (not `'use server'`):

- `COMMON_STATE_RATES_BPS`: all 50 states + DC with standard rates
- `FILING_FREQUENCY_LABELS`
- `bpsToPercent()`, `computeTaxCents()` utility functions

**`lib/finance/sales-tax-actions.ts`** (`'use server'`):

- `getSalesTaxSettings()`, `saveSalesTaxSettings(input)` — upsert on chef_id conflict
- `setEventSalesTax(input)` — computes tax_collected_cents server-side
- `getEventSalesTax(eventId)`, `markEventSalesTaxRemitted(input)`
- `getSalesTaxSummary(filters?)` — collected/remitted/outstanding totals
- `recordSalesTaxRemittance(input)`, `getSalesTaxRemittances()`
- `getUnremittedEventTax()` — pending collections list

### Components

**`components/finance/sales-tax-panel.tsx`**:

- 4 summary stat cards (collected, remitted, outstanding, exempt)
- Outstanding collections list with "Mark Remitted" inline action
- Remittance history table with "+ Record Remittance" form

**`components/finance/event-sales-tax-form.tsx`**:

- Inline per-event tax form (attach to event detail pages)
- Defaults to combined rate from settings
- Live preview: taxable amount × rate = tax to collect
- Exempt toggle + reason field

### Pages

- `/finance/sales-tax` — main dashboard (summary, outstanding, remittance history)
- `/finance/sales-tax/settings` — state selector (pre-fills standard rates), local rate, filing frequency, registration number
- `/finance/sales-tax/remittances` — full remittance history with totals

## Important Notes

- Sales tax collected is **not income** — it's a liability held until remitted
- The system tracks collection and remittance; it does NOT calculate nexus, taxability by product type, or multi-state obligations
- Chef must consult a tax professional to confirm services are taxable in their jurisdiction
- State selector pre-fills standard state rates; local/county rates must be entered manually
