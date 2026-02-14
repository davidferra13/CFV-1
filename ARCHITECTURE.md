# ChefFlow V1 - Architecture Documentation

**Version**: 1.0
**Last Updated**: 2026-02-13

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Application Layers](#application-layers)
- [Data Flow](#data-flow)
- [Security Architecture](#security-architecture)
- [Multi-Tenant Design](#multi-tenant-design)
- [Technology Stack](#technology-stack)
- [Design Principles](#design-principles)

---

## Overview

ChefFlow V1 is a private chef business operating system built on a **ledger-first**, **multi-tenant**, **role-based** architecture. The system is designed with defense-in-depth security, immutable financial records, and strict tenant isolation.

### Core Architectural Principles

1. **Ledger-First Financial Truth** - All financial state derives from an append-only ledger
2. **Database-Enforced Multi-Tenancy** - RLS policies guarantee tenant isolation
3. **Authoritative Role Resolution** - Roles are server-side and database-backed
4. **Immutable Audit Trails** - Critical tables are append-only with trigger enforcement
5. **Minimal Dependencies** - No ORMs, no state management libraries, no bloat

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Browser                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Public  │  │   Chef   │  │  Client  │  │  Stripe  │   │
│  │  Portal  │  │  Portal  │  │  Portal  │  │ Elements │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────┬─────────────────────────────────────────┬─────┘
              │                                         │
              ▼                                         ▼
┌─────────────────────────────────────────┐  ┌──────────────────┐
│         Next.js App Router              │  │   Stripe API     │
│  ┌────────────────────────────────┐    │  │                  │
│  │  Middleware (Role Guard)       │    │  │  - Checkout      │
│  └────────────────────────────────┘    │  │  - Webhooks      │
│  ┌────────────────────────────────┐    │  │  - Intents       │
│  │  Layouts (Defense Layer)       │    │  └──────────────────┘
│  └────────────────────────────────┘    │           │
│  ┌────────────────────────────────┐    │           │
│  │  Server Components             │    │           │
│  └────────────────────────────────┘    │           │
│  ┌────────────────────────────────┐    │           │
│  │  API Routes (Webhooks)         │◄───┼───────────┘
│  └────────────────────────────────┘    │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         Supabase (PostgreSQL)           │
│  ┌────────────────────────────────┐    │
│  │  Row Level Security (RLS)      │    │
│  └────────────────────────────────┘    │
│  ┌────────────────────────────────┐    │
│  │  Immutability Triggers         │    │
│  └────────────────────────────────┘    │
│  ┌────────────────────────────────┐    │
│  │  Tables & Views                │    │
│  │  - chefs                       │    │
│  │  - clients                     │    │
│  │  - events                      │    │
│  │  - ledger_entries              │    │
│  │  - event_transitions           │    │
│  │  - menus                       │    │
│  │  - user_roles                  │    │
│  └────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

---

## Application Layers

### Layer 1: Network (Middleware)

**File**: [`middleware.ts`](middleware.ts)

**Responsibilities**:
- Role-based routing enforcement
- Prevent "flash of wrong portal"
- Redirect before any HTML is served

**Flow**:
```typescript
Request → middleware.ts
  ├─ getCurrentUser() → Supabase Auth + user_roles query
  ├─ Check role vs. route pattern
  └─ Redirect if mismatch OR Allow request
```

### Layer 2: Application (Layouts)

**Files**:
- [`app/(chef)/layout.tsx`](app/(chef)/layout.tsx)
- [`app/(client)/layout.tsx`](app/(client)/layout.tsx)

**Responsibilities**:
- Server-side role verification (defense-in-depth)
- Block client component rendering if unauthorized
- Provide portal-specific UI shell

**Flow**:
```typescript
Layout renders
  ├─ getCurrentUser() (server-side)
  ├─ Verify role matches portal
  └─ Render children OR Redirect
```

### Layer 3: Database (RLS)

**Location**: Supabase Row Level Security Policies

**Responsibilities**:
- Ultimate enforcement of tenant isolation
- Guarantee no data leaks even if app layer fails
- Role-based access control at query level

**Flow**:
```sql
SELECT * FROM events WHERE id = 'abc'
  ├─ RLS evaluates policy
  ├─ Check get_current_user_role() and get_current_tenant_id()
  └─ Return rows OR Empty set (never wrong data)
```

---

## Data Flow

### Event Creation Flow

```
1. Chef creates event in UI
   └─> app/(chef)/events/new/page.tsx

2. Server Component calls Supabase
   └─> lib/events/create-event.ts
       ├─ getCurrentUser() → verify role='chef'
       ├─ Extract tenant_id from user
       └─ INSERT INTO events (tenant_id, ...)

3. Database enforces RLS
   └─> RLS policy: events_chef_insert
       ├─ Check: get_current_user_role() = 'chef'
       ├─ Check: NEW.tenant_id = get_current_tenant_id()
       └─> ALLOW or DENY

4. Return to UI
   └─> Redirect to event details page
```

### Payment Flow

```
1. Client clicks "Pay Now"
   └─> app/(client)/events/[id]/pay/page.tsx

2. Create PaymentIntent
   └─> lib/stripe/create-payment-intent.ts
       ├─ Verify client owns event
       ├─ Calculate amount from ledger
       └─> Stripe.paymentIntents.create()

3. Stripe Elements renders
   └─> Client enters card details
       └─> Stripe.js handles submission

4. Stripe webhook fires
   └─> app/api/webhooks/stripe/route.ts
       ├─ Verify signature
       ├─ Handle 'payment_intent.succeeded'
       └─> lib/ledger/append-entry.ts
           ├─ INSERT ledger_entry (immutable)
           └─> Trigger event state transition

5. Event status updates
   └─> lib/events/transition-event.ts
       ├─ Validate state machine
       ├─ INSERT event_transition (immutable)
       └─> UPDATE events SET status = 'paid'
```

---

## Security Architecture

### Defense in Depth (3 Layers)

| Layer | Technology | Failure Mode | Defense |
|-------|------------|--------------|---------|
| **Network** | Next.js Middleware | Bypass via direct URL | Layer 2 blocks |
| **Application** | Server Component Layout | Logic bug in role check | RLS blocks |
| **Database** | Supabase RLS | Policy misconfiguration | Minimal policy surface |

### Security Guarantees

1. **No Client-Side Role Inference**
   - Roles stored ONLY in `user_roles` table
   - Queried server-side on every request
   - Never cached in localStorage or cookies

2. **No Cross-Tenant Data Leaks**
   - `tenant_id` on all relevant tables
   - RLS policies filter by `get_current_tenant_id()`
   - Queries return empty set, not wrong data

3. **Immutable Financial Records**
   - `ledger_entries` has UPDATE/DELETE triggers that RAISE EXCEPTION
   - Corrections via new `adjustment` entry
   - Stripe webhooks are single-source-of-truth

4. **Service Role Key Protection**
   - Service role key ONLY used server-side (API routes)
   - Never exposed to client bundle
   - Grep-able to verify: `SUPABASE_SERVICE_ROLE_KEY`

---

## Multi-Tenant Design

### Tenant Model

- **Tenant = Chef** (each chef is a separate tenant)
- **Clients belong to one tenant** via `clients.tenant_id`
- **Events scoped to tenant** via `events.tenant_id`

### Tenant Isolation Enforcement

```sql
-- Example: Events table RLS policy for chefs
CREATE POLICY events_chef_select ON events
  FOR SELECT USING (
    auth.uid() IN (
      SELECT auth_user_id FROM user_roles WHERE role = 'chef'
    )
    AND tenant_id = (
      SELECT id FROM chefs WHERE auth_user_id = auth.uid()
    )
  );

-- Example: Events table RLS policy for clients
CREATE POLICY events_client_select ON events
  FOR SELECT USING (
    auth.uid() IN (
      SELECT auth_user_id FROM user_roles WHERE role = 'client'
    )
    AND client_id = (
      SELECT id FROM clients WHERE auth_user_id = auth.uid()
    )
  );
```

### Cross-Tenant Constraints

```sql
-- Prevent events from referencing clients in different tenants
ALTER TABLE events
  ADD CONSTRAINT fk_client_tenant CHECK (
    (SELECT tenant_id FROM clients WHERE id = client_id) = tenant_id
  );
```

---

## Technology Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI (via shadcn/ui)

### Backend
- **Database**: Supabase (PostgreSQL 15+)
- **Auth**: Supabase Auth (JWT-based)
- **Storage**: Supabase Storage (future: file uploads)
- **Payments**: Stripe

### Infrastructure
- **Hosting**: Vercel (Next.js)
- **Database Hosting**: Supabase Cloud
- **Webhooks**: Vercel Edge Functions (API routes)

### Key Libraries
```json
{
  "@supabase/ssr": "0.8.0",
  "@supabase/supabase-js": "2.95.3",
  "stripe": "20.3.1",
  "zod": "4.3.6",
  "date-fns": "4.1.0"
}
```

---

## Design Principles

### 1. Server Components by Default
- Use React Server Components for all pages
- Client components ONLY for interactivity (forms, modals)
- No client-side data fetching (no SWR, React Query)

### 2. No ORMs
- Use Supabase client directly: `supabase.from('events').select()`
- Type safety via generated types: `Database['public']['Tables']['events']`
- No Prisma, Drizzle, or TypeORM

### 3. Ledger-First Financial Design
- NEVER store balances or totals in `events` table
- Compute balances from `event_financial_summary` view
- All money enters via Stripe webhooks

### 4. Immutable Audit Trails
- `ledger_entries` - Immutable via triggers
- `event_transitions` - Immutable via triggers
- `user_roles` - No user-facing updates

### 5. Minimal API Surface
- No REST API endpoints (use Server Actions or Server Components)
- Only ONE API route: `/api/webhooks/stripe`
- All mutations via Server Components or Server Actions

### 6. Progressive Enhancement
- Forms work without JavaScript (via Server Actions)
- Payment forms require JS (Stripe Elements limitation)
- Optimistic UI ONLY for non-financial operations

---

## File Structure

```
app/
├── (public)/           # Public portal (unauthenticated)
│   ├── layout.tsx      # Public shell
│   └── page.tsx        # Landing page
├── (chef)/             # Chef portal (tenant admin)
│   ├── layout.tsx      # Chef auth guard + shell
│   └── dashboard/      # Chef dashboard
├── (client)/           # Client portal (customer view)
│   ├── layout.tsx      # Client auth guard + shell
│   └── my-events/      # Client event list
├── api/
│   └── webhooks/
│       └── stripe/     # Stripe webhook handler
├── layout.tsx          # Root layout
└── globals.css         # Global styles

lib/
├── auth/
│   └── get-user.ts     # getCurrentUser() (authoritative)
├── supabase/
│   ├── client.ts       # Client-side Supabase client
│   └── server.ts       # Server-side Supabase client
├── stripe/             # Stripe integration utilities
├── ledger/             # Ledger append/query functions
└── events/             # Event lifecycle management

supabase/migrations/    # Version-controlled schema
types/database.ts       # Generated TypeScript types
```

---

## Related Documentation

- [Database Schema](DATABASE.md)
- [Security Model](SECURITY.md)
- [Ledger System](LEDGER.md)
- [Event Lifecycle](EVENTS.md)
- [Payment Flow](PAYMENTS.md)

---

**Document Status**: ✅ Complete
**Governance**: Governed by [CHEFFLOW_V1_SCOPE_LOCK.md](CHEFFLOW_V1_SCOPE_LOCK.md)
