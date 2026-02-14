# ChefFlow V1 - Database Schema Documentation

**Version**: 1.0
**Last Updated**: 2026-02-13
**Database**: PostgreSQL 15+ (Supabase)

## Table of Contents

- [Overview](#overview)
- [Enums](#enums)
- [Tables](#tables)
- [Views](#views)
- [Helper Functions](#helper-functions)
- [Triggers](#triggers)
- [Indexes](#indexes)
- [Constraints](#constraints)
- [Migration Strategy](#migration-strategy)

---

## Overview

The ChefFlow V1 database enforces **multi-tenant isolation**, **immutable financial records**, and **role-based access** at the database layer. All tables use UUID primary keys and include comprehensive audit trails.

### Database Principles

1. **Multi-Tenant by Design** - Every table (except `chefs` and `clients`) has `tenant_id` referencing `chefs.id`
2. **Immutability** - Critical tables (`ledger_entries`, `event_transitions`) are append-only via triggers
3. **Minor Units** - All monetary amounts stored as `INTEGER` in cents (no DECIMAL/FLOAT)
4. **Audit Trails** - `created_at`, `created_by`, `updated_at`, `updated_by` on all mutable tables
5. **Cascade Safety** - DELETE operations carefully configured to prevent data loss

---

## Enums

### user_role

```sql
CREATE TYPE user_role AS ENUM ('chef', 'client');
```

**Values:**
- `chef` - Tenant owner (private chef business)
- `client` - Customer of a specific chef

**Usage:** Stored in `user_roles` table (single source of truth)

---

### event_status

```sql
CREATE TYPE event_status AS ENUM (
  'draft',        -- Chef creating event
  'proposed',     -- Sent to client, awaiting response
  'accepted',     -- Client accepted, awaiting payment
  'paid',         -- Deposit/full payment received
  'confirmed',    -- Chef confirmed after payment
  'in_progress',  -- Event day
  'completed',    -- Event finished
  'cancelled'     -- Cancelled (with reason)
);
```

**State Machine:** See [EVENTS.md](EVENTS.md) for valid transitions

**Terminal States:** `completed`, `cancelled`

---

### ledger_entry_type

```sql
CREATE TYPE ledger_entry_type AS ENUM (
  'charge_created',      -- Stripe PaymentIntent created
  'charge_succeeded',    -- Payment succeeded
  'charge_failed',       -- Payment failed
  'refund_created',      -- Refund initiated
  'refund_succeeded',    -- Refund completed
  'payout_created',      -- Payout to chef initiated (future)
  'payout_paid',         -- Payout completed (future)
  'adjustment'           -- Manual adjustment (requires approval)
);
```

**Usage:** See [LEDGER.md](LEDGER.md) for entry type semantics

---

## Tables

### chefs

**Purpose:** Tenant owners (private chef businesses)

```sql
CREATE TABLE chefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  stripe_account_id TEXT UNIQUE,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
```

**Key Points:**
- One-to-one with `auth.users` via `auth_user_id`
- `stripe_account_id` for Stripe Connect payouts (future V1+)
- `onboarding_completed` tracks chef signup flow completion
- This table defines **tenants** in the multi-tenant model

**Indexes:**
- `idx_chefs_auth_user` on `auth_user_id`
- `idx_chefs_stripe` on `stripe_account_id`

**RLS:** Chefs can read/update their own record only

---

### clients

**Purpose:** Customers (multi-tenant scoped by chef)

```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(tenant_id, email)
);
```

**Key Points:**
- Scoped to a single tenant via `tenant_id`
- `email` unique per tenant (not globally unique)
- `stripe_customer_id` for payment processing
- Created via invitation flow (see `client_invitations`)

**Indexes:**
- `idx_clients_auth_user` on `auth_user_id`
- `idx_clients_tenant` on `tenant_id`
- `idx_clients_stripe` on `stripe_customer_id`

**RLS:**
- Chefs can manage clients in their tenant
- Clients can read/update their own record

---

### user_roles

**Purpose:** Authoritative role assignment (single source of truth)

```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  entity_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
```

**Key Points:**
- **NEVER infer role from client state** - always query this table
- `entity_id` references `chefs.id` if `role='chef'`, `clients.id` if `role='client'`
- One role per user (enforced by `UNIQUE` on `auth_user_id`)
- No user-facing writes (service role only during signup)

**Indexes:**
- `idx_user_roles_auth_user` (UNIQUE) on `auth_user_id`
- `idx_user_roles_entity` on `entity_id`

**RLS:** Users can read their own role only

---

### client_invitations

**Purpose:** Invitation-based client signup tokens

```sql
CREATE TABLE client_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id)
);
```

**Key Points:**
- `token` is cryptographically random and single-use
- `expires_at` enforces time-limited invitations (e.g., 7 days)
- `used_at` marks invitation as consumed
- Public can read valid invitations by token (for signup flow)

**Indexes:**
- `idx_invitations_tenant` on `tenant_id`
- `idx_invitations_token` on `token`
- `idx_invitations_email` on `(tenant_id, email)`

**RLS:**
- Chefs can manage invitations for their tenant
- Public can read unexpired invitations by token

---

### events

**Purpose:** Service bookings (multi-tenant scoped)

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,

  -- Event details
  title TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  guest_count INTEGER NOT NULL CHECK (guest_count > 0),
  location TEXT NOT NULL,
  notes TEXT,

  -- Pricing (ALL IN MINOR UNITS - CENTS)
  total_amount_cents INTEGER NOT NULL CHECK (total_amount_cents >= 0),
  deposit_amount_cents INTEGER NOT NULL CHECK (deposit_amount_cents >= 0),
  deposit_required BOOLEAN DEFAULT true,

  -- Lifecycle (Finite state machine)
  status event_status NOT NULL DEFAULT 'draft',
  status_changed_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES auth.users(id),

  -- Audit trail
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_by UUID REFERENCES auth.users(id),

  -- Enforce client belongs to same tenant
  CONSTRAINT fk_client_tenant CHECK (
    (SELECT tenant_id FROM clients WHERE id = client_id) = tenant_id
  )
);
```

**Key Points:**
- **NEVER store balances** - compute from `event_financial_summary` view
- Amounts in cents (`total_amount_cents`, `deposit_amount_cents`)
- `status` follows finite state machine (see [EVENTS.md](EVENTS.md))
- `fk_client_tenant` CHECK prevents cross-tenant references
- `ON DELETE RESTRICT` for client prevents accidental data loss

**Indexes:**
- `idx_events_tenant` on `tenant_id`
- `idx_events_client` on `client_id`
- `idx_events_status` on `status`
- `idx_events_date` on `event_date`

**RLS:**
- Chefs can CRUD events in their tenant
- Clients can read/update events where they are the client

---

### event_transitions

**Purpose:** Immutable audit log of all event status changes

```sql
CREATE TABLE event_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  from_status event_status,
  to_status event_status NOT NULL,
  transitioned_by UUID REFERENCES auth.users(id),
  transitioned_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  metadata JSONB
);
```

**Key Points:**
- **Immutable** via triggers (no UPDATE/DELETE allowed)
- `from_status` can be NULL (initial transition to 'draft')
- `transitioned_by` is NULL for system transitions (webhooks)
- `metadata` can store reason, IP, source, etc.

**Indexes:**
- `idx_transitions_event` on `event_id`
- `idx_transitions_tenant` on `tenant_id`
- `idx_transitions_date` on `transitioned_at DESC`

**RLS:**
- Chefs can read transitions for their tenant
- Clients can read transitions for their events

---

### ledger_entries

**Purpose:** Append-only ledger - source of truth for all financial state

```sql
CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE RESTRICT,

  -- What happened
  entry_type ledger_entry_type NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',

  -- Context
  event_id UUID REFERENCES events(id) ON DELETE RESTRICT,
  client_id UUID REFERENCES clients(id) ON DELETE RESTRICT,

  -- Stripe reconciliation
  stripe_event_id TEXT UNIQUE,
  stripe_object_id TEXT,
  stripe_event_type TEXT,

  -- Metadata
  description TEXT NOT NULL,
  metadata JSONB,

  -- Audit (immutable)
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id)
);
```

**Key Points:**
- **Immutable** via triggers (System Law #3)
- `amount_cents` is positive for credit, negative for debit
- `stripe_event_id` UNIQUE enforces idempotency
- `created_by` is NULL for webhook entries
- `ON DELETE RESTRICT` prevents accidental data loss

**Indexes:**
- `idx_ledger_tenant` on `tenant_id`
- `idx_ledger_event` on `event_id`
- `idx_ledger_client` on `client_id`
- `idx_ledger_stripe_event` on `stripe_event_id` (partial, WHERE NOT NULL)
- `idx_ledger_created` on `created_at DESC`

**RLS:**
- Chefs can read ledger for their tenant
- Clients can read ledger for their events
- Inserts via service role (webhooks) or chef (adjustments)

---

### menus

**Purpose:** Menu templates (multi-tenant scoped)

```sql
CREATE TABLE menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_per_person_cents INTEGER CHECK (price_per_person_cents >= 0),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
```

**Key Points:**
- `price_per_person_cents` in minor units (cents)
- `is_active` allows soft archiving
- Simple V1 implementation (no multi-course, no ingredients)

**Indexes:**
- `idx_menus_tenant` on `tenant_id`
- `idx_menus_active` on `(tenant_id, is_active)` WHERE `is_active = true`

**RLS:**
- Chefs can CRUD menus in their tenant
- Clients can read active menus from their chef

---

### event_menus

**Purpose:** Many-to-many relationship between events and menus

```sql
CREATE TABLE event_menus (
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE RESTRICT,
  PRIMARY KEY (event_id, menu_id)
);
```

**Key Points:**
- Composite primary key on `(event_id, menu_id)`
- `ON DELETE CASCADE` for events (menu associations removed when event deleted)
- `ON DELETE RESTRICT` for menus (prevents deleting menus attached to events)

**Indexes:**
- `idx_event_menus_event` on `event_id`
- `idx_event_menus_menu` on `menu_id`

**RLS:**
- Chefs can manage associations for their events
- Clients can read associations for their events

---

## Views

### event_financial_summary

**Purpose:** Computed payment status (NEVER store balances on events table)

```sql
CREATE VIEW event_financial_summary AS
SELECT
  e.id AS event_id,
  e.tenant_id,
  e.total_amount_cents AS expected_total_cents,
  e.deposit_amount_cents AS expected_deposit_cents,
  COALESCE(SUM(CASE
    WHEN le.entry_type = 'charge_succeeded' THEN le.amount_cents
    WHEN le.entry_type = 'refund_succeeded' THEN le.amount_cents
    ELSE 0
  END), 0) AS collected_cents,
  COALESCE(SUM(...), 0) >= e.total_amount_cents AS is_fully_paid,
  COALESCE(SUM(...), 0) >= e.deposit_amount_cents AS is_deposit_paid
FROM events e
LEFT JOIN ledger_entries le ON le.event_id = e.id
GROUP BY e.id, e.tenant_id, e.total_amount_cents, e.deposit_amount_cents;
```

**Columns:**
- `event_id` - Event UUID
- `tenant_id` - Tenant UUID
- `expected_total_cents` - Total price from events table
- `expected_deposit_cents` - Deposit amount from events table
- `collected_cents` - Actual amount collected (from ledger)
- `is_fully_paid` - Boolean: collected >= total
- `is_deposit_paid` - Boolean: collected >= deposit

**Usage:**
```typescript
const { data } = await supabase
  .from('event_financial_summary')
  .select('*')
  .eq('event_id', eventId)
  .single();

if (data.is_deposit_paid) {
  // Proceed with event confirmation
}
```

---

## Helper Functions

### get_current_user_role()

```sql
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role AS $$
  SELECT role FROM user_roles WHERE auth_user_id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

**Returns:** `'chef' | 'client' | NULL`

**Usage:** RLS policies use this to enforce role-based access

---

### get_current_tenant_id()

```sql
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
  SELECT entity_id FROM user_roles
  WHERE auth_user_id = auth.uid() AND role = 'chef'
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

**Returns:** `chefs.id` if user is a chef, `NULL` otherwise

**Usage:** RLS policies use this to scope data to tenant

---

### get_current_client_id()

```sql
CREATE OR REPLACE FUNCTION get_current_client_id()
RETURNS UUID AS $$
  SELECT entity_id FROM user_roles
  WHERE auth_user_id = auth.uid() AND role = 'client'
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

**Returns:** `clients.id` if user is a client, `NULL` otherwise

**Usage:** RLS policies use this to scope data to client

---

## Triggers

### Immutability Triggers

**Purpose:** Enforce System Law #3 and #4 (immutable ledger and transitions)

```sql
-- Prevents UPDATE on ledger_entries
CREATE TRIGGER ledger_immutable_update
BEFORE UPDATE ON ledger_entries
FOR EACH ROW EXECUTE FUNCTION prevent_ledger_modification();

-- Prevents DELETE on ledger_entries
CREATE TRIGGER ledger_immutable_delete
BEFORE DELETE ON ledger_entries
FOR EACH ROW EXECUTE FUNCTION prevent_ledger_modification();

-- Prevents UPDATE on event_transitions
CREATE TRIGGER transitions_immutable_update
BEFORE UPDATE ON event_transitions
FOR EACH ROW EXECUTE FUNCTION prevent_transition_modification();

-- Prevents DELETE on event_transitions
CREATE TRIGGER transitions_immutable_delete
BEFORE DELETE ON event_transitions
FOR EACH ROW EXECUTE FUNCTION prevent_transition_modification();
```

**Behavior:** Raises exception with message explaining immutability

**Workaround:** Create new `adjustment` entry for ledger corrections

---

### Updated At Triggers

**Purpose:** Automatically update `updated_at` timestamp on modifications

```sql
CREATE TRIGGER chefs_updated_at
BEFORE UPDATE ON chefs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Similar for: clients, events, menus
```

**Behavior:** Sets `NEW.updated_at = now()` before UPDATE completes

---

## Indexes

### Performance-Critical Indexes

| Table | Index | Purpose |
|-------|-------|---------|
| chefs | `idx_chefs_auth_user` | Fast lookup by auth.users.id |
| clients | `idx_clients_tenant` | Tenant-scoped queries |
| events | `idx_events_tenant` | Tenant-scoped queries |
| events | `idx_events_status` | Filter by lifecycle status |
| events | `idx_events_date` | Sort by event date |
| ledger_entries | `idx_ledger_event` | Ledger-to-event joins |
| ledger_entries | `idx_ledger_stripe_event` | Idempotency checks |
| event_transitions | `idx_transitions_date` | Audit trail chronological order |

### Partial Indexes

```sql
-- Active menus only
CREATE INDEX idx_menus_active ON menus(tenant_id, is_active)
WHERE is_active = true;

-- Ledger entries with Stripe event IDs
CREATE INDEX idx_ledger_stripe_event ON ledger_entries(stripe_event_id)
WHERE stripe_event_id IS NOT NULL;
```

---

## Constraints

### CHECK Constraints

```sql
-- Events: guest_count must be positive
CHECK (guest_count > 0)

-- Events: amounts must be non-negative
CHECK (total_amount_cents >= 0)
CHECK (deposit_amount_cents >= 0)

-- Menus: price must be non-negative
CHECK (price_per_person_cents >= 0)

-- Events: client must belong to same tenant
CONSTRAINT fk_client_tenant CHECK (
  (SELECT tenant_id FROM clients WHERE id = client_id) = tenant_id
)
```

### UNIQUE Constraints

```sql
-- One role per user
CREATE UNIQUE INDEX idx_user_roles_auth_user ON user_roles(auth_user_id);

-- One Stripe event per ledger entry (idempotency)
CONSTRAINT ledger_entries_stripe_event_id_key UNIQUE(stripe_event_id);

-- Email unique per tenant
UNIQUE(tenant_id, email) ON clients;
```

---

## Migration Strategy

### Version Control

Migrations are stored in [`supabase/migrations/`](supabase/migrations/) directory:

```
supabase/migrations/
├── 20260213000001_initial_schema.sql
└── 20260213000002_rls_policies.sql
```

### Naming Convention

```
YYYYMMDDHHMMSS_description.sql
```

Example: `20260213120000_add_events_notes_column.sql`

### Migration Workflow

1. **Create Migration**
   ```bash
   supabase migration new add_feature_name
   ```

2. **Write SQL**
   - Use idempotent operations (`IF NOT EXISTS`)
   - Include rollback instructions in comments
   - Test locally first

3. **Verify Migration**
   ```bash
   npm run verify:migrations
   ```

4. **Deploy**
   ```bash
   supabase db push
   ```

### Rollback Strategy

- **Simple changes**: Write reverse migration
- **Data migrations**: Include rollback SQL in comments
- **Schema changes**: Test in staging first

---

## Type Generation

Generate TypeScript types from schema:

```bash
npx supabase gen types typescript --local > types/database.ts
```

See [TYPE_GENERATION.md](TYPE_GENERATION.md) for details.

---

## Related Documentation

- [RLS Policies](RLS_POLICIES.md) - Detailed RLS policy documentation
- [Security Model](SECURITY.md) - Defense-in-depth architecture
- [Ledger System](LEDGER.md) - Financial system documentation
- [Events Lifecycle](EVENTS.md) - Event state machine
- [Migration Guide](MIGRATION_GUIDE.md) - Database migration procedures

---

## Verification

Run verification scripts to ensure schema integrity:

```bash
# Verify all tables have RLS enabled
npm run verify:rls

# Verify immutability triggers work
npm run verify:immutability

# Verify migrations applied correctly
npm run verify:migrations
```

See [VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md) for details.

---

**Document Status**: ✅ Complete
**Governance**: Governed by [CHEFFLOW_V1_SCOPE_LOCK.md](CHEFFLOW_V1_SCOPE_LOCK.md)
**Schema Version**: 1.0 (Initial)
