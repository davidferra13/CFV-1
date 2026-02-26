# Phase 2: Auth & Tenant Isolation Verification

**Date:** 2026-02-16
**Status:** Complete
**Scope:** Authentication, role resolution, tenant isolation, signup/login flows

---

## Summary

Phase 2 verified the three-layer defense system (middleware + server actions + RLS) against the new 23-table schema from Phase 1. The auth system was well-designed and required **minimal changes** — only one structural fix to decouple an import chain.

## What Changed

### 1. Created `lib/auth/invitations.ts` (new file)

Extracted `getInvitationByToken()` and `markInvitationUsed()` from `lib/clients/actions.ts` into a dedicated auth module.

**Why:** `lib/auth/actions.ts` imported these two functions from `lib/clients/actions.ts`. That file also contains `getClientsWithStats()` and `getClientWithStats()` which reference `events.total_amount_cents` — a column that doesn't exist in the new schema. This created a build-breaking import chain where auth compilation failed due to unrelated Phase 3 type errors in the same source file.

**Impact:** Auth module is now fully self-contained and compiles cleanly regardless of Phase 3+ progress.

### 2. Updated import in `lib/auth/actions.ts`

Changed:

```typescript
import { getInvitationByToken, markInvitationUsed } from '@/lib/clients/actions'
```

To:

```typescript
import { getInvitationByToken, markInvitationUsed } from '@/lib/auth/invitations'
```

### 3. Updated import in `app/auth/signup/page.tsx`

Same import path change for `getInvitationByToken`.

## What Did NOT Change (and why)

| File                   | Status         | Reason                                                                          |
| ---------------------- | -------------- | ------------------------------------------------------------------------------- |
| `lib/auth/actions.ts`  | Schema-correct | All `chefs`, `user_roles`, `clients` column references match new schema exactly |
| `lib/auth/get-user.ts` | Schema-correct | All `user_roles`, `clients` column references match                             |
| `middleware.ts`        | Schema-correct | `user_roles.role` and `user_roles.auth_user_id` unchanged                       |
| Layer 1 migration      | Schema-correct | RLS helper functions reference correct `user_roles` columns                     |

The new schema was designed to preserve the existing auth column conventions (`auth_user_id`, `entity_id`, `tenant_id`, `role`), so no column renames were needed.

## Audit Details

### Tables Referenced by Auth Code

| Table                | Columns Used                                                                            | All Match Schema |
| -------------------- | --------------------------------------------------------------------------------------- | :--------------: |
| `chefs`              | `id`, `auth_user_id`, `business_name`, `email`, `phone`                                 |       Yes        |
| `clients`            | `id`, `auth_user_id`, `tenant_id`, `full_name`, `email`, `phone`                        |       Yes        |
| `user_roles`         | `id`, `auth_user_id`, `role`, `entity_id`                                               |       Yes        |
| `client_invitations` | `id`, `tenant_id`, `email`, `full_name`, `token`, `expires_at`, `used_at`, `created_by` |       Yes        |

### RLS Helper Functions Verified

| Function                  | References                                                           | Status  |
| ------------------------- | -------------------------------------------------------------------- | :-----: |
| `get_current_user_role()` | `user_roles.role`, `user_roles.auth_user_id`                         | Correct |
| `get_current_tenant_id()` | `user_roles.entity_id`, `user_roles.auth_user_id`, `user_roles.role` | Correct |
| `get_current_client_id()` | `user_roles.entity_id`, `user_roles.auth_user_id`, `user_roles.role` | Correct |

### Three-Layer Defense Integrity

1. **Middleware** (Layer 1): Route protection using `user_roles.role` query. Blocks unauthenticated access and cross-role navigation. Verified correct.
2. **Server Actions** (Layer 2): `requireChef()`, `requireClient()`, `requireAuth()` all resolve role from `user_roles` table (never from URL/JWT/client state). Verified correct.
3. **RLS Policies** (Layer 3): All policies use `get_current_user_role()`, `get_current_tenant_id()`, `get_current_client_id()` helper functions, which query `user_roles` with correct column names. Verified correct.

## Build Results

- **Auth files:** 0 type errors
- **Total project:** 115 type errors (all in non-auth files — Phase 3/4/5 scope)
- **Error distribution:** `lib/workflow/` (14), `lib/menus/` (10), `lib/ledger/` (12), `lib/stripe/` (9), `lib/clients/` (7), `lib/events/` (5), `app/` components (55), `app/api/webhooks/` (2)

## Signup Flow Verification

### Chef Signup (verified correct)

1. Zod validates input
2. Service role creates auth user (`email_confirm: true`)
3. Inserts into `chefs`: `auth_user_id`, `business_name`, `email`, `phone`
4. Inserts into `user_roles`: `auth_user_id`, `role: 'chef'`, `entity_id: chef.id`
5. Rollback on failure: deletes chef record + auth user

### Client Signup (verified correct)

1. Zod validates input (requires `invitation_token`)
2. Looks up `client_invitations` by token (must be unused and not expired)
3. Verifies email matches invitation
4. Service role creates auth user
5. Inserts into `clients`: `auth_user_id`, `tenant_id` (from invitation), `full_name`, `email`, `phone`
6. Inserts into `user_roles`: `auth_user_id`, `role: 'client'`, `entity_id: client.id`
7. Marks invitation as used (`used_at` timestamp)
8. Rollback on failure: deletes client record + auth user

## Edge Cases Noted

- If `markInvitationUsed` fails after client/role creation succeeds, the client account exists but the invitation appears unused. Acceptable for V1 — the token-based lookup would still return the invitation, but the email uniqueness constraint on `clients(tenant_id, email)` would prevent a second signup with the same email.

## What's Next (Phase 3)

The 115 type errors are concentrated in:

- Server actions that reference old event/ledger/menu column names
- UI components that reference old column names
- Workflow actions that reference old column names

These will be addressed in Phase 3 (server action alignment) and Phase 5 (UI component alignment).
