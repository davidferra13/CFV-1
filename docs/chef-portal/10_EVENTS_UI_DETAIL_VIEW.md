# Events UI - Detail View (V1)

## Layout

Event detail page shows comprehensive event information organized in sections.

---

## Sections

### 1. Header
- Event type
- Status badge
- Action buttons (Edit, Cancel, Transition)

### 2. Client Info
- Name (link to client profile)
- Contact info
- Event history link

### 3. Event Details
- Date/time
- Location (if in scope)
- Guest count
- Special requests

### 4. Menu
- Current menu version
- Link to menu editor
- Lock status

### 5. Financial Summary
- Total amount
- Deposit amount
- Balance due
- Payment status (derived from ledger)

### 6. Timeline
- Event transitions log
- Status change history

---

## Server Component

```tsx
// app/(chef)/events/[id]/page.tsx
export default async function EventDetailPage({ params }: { params: { id: string } }) {
  const event = await getEventDetails(params.id);

  return (
    <div className="event-detail">
      <EventHeader event={event} />
      <EventClientInfo client={event.client_profile} />
      <EventDetails event={event} />
      <EventMenu menu={event.menu} />
      <FinancialSummary event={event} />
      <EventTimeline transitions={event.transitions} />
    </div>
  );
}
```

---

## Query

```typescript
async function getEventDetails(eventId: string) {
  return await db.events.findUnique({
    where: { id: eventId },
    include: {
      client_profile: true,
      menu: true,
      transitions: {
        orderBy: { triggered_at: 'desc' },
      },
    },
  });
}
```

---

**End of Events UI - Detail View**
