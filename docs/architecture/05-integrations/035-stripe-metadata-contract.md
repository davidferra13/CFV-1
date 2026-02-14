# Stripe Metadata Contract

**Document ID**: 035
**Version**: 1.0.0
**Status**: Active
**Last Updated**: 2026-02-14

---

## Purpose

Defines the required metadata attached to Stripe objects for event reconciliation and webhook processing.

---

## Payment Intent Metadata

**Required Fields**:
```typescript
metadata: {
  event_id: string;    // ChefFlow event UUID
  tenant_id: string;   // Chef's UUID
  client_id: string;   // Client's UUID (optional)
}
```

**Example**:
```typescript
await stripe.paymentIntents.create({
  amount: 10000,
  currency: 'usd',
  metadata: {
    event_id: 'event-uuid',
    tenant_id: 'chef-uuid',
    client_id: 'client-uuid',
  },
});
```

---

## Usage in Webhooks

```typescript
const { event_id, tenant_id } = paymentIntent.metadata;

await supabase.from('ledger_entries').insert({
  tenant_id,
  event_id,
  amount: paymentIntent.amount,
  // ...
});
```

---

## References

- **Stripe Integration Boundary**: `033-stripe-integration-boundary.md`
- **Webhook Handling Model**: `034-webhook-handling-model.md`
