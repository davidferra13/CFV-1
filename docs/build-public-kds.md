# Build: Public KDS Route (#45)

**Date:** 2026-03-12
**Branch:** `feature/risk-gap-closure`
**Roadmap Item:** #45 Kitchen Display System (build order #21)

## What Changed

Added a public, no-auth KDS route (`/kds/[tenantId]`) that kitchen staff can open on a dedicated monitor using just a PIN. The authenticated KDS at `/commerce/kds` already existed with full functionality; this enhancement makes it accessible without a login.

### What Already Existed

- `lib/commerce/kds-actions.ts` - Full KDS backend: create tickets from sales, bump, void, fire course, stats, expeditor view
- `components/commerce/kds-station-view.tsx` - Per-station ticket grid with bump/void
- `components/commerce/kds-expeditor-view.tsx` - All-stations overview with stats
- `app/(chef)/commerce/kds/` - Authenticated KDS page with station selector + fullscreen
- `kds_tickets` table with FSM (new, in_progress, ready, served, voided)
- `stations` table for kitchen position management

### New Files

1. **`supabase/migrations/20260401000006_kds_pin.sql`** - Adds `kds_pin` TEXT column to `chefs` table
2. **`lib/commerce/kds-public-actions.ts`** - Server actions for public KDS (no session auth, validated by tenant ID + PIN):
   - `verifyKdsPin()` - Validates PIN, returns station list
   - `getPublicKdsTickets()` - Fetches active tickets (optionally filtered by station)
   - `bumpPublicKdsTicket()` - Advances ticket status
   - `fireAllPublicKdsCourse()` - Fires all tickets for a course number
3. **`app/kds/[tenantId]/page.tsx`** - Public route (noindex, nofollow)
4. **`app/kds/[tenantId]/kds-client.tsx`** - Full public KDS UI:
   - PIN entry screen (4-6 digits, numeric keypad on mobile)
   - Dark theme (always, optimized for kitchen monitors)
   - Station tabs (single station or all-stations expeditor view)
   - Large text, color-coded tickets (red=new, yellow=firing, green=ready)
   - Priority badges (RUSH with pulse animation, VIP)
   - Allergy alerts (red banner, prominent)
   - Overdue ticket highlighting (>15 min, pulsing red timer)
   - Bump button (large touch targets for gloved hands)
   - Fire All Course button
   - Fullscreen toggle
   - Lock button (returns to PIN screen)
   - Auto-refresh every 5 seconds
5. **`app/kds/layout.tsx`** - Minimal layout (no chef nav, dark background)

### Modified Files

6. **`lib/commerce/kds-actions.ts`** - Added `getKdsPin()` and `setKdsPin()` for PIN management
7. **`app/(chef)/commerce/kds/page.tsx`** - Passes `currentPin` and `tenantId` to client
8. **`app/(chef)/commerce/kds/kds-page-client.tsx`** - Added "Monitor Link" button with PIN setup panel showing the public URL

## How It Works

```
Chef sets PIN in /commerce/kds → "Monitor Link" panel
                |
                v
    kds_pin stored on chefs table
                |
Kitchen monitor opens /kds/{tenantId}
                |
                v
         PIN entry screen
                |
                v (correct PIN)
    Public KDS loads via kds-public-actions.ts
    (uses admin client, validates PIN on every request)
                |
                v
    Auto-refreshing ticket display (5s interval)
    Bump / Fire All / Fullscreen
```

## Design Decisions

- **PIN on every request**: Not just on initial auth. Every server action re-validates the PIN. Simple and secure.
- **Admin client**: Public actions use `createAdminClient()` (service role) since there's no user session. PIN acts as the auth gate.
- **Separate action file**: Public actions don't import from `kds-actions.ts` to avoid pulling in `requireChef()` dependencies.
- **Always dark**: Kitchen monitors are in bright environments; dark theme with high-contrast colors is easier to read.
- **5s refresh**: Faster than the authenticated KDS (10s) since kitchen monitors need near-real-time visibility.
- **No void on public**: Public KDS only bumps (advances status). Voiding requires the authenticated route.
