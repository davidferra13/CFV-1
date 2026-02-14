# Runtime Model

**Document ID**: 004
**Version**: 1.0
**Status**: LOCKED
**Last Updated**: 2026-02-14

## Purpose

This document defines the complete runtime architecture of ChefFlow V1, including the execution model, rendering strategy, and deployment topology.

## Stack Definition

### Framework: Next.js 14+ (App Router)

**Version**: 14.0.0 or higher
**Mode**: App Router (NOT Pages Router)
**Language**: TypeScript (strict mode)

**Rendering Strategy**:
- **Default**: React Server Components (RSC)
- **Client Components**: Explicitly marked with `'use client'`
- **Server Actions**: Explicitly marked with `'use server'`
- **Static Generation**: NOT used in V1 (all pages dynamic)
- **Incremental Static Regeneration (ISR)**: NOT used in V1

**Routing Model**:
- File-system based routing (`app/` directory)
- Route groups: `(chef)`, `(client)`, `(public)`
- Middleware-based portal enforcement

### Database: Supabase (PostgreSQL 15+)

**Components Used**:
1. **PostgreSQL Database**: Multi-tenant data storage with RLS
2. **Supabase Auth**: Email/password authentication, session management
3. **Supabase Realtime**: NOT used in V1 (no real-time subscriptions)
4. **Supabase Storage**: NOT used in V1 (no file uploads)

**Client Libraries**:
- `@supabase/ssr` - Server-side rendering support
- `@supabase/supabase-js` - Core client library

**Connection Model**:
- **Server-side**: Uses service role key (bypasses RLS for admin operations)
- **Client-side**: Uses anon key (RLS enforced)
- **Session**: Stored in HTTP-only cookies (managed by `@supabase/ssr`)

### Payments: Stripe

**API Version**: `2024-11-20.acacia` (latest as of V1 freeze)
**Components Used**:
1. **Payment Intents**: One-time card payments
2. **Webhooks**: Event-driven ledger updates
3. **Stripe Elements**: Client-side card input (PCI-compliant)

**Client Libraries**:
- `stripe` (Node.js SDK, server-side)
- `@stripe/stripe-js` (client-side, loads Stripe.js)
- `@stripe/react-stripe-js` (React integration for Elements)

**NOT Used in V1**:
- Stripe Checkout (using Elements instead for embedded UX)
- Stripe Subscriptions (no recurring billing)
- Stripe Connect (no marketplace payouts automation)
- Stripe Customer Portal (no self-service)

### Styling: Tailwind CSS + shadcn/ui

**Tailwind Version**: 3.4+
**Component Library**: shadcn/ui (Radix UI primitives + Tailwind)
**CSS Approach**: Utility-first, no CSS-in-JS

**Prohibited**:
- styled-components
- Emotion
- CSS Modules (use Tailwind only)
- Sass/SCSS

### Validation: Zod

**Purpose**: Runtime type validation for:
- Form inputs (server actions)
- API request bodies
- Environment variables
- Webhook payloads

**Pattern**:
```typescript
const eventSchema = z.object({
  title: z.string().min(1).max(200),
  event_date: z.string().datetime(),
  guest_count: z.number().int().positive(),
  // ...
});

// In server action
const validated = eventSchema.parse(formData);
```

### Date Handling: date-fns

**Purpose**: Date parsing, formatting, and manipulation
**NOT Used**: Moment.js (deprecated), Day.js (unnecessary for V1)

**Pattern**:
```typescript
import { format, parseISO } from 'date-fns';

const displayDate = format(parseISO(event.event_date), 'PPP');
// Output: "February 14, 2026"
```

---

## Execution Model

### Server-Side Rendering (SSR)

**Default Behavior**:
- ALL pages in `/app` are server-rendered by default
- Pages fetch data during server render (no client-side fetching)
- HTML sent to client is fully populated (no loading spinners)

**Example**:
```typescript
// app/(chef)/dashboard/page.tsx
export default async function DashboardPage() {
  const user = await getCurrentUser(); // Server-side auth check
  const events = await getEvents(user.tenantId); // Server-side data fetch

  return <EventList events={events} />; // Rendered on server
}
```

**Advantages**:
- Faster initial page load (no client-side fetch waterfall)
- SEO-friendly (fully rendered HTML)
- Security (sensitive queries never exposed to client)

### React Server Components (RSC)

**What Are RSC**:
- Components that run ONLY on the server
- Can directly query database, call server functions
- Cannot use React hooks (`useState`, `useEffect`)
- Cannot attach event handlers (`onClick`, `onChange`)

**Usage Pattern**:
```typescript
// app/(chef)/events/[id]/page.tsx (Server Component)
export default async function EventDetailPage({ params }: { params: { id: string } }) {
  const event = await getEventById(params.id); // Direct DB query

  return (
    <div>
      <h1>{event.title}</h1>
      {/* Can nest client components */}
      <PaymentButton eventId={event.id} />
    </div>
  );
}
```

**When to Use**:
- Page components (default)
- Layout components (default)
- Data display components (no interactivity)

### Client Components

**What Are Client Components**:
- Components that run on BOTH server (initial render) and client (hydration)
- Marked with `'use client'` directive
- CAN use React hooks, event handlers
- CANNOT directly query database

**Usage Pattern**:
```typescript
// components/payment-button.tsx (Client Component)
'use client';

import { useState } from 'react';

export function PaymentButton({ eventId }: { eventId: string }) {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    // Call server action
    await createPaymentIntent(eventId);
    setLoading(false);
  };

  return (
    <button onClick={handlePayment} disabled={loading}>
      {loading ? 'Processing...' : 'Pay Now'}
    </button>
  );
}
```

**When to Use**:
- Forms (user input, validation, submission)
- Interactive UI (modals, dropdowns, tabs)
- Third-party libraries that require browser APIs (Stripe Elements)

**Rule**: Minimize client components. Prefer server components when possible.

### Server Actions

**What Are Server Actions**:
- Functions that run on the server, callable from client components
- Marked with `'use server'` directive
- Automatically exposed as POST endpoints
- Type-safe (TypeScript infers types across boundary)

**Usage Pattern**:
```typescript
// actions/event-actions.ts
'use server';

import { z } from 'zod';

const createEventSchema = z.object({
  title: z.string().min(1),
  event_date: z.string().datetime(),
  // ...
});

export async function createEvent(formData: FormData) {
  const user = await getCurrentUser();
  if (user.role !== 'chef') {
    throw new Error('Unauthorized');
  }

  const data = createEventSchema.parse({
    title: formData.get('title'),
    event_date: formData.get('event_date'),
    // ...
  });

  const supabase = createServerClient();
  const { data: event, error } = await supabase
    .from('events')
    .insert({ ...data, tenant_id: user.tenantId })
    .select()
    .single();

  if (error) throw error;
  return event;
}
```

**Call from Client Component**:
```typescript
'use client';

import { createEvent } from '@/actions/event-actions';

export function CreateEventForm() {
  return (
    <form action={createEvent}>
      <input name="title" required />
      <input name="event_date" type="datetime-local" required />
      <button type="submit">Create Event</button>
    </form>
  );
}
```

**Advantages**:
- No API route boilerplate
- Type-safe (client knows function signature)
- Progressive enhancement (works without JS)

**When to Use**:
- Form submissions
- Data mutations (create, update, delete)
- Actions requiring authentication

---

## Deployment Topology

### Hosting: Vercel

**Platform**: Vercel (Hobby or Pro plan)
**Regions**: Auto (Vercel selects optimal region)
**Build Command**: `npm run build`
**Output Directory**: `.next/` (default Next.js output)

**Environment Variables** (set in Vercel dashboard):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (secret, server-only)
- `STRIPE_SECRET_KEY` (secret, server-only)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET` (secret, webhook signature verification)

**Deployment Triggers**:
- **Production**: Push to `main` branch
- **Preview**: Push to any branch (creates preview URL)

### Database: Supabase Cloud

**Hosting**: Supabase-managed PostgreSQL (AWS or GCP)
**Plan**: Free tier (development), Pro (production)
**Connection**: Pooler (connection pooling for serverless)

**Database Environments**:
- **Local**: `supabase start` (Docker-based local Supabase)
- **Staging** (optional): Separate Supabase project
- **Production**: Separate Supabase project

**Migrations**:
- Stored in `supabase/migrations/` directory
- Applied via Supabase CLI (`supabase db push`)
- Version-controlled (git)

### Payments: Stripe Cloud

**Mode**:
- **Test Mode**: Used for local/staging (test card numbers)
- **Live Mode**: Used for production (real payments)

**Webhook Endpoints**:
- **Local**: `https://localhost:3000/api/webhooks/stripe` (via Stripe CLI)
- **Production**: `https://chefflow.app/api/webhooks/stripe`

**Stripe CLI** (local development):
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

---

## Runtime Boundaries

### What Runs Where

| Component | Server | Client | Both |
|-----------|--------|--------|------|
| Pages (default) | ✅ | ❌ | ❌ |
| Layouts | ✅ | ❌ | ❌ |
| Server Components | ✅ | ❌ | ❌ |
| Client Components | ❌ | ❌ | ✅ (SSR + hydration) |
| Server Actions | ✅ | ❌ | ❌ |
| API Routes | ✅ | ❌ | ❌ |
| Middleware | ✅ (Edge) | ❌ | ❌ |

### Environment Access

| Resource | Server | Client |
|----------|--------|--------|
| Database (RLS bypass) | ✅ (service role key) | ❌ |
| Database (RLS enforced) | ✅ (anon key) | ✅ (anon key) |
| Stripe Secret Key | ✅ | ❌ |
| Stripe Publishable Key | ✅ | ✅ |
| Environment Variables | ✅ (all) | ✅ (`NEXT_PUBLIC_*` only) |
| File System | ✅ | ❌ |
| Cookies (read/write) | ✅ | ❌ (read-only) |

---

## Rendering Flow

### Page Request Lifecycle

1. **Client Request**: Browser requests `/dashboard`
2. **Middleware**: Checks auth, resolves role, enforces portal rules
   - If unauthorized: Redirect to `/` (public landing)
   - If wrong portal: Redirect to correct portal
   - If authorized: Continue
3. **Layout Render** (server): `app/(chef)/layout.tsx`
   - Fetches user data (server component)
   - Renders navigation, header
4. **Page Render** (server): `app/(chef)/dashboard/page.tsx`
   - Fetches dashboard data (events, clients)
   - Renders page content
5. **HTML Response**: Fully rendered HTML sent to client
6. **Hydration** (client): React attaches event listeners to interactive components
7. **Client Interaction**: User clicks button, triggers client-side logic
8. **Server Action Call**: Client component calls server action (POST request)
9. **Server Action Execution**: Server validates, mutates data, returns result
10. **Revalidation**: Next.js re-renders affected pages (server-side)
11. **UI Update**: Client receives updated HTML, React updates DOM

---

## Performance Characteristics

### Cold Start (Vercel Serverless)

**Definition**: Time from request to first byte when function is not warm

**Typical Values**:
- **Warm**: 50-200ms
- **Cold**: 500-2000ms (first request after idle)

**Mitigation**:
- Vercel keeps functions warm with traffic
- No manual warm-up in V1 (added cost, complexity)

### Database Query Performance

**Connection Pooling**: Supabase Pooler (prevents connection exhaustion)
**Query Optimization**: Indexes on `tenant_id`, `event_id`, `created_at`

**Typical Query Times**:
- Simple SELECT (by ID): 5-20ms
- Filtered SELECT (by tenant_id): 10-50ms
- JOIN query (events + clients): 20-100ms
- Ledger aggregation (SUM): 50-200ms

**NOT Optimized in V1**:
- Pagination (all queries return full result sets)
- Caching (no Redis, no CDN caching)

### Webhook Processing

**Stripe Webhook Timeout**: 30 seconds (Vercel function timeout)
**Typical Processing Time**: 100-500ms

**Bottlenecks**:
- Database write latency (ledger entry insert)
- Event state transition (requires SELECT + UPDATE)

**Reliability**:
- Stripe retries failed webhooks (exponential backoff)
- Idempotency prevents duplicate processing

---

## Constraints

### Vercel Limits (Hobby Plan)

- **Function Timeout**: 10 seconds
- **Function Memory**: 1024 MB
- **Bandwidth**: 100 GB/month
- **Build Time**: 45 minutes
- **Concurrent Builds**: 1

**Mitigation**: Upgrade to Pro if limits exceeded.

### Supabase Limits (Free Plan)

- **Database Size**: 500 MB
- **Bandwidth**: 5 GB/month
- **Storage**: 1 GB (not used in V1)
- **API Requests**: 500,000/month

**Mitigation**: Upgrade to Pro before launch.

### Stripe Limits

- **Test Mode**: Unlimited transactions
- **Live Mode**: No hard limits (fees apply)

---

## Non-Features (Runtime)

**NOT Implemented**:
- Static Site Generation (SSG)
- Incremental Static Regeneration (ISR)
- Edge rendering (middleware only)
- WebSockets (no real-time)
- Service Workers (no offline support)
- Background jobs (no cron, no queues)
- CDN caching (all requests dynamic)

**Rationale**: V1 is server-rendered, dynamic, and simple. Optimization deferred to V2.

---

**Authority**: This runtime model is fixed for V1. Stack changes require scope unlock.
