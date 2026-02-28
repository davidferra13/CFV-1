# RSVP System Compact + Build Forward Plan

## Compact Conversation Summary

- You asked for a deep RSVP scan, a clear report of how it works, and a concrete improvement plan.
- You then requested a new growth path: hosts/guests should be able to share dinner context with non-party people as either `viewer` or `new guest` candidates.
- Existing thread captured some RSVP basics, but missed key architecture already live in this codebase.

## What Actually Exists Now (Code-Verified)

- Core guest RSVP share flow:
  - Public share page at `/share/[token]`.
  - Guest form at `components/sharing/rsvp-form.tsx` calling `submitRSVP` / `updateRSVP`.
  - Server actions in `lib/sharing/actions.ts`.
- Secure per-guest portal flow:
  - Route `/event/[eventId]/guest/[secureToken]`.
  - Token-validated lookup + save via `getGuestEventPortal` and `saveGuestEventPortalRSVP`.
  - Supports richer intake fields and edit windows.
- Data model:
  - `event_shares`, `event_guests`, `event_rsvp_summary`, `rsvp_status` enum.
  - Plus later extensions for `photo_consent`, plus-one details, and `guest_event_profile`.
- Security posture:
  - Public flows use `createServerClient({ admin: true })` with app-layer token validation.
  - Earlier permissive anon policies were removed in hardening migrations.
- Growth already present (missed in previous thread):
  - Guest Pipeline exists: QR-driven guest lead capture via `/g/[code]`.
  - Lead management and conversion pipeline exists in `lib/guest-leads/actions.ts`.

## Gap vs Your New Requirement

Current system has:

- RSVP for invited guests.
- Separate guest-lead capture path.

Current system does **not** have:

- First-class RSVP share roles (`viewer` vs `guest`) tied to one invitation model.
- Host/guest-managed "share this event with someone not on the guest list" with permissioned outcomes.

## Build Direction (Going Forward)

## Phase 1: Role-Based Share Links

- Add `share_audience_role` enum: `guest`, `viewer`.
- Create `event_share_invites` table:
  - `id`, `event_id`, `tenant_id`, `created_by_guest_token` (nullable), `created_by_client_id` (nullable), `token`, `role`, `status`, `email`, `name`, `expires_at`, `created_at`.
- Add server actions in `lib/sharing/actions.ts`:
  - `createViewerInvite`, `createGuestInvite`, `resolveInviteByToken`, `promoteViewerToGuest`.
- Acceptance criteria:
  - Tokens resolve to an explicit role.
  - Role controls what UI/actions are available.

## Phase 2: Viewer Experience + Conversion Paths

- Add new public route: `app/(public)/view/[token]/page.tsx`.
- Viewer page behavior:
  - Read-only event highlights (respect existing visibility settings).
  - No RSVP write access.
  - CTA 1: "Request to Join This Dinner" (creates pending approval item).
  - CTA 2: "Book Your Own Experience" (creates guest lead tied to event/source invite).
- Acceptance criteria:
  - Viewers cannot mutate `event_guests` directly.
  - Conversion events are tracked and visible to host/chef.

## Phase 3: Host/Guest Sharing Controls

- Add UI in `components/sharing/share-event-button.tsx` (or sibling panel):
  - "Invite as Guest"
  - "Share as Viewer"
- Add host moderation queue in chef/client event pages:
  - Pending requests from viewers.
  - One-click approve -> creates `event_guests` + guest token.
- Acceptance criteria:
  - Host can convert viewer request to real guest without manual DB work.

## Phase 4: Analytics + Pipeline Integration

- Connect viewer and invite conversion metrics:
  - Viewer opens
  - Viewer -> guest conversion
  - Viewer -> guest_lead conversion
- Feed outcomes into existing guest lead dashboard and (optionally) prospecting stats.
- Acceptance criteria:
  - Event-level conversion funnel visible to chef.

## Phase 5: Hardening + QA

- Add token abuse controls:
  - Rate limits on invite resolution and lead submission.
  - Invite expiration and revocation handling.
- Add tests:
  - Unit: role gating + promotion actions.
  - Integration: invite create -> viewer view -> join request -> approval -> RSVP.
  - Security: viewer token cannot call RSVP update paths.
- Acceptance criteria:
  - No cross-role mutation path possible.

## Immediate Implementation Order

1. Migration for `share_audience_role` + `event_share_invites`.
2. Server actions for invite lifecycle.
3. `/view/[token]` route + viewer UI.
4. Event page controls and moderation queue.
5. Metrics wiring + test coverage.

## Files To Touch First

- `supabase/migrations/*_rsvp_viewer_invites.sql`
- `lib/sharing/actions.ts`
- `app/(public)/view/[token]/page.tsx`
- `components/sharing/share-event-button.tsx`
- `app/(client)/my-events/[id]/page.tsx`
- `app/(chef)/events/[id]/page.tsx`
- `lib/guest-leads/actions.ts` (source attribution for conversions)

## Notes

- Keep the existing RSVP path stable (`/share/[token]`) while introducing viewer flow in parallel.
- Reuse current guest pipeline instead of inventing a second lead system.
