# Production Environment

**Document ID**: 016
**Version**: 1.0.0
**Status**: Active
**Last Updated**: 2026-02-14

---

## Purpose

Defines the production environment configuration, deployment procedures, monitoring requirements, and operational runbooks for ChefFlow V1. Production is the live environment serving real customers and processing real payments.

---

## Environment Overview

### Production Requirements

1. **Zero Downtime**: Deployments must not interrupt user sessions
2. **Data Integrity**: All financial data is immutable and auditable
3. **Security**: Defense-in-depth enforcement at all layers
4. **Compliance**: PCI DSS Level 1 compliance via Stripe (SAQ-A)
5. **Performance**: p95 page load < 2 seconds
6. **Availability**: 99.9% uptime target (43 minutes downtime/month acceptable)

### Production Prohibitions

- ❌ NEVER deploy unreviewed code
- ❌ NEVER use test Stripe keys
- ❌ NEVER expose service role key to browser
- ❌ NEVER run migrations without backup
- ❌ NEVER sync production data to staging/local
- ❌ NEVER disable RLS policies
- ❌ NEVER commit secrets to git

---

## Infrastructure

### Hosting Platform

**Vercel Project**:
- **Project Name**: `chefflow-production`
- **Framework**: Next.js 14 (App Router)
- **Region**: `iad1` (us-east-1, Washington D.C.)
- **Plan**: Pro ($20/month) - Required for zero-downtime deployments
- **Build Command**: `next build`
- **Output Directory**: `.next`
- **Node.js Version**: 20.x (specified in `package.json`)

**Vercel Features Enabled**:
- Edge Middleware (for auth redirects)
- Serverless Functions (for API routes)
- Automatic HTTPS (via Let's Encrypt)
- DDoS protection (included)

### Database

**Supabase Project**:
- **Project Name**: `chefflow-production`
- **Region**: `us-east-1` (same as Vercel for low latency)
- **Plan**: Pro ($25/month) - Required for daily backups
- **Postgres Version**: 15.x
- **Connection Pooling**: PgBouncer enabled (transaction mode)
- **Compute**: Small instance (2 CPU, 1 GB RAM) - Adequate for V1

**Supabase Features Enabled**:
- Daily automated backups (7-day retention)
- Point-in-time recovery (PITR) enabled
- Database logs (7-day retention)
- RLS policies enforced
- SSL required for all connections

### Payment Processor

**Stripe Account**:
- **Mode**: Live Mode ONLY
- **API Keys**: `pk_live_...` and `sk_live_...`
- **Webhook Secret**: `whsec_...`
- **Compliance**: PCI DSS SAQ-A (Stripe handles card data)

### DNS and Domain

**Domain**: `chefflow.com` (example - replace with actual)

**DNS Configuration**:
```
chefflow.com          A      76.76.21.21 (Vercel)
www.chefflow.com      CNAME  cname.vercel-dns.com
```

**SSL**: Automatic via Vercel (Let's Encrypt, auto-renewal)

---

## Environment Variables

### Vercel Environment Variables

**Location**: Vercel Dashboard → Project Settings → Environment Variables

**All variables set with Environment = "Production"**:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-from-supabase-dashboard>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-from-supabase-dashboard>

# Stripe Configuration (LIVE MODE)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_... (from Stripe production webhook)

# Application Configuration
NEXT_PUBLIC_APP_URL=https://chefflow.com
NODE_ENV=production
```

### Secret Rotation Schedule

| Secret | Rotation Frequency | Next Rotation |
|--------|-------------------|---------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Annually | 2027-02-14 |
| `STRIPE_SECRET_KEY` | On compromise only | N/A |
| `STRIPE_WEBHOOK_SECRET` | On compromise only | N/A |
| Supabase Database Password | Quarterly | 2026-05-14 |

**Rotation Procedure**:
1. Generate new secret in Supabase/Stripe dashboard
2. Update Vercel environment variable
3. Trigger new deployment (automatic)
4. Verify deployment success
5. Revoke old secret
6. Update password manager

---

## Deployment Process

### Pre-Deployment Checklist

Before merging to `main` (which auto-deploys):

- [ ] All tests pass locally
- [ ] TypeScript compiles without errors
- [ ] ESLint shows no errors
- [ ] Changes reviewed by at least one other person
- [ ] Migration tested in staging
- [ ] Breaking changes documented
- [ ] Rollback plan documented

### Automatic Deployment

**Trigger**: Push to `main` branch

**Flow**:
```
git push origin main
  ↓
GitHub webhook triggers Vercel
  ↓
Vercel clones repository at commit SHA
  ↓
npm install (uses package-lock.json)
  ↓
next build (TypeScript compilation, route generation)
  ↓
Deploy to production (zero-downtime rollout)
  ↓
Health check (automatic)
  ↓
Deployment complete
  ↓
Previous deployment kept as instant rollback target
```

**Duration**: 3-5 minutes for typical build

**Zero-Downtime**: Vercel gradually shifts traffic to new deployment. Old deployment serves in-flight requests until complete.

### Manual Deployment (Emergency)

**Use Cases**:
- Rollback to previous version
- Hotfix without waiting for CI/CD
- Re-deploy after environment variable change

**Steps**:
1. Vercel Dashboard → Deployments
2. Find target deployment
3. Click "..." → Promote to Production
4. Confirm

**Duration**: < 30 seconds (no rebuild required)

### Deployment Notifications

**Vercel Slack Integration** (optional):
- Deployment started
- Deployment succeeded
- Deployment failed
- Deployment promoted

**Configure**: Vercel Dashboard → Integrations → Slack

---

## Database Management

### Running Migrations

**Pre-Migration Checklist**:

- [ ] Migration tested in staging
- [ ] Manual backup taken
- [ ] Rollback migration prepared
- [ ] Downtime estimate calculated (if any)
- [ ] Team notified of maintenance window

**Migration Process**:

```bash
# 1. Link to production project (one-time setup)
supabase link --project-ref [PRODUCTION_PROJECT_ID]

# 2. Verify current schema matches
supabase db diff

# 3. Push migrations
supabase db push --dry-run  # Preview changes
supabase db push            # Apply to production
```

**Post-Migration Verification**:

- [ ] Supabase Table Editor shows expected schema
- [ ] Application loads without errors
- [ ] No RLS policy errors in logs
- [ ] Smoke test passes (create event, view list)

### Database Backups

**Automated Backups** (Supabase):
- **Frequency**: Daily at 02:00 UTC
- **Retention**: 7 days
- **Storage**: Supabase managed (encrypted)

**Manual Backup Before Risky Changes**:

```bash
# Download production backup
supabase db dump --db-url "postgresql://..." > backup_$(date +%Y%m%d).sql
```

**Store In**: S3 bucket or encrypted cloud storage (not git)

### Point-in-Time Recovery (PITR)

**Enabled**: Yes (Supabase Pro plan)

**Use Case**: Recover from accidental data deletion

**Process**:
1. Supabase Dashboard → Database → Backups
2. Select timestamp to restore to
3. Restore to new project (never in-place)
4. Verify restored data
5. Migrate production to restored instance (if needed)

**RTO** (Recovery Time Objective): 4 hours
**RPO** (Recovery Point Objective): 5 minutes (PITR granularity)

---

## Stripe Integration

### Webhook Configuration

**Stripe Dashboard** (Live Mode):
1. Developers → Webhooks → Add Endpoint
2. **Endpoint URL**: `https://chefflow.com/api/webhooks/stripe`
3. **Events**: Select:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
4. **API Version**: 2024-10-28 (pin to specific version)
5. **Signing Secret**: Copy to `STRIPE_WEBHOOK_SECRET`

### Webhook Monitoring

**Stripe Dashboard**: Developers → Webhooks → [Endpoint] → Events

**Alerts** (configure in Stripe):
- 10+ failed deliveries in 1 hour
- 5+ timeout errors in 1 hour
- Any 500 errors

**Response Time Target**: < 1 second (Stripe retries after 3 seconds)

### Payment Reconciliation

**Daily Reconciliation**:
1. Export Stripe transactions (CSV from dashboard)
2. Export `ledger_entries` from Supabase
3. Compare totals: `SUM(ledger.amount) = SUM(stripe.amount)`
4. Investigate discrepancies (log as critical bug)

**Automation** (Post-V1):
- Automated daily reconciliation script
- Slack notification if totals don't match

---

## Monitoring

### Vercel Logs

**Access**: Vercel Dashboard → Deployments → [Latest] → Runtime Logs

**Log Retention**: 7 days (Pro plan)

**Search For**:
- 500 Internal Server Errors
- Unhandled exceptions
- Database connection errors
- Stripe API errors

**Example Query**:
```
"error" OR "500" OR "failed" OR "exception"
```

### Supabase Logs

**Access**: Supabase Dashboard → Logs

**Log Types**:
- API logs (REST/RPC calls)
- Database logs (query errors, slow queries)
- Auth logs (signin attempts, failures)

**Alerts** (configure via Supabase Dashboard):
- Query execution time > 5 seconds
- Connection pool > 80% capacity
- RLS policy violations > 100/hour

### Application Performance Monitoring (APM)

**V1 Limitation**: No APM tool (Sentry, Datadog) integrated

**Manual Monitoring**:
- Vercel Analytics (page views, response times)
- Supabase Dashboard (query performance)
- Stripe Dashboard (payment success rate)

**Post-V1**: Integrate Sentry for error tracking

### Uptime Monitoring

**Tool**: Vercel integrated health checks (automatic)

**External Tool** (recommended): UptimeRobot or Pingdom

**Configuration**:
- **Monitor URL**: `https://chefflow.com`
- **Check Frequency**: 5 minutes
- **Alert On**: 2 consecutive failures
- **Notification**: Email + Slack

---

## Security

### HTTPS Enforcement

**Vercel**: Automatic HTTPS redirect (cannot be disabled)

**Headers**: Set via `next.config.js`:
```javascript
{
  headers: [
    {
      source: '/:path*',
      headers: [
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }
      ]
    }
  ]
}
```

### Rate Limiting

**Vercel**: 100 requests/10 seconds per IP (default)

**Custom Rate Limiting** (V1 limitation): Not implemented

**Post-V1**: Implement rate limiting on API routes (Upstash Redis)

### DDoS Protection

**Vercel**: Automatic DDoS protection included

**No Additional Configuration Required**

---

## Disaster Recovery

### Scenario: Database Corruption

**Impact**: High - Application unusable

**Detection**: RLS policy errors, query failures, data integrity violations

**Recovery Steps**:
1. Identify issue (check Supabase logs)
2. Restore from latest backup (PITR if within 5 minutes)
3. Re-run migrations if needed
4. Verify data integrity
5. Redeploy application if needed
6. Communicate status to users

**RTO**: 2 hours
**RPO**: 5 minutes (PITR)

### Scenario: Bad Deployment

**Impact**: Medium - Application crashes or behaves incorrectly

**Detection**: Error spike in Vercel logs, user reports

**Recovery Steps**:
1. Immediate rollback via Vercel Dashboard (< 30 seconds)
2. Verify rollback successful
3. Investigate issue in staging
4. Create fix
5. Test in staging
6. Re-deploy to production

**RTO**: 5 minutes

### Scenario: Stripe Webhook Failure

**Impact**: Medium - Payments not processed, ledger not updated

**Detection**: Stripe webhook failures in dashboard, ledger discrepancies

**Recovery Steps**:
1. Check Stripe webhook logs for error details
2. Fix application issue (deploy hotfix)
3. Re-send failed webhooks via Stripe Dashboard → Events → Resend
4. Verify ledger entries created
5. Manually transition events to `paid` status if needed

**RTO**: 1 hour

### Scenario: Complete Infrastructure Loss

**Impact**: Critical - Total service outage

**Detection**: All monitoring alerts fire, site unreachable

**Recovery Steps**:
1. Create new Vercel project from GitHub
2. Create new Supabase project
3. Restore database from backup
4. Configure environment variables
5. Deploy application
6. Update DNS if needed
7. Verify full functionality

**RTO**: 4 hours
**RPO**: 24 hours (daily backups)

---

## Performance Targets

### Page Load Times

| Page | Target (p95) | Acceptable (p99) |
|------|-------------|------------------|
| Public landing | 1.5s | 2s |
| Chef dashboard | 2s | 3s |
| Client event list | 2s | 3s |
| Event details | 1.5s | 2.5s |

**Measurement**: Vercel Analytics

### API Response Times

| Endpoint | Target (p95) | Acceptable (p99) |
|----------|-------------|------------------|
| GET /api/events | 500ms | 1s |
| POST /api/events | 800ms | 1.5s |
| POST /api/webhooks/stripe | 1s | 2s |

**Measurement**: Vercel Function Logs

### Database Query Times

| Query Type | Target (p95) | Acceptable (p99) |
|-----------|-------------|------------------|
| Event list (tenant-scoped) | 100ms | 300ms |
| Ledger balance calculation | 200ms | 500ms |
| RLS policy evaluation | 50ms | 100ms |

**Measurement**: Supabase Dashboard → Database → Query Performance

---

## Cost Management

### Monthly Cost Estimate (V1)

| Service | Plan | Cost |
|---------|------|------|
| Vercel | Pro | $20/month |
| Supabase | Pro | $25/month |
| Stripe | Pay-as-you-go | 2.9% + $0.30/transaction |
| Domain | Namecheap/etc | $15/year |
| **Total Fixed** | | **$45/month** |

**Variable Costs**:
- Stripe fees: Depends on transaction volume
- Vercel bandwidth overage: $40/100GB (unlikely in V1)
- Supabase storage overage: $0.125/GB/month (unlikely in V1)

### Cost Alerts

**Vercel**: Set billing alert at $50/month
**Supabase**: Set billing alert at $50/month

**Action on Alert**: Review usage, investigate unexpected spikes

---

## Compliance

### PCI DSS Compliance

**Approach**: SAQ-A (Stripe handles all card data)

**Requirements**:
- ✅ HTTPS enforced
- ✅ No card data stored in database
- ✅ Stripe Elements/Checkout used for payment UI
- ✅ No logs contain card numbers

**Verification**: Annual SAQ-A questionnaire (Stripe provides guidance)

### Data Privacy

**GDPR** (if applicable):
- User data deletion: Manual process (V1 limitation)
- Data export: Manual process via Supabase Studio
- Privacy policy: Required on website

**CCPA** (if applicable):
- Same requirements as GDPR

**Post-V1**: Implement automated data export/deletion

---

## Maintenance Windows

### Scheduled Maintenance

**Frequency**: Monthly (first Sunday, 02:00-04:00 UTC)

**Purpose**:
- Database vacuuming
- Index rebuilding
- Dependency updates

**Notification**:
- 7 days advance notice
- In-app banner (if applicable)
- Email to active users

**Expected Downtime**: < 15 minutes

### Emergency Maintenance

**Trigger**: Critical security patch, data integrity issue

**Process**:
1. Assess severity
2. Schedule maintenance ASAP (within 24 hours)
3. Notify users (email, status page)
4. Perform maintenance
5. Verify resolution
6. Close incident

---

## Runbooks

### Runbook: Application Won't Load

**Symptoms**: Blank page, 500 errors, infinite loading

**Diagnosis**:
1. Check Vercel status page
2. Check Supabase status page
3. Check Vercel logs for errors
4. Check Supabase logs for connection errors

**Resolution**:
- If Vercel issue: Wait for platform recovery or rollback deployment
- If Supabase issue: Wait for platform recovery
- If application issue: Rollback deployment

### Runbook: Payment Not Processing

**Symptoms**: Client reports payment failed, ledger entry not created

**Diagnosis**:
1. Check Stripe Dashboard → Events for webhook delivery
2. Check Vercel logs for webhook handler errors
3. Check Supabase `ledger_entries` for entry

**Resolution**:
- If webhook not received: Check Stripe webhook configuration
- If webhook failed: Fix application bug, redeploy, resend webhook
- If ledger entry missing: Manually create entry (document in audit log)

### Runbook: RLS Policy Denying Valid Access

**Symptoms**: User reports "Permission denied" error, data not loading

**Diagnosis**:
1. Reproduce issue in staging
2. Check Supabase logs for policy violation
3. Check user's role in `user_roles` table
4. Check tenant_id matches expected value

**Resolution**:
- If role incorrect: Investigate role assignment logic
- If policy too restrictive: Create migration to fix policy
- If tenant_id mismatch: Data integrity issue (critical bug)

---

## Verification Checklist

Before considering production environment "live":

- [ ] Vercel Pro plan activated
- [ ] Supabase Pro plan activated
- [ ] Domain configured and SSL active
- [ ] All environment variables set (live Stripe keys)
- [ ] Database migrations applied
- [ ] Daily backups enabled
- [ ] PITR enabled
- [ ] Stripe webhook endpoint configured (live mode)
- [ ] Test payment processed successfully
- [ ] Uptime monitoring configured
- [ ] Error alerts configured
- [ ] Deployment rollback tested
- [ ] Database restore tested
- [ ] Security headers configured
- [ ] HTTPS enforced
- [ ] Cross-tenant isolation verified

---

## References

- **Staging Environment**: `015-staging-environment.md`
- **Environment Variables Contract**: `017-environment-variables-contract.md`
- **Secret Management**: `016-secret-management.md`
- **Deployment Model**: `045-deployment-model.md`
- **Monitoring Surface**: `039-monitoring-surface.md`
