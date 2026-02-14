# Client Profile Schema

## Document Identity
- **File**: `CLIENT_PROFILE_SCHEMA.md`
- **Category**: Identity & Linking (13/200)
- **Version**: ChefFlow V1
- **Status**: Implementation-Ready

---

## Purpose

This document defines the **complete schema** for client profiles in the ChefFlow system.

It specifies:
- All fields in the `clients` table
- Field types, constraints, and validation rules
- Mutable vs immutable fields
- Default values and computed fields
- Relationship to auth identity
- Privacy and visibility rules

---

## Table Schema

### `clients` Table

```sql
CREATE TABLE clients (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity linkage
  auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- Contact information
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,

  -- Preferences
  dietary_restrictions TEXT[],
  allergies TEXT[],
  favorite_dishes TEXT[],

  -- Payment integration
  stripe_customer_id TEXT UNIQUE,

  -- Soft delete
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,

  -- Audit trail
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Constraints
  CONSTRAINT clients_tenant_email_unique UNIQUE(tenant_id, email)
);
```

---

## Field Definitions

### Primary Identity

#### `id` (UUID)

**Type**: UUID
**Default**: `gen_random_uuid()`
**Immutable**: ✅ Yes
**Nullable**: ❌ No

**Purpose**: Primary key and client entity identifier

**Usage**:
```typescript
// Referenced as entity_id in user_roles
const role = {
  auth_user_id: 'aaa-111',
  role: 'client',
  entity_id: client.id, // ← This field
  tenant_id: 'ttt-999'
};
```

**Key Points**:
- Unique across all tenants (globally unique)
- Never changes once created
- Used as foreign key in `events.client_id`, `ledger_entries.client_id`

---

### Identity Linkage

#### `auth_user_id` (UUID)

**Type**: UUID
**References**: `auth.users(id)` ON DELETE CASCADE
**Unique**: ✅ Yes (globally)
**Immutable**: ✅ Yes
**Nullable**: ❌ No

**Purpose**: Links client profile to Supabase Auth identity

**Relationship**:
```
auth.users.id (canonical identity)
    ↓
clients.auth_user_id (profile link)
    ↓
user_roles.auth_user_id (role binding)
```

**Key Points**:
- One-to-one relationship with `auth.users`
- CASCADE delete: If auth user deleted, client profile also deleted
- Cannot change once set (identity anchor)

**Validation**:
```typescript
// Must match authenticated user
if (session.user.id !== client.auth_user_id) {
  throw new Error('Unauthorized');
}
```

---

#### `tenant_id` (UUID)

**Type**: UUID
**References**: `chefs(id)` ON DELETE CASCADE
**Immutable**: ✅ Yes
**Nullable**: ❌ No
**Indexed**: ✅ Yes

**Purpose**: Binds client to a specific chef (tenant isolation)

**Multi-Tenancy**:
- Client profile scoped to one tenant
- Same email can exist in different tenants (separate profiles)
- RLS policies filter by `tenant_id`

**Constraint**:
```sql
UNIQUE(tenant_id, email) -- Email unique per tenant
```

**Key Points**:
- Set during signup (from invitation)
- Cannot be changed (prevents cross-tenant profile migration)
- CASCADE delete: If chef deleted, client profiles also deleted

**V1 Limitation**: Client cannot switch between tenants in UI

---

### Contact Information

#### `email` (TEXT)

**Type**: TEXT
**Mutable**: ✅ Yes (with restrictions)
**Nullable**: ❌ No
**Unique**: Per tenant (via `UNIQUE(tenant_id, email)`)

**Purpose**: Client email address

**Relationship to Auth**:
```
auth.users.email (canonical)
    ↓
clients.email (denormalized for queries)
```

**Update Rules**:
1. Client requests email change via Supabase Auth
2. Auth sends verification to new email
3. Client clicks verification link
4. `auth.users.email` updated
5. Application updates `clients.email` to match

**Key Points**:
- Must match `auth.users.email` (enforced by application)
- Unique per tenant (not globally unique)
- Used for invitation matching
- Displayed in chef's client list

**Validation**:
```typescript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  throw new Error('Invalid email format');
}
```

---

#### `full_name` (TEXT)

**Type**: TEXT
**Mutable**: ✅ Yes
**Nullable**: ❌ No

**Purpose**: Client display name

**Usage**:
- Displayed in event details
- Used in email communications
- Shown in chef's client list
- Pre-filled from invitation or signup form

**Validation**:
```typescript
if (full_name.trim().length < 2) {
  throw new Error('Name must be at least 2 characters');
}

if (full_name.length > 100) {
  throw new Error('Name must be less than 100 characters');
}
```

**Key Points**:
- Client can update anytime
- No format restrictions (supports international names)
- Required field (cannot be null or empty)

---

#### `phone` (TEXT)

**Type**: TEXT
**Mutable**: ✅ Yes
**Nullable**: ✅ Yes (optional)

**Purpose**: Client phone number

**Format**: Freeform text (no validation in V1)

**Usage**:
- Optional contact method
- Displayed to chef only
- Not used for authentication in V1

**V2 Considerations**:
- Phone verification
- SMS notifications
- E.164 format validation

**Key Points**:
- No format enforcement (supports international formats)
- Can be null (not required)
- Client can update anytime

---

### Preferences

#### `dietary_restrictions` (TEXT[])

**Type**: TEXT[] (array of strings)
**Mutable**: ✅ Yes
**Nullable**: ✅ Yes
**Default**: `[]` (empty array)

**Purpose**: Client dietary preferences

**Examples**:
```typescript
dietary_restrictions: [
  'Vegetarian',
  'Gluten-Free',
  'Dairy-Free',
  'Kosher',
  'Halal'
]
```

**Usage**:
- Displayed to chef when planning menus
- Client can self-manage via portal
- No predefined list (freeform in V1)

**Validation**:
```typescript
if (dietary_restrictions.length > 10) {
  throw new Error('Maximum 10 dietary restrictions');
}

dietary_restrictions.forEach(item => {
  if (item.length > 50) {
    throw new Error('Each restriction must be less than 50 characters');
  }
});
```

---

#### `allergies` (TEXT[])

**Type**: TEXT[] (array of strings)
**Mutable**: ✅ Yes
**Nullable**: ✅ Yes
**Default**: `[]` (empty array)

**Purpose**: Client allergy information

**Examples**:
```typescript
allergies: [
  'Peanuts',
  'Tree nuts',
  'Shellfish',
  'Eggs',
  'Soy'
]
```

**Usage**:
- Critical safety information
- Displayed prominently to chef
- Client can self-manage via portal
- No predefined list (freeform in V1)

**Validation**:
```typescript
if (allergies.length > 15) {
  throw new Error('Maximum 15 allergies');
}

allergies.forEach(item => {
  if (item.length > 50) {
    throw new Error('Each allergy must be less than 50 characters');
  }
});
```

**Key Points**:
- Safety-critical field
- Chef should acknowledge/confirm before event
- V2: Consider warning/confirmation UI

---

#### `favorite_dishes` (TEXT[])

**Type**: TEXT[] (array of strings)
**Mutable**: ✅ Yes
**Nullable**: ✅ Yes
**Default**: `[]` (empty array)

**Purpose**: Client favorite dishes/cuisines

**Examples**:
```typescript
favorite_dishes: [
  'Pasta Carbonara',
  'Grilled Salmon',
  'Thai Green Curry',
  'Chocolate Mousse'
]
```

**Usage**:
- Help chef personalize menus
- Optional preference information
- Client can self-manage via portal

**Validation**:
```typescript
if (favorite_dishes.length > 20) {
  throw new Error('Maximum 20 favorite dishes');
}

favorite_dishes.forEach(item => {
  if (item.length > 100) {
    throw new Error('Each dish must be less than 100 characters');
  }
});
```

---

### Payment Integration

#### `stripe_customer_id` (TEXT)

**Type**: TEXT
**Mutable**: ✅ Yes (system-managed)
**Nullable**: ✅ Yes
**Unique**: ✅ Yes (globally)

**Purpose**: Stripe Customer ID for payment processing

**Format**: `cus_...` (Stripe customer ID)

**Lifecycle**:
```
1. Client signs up → stripe_customer_id = NULL
2. Client makes first payment → Stripe Customer created
3. Stripe returns customer ID → stored in stripe_customer_id
4. Future payments → reuse same customer ID
```

**Key Points**:
- Set automatically on first payment
- Not editable by client or chef
- Used to retrieve payment methods, invoices, etc.
- Unique globally (one Stripe customer per client profile)

**Creation**:
```typescript
const customer = await stripe.customers.create({
  email: client.email,
  name: client.full_name,
  metadata: {
    client_id: client.id,
    tenant_id: client.tenant_id
  }
});

await supabase
  .from('clients')
  .update({ stripe_customer_id: customer.id })
  .eq('id', client.id);
```

---

### Soft Delete

#### `is_deleted` (BOOLEAN)

**Type**: BOOLEAN
**Default**: `false`
**Mutable**: ✅ Yes (system-managed)
**Nullable**: ❌ No

**Purpose**: Soft delete flag for client profiles

**Usage**:
```sql
-- Hide deleted clients in queries
SELECT * FROM clients
WHERE is_deleted = false;
```

**Deletion Flow**:
```typescript
// Client requests account deletion
await supabase
  .from('clients')
  .update({
    is_deleted: true,
    deleted_at: new Date().toISOString()
  })
  .eq('id', client_id);
```

**Key Points**:
- NEVER hard delete client profiles (preserve audit trail)
- RLS policies exclude `is_deleted = true`
- Deleted profiles not visible in UI
- Auth account remains (Supabase-managed)

**V1 Limitation**: No self-service account deletion (must contact chef)

---

#### `deleted_at` (TIMESTAMPTZ)

**Type**: TIMESTAMPTZ
**Mutable**: ✅ Yes (set with `is_deleted`)
**Nullable**: ✅ Yes

**Purpose**: Timestamp when client profile was soft-deleted

**Usage**:
- Audit trail for deletions
- Compliance (GDPR right to erasure)
- Potential account recovery window

**Key Points**:
- Set automatically when `is_deleted = true`
- NULL for active profiles
- Immutable once set (cannot un-delete in V1)

---

### Audit Trail

#### `created_at` (TIMESTAMPTZ)

**Type**: TIMESTAMPTZ
**Default**: `now()`
**Immutable**: ✅ Yes
**Nullable**: ❌ No

**Purpose**: Timestamp when client profile was created

**Usage**:
- Audit trail
- "Member since" display
- Sorting clients by signup date

---

#### `updated_at` (TIMESTAMPTZ)

**Type**: TIMESTAMPTZ
**Default**: `now()`
**Mutable**: ✅ Yes (auto-updated)
**Nullable**: ❌ No

**Purpose**: Timestamp when client profile was last updated

**Behavior**:
```sql
-- Automatically updated via trigger
CREATE TRIGGER clients_updated_at
BEFORE UPDATE ON clients
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Usage**:
- Track profile freshness
- Audit trail for changes

---

## Constraints

### Unique Constraints

#### Global Uniqueness

```sql
-- One auth user per client profile
UNIQUE(auth_user_id)

-- One Stripe customer per client profile
UNIQUE(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL
```

#### Tenant-Scoped Uniqueness

```sql
-- Email unique per tenant (not globally)
UNIQUE(tenant_id, email)
```

**What This Means**:
- `client@example.com` can have profile in Tenant A
- `client@example.com` can have separate profile in Tenant B
- Same `auth_user_id` links both profiles (multi-tenant client)

---

### Foreign Key Constraints

```sql
-- Client linked to auth identity (cascade delete)
FOREIGN KEY (auth_user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE

-- Client scoped to tenant (cascade delete)
FOREIGN KEY (tenant_id)
  REFERENCES chefs(id)
  ON DELETE CASCADE
```

**Cascade Behavior**:
- If auth user deleted → client profile auto-deleted
- If chef deleted → all their client profiles auto-deleted

---

### Check Constraints

None in V1 (validation handled at application layer)

**V2 Considerations**:
- Email format validation
- Phone format validation
- Array length limits

---

## Indexes

### Performance Indexes

```sql
-- Fast lookup by auth user
CREATE INDEX idx_clients_auth_user
ON clients(auth_user_id);

-- Tenant-scoped queries
CREATE INDEX idx_clients_tenant
ON clients(tenant_id);

-- Stripe customer lookups
CREATE INDEX idx_clients_stripe
ON clients(stripe_customer_id)
WHERE stripe_customer_id IS NOT NULL;

-- Active clients only
CREATE INDEX idx_clients_active
ON clients(tenant_id, created_at DESC)
WHERE is_deleted = false;
```

---

## Immutability Rules

### What Cannot Change

| Field | Reason |
|-------|--------|
| `id` | Primary key (database-enforced) |
| `auth_user_id` | Identity anchor (application-enforced) |
| `tenant_id` | Tenant binding (application-enforced) |
| `created_at` | Audit trail (database-enforced) |

### What Can Change

| Field | How | Who |
|-------|-----|-----|
| `email` | Via Supabase Auth + sync | Client |
| `full_name` | Direct update | Client |
| `phone` | Direct update | Client |
| `dietary_restrictions` | Direct update | Client |
| `allergies` | Direct update | Client |
| `favorite_dishes` | Direct update | Client |
| `stripe_customer_id` | First payment | System |
| `is_deleted` | Soft delete | Chef/Admin |
| `deleted_at` | Soft delete | System |
| `updated_at` | Auto-trigger | System |

---

## TypeScript Type Definition

```typescript
// Generated from database schema
export type Client = {
  id: string; // UUID
  auth_user_id: string; // UUID
  tenant_id: string; // UUID
  email: string;
  full_name: string;
  phone: string | null;
  dietary_restrictions: string[];
  allergies: string[];
  favorite_dishes: string[];
  stripe_customer_id: string | null;
  is_deleted: boolean;
  deleted_at: string | null; // ISO 8601
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
};

// Client-safe projection (excludes sensitive fields)
export type ClientPublicProfile = Pick<
  Client,
  | 'id'
  | 'full_name'
  | 'dietary_restrictions'
  | 'allergies'
  | 'favorite_dishes'
>;

// Update payload (only mutable fields)
export type ClientUpdatePayload = Partial<
  Pick<
    Client,
    | 'full_name'
    | 'phone'
    | 'dietary_restrictions'
    | 'allergies'
    | 'favorite_dishes'
  >
>;
```

---

## RLS Policies

### Chef Access

```sql
-- Chefs can SELECT clients in their tenant
CREATE POLICY clients_chef_select ON clients
  FOR SELECT USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );

-- Chefs can INSERT clients in their tenant (via invitation)
CREATE POLICY clients_chef_insert ON clients
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );

-- Chefs can UPDATE clients in their tenant
CREATE POLICY clients_chef_update ON clients
  FOR UPDATE USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );

-- Chefs can soft-DELETE clients in their tenant
CREATE POLICY clients_chef_delete ON clients
  FOR UPDATE USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
```

---

### Client Access

```sql
-- Clients can SELECT their own profile
CREATE POLICY clients_client_select ON clients
  FOR SELECT USING (
    get_current_user_role() = 'client' AND
    id = get_current_client_id()
  );

-- Clients can UPDATE their own profile (limited fields)
CREATE POLICY clients_client_update ON clients
  FOR UPDATE USING (
    get_current_user_role() = 'client' AND
    id = get_current_client_id()
  );
```

**Note**: Application layer enforces which fields clients can update (not RLS)

---

## Validation Rules

### Server-Side Validation

```typescript
// Zod schema for client profile updates
import { z } from 'zod';

export const clientUpdateSchema = z.object({
  full_name: z.string().min(2).max(100).optional(),
  phone: z.string().max(20).nullable().optional(),
  dietary_restrictions: z.array(z.string().max(50)).max(10).optional(),
  allergies: z.array(z.string().max(50)).max(15).optional(),
  favorite_dishes: z.array(z.string().max(100)).max(20).optional()
});

// Usage in server action
export async function updateClientProfile(
  clientId: string,
  data: unknown
) {
  const parsed = clientUpdateSchema.parse(data);

  const { error } = await supabase
    .from('clients')
    .update(parsed)
    .eq('id', clientId);

  if (error) throw error;
}
```

---

## Privacy & Visibility

### Chef-Visible Fields

Chefs can see all fields:
- ✅ Contact information (email, phone)
- ✅ Preferences (dietary restrictions, allergies, favorites)
- ✅ Payment status (via Stripe customer ID)
- ✅ Event history

### Client-Visible Fields (Own Profile)

Clients can see all their own fields.

### Client-Visible Fields (Other Clients)

❌ Clients **cannot** see other clients' profiles (RLS enforced)

---

## Related Documents

- [CLIENT_IDENTITY_MODEL.md](./CLIENT_IDENTITY_MODEL.md)
- [CLIENT_TABLE_CLIENTS.md](./CLIENT_TABLE_CLIENTS.md)
- [CLIENT_USER_ROLES_MAPPING.md](./CLIENT_USER_ROLES_MAPPING.md)
- [CLIENT_ACCOUNT_LINKING_RULES.md](./CLIENT_ACCOUNT_LINKING_RULES.md)
- [DATABASE.md](../../DATABASE.md)

---

**Document Status**: ✅ Implementation-Ready
**ChefFlow Version**: V1
**Last Updated**: 2026-02-14
