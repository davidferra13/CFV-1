# Client Event History View (V1)

## Purpose

Show all events associated with a client profile, ordered by date (most recent first).

---

## Query

```typescript
async function getClientEventHistory(clientId: string) {
  return await db.events.findMany({
    where: {
      client_profile_id: clientId,
      deleted_at: null,
    },
    select: {
      id: true,
      event_type: true,
      start_ts: true,
      end_ts: true,
      status: true,
      total_amount_cents: true,
      deposit_amount_cents: true,
    },
    orderBy: {
      start_ts: 'desc',
    },
  });
}
```

---

## UI Display

```tsx
<section className="client-event-history">
  <h2>Event History</h2>
  {events.length === 0 && <p>No events yet.</p>}

  {events.map((event) => (
    <div key={event.id} className="event-card">
      <div className="event-header">
        <h3>{event.event_type}</h3>
        <span className={`status status-${event.status}`}>
          {event.status}
        </span>
      </div>
      <div className="event-details">
        <p>{format(event.start_ts, 'PPpp')}</p>
        <p>Total: ${event.total_amount_cents / 100}</p>
      </div>
      <Link href={`/events/${event.id}`}>View Details</Link>
    </div>
  ))}
</section>
```

---

## Metrics

Calculate aggregate statistics:

```typescript
function calculateClientMetrics(events: Event[]) {
  const totalEvents = events.length;
  const completedEvents = events.filter((e) => e.status === 'closed').length;
  const totalRevenue = events
    .filter((e) => e.status === 'closed')
    .reduce((sum, e) => sum + (e.total_amount_cents || 0), 0);

  return {
    totalEvents,
    completedEvents,
    totalRevenue,
    averageEventValue: totalEvents > 0 ? totalRevenue / completedEvents : 0,
  };
}
```

---

**End of Client Event History View**
