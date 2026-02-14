# Client Identity Audit Logging

## Document Identity
- **File**: `CLIENT_IDENTITY_AUDIT_LOGGING.md`
- **Category**: Identity & Linking (18/200)
- **Version**: ChefFlow V1
- **Status**: Implementation-Ready

---

## Purpose

This document defines the **audit logging requirements** for client identity operations in the ChefFlow system.

It specifies:
- What identity events must be logged
- Where audit logs are stored
- What information must be captured
- Retention and compliance requirements
- Query and reporting capabilities

---

## Audit Logging Principles

### Principle 1: Immutability

**Rule**: Audit logs are **append-only** (no updates or deletes).

**Enforcement**:
- Database triggers block UPDATE/DELETE
- Application code only performs INSERT
- Audit log tables separate from operational tables

---

### Principle 2: Completeness

**Rule**: All identity-related state changes must be logged.

**Events to Log**:
- ✅ Client signup
- ✅ Email changes
- ✅ Profile updates
- ✅ Role assignments
- ✅ Account deletions (soft/hard)
- ✅ Login attempts (success/failure)
- ✅ Password resets
- ✅ Account merges (V2)

---

### Principle 3: Tamper-Resistance

**Rule**: Audit logs cannot be modified by application users.

**Enforcement**:
- No RLS policies for client/chef UPDATE
- Only service role can INSERT
- Server-side logging only (never client-side)

---

### Principle 4: Searchability

**Rule**: Audit logs must be queryable for compliance and debugging.

**Requirements**:
- Indexed by timestamp, user, event type
- Filterable by date range, tenant, client
- Exportable for compliance reporting

---

## Audit Events

### Event 1: Client Signup

**Trigger**: Client completes signup via invitation

**Logged Data**:
```typescript
{
  event_type: 'client_signup',
  auth_user_id: 'aaa-111',
  client_id: 'ccc-333',
  tenant_id: 'ttt-999',
  email: 'client@example.com',
  invitation_token: 'inv-token-123',
  ip_address: '192.168.1.100',
  user_agent: 'Mozilla/5.0...',
  timestamp: '2026-02-14T12:00:00Z'
}
```

**Storage**: `client_audit_log` table

---

### Event 2: Email Change

**Trigger**: Client changes email via Supabase Auth

**Logged Data**:
```typescript
{
  event_type: 'email_changed',
  auth_user_id: 'aaa-111',
  client_id: 'ccc-333',
  old_email: 'old@example.com',
  new_email: 'new@example.com',
  verified_at: '2026-02-14T12:30:00Z',
  timestamp: '2026-02-14T12:00:00Z'
}
```

**Storage**: `client_audit_log` table

---

### Event 3: Profile Update

**Trigger**: Client updates profile fields (name, phone, preferences)

**Logged Data**:
```typescript
{
  event_type: 'profile_updated',
  auth_user_id: 'aaa-111',
  client_id: 'ccc-333',
  changed_fields: ['full_name', 'phone'],
  old_values: {
    full_name: 'John Doe',
    phone: '555-1234'
  },
  new_values: {
    full_name: 'John A. Doe',
    phone: '555-5678'
  },
  timestamp: '2026-02-14T12:00:00Z'
}
```

**Storage**: `client_audit_log` table

**V1 Simplification**: Log event only, not full field-level changes.

---

### Event 4: Login Success

**Trigger**: Client successfully logs in

**Logged Data**:
```typescript
{
  event_type: 'login_success',
  auth_user_id: 'aaa-111',
  client_id: 'ccc-333',
  ip_address: '192.168.1.100',
  user_agent: 'Mozilla/5.0...',
  timestamp: '2026-02-14T12:00:00Z'
}
```

**Storage**: `client_audit_log` table (or Supabase Auth logs)

**V1 Note**: Supabase Auth logs login attempts automatically (not duplicated).

---

### Event 5: Login Failure

**Trigger**: Failed login attempt (wrong password, invalid email)

**Logged Data**:
```typescript
{
  event_type: 'login_failed',
  email: 'client@example.com', // May not have auth_user_id if email wrong
  failure_reason: 'invalid_credentials',
  ip_address: '192.168.1.100',
  user_agent: 'Mozilla/5.0...',
  timestamp: '2026-02-14T12:00:00Z'
}
```

**Storage**: Supabase Auth logs (not application logs)

**V1 Note**: Rely on Supabase built-in logging.

---

### Event 6: Password Reset

**Trigger**: Client requests password reset

**Logged Data**:
```typescript
{
  event_type: 'password_reset_requested',
  email: 'client@example.com',
  ip_address: '192.168.1.100',
  timestamp: '2026-02-14T12:00:00Z'
}

// After reset completed
{
  event_type: 'password_reset_completed',
  auth_user_id: 'aaa-111',
  timestamp: '2026-02-14T12:30:00Z'
}
```

**Storage**: Supabase Auth logs

**V1 Note**: Rely on Supabase built-in logging.

---

### Event 7: Account Soft Delete

**Trigger**: Client profile marked as deleted

**Logged Data**:
```typescript
{
  event_type: 'account_deleted',
  auth_user_id: 'aaa-111',
  client_id: 'ccc-333',
  deleted_by: 'aaa-999', // Chef or admin
  deletion_reason: 'Client requested account deletion',
  timestamp: '2026-02-14T12:00:00Z'
}
```

**Storage**: `client_audit_log` table

---

### Event 8: Role Assignment

**Trigger**: User role created (client role assigned)

**Logged Data**:
```typescript
{
  event_type: 'role_assigned',
  auth_user_id: 'aaa-111',
  role: 'client',
  entity_id: 'ccc-333',
  tenant_id: 'ttt-999',
  assigned_by: 'system', // Or admin auth_user_id
  timestamp: '2026-02-14T12:00:00Z'
}
```

**Storage**: `client_audit_log` table

---

### Event 9: Account Merge (V2)

**Trigger**: Two client profiles merged into one

**Logged Data**:
```typescript
{
  event_type: 'account_merged',
  target_client_id: 'ccc-111',
  source_client_id: 'ccc-222',
  tenant_id: 'ttt-999',
  merged_by: 'aaa-admin',
  merge_reason: 'Duplicate account - same person',
  events_migrated: 3,
  ledger_entries_migrated: 5,
  timestamp: '2026-02-14T12:00:00Z'
}
```

**Storage**: `client_merge_log` table (V2)

**See**: [CLIENT_MERGE_PROCESS.md](./CLIENT_MERGE_PROCESS.md)

---

## Audit Log Schema

### `client_audit_log` Table

```sql
CREATE TABLE client_audit_log (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who
  auth_user_id UUID REFERENCES auth.users(id), -- May be NULL for unauthenticated events
  client_id UUID REFERENCES clients(id),       -- May be NULL before profile created
  tenant_id UUID REFERENCES chefs(id),         -- May be NULL for global events

  -- What
  event_type TEXT NOT NULL, -- e.g., 'client_signup', 'email_changed', etc.
  event_data JSONB,          -- Flexible event-specific data

  -- When
  timestamp TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Where (for security)
  ip_address INET,
  user_agent TEXT,

  -- Context
  actor_id UUID REFERENCES auth.users(id), -- Who initiated (may differ from auth_user_id)
  source TEXT,                              -- e.g., 'web', 'api', 'admin'

  -- Immutability enforcement
  CONSTRAINT client_audit_log_immutable CHECK (false) -- Prevents updates via constraint
);

-- Indexes for querying
CREATE INDEX idx_audit_timestamp ON client_audit_log(timestamp DESC);
CREATE INDEX idx_audit_client ON client_audit_log(client_id);
CREATE INDEX idx_audit_auth_user ON client_audit_log(auth_user_id);
CREATE INDEX idx_audit_tenant ON client_audit_log(tenant_id);
CREATE INDEX idx_audit_event_type ON client_audit_log(event_type);

-- Immutability triggers
CREATE TRIGGER audit_log_immutable_update
BEFORE UPDATE ON client_audit_log
FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

CREATE TRIGGER audit_log_immutable_delete
BEFORE DELETE ON client_audit_log
FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();
```

**Key Points**:
- JSONB `event_data` allows flexible event-specific fields
- Indexed by common query patterns (time, client, tenant, event type)
- Immutability enforced via triggers

---

### Immutability Trigger Function

```sql
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit log table % is immutable. Entries cannot be modified or deleted.', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;
```

---

## Logging Implementation

### Server-Side Logging Function

```typescript
// lib/audit/log-client-event.ts
import { createServiceClient } from '@/lib/supabase/service';

export async function logClientEvent(event: {
  event_type: string;
  auth_user_id?: string;
  client_id?: string;
  tenant_id?: string;
  event_data?: Record<string, any>;
  actor_id?: string;
  ip_address?: string;
  user_agent?: string;
  source?: string;
}) {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from('client_audit_log')
    .insert({
      event_type: event.event_type,
      auth_user_id: event.auth_user_id || null,
      client_id: event.client_id || null,
      tenant_id: event.tenant_id || null,
      event_data: event.event_data || {},
      actor_id: event.actor_id || event.auth_user_id || null,
      ip_address: event.ip_address || null,
      user_agent: event.user_agent || null,
      source: event.source || 'web',
      timestamp: new Date().toISOString()
    });

  if (error) {
    console.error('Failed to log audit event:', error);
    // Don't throw - logging failure should not block operations
  }
}
```

---

### Usage Examples

**Example 1: Log Signup**

```typescript
// After client profile created
await logClientEvent({
  event_type: 'client_signup',
  auth_user_id: authUser.id,
  client_id: client.id,
  tenant_id: client.tenant_id,
  event_data: {
    email: client.email,
    invitation_token: invitation.token,
    full_name: client.full_name
  },
  ip_address: request.ip,
  user_agent: request.headers.get('user-agent'),
  source: 'web'
});
```

---

**Example 2: Log Email Change**

```typescript
// After email verified and synced
await logClientEvent({
  event_type: 'email_changed',
  auth_user_id: session.user.id,
  client_id: client.id,
  tenant_id: client.tenant_id,
  event_data: {
    old_email: oldEmail,
    new_email: newEmail,
    verified_at: session.user.email_confirmed_at
  }
});
```

---

**Example 3: Log Profile Update**

```typescript
// After profile fields updated
await logClientEvent({
  event_type: 'profile_updated',
  auth_user_id: session.user.id,
  client_id: client.id,
  tenant_id: client.tenant_id,
  event_data: {
    changed_fields: Object.keys(updates),
    // V1 simplification: don't log old/new values
  }
});
```

---

## Querying Audit Logs

### Query 1: Client Activity History

```typescript
// Get all audit events for a specific client
const { data: auditLog } = await supabase
  .from('client_audit_log')
  .select('*')
  .eq('client_id', clientId)
  .order('timestamp', { ascending: false })
  .limit(100);
```

**Output**:
```typescript
[
  {
    id: 'log-111',
    event_type: 'profile_updated',
    timestamp: '2026-02-14T15:00:00Z',
    event_data: { changed_fields: ['phone'] }
  },
  {
    id: 'log-222',
    event_type: 'email_changed',
    timestamp: '2026-02-10T12:00:00Z',
    event_data: { old_email: 'old@example.com', new_email: 'new@example.com' }
  },
  {
    id: 'log-333',
    event_type: 'client_signup',
    timestamp: '2026-02-01T10:00:00Z',
    event_data: { email: 'new@example.com' }
  }
]
```

---

### Query 2: Recent Signups

```sql
-- Get all signups in last 7 days for a tenant
SELECT
  timestamp,
  auth_user_id,
  client_id,
  event_data->>'email' AS email,
  event_data->>'full_name' AS full_name
FROM client_audit_log
WHERE event_type = 'client_signup'
  AND tenant_id = 'ttt-111'
  AND timestamp > now() - interval '7 days'
ORDER BY timestamp DESC;
```

---

### Query 3: Login Activity

```sql
-- Get all login activity for a client
SELECT
  timestamp,
  event_type,
  ip_address,
  user_agent
FROM client_audit_log
WHERE auth_user_id = 'aaa-111'
  AND event_type IN ('login_success', 'login_failed')
  AND timestamp > now() - interval '30 days'
ORDER BY timestamp DESC;
```

---

### Query 4: Account Deletions

```sql
-- Get all deleted accounts in a tenant
SELECT
  timestamp,
  client_id,
  event_data->>'deleted_by' AS deleted_by,
  event_data->>'deletion_reason' AS reason
FROM client_audit_log
WHERE event_type = 'account_deleted'
  AND tenant_id = 'ttt-111'
ORDER BY timestamp DESC;
```

---

## Retention & Compliance

### Retention Policy

**V1 Policy**: Retain all audit logs indefinitely (no automatic deletion).

**Reason**: Compliance and audit requirements.

**V2 Consideration**: Implement retention policies (e.g., 7 years for financial logs).

---

### GDPR Compliance

**Right to Access**: Clients can request their audit log.

**Query**:
```sql
SELECT * FROM client_audit_log
WHERE auth_user_id = 'aaa-111'
ORDER BY timestamp DESC;
```

**Export**: JSON or CSV format.

---

**Right to Erasure**: Audit logs may be retained even after account deletion.

**Justification**: Legal and compliance requirements (financial records).

**Balance**: Anonymize PII in event_data after deletion.

```sql
-- Anonymize deleted client audit logs (V2)
UPDATE client_audit_log
SET event_data = jsonb_set(
  event_data,
  '{email}',
  '"[REDACTED]"'::jsonb
)
WHERE client_id = 'ccc-deleted'
  AND event_data ? 'email';
```

**V1 Limitation**: No automatic anonymization (manual admin process).

---

## Security & Access Control

### RLS Policies

**Chef Access**:
```sql
-- Chefs can view audit logs for their tenant
CREATE POLICY audit_log_chef_select ON client_audit_log
  FOR SELECT USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
```

**Client Access**:
```sql
-- Clients can view their own audit logs
CREATE POLICY audit_log_client_select ON client_audit_log
  FOR SELECT USING (
    get_current_user_role() = 'client' AND
    auth_user_id = auth.uid()
  );
```

**No Write Access**:
- ❌ No INSERT policies for clients/chefs
- ✅ Only service role can INSERT
- ✅ Triggers block UPDATE/DELETE

---

### Sensitive Data Handling

**PII in Audit Logs**:
- Email addresses (necessary for audit)
- IP addresses (security requirement)
- User agent (debugging)

**Protection**:
- ✅ Audit logs not publicly accessible
- ✅ RLS enforces tenant isolation
- ✅ Export requires admin role

**V2 Enhancement**: Encrypt sensitive fields in `event_data`.

---

## Monitoring & Alerts

### Alert 1: Unusual Login Activity

**Trigger**: Multiple failed login attempts from same IP

**Query**:
```sql
SELECT
  ip_address,
  COUNT(*) AS failed_attempts,
  array_agg(DISTINCT event_data->>'email') AS attempted_emails
FROM client_audit_log
WHERE event_type = 'login_failed'
  AND timestamp > now() - interval '1 hour'
GROUP BY ip_address
HAVING COUNT(*) > 5;
```

**Action**: Temporarily block IP, notify admin.

---

### Alert 2: Mass Account Deletions

**Trigger**: Multiple account deletions in short time

**Query**:
```sql
SELECT
  tenant_id,
  COUNT(*) AS deletion_count
FROM client_audit_log
WHERE event_type = 'account_deleted'
  AND timestamp > now() - interval '1 day'
GROUP BY tenant_id
HAVING COUNT(*) > 10;
```

**Action**: Notify admin, investigate potential breach.

---

## Testing Audit Logging

### Test: Signup Logged

```typescript
test('Client signup creates audit log entry', async () => {
  // 1. Sign up client
  const { client } = await signUpClient({
    email: 'test@example.com',
    invitationToken: validToken
  });

  // 2. Verify audit log created
  const { data: auditLog } = await supabase
    .from('client_audit_log')
    .select('*')
    .eq('client_id', client.id)
    .eq('event_type', 'client_signup')
    .single();

  expect(auditLog).toBeDefined();
  expect(auditLog.event_data.email).toBe('test@example.com');
});
```

---

### Test: Audit Log Immutable

```typescript
test('Audit log entries cannot be modified', async () => {
  // 1. Create audit log entry
  const { data: log } = await supabase
    .from('client_audit_log')
    .insert({
      event_type: 'test_event',
      auth_user_id: 'aaa-111'
    })
    .select()
    .single();

  // 2. Attempt to update
  const { error } = await supabase
    .from('client_audit_log')
    .update({ event_type: 'modified' })
    .eq('id', log.id);

  // 3. Verify update blocked
  expect(error).toBeDefined();
  expect(error.message).toContain('immutable');
});
```

---

## Related Documents

- [CLIENT_IDENTITY_MODEL.md](./CLIENT_IDENTITY_MODEL.md)
- [CLIENT_AUTH_FLOW.md](./CLIENT_AUTH_FLOW.md)
- [CLIENT_MERGE_PROCESS.md](./CLIENT_MERGE_PROCESS.md)
- [CLIENT_AUTHORIZATION_INVARIANTS.md](./CLIENT_AUTHORIZATION_INVARIANTS.md)

---

**Document Status**: ✅ Implementation-Ready
**ChefFlow Version**: V1
**Last Updated**: 2026-02-14
