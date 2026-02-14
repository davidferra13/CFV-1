# Error Boundary Model

**Document ID**: 037
**Version**: 1.0.0
**Status**: Active
**Last Updated**: 2026-02-14

---

## Purpose

Defines error handling and boundary patterns for ChefFlow V1.

---

## Error Boundaries

### React Error Boundary

**File**: `app/error.tsx`

```typescript
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div>
      <h2>Something went wrong</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

---

### Server Action Error Handling

```typescript
'use server';

export async function createEvent(formData: FormData) {
  try {
    // ... logic
  } catch (error) {
    console.error('Failed to create event:', error);
    throw new Error('Failed to create event');
  }
}
```

---

## Error Logging

**V1 Limitation**: `console.error()` only (logs to Vercel runtime logs)

**Post-V1**: Integrate Sentry for error tracking

---

## References

- **Logging Model**: `038-logging-model.md`
- **Monitoring Surface**: `039-monitoring-surface.md`
