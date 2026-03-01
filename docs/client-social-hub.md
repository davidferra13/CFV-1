# Client Social Hub — Implementation Doc

**Date:** 2026-02-28
**Feature:** Social Event Hub surfaced in client portal + friends + chef sharing

## What Changed

The Social Event Hub (fully built backend + public UI) was not accessible from the authenticated client portal. This change wires it in.

### New Pages

| Route                    | What It Does                                                                                   |
| ------------------------ | ---------------------------------------------------------------------------------------------- |
| `/my-hub`                | Dashboard showing dinner groups, friends preview, quick stats, "Share a Chef" link             |
| `/my-hub/create`         | Form to create a dinner event stub + auto-create hub group                                     |
| `/my-hub/g/[groupToken]` | Full group experience (chat, photos, notes, polls, schedule, members) wrapped in client layout |
| `/my-hub/friends`        | Friend management — add, accept/decline requests, search people                                |
| `/my-hub/share-chef`     | Recommend chefs to friends, view recommendations received                                      |

### New Navigation

"My Hub" added to client sidebar nav (desktop + mobile) with `Users` icon, positioned after "Messages" and before "Rewards".

### New Database Tables

1. **`hub_guest_friends`** — peer-to-peer friend connections between hub guest profiles (cross-tenant)
   - Status: pending → accepted / declined
   - Unique constraint on ordered pair (prevents duplicates regardless of direction)
   - Migration: `20260330000010_hub_guest_friends.sql`

2. **`hub_chef_recommendations`** — chef recommendations shared between friends
   - Links: chef → from_profile → to_profile + optional message
   - Unique per chef+sender+recipient combo
   - Migration: `20260330000011_hub_chef_recommendations.sql`

### New Server Actions

| File                            | Functions                                                                                                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `lib/hub/client-hub-actions.ts` | `getOrCreateClientHubProfile()`, `getClientHubGroups()`, `getClientProfileToken()`                                                                           |
| `lib/hub/friend-actions.ts`     | `sendFriendRequest()`, `acceptFriendRequest()`, `declineFriendRequest()`, `removeFriend()`, `getMyFriends()`, `getPendingFriendRequests()`, `searchPeople()` |
| `lib/hub/chef-share-actions.ts` | `getMyChefsToShare()`, `shareChefWithFriend()`, `getMyChefRecommendations()`                                                                                 |

### New Components

| File                                   | Purpose                                                                      |
| -------------------------------------- | ---------------------------------------------------------------------------- |
| `components/hub/hub-group-card.tsx`    | Card for hub dashboard grid (emoji, name, members, last message, unread dot) |
| `components/hub/create-event-form.tsx` | Form for creating dinner event stubs                                         |
| `components/hub/friends-list.tsx`      | Friends management: list, search, add, accept/decline requests               |
| `components/hub/share-chef-form.tsx`   | Multi-step chef sharing: pick chef → pick friends → optional message         |

### Architecture Decisions

1. **Profile bridging:** Authenticated clients auto-get a `hub_guest_profile` linked via `auth_user_id` and `client_id`. If they already have one from a public hub link, it gets linked. No onboarding friction.

2. **Cookie bridge:** The existing hub components (HubGroupView, HubFeed, etc.) read `hub_profile_token` from a cookie. The client group detail page sets this cookie server-side so all 13 existing components work without modification.

3. **Component reuse:** The full `HubGroupView` component is imported and wrapped — all chat, photos, notes, polls, scheduling, and member management works as-is.

4. **Cross-tenant friends:** Friends are on `hub_guest_profiles`, not `clients` — meaning friends work across different chefs' tenants. Two clients of different chefs can still be friends.

## Deployment Notes

- **2 new migrations** need to be applied before these pages work
- Run `supabase db push` after backing up
- Regenerate types: `supabase gen types typescript --linked > types/database.ts`
