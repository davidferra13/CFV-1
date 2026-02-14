# Role Resolution Flow (V1)

## Flow Diagram

```
1. User authenticates → Supabase session created
   ↓
2. Middleware/Layout calls getUserRole(user.id)
   ↓
3. Query user_roles table:
   SELECT role, tenant_id FROM user_roles WHERE user_id = ?
   ↓
4. If found → Return { role, tenant_id }
   If not found → Return null
   ↓
5. Route guard checks role:
   - chef/chef_subaccount → Allow /chef/*
   - client → Allow /client/*
   - null → Deny (error page)
```

## Implementation

```typescript
type RoleData = { role: string; tenant_id: string } | null;

async function getUserRole(userId: string): Promise<RoleData> {
  const result = await db.user_roles.findFirst({
    where: { user_id: userId },
    select: { role: true, tenant_id: true }
  });

  return result || null;
}
```

## Caching

Role is resolved once per request and stored in context:

```typescript
// Middleware
const roleData = await getUserRole(user.id);
req.roleData = roleData;  // Cache for request lifecycle
```

## Error Handling

```typescript
const roleData = await getUserRole(user.id);

if (!roleData) {
  // No role assigned
  redirect('/error?code=no_role');
}

const { role, tenant_id } = roleData;
```
