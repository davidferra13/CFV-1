# Client Invitation System

**Version**: 1.0
**Last Updated**: 2026-02-13

Guide to the client invitation system in ChefFlow V1.

---

## Overview

Clients cannot self-signup. They must be **invited by a chef** using a unique invitation token.

---

## Invitation Flow

```
┌──────┐                                    ┌────────┐
│ Chef │                                    │ Client │
└───┬──┘                                    └────┬───┘
    │                                            │
    │ 1. Send invitation (email)                │
    ├───────────────────────────────────────────>│
    │                                            │
    │                                            │ 2. Click link
    │                                            │    /auth/signup?token=xxx
    │                                            │
    │                                            │ 3. Verify token
    │<───────────────────────────────────────────┤
    │    (valid, not used, not expired)          │
    │                                            │
    │                                            │ 4. Signup form
    │                                            │    (email pre-filled)
    │                                            │
    │ 5. Create client account                  │
    │<───────────────────────────────────────────┤
    │    - Create auth.users                     │
    │    - Create clients record                 │
    │    - Create user_roles                     │
    │    - Mark invitation used                  │
    │                                            │
    │ 6. Redirect to /client/my-events          │
    ├───────────────────────────────────────────>│
```

---

## Database Schema

```sql
CREATE TABLE client_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  email TEXT NOT NULL,
  full_name TEXT,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id)
);
```

### Fields

- **token**: Cryptographically random string (URL-safe)
- **expires_at**: Expiry timestamp (7 days default)
- **used_at**: Timestamp when invitation was accepted (NULL if unused)

---

## Creating Invitations

### Server Action

```typescript
// lib/clients/invitations.ts
'use server'

import { randomBytes } from 'crypto'
import { addDays } from 'date-fns'

export async function createClientInvitation(data: {
  email: string
  full_name?: string
}) {
  const chef = await requireChef()
  const supabase = createServerClient()

  // Generate cryptographic token
  const token = randomBytes(32).toString('base64url')

  // Set expiry (7 days)
  const expiresAt = addDays(new Date(), 7)

  // Create invitation
  const { data: invitation, error } = await supabase
    .from('client_invitations')
    .insert({
      tenant_id: chef.tenantId,
      email: data.email,
      full_name: data.full_name,
      token,
      expires_at: expiresAt.toISOString(),
      created_by: chef.id
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  // Generate signup URL
  const signupUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/signup?token=${token}`

  return {
    success: true,
    data: {
      token,
      signupUrl,
      expiresAt
    }
  }
}
```

### Usage

```typescript
// In chef portal
const result = await createClientInvitation({
  email: 'client@example.com',
  full_name: 'John Doe'
})

if (result.success) {
  // Send email with result.data.signupUrl
  await sendInvitationEmail(data.email, result.data.signupUrl)
}
```

---

## Accepting Invitations

### Verify Token

```typescript
// app/auth/signup/page.tsx
import { createServerClient } from '@/lib/supabase/server'

export default async function SignupPage({
  searchParams
}: {
  searchParams: { token?: string }
}) {
  const token = searchParams.token

  if (!token) {
    return <div>Invalid invitation link</div>
  }

  const supabase = createServerClient()

  // Verify invitation
  const { data: invitation } = await supabase
    .from('client_invitations')
    .select('*')
    .eq('token', token)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!invitation) {
    return <div>Invitation expired or already used</div>
  }

  return <SignupForm invitation={invitation} />
}
```

### Signup Process

```typescript
// app/actions/signup-client.ts
'use server'

export async function signupClient(formData: {
  token: string
  password: string
}) {
  const supabase = createServerClient()

  // 1. Verify invitation
  const { data: invitation } = await supabase
    .from('client_invitations')
    .select('*')
    .eq('token', formData.token)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!invitation) {
    return { error: 'Invalid or expired invitation' }
  }

  // 2. Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: invitation.email,
    password: formData.password
  })

  if (authError || !authData.user) {
    return { error: authError?.message || 'Signup failed' }
  }

  // 3. Create client record (service role)
  const serviceSupabase = createServiceClient()

  const { data: client, error: clientError } = await serviceSupabase
    .from('clients')
    .insert({
      auth_user_id: authData.user.id,
      tenant_id: invitation.tenant_id,
      email: invitation.email,
      full_name: invitation.full_name || 'Unknown'
    })
    .select()
    .single()

  if (clientError || !client) {
    await supabase.auth.admin.deleteUser(authData.user.id)
    return { error: 'Failed to create client profile' }
  }

  // 4. Create user_role
  const { error: roleError } = await serviceSupabase
    .from('user_roles')
    .insert({
      auth_user_id: authData.user.id,
      role: 'client',
      entity_id: client.id
    })

  if (roleError) {
    await serviceSupabase.from('clients').delete().eq('id', client.id)
    await supabase.auth.admin.deleteUser(authData.user.id)
    return { error: 'Failed to assign role' }
  }

  // 5. Mark invitation as used
  await serviceSupabase
    .from('client_invitations')
    .update({ used_at: new Date().toISOString() })
    .eq('id', invitation.id)

  return { success: true }
}
```

---

## Security Features

### Token Security

- **Cryptographically random**: 32 bytes base64url-encoded
- **Unique**: Database UNIQUE constraint
- **Single-use**: `used_at` timestamp prevents reuse
- **Expiring**: 7-day default expiry

### RLS Policies

Public can read valid invitations:

```sql
CREATE POLICY invitations_public_select_by_token ON client_invitations
  FOR SELECT
  USING (
    token IS NOT NULL AND
    used_at IS NULL AND
    expires_at > now()
  );
```

Chefs manage own invitations:

```sql
CREATE POLICY invitations_chef_all ON client_invitations
  FOR ALL
  USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
```

---

## Email Delivery (V1 Stub)

V1 has **no email service**. Chefs must manually send invitation URLs.

**Future enhancement**: Integrate email service (SendGrid, Postmark, etc.)

### Manual Process

1. Chef creates invitation
2. Copy `signupUrl` from result
3. Send via personal email/text
4. Client clicks link and signs up

---

## Expiry and Cleanup

### Expiry Check

Invitations expire after 7 days:

```sql
SELECT * FROM client_invitations
WHERE expires_at > now() AND used_at IS NULL;
```

### Cleanup Old Invitations

```sql
-- Delete invitations older than 30 days
DELETE FROM client_invitations
WHERE created_at < now() - INTERVAL '30 days';
```

---

## Testing

### Manual Test

1. Login as chef
2. Create invitation
3. Copy signup URL
4. Open incognito window
5. Visit URL
6. Complete signup
7. Verify:
   - Client created in database
   - `tenant_id` matches chef
   - `used_at` populated
   - Redirect to `/client/my-events`

### Test Cases

- [ ] Valid token works
- [ ] Expired token rejected
- [ ] Used token rejected
- [ ] Invalid token rejected
- [ ] Client assigned to correct tenant

---

## Related Documentation

- [AUTHENTICATION.md](./AUTHENTICATION.md) - Auth flow
- [MULTI_TENANT_GUIDE.md](./MULTI_TENANT_GUIDE.md) - Tenant isolation

---

**Last Updated**: 2026-02-13
