# Public Layer - How It Works Page Specification

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Route

**Path**: `/how-it-works`
**File**: `app/(public)/how-it-works/page.tsx`
**Render**: Static Site Generation (SSG)

---

## Purpose

Explain the end-to-end process for using ChefFlow, from chef signup to event completion, aligned with the event lifecycle states.

---

## Content Structure

### 1. Page Header
- **Title**: "How ChefFlow Works"
- **Subtitle**: "From signup to payment, we handle it all"

### 2. Process Steps (7 steps aligned with lifecycle)

#### Step 1: Chef Signs Up
- Create account
- Set up business profile
- No credit card required

#### Step 2: Invite Clients
- Send invitation emails
- Clients create accounts
- Build client database

#### Step 3: Create Event (Draft)
- Enter event details
- Set pricing
- Attach menus (optional)

#### Step 4: Propose to Client
- Client receives proposal
- Client reviews details
- Client accepts

#### Step 5: Client Pays Deposit
- Secure payment via Stripe
- Automatic confirmation
- Email receipt

#### Step 6: Deliver Service
- Mark event in progress
- Execute event
- Mark completed

#### Step 7: Track Financials
- View payment history
- Ledger audit trail
- Export reports (future)

### 3. Visual Workflow
- Flow diagram showing state transitions
- Icons for each step
- Arrows indicating progression

### 4. CTA Section
- "Ready to get started?" → `/signup`
- "Have questions?" → `/inquire`

---

## SEO Metadata

```typescript
export const metadata = {
  title: 'How It Works - ChefFlow',
  description: 'Learn how ChefFlow simplifies private chef event management from booking to completion.',
};
```

---

**Status**: LOCKED for V1.
