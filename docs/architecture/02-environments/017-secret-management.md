# Secret Management

**Document ID**: 017
**Version**: 1.0.0
**Status**: Active
**Last Updated**: 2026-02-14

---

## Purpose

Defines authoritative rules for managing secrets, API keys, and sensitive configuration in ChefFlow V1. This document ensures secrets never leak and access is strictly controlled.

---

## Secret Classification

### Critical Secrets (Compromise = System Breach)

**Category**: Database and Service Role Keys

| Secret | Description | Exposure Impact | Rotation Frequency |
|--------|-------------|-----------------|-------------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Bypasses RLS, full database access | Total data breach | Annually |
| Supabase Database Password | Direct PostgreSQL access | Total data breach | Quarterly |
| `STRIPE_SECRET_KEY` | Create charges, refunds, access customer data | Financial fraud | On compromise |

**Storage**:
- Production: Vercel environment variables (encrypted at rest)
- Local: `.env.local` (never committed)
- Team: 1Password shared vault (encrypted)

**Access**: Owner only (david@example.com)

### High Secrets (Compromise = Service Disruption)

**Category**: Webhook and Integration Keys

| Secret | Description | Exposure Impact | Rotation Frequency |
|--------|-------------|-----------------|-------------------|
| `STRIPE_WEBHOOK_SECRET` | Verify webhook authenticity | Payment processing bypass | On compromise |
| Vercel API Token | Deploy, configure projects | Deployment tampering | Annually |
| Supabase API Service Key | Admin API access | Project manipulation | Annually |

**Storage**: Same as Critical Secrets

**Access**: Owner + deployment automation

### Medium Secrets (Compromise = Privacy Leak)

**Category**: Public-Safe Keys (Safe to Expose to Browser)

| Secret | Description | Exposure Impact | Rotation Frequency |
|--------|-------------|-----------------|-------------------|
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | RLS-protected database access | None (RLS enforced) | On compromise |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Create payment intents (public) | None (requires backend) | On compromise |

**Storage**:
- Committed to `.env.local.example` structure (not values)
- Vercel environment variables
- Exposed to browser (safe by design)

**Access**: Public (included in bundle)

### Non-Secrets (Safe to Commit)

| Value | Description | Safe to Commit |
|-------|-------------|----------------|
| `NEXT_PUBLIC_APP_URL` | Application URL | ✅ Yes |
| `NODE_ENV` | Environment name | ✅ Yes |
| API endpoint URLs | Public endpoints | ✅ Yes |

---

## Secret Storage Locations

### Local Development: `.env.local`

**Location**: `c:/Users/david/Documents/CFv1/.env.local`

**Purpose**: Store all secrets for local development

**Security Rules**:
- ✅ Listed in `.gitignore` (NEVER commit)
- ✅ Permissions: Read/write by owner only (`chmod 600` on Unix)
- ✅ Contains test/development secrets only (never production)
- ❌ NEVER copy to cloud storage (Dropbox, Google Drive)
- ❌ NEVER share via email, Slack, or messaging apps

**Example**:
```bash
# Supabase (from supabase start)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe (test mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51N...
STRIPE_SECRET_KEY=sk_test_51N...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### Vercel Production: Environment Variables

**Location**: Vercel Dashboard → Settings → Environment Variables

**Security Rules**:
- ✅ Set environment to "Production"
- ✅ Enable "Encrypted" for all secrets
- ✅ Use "Sensitive" flag to hide from logs
- ❌ NEVER expose in build logs
- ❌ NEVER include in error messages

**Access Control**:
- Owner: Full access (read/write/delete)
- Team Members: Read-only (cannot view values)
- CI/CD: Read-only via API token

**Screenshot Prevention**: Vercel hides secret values after creation (cannot re-view, only replace)

### Password Manager: 1Password

**Vault**: `ChefFlow Production Secrets`

**Contents**:
- Production `SUPABASE_SERVICE_ROLE_KEY`
- Production `STRIPE_SECRET_KEY`
- Production Supabase database password
- Production Stripe webhook secret
- Vercel API token
- SSH keys (if applicable)

**Access**: Owner + emergency backup access

**Backup**: 1Password maintains encrypted backups

---

## Secret Acquisition (Where to Get Secrets)

### Supabase Keys

**Anon Key** (Public):
1. Supabase Dashboard → Settings → API
2. Copy "anon" key under "Project API keys"
3. Add to `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Service Role Key** (Secret):
1. Supabase Dashboard → Settings → API
2. Click "Reveal" next to "service_role" key
3. Copy to `SUPABASE_SERVICE_ROLE_KEY`
4. Store in 1Password immediately
5. Never log or display

**Database Password**:
1. Supabase Dashboard → Settings → Database
2. Click "Reset database password" (if needed)
3. Copy connection string
4. Extract password from `postgresql://postgres:<PASSWORD>@...`

### Stripe Keys

**Publishable Key** (Public):
1. Stripe Dashboard → Developers → API keys
2. Copy "Publishable key" (starts with `pk_test_` or `pk_live_`)
3. Add to `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

**Secret Key** (Secret):
1. Stripe Dashboard → Developers → API keys
2. Click "Reveal test/live key"
3. Copy to `STRIPE_SECRET_KEY`
4. Store in 1Password immediately

**Webhook Secret**:
1. Stripe Dashboard → Developers → Webhooks
2. Click on endpoint
3. Click "Reveal" under "Signing secret"
4. Copy to `STRIPE_WEBHOOK_SECRET`

### Vercel API Token

1. Vercel Dashboard → Settings → Tokens
2. Create new token with scope "Full Access"
3. Copy immediately (shown only once)
4. Store in 1Password
5. Use for CI/CD or automation only

---

## Secret Distribution (How Team Gets Secrets)

### Onboarding New Developer

**Local Development Secrets**:
1. New developer runs `supabase start` (generates local keys)
2. Developer copies `.env.local.example` to `.env.local`
3. Developer fills in local Supabase keys from `supabase start` output
4. Developer creates own Stripe test account (free)
5. Developer configures own Stripe test keys

**Result**: Each developer has isolated local environment (no shared secrets)

### Staging Secrets

**Access**: Via Vercel Dashboard (read-only for team members)

**If Developer Needs Staging Access**:
1. Owner adds developer to Vercel project
2. Developer can view staging deployments (but not secret values)
3. Developer can trigger re-deploys (but not change env vars)

### Production Secrets

**Access**: Owner only

**Emergency Access**:
1. Secrets stored in 1Password shared vault
2. Requires 2FA authentication
3. Access logged and auditable

**Post-V1**: Implement secret rotation workflow for shared access

---

## Secret Rotation Procedures

### Supabase Service Role Key Rotation

**Frequency**: Annually or on compromise

**Steps**:
1. Generate new key: Supabase Dashboard → Settings → API → "Generate new service_role key"
2. Update Vercel environment variable
3. Trigger new deployment
4. Verify deployment successful
5. Revoke old key in Supabase Dashboard
6. Update 1Password
7. Document rotation in change log

**Downtime**: Zero (old key valid until revoked)

### Stripe Secret Key Rotation

**Frequency**: On compromise only

**Steps**:
1. Create new restricted key: Stripe Dashboard → Developers → API keys → "Create restricted key"
2. Grant minimum permissions (Charges, PaymentIntents, Webhooks)
3. Update Vercel environment variable
4. Trigger new deployment
5. Test payment flow
6. Delete old key in Stripe Dashboard
7. Update 1Password

**Downtime**: Zero (both keys work simultaneously)

### Stripe Webhook Secret Rotation

**Frequency**: On compromise only

**Steps**:
1. Stripe Dashboard → Developers → Webhooks → [Endpoint] → "Roll signing secret"
2. Copy new secret
3. Update Vercel environment variable
4. Trigger new deployment
5. Verify webhooks still work
6. Update 1Password

**Downtime**: ~5 minutes (during deployment)

---

## Secret Leak Detection

### Git Leak Prevention

**Pre-Commit Hook** (recommended):
```bash
#!/bin/bash
# .git/hooks/pre-commit

if git diff --cached --name-only | grep -q ".env.local"; then
  echo "ERROR: Attempting to commit .env.local"
  exit 1
fi

if git diff --cached | grep -qE "sk_live_|sk_test_|whsec_"; then
  echo "ERROR: Potential secret detected in commit"
  exit 1
fi
```

**GitHub Secret Scanning**: Enabled (automatic for public repos)

### What to Do If Secret Leaked

**Immediate Actions** (within 5 minutes):

1. **Revoke Secret**:
   - Supabase: Generate new service_role key, revoke old
   - Stripe: Delete leaked key immediately
   - Vercel: Revoke API token

2. **Assess Impact**:
   - Check access logs for unauthorized access
   - Check Stripe dashboard for fraudulent transactions
   - Check Supabase database for unauthorized queries

3. **Rotate All Related Secrets**:
   - Assume compromise of related secrets
   - Rotate database password
   - Rotate webhook secrets

4. **Incident Report**:
   - Document what leaked, when, how
   - Document who had access to leaked secret
   - Document actions taken

5. **Git History Cleanup** (if committed):
   ```bash
   # Remove secret from all commits
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env.local" \
     --prune-empty --tag-name-filter cat -- --all

   # Force push (dangerous!)
   git push origin --force --all
   ```

**Notification**:
- If production secret: Notify all users of potential breach
- If test secret: Internal team only

---

## Secrets in Code (Prohibited Patterns)

### ❌ NEVER Do This

**Hardcoded Secrets**:
```typescript
// WRONG: Secret hardcoded in source code
const stripe = new Stripe('sk_live_XXXXXXX');
```

**Logged Secrets**:
```typescript
// WRONG: Secret exposed in logs
console.log('Stripe key:', process.env.STRIPE_SECRET_KEY);
```

**Client-Side Service Role Key**:
```typescript
// WRONG: Service role key exposed to browser
'use client';
const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY);
```

**Secrets in Error Messages**:
```typescript
// WRONG: Secret in error message
throw new Error(`Failed to connect with key ${process.env.SUPABASE_SERVICE_ROLE_KEY}`);
```

**Secrets in URLs**:
```typescript
// WRONG: Secret in query parameter
fetch(`/api/data?key=${process.env.STRIPE_SECRET_KEY}`);
```

### ✅ Correct Patterns

**Environment Variables**:
```typescript
// CORRECT: Load from environment
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
```

**Server-Side Only**:
```typescript
// CORRECT: Service role key only in server components/API routes
import { createClient } from '@/lib/supabase/server';
const supabase = createClient(); // Uses service role internally
```

**No Logging**:
```typescript
// CORRECT: Generic error message, no secrets
console.error('Failed to initialize Stripe');
```

---

## Secrets in CI/CD

### GitHub Actions (if applicable)

**Secret Storage**: GitHub Repository → Settings → Secrets → Actions

**Access in Workflow**:
```yaml
env:
  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

**Rules**:
- Secrets never logged (GitHub automatically masks)
- Secrets never in workflow file (use repository secrets)
- Secrets never in pull request from forks

---

## Secrets Audit

### Monthly Audit Checklist

- [ ] Review Vercel environment variables (no extra/unknown secrets)
- [ ] Review Supabase API keys (no unused keys)
- [ ] Review Stripe API keys (no unused keys)
- [ ] Review 1Password vault access logs
- [ ] Verify `.env.local` not committed (check git history)
- [ ] Verify no secrets in application logs
- [ ] Verify no secrets in error tracking (if applicable)

### Tools

**Git History Scan**:
```bash
# Scan for common secret patterns
git log -p | grep -E "sk_live_|sk_test_|whsec_|eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
```

**Expected Result**: No matches

**TruffleHog** (optional):
```bash
# Scan git history for secrets
trufflehog git file://. --only-verified
```

---

## V1 Limitations

### What's Not Implemented

- ❌ Automated secret rotation
- ❌ Secret versioning and rollback
- ❌ Secret access auditing (beyond 1Password logs)
- ❌ Secret expiration enforcement
- ❌ Secrets management API

### Post-V1 Enhancements

- Migrate to HashiCorp Vault or AWS Secrets Manager
- Implement automated rotation workflows
- Add secret access logging and alerting
- Enforce secret expiration policies

---

## Verification Checklist

Before deploying to production:

- [ ] `.env.local` listed in `.gitignore`
- [ ] `.env.local.example` committed (no actual secrets)
- [ ] All production secrets stored in Vercel
- [ ] All production secrets backed up in 1Password
- [ ] Service role key never exposed to browser (grep codebase)
- [ ] No secrets logged (grep for `console.log` with env vars)
- [ ] No secrets in error messages (grep for `Error` with env vars)
- [ ] Git history clean (no committed secrets)
- [ ] Pre-commit hook installed (optional but recommended)
- [ ] Team members know where to find secrets (onboarding doc)

---

## References

- **Environment Variables Contract**: `017-environment-variables-contract.md`
- **Local Environment**: `014-local-environment.md`
- **Production Environment**: `016-production-environment.md`
- **Security**: `SECURITY.md` (root-level doc)
