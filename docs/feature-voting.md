# Feature Voting / Public Roadmap (Feature 13.2)

## Overview

A feature request board where chefs can submit ideas, vote on features they want, and track progress through a public roadmap. Admin users can manage statuses and respond to requests.

## Database

**Migration:** `supabase/migrations/20260401000038_feature_voting.sql`

### Tables

**`feature_requests`** - Stores all feature requests.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | Auto-generated |
| title | text | Required |
| description | text | Optional |
| submitted_by | uuid FK chefs | Nullable (set null on chef deletion) |
| status | text | submitted, under_review, planned, in_progress, shipped, declined |
| category | text | core_ops, clients, finance, scheduling, marketing, recipes, team, integrations, other |
| vote_count | int | Denormalized for sort performance |
| admin_response | text | Optional admin reply visible to all |
| shipped_at | timestamptz | Set when status changes to "shipped" |
| created_at | timestamptz | Auto |
| updated_at | timestamptz | Auto via trigger |

**`feature_votes`** - One vote per chef per feature. Unique constraint on (feature_id, chef_id).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | Auto-generated |
| feature_id | uuid FK | Cascading delete |
| chef_id | uuid FK | Cascading delete |
| created_at | timestamptz | Auto |

### RLS

- `feature_requests`: SELECT for all authenticated users. INSERT for all authenticated users.
- `feature_votes`: SELECT for all authenticated. INSERT/DELETE scoped to the voting chef via `user_roles` lookup.
- Admin updates to `feature_requests` go through `createServerClient({ admin: true })` (service role), bypassing RLS.

## Server Actions

**File:** `lib/community/feature-voting-actions.ts`

| Action | Auth | Purpose |
|--------|------|---------|
| `getFeatureRequests(status?, category?)` | requireChef | List with filters, sorted by votes. Includes `has_voted` flag. |
| `getFeatureRequest(id)` | requireChef | Single feature with vote status |
| `submitFeatureRequest(title, description, category)` | requireChef | Submit a new request |
| `voteForFeature(featureId)` | requireChef | Toggle vote (add or remove). Updates denormalized vote_count. |
| `updateFeatureStatus(featureId, status, adminResponse?)` | requireChef + isAdmin | Admin-only status/response update |
| `getMyVotes()` | requireChef | Features the current chef has voted on |
| `getVotingStats()` | requireChef | Aggregate stats (total, by status, top 10) |
| `getRoadmap()` | requireAuth | Public roadmap data grouped by status |

## Components

### `components/community/feature-board.tsx`

Main feature request board. Client component with:
- Feature list sorted by votes
- Vote button (toggle) with optimistic updates and rollback
- Status and category badges (color-coded)
- Inline submit form
- Status and category filter dropdowns
- Error/success messaging

Props: `{ initialFeatures: FeatureRequest[] }`

### `components/community/roadmap-view.tsx`

Public roadmap display. Three-column layout:
- Planned (blue accent)
- In Progress (purple accent)
- Shipped (green accent, shows shipped date)

Each card shows title, description, vote count, category badge, and admin response if present.

Props: `{ initialData: { planned, in_progress, shipped } }`

### `components/community/feature-admin-panel.tsx`

Admin management panel:
- All requests listed with current status
- Status dropdown per request
- Admin response textarea
- Save button with optimistic update + rollback on failure
- Gated: renders error message if `isAdminUser` is false

Props: `{ initialFeatures: FeatureRequest[], isAdminUser: boolean }`

## Patterns Used

- `requireChef()` for auth, `user.entityId` for chef identity
- `isAdmin()` for admin gating (server-side check)
- `createServerClient({ admin: true })` for admin mutations (bypasses RLS)
- `vote_count` denormalized on `feature_requests` for efficient sorting
- `startTransition` with try/catch + rollback for all mutations
- No em dashes anywhere
