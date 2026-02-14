# Public Layer - Duplicate Prevention Rules

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Purpose

Prevents duplicate accounts and invitation misuse.

---

## Duplicate Email Prevention

### Chef Signup
```sql
-- Email UNIQUE constraint on chefs table
CREATE TABLE chefs (
  email TEXT UNIQUE NOT NULL
);
```

**Behavior**: If email already exists, signup fails with error.

---

### Client Signup
```sql
-- Email unique per tenant
CREATE TABLE clients (
  UNIQUE(tenant_id, email)
);
```

**Behavior**: Same email can exist for different chefs (different tenants), but NOT within same tenant.

---

## Duplicate Invitation Prevention

### Invitation Reuse Prevention
```typescript
// Check invitation not already used
const { data: invitation } = await supabase
  .from('client_invitations')
  .select('*')
  .eq('token', token)
  .is('used_at', null) // NOT yet used
  .single();

if (!invitation) {
  return { error: 'Invalid or already used invitation' };
}
```

---

### Invitation Expiry Check
```typescript
const { data: invitation } = await supabase
  .from('client_invitations')
  .select('*')
  .eq('token', token)
  .gte('expires_at', new Date().toISOString()) // NOT expired
  .single();
```

---

**Status**: Duplicate prevention rules are LOCKED for V1.
