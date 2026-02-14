# Verification Scripts Reference

**Version**: 1.0
**Last Updated**: 2026-02-13

Reference for all database verification scripts in ChefFlow V1.

---

## Overview

ChefFlow V1 includes SQL verification scripts to ensure System Laws are enforced. These scripts test:

- Row Level Security (RLS) policies
- Ledger/transition immutability
- Database schema correctness
- Migration success

**Location**: `scripts/` directory

---

## Running Scripts

### In Supabase SQL Editor

1. Go to Supabase project → SQL Editor
2. Click "New Query"
3. Copy script contents
4. Click "Run"
5. Check output for PASS/FAIL

### Via psql (Advanced)

```bash
psql $DATABASE_URL -f scripts/verify-rls.sql
```

**Note**: Requires `psql` CLI and database connection string.

---

## Available Scripts

### 1. verify-rls.sql

**Purpose**: Verify multi-tenant isolation

**Tests**:
- Chef A cannot see Chef B's events
- Client A1 cannot see Client A2's events
- Service role can see all data

**Expected output**:
```
TEST 1 PASS ✓: Chef A cannot see Chef B events (blocked by RLS)
TEST 2 PASS ✓: Client A1 cannot see Client A2 events (blocked by RLS)
TEST 3 PASS ✓: Service role sees all 3 test events
```

**When to run**:
- After deploying RLS policies
- After modifying RLS policies
- Pre-deployment verification

**Cleanup**: Script creates test data (prefixed with `TEST:`). Delete manually if needed:
```sql
DELETE FROM events WHERE title LIKE 'TEST:%';
DELETE FROM clients WHERE email LIKE 'test%@example.com';
DELETE FROM chefs WHERE email LIKE 'test%@example.com';
```

---

### 2. verify-immutability.sql

**Purpose**: Verify ledger and transitions are immutable

**Tests**:
- UPDATE on `ledger_entries` fails
- DELETE on `ledger_entries` fails
- UPDATE on `event_transitions` fails
- DELETE on `event_transitions` fails
- INSERT still works (append-only)

**Expected output**:
```
TEST 1 PASS ✓: UPDATE on ledger_entries blocked by trigger
TEST 2 PASS ✓: DELETE on ledger_entries blocked by trigger
TEST 3 PASS ✓: UPDATE on event_transitions blocked by trigger
TEST 4 PASS ✓: DELETE on event_transitions blocked by trigger
TEST 5 PASS ✓: INSERT on ledger_entries still works (append-only)
```

**When to run**:
- After initial schema deployment
- After modifying triggers
- Pre-deployment verification

---

### 3. verify-migrations.sql

**Purpose**: Verify database schema is correct

**Tests**:
- All required tables exist
- All required indexes exist
- All required enums exist
- All required functions exist
- RLS is enabled on all tables

**Expected output**:
```
✓ All 9 tables exist
✓ All 15 indexes exist
✓ All 3 enums exist
✓ All 3 RLS helper functions exist
✓ RLS enabled on all tables
```

**When to run**:
- After running migrations
- Before deploying to production
- When debugging schema issues

---

### 4. verify-rls-strict.sql

**Purpose**: Strict RLS verification (fails on any issue)

**Difference from verify-rls.sql**:
- Exits on first failure
- More detailed error messages
- Recommended for CI/CD pipelines

**When to run**:
- Automated testing
- Pre-deployment checks

---

### 5. verify-immutability-strict.sql

**Purpose**: Strict immutability verification

**When to run**:
- Automated testing
- Pre-deployment checks

---

### 6. verify-rls-sql-only.sql

**Purpose**: RLS verification without requiring service role

**Difference**: Uses SQL session variables instead of actual auth context

**When to run**:
- When service role not available
- Local testing

---

## Creating Test Data

Some scripts create test data. Use these UUIDs for consistency:

```sql
-- Test Chef A
INSERT INTO chefs (id, auth_user_id, business_name, email)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  '10000000-0000-0000-0000-000000000001'::uuid,
  'TEST: Chef A Business',
  'testchefa@example.com'
);

-- Test Chef B
INSERT INTO chefs (id, auth_user_id, business_name, email)
VALUES (
  '00000000-0000-0000-0000-000000000002'::uuid,
  '10000000-0000-0000-0000-000000000002'::uuid,
  'TEST: Chef B Business',
  'testchefb@example.com'
);
```

---

## Writing Custom Verification Scripts

### Template

```sql
-- ChefFlow V1 - Custom Verification Script
-- Purpose: Test [specific feature]

-- ============================================
-- SETUP
-- ============================================

-- Create test data
INSERT INTO ...

-- ============================================
-- TEST 1: [Description]
-- ============================================

DO $$
DECLARE
  result_count INT;
BEGIN
  -- Perform test
  SELECT COUNT(*) INTO result_count FROM ...;

  -- Check result
  IF result_count = 0 THEN
    RAISE NOTICE 'TEST 1 PASS ✓: [Success message]';
  ELSE
    RAISE NOTICE 'TEST 1 FAIL ✗: [Failure message]';
  END IF;
END $$;

-- ============================================
-- CLEANUP
-- ============================================

-- Delete test data
DELETE FROM ...;
```

---

## Automated Verification

### PowerShell Script (Windows)

**File**: `scripts/run_verification_all.ps1`

```powershell
# Run all verification scripts
Write-Host "Running RLS verification..."
psql $env:DATABASE_URL -f scripts/verify-rls.sql

Write-Host "Running immutability verification..."
psql $env:DATABASE_URL -f scripts/verify-immutability.sql

Write-Host "Running migration verification..."
psql $env:DATABASE_URL -f scripts/verify-migrations.sql

Write-Host "All verifications complete!"
```

**Usage**:
```powershell
.\scripts\run_verification_all.ps1
```

### Bash Script (Mac/Linux)

**File**: `scripts/run_verification_all.sh`

```bash
#!/bin/bash

echo "Running RLS verification..."
psql $DATABASE_URL -f scripts/verify-rls.sql

echo "Running immutability verification..."
psql $DATABASE_URL -f scripts/verify-immutability.sql

echo "Running migration verification..."
psql $DATABASE_URL -f scripts/verify-migrations.sql

echo "All verifications complete!"
```

**Usage**:
```bash
chmod +x scripts/run_verification_all.sh
./scripts/run_verification_all.sh
```

---

## CI/CD Integration (Future)

Example GitHub Actions workflow:

```yaml
# .github/workflows/verify.yml
name: Verify Database

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install PostgreSQL client
        run: sudo apt-get install postgresql-client
      - name: Run verification scripts
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          psql $DATABASE_URL -f scripts/verify-rls-strict.sql
          psql $DATABASE_URL -f scripts/verify-immutability-strict.sql
          psql $DATABASE_URL -f scripts/verify-migrations.sql
```

---

## Troubleshooting

### "psql: command not found"

Install PostgreSQL client:
```bash
# Mac
brew install postgresql

# Ubuntu/Debian
sudo apt-get install postgresql-client

# Windows
# Download from postgresql.org
```

### "Permission denied"

Ensure running as service role or with correct permissions.

### "Connection refused"

Check `DATABASE_URL` is correct and Supabase project is active.

---

## Related Documentation

- [TESTING.md](./TESTING.md) - Testing strategy
- [RLS_POLICIES.md](./RLS_POLICIES.md) - RLS reference
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Pre-deployment checklist

---

**Last Updated**: 2026-02-13
