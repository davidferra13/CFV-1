# UI Component Patterns (V1)

## Server Components Default

Use Server Components by default:

```tsx
// app/(chef)/events/page.tsx
export default async function EventsPage() {
  const events = await getEvents();

  return (
    <div>
      <h1>Events</h1>
      <EventsList events={events} />
    </div>
  );
}
```

---

## Client Components Only When Needed

Use `'use client'` only for:
- Interactive forms
- State management
- Browser APIs (localStorage, etc.)

```tsx
'use client';

export function EventCreateForm() {
  const [formData, setFormData] = useState({});

  return <form>...</form>;
}
```

---

## Component Organization

```
components/
  ├── ui/              # Reusable primitives (Button, Input, etc.)
  ├── events/          # Event-specific components
  ├── clients/         # Client-specific components
  └── shared/          # Cross-domain components
```

---

## Data Loading

```tsx
// Server Component: Fetch data directly
async function EventDetail({ id }: { id: string }) {
  const event = await db.events.findUnique({ where: { id } });

  return <div>{event.event_type}</div>;
}
```

---

**End of UI Component Patterns**
