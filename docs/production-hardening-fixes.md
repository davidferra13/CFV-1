# Production Hardening Fixes — March 2026

Companion document for the P0/P1 hardening pass.

---

## Summary

Fixed **9 issues** across security, data integrity, and UI correctness:

### P0 — Critical (fixed)

| #   | Issue                                                       | File(s)                                                              | Fix                                                                                                  |
| --- | ----------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 1   | Backup SQL files on disk (schema exposure risk)             | Root directory                                                       | Deleted 10 files, added `backups/` to `.gitignore`                                                   |
| 2   | `getEventPaymentStatus` returns `$0` when summary is null   | `lib/stripe/actions.ts`                                              | Now returns `{ success: false }` when `summary` is null — never hides failure as zero                |
| 3   | `financial-summary-view` mileage update — no error handling | `components/events/financial-summary-view.tsx`                       | Added try/catch + toast.error on failure                                                             |
| 4   | `receipt-library-client` optimistic update — no rollback    | `components/receipts/receipt-library-client.tsx`                     | Added try/catch with state rollback + toast.error                                                    |
| 5   | Hardcoded `$29` price across pricing page + layout          | `app/(public)/pricing/page.tsx`, `layout.tsx`, `lib/billing/tier.ts` | Extracted `PRO_PRICE_MONTHLY` constant, referenced in all 6 locations                                |
| 6   | Grocery cache `hasNoApiData` always false                   | `lib/grocery/pricing-actions.ts`                                     | Now derived from null-check on `spoonacular_price_cents`, `kroger_price_cents`, `mealme_price_cents` |

### P1 — Important (fixed)

| #   | Issue                                                          | File(s)                                              | Fix                                           |
| --- | -------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------- |
| 7   | `call-queue-client` — no error handling on queue build         | `app/(chef)/prospecting/queue/call-queue-client.tsx` | Added try/catch, shows empty state on failure |
| 8   | `geocode-address-button` — throws leave UI in limbo            | `components/events/geocode-address-button.tsx`       | Added try/catch, shows error message          |
| 9   | `quick-receipt-capture` — throws leave UI stuck at "uploading" | `components/events/quick-receipt-capture.tsx`        | Added try/catch, transitions to error state   |

### Already Correct (no fix needed)

| Item                           | Why                                                             |
| ------------------------------ | --------------------------------------------------------------- |
| Migration timestamp collisions | No collisions found — all 274 migrations have unique timestamps |
| "Disconnect Gmail" button      | Already `disabled` with "(coming soon)" label                   |
| "Share a Template" button      | Already `disabled` with "(Coming Soon)" label                   |
| `payment-reminders.tsx`        | Already checks `response.ok` and has full try/catch             |
| `loyalty-setup.tsx` seedClient | Already has internal try/catch with error state                 |

---

## Zero Hallucination Compliance

All fixes follow the three laws:

1. **Law 1 (no success without confirmation):** Every `startTransition` now has try/catch with rollback where optimistic updates exist
2. **Law 2 (no failure as zero):** `getEventPaymentStatus` returns error state instead of `$0`; grocery cache derives `hasNoApiData` from real data
3. **Law 3 (no non-functional features):** Confirmed Gmail disconnect and Share Template are already properly gated

---

## New Constant: `PRO_PRICE_MONTHLY`

**Location:** `lib/billing/tier.ts`

```ts
export const PRO_PRICE_MONTHLY = 29
```

When the price changes, update this single constant. All pricing page text (6 occurrences across 2 files) references it.
