# Database Migration Procedures

**Version**: 1.0
**Last Updated**: 2026-02-13

Guide for creating and running database migrations in ChefFlow V1.

---

## Overview

ChefFlow V1 uses **SQL migration files** stored in `supabase/migrations/`. Migrations are run manually in Supabase SQL Editor.

**No ORM**: ChefFlow does not use Prisma, Drizzle, or similar tools.

---

## Migration Files

### Location

```
supabase/
└── migrations/
    ├── 20260213000001_initial_schema.sql
    └── 20260213000002_rls_policies.sql
```

### Naming Convention

```
YYYYMMDDHHMMSS_description.sql
```

**Examples**:
- `20260213000001_initial_schema.sql`
- `20260213120000_add_notes_to_clients.sql`
- `20260214093000_create_event_tags_table.sql`

**Components**:
- `YYYYMMDD`: Date (e.g., `20260213` = Feb 13, 2026)
- `HHMMSS`: Time (e.g., `000001` = 00:00:01)
- `_description`: Lowercase with underscores

---

## Existing Migrations

### 20260213000001_initial_schema.sql

**Purpose**: Create all tables, enums, indexes, triggers

**Contents**:
- Enums: `user_role`, `event_status`, `ledger_entry_type`
- Tables: `chefs`, `clients`, `user_roles`, `client_invitations`, `events`, `event_transitions`, `ledger_entries`, `menus`, `event_menus`
- Indexes: All primary/foreign key indexes
- Triggers: `updated_at` triggers, immutability triggers
- Views: `event_financial_summary`

### 20260213000002_rls_policies.sql

**Purpose**: Enable RLS and create all policies

**Contents**:
- Helper functions: `get_current_user_role()`, `get_current_tenant_id()`, `get_current_client_id()`
- Enable RLS on all tables
- Policies for each table (chef, client, public access)

---

## Creating New Migrations

### Step 1: Create File

```bash
# Generate timestamp
date +%Y%m%d%H%M%S
# Output: 20260214120000

# Create file
touch supabase/migrations/20260214120000_add_notes_to_clients.sql
```

### Step 2: Write SQL

```sql
-- ChefFlow V1 - Migration: Add notes to clients
-- Date: 2026-02-14
-- Purpose: Allow chefs to add internal notes about clients

BEGIN;

-- Add column
ALTER TABLE clients ADD COLUMN notes TEXT;

-- Add comment
COMMENT ON COLUMN clients.notes IS 'Internal notes (chef-only, not visible to client)';

-- Update RLS policy (if needed)
-- None required - existing policies cover new column

COMMIT;
```

### Step 3: Test Locally

1. Run migration on local/staging Supabase
2. Verify schema changed
3. Test application still works
4. Run verification scripts

### Step 4: Document

Add to this file and CHANGELOG.md.

---

## Running Migrations

### Development/Staging

1. Go to Supabase project → SQL Editor
2. Click "New Query"
3. Copy migration SQL
4. Click "Run"
5. Verify success (green checkmark, no errors)

### Production

**Pre-flight checklist**:
- [ ] Tested on staging
- [ ] Backup exists (Supabase auto-backups)
- [ ] Migration is additive (no breaking changes)
- [ ] Rollback plan ready

**Steps**:
1. Announce downtime (if needed)
2. Run migration in production SQL Editor
3. Verify schema changes
4. Run verification scripts
5. Regenerate TypeScript types
6. Deploy application (if code changes needed)

---

## Migration Best Practices

### Use Transactions

Wrap in `BEGIN`/`COMMIT`:

```sql
BEGIN;

ALTER TABLE ...;
CREATE INDEX ...;

COMMIT;
```

**Benefit**: Automatic rollback on error

### Additive Only

V1 migrations should be **additive** (non-breaking):

```sql
-- Good (additive)
ALTER TABLE clients ADD COLUMN phone TEXT;

-- Bad (breaking)
ALTER TABLE clients DROP COLUMN email;
```

### Index Concurrently

For large tables, create indexes concurrently:

```sql
CREATE INDEX CONCURRENTLY idx_events_status ON events(status);
```

**Note**: Cannot use in transaction block

### Comment Everything

```sql
COMMENT ON TABLE clients IS 'Customer records (multi-tenant scoped)';
COMMENT ON COLUMN clients.notes IS 'Internal notes about client';
```

---

## Rolling Back Migrations

### Method 1: Manual Rollback

Create "down" migration:

```sql
-- 20260214120000_add_notes_to_clients.sql (UP)
ALTER TABLE clients ADD COLUMN notes TEXT;

-- 20260214120001_remove_notes_from_clients.sql (DOWN)
ALTER TABLE clients DROP COLUMN notes;
```

### Method 2: Restore from Backup

If migration causes issues:

1. Go to Supabase → Database → Backups
2. Select backup before migration
3. Click "Restore"
4. Wait for restore (5-15 minutes)

**Note**: Restores entire database (loses data since backup)

---

## After Running Migration

### 1. Regenerate Types

```bash
npx supabase gen types typescript --project-id xxxxx > types/database.ts
```

### 2. Update Application Code

If migration adds columns, update:
- TypeScript types (auto-generated)
- Queries (if using new columns)
- Forms (if exposing new fields)

### 3. Run Verification

```sql
-- Verify migration applied
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'clients';
```

### 4. Deploy

If code changes needed:
```bash
git add .
git commit -m "Add client notes feature"
git push origin main
```

Vercel auto-deploys.

---

## Common Migration Patterns

### Add Column

```sql
ALTER TABLE clients ADD COLUMN notes TEXT;
```

### Add NOT NULL Column with Default

```sql
ALTER TABLE clients
ADD COLUMN is_active BOOLEAN DEFAULT true NOT NULL;
```

### Add Foreign Key

```sql
ALTER TABLE events
ADD COLUMN category_id UUID REFERENCES categories(id);
```

### Create Index

```sql
CREATE INDEX idx_events_status ON events(status);
```

### Add Check Constraint

```sql
ALTER TABLE events
ADD CONSTRAINT check_guest_count CHECK (guest_count > 0);
```

### Create Enum

```sql
CREATE TYPE event_category AS ENUM ('wedding', 'corporate', 'private');
```

### Add Enum Value

```sql
ALTER TYPE event_status ADD VALUE 'archived' AFTER 'cancelled';
```

---

## Migration Checklist

Before running in production:

- [ ] Tested on local/staging
- [ ] Wrapped in transaction
- [ ] Additive (no breaking changes)
- [ ] Comments added
- [ ] Indexes created
- [ ] RLS policies updated (if needed)
- [ ] Verification script updated (if needed)
- [ ] Types regenerated
- [ ] Application code updated
- [ ] Backup verified exists

---

## Troubleshooting

### "relation already exists"

**Cause**: Migration already ran or table exists

**Solution**: Check if migration already applied:
```sql
SELECT tablename FROM pg_tables WHERE tablename = 'your_table';
```

### "column does not exist"

**Cause**: Column name typo or missing migration

**Solution**: Verify column exists:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'your_table';
```

### "cannot drop column: constraint violation"

**Cause**: Column referenced by foreign key

**Solution**: Drop foreign key first:
```sql
ALTER TABLE events DROP CONSTRAINT fk_client;
ALTER TABLE clients DROP COLUMN email;
```

---

## Related Documentation

- [DEVELOPMENT.md](./DEVELOPMENT.md) - Local setup
- [TYPE_GENERATION.md](./TYPE_GENERATION.md) - Regenerating types
- [SCRIPTS_REFERENCE.md](./SCRIPTS_REFERENCE.md) - Verification scripts

---

**Last Updated**: 2026-02-13
