# Database Soft Delete Policy (V1)

## Tables with Soft Delete

### Soft-Deletable Tables
- `chefs` (tenant deactivation)
- `client_profiles`
- `events`
- `menu_templates`

### Never Deleted Tables
- `ledger_entries` (immutable)
- `event_transitions` (immutable)
- `user_roles` (access revocation via deletion, not soft delete)

## Soft Delete Implementation

**Column**: `deleted_at TIMESTAMPTZ`

```sql
ALTER TABLE events ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE client_profiles ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE chefs ADD COLUMN deleted_at TIMESTAMPTZ;
```

## Soft Delete Function

```typescript
async function softDeleteEvent(eventId: string) {
  await db.events.update({
    where: { id: eventId },
    data: { deleted_at: new Date() }
  });
}
```

## Query Patterns

**Exclude soft-deleted records:**

```sql
SELECT * FROM events WHERE deleted_at IS NULL;
```

**Index for performance:**

```sql
CREATE INDEX idx_events_not_deleted 
  ON events(tenant_id) WHERE deleted_at IS NULL;
```

## RLS Policies

RLS policies should exclude soft-deleted records:

```sql
CREATE POLICY chef_access ON events
FOR ALL
USING (
  deleted_at IS NULL AND
  tenant_id = (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid())
);
```

## Hard Delete (Admin Only)

Hard deletes are rare and require manual intervention:

```sql
-- Admin only, after verification
DELETE FROM events WHERE id = 'uuid' AND deleted_at IS NOT NULL;
```

V1 does not expose hard delete via UI.
