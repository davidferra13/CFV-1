# Public Layer - Client Profile Creation

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Purpose

Defines the client profile creation process during invitation-based signup.

---

## Trigger

Client visits `/signup?token=xxx` after receiving invitation from chef.

---

## Data Collected

### Required Fields
- **Email**: Pre-filled from invitation (read-only)
- **Password**: User enters (min 8 characters)
- **Full Name**: User enters

### Optional Fields
- **Phone**: User enters (optional)

---

## Database Operations

### 1. Create Auth User
```typescript
const { data: authData } = await supabase.auth.signUp({
  email: invitation.email,
  password: userPassword,
});
```

---

### 2. Insert into `clients` Table
```typescript
await adminClient.from('clients').insert({
  auth_user_id: authData.user.id,
  tenant_id: invitation.tenant_id,
  full_name: userFullName,
  email: invitation.email,
  phone: userPhone || null,
});
```

---

### 3. Insert into `user_roles` Table
```typescript
await adminClient.from('user_roles').insert({
  auth_user_id: authData.user.id,
  role: 'client',
  entity_id: clientId,
});
```

---

### 4. Mark Invitation as Used
```typescript
await adminClient.from('client_invitations').update({
  used_at: new Date().toISOString(),
}).eq('id', invitation.id);
```

---

## Profile Validation

- Email: Must match invitation email exactly
- Full name: Min 1 char, max 100 chars
- Phone: Max 20 chars, optional
- Password: Min 8 chars (Supabase enforced)

---

## Post-Creation Redirect

After successful profile creation, client is redirected to `/my-events` (client portal).

---

**Status**: Client profile creation rules are LOCKED for V1.
