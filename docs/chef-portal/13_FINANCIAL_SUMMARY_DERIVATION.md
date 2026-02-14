# Financial Summary Derivation (V1)

## Derived State Calculation

Payment state and balances are **computed** from ledger entries, never stored.

---

## Calculate Event Financial Summary

```typescript
interface EventFinancialSummary {
  totalCharged: number;
  totalRefunded: number;
  netAmount: number;
  balanceDue: number;
  paymentState: 'unpaid' | 'partial' | 'paid' | 'refunded';
}

async function getEventFinancialSummary(eventId: string): Promise<EventFinancialSummary> {
  const entries = await db.ledger_entries.findMany({
    where: { event_id: eventId },
  });

  const succeededCharges = entries
    .filter((e) => e.entry_type === 'charge_succeeded')
    .reduce((sum, e) => sum + e.amount_cents, 0);

  const succeededRefunds = entries
    .filter((e) => e.entry_type === 'refund_succeeded')
    .reduce((sum, e) => sum + Math.abs(e.amount_cents), 0);

  const adjustments = entries
    .filter((e) => e.entry_type === 'adjustment')
    .reduce((sum, e) => sum + e.amount_cents, 0);

  const netAmount = succeededCharges - succeededRefunds + adjustments;

  const event = await db.events.findUnique({
    where: { id: eventId },
    select: { total_amount_cents: true },
  });

  const balanceDue = (event.total_amount_cents || 0) - netAmount;

  let paymentState: 'unpaid' | 'partial' | 'paid' | 'refunded';
  if (succeededRefunds >= succeededCharges) {
    paymentState = 'refunded';
  } else if (netAmount === 0) {
    paymentState = 'unpaid';
  } else if (netAmount >= (event.total_amount_cents || 0)) {
    paymentState = 'paid';
  } else {
    paymentState = 'partial';
  }

  return {
    totalCharged: succeededCharges,
    totalRefunded: succeededRefunds,
    netAmount,
    balanceDue,
    paymentState,
  };
}
```

---

## UI Display

```tsx
export async function EventFinancialCard({ eventId }: { eventId: string }) {
  const summary = await getEventFinancialSummary(eventId);

  return (
    <div className="financial-summary">
      <h3>Financial Summary</h3>
      <dl>
        <dt>Total Charged:</dt>
        <dd>${(summary.totalCharged / 100).toFixed(2)}</dd>

        <dt>Total Refunded:</dt>
        <dd>${(summary.totalRefunded / 100).toFixed(2)}</dd>

        <dt>Net Amount:</dt>
        <dd>${(summary.netAmount / 100).toFixed(2)}</dd>

        <dt>Balance Due:</dt>
        <dd>${(summary.balanceDue / 100).toFixed(2)}</dd>

        <dt>Payment State:</dt>
        <dd>
          <span className={`badge badge-${summary.paymentState}`}>
            {summary.paymentState}
          </span>
        </dd>
      </dl>
    </div>
  );
}
```

---

**End of Financial Summary Derivation**
