# RLS Service Role Bypass Rules (V1)

## Service Role

**Supabase service role key** bypasses RLS.

## When to Use Service Role

✅ **Allowed**:
- Webhook processing (Stripe events → ledger)
- Admin operations (rare, manual)
- Database migrations

❌ **Forbidden**:
- User-initiated requests
- Client-side code
- Untrusted contexts

## Protection

- Service role key stored server-side only
- Never exposed to client
- Logged when used
- Rotated regularly

## Example: Webhook Handler

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // Bypasses RLS
);

export async function POST(req: Request) {
  const event = await verifyStripeWebhook(req);

  // Service role can write ledger without RLS filtering
  await supabase.from('ledger_entries').insert({
    event_id: event.metadata.event_id,
    entry_type: 'charge_succeeded',
    amount_cents: event.amount
  });

  return new Response('OK');
}
```
