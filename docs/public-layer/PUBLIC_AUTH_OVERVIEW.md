# Public Layer - Authentication Overview

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Purpose

This document provides a high-level overview of authentication flows in the Public Layer, including signin, signup (chef and client), role resolution, and post-authentication routing.

---

## Authentication Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Auth Service                    │
│  (Email/Password, Session Management, Password Reset)      │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ Creates auth.users record
                           │ Issues session cookie
                           ▼
        ┌──────────────────────────────────────┐
        │   ChefFlow Database (user_roles)     │
        │   Authoritative role assignment      │
        └──────────────────────────────────────┘
                           │
                           │ Middleware queries role
                           ▼
        ┌──────────────────────────────────────┐
        │      Role-Based Routing              │
        │  chef → /dashboard                   │
        │  client → /my-events                 │
        └──────────────────────────────────────┘
```

---

## Authentication Flows

### 1. Chef Signin
```
User visits /signin
  ↓
Enter email + password
  ↓
Supabase Auth validates credentials
  ↓
[SUCCESS] Create session (cookie)
  ↓
Middleware queries user_roles table
  ↓
role = 'chef'
  ↓
Redirect to /dashboard
```

---

### 2. Client Signin
```
User visits /signin
  ↓
Enter email + password
  ↓
Supabase Auth validates credentials
  ↓
[SUCCESS] Create session (cookie)
  ↓
Middleware queries user_roles table
  ↓
role = 'client'
  ↓
Redirect to /my-events
```

---

### 3. Chef Signup
```
User visits /signup (no token parameter)
  ↓
Enter email, password, business name
  ↓
Server Action: Create auth.users record (Supabase Auth)
  ↓
Server Action: INSERT into chefs table
  ↓
Server Action: INSERT into user_roles table (role='chef')
  ↓
Create session
  ↓
Redirect to /dashboard
```

---

### 4. Client Signup (Invitation-Based)
```
Chef sends invitation → client_invitations record created
  ↓
Client clicks invitation link → /signup?token=xxx
  ↓
Validate token (not expired, not used)
  ↓
Pre-fill email from invitation
  ↓
Client enters password, full name
  ↓
Server Action: Create auth.users record (Supabase Auth)
  ↓
Server Action: INSERT into clients table
  ↓
Server Action: INSERT into user_roles table (role='client')
  ↓
Server Action: Mark invitation as used (used_at = now())
  ↓
Create session
  ↓
Redirect to /my-events
```

---

## Session Management

### Session Creation
- **Trigger**: Successful signin or signup
- **Storage**: HTTP-only cookie (`sb-access-token`)
- **Duration**: 7 days (Supabase default, configurable)
- **Refresh**: Automatic (Supabase client handles refresh tokens)

### Session Validation
```typescript
// Middleware or Server Component
const supabase = createClient();
const { data: { session }, error } = await supabase.auth.getSession();

if (session) {
  // User is authenticated
  const userId = session.user.id;
} else {
  // User is NOT authenticated
}
```

### Session Expiry
- After 7 days of inactivity, session expires
- User must sign in again
- NO automatic redirect (user stays on current page until they navigate)

---

## Role Resolution

### Authoritative Source: `user_roles` Table
```typescript
export async function getUserRole(authUserId: string): Promise<'chef' | 'client' | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('auth_user_id', authUserId)
    .single();

  if (error || !data) return null;
  return data.role as 'chef' | 'client';
}
```

### Role Assignment Rules
- **One user = One role** (enforced by UNIQUE constraint)
- **Role is immutable** (no user-facing role changes in V1)
- **Role determines portal access** (chef → /dashboard, client → /my-events)

---

## Password Reset Flow

### Supabase Built-In Flow
```
User clicks "Forgot Password?" on /signin
  ↓
Enter email address
  ↓
Supabase sends password reset email
  ↓
User clicks link in email
  ↓
Redirect to Supabase-hosted reset page
  ↓
Enter new password
  ↓
Redirect back to /signin
  ↓
User signs in with new password
```

**V1**: Use Supabase default password reset flow (hosted by Supabase)
**V1.1**: Custom password reset page (`/reset-password`) for branded experience

---

## Email Verification

### V1: Email Verification Disabled
- Users can sign up and sign in immediately
- NO email verification required

**Rationale**:
- Simplifies onboarding (no email bounce issues)
- Invitation-based client signup inherently validates email
- Can enable later if spam becomes issue

### V1.1: Email Verification (Optional)
```typescript
// Enable email verification in Supabase dashboard
// Auth → Settings → Enable "Confirm email"
```

---

## Multi-Device Sessions

### Behavior
- Users can sign in on multiple devices simultaneously
- Each device gets its own session cookie
- Logout on one device does NOT affect other devices

### V1: No Session Limit
- Users can have unlimited active sessions

### V1.1: Session Limit (Optional)
- Invalidate old sessions when new session is created
- "You've been signed out because you signed in on another device"

---

## Security Considerations

### Session Hijacking Prevention
- `HttpOnly` cookies (not accessible via JavaScript)
- `Secure` flag (HTTPS only)
- `SameSite=Lax` (CSRF protection)

### Brute Force Protection
- Supabase Auth automatically rate-limits signin attempts
- After 5 failed attempts, temporary lockout (5 minutes)

### Credential Validation
- Password minimum length: 8 characters (Supabase default)
- Email format validation (Supabase built-in)
- NO password complexity requirements (V1)

---

## Authentication State in UI

### Header Navigation (Conditional)
```tsx
// components/public/Header.tsx
const session = await getSession();

if (!session) {
  // Show "Sign In" button
  return <Link href="/signin">Sign In</Link>;
}

// User is signed in - show portal link
const role = await getUserRole(session.user.id);

if (role === 'chef') {
  return <Link href="/dashboard">Go to Dashboard</Link>;
}

if (role === 'client') {
  return <Link href="/my-events">Go to My Events</Link>;
}
```

---

## Error States

### Invalid Credentials
**Trigger**: Email or password is incorrect
**Message**: "Invalid email or password" (generic, don't reveal which is wrong)
**Action**: Show inline error, allow retry

### Account Not Found
**Trigger**: Email doesn't exist in system
**Message**: "Invalid email or password" (same as above)
**Action**: Same as invalid credentials (prevent email enumeration)

### Orphaned Account (No Role)
**Trigger**: User exists in auth.users but NOT in user_roles
**Message**: "Your account is incomplete. Please contact support."
**Action**: Redirect to `/error?code=no_role`

### Expired Invitation
**Trigger**: Client tries to sign up with expired invitation token
**Message**: "This invitation has expired. Please contact the chef for a new invitation."
**Action**: Show error on signup page, prevent signup

### Used Invitation
**Trigger**: Client tries to sign up with already-used invitation token
**Message**: "This invitation has already been used. If you have an account, please sign in."
**Action**: Show error + link to /signin

---

## Database Tables (Auth-Related)

### `auth.users` (Supabase Managed)
- Created and managed by Supabase Auth service
- NO direct application writes (except via Supabase Auth API)
- Columns: `id`, `email`, `encrypted_password`, `created_at`, etc.

### `chefs` (Application Managed)
```sql
CREATE TABLE chefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
```

### `clients` (Application Managed)
```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(tenant_id, email) -- Email unique per tenant
);
```

### `user_roles` (Application Managed)
```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL, -- 'chef' or 'client'
  entity_id UUID NOT NULL, -- chefs.id or clients.id
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
```

### `client_invitations` (Application Managed)
```sql
CREATE TABLE client_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id)
);
```

---

## Authentication Testing

### Test Scenarios

#### 1. Chef Signin (Happy Path)
- Sign up as chef
- Sign out
- Sign in with correct credentials
- Verify redirect to /dashboard

#### 2. Client Signin (Happy Path)
- Chef invites client
- Client signs up via invitation
- Client signs out
- Client signs in with correct credentials
- Verify redirect to /my-events

#### 3. Invalid Credentials
- Attempt signin with wrong password
- Verify generic error message
- Verify NO account lockout (unless 5+ attempts)

#### 4. Orphaned Account
- Manually delete user's role from user_roles table
- Attempt signin
- Verify redirect to /error?code=no_role

#### 5. Expired Invitation
- Create invitation with `expires_at` in the past
- Attempt signup with token
- Verify error message, prevent signup

---

## Monitoring & Logging

### Log Authentication Events
```typescript
// Server Action
console.log('Chef signup', { email: chef.email, timestamp: new Date() });
console.log('Client signup', { email: client.email, tenant_id, timestamp: new Date() });
console.log('Signin success', { user_id, role, timestamp: new Date() });
console.error('Signin failure', { email, reason: 'invalid_credentials' });
```

### Metrics to Track (V1.1)
- Signup conversion rate (visits to /signup → successful signups)
- Signin success rate (attempts → successful logins)
- Invitation acceptance rate (invitations sent → clients signed up)

---

## Related Documents

- [PUBLIC_SIGNIN_FLOW.md](./PUBLIC_SIGNIN_FLOW.md) - Detailed signin implementation
- [PUBLIC_SIGNUP_FLOW.md](./PUBLIC_SIGNUP_FLOW.md) - Detailed signup implementation
- [PUBLIC_ROLE_RESOLUTION_FLOW.md](./PUBLIC_ROLE_RESOLUTION_FLOW.md) - Role resolution details
- [PUBLIC_AUTH_REDIRECT_RULES.md](./PUBLIC_AUTH_REDIRECT_RULES.md) - Post-auth routing logic

---

**Status**: This authentication overview is LOCKED for V1.
