# Invoice Sales Tax Integration

**Date:** 2026-02-26
**Status:** Complete (computed at runtime, no DB migration needed yet)

---

## What Changed

Sales tax is now automatically calculated and displayed on all invoices (screen view + PDF download) based on the event's `location_zip` field.

### Files Modified

| File                                 | Change                                                                                                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `lib/tax/api-ninjas.ts`              | Added 3-layer caching: in-memory Map (24h) + Upstash Redis (30 days) + Next.js fetch (7 days)                                                          |
| `lib/events/invoice-actions.ts`      | Added `salesTax` field to `InvoiceData` type, tax lookup in both `getInvoiceData()` and `getInvoiceDataForClient()`, tax included in `balanceDueCents` |
| `lib/documents/generate-invoice.ts`  | Sales tax line in SERVICES section and SUMMARY section of PDF                                                                                          |
| `components/events/invoice-view.tsx` | Sales tax row in service table and balance summary                                                                                                     |

### How It Works

1. When `getInvoiceData()` or `getInvoiceDataForClient()` is called, the event's `location_zip` is read from the database.
2. `lookupSalesTax()` calls `calculateSalesTax()` from `lib/tax/api-ninjas.ts`, which hits the API Ninjas sales tax endpoint.
3. The tax rate and amount are computed deterministically (math, not AI) from the quoted price.
4. `balanceDueCents` now includes tax: `(quotedPrice + taxAmount) - paid + refunded`.
5. The `salesTax` field on `InvoiceData` is `null` when:
   - No zip code on the event
   - Quoted price is 0 or null
   - API Ninjas is unreachable
   - `API_NINJAS_KEY` is not set

### Non-Blocking Design

The sales tax lookup follows the project's non-blocking side effect pattern:

- Wrapped in try/catch
- Returns `null` on any failure
- The invoice renders normally without tax if the lookup fails
- Logged as a warning, never thrown

### Caching Strategy (3 layers)

| Layer                        | TTL      | Scope                                                    |
| ---------------------------- | -------- | -------------------------------------------------------- |
| In-memory `Map`              | 24 hours | Same process — deduplicates calls within a request batch |
| Upstash Redis                | 30 days  | Cross-process — survives serverless restarts             |
| Next.js `fetch` `revalidate` | 7 days   | ISR-level — shared across renders                        |

Tax rates change at most quarterly. Three layers ensure we almost never hit the external API more than once per zip code per month.

### Environment Variable Required

```
API_NINJAS_KEY=your_key_here
```

Get a free key at https://api-ninjas.com/ (100K requests/month free, no credit card).

---

## Future: Database Schema Enhancement

Currently, tax is computed at render time from the live API. For historical accuracy (invoices should show the tax rate at the time they were issued), the following columns could be added to the `events` table:

```sql
ALTER TABLE events ADD COLUMN sales_tax_rate NUMERIC(6,4) DEFAULT NULL;
ALTER TABLE events ADD COLUMN sales_tax_amount_cents INTEGER DEFAULT NULL;
ALTER TABLE events ADD COLUMN sales_tax_zip TEXT DEFAULT NULL;
```

This would allow snapshotting the tax at invoice-issue time (when `assignInvoiceNumber()` is called). The current implementation is correct for new invoices — the API always returns current rates. The snapshot would only matter if a tax rate changes between when an invoice is issued and when it's viewed later.

**No migration was created.** This note is for future reference only.

---

## Where Tax Appears

### Screen View (`/events/[id]/invoice` and `/my-events/[id]/invoice`)

- **Service table:** New row showing "Sales Tax (X.XX%)" with "Based on ZIP XXXXX" subtitle
- **Balance summary:** Line between "Service total" and "Total paid" showing "Sales tax (X.XX%)"

### PDF Download (`/api/documents/invoice/[eventId]`)

- **SERVICES section:** "Sales Tax (X.XX%)" line item
- **SUMMARY section:** "Sales Tax (X.XX%)" line before "Total Paid"

### Balance Calculation

- `balanceDueCents = max(0, quotedPrice + taxAmount - servicePaid + refunded)`
- If tax is null (lookup failed), it behaves exactly as before (no tax included)
