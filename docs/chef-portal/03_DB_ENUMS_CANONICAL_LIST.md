# Database Enums - Canonical List (V1)

## `event_status`

Finite lifecycle states for events:

```sql
CREATE TYPE event_status AS ENUM (
  'draft',
  'proposed',
  'deposit_pending',
  'confirmed',
  'menu_in_progress',
  'menu_locked',
  'executed',
  'closed',
  'canceled'
);
```

## `ledger_entry_type`

Financial ledger entry types:

```sql
CREATE TYPE ledger_entry_type AS ENUM (
  'charge_pending',
  'charge_succeeded',
  'charge_failed',
  'refund_pending',
  'refund_succeeded',
  'refund_failed',
  'adjustment'
);
```

## `user_role`

User roles (may be TEXT with CHECK constraint instead of enum):

```sql
-- Option 1: ENUM
CREATE TYPE user_role AS ENUM ('chef', 'chef_subaccount', 'client');

-- Option 2: CHECK constraint (more flexible)
role TEXT CHECK (role IN ('chef', 'chef_subaccount', 'client'))
```

## Total Enums

- `event_status` (9 values)
- `ledger_entry_type` (7 values)
- `user_role` (3 values) or TEXT with CHECK
