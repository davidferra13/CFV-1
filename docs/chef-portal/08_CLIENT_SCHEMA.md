# Client Schema (V1)

## Table Definition

```sql
CREATE TABLE client_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id),

  -- Basic info
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,

  -- Chef-private data
  chef_private_notes TEXT,
  tags TEXT[], -- Simple array of tags

  -- Linking
  linked_user_id UUID REFERENCES auth.users(id),
  linked_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- Soft delete
);

CREATE INDEX idx_client_profiles_tenant ON client_profiles(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_client_profiles_email ON client_profiles(tenant_id, email) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_client_profiles_linked_user ON client_profiles(tenant_id, linked_user_id) WHERE linked_user_id IS NOT NULL AND deleted_at IS NULL;
```

---

## Field Definitions

### `id` (UUID)
Primary key, auto-generated.

### `tenant_id` (UUID)
Foreign key to `chefs(id)`. Required. Enforces tenant isolation.

### `full_name` (TEXT)
Client's full name. Required.

### `email` (TEXT)
Client's email address. Optional (can be added later). Normalized to lowercase.

### `phone` (TEXT)
Client's phone number. Optional. Stored as text (allows international formats).

### `chef_private_notes` (TEXT)
Chef's private notes about the client. **Never visible to client**. No character limit.

### `tags` (TEXT[])
Array of simple text tags for categorization (e.g., `['VIP', 'Corporate', 'Repeat']`).

### `linked_user_id` (UUID)
Foreign key to `auth.users(id)`. Set when client accepts invite and creates account.

### `linked_at` (TIMESTAMPTZ)
Timestamp when client was linked to auth user.

### `created_at`, `updated_at`, `deleted_at`
Standard timestamp fields.

---

## TypeScript Types

```typescript
export interface ClientProfile {
  id: string;
  tenant_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  chef_private_notes: string | null;
  tags: string[];
  linked_user_id: string | null;
  linked_at: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface CreateClientProfileInput {
  tenant_id: string;
  full_name: string;
  email?: string;
  phone?: string;
  chef_private_notes?: string;
  tags?: string[];
}
```

---

## Validation Rules

```typescript
function validateClientProfile(data: CreateClientProfileInput): void {
  if (!data.full_name || data.full_name.trim().length === 0) {
    throw new Error('Client name is required');
  }

  if (data.email && !isValidEmail(data.email)) {
    throw new Error('Invalid email format');
  }

  if (data.phone && data.phone.length > 20) {
    throw new Error('Phone number too long');
  }
}
```

---

## RLS Policies

```sql
ALTER TABLE client_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY chef_access ON client_profiles
FOR ALL
USING (tenant_id = current_tenant_id() AND deleted_at IS NULL);

CREATE POLICY client_read_own ON client_profiles
FOR SELECT
USING (
  linked_user_id = auth.uid() AND
  deleted_at IS NULL
);
```

**Note**: Clients can only SELECT their own profile, never chef_private_notes (handled by explicit projection).

---

**End of Client Schema**
