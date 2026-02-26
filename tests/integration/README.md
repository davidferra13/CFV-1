# Integration Tests

Integration tests exercise server actions and database behavior without a browser.
They sit between unit tests (pure logic) and E2E tests (full browser flows).

## What belongs here

- Server actions called with real Supabase (remote, test-seeded data)
- Database constraint enforcement (UNIQUE, CHECK, FK RESTRICT)
- FSM transition validation at the DB trigger level
- Ledger idempotency (duplicate `transaction_reference` rejection)
- RLS policy verification (attempting cross-tenant reads)

## What does NOT belong here

- Browser interactions → use `tests/e2e/`
- Pure logic with no DB → use `tests/unit/`

## Running

```bash
# Requires SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL in .env.local
npm run test:integration
```

## Setup

Integration tests use a seeded Supabase remote instance.
Run `npm run seed:e2e` first to ensure seed data exists.

Environment requirements:

- `NEXT_PUBLIC_SUPABASE_URL` — remote project URL
- `SUPABASE_SERVICE_ROLE_KEY` — service role key for bypassing RLS in test setup
- `SUPABASE_E2E_ALLOW_REMOTE=true` — enables test-mode endpoints

## File naming

`*.integration.test.ts`
