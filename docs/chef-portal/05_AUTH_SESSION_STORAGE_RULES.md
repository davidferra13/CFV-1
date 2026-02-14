# Auth Session Storage Rules (V1)

## Session Storage

**Supabase Auth** stores session in HttpOnly cookie.

## Cookie Attributes

- **HttpOnly**: JavaScript cannot access (XSS protection)
- **Secure**: Only sent over HTTPS
- **SameSite=Lax**: CSRF protection
- **Max-Age**: 7 days (configurable)

## Session Retrieval

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { cookies }
);

const { data: { user } } = await supabase.auth.getUser();
```

## Session Expiration

- Default: 7 days
- Refresh token extends session automatically
- If expired: User redirected to /login

## Logout

```typescript
await supabase.auth.signOut();
// Cookie cleared, session invalidated
```

## Security

- ✅ Session token in HttpOnly cookie (cannot be stolen via XSS)
- ✅ Secure flag (HTTPS only)
- ✅ SameSite=Lax (CSRF protection)
- ❌ Never store session in localStorage (insecure)
