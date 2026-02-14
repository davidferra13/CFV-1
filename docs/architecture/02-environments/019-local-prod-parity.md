# Local-Production Parity

**Document ID**: 019
**Version**: 1.0.0
**Status**: Active
**Last Updated**: 2026-02-14

---

## Purpose

Defines the requirements and verification procedures for maintaining parity between local development and production environments in ChefFlow V1. This ensures "works on my machine" issues are eliminated and deployments are predictable.

---

## The Twelve-Factor App Principle

### Dev/Prod Parity Rule

**Principle**: Keep development, staging, and production as similar as possible.

**ChefFlow V1 Compliance**:
- ✅ Same database (PostgreSQL 15.x in all environments)
- ✅ Same runtime (Node.js 20.x in all environments)
- ✅ Same framework (Next.js 14.x in all environments)
- ✅ Same dependencies (locked via `package-lock.json`)
- ✅ Same build process (`next build` in all environments)

---

## Parity Matrix

### MUST Be Identical

| Aspect | Verification Method |
|--------|-------------------|
| **Node.js Version** | `node --version` outputs `v20.x.x` |
| **npm Version** | `npm --version` outputs `10.x.x` |
| **Next.js Version** | `package.json` specifies exact version |
| **PostgreSQL Version** | Supabase uses 15.x in all environments |
| **Database Schema** | Same migrations applied via `supabase/migrations/` |
| **RLS Policies** | Same policies enforced in all environments |
| **TypeScript Config** | `tsconfig.json` identical |
| **ESLint Config** | `.eslintrc.json` identical |
| **Tailwind Config** | `tailwind.config.ts` identical |
| **Dependencies** | `package-lock.json` locked (no version drift) |

### MAY Differ (Intentional)

| Aspect | Local | Staging | Production | Reason |
|--------|-------|---------|------------|--------|
| **Supabase URL** | `127.0.0.1:54321` | `staging.supabase.co` | `prod.supabase.co` | Infrastructure |
| **Stripe Mode** | Test | Test | Live | Safety |
| **Data Volume** | Small (test data) | Small (test data) | Large (real data) | Scale |
| **Logging Level** | Verbose | Verbose | Error only | Debugging |
| **Source Maps** | Enabled | Enabled | Disabled | Performance |

---

## Node.js Version Enforcement

### Version Lock

**File**: `package.json`

```json
{
  "engines": {
    "node": ">=20.11.0 <21.0.0",
    "npm": ">=10.2.0 <11.0.0"
  }
}
```

**Benefit**: `npm install` warns if wrong version

### `.nvmrc` (Optional)

**File**: `.nvmrc`

```
20.11.0
```

**Usage**:
```bash
nvm use  # Automatically switches to correct Node.js version
```

### Vercel Configuration

**File**: `package.json`

```json
{
  "engines": {
    "node": "20.x"
  }
}
```

**Verification**: Vercel build logs show `Node.js 20.x.x`

---

## Database Parity

### Schema Synchronization

**Single Source of Truth**: `supabase/migrations/`

**Flow**:
```
1. Developer creates migration locally
2. Test locally: supabase db reset
3. Commit migration to git
4. Push to main
5. Apply to staging: supabase db push (manual)
6. Verify in staging
7. Apply to production: supabase db push (manual)
```

**Result**: Same schema in all environments

### RLS Policy Synchronization

**Location**: `supabase/migrations/20260213000002_rls_policies.sql`

**Guarantee**: Applying same migration = same RLS policies

**Verification**:
```sql
-- Check policies exist in production
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Expected**: Identical output in local, staging, production

### Database Version Parity

**Supabase**: All projects use PostgreSQL 15.x (platform standard)

**Verification**:
```sql
SELECT version();
```

**Expected**: `PostgreSQL 15.x ...` in all environments

---

## Dependency Parity

### Lock File Strategy

**File**: `package-lock.json`

**Rule**: ALWAYS committed to git, NEVER manually edited

**Installation**:
```bash
# ✅ CORRECT: Uses exact versions from lock file
npm install

# ❌ WRONG: Updates dependencies, breaks parity
npm update
```

### Version Pinning

**Strategy**: Use exact versions, not ranges

**Example** in `package.json`:
```json
{
  "dependencies": {
    "next": "14.1.0",           // ✅ Exact version
    "react": "18.2.0",          // ✅ Exact version
    "stripe": "^14.0.0",        // ❌ Caret allows updates
    "@supabase/supabase-js": "~2.38.0"  // ❌ Tilde allows patches
  }
}
```

**Fix**:
```json
{
  "dependencies": {
    "next": "14.1.0",
    "react": "18.2.0",
    "stripe": "14.0.0",
    "@supabase/supabase-js": "2.38.0"
  }
}
```

**Benefit**: `npm install` installs EXACT same versions everywhere

### Dependency Audit

**Monthly Check**:
```bash
npm outdated  # Show outdated packages
npm audit     # Check for vulnerabilities
```

**Action**: Update dependencies in controlled manner (all environments simultaneously)

---

## Build Process Parity

### Build Command

**Same Command Everywhere**:
```bash
npm run build
```

**Configured in** `package.json`:
```json
{
  "scripts": {
    "build": "next build"
  }
}
```

**Vercel**: Uses same command automatically

### Build Output

**Directory**: `.next/`

**Verification**: `.next/BUILD_ID` file contains same build ID for same commit

**Example**:
```bash
# Local build
npm run build
cat .next/BUILD_ID  # Output: abc123

# Vercel build (same commit)
# Check Vercel logs for BUILD_ID: abc123
```

### Environment Variables in Build

**Critical Rule**: Build process must NOT depend on environment-specific variables

**Example** (WRONG):
```typescript
// ❌ Build-time variable (different per environment)
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
```

**Fix**: Use runtime variables only:
```typescript
// ✅ Runtime variable (same build, different runtime)
'use client';
const apiUrl = process.env.NEXT_PUBLIC_APP_URL;
```

---

## Configuration File Parity

### TypeScript Configuration

**File**: `tsconfig.json`

**Requirement**: Committed to git, same in all environments

**Verification**:
```bash
# Check no errors
npx tsc --noEmit
```

**Expected**: Zero errors in all environments

### ESLint Configuration

**File**: `.eslintrc.json`

**Requirement**: Committed to git, same in all environments

**Verification**:
```bash
npm run lint
```

**Expected**: Same warnings/errors in all environments

### Tailwind Configuration

**File**: `tailwind.config.ts`

**Requirement**: Committed to git, same in all environments

**Verification**: Build output CSS file has same hash for same commit

---

## Local Development Deviations (Acceptable)

### File Watching

**Local**: Hot reload via `next dev`
**Production**: Static build, no hot reload

**Acceptable**: Different development experience, same runtime behavior

### HTTPS

**Local**: HTTP (`http://localhost:3000`)
**Production**: HTTPS (`https://chefflow.com`)

**Acceptable**: Local testing uses HTTP, but production OAuth/Stripe requires HTTPS

**Workaround**: Use `ngrok` or `localhost.run` for HTTPS testing if needed

### Database Connection String

**Local**: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
**Production**: `postgresql://postgres:[secure-password]@db.[project].supabase.co:5432/postgres`

**Acceptable**: Different hosts, same database engine and schema

---

## Verification Procedures

### Pre-Deployment Checklist

Before merging to main:

- [ ] `npm run build` succeeds locally
- [ ] `npm run lint` shows no errors
- [ ] `npx tsc --noEmit` shows no errors
- [ ] `supabase db reset` succeeds (schema valid)
- [ ] All tests pass (if applicable)
- [ ] `node --version` matches `package.json` engines

### Post-Deployment Verification

After deploying to staging/production:

- [ ] Vercel build logs show correct Node.js version
- [ ] Vercel build logs show `npm install` used `package-lock.json`
- [ ] Application loads without errors
- [ ] Database queries work (RLS policies match)
- [ ] No "module not found" errors (dependency parity)

### Monthly Parity Audit

**Run First Week of Month**:

1. **Check Node.js Versions**:
   ```bash
   node --version                          # Local
   # Check Vercel build logs               # Staging
   # Check Vercel build logs               # Production
   ```

2. **Check Dependency Versions**:
   ```bash
   npm list --depth=0                      # Local
   # Compare with Vercel build logs        # Staging/Production
   ```

3. **Check Database Schema**:
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public';
   ```
   Compare output across all environments.

4. **Check RLS Policies**:
   ```sql
   SELECT tablename, COUNT(*) FROM pg_policies
   WHERE schemaname = 'public'
   GROUP BY tablename;
   ```
   Counts must match across all environments.

5. **Check Environment Variables**:
   - Verify all required variables exist in Vercel
   - Verify no extra/unknown variables

---

## Common Parity Issues

### Issue: "Works locally, breaks in production"

**Symptom**: Feature works in local dev, fails in Vercel deployment

**Common Causes**:
1. **File system access**: Vercel is read-only, local is read/write
2. **Environment variable missing**: Set locally, not in Vercel
3. **Case-sensitive imports**: macOS/Windows ignore case, Linux doesn't
4. **Relative path issues**: Local uses different working directory

**Solution**:
- Test with `npm run build && npm start` locally (production mode)
- Check Vercel logs for errors
- Verify all environment variables in Vercel Dashboard

---

### Issue: Database migration works locally, fails in production

**Symptom**: `supabase db reset` succeeds locally, `supabase db push` fails in prod

**Common Causes**:
1. **Data conflict**: Production has data violating new constraint
2. **Permission issue**: RLS policy denies migration user
3. **Dependency order**: Migration depends on previous migration not yet applied

**Solution**:
- Test migration against copy of production data
- Check migration order (numeric prefix)
- Apply migration to staging first

---

### Issue: Dependency version mismatch

**Symptom**: `package-lock.json` shows different versions on different machines

**Cause**: Someone ran `npm update` or `npm install [package]@latest`

**Solution**:
```bash
# Reset to committed lock file
git checkout package-lock.json
rm -rf node_modules
npm install
```

---

## Parity Anti-Patterns

### ❌ Anti-Pattern: Environment-Specific Code

```typescript
// WRONG: Different behavior per environment
if (process.env.NODE_ENV === 'development') {
  return mockData;
} else {
  return fetchRealData();
}
```

**Problem**: Untested code paths, unpredictable behavior

**Fix**: Use same code, different configuration
```typescript
// CORRECT: Same code, different data source
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
return fetch(apiUrl);
```

---

### ❌ Anti-Pattern: Manual Schema Changes

**WRONG**:
1. Developer edits production database schema via Supabase Studio
2. Forgets to create migration
3. Next deployment breaks because schema doesn't match code

**CORRECT**:
1. Developer creates migration locally
2. Tests migration locally
3. Commits migration to git
4. Applies migration to production via `supabase db push`

---

### ❌ Anti-Pattern: Global Dependencies

**WRONG**:
```bash
# Install globally (not tracked in package.json)
npm install -g some-tool
```

**Problem**: Works on developer's machine, breaks on Vercel

**CORRECT**:
```bash
# Install as dev dependency
npm install --save-dev some-tool
```

Add to `package.json` scripts:
```json
{
  "scripts": {
    "tool": "some-tool"
  }
}
```

---

## Docker for Perfect Parity (Optional)

### V1 Limitation

ChefFlow V1 does NOT use Docker for application runtime (uses Vercel serverless).

### Post-V1 Enhancement

**Consideration**: Run Next.js app in Docker locally to match production environment exactly.

**Benefit**: Identical runtime (Node.js version, OS, environment)

**Dockerfile Example**:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

---

## Continuous Integration (CI)

### GitHub Actions (Recommended)

**File**: `.github/workflows/ci.yml`

```yaml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - run: npm run lint
      - run: npx tsc --noEmit
```

**Benefit**: Verify parity before deployment (same build process as production)

---

## Verification Checklist

Before considering parity "achieved":

- [ ] Node.js version matches across all environments
- [ ] `package-lock.json` committed and used in all environments
- [ ] Database migrations applied in same order everywhere
- [ ] RLS policies identical in all environments
- [ ] Same build command (`npm run build`) everywhere
- [ ] Environment variables defined (but with different values)
- [ ] TypeScript config identical
- [ ] ESLint config identical
- [ ] No environment-specific code branches
- [ ] No global npm dependencies required
- [ ] Build succeeds in all environments
- [ ] Tests pass in all environments (if applicable)

---

## References

- **Local Environment**: `014-local-environment.md`
- **Staging Environment**: `015-staging-environment.md`
- **Production Environment**: `016-production-environment.md`
- **Environment Variables Contract**: `018-environment-variables-contract.md`
- **Twelve-Factor App**: https://12factor.net/dev-prod-parity
