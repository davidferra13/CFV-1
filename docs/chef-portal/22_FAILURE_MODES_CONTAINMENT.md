# Failure Modes & Containment (V1)

## Failure Categories

### 1. Database Unavailable
**Symptom**: Connection timeout
**Containment**: Show "Service temporarily unavailable" page
**Recovery**: Auto-retry with exponential backoff

---

### 2. Stripe API Down
**Symptom**: API errors on payment creation
**Containment**: Show retry button, don't block event creation
**Recovery**: Manual retry or delayed webhook processing

---

### 3. Webhook Delay
**Symptom**: Payment succeeded but status still "pending"
**Containment**: Show "Processing..." UI, don't assume failure
**Recovery**: Webhook eventually arrives (up to 24 hours)

---

### 4. RLS Policy Error
**Symptom**: Unauthorized access attempt
**Containment**: Deny access, log attempt, show 403 error
**Recovery**: N/A (working as intended)

---

## Containment Strategies

### Fail Closed
When uncertain, deny access and freeze operations.

### Graceful Degradation
If Stripe is down, allow event viewing but disable payment actions.

### Error Boundaries
Wrap components in React Error Boundaries:

```tsx
import { ErrorBoundary } from 'react-error-boundary';

<ErrorBoundary fallback={<ErrorFallback />}>
  <EventsList />
</ErrorBoundary>
```

---

**End of Failure Modes & Containment**
