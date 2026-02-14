# Environment Variables Reference

**Version**: 1.0
**Last Updated**: 2026-02-13

Complete reference for all environment variables in ChefFlow V1.

---

## Required Variables

### Supabase

```bash
# Project URL (from Supabase dashboard → Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co

# Public anon key (safe to expose to client)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Service role key (SECRET - server-side only)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

**Where to find**:
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Select project
3. Settings → API
4. Copy values

### Stripe

```bash
# Publishable key (safe to expose to client)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # Test mode
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... # Production

# Secret key (SECRET - server-side only)
STRIPE_SECRET_KEY=sk_test_... # Test mode
STRIPE_SECRET_KEY=sk_live_... # Production

# Webhook signing secret (SECRET - from webhook endpoint)
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Where to find**:
1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. Developers → API keys
3. Copy keys (toggle test/live mode)

**Webhook secret**:
1. Developers → Webhooks → Add endpoint
2. After creating endpoint, copy signing secret

### App Configuration

```bash
# Your app's public URL
NEXT_PUBLIC_APP_URL=http://localhost:3000 # Development
NEXT_PUBLIC_APP_URL=https://yourdomain.com # Production

# Node environment
NODE_ENV=development # Local
NODE_ENV=production  # Vercel
```

---

## Environment Files

### `.env.local` (Development)

Create this file locally (not committed to Git):

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### `.env.local.example` (Template)

Committed to Git (no secrets):

```bash
# ============================================
# ChefFlow V1 - Environment Variables
# Copy this file to .env.local and fill in your values
# ============================================

# REQUIRED: Supabase (get from dashboard.supabase.com)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# REQUIRED: Stripe (get from dashboard.stripe.com)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

---

## Vercel Configuration

Add variables in Vercel Dashboard:

1. Go to project → Settings → Environment Variables
2. Add each variable
3. Select environments: Production, Preview, Development
4. Save
5. **Redeploy** (required for changes to take effect)

---

## Variable Naming Conventions

### `NEXT_PUBLIC_*` Prefix

Variables with this prefix are **exposed to the client**:

```typescript
// Available in browser
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
```

**Use for**:
- API endpoints
- Public keys
- App URLs

**Never use for**:
- Secrets
- API keys
- Service role keys

### No Prefix

Server-side only (not exposed to client):

```typescript
// Only available server-side
const secret = process.env.STRIPE_SECRET_KEY
```

**Use for**:
- Secrets
- Private API keys
- Database passwords

---

## Security Best Practices

### Never Commit Secrets

```bash
# .gitignore
.env.local
.env*.local
```

### Rotate Keys Regularly

Rotate these periodically:
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

### Separate Test/Production

Use different keys for test and production:

```bash
# Development
STRIPE_SECRET_KEY=sk_test_...

# Production
STRIPE_SECRET_KEY=sk_live_...
```

---

## Testing Webhook Secret

### Local Development

Use Stripe CLI to get temporary webhook secret:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Output:
```
> Ready! Your webhook signing secret is whsec_xxx (^C to quit)
```

Add to `.env.local`:
```bash
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

Restart dev server.

### Production

1. Create webhook endpoint in Stripe Dashboard
2. URL: `https://yourdomain.com/api/webhooks/stripe`
3. Copy signing secret
4. Add to Vercel environment variables
5. Redeploy

---

## Troubleshooting

### Variables Not Loading

**Symptom**: `process.env.VAR_NAME` is undefined

**Solutions**:
1. Verify variable in `.env.local` (local) or Vercel (production)
2. Restart dev server
3. Check for typos
4. Don't use quotes:
   ```bash
   # Wrong
   NEXT_PUBLIC_APP_URL="http://localhost:3000"

   # Correct
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

### Secrets Exposed to Client

**Symptom**: Service role key visible in browser

**Cause**: Using `NEXT_PUBLIC_*` prefix

**Solution**: Remove prefix (server-side only vars)

---

## Related Documentation

- [DEVELOPMENT.md](./DEVELOPMENT.md) - Local setup
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues

---

**Last Updated**: 2026-02-13
