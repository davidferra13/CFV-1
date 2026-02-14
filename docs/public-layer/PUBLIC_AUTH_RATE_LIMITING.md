# Public Layer - Auth Rate Limiting

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Purpose

Prevents brute-force attacks on signin/signup endpoints.

---

## Supabase Built-In Rate Limiting

### Signin Rate Limit
- **Limit**: 5 failed attempts per email
- **Window**: 5 minutes
- **Behavior**: Temporary lockout, returns error
- **Implementation**: Automatic (Supabase Auth)

---

### Signup Rate Limit
- **Limit**: 10 signups per hour per IP (Supabase default)
- **Behavior**: Returns error after limit exceeded
- **Implementation**: Automatic (Supabase Auth)

---

## Custom Rate Limiting (NOT in V1)

### V1 Decision
Rely on Supabase's built-in rate limiting. NO custom implementation.

### V1.1 Consideration
If needed, add custom rate limiting:
- Per-IP limits on /signin and /signup pages
- Redis-based tracking
- Custom error messages

---

**Status**: Rate limiting rules are LOCKED for V1 (Supabase default only).
