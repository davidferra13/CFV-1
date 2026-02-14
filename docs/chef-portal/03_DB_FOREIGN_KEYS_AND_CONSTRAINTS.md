# Database Foreign Keys and Constraints (V1)

## Foreign Key Relationships

### User Roles
```sql
ALTER TABLE user_roles
  ADD CONSTRAINT fk_user_roles_user_id 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE user_roles
  ADD CONSTRAINT fk_user_roles_tenant_id
  FOREIGN KEY (tenant_id) REFERENCES chefs(id) ON DELETE CASCADE;
```

### Client Profiles
```sql
ALTER TABLE client_profiles
  ADD CONSTRAINT fk_client_profiles_tenant_id
  FOREIGN KEY (tenant_id) REFERENCES chefs(id) ON DELETE CASCADE;

ALTER TABLE client_profiles
  ADD CONSTRAINT fk_client_profiles_user_id
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
```

### Events
```sql
ALTER TABLE events
  ADD CONSTRAINT fk_events_tenant_id
  FOREIGN KEY (tenant_id) REFERENCES chefs(id) ON DELETE CASCADE;

ALTER TABLE events
  ADD CONSTRAINT fk_events_client_id
  FOREIGN KEY (client_id) REFERENCES client_profiles(id) ON DELETE RESTRICT;
```

### Event Transitions
```sql
ALTER TABLE event_transitions
  ADD CONSTRAINT fk_event_transitions_event_id
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
```

### Ledger Entries
```sql
ALTER TABLE ledger_entries
  ADD CONSTRAINT fk_ledger_entries_event_id
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE RESTRICT;
```

## Unique Constraints

```sql
-- One role per user per tenant
ALTER TABLE user_roles
  ADD CONSTRAINT uq_user_roles_user_tenant
  UNIQUE (user_id, tenant_id);

-- Unique invite tokens
ALTER TABLE client_invites
  ADD CONSTRAINT uq_client_invites_token
  UNIQUE (token);

-- Unique Stripe event IDs (idempotency)
ALTER TABLE ledger_entries
  ADD CONSTRAINT uq_ledger_stripe_event_id
  UNIQUE (stripe_event_id);
```

## Check Constraints

```sql
-- Role validation
ALTER TABLE user_roles
  ADD CONSTRAINT chk_user_roles_role
  CHECK (role IN ('chef', 'chef_subaccount', 'client'));

-- Amount validation
ALTER TABLE events
  ADD CONSTRAINT chk_events_amounts_positive
  CHECK (total_amount_cents >= 0 AND deposit_amount_cents >= 0);

ALTER TABLE ledger_entries
  ADD CONSTRAINT chk_ledger_amount_not_zero
  CHECK (amount_cents != 0);

-- Timestamps validation
ALTER TABLE events
  ADD CONSTRAINT chk_events_end_after_start
  CHECK (end_ts > start_ts);
```

## NOT NULL Constraints

All critical fields are NOT NULL:
- IDs (id, tenant_id, user_id)
- Timestamps (created_at, updated_at)
- Status fields (status, role)
- Financial amounts (amount_cents)
