# Database Blueprint Overview (V1)

The ChefFlow database is designed for tenant isolation, immutability, and ledger-first financial truth.

## Core Principles

1. **Tenant Isolation**: Every table scoped by tenant_id (or inherited via FK)
2. **RLS Enforced**: Row-level security on all tables (deny-by-default)
3. **Immutability**: Ledger and transitions are append-only
4. **Audit Trail**: Critical actions logged immutably
5. **Deterministic**: No ambiguous states or optional fields where critical

## Database Provider

**Supabase (PostgreSQL)**

- Managed PostgreSQL database
- Built-in RLS support
- Built-in Auth integration
- Real-time capabilities (not used in V1)

## Migration Strategy

**File-based migrations** in `supabase/migrations/`

- Timestamp-prefixed SQL files
- Applied via Supabase CLI
- Immutable (never edit after applied)

## Schema Organization

### Core Tables
- `chefs` — Tenant entities
- `user_roles` — User-to-tenant-role mapping
- `client_profiles` — Client records
- `events` — Event bookings
- `event_transitions` — Immutable lifecycle log
- `ledger_entries` — Immutable financial log

### Menu Tables
- `menu_templates` — Reusable menu drafts
- `event_menus` — Event-linked menus
- `menu_sections` — Menu sections
- `menu_items` — Menu items

### Invitation Tables
- `client_invites` — Invite tokens

See detailed table schemas in subsequent docs.
