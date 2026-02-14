# Events UI - List View (V1)

## Purpose

Primary interface for viewing all events in a filterable, sortable table.

---

## Layout

```
┌─────────────────────────────────────────────┐
│ Events                    [+ New Event]     │
├─────────────────────────────────────────────┤
│ Filters: [Status ▼] [Date Range] [Client]  │
├─────────────────────────────────────────────┤
│ Client      │ Event Type │ Date     │Status│
├─────────────────────────────────────────────┤
│ John Doe    │ Wedding    │ Mar 15   │ ✓    │
│ Jane Smith  │ Corporate  │ Mar 20   │ ...  │
│ Bob Johnson │ Birthday   │ Apr 2    │ 🔒   │
└─────────────────────────────────────────────┘
```

---

## Columns

1. **Client Name**: Link to client profile
2. **Event Type**: e.g., "Wedding", "Corporate Dinner"
3. **Date**: Start date/time
4. **Status**: Color-coded badge
5. **Total**: Financial amount
6. **Actions**: Quick actions (View, Edit, Cancel)

---

## Filters

```tsx
<div className="filters">
  <Select
    label="Status"
    options={EVENT_STATUSES}
    value={statusFilter}
    onChange={setStatusFilter}
  />

  <DateRangePicker
    label="Date Range"
    start={dateStart}
    end={dateEnd}
    onChange={setDateRange}
  />

  <Input
    label="Search Client"
    value={clientSearch}
    onChange={setClientSearch}
  />
</div>
```

---

## Sorting

Default: Sort by start date (ascending).

Allow sorting by:
- Date (asc/desc)
- Client name (A-Z)
- Status
- Amount

---

## Query

```typescript
async function getEventsList(filters: {
  tenantId: string;
  status?: EventStatus;
  dateStart?: Date;
  dateEnd?: Date;
  clientSearch?: string;
}) {
  return await db.events.findMany({
    where: {
      tenant_id: filters.tenantId,
      deleted_at: null,
      ...(filters.status && { status: filters.status }),
      ...(filters.dateStart && { start_ts: { gte: filters.dateStart } }),
      ...(filters.dateEnd && { start_ts: { lte: filters.dateEnd } }),
      ...(filters.clientSearch && {
        client_profile: {
          full_name: { contains: filters.clientSearch, mode: 'insensitive' },
        },
      }),
    },
    include: {
      client_profile: {
        select: {
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

## Status Badges

```tsx
const STATUS_COLORS: Record<EventStatus, string> = {
  draft: 'gray',
  proposed: 'blue',
  deposit_pending: 'yellow',
  confirmed: 'green',
  menu_in_progress: 'purple',
  menu_locked: 'indigo',
  executed: 'teal',
  closed: 'gray',
  canceled: 'red',
};

<span className={`badge badge-${STATUS_COLORS[event.status]}`}>
  {EVENT_STATUS_LABELS[event.status]}
</span>
```

---

**End of Events UI - List View**
