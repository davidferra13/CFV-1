# RLS Test Matrix (V1)

## Test Scenarios

| Test | Expected Behavior |
|------|-------------------|
| Chef A queries events | Only sees tenant A events |
| Chef A queries with WHERE tenant_id = B | Zero rows (RLS blocks) |
| Chef A tries INSERT with tenant_id = B | Fails (RLS blocks) |
| Chef A tries UPDATE event owned by B | Zero rows affected |
| Client queries events table | Zero rows (no policy) |
| Client queries client_events view | Only sees their events |
| Service role queries events | Sees all events (RLS bypassed) |
| Unauthenticated query | Zero rows (auth.uid() is NULL) |

## Test Script

See `scripts/verify-rls.sql` for comprehensive SQL-only tests.

## Test Harness

See `scripts/verify-rls-harness.ts` for TypeScript test harness.

## Continuous Testing

RLS tests must pass before deployment:

```bash
npm run test:rls
```

If any test fails, deployment blocked.
