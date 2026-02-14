# Public Layer - CSRF Protection Rules

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Protection Methods

### 1. Server Actions (Automatic)
Next.js Server Actions include automatic CSRF tokens.

### 2. API Routes (Manual)
Validate `Origin` and `Referer` headers:

```typescript
const origin = req.headers.get('origin');
if (!origin || !allowedOrigins.includes(origin)) {
  return new Response('Forbidden', { status: 403 });
}
```

### 3. SameSite Cookies
Session cookies use `SameSite=Lax` (Supabase default).

---

**Status**: LOCKED for V1.
