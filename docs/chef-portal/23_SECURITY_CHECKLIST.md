# Security Checklist (V1)

## Pre-Deployment Security Verification

### 1. RLS Enabled

```sql
-- Verify RLS is enabled on all tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false;
-- Should return 0 rows
```

---

### 2. No Hardcoded Secrets

```bash
# Search for potential secrets
grep -r "sk_live_" .
grep -r "pk_live_" .
grep -r "password" .env
```

---

### 3. Environment Variables

```bash
# Required vars
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
```

---

### 4. HTTPS Only

```typescript
if (process.env.NODE_ENV === 'production' && !req.url.startsWith('https://')) {
  throw new Error('HTTPS required in production');
}
```

---

### 5. Middleware Protection

```typescript
// middleware.ts enforces role on all routes
export function middleware(request: NextRequest) {
  const role = await getUserRole(request);
  const path = request.nextUrl.pathname;

  if (path.startsWith('/chef') && role !== 'chef') {
    return NextResponse.redirect('/unauthorized');
  }
}
```

---

### 6. Private Notes Excluded

```typescript
// Verify client queries never include chef_private_notes
await db.client_profiles.findUnique({
  select: {
    // chef_private_notes: MUST BE EXCLUDED
  },
});
```

---

**End of Security Checklist**
