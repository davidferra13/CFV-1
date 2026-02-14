# Public Layer - Inquiry Network Failure Recovery

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Network Failure Scenarios

### 1. Request Timeout
**Cause**: Slow network, server unresponsive
**Timeout**: 10 seconds
**Recovery**: Show error, allow retry

### 2. Connection Lost
**Cause**: User's internet drops mid-request
**Detection**: Network error from fetch
**Recovery**: Show error, allow retry

### 3. Supabase Unavailable
**Cause**: Supabase outage (rare)
**Detection**: 5xx status code
**Recovery**: Show error, allow retry

---

## Retry Strategy

**V1**: Manual retry (user must click submit again)
**V1.1**: Consider automatic retry with exponential backoff

---

## Implementation

```typescript
export async function submitInquiry(data: InquirySchemaType) {
  try {
    const response = await fetch('/api/inquire', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!response.ok) {
      throw new Error('Submission failed');
    }

    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      return { error: 'Request timed out. Please try again.' };
    }

    return {
      error: 'Unable to submit. Please check your connection and try again.',
    };
  }
}
```

---

## User Communication

```tsx
{error && (
  <div className="error">
    <p>{error}</p>
    <button onClick={handleRetry}>Try Again</button>
  </div>
)}
```

---

**Status**: Network failure recovery is LOCKED for V1.
