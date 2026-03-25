# Phase 1: Auth Migration (Auth.js to Auth.js v5)

## What Changed

The entire authentication layer was migrated from Auth.js to Auth.js v5 (NextAuth) with direct PostgreSQL access via Drizzle ORM. The database itself is unchanged; only the API layer was replaced.

## Files Created

| File                                     | Purpose                                                                                |
| ---------------------------------------- | -------------------------------------------------------------------------------------- |
| `lib/auth/auth-config.ts`                | Auth.js v5 config: Credentials provider (bcrypt), Google OAuth provider, JWT callbacks |
| `lib/auth/index.ts`                      | Auth.js entry point: exports `auth()`, `handlers`, `signIn`, `signOut`                 |
| `app/api/auth/[...nextauth]/route.ts`    | Auth.js route handler (handles `/api/auth/*` endpoints)                                |
| `lib/email/templates/password-reset.tsx` | Password reset email template (React Email)                                            |

## Files Modified

| File                               | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `middleware.ts`                    | Replaced PostgreSQL `createServerClient` + `getUser()` with Auth.js `auth()` wrapper. No more per-request DB queries; role/tenant cached in JWT. Removed all pending cookie management (Auth.js handles its own cookies).                                                                                                                                                                                                                                                             |
| `lib/auth/get-user.ts`             | `getCurrentUser()` fast path unchanged (reads request headers). Fallback: Auth.js `auth()` + Drizzle queries instead of PostgreSQL. `requireChef()`: Drizzle query for suspension check. `requirePartner()`/`requireStaff()`: Auth.js session + Drizzle queries (no more admin client needed since no RLS).                                                                                                                                                                           |
| `lib/auth/actions.ts`              | `signUpChef()`: direct INSERT into `auth.users` via Drizzle + bcrypt hash. `signUpClient()`: same pattern. `signIn()`: Auth.js `signIn('credentials')`. `signOut()`: Auth.js `signOut()`. `requestPasswordReset()`: generates token, stores in `auth.users.recovery_token`, sends email. `updatePassword()`: supports both token-based recovery and authenticated session. `changePassword()`: bcrypt verify + update via Drizzle. `assignRole()`: Drizzle INSERT for profile + role. |
| `lib/auth/admin.ts`                | Uses `auth()` instead of `database.auth.getUser()`                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `lib/auth/admin-access.ts`         | Uses Drizzle query on `platform_admins` instead of query builder                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `lib/database/client.ts`           | `signInWithGoogle()` now uses Auth.js `signIn('google')`. Browser database client kept (deprecated) for Phase 2 query migration.                                                                                                                                                                                                                                                                                                                                                      |
| `app/auth/callback/route.ts`       | Simplified to redirect handler (Auth.js handles OAuth callbacks at `/api/auth/callback/*`)                                                                                                                                                                                                                                                                                                                                                                                            |
| `app/auth/reset-password/page.tsx` | Reads `?token=` from URL for recovery token flow                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `app/api/e2e/auth/route.ts`        | Creates Auth.js session token directly (bcrypt verify + JWT encode)                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `lib/chef/layout-data-cache.ts`    | Updated `hasPersistedAdminAccessForAuthUser` calls (signature changed)                                                                                                                                                                                                                                                                                                                                                                                                                |
| `.env.example`                     | Added `AUTH_SECRET`, `NEXTAUTH_URL`, `DATABASE_URL`, `GOOGLE_CLIENT_ID/SECRET`                                                                                                                                                                                                                                                                                                                                                                                                        |
| `.env.local`                       | Added `AUTH_SECRET` and `NEXTAUTH_URL`                                                                                                                                                                                                                                                                                                                                                                                                                                                |

## Architecture Decisions

### JWT Session Strategy

Auth.js uses JWT (not database sessions). Role, entityId, and tenantId are resolved at login time and cached in the JWT. This means:

- Zero DB queries per request in middleware (just JWT decode)
- Role changes require re-login or session update trigger
- Session data is self-contained in a signed cookie

### Password Compatibility

PostgreSQL stores bcrypt hashes in `auth.users.encrypted_password`. `bcryptjs.compare()` works directly against them. Zero migration needed for existing passwords. New passwords are hashed with `bcrypt.hash(password, 10)`.

### Password Reset Flow

Changed from the database's code-exchange flow to a simpler token-based flow:

1. `requestPasswordReset()` generates a random token, stores in `auth.users.recovery_token`
2. Email contains link to `/auth/reset-password?token=xxx`
3. `updatePassword(password, token)` verifies and clears the token

### Google OAuth

Auth.js handles the full OAuth flow at `/api/auth/callback/google`. Existing Google-only users are matched by email via `allowDangerousEmailAccountLinking: true`. New OAuth users without a role are redirected to `/auth/role-selection`.

### What Still Uses PostgreSQL

The browser database client (`lib/database/client.ts`) is kept but deprecated. It's used by 4 client components that make direct DB queries. These will be converted to server actions in Phase 2.

The server database client (`lib/database/server.ts`) is still imported by 580+ files for data queries. Phase 2 will convert these to Drizzle.

## New Environment Variables

| Variable               | Required         | Purpose                                                           |
| ---------------------- | ---------------- | ----------------------------------------------------------------- |
| `AUTH_SECRET`          | Yes              | Signs Auth.js JWT tokens. Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL`         | Yes              | Base URL for Auth.js callbacks (e.g. `http://localhost:3100`)     |
| `DATABASE_URL`         | Yes              | PostgreSQL connection string for Drizzle                          |
| `GOOGLE_CLIENT_ID`     | For Google OAuth | Google OAuth client ID                                            |
| `GOOGLE_CLIENT_SECRET` | For Google OAuth | Google OAuth client secret                                        |

## Testing Checklist

- [ ] Sign in with email/password (existing user)
- [ ] Sign up as new chef
- [ ] Sign up as new client (with and without invitation)
- [ ] Sign in with Google OAuth
- [ ] Password reset flow (request + reset)
- [ ] Change password from settings
- [ ] Sign out
- [ ] Middleware redirects (unauthenticated, wrong role)
- [ ] Admin access check
- [ ] Partner portal access
- [ ] Staff portal access
- [ ] E2E test auth endpoint
