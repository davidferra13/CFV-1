# RLS Chef Policies (V1)

## Events Table

```sql
CREATE POLICY chef_access ON events
FOR ALL
USING (
  tenant_id = current_tenant_id() AND
  current_user_role() IN ('chef', 'chef_subaccount') AND
  deleted_at IS NULL
);
```

## Client Profiles Table

```sql
CREATE POLICY chef_access ON client_profiles
FOR ALL
USING (
  tenant_id = current_tenant_id() AND
  current_user_role() IN ('chef', 'chef_subaccount') AND
  deleted_at IS NULL
);
```

## Ledger Entries Table

```sql
CREATE POLICY chef_read ON ledger_entries
FOR SELECT
USING (
  event_id IN (
    SELECT id FROM events WHERE tenant_id = current_tenant_id()
  ) AND
  current_user_role() = 'chef'
);

CREATE POLICY chef_insert ON ledger_entries
FOR INSERT
WITH CHECK (
  event_id IN (
    SELECT id FROM events WHERE tenant_id = current_tenant_id()
  ) AND
  current_user_role() = 'chef'
);

-- No UPDATE or DELETE policies (immutable)
```

## Menu Templates

```sql
CREATE POLICY chef_access ON menu_templates
FOR ALL
USING (
  tenant_id = current_tenant_id() AND
  current_user_role() IN ('chef', 'chef_subaccount') AND
  deleted_at IS NULL
);
```

## Event Menus

```sql
CREATE POLICY chef_access ON event_menus
FOR ALL
USING (
  event_id IN (
    SELECT id FROM events WHERE tenant_id = current_tenant_id()
  ) AND
  current_user_role() IN ('chef', 'chef_subaccount')
);
```
