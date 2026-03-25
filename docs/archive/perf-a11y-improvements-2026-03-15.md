# Performance and Accessibility Improvements (2026-03-15)

## Changes Made

### 1. Pricing Page Performance

- Converted from `'use client'` to server component with ISR (`revalidate = 3600`)
- Extracted FAQ accordion into `app/(public)/pricing/_components/pricing-faq.tsx` (client component)
- Lazy-loaded FAQ section with `dynamic()` and `ssr: false` (below-the-fold)
- Pre-computed feature list as static `FEATURES` array with shared `CheckIcon` component
- Added skeleton loading states for the FAQ section

### 2. Terms Page Code Splitting

- Split 16 sections into above-fold (sections 1-3, server-rendered) and below-fold (sections 4-16, lazy-loaded)
- Created `app/(public)/terms/_components/terms-extended-sections.tsx` for the deferred content
- Added ISR with `revalidate = 3600`
- Added skeleton loading state for below-fold sections
- Replaced em dashes with semicolons/hyphens in legal text

### 3. Contact Form Async

- Separated server component shell (header, metadata, ISR) from client form logic
- Created `app/(public)/contact/_components/contact-form.tsx` with all client-side state
- Server component renders the header instantly; form loads async
- Added skeleton loading state matching the form layout
- No sequential PostgreSQL operations existed to parallelize (single `submitContactForm` call)

### 4. Color Contrast Audit (WCAG AA)

**Findings:**

- `brand-600` (#d47530) against white: **3.29:1** (FAILS WCAG AA 4.5:1 for normal text)
- `brand-700` (#b15c26) against white: **4.74:1** (PASSES WCAG AA)
- `brand-800` (#8e4a24) against white: **6.66:1** (PASSES WCAG AAA)

**Fixes applied:**

- Updated `tailwind.config.ts` with contrast ratio documentation
- Fixed `text-brand-600` to `text-brand-700` in all public-facing pages:
  - `app/(public)/terms/page.tsx` (link text)
  - `app/(public)/contact/page.tsx` (icon and link text)
  - `app/(public)/privacy/page.tsx` (link text)
  - All auth pages (signin, signup, client-signup, forgot-password, reset-password, verify-email)

**Note:** 200+ internal app files still use `text-brand-600`. These should be audited separately since the background colors vary (some use brand-50 backgrounds where contrast may be sufficient for large text/icons).

### 5. Health Endpoint

- Created `app/api/health/route.ts` returning `{ status: "ok", timestamp }` with no auth
- Supports both GET and HEAD methods
- No-cache headers to prevent stale responses
- Created `docs/uptime-monitoring-setup.md` with UptimeRobot configuration guide

### 6. Landing Page Lazy Loading

- Extracted features grid, steps section, and bottom CTA into `app/(public)/_components/landing-below-fold.tsx`
- Lazy-loaded with `dynamic()` and `ssr: false`
- Hero section remains server-rendered for fast FCP/LCP
- Added ISR with `revalidate = 3600`
- Added skeleton loading state for the feature cards
- Fixed `text-brand-600` to `text-brand-700` in the landing component for a11y

## Files Created

- `app/(public)/pricing/_components/pricing-faq.tsx`
- `app/(public)/terms/_components/terms-extended-sections.tsx`
- `app/(public)/contact/_components/contact-form.tsx`
- `app/(public)/_components/landing-below-fold.tsx`
- `app/api/health/route.ts`
- `docs/uptime-monitoring-setup.md`

## Files Modified

- `app/(public)/pricing/page.tsx` (rewritten)
- `app/(public)/terms/page.tsx` (rewritten)
- `app/(public)/contact/page.tsx` (rewritten)
- `app/(public)/page.tsx` (rewritten)
- `app/(public)/privacy/page.tsx` (brand-600 fix, em dash fix)
- `app/auth/signin/page.tsx` (brand-600 fix)
- `app/auth/signup/page.tsx` (brand-600 fix)
- `app/auth/client-signup/page.tsx` (brand-600 fix)
- `app/auth/forgot-password/page.tsx` (brand-600 fix)
- `app/auth/reset-password/page.tsx` (brand-600 fix)
- `app/auth/verify-email/page.tsx` (brand-600 fix)
- `tailwind.config.ts` (contrast ratio docs)
