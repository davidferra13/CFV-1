# Public Layer - Environment Requirements

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Required Environment Variables

```env
# Supabase (Public)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase (Private - Server-side only)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# App URL
NEXT_PUBLIC_URL=https://chefflow.app
```

---

## Verification

```bash
# Check public vars are accessible
echo $NEXT_PUBLIC_SUPABASE_URL

# Check private vars are NOT in client bundle
grep -r "SERVICE_ROLE" .next/static/
# Should return ZERO results
```

---

**Status**: LOCKED for V1.
