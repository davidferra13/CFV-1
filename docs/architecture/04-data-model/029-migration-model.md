# Migration Model

**Document ID**: 029
**Version**: 1.0.0
**Status**: Active
**Last Updated**: 2026-02-14

---

## Purpose

Defines the migration strategy for database schema changes in ChefFlow V1. All schema changes MUST be version-controlled, reversible, and tested.

---

## Migration Files

**Location**: `supabase/migrations/`

**Naming**: `YYYYMMDDHHMMSS_description.sql`

**Examples**:
- `20260213000001_initial_schema.sql`
- `20260213000002_rls_policies.sql`

---

## Creating Migrations

```bash
supabase migration new add_event_notes_column
```

**Creates**: `supabase/migrations/20260214120000_add_event_notes_column.sql`

---

## Migration Content

```sql
-- Add notes column to events table
ALTER TABLE events ADD COLUMN notes TEXT;

-- Update RLS policies if needed
-- ...
```

---

## Applying Migrations

**Local**:
```bash
supabase db reset  # Applies all migrations
```

**Production**:
```bash
supabase db push   # Pushes new migrations only
```

---

## Migration Best Practices

1. **Backwards Compatible**: Avoid breaking changes where possible
2. **Additive**: Prefer ADD COLUMN over ALTER COLUMN
3. **Indexed**: Add indexes for new foreign keys
4. **RLS Updated**: Update policies for new tables
5. **Tested**: Test with `supabase db reset` before pushing

---

## References

- **Schema Contract**: `028-schema-contract.md`
- **Migration Verification Contract**: `050-migration-verification-contract.md`
