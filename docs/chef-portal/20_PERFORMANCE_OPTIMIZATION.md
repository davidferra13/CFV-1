# Performance Optimization (V1)

## Database Query Optimization

### 1. Use Indexes

All tenant-scoped queries benefit from composite indexes:

```sql
CREATE INDEX idx_events_tenant_status ON events(tenant_id, status);
CREATE INDEX idx_events_calendar ON events(tenant_id, start_ts);
```

---

### 2. Limit SELECT Fields

```typescript
// ✅ Good: Select only needed fields
await db.events.findMany({
  select: {
    id: true,
    event_type: true,
    start_ts: true,
    status: true,
  },
});

// ❌ Bad: Select all fields
await db.events.findMany();
```

---

### 3. Eager Load Relations

```typescript
await db.events.findMany({
  include: {
    client_profile: {
      select: { full_name: true, email: true },
    },
  },
});
```

---

## React Performance

### 1. Server Components

Prefer server components (no client-side JS bundle).

### 2. Code Splitting

```tsx
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <p>Loading...</p>,
});
```

---

## Caching Strategy (Future)

V1: No application-level caching (database is fast enough).

V2: Consider React Query for client-side caching.

---

**End of Performance Optimization**
