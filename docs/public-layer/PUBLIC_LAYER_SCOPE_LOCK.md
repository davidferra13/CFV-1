# Public Layer - Scope Lock

**Version**: 1.0
**Date**: 2026-02-14
**Status**: FROZEN
**Parent Document**: [CHEFFLOW_V1_SCOPE_LOCK.md](../../CHEFFLOW_V1_SCOPE_LOCK.md)

---

## Purpose

This document defines the **immutable scope** for the Public Layer of ChefFlow V1. No features may be added, removed, or modified without explicit scope unlock and revision.

---

## What Ships in V1 (Public Layer Only)

### 1. Marketing Pages (Static Content)

#### Landing Page (`/`)
- ✅ Hero section with value proposition
- ✅ Feature highlights (3-4 key benefits)
- ✅ Social proof section (testimonial placeholders)
- ✅ Call-to-action buttons (Sign Up, Inquire)
- ✅ Mobile-responsive layout
- ✅ SEO meta tags and structured data

#### Services Page (`/services`)
- ✅ Overview of chef services offered
- ✅ Service categories (private dinners, meal prep, events)
- ✅ Process overview (brief)
- ✅ CTA to inquire or sign up

#### How It Works Page (`/how-it-works`)
- ✅ Step-by-step process explanation
- ✅ Visual workflow diagram (static image or SVG)
- ✅ Timeline from inquiry to event completion
- ✅ Alignment with event lifecycle states
- ✅ CTA to get started

#### Pricing Page (`/pricing`)
- ✅ Pricing philosophy explanation (no fixed rates)
- ✅ Deposit disclosure (chef-determined)
- ✅ Cancellation policy overview
- ✅ Payment method disclosure (Stripe only)
- ✅ NO specific pricing numbers (custom per event)

---

### 2. Inquiry System

#### Inquiry Form (`/inquire`)
- ✅ Form fields:
  - Full name (required)
  - Email (required, validated)
  - Phone (optional)
  - Event date (optional, date picker)
  - Guest count (optional, number input)
  - Message (required, textarea)
  - Honeypot field (hidden, spam protection)
- ✅ Client-side validation (Zod schema)
- ✅ Server-side validation (double-check)
- ✅ CSRF protection
- ✅ Rate limiting (3 submissions/hour/IP)
- ✅ Idempotency check (5-minute window)
- ✅ Success confirmation screen
- ✅ Error handling with user-friendly messages

#### Inquiry API Route
- ✅ POST `/api/inquire` endpoint
- ✅ Input sanitization (strip HTML, validate email)
- ✅ Database insert to `inquiries` table (if exists)
- ✅ Return JSON response (success/error)
- ✅ Logging for debugging

---

### 3. Authentication Pages

#### Signin Page (`/signin`)
- ✅ Email/password input form
- ✅ Supabase Auth integration
- ✅ "Forgot password" link
- ✅ "Don't have an account? Sign up" link
- ✅ Error messages for invalid credentials
- ✅ Redirect to correct portal after signin (middleware-driven)

#### Signup Page (`/signup`)
- ✅ Chef signup form:
  - Email (required)
  - Password (required, min 8 chars)
  - Business name (required)
  - Phone (optional)
- ✅ Client signup (invitation-only):
  - URL parameter: `?token=xxx`
  - Email (pre-filled from invitation)
  - Password (required)
  - Full name (required)
- ✅ Server Action to create user + role
- ✅ Redirect to appropriate portal after signup

---

### 4. Legal Pages (Stub Content)

#### Terms of Service (`/terms`)
- ✅ Placeholder terms content
- ✅ Last updated date
- ✅ Link from footer

#### Privacy Policy (`/privacy`)
- ✅ Placeholder privacy content
- ✅ Data collection disclosure
- ✅ Link from footer

---

### 5. Layout Components

#### Public Header
- ✅ Logo (text or image)
- ✅ Navigation menu (Home, Services, How It Works, Pricing, Inquire)
- ✅ Sign In button (top-right)
- ✅ Mobile hamburger menu
- ✅ Sticky header (optional, performance-friendly)

#### Public Footer
- ✅ Links to Terms and Privacy pages
- ✅ Copyright notice
- ✅ Optional social media links (placeholders)
- ✅ Contact email/phone (static)

---

### 6. Security Features

- ✅ CSRF token validation on forms
- ✅ Input sanitization (XSS prevention)
- ✅ Rate limiting on inquiry submissions
- ✅ Honeypot field for spam protection
- ✅ Email validation (format check)
- ✅ NO SQL injection risk (parameterized queries only)

---

### 7. Performance Optimizations

- ✅ Static page generation (SSG) for all marketing pages
- ✅ Image optimization (Next.js Image component)
- ✅ Font optimization (next/font)
- ✅ CSS minification (Tailwind production build)
- ✅ JavaScript tree-shaking
- ✅ Lazy loading for below-the-fold content

---

## What Does NOT Ship (V1 Exclusions)

### Explicitly Out of Scope

- ❌ Chef directory/marketplace (browse all chefs)
- ❌ Public chef profiles (individual chef landing pages)
- ❌ Testimonials from real users (placeholder only)
- ❌ Blog/content management system
- ❌ FAQ page (can be added post-V1 if needed)
- ❌ Live chat widget
- ❌ Email notifications (inquiry confirmation emails)
- ❌ SMS notifications
- ❌ Multi-language support (English only)
- ❌ Dark mode toggle
- ❌ Advanced analytics (Google Analytics, Mixpanel)
- ❌ A/B testing framework
- ❌ Social media integration (login with Google/Facebook)
- ❌ Public event calendar (upcoming events)
- ❌ Public reviews/ratings display
- ❌ Referral program landing page
- ❌ Affiliate program
- ❌ Webinar/demo booking
- ❌ Downloadable resources (PDFs, guides)
- ❌ Newsletter signup form (can add post-V1)
- ❌ Interactive calculators (pricing estimator)

---

## Database Interaction Rules

### Tables the Public Layer Touches

1. **`inquiries`** (if table exists)
   - **Write**: Insert new inquiry on form submission
   - **Read**: NONE (chefs read this in their portal)
   - **Update**: NONE
   - **Delete**: NONE

2. **`chefs`**
   - **Write**: Insert on chef signup
   - **Read**: NONE on public pages (Supabase Auth reads during login)
   - **Update**: NONE
   - **Delete**: NONE

3. **`clients`**
   - **Write**: Insert on client signup (invitation-based)
   - **Read**: NONE on public pages
   - **Update**: NONE
   - **Delete**: NONE

4. **`user_roles`**
   - **Write**: Insert on signup (chef or client)
   - **Read**: Via middleware (role resolution)
   - **Update**: NONE
   - **Delete**: NONE

5. **`client_invitations`**
   - **Write**: NONE (chefs create these in their portal)
   - **Read**: Validate token on client signup
   - **Update**: Mark as used after signup (`used_at` timestamp)
   - **Delete**: NONE

### Tables the Public Layer NEVER Touches

- `events` (chef/client portals only)
- `event_transitions` (system-generated)
- `ledger_entries` (payment webhooks only)
- `menus` (chef portal only)
- `event_menus` (chef portal only)

---

## Routing Rules (Locked)

| Route | File Path | Render Type | Auth Required |
|-------|-----------|-------------|---------------|
| `/` | `app/(public)/page.tsx` | Static (SSG) | No |
| `/services` | `app/(public)/services/page.tsx` | Static (SSG) | No |
| `/how-it-works` | `app/(public)/how-it-works/page.tsx` | Static (SSG) | No |
| `/pricing` | `app/(public)/pricing/page.tsx` | Static (SSG) | No |
| `/inquire` | `app/(public)/inquire/page.tsx` | Static (SSG) | No |
| `/signin` | `app/(public)/signin/page.tsx` | Static (SSG) | No* |
| `/signup` | `app/(public)/signup/page.tsx` | Static (SSG) | No* |
| `/terms` | `app/(public)/terms/page.tsx` | Static (SSG) | No |
| `/privacy` | `app/(public)/privacy/page.tsx` | Static (SSG) | No |

*Middleware redirects away if already authenticated

---

## Middleware Redirect Rules

```typescript
// If user is authenticated:
if (session) {
  // Query user_roles table
  const role = await getUserRole(session.user.id);

  // If on /signin or /signup, redirect to portal
  if (path === '/signin' || path === '/signup') {
    if (role === 'chef') return redirect('/dashboard');
    if (role === 'client') return redirect('/my-events');
  }
}

// If user is NOT authenticated:
if (!session) {
  // Allow access to all public routes
  // Block access to /dashboard and /my-events (handled by portal middleware)
}
```

---

## Component Structure (Locked)

```
app/
├── (public)/
│   ├── layout.tsx          # Public layout (header + footer)
│   ├── page.tsx            # Landing page
│   ├── services/
│   │   └── page.tsx        # Services page
│   ├── how-it-works/
│   │   └── page.tsx        # How It Works page
│   ├── pricing/
│   │   └── page.tsx        # Pricing page
│   ├── inquire/
│   │   └── page.tsx        # Inquiry form page
│   ├── signin/
│   │   └── page.tsx        # Signin page
│   ├── signup/
│   │   └── page.tsx        # Signup page
│   ├── terms/
│   │   └── page.tsx        # Terms of Service
│   └── privacy/
│       └── page.tsx        # Privacy Policy
├── api/
│   └── inquire/
│       └── route.ts        # Inquiry form submission API
└── components/
    └── public/
        ├── Header.tsx      # Public header
        ├── Footer.tsx      # Public footer
        ├── Hero.tsx        # Landing page hero
        └── InquiryForm.tsx # Inquiry form component
```

---

## Content Guidelines

### Tone & Voice
- Professional but approachable
- Focus on chef empowerment (for chef audience)
- Focus on convenience and quality (for client audience)
- Avoid jargon, use plain language

### Copy Length Targets
- Hero headline: 6-10 words
- Hero subheadline: 15-25 words
- Feature descriptions: 20-40 words each
- Page content: 300-600 words total

### Imagery (Placeholder)
- Hero image: High-quality food/chef photography (stock photo OK for V1)
- Feature icons: Simple, consistent style
- Process diagrams: Clean, minimal design

---

## Acceptance Criteria

Public Layer is considered "complete" when:

1. ✅ All 9 routes render correctly
2. ✅ All pages pass Lighthouse audits (Performance, SEO, Accessibility ≥90)
3. ✅ Inquiry form submits successfully and stores data
4. ✅ Chef signup creates user + role + redirects to /dashboard
5. ✅ Client signup (via invitation) creates user + role + redirects to /my-events
6. ✅ Signin redirects to correct portal based on role
7. ✅ Middleware prevents authenticated users from accessing /signin or /signup
8. ✅ All forms have CSRF protection
9. ✅ All inputs are sanitized
10. ✅ Rate limiting works on inquiry submissions
11. ✅ Mobile-responsive on all pages
12. ✅ No console errors or warnings
13. ✅ No broken links or 404s

---

## Scope Change Process

### To Add a Feature
1. Identify as "critical blocker" with written justification
2. Update this document with version bump (1.0 → 1.1)
3. Document in "Scope Change Log" below
4. Get explicit approval

### Scope Change Log (Append-Only)
_No changes as of V1.0 (2026-02-14)_

---

**Scope Lock Status**: ✅ FROZEN
**Implementation May Begin**: ✅ YES

_This document is a contract for the Public Layer. Treat it as immutable._
