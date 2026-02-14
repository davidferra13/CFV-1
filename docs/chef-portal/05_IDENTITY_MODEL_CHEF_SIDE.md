# Identity Model - Chef Side (V1)

## Chef Identity Components

1. **Auth User** (`auth.users`) - Supabase auth record
2. **User Role** (`user_roles`) - Role and tenant mapping
3. **Chef Profile** (`chefs`) - Business entity

## Chef Signup Flow

1. User signs up via Supabase Auth (email/password)
2. `auth.users` record created (user_id)
3. Onboarding form captures business details
4. System creates `chefs` record (tenant_id = chefs.id)
5. System creates `user_roles` entry:
   - user_id = auth user
   - role = 'chef'
   - tenant_id = chefs.id
6. Chef redirected to Chef Portal

## Chef Profile Schema

```typescript
type Chef = {
  id: string;  // UUID, also tenant_id
  business_name: string;
  email: string;
  phone?: string;
  timezone: string;
  stripe_account_id?: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
};
```

## Role Resolution

```typescript
const roleData = await db.user_roles.findFirst({
  where: { user_id: authUser.id },
  select: { role: true, tenant_id: true }
});
```
