# Public Layer - Duplicate Submission Prevention

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Prevention Methods

### 1. Idempotency (5-minute window)
Hash-based deduplication of inquiry submissions.

### 2. Disable Submit Button
```tsx
<button type="submit" disabled={isPending}>
  {isPending ? 'Submitting...' : 'Submit'}
</button>
```

### 3. Form Reset (Optional)
Clear form after successful submission.

---

**Status**: LOCKED for V1.
