# Production Deployment Guide

**Version**: 1.0
**Last Updated**: 2026-02-13
**Status**: Locked per CHEFFLOW_V1_SCOPE_LOCK.md

This document provides step-by-step instructions for deploying ChefFlow V1 to production using Vercel and Supabase.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Supabase Setup](#supabase-setup)
4. [Stripe Setup](#stripe-setup)
5. [Vercel Deployment](#vercel-deployment)
6. [Environment Variables](#environment-variables)
7. [Database Migrations](#database-migrations)
8. [Webhook Configuration](#webhook-configuration)
9. [Post-Deployment Verification](#post-deployment-verification)
10. [Rollback Procedure](#rollback-procedure)

---

## Overview

ChefFlow V1 production stack:

- **Frontend/Backend**: Vercel (Next.js 14 App Router)
- **Database/Auth**: Supabase (PostgreSQL + Auth)
- **Payments**: Stripe
- **Domain**: Custom domain (optional)

**Deployment Flow**:
```
GitHub → Vercel (auto-deploy) → Supabase (manual migrations)
```

---

## Prerequisites

Before deploying, ensure you have:

- [ ] GitHub repository with ChefFlow V1 code
- [ ] Vercel account (free tier OK for V1)
- [ ] Supabase account (free tier OK for V1)
- [ ] Stripe account (test + live mode)
- [ ] Domain name (optional but recommended)

---

## Supabase Setup

### Step 1: Create Supabase Project

1. Go to [database.new](https://database.new)
2. Click "New Project"
3. **Organization**: Select or create
4. **Project Name**: `chefflow-v1-prod`
5. **Database Password**: Generate strong password (save securely)
6. **Region**: Choose closest to users
7. **Pricing Plan**: Free (upgrade later if needed)
8. Click "Create new project"

**Wait 2-3 minutes** for provisioning.

### Step 2: Get Supabase Credentials

1. Go to **Settings** → **API**
2. Copy these values (save for later):
   ```
   Project URL: https://xxxxx.supabase.co
   anon/public key: eyJhbGc...
   service_role key: eyJhbGc... (KEEP SECRET!)
   ```

### Step 3: Configure Authentication

1. Go to **Authentication** → **Providers**
2. **Email Provider**:
   - Enable "Email"
   - Disable "Confirm email" (for V1 - enable in production if desired)
3. **Site URL**: `https://yourdomain.com` (update after Vercel deployment)
4. **Redirect URLs**: Add:
   - `https://yourdomain.com/auth/callback`
   - `http://localhost:3000/auth/callback` (for local dev)

### Step 4: Run Migrations

1. Go to **SQL Editor**
2. Click "New Query"
3. Copy contents of `supabase/migrations/20260213000001_initial_schema.sql`
4. Click "Run"
5. Verify success (no errors)
6. Repeat for `supabase/migrations/20260213000002_rls_policies.sql`

**Verify RLS enabled**:
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```
All tables should show `rowsecurity = true`.

### Step 5: Verify Schema

Run verification scripts from SQL Editor:

```sql
-- Check all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Expected tables:
-- chefs, clients, user_roles, client_invitations,
-- events, event_transitions, ledger_entries,
-- menus, event_menus
```

---

## Stripe Setup

### Step 1: Create Stripe Account

1. Go to [stripe.com](https://stripe.com)
2. Create account
3. Complete business verification (required for live mode)

### Step 2: Get API Keys

1. Go to **Developers** → **API keys**
2. **Test Mode** (for staging):
   - Publishable key: `pk_test_...`
   - Secret key: `sk_test_...`
3. **Live Mode** (for production):
   - Publishable key: `pk_live_...`
   - Secret key: `sk_live_...`

### Step 3: Create Webhook Endpoint

**IMPORTANT**: Do this AFTER Vercel deployment (need production URL).

1. Go to **Developers** → **Webhooks**
2. Click "Add endpoint"
3. **Endpoint URL**: `https://yourdomain.com/api/webhooks/stripe`
4. **Events to send**:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
5. Click "Add endpoint"
6. **Copy webhook signing secret**: `whsec_...`

---

## Vercel Deployment

### Step 1: Import GitHub Repository

1. Go to [vercel.com/new](https://vercel.com/new)
2. **Import Git Repository**
3. Select your ChefFlow repository
4. Click "Import"

### Step 2: Configure Project

1. **Framework Preset**: Next.js (auto-detected)
2. **Root Directory**: `./` (default)
3. **Build Command**: `npm run build` (default)
4. **Output Directory**: `.next` (default)

### Step 3: Add Environment Variables

Click "Environment Variables" and add:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_... (add after webhook created)

# App
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NODE_ENV=production
```

**For all environments**: Production, Preview, Development

### Step 4: Deploy

1. Click "Deploy"
2. Wait 2-3 minutes
3. Note deployment URL: `https://chefflow-v1.vercel.app`

### Step 5: Add Custom Domain (Optional)

1. Go to **Settings** → **Domains**
2. Add your domain: `yourdomain.com`
3. Follow DNS configuration instructions
4. Wait for DNS propagation (5-60 minutes)

### Step 6: Update Supabase Site URL

1. Go back to Supabase project
2. **Authentication** → **URL Configuration**
3. Update **Site URL** to: `https://yourdomain.com`
4. Add **Redirect URLs**:
   - `https://yourdomain.com/auth/callback`
   - `https://chefflow-v1.vercel.app/auth/callback` (if using both)

---

## Environment Variables

Complete reference in [ENV_VARIABLES.md](./ENV_VARIABLES.md).

### Production Checklist

- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role (SECRET!)
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- [ ] `STRIPE_SECRET_KEY` - Stripe secret key (SECRET!)
- [ ] `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret (SECRET!)
- [ ] `NEXT_PUBLIC_APP_URL` - Production URL
- [ ] `NODE_ENV=production`

### Updating Environment Variables

1. Go to Vercel project
2. **Settings** → **Environment Variables**
3. Edit variable
4. **Redeploy** (required for changes to take effect)

---

## Database Migrations

### Running New Migrations

When adding migrations after initial deployment:

1. **Create migration file**: `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
2. **Test locally**: Run migration on local Supabase instance
3. **Deploy to production**:
   - Go to Supabase SQL Editor
   - Copy migration SQL
   - Run in production database
4. **Verify**: Check tables/policies created

### Migration Best Practices

- **Always test locally first**
- **Use transactions**: Wrap in `BEGIN; ... COMMIT;`
- **Backup before migration**: Supabase auto-backups, but verify
- **Rollback plan**: Have `DOWN` migration ready
- **No breaking changes**: V1 scope locked, migrations are additive only

### Example Migration

```sql
-- New migration: Add notes to clients table
BEGIN;

ALTER TABLE clients ADD COLUMN notes TEXT;

COMMENT ON COLUMN clients.notes IS 'Internal notes about client';

COMMIT;
```

---

## Webhook Configuration

### Stripe Webhook Setup (Production)

1. **Create endpoint** (see Stripe Setup above)
2. **Copy signing secret**: `whsec_...`
3. **Add to Vercel env vars**:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```
4. **Redeploy Vercel** (required for env var to take effect)

### Testing Webhooks in Production

Use Stripe CLI to forward production webhooks to local:

```bash
stripe listen --forward-to https://yourdomain.com/api/webhooks/stripe --api-key sk_live_...
```

Or trigger test event:

```bash
stripe trigger payment_intent.succeeded --api-key sk_live_...
```

### Webhook Logs

View webhook delivery in:

1. **Stripe Dashboard** → **Developers** → **Webhooks** → **Endpoint** → **Logs**
2. **Vercel Dashboard** → **Deployments** → **Functions** → `/api/webhooks/stripe`

---

## Post-Deployment Verification

### Manual Smoke Tests

- [ ] **Landing page loads**: Visit `https://yourdomain.com`
- [ ] **Chef signup**: Create test chef account
- [ ] **Chef login**: Sign in and access `/chef/dashboard`
- [ ] **Create event**: Create test event
- [ ] **Invite client**: Send client invitation
- [ ] **Client signup**: Use invitation to create client account
- [ ] **Client login**: Sign in and access `/client/my-events`
- [ ] **Accept event**: Client accepts proposed event
- [ ] **Payment flow**: Complete test payment (use test card)
- [ ] **Webhook received**: Check Vercel logs for webhook
- [ ] **Event transitions**: Verify event moved to `paid` status
- [ ] **Ledger entry**: Check ledger for charge_succeeded entry

### Automated Verification

Run verification scripts (requires psql or Supabase SQL Editor):

```bash
# RLS verification
psql $DATABASE_URL -f scripts/verify-rls.sql

# Immutability verification
psql $DATABASE_URL -f scripts/verify-immutability.sql

# Migration verification
psql $DATABASE_URL -f scripts/verify-migrations.sql
```

See [SCRIPTS_REFERENCE.md](./SCRIPTS_REFERENCE.md) for details.

### Health Checks

Monitor these metrics:

- **Vercel Uptime**: Check deployment status
- **Supabase Health**: Check database connections
- **Stripe Webhooks**: Check delivery success rate
- **Error Logs**: Check Vercel function logs

---

## Rollback Procedure

### Rollback Vercel Deployment

1. Go to **Deployments**
2. Find previous working deployment
3. Click **⋮** → **Promote to Production**
4. Confirm promotion

**Rollback time**: ~30 seconds

### Rollback Database Migration

1. **If migration is destructive**: Restore from backup
   - Supabase → **Database** → **Backups**
   - Select backup before migration
   - Click "Restore"

2. **If migration is additive**: Run DOWN migration
   ```sql
   -- Example: Remove added column
   ALTER TABLE clients DROP COLUMN notes;
   ```

### Emergency Procedures

**Database unreachable**:
- Check Supabase status page
- Verify connection pooling limits
- Restart Vercel deployment

**Webhook failures**:
- Check Stripe dashboard for delivery errors
- Verify `STRIPE_WEBHOOK_SECRET` is correct
- Check Vercel function logs

**Authentication broken**:
- Verify Supabase Site URL matches production domain
- Check redirect URLs include production domain
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `ANON_KEY` are correct

---

## Production Checklist

Before announcing V1 launch:

### Security
- [ ] All RLS policies enabled
- [ ] Service role key not exposed in client code
- [ ] HTTPS enforced (Vercel does this by default)
- [ ] Stripe webhook signature verified
- [ ] SQL injection prevention (parameterized queries)

### Performance
- [ ] Database indexes on key columns (tenant_id, event_id)
- [ ] Images optimized (use Next.js Image component)
- [ ] No console.logs in production code

### Monitoring
- [ ] Vercel analytics enabled
- [ ] Error logging configured
- [ ] Stripe webhook monitoring

### Legal
- [ ] Terms of Service page
- [ ] Privacy Policy page
- [ ] Cookie consent (if applicable)

### Business
- [ ] Stripe account verified (live mode enabled)
- [ ] Payment flow tested with real card
- [ ] At least one chef onboarded
- [ ] Support email configured

---

## Continuous Deployment

### Automatic Deployments

Vercel auto-deploys on:
- **Push to `main`**: Production deployment
- **Push to other branches**: Preview deployment
- **Pull requests**: Preview deployment with unique URL

### Preview Deployments

Use for testing before production:

1. Create feature branch
2. Push to GitHub
3. Vercel creates preview deployment
4. Test on preview URL
5. Merge to main when ready

### Environment-Specific Configs

Use Vercel environment variables per environment:

- **Production**: Live Stripe keys, production Supabase
- **Preview**: Test Stripe keys, staging Supabase
- **Development**: Local or test credentials

---

## Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues.

Quick fixes:

**Build fails**:
- Check Vercel build logs
- Verify `package.json` has all dependencies
- Check TypeScript errors

**Database connection fails**:
- Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
- Check Supabase project is active
- Verify connection pooling limits

**Webhooks not received**:
- Check Stripe webhook logs
- Verify endpoint URL is correct
- Check `STRIPE_WEBHOOK_SECRET` matches

---

## Related Documentation

- [ENV_VARIABLES.md](./ENV_VARIABLES.md) - Environment variables reference
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Local development setup
- [SCRIPTS_REFERENCE.md](./SCRIPTS_REFERENCE.md) - Verification scripts
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues

---

**Last Updated**: 2026-02-13
**Maintained By**: ChefFlow V1 Team
