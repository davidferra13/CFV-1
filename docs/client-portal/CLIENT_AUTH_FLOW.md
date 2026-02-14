# Client Authentication Flow

## Document Identity
- **File**: `CLIENT_AUTH_FLOW.md`
- **Category**: Identity & Linking (12/200)
- **Version**: ChefFlow V1
- **Status**: Implementation-Ready

---

## Purpose

This document defines the **complete authentication flow** for clients in the ChefFlow system.

It specifies:
- How clients authenticate (login, signup, password reset)
- How sessions are established and validated
- How authentication integrates with role resolution
- How authentication failures are handled
- How security is enforced at each step

---

## Authentication Methods

### Supported Methods

ChefFlow V1 supports the following authentication methods for clients:

| Method | Use Case | Implementation |
|--------|----------|----------------|
| **Email/Password** | Standard login | Supabase Auth built-in |
| **Magic Link** | Passwordless login | Supabase Auth built-in |
| **Invitation Link** | First-time signup | Custom flow with Supabase Auth |
| **Password Reset** | Forgotten password | Supabase Auth built-in |

### Unsupported in V1

❌ OAuth providers (Google, Facebook, Apple)
❌ Phone/SMS authentication
❌ Multi-factor authentication (MFA)
❌ Biometric authentication
❌ SSO/SAML

---

## Authentication Flow: First-Time Signup (Invitation-Based)

### Overview

Clients **cannot** self-register. They must be invited by a chef.

### Step-by-Step Flow

#### Step 1: Chef Sends Invitation

```typescript
// Chef action (server-side)
const invitation = await supabase
  .from('client_invitations')
  .insert({
    tenant_id: chef.id,
    email: 'client@example.com',
    full_name: 'John Doe',
    token: crypto.randomUUID(),
    expires_at: addDays(new Date(), 7),
    created_by: chef.auth_user_id
  })
  .select()
  .single();

// Send email with invitation link
const invitationUrl = `${APP_URL}/signup?token=${invitation.token}`;
await sendEmail({
  to: invitation.email,
  subject: 'You are invited to ChefFlow',
  body: `Click here to create your account: ${invitationUrl}`
});
```

**Key Points**:
- Token is cryptographically random UUID
- Invitation expires after 7 days
- Email is sent via email service (basic HTML in V1)

---

#### Step 2: Client Clicks Invitation Link

```
User navigates to: /signup?token={uuid}
```

**Flow**:
1. Page loads `/signup` route
2. Server validates token:
   ```typescript
   const invitation = await supabase
     .from('client_invitations')
     .select('*')
     .eq('token', token)
     .is('used_at', null)
     .gt('expires_at', new Date().toISOString())
     .single();

   if (!invitation) {
     // Invalid or expired token → show error
     return redirect('/signup/invalid');
   }
   ```
3. If valid, display signup form pre-filled with email

---

#### Step 3: Client Submits Signup Form

```typescript
// Client submits: { email, password, full_name }

// 1. Create auth user
const { data: authData, error: authError } = await supabase.auth.signUp({
  email: invitation.email,
  password: password,
  options: {
    emailRedirectTo: `${APP_URL}/auth/callback`,
    data: {
      full_name: full_name,
      invitation_token: token
    }
  }
});

if (authError) {
  // Handle error (e.g., email already exists)
  return { error: authError.message };
}

const auth_user_id = authData.user.id;
```

**Key Points**:
- Email must match invitation email
- Password must meet Supabase requirements (min 6 chars)
- User created with `email_confirmed_at = NULL` (needs verification)

---

#### Step 4: Email Verification

```
Supabase sends verification email to client
Client clicks verification link
Supabase sets auth.users.email_confirmed_at = now()
```

**After Verification**:
```typescript
// Redirect to /auth/callback?token_hash=...

// Server-side callback handler:
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  return redirect('/login');
}

const auth_user_id = session.user.id;
const invitation_token = session.user.user_metadata.invitation_token;
```

---

#### Step 5: Create Client Profile and User Role

```typescript
// Server-side (after email verified)

// Validate invitation still valid
const invitation = await supabase
  .from('client_invitations')
  .select('*')
  .eq('token', invitation_token)
  .is('used_at', null)
  .single();

if (!invitation) {
  return { error: 'Invitation no longer valid' };
}

// Create client profile
const { data: client } = await supabase
  .from('clients')
  .insert({
    auth_user_id: auth_user_id,
    tenant_id: invitation.tenant_id,
    email: invitation.email,
    full_name: invitation.full_name || session.user.user_metadata.full_name,
    phone: null
  })
  .select()
  .single();

// Create user role (authoritative)
await supabase
  .from('user_roles')
  .insert({
    auth_user_id: auth_user_id,
    role: 'client',
    entity_id: client.id,
    tenant_id: invitation.tenant_id
  });

// Mark invitation as used
await supabase
  .from('client_invitations')
  .update({ used_at: new Date().toISOString() })
  .eq('token', invitation_token);

// Redirect to client portal
return redirect('/my-events');
```

**Key Points**:
- All three records created atomically (transaction-like behavior)
- Invitation marked as used (prevents reuse)
- Client profile linked to tenant via `tenant_id`
- User role establishes identity chain

---

## Authentication Flow: Returning User Login

### Email/Password Login

#### Step 1: User Navigates to Login Page

```
User visits: /login
```

**UI Elements**:
- Email input
- Password input
- "Forgot password?" link
- "Log in" button

---

#### Step 2: User Submits Credentials

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: email,
  password: password
});

if (error) {
  // Invalid credentials → show error
  return { error: 'Invalid email or password' };
}

// Success: session established
const session = data.session;
const auth_user_id = session.user.id;
```

**Key Points**:
- Supabase validates credentials
- JWT issued with `auth_user_id` in `sub` claim
- Session cookie set automatically

---

#### Step 3: Middleware Validates Session

```typescript
// middleware.ts

const { data: { session } } = await supabase.auth.getSession();

if (!session) {
  // Not authenticated → redirect to login
  return NextResponse.redirect('/login');
}

const auth_user_id = session.user.id;
```

---

#### Step 4: Role Resolution

```typescript
// Resolve role from database (authoritative)
const { data: userRole } = await supabase
  .from('user_roles')
  .select('role, entity_id, tenant_id')
  .eq('auth_user_id', auth_user_id)
  .single();

if (!userRole) {
  // No role assigned → orphaned account → redirect to error
  return NextResponse.redirect('/account-setup-incomplete');
}

if (userRole.role !== 'client') {
  // Not a client → redirect to chef portal
  return NextResponse.redirect('/dashboard');
}

// Client role confirmed → allow access
const client_id = userRole.entity_id;
const tenant_id = userRole.tenant_id;
```

**See**: [CLIENT_ROLE_RESOLUTION_FLOW.md](./CLIENT_ROLE_RESOLUTION_FLOW.md)

---

#### Step 5: Portal Access Granted

```typescript
// Client portal layout (server component)

const { data: client } = await supabase
  .from('clients')
  .select('*')
  .eq('id', client_id)
  .eq('tenant_id', tenant_id)
  .single();

// Render client portal with personalized data
return <ClientPortalLayout client={client} />;
```

---

### Magic Link Login

#### Step 1: User Requests Magic Link

```typescript
const { error } = await supabase.auth.signInWithOtp({
  email: email,
  options: {
    emailRedirectTo: `${APP_URL}/auth/callback`
  }
});

if (error) {
  return { error: error.message };
}

// Success: magic link sent
return { success: 'Check your email for login link' };
```

---

#### Step 2: User Clicks Magic Link

```
User clicks link in email
→ Redirects to /auth/callback?token_hash=...&type=magiclink

Supabase validates token
→ Session established
→ Middleware validates + resolves role
→ Client portal access granted
```

**Key Points**:
- Magic link expires after 1 hour (Supabase default)
- Single-use token
- Same role resolution flow as email/password

---

## Password Reset Flow

### Step 1: User Requests Password Reset

```typescript
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${APP_URL}/reset-password`
});

if (error) {
  return { error: error.message };
}

// Success: reset email sent
return { success: 'Check your email for reset link' };
```

---

### Step 2: User Clicks Reset Link

```
User clicks link in email
→ Redirects to /reset-password?token_hash=...

Supabase validates token
→ Session established (temporary)
→ Display password reset form
```

---

### Step 3: User Submits New Password

```typescript
const { error } = await supabase.auth.updateUser({
  password: newPassword
});

if (error) {
  return { error: error.message };
}

// Success: password updated
return redirect('/login');
```

**Key Points**:
- Reset link expires after 1 hour
- Old password not required (link is proof of ownership)
- Session invalidated after password change (user must log in again)

---

## Session Management

### Session Lifecycle

```
Login/Signup → Session Created → JWT Issued → Cookie Set
    ↓
  Access Token (1 hour validity)
  Refresh Token (30 days validity)
    ↓
  Automatic Refresh (before expiration)
    ↓
  Logout/Expiration → Session Destroyed → Cookie Cleared
```

---

### Session Contents

JWT payload includes:

```json
{
  "sub": "auth_user_id (UUID)",
  "email": "client@example.com",
  "email_confirmed_at": "2026-02-14T12:00:00Z",
  "aud": "authenticated",
  "role": "authenticated",
  "exp": 1234567890,
  "iat": 1234564290
}
```

**Note**: Role (`'client'` vs `'chef'`) is **NOT** in JWT. Must be resolved from database.

---

### Session Validation

**Middleware Validates**:

```typescript
const { data: { session }, error } = await supabase.auth.getSession();

if (error || !session) {
  // Invalid or expired session → redirect to login
  return NextResponse.redirect('/login');
}

if (!session.user.email_confirmed_at) {
  // Email not verified → redirect to verify
  return NextResponse.redirect('/verify-email');
}

// Session valid → proceed to role resolution
```

---

### Session Refresh

Supabase automatically refreshes tokens:

```typescript
// Client-side (browser)
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    console.log('Session refreshed:', session);
  }

  if (event === 'SIGNED_OUT') {
    window.location.href = '/login';
  }
});
```

**Refresh Timing**:
- Access token valid for 1 hour
- Refresh attempted 5 minutes before expiration
- Refresh token valid for 30 days
- After 30 days, user must log in again

---

## Logout Flow

### Client-Initiated Logout

```typescript
const { error } = await supabase.auth.signOut();

if (error) {
  console.error('Logout failed:', error);
}

// Redirect to public landing page
return redirect('/');
```

**What Happens**:
1. JWT invalidated on server
2. Session cookie cleared
3. Browser state reset
4. User redirected to public page

---

### Server-Initiated Logout

**Reasons**:
- Session expired (30 days)
- Password changed
- Account deleted
- Security event

**Flow**:
```typescript
// Server detects session invalidation
if (!session) {
  // Clear any cached data
  cookies().delete('supabase-auth-token');

  // Redirect to login
  return redirect('/login');
}
```

---

## Security Enforcement

### Email Verification Requirement

```typescript
// Middleware check
if (!session.user.email_confirmed_at) {
  // Email not verified → block portal access
  return NextResponse.redirect('/verify-email');
}
```

**Unverified emails cannot**:
- Access client portal
- View events
- Make payments
- Update profile

---

### Rate Limiting

**Supabase Built-In Limits**:

| Action | Limit |
|--------|-------|
| **Login attempts** | 10 per hour per IP |
| **Signup attempts** | 5 per hour per IP |
| **Password reset requests** | 5 per hour per email |
| **Magic link requests** | 5 per hour per email |

**Violations**: Temporarily blocked (1 hour cooldown)

---

### Account Lockout

**Not Implemented in V1**

V2 Consideration:
- Lock account after 5 failed login attempts
- Require admin unlock or automatic unlock after 24 hours

---

## Error Handling

### Authentication Errors

| Error | Cause | User Message | Action |
|-------|-------|--------------|--------|
| `Invalid login credentials` | Wrong email/password | "Invalid email or password" | Allow retry |
| `Email not confirmed` | Email not verified | "Please verify your email" | Resend verification |
| `User already registered` | Duplicate signup | "Account already exists" | Redirect to login |
| `Invalid invitation token` | Expired/used token | "Invitation link is invalid" | Contact chef |
| `Password too weak` | Password < 6 chars | "Password must be at least 6 characters" | Re-enter password |

---

### Session Errors

| Error | Cause | Action |
|-------|-------|--------|
| `Session expired` | JWT expired + refresh failed | Redirect to login |
| `Invalid session` | Tampered JWT | Clear cookies, redirect to login |
| `No session` | User not logged in | Redirect to login |
| `Email not verified` | Signup incomplete | Redirect to verification page |

---

## Authentication State Diagram

```
┌─────────────┐
│  Anonymous  │
└──────┬──────┘
       │
       ├──[First-time]──→ Invitation Link → Signup Form → Email Verify → Profile Created → Logged In
       │
       ├──[Returning]───→ Login Form → Credentials Validated → Session Created → Logged In
       │
       └──[Passwordless]→ Magic Link Request → Email Sent → Link Clicked → Logged In


┌─────────────┐
│  Logged In  │
└──────┬──────┘
       │
       ├──[Active Use]──→ Session Valid → Access Granted
       │
       ├──[Token Expiry]→ Auto Refresh → Session Extended
       │
       ├──[Manual Logout]→ Sign Out → Anonymous
       │
       └──[Session Expire]→ Redirect to Login → Anonymous
```

---

## Integration with Role Resolution

### Authentication vs Authorization

| Concern | Authentication | Authorization |
|---------|----------------|---------------|
| **Question** | Who are you? | What can you do? |
| **Validates** | Email + password | Role + tenant_id |
| **Source of Truth** | `auth.users` | `user_roles` |
| **Enforced By** | Supabase Auth | RLS + Middleware |
| **Failure Mode** | Redirect to login | Redirect to error page |

---

### Flow Integration

```
1. User logs in
   → Supabase Auth validates credentials
   → JWT issued with auth_user_id

2. Middleware extracts auth_user_id
   → Query user_roles table
   → Resolve: role, entity_id, tenant_id

3. Role validated
   → If 'client', allow client portal access
   → If 'chef', redirect to chef portal
   → If NULL, redirect to account setup

4. Portal rendered
   → RLS filters data by auth_user_id + tenant_id
   → Client sees only their data
```

**See**: [CLIENT_ROLE_RESOLUTION_FLOW.md](./CLIENT_ROLE_RESOLUTION_FLOW.md)

---

## Security Best Practices

### Password Requirements

- **Minimum length**: 6 characters (Supabase default)
- **No complexity requirements** in V1 (UX simplicity)
- **No password reuse prevention** in V1

**V2 Considerations**:
- Increase to 8 characters
- Require uppercase + lowercase + number
- Check against common password lists

---

### Token Security

| Token Type | Validity | Storage | Security |
|------------|----------|---------|----------|
| **Access Token** | 1 hour | HTTP-only cookie | Auto-refresh |
| **Refresh Token** | 30 days | HTTP-only cookie | Rotation on use |
| **Invitation Token** | 7 days | URL parameter | Single-use |
| **Magic Link Token** | 1 hour | URL parameter | Single-use |
| **Password Reset Token** | 1 hour | URL parameter | Single-use |

**Key Points**:
- All auth tokens are HTTP-only cookies (not accessible to JavaScript)
- HTTPS enforced in production
- Tokens never logged or stored in client-side localStorage

---

### CSRF Protection

**Supabase Built-In**:
- PKCE (Proof Key for Code Exchange) flow
- State parameter validation
- SameSite cookie attribute

**Application Layer**:
- No additional CSRF tokens needed (using Supabase Auth)

---

## Testing Authentication

### Manual Testing Checklist

- [ ] Client can sign up via invitation link
- [ ] Email verification required before portal access
- [ ] Client can log in with email/password
- [ ] Client can log in with magic link
- [ ] Client can reset forgotten password
- [ ] Invalid credentials show error message
- [ ] Expired invitation link shows error
- [ ] Used invitation link cannot be reused
- [ ] Session persists across page refreshes
- [ ] Session expires after 30 days
- [ ] Logout clears session and redirects
- [ ] Unverified email blocks portal access
- [ ] Wrong role redirects to correct portal

---

### Automated Testing

```typescript
// Example test: Invitation-based signup
test('Client can sign up via invitation', async () => {
  // 1. Chef creates invitation
  const invitation = await createInvitation({
    email: 'test@example.com',
    tenant_id: chefId
  });

  // 2. Client signs up
  const { user } = await signUp({
    email: 'test@example.com',
    password: 'password123',
    invitationToken: invitation.token
  });

  // 3. Verify client profile created
  const client = await getClient(user.id);
  expect(client.tenant_id).toBe(chefId);

  // 4. Verify role assigned
  const role = await getUserRole(user.id);
  expect(role.role).toBe('client');
  expect(role.entity_id).toBe(client.id);

  // 5. Verify invitation marked as used
  const updatedInvitation = await getInvitation(invitation.token);
  expect(updatedInvitation.used_at).not.toBeNull();
});
```

---

## Related Documents

- [CLIENT_IDENTITY_MODEL.md](./CLIENT_IDENTITY_MODEL.md)
- [CLIENT_ROLE_RESOLUTION_FLOW.md](./CLIENT_ROLE_RESOLUTION_FLOW.md)
- [CLIENT_USER_ROLES_MAPPING.md](./CLIENT_USER_ROLES_MAPPING.md)
- [CLIENT_ACCOUNT_LINKING_RULES.md](./CLIENT_ACCOUNT_LINKING_RULES.md)
- [CLIENT_AUTHORIZATION_INVARIANTS.md](./CLIENT_AUTHORIZATION_INVARIANTS.md)
- [AUTHENTICATION.md](../../AUTHENTICATION.md)

---

**Document Status**: ✅ Implementation-Ready
**ChefFlow Version**: V1
**Last Updated**: 2026-02-14
