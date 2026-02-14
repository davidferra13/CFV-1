# Local Development Setup

**Version**: 1.0
**Last Updated**: 2026-02-13
**Status**: Locked per CHEFFLOW_V1_SCOPE_LOCK.md

This document provides step-by-step instructions for setting up ChefFlow V1 for local development.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [Running Locally](#running-locally)
6. [Development Workflow](#development-workflow)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Install these tools before starting:

### Required

- **Node.js** 20+ ([download](https://nodejs.org/))
  ```bash
  node --version  # Should be v20.x or higher
  ```

- **npm** 10+ (comes with Node.js)
  ```bash
  npm --version  # Should be v10.x or higher
  ```

- **Git** ([download](https://git-scm.com/))
  ```bash
  git --version
  ```

### Recommended

- **VS Code** ([download](https://code.visualstudio.com/))
- **Supabase CLI** (optional, for local database)
  ```bash
  npm install -g supabase
  ```

---

## Initial Setup

### Step 1: Clone Repository

```bash
git clone https://github.com/your-org/chefflow-v1.git
cd chefflow-v1
```

### Step 2: Install Dependencies

```bash
npm install
```

This installs:
- Next.js 14
- Supabase client libraries
- Stripe SDK
- TypeScript
- Tailwind CSS

**Verify installation**:
```bash
npm list --depth=0
```

### Step 3: Verify File Structure

```
chefflow-v1/
├── app/              # Next.js App Router
│   ├── (chef)/      # Chef portal
│   ├── (client)/    # Client portal
│   ├── (public)/    # Public pages
│   ├── api/         # API routes
│   └── layout.tsx   # Root layout
├── lib/             # Server-side functions
│   ├── auth/        # Authentication
│   ├── events/      # Event logic
│   ├── ledger/      # Financial logic
│   └── supabase/    # DB clients
├── types/           # TypeScript types
├── supabase/        # Database migrations
│   └── migrations/
├── scripts/         # Verification scripts
├── middleware.ts    # Auth middleware
├── package.json
└── .env.local.example
```

---

## Environment Configuration

### Step 1: Create `.env.local`

```bash
cp .env.local.example .env.local
```

### Step 2: Get Supabase Credentials

**Option A: Use Existing Project**

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Select project
3. **Settings** → **API**
4. Copy:
   - Project URL
   - anon/public key
   - service_role key

**Option B: Create New Project**

1. Go to [database.new](https://database.new)
2. Create project (wait 2-3 min)
3. Follow Option A steps

### Step 3: Get Stripe Test Keys

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. Enable **Test mode** (toggle in sidebar)
3. **Developers** → **API keys**
4. Copy:
   - Publishable key: `pk_test_...`
   - Secret key: `sk_test_...`

### Step 4: Configure `.env.local`

Edit `.env.local`:

```bash
# Supabase (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Stripe (REQUIRED for payment testing)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_... # Get from Stripe CLI

# App (REQUIRED)
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

**Security**: Never commit `.env.local` to Git!

---

## Database Setup

### Step 1: Run Migrations

Open Supabase SQL Editor:

1. Go to your project → **SQL Editor**
2. Click **New Query**
3. Copy `supabase/migrations/20260213000001_initial_schema.sql`
4. Click **Run**
5. Verify success (green checkmark)

Repeat for `20260213000002_rls_policies.sql`.

### Step 2: Verify Schema

Run this query:

```sql
-- Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Expected output:
```
chefs
clients
client_invitations
event_menus
event_transitions
events
ledger_entries
menus
user_roles
```

### Step 3: Verify RLS Enabled

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

All should show `rowsecurity = true`.

### Step 4: Create Test Data (Optional)

```sql
-- Create test chef
INSERT INTO chefs (auth_user_id, business_name, email)
VALUES (
  gen_random_uuid(),
  'Test Chef Business',
  'chef@test.com'
);
```

**Better approach**: Use signup flow in app (creates proper records).

---

## Running Locally

### Step 1: Start Development Server

```bash
npm run dev
```

Output:
```
▲ Next.js 14.2.18
- Local:        http://localhost:3000
- Environments: .env.local

✓ Ready in 2.3s
```

### Step 2: Open Browser

Navigate to [http://localhost:3000](http://localhost:3000)

You should see the ChefFlow landing page.

### Step 3: Test Authentication

1. Go to `/auth/signup`
2. Create chef account
3. Verify redirect to `/chef/dashboard`
4. Check Supabase Auth → Users (should see new user)

---

## Development Workflow

### Hot Reload

Next.js watches for file changes:
- **App/lib changes**: Auto-refresh browser
- **Middleware changes**: Server restart required (stop/start dev)
- **Env var changes**: Restart dev server

### Code Structure

```typescript
// Server Component (default)
// app/(chef)/dashboard/page.tsx
import { requireChef } from '@/lib/auth/get-user'

export default async function Dashboard() {
  const chef = await requireChef()
  return <div>Welcome {chef.email}</div>
}

// Client Component (use 'use client')
'use client'
import { useState } from 'react'

export default function ClientComponent() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(count + 1)}>{count}</button>
}

// Server Action
'use server'
export async function createEvent(data) {
  // Server-side only code
}
```

### Database Queries

```typescript
// Server-side (recommended)
import { createServerClient } from '@/lib/supabase/server'

const supabase = createServerClient()
const { data } = await supabase.from('events').select('*')

// Client-side (read-only, RLS enforced)
import { createBrowserClient } from '@/lib/supabase/client'

const supabase = createBrowserClient()
const { data } = await supabase.from('events').select('*')
```

### Adding New Features

1. **Create branch**: `git checkout -b feature/new-thing`
2. **Implement**: Follow existing patterns
3. **Test locally**: Verify functionality
4. **Commit**: `git commit -m "Add new thing"`
5. **Push**: `git push origin feature/new-thing`
6. **Create PR**: Request review

---

## Testing

### Manual Testing

**Chef Flow**:
1. Signup as chef
2. Create client invitation
3. Create event
4. Propose event

**Client Flow**:
1. Use invitation link
2. Signup as client
3. View proposed event
4. Accept event
5. Complete payment (test card: `4242 4242 4242 4242`)

**Webhook Testing**:
```bash
# Terminal 1: Run app
npm run dev

# Terminal 2: Forward webhooks
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy webhook secret from output:
```
whsec_xxx
```

Add to `.env.local`:
```bash
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

Restart dev server.

### Automated Tests

```bash
# Run all tests (when implemented)
npm test

# Type checking
npm run type-check

# Linting
npm run lint
```

### Database Verification

Run verification scripts:

```bash
# From Supabase SQL Editor
-- Copy and run scripts from scripts/ folder
```

See [SCRIPTS_REFERENCE.md](./SCRIPTS_REFERENCE.md).

---

## Troubleshooting

### Port 3000 Already in Use

```bash
# Find process
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows

# Or use different port
npm run dev -- -p 3001
```

### Environment Variables Not Loading

1. Verify `.env.local` exists
2. Restart dev server
3. Check for typos in variable names
4. Don't use quotes around values:
   ```bash
   # Wrong
   NEXT_PUBLIC_APP_URL="http://localhost:3000"

   # Correct
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

### Database Connection Errors

1. Verify Supabase project is active
2. Check `NEXT_PUBLIC_SUPABASE_URL` is correct
3. Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
4. Check internet connection

### TypeScript Errors

```bash
# Regenerate types from database
npx supabase gen types typescript --project-id xxxxx > types/database.ts
```

Replace `xxxxx` with your project ref (from Supabase URL).

### Build Errors

```bash
# Clear cache
rm -rf .next node_modules
npm install
npm run dev
```

### Stripe Webhook Not Received

1. Verify Stripe CLI is running
2. Check `STRIPE_WEBHOOK_SECRET` matches CLI output
3. Restart dev server after adding secret
4. Check CLI terminal for errors

---

## Development Tools

### VS Code Extensions

Recommended:

- **ES7+ React/Redux/React-Native snippets**
- **Tailwind CSS IntelliSense**
- **Prettier - Code formatter**
- **ESLint**

### Browser Extensions

- **React Developer Tools**
- **Supabase DevTools** (Chrome)

### Useful Commands

```bash
# Check types
npm run type-check

# Lint code
npm run lint

# Format code (if Prettier configured)
npm run format

# Build for production (test locally)
npm run build
npm run start
```

---

## Next Steps

After local setup:

1. Read [CHEFFLOW_V1_SCOPE_LOCK.md](./CHEFFLOW_V1_SCOPE_LOCK.md) - Understand V1 scope
2. Review [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
3. Check [API_REFERENCE.md](./API_REFERENCE.md) - Available functions
4. See [CONTRIBUTING.md](./CONTRIBUTING.md) - Contribution guidelines

---

## Related Documentation

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment
- [ENV_VARIABLES.md](./ENV_VARIABLES.md) - Environment variables
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues
- [TESTING.md](./TESTING.md) - Testing strategy

---

**Last Updated**: 2026-02-13
**Maintained By**: ChefFlow V1 Team
