# Build: VS Code Agent Account

## Problem

The Claude Code agent (running in VS Code) could not sign in to the running ChefFlow app. This meant it couldn't test UI flows, debug auth issues, or verify features end-to-end. The user had an active sign-in/sign-out bug that the agent couldn't troubleshoot because it had no credentials.

## Solution

Created a persistent agent account (`agent@chefflow.test`) with full chef + admin access that the VS Code agent can use for programmatic testing and debugging.

## What Was Created

### `scripts/setup-agent-account.ts`

Idempotent bootstrap script that creates/updates the agent account in Supabase. Follows the exact patterns from `tests/helpers/e2e-seed.ts`:

1. **ensureAuthUser** — lists existing users, creates if missing, updates password if exists
2. **upsertChef** — creates chef record with `business_name: 'AGENT - VS Code Claude'`
3. **ensureChefRole** — upserts `user_roles` row (role: chef, entity_id: chef.id)
4. **ensureChefPreferences** — upserts `chef_preferences` (network_discoverable: false)
5. **Writes `.auth/agent.json`** — stores email, password, authUserId, chefId, tenantId

Run with: `npm run agent:setup`

### Environment Changes

**`.env.local`:**

- Added `AGENT_EMAIL=agent@chefflow.test`
- Added `AGENT_PASSWORD=AgentChefFlow!2026`
- Appended `agent@chefflow.test` to `ADMIN_EMAILS` for admin panel access

**`.env.local.example`:**

- Documented the new vars (commented out)

**`package.json`:**

- Added `"agent:setup"` npm script

## How It Works

### First-Time Setup

```bash
npm run agent:setup
```

Creates the account in Supabase and writes `.auth/agent.json`.

### Agent Signs In (Playwright)

Uses existing `/api/e2e/auth` endpoint (gated by `SUPABASE_E2E_ALLOW_REMOTE=true`):

```
POST http://localhost:3100/api/e2e/auth
{ "email": "agent@chefflow.test", "password": "AgentChefFlow!2026" }
```

### Agent Signs In (Direct API)

Reads credentials from `.env.local` or `.auth/agent.json`, uses Supabase JS client `signInWithPassword()`.

## Design Decisions

| Decision                    | Rationale                                                               |
| --------------------------- | ----------------------------------------------------------------------- |
| Separate from E2E accounts  | E2E accounts are date-stamped and ephemeral; agent account is permanent |
| Reuse `/api/e2e/auth`       | Already exists, bypasses rate limiter, sets proper cookies              |
| Credentials in `.env.local` | Already gitignored, canonical secrets location                          |
| Admin via `ADMIN_EMAILS`    | Existing pattern, no DB migration needed                                |
| `@chefflow.test` domain     | Consistent with E2E namespace, clearly non-production                   |
| Idempotent script           | Safe to re-run — uses upsert/check-first patterns                       |

## Files Changed

| File                             | Change                                                        |
| -------------------------------- | ------------------------------------------------------------- |
| `scripts/setup-agent-account.ts` | **New** — bootstrap script                                    |
| `.env.local`                     | Added `AGENT_EMAIL`, `AGENT_PASSWORD`; updated `ADMIN_EMAILS` |
| `.env.local.example`             | Documented new vars                                           |
| `package.json`                   | Added `agent:setup` script                                    |
| `docs/build-agent-account.md`    | **New** — this doc                                            |

## Security Notes

- Uses `@chefflow.test` domain — clearly non-production
- Credentials only in `.env.local` (gitignored) and `.auth/agent.json` (gitignored)
- `/api/e2e/auth` requires `SUPABASE_E2E_ALLOW_REMOTE=true` — must never be set in production
- `AGENT -` prefix in business name makes the account visually distinct
- `network_discoverable: false` prevents it from appearing in public chef listings
