# Staging Environment Plan — ChefFlow V1

**Last reviewed:** 2026-02-20
**Status:** Not yet implemented — this is the plan for when staging becomes necessary

---

## Why Staging is Not Set Up Yet

ChefFlow currently operates with only two environments:
- **Local** (developer's machine, pointing at remote Supabase with local `next dev`)
- **Production** (Vercel, cheflowhq.com, remote Supabase)

At the current scale (< 50 chefs, single developer), the risk of this two-environment setup is acceptable because:
- All migrations are additive (no breaking schema changes)
- E2E tests run against local server with production DB (guarded by `SUPABASE_E2E_ALLOW_REMOTE`)
- TypeScript check + build check catches most breakage before deploy
- Manual deploy process allows human gate before production

**Staging should be set up when:**
- First paid client onboards (data integrity failures have real consequences)
- Team grows beyond 1 developer
- Any migration requires a destructive change (DROP, TRUNCATE, RENAME)
- CI/CD pipeline triggers automatic deploys (no human gate)

---

## Planned Staging Architecture

### Compute

| Layer | Production | Staging |
|-------|-----------|---------|
| Hosting | Vercel Production | Vercel Preview (auto-deploy from `main` branch) |
| Domain | cheflowhq.com | staging.cheflowhq.com |
| DNS | Cloudflare A → Vercel | Cloudflare CNAME → Vercel preview URL |

**Vercel Preview Deployments:** Every commit to `main` (or a `staging` branch) automatically creates a preview URL. Promote to production manually.

### Database

| Layer | Production | Staging |
|-------|-----------|---------|
| Provider | Supabase (project: luefkpakzvxcsqroxyhz) | Supabase (NEW project: chefflow-staging) |
| Plan | Pro (for PITR) | Free (daily backups sufficient) |
| Data | Real customer data | Anonymized snapshot OR seed data only |
| Migrations | `supabase db push --linked --project-ref [prod]` | `supabase db push --linked --project-ref [staging]` |

### Environment Variables

Staging environment variables (set in Vercel for preview deployments):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://[staging-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[staging anon key]
SUPABASE_SERVICE_ROLE_KEY=[staging service role key]
STRIPE_SECRET_KEY=sk_test_...   # Always test mode in staging
STRIPE_WEBHOOK_SECRET=whsec_...  # Staging webhook listener
NEXT_PUBLIC_SITE_URL=https://staging.cheflowhq.com
NODE_ENV=production              # Same as prod (test production behavior)
SENTRY_ENVIRONMENT=staging       # Tag Sentry events as staging
```

---

## Migration Process (with Staging)

When staging is implemented, the migration workflow changes:

```
Developer writes migration
        ↓
Test migration on LOCAL (supabase db push --local)
        ↓
Apply to STAGING (supabase db push --linked --project-ref [staging])
        ↓
Run E2E tests against staging
        ↓
Apply to PRODUCTION (supabase db push --linked --project-ref [prod])
        ↓
Deploy production app
```

### Staging Data Policy

- **Never copy production data to staging** (contains real PII)
- Use anonymized seed data or the `seed:e2e` script
- Staging DB is reset quarterly or on-demand

```bash
# Seed staging with E2E data:
NEXT_PUBLIC_SUPABASE_URL=[staging-url] \
SUPABASE_SERVICE_ROLE_KEY=[staging-service-role] \
tsx scripts/seed-e2e-remote.ts
```

---

## Canary Deployments (Future)

When traffic justifies it, add canary deployment:

1. Deploy new version to 5% of Vercel traffic
2. Monitor error rate in Sentry for 10 minutes
3. If error rate < 1x baseline: promote to 100%
4. If error rate spikes: immediate rollback (`vercel rollback`)

Vercel Pro supports traffic splitting via Edge Middleware.

---

## Promotion Checklist (Staging → Production)

Before promoting a build from staging to production, verify:

- [ ] All E2E tests pass on staging (`npm run test:e2e`)
- [ ] No new Sentry errors on staging in last 30 minutes
- [ ] `/api/health` on staging returns `status: ok`
- [ ] Any new migrations applied to staging without error
- [ ] TypeScript check passes (`npx tsc --noEmit --skipLibCheck`)
- [ ] Build is clean (`npx next build --no-lint`)

---

## Current Workaround (Until Staging Exists)

Without staging, use feature flags for risk mitigation:
- New features behind `chef_feature_flags` (off by default)
- Test on one or two "friendly" chef accounts before enabling broadly
- Always run E2E smoke suite before production deploy

See `docs/feature-flags.md` for flag management.

---

*Last updated: 2026-02-20*
