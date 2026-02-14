# TypeScript Type Generation

**Version**: 1.0
**Last Updated**: 2026-02-13

Guide for generating and managing TypeScript types from the Supabase database schema.

---

## Overview

ChefFlow V1 uses **generated TypeScript types** from the Supabase database schema. This ensures type safety between database and application code.

---

## Generating Types

### Using Supabase CLI

```bash
npx supabase gen types typescript --project-id <project-ref> > types/database.ts
```

**Find project-ref**: Copy from Supabase project URL:
```
https://xxxxx.supabase.co
        ^^^^^
    project-ref
```

### Manual Generation

1. **Install Supabase CLI** (if not installed):
   ```bash
   npm install -g supabase
   ```

2. **Generate types**:
   ```bash
   cd chefflow-v1
   npx supabase gen types typescript --project-id xxxxx > types/database.ts
   ```

3. **Verify output**: Check `types/database.ts` file created

---

## Using Generated Types

### Database Table Types

```typescript
import { Database } from '@/types/database'

// Row types (fetched data)
type Event = Database['public']['Tables']['events']['Row']
type Client = Database['public']['Tables']['clients']['Row']
type LedgerEntry = Database['public']['Tables']['ledger_entries']['Row']

// Insert types (creating records)
type EventInsert = Database['public']['Tables']['events']['Insert']

// Update types (updating records)
type EventUpdate = Database['public']['Tables']['events']['Update']
```

### Enum Types

```typescript
import { Database } from '@/types/database'

type EventStatus = Database['public']['Enums']['event_status']
type UserRole = Database['public']['Enums']['user_role']
type LedgerEntryType = Database['public']['Enums']['ledger_entry_type']
```

### View Types

```typescript
import { Database } from '@/types/database'

type FinancialSummary = Database['public']['Views']['event_financial_summary']['Row']
```

### Function Types

```typescript
import { Database } from '@/types/database'

type GetUserRoleResult = Database['public']['Functions']['get_current_user_role']['Returns']
```

---

## When to Regenerate

Regenerate types after:

- Adding new tables
- Modifying table columns
- Adding new enums
- Creating views
- Changing function signatures

**After running migrations**, regenerate types before committing.

---

## Type Examples

### Using in Queries

```typescript
import { Database } from '@/types/database'
import { createServerClient } from '@/lib/supabase/server'

type Event = Database['public']['Tables']['events']['Row']

export async function getEvent(id: string): Promise<Event | null> {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data // Type: Event
}
```

### Using in Server Actions

```typescript
import { Database } from '@/types/database'

type EventInsert = Database['public']['Tables']['events']['Insert']

export async function createEvent(
  data: Omit<EventInsert, 'id' | 'created_at' | 'updated_at'>
) {
  const supabase = createServerClient()

  const { data: event, error } = await supabase
    .from('events')
    .insert(data)
    .select()
    .single()

  return event // Type: Event
}
```

### Type Guards

```typescript
function isEventStatus(status: string): status is EventStatus {
  return ['draft', 'proposed', 'accepted', 'paid', 'confirmed', 'in_progress', 'completed', 'cancelled'].includes(status)
}
```

---

## Custom Type Extensions

### Extending Generated Types

```typescript
import { Database } from '@/types/database'

type Event = Database['public']['Tables']['events']['Row']
type Client = Database['public']['Tables']['clients']['Row']

// Event with client relation
export type EventWithClient = Event & {
  client: Client
}

// Event with financial summary
export type EventWithFinancials = Event & {
  client: Client
  financial_summary: {
    expected_total_cents: number
    collected_cents: number
    is_fully_paid: boolean
    is_deposit_paid: boolean
  }
}
```

---

## Troubleshooting

### Type Generation Fails

**Error**: "Project not found"
- Verify project-ref is correct
- Check Supabase CLI is logged in: `supabase login`

**Error**: "Invalid credentials"
- Run: `supabase login`
- Authenticate in browser

### Types Out of Sync

If types don't match database:
1. Verify migrations ran successfully
2. Regenerate types
3. Restart dev server

---

## Related Documentation

- [DEVELOPMENT.md](./DEVELOPMENT.md) - Local setup
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Database migrations

---

**Last Updated**: 2026-02-13
