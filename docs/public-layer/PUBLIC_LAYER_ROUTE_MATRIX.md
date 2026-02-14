# Public Layer - Route Matrix

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Purpose

This document provides a comprehensive matrix of ALL routes in the Public Layer, including their properties, permissions, rendering strategies, and metadata.

---

## Route Matrix

| Route | File Path | Render Type | Auth Required | Redirect If Authed | DB Queries | API Calls | Purpose |
|-------|-----------|-------------|---------------|-------------------|-----------|-----------|---------|
| `/` | `app/(public)/page.tsx` | Static (SSG) | No | No | None | None | Landing page |
| `/services` | `app/(public)/services/page.tsx` | Static (SSG) | No | No | None | None | Service descriptions |
| `/how-it-works` | `app/(public)/how-it-works/page.tsx` | Static (SSG) | No | No | None | None | Process explanation |
| `/pricing` | `app/(public)/pricing/page.tsx` | Static (SSG) | No | No | None | None | Pricing philosophy |
| `/inquire` | `app/(public)/inquire/page.tsx` | Static (SSG) | No | No | None | None | Inquiry form (render) |
| `/signin` | `app/(public)/signin/page.tsx` | Static (SSG) | No | Yes* | None | Supabase Auth | User signin |
| `/signup` | `app/(public)/signup/page.tsx` | Static (SSG) | No | Yes* | None | Supabase Auth | User signup |
| `/terms` | `app/(public)/terms/page.tsx` | Static (SSG) | No | No | None | None | Terms of service |
| `/privacy` | `app/(public)/privacy/page.tsx` | Static (SSG) | No | No | None | None | Privacy policy |
| `/api/inquire` | `app/api/inquire/route.ts` | API Route | No | No | Yes (insert) | None | Inquiry submission |

*Redirect if authenticated: `/signin` and `/signup` redirect authenticated users to their portal

---

## Route Details

### 1. Landing Page (`/`)

**Route**: `/`
**File**: `app/(public)/page.tsx`
**Render Type**: Static Site Generation (SSG)
**Auth Required**: No
**Database Queries**: None
**Purpose**: Marketing landing page to attract chefs and clients

**Metadata**:
```typescript
export const metadata = {
  title: 'ChefFlow - Private Chef Management Platform',
  description: 'Streamline your private chef business with ChefFlow. Manage events, clients, and payments in one place.',
  openGraph: {
    title: 'ChefFlow - Private Chef Management Platform',
    description: 'Streamline your private chef business with ChefFlow.',
    url: 'https://chefflow.app',
    siteName: 'ChefFlow',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ChefFlow - Private Chef Management Platform',
    description: 'Streamline your private chef business.',
    images: ['/og-image.jpg'],
  },
};
```

**Content Sections**:
- Hero with value proposition
- Feature highlights (3-4 cards)
- Social proof / testimonials
- CTA buttons (Sign Up, Inquire)

---

### 2. Services Page (`/services`)

**Route**: `/services`
**File**: `app/(public)/services/page.tsx`
**Render Type**: Static Site Generation (SSG)
**Auth Required**: No
**Database Queries**: None
**Purpose**: Describe services offered through ChefFlow

**Metadata**:
```typescript
export const metadata = {
  title: 'Our Services - ChefFlow',
  description: 'Discover the private chef services you can manage with ChefFlow, from intimate dinners to large events.',
};
```

**Content Sections**:
- Service categories (private dinners, meal prep, events)
- Brief process overview
- CTA to inquire

---

### 3. How It Works Page (`/how-it-works`)

**Route**: `/how-it-works`
**File**: `app/(public)/how-it-works/page.tsx`
**Render Type**: Static Site Generation (SSG)
**Auth Required**: No
**Database Queries**: None
**Purpose**: Explain the end-to-end process from inquiry to event completion

**Metadata**:
```typescript
export const metadata = {
  title: 'How It Works - ChefFlow',
  description: 'Learn how ChefFlow simplifies private chef event management from booking to completion.',
};
```

**Content Sections**:
- Step-by-step process (5-7 steps)
- Visual workflow diagram
- Lifecycle alignment (draft → completed)
- CTA to get started

---

### 4. Pricing Page (`/pricing`)

**Route**: `/pricing`
**File**: `app/(public)/pricing/page.tsx`
**Render Type**: Static Site Generation (SSG)
**Auth Required**: No
**Database Queries**: None
**Purpose**: Explain pricing philosophy (NO fixed prices, custom per event)

**Metadata**:
```typescript
export const metadata = {
  title: 'Pricing - ChefFlow',
  description: 'Transparent pricing for ChefFlow. No subscription fees. Pay only what you charge your clients.',
};
```

**Content Sections**:
- Pricing philosophy (no fixed rates)
- Deposit disclosure
- Cancellation policy
- Payment methods (Stripe only)

---

### 5. Inquiry Page (`/inquire`)

**Route**: `/inquire`
**File**: `app/(public)/inquire/page.tsx`
**Render Type**: Static Site Generation (SSG)
**Auth Required**: No
**Database Queries**: None (page render), Yes (form submission via Server Action)
**Purpose**: Collect inquiries from prospective chefs or clients

**Metadata**:
```typescript
export const metadata = {
  title: 'Contact Us - ChefFlow',
  description: 'Have questions or ready to get started? Contact ChefFlow today.',
};
```

**Form Fields**:
- Full name (required)
- Email (required)
- Phone (optional)
- Event date (optional)
- Guest count (optional)
- Message (required)
- Honeypot field (hidden)

**Submission**:
- POST to `/api/inquire`
- Validation: Zod schema
- Rate limiting: 3/hour/IP
- Idempotency: 5-minute window
- Success: Redirect to confirmation screen
- Failure: Show error message inline

---

### 6. Sign In Page (`/signin`)

**Route**: `/signin`
**File**: `app/(public)/signin/page.tsx`
**Render Type**: Static Site Generation (SSG)
**Auth Required**: No
**Redirect If Authenticated**: YES → Middleware redirects to `/dashboard` or `/my-events`
**Database Queries**: Via Supabase Auth (auth.users)
**Purpose**: User authentication (chefs and clients)

**Metadata**:
```typescript
export const metadata = {
  title: 'Sign In - ChefFlow',
  description: 'Sign in to your ChefFlow account.',
};
```

**Flow**:
1. User enters email + password
2. Supabase Auth validates credentials
3. On success, create session
4. Middleware queries `user_roles` table
5. Redirect to `/dashboard` (chef) or `/my-events` (client)

**Links**:
- "Forgot password?" → Supabase password reset flow
- "Don't have an account? Sign up" → `/signup`

---

### 7. Sign Up Page (`/signup`)

**Route**: `/signup` (Chef) or `/signup?token=xxx` (Client)
**File**: `app/(public)/signup/page.tsx`
**Render Type**: Static Site Generation (SSG)
**Auth Required**: No
**Redirect If Authenticated**: YES → Middleware redirects to portal
**Database Queries**: Insert into `chefs`, `clients`, `user_roles`
**Purpose**: User registration (chefs or invitation-based clients)

**Metadata**:
```typescript
export const metadata = {
  title: 'Sign Up - ChefFlow',
  description: 'Create your ChefFlow account and start managing your private chef business.',
};
```

**Chef Signup Flow**:
1. User enters email, password, business name
2. Server Action creates `auth.users` record
3. Insert into `chefs` table
4. Insert into `user_roles` table (role = 'chef')
5. Redirect to `/dashboard`

**Client Signup Flow**:
1. User clicks invitation link (`/signup?token=xxx`)
2. Validate token in `client_invitations` table
3. Pre-fill email from invitation
4. User enters password, full name
5. Server Action creates `auth.users` record
6. Insert into `clients` table
7. Insert into `user_roles` table (role = 'client')
8. Mark invitation as used (`used_at = now()`)
9. Redirect to `/my-events`

---

### 8. Terms of Service Page (`/terms`)

**Route**: `/terms`
**File**: `app/(public)/terms/page.tsx`
**Render Type**: Static Site Generation (SSG)
**Auth Required**: No
**Database Queries**: None
**Purpose**: Legal terms and conditions

**Metadata**:
```typescript
export const metadata = {
  title: 'Terms of Service - ChefFlow',
  description: 'ChefFlow terms of service and user agreement.',
};
```

**Content**:
- Placeholder terms (template)
- Last updated date
- Sections: Account terms, payment terms, cancellation policy, etc.

---

### 9. Privacy Policy Page (`/privacy`)

**Route**: `/privacy`
**File**: `app/(public)/privacy/page.tsx`
**Render Type**: Static Site Generation (SSG)
**Auth Required**: No
**Database Queries**: None
**Purpose**: Privacy policy and data handling disclosure

**Metadata**:
```typescript
export const metadata = {
  title: 'Privacy Policy - ChefFlow',
  description: 'ChefFlow privacy policy and data protection practices.',
};
```

**Content**:
- Placeholder privacy policy (template)
- Last updated date
- Sections: Data collection, usage, sharing, user rights, etc.

---

### 10. Inquiry API Route (`/api/inquire`)

**Route**: `/api/inquire`
**File**: `app/api/inquire/route.ts`
**HTTP Method**: POST
**Auth Required**: No
**Database Queries**: INSERT into `inquiries` table (if exists)
**Purpose**: Handle inquiry form submissions

**Request Body**:
```typescript
{
  name: string;
  email: string;
  phone?: string;
  eventDate?: string;
  guestCount?: number;
  message: string;
  website?: string; // Honeypot field
}
```

**Response** (Success):
```json
{
  "success": true,
  "message": "Thank you for your inquiry. We'll be in touch soon."
}
```

**Response** (Error):
```json
{
  "success": false,
  "error": "Invalid email format."
}
```

**Validations**:
- Zod schema validation
- Email format check
- Honeypot field check (reject if filled)
- Rate limiting (3/hour/IP)
- Idempotency check (5-minute window)

---

## Route Groups

### Marketing Routes (Static Content)
- `/`
- `/services`
- `/how-it-works`
- `/pricing`

**Characteristics**:
- NO database queries
- Static Site Generation (SSG)
- Fast loading (pre-rendered)
- SEO-optimized

---

### Transactional Routes (User Actions)
- `/inquire` (form submission)
- `/signin` (authentication)
- `/signup` (registration)

**Characteristics**:
- MAY have database writes (via Server Actions or API routes)
- Still use SSG for page render (forms are static HTML)
- Dynamic behavior via client-side JavaScript

---

### Legal Routes (Compliance)
- `/terms`
- `/privacy`

**Characteristics**:
- Static content
- NO database queries
- Rarely updated (update via code deploy)

---

## Middleware Rules

### Public Routes (No Redirect)
- `/`
- `/services`
- `/how-it-works`
- `/pricing`
- `/inquire`
- `/terms`
- `/privacy`

**Behavior**: Accessible to all users (authenticated or not)

---

### Auth Routes (Redirect If Authenticated)
- `/signin`
- `/signup`

**Behavior**:
```typescript
if (session && (path === '/signin' || path === '/signup')) {
  const role = await getUserRole(session.user.id);
  if (role === 'chef') return redirect('/dashboard');
  if (role === 'client') return redirect('/my-events');
}
```

---

## 404 Handling

### Behavior
If user visits non-existent route (e.g., `/foobar`), show Next.js default 404 page.

### Custom 404 (Optional, V1.1)
Create `app/not-found.tsx` with branded 404 page.

**V1**: Use default Next.js 404
**V1.1**: Custom branded 404 page

---

## Sitemap Generation (Post-V1)

For SEO, generate `sitemap.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://chefflow.app/</loc></url>
  <url><loc>https://chefflow.app/services</loc></url>
  <url><loc>https://chefflow.app/how-it-works</loc></url>
  <url><loc>https://chefflow.app/pricing</loc></url>
  <url><loc>https://chefflow.app/inquire</loc></url>
  <url><loc>https://chefflow.app/signin</loc></url>
  <url><loc>https://chefflow.app/signup</loc></url>
  <url><loc>https://chefflow.app/terms</loc></url>
  <url><loc>https://chefflow.app/privacy</loc></url>
</urlset>
```

**V1**: NO sitemap (can add post-launch)
**V1.1**: Auto-generated sitemap via `app/sitemap.ts`

---

## Robots.txt

```
User-agent: *
Allow: /
Disallow: /api/

Sitemap: https://chefflow.app/sitemap.xml
```

**V1**: Default Next.js robots.txt
**V1.1**: Custom robots.txt via `app/robots.ts`

---

## Canonical URLs

Every page MUST have canonical URL in metadata:

```typescript
export const metadata = {
  // ...
  alternates: {
    canonical: 'https://chefflow.app/services',
  },
};
```

---

## Route Performance Targets

| Route | FCP Target | LCP Target | CLS Target | TTI Target |
|-------|-----------|-----------|-----------|-----------|
| `/` | <1.5s | <2.5s | <0.1 | <3s |
| `/services` | <1.5s | <2.5s | <0.1 | <3s |
| `/how-it-works` | <1.5s | <2.5s | <0.1 | <3s |
| `/pricing` | <1.5s | <2.5s | <0.1 | <3s |
| `/inquire` | <1.5s | <2.5s | <0.1 | <3s |
| `/signin` | <1.5s | <2.5s | <0.1 | <3s |
| `/signup` | <1.5s | <2.5s | <0.1 | <3s |

---

## Verification Checklist

Before considering routes "complete":

- [ ] All 9 routes render without errors
- [ ] All routes return 200 OK (unauthenticated)
- [ ] Authenticated users redirected from `/signin` and `/signup`
- [ ] All pages have SEO metadata
- [ ] All pages have canonical URLs
- [ ] No database queries on marketing pages
- [ ] API route handles POST requests correctly
- [ ] 404 page works for invalid routes
- [ ] No console errors on any route
- [ ] All routes pass Lighthouse audits (≥90)

---

**Status**: This route matrix is LOCKED for V1.
