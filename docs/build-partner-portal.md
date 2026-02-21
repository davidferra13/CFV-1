# Build: Partner Portal (Authenticated)

## Overview

Partners (Airbnb hosts, venue owners, property managers) previously had no authenticated login — only a tokenized read-only report URL. This build adds a full pride-and-showcase portal where partners can log in, see their location stats, browse event history, manage their profile, and preview how they appear to clients.

**The philosophy:** Partners don't get paid. Exposure IS the value. This portal exists to make them feel proud of their relationship with the chef.

---

## The Origin Story (Critical Context)

Almost every partner in this system came through clients, not outreach:

> **Client books vacation rental → Chef does exceptional work → Client tells host →
> Host adds chef to their welcome binder → Host becomes a formal partner.**

This chain is now a first-class piece of data in the system. The migration adds `origin_client_id` and `origin_event_id` to `referral_partners` so the story is never lost. The partner's dashboard shows their origin story warmly: "This partnership began when [Client] hosted a [Occasion] in [Month Year] at your space."

---

## What Partners Can Do (After This Build)

- Sign in to a dedicated partner portal at `/partner/dashboard`
- See aggregate stats: total locations, events hosted, guests served
- Browse their locations (with photos) and click into each for event history
- View all events at their locations (occasion, date, guest count — **no client PII ever**)
- Edit their public profile: name, description, contact info, website, booking URL
- Preview exactly how they appear on the chef's public showcase page

---

## Files Created / Modified

### Database

| File                                                         | What It Does                                                   |
| ------------------------------------------------------------ | -------------------------------------------------------------- |
| `supabase/migrations/20260321000007_partner_portal_auth.sql` | Adds partner auth columns + RLS + origin tracking + enum value |

### New columns on `referral_partners`:

- `auth_user_id UUID` — linked after invite is claimed
- `invite_token UUID` — one-time claim token, cleared after use
- `invite_sent_at TIMESTAMPTZ` — when chef sent the invite
- `claimed_at TIMESTAMPTZ` — when partner completed signup
- `origin_client_id UUID` — the client whose booking started this partnership
- `origin_event_id UUID` — the specific event that led to the partnership
- `acquisition_source TEXT` — `client_event_referral | direct_outreach | organic`

### RLS Policies Added:

- `partner_view_own` on `referral_partners` — partner sees only their own record
- `partner_update_own` on `referral_partners` — partner can update their own record
- `partner_view_own_locations` on `partner_locations` — see locations under their partner record
- `partner_view_own_images` on `partner_images` — see images for their locations

### Auth Layer

| File                   | Change                                                     |
| ---------------------- | ---------------------------------------------------------- |
| `lib/auth/get-user.ts` | Added `PartnerAuthUser` type + `requirePartner()` function |

### Server Actions

| File                             | What It Does                                                       |
| -------------------------------- | ------------------------------------------------------------------ |
| `lib/partners/invite-actions.ts` | **NEW** — `generatePartnerInvite()` + `claimPartnerInvite()`       |
| `lib/partners/portal-actions.ts` | **NEW** — `getPartnerPortalData()`, `updatePartnerProfile()`, etc. |

### Partner Portal Route Group (`app/(partner)/partner/`)

| File                      | URL                      | Purpose                                            |
| ------------------------- | ------------------------ | -------------------------------------------------- |
| `layout.tsx`              | (wraps all)              | `requirePartner()` guard + sidebar                 |
| `dashboard/page.tsx`      | `/partner/dashboard`     | Stats, locations grid, recent events, origin story |
| `locations/page.tsx`      | `/partner/locations`     | All locations list                                 |
| `locations/[id]/page.tsx` | `/partner/locations/:id` | Location detail, photos, event history             |
| `events/page.tsx`         | `/partner/events`        | Full event history across all locations            |
| `profile/page.tsx`        | `/partner/profile`       | Edit name, description, contact info, website      |
| `preview/page.tsx`        | `/partner/preview`       | Preview the public showcase card                   |

### Auth Pages

| File                               | URL                           | Change                      |
| ---------------------------------- | ----------------------------- | --------------------------- |
| `app/auth/partner-signup/page.tsx` | `/auth/partner-signup?token=` | **NEW** — invite claim page |

### Navigation

| File                                    | Change                                        |
| --------------------------------------- | --------------------------------------------- |
| `components/navigation/partner-nav.tsx` | **NEW** — partner sidebar + mobile bottom nav |

### Chef Portal

| File                                            | Change                                                     |
| ----------------------------------------------- | ---------------------------------------------------------- |
| `app/(chef)/partners/[id]/page.tsx`             | Added `<PartnerInviteButton>` + acquisition origin section |
| `components/partners/partner-invite-button.tsx` | **NEW** — generates + displays one-time invite link        |

---

## Invite Flow (Step by Step)

1. Chef opens a partner's detail page → clicks **"Invite Partner to Portal"**
2. `generatePartnerInvite(partnerId)` creates a UUID token, saves to `referral_partners.invite_token`
3. Chef copies the URL (`/auth/partner-signup?token=<uuid>`) and sends it to the partner
4. Partner opens the URL → fills in email + password
5. `claimPartnerInvite(token, email, password)` server action:
   - Validates token is unused
   - Creates Supabase auth user (auto-confirmed — invite IS the trust signal)
   - Inserts `user_roles: { role: 'partner', entity_id: partner.id }`
   - Clears `invite_token`, sets `claimed_at`
6. Client-side signs in with credentials → redirects to `/partner/dashboard`
7. On the chef's partner detail page, the button now shows "✓ [Name] has claimed their partner account"

---

## `requirePartner()` — Auth Guard

```typescript
// lib/auth/get-user.ts
export type PartnerAuthUser = {
  id: string // auth.users.id
  email: string
  role: 'partner'
  partnerId: string // referral_partners.id
  tenantId: string // the chef's ID (referral_partners.tenant_id)
}

export async function requirePartner(): Promise<PartnerAuthUser>
// Throws if not authenticated or not partner role
// Used in partner layout and all portal-actions.ts functions
```

---

## Privacy Design

**No client PII is ever shown to partners.**

Events in the partner portal show only:

- Date
- Occasion (e.g., "Birthday Dinner")
- Guest count
- Status

Client names, contact info, payment amounts, and messages are never exposed.

---

## Verification Checklist

1. **Apply migration** via `supabase db push --linked`
2. **Send invite**: Chef opens `/partners/[id]` → click "Invite Partner to Portal" → copy URL
3. **Claim invite**: Open URL in incognito → complete signup → verify redirect to `/partner/dashboard`
4. **Dashboard**: Verify stats, locations, and recent events load correctly
5. **Events tab**: Confirm NO client names or contact info visible
6. **Profile edit**: Change description → verify it saves and updates preview
7. **Preview page**: Confirm it matches what clients see on the chef's public page
8. **Claimed state**: Back on chef partner detail — confirm button now shows "has claimed their account"

---

## Future Enhancements (Not in This Build)

- Photo upload from the partner portal (currently photos are uploaded by the chef)
- Email notification to partner when chef tags an event at their location
- "Convert host to partner" prompt when an event completes at a non-partner address
- Partner-to-chef messaging thread
- Location capacity and amenities fields
