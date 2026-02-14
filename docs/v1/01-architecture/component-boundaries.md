# Component Boundaries

**Document ID**: 006
**Version**: 1.0
**Status**: LOCKED
**Last Updated**: 2026-02-14

## Purpose

This document defines the boundaries between different component types in ChefFlow V1, specifying what each component type CAN and CANNOT do.

## Component Type Taxonomy

ChefFlow V1 uses 6 distinct component types:

1. **Server Components** (default)
2. **Client Components** (`'use client'`)
3. **Layouts** (special server components)
4. **Pages** (special server components)
5. **Server Actions** (`'use server'`)
6. **API Routes** (`route.ts`)

---

## 1. Server Components

### Definition

Components that render ONLY on the server. Output is HTML sent to client.

### Characteristics

- **Default**: All components are server components unless marked `'use client'`
- **Execution**: Runs during server render, NOT re-executed on client
- **Bundle**: Code is NOT sent to client (zero JavaScript bundle impact)
- **Data Fetching**: Can directly query database, call server functions
- **Async**: Can be async functions

### CAN

✅ Import and use other server components
✅ Import and nest client components
✅ Query database directly (with Supabase client)
✅ Read environment variables (all, including secrets)
✅ Use async/await
✅ Call server actions
✅ Access server-only APIs (file system, Node.js modules)
✅ Render HTML (JSX)

### CANNOT

❌ Use React hooks (`useState`, `useEffect`, `useContext`, etc.)
❌ Attach event handlers (`onClick`, `onChange`, `onSubmit`, etc.)
❌ Use browser APIs (`window`, `document`, `localStorage`)
❌ Import client-only libraries (Stripe Elements, Chart.js, etc.)
❌ Be imported by client components (bundler error)

### Example

```typescript
// components/events/event-list.tsx (Server Component)

import { getEvents } from '@/lib/events/get-events';
import { EventCard } from './event-card'; // Also server component

export async function EventList({ tenantId }: { tenantId: string }) {
  // Direct database query (server-side)
  const events = await getEvents(tenantId);

  return (
    <div>
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
```

### When to Use

- Data display (lists, cards, tables)
- Layout components (headers, sidebars, footers)
- Static content (text, images)
- Any component that does NOT require user interaction

---

## 2. Client Components

### Definition

Components that render on BOTH server (initial SSR) and client (hydration, re-renders).

### Characteristics

- **Marked with**: `'use client'` directive at top of file
- **Execution**: Runs on server (initial render) AND client (hydration + updates)
- **Bundle**: Code IS sent to client (increases JavaScript bundle)
- **Data Fetching**: CANNOT directly query database (must call server actions)
- **Async**: Cannot be async (React limitation)

### CAN

✅ Use React hooks (`useState`, `useEffect`, `useRef`, etc.)
✅ Attach event handlers (`onClick`, `onChange`, etc.)
✅ Use browser APIs (`window`, `localStorage`, `fetch`)
✅ Import client-only libraries (Stripe Elements, etc.)
✅ Import other client components
✅ Import server components (nested as children)
✅ Call server actions
✅ Use third-party UI libraries (if client-compatible)

### CANNOT

❌ Be async
❌ Directly query database
❌ Access environment variables (except `NEXT_PUBLIC_*`)
❌ Import server-only modules (Node.js `fs`, `path`, etc.)
❌ Be imported by server components (results in error)

### Example

```typescript
// components/events/event-form.tsx (Client Component)
'use client';

import { useState } from 'react';
import { createEvent } from '@/actions/event-actions';
import { Button } from '@/components/ui/button';

export function EventForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      await createEvent(formData); // Call server action
      // Success: redirect or show success message
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="title" required />
      {error && <p className="text-red-500">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Event'}
      </Button>
    </form>
  );
}
```

### When to Use

- Forms (user input, validation)
- Interactive UI (modals, dropdowns, tabs, accordions)
- Third-party libraries requiring browser (Stripe Elements)
- Components using `useState`, `useEffect`
- Components with event handlers

### Minimization Strategy

**Goal**: Minimize client components to reduce JavaScript bundle size.

**Pattern**: "Client Component Islands"
- Keep most of page as server components
- Wrap ONLY interactive parts in client components
- Nest client components inside server components

**Example**:
```typescript
// app/(chef)/events/page.tsx (Server Component)
import { EventList } from '@/components/events/event-list'; // Server
import { CreateEventButton } from '@/components/events/create-event-button'; // Client

export default async function EventsPage() {
  const events = await getEvents(tenantId);

  return (
    <div>
      <h1>Events</h1>
      <EventList events={events} /> {/* Server component */}
      <CreateEventButton /> {/* Client component (only interactive part) */}
    </div>
  );
}
```

---

## 3. Layouts

### Definition

Special server components that wrap page content and persist across navigations.

### Characteristics

- **File**: `layout.tsx` (special filename)
- **Type**: Server component (can be async)
- **Persistence**: Does NOT re-render on navigation (maintains state)
- **Nesting**: Child layouts inherit parent layouts
- **Required**: At least one root layout (`app/layout.tsx`)

### CAN

✅ Everything a server component can do
✅ Define common UI (header, sidebar, footer)
✅ Fetch data (once, persists across navigations)
✅ Nest child layouts
✅ Accept `children` prop (rendered page content)

### CANNOT

❌ Use router hooks (`usePathname`, `useSearchParams`) - use middleware instead
❌ Access page-specific props (only receives `children`)

### Example

```typescript
// app/(chef)/layout.tsx (Chef Portal Layout)

import { getCurrentUser } from '@/lib/auth/get-user';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

export default async function ChefLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth check (runs once per session, persists)
  const user = await getCurrentUser();
  if (!user || user.role !== 'chef') {
    redirect('/'); // Unauthorized
  }

  return (
    <div className="flex">
      <Sidebar user={user} />
      <main className="flex-1">
        <Header user={user} />
        {children} {/* Rendered page */}
      </main>
    </div>
  );
}
```

### When to Use

- Common UI shared across multiple pages (header, sidebar, footer)
- Portal-specific layouts (chef layout, client layout, public layout)
- Auth checks (redirect if unauthorized)
- Data fetching needed across all pages in group

---

## 4. Pages

### Definition

Special server components that map to routes.

### Characteristics

- **File**: `page.tsx` (special filename)
- **Type**: Server component (can be async)
- **Route Mapping**: File path determines URL
  - `app/(chef)/dashboard/page.tsx` → `/dashboard`
- **Props**: Receives `params` (dynamic segments) and `searchParams` (query string)

### CAN

✅ Everything a server component can do
✅ Access route parameters (`params.id`)
✅ Access search params (`searchParams.sort`)
✅ Fetch data specific to this page
✅ Redirect (if needed)

### CANNOT

❌ Access layout props
❌ Persist across navigations (re-renders on each visit)

### Example

```typescript
// app/(chef)/events/[id]/page.tsx (Event Detail Page)

import { getEventById } from '@/lib/events/get-event';
import { notFound } from 'next/navigation';

interface PageProps {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function EventDetailPage({ params }: PageProps) {
  const event = await getEventById(params.id);

  if (!event) {
    notFound(); // Show 404 page
  }

  return (
    <div>
      <h1>{event.title}</h1>
      <p>Date: {event.event_date}</p>
      {/* ... */}
    </div>
  );
}
```

### When to Use

- Every route (required to make URL accessible)
- Page-specific data fetching
- Page-specific UI (not shared with other pages)

---

## 5. Server Actions

### Definition

Asynchronous functions that run ONLY on the server, callable from client components.

### Characteristics

- **Marked with**: `'use server'` directive (file-level or function-level)
- **Execution**: Runs on server (never on client)
- **Invocation**: Called from client components (via POST request)
- **Type Safety**: TypeScript infers types across server/client boundary
- **Progressive Enhancement**: Works without JavaScript (form actions)

### CAN

✅ Mutate database
✅ Call external APIs (Stripe, etc.)
✅ Access environment variables (all, including secrets)
✅ Validate input (Zod schemas)
✅ Return data to client
✅ Throw errors (caught by client error boundary)
✅ Use `revalidatePath()` to refresh data

### CANNOT

❌ Use React hooks
❌ Attach event handlers
❌ Return React components (data only)
❌ Be called from other server actions (use shared lib functions instead)

### Example

```typescript
// actions/event-actions.ts
'use server';

import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/get-user';
import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  event_date: z.string().datetime(),
  guest_count: z.number().int().positive(),
  // ...
});

export async function createEvent(formData: FormData) {
  // 1. Auth check
  const user = await getCurrentUser();
  if (user.role !== 'chef') {
    throw new Error('Unauthorized');
  }

  // 2. Validation
  const data = createEventSchema.parse({
    title: formData.get('title'),
    event_date: formData.get('event_date'),
    guest_count: Number(formData.get('guest_count')),
  });

  // 3. Mutation
  const supabase = createServerClient();
  const { data: event, error } = await supabase
    .from('events')
    .insert({ ...data, tenant_id: user.tenantId })
    .select()
    .single();

  if (error) throw error;

  // 4. Revalidate (refresh data)
  revalidatePath('/events');

  // 5. Return result
  return event;
}
```

### When to Use

- Form submissions
- Data mutations (create, update, delete)
- Actions requiring authentication
- Actions requiring server-side validation

---

## 6. API Routes

### Definition

Server-side endpoints that handle HTTP requests (GET, POST, etc.).

### Characteristics

- **File**: `route.ts` (special filename, in `/app/api/...`)
- **Type**: Server-only (no client bundle)
- **HTTP Methods**: Export `GET`, `POST`, `PUT`, `DELETE`, etc.
- **Return**: `Response` object (JSON, HTML, etc.)

### CAN

✅ Handle HTTP requests
✅ Access request headers, body, query params
✅ Return JSON, HTML, plain text, etc.
✅ Set response headers, status codes
✅ Mutate database
✅ Call external APIs

### CANNOT

❌ Use React (not a component)
❌ Be called directly from components (use `fetch()` or server actions instead)

### Example

```typescript
// app/api/webhooks/stripe/route.ts

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  try {
    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    // Process webhook event
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      // Create ledger entry
      // ...
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 400 }
    );
  }
}
```

### When to Use

- Webhooks (Stripe, etc.)
- Third-party integrations requiring specific endpoints
- Public APIs (if exposing data to external systems)

**NOT for**:
- Form submissions (use server actions instead)
- Internal mutations (use server actions instead)

---

## Component Interaction Rules

### Server Component → Server Component

✅ **Allowed**: Direct import and use

```typescript
// Parent (server component)
import { ChildServerComponent } from './child';

export function ParentServerComponent() {
  return <ChildServerComponent />;
}
```

### Server Component → Client Component

✅ **Allowed**: Import and nest

```typescript
// Parent (server component)
import { ChildClientComponent } from './child';

export function ParentServerComponent() {
  return (
    <div>
      <ChildClientComponent /> {/* Client component nested in server */}
    </div>
  );
}
```

### Client Component → Server Component

❌ **NOT Allowed**: Cannot import server component into client component

**Workaround**: Pass server component as `children` prop

```typescript
// Parent (client component)
'use client';

export function ParentClientComponent({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(false);

  return (
    <div>
      <button onClick={() => setState(!state)}>Toggle</button>
      {state && children} {/* Render passed-in server component */}
    </div>
  );
}

// Usage (in server component)
import { ParentClientComponent } from './parent-client';
import { ChildServerComponent } from './child-server';

export function Wrapper() {
  return (
    <ParentClientComponent>
      <ChildServerComponent /> {/* Passed as children */}
    </ParentClientComponent>
  );
}
```

### Client Component → Client Component

✅ **Allowed**: Direct import and use

```typescript
// Parent (client component)
'use client';

import { ChildClientComponent } from './child';

export function ParentClientComponent() {
  return <ChildClientComponent />;
}
```

### Client Component → Server Action

✅ **Allowed**: Import and call

```typescript
// Client component
'use client';

import { createEvent } from '@/actions/event-actions';

export function CreateEventButton() {
  const handleClick = async () => {
    await createEvent(/* data */);
  };

  return <button onClick={handleClick}>Create Event</button>;
}
```

### Server Component → Server Action

✅ **Allowed**: Import and call

```typescript
// Server component
import { createEvent } from '@/actions/event-actions';

export async function CreateEventForm() {
  return (
    <form action={createEvent}>
      {/* Form fields */}
      <button type="submit">Create Event</button>
    </form>
  );
}
```

---

## Data Flow Patterns

### Server → Client (Props)

**Pattern**: Pass data from server component to client component via props

```typescript
// Server component
import { ClientDisplay } from './client-display';

export async function ServerWrapper() {
  const data = await fetchData(); // Server-side fetch

  return <ClientDisplay data={data} />; // Pass via props
}

// Client component
'use client';

export function ClientDisplay({ data }: { data: Data }) {
  const [filtered, setFiltered] = useState(data);
  // Client-side filtering, sorting, etc.
  return <div>{/* Render filtered data */}</div>;
}
```

### Client → Server (Server Actions)

**Pattern**: Call server action from client component

```typescript
// Client component
'use client';

import { updateEvent } from '@/actions/event-actions';

export function UpdateEventButton({ eventId }: { eventId: string }) {
  const handleUpdate = async () => {
    await updateEvent(eventId, { status: 'confirmed' });
    // Optionally refresh data
  };

  return <button onClick={handleUpdate}>Confirm Event</button>;
}
```

### Server → Server (Direct Calls)

**Pattern**: Server components call library functions directly

```typescript
// Server component
import { getEvents } from '@/lib/events/get-events';

export async function EventList() {
  const events = await getEvents(tenantId); // Direct function call
  return <div>{/* Render events */}</div>;
}
```

---

## Bundle Impact

### Server Components

**JavaScript Bundle**: Zero (code not sent to client)
**HTML Size**: Increases (rendered HTML sent to client)

### Client Components

**JavaScript Bundle**: Increases (component code + dependencies sent to client)
**HTML Size**: Same (initial render is HTML)

### Decision Matrix

| Requirement | Use Server Component | Use Client Component |
|-------------|---------------------|---------------------|
| Needs user interaction | ❌ | ✅ |
| Needs React hooks | ❌ | ✅ |
| Needs browser APIs | ❌ | ✅ |
| Displays static data | ✅ | ❌ |
| Queries database | ✅ | ❌ |
| Reduces bundle size | ✅ | ❌ |

**Default**: Server component (unless requirement dictates client component)

---

## Enforcement

**Compiler**: Next.js bundler enforces server/client boundaries (errors on violation)

**Code Review**: Check for unnecessary client components (convert to server if possible)

**Linting** (optional, post-V1): ESLint rule to flag large client components

---

**Authority**: These component boundaries are enforced by Next.js 14 App Router. Violations result in build errors.
