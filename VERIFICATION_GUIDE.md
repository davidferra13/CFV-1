# ChefFlow V1 - Strict Verification Guide (FINAL)

## Prerequisites

- Supabase account (free tier)
- Supabase CLI installed
- Node.js 20+ installed

---

## STEP 1: Install Supabase CLI

**macOS/Linux:**
```bash
brew install supabase/tap/supabase
```

**Windows (scoop):**
```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**npm (all platforms):**
```bash
npm install -g supabase
```

**Verify:**
```bash
supabase --version
```

---

## STEP 2: Create Supabase Project

1. Go to https://supabase.com
2. Sign in, click **New Project**
3. Name: `chefflow-v1`
4. Generate strong **Database Password** (save it!)
5. Select region
6. Click **Create new project** (wait 2-3 min)

---

## STEP 3: Link CLI to Project

```bash
cd c:/Users/david/Documents/CFv1

# Login
supabase login

# Link (opens browser for auth)
supabase link --project-ref <your-project-ref>
```

Get `<your-project-ref>` from: Settings > General > Project ID

**Expected:** `Linked to project chefflow-v1`

---

## STEP 4: Apply Migrations via CLI

```bash
supabase db push
```

**Expected PASS:**
```
Applying migration 20260213000001_initial_schema.sql...
Applying migration 20260213000002_rls_policies.sql...
Finished supabase db push.
```

**FAIL examples (STOP if you see these):**
```
ERROR: relation "chefs" already exists
→ Database not clean. Reset database (see STEP 8), then retry.

ERROR: syntax error at or near "CREATE"
→ Migration file corrupted. Check migration files.

ERROR: permission denied for schema public
→ CRITICAL. Database permissions broken. DO NOT CONTINUE.
```

**Verify migrations applied:**
```bash
supabase migration list
```

Both LOCAL and REMOTE columns should show migration timestamps.

---

## STEP 5: Install Verification Script Dependencies

```bash
cd scripts
npm install
cd ..
```

This installs:
- `@supabase/supabase-js` - For RLS harness
- `tsx` - To run TypeScript
- `dotenv` - To load .env.local

---

## STEP 6: Verification Test 1 - Migrations Applied Cleanly

```bash
supabase db execute --file scripts/verify-migrations.sql
```

**Expected PASS:**
```
       test        │              result
───────────────────┼──────────────────────────────────
 Tables Check      │ PASS ✓
 RLS Enabled Check │ PASS ✓
 Enums Check       │ PASS ✓
 Helper Functions  │ PASS ✓
 Immutability Trig │ PASS ✓
 Views Check       │ PASS ✓
```

**ALL rows must show "PASS ✓"**

**What FAIL means:**

| Test | Indicates | Impact |
|------|-----------|--------|
| Tables Check | Migration 001 incomplete | Missing core tables |
| RLS Enabled Check | RLS not enabled | **SECURITY BREACH** |
| Enums Check | Event status missing | State machine broken |
| Helper Functions | RLS helpers missing | Policies can't work |
| Immutability Triggers | Triggers missing | **AUDIT TRAIL MUTABLE** |
| Views Check | Financial view missing | Can't compute balances |

**If ANY test shows FAIL, STOP.**

**Capture output:**
```bash
supabase db execute --file scripts/verify-migrations.sql > verification-1-migrations.txt
cat verification-1-migrations.txt
```

**Status:** ☐ PASS ☐ FAIL

---

## STEP 7: Verification Test 2 - RLS Multi-Tenant Isolation (REAL TEST)

**CRITICAL:** This uses a Node.js harness with REAL Supabase clients (not SQL simulation).

### 7.1 Run RLS Harness

```bash
cd scripts
npx tsx verify-rls-harness.ts
```

Or from project root:
```bash
node scripts/verify-rls-harness.ts
```

### 7.2 Expected PASS Output

```
ChefFlow V1 - RLS Verification Harness
==================================================

🧹 Cleaning up existing test data...
✓ Cleanup complete

🌱 Seeding test data (service role)...
✓ Test data seeded

🧪 Running RLS verification tests...

TEST 1: Anon client access to events (should be denied)
  ✅ PASS: Anon client got 0 rows (RLS deny-by-default working)

TEST 2: Anon client access to ledger_entries (should be denied)
  ✅ PASS: Anon client got 0 rows (RLS deny-by-default working)

TEST 3: Anon client access to menus (should be denied)
  ✅ PASS: Anon client got 0 rows (RLS deny-by-default working)

TEST 4: Anon client access to clients (should be denied)
  ✅ PASS: Anon client got 0 rows (RLS deny-by-default working)

TEST 5: Service role access to events (should succeed)
  ✅ PASS: Service role got 2 rows (can bypass RLS)

TEST 6: Service role access to ledger_entries (should succeed)
  ✅ PASS: Service role got 2 rows (can bypass RLS)

TEST 7: Service role can INSERT ledger entries (for webhooks)
  ✅ PASS: Service role can insert ledger entries

==================================================
RLS VERIFICATION SUMMARY
==================================================
✅ ALL TESTS PASSED
   - RLS is enabled and enforcing deny-by-default
   - Anon key cannot access data
   - Service role can bypass RLS for webhooks

✅ READY FOR PHASE 2
```

**Exit code: 0**

### 7.3 FAIL Output Example

```
TEST 1: Anon client access to events (should be denied)
  ❌ FAIL: Anon client got 2 rows (RLS BROKEN - should be 0)

TEST 2: Anon client access to ledger_entries (should be denied)
  ✅ PASS: Anon client got 0 rows (RLS deny-by-default working)

...

==================================================
RLS VERIFICATION SUMMARY
==================================================
❌ TESTS FAILED: 1 failure(s)
   - RLS is NOT properly enforced
   - DO NOT PROCEED to Phase 2

❌ CRITICAL SECURITY ISSUE
```

**Exit code: 1 (non-zero)**

### 7.4 What Each FAIL Means

| Test | FAIL Indicates | Impact |
|------|----------------|--------|
| TEST 1-4 (Anon gets > 0 rows) | **CRITICAL SECURITY BREACH** | RLS policies missing or broken. Unauthenticated users can read tenant data. |
| TEST 5-6 (Service role gets 0 rows) | Service role bypass broken | Webhooks will fail. Cannot append ledger entries from Stripe. |
| TEST 7 (Service role INSERT fails) | Service role cannot write | Webhooks cannot record payments. System is read-only. |

**If ANY test fails, STOP. This is a BLOCKING SECURITY ISSUE.**

### 7.5 Capture Output

```bash
node scripts/verify-rls-harness.ts 2>&1 | tee verification-2-rls.txt
cat verification-2-rls.txt
```

**Status:** ☐ PASS ☐ FAIL

---

## STEP 8: Verification Test 3 - Immutability Enforcement

```bash
supabase db execute --file scripts/verify-immutability-strict.sql
```

**Expected PASS:**
```
NOTICE:  TEST 1 PASS ✓: UPDATE on ledger_entries blocked by trigger
NOTICE:  TEST 2 PASS ✓: DELETE on ledger_entries blocked by trigger
NOTICE:  TEST 3 PASS ✓: UPDATE on event_transitions blocked by trigger
NOTICE:  TEST 4 PASS ✓: DELETE on event_transitions blocked by trigger
NOTICE:  TEST 5 PASS ✓: INSERT on ledger_entries still works (append-only)
NOTICE:  TEST 6 PASS ✓: Original ledger entry unchanged (amount still 50000)
NOTICE:
NOTICE:  === IMMUTABILITY VERIFICATION SUMMARY ===
NOTICE:  ALL TESTS PASSED ✓ (Ledger and transitions are immutable)

 immutability_verification_status
──────────────────────────────────
 PASS ✓
```

**FAIL example:**
```
NOTICE:  TEST 1 FAIL ✗: UPDATE on ledger_entries succeeded (trigger not working)
...
ERROR:  Immutability verification failed - AUDIT TRAIL COMPROMISED
```

**What each FAIL means:**

| Test | Indicates | Impact |
|------|-----------|--------|
| TEST 1 | UPDATE allowed on ledger | **AUDIT TRAIL COMPROMISED** - Financial records can be altered |
| TEST 2 | DELETE allowed on ledger | **HISTORY ERASABLE** - Cannot reconcile with Stripe |
| TEST 3 | UPDATE allowed on transitions | **EVENT HISTORY MUTABLE** - Cannot prove status changes |
| TEST 4 | DELETE allowed on transitions | **AUDIT LOG ERASABLE** |
| TEST 5 | INSERT blocked | Append-only broken - cannot record events |
| TEST 6 | Entry modified | Trigger executed but failed to prevent change |

**If ANY test fails, STOP. System Law #3 violated.**

**Capture output:**
```bash
supabase db execute --file scripts/verify-immutability-strict.sql 2>&1 | tee verification-3-immutability.txt
cat verification-3-immutability.txt
```

**Status:** ☐ PASS ☐ FAIL

---

## STEP 9: Database Reset (If Needed)

**Only reset if:**
- `supabase db push` shows "relation already exists"
- Verification tests fail and you suspect corruption
- You made manual SQL changes

**How to reset:**

1. Supabase Dashboard > Settings > Database
2. Scroll to **Danger Zone**
3. Click **Reset Database**
4. Confirm by typing project name
5. Wait 1-2 minutes

**Then re-apply:**
```bash
supabase db push
```

Re-run all verifications (Steps 6, 7, 8).

---

## STEP 10: Clean Up Test Data

```bash
supabase db execute --sql "
DELETE FROM event_transitions WHERE tenant_id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid);
DELETE FROM ledger_entries WHERE tenant_id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid);
DELETE FROM events WHERE tenant_id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid);
DELETE FROM menus WHERE tenant_id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid);
DELETE FROM clients WHERE tenant_id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid);
DELETE FROM user_roles WHERE entity_id IN (SELECT id FROM chefs WHERE id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid));
DELETE FROM chefs WHERE id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid);
"
```

---

## STEP 11: Summary Checklist

**Copy your results:**

```
☐ PASS - Test 1: Migrations applied (all 6 checks pass)
☐ PASS - Test 2: RLS isolation (all 7 tests pass, exit code 0)
☐ PASS - Test 3: Immutability (all 6 tests pass)
```

**Attach output files:**
1. `verification-1-migrations.txt`
2. `verification-2-rls.txt`
3. `verification-3-immutability.txt`

---

## STEP 12: Conditional Approval

### ALL PASS = Proceed to Phase 2

If all verifications PASS, I will implement **Phase 2 (Business Logic)**:

1. Event CRUD (server actions, tenant-scoped)
2. Lifecycle transitions (finite state machine)
3. Ledger writer (append-only)
4. Stripe webhooks (idempotent)
5. Client payment UI (minimal)

### ANY FAIL = STOP

Share the failure output. I will:
1. Analyze the specific failure
2. Fix migration/policy/trigger
3. Create corrective migration
4. You re-run verification from STEP 4

---

## READY TO VERIFY

Execute in order:

```bash
# 1. Verify Supabase CLI
supabase --version

# 2. Login and link
supabase login
supabase link --project-ref <your-project-ref>

# 3. Push migrations
supabase db push

# 4. Verify migration history
supabase migration list

# 5. Install verification dependencies
cd scripts && npm install && cd ..

# 6. Run Test 1: Migrations
supabase db execute --file scripts/verify-migrations.sql > verification-1-migrations.txt

# 7. Run Test 2: RLS (REAL test with Supabase clients)
node scripts/verify-rls-harness.ts 2>&1 | tee verification-2-rls.txt

# 8. Run Test 3: Immutability
supabase db execute --file scripts/verify-immutability-strict.sql 2>&1 | tee verification-3-immutability.txt

# 9. Show outputs
cat verification-1-migrations.txt
cat verification-2-rls.txt
cat verification-3-immutability.txt
```

**Paste all outputs. I will not proceed to Phase 2 until you confirm ALL PASS.**

---

## Common Errors

| Error | Solution |
|-------|----------|
| `supabase: command not found` | Re-run CLI installation (Step 1) |
| `Error: invalid project ref` | Verify project ID in dashboard |
| `ERROR: relation already exists` | Reset database (Step 9), re-push |
| `permission denied for schema` | **CRITICAL** - Contact Supabase support |
| `RLS verification failed` | Share output, I will fix policies |
| `Immutability verification failed` | Share output, I will fix triggers |
| `Cannot find module` | Run `npm install` in scripts/ |

---

**NO FALSE CONFIDENCE. Real tests only. Strict verification.**
