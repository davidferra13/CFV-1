# Public Layer - Inquiry Error Handling

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Error Categories

### 1. Validation Errors
**Examples**: Invalid email, message too short
**Display**: Inline below field
**Action**: User can correct and resubmit

### 2. Rate Limit Errors
**Message**: "Too many submissions. Try again in 1 hour."
**Display**: Inline or alert banner
**Action**: User must wait

### 3. Network Errors
**Message**: "Unable to submit. Check your connection."
**Display**: Inline error
**Action**: User can retry

### 4. Database Errors
**Message**: "Something went wrong. Please try again."
**Display**: Inline error
**Action**: User can retry

---

## Error Display

```tsx
{error && (
  <div className="bg-red-50 border border-red-200 p-4 rounded">
    <p className="text-red-700">{error}</p>
  </div>
)}
```

---

## Error Logging

```typescript
try {
  await submitInquiry(data);
} catch (err) {
  console.error('Inquiry submission failed', {
    error: err,
    email: data.email,
    timestamp: new Date(),
  });

  return {
    error: 'Unable to submit inquiry. Please try again.',
  };
}
```

---

**Status**: Error handling is LOCKED for V1.
