# Universal Client Portal (Feature U11)

## Overview

The Universal Client Portal adapts to what each client has interacted with. A bakery client sees order tracking. A catering client sees event details. A meal prep client sees subscriptions. A restaurant regular sees reservations and loyalty. All through one unified portal at `/my-*` routes.

## Architecture

### Dynamic Navigation

The client layout (`app/(client)/layout.tsx`) fetches a `PortalOverview` on every render. This overview checks (in parallel) whether the client has data in each system:

- Events
- Quotes
- Meal prep subscriptions
- Reservations (matched by email/phone to guest records)
- Loyalty points or tier advancement
- Feedback requests

The overview is passed to `ClientSidebar` and `ClientMobileNav`, which use it to conditionally show nav items. Core items (events, quotes, messages, etc.) are always visible. Dynamic items (reservations, loyalty, feedback) only appear when the client has relevant data.

### Client Identity Matching

Clients are identified across systems by:

1. `client_id` (primary, for events/quotes/loyalty)
2. `email` (for matching to guest records, feedback requests)
3. `phone` (fallback for guest matching when no email)

This cross-system matching happens in `lib/client-portal/portal-actions.ts`.

## New Pages

### `/my-orders` (Bakery Order Tracking)

- **Status:** Placeholder. The `bakery_orders` table does not exist in the schema yet.
- **When active:** Will show order status timeline (inquiry, quoted, deposit paid, in production, decorating, ready, picked up).
- **Component:** `components/client-portal/order-tracker.tsx` provides the visual timeline.

### `/my-reservations` (Reservation History)

- Upcoming reservations with cancel button
- Past reservation history
- Client matched to guest records by email/phone
- Cancel action verifies ownership before updating

### `/my-loyalty` (Loyalty Dashboard)

- Current tier with visual card
- Points balance and progress to next tier
- Available rewards (links to existing `/my-rewards` for redemption)
- Transaction history with point changes

### `/my-feedback` (Feedback History)

- Pending feedback requests (with prompt to submit)
- Previously submitted feedback with ratings

## Server Actions

All in `lib/client-portal/portal-actions.ts`:

| Action                       | Auth              | What it does                                              |
| ---------------------------- | ----------------- | --------------------------------------------------------- |
| `getPortalOverview()`        | `requireClient()` | Checks all systems for client data, returns boolean flags |
| `getClientReservations()`    | `requireClient()` | Fetches reservations via guest email/phone match          |
| `getClientLoyaltyStatus()`   | `requireClient()` | Fetches tier, points, transactions, available rewards     |
| `getClientFeedbackHistory()` | `requireClient()` | Fetches feedback requests and responses                   |
| `cancelClientReservation()`  | `requireClient()` | Cancels a reservation (verifies ownership)                |

## UI Components

| Component          | Location                                     | Purpose                                    |
| ------------------ | -------------------------------------------- | ------------------------------------------ |
| `PortalSectionNav` | `components/client-portal/portal-nav.tsx`    | Secondary nav showing only active sections |
| `OrderTracker`     | `components/client-portal/order-tracker.tsx` | Visual status timeline for orders          |
| `LoyaltyCard`      | `components/client-portal/loyalty-card.tsx`  | Compact tier/points/progress display       |

## Files Changed

- `app/(client)/layout.tsx` - Fetches portal overview, passes to nav
- `components/navigation/client-nav.tsx` - Dynamic nav items based on portal overview
- `lib/client-portal/portal-actions.ts` - New server actions
- `components/client-portal/portal-nav.tsx` - New component
- `components/client-portal/order-tracker.tsx` - New component
- `components/client-portal/loyalty-card.tsx` - New component
- `app/(client)/my-orders/page.tsx` - New page (placeholder)
- `app/(client)/my-reservations/page.tsx` - New page
- `app/(client)/my-reservations/reservation-cancel-button.tsx` - New component
- `app/(client)/my-loyalty/page.tsx` - New page
- `app/(client)/my-feedback/page.tsx` - New page

## Notes

- The `/my-orders` page is a placeholder because the `bakery_orders` table does not exist yet. The page is gated behind the overview check, so it will not appear in navigation until the bakery module is built.
- The `feedback_requests` and `feedback_responses` tables exist in migrations but are not yet in `types/database.ts` (types not regenerated). Server actions use `any` typing for these queries.
- Existing `/my-rewards` page remains the primary rewards redemption interface. `/my-loyalty` serves as the loyalty overview dashboard with links to `/my-rewards`.
