# Spec: Admin Platform Pulse (Founder Oversight Dashboard)

> **Status:** built
> **Priority:** P1 (next up)
> **Depends on:** none
> **Estimated complexity:** large (9+ files)
> **Created:** 2026-03-27
> **Built by:** Claude Code session 2026-03-27

---

## What This Does (Plain English)

The founder (David) gets a single, unified feed showing every inquiry, booking, event, recipe, menu, and significant activity that happens across all chefs on the platform, in real time. This is the "master eye" view: one screen where the platform owner can see what every chef is doing, which bookings are flowing, who is succeeding, and (critically) which local bookings the founder should claim first dibs on. It also guarantees the founder always receives every open booking in their service area, regardless of matching limits.

After this is built: the founder opens `/admin/pulse` and sees a live activity stream of every booking, inquiry, event creation, recipe addition, menu build, and chef milestone across the entire platform. Local bookings are flagged prominently so the founder can claim them. A "Platform Vitals" sidebar shows who's active, who's thriving, and who's gone quiet.

---

## Why It Matters

The founder built this platform as a chef first. The worst possible outcome is chefs using the platform successfully while the founder is blind to what's happening, missing local bookings, or unable to learn from the data. The admin system already has 31 pages with deep cross-tenant access, but it lacks: (1) a unified real-time activity feed, (2) cross-tenant inquiry/booking visibility, (3) founder-first-dibs on local bookings, and (4) chef success monitoring. This spec fills those four gaps.

---

## What Already Exists (Don't Rebuild)

The admin system is extensive. This spec builds ON TOP of it, not beside it.

| Existing            | File(s)                                     | What It Does                                                 | Gap                                                                               |
| ------------------- | ------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Admin auth          | `lib/auth/admin.ts`                         | `requireAdmin()`, `isAdmin()`, access levels                 | None, use as-is                                                                   |
| Platform stats      | `lib/admin/platform-stats.ts`               | Cross-tenant KPIs, chef list, event list, system health      | No inquiry list, no activity feed                                                 |
| Owner observability | `lib/admin/owner-observability.ts`          | Global conversations, social, hub groups, notifications      | No inquiries, no bookings, no recipes/menus                                       |
| Command center      | `app/(admin)/admin/command-center/page.tsx` | Aggregated view of conversations, social, hub, notifications | Missing the exact feeds we need                                                   |
| Audit log           | `lib/admin/audit.ts`                        | Immutable admin action log                                   | Logs admin actions, not platform activity                                         |
| Booking matcher     | `lib/booking/match-chefs.ts`                | Matches open bookings to chefs by location/score             | Founder gets +20 score boost but can still be excluded if out of radius or at cap |
| Admin overview      | `app/(admin)/admin/page.tsx`                | KPI cards + quick tiles                                      | Summary only, no drill-down into bookings                                         |
| Admin users page    | `app/(admin)/admin/users/page.tsx`          | Chef list with event counts, GMV                             | No activity timeline per chef                                                     |

**Key finding:** The admin can see chef counts, client counts, event counts, GMV, conversations, social posts, hub groups, and notifications across all tenants. But **cannot** see: cross-tenant inquiries/bookings, cross-tenant recipes/menus, a unified activity stream, or chef success metrics over time.

---

## Architecture: Three Components

### Component 1: Platform Activity Feed (`/admin/pulse`)

A single, reverse-chronological feed of everything that happens on the platform. Each entry is a row: timestamp, chef name, action type, summary, link to details.

**Activity types to surface:**

| Activity                   | Source Table              | How to Detect                                            |
| -------------------------- | ------------------------- | -------------------------------------------------------- |
| New open booking submitted | `inquiries`               | `channel = 'website'`, `utm_medium = 'open_booking'`     |
| New direct inquiry         | `inquiries`               | `channel != 'website'` or `utm_medium != 'open_booking'` |
| Inquiry converted to event | `inquiries`               | `converted_to_event_id IS NOT NULL`                      |
| Event status change        | `event_state_transitions` | Any new row                                              |
| New recipe created         | `recipes`                 | Any new row                                              |
| New menu created           | `menus`                   | Any new row                                              |
| New client added           | `clients`                 | Any new row                                              |
| Payment received           | `ledger_entries`          | `entry_type = 'payment'`                                 |
| Chef signed up             | `chefs`                   | Any new row                                              |
| Chef completed onboarding  | `chef_preferences`        | `onboarding_completed_at` changes from null              |

**Display:** Each activity shows:

- Timestamp (relative: "2 min ago", "3 hours ago")
- Chef avatar + name (links to `/admin/users/[chefId]`)
- Activity icon + type badge
- One-line summary (e.g., "Sarah Miller received a booking for 25 guests in Boston, MA on Apr 12")
- Action button where applicable ("View Inquiry", "View Event", "Claim Booking")

**Filters:**

- Activity type (checkboxes)
- Chef (dropdown)
- Date range
- "Local to me" toggle (only shows activity within founder's service radius)

### Component 2: Cross-Tenant Inquiry Feed (`/admin/inquiries`)

A dedicated admin page listing every inquiry across all chefs. This is the missing piece: the admin can see events, clients, conversations, social posts, but NOT inquiries.

**Columns:** Date, Client Name, Client Email, Location, Occasion, Guest Count, Status, Matched Chef(s), Distance from Founder, Actions

**Key feature:** Inquiries within the founder's service area are highlighted with a badge: "In Your Area". The founder can click "Claim" to have the inquiry also appear in their own chef inbox (creates a duplicate inquiry under their tenant, same as the open booking flow does for matched chefs).

### Component 3: Founder First-Dibs on Local Bookings

Modify the open booking flow (`app/api/book/route.ts`) so the founder is **always** included in matched chefs for bookings within their service area, regardless of the 10-chef cap. The founder is not counted against the cap.

**Current behavior:** Founder gets a +20 score boost but can be excluded if 10 other chefs score higher or if they're outside their configured radius.

**New behavior:**

1. Run the normal matching algorithm
2. Check if the founder's chef record is in the matched list
3. If the founder is within their service radius but was excluded (cap or scoring), force-add them
4. The founder slot does not count against the 10-chef cap (so up to 11 chefs can be notified)
5. If the founder is outside their service radius, do not force-add (respect geography)

This ensures the founder never misses a local booking.

---

## Files to Create

| File                                   | Purpose                                                                |
| -------------------------------------- | ---------------------------------------------------------------------- |
| `app/(admin)/admin/pulse/page.tsx`     | Platform Pulse page: unified activity feed + vitals sidebar            |
| `app/(admin)/admin/inquiries/page.tsx` | Cross-tenant inquiry browser with claim action                         |
| `lib/admin/activity-feed.ts`           | Server actions: `getPlatformActivityFeed()`, `getChefSuccessMetrics()` |
| `lib/admin/inquiry-admin-actions.ts`   | Server actions: `getPlatformInquiryList()`, `claimInquiryForFounder()` |
| `docs/admin-platform-pulse.md`         | Implementation notes                                                   |

---

## Files to Modify

| File                                        | What to Change                                                     |
| ------------------------------------------- | ------------------------------------------------------------------ |
| `app/api/book/route.ts`                     | Add founder-always-included logic after matching (Component 3)     |
| `lib/booking/match-chefs.ts`                | Export `isFounderChef()` helper or use existing `isFounderEmail()` |
| `components/navigation/nav-config.tsx`      | Add "Pulse" and "Inquiries" nav items under admin group            |
| `app/(admin)/admin/page.tsx`                | Add quick tile linking to `/admin/pulse`                           |
| `app/(admin)/admin/command-center/page.tsx` | Add inquiry count card linking to `/admin/inquiries`               |
| `docs/app-complete-audit.md`                | Document new admin pages                                           |

---

## Database Changes

None. All data already exists in tables (`inquiries`, `events`, `event_state_transitions`, `recipes`, `menus`, `clients`, `chefs`, `ledger_entries`, `chef_preferences`). The activity feed is assembled from cross-tenant queries on existing tables, not a new activity log table. This keeps it zero-migration and always current.

If activity feed queries become slow at scale, a materialized `platform_activity_log` table can be added later. For now, direct queries with appropriate limits and indexes are sufficient.

---

## Data Model

No new tables. The activity feed is a **virtual model** composed by querying recent rows from multiple tables and merging them into a unified timeline.

```typescript
type PlatformActivity = {
  id: string // Composite: "{table}:{row_id}"
  timestamp: string // ISO date from the source row's created_at
  type:
    | 'booking'
    | 'inquiry'
    | 'event_transition'
    | 'recipe'
    | 'menu'
    | 'client'
    | 'payment'
    | 'chef_signup'
    | 'onboarding'
  chef_id: string
  chef_name: string
  summary: string // Human-readable one-liner
  metadata: Record<string, any> // Source-specific fields (location, guest_count, etc.)
  is_local: boolean // Within founder's service radius
  link: string | null // Deep link to the relevant admin detail page
}

type PlatformInquiry = {
  id: string
  created_at: string
  client_name: string
  client_email: string
  location: string
  occasion: string
  guest_count: number
  status: string
  chef_id: string // Which chef received it
  chef_name: string
  distance_from_founder: number | null
  is_local: boolean
  is_open_booking: boolean // true if from the public booking form
  converted_to_event_id: string | null
}
```

---

## Server Actions

| Action                              | Auth                           | Input                                                                                         | Output                                                                 | Side Effects                                                                                                |
| ----------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `getPlatformActivityFeed(input)`    | `requireAdmin()`               | `{ limit?: number, offset?: number, types?: string[], chefId?: string, localOnly?: boolean }` | `{ items: PlatformActivity[], total: number }`                         | None (read-only)                                                                                            |
| `getPlatformInquiryList(input)`     | `requireAdmin()`               | `{ limit?: number, offset?: number, status?: string, localOnly?: boolean, search?: string }`  | `{ items: PlatformInquiry[], total: number }`                          | None (read-only)                                                                                            |
| `claimInquiryForFounder(inquiryId)` | `requireAdmin()` (owner-level) | `{ inquiryId: string }`                                                                       | `{ success: boolean, newInquiryId?: string, error?: string }`          | Creates inquiry + client + draft event under founder's tenant. Audit logged. Revalidates `/admin/inquiries` |
| `getChefSuccessMetrics()`           | `requireAdmin()`               | `{ period?: '7d' \| '30d' \| '90d' }`                                                         | `{ chefs: Array<{ id, name, events, revenue, clients, lastActive }> }` | None (read-only)                                                                                            |

---

## UI / Component Spec

### `/admin/pulse` - Platform Pulse

**Layout:** Two-column on desktop. Left (70%): activity feed. Right (30%): vitals sidebar.

**Activity Feed (left):**

- Filter bar at top: activity type checkboxes, chef dropdown, "Local Only" toggle, date range
- Infinite scroll list of activity cards
- Each card: icon, timestamp, chef name, summary, action button
- Local bookings get an orange left-border and "In Your Area" badge

**Vitals Sidebar (right):**

- "Active Now" count (from existing presence system)
- "Today's Activity" summary (bookings, inquiries, events created)
- "Chef Leaderboard" (top 5 by revenue or events this month)
- "Quiet Chefs" (chefs with no activity in 14+ days)
- "Unmatched Bookings" count (bookings with 0 chef matches)

### `/admin/inquiries` - All Inquiries

**Layout:** Full-width table with filters.

**Filter bar:** Status dropdown, "Local Only" toggle, date range, search (client name/email)

**Table columns:** Date, Client, Location, Occasion, Guests, Status, Chef, Distance, Actions

**Row highlighting:**

- Orange background for inquiries in founder's service area
- Green dot for converted-to-event
- Gray for responded/closed

**Actions column:**

- "View" links to the chef's inquiry detail (via admin user page)
- "Claim" button (only for inquiries not already under founder's tenant)

### States

- **Loading:** Skeleton cards/rows
- **Empty:** "No activity yet. Bookings and chef activity will appear here as they happen."
- **Error:** `<ErrorState>` component with "Could not load platform activity" (never fake zeros)
- **Populated:** Feed/table with data

---

## Edge Cases and Error Handling

| Scenario                                            | Correct Behavior                                                                                                     |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Founder claims an inquiry they already have         | Return `{ success: false, error: 'You already have this inquiry' }` (check for duplicate before insert)              |
| Activity feed query is slow                         | Use LIMIT + OFFSET with a hard cap of 200 rows per query. Add `created_at` index hint if needed                      |
| Chef deleted/deactivated but has activity           | Show activity with "(Deactivated)" badge next to chef name                                                           |
| Inquiry has no location data                        | Show "Location unknown", `is_local` = false                                                                          |
| Founder's service area not configured               | All bookings show `distance: null`, "Local Only" toggle is disabled with tooltip "Configure your service area first" |
| `claimInquiryForFounder` fails mid-operation        | Transaction: roll back client + inquiry + event creation. Return error. Don't leave partial records                  |
| Open booking matches 0 chefs but founder is in area | Founder still gets the booking (Component 3 guarantees this)                                                         |

---

## Verification Steps

1. Sign in with agent account (admin)
2. Navigate to `/admin/pulse` - verify page loads with activity feed
3. Submit a test open booking via `/book` form with a location near Haverhill, MA
4. Refresh `/admin/pulse` - verify the booking appears in the feed with "In Your Area" badge
5. Navigate to `/admin/inquiries` - verify the inquiry appears with correct details
6. Click "Claim" on the inquiry - verify it creates a copy under the founder's tenant
7. Verify the founder's regular chef inbox (`/inquiries`) now shows the claimed inquiry
8. Check `/admin/pulse` vitals sidebar shows updated counts
9. Screenshot all pages

---

## Out of Scope

- **Real-time push notifications** (SSE/WebSocket push to admin). The feed is server-rendered on page load. Real-time push is a future enhancement.
- **Auto-claim bookings.** The founder must manually click "Claim". No silent automation (per AI_POLICY.md).
- **Privacy dashboard for chefs** ("who can see my data"). That's a separate feature. For now, admin access is implicit in the platform terms.
- **Recipe/menu content viewer.** The activity feed shows "Chef X created a recipe" but does NOT display the recipe content (chef IP). Just metadata: name, date, chef.
- **Historical backfill.** The activity feed queries `created_at` on existing rows, so all historical data is automatically included. No migration or backfill needed.
- **Mobile-specific layout.** Standard responsive (stack columns on mobile). No dedicated mobile design.
- **Blocking chefs or revoking access from Pulse.** That's already handled on `/admin/users/[chefId]`. Pulse links there.

---

## Notes for Builder Agent

1. **Use existing patterns.** The `owner-observability.ts` file already has `getGlobalConversationList`, `getGlobalSocialFeed`, etc. Follow the same pattern for `getPlatformActivityFeed` and `getPlatformInquiryList`: use `createAdminClient()` (service role), paginate, return `{ items, total }`.

2. **Founder identification.** Use `isFounderEmail()` from `lib/directory/actions.ts` or check `platform_admins.access_level = 'owner'`. The founder's chef ID can be resolved via their email in the `chefs` table.

3. **Distance calculation.** Reuse `calculateDistanceMiles()` from `lib/geo/public-location.ts`. The founder's service area coordinates come from their `chef_discovery_profiles` record.

4. **The "Claim" action** should replicate what `app/api/book/route.ts` does for each matched chef: create/find client under founder's tenant, create inquiry, create draft event, link them. Extract the per-chef loop from the booking route into a shared function if needed.

5. **Component 3 (founder-first-dibs)** is a small change to `app/api/book/route.ts`. After line ~119 (`const chefsToNotify = matchedChefs.slice(0, 10)`), check if the founder is in `chefsToNotify`. If not, and if they're within radius, append them. This is ~15 lines of code.

6. **Activity feed assembly.** Run parallel queries against `inquiries`, `event_state_transitions`, `recipes`, `menus`, `clients`, `ledger_entries`, `chefs` (all with `LIMIT` and `ORDER BY created_at DESC`), then merge-sort the results by timestamp. This is a fan-out/merge pattern. Cap total results at 200.

7. **Noise management.** The developer explicitly mentioned noise as a concern. The "Local Only" toggle and activity type filters are the primary noise controls. Default the page to "Local Only" = OFF and all types visible, but persist filter state in URL search params so the founder can bookmark their preferred view.

8. **Admin nav.** Add entries in `nav-config.tsx` under the admin group with `adminOnly: true`. "Pulse" should be near the top since it's the primary oversight view.

9. **Do not duplicate data.** The activity feed is assembled from queries, not a separate table. This means it's always current and never stale.

10. **Respect the Zero Hallucination Rule.** Every number on the Pulse page must come from a real query. The vitals sidebar counts must query real tables. If a query fails, show `<ErrorState>`, never show zero.
