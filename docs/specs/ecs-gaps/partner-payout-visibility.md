# ECS Gap: Partner Payout Visibility

> Source: ECS Scorecard 2026-04-27 | User Type: Partner (86/100) | Dimension: Feature Depth (17/20)

## Problem
`lib/partners/payout-actions.ts` requires `requireChef()`. Partners cannot see their own payouts or commission history.

## Spec
1. Create `getMyPayouts` server action in `lib/partners/portal-actions.ts` gated by `requirePartner()`
2. Query partner_payouts (or equivalent) table scoped to the partner's ID
3. Create `components/partners/partner-payout-history.tsx` showing payout history: date, amount, status, reference
4. Add to partner dashboard or create `/partner/payouts` page
5. No write access; partners view only

## Pattern
Read `lib/partners/payout-actions.ts` to understand the data model, then create read-only partner-facing equivalent.

## Acceptance
- Partners see their payout history
- Amounts, dates, and statuses visible
- Read-only (no modification)
- Tenant-scoped to partner's own data
