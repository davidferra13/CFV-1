# Database Index Strategy (V1)

## Primary Indexes (Automatic)

All tables have PRIMARY KEY index on `id` column (UUID).

## Required Indexes

### Tenant Scoping
```sql
CREATE INDEX idx_events_tenant_id ON events(tenant_id);
CREATE INDEX idx_client_profiles_tenant_id ON client_profiles(tenant_id);
CREATE INDEX idx_menu_templates_tenant_id ON menu_templates(tenant_id);
CREATE INDEX idx_client_invites_tenant_id ON client_invites(tenant_id);
```

### User Lookups
```sql
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_client_profiles_user_id ON client_profiles(user_id);
```

### Event Queries
```sql
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_start_ts ON events(start_ts);
CREATE INDEX idx_events_client_id ON events(client_id);
```

### Financial Queries
```sql
CREATE INDEX idx_ledger_entries_event_id ON ledger_entries(event_id);
CREATE INDEX idx_ledger_entries_created_at ON ledger_entries(created_at);
```

### Lifecycle Tracking
```sql
CREATE INDEX idx_event_transitions_event_id ON event_transitions(event_id);
CREATE INDEX idx_event_transitions_triggered_at ON event_transitions(triggered_at);
```

## Composite Indexes

### Invite Lookups
```sql
CREATE UNIQUE INDEX idx_client_invites_token ON client_invites(token);
```

### Soft Delete Queries
```sql
CREATE INDEX idx_events_deleted_at ON events(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_deleted_at ON client_profiles(deleted_at) WHERE deleted_at IS NULL;
```

## Index Naming Convention

`idx_{table}_{column(s)}`

Example: `idx_events_tenant_id`
