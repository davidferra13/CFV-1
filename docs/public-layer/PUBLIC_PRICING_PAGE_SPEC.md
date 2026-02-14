# Public Layer - Pricing Page Specification

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Route

**Path**: `/pricing`
**File**: `app/(public)/pricing/page.tsx`
**Render**: Static Site Generation (SSG)

---

## Purpose

Explain ChefFlow's pricing philosophy: NO fixed subscription fees, custom pricing per event.

---

## Content Sections

### 1. Page Header
- **Title**: "Simple, Transparent Pricing"
- **Subtitle**: "No subscriptions. No hidden fees."

### 2. Pricing Philosophy
- **Model**: Pay-as-you-go (chef sets own prices)
- **Platform Fee**: Explain if applicable (or "No platform fees" if true)
- **Payment Processing**: Stripe fees (standard rates)

### 3. Deposit Disclosure
- Chefs can require deposits
- Deposit amount is chef-determined
- Payments are secure via Stripe

### 4. Cancellation Policy
- Cancellations are chef-determined
- Refund policies are chef-determined
- Ledger tracks all financial activity

### 5. CTA
- "Get Started" → `/signup`
- "Learn More" → `/how-it-works`

---

## SEO Metadata

```typescript
export const metadata = {
  title: 'Pricing - ChefFlow',
  description: 'Transparent pricing for ChefFlow. No subscription fees. Pay only what you charge your clients.',
};
```

---

**Status**: LOCKED for V1.
