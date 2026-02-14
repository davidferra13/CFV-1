# Payment State Calculation (V1)

## Payment States

```typescript
type PaymentState =
  | 'unpaid'       // No successful charges
  | 'partial'      // Some payment received, balance due
  | 'paid'         // Fully paid
  | 'refunded'     // Fully or partially refunded
  | 'processing';  // Pending charge or refund
```

---

## Calculation Logic

```typescript
function calculatePaymentState(
  entries: LedgerEntry[],
  expectedTotal: number
): PaymentState {
  const hasPendingCharge = entries.some((e) => e.entry_type === 'charge_pending');
  const hasPendingRefund = entries.some((e) => e.entry_type === 'refund_pending');

  if (hasPendingCharge || hasPendingRefund) {
    return 'processing';
  }

  const totalCharged = entries
    .filter((e) => e.entry_type === 'charge_succeeded')
    .reduce((sum, e) => sum + e.amount_cents, 0);

  const totalRefunded = entries
    .filter((e) => e.entry_type === 'refund_succeeded')
    .reduce((sum, e) => sum + Math.abs(e.amount_cents), 0);

  const netPaid = totalCharged - totalRefunded;

  if (totalRefunded > 0 && netPaid <= 0) {
    return 'refunded';
  }

  if (netPaid === 0) {
    return 'unpaid';
  }

  if (netPaid >= expectedTotal) {
    return 'paid';
  }

  return 'partial';
}
```

---

## Usage

```typescript
const entries = await db.ledger_entries.findMany({
  where: { event_id: eventId },
});

const event = await db.events.findUnique({
  where: { id: eventId },
});

const paymentState = calculatePaymentState(entries, event.total_amount_cents);
```

---

**End of Payment State Calculation**
