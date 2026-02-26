# Key Rotation Policy — ChefFlow V1

## Overview

All secrets must be rotated proactively on a defined schedule and reactively on any suspected compromise. Secrets are stored in Vercel environment variables and should never appear in source code, logs, or error messages.

---

## Rotation Schedule

| Secret                      | Rotation Frequency                    | Owner       | Last Rotated |
| --------------------------- | ------------------------------------- | ----------- | ------------ |
| `SUPABASE_SERVICE_ROLE_KEY` | Every 6 months or on personnel change | Engineering | (log here)   |
| `STRIPE_SECRET_KEY`         | Every 6 months                        | Engineering | (log here)   |
| `STRIPE_WEBHOOK_SECRET`     | On endpoint creation/change           | Engineering | (log here)   |
| `CRON_SECRET`               | Every 3 months                        | Engineering | (log here)   |
| `RESEND_API_KEY`            | Every 6 months                        | Engineering | (log here)   |
| `GEMINI_API_KEY`            | Every 12 months or on compromise      | Engineering | (log here)   |
| `GOOGLE_CLIENT_SECRET`      | Every 12 months                       | Engineering | (log here)   |
| `MEALME_API_KEY`            | Every 12 months                       | Engineering | (log here)   |
| `SENTRY_AUTH_TOKEN`         | Every 6 months                        | Engineering | (log here)   |
| `UPSTASH_REDIS_REST_TOKEN`  | Every 6 months                        | Engineering | (log here)   |
| `ADMIN_EMAILS`              | On team change                        | Engineering | (log here)   |

---

## Rotation Procedure (Standard — No Downtime)

### Step 1: Generate new secret

For secrets you control (e.g., `CRON_SECRET`):

```bash
openssl rand -hex 32
```

For service-issued secrets (Stripe, Supabase, etc.): generate via their dashboard.

### Step 2: Add the new secret to Vercel WITHOUT removing the old one

For Stripe webhook secrets, Stripe supports multiple active secrets during rotation:

1. Create a new webhook endpoint in Stripe dashboard
2. Copy the new `whsec_...` value
3. Add `STRIPE_WEBHOOK_SECRET_NEW=whsec_newvalue` to Vercel env vars
4. Update the webhook handler to accept BOTH old and new for 24h
5. After 24h, remove old secret and rename NEW to STRIPE_WEBHOOK_SECRET

For single-secret systems (CRON_SECRET, Supabase service role):

1. Update Vercel env var to new value
2. Trigger a new Vercel deployment (picks up new env)
3. Old requests in-flight with old secret will fail (typically < 1 minute window)

### Step 3: Verify

After deployment:

```bash
# Test cron endpoint with new secret
curl -H "Authorization: Bearer $NEW_CRON_SECRET" https://cheflowhq.com/api/scheduled/monitor

# Check health
curl https://cheflowhq.com/api/health
```

### Step 4: Log the rotation

Update the **Last Rotated** column in the table above.

---

## Emergency Rotation (Suspected Compromise)

If a secret is leaked (e.g., accidentally committed to git, exposed in logs):

### Immediate steps (< 15 minutes)

1. **Revoke** the compromised secret in the issuing service's dashboard immediately
2. **Generate** a new secret
3. **Update** Vercel env vars
4. **Trigger** a Vercel deployment
5. **Verify** the system is operational via `/api/health`
6. **Check** audit logs for any unauthorized use of the compromised secret

### For git-committed secrets

```bash
# Immediately revoke the secret in the issuing service dashboard
# Then purge from git history if needed:
git filter-repo --path .env.local --invert-paths

# Force push (coordinate with team)
git push origin --force-with-lease
```

**Do NOT rely on git history rewrite alone.** If the secret was in a public repo for any duration, assume it was already scraped.

### Notify

If a customer-affecting secret is compromised (Stripe key, Supabase service role):

1. Notify all active customers of potential impact within 72 hours (GDPR requirement)
2. Check Stripe dashboard for unauthorized charges
3. Check Supabase audit log for unexpected queries

---

## CRON_SECRET Rotation (No Downtime Procedure)

The cron secret is used by Vercel to authenticate 18 scheduled job endpoints.

1. Generate new: `openssl rand -hex 32`
2. In Vercel dashboard: Settings → Environment Variables → Edit `CRON_SECRET`
3. Set new value, save
4. In Vercel: Deployments → Redeploy latest production deployment
5. Old cron invocations (using old secret) fail for < 1 minute during deployment
6. New deployments pick up new secret automatically

---

## Secret Access Control

- Vercel secrets are managed by account owner only
- No secrets in `.env.local.example` (only placeholders)
- No secrets in source code (enforced by code review)
- To onboard a new team member: add them to Vercel team with "Developer" role

---

## Secret Scanning

Add TruffleHog to CI (see `.github/workflows/ci.yml`) to catch accidental secret commits:

```yaml
- name: Secret scanning
  uses: trufflesecurity/trufflehog@main
  with:
    path: ./
    base: ${{ github.event.repository.default_branch }}
    extra_args: --only-verified
```

---

_Last reviewed: 2026-02-20. Review this document when rotating any secret._
