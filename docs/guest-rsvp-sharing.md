# Guest RSVP & Event Sharing System

## What Changed

Added a complete guest RSVP and event sharing system that lets clients share event details with their guests via tokenized links. Guests can view event information and submit RSVPs -- giving the chef real-time intelligence on guest counts, dietary restrictions, and allergies without having to ask.

## Why

Previously, chefs had to ask clients for guest counts and dietary information manually. Guests arrived uninformed about menus and event details. This feature creates a self-service intelligence layer where:
- Guest counts auto-compute from RSVPs (no more asking)
- Dietary restrictions and allergies are collected per guest at RSVP time
- The event page is "living" -- guests always see current info
- Chefs control exactly what information guests can see

## How It Works

### Flow
1. **Client** opens their event detail page and clicks "Share with Guests"
2. System generates a unique shareable link (token-based, same pattern as client invitations)
3. Client copies the link and sends it however they want (text, email, DM, etc.)
4. **Guest** opens the link -- sees a public page with event details (date, time, location, menu -- based on chef visibility settings)
5. Guest fills out RSVP form: name, attending status, dietary restrictions, allergies, notes/questions
6. **Chef** sees RSVP progress on their event detail page: attending/maybe/declined/pending counts, aggregated dietary intelligence, guest notes
7. **Client** also sees RSVP progress on their event page

### Chef Visibility Controls
Per-event toggles controlling what guests see on the shared page:
- Date & Time (default: on)
- Location (default: on)
- Occasion (default: on)
- Menu (default: off)
- Dietary Info (default: off)
- Special Requests (default: off)
- Guest List (default: off)
- Chef Name (default: on)

### Token Architecture
- **Share token**: One per shareable link. Created by client, validated publicly. 32-byte hex.
- **Guest token**: One per guest RSVP. Used for editing responses. Also 32-byte hex.
- Stored as cookies for returning guest detection (90-day expiry).
- Follows the same pattern as `client_invitations` -- public SELECT by token, app-layer filtering prevents enumeration.

## Database Schema (Layer 7)

### `event_shares` table
- Links an event to a shareable token
- Has `visibility_settings` JSONB column (chef-controlled)
- Can be revoked by client (`is_active` flag)
- Tenant-scoped

### `event_guests` table
- One record per RSVP response
- Stores: name, email (optional), RSVP status, dietary restrictions, allergies, notes, plus-one
- Has optional `auth_user_id` for future account linking
- Unique constraint on `(event_share_id, email)` prevents duplicate RSVPs per email

### `event_rsvp_summary` view
- Aggregates per event: total guests, attending/declined/maybe/pending counts, plus-one count
- Collects all dietary restrictions and allergies from attending/maybe guests
- Used by both chef and client UI

### New enum: `rsvp_status`
- `pending`, `attending`, `declined`, `maybe`

## Files Created

| File | Purpose |
|------|---------|
| `supabase/migrations/20260221000001_layer_7_guest_rsvp.sql` | Database schema |
| `lib/sharing/actions.ts` | All server actions (9 actions) |
| `app/(public)/share/[token]/page.tsx` | Public guest-facing event page |
| `components/sharing/rsvp-form.tsx` | Interactive RSVP form |
| `components/sharing/share-event-button.tsx` | Share link creation + copy UI |
| `components/sharing/client-rsvp-summary.tsx` | Client-side RSVP progress view |
| `components/sharing/chef-guest-panel.tsx` | Chef-side guest intelligence panel |

## Files Modified

| File | Change |
|------|--------|
| `middleware.ts` | Added `/share` to public paths (line 17), updated path matching to support subpaths |
| `app/(client)/my-events/[id]/page.tsx` | Added Share with Guests card with RSVP summary |
| `app/(chef)/events/[id]/page.tsx` | Added Guests & RSVPs section with intelligence panel |

## Server Actions

| Action | Auth Level | Purpose |
|--------|-----------|---------|
| `createEventShare(eventId)` | Client | Generate share token + link |
| `revokeEventShare(shareId)` | Client | Deactivate a share link |
| `addGuestManually(input)` | Client | Add guest with pending RSVP |
| `updateGuestVisibility(shareId, settings)` | Chef | Toggle visibility per event |
| `getEventGuests(eventId)` | Chef/Client | Full guest list |
| `getEventRSVPSummary(eventId)` | Chef/Client | Aggregate counts + dietary |
| `getEventShares(eventId)` | Chef/Client | Share link records |
| `getEventShareByToken(token)` | Public | Event details for guest page |
| `submitRSVP(input)` | Public | Guest submits RSVP |
| `updateRSVP(input)` | Public | Guest updates RSVP |
| `getGuestByToken(token)` | Public | Fetch existing RSVP |

## Architectural Decisions

1. **Admin client for public actions**: Public server actions use `createServerClient({ admin: true })` to bypass RLS, since the `events` and `menus` tables don't grant anon access. Token validation happens at the app layer.

2. **JSONB visibility settings**: Stored as a single JSONB column rather than separate boolean columns. This allows adding new visibility options without schema changes.

3. **Separate from client invitations**: Guest RSVP tokens are distinct from client invitation tokens. Guests don't need accounts to RSVP -- this is intentionally low-friction.

4. **Cookie-based returning guest detection**: After RSVP, the guest token is stored in a browser cookie. When the guest revisits the share page, they see their existing response pre-filled.

5. **No notifications by default**: The system is non-annoying. The share page is "pull-based" -- guests see current data when they visit. No emails or push notifications are sent. This aligns with the user's preference.

## Future Enhancements

- **Account linking**: When a guest creates a ChefFlow account, link their `event_guests.auth_user_id` to auto-populate dietary/allergy info on future events
- **Email notifications (opt-in)**: Chef can opt-in to sending email notifications for menu updates, time changes, etc.
- **Guest count auto-sync**: Automatically update `events.guest_count` based on RSVP attending count
- **SMS sharing**: Integrate Twilio or similar for direct text message sharing
- **QR code**: Generate QR codes for the share link (great for physical invitations)

## Connection to System

This feature fits into the existing event lifecycle:
- Share links can be created for any event status except `draft` and `cancelled`
- RSVP data is tenant-scoped following the multi-tenant isolation pattern
- All server actions follow existing patterns: `requireChef()`, `requireClient()`, `createServerClient()`
- RLS policies follow the same patterns as `client_invitations`
- The public route uses the same `(public)` layout as the landing page
