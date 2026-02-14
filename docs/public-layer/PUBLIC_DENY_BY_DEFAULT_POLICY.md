# Public Layer - Deny By Default Policy

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Principle

All routes are DENIED by default unless explicitly allowed.

---

## Implementation

Middleware allows specific public routes, blocks everything else (unless handled by portal middleware).

```typescript
const publicRoutes = ['/', '/services', '/how-it-works', '/pricing', '/inquire', '/signin', '/signup', '/terms', '/privacy'];

if (!publicRoutes.includes(path) && !session) {
  return NextResponse.redirect(new URL('/signin', req.url));
}
```

---

**Status**: LOCKED for V1.
