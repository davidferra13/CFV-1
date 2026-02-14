# Observability & Logging (V1)

## Logging Levels

- **INFO**: Normal operations (event created, transition completed)
- **WARN**: Unexpected but handled (duplicate webhook, validation warning)
- **ERROR**: Failures requiring attention (payment failed, API error)

---

## What to Log

### Critical Operations

```typescript
console.log('Event created:', { eventId, tenantId, clientId });
console.log('Transition completed:', { eventId, fromStatus, toStatus, triggeredBy });
console.error('Payment failed:', { eventId, error: error.message });
```

---

### Sensitive Data

**Never log:**
- Payment card numbers
- Full Stripe API keys
- Client private data
- Auth tokens

---

## Log Format

```typescript
{
  timestamp: '2026-02-14T12:00:00Z',
  level: 'INFO',
  message: 'Event created',
  context: {
    eventId: 'event-123',
    tenantId: 'chef-456',
    userId: 'user-789',
  },
}
```

---

## Error Tracking (Future)

V1: Console logs only.

V2: Integrate Sentry or similar for production error tracking.

---

**End of Observability & Logging**
