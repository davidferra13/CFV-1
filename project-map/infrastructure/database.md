# Database

**What:** Local PostgreSQL via Docker. Direct TCP connection via postgres.js. Drizzle ORM for schema.

**Connection:** `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
**Key files:** `lib/db/index.ts`, `lib/db/compat.ts`, `lib/db/schema/`, `drizzle.config.ts`
**Status:** DONE (backup automation pending)

## What's Here

- PostgreSQL Docker container (`chefflow_postgres`, port 54322)
- 725 tables across 4 schema layers (foundation, inquiry/messaging, events/financials, menus/recipes)
- Drizzle ORM with auto-introspected schema
- Compat shim: `.from().select().eq()` API backed by raw SQL
- Immutable records: ledger_entries, event_transitions, quote_state_transitions
- Financial balances derived from ledger (never stored)
- Auto-generated types in `types/database.ts`

## Open Items

- Automated daily backups not yet implemented (spec ready)
- Request correlation/observability not yet wired
