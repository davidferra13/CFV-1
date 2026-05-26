# Tables: ChefFlow Social Hub

> **Status:** APPROVED
> **Decision date:** 2026-05-25
> **Mockup:** `.superpowers/brainstorm/1850-1779754651/content/tables-hub-hybrid.html`
> **Core concept:** Two modes, one app. Portal = work. Tables = social.

---

## 1. The Problem

ChefFlow has 7 social networks with 60+ components scattered across 8 nav entries in 3 locations. The chef portal is designed for operations (events, menus, invoices). Social features are orphaned across `Network`, `Community`, `Discover`, `Marketing > Social`, and a standalone rail link. There is no unified social experience.

## 2. The Solution

**Tables** is a separate social zone accessed via a bottom nav button. It unifies all social features behind one entry point that feels like entering a different app. Like Facebook vs Facebook Marketplace: same account, different zone.

## 3. Terminology Contract

| Term        | Where                     | Purpose                                                                                                                         |
| ----------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Circles** | Portal nav (main sidebar) | Work circles. Active client event/inquiry management. Task-oriented inbox view. Pipeline stats, command briefing, workload bar. |
| **Tables**  | Bottom nav button         | Social zone. Community, discovery, connections, open tables, social media, feed. Hang-out energy.                               |

A Dinner Circle can appear in both contexts. The entry point determines the framing: portal shows it as a work inbox item, Tables shows it as a social space.

**Key distinction:** Circles tied to events (`hub_groups.event_id IS NOT NULL` and `hub_groups.tenant_id IS NOT NULL`) are work circles. Community circles (`hub_groups.tenant_id IS NULL`, `group_type = 'community'`) and permanent friend group circles are social tables.

## 4. Route

`/tables` under `app/(chef)/tables/page.tsx`

Sub-routes (tabs render inline, these are deep-link targets):

- `/tables` (default: Feed tab)
- `/tables/discover`
- `/tables/people`
- `/tables/community`
- `/tables/content`

All existing social routes continue to exist and function. Tables links INTO them:

- `/network` (chef social network)
- `/community/*` (directory, benchmarks, mentorship, messaging, templates, subcontracts)
- `/explore/*` (discovery, book a chef)
- `/marketing/social/*` (content planner, media vault, connections, settings)
- `/hub/*` (public circle pages, open tables)
- `/circles` (stays in portal nav as work view)

## 5. Nav Changes

### 5.1 Bottom Button (chef-nav.tsx)

Replace the current community rail link (lines 1049-1064):

**Current:** `Rss` icon, label "Community", links to `/network`, styled as a standard 40x40 rail item.

**New:**

- Icon: `Armchair` from lucide-react
- Label: "Tables" (9px uppercase, brand-400 color)
- Size: 44x44px, `rounded-xl`
- Background: `linear-gradient(135deg, brand-600, brand-500)`
- Glow: `box-shadow: 0 0 20px rgba(237, 168, 107, 0.25)`
- Subtle pulse ring animation on the border (draws attention without being annoying)
- Active state: glow intensifies, ring stops pulsing
- Position: bottom of sidebar, separated by divider (same position as current community link)

**Visibility:** Same conditions as current `showCommunityRailLink`:

```
isAdmin || isPrivileged || showAllNav || tablesRailActive ||
!tenantPresence || tenantPresence.hasNetwork || tenantPresence.hasCircles
```

### 5.2 Network Nav Group Removal

Remove the `network` nav group (id: `'network'`, module: `'more'`) from `nav-config.tsx`. This removes 6 items from the sidebar:

- ~~Circles~~ (stays as standalone item in main nav, it's work)
- ~~Charity~~
- ~~Chef Network~~
- ~~Community~~
- ~~Discover~~
- ~~Messaging~~

All routes remain accessible via Tables hub or direct URL. Only the nav entries are removed.

**Circles stays in main nav** as a standalone item (not inside a group). It links to `/circles` and shows the operational pipeline view.

### 5.3 Marketing Group Cleanup

Remove from the `marketing` nav group:

- ~~Social Hub~~ (`/social`) - removed, reachable via Tables
- Content & Social (`/marketing/social`) - stays in Marketing nav AND is also reachable via Tables > Content Studio tab (dual access is intentional; chefs doing marketing work shouldn't need to leave the portal)

## 6. Shell Budget

Add to `resolveChefSurfaceMode` in `lib/interface/surface-governance.ts`:

```
/tables -> 'browsing'
```

Add to `resolveChefShellBudget`:

- `showBreadcrumbBar: false` (Tables is its own world, no breadcrumb trail)
- `showDesktopSidebar: true` (sidebar stays visible but Tables button is active)
- `showRemy: true` (Remy can help with social features)
- `showQuickCapture: false` (not in work mode)
- `showMarketResearchBanner: false`
- `showFeedbackNudge: false`
- `showLiveAlerts: false` (not in work mode)
- `contentWidth: 'full'` (feed layout needs full width)

## 7. Page Layout (Hybrid Design)

### 7.1 Header Zone

Background: `linear-gradient(180deg, rgba(237, 168, 107, 0.08) 0%, transparent 100%)` with bottom border. Subtly warmer than portal pages.

**Top row:**

- Title: "Tables" in Playfair Display serif, 28px, stone-100
- Subtitle: "Your social world outside the kitchen" in 13px stone-500
- Actions: Notification bell (with red dot for unread social notifications), Search people button, "+ Create Table" primary CTA

**Active Tables strip:**

- Horizontal scrollable row of circle bubbles (52px avatars)
- Each shows: gradient avatar with emoji/initials, name below (11px, truncated), unread dot indicator
- Sources: all `hub_groups` where user is a member, sorted by last activity
- Work circles (has `event_id`) show with a subtle work indicator but are still accessible
- Last item: "+ New Table" with dashed border
- Max ~8 visible before scroll

**Tab bar:**

- Feed (default) | Discover | People | Community | Content Studio
- Active tab: brand-400 text, brand-500 bottom border
- Badge count on Discover tab (new open tables)

### 7.2 Stats Row (Below Header)

4 stat cards in a grid, each showing:

| Card          | Icon | Label              | Value                          | Color accent |
| ------------- | ---- | ------------------ | ------------------------------ | ------------ |
| Active Tables | 🪑   | Active Tables      | "{count} with unread messages" | amber        |
| Open Tables   | 🌐   | Open Tables Nearby | "{location} area"              | emerald      |
| Connections   | 👥   | Connections        | "{pending} pending requests"   | blue         |
| Content Queue | 📱   | Content Queue      | "Next post in {time}"          | purple       |

Large ghost number in top-right of each card (opacity 0.15). Cards use standard ChefFlow card styling (`surface-2`, `stone-700/40` border, card gradient overlay). Hover: translateY(-1px), colored top border bar appears.

Cards link to their respective tab/section on click.

**Empty state handling (Universal Interface Philosophy compliance):** If a stat has no data (e.g., zero connections), the card still renders but shows an actionable prompt: "Find chefs near you" instead of "0 connections". No empty shells with zeros.

### 7.3 Quick Action Pills

Horizontal row of rounded-full buttons:

- Post to Network
- Find a Chef
- View Benchmarks
- Share a Lead
- Browse Templates

Standard ChefFlow pill styling (`surface-2`, `stone-700` border, `stone-300` text). Each links to the appropriate existing feature page.

**Role-aware visibility:** Clients/guests see different pills (Find a Chef, Browse Open Tables, Edit Profile). Chef-only actions (Benchmarks, Share a Lead, Templates) hidden for non-chef roles.

### 7.4 Feed Tab (Default View)

Two-column layout: feed (flex-1) + sidebar (340px). Collapses to single column below 1024px.

**Feed column:**

Unified feed aggregating from two data sources:

1. **Hub Social Feed** (`lib/hub/social-feed-actions.ts`): Messages from all circles the user belongs to
2. **Chef Social Network Feed** (`lib/social/chef-social/posts.ts`): Posts from followed/connected chefs

Each post shows:

- Author avatar + name + timestamp
- **Source tag** (colored pill): Chef Network (purple), Dinner Circle (amber), Open Table (emerald), Community (blue)
- Post body text
- Optional image/media
- Reaction bar: emoji reactions + reply count + save + share

Feed is cursor-paginated, infinite scroll. Posts sorted by `created_at` descending across both sources.

**Sidebar column:**

4 sections, each in a standard card with "See all" link:

1. **Open Tables Nearby**: Top 3 open tables from `getOpenTables()` filtered by chef's default zip. Shows name, area, seats available, closing date. Links to `/hub/open-tables`.

2. **People You May Know**: Suggested connections from `getDiscoverChefs()`. Shows avatar, name, role (Chef/Client), location. "Connect" button per person. Links to `/network?tab=discover`.

3. **Trending Topics**: Hashtags from `getTrendingHashtags()`. Pill-style tags. Click filters feed by hashtag.

4. **Content Studio Mini**: Shows next 2-3 queued/recent social media posts with platform icon, title, and status (queued/published/draft). Links to `/marketing/social`.

### 7.5 Discover Tab

Reuses and composes existing discovery infrastructure:

- `OpenTablesGrid` component (browseable open tables with area/vibe/dietary filters)
- `SocialDiscoverPanel` (chef discovery)
- `CirclesDiscoveryView` (community circle discovery)
- Search bar with unified results across chefs, circles, and people

### 7.6 People Tab

Reuses existing network connection components:

- `FriendsList` (connections)
- `PendingRequests` (incoming/outgoing)
- `ChefSearch` (find people)
- `TrustedCircle` (inner ring, chef-only)
- `ContactShares` (shared contact info)

### 7.7 Community Tab

Reuses existing community page structure (card grid linking to sub-routes):

- Chef Directory (`/community/directory`)
- Benchmarks (`/community/benchmarks`)
- Mentorship (`/community/mentorship`)
- Peer Messaging (`/community/messaging`)
- Templates (`/community/templates`)
- Subcontracts (`/community/subcontracts`)
- Feature Board (`/community/roadmap`)

Max 7 cards (Miller's Law compliance).

### 7.8 Content Studio Tab

Embeds or links to the social media management system:

- `SocialAnnualCalendar` or `SocialQueueSummaryBar` for overview
- Connected platform status
- Quick compose button
- Links to `/marketing/social` for full planner

## 8. Role Views

| Section             | Chef                                         | Client                                         | Guest (token-based)         |
| ------------------- | -------------------------------------------- | ---------------------------------------------- | --------------------------- |
| Active Tables strip | All circles (work + social)                  | Their dinner circles + open tables             | Their circles via token     |
| Stats row           | All 4 cards                                  | 3 cards (no Content Queue)                     | 2 cards (Tables + Discover) |
| Quick actions       | Full set (5)                                 | Reduced (3: Find Chef, Browse Tables, Profile) | Minimal (Browse Tables)     |
| Feed                | Full unified feed                            | Circle activity + open table posts             | Circle-only feed            |
| Discover            | Full (chefs, circles, people, open tables)   | Full                                           | Browse only                 |
| People              | Full (connections, trusted circle, contacts) | Friends, saved chefs                           | Friends via token           |
| Community           | Full (all 7 sub-sections)                    | Browse directory only                          | Hidden                      |
| Content Studio      | Full social media management                 | Hidden                                         | Hidden                      |

**Guest access:** Token-based guests (`hub_guest_profiles` with `profile_token`) do NOT access `/tables` directly (it requires chef auth). Guests interact with social features through the existing `/hub/*` public routes, which already provide circle access, open tables browsing, and friend connections without login. The role view table above describes what data surfaces for each role when they access social features through their respective entry points.

## 9. Visual Differentiation

Tables should feel noticeably different from the portal without being a jarring transition.

**Implemented via:**

1. **Header gradient:** Warm copper tint (`rgba(237, 168, 107, 0.08)`) at top of page. Portal pages don't have this.
2. **Serif title:** "Tables" in Playfair Display. Portal pages use system sans-serif for titles.
3. **Bottom nav glow:** The Tables button has a gradient background and glow effect. No other nav item does this.
4. **No breadcrumbs:** Shell budget suppresses breadcrumb bar. Feels less "hierarchical."
5. **Full-width content:** Feed layout uses the full content area, not the constrained width of portal pages.
6. **Feed-centric layout:** Two-column feed + sidebar is unique to Tables. Portal pages use card grids, tables, or forms.

**NOT changed:** Surface colors, card styling, typography scale, sidebar appearance. The "different zone" feeling comes from layout and energy, not a different theme.

## 10. Notification Routing

### 10.1 Social Notifications

Currently: `markSocialNotificationsRead()` revalidates `/network`. Change to also revalidate `/tables`.

Social notification types (from `chef_social_notifications`):

- Post reactions, comments, follows, mentions, channel activity
- All route to `/tables` (Feed tab) instead of `/network`
- The `/network/notifications` page continues to work for deep-linked access

### 10.2 Platform Notifications

Social publish failures (from `lib/social/publishing/notify.ts`) currently route to `/social/posts/{postId}`. Update to route through Tables > Content Studio tab.

### 10.3 Notification Bell

The Tables header notification bell shows `getUnreadSocialNotificationCount()`. Clicking opens `/network/notifications` (existing page, reachable from Tables).

## 11. Data Architecture

### No new tables needed.

All data comes from existing infrastructure:

| Feature             | Data source                                  | Key function               |
| ------------------- | -------------------------------------------- | -------------------------- |
| Active Tables strip | `hub_groups` + `hub_group_members`           | `getChefCircles()`         |
| Feed (circles)      | `hub_messages`                               | `getChefSocialFeed()`      |
| Feed (network)      | `chef_social_posts`                          | `getFeedPosts()`           |
| Open Tables         | `hub_groups` where `is_open_table = true`    | `getOpenTables()`          |
| Connections         | `chef_connections` + `chef_follows`          | `getFollowCounts()`        |
| People discovery    | `chef_social_posts` authors                  | `getDiscoverChefs()`       |
| Community           | `community_profiles`, `community_benchmarks` | existing community actions |
| Content queue       | `social_queue_settings`, social posts        | existing social actions    |
| Trending            | `chef_social_posts` hashtags                 | `getTrendingHashtags()`    |

### Feed Unification Strategy

The two feed systems (`hub_messages` and `chef_social_posts`) are separate data models. The Tables feed does NOT merge them at the database level. Instead:

1. Fetch both feeds in parallel with `Promise.all`
2. Normalize into a common `TablesPost` type with: `id`, `source` (circle | network | open-table | community), `author`, `body`, `media`, `reactions`, `timestamp`
3. Interleave by timestamp, client-side
4. Each post renders with a source tag so the user knows where it came from

This avoids any database migration while providing a unified view.

## 12. Access Control

Tables uses existing access control systems:

- **Circle access:** `lib/hub/circle-access-policy.ts` - pure function policy engine. `canSeeCircle()`, `canPost()`, `canSeeLinkedObject()` all work as-is.
- **Network access:** `chef_connections` table with status enum, cross-tenant RLS.
- **Community access:** `community_profiles` with visibility toggle.
- **Route policy:** Add `/tables` to chef-authenticated paths in `lib/auth/route-policy.ts`.

## 13. Progressive Disclosure

Following Universal Interface Philosophy (max 7 items per group, max 2 levels of disclosure):

**Level 1:** Tables hub page (stats + feed + sidebar)
**Level 2:** Tab content (Discover, People, Community, Content Studio)

No level 3. Each tab either shows content inline or links to existing feature pages.

**Empty feature suppression:** If a chef has zero connections, the "People You May Know" sidebar section shows discovery prompts, not an empty list. If Content Studio has no connected platforms, that sidebar section shows a setup prompt, not empty state.

## 14. Mobile Considerations

- Stats row: 2-column grid on mobile (currently 4-column)
- Feed layout: single column (sidebar sections collapse below feed)
- Tables strip: horizontal scroll, same bubble size
- Tab bar: horizontal scroll if needed
- Bottom nav button: same position in mobile nav (`ChefMobileNav`)

## 15. Implementation Notes

### Files to create:

- `app/(chef)/tables/page.tsx` - hub page (server component)
- `app/(chef)/tables/loading.tsx` - loading skeleton
- `components/tables/tables-feed.tsx` - unified feed component
- `components/tables/tables-stats-row.tsx` - stats cards
- `components/tables/tables-strip.tsx` - active tables bubble strip
- `lib/tables/feed-unification.ts` - normalize both feed sources into `TablesPost`

### Files to modify:

- `components/navigation/chef-nav.tsx` - replace community rail link with Tables button
- `components/navigation/nav-config.tsx` - remove network group, keep circles standalone
- `lib/interface/surface-governance.ts` - add Tables shell budget
- `lib/auth/route-policy.ts` - add `/tables` to chef paths
- `lib/social/chef-social/notifications.ts` - revalidate `/tables`

### Files that stay unchanged:

- All existing social feature pages (/network, /community, /explore, /marketing/social, /hub/\*)
- All existing components (reused via composition)
- All database tables (no migrations needed)

## 16. Success Criteria

1. Chef clicks glowing "Tables" button at bottom of sidebar
2. Page loads with active tables strip, stats, and unified feed
3. Feels noticeably different from clicking "Events" or "Calendar" (warmer, social energy)
4. Chef can reach any of the 7 social features within 2 clicks
5. All roles (chef/client/guest) see appropriate views
6. Zero new database tables or migrations
7. Feed shows posts from both hub circles and chef network, tagged by source
8. Empty states show actionable prompts, not zeros
9. Existing social feature pages continue to work at their current URLs

## 17. What This Is NOT

- NOT a rewrite of any existing social feature
- NOT a new database schema
- NOT a replacement for the Circles work view in the portal
- NOT a public-facing page (chef-authenticated only; guests use `/hub/*`)
- NOT a mobile app (responsive web, same codebase)

This is a **unification layer**: one landing page, one nav button, composition of existing components.
