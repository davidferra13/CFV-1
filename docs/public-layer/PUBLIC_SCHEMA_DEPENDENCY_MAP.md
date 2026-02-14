# Public Layer - Schema Dependency Map

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Dependencies

### Inquiry Submission
- Requires: `inquiries` table (optional - can log instead)

### Chef Signup
- Requires: `chefs`, `user_roles` tables
- References: `auth.users` (Supabase managed)

### Client Signup
- Requires: `clients`, `user_roles`, `client_invitations` tables
- References: `auth.users`, `chefs` (tenant_id FK)

---

## Migration Order

1. `auth.users` (Supabase managed)
2. `chefs`
3. `clients`
4. `user_roles`
5. `client_invitations`
6. `inquiries` (optional)

---

**Status**: LOCKED for V1.
