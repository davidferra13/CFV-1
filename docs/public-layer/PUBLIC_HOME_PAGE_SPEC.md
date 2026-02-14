# Public Layer - Home Page Specification

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Route

**Path**: `/`
**File**: `app/(public)/page.tsx`
**Render**: Static Site Generation (SSG)

---

## Purpose

The home page is the primary entry point for all visitors. It must communicate the value proposition clearly and guide users to appropriate actions (sign up, inquire, learn more).

---

## Page Sections

### 1. Hero Section
- **Headline**: Value proposition (6-10 words)
- **Subheadline**: Supporting detail (15-25 words)
- **Primary CTA**: "Sign Up for Free" button → `/signup`
- **Secondary CTA**: "Learn More" button → `/how-it-works`
- **Hero Image**: High-quality food/chef photography

### 2. Feature Highlights
- **Count**: 3-4 features
- **Format**: Icon + Title + Description (20-40 words each)
- **Examples**:
  - Event Management
  - Client Tracking
  - Payment Processing
  - Menu Building

### 3. Social Proof / Testimonials
- **Count**: 2-3 testimonials (placeholder in V1)
- **Format**: Quote + Name + Title
- **Note**: Use placeholder content until real testimonials available

### 4. How It Works (Brief)
- **Format**: 3-step process overview
- **CTA**: "See Full Process" → `/how-it-works`

### 5. Final CTA
- **Headline**: "Ready to streamline your chef business?"
- **Primary CTA**: "Get Started" → `/signup`
- **Secondary CTA**: "Contact Us" → `/inquire`

---

## Content Length Targets

- Hero headline: 6-10 words
- Hero subheadline: 15-25 words
- Feature descriptions: 20-40 words each
- Total page content: 400-600 words

---

## SEO Metadata

```typescript
export const metadata = {
  title: 'ChefFlow - Private Chef Management Platform',
  description: 'Streamline your private chef business with ChefFlow. Manage events, clients, and payments in one place.',
  openGraph: {
    title: 'ChefFlow',
    description: 'Private chef management platform',
    url: 'https://chefflow.app',
    siteName: 'ChefFlow',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
    type: 'website',
  },
};
```

---

**Status**: Home page spec is LOCKED for V1.
