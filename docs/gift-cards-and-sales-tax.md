# Gift Cards / Store Credit (U14) & Sales Tax Tracking (U15)

Two commerce features added to ChefFlow for managing gift card issuance/redemption and multi-jurisdiction sales tax compliance.

## U14: Gift Cards / Store Credit

### What It Does

Chefs can issue gift cards with unique codes (e.g., GC-A7X9K2), track balances, redeem them at point of sale, and manage outstanding liability. Supports single issuance, bulk issuance, and refunds back to cards.

### Database Tables

- `gift_cards` - Stores card records with initial/current balance, purchaser/recipient info, status (active/redeemed/expired/cancelled), optional expiration date. RLS on tenant_id.
- `gift_card_transactions` - Append-only ledger of all card movements (purchase, redemption, refund, adjustment) with balance-after tracking. RLS on tenant_id.

### Key Files

| File                                                              | Purpose                                                                          |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `supabase/migrations/20260331000024_gift_cards_and_sales_tax.sql` | Migration for both features                                                      |
| `lib/commerce/gift-card-actions.ts`                               | Server actions: issue, lookup, redeem, refund, cancel, bulk, stats               |
| `components/commerce/gift-card-manager.tsx`                       | Full management UI with stats, card list, issue/bulk modals, transaction history |
| `components/commerce/gift-card-redeem.tsx`                        | POS redemption widget (code lookup + redeem)                                     |
| `app/(chef)/commerce/gift-cards/page.tsx`                         | Page route                                                                       |

### Relationship to Existing Gift Card System

The existing gift card system at `/clients/gift-cards/` is part of the loyalty/incentives module (voucher-actions.ts). This new system at `/commerce/gift-cards/` is a standalone commerce-focused implementation with:

- Dedicated gift_cards table (not shared with vouchers)
- Full transaction ledger for balance tracking
- Bulk issuance capability
- POS redemption widget
- Financial liability tracking

### Code Generation

Gift card codes use a 8-character alphanumeric format with ambiguous characters removed (no I, O, 0, 1) for readability. Prefixed with "GC-". Uniqueness is enforced per tenant at the database level.

---

## U15: Sales Tax Tracking

### What It Does

Chefs can configure multiple tax jurisdictions (state, county, city, district), record tax collected per sale, generate filing summaries for periods, and track filing/payment status. The combined rate across all active jurisdictions gives the total tax rate to charge customers.

### Database Tables

- `tax_jurisdictions` - Named jurisdictions with rate (percent), type, filing frequency, and next filing date. RLS on tenant_id.
- `tax_collected` - Per-sale tax records with taxable amount, tax amount, optional jurisdiction link. Indexed on (tenant_id, sale_date). RLS on tenant_id.
- `tax_filings` - Period summaries with totals and status progression (pending -> filed -> paid). RLS on tenant_id.

### Key Files

| File                                                              | Purpose                                                                        |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `supabase/migrations/20260331000024_gift_cards_and_sales_tax.sql` | Migration (shared with U14)                                                    |
| `lib/finance/sales-tax-jurisdiction-actions.ts`                   | Server actions: jurisdiction CRUD, record tax, filings, stats, combined rate   |
| `components/finance/sales-tax-dashboard.tsx`                      | Dashboard with stats, deadline alerts, jurisdiction management, filing history |
| `app/(chef)/finance/sales-tax/jurisdictions/page.tsx`             | Page route (linked from existing sales-tax page)                               |

### Relationship to Existing Sales Tax System

The existing `lib/finance/sales-tax-actions.ts` is event-based (per-event tax with BPS rates, remittance tracking). This new system is jurisdiction-based and designed for multi-jurisdiction compliance:

- Multiple jurisdictions with individual rates
- Combined rate calculation across all active jurisdictions
- Period-based filing summaries
- Filing deadline tracking with upcoming alerts
- Status progression (pending -> filed -> paid)

Both systems can coexist. The existing system handles event-level tax, while this new system handles jurisdiction-level compliance and reporting.

### Tax Calculation

All amounts in cents (integers). Rates stored as percent (numeric, e.g., 6.25). Combined rate is the sum of all active jurisdiction rates. Tax calculation is deterministic (Formula > AI).

### Filing Workflow

1. Chef adds jurisdictions with rates and filing frequency
2. Tax is recorded per sale (can link to jurisdiction)
3. When filing is due, chef generates a filing summary for the period
4. System totals all tax_collected records for that date range
5. Chef marks filing as "filed" then "paid"
6. Current liability = total collected - total paid in filings
