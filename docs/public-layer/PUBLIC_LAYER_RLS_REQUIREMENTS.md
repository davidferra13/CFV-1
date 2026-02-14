# Public Layer - RLS Requirements

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Purpose

This document defines Row Level Security (RLS) requirements for the Public Layer. While the Public Layer primarily deals with static pages and unauthenticated users, it MUST respect RLS policies when interacting with the database during signup, signin, and inquiry submissions.

---

## Core Principle

### Rule
The Public Layer MUST NEVER bypass RLS policies. Even when using the service role key (for signup/invitation validation), operations MUST be designed to respect tenant isolation and role-based access control.

---

## Tables the Public Layer Touches

### 1. `inquiries` Table (If Exists)

**Access Pattern**: INSERT only (form submissions)

#### Schema (Assumed)
```sql
CREATE TABLE inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  event_date TIMESTAMPTZ,
  guest_count INTEGER,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
```

#### RLS Policy (Minimal)
```sql
-- Public can insert inquiries (no auth required)
CREATE POLICY inquiries_public_insert ON inquiries
  FOR INSERT
  WITH CHECK (true); -- Allow all inserts (no auth check)

-- Only chefs can read their inquiries (not public)
-- (This policy lives in Chef Portal docs, not here)
```

**Public Layer Behavior**:
- INSERT: Allowed (no authentication required)
- SELECT: NEVER (no reading inquiries on public pages)
- UPDATE: NEVER
- DELETE: NEVER

---

### 2. `chefs` Table

**Access Pattern**: INSERT (chef signup), SELECT (validation during signup)

#### RLS Policies Relevant to Public Layer

##### Chef Signup (Insert)
```sql
-- Allow INSERT via service role key (bypass RLS for signup)
-- This is safe because signup form is public, and we validate uniqueness server-side
```

**Public Layer Behavior**:
- Uses **service role key** to insert (bypasses RLS)
- Validates email uniqueness BEFORE insert:
  ```typescript
  const { data } = await supabase
    .from('chefs')
    .select('email')
    .eq('email', email)
    .single();

  if (data) {
    throw new Error('Email already in use');
  }
  ```

##### Chef Signin (Validation)
- Handled by **Supabase Auth** (not direct database query)
- NO RLS concerns (Auth service manages this)

---

### 3. `clients` Table

**Access Pattern**: INSERT (client signup via invitation)

#### RLS Policies Relevant to Public Layer

##### Client Signup (Insert)
```sql
-- Allow INSERT via service role key (bypass RLS for signup)
-- Validated via invitation token before insert
```

**Public Layer Behavior**:
- Uses **service role key** to insert (bypasses RLS)
- Validates invitation token BEFORE insert:
  ```typescript
  const { data: invitation } = await supabase
    .from('client_invitations')
    .select('*')
    .eq('token', token)
    .eq('used_at', null) // Not yet used
    .gte('expires_at', new Date().toISOString()) // Not expired
    .single();

  if (!invitation) {
    throw new Error('Invalid or expired invitation');
  }
  ```

---

### 4. `user_roles` Table

**Access Pattern**: INSERT (role assignment on signup)

#### RLS Policy
```sql
-- Users can read their own role
CREATE POLICY user_roles_self_select ON user_roles
  FOR SELECT
  USING (auth.uid() = auth_user_id);

-- NO user-facing INSERT/UPDATE/DELETE (only via service role during signup)
```

**Public Layer Behavior**:
- Uses **service role key** to insert during signup (bypasses RLS)
- Inserts ONE row per user (enforced by UNIQUE constraint):
  ```sql
  INSERT INTO user_roles (auth_user_id, role, entity_id)
  VALUES (auth_user_id, 'chef', chef_id);
  ```

---

### 5. `client_invitations` Table

**Access Pattern**: SELECT (validate token), UPDATE (mark as used)

#### RLS Policies Relevant to Public Layer

##### Public Select by Token
```sql
-- Public can read invitation by token (for signup flow)
CREATE POLICY invitations_public_select_by_token ON client_invitations
  FOR SELECT
  USING (
    token IS NOT NULL AND
    used_at IS NULL AND
    expires_at > now()
  );
```

**Public Layer Behavior**:
- SELECT: Query by token (allowed by RLS policy)
- UPDATE: Mark as used after signup (uses service role key to bypass RLS)
  ```typescript
  await supabase
    .from('client_invitations')
    .update({ used_at: new Date().toISOString() })
    .eq('id', invitation.id);
  ```

---

## Service Role Key Usage

### When to Use Service Role Key

The Public Layer MUST use the **service role key** (bypasses RLS) in these scenarios:

1. **Chef Signup**: Insert into `chefs`, `user_roles` tables
2. **Client Signup**: Insert into `clients`, `user_roles` tables, update `client_invitations`
3. **Inquiry Submission**: Insert into `inquiries` table (if RLS blocks public inserts)

### Safe Usage Pattern
```typescript
// lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role key
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
```

### Security Rules for Service Role Key
1. **NEVER expose service role key to client**
   - Use in Server Components/Actions ONLY
   - NEVER in Client Components
   - NEVER in environment variables prefixed with `NEXT_PUBLIC_`

2. **Validate inputs BEFORE using service role**
   - Zod schema validation
   - Business logic checks (e.g., invitation token validity)
   - Prevent privilege escalation

3. **Log all service role operations**
   ```typescript
   console.log('Service role INSERT', { table: 'chefs', email });
   ```

---

## Anon Key vs Service Role Key

### Anon Key (Public Client)
- Used for: Public reads, authenticated user queries
- RLS: **Enforced** (queries are scoped to current user)
- Use cases: Signin, query user's own data

### Service Role Key (Admin Client)
- Used for: Signup (creating users), system operations
- RLS: **Bypassed** (full database access)
- Use cases: Chef signup, client signup, invitation validation

### Decision Matrix

| Operation | Key Type | RLS Enforced? |
|-----------|----------|---------------|
| Inquiry submission | Anon (if policy allows) or Service | Yes (if anon) / No (if service) |
| Chef signup | Service | No (bypass) |
| Client signup | Service | No (bypass) |
| Invitation validation | Anon | Yes (limited by policy) |
| Signin | Anon (via Supabase Auth) | N/A (Auth service) |

---

## RLS Testing for Public Layer

### Test 1: Inquiry Submission (Anon Key)
```typescript
// Should succeed (no auth required)
const { error } = await supabase
  .from('inquiries')
  .insert({
    name: 'Test User',
    email: 'test@example.com',
    message: 'Test inquiry',
  });

expect(error).toBeNull();
```

### Test 2: Chef Signup (Service Key)
```typescript
// Should succeed (service key bypasses RLS)
const adminClient = createAdminClient();

const { error } = await adminClient
  .from('chefs')
  .insert({
    auth_user_id: 'new-user-id',
    business_name: 'Test Chef',
    email: 'chef@example.com',
  });

expect(error).toBeNull();
```

### Test 3: Client Reads Chefs (Anon Key)
```typescript
// Should fail (RLS blocks public from reading chefs)
const { data, error } = await supabase
  .from('chefs')
  .select('*');

expect(data).toBeNull();
expect(error).toBeDefined(); // RLS policy violation
```

### Test 4: Invitation Validation (Anon Key)
```typescript
// Should succeed (RLS allows reading valid invitations by token)
const { data, error } = await supabase
  .from('client_invitations')
  .select('*')
  .eq('token', 'valid-token')
  .eq('used_at', null)
  .gte('expires_at', new Date().toISOString())
  .single();

expect(error).toBeNull();
expect(data).toBeDefined();
```

---

## RLS Policy Verification

### Pre-Deployment Checklist

#### Verify RLS is Enabled
```sql
-- Run this query in Supabase SQL editor
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- All tables should have rowsecurity = true
```

#### Verify Public Layer Cannot Read Sensitive Data
```typescript
// Try to read events table (should fail)
const { data, error } = await supabase.from('events').select('*');
console.log(data); // Should be null or empty array
console.log(error); // Should be RLS policy error

// Try to read chefs table (should fail)
const { data: chefs, error: chefError } = await supabase.from('chefs').select('*');
console.log(chefs); // Should be null or empty array
```

---

## Attack Scenarios & Mitigations

### Attack 1: Bypass Signup Validation
**Scenario**: Attacker tries to create chef account without valid email.

**Mitigation**:
- Zod validation on client and server
- Supabase Auth validates email format
- Database unique constraint on `chefs.email`

---

### Attack 2: Reuse Invitation Token
**Scenario**: Attacker uses same invitation token multiple times.

**Mitigation**:
- Check `used_at IS NULL` in RLS policy
- Mark token as used IMMEDIATELY after account creation
- Use database transaction to ensure atomicity

---

### Attack 3: Service Role Key Exposure
**Scenario**: Attacker finds service role key in client bundle.

**Mitigation**:
- NEVER use service role key in Client Components
- Verify key is NOT in `.next/static/` bundles
- Regular `grep` search for key in build output

---

### Attack 4: Invitation Token Enumeration
**Scenario**: Attacker brute-forces invitation tokens.

**Mitigation**:
- Use cryptographically secure random tokens (UUID or crypto.randomBytes)
- Rate limit invitation validation endpoint (if exposed)
- Expire tokens after 7 days

---

## Monitoring & Logging

### Log Service Role Operations
```typescript
function logServiceRoleOperation(operation: string, table: string, details: any) {
  console.log('[SERVICE_ROLE]', {
    timestamp: new Date().toISOString(),
    operation,
    table,
    details,
  });
}

// Usage
logServiceRoleOperation('INSERT', 'chefs', { email: chef.email });
```

### Monitor for Suspicious Activity
- Multiple failed invitation validations (brute force attempt)
- Rapid signup attempts from same IP (bot)
- Service role operations outside signup flow (potential compromise)

---

## RLS-Specific Error Handling

### Graceful Degradation
```typescript
try {
  const { data, error } = await supabase.from('inquiries').insert(inquiry);

  if (error) {
    // Check if RLS policy error
    if (error.code === 'PGRST301') {
      console.error('RLS policy blocked insert', error);
      return { success: false, error: 'Unable to submit inquiry. Please try again.' };
    }

    throw error;
  }

  return { success: true };
} catch (err) {
  console.error('Unexpected error', err);
  return { success: false, error: 'An error occurred.' };
}
```

---

## Future Considerations (Post-V1)

### Row-Level Audit Logging
- Log ALL service role operations to `audit_log` table
- Track who (IP, user agent) performed operation
- Enable forensic analysis if breach occurs

### Principle of Least Privilege
- Create separate "signup role" with ONLY INSERT permissions on `chefs`, `clients`, `user_roles`
- Avoid using full service role key for signup

---

## Verification Checklist

Before deploying Public Layer:

- [ ] RLS enabled on ALL tables
- [ ] Public cannot read `chefs` table (test with anon key)
- [ ] Public cannot read `clients` table
- [ ] Public cannot read `events` table
- [ ] Public CAN insert `inquiries` (if table exists)
- [ ] Public CAN read valid invitations by token
- [ ] Service role key NOT in client bundles
- [ ] Chef signup creates user + role (transaction succeeds)
- [ ] Client signup creates user + role + marks invitation as used
- [ ] Invitation tokens cannot be reused
- [ ] All service role operations are logged

---

**Status**: These RLS requirements are LOCKED and MUST be enforced for V1.
