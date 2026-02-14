# Calendar Query Patterns (V1)

## Overview

This document defines optimized database queries for retrieving events in calendar views. All queries enforce tenant isolation via RLS.

---

## Base Calendar Query

```typescript
interface CalendarQueryParams {
  tenantId: string;
  startDate: Date;
  endDate: Date;
  includeStatuses?: EventStatus[];
  excludeStatuses?: EventStatus[];
}

async function getCalendarEvents(params: CalendarQueryParams): Promise<Event[]> {
  const { tenantId, startDate, endDate, includeStatuses, excludeStatuses } = params;

  return await db.events.findMany({
    where: {
      tenant_id: tenantId,
      deleted_at: null,
      start_ts: {
        gte: startDate,
        lt: endDate,
      },
      ...(includeStatuses && { status: { in: includeStatuses } }),
      ...(excludeStatuses && { status: { notIn: excludeStatuses } }),
    },
    select: {
      id: true,
      event_type: true,
      start_ts: true,
      end_ts: true,
      status: true,
      client_profile: {
        select: {
          id: true,
          full_name: true,
        },
      },
    },
    orderBy: {
      start_ts: 'asc',
    },
  });
}
```

---

## Month View Query

```typescript
async function getEventsForMonth(
  tenantId: string,
  year: number,
  month: number // 1-12
): Promise<Event[]> {
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);

  return await getCalendarEvents({
    tenantId,
    startDate: startOfMonth,
    endDate: endOfMonth,
    excludeStatuses: ['canceled', 'draft'], // Hide drafts and canceled
  });
}
```

**SQL Equivalent**:
```sql
SELECT
  e.id,
  e.event_type,
  e.start_ts,
  e.end_ts,
  e.status,
  c.full_name AS client_name
FROM events e
LEFT JOIN client_profiles c ON e.client_profile_id = c.id
WHERE e.tenant_id = $1
  AND e.start_ts >= $2
  AND e.start_ts < $3
  AND e.status NOT IN ('canceled', 'draft')
  AND e.deleted_at IS NULL
ORDER BY e.start_ts ASC;
```

---

## Week View Query

```typescript
async function getEventsForWeek(
  tenantId: string,
  weekStartDate: Date
): Promise<Event[]> {
  const weekStart = startOfWeek(weekStartDate);
  const weekEnd = endOfWeek(weekStartDate);

  return await getCalendarEvents({
    tenantId,
    startDate: weekStart,
    endDate: weekEnd,
    excludeStatuses: ['canceled', 'draft'],
  });
}
```

---

## Day View Query

```typescript
async function getEventsForDay(
  tenantId: string,
  date: Date
): Promise<Event[]> {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  return await getCalendarEvents({
    tenantId,
    startDate: dayStart,
    endDate: dayEnd,
    excludeStatuses: ['canceled'],
  });
}
```

---

## Find Events in Date Range (Any Overlap)

```typescript
async function getEventsInRange(
  tenantId: string,
  rangeStart: Date,
  rangeEnd: Date
): Promise<Event[]> {
  return await db.events.findMany({
    where: {
      tenant_id: tenantId,
      deleted_at: null,
      // Events that overlap with the range
      start_ts: { lt: rangeEnd },
      end_ts: { gt: rangeStart },
      status: { notIn: ['canceled', 'draft'] },
    },
    orderBy: {
      start_ts: 'asc',
    },
  });
}
```

**SQL Equivalent**:
```sql
SELECT id, event_type, start_ts, end_ts, status
FROM events
WHERE tenant_id = $1
  AND deleted_at IS NULL
  AND start_ts < $3  -- Starts before range end
  AND end_ts > $2    -- Ends after range start
  AND status NOT IN ('canceled', 'draft')
ORDER BY start_ts ASC;
```

---

## Upcoming Events Query

```typescript
async function getUpcomingEvents(
  tenantId: string,
  limit: number = 10
): Promise<Event[]> {
  return await db.events.findMany({
    where: {
      tenant_id: tenantId,
      deleted_at: null,
      start_ts: { gte: new Date() },
      status: { notIn: ['canceled', 'draft', 'closed'] },
    },
    orderBy: {
      start_ts: 'asc',
    },
    take: limit,
  });
}
```

---

## Events by Status (Dashboard)

```typescript
async function getEventsByStatus(
  tenantId: string,
  status: EventStatus
): Promise<Event[]> {
  return await db.events.findMany({
    where: {
      tenant_id: tenantId,
      deleted_at: null,
      status,
    },
    orderBy: {
      start_ts: 'asc',
    },
    include: {
      client_profile: {
        select: {
          id: true,
          full_name: true,
          email: true,
        },
      },
    },
  });
}
```

---

## Events Needing Attention (Dashboard)

```typescript
async function getEventsNeedingAttention(tenantId: string): Promise<Event[]> {
  const now = new Date();
  const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

  return await db.events.findMany({
    where: {
      tenant_id: tenantId,
      deleted_at: null,
      OR: [
        // Events starting soon without locked menu
        {
          start_ts: { gte: now, lte: threeDaysFromNow },
          status: { notIn: ['menu_locked', 'executed', 'closed', 'canceled'] },
        },
        // Deposit pending for >48 hours
        {
          status: 'deposit_pending',
          updated_at: { lte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
        },
        // Proposed for >7 days
        {
          status: 'proposed',
          updated_at: { lte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      ],
    },
    orderBy: {
      start_ts: 'asc',
    },
  });
}
```

---

## Performance Optimizations

### Required Indexes

```sql
-- Primary calendar query index
CREATE INDEX idx_events_calendar ON events(tenant_id, start_ts, status)
WHERE deleted_at IS NULL;

-- Overlap detection index
CREATE INDEX idx_events_time_range ON events(tenant_id, start_ts, end_ts)
WHERE deleted_at IS NULL AND status NOT IN ('draft', 'canceled', 'closed');

-- Status filtering index
CREATE INDEX idx_events_tenant_status ON events(tenant_id, status, start_ts)
WHERE deleted_at IS NULL;

-- Upcoming events index
CREATE INDEX idx_events_upcoming ON events(tenant_id, start_ts)
WHERE deleted_at IS NULL AND start_ts >= NOW();
```

---

### Query Optimization Tips

1. **Always filter by tenant_id first** (leverages RLS and indexing)
2. **Use explicit date ranges** (avoid open-ended queries)
3. **Limit returned fields** (use `select` to reduce payload)
4. **Exclude irrelevant statuses** (filter out canceled/draft where appropriate)
5. **Order by indexed columns** (`start_ts` is indexed)

---

## Caching Strategy (Future)

V1: No caching required (database is fast enough).

Future: Consider caching for:
- Current month view (invalidate on event create/update)
- Upcoming events widget (TTL: 5 minutes)

---

## Raw SQL Examples

### Get Month Events (PostgreSQL)

```sql
SELECT
  e.id,
  e.event_type,
  e.start_ts,
  e.end_ts,
  e.status,
  c.full_name,
  c.email
FROM events e
LEFT JOIN client_profiles c ON e.client_profile_id = c.id
WHERE e.tenant_id = $1
  AND e.start_ts >= date_trunc('month', $2::date)
  AND e.start_ts < (date_trunc('month', $2::date) + interval '1 month')
  AND e.status NOT IN ('canceled', 'draft')
  AND e.deleted_at IS NULL
ORDER BY e.start_ts ASC;
```

---

### Count Events by Status

```sql
SELECT
  status,
  COUNT(*) as count
FROM events
WHERE tenant_id = $1
  AND deleted_at IS NULL
  AND start_ts >= NOW()
GROUP BY status
ORDER BY count DESC;
```

---

### Find Busiest Days (Analytics)

```sql
SELECT
  DATE(start_ts AT TIME ZONE 'America/Los_Angeles') as event_date,
  COUNT(*) as event_count
FROM events
WHERE tenant_id = $1
  AND start_ts >= NOW() - interval '90 days'
  AND status NOT IN ('canceled', 'draft')
  AND deleted_at IS NULL
GROUP BY event_date
ORDER BY event_count DESC
LIMIT 10;
```

---

## V1 Scope

### Included
- All query patterns above
- Required indexes
- Tenant isolation via RLS
- Optimized SELECT projections

### Excluded
- Query result caching
- Full-text search on calendar
- Multi-tenant/team views
- External calendar sync queries

---

**End of Calendar Query Patterns**
