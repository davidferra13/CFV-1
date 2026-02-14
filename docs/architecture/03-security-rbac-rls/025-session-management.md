# Session Management

**Document ID**: 025
**Version**: 1.0.0
**Status**: Active
**Last Updated**: 2026-02-14

---

## Purpose

Defines session storage, lifecycle, and security for ChefFlow V1. Sessions are managed entirely by Supabase Auth using HTTP-only cookies.

---

## Session Storage

**Mechanism**: HTTP-only cookies (set by Supabase Auth)

**Cookie Name**: `sb-{project-ref}-auth-token`

**Attributes**:
- `HttpOnly`: true (not accessible via JavaScript)
- `Secure`: true (HTTPS only, except localhost)
- `SameSite`: Lax (CSRF protection)
- `Path`: /
- `Max-Age`: 3600 (1 hour)

---

## Session Lifecycle

**Creation**: On signin or signup (automatic)

**Refresh**: Auto-refreshed by Supabase client when < 60 seconds remaining

**Expiration**: 1 hour (configurable in Supabase Dashboard)

**Refresh Token Lifetime**: 7 days

---

## Session Validation

**Middleware**:
```typescript
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  return NextResponse.redirect('/signin');
}
```

**Server Components**:
```typescript
const user = await getCurrentUser(); // Throws if session invalid
```

---

## Session Termination

**Manual Signout**:
```typescript
await supabase.auth.signOut();
// Cookie cleared, redirect to /signin
```

**Automatic Expiration**: After 7 days of inactivity (refresh token expires)

---

## References

- **Auth Surface**: `020-auth-surface.md`
- **Role Resolution Boundary**: `021-role-resolution-boundary.md`
