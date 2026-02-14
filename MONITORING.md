# Monitoring and Observability

**Version**: 1.0
**Last Updated**: 2026-02-13

Guide to monitoring ChefFlow V1 in production.

---

## Overview

ChefFlow V1 uses **basic monitoring** with Vercel and Supabase built-in tools. Advanced monitoring (Sentry, DataDog) is excluded from V1 scope.

---

## Vercel Monitoring

### Deployment Status

**Location**: Vercel Dashboard → Deployments

**Monitor**:
- Deployment success/failure
- Build time
- Deploy time
- Production vs Preview

### Function Logs

**Location**: Deployments → Functions → Select function

**Key functions to monitor**:
- `/api/webhooks/stripe` - Webhook handling
- Server Actions - Event mutations

**What to look for**:
- Errors (500 status)
- Slow response times (>1s)
- High invocation count (potential abuse)

### Analytics (Optional)

Enable Vercel Analytics:

1. Go to project → Analytics
2. Enable Web Analytics
3. View:
   - Page views
   - Unique visitors
   - Top pages

---

## Supabase Monitoring

### Database Performance

**Location**: Supabase Dashboard → Reports

**Monitor**:
- Active connections
- Database size
- Query performance

**Alerts**:
- Connection pool exhaustion
- Slow queries (>1s)

### Auth Metrics

**Location**: Authentication → Users

**Monitor**:
- Total users (chefs + clients)
- New signups per day
- Failed login attempts

---

## Stripe Monitoring

### Webhook Delivery

**Location**: Stripe Dashboard → Developers → Webhooks → Your endpoint

**Monitor**:
- Delivery success rate (should be >99%)
- Failed deliveries (investigate causes)
- Retry attempts

**Alert on**:
- Consecutive failures (>3)
- Endpoint down

### Payment Metrics

**Location**: Stripe Dashboard → Payments

**Monitor**:
- Successful payments
- Failed payments
- Refunds
- Chargebacks

---

## Health Checks

### Application Health

Create simple health check endpoint:

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    // Check database connection
    const supabase = createServerClient()
    const { error } = await supabase.from('chefs').select('count').single()

    if (error) throw error

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error.message
      },
      { status: 500 }
    )
  }
}
```

**Check**: `curl https://yourdomain.com/api/health`

### Uptime Monitoring

Use external service (free tier):

- **UptimeRobot** (uptimerobot.com)
- **Better Uptime** (betteruptime.com)
- **Pingdom** (pingdom.com)

**Configuration**:
- URL: `https://yourdomain.com/api/health`
- Interval: 5 minutes
- Alert: Email if down >2 checks

---

## Error Logging

### Server-Side Errors

V1 uses `console.error` only (no Sentry):

```typescript
try {
  await createEvent(data)
} catch (error) {
  console.error('[CREATE_EVENT]', error)
  // Log to Vercel function logs
}
```

View in: Vercel → Functions → Logs

### Client-Side Errors

Basic error boundaries:

```typescript
// app/error.tsx
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  console.error('[APP_ERROR]', error)

  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  )
}
```

---

## Key Metrics to Track

### Business Metrics

- Total chefs
- Total clients
- Total events (by status)
- Total revenue (from ledger)
- Conversion rate (proposed → paid)

**Query**:
```sql
-- Total chefs
SELECT COUNT(*) FROM chefs;

-- Total events by status
SELECT status, COUNT(*) FROM events GROUP BY status;

-- Total revenue
SELECT SUM(amount_cents) FROM ledger_entries
WHERE entry_type = 'charge_succeeded';
```

### Technical Metrics

- API response time (Vercel)
- Database query time (Supabase)
- Webhook success rate (Stripe)
- Error rate (Vercel logs)

---

## Alerting

### Critical Alerts

Set up alerts for:

1. **Application down** (uptime monitor)
2. **Webhook failures** (Stripe dashboard)
3. **Database errors** (Supabase logs)
4. **Payment failures** (Stripe dashboard)

### Alert Channels

- **Email**: Primary (Vercel/Stripe send by default)
- **Slack**: Optional (integrate via webhooks)
- **SMS**: For critical issues (via Twilio, future)

---

## Logging Best Practices

### Structured Logging

Use consistent format:

```typescript
console.log('[CONTEXT] Message', { data })

// Examples
console.log('[WEBHOOK] Payment succeeded', { eventId, amount })
console.error('[AUTH] Login failed', { email, reason })
```

### Log Levels

- `console.log` - Info
- `console.warn` - Warning (non-critical)
- `console.error` - Error (requires attention)

### Avoid Logging

- Secrets (API keys, tokens)
- PII (emails, addresses) in production
- Full request bodies (may contain sensitive data)

---

## Performance Monitoring

### Database Query Performance

Check slow queries in Supabase:

1. Dashboard → Logs
2. Filter: Query duration >1s
3. Optimize with indexes

### Function Performance

Check Vercel function duration:

1. Functions → Select function
2. View average duration
3. Optimize if >1s

---

## Incident Response

### When Something Breaks

1. **Check uptime monitor** - Is app down?
2. **Check Vercel logs** - Recent errors?
3. **Check Supabase** - Database healthy?
4. **Check Stripe** - Webhook delivery?
5. **Rollback** if needed (Vercel → Previous deployment)

### Post-Incident

1. Document what happened
2. Identify root cause
3. Add monitoring/alerts to prevent recurrence

---

## Future Enhancements (Post-V1)

Planned for V2:

- **Sentry** - Error tracking
- **LogRocket** - Session replay
- **DataDog** - Full observability
- **Custom dashboard** - Business metrics

---

## Related Documentation

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues
- [SCRIPTS_REFERENCE.md](./SCRIPTS_REFERENCE.md) - Verification scripts

---

**Last Updated**: 2026-02-13
