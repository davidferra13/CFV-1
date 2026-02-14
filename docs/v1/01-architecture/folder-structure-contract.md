# Folder Structure Contract

**Document ID**: 005
**Version**: 1.0
**Status**: LOCKED
**Last Updated**: 2026-02-14

## Purpose

This document defines the authoritative folder structure for ChefFlow V1. All code MUST follow this structure. No exceptions.

## Root-Level Structure

```
CFv1/
├── app/                    # Next.js App Router (pages, layouts, routes)
├── components/             # Shared React components
├── lib/                    # Business logic, utilities, clients
├── actions/                # Server actions (mutations)
├── types/                  # TypeScript type definitions
├── supabase/               # Database migrations, types
├── scripts/                # Verification scripts, utilities
├── docs/                   # Documentation (this directory)
├── public/                 # Static assets (images, fonts)
├── .env.local.example      # Example environment variables
├── .env.local              # Local environment variables (gitignored)
├── middleware.ts           # Next.js middleware (portal enforcement)
├── next.config.js          # Next.js configuration
├── tailwind.config.ts      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
├── package.json            # Dependencies
└── README.md               # Project overview
```

---

## `/app` - Next.js App Router

**Purpose**: File-system based routing, pages, layouts, API routes

### Structure

```
app/
├── (public)/               # Public portal (landing, pricing, contact)
│   ├── layout.tsx          # Public layout (header, footer)
│   ├── page.tsx            # Landing page (/)
│   ├── pricing/
│   │   └── page.tsx        # Pricing page (/pricing)
│   └── contact/
│       └── page.tsx        # Contact page (/contact)
│
├── (chef)/                 # Chef portal (protected)
│   ├── layout.tsx          # Chef layout (sidebar, header)
│   ├── dashboard/
│   │   └── page.tsx        # Chef dashboard (/dashboard)
│   ├── events/
│   │   ├── page.tsx        # Event list (/events)
│   │   ├── [id]/
│   │   │   ├── page.tsx    # Event detail (/events/[id])
│   │   │   └── edit/
│   │   │       └── page.tsx # Edit event (/events/[id]/edit)
│   │   └── create/
│   │       └── page.tsx    # Create event (/events/create)
│   ├── clients/
│   │   ├── page.tsx        # Client list (/clients)
│   │   ├── [id]/
│   │   │   └── page.tsx    # Client detail (/clients/[id])
│   │   └── invite/
│   │       └── page.tsx    # Invite client (/clients/invite)
│   ├── menus/
│   │   ├── page.tsx        # Menu list (/menus)
│   │   ├── [id]/
│   │   │   └── page.tsx    # Menu detail (/menus/[id])
│   │   └── create/
│   │       └── page.tsx    # Create menu (/menus/create)
│   └── ledger/
│       └── page.tsx        # Ledger view (/ledger)
│
├── (client)/               # Client portal (protected)
│   ├── layout.tsx          # Client layout (header, nav)
│   ├── my-events/
│   │   ├── page.tsx        # Event list (/my-events)
│   │   └── [id]/
│   │       ├── page.tsx    # Event detail (/my-events/[id])
│   │       └── payment/
│   │           └── page.tsx # Payment page (/my-events/[id]/payment)
│   └── profile/
│       └── page.tsx        # Client profile (/profile)
│
├── api/                    # API routes
│   └── webhooks/
│       └── stripe/
│           └── route.ts    # Stripe webhook handler (POST /api/webhooks/stripe)
│
├── layout.tsx              # Root layout (HTML structure, global styles)
├── page.tsx                # Root page (redirects to landing or dashboard)
└── globals.css             # Global Tailwind CSS imports
```

### Route Groups Explained

**Route Groups**: `(name)` syntax creates folder without affecting URL path

**Purpose**:
- Organize routes by portal (public, chef, client)
- Apply different layouts per portal
- Middleware enforcement by group

**Example**:
- File: `app/(chef)/dashboard/page.tsx`
- URL: `/dashboard` (NOT `/chef/dashboard`)

### Layout Hierarchy

```
Root Layout (app/layout.tsx)
└── Public Layout (app/(public)/layout.tsx)
    └── Public Pages (landing, pricing, contact)

Root Layout (app/layout.tsx)
└── Chef Layout (app/(chef)/layout.tsx)
    └── Chef Pages (dashboard, events, clients, menus, ledger)

Root Layout (app/layout.tsx)
└── Client Layout (app/(client)/layout.tsx)
    └── Client Pages (my-events, profile)
```

**Rule**: Layouts are **nested**. Child layout inherits parent layout.

### Special Files

| Filename | Purpose | Required? |
|----------|---------|-----------|
| `layout.tsx` | Wraps page content, persists across navigations | Yes (at least root) |
| `page.tsx` | Page component (maps to route) | Yes (for each route) |
| `loading.tsx` | Loading UI (Suspense boundary) | No (not used in V1) |
| `error.tsx` | Error boundary | No (added in 06-observability) |
| `not-found.tsx` | 404 page | No (default Next.js 404) |
| `route.ts` | API route handler | Only for `/api` routes |

---

## `/components` - Shared React Components

**Purpose**: Reusable UI components used across multiple pages

### Structure

```
components/
├── ui/                     # shadcn/ui components (auto-generated)
│   ├── button.tsx
│   ├── input.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   └── ...
│
├── events/                 # Event-specific components
│   ├── event-card.tsx
│   ├── event-list.tsx
│   ├── event-form.tsx
│   └── event-status-badge.tsx
│
├── clients/                # Client-specific components
│   ├── client-card.tsx
│   └── client-list.tsx
│
├── menus/                  # Menu-specific components
│   ├── menu-card.tsx
│   └── menu-list.tsx
│
├── payments/               # Payment components
│   ├── stripe-payment-form.tsx
│   └── payment-receipt.tsx
│
└── layout/                 # Layout components
    ├── header.tsx
    ├── sidebar.tsx
    └── footer.tsx
```

### Component Rules

**Server vs Client**:
- **Default**: Server components (no `'use client'`)
- **Client**: Only when needed (forms, interactive UI, Stripe Elements)

**Naming**:
- PascalCase for component files: `EventCard.tsx` → `export function EventCard`
- Folder names: kebab-case (`event-card.tsx`)

**Location**:
- Shared components: `/components`
- Page-specific components: Inline in page file (no separate file)

---

## `/lib` - Business Logic & Utilities

**Purpose**: Core business logic, API clients, helper functions

### Structure

```
lib/
├── supabase/               # Supabase client configuration
│   ├── client.ts           # Browser client (anon key)
│   ├── server.ts           # Server client (service role key)
│   └── middleware.ts       # Middleware client (edge runtime)
│
├── stripe/                 # Stripe client configuration
│   ├── client.ts           # Browser client (publishable key)
│   └── server.ts           # Server client (secret key)
│
├── auth/                   # Authentication utilities
│   ├── get-user.ts         # getCurrentUser() helper
│   └── session.ts          # Session management utilities
│
├── events/                 # Event business logic
│   ├── get-events.ts       # Fetch events (tenant-scoped)
│   ├── get-event.ts        # Fetch single event
│   ├── transition-event.ts # State machine transitions
│   └── validate-transition.ts # Transition validation logic
│
├── ledger/                 # Ledger business logic
│   ├── get-ledger.ts       # Fetch ledger entries
│   └── compute-balance.ts  # Compute event financial summary
│
├── clients/                # Client business logic
│   ├── get-clients.ts      # Fetch clients (tenant-scoped)
│   └── create-invitation.ts # Generate invitation token
│
└── utils/                  # General utilities
    ├── format-currency.ts  # Format cents to USD string
    ├── format-date.ts      # Format ISO date to display
    └── cn.ts               # Tailwind className utility
```

### Library Rules

**No Side Effects**:
- Functions in `/lib` MUST be pure (deterministic, no global state)
- Exception: Database queries (acceptable side effect)

**Server-Only**:
- Functions querying database with service role key MUST be marked `'use server'`
- Or imported only by server components (enforced by bundler)

**Exports**:
- Each file exports one primary function (matches filename)
- Example: `get-events.ts` exports `getEvents()`

---

## `/actions` - Server Actions

**Purpose**: Server-side mutations callable from client components

### Structure

```
actions/
├── event-actions.ts        # Event mutations (create, update, delete, transition)
├── client-actions.ts       # Client mutations (invite, update)
├── menu-actions.ts         # Menu mutations (create, update, delete)
└── payment-actions.ts      # Payment mutations (create payment intent)
```

### Action Rules

**File-Level Directive**:
```typescript
'use server';
// All exports in this file are server actions
```

**Function Signature**:
```typescript
export async function createEvent(formData: FormData): Promise<Event> {
  // 1. Auth check
  const user = await getCurrentUser();
  if (user.role !== 'chef') throw new Error('Unauthorized');

  // 2. Validation
  const data = eventSchema.parse(/* extract from formData */);

  // 3. Mutation
  const event = await supabase.from('events').insert(data).select().single();

  // 4. Return result
  return event;
}
```

**Error Handling**:
- Throw errors (caught by client error boundary)
- Or return `{ error: string }` (client handles gracefully)

---

## `/types` - TypeScript Definitions

**Purpose**: Shared TypeScript types, interfaces, enums

### Structure

```
types/
├── database.ts             # Generated from Supabase schema (auto-generated)
├── events.ts               # Event-related types (EventStatus enum, etc.)
├── ledger.ts               # Ledger types (LedgerEntryType enum, etc.)
└── index.ts                # Re-exports all types
```

### Type Rules

**Database Types**:
- `database.ts` is auto-generated: `supabase gen types typescript --local > types/database.ts`
- NEVER manually edit `database.ts`

**Domain Types**:
- Define enums, interfaces, type aliases
- Example:
```typescript
// types/events.ts
export enum EventStatus {
  DRAFT = 'draft',
  PROPOSED = 'proposed',
  ACCEPTED = 'accepted',
  PAID = 'paid',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}
```

---

## `/supabase` - Database Files

**Purpose**: Database migrations, SQL functions, RLS policies

### Structure

```
supabase/
├── migrations/             # SQL migration files (version-controlled)
│   ├── 20260213000001_initial_schema.sql
│   └── 20260213000002_rls_policies.sql
│
└── config.toml             # Supabase CLI configuration (auto-generated)
```

### Migration Rules

**Naming Convention**:
- `YYYYMMDDHHMMSS_description.sql`
- Example: `20260213000001_initial_schema.sql`

**Order**:
- Migrations applied in chronological order (lexicographic sort)

**Immutability**:
- Deployed migrations MUST NOT be edited (create new migration instead)

---

## `/scripts` - Verification & Utilities

**Purpose**: SQL verification scripts, test harnesses, utilities

### Structure

```
scripts/
├── verify-rls.sql          # RLS policy verification
├── verify-immutability.sql # Immutability trigger verification
├── verify-migrations.sql   # Schema verification
├── verify-rls-harness.ts   # TypeScript RLS test harness
└── README.md               # Script usage documentation
```

### Script Rules

**SQL Scripts**:
- Run via `psql` or Supabase CLI
- Return exit code 0 if pass, 1 if fail
- Output human-readable results

**TypeScript Scripts**:
- Run via `ts-node` or `tsx`
- Use Supabase client to test queries
- Assert expected results, throw on failure

---

## `/docs` - Documentation

**Purpose**: System architecture, guides, reference

**Structure**: See parent directory (this file is in `/docs/v1/01-architecture/`)

---

## `/public` - Static Assets

**Purpose**: Images, fonts, favicons, static files

### Structure

```
public/
├── images/
│   └── logo.svg
├── favicon.ico
└── robots.txt
```

**Rule**: Files in `/public` are served from root URL
- Example: `public/images/logo.svg` → `/images/logo.svg`

---

## Configuration Files (Root)

### Environment Variables

**Files**:
- `.env.local.example` - Template (committed to git)
- `.env.local` - Actual values (gitignored)

**Required Variables**:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx... # SECRET (server-only)

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx # SECRET
STRIPE_WEBHOOK_SECRET=whsec_xxx # SECRET
```

### `middleware.ts`

**Purpose**: Next.js middleware (runs on Edge runtime)
**Responsibilities**:
- Auth check (session exists?)
- Role resolution (chef or client?)
- Portal enforcement (redirect if wrong portal)

**Location**: Root (NOT in `/app`)

### `next.config.js`

**Purpose**: Next.js configuration
**Contents** (V1 is minimal):
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Strict mode enabled
  reactStrictMode: true,
};

module.exports = nextConfig;
```

### `tailwind.config.ts`

**Purpose**: Tailwind CSS configuration
**Contents**: shadcn/ui preset + custom theme (if needed)

### `tsconfig.json`

**Purpose**: TypeScript compiler configuration
**Contents**:
```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

**Rule**: `strict: true` is non-negotiable. No `any` types without explicit `// @ts-expect-error`.

---

## Import Path Rules

### Absolute Imports

**Pattern**: Use `@/` alias for absolute imports

**Examples**:
```typescript
// Good (absolute)
import { getCurrentUser } from '@/lib/auth/get-user';
import { Button } from '@/components/ui/button';

// Bad (relative)
import { getCurrentUser } from '../../../lib/auth/get-user';
```

**Configuration** (`tsconfig.json`):
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### Import Order

**Preferred Order**:
1. React imports
2. Next.js imports
3. Third-party libraries
4. Internal libraries (`@/lib`)
5. Internal components (`@/components`)
6. Internal actions (`@/actions`)
7. Internal types (`@/types`)
8. Relative imports (same directory)

**Example**:
```typescript
import { useState } from 'react';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/get-user';
import { Button } from '@/components/ui/button';
import { createEvent } from '@/actions/event-actions';
import { EventStatus } from '@/types/events';
import { EventForm } from './event-form';
```

---

## File Naming Rules

### TypeScript/TSX Files

**Pattern**: kebab-case
- `get-user.ts`
- `event-card.tsx`
- `create-event.tsx`

**NOT**:
- PascalCase: `GetUser.ts` ❌
- camelCase: `getUser.ts` ❌
- snake_case: `get_user.ts` ❌

### Folders

**Pattern**: kebab-case
- `app/(chef)/events/`
- `components/ui/`

### SQL Files

**Pattern**: Timestamp prefix + kebab-case
- `20260213000001_initial_schema.sql`

---

## Prohibited Folders

The following folders MUST NOT exist in V1:

- `/pages` (use `/app` instead, Next.js 14 App Router)
- `/styles` (use Tailwind, no separate CSS files)
- `/models` (use `/lib` instead)
- `/controllers` (use `/actions` instead)
- `/services` (use `/lib` instead)
- `/hooks` (use inline in components, no shared hooks folder in V1)
- `/context` (no React Context in V1)
- `/store` (no state management in V1)

**Rationale**: Enforces Next.js App Router conventions, prevents over-engineering.

---

## Enforcement

**Manual Review**: Code review checklist includes folder structure compliance

**Automated** (optional, post-V1): ESLint plugin to enforce import patterns

---

**Authority**: This folder structure is binding. All new files MUST follow this contract.
