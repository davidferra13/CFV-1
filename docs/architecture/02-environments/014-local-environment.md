# Local Development Environment

**Document ID**: 014
**Version**: 1.0.0
**Status**: Active
**Last Updated**: 2026-02-14

---

## Purpose

Defines the authoritative configuration and setup requirements for local development environments in ChefFlow V1. This document ensures every developer has an identical, production-parity development setup.

---

## Required System Dependencies

### Node.js
- **Version**: 20.x LTS (minimum 20.11.0)
- **Package Manager**: npm 10.x (bundled with Node.js)
- **Verification**: `node --version` must output `v20.x.x`

### Git
- **Version**: 2.40+ recommended
- **Configuration Required**:
  ```bash
  git config --global core.autocrlf false
  git config --global core.eol lf
  ```

### Supabase CLI
- **Version**: 1.142.0+
- **Installation**: `npm install -g supabase`
- **Verification**: `supabase --version`
- **Purpose**: Local Supabase instance, migrations, type generation

### Docker Desktop
- **Version**: 24.0+
- **Required For**: Supabase local instance (PostgreSQL + Auth + Storage)
- **Verification**: `docker --version` and `docker compose version`
- **Requirement**: Docker must be running before `supabase start`

### VSCode (Recommended)
- **Version**: 1.85+
- **Required Extensions**:
  - `dbaeumer.vscode-eslint`
  - `esbenp.prettier-vscode`
  - `bradlc.vscode-tailwindcss`
  - `Supabase.supabase-vscode`
- **Configuration**: See `016-vscode-setup-contract.md`

---

## Environment Variables Contract

### Required File: `.env.local`

This file MUST exist at project root. Never commit to version control.

```bash
# Supabase Configuration (from supabase start output)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-from-supabase-start>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-from-supabase-start>

# Stripe Configuration (test mode keys)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### Critical Rules

1. **NEVER commit `.env.local`** - Listed in `.gitignore`
2. **Use test mode Stripe keys only** - Never use live keys locally
3. **Supabase keys change on each `supabase start`** - Must update after restart
4. **Service role key is SECRET** - Never expose to browser, never log

### Template File: `.env.local.example`

Committed to version control. Contains structure but no secrets:

```bash
# Copy this file to .env.local and fill in actual values
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

---

## Local Development Startup Sequence

### Step 1: Start Supabase Local Instance

```bash
cd c:/Users/david/Documents/CFv1
supabase start
```

**Expected Output**:
```
Started supabase local development setup.

         API URL: http://127.0.0.1:54321
     GraphQL URL: http://127.0.0.1:54321/graphql/v1
          DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323
    Inbucket URL: http://127.0.0.1:54324
      JWT secret: <jwt-secret>
        anon key: <anon-key>
service_role key: <service-role-key>
```

**Critical Actions**:
1. Copy `anon key` to `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`
2. Copy `service_role key` to `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
3. Verify Studio is accessible at `http://127.0.0.1:54323`

### Step 2: Run Database Migrations

```bash
supabase db reset
```

**Purpose**: Applies all migrations in `supabase/migrations/` and resets database to known state.

**Expected Output**:
```
Applying migration 20260213000001_initial_schema.sql...
Applying migration 20260213000002_rls_policies.sql...
Migrations applied successfully.
```

### Step 3: Generate TypeScript Types

```bash
npm run types:generate
```

**Configured in `package.json`**:
```json
{
  "scripts": {
    "types:generate": "supabase gen types typescript --local > types/database.ts"
  }
}
```

**Output**: `types/database.ts` updated with schema types.

### Step 4: Start Next.js Development Server

```bash
npm run dev
```

**Expected Output**:
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
- Network:      http://192.168.x.x:3000

✓ Ready in 2.5s
```

### Step 5: Verify Application

**Check**:
1. Navigate to `http://localhost:3000` - Should show public landing page
2. Navigate to `http://localhost:3000/dashboard` - Should redirect to signin
3. Check Network tab - No 500 errors, no CORS errors
4. Check Console - No Supabase connection errors

---

## Local Database Access

### Supabase Studio (Recommended)

- **URL**: `http://127.0.0.1:54323`
- **Features**:
  - Table editor (view/edit rows)
  - SQL editor (run queries)
  - Database logs
  - Auth users management

### Direct PostgreSQL Connection

- **Host**: `127.0.0.1`
- **Port**: `54322`
- **Database**: `postgres`
- **User**: `postgres`
- **Password**: `postgres`

**Connection String**:
```
postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

**Tools**:
- pgAdmin
- DBeaver
- Postico (macOS)
- `psql` CLI: `psql postgresql://postgres:postgres@127.0.0.1:54322/postgres`

---

## Local Stripe Webhook Testing

### Problem

Stripe webhooks require a publicly accessible URL. Localhost is not reachable by Stripe servers.

### Solution: Stripe CLI

**Installation**:
```bash
# Download from https://stripe.com/docs/stripe-cli
stripe login
```

**Forward Webhooks**:
```bash
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe
```

**Expected Output**:
```
Ready! Your webhook signing secret is whsec_... (^C to quit)
```

**Action**: Copy signing secret to `STRIPE_WEBHOOK_SECRET` in `.env.local`

**Testing**:
```bash
# Trigger a test payment_intent.succeeded event
stripe trigger payment_intent.succeeded
```

**Verification**:
- Check terminal output for webhook received
- Check Supabase logs for ledger entry creation
- Check Studio `ledger_entries` table for new row

---

## Local Email Testing

### Inbucket (Supabase Provided)

- **URL**: `http://127.0.0.1:54324`
- **Purpose**: Captures all emails sent by Supabase Auth (password reset, invitations)
- **Configuration**: Automatically configured by `supabase start`

**Test Flow**:
1. Trigger client invitation from chef portal
2. Open Inbucket URL
3. View email in inbox (no actual delivery)

**SMTP Details** (for external tools):
- **Host**: `127.0.0.1`
- **Port**: `54325`
- **Auth**: None required

---

## Local Seed Data (Optional)

### Purpose

Pre-populate database with test data for development.

### Implementation

**File**: `supabase/seed.sql`

```sql
-- Create test chef
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-000000000001', 'chef@test.com');

INSERT INTO chefs (id, auth_user_id, business_name, email) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Test Chef Co', 'chef@test.com');

INSERT INTO user_roles (auth_user_id, role, chef_id) VALUES
  ('00000000-0000-0000-0000-000000000001', 'chef', '00000000-0000-0000-0000-000000000001');

-- Create test client
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-000000000002', 'client@test.com');

INSERT INTO clients (id, auth_user_id, tenant_id, name, email) VALUES
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Test Client', 'client@test.com');

INSERT INTO user_roles (auth_user_id, role, client_id) VALUES
  ('00000000-0000-0000-0000-000000000002', 'client', '00000000-0000-0000-0000-000000000002');

-- Create test event
INSERT INTO events (id, tenant_id, client_id, title, event_date, guest_count, status) VALUES
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Wedding Dinner', '2026-06-15', 50, 'draft');
```

**Apply Seed Data**:
```bash
supabase db reset --with-seed
```

**Default Passwords**: All test users have password `password123` (set manually via Studio).

---

## Port Conflicts

### Supabase Ports

- `54321` - API
- `54322` - PostgreSQL
- `54323` - Studio
- `54324` - Inbucket
- `54325` - SMTP

### Next.js Port

- `3000` - Development server

**Conflict Resolution**:

If port is in use:
```bash
# Find process using port 3000
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

---

## File Watcher Limits (Linux/macOS)

### Problem

Next.js may exceed file watcher limits on Linux/macOS.

### Solution

```bash
# Temporary (session only)
ulimit -n 65536

# Permanent (add to ~/.bashrc or ~/.zshrc)
echo 'ulimit -n 65536' >> ~/.bashrc
```

---

## NPM Dependencies

### Installation

```bash
npm install
```

**Lock File**: `package-lock.json` is committed. Always use `npm install`, never `npm update` unless intentional.

### Clearing Cache (Troubleshooting)

```bash
rm -rf node_modules package-lock.json
npm install
```

---

## Hot Reload Verification

### Expected Behavior

1. Edit a file (e.g., `app/page.tsx`)
2. Save file
3. Browser auto-refreshes within 1-2 seconds
4. Changes visible immediately

### Troubleshooting

- **No refresh**: Check Next.js terminal for errors
- **Slow refresh**: Disable browser extensions, check CPU usage
- **Module not found**: Restart dev server (`Ctrl+C`, `npm run dev`)

---

## Environment Teardown

### Stop Next.js

```bash
Ctrl+C  # in terminal running npm run dev
```

### Stop Supabase

```bash
supabase stop
```

**Effect**: Containers stopped but data persists.

### Reset Database (Destructive)

```bash
supabase db reset
```

**Effect**: All data deleted, migrations re-applied.

### Complete Teardown

```bash
supabase stop --no-backup
docker system prune -a --volumes
```

**Effect**: All Supabase data, images, and volumes deleted. Full clean slate.

---

## Common Issues

### Issue: Supabase won't start

**Cause**: Docker not running or port conflict.

**Solution**:
1. Verify Docker Desktop is running
2. Check ports: `lsof -i :54321`
3. Stop conflicting process or change Supabase port in `config.toml`

### Issue: Database migrations fail

**Cause**: Migration syntax error or constraint violation.

**Solution**:
1. Check migration file SQL syntax
2. Run migration manually in Studio SQL editor
3. Fix errors, then `supabase db reset`

### Issue: Types not updating

**Cause**: Stale `database.ts` file.

**Solution**:
```bash
rm types/database.ts
npm run types:generate
```

Restart TypeScript server in VSCode: `Cmd+Shift+P` → "Restart TS Server"

### Issue: CORS errors in browser

**Cause**: Supabase URL mismatch.

**Solution**:
1. Verify `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` in `.env.local`
2. Never use `localhost` (use `127.0.0.1`)
3. Restart dev server

---

## Verification Checklist

Before considering local environment "ready":

- [ ] `node --version` outputs v20.x.x
- [ ] `supabase --version` outputs 1.142.0+
- [ ] `docker --version` works
- [ ] `.env.local` exists with all required variables
- [ ] `supabase start` completes successfully
- [ ] `supabase db reset` applies migrations without errors
- [ ] `npm run types:generate` creates `types/database.ts`
- [ ] `npm run dev` starts without errors
- [ ] `http://localhost:3000` loads in browser
- [ ] `http://127.0.0.1:54323` opens Supabase Studio
- [ ] `http://127.0.0.1:54324` opens Inbucket
- [ ] `stripe listen` forwards webhooks successfully

---

## References

- **Environment Variables**: `017-environment-variables-contract.md`
- **Secret Management**: `016-secret-management.md`
- **VSCode Setup**: See dev workflow documentation
- **Production Parity**: `019-local-prod-parity.md`
