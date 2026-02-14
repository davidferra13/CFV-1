# Ledger Append-Only Writer (V1)

## Write Function

```typescript
async function appendLedgerEntry(data: {
  eventId: string | null;
  tenantId: string;
  entryType: LedgerEntryType;
  amountCents: number;
  stripeEventId?: string;
  stripePaymentIntentId?: string;
  stripeRefundId?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}): Promise<LedgerEntry> {
  // Idempotency check
  if (data.stripeEventId) {
    const existing = await db.ledger_entries.findUnique({
      where: { stripe_event_id: data.stripeEventId },
    });

    if (existing) {
      console.log('Ledger entry already exists for Stripe event:', data.stripeEventId);
      return existing;
    }
  }

  // Create entry
  return await db.ledger_entries.create({
    data: {
      event_id: data.eventId,
      tenant_id: data.tenantId,
      entry_type: data.entryType,
      amount_cents: data.amountCents,
      stripe_event_id: data.stripeEventId || null,
      stripe_payment_intent_id: data.stripePaymentIntentId || null,
      stripe_refund_id: data.stripeRefundId || null,
      notes: data.notes || null,
      metadata: data.metadata || null,
    },
  });
}
```

---

## Usage Examples

### Charge Succeeded

```typescript
await appendLedgerEntry({
  eventId: 'event-123',
  tenantId: 'chef-456',
  entryType: 'charge_succeeded',
  amountCents: 50000, // $500.00
  stripeEventId: 'evt_abc123',
  stripePaymentIntentId: 'pi_def456',
  notes: 'Deposit payment received',
});
```

### Refund Succeeded

```typescript
await appendLedgerEntry({
  eventId: 'event-123',
  tenantId: 'chef-456',
  entryType: 'refund_succeeded',
  amountCents: -50000, // -$500.00
  stripeEventId: 'evt_xyz789',
  stripeRefundId: 're_ghi012',
  notes: 'Full refund processed due to cancellation',
});
```

### Manual Adjustment

```typescript
await appendLedgerEntry({
  eventId: 'event-123',
  tenantId: 'chef-456',
  entryType: 'adjustment',
  amountCents: -5000, // -$50.00 discount
  notes: 'Courtesy discount for loyal client',
  metadata: { reason: 'customer_satisfaction' },
});
```

---

## Validation Rules

```typescript
function validateLedgerEntry(data: CreateLedgerEntryInput): void {
  if (!data.tenantId) {
    throw new Error('tenant_id required');
  }

  if (!LEDGER_ENTRY_TYPES.includes(data.entryType)) {
    throw new Error('Invalid entry type');
  }

  if (typeof data.amountCents !== 'number') {
    throw new Error('amount_cents must be a number');
  }

  // Refund entries should be negative
  if (data.entryType.startsWith('refund_') && data.amountCents > 0) {
    console.warn('Refund entry should have negative amount');
  }

  // Charge entries should be positive
  if (data.entryType.startsWith('charge_') && data.amountCents < 0) {
    console.warn('Charge entry should have positive amount');
  }
}
```

---

**End of Ledger Append-Only Writer**
