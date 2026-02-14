# Staging Environment

**Document ID**: 015
**Version**: 1.0.0
**Status**: Active
**Last Updated**: 2026-02-14

---

## Purpose

Defines the staging environment configuration, deployment process, and testing requirements for ChefFlow V1. Staging is a production-like environment used for pre-release validation and integration testing.

---

## Environment Overview

### Purpose of Staging

1. **Pre-Production Testing**: Validate changes before production deployment
2. **Integration Testing**: Test Stripe webhooks with test mode in real environment
3. **Client Demos**: Show features to stakeholders without production risk
4. **Migration Validation**: Test database migrations before production
5. **Performance Testing**: Load testing without affecting real users

### Not a Purpose of Staging

- ❌ Long-term feature branches (staging deploys from `main` branch only)
- ❌ Permanent test data (staging DB can be reset anytime)
- ❌ Production data storage (never sync production data to staging)
- ❌ User acceptance testing with real clients (use production with test accounts)

---

## Infrastructure

### Hosting Platform

**Vercel Project**:
- **Project Name**: `chefflow-staging`
- **Framework**: Next.js 14 (auto-detected)
- **Build Command**: `next build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`
- **Environment**: Production (Vercel setting, despite being "staging")

### Database

**Supabase Project**:
- **Project Name**: `chefflow-staging`
- **Region**: `us-east-1` (same as production for consistency)
- **Plan**: Free tier acceptable for V1
- **Postgres Version**: 15.x

### Payment Processor

**Stripe Account**:
- **Mode**: Test Mode ONLY
- **API Keys**: `pk_test_...` and `sk_test_...`
- **Webhooks**: Points to staging Vercel URL

---

## Environment Variables

### Vercel Environment Variables

**Location**: Vercel Dashboard → Project Settings → Environment Variables

**All variables MUST be set with Environment = "Production"** (Vercel's production, our staging):

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-from-supabase-dashboard>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-from-supabase-dashboard>

# Stripe Configuration (TEST MODE ONLY)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_... (from Stripe webhook endpoint)

# Application Configuration
NEXT_PUBLIC_APP_URL=https://chefflow-staging.vercel.app
NODE_ENV=production
```

### Critical Rules

1. **NEVER use production Stripe keys** - Staging MUST use test mode
2. **NEVER sync production database** - Staging DB is isolated
3. **Service role key is secret** - Set as "Encrypted" in Vercel
4. **APP_URL must match Vercel domain** - Used for OAuth redirects

---

## Deployment Process

### Automatic Deployment

**Trigger**: Push to `main` branch

**Flow**:
```
git push origin main
  ↓
GitHub triggers Vercel webhook
  ↓
Vercel clones repository
  ↓
npm install
  ↓
next build
  ↓
Deploy to staging URL
  ↓
Health check (automatic)
  ↓
Deployment complete
```

**Duration**: ~2-3 minutes for typical build

### Manual Deployment

**Trigger**: Vercel Dashboard → Deployments → Redeploy

**Use Cases**:
- Rollback to previous deployment
- Re-deploy after environment variable change
- Force rebuild without code change

### Preview Deployments

**Trigger**: Push to any branch except `main`

**URL**: `https://chefflow-[branch-name]-[hash].vercel.app`

**Purpose**: Test changes in isolation before merging to `main`

**Limitation**: Preview deployments share staging environment variables (cannot have different config per branch)

---

## Database Management

### Running Migrations

**Method 1: Supabase CLI (Recommended)**

```bash
# Link to staging project (one-time)
supabase link --project-ref [PROJECT_ID]

# Push local migrations to staging
supabase db push
```

**Method 2: Supabase Dashboard**

1. Open Supabase Dashboard → SQL Editor
2. Copy migration file contents
3. Execute SQL
4. Verify in Table Editor

### Migration Verification

Before pushing to staging:

1. **Local Test**: `supabase db reset` must succeed locally
2. **Backup**: Download staging DB backup from Supabase Dashboard
3. **Push**: `supabase db push`
4. **Verify**: Check Supabase Dashboard → Table Editor for schema changes
5. **Test**: Run application smoke tests

### Database Reset (Destructive)

**Use Case**: Reset staging to clean state

**Steps**:
1. Supabase Dashboard → Settings → Database → Reset Database
2. Re-run all migrations: `supabase db push`
3. Optionally apply seed data
4. Redeploy application (to clear any cached state)

**Warning**: Deletes ALL data. Never do this in production.

---

## Stripe Integration

### Webhook Configuration

**Stripe Dashboard**:
1. Developers → Webhooks → Add Endpoint
2. **Endpoint URL**: `https://chefflow-staging.vercel.app/api/webhooks/stripe`
3. **Events**: Select:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
4. **API Version**: Latest (auto-selected)
5. **Signing Secret**: Copy to `STRIPE_WEBHOOK_SECRET` in Vercel

### Testing Payments

**Test Cards**:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Auth Required: `4000 0025 0000 3155`

**Test Flow**:
1. Create event as chef in staging
2. Invite client (use real email you can access)
3. Client accepts and pays with test card
4. Verify webhook received (Stripe Dashboard → Webhooks → Events)
5. Verify ledger entry created (Supabase Studio)
6. Verify event transitioned to `paid` status

### Webhook Logs

**Stripe Dashboard**: Developers → Webhooks → [Endpoint] → Events

**Check For**:
- 200 OK responses (success)
- 500 errors (application bug)
- Timeout errors (slow webhook handler)

---

## Testing Checklist

### Pre-Deployment Testing (Local)

Before merging to `main`:

- [ ] All ESLint errors resolved
- [ ] TypeScript compiles with no errors (`npm run build`)
- [ ] RLS verification script passes
- [ ] Migration verification script passes
- [ ] Local smoke test passes (create event → pay → confirm)

### Post-Deployment Testing (Staging)

After deployment completes:

- [ ] Application loads without errors
- [ ] Chef can sign up and sign in
- [ ] Client invitation email sends (check Inbucket or real email)
- [ ] Client can accept invitation and sign up
- [ ] Chef can create event
- [ ] Client can view and accept event
- [ ] Payment flow works (test card)
- [ ] Webhook creates ledger entry
- [ ] Event transitions to `paid` status
- [ ] RLS policies prevent cross-tenant access (manual test)

### Security Testing

- [ ] Chef A cannot see Chef B's events (use two test accounts)
- [ ] Client cannot access chef portal (direct URL attempt)
- [ ] Chef cannot access client portal (direct URL attempt)
- [ ] Service role key not exposed in browser (check Network tab)
- [ ] CORS configured correctly (no CORS errors in console)

---

## Monitoring

### Vercel Logs

**Access**: Vercel Dashboard → Deployments → [Latest] → Runtime Logs

**Monitor For**:
- 500 Internal Server Errors
- Unhandled promise rejections
- Database connection errors
- Stripe API errors

**Retention**: 24 hours on free tier, 7 days on Pro tier

### Supabase Logs

**Access**: Supabase Dashboard → Logs

**Monitor For**:
- RLS policy violations (permission denied errors)
- Database query errors
- Connection pool exhaustion
- Slow queries (> 1 second)

**Retention**: 7 days

### Error Tracking (V1 Limitation)

**Current**: `console.error()` only (no Sentry integration)

**Post-Deployment**: Check Vercel Runtime Logs for errors

---

## Performance Testing

### Load Testing (Optional)

**Tool**: `artillery` (not included in V1, manual testing acceptable)

**Test Scenarios**:
1. 10 concurrent users creating events
2. 50 concurrent users viewing event list
3. 5 concurrent payment webhooks

**Acceptance Criteria**:
- p95 response time < 1 second for page loads
- p95 response time < 500ms for API routes
- No 500 errors under normal load
- Database connection pool does not exhaust

### Database Performance

**Check**:
- Query performance in Supabase Dashboard → Database → Query Performance
- Connection count (should not exceed 10 on free tier)
- Missing indexes (run `EXPLAIN ANALYZE` on slow queries)

---

## Rollback Procedure

### Scenario: Bad Deployment

**Symptoms**:
- Application crashes on load
- 500 errors in Vercel logs
- Database connection failures

**Steps**:

1. **Immediate Rollback**:
   - Vercel Dashboard → Deployments
   - Find previous working deployment
   - Click "..." → Promote to Production

2. **Investigate Issue**:
   - Check Vercel Runtime Logs
   - Check Supabase Logs
   - Identify breaking change

3. **Fix and Redeploy**:
   - Create fix in local environment
   - Test locally
   - Push to `main` (triggers new deployment)
   - Verify fix in staging

### Scenario: Bad Migration

**Symptoms**:
- Schema changes broke application
- RLS policies too restrictive
- Data integrity issues

**Steps**:

1. **Rollback Migration**:
   ```bash
   # Create reverse migration
   supabase migration new rollback_[original_migration_name]
   ```

   **Example**:
   ```sql
   -- Rollback: Add column user_type to events
   ALTER TABLE events DROP COLUMN user_type;
   ```

2. **Push Rollback**:
   ```bash
   supabase db push
   ```

3. **Verify**:
   - Check Supabase Table Editor
   - Test application

4. **Fix Original Migration**:
   - Edit original migration file
   - Test locally with `supabase db reset`
   - Create new migration with correct changes

---

## Access Control

### Who Has Access

**Vercel Project**:
- Owner: david@example.com (replace with actual)
- Team Members: (add as needed)

**Supabase Project**:
- Owner: Same as Vercel
- Database Password: Stored in 1Password (or equivalent)

**Stripe Account**:
- Owner: Same as Vercel
- Team Members: View-only access for QA testers

### Credential Storage

**Never in Code**:
- ❌ No hardcoded API keys
- ❌ No credentials in `.env.example`
- ❌ No secrets in git history

**Storage Location**:
- Vercel environment variables (encrypted)
- 1Password or equivalent password manager
- Supabase Dashboard (for database credentials)

---

## Staging vs Production Differences

### Intentional Differences

| Aspect | Staging | Production |
|--------|---------|------------|
| Stripe Mode | Test | Live |
| Database Size | Small (test data) | Large (real data) |
| Monitoring | Basic logs | Full observability |
| Backups | Optional | Daily automated |
| Uptime SLA | None | 99.9% target |
| Traffic | Low (internal only) | High (real users) |

### MUST Be Identical

| Aspect | Requirement |
|--------|-------------|
| Code | Same commit deployed |
| Environment Variables | Same keys (different values) |
| Database Schema | Identical (migrations applied) |
| Next.js Version | Same version |
| Node.js Version | Same version (20.x) |
| Dependencies | Same `package-lock.json` |

---

## Staging URL and Access

### Primary URL

`https://chefflow-staging.vercel.app`

### Access Control

**V1 Limitation**: No authentication on staging URL (publicly accessible)

**Risk Mitigation**:
- Staging uses test Stripe keys (no real money)
- Staging database has no production data
- Staging can be reset anytime

**Post-V1**: Consider basic auth or IP allowlist

### Custom Domain (Optional)

**Setup**:
1. Vercel Dashboard → Settings → Domains
2. Add `staging.chefflow.com` (requires DNS access)
3. Configure DNS CNAME to Vercel

**Benefit**: Professional URL for client demos

---

## Maintenance Windows

### Planned Downtime

**When**: Database migrations that require downtime

**Process**:
1. Announce downtime (internal team only for V1)
2. Schedule during low-traffic hours
3. Deploy migration
4. Verify application
5. Announce completion

**Duration**: < 15 minutes for typical migration

### Unplanned Downtime

**Causes**:
- Vercel platform issues
- Supabase maintenance
- Bad deployment

**Resolution**:
- Check Vercel status page
- Check Supabase status page
- Rollback deployment if self-caused

---

## Cost Monitoring

### Vercel

**Free Tier Limits**:
- 100 GB bandwidth/month
- 100 hours serverless function execution/month
- Unlimited deployments

**Expected Usage**: Well within free tier for V1

### Supabase

**Free Tier Limits**:
- 500 MB database storage
- 50,000 monthly active users
- 2 GB file storage
- Unlimited API requests

**Expected Usage**: Database storage may exceed free tier if staging is not reset regularly

**Action**: Reset staging database monthly to avoid costs

### Stripe

**Test Mode**: Free, unlimited transactions

---

## Disaster Recovery

### Staging Database Loss

**Impact**: Low (test data only)

**Recovery**:
1. Create new Supabase project
2. Update environment variables in Vercel
3. Run migrations: `supabase db push`
4. Optionally apply seed data
5. Redeploy application

**Duration**: ~30 minutes

### Staging Deployment Loss

**Impact**: Low (can redeploy from git)

**Recovery**:
1. Create new Vercel project
2. Connect to GitHub repository
3. Configure environment variables
4. Deploy from `main` branch

**Duration**: ~30 minutes

---

## Verification Checklist

Before considering staging environment "production-ready":

- [ ] Vercel project created and connected to GitHub
- [ ] Supabase project created
- [ ] All environment variables configured in Vercel
- [ ] Migrations applied to staging database
- [ ] Stripe webhook endpoint configured
- [ ] Test payment flow works end-to-end
- [ ] RLS policies verified (cross-tenant isolation)
- [ ] Application loads without errors
- [ ] Logs accessible in Vercel and Supabase
- [ ] Rollback procedure tested
- [ ] Team members have access to Vercel and Supabase

---

## References

- **Production Environment**: `016-production-environment.md`
- **Environment Variables Contract**: `017-environment-variables-contract.md`
- **Secret Management**: `016-secret-management.md`
- **Local-Prod Parity**: `019-local-prod-parity.md`
