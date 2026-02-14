# Dispute Handling (V1)

## Stripe Disputes

When a client disputes a charge via their bank, Stripe sends webhook events.

---

## Dispute Lifecycle

1. `charge.dispute.created` - Dispute opened
2. `charge.dispute.updated` - Evidence submitted/status change
3. `charge.dispute.closed` - Dispute resolved (won/lost)

---

## Handling Dispute Created

```typescript
async function handleDisputeCreated(stripeEvent: Stripe.Event) {
  const dispute = stripeEvent.data.object as Stripe.Dispute;

  // Log in ledger
  await appendLedgerEntry({
    eventId: dispute.metadata.event_id,
    tenantId: dispute.metadata.tenant_id,
    entryType: 'adjustment',
    amountCents: -dispute.amount, // Disputed amount
    stripeEventId: stripeEvent.id,
    notes: `Dispute opened: ${dispute.reason}`,
    metadata: {
      dispute_id: dispute.id,
      dispute_reason: dispute.reason,
      dispute_status: dispute.status,
    },
  });

  // Notify chef
  await notifyChefOfDispute(dispute);
}
```

---

## Handling Dispute Closed

```typescript
async function handleDisputeClosed(stripeEvent: Stripe.Event) {
  const dispute = stripeEvent.data.object as Stripe.Dispute;

  if (dispute.status === 'won') {
    // Chef won dispute - reverse negative adjustment
    await appendLedgerEntry({
      eventId: dispute.metadata.event_id,
      tenantId: dispute.metadata.tenant_id,
      entryType: 'adjustment',
      amountCents: dispute.amount,
      stripeEventId: stripeEvent.id,
      notes: 'Dispute won - funds restored',
    });
  } else {
    // Chef lost - amount remains deducted
    await appendLedgerEntry({
      eventId: dispute.metadata.event_id,
      tenantId: dispute.metadata.tenant_id,
      entryType: 'adjustment',
      amountCents: 0,
      stripeEventId: stripeEvent.id,
      notes: 'Dispute lost - funds forfeited',
    });
  }
}
```

---

## V1 Scope

### Included
- Webhook handling
- Ledger logging
- Chef notification

### Excluded
- Automated evidence submission
- Dispute response UI (chef responds via Stripe dashboard)
- Dispute analytics

---

**End of Dispute Handling**
