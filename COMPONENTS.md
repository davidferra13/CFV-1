# UI Component Architecture

**Version**: 1.0
**Last Updated**: 2026-02-13
**Status**: Locked per CHEFFLOW_V1_SCOPE_LOCK.md

This document describes the component architecture, patterns, and guidelines for ChefFlow V1.

---

## Table of Contents

1. [Overview](#overview)
2. [Component Patterns](#component-patterns)
3. [Layout Structure](#layout-structure)
4. [Styling Guidelines](#styling-guidelines)
5. [Server vs Client Components](#server-vs-client-components)
6. [Common Components](#common-components)

---

## Overview

ChefFlow V1 uses **React Server Components** (Next.js 14 App Router) with minimal client-side JavaScript.

### Tech Stack

- **Framework**: Next.js 14 App Router
- **Styling**: Tailwind CSS
- **UI Library**: shadcn/ui (Radix UI primitives)
- **Icons**: Lucide React (if needed)
- **Forms**: Native HTML forms + Server Actions

### Principles

- **Server-first**: Default to Server Components
- **Progressive enhancement**: Works without JavaScript
- **Minimal client state**: Use Server Actions for mutations
- **Accessibility**: Semantic HTML, ARIA labels

---

## Component Patterns

### Server Component (Default)

Most components are Server Components:

```typescript
// app/(chef)/dashboard/page.tsx
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

export default async function ChefDashboard() {
  const chef = await requireChef()
  const supabase = createServerClient()

  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('tenant_id', chef.tenantId)

  return (
    <div>
      <h1>Dashboard</h1>
      <EventList events={events} />
    </div>
  )
}
```

**Benefits**:
- Direct database access
- No client bundle size
- SEO friendly
- Fast initial load

### Client Component (Use Sparingly)

Only for interactivity:

```typescript
'use client'

import { useState } from 'react'
import { createEvent } from '@/app/actions/create-event'

export function CreateEventForm() {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    await createEvent(formData)
    setLoading(false)
  }

  return (
    <form action={handleSubmit}>
      <input name="title" required />
      <button disabled={loading}>
        {loading ? 'Creating...' : 'Create Event'}
      </button>
    </form>
  )
}
```

**Use client components for**:
- Forms with loading states
- Interactive UI (dropdowns, modals, tabs)
- Third-party libraries (Stripe Elements)

---

## Layout Structure

### Route Groups

ChefFlow uses route groups for portal isolation:

```
app/
├── (public)/       # Public pages (landing, pricing)
│   ├── layout.tsx  # Public layout
│   └── page.tsx    # Homepage
├── (chef)/         # Chef portal
│   ├── layout.tsx  # Chef layout (requires auth)
│   └── dashboard/
│       └── page.tsx
├── (client)/       # Client portal
│   ├── layout.tsx  # Client layout (requires auth)
│   └── my-events/
│       └── page.tsx
└── layout.tsx      # Root layout (global)
```

### Root Layout

```typescript
// app/layout.tsx
import './globals.css'

export const metadata = {
  title: 'ChefFlow',
  description: 'Private chef event management'
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

### Chef Portal Layout

```typescript
// app/(chef)/layout.tsx
import { requireChef } from '@/lib/auth/get-user'
import { ChefNav } from '@/components/chef-nav'

export default async function ChefLayout({
  children
}: {
  children: React.ReactNode
}) {
  const chef = await requireChef() // Throws if not chef

  return (
    <div className="min-h-screen">
      <ChefNav user={chef} />
      <main className="container mx-auto p-6">
        {children}
      </main>
    </div>
  )
}
```

### Client Portal Layout

```typescript
// app/(client)/layout.tsx
import { requireClient } from '@/lib/auth/get-user'
import { ClientNav } from '@/components/client-nav'

export default async function ClientLayout({
  children
}: {
  children: React.ReactNode
}) {
  const client = await requireClient() // Throws if not client

  return (
    <div className="min-h-screen">
      <ClientNav user={client} />
      <main className="container mx-auto p-6">
        {children}
      </main>
    </div>
  )
}
```

---

## Styling Guidelines

### Tailwind CSS

Use utility classes:

```tsx
<div className="flex items-center gap-4 p-6 bg-white rounded-lg shadow">
  <h2 className="text-2xl font-bold text-gray-900">Title</h2>
  <p className="text-gray-600">Description</p>
</div>
```

### Custom Components

Wrap common patterns:

```typescript
// components/card.tsx
export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      {children}
    </div>
  )
}

// Usage
<Card>
  <h2>Event Details</h2>
</Card>
```

### Responsive Design

Mobile-first approach:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* 1 column on mobile, 2 on tablet, 3 on desktop */}
</div>
```

---

## Server vs Client Components

### Decision Tree

```
Need interactivity? (onClick, useState, etc.)
  ├─ YES → Client Component ('use client')
  └─ NO → Server Component (default)

Need to fetch data?
  ├─ Server Component → Direct DB access
  └─ Client Component → Call Server Action
```

### Composition Pattern

Server Component wraps Client Component:

```typescript
// app/(chef)/events/page.tsx (Server)
import { EventFilters } from './event-filters' // Client

export default async function EventsPage() {
  const events = await fetchEvents()

  return (
    <div>
      <EventFilters /> {/* Client component */}
      <EventList events={events} /> {/* Server component */}
    </div>
  )
}
```

### Passing Server Data to Client

Use props (serialize-able only):

```typescript
// Server Component
<ClientComponent data={events} />

// Client Component
'use client'
export function ClientComponent({ data }: { data: Event[] }) {
  const [filtered, setFiltered] = useState(data)
  // ...
}
```

---

## Common Components

### EventCard

```typescript
// components/event-card.tsx
import { Database } from '@/types/database'

type Event = Database['public']['Tables']['events']['Row']

export function EventCard({ event }: { event: Event }) {
  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-bold">{event.title}</h3>
      <p className="text-sm text-gray-600">
        {new Date(event.event_date).toLocaleDateString()}
      </p>
      <p className="text-sm">
        {event.guest_count} guests · {event.location}
      </p>
      <div className="mt-2">
        <span className="inline-block px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
          {event.status}
        </span>
      </div>
    </div>
  )
}
```

### StatusBadge

```typescript
// components/status-badge.tsx
const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  proposed: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  confirmed: 'bg-green-100 text-green-800',
  in_progress: 'bg-purple-100 text-purple-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800'
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2 py-1 text-xs rounded ${statusColors[status]}`}>
      {status}
    </span>
  )
}
```

### FormButton

```typescript
// components/form-button.tsx
'use client'

import { useFormStatus } from 'react-dom'

export function FormButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
    >
      {pending ? 'Loading...' : children}
    </button>
  )
}
```

---

## Forms with Server Actions

### Pattern

```typescript
// app/actions/create-event.ts
'use server'

export async function createEvent(formData: FormData) {
  const chef = await requireChef()

  const result = await supabase.from('events').insert({
    tenant_id: chef.tenantId,
    title: formData.get('title'),
    // ...
  })

  if (result.error) {
    return { error: result.error.message }
  }

  redirect('/chef/events')
}
```

```typescript
// components/create-event-form.tsx
import { createEvent } from '@/app/actions/create-event'
import { FormButton } from '@/components/form-button'

export function CreateEventForm() {
  return (
    <form action={createEvent}>
      <input name="title" required />
      <FormButton>Create Event</FormButton>
    </form>
  )
}
```

---

## Accessibility

### Semantic HTML

```tsx
<article>
  <header>
    <h1>Event Title</h1>
  </header>
  <section>
    <p>Details...</p>
  </section>
</article>
```

### ARIA Labels

```tsx
<button aria-label="Delete event" onClick={handleDelete}>
  <TrashIcon />
</button>
```

### Form Labels

```tsx
<label htmlFor="title">Event Title</label>
<input id="title" name="title" required />
```

---

## Related Documentation

- [DEVELOPMENT.md](./DEVELOPMENT.md) - Local setup
- [API_REFERENCE.md](./API_REFERENCE.md) - Server Actions
- [TESTING.md](./TESTING.md) - Component testing

---

**Last Updated**: 2026-02-13
**Maintained By**: ChefFlow V1 Team
