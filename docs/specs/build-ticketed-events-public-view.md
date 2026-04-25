# Build Spec: Public Event View Component

> **Scope:** Create ONE new file: `app/(public)/e/[shareToken]/public-event-view.tsx`
> **Risk:** LOW. New file only. No edits to existing files.
> **Time:** ~20 minutes.

Read `CLAUDE.md` before starting.

---

## Problem

`app/(public)/e/[shareToken]/page.tsx` (line 7) imports:

```tsx
import { PublicEventView } from './public-event-view'
```

This file does not exist. The public event page crashes.

---

## Context: How the Parent Page Works

The server component at `app/(public)/e/[shareToken]/page.tsx` already:

- Rate-limits by IP (line 59)
- Calls `getPublicEventByShareToken(shareToken)` to load event data (line 70)
- Returns `<TokenExpiredPage>` if event not found (line 72)
- Renders JSON-LD structured data for Google (lines 74-112)
- Fetches circle URL for post-purchase flow (lines 114-132)
- Passes these props to `PublicEventView`:

```tsx
<PublicEventView
  event={event} // PublicEventInfo from lib/tickets/purchase-actions.ts
  shareToken={shareToken} // string
  justPurchased={boolean} // true if ?purchased=true in URL
  purchaseCancelled={boolean} // true if ?cancelled=true in URL
  ticketId={string | undefined} // from ?ticket= param
  circleUrl={string | null} // hub circle URL for post-purchase
/>
```

---

## The `PublicEventInfo` Type (from `lib/tickets/purchase-actions.ts` lines 49-68)

```tsx
export type PublicEventInfo = {
  eventId: string
  tenantId: string
  eventName: string
  eventDate: string | null
  serveTime: string | null
  locationText: string | null
  guestCount: number | null
  occasion: string | null
  chefName: string | null
  chefSlug: string | null
  chefImageUrl: string | null
  ticketTypes: EventTicketType[] // from lib/tickets/types.ts
  ticketsEnabled: boolean
  showMenu: boolean
  showDate: boolean
  showLocation: boolean
  showChefName: boolean
  menuSummary: string | null
}
```

Each `EventTicketType` has (from `lib/tickets/types.ts`):

- `id: string`, `name: string`, `description: string | null`
- `price_cents: number`, `capacity: number | null`, `sold_count: number`
- `is_active: boolean`, `remaining?: number | null` (computed)

---

## The Purchase Server Action (from `lib/tickets/purchase-actions.ts` lines 228-411)

```tsx
import { purchaseTicket } from '@/lib/tickets/purchase-actions'
import type { PurchaseTicketInput } from '@/lib/tickets/purchase-actions'

// Call signature:
const result = await purchaseTicket({
  shareToken: string,
  ticketTypeId: string,
  quantity: number,         // 1-20
  buyerName: string,
  buyerEmail: string,
  buyerPhone?: string,
  dietaryRestrictions?: string[],
  allergies?: string[],
  plusOneName?: string,
  plusOneDietary?: string[],
  plusOneAllergies?: string[],
  notes?: string,
})
// Returns: { checkoutUrl: string, ticketId: string, totalCents: number }
// On success, redirect the browser to checkoutUrl (Stripe hosted page)
```

---

## What to Build

Create `app/(public)/e/[shareToken]/public-event-view.tsx` with these requirements:

### Component Behavior

1. **Three modes:**
   - **Purchase mode** (default): show event details + ticket purchase form
   - **Confirmation mode** (`justPurchased=true`): show success message + "Join the Dinner Circle" CTA
   - **Cancelled mode** (`purchaseCancelled=true`): show "Payment cancelled" message + retry button

2. **Purchase mode layout (top to bottom):**
   - Event header: name (large), date + time (if `showDate`), location (if `showLocation`), chef name (if `showChefName`)
   - Menu summary (if `showMenu` and `menuSummary` exists): short paragraph
   - Ticket type selector: list of active ticket types as clickable cards showing name, description, price (`$XX.XX`), remaining capacity (e.g., "12 of 30 remaining"), sold out state
   - When a ticket type is selected, expand the purchase form below it
   - Purchase form fields: Name (required), Email (required), Phone (optional), Quantity (number input, 1-20, default 1), Dietary restrictions (text input), Allergies (text input), Notes (textarea, optional)
   - Order summary line: "2x General Admission = $150.00"
   - "Get Tickets" submit button (disabled while submitting)
   - On submit: call `purchaseTicket()`, redirect to `result.checkoutUrl` via `window.location.href`
   - On error: show error message in a red alert below the button

3. **Confirmation mode:**
   - Green checkmark or success heading: "You're in!"
   - "Your tickets are confirmed. Check your email for details."
   - If `circleUrl` is not null: big CTA button "Join the Dinner Circle" linking to `circleUrl`
   - "Back to event" link to clear the URL params

4. **Cancelled mode:**
   - "Payment was cancelled."
   - "Try again" button that resets to purchase mode

### Design

- `'use client'` directive at top
- Dark theme matching ChefFlow: `bg-stone-950` page background, `bg-stone-900` cards, `text-white` headings, `text-stone-400` secondary text, `bg-emerald-600 hover:bg-emerald-500` primary buttons, `border-stone-700` borders
- Mobile-first, max-width container (`max-w-2xl mx-auto`)
- Use standard HTML form elements styled with Tailwind (NOT importing `Input` or `Textarea` from `@/components/ui` since this is a public page that should be lightweight)
- Monetary display: `(price_cents / 100).toFixed(2)` prefixed with `$`
- No em dashes anywhere

### Imports

```tsx
'use client'

import { useState, useTransition } from 'react'
import { purchaseTicket } from '@/lib/tickets/purchase-actions'
import type { PublicEventInfo } from '@/lib/tickets/purchase-actions'
import type { EventTicketType } from '@/lib/tickets/types'
```

### Props Interface

```tsx
type Props = {
  event: PublicEventInfo
  shareToken: string
  justPurchased: boolean
  purchaseCancelled: boolean
  ticketId?: string
  circleUrl: string | null
}

export function PublicEventView({
  event,
  shareToken,
  justPurchased,
  purchaseCancelled,
  circleUrl,
}: Props) {
  // ...
}
```

---

## Verification

After writing the file:

```bash
# File exists
ls -la app/\(public\)/e/\[shareToken\]/public-event-view.tsx

# Type check (may have errors from OTHER files; focus on YOUR file only)
npx tsc --noEmit --skipLibCheck 2>&1 | grep -i "public-event-view" || echo "No type errors in public-event-view.tsx"
```

---

## Rules

- Create ONLY `app/(public)/e/[shareToken]/public-event-view.tsx`. Do not edit any other files.
- No em dashes.
- All monetary amounts in cents internally, displayed as dollars with 2 decimal places.
- `purchaseTicket` can throw; wrap in try/catch and show the error message to the user.
- Use `useTransition` for the submit action (same pattern as `event-detail-tickets-tab.tsx` lines 87-100).
- The component must be `'use client'`.
- Do NOT import from `@/components/ui/*` (keep this page lightweight for public visitors).
- Do NOT add any authentication. This is a fully public page.
