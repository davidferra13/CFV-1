# Client Merge Process

## Document Identity
- **File**: `CLIENT_MERGE_PROCESS.md`
- **Category**: Identity & Linking (16/200)
- **Version**: ChefFlow V1
- **Status**: Implementation-Ready

---

## Purpose

This document defines the **process for merging duplicate client identities** in the ChefFlow system.

It specifies:
- When merge is required vs prevented
- Merge vs duplicate scenarios
- V1 merge limitations (manual only)
- V2 automated merge considerations
- Data preservation and audit requirements

---

## Overview

### What is a Merge?

A **merge** combines two client identities into one, preserving:
- Historical events
- Payment records (ledger entries)
- Preferences and profile data
- Audit trail of the merge operation

### When is Merge Needed?

| Scenario | Merge Required? | Reason |
|----------|----------------|--------|
| Same email, same tenant | ❌ Prevented | Violates `UNIQUE(tenant_id, email)` |
| Same email, different tenant | ❌ Not needed | Separate tenant scopes (allowed) |
| Different email, same person | ✅ Yes (manual) | User error, different email addresses |
| Typo in email | ✅ Yes (manual) | Correct typo, preserve history |
| Client requests consolidation | ✅ Yes (manual) | User preference |

---

## V1 Scope: Manual Merge Only

### What V1 Supports

**V1 does NOT include automated merge functionality.**

**V1 Merge Process**:
1. Client contacts chef/support
2. Admin manually identifies duplicate accounts
3. Admin executes SQL merge script
4. Audit log records merge operation

**V1 Limitation**: No self-service merge UI.

---

### What V1 Does NOT Support

❌ Automated duplicate detection
❌ Self-service merge UI
❌ Cross-tenant merge
❌ Partial merge (selective data migration)
❌ Merge preview/simulation
❌ Merge undo/rollback

**These are V2+ enhancements.**

---

## Merge Scenarios

### Scenario 1: Same Email, Same Tenant (Prevented)

**Setup**:
```
Tenant: Chef Alice (tenant_id = 'ttt-111')
Profile 1: client@example.com (exists)
Profile 2: client@example.com (attempted signup)
```

**Outcome**: ❌ Blocked by database constraint

**Error**:
```
duplicate key value violates unique constraint "clients_tenant_email_unique"
```

**User Experience**:
```
"An account with this email already exists.
Please log in or use a different email."
```

**Resolution**: No merge needed - direct user to existing account.

---

### Scenario 2: Same Email, Different Tenant (Allowed)

**Setup**:
```
Tenant A: Chef Alice (tenant_id = 'ttt-111')
  → client@example.com (profile_id = 'ccc-111')

Tenant B: Chef Bob (tenant_id = 'ttt-222')
  → client@example.com (profile_id = 'ccc-222')
```

**Outcome**: ✅ Allowed (separate tenant scopes)

**Result**:
- One `auth.users` record (auth_user_id = same)
- Two `clients` records (one per tenant)
- Two `user_roles` records (V2 only - V1 has one role limit)

**No Merge Needed**: This is intentional multi-tenant design.

**V1 Limitation**: Client can only access one tenant at a time (no switcher UI).

---

### Scenario 3: Different Emails, Same Person (Requires Merge)

**Setup**:
```
Tenant: Chef Alice (tenant_id = 'ttt-111')
Profile 1: client@gmail.com (auth_user_id = 'aaa-111')
  → Event 1: Birthday Party ($500)
  → 2 ledger entries

Profile 2: client@work.com (auth_user_id = 'aaa-222')
  → Event 2: Anniversary Dinner ($300)
  → 1 ledger entry
```

**Problem**: Same person, different auth identities, different profiles.

**Goal**: Merge into single identity, preserve all history.

**Resolution**: Manual merge process (see below).

---

## Manual Merge Process (V1)

### Pre-Merge Validation

**Step 1: Identify Merge Candidates**

```sql
-- Admin query: Find potential duplicates by name/phone
SELECT
  c1.id AS profile1_id,
  c1.email AS profile1_email,
  c1.full_name AS profile1_name,
  c2.id AS profile2_id,
  c2.email AS profile2_email,
  c2.full_name AS profile2_name
FROM clients c1
JOIN clients c2 ON c1.tenant_id = c2.tenant_id
  AND c1.id < c2.id
  AND (
    c1.full_name = c2.full_name OR
    c1.phone = c2.phone
  )
WHERE c1.tenant_id = 'ttt-111';
```

---

**Step 2: Verify Merge is Valid**

**Checklist**:
- [ ] Profiles belong to same tenant
- [ ] Profiles represent same person (verified by chef)
- [ ] No active events in both profiles (complexity limit)
- [ ] Target profile determined (which one to keep)

---

### Merge Execution

**Step 3: Choose Target Profile**

**Criteria for Target**:
- ✅ Profile with most recent activity
- ✅ Profile with verified email
- ✅ Profile with Stripe customer ID (if exists)

**Example**:
```
Target: Profile 1 (client@gmail.com)
Source: Profile 2 (client@work.com) → will be merged into target
```

---

**Step 4: Execute Merge Script**

```sql
-- MERGE SCRIPT (Run as service role)
-- Target: profile1_id ('ccc-111')
-- Source: profile2_id ('ccc-222')

BEGIN;

-- 1. Migrate events from source to target
UPDATE events
SET client_id = 'ccc-111' -- target
WHERE client_id = 'ccc-222'; -- source

-- 2. Migrate ledger entries from source to target
UPDATE ledger_entries
SET client_id = 'ccc-111' -- target
WHERE client_id = 'ccc-222'; -- source

-- 3. Merge preferences (manual logic - example: union arrays)
UPDATE clients
SET
  dietary_restrictions = ARRAY(
    SELECT DISTINCT unnest(
      COALESCE(dietary_restrictions, '{}') ||
      (SELECT COALESCE(dietary_restrictions, '{}') FROM clients WHERE id = 'ccc-222')
    )
  ),
  allergies = ARRAY(
    SELECT DISTINCT unnest(
      COALESCE(allergies, '{}') ||
      (SELECT COALESCE(allergies, '{}') FROM clients WHERE id = 'ccc-222')
    )
  ),
  favorite_dishes = ARRAY(
    SELECT DISTINCT unnest(
      COALESCE(favorite_dishes, '{}') ||
      (SELECT COALESCE(favorite_dishes, '{}') FROM clients WHERE id = 'ccc-222')
    )
  )
WHERE id = 'ccc-111'; -- target

-- 4. Soft-delete source profile
UPDATE clients
SET
  is_deleted = true,
  deleted_at = now()
WHERE id = 'ccc-222'; -- source

-- 5. Delete source role assignment
DELETE FROM user_roles
WHERE entity_id = 'ccc-222' AND role = 'client';

-- 6. Log merge operation (audit trail)
INSERT INTO client_merge_log (
  tenant_id,
  target_profile_id,
  source_profile_id,
  merged_by,
  merged_at,
  metadata
) VALUES (
  'ttt-111',
  'ccc-111',
  'ccc-222',
  auth.uid(),
  now(),
  jsonb_build_object(
    'target_email', 'client@gmail.com',
    'source_email', 'client@work.com',
    'reason', 'Same person, different email addresses'
  )
);

COMMIT;
```

**Note**: `client_merge_log` table is a V2 enhancement (not in V1 schema).

---

**Step 5: Notify Client**

```
Email to client@gmail.com:

"Your accounts have been merged. You can now access all your events
and history using client@gmail.com."
```

---

**Step 6: Archive Source Auth User**

```typescript
// Optionally delete source auth user (admin action)
await supabase.auth.admin.deleteUser('aaa-222'); // source auth_user_id
```

**Warning**: This is irreversible. Source auth user permanently deleted.

---

## Data Preservation Rules

### What Must Be Preserved

| Data Type | Preservation Rule |
|-----------|------------------|
| **Events** | Migrate to target profile (UPDATE `client_id`) |
| **Ledger entries** | Migrate to target profile (UPDATE `client_id`) |
| **Preferences** | Merge arrays (union, deduplicate) |
| **Contact info** | Keep target profile data |
| **Stripe customer** | Keep target profile Stripe ID |
| **Audit trail** | Log merge operation |

### What Can Be Lost

| Data Type | Behavior |
|-----------|----------|
| **Source profile metadata** | Overwritten (full_name, phone from target) |
| **Source auth user** | Deleted (if admin chooses) |
| **Source role assignment** | Deleted |

---

## Merge Audit Log (V2)

### `client_merge_log` Table Schema

```sql
CREATE TABLE client_merge_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  target_profile_id UUID NOT NULL REFERENCES clients(id),
  source_profile_id UUID NOT NULL, -- May reference deleted profile
  merged_by UUID REFERENCES auth.users(id),
  merged_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  metadata JSONB
);
```

**Metadata Example**:
```json
{
  "target_email": "client@gmail.com",
  "source_email": "client@work.com",
  "reason": "Duplicate account - same person",
  "events_migrated": 3,
  "ledger_entries_migrated": 5
}
```

---

## Merge Validation & Testing

### Pre-Merge Validation Checks

```typescript
async function validateMerge(
  targetProfileId: string,
  sourceProfileId: string
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // 1. Verify both profiles exist
  const target = await getClient(targetProfileId);
  const source = await getClient(sourceProfileId);

  if (!target) errors.push('Target profile does not exist');
  if (!source) errors.push('Source profile does not exist');

  // 2. Verify same tenant
  if (target.tenant_id !== source.tenant_id) {
    errors.push('Cannot merge profiles from different tenants');
  }

  // 3. Verify not already deleted
  if (target.is_deleted) errors.push('Target profile is deleted');
  if (source.is_deleted) errors.push('Source profile is deleted');

  // 4. Verify target has auth user
  const targetRole = await getUserRole(target.auth_user_id);
  if (!targetRole) {
    errors.push('Target profile has no role assignment');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

---

### Post-Merge Validation Checks

```typescript
async function validateMergeComplete(
  targetProfileId: string,
  sourceProfileId: string
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // 1. Verify all events migrated
  const sourceEvents = await supabase
    .from('events')
    .select('id')
    .eq('client_id', sourceProfileId);

  if (sourceEvents.data.length > 0) {
    errors.push('Source profile still has events');
  }

  // 2. Verify all ledger entries migrated
  const sourceLedger = await supabase
    .from('ledger_entries')
    .select('id')
    .eq('client_id', sourceProfileId);

  if (sourceLedger.data.length > 0) {
    errors.push('Source profile still has ledger entries');
  }

  // 3. Verify source profile deleted
  const source = await getClient(sourceProfileId);
  if (!source.is_deleted) {
    errors.push('Source profile not marked as deleted');
  }

  // 4. Verify source role deleted
  const sourceRole = await supabase
    .from('user_roles')
    .select('id')
    .eq('entity_id', sourceProfileId)
    .eq('role', 'client');

  if (sourceRole.data.length > 0) {
    errors.push('Source role assignment still exists');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

---

## Merge Rollback (V2)

**V1 Limitation**: No rollback mechanism.

**V2 Consideration**: Implement merge undo.

### Rollback Process (Conceptual)

```sql
-- ROLLBACK SCRIPT (V2 only)
BEGIN;

-- 1. Restore source profile
UPDATE clients
SET
  is_deleted = false,
  deleted_at = NULL
WHERE id = 'ccc-222'; -- source

-- 2. Migrate events back to source
UPDATE events
SET client_id = 'ccc-222' -- source
WHERE client_id = 'ccc-111' -- target
  AND created_at > (SELECT merged_at FROM client_merge_log WHERE source_profile_id = 'ccc-222');

-- 3. Migrate ledger entries back to source
UPDATE ledger_entries
SET client_id = 'ccc-222' -- source
WHERE client_id = 'ccc-111' -- target
  AND created_at > (SELECT merged_at FROM client_merge_log WHERE source_profile_id = 'ccc-222');

-- 4. Restore source role
INSERT INTO user_roles (
  auth_user_id,
  role,
  entity_id,
  tenant_id
) VALUES (
  'aaa-222', -- source auth_user_id
  'client',
  'ccc-222', -- source profile
  'ttt-111'
);

-- 5. Log rollback
UPDATE client_merge_log
SET
  rolled_back_at = now(),
  rolled_back_by = auth.uid()
WHERE source_profile_id = 'ccc-222';

COMMIT;
```

**Warning**: Rollback is complex and error-prone. V1 does not support it.

---

## Cross-Tenant Merge (Not Supported)

### Scenario

```
Tenant A: client@example.com (profile_id = 'ccc-111')
Tenant B: client@example.com (profile_id = 'ccc-222')
```

**Question**: Can we merge these into a single multi-tenant client?

**V1 Answer**: ❌ No. Cross-tenant merge not supported.

**Reason**:
- Tenant isolation is core design principle
- Events tied to specific tenant
- Ledger entries scoped to tenant
- Complexity too high for V1

**V2 Consideration**: Multi-tenant client profiles (no merge, just unified view).

---

## Duplicate Prevention vs Merge

### Prevention Strategy (Preferred)

**Goal**: Prevent duplicates from being created.

**Mechanisms**:
- ✅ Email uniqueness per tenant (database constraint)
- ✅ Invitation-based signup (chef controls who signs up)
- ✅ Clear error messages ("Account already exists")

**See**: [CLIENT_DUPLICATE_PREVENTION.md](./CLIENT_DUPLICATE_PREVENTION.md)

---

### Merge Strategy (Remediation)

**Goal**: Fix duplicates after they've been created.

**When Needed**:
- Different emails, same person
- Client changed email providers
- Typos in original signup

**V1 Approach**: Manual admin intervention

**V2 Approach**: Automated duplicate detection + guided merge UI

---

## Security Considerations

### Merge Authorization

**V1**: Only admins (service role) can execute merge.

**V2**: Chef-initiated merge with client confirmation.

### Preventing Malicious Merge

**Attack**: Merge victim's profile into attacker's profile to steal history.

**Prevention**:
- ✅ Merge requires admin/service role (V1)
- ✅ Audit log records who initiated merge
- ✅ Email notification to affected client
- ✅ Client can dispute merge (contact support)

**V2 Enhancement**: Client must approve merge via email confirmation.

---

## Related Documents

- [CLIENT_IDENTITY_MODEL.md](./CLIENT_IDENTITY_MODEL.md)
- [CLIENT_DUPLICATE_PREVENTION.md](./CLIENT_DUPLICATE_PREVENTION.md)
- [CLIENT_ACCOUNT_LINKING_RULES.md](./CLIENT_ACCOUNT_LINKING_RULES.md)
- [CLIENT_IDENTITY_AUDIT_LOGGING.md](./CLIENT_IDENTITY_AUDIT_LOGGING.md)

---

**Document Status**: ✅ Implementation-Ready
**ChefFlow Version**: V1
**Last Updated**: 2026-02-14
