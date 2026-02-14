# Never Trusted Inputs

**Document ID**: 026
**Version**: 1.0.0
**Status**: Active
**Last Updated**: 2026-02-14

---

## Purpose

Establishes the principle that ALL client inputs are untrusted and MUST be validated server-side. This document defines validation strategies and prohibited trust patterns.

---

## Core Principle

**NEVER trust data from**:
- URL parameters
- Request body (JSON, form data)
- Cookies (except Supabase session cookie)
- Headers
- localStorage/sessionStorage
- Client component state

**ALWAYS validate server-side**: Before database insertion, before processing, before business logic.

---

## Validation Strategy

### Input Validation (Zod)

```typescript
import { z } from 'zod';

const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  event_date: z.string().datetime(),
  guest_count: z.number().int().positive().max(1000),
});

export async function createEvent(formData: FormData) {
  const parsed = createEventSchema.parse({
    title: formData.get('title'),
    event_date: formData.get('event_date'),
    guest_count: Number(formData.get('guest_count')),
  });

  // Now safe to use parsed data
}
```

---

## Prohibited Patterns

**❌ Trusting tenant_id from client**:
```typescript
// WRONG
const { tenant_id } = await request.json();
await supabase.from('events').insert({ tenant_id });
```

**✅ Deriving tenant_id server-side**:
```typescript
// CORRECT
const user = await getCurrentUser();
await supabase.from('events').insert({ tenant_id: user.tenantId });
```

---

**❌ Trusting role from URL**:
```typescript
// WRONG
const role = pathname.startsWith('/dashboard') ? 'chef' : 'client';
```

**✅ Querying role from database**:
```typescript
// CORRECT
const user = await getCurrentUser();
const role = user.role;
```

---

## SQL Injection Prevention

**Supabase Client**: Auto-parameterizes queries (safe by default)

**Raw SQL**: Use parameterized queries only

```sql
-- ❌ WRONG: SQL injection risk
SELECT * FROM events WHERE title = '${userInput}';

-- ✅ CORRECT: Parameterized
SELECT * FROM events WHERE title = $1;
```

---

## XSS Prevention

**React**: Auto-escapes by default

**Dangerous HTML**: Never use `dangerouslySetInnerHTML` with user input

---

## References

- **RLS Enforcement Philosophy**: `022-rls-enforcement-philosophy.md`
- **Role Resolution Boundary**: `021-role-resolution-boundary.md`
