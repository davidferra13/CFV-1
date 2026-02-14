# Troubleshooting Common Issues

**Version**: 1.0
**Last Updated**: 2026-02-13

Solutions to common problems in ChefFlow V1 development and deployment.

---

## Table of Contents

1. [Authentication Issues](#authentication-issues)
2. [Database Issues](#database-issues)
3. [Payment Issues](#payment-issues)
4. [Build/Deployment Issues](#builddeployment-issues)
5. [RLS/Permission Issues](#rlspermission-issues)

---

## Authentication Issues

### Cannot Login

**Symptom**: User enters correct credentials but stays on login page

**Causes**:
- Supabase project paused (free tier)
- Wrong environment variables
- Email not confirmed (if email confirmation enabled)

**Solutions**:
1. Check Supabase project status (dashboard)
2. Verify `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
   ```
3. Check Supabase Auth → Users (user exists?)
4. Disable email confirmation (Auth → Settings)

### Redirected to Wrong Portal

**Symptom**: Chef redirected to `/client/my-events` or vice versa

**Cause**: No role assigned in `user_roles` table

**Solution**:
1. Check `user_roles` table:
   ```sql
   SELECT * FROM user_roles WHERE auth_user_id = 'user-id';
   ```
2. If missing, create manually (use service role):
   ```sql
   INSERT INTO user_roles (auth_user_id, role, entity_id)
   VALUES ('user-id', 'chef', 'chef-id');
   ```

### "Unauthorized" Error in API

**Symptom**: Server functions throw "Unauthorized"

**Cause**: Not calling `requireChef()` or `requireClient()` properly

**Solution**:
```typescript
// Correct
export async function myAction() {
  const chef = await requireChef() // Throws if not chef
  // ...
}

// Wrong
export async function myAction() {
  const user = await getCurrentUser()
  // User could be null or wrong role
}
```

---

## Database Issues

### RLS Blocks All Queries

**Symptom**: Queries return empty results even with correct data

**Cause**: Missing or incorrect RLS policies

**Solution**:
1. Check if RLS enabled:
   ```sql
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public';
   ```
2. Verify policies exist:
   ```sql
   SELECT * FROM pg_policies WHERE schemaname = 'public';
   ```
3. Re-run RLS migration: `20260213000002_rls_policies.sql`

### Cannot Update/Delete Ledger

**Symptom**: Error: "Ledger entries are immutable"

**Cause**: Immutability triggers (intentional)

**Solution**: This is correct behavior! Use adjustment entries:
```typescript
await appendLedgerEntry({
  entry_type: 'adjustment',
  amount_cents: 1000,
  description: 'Correction for...'
})
```

### Foreign Key Violation

**Symptom**: Error: "violates foreign key constraint"

**Cause**: Referencing non-existent record

**Solution**:
1. Verify referenced record exists
2. Check tenant_id matches (for client → event)

---

## Payment Issues

### Webhook Not Received

**Symptom**: Payment succeeds in Stripe but event not updated

**Causes**:
- Webhook endpoint not configured
- Wrong webhook secret
- Endpoint not publicly accessible

**Solutions**:
1. **Check Stripe Dashboard** → Webhooks → Event delivery
2. **Verify endpoint URL**: `https://yourdomain.com/api/webhooks/stripe`
3. **Check logs** in Vercel or local terminal
4. **Verify webhook secret**:
   ```bash
   # .env.local
   STRIPE_WEBHOOK_SECRET=whsec_... # Must match Stripe
   ```
5. **Local testing**: Use Stripe CLI
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

### Duplicate Ledger Entries

**Symptom**: Multiple entries for same Stripe event

**Cause**: Idempotency logic broken

**Solution**:
1. Check `stripe_event_id` is UNIQUE in schema
2. Verify idempotency logic:
   ```typescript
   const { error } = await supabase
     .from('ledger_entries')
     .insert({ stripe_event_id: event.id, ... })

   if (error?.code === '23505') {
     // Duplicate - return success
     return { success: true }
   }
   ```

### Balance Mismatch

**Symptom**: Event balance doesn't match Stripe

**Cause**: Missing or incorrect ledger entry

**Solution**:
1. Query ledger entries for event:
   ```sql
   SELECT * FROM ledger_entries WHERE event_id = 'event-id';
   ```
2. Compare with Stripe Dashboard
3. If missing: Check webhook logs for failures
4. Manually create entry if needed (service role):
   ```sql
   INSERT INTO ledger_entries (...)
   VALUES (...);
   ```

---

## Build/Deployment Issues

### TypeScript Errors

**Symptom**: `npm run build` fails with type errors

**Causes**:
- Types out of sync with database
- Missing type imports

**Solutions**:
1. **Regenerate types**:
   ```bash
   npx supabase gen types typescript --project-id xxxxx > types/database.ts
   ```
2. **Check imports**:
   ```typescript
   import type { Database } from '@/types/database'
   ```

### Environment Variables Not Loaded

**Symptom**: Undefined env vars in production

**Causes**:
- Not added to Vercel
- Typo in variable name

**Solutions**:
1. **Check Vercel**: Settings → Environment Variables
2. **Redeploy** after adding vars (required!)
3. **Verify name matches**:
   ```typescript
   process.env.NEXT_PUBLIC_SUPABASE_URL // Correct
   process.env.SUPABASE_URL // Wrong
   ```

### Build Succeeds Locally, Fails on Vercel

**Cause**: Missing dependencies or env vars

**Solution**:
1. Check Vercel build logs
2. Verify all deps in `package.json`
3. Check for hardcoded localhost URLs

---

## RLS/Permission Issues

### Client Can See Other Clients' Data

**Symptom**: RLS not working

**Cause**: RLS policy incorrect or missing

**Solution**:
1. Run verification script: `verify-rls.sql`
2. Check policy:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'events';
   ```
3. Expected:
   ```sql
   CREATE POLICY events_client_select ON events
     FOR SELECT
     USING (
       get_current_user_role() = 'client' AND
       client_id = get_current_client_id()
     );
   ```

### Chef Can See Other Tenants' Data

**Symptom**: Multi-tenant isolation broken

**Cause**: Missing `tenant_id` filter in policy

**Solution**:
Verify policy includes tenant check:
```sql
USING (
  get_current_user_role() = 'chef' AND
  tenant_id = get_current_tenant_id() -- This line required!
)
```

---

## Common Error Messages

### "Invalid JWT"

**Cause**: Session expired or malformed cookie

**Solution**: Clear cookies and re-login

### "Unique constraint violation"

**Cause**: Duplicate entry (e.g., duplicate email)

**Solution**: Check for existing record before insert

### "Failed to fetch"

**Cause**: Network issue or Supabase project paused

**Solution**: Check Supabase dashboard, verify project active

---

## Getting Help

If issue persists:

1. **Check logs**:
   - Vercel: Deployments → Functions
   - Supabase: SQL Editor → Run verification scripts
   - Browser: Dev Tools → Console

2. **Verify basics**:
   - Environment variables set
   - Database migrations run
   - RLS enabled

3. **Search docs**:
   - [CHEFFLOW_V1_SCOPE_LOCK.md](./CHEFFLOW_V1_SCOPE_LOCK.md)
   - [ARCHITECTURE.md](./ARCHITECTURE.md)
   - [API_REFERENCE.md](./API_REFERENCE.md)

---

**Last Updated**: 2026-02-13
