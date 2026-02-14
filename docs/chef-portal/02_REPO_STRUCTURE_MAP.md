# Chef Portal Repository Structure Map (V1)

This document defines the canonical file and folder structure for the ChefFlow V1 repository. This structure enforces separation of concerns, portal isolation, and clear boundaries between server and client code.

---

## 1) Root Directory Structure

```
CFv1/
├── .env.local.example         # Environment variable template
├── .eslintrc.json             # ESLint configuration
├── .gitignore                 # Git ignore patterns
├── README.md                  # Project overview
├── next.config.js             # Next.js configuration
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── tailwind.config.ts         # Tailwind CSS configuration
├── postcss.config.js          # PostCSS configuration
├── middleware.ts              # Global middleware (auth + role routing)
│
├── app/                       # Next.js App Router
├── components/                # React components
├── lib/                       # Shared utilities and services
├── types/                     # TypeScript type definitions
├── public/                    # Static assets
├── supabase/                  # Database migrations and config
├── scripts/                   # Verification and utility scripts
└── docs/                      # Documentation (this directory)
```

---

## 2) `/app` Directory (Next.js App Router)

### 2.1 Overall Structure

```
app/
├── layout.tsx                 # Root layout (global styles, providers)
├── page.tsx                   # Landing page (/)
├── globals.css                # Global styles
│
├── (public)/                  # Public portal (unauthenticated routes)
│   ├── layout.tsx             # Public layout
│   └── page.tsx               # Public home
│
├── (chef)/                    # Chef Portal (authenticated, role=chef|chef_subaccount)
│   ├── layout.tsx             # Chef layout (nav, auth check)
│   ├── dashboard/             # Dashboard page
│   ├── inquiries/             # Inquiries management
│   ├── events/                # Events management
│   ├── menus/                 # Menu templates and event menus
│   ├── clients/               # Client profiles
│   ├── finance/               # Ledger and financial overview
│   └── settings/              # Tenant and user settings
│
├── (client)/                  # Client Portal (authenticated, role=client)
│   ├── layout.tsx             # Client layout (nav, auth check)
│   ├── my-events/             # Client's events
│   └── profile/               # Client profile
│
└── api/                       # API routes
    ├── webhooks/              # Webhook handlers (Stripe, etc.)
    │   └── stripe/
    │       └── route.ts       # Stripe webhook endpoint
    └── ...                    # Other API endpoints (if needed)
```

### 2.2 Route Group Conventions

**Route Groups:** Folders wrapped in parentheses `(...)` don't affect URL paths but allow layout grouping.

- `(public)` — Unauthenticated routes (landing, login, signup)
- `(chef)` — Chef Portal routes (require `chef` or `chef_subaccount` role)
- `(client)` — Client Portal routes (require `client` role)

**Example URLs:**

| File Path | URL | Portal |
|-----------|-----|--------|
| `app/(public)/page.tsx` | `/` | Public |
| `app/(chef)/dashboard/page.tsx` | `/chef/dashboard` | Chef Portal |
| `app/(chef)/events/page.tsx` | `/chef/events` | Chef Portal |
| `app/(client)/my-events/page.tsx` | `/client/my-events` | Client Portal |

---

## 3) `/components` Directory

### 3.1 Structure

```
components/
├── chef/                      # Chef Portal components
│   ├── ChefNavigation.tsx
│   ├── EventCard.tsx
│   ├── MenuEditor.tsx
│   └── ...
│
├── client/                    # Client Portal components
│   ├── ClientNavigation.tsx
│   ├── EventSummary.tsx
│   └── ...
│
├── shared/                    # Shared components (used by both portals)
│   ├── Button.tsx
│   ├── Modal.tsx
│   ├── Toast.tsx
│   └── ...
│
└── ui/                        # Base UI primitives (shadcn/ui or custom)
    ├── button.tsx
    ├── input.tsx
    └── ...
```

### 3.2 Component Naming Conventions

**Folder Structure:**

- `components/chef/` — Chef Portal–specific components
- `components/client/` — Client Portal–specific components
- `components/shared/` — Reusable across portals (e.g., buttons, modals)
- `components/ui/` — Base UI primitives (design system)

**File Naming:**

- PascalCase: `EventCard.tsx`, `ChefNavigation.tsx`
- Component and file name match: `export default function EventCard() {...}`

**Client vs Server Components:**

- **Server components (default):** No `'use client'` directive
- **Client components:** Start with `'use client'` directive

---

## 4) `/lib` Directory

### 4.1 Structure

```
lib/
├── auth/                      # Authentication utilities
│   ├── get-user.ts            # Get authenticated user from session
│   ├── get-user-role.ts       # Resolve user role and tenant
│   └── permissions.ts         # Permission checking helpers
│
├── supabase/                  # Supabase clients
│   ├── client.ts              # Client-side Supabase client
│   └── server.ts              # Server-side Supabase client
│
├── events/                    # Event-related business logic
│   ├── create-event.ts
│   ├── transition-event.ts
│   └── get-event.ts
│
├── ledger/                    # Ledger-related logic
│   ├── append-entry.ts
│   ├── get-payment-state.ts
│   └── compute-balance.ts
│
├── stripe/                    # Stripe integration
│   ├── create-payment-intent.ts
│   ├── process-webhook.ts
│   └── stripe-client.ts
│
├── validations/               # Zod schemas for input validation
│   ├── event-schema.ts
│   ├── client-schema.ts
│   └── menu-schema.ts
│
└── utils/                     # General utilities
    ├── format-currency.ts
    ├── format-date.ts
    └── ...
```

### 4.2 Naming Conventions

**Functions:**

- Kebab-case file names: `get-user.ts`, `create-event.ts`
- Exported functions match file name: `export async function getUser() {...}`

**Separation of Concerns:**

- `lib/auth/` — Authentication and authorization only
- `lib/supabase/` — Supabase client initialization only
- `lib/events/`, `lib/ledger/`, etc. — Domain-specific business logic
- `lib/validations/` — Zod schemas only (no business logic)

---

## 5) `/types` Directory

### 5.1 Structure

```
types/
├── database.ts                # Generated database types (from Supabase)
├── event.ts                   # Event-related types
├── client.ts                  # Client-related types
├── menu.ts                    # Menu-related types
├── ledger.ts                  # Ledger-related types
└── user.ts                    # User and role types
```

### 5.2 Type Organization

**Generated Types:**

- `database.ts` — Auto-generated from Supabase schema
- **Do not edit manually** (regenerated via `npm run types:generate`)

**Custom Types:**

- Domain-specific types (e.g., `Event`, `Client`, `Menu`)
- Input/output types for server actions (e.g., `CreateEventInput`, `EventWithDetails`)

**Example:**

```typescript
// types/event.ts
import { Database } from './database';

export type Event = Database['public']['Tables']['events']['Row'];
export type EventStatus = Database['public']['Enums']['event_status'];

export type CreateEventInput = {
  client_id: string;
  event_type: string;
  start_ts: string;
  end_ts: string;
  total_amount_cents: number;
  deposit_amount_cents: number;
};
```

---

## 6) `/supabase` Directory

### 6.1 Structure

```
supabase/
└── migrations/
    ├── 20260213000001_initial_schema.sql
    ├── 20260213000002_rls_policies.sql
    └── ...
```

### 6.2 Migration Conventions

**Naming:**

- Timestamp prefix: `YYYYMMDDHHMMSS_description.sql`
- Example: `20260213120000_add_audit_logs_table.sql`

**Content:**

- One migration per conceptual change (e.g., one table, one set of RLS policies)
- Migrations are immutable (never edit after applied)
- Rollback via new migration (not by editing old one)

---

## 7) `/scripts` Directory

### 7.1 Structure

```
scripts/
├── README.md                  # Scripts documentation
├── package.json               # Script dependencies (if separate from main)
├── verify-migrations.sql      # Verify migrations applied correctly
├── verify-rls-sql-only.sql    # Verify RLS policies (SQL-only test)
├── verify-rls-harness.ts      # Verify RLS policies (TypeScript test harness)
├── verify-immutability.sql    # Verify immutability triggers
├── test-role-resolution.md    # Role resolution test plan
└── ...
```

### 7.2 Script Conventions

**SQL Scripts:**

- Used for database verification
- Run via `psql` or Supabase CLI
- Should be idempotent (safe to run multiple times)

**TypeScript Scripts:**

- Used for complex verification or data seeding
- Run via `tsx` or `ts-node`

---

## 8) `/docs` Directory

```
docs/
└── chef-portal/               # Chef Portal documentation
    ├── 00_*.md                # Master definitions
    ├── 01_*.md                # System laws and security
    ├── 02_*.md                # Repo structure and routing
    └── ...                    # All other documentation files
```

---

## 9) Special Files

### 9.1 `middleware.ts`

**Location:** `middleware.ts` (root level)

**Purpose:** Global middleware for authentication and role-based routing

**Key Responsibilities:**

- Authenticate user
- Resolve role and tenant
- Route guard (redirect based on role)
- Block access to wrong portals

**Example:**

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUser, getUserRole } from '@/lib/auth';

export async function middleware(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.redirect(new URL('/login', req.url));

  const roleData = await getUserRole(user.id);
  if (!roleData) return NextResponse.redirect(new URL('/error', req.url));

  // Route guards...
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

---

### 9.2 `.env.local`

**Location:** `.env.local` (root level, gitignored)

**Purpose:** Store environment variables (secrets, API keys)

**Example:**

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

**Security:**

- ✅ Never commit `.env.local` to version control
- ✅ Use `.env.local.example` as a template (committed, no secrets)
- ✅ Secrets prefixed with `NEXT_PUBLIC_` are exposed to client (use sparingly)

---

## 10) File Naming Conventions Summary

| Type | Convention | Example |
|------|------------|---------|
| **React Components** | PascalCase | `EventCard.tsx` |
| **Lib Functions** | kebab-case | `get-user.ts` |
| **Types** | kebab-case | `event.ts` |
| **API Routes** | `route.ts` | `app/api/events/route.ts` |
| **Pages** | `page.tsx` | `app/(chef)/events/page.tsx` |
| **Layouts** | `layout.tsx` | `app/(chef)/layout.tsx` |
| **Middleware** | `middleware.ts` | `middleware.ts` |
| **Migrations** | timestamp + description | `20260213000001_initial_schema.sql` |
| **Scripts** | kebab-case | `verify-rls.sql` |
| **Docs** | SCREAMING_KEBAB | `00_CHEF_PORTAL_MASTER_DEFINITION.md` |

---

## 11) Folder Organization Principles

### 11.1 Portal Isolation

**Chef Portal and Client Portal code must be isolated:**

- ✅ Separate route groups: `(chef)/` and `(client)/`
- ✅ Separate component folders: `components/chef/` and `components/client/`
- ❌ No shared components that leak chef-private data to client UI

### 11.2 Server vs Client Separation

**Server and client code must be clearly separated:**

- ✅ Server actions in `lib/` (no `'use client'`)
- ✅ Client components in `components/` with `'use client'` directive
- ❌ No mixing of server and client logic in the same file

### 11.3 Business Logic in `/lib`

**Business logic must be in `/lib`, not in components or pages:**

- ✅ `lib/events/transition-event.ts` — Business logic
- ✅ `components/chef/EventCard.tsx` — Presentation
- ❌ No business logic in components

---

## 12) Summary: Repository Structure at a Glance

| Directory | Purpose | Key Files |
|-----------|---------|-----------|
| `/app` | Next.js routes (pages, layouts, API) | `(chef)/`, `(client)/`, `api/` |
| `/components` | React components | `chef/`, `client/`, `shared/`, `ui/` |
| `/lib` | Business logic and utilities | `auth/`, `supabase/`, `events/`, `ledger/` |
| `/types` | TypeScript type definitions | `database.ts`, `event.ts`, `client.ts` |
| `/supabase` | Database migrations | `migrations/*.sql` |
| `/scripts` | Verification and utility scripts | `verify-*.sql`, `verify-*.ts` |
| `/docs` | Documentation | `chef-portal/*.md` |
| `/public` | Static assets | Images, fonts, etc. |

---

## 13) One-Sentence Summary

**The ChefFlow V1 repository is organized into portal-isolated route groups (`(chef)/`, `(client)/`), component directories (`components/chef/`, `components/client/`), and business logic libraries (`lib/auth/`, `lib/events/`, `lib/ledger/`) to enforce clear separation of concerns, prevent chef-client data leaks, and maintain server-authoritative architecture.**

---

**End of Repository Structure Map**
