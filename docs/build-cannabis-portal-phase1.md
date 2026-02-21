# Cannabis Portal — Phase 1 Build Doc

## What Was Built

A secret, invitation-only cannabis tier inside ChefFlow. Invisible to all users who haven't been granted access. Admin controls who gets in.

---

## Why It Exists

You have 10 years of cannabis dining experience, helped author Maine's compliance framework, and run cannabis dinners as frequently as regular ones. The existing app had no dedicated infrastructure for it — only a bare `cannabis_preference BOOLEAN` on the events table. Phase 1 builds the portal foundation. Phase 2 will build the full compliance/dosing system.

---

## How Access Works

```
Admin grants cannabis tier to any user (chef, client, partner)
        ↓
Tier user can submit invite requests (to any email)
        ↓
Invite goes to ADMIN APPROVAL QUEUE — nothing is sent yet
        ↓
Admin approves → cryptographic token generated → invite "sent"
        ↓
Invitee hits /cannabis-invite/[token] → full-screen dispensary door experience
        ↓
User accepts → cannabis_tier_users row inserted → tier active
```

The invitee never knows admin is in the loop. They just see "Your invitation is being processed."

---

## Database Changes

**Migration:** `supabase/migrations/20260322000002_cannabis_portal.sql`

**New tables:**

- `cannabis_tier_users` — who has access (admin-controlled via service role)
- `cannabis_tier_invitations` — the invite queue (pending/approved/rejected)
- `cannabis_event_details` — extends events with cannabis-specific data (category, consent, compliance placeholder)

**New type:**

- `event_cannabis_category` enum: `cannabis_friendly`, `infused_menu`, `cbd_only`, `micro_dose`

**RLS:**

- Users can read their own cannabis_tier_users row (for access checks)
- Users can read/insert their own cannabis_tier_invitations
- cannabis_event_details is tenant-scoped (chef-owned)
- Admin operations use service role (bypass RLS)

---

## Files Created

### Server Actions

| File                                     | Purpose                                                                      |
| ---------------------------------------- | ---------------------------------------------------------------------------- |
| `lib/admin/cannabis-actions.ts`          | Admin CRUD: grant/revoke tier, approve/reject invites, direct grant by email |
| `lib/chef/cannabis-actions.ts`           | Chef: access check, cannabis events, ledger, send invite, sent invites       |
| `lib/clients/cannabis-client-actions.ts` | Client: access check, cannabis events                                        |
| `lib/cannabis/invitation-actions.ts`     | Public: look up invite by token, claim invite                                |

### UI Components

| File                                             | Purpose                                                                                                   |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `components/cannabis/cannabis-portal-header.tsx` | Dark green header with green radiant glow. Also exports `CannabisPageWrapper` for full-page ambient glow. |
| `components/cannabis/cannabis-event-card.tsx`    | Dark-themed event card for cannabis events list                                                           |
| `components/cannabis/invite-form.tsx`            | Invite submission form (routes to admin queue)                                                            |
| `components/cannabis/tier-badge.tsx`             | Small "Cannabis Tier" badge + `CannabisNavDot`                                                            |

### Pages

| Route                      | File                                                                            | Notes                                                 |
| -------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `/admin/cannabis`          | `app/(admin)/admin/cannabis/page.tsx` + `admin-cannabis-client.tsx`             | Tabs: invite queue, tier users, direct grant, history |
| `/cannabis`                | `app/(chef)/cannabis/page.tsx`                                                  | Hub with 4 cards                                      |
| `/cannabis/events`         | `app/(chef)/cannabis/events/page.tsx`                                           | Active + past cannabis events                         |
| `/cannabis/ledger`         | `app/(chef)/cannabis/ledger/page.tsx`                                           | Revenue, expenses, net profit                         |
| `/cannabis/invite`         | `app/(chef)/cannabis/invite/page.tsx`                                           | Invite form + sent history                            |
| `/cannabis/compliance`     | `app/(chef)/cannabis/compliance/page.tsx` + `compliance-placeholder-client.tsx` | THE PLACEHOLDER. Very obvious.                        |
| `/my-cannabis`             | `app/(client)/my-cannabis/page.tsx`                                             | Client view of cannabis events                        |
| `/cannabis-invite/[token]` | `app/(public)/cannabis-invite/[token]/page.tsx` + `cannabis-claim-client.tsx`   | Dispensary door experience                            |

---

## Files Modified

| File                                   | Change                                                                                                          |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `lib/admin/audit.ts`                   | Added 4 cannabis action types to `AuditActionType` union                                                        |
| `components/admin/admin-sidebar.tsx`   | Added "Cannabis Tier" nav item with Leaf icon                                                                   |
| `components/navigation/chef-nav.tsx`   | Added `hasCannabisTier` prop to `ChefSidebar` + `ChefMobileNav`; cannabis nav section renders when true         |
| `components/navigation/client-nav.tsx` | Added `hasCannabisTier` prop to `ClientSidebar` + `ClientMobileNav`; single cannabis nav item renders when true |
| `app/(chef)/layout.tsx`                | Calls `hasCannabisAccess(user.id)`, passes `hasCannabisTier` to both nav components                             |
| `app/(client)/layout.tsx`              | Calls `clientHasCannabisAccess(user.id)`, passes `hasCannabisTier` to both nav components                       |

---

## The Visual Design

The cannabis portal has a **signature green radiant** — a dark green ambient glow that tells you immediately you're somewhere different. Key elements:

- **Background**: Very dark green `#0f1a0f` / `#0a130a` (not the app's stone/beige)
- **Radiant**: `radial-gradient` green glow from top of each page and header
- **Text**: `#e8f5e9` (off-white green tint) for headings, `#6aaa6e` for body, `#4a7c4e` for muted
- **Accent**: `#8bc34a` (brighter leaf green) for prices and highlights
- **Borders**: `rgba(74, 124, 78, 0.2)` — barely visible green borders
- **Nav separator**: Thin green separator between regular nav and cannabis section, labeled "Cannabis"

The invite claim page (`/cannabis-invite/[token]`) is full-screen, completely dark green, with a breathing radiant glow animation — the dispensary door.

---

## The Compliance Placeholder

`/cannabis/compliance` is **intentionally conspicuous**. It has:

- A giant amber `⚠️ THIS PAGE IS A PLACEHOLDER` banner
- The full checklist of what Phase 2 needs to build
- A working scratchpad textarea (saves to localStorage)
- A closing line: "When you're ready to build Phase 2, tell the developer: 'Build the cannabis compliance system'"

**What Phase 2 will need:**

- SOPs (exact methods for each cannabis dinner)
- Dosing tracker (per-guest THC/CBD, form, timing)
- Extract tracking
- Photo documentation (before/after, timestamped)
- Guest consent forms
- Maine state compliance log (your framework)
- Print-out generation (one-page compliance sheet)
- Receipt photo requirement (timestamped, within 24h)
- SOP enforcement checklist

---

## Deployment Notes

1. **Apply migration** before going live:

   ```bash
   supabase db dump --linked > backup-$(date +%Y%m%d).sql
   supabase db push --linked
   ```

2. **Grant yourself cannabis tier** first via the admin panel at `/admin/cannabis` → "Direct Grant" tab.

3. The cannabis portal is fully invisible until a user is in `cannabis_tier_users` with `status = 'active'`.

---

## Build Status

- `npx tsc --noEmit --skipLibCheck` → ✓ 0 errors
- `npx next build --no-lint` → pre-existing TS error in `lib/notifications/tier-config.ts` (unrelated, was modified before this build)
