# Build 9: Client Portal Enhancement

## What Was Built

A token-based, public client portal at `/client/[token]` that lets a chef's clients view their upcoming events, past events, active quotes, and pending payments — no account or login required. The chef generates a magic link from the client detail page and shares it via email or message. The token is single-client-scoped and tied to a `client_portal_tokens` table.

## Files Created / Modified

| File | Role |
|---|---|
| `app/client/[token]/page.tsx` | Public server page — resolves token, renders portal dashboard |
| `app/client/error.tsx` | Error boundary shown for unexpected failures |
| `app/client/not-found.tsx` | 404 page shown when token is invalid or expired |
| `lib/client-portal/actions.ts` | `getClientPortalData(token)` — validates token, returns portal payload |
| `components/clients/portal-link-manager.tsx` | UI on client detail page for generating and copying the magic link |
| `supabase/migrations/20260312000010_client_portal_token.sql` | Adds `client_portal_tokens` table |

## How It Works

- Migration `20260312000010` creates `client_portal_tokens(id, chef_id, client_id, token, created_at, expires_at)`. Tokens are UUIDs generated server-side. RLS ensures only the owning chef can insert/delete rows; public read is allowed only for the `token` lookup path used by the portal page.
- `getClientPortalData(token)` queries `client_portal_tokens` for a matching, non-expired token, extracts `client_id`, then fetches: client name, upcoming events (status in `confirmed`, `in_progress`), past events (status `completed`), active quotes (status `pending`), and ledger-derived pending payment amounts. Returns a typed `ClientPortalData` object or throws a not-found error.
- The public server page at `/app/client/[token]/page.tsx` calls `getClientPortalData`, then renders four sections: Upcoming Events, Past Events, Quotes Awaiting Action, and Pending Payments. No authentication middleware runs on this route.
- `PortalLinkManager` (on the chef's client detail page) calls a server action to generate a new token (or retrieve the existing one), then displays the full magic link URL with a copy-to-clipboard button. The chef pastes this link into any communication channel.
- `error.tsx` and `not-found.tsx` provide clean fallback UI rather than raw Next.js error pages.

## How to Test

1. Open a client detail page as a chef. Locate the "Client Portal" section rendered by `PortalLinkManager`.
2. Click "Generate Link" — confirm a URL in the format `/client/[uuid]` appears and the copy button works.
3. Open the link in a private/incognito window (no session). Confirm the portal loads with the correct client name and their events/quotes.
4. Visit `/client/invalid-token` — confirm the not-found page renders gracefully.
5. In the database, manually set `expires_at` to a past timestamp and revisit the link — confirm the not-found page appears.
6. Verify that visiting another client's portal token as a different chef shows no cross-tenant data.
