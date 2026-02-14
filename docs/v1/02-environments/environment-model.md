# Environment Model

**Document ID**: 013
**Version**: 1.0
**Status**: LOCKED
**Last Updated**: 2026-02-14

## Purpose

This document defines the complete environment architecture for ChefFlow V1, including all supported environments, their purpose, and separation rules.

## Environments Overview

ChefFlow V1 supports **3 environments**:

1. **Local** - Developer workstation
2. **Staging** (optional) - Pre-production testing
3. **Production** - Live application serving real users

Each environment is **isolated** (separate database, separate Stripe account, separate Vercel project).

---

## Environment Separation Matrix

| Aspect | Local | Staging (Optional) | Production |
|--------|-------|---------------------|------------|
| **Database** | Local Supabase (Docker) | Supabase Staging Project | Supabase Production Project |
| **Supabase URL** | `http://localhost:54321` | `https://xxx-staging.supabase.co` | `https://xxx.supabase.co` |
| **Stripe** | Test Mode | Test Mode | Live Mode |
| **Hosting** | `localhost:3000` | Vercel Preview | Vercel Production |
| **Domain** | N/A | `staging.chefflow.app` (optional) | `chefflow.app` |
| **Git Branch** | Any | `develop` or PR branches | `main` |
| **Data** | Fake/seed data | Fake/test data | Real user data |
| **Secrets** | `.env.local` | Vercel env vars (staging) | Vercel env vars (production) |

---

## Environment Purposes

### Local (Development)

**Purpose**: Rapid development, testing, debugging on developer workstation

**Characteristics**:
- **Fastest iteration**: No deploy step (hot reload)
- **Full control**: Can reset database, modify schema freely
- **Isolated**: Changes don't affect other developers or users
- **No cost**: Free Supabase local instance, no Vercel hosting cost

**Use Cases**:
- Feature development
- Bug fixes
- Schema migrations (test before applying to staging/production)
- Verification script testing

**NOT For**:
- Shared testing (use staging)
- Demos to stakeholders (use staging)
- Real payments (Stripe test mode only)

---

### Staging (Optional, Recommended)

**Purpose**: Pre-production testing, stakeholder demos, QA

**Characteristics**:
- **Near-production**: Mirrors production config (same env vars structure, same build process)
- **Shared**: Accessible by team, stakeholders
- **Stable**: Not reset frequently (unlike local)
- **Low cost**: Vercel Preview deployment (free on Hobby plan)

**Use Cases**:
- QA testing before production deploy
- Stakeholder demos
- Integration testing (Stripe test webhooks, etc.)
- Performance testing (under realistic load)

**NOT For**:
- Real user traffic (use production)
- Real payments (Stripe test mode only)

**Note**: Staging is OPTIONAL in V1. For solo developer or small team, local → production is acceptable.

---

### Production

**Purpose**: Serve real users, process real payments

**Characteristics**:
- **Live**: Real users, real data, real money
- **Monitored**: Logs, error tracking, uptime monitoring
- **Stable**: No experimental changes, all changes tested in staging first
- **High availability**: Vercel global edge network

**Use Cases**:
- Serve real chef accounts
- Process real Stripe payments
- Production data (permanent, backed up)

**NOT For**:
- Untested features (test in staging first)
- Experiments (use staging or local)
- Seed data / fake accounts (real users only)

---

## Environment Isolation

### Database Isolation

**Rule**: Each environment has separate Supabase project

**Local**:
- Database: `postgresql://postgres:postgres@localhost:54322/postgres`
- Started via: `supabase start` (Docker)
- Data: Ephemeral (reset on `supabase db reset`)

**Staging**:
- Database: Supabase cloud (separate project ID)
- Connection: Supabase Pooler (connection pooling)
- Data: Persistent (manual resets only)

**Production**:
- Database: Supabase cloud (separate project ID)
- Connection: Supabase Pooler
- Data: Permanent (NEVER reset, backups enabled)

**Guarantee**: No cross-environment data leakage (impossible to query production DB from local environment)

---

### Stripe Isolation

**Rule**: Each environment uses separate Stripe mode or account

**Local**:
- Stripe Mode: **Test Mode**
- Secret Key: `sk_test_...`
- Publishable Key: `pk_test_...`
- Webhooks: Local (via Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`)

**Staging**:
- Stripe Mode: **Test Mode**
- Secret Key: `sk_test_...` (different key than local)
- Publishable Key: `pk_test_...`
- Webhooks: `https://staging.chefflow.app/api/webhooks/stripe`

**Production**:
- Stripe Mode: **Live Mode**
- Secret Key: `sk_live_...`
- Publishable Key: `pk_live_...`
- Webhooks: `https://chefflow.app/api/webhooks/stripe`

**Guarantee**: Test payments never mix with live payments

---

### Hosting Isolation

**Local**:
- URL: `http://localhost:3000`
- Hosting: Developer workstation (Next.js dev server)
- HTTPS: NO (HTTP only, localhost)

**Staging**:
- URL: Vercel Preview URL (`https://chefflow-git-develop-yourteam.vercel.app`)
- OR Custom domain: `https://staging.chefflow.app` (optional)
- Hosting: Vercel (preview deployment)
- HTTPS: YES (Vercel-managed certificate)

**Production**:
- URL: `https://chefflow.app` (custom domain)
- Hosting: Vercel (production deployment)
- HTTPS: YES (Vercel-managed certificate)

---

## Environment Selection

### How Environment is Determined

**At Build Time**:
- Next.js reads environment variables from:
  1. `.env.local` (local development, gitignored)
  2. Vercel environment variables (staging, production)

**Environment Detection** (implicit):
- `NEXT_PUBLIC_SUPABASE_URL` indicates which Supabase project
- `STRIPE_SECRET_KEY` indicates which Stripe mode (test vs live)

**NO Explicit Environment Variable** (like `NODE_ENV=production`):
- Next.js sets `NODE_ENV` automatically:
  - `development` (local dev server)
  - `production` (Vercel build)

---

## Environment Variables per Environment

### Local (`.env.local`)

```bash
# Supabase (local Docker instance)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi... # From supabase start output
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi... # From supabase start output

# Stripe (test mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51xxx
STRIPE_SECRET_KEY=sk_test_51xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx # From stripe listen output
```

**Source**: `.env.local` file (developer creates manually, not committed to git)

---

### Staging (Vercel Environment Variables)

**Set in Vercel Dashboard**:
- Project Settings → Environment Variables → Select "Preview" environment

```bash
# Supabase (staging project)
NEXT_PUBLIC_SUPABASE_URL=https://xxxstaging.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Stripe (test mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51xxx
STRIPE_SECRET_KEY=sk_test_51xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx # From Stripe dashboard (staging endpoint)
```

**Source**: Vercel dashboard (encrypted, managed by Vercel)

---

### Production (Vercel Environment Variables)

**Set in Vercel Dashboard**:
- Project Settings → Environment Variables → Select "Production" environment

```bash
# Supabase (production project)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Stripe (LIVE mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_51xxx
STRIPE_SECRET_KEY=sk_live_51xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx # From Stripe dashboard (production endpoint)
```

**Source**: Vercel dashboard (encrypted, managed by Vercel)

---

## Deployment Flow

### Local → Staging

**Trigger**: Push to `develop` branch (or create PR)

**Steps**:
1. Developer commits code to `develop` branch
2. Push to GitHub
3. Vercel detects push → creates preview deployment
4. Vercel builds app with **Preview environment variables**
5. Deployment accessible at Vercel preview URL

**Testing**: Team tests on preview URL before merging to `main`

---

### Staging → Production

**Trigger**: Merge PR to `main` branch

**Steps**:
1. PR reviewed and approved
2. Merge to `main` branch
3. Vercel detects merge → creates production deployment
4. Vercel builds app with **Production environment variables**
5. Deployment goes live at `https://chefflow.app`

**Rollback**: Vercel allows instant rollback to previous deployment (no code changes needed)

---

## Data Migration Between Environments

### Local → Staging

**Schema Migration**:
1. Develop migration locally: `supabase migration new feature_name`
2. Test migration: `supabase db reset` (applies all migrations)
3. Commit migration file to git
4. Push to GitHub → Vercel deploys to staging
5. Apply migration to staging: `supabase db push --db-url <staging-url>`

**Data Migration**:
- **NO automatic data sync** (local data is fake, staging data is test data)
- Manually insert seed data if needed

---

### Staging → Production

**Schema Migration**:
1. Test migration in staging
2. Verify no errors, no data loss
3. Merge to `main` → Vercel deploys to production
4. Apply migration to production: `supabase db push --db-url <production-url>`

**Data Migration**:
- **NO data migration** (production data already exists)
- Schema changes are forward-compatible (add columns with defaults, not remove columns)

---

## Environment Parity

**Goal**: Local, staging, and production should be as similar as possible

**What MUST Match**:
- Next.js version
- Node.js version (Vercel uses Node 18 by default)
- Dependency versions (`package.json` locked via `package-lock.json`)
- Database schema (applied migrations match across environments)
- Environment variable structure (same keys, different values)

**What CAN Differ**:
- Data (local has seed data, production has real data)
- Stripe mode (test vs live)
- Database size (local is small, production may be large)

**Tool**: Docker ensures local Supabase matches cloud Supabase (both PostgreSQL 15)

---

## Environment Switching (Developer)

### Switch Local → Local (Different Project)

**NO switching needed** (each project is separate)

**Example**:
- Project A: `cd ~/projects/chefflow-a && npm run dev`
- Project B: `cd ~/projects/chefflow-b && npm run dev`

---

### Switch Local → Staging (Testing)

**NO switching needed** (open browser to staging URL)

**Example**:
- Local: `http://localhost:3000`
- Staging: `https://chefflow-git-develop-yourteam.vercel.app`

---

### Switch Supabase Project (Local)

**Update `.env.local`**:
```bash
# Before (local Supabase)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321

# After (staging Supabase, for debugging)
NEXT_PUBLIC_SUPABASE_URL=https://xxxstaging.supabase.co
```

**Restart dev server**: `npm run dev`

**Use Case**: Debug issue in staging database from local environment

---

## Cost Breakdown by Environment

### Local

**Cost**: $0
- Supabase: Free (local Docker)
- Vercel: Not used (local dev server)
- Stripe: Free (test mode)

---

### Staging

**Cost**: $0 - $20/month
- Supabase: Free tier (500 MB DB, 5 GB bandwidth)
- Vercel: Free (Hobby plan includes unlimited preview deployments)
- Stripe: Free (test mode)

**Upgrade Trigger**: If staging exceeds free tier limits

---

### Production

**Cost**: $25 - $100/month (estimated)
- Supabase: $25/month (Pro plan, recommended for production)
- Vercel: Free (Hobby) or $20/month (Pro, for better performance)
- Stripe: Transaction fees (2.9% + $0.30 per transaction)

**Note**: Costs scale with usage (more users, more DB storage, more bandwidth)

---

## Environment Cleanup

### Local

**When**: Daily (after development session)
**How**: `supabase stop` (stops Docker containers)
**Data Loss**: NO (data persists in Docker volumes)

**Full Reset**:
```bash
supabase db reset # Resets database to initial state (re-runs migrations)
```

---

### Staging

**When**: Rarely (before major release, if needed)
**How**: Manual SQL or Supabase dashboard → SQL editor
**Data Loss**: YES (only do if intentional)

**Example**:
```sql
-- Delete all events (staging cleanup)
DELETE FROM events;
DELETE FROM ledger_entries;
DELETE FROM event_transitions;
```

---

### Production

**When**: NEVER (production data is permanent)
**How**: N/A
**Data Loss**: N/A

**Exception**: If user requests account deletion (GDPR compliance), delete tenant data only

---

**Authority**: This environment model is binding for V1. Changes to environment structure require scope unlock.
