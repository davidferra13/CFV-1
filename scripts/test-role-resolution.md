# Role Resolution & Portal Isolation Testing

## Objective

Verify that:
1. Middleware blocks unauthorized access at network level
2. Layouts enforce role before rendering
3. No "flash of wrong portal" occurs
4. Redirects work correctly for cross-portal navigation

## Prerequisites

- Supabase project with migrations applied
- Environment variables configured in `.env.local`
- At least 2 test users:
  - 1 chef account
  - 1 client account

## Test Setup

### 1. Create Test Chef Account

```bash
# In Supabase Dashboard > Authentication > Users
# Or via API/CLI

Email: testchef@example.com
Password: TestPassword123!
```

After signup, verify `user_roles` table has entry:
```sql
SELECT * FROM user_roles WHERE auth_user_id = '<chef_auth_id>';
-- Should show: role='chef', entity_id=<chef_id>
```

### 2. Create Test Client Account

Chef must invite client first:
```sql
-- As service role or via chef portal when built
INSERT INTO client_invitations (tenant_id, email, token, expires_at, created_by)
VALUES (
  '<chef_id>',
  'testclient@example.com',
  'test-invitation-token-123',
  now() + interval '7 days',
  '<chef_auth_user_id>'
);
```

Then client signs up via invitation flow.

## Test Cases

### Test 1: Unauthenticated Access

**Steps:**
1. Open browser in incognito/private mode
2. Navigate to `http://localhost:3000/chef/dashboard`

**Expected:**
- Redirect to `/auth/signin?redirect=/chef/dashboard`
- No dashboard content visible
- No network requests to fetch dashboard data

**Verification:**
- Open DevTools > Network tab
- Confirm redirect happens BEFORE any dashboard API calls
- Check response status: should be 307 (Temporary Redirect)

**Result:** PASS / FAIL

---

### Test 2: Chef Accessing Client Portal

**Steps:**
1. Sign in as chef (`testchef@example.com`)
2. Navigate to `http://localhost:3000/client/my-events`

**Expected:**
- Immediate redirect to `/chef/dashboard`
- No client portal content renders
- No "flash" of client portal UI

**Verification:**
- Open DevTools > Network tab
- Watch for redirect response (307)
- Middleware should catch and redirect before page loads
- No React hydration of client portal components

**Result:** PASS / FAIL

---

### Test 3: Client Accessing Chef Portal

**Steps:**
1. Sign in as client (`testclient@example.com`)
2. Navigate to `http://localhost:3000/chef/dashboard`

**Expected:**
- Immediate redirect to `/client/my-events`
- No chef dashboard content renders
- No "flash" of chef portal UI

**Verification:**
- Open DevTools > Network tab
- Redirect happens at middleware level (before page render)
- No chef-specific data fetched

**Result:** PASS / FAIL

---

### Test 4: Correct Portal Access (Chef)

**Steps:**
1. Sign in as chef
2. Navigate to `/chef/dashboard`

**Expected:**
- Dashboard loads successfully
- User email displayed in header
- Tenant ID visible (for verification)
- No redirect occurs

**Verification:**
- Page renders without errors
- Check browser console for no auth errors
- Verify `getCurrentUser()` was called server-side

**Result:** PASS / FAIL

---

### Test 5: Correct Portal Access (Client)

**Steps:**
1. Sign in as client
2. Navigate to `/client/my-events`

**Expected:**
- My Events page loads successfully
- User email displayed in header
- No redirect occurs

**Verification:**
- Page renders without errors
- No auth errors in console

**Result:** PASS / FAIL

---

### Test 6: Direct URL Manipulation

**Steps:**
1. Sign in as chef
2. Use browser DevTools to modify session storage/cookies
3. Try to access `/client/my-events`

**Expected:**
- Middleware still blocks access
- Role is resolved from database (not session storage)
- Redirect to chef portal

**Verification:**
- Even with modified client state, server-side role check prevents access
- `user_roles` table is authoritative

**Result:** PASS / FAIL

---

### Test 7: No Flash of Wrong Portal (Visual Test)

**Steps:**
1. Sign in as chef
2. Navigate to `/client/my-events`
3. Watch screen closely during redirect

**Expected:**
- No visible client portal UI
- No text/images from client portal flash on screen
- Clean redirect (may show blank screen briefly)

**Verification:**
- Record screen or slow down CPU throttling in DevTools
- Check if any client portal components render before redirect
- Middleware should block at network level (no HTML sent)

**Result:** PASS / FAIL

---

### Test 8: Server Component Role Check

**Steps:**
1. Sign in as chef
2. View page source of `/chef/dashboard` (View > Source)

**Expected:**
- Server-rendered HTML contains chef dashboard content
- No client portal content in source
- Role was verified server-side before HTML generation

**Verification:**
- Right-click > View Page Source
- HTML should show chef-specific content
- Layout's `requireChef()` executed before render

**Result:** PASS / FAIL

---

## Summary

| Test | Description | Result |
|------|-------------|--------|
| 1    | Unauthenticated access blocked | [ ] |
| 2    | Chef cannot access client portal | [ ] |
| 3    | Client cannot access chef portal | [ ] |
| 4    | Chef can access chef portal | [ ] |
| 5    | Client can access client portal | [ ] |
| 6    | Direct URL manipulation blocked | [ ] |
| 7    | No flash of wrong portal | [ ] |
| 8    | Server component role check | [ ] |

**All tests must PASS before proceeding to Phase 2.**

## Defense in Depth Verification

Confirm all 3 layers are active:

1. **Middleware** (`middleware.ts`)
   - [ ] Checks authentication
   - [ ] Queries `user_roles` table
   - [ ] Redirects based on role

2. **Layout** (Server Component)
   - [ ] Calls `requireChef()` or `requireClient()`
   - [ ] Throws error if role mismatch
   - [ ] Redirects before rendering children

3. **RLS** (Database)
   - [ ] Policies enabled on all tables
   - [ ] Cross-tenant queries return empty
   - [ ] Tested via SQL scripts above

**If all 3 layers pass, System Law #2 is enforced. ✓**
