# Chef Portal App Routing Map (V1)

This document defines the complete URL routing structure for ChefFlow V1, including all routes, their access controls, and their purposes. This is the authoritative map for navigation and route protection.

---

## 1) Routing Architecture

### 1.1 Next.js App Router

ChefFlow V1 uses Next.js 13+ App Router with:
- **File-based routing** (routes defined by folder structure)
- **Route groups** for portal isolation (`(public)`, `(chef)`, `(client)`)
- **Server layouts** for authentication gating
- **Middleware** for global route protection

### 1.2 Route Hierarchy

```
/ (root)
├── (public)/          → Unauthenticated routes
├── (chef)/            → Chef Portal (role=chef)
├── (client)/          → Client Portal (role=client)
└── api/               → API endpoints
```

---

## 2) Public Routes (Unauthenticated)

### 2.1 Landing and Marketing

| Route | File Path | Purpose | Auth Required |
|-------|-----------|---------|---------------|
| `/` | `app/(public)/page.tsx` | Landing page / marketing | No |
| `/about` | `app/(public)/about/page.tsx` | About ChefFlow | No |
| `/pricing` | `app/(public)/pricing/page.tsx` | Pricing information (if public) | No |

### 2.2 Authentication Routes

| Route | File Path | Purpose | Auth Required |
|-------|-----------|---------|---------------|
| `/login` | `app/(public)/login/page.tsx` | Login form | No |
| `/signup` | `app/(public)/signup/page.tsx` | Sign up (chef registration) | No |
| `/signup/client` | `app/(public)/signup/client/page.tsx` | Client signup (invite-based) | No |
| `/reset-password` | `app/(public)/reset-password/page.tsx` | Password reset request | No |
| `/reset-password/confirm` | `app/(public)/reset-password/confirm/page.tsx` | Password reset confirmation | No |

### 2.3 Invitation Acceptance

| Route | File Path | Purpose | Auth Required |
|-------|-----------|---------|---------------|
| `/invite/[token]` | `app/(public)/invite/[token]/page.tsx` | Client invitation acceptance | No (creates account) |

**Flow:**
1. Chef sends invite link: `https://chefflow.app/invite/abc123xyz`
2. Client clicks link → lands on `/invite/abc123xyz`
3. Client creates account → linked to chef's tenant
4. Client redirected to `/client/my-events`

---

## 3) Chef Portal Routes (Authenticated, role=chef)

### 3.1 Base Route Pattern

**All Chef Portal routes are prefixed with `/chef/*`**

Example: `/chef/dashboard`, `/chef/events`, etc.

### 3.2 Dashboard

| Route | File Path | Purpose | Access |
|-------|-----------|---------|--------|
| `/chef/dashboard` | `app/(chef)/dashboard/page.tsx` | Dashboard overview | Chef only |

**What it shows:**
- Summary cards (events by status, revenue, at-risk items)
- Next actions list (deposit pending, menu needed, upcoming events)
- Recent activity feed

---

### 3.3 Inquiries / Pipeline

| Route | File Path | Purpose | Access |
|-------|-----------|---------|--------|
| `/chef/inquiries` | `app/(chef)/inquiries/page.tsx` | Inquiry/pipeline list | Chef only |
| `/chef/inquiries/new` | `app/(chef)/inquiries/new/page.tsx` | Create new inquiry | Chef only |
| `/chef/inquiries/[id]` | `app/(chef)/inquiries/[id]/page.tsx` | Inquiry detail | Chef only |
| `/chef/inquiries/[id]/edit` | `app/(chef)/inquiries/[id]/edit/page.tsx` | Edit inquiry | Chef only |

**Note:** If V1 treats inquiries as draft events, these routes may redirect to `/chef/events` with `status=draft` filter.

---

### 3.4 Events

| Route | File Path | Purpose | Access |
|-------|-----------|---------|--------|
| `/chef/events` | `app/(chef)/events/page.tsx` | Events list (all statuses) | Chef only |
| `/chef/events/new` | `app/(chef)/events/new/page.tsx` | Create new event | Chef only |
| `/chef/events/[id]` | `app/(chef)/events/[id]/page.tsx` | Event detail view | Chef only |
| `/chef/events/[id]/edit` | `app/(chef)/events/[id]/edit/page.tsx` | Edit event details | Chef only |
| `/chef/events/[id]/menu` | `app/(chef)/events/[id]/menu/page.tsx` | Event menu builder | Chef only |
| `/chef/events/[id]/transitions` | `app/(chef)/events/[id]/transitions/page.tsx` | Event lifecycle transition history | Chef only |
| `/chef/events/[id]/finance` | `app/(chef)/events/[id]/finance/page.tsx` | Event financial ledger | Chef only |

**Query Parameters (optional):**
- `/chef/events?status=confirmed` — Filter by status
- `/chef/events?client_id=abc123` — Filter by client
- `/chef/events?date_from=2026-01-01&date_to=2026-12-31` — Date range

---

### 3.5 Menus

| Route | File Path | Purpose | Access |
|-------|-----------|---------|--------|
| `/chef/menus` | `app/(chef)/menus/page.tsx` | Menu templates list | Chef only |
| `/chef/menus/new` | `app/(chef)/menus/new/page.tsx` | Create new menu template | Chef only |
| `/chef/menus/[id]` | `app/(chef)/menus/[id]/page.tsx` | Menu template detail | Chef only |
| `/chef/menus/[id]/edit` | `app/(chef)/menus/[id]/edit/page.tsx` | Edit menu template | Chef only |
| `/chef/menus/[id]/versions` | `app/(chef)/menus/[id]/versions/page.tsx` | Menu version history | Chef only |

**Note:** Event-specific menus are accessed via `/chef/events/[id]/menu` (see Events section).

---

### 3.6 Clients

| Route | File Path | Purpose | Access |
|-------|-----------|---------|--------|
| `/chef/clients` | `app/(chef)/clients/page.tsx` | Client list | Chef only |
| `/chef/clients/new` | `app/(chef)/clients/new/page.tsx` | Create new client profile | Chef only |
| `/chef/clients/[id]` | `app/(chef)/clients/[id]/page.tsx` | Client profile detail | Chef only |
| `/chef/clients/[id]/edit` | `app/(chef)/clients/[id]/edit/page.tsx` | Edit client profile | Chef only |
| `/chef/clients/[id]/events` | `app/(chef)/clients/[id]/events/page.tsx` | Client's event history | Chef only |
| `/chef/clients/[id]/invite` | `app/(chef)/clients/[id]/invite/page.tsx` | Send/resend client invite | Chef only |

**Client-private fields visible here:**
- Chef notes (internal)
- Internal tags
- Created date, last contact, etc.

---

### 3.7 Finance

| Route | File Path | Purpose | Access |
|-------|-----------|---------|--------|
| `/chef/finance` | `app/(chef)/finance/page.tsx` | Financial overview | Chef only |
| `/chef/finance/ledger` | `app/(chef)/finance/ledger/page.tsx` | Full ledger view (all entries) | Chef only |
| `/chef/finance/events` | `app/(chef)/finance/events/page.tsx` | Financial summary by event | Chef only |
| `/chef/finance/adjustments/new` | `app/(chef)/finance/adjustments/new/page.tsx` | Create manual adjustment | Chef only |

**What is NOT included in V1:**
- ❌ P&L statements
- ❌ Tax reports
- ❌ Invoice generation (beyond basic event invoice)

---

### 3.8 Settings

| Route | File Path | Purpose | Access |
|-------|-----------|---------|--------|
| `/chef/settings` | `app/(chef)/settings/page.tsx` | Settings overview | Chef only |
| `/chef/settings/profile` | `app/(chef)/settings/profile/page.tsx` | Business profile settings | Chef only |
| `/chef/settings/user` | `app/(chef)/settings/user/page.tsx` | User account settings | Chef only |
| `/chef/settings/stripe` | `app/(chef)/settings/stripe/page.tsx` | Stripe connection setup | Chef only |
| `/chef/settings/notifications` | `app/(chef)/settings/notifications/page.tsx` | Notification preferences | Chef only (if implemented) |

---

## 4) Client Portal Routes (Authenticated, role=client)

### 4.1 Base Route Pattern

**All Client Portal routes are prefixed with `/client/*`**

Example: `/client/my-events`, `/client/profile`, etc.

### 4.2 Client Routes

| Route | File Path | Purpose | Access |
|-------|-----------|---------|--------|
| `/client/my-events` | `app/(client)/my-events/page.tsx` | Client's events list | Client only |
| `/client/my-events/[id]` | `app/(client)/my-events/[id]/page.tsx` | Event detail (client view) | Client only |
| `/client/my-events/[id]/menu` | `app/(client)/my-events/[id]/menu/page.tsx` | Event menu (client-safe projection) | Client only |
| `/client/my-events/[id]/pay` | `app/(client)/my-events/[id]/pay/page.tsx` | Payment flow (Stripe) | Client only |
| `/client/profile` | `app/(client)/profile/page.tsx` | Client profile (edit name, email) | Client only |

**What clients CANNOT see:**
- ❌ Chef-private notes
- ❌ Other clients' data
- ❌ Internal financial details (only their own payment status)
- ❌ Menu prep notes or internal structure

---

## 5) API Routes

### 5.1 Webhooks

| Route | File Path | Purpose | Access |
|-------|-----------|---------|--------|
| `/api/webhooks/stripe` | `app/api/webhooks/stripe/route.ts` | Stripe webhook handler | Service role (signature verified) |

**Method:** POST

**Authentication:** Stripe signature verification (not session-based)

**Purpose:**
- Receives Stripe events (`payment_intent.succeeded`, `charge.refunded`, etc.)
- Appends to ledger via service role
- Idempotency by `stripe_event_id`

---

### 5.2 Server Actions (Not REST API routes)

V1 primarily uses **Next.js Server Actions** for mutations, not traditional REST API routes.

**Examples:**
- `lib/events/transition-event.ts` — Server action for lifecycle transitions
- `lib/ledger/append-entry.ts` — Server action for manual adjustments
- `lib/clients/create-client.ts` — Server action for client creation

**Why Server Actions?**
- ✅ Type-safe (TypeScript end-to-end)
- ✅ No need to define API routes manually
- ✅ Better DX for server-authoritative operations

---

## 6) Route Protection Strategy

### 6.1 Middleware Protection

**File:** `middleware.ts` (root level)

**Responsibilities:**
1. Authenticate user (check Supabase session)
2. Resolve role from `user_roles` table
3. Route guard:
   - If unauthenticated → redirect to `/login`
   - If role=chef trying to access `/client/*` → redirect to `/chef/dashboard`
   - If role=client trying to access `/chef/*` → redirect to `/client/my-events`
4. Set tenant context (attach `tenant_id` to request metadata)

**Example Middleware Logic:**

```typescript
export async function middleware(req: NextRequest) {
  const user = await getUser(req);

  if (!user && !isPublicRoute(req.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (user) {
    const roleData = await getUserRole(user.id);

    if (req.nextUrl.pathname.startsWith('/chef')) {
      if (roleData.role !== 'chef') {
        return NextResponse.redirect(new URL('/client/my-events', req.url));
      }
    }

    if (req.nextUrl.pathname.startsWith('/client')) {
      if (roleData.role !== 'client') {
        return NextResponse.redirect(new URL('/chef/dashboard', req.url));
      }
    }
  }

  return NextResponse.next();
}
```

---

### 6.2 Layout Protection (Server Layouts)

**File:** `app/(chef)/layout.tsx` and `app/(client)/layout.tsx`

**Responsibilities:**
- **Second line of defense** (after middleware)
- Verify role server-side before rendering layout
- If role check fails → show error or redirect

**Example Chef Layout:**

```tsx
// app/(chef)/layout.tsx
export default async function ChefLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect('/login');

  const roleData = await getUserRole(user.id);
  if (roleData.role !== 'chef') {
    redirect('/client/my-events'); // wrong portal
  }

  return (
    <div>
      <ChefNavigation tenantId={roleData.tenant_id} />
      <main>{children}</main>
    </div>
  );
}
```

---

### 6.3 RLS Protection (Database Layer)

**Even if middleware and layouts are bypassed, RLS prevents data access.**

**Example:** Client tries to directly query `/api/events?tenant_id=other-chef-id`

- Middleware blocks route
- If middleware bypassed, layout blocks render
- If layout bypassed, RLS denies database query

**Defense-in-depth ensures no single point of failure.**

---

## 7) Route Naming Conventions

### 7.1 URL Structure Rules

| Rule | Example | Rationale |
|------|---------|-----------|
| **Kebab-case** | `/chef/my-events` | Standard web convention |
| **Plural for lists** | `/chef/events`, `/chef/clients` | RESTful convention |
| **Singular for detail** | `/chef/events/[id]` | RESTful convention |
| **Action as suffix** | `/chef/events/new`, `/chef/clients/[id]/edit` | Clear intent |
| **Nested resources** | `/chef/events/[id]/menu` | Logical grouping |

---

### 7.2 File Structure Matches URL Structure

| URL | File Path |
|-----|-----------|
| `/chef/events` | `app/(chef)/events/page.tsx` |
| `/chef/events/[id]` | `app/(chef)/events/[id]/page.tsx` |
| `/chef/events/[id]/menu` | `app/(chef)/events/[id]/menu/page.tsx` |

**Route groups (parentheses) don't affect URL:**
- `app/(chef)/dashboard/page.tsx` → `/chef/dashboard` ✅
- NOT `/(chef)/dashboard` ❌

---

## 8) Redirect Rules

### 8.1 Post-Login Redirects

**After successful login:**

| User Role | Redirect To |
|-----------|-------------|
| `chef` | `/chef/dashboard` |
| `client` | `/client/my-events` |
| Unknown role | `/error` (fail closed) |

---

### 8.2 Post-Signup Redirects

**After successful signup:**

| Signup Type | Redirect To |
|-------------|-------------|
| Chef signup | `/chef/settings/stripe` (onboarding: connect Stripe) |
| Client signup (invite-based) | `/client/my-events` |

---

### 8.3 Unauthorized Access Redirects

| Scenario | Redirect To |
|----------|-------------|
| Unauthenticated user accessing `/chef/*` | `/login?redirect=/chef/...` |
| Client accessing `/chef/*` | `/client/my-events` |
| Chef accessing `/client/*` | `/chef/dashboard` |
| Invalid role | `/error` |

---

## 9) Special Routes

### 9.1 Error Pages

| Route | File Path | Purpose |
|-------|-----------|---------|
| `/error` | `app/error.tsx` | Global error boundary |
| `/not-found` | `app/not-found.tsx` | 404 page |

---

### 9.2 Loading States

| Route | File Path | Purpose |
|-------|-----------|---------|
| `/chef/events/loading.tsx` | `app/(chef)/events/loading.tsx` | Loading UI for events list |
| `/chef/events/[id]/loading.tsx` | `app/(chef)/events/[id]/loading.tsx` | Loading UI for event detail |

**Next.js automatically shows `loading.tsx` while page data fetches.**

---

## 10) Route Testing Strategy

### 10.1 Manual Testing Checklist

For each route:
- ✅ Authenticated chef can access chef routes
- ✅ Authenticated client can access client routes
- ✅ Unauthenticated user redirected to `/login`
- ✅ Wrong-role user redirected to correct portal
- ✅ RLS prevents cross-tenant data access (even with direct URL manipulation)

---

### 10.2 Automated Route Tests (if implemented)

**Example test:**

```typescript
describe('Route Protection', () => {
  it('redirects client to /client/my-events if accessing /chef/dashboard', async () => {
    const clientSession = await createClientSession();
    const res = await fetch('/chef/dashboard', { headers: { cookie: clientSession } });
    expect(res.redirected).toBe(true);
    expect(res.url).toContain('/client/my-events');
  });
});
```

---

## 11) Summary: Complete Route Map

### Public Routes
- `/` — Landing page
- `/login`, `/signup`, `/signup/client` — Auth
- `/invite/[token]` — Client invitation acceptance

### Chef Portal Routes
- `/chef/dashboard` — Dashboard
- `/chef/inquiries`, `/chef/inquiries/[id]` — Inquiries
- `/chef/events`, `/chef/events/[id]`, `/chef/events/[id]/menu` — Events
- `/chef/menus`, `/chef/menus/[id]` — Menu templates
- `/chef/clients`, `/chef/clients/[id]` — Client management
- `/chef/finance`, `/chef/finance/ledger` — Financial overview
- `/chef/settings` — Settings

### Client Portal Routes
- `/client/my-events`, `/client/my-events/[id]` — Events
- `/client/my-events/[id]/menu` — Event menu
- `/client/my-events/[id]/pay` — Payment
- `/client/profile` — Profile settings

### API Routes
- `/api/webhooks/stripe` — Stripe webhook handler

---

## 12) One-Sentence Summary

**The ChefFlow V1 routing map enforces portal isolation through route groups (`(chef)/`, `(client)/`), multi-layered protection (middleware, layouts, RLS), and deterministic role-based redirects, ensuring chefs and clients never access each other's portals or data.**

---

**End of App Routing Map**
