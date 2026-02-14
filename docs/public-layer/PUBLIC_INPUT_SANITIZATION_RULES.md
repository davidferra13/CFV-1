# Public Layer - Input Sanitization Rules

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Rule

ALL user input MUST be sanitized before database insertion.

---

## Sanitization Function

```typescript
function sanitizeString(input: string): string {
  return input
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .trim();
}
```

---

## Application

Apply to:
- Inquiry form: name, message
- Signup forms: business name, full name

---

**Status**: LOCKED for V1.
