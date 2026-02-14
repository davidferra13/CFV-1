# Authentication Surface

**Document ID**: 020
**Version**: 1.0.0
**Status**: Active
**Last Updated**: 2026-02-14

---

## Purpose

Defines the complete authentication surface area for ChefFlow V1. This document specifies all authentication entry points, flows, and enforcement mechanisms. Every authenticated action MUST be documented here.

---

## Authentication Provider

### Supabase Auth

**Engine**: Supabase Auth (PostgreSQL-backed, JWT-based)

**Why Supabase Auth**:
- ✅ Built-in email/password authentication
- ✅ Secure password hashing (bcrypt)
- ✅ Session management via HTTP-only cookies
- ✅ Email verification (optional in V1)
- ✅ Password reset flow
- ✅ Integrated with Supabase RLS (same auth.users table)

**NOT Used in V1**:
- ❌ OAuth providers (Google, GitHub, etc.)
- ❌ Magic links
- ❌ Phone/SMS authentication
- ❌ Multi-factor authentication (MFA)

---

## Authentication Entry Points

### 1. Chef Signup

**Route**: `/signup` (public route)

**Method**: POST via form submission

**Required Fields**:
```typescript
{
  email: string;           // Valid email format
  password: string;        // Min 8 chars, at least 1 number
  businessName: string;    // Chef's business name
  fullName: string;        // Chef's full name
}
```

**Flow**:
```
1. User submits signup form
2. Client validates input (Zod schema)
3. POST to Supabase Auth: auth.signUp()
4. Supabase creates user in auth.users table
5. Server-side function:
   - Creates chef in chefs table
   - Creates user_roles entry (role: 'chef')
6. Supabase sends email verification (optional)
7. User redirected to /dashboard
8. Session cookie set (HTTP-only, secure)
```

**Supabase Call**:
```typescript
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      business_name: businessName,
      full_name: fullName,
    },
  },
});
```

**Database Trigger** (creates chef and role):
```sql
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();
```

---

### 2. Client Signup (Invitation-Based)

**Route**: `/invite?token={invitation_token}` (public route)

**Method**: POST via form submission

**Required Fields**:
```typescript
{
  token: string;          // Invitation token (UUID)
  password: string;       // Min 8 chars
  fullName: string;       // Client's full name
}
```

**Flow**:
```
1. Chef sends invitation (creates client_invitations row)
2. Client receives email with link: /invite?token=xxx
3. Client clicks link, sees signup form (email pre-filled)
4. Client submits password + name
5. Server validates token (not expired, not used)
6. Server creates auth.users entry
7. Server creates clients entry (tenant_id from invitation)
8. Server creates user_roles entry (role: 'client')
9. Server marks invitation as used
10. Client redirected to /my-events
11. Session cookie set
```

**Token Validation**:
```typescript
const invitation = await supabase
  .from('client_invitations')
  .select('*')
  .eq('token', token)
  .is('used_at', null)
  .gt('expires_at', new Date().toISOString())
  .single();

if (!invitation) {
  throw new Error('Invalid or expired invitation');
}
```

**Critical Rule**: Clients CANNOT sign up without invitation (no public client signup route)

---

### 3. Signin (Both Portals)

**Route**: `/signin` (public route)

**Method**: POST via form submission

**Required Fields**:
```typescript
{
  email: string;
  password: string;
}
```

**Flow**:
```
1. User submits signin form
2. POST to Supabase Auth: auth.signInWithPassword()
3. Supabase validates credentials
4. If valid, session cookie set
5. Middleware determines role (chef vs client)
6. Redirect to appropriate portal:
   - Chef → /dashboard
   - Client → /my-events
```

**Supabase Call**:
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});
```

**Post-Signin Redirect** (handled by middleware):
```typescript
const user = await getCurrentUser();
if (user.role === 'chef') {
  return NextResponse.redirect('/dashboard');
} else if (user.role === 'client') {
  return NextResponse.redirect('/my-events');
}
```

---

### 4. Signout

**Route**: `/api/auth/signout` (protected route)

**Method**: POST

**Flow**:
```
1. User clicks "Sign Out" button
2. POST to /api/auth/signout
3. Server calls auth.signOut()
4. Session cookie cleared
5. Redirect to /signin
```

**Implementation**:
```typescript
export async function POST() {
  const supabase = createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect('/signin');
}
```

---

### 5. Password Reset Request

**Route**: `/forgot-password` (public route)

**Method**: POST via form submission

**Required Fields**:
```typescript
{
  email: string;
}
```

**Flow**:
```
1. User enters email, submits form
2. POST to Supabase Auth: auth.resetPasswordForEmail()
3. Supabase sends password reset email
4. Email contains link: /reset-password?token=xxx
5. User redirected to /signin with success message
```

**Supabase Call**:
```typescript
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
});
```

**Security**: Email sent even if user doesn't exist (prevents email enumeration)

---

### 6. Password Reset Completion

**Route**: `/reset-password?token={reset_token}` (public route)

**Method**: POST via form submission

**Required Fields**:
```typescript
{
  password: string;  // New password (min 8 chars)
}
```

**Flow**:
```
1. User clicks link in email (token in URL)
2. User enters new password, submits form
3. POST to Supabase Auth: auth.updateUser()
4. Supabase validates token and updates password
5. User redirected to /signin
```

**Supabase Call**:
```typescript
const { error } = await supabase.auth.updateUser({
  password: newPassword,
});
```

---

## Session Management

### Session Storage

**Mechanism**: HTTP-only cookies

**Cookie Name**: `sb-{project-ref}-auth-token`

**Cookie Attributes**:
```
HttpOnly: true      // Not accessible via JavaScript
Secure: true        // HTTPS only (except localhost)
SameSite: Lax       // CSRF protection
Path: /             // Available to all routes
Max-Age: 3600       // 1 hour (configurable)
```

**Set By**: Supabase Auth (automatic)

**Read By**: Supabase client (automatic)

### Session Lifetime

**Default**: 1 hour (3600 seconds)

**Refresh Token**: Valid for 7 days

**Auto-Refresh**: Supabase client automatically refreshes session when < 60 seconds remaining

**Configuration** (Supabase Dashboard):
- Settings → Auth → JWT expiry: 3600 seconds
- Settings → Auth → Refresh token rotation: Enabled

### Session Validation

**On Every Request** (middleware):
```typescript
export async function middleware(request: NextRequest) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.redirect('/signin');
  }

  // Session valid, continue
  return NextResponse.next();
}
```

---

## JWT Structure

### Access Token (JWT)

**Issued By**: Supabase Auth

**Payload**:
```json
{
  "aud": "authenticated",
  "exp": 1707950400,
  "iat": 1707946800,
  "iss": "https://[project-ref].supabase.co/auth/v1",
  "sub": "00000000-0000-0000-0000-000000000001",
  "email": "chef@example.com",
  "role": "authenticated",
  "app_metadata": {},
  "user_metadata": {
    "business_name": "Test Chef Co",
    "full_name": "John Chef"
  }
}
```

**Claims Used**:
- `sub`: User ID (auth.users.id)
- `email`: User email
- `exp`: Expiration timestamp
- `user_metadata`: Custom data from signup

**Claims NOT Used**:
- `role` (always "authenticated", not chef/client role)
- `app_metadata` (empty in V1)

**Critical**: Do NOT rely on JWT claims for chef/client role. Role is authoritative in `user_roles` table.

### Refresh Token

**Type**: Opaque token (not JWT)

**Stored**: Supabase database (auth.refresh_tokens table)

**Purpose**: Exchange for new access token when expired

**Rotation**: New refresh token issued on each refresh (automatic)

---

## Role Resolution After Authentication

### Problem

JWT doesn't contain chef/client role (only "authenticated").

### Solution

**Server-Side Role Lookup**:

```typescript
// lib/auth/get-user.ts
export async function getCurrentUser() {
  const supabase = createClient();

  // 1. Get authenticated user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // 2. Query role from user_roles table
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role, chef_id, client_id')
    .eq('auth_user_id', user.id)
    .single();

  if (!roleData) {
    throw new Error('User has no role assigned');
  }

  return {
    id: user.id,
    email: user.email,
    role: roleData.role,
    tenantId: roleData.chef_id,
    clientId: roleData.client_id,
  };
}
```

**Usage**: Called at start of every protected route/component

**Performance**: Cached per request (React Server Components cache)

---

## Protected Routes

### Route Protection Strategy

**Middleware**: First layer (network-level)

**Layout**: Second layer (before rendering)

**RLS**: Third layer (database-level)

### Middleware Protection

**File**: `middleware.ts`

```typescript
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes (no auth required)
  if (pathname.startsWith('/api/webhooks')) return NextResponse.next();
  if (pathname === '/signin') return NextResponse.next();
  if (pathname === '/signup') return NextResponse.next();
  if (pathname === '/') return NextResponse.next();

  // Protected routes (auth required)
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.redirect(new URL('/signin', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

**Effect**: Unauthenticated users redirected BEFORE HTML is sent

---

## Public Routes

### Allowed Without Authentication

| Route | Purpose |
|-------|---------|
| `/` | Landing page |
| `/pricing` | Pricing information |
| `/contact` | Contact form |
| `/signin` | Sign in page |
| `/signup` | Chef signup page |
| `/forgot-password` | Password reset request |
| `/reset-password` | Password reset completion |
| `/invite` | Client invitation acceptance |
| `/api/webhooks/stripe` | Stripe webhook endpoint |

**Critical**: All other routes MUST require authentication

---

## Authentication Errors

### Invalid Credentials

**Trigger**: Wrong email/password on signin

**Response**: `400 Bad Request` with message "Invalid login credentials"

**User Message**: "Invalid email or password"

**Security**: Same message for both cases (prevents email enumeration)

### Expired Session

**Trigger**: Access token expired, refresh token expired

**Response**: Redirect to `/signin`

**User Message**: "Your session has expired. Please sign in again."

### Invalid Invitation Token

**Trigger**: Expired or already-used invitation token

**Response**: `400 Bad Request` with message "Invalid or expired invitation"

**User Message**: "This invitation link is invalid or has expired."

---

## Password Requirements

### Minimum Requirements

**Enforced By**: Supabase Auth (configurable in dashboard)

- Minimum length: 8 characters
- At least 1 lowercase letter
- At least 1 uppercase letter
- At least 1 number
- At least 1 special character (optional in V1)

**Configuration**: Supabase Dashboard → Auth → Password requirements

### Password Validation (Client-Side)

```typescript
import { z } from 'zod';

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');
```

**Purpose**: Provide immediate feedback (server is final validator)

---

## Email Verification

### V1 Status

**Enabled**: No (optional)

**Reason**: Reduces friction for V1, chef can manually verify clients

**Post-V1**: Enable email verification for security

### If Enabled (Post-V1)

**Flow**:
1. User signs up
2. Supabase sends verification email
3. User clicks link
4. Email marked as verified (auth.users.email_confirmed_at)
5. User can sign in

**Enforcement**:
```typescript
const { data: { user } } = await supabase.auth.getUser();
if (!user.email_confirmed_at) {
  return redirect('/verify-email');
}
```

---

## Authentication Logging

### Logged Events

**Supabase Auth Logs** (automatic):
- Signup attempts (success/failure)
- Signin attempts (success/failure)
- Password reset requests
- Password reset completions
- Token refreshes

**Access**: Supabase Dashboard → Logs → Auth

**Retention**: 7 days

### Application Logs

**V1 Limitation**: No additional logging beyond Supabase Auth logs

**Post-V1**: Log to external service (Datadog, Loggly)

---

## Security Headers

### Content Security Policy

**File**: `next.config.js`

```javascript
headers: [
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com; connect-src 'self' https://*.supabase.co https://api.stripe.com;"
  }
]
```

**Purpose**: Prevent XSS attacks

### X-Frame-Options

```
X-Frame-Options: DENY
```

**Purpose**: Prevent clickjacking

### Strict-Transport-Security

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

**Purpose**: Enforce HTTPS

---

## Authentication Anti-Patterns

### ❌ NEVER Do This

**Trusting Client-Side Role**:
```typescript
// WRONG: Role from localStorage (client can modify)
const role = localStorage.getItem('role');
```

**Storing Session in localStorage**:
```typescript
// WRONG: Accessible via JavaScript (XSS risk)
localStorage.setItem('session', JSON.stringify(session));
```

**Bypassing Middleware**:
```typescript
// WRONG: Direct database access without auth check
const events = await supabase.from('events').select('*');
```

### ✅ CORRECT Patterns

**Server-Side Role Resolution**:
```typescript
const user = await getCurrentUser();
const role = user.role; // From database
```

**HTTP-Only Cookies**:
```typescript
// CORRECT: Supabase handles cookie storage (automatic)
await supabase.auth.signInWithPassword({ email, password });
```

**RLS Enforcement**:
```typescript
// CORRECT: RLS policies enforce access control
const events = await supabase.from('events').select('*');
// Only returns events user can access (RLS filtered)
```

---

## Verification Checklist

Before production deployment:

- [ ] Middleware protects all non-public routes
- [ ] Role resolution queries `user_roles` table (not JWT)
- [ ] Session cookies are HTTP-only and secure
- [ ] Password requirements enforced (min 8 chars)
- [ ] Invalid credentials don't reveal email existence
- [ ] Client signup requires invitation token
- [ ] Password reset emails sent successfully
- [ ] Signout clears session completely
- [ ] No session data in localStorage or sessionStorage
- [ ] Security headers configured in `next.config.js`

---

## References

- **Role Resolution Boundary**: `021-role-resolution-boundary.md`
- **Session Management**: `025-session-management.md`
- **RLS Enforcement**: `022-rls-enforcement-philosophy.md`
- **Multi-Tenant Isolation**: `024-multi-tenant-isolation.md`
