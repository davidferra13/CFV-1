# Chef Friends Network

**Date:** 2026-02-20
**Layer:** 7 - Social / Chef Network

---

## What Changed

This feature adds a chef-to-chef social layer to ChefFlow. Chefs can now discover each other on the platform, send friend requests, and manage their connections. A privacy toggle lets any chef opt completely out of discovery.

### Database (Migration: `20260221000002_chef_friends_network.sql`)

**New enum:**

- `chef_connection_status` -- pending, accepted, declined

**New columns on `chefs`:**

- `display_name` (TEXT) -- optional public name for the directory
- `bio` (TEXT) -- short bio visible to other chefs
- `profile_image_url` (TEXT) -- avatar URL

**New column on `chef_preferences`:**

- `network_discoverable` (BOOLEAN, default false) -- opt-in toggle

**New table: `chef_connections`**

- Stores the friendship graph: requester, addressee, status, timestamps
- Constraint prevents self-connections
- Unique constraint on (requester_id, addressee_id) prevents duplicates
- Partial indexes on `status = 'accepted'` for fast friend-list queries

**RLS Policies:**

- `chef_connections`: chefs can see/update connections they participate in, insert only as requester
- `chefs_network_discovery`: cross-tenant SELECT for discoverable chef profiles
- `chef_preferences_network_check`: cross-tenant SELECT for discoverable chef preferences (location)

**Helper function:**

- `are_chefs_connected(chef_a, chef_b)` -- returns boolean, works regardless of request direction

### Server Actions (`lib/network/actions.ts`)

| Action                       | Purpose                                                            |
| ---------------------------- | ------------------------------------------------------------------ |
| `searchChefs`                | Find discoverable chefs by name, annotated with connection status  |
| `sendConnectionRequest`      | Create a pending connection (with re-request support for declined) |
| `respondToConnectionRequest` | Accept or decline (addressee only)                                 |
| `getMyConnections`           | List accepted friends with profile + location info                 |
| `getPendingRequests`         | List incoming + outgoing pending requests                          |
| `removeConnection`           | Soft-remove (set to declined)                                      |
| `toggleNetworkDiscoverable`  | Flip the privacy toggle on/off                                     |
| `updateChefProfile`          | Update display_name, bio, profile_image_url                        |
| `getNetworkDiscoverable`     | Read current toggle state                                          |
| `getChefProfile`             | Read current profile fields                                        |

### UI

**Network page** (`/network`):

- Search bar with debounced results
- Contextual action buttons per result (Connect / Request Sent / Accept-Decline / Connected)
- Pending requests section (received with accept/decline, sent with pending badge)
- Friends list with filter, inline remove with confirmation

**Settings integration** (`/settings`):

- New "Chef Network" section with discoverability toggle
- Link to `/settings/profile` sub-page for editing display name, bio, image URL
- Profile preview showing how you'll appear to others

**Navigation:**

- "Network" item added to sidebar standalone top items (Handshake icon)
- `/network` added to middleware chefPaths for route protection

### Shared Components

- `components/network/chef-card.tsx` -- reusable profile card (avatar with initials fallback, name, location, bio, action slot)
- `components/network/discoverability-toggle.tsx` -- toggle switch with explanatory text

---

## Why

Chefs have been asking to find and connect with other chefs on the platform. The primary use case is simple: "My buddy has a ChefFlow account, I want to find him." Location display (city/state) is informational -- it tells you where someone is based, not where they are in real time.

---

## Cross-Tenant Design Decision

This is ChefFlow's first cross-tenant feature. Every existing query uses `.eq('tenant_id', ...)` for tenant isolation. Chef connections intentionally span across tenants -- Chef A (tenant X) connecting with Chef B (tenant Y).

**Solution:** Server actions use `createServerClient({ admin: true })` for cross-tenant reads. The admin client bypasses RLS, so authorization is enforced at the application layer via `requireChef()`. RLS policies are still written as defense-in-depth. This pattern already existed in the codebase for signup and invitation flows.

---

## Privacy Model

- `network_discoverable` defaults to `false` -- existing chefs are hidden until they explicitly opt in
- When hidden: chef does not appear in search results, cannot receive connection requests
- When visible: only display_name (or business_name), bio, city, and state are exposed -- never full address
- Any chef can toggle this on/off at any time in Settings
- Accepted connections persist even if a chef later turns off discoverability (they just can't receive new requests)

---

## What This Does NOT Do (Intentionally)

- No real-time location tracking
- No radius-based search or proximity matching
- No friend-of-friend discovery or suggestions
- No chef-to-chef chat (Layer 6 chat mentions `chef_connection` as Phase 2)
- No shareable profile links (potential future enhancement)
- Does not modify the existing tenant model -- purely additive social layer

---

## Files Created

| File                                                          | Purpose                         |
| ------------------------------------------------------------- | ------------------------------- |
| `supabase/migrations/20260221000002_chef_friends_network.sql` | Database migration              |
| `lib/network/actions.ts`                                      | All server actions              |
| `app/(chef)/network/page.tsx`                                 | Network page (server component) |
| `app/(chef)/network/chef-search.tsx`                          | Search UI (client component)    |
| `app/(chef)/network/pending-requests.tsx`                     | Pending requests UI             |
| `app/(chef)/network/friends-list.tsx`                         | Friends list UI                 |
| `components/network/chef-card.tsx`                            | Reusable chef card              |
| `components/network/discoverability-toggle.tsx`               | Privacy toggle                  |
| `app/(chef)/settings/profile/page.tsx`                        | Profile settings page           |
| `app/(chef)/settings/profile/profile-form.tsx`                | Profile edit form               |

## Files Modified

| File                                 | Change                                                |
| ------------------------------------ | ----------------------------------------------------- |
| `components/navigation/chef-nav.tsx` | Added Network nav item with Handshake icon            |
| `middleware.ts`                      | Added `/network` to chefPaths                         |
| `app/(chef)/settings/page.tsx`       | Added Chef Network section with toggle + profile link |
