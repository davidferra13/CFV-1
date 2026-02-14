# Public Layer - Database Touchpoints

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Tables Accessed

### Write Operations
1. **inquiries**: INSERT (form submission)
2. **chefs**: INSERT (chef signup)
3. **clients**: INSERT (client signup via invitation)
4. **user_roles**: INSERT (signup)
5. **client_invitations**: UPDATE (mark as used)

### Read Operations
1. **user_roles**: SELECT (role resolution in middleware)
2. **client_invitations**: SELECT (validate invitation token)

---

## Tables NOT Accessed

- `events` (chef/client portals only)
- `ledger_entries` (payment webhooks only)
- `menus` (chef portal only)
- `event_transitions` (system-generated)

---

**Status**: LOCKED for V1.
