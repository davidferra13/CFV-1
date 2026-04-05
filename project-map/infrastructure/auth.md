# Authentication and Authorization

**What:** Who can access what. Credentials, OAuth, sessions, roles, tenant isolation.

**Key files:** `lib/auth/auth-config.ts`, `app/api/auth/[...nextauth]/route.ts`
**Status:** DONE

## What's Here

- Auth.js v5 with credentials + Google OAuth providers
- JWT-based sessions with server-side validation
- Role-based access: `requireChef()`, `requireClient()`, `requireAdmin()`, `requireAuth()`
- Tenant isolation: every query filtered by `user.tenantId`
- `user_roles` table is single source of truth for role assignment
- RBAC scaffolded (gradual annotation rollout)

## Open Items

- SSE real-time bus has ZERO authentication (critical security gap)
