# Commerce Engine V1 — Wave 3: Tax, Reconciliation, Settlement, Background Jobs

**Date:** 2026-02-27
**Branch:** `feature/risk-gap-closure`

---

## Overview

Wave 3 adds the financial operations layer to the Commerce Engine: line-item tax computation, daily reconciliation reports, Stripe settlement tracking, and Inngest background jobs for automated end-of-day processing.

---

## What Was Built

### Migration: `20260328000003_commerce_reconciliation.sql`

**New enum:** `reconciliation_flag_status` (open, resolved, ignored)

**New tables:**

| Table                          | Purpose                                                                                                                                  |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `daily_reconciliation_reports` | Per-day financial snapshot: sales totals, payment method breakdown, cash drawer variance, ledger cross-check, flags JSONB, review status |
| `settlement_records`           | Stripe payout tracking: maps individual payments to payouts, tracks fees/refunds/net amounts                                             |
| `daily_tax_summary`            | Tax collected per jurisdiction per day per tax class, with state/county/city breakdown                                                   |

**RLS:** Chef full-access policies on all three tables.

**Indexes:** Optimized for tenant + date DESC queries on all tables.

---

### Server Actions

| File                                     | Functions                                                                                                                                        | Purpose                                                                                                            |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `lib/commerce/tax-actions.ts`            | `computeSaleLineTax`, `applySaleTax`, `previewTax`                                                                                               | Line-item tax computation wrapping API Ninjas. Tax class multipliers (standard=100%, reduced=50%, exempt/zero=0%). |
| `lib/commerce/reconciliation-actions.ts` | `generateDailyReconciliation`, `listReconciliationReports`, `getReconciliationReport`, `reviewReconciliationReport`, `resolveReconciliationFlag` | Generate/list/review daily reports. Auto-flags: cash variance, payment-ledger mismatch, high refund ratio.         |
| `lib/commerce/settlement-actions.ts`     | `recordSettlement`, `updateSettlementStatus`, `listSettlements`, `getSettlement`, `getSettlementSummary`                                         | CRUD for settlement records. Idempotent on (tenant, stripe_payout_id). Dashboard summary aggregation.              |

---

### Inngest Background Jobs: `lib/jobs/commerce-jobs.ts`

| Job ID                            | Trigger Event                          | What It Does                                                                                                                                    |
| --------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `commerce-day-closeout`           | `chefflow/commerce.day-closeout`       | Generates daily reconciliation report: aggregates sales, payments, refunds, cash drawer, and creates flags.                                     |
| `commerce-payment-reconciliation` | `chefflow/commerce.reconcile-payments` | Cross-checks commerce_payments against ledger_entries. Flags orphan payments (no ledger entry) and orphan ledger entries (no matching payment). |
| `commerce-settlement-mapping`     | `chefflow/commerce.map-settlement`     | Maps a Stripe payout to individual commerce payments. Updates payment status to 'settled'. Creates settlement_records entry.                    |

All 3 jobs registered in `app/api/inngest/route.ts`.

**New event types** added to `InngestEvents` in `lib/jobs/inngest-client.ts`:

- `chefflow/commerce.day-closeout`
- `chefflow/commerce.reconcile-payments`
- `chefflow/commerce.map-settlement`

---

### Stripe Webhook Updates: `app/api/webhooks/stripe/route.ts`

**New routing logic:** When `payment_intent.succeeded` fires, the handler checks metadata:

- If `sale_id` is present → routes to `handleCommercePaymentSucceeded()` (commerce path)
- If `event_id` is present → routes to existing `handlePaymentSucceeded()` (event path, unchanged)

**New handler: `handleCommercePaymentSucceeded`**

- Inserts into `commerce_payments` table (DB trigger creates ledger entry)
- Updates sale status via `computeSaleStatus()`
- Idempotent on `stripe_{event.id}` key

**New handler: `handlePayoutEvent`**

- Handles `payout.paid` and `payout.failed` events
- Looks up tenant by connected Stripe account
- Dispatches `chefflow/commerce.map-settlement` Inngest job

**Both `payout.paid` and `payout.failed` added to non-ledger event list** (they don't directly write ledger entries).

---

### UI Pages

| Route                      | What It Shows                                                                                                                                                                     |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/commerce/reconciliation` | Daily reconciliation reports list. Shows date, sales count, revenue, payment breakdown, cash variance, flags (with color-coded severity), review status.                          |
| `/commerce/settlements`    | Settlement dashboard. Summary cards (total settled, pending, payout count, payments settled). Settlement list with payout status, amount, arrival date, gross/fees/net breakdown. |

**Nav items added** to the Commerce group in `nav-config.tsx`:

- Reconciliation (BarChart3 icon)
- Settlements (Landmark icon)

---

## Architecture Notes

### Tax Class System

The `TAX_CLASS_MULTIPLIERS` map adjusts the jurisdiction's combined rate per tax class:

- `standard`, `alcohol`, `cannabis`, `prepared_food` → full rate (1.0×)
- `reduced` → half rate (0.5×)
- `exempt`, `zero` → no tax (0.0×)

This is a simplification — real-world tax rules are more complex per jurisdiction. The multiplier approach is extensible and avoids hardcoding rates.

### Reconciliation Flags

Flags are stored as JSONB in `daily_reconciliation_reports.flags`. Each flag has:

- `type`: category (cash_variance, payment_ledger_mismatch, high_refund_ratio, payment_without_ledger, ledger_without_payment)
- `severity`: info | warning | error
- `message`: human-readable description
- `status`: open | resolved | ignored

The Inngest `commerce-payment-reconciliation` job appends flags to existing reports.

### Commerce vs Event Payment Paths

```
Commerce Payment Flow:
  Stripe → webhook → handleCommercePaymentSucceeded → commerce_payments INSERT
                                                        ↓ (DB trigger)
                                                    ledger_entries INSERT

Event Payment Flow (unchanged):
  Stripe → webhook → handlePaymentSucceeded → appendLedgerEntryFromWebhook → ledger_entries INSERT
```

Both paths feed into `ledger_entries`, preserving the ledger-first architecture. All existing financial views (`event_financial_summary`, P&L, tenant summary) continue working unchanged.

---

## Files Changed

### New Files (8)

- `supabase/migrations/20260328000003_commerce_reconciliation.sql`
- `lib/commerce/tax-actions.ts`
- `lib/commerce/reconciliation-actions.ts`
- `lib/commerce/settlement-actions.ts`
- `lib/jobs/commerce-jobs.ts`
- `app/(chef)/commerce/reconciliation/page.tsx`
- `app/(chef)/commerce/settlements/page.tsx`
- `docs/commerce-engine-wave-3.md`

### Modified Files (4)

- `lib/jobs/inngest-client.ts` — added 3 commerce event types
- `app/api/inngest/route.ts` — registered 3 commerce job functions
- `app/api/webhooks/stripe/route.ts` — added commerce payment routing + payout handler
- `components/navigation/nav-config.tsx` — added reconciliation + settlements nav items

---

## What's Next (Wave 4)

- Shift reports, daily sales reports, by-product reports, by-channel reports
- CSV/PDF export for sales, payments, refunds, tax
- PDF receipt generation
- Event↔Sale bridge (create sale from event, sync event payments)
