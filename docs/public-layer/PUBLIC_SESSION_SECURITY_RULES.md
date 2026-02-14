# Public Layer - Session Security Rules

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Purpose

Defines session management security best practices enforced by Supabase Auth.

---

## Session Cookie Security

### HttpOnly Flag
**Rule**: Session cookies MUST NOT be accessible via JavaScript.
**Enforcement**: Supabase sets `HttpOnly=true` by default.

---

### Secure Flag
**Rule**: Session cookies MUST only be sent over HTTPS.
**Enforcement**: Supabase sets `Secure=true` in production.

---

### SameSite Attribute
**Rule**: Session cookies use `SameSite=Lax` to prevent CSRF.
**Enforcement**: Supabase default.

---

## Session Duration

- **Default**: 7 days
- **Refresh**: Automatic (refresh token valid for 30 days)
- **Expiry Behavior**: User must re-signin after expiration

---

## Session Invalidation

### Manual Logout
```typescript
await supabase.auth.signOut();
```

**Behavior**: Deletes session cookie immediately.

---

### Automatic Expiry
After 7 days of inactivity, session expires automatically.

---

## Multi-Device Sessions

**V1 Behavior**: Users can have multiple active sessions (different devices).

**V1.1 Consideration**: Limit to single active session (invalidate old sessions on new signin).

---

**Status**: Session security rules are LOCKED for V1.
