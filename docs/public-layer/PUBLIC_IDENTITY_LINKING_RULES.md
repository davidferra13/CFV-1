# Public Layer - Identity Linking Rules

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## V1 Decision: No Identity Linking

**Rule**: One auth.users record = one ChefFlow account. No linking of multiple auth providers.

### What is NOT Supported
- Social login (Google, Facebook OAuth)
- Linking multiple emails to one account
- Merging duplicate accounts

### Enforcement
- Email/password only (Supabase Auth default)
- UNIQUE constraint on `chefs.email` and `clients.email`

---

## V1.1 Consideration

If social login is added:
- Allow users to link Google account to existing email/password account
- Requires Supabase OAuth configuration

**Status**: Identity linking is NOT SUPPORTED in V1.
