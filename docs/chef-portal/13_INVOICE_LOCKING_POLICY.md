# Invoice Locking Policy (V1)

## Financial Terms Locking

Once deposit is paid (`confirmed` status), financial terms become **locked**.

---

## Locked Fields

After deposit confirmation:
- `total_amount_cents`: Cannot be changed
- `deposit_amount_cents`: Cannot be changed

Changes require new proposal or adjustment ledger entry.

---

## Enforcement

```typescript
async function updateEventPricing(
  eventId: string,
  totalCents: number,
  depositCents: number
) {
  const event = await db.events.findUnique({
    where: { id: eventId },
  });

  const financiallyLocked = [
    'confirmed',
    'menu_in_progress',
    'menu_locked',
    'executed',
    'closed',
  ].includes(event.status);

  if (financiallyLocked) {
    throw new Error('Cannot change pricing after deposit confirmed');
  }

  await db.events.update({
    where: { id: eventId },
    data: {
      total_amount_cents: totalCents,
      deposit_amount_cents: depositCents,
    },
  });
}
```

---

## Price Changes via Adjustment

If price change needed after locking:

```typescript
async function applyPriceAdjustment(
  eventId: string,
  adjustmentCents: number,
  reason: string
) {
  await appendLedgerEntry({
    eventId,
    tenantId: event.tenant_id,
    entryType: 'adjustment',
    amountCents: adjustmentCents,
    notes: `Price adjustment: ${reason}`,
  });
}
```

---

**End of Invoice Locking Policy**
