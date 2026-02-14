# Stripe Tenant Scoping (V1)

## Two Approaches

### Approach 1: Platform Account (V1 Default)
Single Stripe account, use metadata to scope to tenants.

```typescript
const paymentIntent = await stripe.paymentIntents.create({
  amount: depositCents,
  currency: 'usd',
  metadata: {
    tenant_id: chefId,
    event_id: eventId,
  },
});
```

### Approach 2: Stripe Connect (Future)
Each chef has their own connected Stripe account.

---

## Metadata Requirements

Every Stripe object (PaymentIntent, Refund) must include:
- `tenant_id`: Chef's ID
- `event_id`: Event ID (if applicable)

```typescript
interface StripeMetadata {
  tenant_id: string;
  event_id: string;
  client_profile_id?: string;
}
```

---

## Webhook Tenant Extraction

```typescript
async function handleWebhook(stripeEvent: Stripe.Event) {
  const tenantId = stripeEvent.data.object.metadata.tenant_id;

  if (!tenantId) {
    console.error('Webhook missing tenant_id:', stripeEvent.id);
    return;
  }

  // Process with tenant context
  await processWebhookForTenant(stripeEvent, tenantId);
}
```

---

## Isolation Guarantee

RLS ensures even if metadata is spoofed, ledger entries are tenant-isolated.

---

**End of Stripe Tenant Scoping**
