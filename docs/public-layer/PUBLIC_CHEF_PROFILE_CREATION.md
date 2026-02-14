# Public Layer - Chef Profile Creation

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Purpose

Defines the chef profile creation process during public signup.

---

## Trigger

User visits `/signup` (no token parameter) and submits chef signup form.

---

## Data Collected

### Required Fields
- **Email**: User enters (must be unique)
- **Password**: User enters (min 8 characters)
- **Business Name**: User enters

### Optional Fields
- **Phone**: User enters (optional)

---

## Database Operations

### 1. Create Auth User
```typescript
const { data: authData } = await supabase.auth.signUp({
  email: userEmail,
  password: userPassword,
});
```

---

### 2. Insert into `chefs` Table
```typescript
await adminClient.from('chefs').insert({
  auth_user_id: authData.user.id,
  business_name: userBusinessName,
  email: userEmail,
  phone: userPhone || null,
});
```

---

### 3. Insert into `user_roles` Table
```typescript
await adminClient.from('user_roles').insert({
  auth_user_id: authData.user.id,
  role: 'chef',
  entity_id: chefId,
});
```

---

## Profile Validation

- Email: Must be unique (enforced by DB constraint)
- Business name: Min 1 char, max 100 chars
- Phone: Max 20 chars, optional
- Password: Min 8 chars (Supabase enforced)

---

## Post-Creation Redirect

After successful profile creation, chef is redirected to `/dashboard` (chef portal).

---

**Status**: Chef profile creation rules are LOCKED for V1.
