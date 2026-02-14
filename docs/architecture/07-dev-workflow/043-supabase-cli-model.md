# Supabase CLI Model

**Document ID**: 043
**Version**: 1.0.0
**Status**: Active
**Last Updated**: 2026-02-14

---

## Purpose

Defines Supabase CLI usage for local development and deployment.

---

## Common Commands

### Start Local Instance

```bash
supabase start
```

**Effect**: Starts Docker containers for PostgreSQL, Auth, Storage

---

### Stop Local Instance

```bash
supabase stop
```

**Effect**: Stops containers, preserves data

---

### Reset Database

```bash
supabase db reset
```

**Effect**: Drops all data, re-applies migrations

---

### Create Migration

```bash
supabase migration new add_column_name
```

**Creates**: `supabase/migrations/YYYYMMDDHHMMSS_add_column_name.sql`

---

### Generate Types

```bash
supabase gen types typescript --local > types/database.ts
```

**Effect**: Generates TypeScript types from schema

---

### Push Migrations to Production

```bash
supabase link --project-ref [PROJECT_ID]
supabase db push
```

**Effect**: Applies local migrations to remote database

---

## References

- **Local Dev Model**: `041-local-dev-model.md`
- **Migration Model**: `029-migration-model.md`
