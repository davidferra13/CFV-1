# Testing Strategy and Procedures

**Version**: 1.0
**Last Updated**: 2026-02-13
**Status**: Locked per CHEFFLOW_V1_SCOPE_LOCK.md

This document outlines the testing strategy, procedures, and verification checklist for ChefFlow V1.

---

## Table of Contents

1. [Overview](#overview)
2. [Testing Layers](#testing-layers)
3. [Manual Testing](#manual-testing)
4. [Database Verification](#database-verification)
5. [Security Testing](#security-testing)
6. [Payment Testing](#payment-testing)
7. [Pre-Deployment Checklist](#pre-deployment-checklist)

---

## Overview

ChefFlow V1 testing focuses on **manual testing** and **database verification scripts** to ensure System Laws are enforced.

### Testing Priorities

1. **Security**: Multi-tenant isolation, RLS, authentication
2. **Financial**: Ledger immutability, payment flow, idempotency
3. **Lifecycle**: Event transitions, terminal states
4. **User flows**: End-to-end chef and client journeys

---

## Testing Layers

### Layer 1: Database Verification

SQL scripts verify database constraints:

- `verify-rls.sql` - Multi-tenant isolation
- `verify-immutability.sql` - Ledger/transition immutability
- `verify-migrations.sql` - Schema correctness

See [SCRIPTS_REFERENCE.md](./SCRIPTS_REFERENCE.md).

### Layer 2: Manual Flow Testing

Human testing of complete user journeys:

- Chef signup → create event → invite client → propose
- Client signup → accept → pay → view receipt
- Webhook → ledger → status transition

### Layer 3: Automated Testing (Future)

Planned for post-V1:

- Unit tests (Jest/Vitest)
- Integration tests (Playwright)
- E2E tests (Cypress/Playwright)

---

## Manual Testing

### Chef Flow Test

**Prerequisites**: Clean database, test Stripe keys configured

**Steps**:

1. **Chef Signup**
   - [ ] Go to `/auth/signup`
   - [ ] Enter email, password, business name
   - [ ] Submit form
   - [ ] Verify redirect to `/chef/dashboard`
   - [ ] Check Supabase Auth → Users (new user exists)
   - [ ] Check `chefs` table (record created)
   - [ ] Check `user_roles` table (role = 'chef')

2. **Create Event**
   - [ ] Navigate to `/chef/events/new`
   - [ ] Fill event form (title, date, guests, location, pricing)
   - [ ] Submit
   - [ ] Verify event appears in list
   - [ ] Check status is `draft`

3. **Invite Client**
   - [ ] Navigate to `/chef/clients/invite`
   - [ ] Enter client email
   - [ ] Submit
   - [ ] Copy invitation URL (or check `client_invitations` table for token)
   - [ ] Verify invitation record created

4. **Propose Event**
   - [ ] Navigate to event details
   - [ ] Click "Propose to Client"
   - [ ] Verify status transitions to `proposed`
   - [ ] Check `event_transitions` table (transition logged)

### Client Flow Test

**Prerequisites**: Chef has created event and sent invitation

**Steps**:

1. **Client Signup**
   - [ ] Open invitation URL from chef
   - [ ] Verify email is pre-filled
   - [ ] Enter password
   - [ ] Submit
   - [ ] Verify redirect to `/client/my-events`
   - [ ] Check `clients` table (record created with correct `tenant_id`)
   - [ ] Check `user_roles` table (role = 'client')
   - [ ] Check `client_invitations` table (`used_at` populated)

2. **View Proposed Event**
   - [ ] See event in "My Events" list
   - [ ] Verify status is `proposed`
   - [ ] Click to view details

3. **Accept Event**
   - [ ] Click "Accept Event"
   - [ ] Verify status transitions to `accepted`
   - [ ] Check `event_transitions` table

4. **Make Payment**
   - [ ] Click "Pay Deposit"
   - [ ] Enter test card: `4242 4242 4242 4242`
   - [ ] Expiry: any future date (e.g., `12/34`)
   - [ ] CVC: any 3 digits (e.g., `123`)
   - [ ] Submit payment
   - [ ] Wait for Stripe to process

5. **Verify Webhook**
   - [ ] Check Vercel/local logs for webhook received
   - [ ] Check `ledger_entries` table (entry created)
   - [ ] Verify `entry_type` = `charge_succeeded`
   - [ ] Verify `amount_cents` matches deposit
   - [ ] Check event status transitioned to `paid`

6. **View Receipt**
   - [ ] Navigate to event details
   - [ ] Verify payment status shows "Paid"
   - [ ] Verify ledger entry visible

---

## Database Verification

### Run Verification Scripts

**Location**: `scripts/`

**How to run**:

1. Open Supabase SQL Editor
2. Copy script contents
3. Run as service role
4. Check output for PASS/FAIL

### RLS Verification

**Script**: `verify-rls.sql`

**Tests**:
- Chef A cannot see Chef B's events
- Client A1 cannot see Client A2's events
- Service role can see all

**Expected output**:
```
TEST 1 PASS ✓: Chef A cannot see Chef B events (blocked by RLS)
TEST 2 PASS ✓: Client A1 cannot see Client A2 events (blocked by RLS)
TEST 3: Service Role Access - PASS ✓: Service role sees all 3 test events
```

### Immutability Verification

**Script**: `verify-immutability.sql`

**Tests**:
- UPDATE on ledger_entries fails
- DELETE on ledger_entries fails
- UPDATE on event_transitions fails
- DELETE on event_transitions fails
- INSERT still works (append-only)

**Expected output**:
```
TEST 1 PASS ✓: UPDATE on ledger_entries blocked by trigger
TEST 2 PASS ✓: DELETE on ledger_entries blocked by trigger
TEST 3 PASS ✓: UPDATE on event_transitions blocked by trigger
TEST 4 PASS ✓: DELETE on event_transitions blocked by trigger
TEST 5 PASS ✓: INSERT on ledger_entries still works (append-only)
```

---

## Security Testing

### Multi-Tenant Isolation

**Test**: Chef A cannot access Chef B's data

**Manual check**:
1. Signup as Chef A
2. Create event
3. Note event ID
4. Signup as Chef B (different browser/incognito)
5. Try to access Chef A's event URL directly
6. Verify: Empty result or 404 (RLS blocks)

**Automated check**: Run `verify-rls.sql`

### Role Escalation Prevention

**Test**: User cannot modify their own role

**Manual check**:
1. Signup as client
2. Open browser dev tools → Network
3. Try to call Supabase API to update `user_roles` table
4. Verify: RLS blocks (no UPDATE policy for users)

**SQL check**:
```sql
-- Try to update own role (should fail)
UPDATE user_roles
SET role = 'chef'
WHERE auth_user_id = auth.uid();
-- Error: no policy
```

### Cross-Portal Access

**Test**: Chef cannot access `/client/*` routes

**Manual check**:
1. Login as chef
2. Navigate to `/client/my-events`
3. Verify: Middleware redirects to `/chef/dashboard`
4. Check network tab: No HTML sent for client portal

Repeat reverse test (client → `/chef/dashboard`).

---

## Payment Testing

### Test Cards

Use Stripe test cards:

| Card Number         | Scenario       |
|---------------------|----------------|
| 4242 4242 4242 4242 | Success        |
| 4000 0000 0000 0002 | Card declined  |
| 4000 0025 0000 3155 | 3D Secure auth |

### Payment Flow Test

1. **Create PaymentIntent**
   - [ ] Client accepts event
   - [ ] Click "Pay"
   - [ ] Verify Stripe Elements loads
   - [ ] Check network: `POST /api/create-payment-intent`
   - [ ] Verify `clientSecret` returned

2. **Submit Payment**
   - [ ] Enter test card
   - [ ] Submit
   - [ ] Wait for Stripe confirmation

3. **Webhook Delivery**
   - [ ] Check webhook logs (Stripe Dashboard or local CLI)
   - [ ] Verify `payment_intent.succeeded` received
   - [ ] Check Vercel/local logs for webhook handler

4. **Ledger Entry**
   - [ ] Query `ledger_entries` table
   - [ ] Verify entry exists with:
     - `entry_type` = `charge_succeeded`
     - `amount_cents` = payment amount
     - `stripe_event_id` = webhook event ID
     - `event_id` = event UUID

5. **Status Transition**
   - [ ] Query `events` table
   - [ ] Verify `status` = `paid`
   - [ ] Query `event_transitions` table
   - [ ] Verify transition from `accepted` → `paid` exists

### Idempotency Test

**Test**: Duplicate webhooks don't create duplicate ledger entries

**Steps**:
1. Trigger payment (Stripe test card)
2. Note webhook event ID from logs
3. Replay webhook (use Stripe CLI or Dashboard)
   ```bash
   stripe events resend evt_xxx
   ```
4. Check `ledger_entries` table
5. Verify: Only ONE entry (UNIQUE constraint on `stripe_event_id`)

**Expected behavior**: Second webhook returns 200 OK but doesn't insert.

### Refund Test

1. **Process Refund**
   - [ ] Login as chef
   - [ ] Navigate to paid event
   - [ ] Click "Cancel & Refund"
   - [ ] Enter reason
   - [ ] Submit

2. **Stripe Refund**
   - [ ] Check Stripe Dashboard
   - [ ] Verify refund created

3. **Webhook**
   - [ ] Wait for `charge.refunded` webhook
   - [ ] Check webhook logs

4. **Ledger Entry**
   - [ ] Query `ledger_entries` table
   - [ ] Verify negative entry:
     - `entry_type` = `refund_succeeded`
     - `amount_cents` = negative value

5. **Balance**
   - [ ] Query `event_financial_summary` view
   - [ ] Verify `collected_cents` reduced by refund amount

---

## Pre-Deployment Checklist

From `CHEFFLOW_V1_SCOPE_LOCK.md`:

### Security
- [ ] RLS enabled on all tables
- [ ] Multi-tenant isolation verified (Chef A cannot see Chef B)
- [ ] Role resolution is authoritative (queries `user_roles`)
- [ ] Middleware blocks wrong portal access
- [ ] Service role key only used server-side

### Financial
- [ ] Ledger entries are immutable (triggers block UPDATE/DELETE)
- [ ] Amounts stored in cents (no DECIMAL types)
- [ ] Webhook idempotency works (duplicate event test)
- [ ] Balances computed from ledger (no balance columns on events)
- [ ] Stripe reconciliation matches (manual dashboard check)

### Lifecycle
- [ ] Invalid transitions blocked (attempt `draft` → `confirmed`)
- [ ] Permission checks work (client cannot confirm event)
- [ ] Audit log complete (all transitions logged)
- [ ] Terminal states are terminal (cannot transition from `completed`)

### Portal Isolation
- [ ] No "flash of wrong portal" (network tab shows redirect)
- [ ] Layout blocks before client code (view-source check)
- [ ] RLS prevents data leak (queries return empty, not wrong data)

### End-to-End
- [ ] Full chef flow works (create → invite → propose)
- [ ] Full client flow works (signup → accept → pay)
- [ ] Payment flow works (Stripe → webhook → ledger → transition)
- [ ] Invitation flow works (invite → email → signup → access)

---

## Automated Tests (Future)

Placeholder for post-V1:

```typescript
// tests/auth/role-resolution.test.ts
import { describe, it, expect } from '@jest/globals'
import { getCurrentUser } from '@/lib/auth/get-user'

describe('Role Resolution', () => {
  it('should resolve chef role', async () => {
    const user = await getCurrentUser()
    expect(user?.role).toBe('chef')
  })
})
```

---

## Related Documentation

- [VERIFICATION_GUIDE.md](./VERIFICATION_GUIDE.md) - Comprehensive testing guide
- [SCRIPTS_REFERENCE.md](./SCRIPTS_REFERENCE.md) - Verification scripts
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment checklist

---

**Last Updated**: 2026-02-13
**Maintained By**: ChefFlow V1 Team
