# Price Change Handling (V1)

## Before Deposit (Draft/Proposed)

Price changes allowed directly:

```typescript
await db.events.update({
  where: { id: eventId },
  data: {
    total_amount_cents: newTotal,
    deposit_amount_cents: newDeposit,
  },
});
```

---

## After Deposit (Confirmed+)

Price changes via ledger adjustment only:

```typescript
async function adjustEventPrice(
  eventId: string,
  newTotal: number,
  reason: string
) {
  const event = await db.events.findUnique({
    where: { id: eventId },
  });

  const difference = newTotal - event.total_amount_cents;

  // Log adjustment
  await appendLedgerEntry({
    eventId,
    tenantId: event.tenant_id,
    entryType: 'adjustment',
    amountCents: difference,
    notes: `Price adjustment: ${reason}`,
  });

  // Update expected total (for display purposes)
  await db.events.update({
    where: { id: eventId },
    data: { total_amount_cents: newTotal },
  });
}
```

---

## Client Notification

Any price change after proposal should notify client:

```typescript
await sendEmail({
  to: client.email,
  subject: 'Event Price Updated',
  body: `The total price for your event has been updated to $${newTotal / 100}. Reason: ${reason}`,
});
```

---

**End of Price Change Handling**
