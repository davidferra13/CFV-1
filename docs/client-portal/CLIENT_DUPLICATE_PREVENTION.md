# Client Duplicate Prevention

## Document Identity
- **File**: `CLIENT_DUPLICATE_PREVENTION.md`
- **Category**: Identity & Linking (17/200)
- **Version**: ChefFlow V1
- **Status**: Implementation-Ready

---

## Purpose

This document defines the **mechanisms and strategies** for preventing duplicate client identities in the ChefFlow system.

It specifies:
- Database-level duplicate prevention
- Application-level validation
- User experience for duplicate scenarios
- Detection mechanisms
- Prevention vs remediation strategies

---

## Prevention Layers

### Layer 1: Database Constraints

**Primary Prevention**: Database enforces uniqueness at storage level.

```sql
-- Email unique per tenant
ALTER TABLE clients
  ADD CONSTRAINT clients_tenant_email_unique
  UNIQUE(tenant_id, email);

-- Auth user unique globally
ALTER TABLE clients
  ADD CONSTRAINT clients_auth_user_unique
  UNIQUE(auth_user_id);
```

**Behavior**:
- Duplicate email in same tenant → `INSERT` fails with constraint violation
- Duplicate auth_user_id → `INSERT` fails with constraint violation

---

### Layer 2: Application Validation

**Secondary Prevention**: Application validates before attempting database insert.

```typescript
async function validateClientSignup(
  email: string,
  tenantId: string
): Promise<{ valid: boolean; reason?: string }> {
  // Check if email already exists in tenant
  const { data: existing } = await supabase
    .from('clients')
    .select('id, email')
    .eq('tenant_id', tenantId)
    .eq('email', email.toLowerCase())
    .maybeSingle();

  if (existing) {
    return {
      valid: false,
      reason: 'Email already exists in this tenant'
    };
  }

  return { valid: true };
}
```

---

### Layer 3: User Experience

**Tertiary Prevention**: Clear user messaging and guided resolution.

```typescript
// Signup form handler
async function handleSignup(email: string, password: string, token: string) {
  const invitation = await validateInvitation(token);

  if (!invitation) {
    return {
      error: 'Invalid or expired invitation'
    };
  }

  const validation = await validateClientSignup(email, invitation.tenant_id);

  if (!validation.valid) {
    return {
      error: 'An account with this email already exists. Please log in instead.',
      action: 'redirect_to_login',
      loginEmail: email
    };
  }

  // Proceed with signup...
}
```

---

## Duplicate Scenarios

### Scenario 1: Same Email, Same Tenant (Prevented)

**Attempt**:
```
Tenant: Chef Alice (tenant_id = 'ttt-111')
Existing: client@example.com (profile_id = 'ccc-111')
New: client@example.com (attempted signup)
```

**Prevention Mechanism**: Database constraint

**Database Error**:
```
ERROR: duplicate key value violates unique constraint "clients_tenant_email_unique"
DETAIL: Key (tenant_id, email)=(ttt-111, client@example.com) already exists.
```

**User Experience**:
```
"An account with this email already exists for this chef.

Would you like to:
  → Log in to your existing account
  → Use a different email address
  → Contact the chef for assistance"
```

**Resolution**: Direct user to login flow.

---

### Scenario 2: Same Email, Different Tenant (Allowed)

**Setup**:
```
Tenant A: client@example.com (profile_id = 'ccc-111')
Tenant B: client@example.com (new signup)
```

**Prevention Mechanism**: None (intentionally allowed)

**Outcome**: ✅ Two separate profiles created (different tenants)

**Database State**:
```
clients:
  1. { id: 'ccc-111', tenant_id: 'ttt-aaa', email: 'client@example.com', auth_user_id: 'aaa-111' }
  2. { id: 'ccc-222', tenant_id: 'ttt-bbb', email: 'client@example.com', auth_user_id: 'aaa-111' }
```

**Key Point**: Same `auth_user_id`, different `tenant_id` (multi-tenant client).

**V1 Limitation**: Only one role per user, so second profile cannot be created in V1.

**V2 Enhancement**: Remove `UNIQUE(auth_user_id)` constraint on `user_roles`.

---

### Scenario 3: Different Email, Same Auth User (Edge Case)

**Attempt**:
```
Auth User: auth_user_id = 'aaa-111', email = 'client@example.com'
Profile 1: email = 'client@example.com', auth_user_id = 'aaa-111'
Profile 2: email = 'client@work.com', auth_user_id = 'aaa-111' (attempted)
```

**Prevention Mechanism**: `UNIQUE(auth_user_id)` constraint on `clients`

**Database Error**:
```
ERROR: duplicate key value violates unique constraint "clients_auth_user_unique"
DETAIL: Key (auth_user_id)=(aaa-111) already exists.
```

**Cause**: Cannot link two profiles to same auth user in same tenant.

**Resolution**: Update existing profile email instead.

---

### Scenario 4: Case Variation (client@example.com vs Client@Example.com)

**Setup**:
```
Existing: client@example.com
Attempted: Client@Example.COM
```

**Prevention Mechanism**: Email normalization before insert

```typescript
// Normalize email to lowercase before database operations
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Usage
const normalizedEmail = normalizeEmail('Client@Example.COM');
// → 'client@example.com'
```

**Database Insert**:
```sql
INSERT INTO clients (tenant_id, email, ...)
VALUES ('ttt-111', lower('Client@Example.COM'), ...);
```

**Outcome**: Duplicate detected and prevented.

---

### Scenario 5: Whitespace Variation (leading/trailing spaces)

**Setup**:
```
Existing: client@example.com
Attempted: " client@example.com " (with spaces)
```

**Prevention Mechanism**: Email trimming before insert

```typescript
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

normalizeEmail(' client@example.com '); // → 'client@example.com'
```

**Outcome**: Duplicate detected and prevented.

---

## Detection Mechanisms

### Real-Time Detection (Signup)

```typescript
// During invitation-based signup
async function handleInvitationSignup(
  invitationToken: string,
  password: string
) {
  // 1. Validate invitation
  const invitation = await supabase
    .from('client_invitations')
    .select('*')
    .eq('token', invitationToken)
    .is('used_at', null)
    .single();

  if (!invitation) {
    return { error: 'Invalid invitation' };
  }

  const normalizedEmail = normalizeEmail(invitation.email);

  // 2. Check for existing profile (real-time detection)
  const { data: existing } = await supabase
    .from('clients')
    .select('id, email, full_name')
    .eq('tenant_id', invitation.tenant_id)
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (existing) {
    // Duplicate detected!
    return {
      error: 'Account already exists',
      existingProfile: {
        email: existing.email,
        name: existing.full_name
      },
      suggestedAction: 'login'
    };
  }

  // 3. Proceed with signup...
}
```

---

### Batch Detection (Admin Tool)

```sql
-- Find potential duplicates by email (case-insensitive)
SELECT
  tenant_id,
  lower(email) AS normalized_email,
  COUNT(*) AS duplicate_count,
  array_agg(id) AS profile_ids,
  array_agg(full_name) AS names
FROM clients
WHERE is_deleted = false
GROUP BY tenant_id, lower(email)
HAVING COUNT(*) > 1;
```

**Output**:
```
tenant_id | normalized_email    | duplicate_count | profile_ids          | names
----------|---------------------|-----------------|----------------------|------------------
ttt-111   | client@example.com  | 2               | {ccc-111, ccc-222}   | {Alice, Alice S}
```

**Use Case**: Periodic admin audit to detect data integrity issues.

---

### Fuzzy Match Detection (V2 Enhancement)

**Goal**: Detect near-duplicates (typos, variations).

**Examples**:
- `john.doe@gmail.com` vs `johndoe@gmail.com`
- `alice@example.com` vs `alice@examp1e.com` (typo)

**Algorithm** (V2):
```typescript
function fuzzyMatchEmails(email1: string, email2: string): number {
  // Levenshtein distance or similar
  // Returns similarity score 0-1
}
```

**V1 Limitation**: Not implemented (manual review only).

---

## User Messaging

### Message 1: Duplicate Email Detected

```
Error: Account Already Exists

An account with the email client@example.com already exists for this chef.

You have two options:
  1. Log in to your existing account
     → [Go to Login Page]

  2. Use a different email address
     → [Back to Signup]

Need help? Contact the chef or our support team.
```

---

### Message 2: Invitation Email Mismatch

```
Error: Email Mismatch

Your invitation was sent to client@example.com, but you're trying to sign up with a different email.

Please sign up using the invited email address: client@example.com

Or contact the chef to send a new invitation to your preferred email.
```

---

### Message 3: Account Merge Suggestion (V2)

```
Multiple Accounts Detected

It looks like you may have multiple accounts:
  • client@gmail.com (2 events)
  • client@work.com (1 event)

Would you like to merge these into a single account?
  → [Yes, merge accounts]
  → [No, keep separate]

This will combine your event history and preferences.
```

---

## Prevention Best Practices

### Best Practice 1: Email Normalization

**Rule**: Always normalize emails before database operations.

**Implementation**:
```typescript
// Centralized normalization function
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Use everywhere
const normalized = normalizeEmail(userInput);
await supabase.from('clients').insert({ email: normalized, ... });
```

---

### Best Practice 2: Invitation-Based Signup Only

**Rule**: Clients cannot self-register (prevents spam and duplicates).

**Enforcement**:
- ✅ No public signup page
- ✅ Signup requires valid invitation token
- ✅ Invitation pre-fills email (cannot be changed)

**Benefits**:
- Chef controls who signs up
- Email validated before signup link sent
- Reduces duplicate signups (chef knows existing clients)

---

### Best Practice 3: Clear Error Messages

**Rule**: Guide users to resolution when duplicate detected.

**Good Error Message**:
```
"An account with this email already exists.
Would you like to log in instead?"
  [Go to Login]
```

**Bad Error Message**:
```
"Error 409: Duplicate key constraint violation"
```

---

### Best Practice 4: Pre-Signup Validation

**Rule**: Validate before auth user creation (prevent orphaned auth users).

**Flow**:
```typescript
// 1. Validate invitation + email FIRST
const validation = await validateClientSignup(email, tenantId);

if (!validation.valid) {
  return { error: validation.reason }; // Stop here
}

// 2. THEN create auth user
const { data: authData } = await supabase.auth.signUp({ email, password });

// 3. THEN create profile
await createClientProfile(authData.user.id, tenantId, email);
```

**Why**: Avoids creating auth user if profile will fail (keeps auth + profiles in sync).

---

## Constraint Violations Handling

### Application-Level Handling

```typescript
async function createClient(data: ClientCreatePayload) {
  try {
    const { data: client, error } = await supabase
      .from('clients')
      .insert(data)
      .select()
      .single();

    if (error) {
      // Check for specific constraint violations
      if (error.code === '23505') { // unique_violation
        if (error.message.includes('clients_tenant_email_unique')) {
          return {
            error: 'duplicate_email',
            message: 'An account with this email already exists'
          };
        }

        if (error.message.includes('clients_auth_user_unique')) {
          return {
            error: 'duplicate_auth_user',
            message: 'This user already has a profile'
          };
        }
      }

      // Generic error
      return { error: 'unknown', message: error.message };
    }

    return { data: client };
  } catch (err) {
    console.error('Client creation failed:', err);
    throw err;
  }
}
```

---

### User-Friendly Error Mapping

```typescript
const ERROR_MESSAGES = {
  duplicate_email: {
    title: 'Account Already Exists',
    message: 'An account with this email already exists for this chef.',
    actions: ['login', 'use_different_email', 'contact_support']
  },
  duplicate_auth_user: {
    title: 'Profile Already Created',
    message: 'You already have a profile with this chef.',
    actions: ['login', 'contact_support']
  }
};

// Usage in UI
if (result.error === 'duplicate_email') {
  const errorConfig = ERROR_MESSAGES.duplicate_email;
  showErrorModal(errorConfig);
}
```

---

## Monitoring & Alerts

### Metrics to Track

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| **Duplicate signup attempts** | How many signups blocked due to duplicates | > 10/day |
| **Constraint violations** | Database constraint violations in logs | > 5/day |
| **Orphaned auth users** | Auth users without profiles | > 2 |
| **Orphaned profiles** | Profiles without auth users | > 0 |

---

### Detection Query (Periodic)

```sql
-- Run daily: Find orphaned auth users
SELECT
  au.id AS auth_user_id,
  au.email,
  au.created_at,
  au.email_confirmed_at
FROM auth.users au
LEFT JOIN user_roles ur ON ur.auth_user_id = au.id
WHERE ur.id IS NULL
  AND au.created_at < now() - interval '1 day';
```

**Action**: Investigate and clean up (delete or assign role).

---

## Prevention vs Remediation

### Prevention (Preferred)

**Goal**: Stop duplicates from being created.

**Mechanisms**:
- Database constraints
- Application validation
- Invitation-based signup
- Email normalization
- Clear user messaging

**Cost**: Low (built into signup flow)

---

### Remediation (Fallback)

**Goal**: Fix duplicates after they exist.

**Mechanisms**:
- Manual merge process
- Admin tools to detect duplicates
- Audit logs to track merges

**Cost**: High (manual intervention required)

**See**: [CLIENT_MERGE_PROCESS.md](./CLIENT_MERGE_PROCESS.md)

---

## Testing Duplicate Prevention

### Test: Duplicate Email Blocked

```typescript
test('Cannot create duplicate email in same tenant', async () => {
  const tenantId = 'ttt-111';
  const email = 'client@example.com';

  // 1. Create first client
  const client1 = await createClient({
    tenant_id: tenantId,
    email: email,
    full_name: 'Alice'
  });

  expect(client1.data).toBeDefined();

  // 2. Attempt to create duplicate
  const client2 = await createClient({
    tenant_id: tenantId,
    email: email,
    full_name: 'Alice Duplicate'
  });

  // 3. Verify duplicate blocked
  expect(client2.error).toBe('duplicate_email');
  expect(client2.data).toBeUndefined();
});
```

---

### Test: Case Insensitivity

```typescript
test('Email case variations detected as duplicates', async () => {
  const tenantId = 'ttt-111';

  // 1. Create client with lowercase email
  const client1 = await createClient({
    tenant_id: tenantId,
    email: 'client@example.com',
    full_name: 'Alice'
  });

  expect(client1.data).toBeDefined();

  // 2. Attempt uppercase variation
  const client2 = await createClient({
    tenant_id: tenantId,
    email: 'CLIENT@EXAMPLE.COM',
    full_name: 'Alice'
  });

  // 3. Verify duplicate detected
  expect(client2.error).toBe('duplicate_email');
});
```

---

### Test: Cross-Tenant Allowed

```typescript
test('Same email allowed in different tenants', async () => {
  const email = 'client@example.com';

  // 1. Create client in Tenant A
  const client1 = await createClient({
    tenant_id: 'ttt-aaa',
    email: email,
    full_name: 'Alice'
  });

  expect(client1.data).toBeDefined();

  // 2. Create client in Tenant B (same email)
  const client2 = await createClient({
    tenant_id: 'ttt-bbb',
    email: email,
    full_name: 'Alice'
  });

  // 3. Verify both created successfully
  expect(client2.data).toBeDefined();
  expect(client1.data.id).not.toBe(client2.data.id);
});
```

---

## Related Documents

- [CLIENT_IDENTITY_MODEL.md](./CLIENT_IDENTITY_MODEL.md)
- [CLIENT_MERGE_PROCESS.md](./CLIENT_MERGE_PROCESS.md)
- [CLIENT_ACCOUNT_LINKING_RULES.md](./CLIENT_ACCOUNT_LINKING_RULES.md)
- [CLIENT_PROFILE_SCHEMA.md](./CLIENT_PROFILE_SCHEMA.md)

---

**Document Status**: ✅ Implementation-Ready
**ChefFlow Version**: V1
**Last Updated**: 2026-02-14
