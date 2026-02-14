# Public Layer - Network Interrupt Handling

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Timeout Handling

```typescript
const response = await fetch('/api/inquire', {
  method: 'POST',
  signal: AbortSignal.timeout(10000), // 10s timeout
});
```

---

## Connection Lost

```typescript
try {
  await submitInquiry(data);
} catch (error) {
  if (error.name === 'AbortError') {
    return { error: 'Request timed out. Please try again.' };
  }
  return { error: 'Network error. Please check your connection.' };
}
```

---

**Status**: LOCKED for V1.
