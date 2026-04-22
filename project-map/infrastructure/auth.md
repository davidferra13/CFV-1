# Authentication and Authorization

**What:** Who can access what. Credentials, OAuth, sessions, roles, tenant isolation.

**Key files:** `lib/auth/auth-config.ts`, `app/api/auth/[...nextauth]/route.ts`, `lib/auth/server-action-inventory.ts`
**Status:** DONE

## What's Here

- Auth.js v5 with credentials + Google OAuth providers
- JWT-based sessions with server-side validation
- Role-based access: `requireChef()`, `requireClient()`, `requireAdmin()`, `requireAuth()`
- Tenant isolation: every query filtered by `user.tenantId`
- `user_roles` table is single source of truth for role assignment
- RBAC scaffolded (gradual annotation rollout)
- Middleware strips spoofed internal headers, then re-stamps `x-request-id` and `x-pathname` so request-scoped observability and shell governance can classify the active route without trusting client input
- `readRequestAuthContext()` still fails closed unless middleware also stamped `x-cf-authenticated=1`, so public pathname visibility does not create an auth bypass
- Realtime access is guarded by channel validation, local prod now proves the auth path with 403s instead of silent subscription success on blocked channels
- `scanServerActionMutationInventory()` is the canonical privileged-mutation policy contract, classifying page-facing server actions as `standard`, `sensitive`, or `critical` from existing file and table ownership, then surfacing missing early-auth or observability controls as machine-readable violations instead of relying on a second registry
- The shared mutation inventory now feeds both unit coverage and system-integrity coverage, so known admin, finance, contract, and client mutation files fail automation if they stop resolving through the privilege classifier

## Open Items

- Realtime subscriptions still generate repeated 403 noise in local prod when blocked channels retry, cleanup is operational polish rather than an auth gap
- The policy layer is classification and drift protection only today, strong confirmation, step-up auth, and per-action approval UX still need to be enforced on top of the shared contract
