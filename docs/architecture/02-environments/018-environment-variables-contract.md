# Environment Variables Contract

**Document ID**: 018
**Version**: 1.0.0
**Status**: Active
**Last Updated**: 2026-02-14

---

## Purpose

Defines the authoritative contract for all environment variables in ChefFlow V1. This document specifies required variables, naming conventions, validation rules, and usage patterns. Every environment variable MUST be documented here.

---

## Naming Conventions

### Prefix Rules

| Prefix | Scope | Example | Exposed to Browser |
|--------|-------|---------|-------------------|
| `NEXT_PUBLIC_` | Client-side | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✅ Yes |
| None | Server-side only | `STRIPE_SECRET_KEY` | ❌ No |

**Critical Rule**: Variables without `NEXT_PUBLIC_` prefix are NEVER accessible in browser. Attempting to access in client components returns `undefined`.

### Case Convention

**Enforced**: `SCREAMING_SNAKE_CASE`

**Examples**:
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `STRIPE_WEBHOOK_SECRET`
- ❌ `nextPublicSupabaseUrl` (wrong case)
- ❌ `stripe-webhook-secret` (hyphens not allowed)

---

## Required Environment Variables

### Supabase Configuration

#### `NEXT_PUBLIC_SUPABASE_URL`

**Type**: `string` (URL)
**Scope**: Client + Server
**Required**: ✅ Yes
**Example**: `https://abcdefgh.supabase.co`

**Purpose**: Base URL for Supabase API

**Validation**:
```typescript
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is required');
}
if (!process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http')) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL must be a valid URL');
}
```

**Environment-Specific Values**:
- **Local**: `http://127.0.0.1:54321`
- **Staging**: `https://[staging-project-id].supabase.co`
- **Production**: `https://[prod-project-id].supabase.co`

---

#### `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Type**: `string` (JWT)
**Scope**: Client + Server
**Required**: ✅ Yes
**Example**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

**Purpose**: Anon key for Supabase client (RLS-protected)

**Security**: Safe to expose (RLS enforced server-side)

**Validation**:
```typescript
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.startsWith('eyJ')) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY must be a valid JWT');
}
```

**Acquisition**: Supabase Dashboard → Settings → API → "anon" key

---

#### `SUPABASE_SERVICE_ROLE_KEY`

**Type**: `string` (JWT)
**Scope**: Server only
**Required**: ✅ Yes
**Example**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

**Purpose**: Service role key (bypasses RLS, full access)

**Security**: ⚠️ CRITICAL SECRET - Never expose to browser

**Usage**:
- Server-side data mutations that bypass RLS
- Admin operations (user role assignment)
- Webhook handlers (system-initiated actions)

**Validation**:
```typescript
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
}
// Never log this value
```

**Prohibited**:
```typescript
// ❌ WRONG: Exposed to client
'use client';
const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY);

// ✅ CORRECT: Server-side only
import { createClient } from '@/lib/supabase/server';
const supabase = createClient(); // Uses service role internally
```

---

### Stripe Configuration

#### `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

**Type**: `string`
**Scope**: Client + Server
**Required**: ✅ Yes
**Example**: `pk_test_51N...` or `pk_live_51N...`

**Purpose**: Initialize Stripe.js in browser

**Validation**:
```typescript
if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
  throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is required');
}
const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
if (!key.startsWith('pk_test_') && !key.startsWith('pk_live_')) {
  throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must start with pk_test_ or pk_live_');
}
```

**Environment-Specific Values**:
- **Local**: `pk_test_...` (test mode)
- **Staging**: `pk_test_...` (test mode)
- **Production**: `pk_live_...` (live mode)

**Critical Rule**: Staging MUST use test mode, production MUST use live mode

---

#### `STRIPE_SECRET_KEY`

**Type**: `string`
**Scope**: Server only
**Required**: ✅ Yes
**Example**: `sk_test_51N...` or `sk_live_51N...`

**Purpose**: Stripe API calls (create charges, refunds, etc.)

**Security**: ⚠️ CRITICAL SECRET - Never expose to browser

**Validation**:
```typescript
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is required');
}
const key = process.env.STRIPE_SECRET_KEY;
if (!key.startsWith('sk_test_') && !key.startsWith('sk_live_')) {
  throw new Error('STRIPE_SECRET_KEY must start with sk_test_ or sk_live_');
}
// Verify mode matches publishable key
const pubKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
if (key.startsWith('sk_test_') && !pubKey?.startsWith('pk_test_')) {
  throw new Error('Stripe key mode mismatch: secret is test, publishable is live');
}
```

---

#### `STRIPE_WEBHOOK_SECRET`

**Type**: `string`
**Scope**: Server only
**Required**: ✅ Yes
**Example**: `whsec_...`

**Purpose**: Verify Stripe webhook signatures

**Validation**:
```typescript
if (!process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error('STRIPE_WEBHOOK_SECRET is required');
}
if (!process.env.STRIPE_WEBHOOK_SECRET.startsWith('whsec_')) {
  throw new Error('STRIPE_WEBHOOK_SECRET must start with whsec_');
}
```

**Usage**:
```typescript
const signature = headers.get('stripe-signature');
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET
);
```

**Acquisition**:
- **Local**: `stripe listen --forward-to http://localhost:3000/api/webhooks/stripe`
- **Production**: Stripe Dashboard → Webhooks → [Endpoint] → Signing secret

---

### Application Configuration

#### `NEXT_PUBLIC_APP_URL`

**Type**: `string` (URL)
**Scope**: Client + Server
**Required**: ✅ Yes
**Example**: `https://chefflow.com`

**Purpose**: Base URL for application (OAuth redirects, email links)

**Validation**:
```typescript
if (!process.env.NEXT_PUBLIC_APP_URL) {
  throw new Error('NEXT_PUBLIC_APP_URL is required');
}
if (!process.env.NEXT_PUBLIC_APP_URL.startsWith('http')) {
  throw new Error('NEXT_PUBLIC_APP_URL must be a valid URL');
}
```

**Environment-Specific Values**:
- **Local**: `http://localhost:3000`
- **Staging**: `https://chefflow-staging.vercel.app`
- **Production**: `https://chefflow.com`

**Usage**:
```typescript
// OAuth redirect URL
const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`;

// Email invitation link
const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite?token=${token}`;
```

---

#### `NODE_ENV`

**Type**: `string` (enum: `development` | `production` | `test`)
**Scope**: Server only
**Required**: ✅ Yes (auto-set by Next.js)
**Example**: `production`

**Purpose**: Determine runtime environment

**Validation**:
```typescript
if (!['development', 'production', 'test'].includes(process.env.NODE_ENV!)) {
  throw new Error('NODE_ENV must be development, production, or test');
}
```

**Auto-Set By**:
- `npm run dev` → `development`
- `npm run build` → `production`
- `npm test` → `test`

**Usage**:
```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info'); // Only in dev
}
```

**Critical Rule**: NEVER manually override in production (Vercel sets automatically)

---

## Optional Environment Variables

### None in V1

All variables listed above are REQUIRED. ChefFlow V1 has no optional environment variables.

**Post-V1**: May add optional variables for feature flags, analytics, etc.

---

## Environment Variable Loading Order

### Next.js Load Order (First Match Wins)

1. `process.env` (system environment)
2. `.env.local` (local overrides, gitignored)
3. `.env.production` or `.env.development` (environment-specific)
4. `.env` (defaults, committed)

**ChefFlow V1 Strategy**: Only use `.env.local` locally, all others managed via Vercel

### Vercel Environment Variables

**Priority**: Vercel environment variables override all `.env` files

**Recommendation**: Do NOT commit `.env.production` or `.env` (prevents confusion)

---

## Validation Strategy

### Application Startup Validation

**File**: `lib/env.ts`

```typescript
/**
 * Validates all required environment variables at startup.
 * Throws descriptive error if any variable is missing or invalid.
 */
export function validateEnv() {
  const required = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  };

  const missing = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.join('\n')}\n\n` +
      `See .env.local.example for required variables.`
    );
  }

  // Validate Stripe key mode consistency
  const stripeSecret = process.env.STRIPE_SECRET_KEY!;
  const stripePub = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!;

  const secretIsTest = stripeSecret.startsWith('sk_test_');
  const pubIsTest = stripePub.startsWith('pk_test_');

  if (secretIsTest !== pubIsTest) {
    throw new Error(
      'Stripe key mode mismatch:\n' +
      `Secret key: ${secretIsTest ? 'test' : 'live'}\n` +
      `Publishable key: ${pubIsTest ? 'test' : 'live'}\n` +
      'Both keys must be in the same mode.'
    );
  }

  console.log('✅ Environment variables validated successfully');
}
```

**Usage** in `app/layout.tsx`:
```typescript
import { validateEnv } from '@/lib/env';

// Validate on server startup
if (typeof window === 'undefined') {
  validateEnv();
}
```

---

## Type Safety

### TypeScript Declaration

**File**: `types/env.d.ts`

```typescript
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Supabase
      NEXT_PUBLIC_SUPABASE_URL: string;
      NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
      SUPABASE_SERVICE_ROLE_KEY: string;

      // Stripe
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
      STRIPE_SECRET_KEY: string;
      STRIPE_WEBHOOK_SECRET: string;

      // Application
      NEXT_PUBLIC_APP_URL: string;
      NODE_ENV: 'development' | 'production' | 'test';
    }
  }
}

export {};
```

**Benefit**: TypeScript autocomplete and type checking for `process.env`

---

## Environment-Specific Configurations

### Local Development

**File**: `.env.local` (gitignored)

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

### Staging (Vercel)

**Set in**: Vercel Dashboard → Environment Variables → Production

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://staging-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Stripe (test mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51N...
STRIPE_SECRET_KEY=sk_test_51N...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
NEXT_PUBLIC_APP_URL=https://chefflow-staging.vercel.app
NODE_ENV=production
```

### Production (Vercel)

**Set in**: Vercel Dashboard → Environment Variables → Production

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Stripe (LIVE MODE)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_51N...
STRIPE_SECRET_KEY=sk_live_51N...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
NEXT_PUBLIC_APP_URL=https://chefflow.com
NODE_ENV=production
```

---

## Template File

### `.env.local.example`

**Purpose**: Committed to git, shows structure without secrets

```bash
# ChefFlow V1 Environment Variables
# Copy this file to .env.local and fill in actual values

# =============================================================================
# Supabase Configuration
# =============================================================================
# Get these values from: supabase start (local) or Supabase Dashboard (prod)

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# =============================================================================
# Stripe Configuration
# =============================================================================
# Get these values from: Stripe Dashboard → Developers → API keys
# IMPORTANT: Use test mode keys for local/staging, live mode for production

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# =============================================================================
# Application Configuration
# =============================================================================

NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

**Usage**:
```bash
cp .env.local.example .env.local
# Fill in actual values in .env.local
```

---

## Access Patterns

### Server Components

**✅ Can Access**: All environment variables

```typescript
// app/dashboard/page.tsx (server component)
export default async function DashboardPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL; // ✅ OK
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // ✅ OK
  // ...
}
```

### Client Components

**✅ Can Access**: Only `NEXT_PUBLIC_*` variables

```typescript
'use client';

export default function ClientComponent() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL; // ✅ OK
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // ❌ undefined
  // ...
}
```

### API Routes

**✅ Can Access**: All environment variables

```typescript
// app/api/webhooks/stripe/route.ts
export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET; // ✅ OK
  // ...
}
```

### Middleware

**✅ Can Access**: Only `NEXT_PUBLIC_*` variables (Edge Runtime limitation)

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL; // ✅ OK
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // ❌ undefined
  // ...
}
```

**Workaround**: Pass secrets via request headers from API route if needed

---

## Common Errors

### Error: Environment Variable Undefined

**Symptom**: `process.env.STRIPE_SECRET_KEY` is `undefined` in client component

**Cause**: Server-only variable accessed in client component

**Solution**: Move logic to server component or API route

---

### Error: Stripe Key Mode Mismatch

**Symptom**: `Error: Stripe key mode mismatch: secret is test, publishable is live`

**Cause**: Using test secret key with live publishable key (or vice versa)

**Solution**: Ensure both keys are in same mode (test or live)

---

### Error: Vercel Build Fails with Missing Env Var

**Symptom**: Build fails with "Missing required environment variables"

**Cause**: Environment variable not set in Vercel Dashboard

**Solution**:
1. Vercel Dashboard → Settings → Environment Variables
2. Add missing variable
3. Set environment to "Production"
4. Redeploy

---

### Error: Supabase Connection Refused

**Symptom**: `fetch failed: connect ECONNREFUSED 127.0.0.1:54321`

**Cause**: Supabase not running locally

**Solution**: `supabase start`

---

## Security Checklist

Before deploying:

- [ ] `.env.local` is gitignored
- [ ] `.env.local.example` has no actual secrets
- [ ] Service role key never accessed in client components
- [ ] Stripe secret key never accessed in client components
- [ ] No secrets logged to console
- [ ] No secrets in error messages
- [ ] Vercel environment variables marked as "Encrypted"
- [ ] Production uses live Stripe keys, staging uses test keys

---

## Verification Script

**File**: `scripts/verify-env.ts`

```typescript
#!/usr/bin/env node

/**
 * Verifies environment variables are correctly configured.
 * Run: npx tsx scripts/verify-env.ts
 */

import { validateEnv } from '../lib/env';

try {
  validateEnv();
  console.log('✅ All environment variables are valid');
  process.exit(0);
} catch (error) {
  console.error('❌ Environment validation failed:');
  console.error(error);
  process.exit(1);
}
```

**Usage**:
```bash
npm run verify:env
```

**Add to `package.json`**:
```json
{
  "scripts": {
    "verify:env": "tsx scripts/verify-env.ts"
  }
}
```

---

## References

- **Secret Management**: `017-secret-management.md`
- **Local Environment**: `014-local-environment.md`
- **Production Environment**: `016-production-environment.md`
- **Next.js Environment Variables**: https://nextjs.org/docs/app/building-your-application/configuring/environment-variables
