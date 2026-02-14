# Public Layer - System Overview

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED
**Scope**: ChefFlow V1 Public Layer Only

---

## Purpose

The Public Layer is the unauthenticated, publicly accessible face of ChefFlow. It serves three primary functions:

1. **Marketing & Information** - Communicate value proposition to prospective chefs and clients
2. **Lead Capture** - Collect qualified inquiry submissions from interested chefs
3. **Authentication Gateway** - Provide signin/signup flows that route users to appropriate portals

---

## Architectural Position

```
┌─────────────────────────────────────────────────────────────┐
│                      PUBLIC LAYER                           │
│  (Unauthenticated, Static-First, SEO-Optimized)            │
│                                                             │
│  Routes: /, /services, /how-it-works, /pricing,            │
│          /inquire, /signin, /signup                        │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ Auth Redirect (middleware)
                           ▼
        ┌──────────────────────────────────────┐
        │   Role Resolution (user_roles table) │
        └──────────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
    ┌─────────────────┐       ┌─────────────────┐
    │  CHEF PORTAL    │       │  CLIENT PORTAL  │
    │  /dashboard     │       │  /my-events     │
    └─────────────────┘       └─────────────────┘
```

---

## Design Principles

### 1. Static-First Rendering
- All public pages MUST use Next.js Static Site Generation (SSG) where possible
- NO server-side data fetching on public pages (no database queries)
- Pages are pre-rendered at build time for maximum performance and SEO

### 2. Zero Database Dependency (Pages)
- Marketing pages (Home, Services, How It Works, Pricing) do NOT touch database
- Content is static, defined in components
- Exception: Inquiry form submission (POST to API route, then redirects)

### 3. Mobile-First Design
- All layouts MUST be responsive and mobile-optimized
- Touch-friendly targets (min 44x44px)
- Fast loading on 3G networks (target: <3s First Contentful Paint)

### 4. SEO-Optimized
- Semantic HTML5 structure
- Proper heading hierarchy (h1 → h2 → h3)
- Meta tags for Open Graph and Twitter Cards
- Structured data (JSON-LD) for schema.org markup

### 5. Security Isolation
- NO user-specific data on public pages
- NO authenticated API calls from public routes
- Input sanitization on all form submissions
- CSRF protection on inquiry form

---

## Route Structure

| Route | Purpose | Authentication | Data Source |
|-------|---------|----------------|-------------|
| `/` | Landing page | Public | Static content |
| `/services` | Service descriptions | Public | Static content |
| `/how-it-works` | Process explanation | Public | Static content |
| `/pricing` | Pricing philosophy | Public | Static content |
| `/inquire` | Contact/inquiry form | Public | Form → API route → DB |
| `/signin` | User login | Public → Auth | Supabase Auth |
| `/signup` | Chef registration | Public → Auth | Supabase Auth + DB |
| `/terms` | Terms of service | Public | Static content |
| `/privacy` | Privacy policy | Public | Static content |

---

## Technology Constraints

### Allowed
- ✅ Next.js 14+ App Router (Server Components)
- ✅ Tailwind CSS + shadcn/ui
- ✅ Supabase Auth (signin/signup only)
- ✅ React Server Components (RSC)
- ✅ Server Actions (form submissions)

### Prohibited
- ❌ Client-side state management (Redux, Zustand)
- ❌ Client-side data fetching (React Query, SWR)
- ❌ Dynamic routes with database queries
- ❌ Authenticated data on public pages

---

## Data Flow: Inquiry Submission

```
User fills form on /inquire
        ↓
Client-side validation (Zod schema)
        ↓
POST to /api/inquire (Server Action)
        ↓
Server-side validation
        ↓
Insert into `inquiries` table
        ↓
Return success/error
        ↓
Redirect to confirmation screen
```

**Critical Rules:**
- Idempotency: Duplicate submissions within 5 minutes are rejected
- Rate limiting: Max 3 submissions per IP per hour
- Spam protection: Honeypot field + submission time check
- Data sanitization: Strip HTML, validate email format

---

## Authentication Flow

### Signin Flow
```
User clicks "Sign In" → /signin
        ↓
Supabase Auth UI (email/password)
        ↓
On success: auth.users record created
        ↓
Middleware queries user_roles table
        ↓
If role=chef → redirect to /dashboard
If role=client → redirect to /my-events
If no role → error (orphaned account)
```

### Signup Flow (Chef)
```
User clicks "Sign Up" → /signup
        ↓
Supabase Auth creates auth.users record
        ↓
Server Action inserts into chefs table
        ↓
Server Action inserts into user_roles table
        ↓
Redirect to /dashboard (chef portal)
```

### Signup Flow (Client)
```
Chef sends invitation → client_invitations record created
        ↓
Client clicks invitation link → /signup?token=xxx
        ↓
Validate token (not expired, not used)
        ↓
Supabase Auth creates auth.users record
        ↓
Server Action inserts into clients table
        ↓
Server Action inserts into user_roles table
        ↓
Mark invitation as used (used_at = now)
        ↓
Redirect to /my-events (client portal)
```

---

## Performance Budget

| Metric | Target | Hard Limit |
|--------|--------|------------|
| First Contentful Paint (FCP) | <1.5s | 3s |
| Largest Contentful Paint (LCP) | <2.5s | 4s |
| Cumulative Layout Shift (CLS) | <0.1 | 0.25 |
| Time to Interactive (TTI) | <3s | 5s |
| Total Page Size | <500KB | 1MB |
| JavaScript Bundle | <150KB | 300KB |

---

## Accessibility Requirements

- WCAG 2.1 Level AA compliance
- Keyboard navigation support (tab order, focus states)
- Screen reader friendly (ARIA labels, semantic HTML)
- Color contrast ratio ≥ 4.5:1 for text
- Form validation with clear error messages

---

## Non-Goals (Explicitly Out of Scope)

- ❌ Multi-language support
- ❌ Dark mode
- ❌ Marketplace/directory of chefs
- ❌ Client-facing signup (no invitation = no account)
- ❌ Advanced analytics tracking
- ❌ A/B testing framework
- ❌ Blog/content management system
- ❌ Live chat widget

---

## Relationship to Other Layers

### Public Layer → Chef Portal
- After successful chef signup, redirect to `/dashboard`
- After successful chef signin, redirect to `/dashboard`
- NO direct data sharing (stateless redirect)

### Public Layer → Client Portal
- After successful client signup (via invitation), redirect to `/my-events`
- After successful client signin, redirect to `/my-events`
- NO direct data sharing (stateless redirect)

### Public Layer → Database
- **Write**: Inquiry form submissions to `inquiries` table (if table exists)
- **Read**: NONE (except during signup/signin via Supabase Auth)
- **Update**: NONE
- **Delete**: NONE

---

## Invariants (Must Never Be Violated)

1. **Public pages MUST render without authentication**
2. **No user-specific data on public routes**
3. **No database queries in page render (only in API routes/Server Actions)**
4. **All forms MUST have CSRF protection**
5. **All user input MUST be sanitized**
6. **Middleware MUST redirect authenticated users away from auth pages**
7. **Role resolution MUST query user_roles table (never infer from URL)**

---

## Verification Checklist

Before considering Public Layer "complete":

- [ ] All pages render without authentication
- [ ] All pages pass Lighthouse SEO audit (score ≥90)
- [ ] All pages pass Lighthouse Performance audit (score ≥90)
- [ ] All pages pass Lighthouse Accessibility audit (score ≥90)
- [ ] Inquiry form submission works end-to-end
- [ ] Chef signup creates user + role + redirects correctly
- [ ] Client signup (via invitation) creates user + role + redirects correctly
- [ ] Signin redirects to correct portal based on role
- [ ] No authenticated data leaks on public pages
- [ ] All forms have CSRF protection
- [ ] All inputs are sanitized
- [ ] Middleware blocks unauthenticated access to portals

---

## Reference Documents

- [PUBLIC_LAYER_SCOPE_LOCK.md](./PUBLIC_LAYER_SCOPE_LOCK.md) - Feature boundaries
- [PUBLIC_LAYER_INVARIANTS.md](./PUBLIC_LAYER_INVARIANTS.md) - Non-negotiable rules
- [PUBLIC_LAYER_ROUTE_MATRIX.md](./PUBLIC_LAYER_ROUTE_MATRIX.md) - All routes and permissions
- [PUBLIC_AUTH_OVERVIEW.md](./PUBLIC_AUTH_OVERVIEW.md) - Authentication flows
- [CHEFFLOW_V1_SCOPE_LOCK.md](../../CHEFFLOW_V1_SCOPE_LOCK.md) - Parent scope document

---

**Status**: This document is LOCKED for V1. Any changes require explicit scope unlock.
