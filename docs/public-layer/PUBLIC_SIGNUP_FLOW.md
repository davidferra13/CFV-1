# Public Layer - Signup Flow

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Purpose

This document defines the signup flow for both chefs (public signup) and clients (invitation-based signup), including validation, database operations, and post-signup routing.

---

## Two Signup Paths

### 1. Chef Signup (Public)
**Route**: `/signup` (no query params)
**Access**: Public (anyone can sign up)
**Creates**: `auth.users` + `chefs` + `user_roles` records

### 2. Client Signup (Invitation-Only)
**Route**: `/signup?token=xxx`
**Access**: Requires valid invitation token
**Creates**: `auth.users` + `clients` + `user_roles` records, marks invitation as used

---

## Chef Signup Flow

### Step 1: User Visits `/signup`

**Middleware Check**:
```typescript
if (session && path === '/signup') {
  // User already signed in - redirect to portal
  const role = await getUserRole(session.user.id);
  if (role === 'chef') redirect('/dashboard');
  if (role === 'client') redirect('/my-events');
}
```

---

### Step 2: Render Signup Form

**Form Fields**:
```tsx
export function ChefSignupForm() {
  return (
    <form action={chefSignupAction}>
      <input type="email" name="email" required placeholder="you@example.com" />
      <input type="password" name="password" required minLength={8} placeholder="••••••••" />
      <input type="text" name="businessName" required placeholder="Your Business Name" />
      <input type="tel" name="phone" placeholder="(555) 123-4567" />
      <button type="submit">Create Account</button>
    </form>
  );
}
```

---

### Step 3: Client-Side Validation

**Zod Schema**:
```typescript
export const chefSignupSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  businessName: z.string().min(1, 'Business name is required').max(100),
  phone: z.string().max(20).optional(),
});
```

---

### Step 4: Server Action (Chef Signup)

```typescript
'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { chefSignupSchema } from './schema';

export async function chefSignupAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const businessName = formData.get('businessName') as string;
  const phone = formData.get('phone') as string | null;

  // Validate input
  const validated = chefSignupSchema.safeParse({
    email,
    password,
    businessName,
    phone,
  });

  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  const data = validated.data;

  // Step 1: Create auth user (Supabase Auth)
  const supabase = createClient();
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email.trim().toLowerCase(),
    password: data.password,
  });

  if (authError) {
    console.error('Chef signup failed (auth)', authError);
    return { error: 'Unable to create account. Email may already be in use.' };
  }

  const authUserId = authData.user!.id;

  // Step 2: Insert into chefs table (uses service role key)
  const adminClient = createAdminClient();

  const { data: chef, error: chefError } = await adminClient
    .from('chefs')
    .insert({
      auth_user_id: authUserId,
      business_name: data.businessName,
      email: data.email.trim().toLowerCase(),
      phone: data.phone || null,
    })
    .select()
    .single();

  if (chefError) {
    console.error('Chef signup failed (chefs table)', chefError);
    // Rollback: Delete auth user (Supabase handles this via CASCADE)
    return { error: 'Unable to create account. Please try again.' };
  }

  // Step 3: Insert into user_roles table
  const { error: roleError } = await adminClient
    .from('user_roles')
    .insert({
      auth_user_id: authUserId,
      role: 'chef',
      entity_id: chef.id,
    });

  if (roleError) {
    console.error('Chef signup failed (user_roles)', roleError);
    return { error: 'Unable to create account. Please try again.' };
  }

  // Success - redirect to chef portal
  console.log('Chef signup success', { email: data.email, chefId: chef.id });
  redirect('/dashboard');
}
```

---

### Step 5: Post-Signup Redirect
- User is now signed in (session created automatically by `signUp()`)
- Redirect to `/dashboard` (chef portal)

---

## Client Signup Flow (Invitation-Based)

### Step 1: Chef Sends Invitation

**Chef Portal Action** (not Public Layer, but shown for context):
```typescript
// Chef creates invitation
const token = crypto.randomUUID(); // Secure random token
const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

await supabase.from('client_invitations').insert({
  tenant_id: chefId,
  email: clientEmail,
  full_name: clientName,
  token,
  expires_at: expiresAt,
  created_by: chefAuthUserId,
});

// Send email with link: https://chefflow.app/signup?token=xxx
```

---

### Step 2: Client Clicks Invitation Link

**URL**: `https://chefflow.app/signup?token=abc123`

**Page Load**:
```tsx
export default async function SignupPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token;

  if (!token) {
    // No token = chef signup
    return <ChefSignupForm />;
  }

  // Token present = client signup
  const invitation = await validateInvitation(token);

  if (!invitation) {
    return <InvalidInvitationError />;
  }

  return <ClientSignupForm invitation={invitation} />;
}
```

---

### Step 3: Validate Invitation Token

```typescript
async function validateInvitation(token: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('client_invitations')
    .select('*')
    .eq('token', token)
    .is('used_at', null) // Not yet used
    .gte('expires_at', new Date().toISOString()) // Not expired
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}
```

---

### Step 4: Render Client Signup Form

**Form Fields**:
```tsx
export function ClientSignupForm({ invitation }: { invitation: Invitation }) {
  return (
    <form action={clientSignupAction}>
      <input type="hidden" name="token" value={invitation.token} />

      <input
        type="email"
        name="email"
        value={invitation.email}
        readOnly
        disabled
        className="bg-gray-100"
      />

      <input
        type="text"
        name="fullName"
        defaultValue={invitation.full_name || ''}
        required
        placeholder="Your Full Name"
      />

      <input
        type="password"
        name="password"
        required
        minLength={8}
        placeholder="Create a password"
      />

      <input type="tel" name="phone" placeholder="(555) 123-4567" />

      <button type="submit">Create Account</button>
    </form>
  );
}
```

---

### Step 5: Server Action (Client Signup)

```typescript
'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { clientSignupSchema } from './schema';

export async function clientSignupAction(formData: FormData) {
  const token = formData.get('token') as string;
  const fullName = formData.get('fullName') as string;
  const password = formData.get('password') as string;
  const phone = formData.get('phone') as string | null;

  // Validate invitation token (server-side re-check)
  const adminClient = createAdminClient();

  const { data: invitation, error: invError } = await adminClient
    .from('client_invitations')
    .select('*')
    .eq('token', token)
    .is('used_at', null)
    .gte('expires_at', new Date().toISOString())
    .single();

  if (invError || !invitation) {
    return { error: 'Invalid or expired invitation' };
  }

  const email = invitation.email;
  const tenantId = invitation.tenant_id;

  // Validate input
  const validated = clientSignupSchema.safeParse({
    fullName,
    password,
    phone,
  });

  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  const data = validated.data;

  // Step 1: Create auth user
  const supabase = createClient();
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password: data.password,
  });

  if (authError) {
    console.error('Client signup failed (auth)', authError);
    return { error: 'Unable to create account' };
  }

  const authUserId = authData.user!.id;

  // Step 2: Insert into clients table
  const { data: client, error: clientError } = await adminClient
    .from('clients')
    .insert({
      auth_user_id: authUserId,
      tenant_id: tenantId,
      full_name: data.fullName,
      email: email.trim().toLowerCase(),
      phone: data.phone || null,
    })
    .select()
    .single();

  if (clientError) {
    console.error('Client signup failed (clients table)', clientError);
    return { error: 'Unable to create account' };
  }

  // Step 3: Insert into user_roles table
  const { error: roleError } = await adminClient
    .from('user_roles')
    .insert({
      auth_user_id: authUserId,
      role: 'client',
      entity_id: client.id,
    });

  if (roleError) {
    console.error('Client signup failed (user_roles)', roleError);
    return { error: 'Unable to create account' };
  }

  // Step 4: Mark invitation as used
  const { error: updateError } = await adminClient
    .from('client_invitations')
    .update({ used_at: new Date().toISOString() })
    .eq('id', invitation.id);

  if (updateError) {
    console.error('Failed to mark invitation as used', updateError);
    // Non-critical - continue anyway
  }

  // Success - redirect to client portal
  console.log('Client signup success', { email, clientId: client.id });
  redirect('/my-events');
}
```

---

### Step 6: Post-Signup Redirect
- User is now signed in (session created automatically)
- Invitation marked as used (`used_at = now()`)
- Redirect to `/my-events` (client portal)

---

## Error Handling

### Chef Signup Errors

#### Email Already in Use
**Trigger**: Email exists in `auth.users`
**Message**: "Unable to create account. Email may already be in use."
**Display**: Inline error below form

#### Database Error
**Trigger**: Insert into `chefs` or `user_roles` fails
**Message**: "Unable to create account. Please try again."
**Display**: Inline error below form

---

### Client Signup Errors

#### Invalid/Expired Token
**Trigger**: Token not found, expired, or already used
**Message**: "This invitation is invalid or has expired. Please contact your chef for a new invitation."
**Display**: Full-page error (prevent signup form from rendering)

#### Email Already in Use
**Trigger**: Email exists in `auth.users` (client tries to sign up twice)
**Message**: "This email is already registered. Please sign in instead."
**Display**: Inline error + link to /signin

---

## Transaction Safety

### Problem
If one step fails (e.g., insert into `chefs` fails), we need to rollback previous steps.

### Solution
Supabase Auth automatically deletes related records via CASCADE:
```sql
CREATE TABLE chefs (
  auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);
```

**Behavior**:
- If `chefs` insert fails, manually delete auth user (or rely on cleanup job)
- V1: Accept small risk of orphaned auth.users records (manual cleanup if needed)
- V1.1: Implement proper transaction handling (database transactions or Supabase Edge Functions)

---

## Security Considerations

### Invitation Token Security
- Use cryptographically secure random tokens (UUID or `crypto.randomBytes()`)
- Tokens are single-use (marked as used after signup)
- Tokens expire after 7 days
- Tokens are validated server-side (never trust client)

### Email Validation
- Email format validated client-side and server-side
- Email normalized (trimmed, lowercased) before insertion

### Password Security
- Minimum 8 characters (enforced by Supabase)
- Password is hashed by Supabase Auth (never stored in plaintext)

---

## Performance

### Chef Signup Speed
- Target: <1s from submit to redirect
- Typical: ~300-500ms (Supabase Auth + 2 DB inserts)

### Client Signup Speed
- Target: <1.5s (includes invitation validation)
- Typical: ~500-700ms

---

## Testing Scenarios

### Test 1: Chef Signup (Happy Path)
1. Visit /signup (no token)
2. Fill in email, password, business name
3. Submit form
4. Verify redirect to /dashboard
5. Verify user exists in `auth.users`, `chefs`, `user_roles`

---

### Test 2: Client Signup (Happy Path)
1. Chef creates invitation
2. Client clicks invitation link (/signup?token=xxx)
3. Fill in full name, password
4. Submit form
5. Verify redirect to /my-events
6. Verify user exists in `auth.users`, `clients`, `user_roles`
7. Verify invitation marked as used (`used_at` not null)

---

### Test 3: Duplicate Chef Email
1. Sign up as chef with email A
2. Sign out
3. Attempt to sign up again with same email A
4. Verify error: "Email may already be in use"

---

### Test 4: Expired Invitation
1. Create invitation with `expires_at` in the past
2. Click invitation link
3. Verify error: "This invitation is invalid or has expired"
4. Verify signup form NOT shown

---

### Test 5: Reused Invitation
1. Client signs up via invitation
2. Client signs out
3. Attempt to visit same invitation link again
4. Verify error: "This invitation has already been used"

---

## Related Documents

- [PUBLIC_AUTH_OVERVIEW.md](./PUBLIC_AUTH_OVERVIEW.md) - High-level auth architecture
- [PUBLIC_SIGNIN_FLOW.md](./PUBLIC_SIGNIN_FLOW.md) - Signin implementation
- [PUBLIC_CLIENT_PROFILE_CREATION.md](./PUBLIC_CLIENT_PROFILE_CREATION.md) - Client profile details
- [PUBLIC_CHEF_PROFILE_CREATION.md](./PUBLIC_CHEF_PROFILE_CREATION.md) - Chef profile details

---

**Status**: This signup flow is LOCKED for V1.
