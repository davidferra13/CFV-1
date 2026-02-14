# Type Generation Contract

**Document ID**: 030
**Version**: 1.0.0
**Status**: Active
**Last Updated**: 2026-02-14

---

## Purpose

Defines how TypeScript types are generated from database schema to ensure type safety between database and application code.

---

## Type Generation Command

```bash
npm run types:generate
```

**Equivalent**:
```bash
supabase gen types typescript --local > types/database.ts
```

---

## Generated Types Location

**File**: `types/database.ts`

**Auto-Generated**: Yes (never manually edit)

**Committed**: Yes (to version control)

---

## Usage Pattern

```typescript
import { Database } from '@/types/database';

type Event = Database['public']['Tables']['events']['Row'];
type EventInsert = Database['public']['Tables']['events']['Insert'];
type EventUpdate = Database['public']['Tables']['events']['Update'];
```

---

## Regeneration Trigger

**When to regenerate**:
- After creating migration
- After applying migration
- Before committing schema changes

**Verification**: TypeScript compilation succeeds without errors

---

## References

- **Schema Contract**: `028-schema-contract.md`
- **Migration Model**: `029-migration-model.md`
