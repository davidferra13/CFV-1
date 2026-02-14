# Component Boundaries: Server vs Client (V1)

This document defines which components are server components and which are client components, and the boundaries between them.

---

## 1) Default: Server Components

**In Next.js App Router, components are server components by default** unless marked with `'use client'`.

**Server components:**
- ✅ Run on server only
- ✅ Can directly access database, secrets, server-only APIs
- ✅ Can use async/await
- ❌ Cannot use React hooks (useState, useEffect, etc.)
- ❌ Cannot access browser APIs (window, localStorage, etc.)

---

## 2) When to Use Client Components

**Use `'use client'` when component needs:**

1. **React hooks** (useState, useEffect, useContext, etc.)
2. **Browser APIs** (window, document, localStorage, etc.)
3. **Event handlers** (onClick, onChange, onSubmit, etc.)
4. **Third-party libraries** that require client-side execution

**Examples:**
- Form with validation state
- Interactive buttons with loading states
- Modals and dialogs
- Charts and data visualizations

---

## 3) Server Component Examples

```typescript
// app/(chef)/events/page.tsx
// ✅ Server component (no 'use client')

import { getUser, getUserRole } from '@/lib/auth';
import { db } from '@/lib/db';

export default async function EventsPage() {
  const user = await getUser();
  const roleData = await getUserRole(user.id);

  const events = await db.events.findMany({
    where: { tenant_id: roleData.tenant_id },
  });

  return <EventsList events={events} />;
}
```

---

## 4) Client Component Examples

```typescript
// components/chef/CreateEventForm.tsx
'use client'; // ✅ Client component

import { useState } from 'react';

export function CreateEventForm({ onSubmit }) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    // ... validation and submission
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

---

## 5) Component Composition Pattern

**Server component fetches data, client component handles interaction:**

```typescript
// Server component (page)
export default async function EventDetailPage({ params }) {
  const event = await getEvent(params.id);

  return (
    <div>
      <EventHeader event={event} />
      <TransitionButton event={event} /> {/* Client component */}
    </div>
  );
}

// Client component
'use client';
export function TransitionButton({ event }) {
  const [loading, setLoading] = useState(false);

  const handleTransition = async () => {
    setLoading(true);
    await transitionEvent(event.id, 'confirmed');
    setLoading(false);
  };

  return <button onClick={handleTransition}>Transition</button>;
}
```

---

## 6) Boundaries Summary

| Feature | Server Component | Client Component |
|---------|------------------|------------------|
| **Data fetching** | ✅ Direct DB access | ❌ Via server actions |
| **React hooks** | ❌ Not allowed | ✅ Yes |
| **Event handlers** | ❌ Not allowed | ✅ Yes |
| **async/await** | ✅ Yes | ⚠️ Only in handlers |
| **Browser APIs** | ❌ Not available | ✅ Yes |

---

## Summary

**Server components fetch data and handle business logic; client components handle user interaction and state. The boundary is clear: server for data, client for interactivity.**
