# Schema Contract

**Document ID**: 028
**Version**: 1.0.0
**Status**: Active
**Last Updated**: 2026-02-14

---

## Purpose

Defines the complete database schema for ChefFlow V1. This is the authoritative contract for all tables, columns, types, and relationships. Schema MUST match `supabase/migrations/20260213000001_initial_schema.sql`.

---

## Core Tables

### chefs
```sql
CREATE TABLE chefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### clients
```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, email)
);
```

### events
```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  event_date DATE NOT NULL,
  guest_count INTEGER NOT NULL CHECK (guest_count > 0),
  location TEXT,
  deposit_amount INTEGER CHECK (deposit_amount >= 0),
  total_amount INTEGER CHECK (total_amount >= 0),
  status event_status NOT NULL DEFAULT 'draft',
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### ledger_entries
```sql
CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type ledger_entry_type NOT NULL,
  stripe_event_id TEXT UNIQUE,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### menus
```sql
CREATE TABLE menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_per_person INTEGER NOT NULL CHECK (price_per_person >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### user_roles
```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('chef', 'client')),
  chef_id UUID REFERENCES chefs(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_roles_role_check CHECK (
    (role = 'chef' AND chef_id IS NOT NULL AND client_id IS NULL) OR
    (role = 'client' AND client_id IS NOT NULL AND chef_id IS NULL)
  )
);
```

### event_transitions
```sql
CREATE TABLE event_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  from_status event_status,
  to_status event_status NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### event_menus
```sql
CREATE TABLE event_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, menu_id)
);
```

---

## Custom Types

### event_status
```sql
CREATE TYPE event_status AS ENUM (
  'draft',
  'proposed',
  'accepted',
  'paid',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled'
);
```

### ledger_entry_type
```sql
CREATE TYPE ledger_entry_type AS ENUM (
  'charge_created',
  'charge_succeeded',
  'charge_failed',
  'refund_created',
  'refund_succeeded',
  'payout_created',
  'payout_paid',
  'adjustment'
);
```

---

## Indexes

```sql
CREATE INDEX idx_events_tenant_id ON events(tenant_id);
CREATE INDEX idx_events_client_id ON events(client_id);
CREATE INDEX idx_ledger_tenant_id ON ledger_entries(tenant_id);
CREATE INDEX idx_ledger_event_id ON ledger_entries(event_id);
CREATE INDEX idx_clients_tenant_id ON clients(tenant_id);
```

---

## References

- **Database Authority Rules**: `027-database-authority-rules.md`
- **Migration Model**: `029-migration-model.md`
- **Type Generation Contract**: `030-type-generation-contract.md`
