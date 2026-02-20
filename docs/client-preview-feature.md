# Client Preview Feature

**Date:** 2026-02-19

## What This Does

Adds a `/settings/client-preview` page that lets chefs see exactly what their clients experience — both before and after booking.

**Two tabs:**

1. **Public Profile** — An inline server-rendered render of the public `/chef/[slug]` page content inside a scrollable device frame (desktop/mobile toggle). Uses `PartnerShowcase` and the same markup as the real page. An "Open Live Page" link opens the actual URL in a new tab.

2. **Client Portal** — A live preview of the authenticated client portal. The chef selects a client from a dropdown, and the preview renders that client's My Events list (grouped by status), pending quotes, and loyalty status using real data. All interactive elements (Book Now, Pay Now, Accept, etc.) are shown but non-functional — visual reference only.

## Files Changed

| File | Status |
|------|--------|
| `lib/preview/client-portal-preview-actions.ts` | New |
| `app/(chef)/settings/client-preview/page.tsx` | New |
| `app/(chef)/settings/client-preview/client-preview-tabs.tsx` | New |
| `app/(chef)/settings/client-preview/public-profile-preview.tsx` | New |
| `app/(chef)/settings/client-preview/client-portal-preview.tsx` | New |
| `app/(chef)/settings/page.tsx` | Modified — added "Client Preview" card in Profile & Branding section |

## Security Model

**No impersonation occurs.** The chef's session is used throughout.

The new `lib/preview/client-portal-preview-actions.ts` contains four server actions:

- `getPreviewClients()` — lists all clients for the chef's tenant
- `getPreviewClientEvents(clientId)` — events scoped to `(client_id, tenant_id)`
- `getPreviewClientQuotes(clientId)` — quotes scoped to `(client_id, ...)` with tenant pre-check
- `getPreviewClientLoyaltyStatus(clientId)` — loyalty data with tenant pre-check

Every action: (1) calls `requireChef()` first, (2) validates the requested `clientId` belongs to `user.tenantId!` before returning any data. The data returned is identical to what the real client actions would return — just fetched with a chef session rather than a client session.

## What It Does Not Do

- Does not impersonate clients or switch auth sessions
- Does not write any data
- Does not require any database migrations
- Cannot trigger lifecycle transitions (FSM state changes)
- Cannot initiate payments or ledger entries

AI Policy litmus test: unplug this feature → system functions completely. Purely read-only and observational.

## Why Inline Render (Not iframe) for Public Profile

`next.config.js` sets `X-Frame-Options: DENY` on every route, which causes browsers to block same-origin iframes. We render the public profile content inline instead, mirroring `app/(public)/chef/[slug]/page.tsx` exactly — same hero section, partner showcase (`PartnerShowcase` component reused directly), and CTA section. Any change to the real page needs to be reflected here.

## Stale Data Prevention

`PortalData` carries a `clientId` field. When switching to the Portal tab, `handleTabSwitch` checks `!portalData || portalData.clientId !== selectedClientId`. This ensures that if the chef changed the client selector while on the Public tab, the portal data reloads for the correct client rather than showing the previously loaded client's data.

## Connection to System

- Entry point: Settings → Profile & Branding → "Client Preview" card
- Reuses `getChefSlug()` and `getPublicChefProfile()` from `lib/profile/actions.ts`
- Public profile rendering reuses `PartnerShowcase` from `components/public/partner-showcase.tsx`
- Client portal rendering mirrors `app/(client)/my-events/page.tsx` event card structure and status badges exactly
- Uses shared `Card`, `Badge`, `formatCurrency`, `format` (date-fns) from the existing component library
- No new packages required
