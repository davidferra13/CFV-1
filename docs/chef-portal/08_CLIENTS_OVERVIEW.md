# Clients Overview (V1)

## Purpose

Client profiles are **tenant-scoped contact records** representing the people/entities that book events with a chef. They exist to enable relationship management, event linking, and invite-based authentication.

---

## Key Concepts

### Client Profile vs Auth User

- **Client Profile**: Contact record owned by chef (can exist before client creates account)
- **Auth User**: Supabase Auth identity (created when client signs up)
- **Linking**: Invite token connects profile to auth user

A client profile exists first; the auth user is created later when the client accepts an invite.

---

## Client Lifecycle

1. **Chef creates profile** (name, email, phone)
2. **Chef sends invite** (generates token, sends link)
3. **Client accepts invite** (creates auth account, links to profile)
4. **Client books events** (profile is linked to events)
5. **Chef maintains relationship** (adds private notes, tags)

---

## Core Operations

### Create Client Profile

```typescript
async function createClientProfile(data: {
  tenantId: string;
  fullName: string;
  email?: string;
  phone?: string;
}): Promise<ClientProfile> {
  // Check for duplicates
  const existing = await db.client_profiles.findFirst({
    where: {
      tenant_id: data.tenantId,
      email: data.email?.toLowerCase(),
      deleted_at: null,
    },
  });

  if (existing) {
    throw new Error('Client with this email already exists');
  }

  return await db.client_profiles.create({
    data: {
      tenant_id: data.tenantId,
      full_name: data.fullName,
      email: data.email?.toLowerCase(),
      phone: data.phone,
    },
  });
}
```

---

### Update Client Profile

```typescript
async function updateClientProfile(
  clientId: string,
  data: {
    fullName?: string;
    email?: string;
    phone?: string;
    chefPrivateNotes?: string;
  }
): Promise<ClientProfile> {
  return await db.client_profiles.update({
    where: { id: clientId },
    data: {
      full_name: data.fullName,
      email: data.email?.toLowerCase(),
      phone: data.phone,
      chef_private_notes: data.chefPrivateNotes,
      updated_at: new Date(),
    },
  });
}
```

---

### Get Client with Event History

```typescript
async function getClientWithHistory(clientId: string) {
  return await db.client_profiles.findUnique({
    where: { id: clientId },
    include: {
      events: {
        where: { deleted_at: null },
        orderBy: { start_ts: 'desc' },
        select: {
          id: true,
          event_type: true,
          start_ts: true,
          status: true,
          total_amount_cents: true,
        },
      },
    },
  });
}
```

---

## Tenant Isolation

All client queries are automatically scoped by RLS:

```sql
CREATE POLICY chef_access_clients ON client_profiles
FOR ALL
USING (
  tenant_id = current_tenant_id() AND
  deleted_at IS NULL
);
```

Chefs can only see their own clients, never cross-tenant.

---

## V1 Scope

### Included
- Basic CRUD operations
- Event history view
- Chef private notes
- Tags (simple text field)
- Soft delete

### Excluded
- Client merge/dedupe automation (manual only)
- Client segments/groups
- Client lifetime value calculations
- Client communication history (beyond events)

---

**End of Clients Overview**
