# Public Layer - Table Access Matrix

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Access Matrix

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| inquiries | No | Yes | No | No |
| chefs | No | Yes | No | No |
| clients | No | Yes | No | No |
| user_roles | Yes* | Yes | No | No |
| client_invitations | Yes** | No | Yes*** | No |
| events | No | No | No | No |
| ledger_entries | No | No | No | No |
| menus | No | No | No | No |

*Via middleware (role resolution only)
**Via signup flow (token validation)
***Mark as used after signup

---

**Status**: LOCKED for V1.
