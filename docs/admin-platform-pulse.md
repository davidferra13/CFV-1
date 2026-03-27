# Admin Platform Pulse - Implementation Notes

Built from spec: `docs/specs/admin-platform-pulse.md`

## What Was Built

Three components per the spec:

### Component 1: Platform Activity Feed (`/admin/pulse`)

Unified reverse-chronological feed of all platform activity. Queries existing tables (no new tables). Activity types: bookings, inquiries, event transitions, recipes, menus, clients, payments, chef signups.

**Features:**

- Type filters (toggle activity types on/off via URL params)
- "Local Only" toggle (highlights bookings in founder's service area)
- Local bookings get orange left-border and "In Your Area" badge
- Vitals sidebar: today's counts, chef leaderboard (30 days), quiet chefs (14+ days inactive)
- Pagination (50 items per page)

**Files:**

- `lib/admin/activity-feed.ts` - Server actions: `getPlatformActivityFeed()`, `getPlatformVitals()`, `getChefSuccessMetrics()`
- `app/(admin)/admin/pulse/page.tsx` - Page component

### Component 2: Cross-Tenant Inquiry Feed (`/admin/inquiries`)

Dedicated admin page listing every inquiry across all chefs.

**Features:**

- Status filter, "Local Only" toggle, search by client name/email/location
- Table with: date, client, location, occasion, guests, status, chef, distance, actions
- Orange row highlighting for local inquiries
- "Claim" button to duplicate inquiry under founder's tenant (creates client + inquiry + draft event)
- Duplicate detection (won't claim the same inquiry twice)
- Audit logged

**Files:**

- `lib/admin/inquiry-admin-actions.ts` - Server actions: `getPlatformInquiryList()`, `claimInquiryForFounder()`
- `app/(admin)/admin/inquiries/page.tsx` - Page component
- `app/(admin)/admin/inquiries/claim-button.tsx` - Client component for claim action

### Component 3: Founder First-Dibs on Local Bookings

Modified `app/api/book/route.ts` so the founder is always included in matched chefs for bookings within their service area, even if excluded by the 10-chef cap.

**Logic:** After slicing to 10 chefs, check if founder is in the list. If not but they were in the full match results (within radius), append them. Founder slot doesn't count against the cap.

## Database Changes

None. All data comes from existing tables via cross-tenant queries.

## Navigation

- Added quick tiles on `/admin` overview page: "Platform Pulse" and "All Inquiries"
- Added nav entries in `nav-config.tsx` with `adminOnly: true`
