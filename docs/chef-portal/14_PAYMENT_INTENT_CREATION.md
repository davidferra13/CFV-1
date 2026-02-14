# Payment Intent Creation (V1)

## Server Action

```typescript
'use server';

import Stripe from 'stripe';
import { getUser } from '@/lib/auth/get-user';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function createPaymentIntent(eventId: string) {
  const user = await getUser();

  if (!user || user.role !== 'chef') {
    throw new Error('Unauthorized');
  }

  const event = await db.events.findUnique({
    where: { id: eventId },
  });

  if (event.tenant_id !== user.tenantId) {
    throw new Error('Access denied');
  }

  if (!event.deposit_amount_cents) {
    throw new Error('Deposit amount not set');
  }

  // Check for existing payment intent
  if (event.payment_intent_id) {
    const existing = await stripe.paymentIntents.retrieve(event.payment_intent_id);
    if (existing.status !== 'canceled') {
      return { clientSecret: existing.client_secret };
    }
  }

  // Create new payment intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: event.deposit_amount_cents,
    currency: 'usd',
    metadata: {
      tenant_id: event.tenant_id,
      event_id: eventId,
      client_profile_id: event.client_profile_id,
    },
    automatic_payment_methods: {
      enabled: true,
    },
  });

  // Store payment intent ID
  await db.events.update({
    where: { id: eventId },
    data: { payment_intent_id: paymentIntent.id },
  });

  // Create pending ledger entry
  await appendLedgerEntry({
    eventId,
    tenantId: event.tenant_id,
    entryType: 'charge_pending',
    amountCents: event.deposit_amount_cents,
    stripePaymentIntentId: paymentIntent.id,
    notes: 'Deposit payment intent created',
  });

  return {
    clientSecret: paymentIntent.client_secret,
  };
}
```

---

## Client Component

```tsx
'use client';

import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export function CheckoutForm({ eventId }: { eventId: string }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  useEffect(() => {
    createPaymentIntent(eventId).then((result) => {
      setClientSecret(result.clientSecret);
    });
  }, [eventId]);

  if (!clientSecret) {
    return <div>Loading...</div>;
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PaymentForm />
    </Elements>
  );
}

function PaymentForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/events/${eventId}/payment/success`,
      },
    });

    if (error) {
      console.error(error.message);
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <button disabled={!stripe || isProcessing}>
        {isProcessing ? 'Processing...' : 'Pay Deposit'}
      </button>
    </form>
  );
}
```

---

**End of Payment Intent Creation**
