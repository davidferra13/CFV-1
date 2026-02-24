# UI Audit: Network & Community Pages

> **Generated:** 2026-02-23
> **Scope:** All pages under `/network/...` and `/community/...`, plus every component they import.

---

## Table of Contents

1. [Network Hub (`/network`)](#1-network-hub-network)
   - 1a. Feed Tab
   - 1b. Channels Tab
   - 1c. Discover Tab
   - 1d. Connections Tab
2. [Chef Profile (`/network/[chefId]`)](#2-chef-profile-networkchefid)
3. [Notifications (`/network/notifications`)](#3-notifications-networknotifications)
4. [Saved Posts (`/network/saved`)](#4-saved-posts-networksaved)
5. [Channel Detail (`/network/channels/[slug]`)](#5-channel-detail-networkchannelsslug)
6. [Community Templates (`/community/templates`)](#6-community-templates-communitytemplates)
7. [Shared Components Reference](#7-shared-components-reference)
   - 7a. SocialFeedClient
   - 7b. SocialPostCard
   - 7c. SocialPostComposer
   - 7d. SocialStoryBar
   - 7e. SocialDiscoverPanel
   - 7f. SocialChannelCard / SocialChannelGrid
   - 7g. ChefCard
   - 7h. CommunityTemplateImport
   - 7i. ChefProfileActions
   - 7j. MarkAllReadButton

---

## 1. Network Hub (`/network`)

| Property                  | Value                                         |
| ------------------------- | --------------------------------------------- |
| **Route**                 | `/network` (aliased via search param `?tab=`) |
| **File**                  | `app/(chef)/network/page.tsx`                 |
| **Page title (metadata)** | `Chef Community -- ChefFlow`                  |
| **Auth**                  | `requireChef()` -- chef role required         |

### 1.1 Page Header

| Element                     | Details                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Heading**                 | `<h1>` -- "Chef Community" (text-3xl font-bold text-stone-900)                                          |
| **Subheading**              | `<p>` -- "Connect, share, and grow with private chefs everywhere" (text-stone-500 text-sm)              |
| **Notifications icon-link** | Bell icon, links to `/network/notifications`, title="Social notifications", border pill style           |
| **Saved posts icon-link**   | Bookmark icon, links to `/network/saved`, title="Saved posts", border pill style                        |
| **Profile button-link**     | Settings icon + "Profile" text, links to `/settings/profile`, secondary button style (white bg, border) |

### 1.2 Privacy Notice (conditional)

Shown only when `discoverable === false`.

| Element       | Details                                                                             |
| ------------- | ----------------------------------------------------------------------------------- |
| **Container** | Amber-tinted alert box (bg-amber-50, border-amber-200)                              |
| **Icon**      | ShieldOff (amber)                                                                   |
| **Title**     | "You're hidden from the community"                                                  |
| **Body**      | "Other chefs can't find or follow you."                                             |
| **Link**      | "Enable discoverability in Settings" -- links to `/settings`, underline hover style |

### 1.3 Pending Requests Badge (conditional)

Shown only when `pending.length > 0`.

| Element       | Details                                                                       |
| ------------- | ----------------------------------------------------------------------------- |
| **Container** | Blue-tinted banner (bg-blue-50, border-blue-200)                              |
| **Text**      | "{N} pending connection request(s)" -- only counts `direction === 'received'` |
| **Link**      | "View -->" -- links to `?tab=connections`                                     |

### 1.4 Tab Navigation

Four tabs rendered as `<Link>` elements inside a white card with rounded border. Active tab: amber-700 text, amber-500 bottom border, amber-50 background. Inactive: stone-500 text, stone-50 hover background.

| Tab ID        | Label       | Icon    | Query param        |
| ------------- | ----------- | ------- | ------------------ |
| `feed`        | Feed        | Rss     | `?tab=feed`        |
| `channels`    | Channels    | Hash    | `?tab=channels`    |
| `discover`    | Discover    | Compass | `?tab=discover`    |
| `connections` | Connections | Users   | `?tab=connections` |

- On small screens (`< sm`), the tab labels are hidden; only icons are shown.
- Default tab when no `?tab` param: `feed`.

---

### 1.4a Feed Tab

**Server function:** `FeedTab` -- loads posts, stories, channels, suggested chefs, trending hashtags.

Data loaded in parallel:

- `getSocialFeed({ mode: 'for_you', limit: 30 })`
- `getActiveStories()`
- `getMyChannels()`
- `listChannels()`
- `getDiscoverChefs({ limit: 5 })`
- `getTrendingHashtags({ limit: 10 })`

Renders `<SocialFeedClient>` with `showSidebar=true`. See [Section 7a](#7a-socialfeedclient) for full element breakdown.

---

### 1.4b Channels Tab

**Server function:** `ChannelsTab` -- loads all channels via `listChannels()`.

| Element              | Details                                                                             |
| -------------------- | ----------------------------------------------------------------------------------- |
| **Description text** | "Join channels to connect around specific culinary topics" (text-sm text-stone-500) |
| **Channel grid**     | `<SocialChannelGrid>` -- see [Section 7f](#7f-socialchannelcard--socialchannelgrid) |

---

### 1.4c Discover Tab

**Server function:** `DiscoverTab` -- loads trending posts, suggested chefs (20), trending hashtags (20).

#### Trending Hashtags Section

| Element           | Details                                                                                                                                                        |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Heading**       | `<h3>` -- "Trending Hashtags" (text-sm font-semibold text-stone-700)                                                                                           |
| **Hashtag pills** | Each is a `<Link>` to `?tab=feed&mode=global&tag={tag}`. Pill style: amber-50 bg, amber-700 text, rounded-full. Shows `#{tag}` and post count in smaller text. |
| **Empty state**   | "No trending topics yet" (text-sm text-stone-400)                                                                                                              |

#### Discover Chefs Section

Renders `<SocialDiscoverPanel>` with `trendingHashtags=[]` (hashtags already shown above). See [Section 7e](#7e-socialdiscoverpanel).

#### Trending Posts Section (conditional, shown when `trending.length > 0`)

| Element                  | Details                                                                                        |
| ------------------------ | ---------------------------------------------------------------------------------------------- |
| **Heading**              | `<h3>` -- "Trending Posts This Week" (text-sm font-semibold text-stone-700)                    |
| **Post items**           | Each in a bordered card showing:                                                               |
| -- Author name           | `<Link>` to `/network/{chef_id}`, font-medium text-stone-700 hover:underline                   |
| -- Channel (conditional) | "dot" separator + `<Link>` to `/network/channels/{slug}`, amber-700, shows channel icon + name |
| -- Content               | text-sm text-stone-700, line-clamp-2                                                           |
| -- Reactions count       | Fire emoji + count                                                                             |
| -- Comments count        | Speech bubble emoji + count                                                                    |

---

### 1.4d Connections Tab

**Server function:** `ConnectionsTab` -- loads friends, pending requests, contact shares.

Contains four `<Card>` sections:

#### Card 1: Find Chefs

| Element        | Details                                                                              |
| -------------- | ------------------------------------------------------------------------------------ |
| **Card title** | "Find Chefs" (text-base)                                                             |
| **Content**    | `<ChefSearch>` component -- see [Section 7 below: ChefSearch](#chefsearch-component) |

#### Card 2: Pending Requests (conditional, shown when `pending.length > 0`)

| Element        | Details                                                                                      |
| -------------- | -------------------------------------------------------------------------------------------- |
| **Card title** | "Pending Requests" (text-base)                                                               |
| **Content**    | `<PendingRequests>` component -- see [PendingRequests component](#pendingrequests-component) |

#### Card 3: Your Connections

| Element        | Details                                                                          |
| -------------- | -------------------------------------------------------------------------------- |
| **Card title** | "Your Connections ({count})" (text-base)                                         |
| **Content**    | `<FriendsList>` component -- see [FriendsList component](#friendslist-component) |

#### Card 4: Direct Contact Shares

| Element        | Details                                                                                |
| -------------- | -------------------------------------------------------------------------------------- |
| **Card title** | "Direct Contact Shares" (text-base)                                                    |
| **Content**    | `<ContactShares>` component -- see [ContactShares component](#contactshares-component) |

---

## 2. Chef Profile (`/network/[chefId]`)

| Property                  | Value                                  |
| ------------------------- | -------------------------------------- |
| **Route**                 | `/network/[chefId]`                    |
| **File**                  | `app/(chef)/network/[chefId]/page.tsx` |
| **Page title (metadata)** | `Chef Profile -- Chef Community`       |
| **Auth**                  | `requireChef()` -- chef role required  |

### 2.1 Own-Profile Redirect

If `chefId === user.entityId`, renders:

| Element     | Details                                                                                  |
| ----------- | ---------------------------------------------------------------------------------------- |
| **Message** | "This is your own profile." (text-stone-500, centered)                                   |
| **Link**    | "Edit your profile -->" -- links to `/settings/profile`, amber-700 text, hover:underline |

### 2.2 Back Link

| Element  | Details                                                                     |
| -------- | --------------------------------------------------------------------------- |
| **Link** | ArrowLeft icon + "Community" -- links to `/network`, text-sm text-stone-500 |

### 2.3 Profile Header Card

White card with rounded-2xl border and shadow.

| Element           | Details                                                                                       |
| ----------------- | --------------------------------------------------------------------------------------------- |
| **Avatar**        | 80x80px Avatar component. Fallback: amber-100 bg, amber-800 text, 2-letter initials from name |
| **Name**          | `<h1>` -- display_name or business_name (text-2xl font-bold text-stone-900)                   |
| **Business name** | Shown only when different from display name (text-stone-500 text-sm)                          |
| **Location**      | Conditional. MapPin icon + "{city}, {state}" (text-sm text-stone-400)                         |
| **Bio**           | Conditional. Multi-line text (text-stone-600 text-sm)                                         |

#### Stats Row

Three stat blocks displayed inline:

| Stat          | Format                                                                    |
| ------------- | ------------------------------------------------------------------------- |
| **Posts**     | Large number (text-lg font-bold) + "Posts" label (text-xs text-stone-400) |
| **Followers** | Large number + "Followers" label                                          |
| **Following** | Large number + "Following" label                                          |

#### Action Buttons

Rendered by `<ChefProfileActions>` -- see [Section 7i](#7i-chefprofileactions).

| Button            | Variant                                         | Label                         | Icon                 | Condition                                   |
| ----------------- | ----------------------------------------------- | ----------------------------- | -------------------- | ------------------------------------------- |
| Follow / Unfollow | primary (not following) / secondary (following) | "Follow" / "Following"        | UserPlus / UserCheck | Always shown                                |
| Connect           | secondary                                       | "Connect"                     | Handshake            | Only when not connected and no request sent |
| Connected status  | text only                                       | "Connected" or "Request sent" | Handshake (small)    | When connected or request just sent         |

### 2.4 Posts Section

White card with "Posts" heading (Grid3X3 icon + text).

| Element         | Details                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------ |
| **Heading**     | Grid3X3 icon + "Posts" (text-sm font-semibold text-stone-700)                                                |
| **Empty state** | "No public posts yet" (text-stone-400 text-sm, centered, p-8)                                                |
| **Post list**   | Each post rendered via `<SocialPostCard>` in a divider-separated list. See [Section 7b](#7b-socialpostcard). |

---

## 3. Notifications (`/network/notifications`)

| Property                  | Value                                       |
| ------------------------- | ------------------------------------------- |
| **Route**                 | `/network/notifications`                    |
| **File**                  | `app/(chef)/network/notifications/page.tsx` |
| **Page title (metadata)** | `Notifications -- Chef Community`           |
| **Auth**                  | `requireChef()`                             |

### 3.1 Back Link

| Element  | Details                                             |
| -------- | --------------------------------------------------- |
| **Link** | ArrowLeft icon + "Community" -- links to `/network` |

### 3.2 Page Header

| Element                  | Details                                                                                               |
| ------------------------ | ----------------------------------------------------------------------------------------------------- |
| **Icon**                 | Bell (amber-600)                                                                                      |
| **Heading**              | `<h1>` -- "Notifications" (text-2xl font-bold text-stone-900)                                         |
| **Unread badge**         | Conditional. Amber-500 circle with white text showing unread count                                    |
| **Mark all read button** | Conditional (shown when unread > 0). `<MarkAllReadButton>` -- see [Section 7j](#7j-markallreadbutton) |

### 3.3 Notification List

#### Empty State

| Element       | Details                                         |
| ------------- | ----------------------------------------------- |
| **Container** | White card, centered, p-12                      |
| **Icon**      | Bell (h-10 w-10 text-stone-300)                 |
| **Text**      | "No notifications yet" (text-stone-500 text-sm) |

#### Notification Items

Each notification is a row in a white card with dividers. Unread notifications have amber-50/50 background.

| Element               | Details                                                                               |
| --------------------- | ------------------------------------------------------------------------------------- |
| **Actor avatar**      | `<Link>` to `/network/{actor_id}`. 40x40 Avatar with image or amber fallback initials |
| **No-actor fallback** | 40x40 stone-100 circle with Bell icon                                                 |
| **Actor name**        | `<Link>` to `/network/{actor_id}`, font-semibold hover:underline                      |
| **Action label**      | Plain text from `NOTIF_LABELS` lookup                                                 |
| **Aggregation**       | "and {N-1} others" when `agg_count > 1` (text-stone-500)                              |
| **Timestamp**         | Relative time via `formatDistanceToNow` (text-xs text-stone-400)                      |
| **Unread dot**        | 8px amber-500 circle, only on unread notifications                                    |

#### Notification Type Labels

| Type Key              | Label                            |
| --------------------- | -------------------------------- |
| `new_follower`        | started following you            |
| `post_reaction`       | reacted to your post             |
| `post_comment`        | commented on your post           |
| `comment_reply`       | replied to your comment          |
| `comment_reaction`    | reacted to your comment          |
| `post_share`          | shared your post                 |
| `mention_post`        | mentioned you in a post          |
| `mention_comment`     | mentioned you in a comment       |
| `channel_post`        | posted in a channel you follow   |
| `story_reaction`      | reacted to your story            |
| `story_view`          | viewed your story                |
| `connection_accepted` | accepted your connection request |

---

## 4. Saved Posts (`/network/saved`)

| Property                  | Value                               |
| ------------------------- | ----------------------------------- |
| **Route**                 | `/network/saved`                    |
| **File**                  | `app/(chef)/network/saved/page.tsx` |
| **Page title (metadata)** | `Saved Posts -- Chef Community`     |
| **Auth**                  | `requireChef()`                     |

### 4.1 Back Link

| Element  | Details                                             |
| -------- | --------------------------------------------------- |
| **Link** | ArrowLeft icon + "Community" -- links to `/network` |

### 4.2 Page Header

| Element     | Details                                                     |
| ----------- | ----------------------------------------------------------- |
| **Icon**    | Bookmark (amber-600)                                        |
| **Heading** | `<h1>` -- "Saved Posts" (text-2xl font-bold text-stone-900) |

### 4.3 Post List / Empty State

#### Empty State

| Element            | Details                                                                      |
| ------------------ | ---------------------------------------------------------------------------- |
| **Container**      | White card, centered, p-12                                                   |
| **Icon**           | Bookmark (h-10 w-10 text-stone-300)                                          |
| **Primary text**   | "No saved posts yet" (text-stone-500 text-sm)                                |
| **Secondary text** | "Tap the bookmark icon on any post to save it here" (text-stone-400 text-xs) |
| **Link**           | "Browse the feed -->" -- links to `/network`, amber-700 font-medium          |

#### Posts List

Each saved post rendered via `<SocialPostCard>`. No `onDelete` handler passed. Posts displayed in a vertical stack with gap-4.

---

## 5. Channel Detail (`/network/channels/[slug]`)

| Property                  | Value                                         |
| ------------------------- | --------------------------------------------- |
| **Route**                 | `/network/channels/[slug]`                    |
| **File**                  | `app/(chef)/network/channels/[slug]/page.tsx` |
| **Page title (metadata)** | `#[slug] -- Chef Community`                   |
| **Auth**                  | `requireChef()`                               |

### 5.1 Back Link

| Element  | Details                                                             |
| -------- | ------------------------------------------------------------------- |
| **Link** | ArrowLeft icon + "All Channels" -- links to `/network?tab=channels` |

### 5.2 Channel Header

Styled card with dynamic background color derived from `channel.color`.

| Element               | Details                                                                                               |
| --------------------- | ----------------------------------------------------------------------------------------------------- |
| **Icon**              | 56x56px rounded square with channel emoji (default: speech bubble emoji), tinted background           |
| **Channel name**      | `<h1>` -- channel name (text-2xl font-bold text-stone-900)                                            |
| **Official badge**    | Conditional. "Official" pill (amber-100 bg, amber-700 text, rounded-full) when `is_official === true` |
| **Description**       | Conditional. Channel description (text-stone-500 text-sm)                                             |
| **Members count**     | Users icon + "{N} members" (text-sm text-stone-400)                                                   |
| **Posts count**       | MessageSquare icon + "{N} posts" (text-sm text-stone-400)                                             |
| **Join/Leave button** | `<ChannelJoinButton>` -- see [Section 7f](#7f-socialchannelcard--socialchannelgrid)                   |

### 5.3 Channel Feed

Renders `<SocialFeedClient>` with:

- `channelSlug` set (enables channel-scoped mode)
- `defaultChannelId` set (auto-selects channel in composer)
- `showSidebar=true`

In channel mode, the feed mode tabs (For You / Following / All Chefs) are replaced by a static "Channel Posts" label. The refresh button is still present.

---

## 6. Community Templates (`/community/templates`)

| Property                  | Value                                     |
| ------------------------- | ----------------------------------------- |
| **Route**                 | `/community/templates`                    |
| **File**                  | `app/(chef)/community/templates/page.tsx` |
| **Page title (metadata)** | `Community Templates - ChefFlow`          |
| **Auth**                  | `requireChef()`                           |

### 6.1 Page Header

| Element          | Details                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------ |
| **Heading**      | `<h1>` -- "Community Templates" (text-3xl font-bold text-stone-900)                                          |
| **Subheading**   | "Browse and import templates shared by other chefs" (text-stone-600)                                         |
| **Share button** | `<Button variant="secondary">` with Globe icon + "Share a Template" -- links to `/community/templates/share` |

### 6.2 Template Grid / Empty State

#### Empty State

| Element       | Details                                                                   |
| ------------- | ------------------------------------------------------------------------- |
| **Container** | `<Card>` with py-12, centered                                             |
| **Icon**      | Globe (h-12 w-12 text-stone-300)                                          |
| **Text**      | "No community templates yet. Be the first to share one!" (text-stone-500) |

#### Template Grid

Two-column grid on md+, single column on mobile.

Each template is a `<Card>`:

| Element            | Details                                                                                        |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| **Type badge**     | `<Badge variant="info">` showing mapped label (Menu, Recipe, Message Template, Quote Template) |
| **Cuisine badge**  | Conditional. `<Badge variant="default">` showing `cuisine_type`                                |
| **Title**          | font-semibold text-stone-900, truncated                                                        |
| **Description**    | Conditional. text-sm text-stone-500, line-clamp-2                                              |
| **Download count** | Download icon + count (text-xs text-stone-400)                                                 |
| **Import button**  | `<CommunityTemplateImport>` -- see [Section 7h](#7h-communitytemplateimport)                   |

#### Template Type Label Mapping

| Raw value | Display label    |
| --------- | ---------------- |
| `menu`    | Menu             |
| `recipe`  | Recipe           |
| `message` | Message Template |
| `quote`   | Quote Template   |

---

## 7. Shared Components Reference

### 7a. SocialFeedClient

| Property | Value                                      |
| -------- | ------------------------------------------ |
| **File** | `components/social/social-feed-client.tsx` |
| **Type** | Client component (`'use client'`)          |

#### Layout

- With `showSidebar=true`: 3-column grid on lg+ (feed = 2 cols, sidebar = 1 col). Single column on smaller screens.
- Without sidebar: simple vertical stack.

#### Sub-sections (top to bottom in main column)

1. **Story Bar** -- `<SocialStoryBar>` (see [7d](#7d-socialstorybar))
2. **Post Composer** -- `<SocialPostComposer>` (see [7c](#7c-socialpostcomposer))
3. **Feed with mode tabs**

#### Feed Mode Tabs (hidden in channel-feed mode)

| Tab value   | Label     |
| ----------- | --------- |
| `for_you`   | For You   |
| `following` | Following |
| `global`    | All Chefs |

Active tab: amber-700 text, amber-500 bottom border, amber-50/50 bg.
Inactive tab: stone-500 text, stone-50 hover.

In channel-feed mode, tabs are replaced with a static "Channel Posts" label.

| Button  | Label                  | Icon      | Action                                               |
| ------- | ---------------------- | --------- | ---------------------------------------------------- |
| Refresh | (title="Refresh feed") | RefreshCw | Reloads feed via `getSocialFeed` or `getChannelFeed` |

#### Feed Empty States

| Condition                | Message                                         |
| ------------------------ | ----------------------------------------------- |
| Channel feed, no posts   | "No posts in this channel yet -- be the first!" |
| Following mode, no posts | "Follow some chefs to see their posts here"     |
| Default, no posts        | "No posts yet -- be the first!"                 |

#### Load More Button (conditional, shown when `hasMore` is true)

| Button    | Label                            | Style                                         |
| --------- | -------------------------------- | --------------------------------------------- |
| Load more | "Load more posts" / "Loading..." | Full-width, amber-700 text, amber-50 hover bg |

#### Sidebar

Renders `<SocialDiscoverPanel>` (see [7e](#7e-socialdiscoverpanel)).

---

### 7b. SocialPostCard

| Property | Value                                    |
| -------- | ---------------------------------------- |
| **File** | `components/social/social-post-card.tsx` |
| **Type** | Client component (`'use client'`)        |

#### Post Header

| Element              | Details                                                                                   |
| -------------------- | ----------------------------------------------------------------------------------------- |
| **Author avatar**    | `<Link>` to `/network/{chef_id}`, renders `<ChefAvatar>` (40px, amber fallback)           |
| **Author name**      | `<Link>` to `/network/{chef_id}`, font-semibold text-stone-900 text-sm                    |
| **Timestamp**        | Relative time via `formatDistanceToNow` (text-xs text-stone-400)                          |
| **Edited indicator** | Conditional. "dot edited" (text-xs text-stone-400) when `is_edited === true`              |
| **Location tag**     | Conditional. MapPin icon + location text (text-xs text-stone-400)                         |
| **Channel link**     | Conditional. Channel icon + name, links to `/network/channels/{slug}` (text-xs amber-700) |

#### Post Menu (own posts only, `is_mine === true`)

| Element           | Details                                                                                               |
| ----------------- | ----------------------------------------------------------------------------------------------------- |
| **Menu toggle**   | MoreHorizontal icon button (p-1.5, stone-400, hover:bg-stone-100)                                     |
| **Dropdown item** | "Delete post" -- red-600 text, red-50 hover. Triggers `confirm('Delete this post?')` before deletion. |

#### Post Content

| Element           | Details                                                                                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Repost banner** | Conditional (post_type === 'share'). Repeat2 icon + "Reposted" (text-xs text-stone-400)                                                                                                          |
| **Text content**  | `<p>` with whitespace-pre-wrap, break-words, text-sm text-stone-800                                                                                                                              |
| **Hashtags**      | Each tag is a `<Link>` to `/network?tab=feed&mode=global&tag={tag}`, text-xs amber-700 font-medium                                                                                               |
| **Media grid**    | Conditional. Renders images (via Next.js `<Image>`) and videos. Grid layout varies by count: 1=single col, 2=2 cols, 3=3 cols, 4+=2 cols. Aspect: single media = video ratio, multiple = square. |
| **Poll**          | Conditional. Bordered card showing `poll_question` (font-medium) and options with vote counts                                                                                                    |

#### Stats Row (conditional, shown when any count > 0)

| Stat      | Format            |
| --------- | ----------------- |
| Reactions | "{N} reaction(s)" |
| Comments  | "{N} comment(s)"  |
| Saves     | "{N} saves"       |
| Shares    | "{N} shares"      |

#### Action Bar

Four action buttons inline:

| Button      | Label (default)    | Label (active)         | Icon                       | Behavior                                           |
| ----------- | ------------------ | ---------------------- | -------------------------- | -------------------------------------------------- |
| **React**   | "React" or count   | Reaction emoji + count | Emoji (default: thumbs up) | Opens reaction picker popup on click               |
| **Comment** | "Comment" or count | Same                   | MessageCircle              | Toggles comments section                           |
| **Save**    | "Save"             | "Saved"                | Bookmark / BookmarkCheck   | Toggles bookmark state, amber highlight when saved |
| **Share**   | "Share"            | "Copied!" (2s)         | Share2 / Check             | Copies post URL to clipboard                       |

#### Reaction Picker (popup)

Appears above the React button. Six reaction types:

| Type         | Emoji                | Label      |
| ------------ | -------------------- | ---------- |
| `like`       | thumbs up            | Like       |
| `fire`       | fire                 | Fire       |
| `clap`       | clapping hands       | Clap       |
| `wow`        | face with open mouth | Wow        |
| `hungry`     | yummy face           | Hungry     |
| `insightful` | lightbulb            | Insightful |

Selected reaction: amber-50 bg, amber-300 ring, scaled up. Hover: scale-125.

#### Comments Section (expandable)

Toggle button: MessageCircle icon + count or "Comment" text.

When open:

| Element           | Details                                                                                                                                            |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Comment input** | Textarea (placeholder: "Add a comment...") + "Post" button (variant=primary). Keyboard shortcut: Cmd/Ctrl+Enter to submit. Max length: 2000 chars. |
| **Loading state** | "Loading comments..." centered                                                                                                                     |
| **Empty state**   | "No comments yet" centered                                                                                                                         |
| **Comment list**  | Each comment rendered as `<CommentRow>`                                                                                                            |

#### CommentRow (single comment)

| Element            | Details                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| **Author avatar**  | `<Link>` to `/network/{chef_id}`, 28px Avatar, stone-200 fallback                                             |
| **Author name**    | `<Link>` to `/network/{chef_id}`, font-semibold hover:underline                                               |
| **Comment text**   | text-sm text-stone-700, whitespace-pre-wrap. Deleted comments show italic "Comment removed"                   |
| **Timestamp**      | Relative time (text-xs text-stone-400)                                                                        |
| **Reply button**   | "Reply" (text-xs font-medium text-stone-500) -- toggles inline reply input                                    |
| **Like button**    | "Like" or thumbs up + count (text-xs font-medium). Amber-600 when liked.                                      |
| **Replies toggle** | Conditional (when replies exist). "View {N} reply/replies" / "Hide" with ChevronDown/Up icon. Amber-700 text. |
| **Reply input**    | Same as comment input but with placeholder "Write a reply..." and `parentId` set                              |
| **Nested replies** | Rendered recursively with left border indent (pl-2, border-l-2 border-stone-100)                              |

---

### 7c. SocialPostComposer

| Property | Value                                        |
| -------- | -------------------------------------------- |
| **File** | `components/social/social-post-composer.tsx` |
| **Type** | Client component (`'use client'`)            |

#### Layout

White card with border and shadow (rounded-2xl).

#### Top Row

| Element           | Details                                                                                                                                 |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Author avatar** | 40x40 Avatar. Amber fallback with initials.                                                                                             |
| **Textarea**      | Placeholder: "Share something with the chef community...", 3 rows, max 5000 chars. Stone-50 bg, stone-200 border, amber-400 focus ring. |

#### Media Previews (conditional)

Shown when media items have been uploaded. 80x80px thumbnails with a remove button (X icon, black/60 overlay).

#### Location Input (conditional)

Shown when location toggle is active.

| Element   | Details                                                 |
| --------- | ------------------------------------------------------- |
| **Icon**  | MapPin (stone-400)                                      |
| **Input** | type=text, placeholder="Add location...", max 100 chars |

#### Channel Selector (conditional, shown when `channels.length > 0`)

| Element    | Details                                                                            |
| ---------- | ---------------------------------------------------------------------------------- |
| **Icon**   | Hash (stone-400)                                                                   |
| **Select** | Dropdown with "No channel" default + all joined channels listed as "{icon} {name}" |

#### Error Display

Red text shown below channel selector when an error occurs.

#### Bottom Toolbar

| Element                 | Details                                                                                                                                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Media upload button** | ImagePlus icon, title="Add photo or video". Disabled when uploading or >= 10 media items. Hidden file input accepts: `image/*, video/mp4, video/quicktime, video/webm`. Multiple files allowed. |
| **Location toggle**     | MapPin icon, title="Add location". Amber highlight when active.                                                                                                                                 |
| **Visibility picker**   | Shows current selection (icon + label + ChevronDown). Opens dropdown popup above button.                                                                                                        |

#### Visibility Options

| Value         | Label       | Icon  |
| ------------- | ----------- | ----- |
| `public`      | Public      | Globe |
| `followers`   | Followers   | Users |
| `connections` | Connections | Users |
| `private`     | Only Me     | Lock  |

Active option: amber-700 font-medium. Default: `public`.

| Element         | Details                                                                                                                       |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Post button** | `<Button variant="primary">`. Label: "Post" / "Posting..." / "Uploading...". Disabled when no content, pending, or uploading. |

---

### 7d. SocialStoryBar

| Property | Value                                    |
| -------- | ---------------------------------------- |
| **File** | `components/social/social-story-bar.tsx` |
| **Type** | Client component (`'use client'`)        |

#### Story Bar Layout

White card with horizontal scroll (overflow-x-auto, scrollbar-hide).

#### Elements

| Element              | Details                                                                                                                                                                                                                      |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Add Story button** | 48px dashed circle (border-stone-300, hover border-amber-400). Plus icon inside. Label "Add story" below. Hidden file input accepts `image/*, video/mp4, video/quicktime`. Uploads via `uploadPostMedia` then `createStory`. |
| **Story avatars**    | Each `<StoryAvatar>`: 48px avatar in a gradient ring. Unseen stories: amber-to-orange-to-red gradient ring. Seen stories: stone-200 ring. First name shown below (truncated to 56px max width).                              |

#### Empty State (when `groups.length === 0`)

Shows the Add Story button + italic text: "No stories yet -- be the first to post one!" (text-sm text-stone-400).

#### Story Viewer (full-screen overlay)

Triggered when clicking a story avatar. Fixed overlay, z-50, black background.

| Element              | Details                                                                                                                                                                                                                    |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Progress bars**    | Horizontal bars at top, one per story in group. White/30 bg track, white fill. Current story animates. Completed stories: 100%. Future stories: 0%.                                                                        |
| **Author header**    | 32px avatar (white border) + author name (white, text-sm) + relative timestamp (white/70, text-xs)                                                                                                                         |
| **Close button**     | X icon, white/80 hover:white, top-right                                                                                                                                                                                    |
| **Media**            | Full-screen image or auto-playing muted video (`object-contain`)                                                                                                                                                           |
| **Caption**          | Conditional. Centered text over black/20 overlay at bottom                                                                                                                                                                 |
| **Navigation**       | Left 25% area = go back, Right 25% area = advance. Invisible tap targets.                                                                                                                                                  |
| **Reaction bar**     | Bottom overlay. Default: "React to story..." text button. When expanded, shows 7 emoji buttons: yummy face, fire, clapping hands, face with open mouth, lightbulb, red heart, laughing face. Close (X) button to collapse. |
| **Group nav arrows** | ChevronLeft (left side) and ChevronRight (right side) to navigate between story groups. Only shown when prev/next group exists.                                                                                            |

#### Story Auto-Advance

- Image stories: 5 seconds duration
- Video stories: `duration_seconds` or 15 seconds default
- Progress bar animates in 100ms steps
- Auto-advances to next story, then next group, then closes viewer

---

### 7e. SocialDiscoverPanel

| Property | Value                                         |
| -------- | --------------------------------------------- |
| **File** | `components/social/social-discover-panel.tsx` |
| **Type** | Client component (`'use client'`)             |

#### Suggested Chefs Section (conditional, shown when `suggestedChefs.length > 0`)

| Element           | Details                                                                                                                                                              |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Heading**       | Users icon (amber-600) + "Chefs to Follow" (text-sm font-semibold text-stone-800)                                                                                    |
| **Chef items**    | Each `<DiscoverChefCard>`: 40px avatar (amber fallback), name as link to `/network/{id}`, location text, Follow/Following button (primary/secondary variant toggle). |
| **See more link** | "See more chefs -->" -- links to `/network?tab=discover` (text-xs amber-700)                                                                                         |

#### Trending Hashtags Section (conditional, shown when `trendingHashtags.length > 0`)

| Element          | Details                                                                                                                                                  |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Heading**      | TrendingUp icon (amber-600) + "Trending This Week" (text-sm font-semibold text-stone-800)                                                                |
| **Hashtag list** | Numbered list (1-10). Each row: rank number (text-xs text-stone-400), `#{tag}` (text-sm font-medium text-amber-700), post count (text-xs text-stone-400) |

---

### 7f. SocialChannelCard / SocialChannelGrid

| Property | Value                                       |
| -------- | ------------------------------------------- |
| **File** | `components/social/social-channel-card.tsx` |
| **Type** | Client component (`'use client'`)           |

#### ChannelJoinButton (standalone)

| Button state | Variant   | Label          |
| ------------ | --------- | -------------- |
| Not a member | primary   | "Join Channel" |
| Is a member  | secondary | "Joined"       |

Toggles between `joinChannel()` and `leaveChannel()` server actions.

#### SocialChannelCard

| Element               | Details                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------- |
| **Container**         | White card, rounded-2xl, border with optional colored left border (3px solid channel.color)             |
| **Icon**              | 48px rounded square with channel emoji (or default speech bubble), tinted background from channel.color |
| **Channel name**      | `<Link>` to `/network/channels/{slug}`, font-semibold text-sm hover:underline                           |
| **Official badge**    | Conditional. "Official" pill (amber-100/amber-700, rounded-full)                                        |
| **Description**       | Conditional. text-xs text-stone-500, line-clamp-2                                                       |
| **Members**           | Users icon + "{N} members" (text-xs text-stone-400)                                                     |
| **Posts**             | MessageSquare icon + "{N} posts" (text-xs text-stone-400)                                               |
| **Join/Leave button** | primary variant = "Join", secondary variant = "Joined" (text-xs). Optimistically updates member count.  |

#### SocialChannelGrid

Groups channels by `category` field. Each category gets:

| Element              | Details                                                      |
| -------------------- | ------------------------------------------------------------ |
| **Category heading** | Uppercase tracking-wide text-sm font-semibold text-stone-500 |
| **Channel cards**    | Single-column grid of `<SocialChannelCard>`                  |

Category label mapping:

| Category key | Display label               |
| ------------ | --------------------------- |
| `cuisine`    | plate emoji Cuisine         |
| `technique`  | book emoji Technique        |
| `business`   | briefcase emoji Business    |
| `tools`      | wrench emoji Tools          |
| `community`  | handshake emoji Community   |
| `general`    | speech bubble emoji General |

---

### 7g. ChefCard

| Property | Value                              |
| -------- | ---------------------------------- |
| **File** | `components/network/chef-card.tsx` |
| **Type** | Client component (`'use client'`)  |

Reusable card for displaying a chef in search results, friend lists, and pending requests.

| Element           | Details                                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Avatar**        | 48px circle. If `profileImageUrl` exists: `<img>`. Otherwise: brand-100 bg circle with 2-letter initials (brand-700 text) |
| **Display name**  | text-sm font-semibold text-stone-900, truncated                                                                           |
| **Business name** | Conditional (shown when different from display name). text-xs text-stone-500                                              |
| **Location**      | Conditional. MapPin icon + "{city}, {state}" (text-xs text-stone-500)                                                     |
| **Bio**           | Conditional. text-xs text-stone-500, line-clamp-2                                                                         |
| **Actions slot**  | Arbitrary `ReactNode` rendered in a flex container. Used by parent components to render context-specific buttons/badges.  |

---

### 7h. CommunityTemplateImport

| Property | Value                                                |
| -------- | ---------------------------------------------------- |
| **File** | `components/community/community-template-import.tsx` |
| **Type** | Client component (`'use client'`)                    |

| Button state | Variant   | Size | Label                 | Icon     |
| ------------ | --------- | ---- | --------------------- | -------- |
| Not imported | primary   | sm   | "Import"              | Download |
| Importing    | primary   | sm   | (loading spinner)     | --       |
| Imported     | secondary | sm   | "Imported" (disabled) | Check    |

On click: shows toast `"{title}" template ready to use!`. Currently a placeholder implementation (no actual entity creation).

---

### 7i. ChefProfileActions

| Property | Value                                                  |
| -------- | ------------------------------------------------------ |
| **File** | `app/(chef)/network/[chefId]/chef-profile-actions.tsx` |
| **Type** | Client component (`'use client'`)                      |

Vertical button stack (flex-col gap-2).

| Element            | Variant                                         | Label                        | Icon                 | Condition                              |
| ------------------ | ----------------------------------------------- | ---------------------------- | -------------------- | -------------------------------------- | --- | ------------ |
| **Follow button**  | primary (not following) / secondary (following) | "Follow" / "Following"       | UserPlus / UserCheck | Always shown                           |
| **Connect button** | secondary                                       | "Connect"                    | Handshake            | Only when `!connected && !requestSent` |
| **Status text**    | -- (text only)                                  | "Connected" / "Request sent" | Handshake (small)    | When `connected                        |     | requestSent` |

---

### 7j. MarkAllReadButton

| Property | Value                                                       |
| -------- | ----------------------------------------------------------- |
| **File** | `app/(chef)/network/notifications/mark-all-read-button.tsx` |
| **Type** | Client component (`'use client'`)                           |

| Button        | Variant   | Label                                          | Action                                |
| ------------- | --------- | ---------------------------------------------- | ------------------------------------- |
| Mark all read | secondary | "Mark all read" / "Marking..." (while pending) | Calls `markSocialNotificationsRead()` |

---

## Connection-Tab Sub-Components (inline in `/network`)

### ChefSearch Component

| Property | Value                                |
| -------- | ------------------------------------ |
| **File** | `app/(chef)/network/chef-search.tsx` |
| **Type** | Client component (`'use client'`)    |

#### Search Input

| Element   | Details                                                                                   |
| --------- | ----------------------------------------------------------------------------------------- |
| **Icon**  | Search (stone-400, positioned inside input)                                               |
| **Input** | type=search, placeholder="Search by business name or display name...", debounced at 300ms |

#### States

| Condition                | Display                                                                          |
| ------------------------ | -------------------------------------------------------------------------------- |
| Searching                | "Searching..." centered                                                          |
| Searched, no results     | 'No chefs found matching "{query}". They may have network discovery turned off.' |
| Not searched, no results | "No discoverable chefs yet."                                                     |
| Has results              | List of `<ChefCard>` with context-specific action buttons                        |

#### Action Buttons per Search Result

| Connection status    | Action rendered                                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------------- |
| `none` or `declined` | `<Button variant="primary" size="sm">` -- "Connect"                                                           |
| `pending_sent`       | `<Badge variant="default">` -- "Request Sent"                                                                 |
| `pending_received`   | Two buttons: `<Button variant="primary" size="sm">` "Accept" + `<Button variant="ghost" size="sm">` "Decline" |
| `accepted`           | `<Badge variant="success">` -- "Connected"                                                                    |

#### Error Display

Red alert box when action fails (bg-red-50, border-red-200).

#### Results Count

"Showing {N} result(s)" (text-xs text-stone-400, centered).

---

### PendingRequests Component

| Property | Value                                     |
| -------- | ----------------------------------------- |
| **File** | `app/(chef)/network/pending-requests.tsx` |
| **Type** | Client component (`'use client'`)         |

Returns `null` when `requests.length === 0`.

#### Received Requests Section

| Element     | Details                                                                                                                     |
| ----------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Heading** | `<h4>` -- "Received ({count})" (text-sm font-medium text-stone-700)                                                         |
| **Items**   | Each as `<ChefCard>` with bio showing `request_message`. Actions: Accept button (primary, sm) + Decline button (ghost, sm). |

#### Sent Requests Section

| Element     | Details                                                                         |
| ----------- | ------------------------------------------------------------------------------- |
| **Heading** | `<h4>` -- "Sent ({count})" (text-sm font-medium text-stone-700)                 |
| **Items**   | Each as `<ChefCard>` with no bio. Action: `<Badge variant="default">` "Pending" |

#### Error Display

Red alert box (bg-red-50, border-red-200).

---

### FriendsList Component

| Property | Value                                 |
| -------- | ------------------------------------- |
| **File** | `app/(chef)/network/friends-list.tsx` |
| **Type** | Client component (`'use client'`)     |

#### Empty State

"No connections yet. Search for other chefs above to start connecting." (centered, py-6).

#### Filter Input (conditional, shown when `friends.length > 3`)

| Element   | Details                                                                                               |
| --------- | ----------------------------------------------------------------------------------------------------- |
| **Icon**  | Search (stone-400)                                                                                    |
| **Input** | type=search, placeholder="Filter connections...", filters by display name, business name, city, state |

#### Friends List

Each friend as `<ChefCard>` with remove action.

| State                       | Action rendered                                                           |
| --------------------------- | ------------------------------------------------------------------------- |
| Default                     | Ghost button with UserMinus icon (stone-400), title="Remove connection"   |
| Confirm state (first click) | "Sure?" text + "Remove" button (danger, sm) + "Cancel" button (ghost, sm) |

#### Footer Count

"{filtered} of {total} connection(s)" (text-sm text-stone-500, centered).

#### Error Display

Red alert box (bg-red-50, border-red-200).

---

### ContactShares Component

| Property | Value                                   |
| -------- | --------------------------------------- |
| **File** | `app/(chef)/network/contact-shares.tsx` |
| **Type** | Client component (`'use client'`)       |

#### Empty State (when `connections.length === 0`)

"Connect with at least one chef to share contacts directly." (centered, py-6).

#### Share A Contact Form

Bordered card with form fields in a 2-column grid (1 column on mobile).

| Field           | Label             | Type              | Placeholder                      | Conditions                                      |
| --------------- | ----------------- | ----------------- | -------------------------------- | ----------------------------------------------- |
| Request Type    | "Request Type"    | `<select>`        | --                               | Options: Date Help, Inquiry Help, Full Handover |
| Send To         | "Send To"         | `<select>`        | --                               | Populated from connections list                 |
| Contact Name    | "Contact Name"    | text input        | "Client or lead name"            | Required                                        |
| Inquiry ID      | "Inquiry ID"      | text input        | "Optional UUID"                  | Only shown when helpType = `inquiry_help`       |
| Inquiry Summary | "Inquiry Summary" | text input        | "Short summary if no inquiry ID" | Only shown when helpType = `inquiry_help`       |
| Phone           | "Phone"           | text input        | "Optional"                       | Always shown                                    |
| Email           | "Email"           | email input       | "Optional"                       | Always shown                                    |
| Event Date      | "Event Date"      | date input        | --                               | Always shown                                    |
| Location        | "Location"        | text input        | "City / area"                    | Always shown                                    |
| Details         | "Details"         | textarea (4 rows) | Context-dependent                | Required. Placeholder changes by help type.     |

**Details placeholder by type:**

- `full_handover`: "Full handover notes: client expectations, menu scope, budget, constraints, and all context needed to take over."
- Other types: "Event type, guest count, budget, dietary needs, timing, and what you need from this chef."

| Button | Label           | Size |
| ------ | --------------- | ---- |
| Submit | "Share Contact" | sm   |

#### Validation Errors

Inline error conditions:

- "Recipient, contact name, and details are required"
- "Calendar date is required for date help requests"
- "Add an inquiry ID or inquiry summary for inquiry help requests"

#### Incoming / Outgoing Shares (2-column grid on lg+)

**Incoming Shares Section**

| Element         | Details                                                            |
| --------------- | ------------------------------------------------------------------ |
| **Heading**     | `<h4>` -- "Incoming Shares" (text-sm font-semibold text-stone-900) |
| **Empty state** | "No incoming shares yet."                                          |
| **Items**       | `<ContactShareItem>` cards with response controls                  |

**Outgoing Shares Section**

| Element         | Details                                                            |
| --------------- | ------------------------------------------------------------------ |
| **Heading**     | `<h4>` -- "Outgoing Shares" (text-sm font-semibold text-stone-900) |
| **Empty state** | "No outgoing shares yet."                                          |
| **Items**       | `<ContactShareItem>` cards in readonly mode (no response controls) |

#### ContactShareItem

| Element             | Details                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------ |
| **Contact name**    | font-medium text-stone-900                                                                 |
| **Direction label** | "From {name}" or "To {name}" (text-xs text-stone-500)                                      |
| **Status badge**    | `<StatusBadge>`: Open (blue), Accepted (emerald), Passed (amber) -- all rounded-full pills |
| **Contact details** | Email, Phone, Location, Event Date (each conditional, text-xs text-stone-600)              |
| **Details text**    | Full text, whitespace-pre-wrap (text-sm text-stone-700)                                    |
| **Response note**   | Conditional. "Response note: {text}" (text-xs text-stone-500)                              |

When incoming and status is `open`:

| Element               | Details                                                   |
| --------------------- | --------------------------------------------------------- |
| **Response textarea** | 2 rows, placeholder="Optional response note"              |
| **Accept button**     | `<Button size="sm">` -- "I Can Take It"                   |
| **Pass button**       | `<Button size="sm" variant="ghost">` -- "I Can't Take It" |

---

## Keyboard Shortcuts

| Location                       | Shortcut                  | Action               |
| ------------------------------ | ------------------------- | -------------------- |
| Comment input (SocialPostCard) | Cmd/Ctrl + Enter          | Submit comment       |
| Story viewer                   | Click left 25% of screen  | Go to previous story |
| Story viewer                   | Click right 25% of screen | Go to next story     |
| Story viewer                   | Click outside viewer      | Close viewer         |

---

## All Navigation Links Summary

| From                       | Label                                    | Destination                               |
| -------------------------- | ---------------------------------------- | ----------------------------------------- |
| Network hub header         | Bell icon                                | `/network/notifications`                  |
| Network hub header         | Bookmark icon                            | `/network/saved`                          |
| Network hub header         | "Profile" button                         | `/settings/profile`                       |
| Privacy notice             | "Enable discoverability in Settings"     | `/settings`                               |
| Pending requests banner    | "View -->"                               | `?tab=connections`                        |
| Tab nav                    | Feed / Channels / Discover / Connections | `?tab={id}`                               |
| Discover tab hashtag pills | `#{tag}`                                 | `?tab=feed&mode=global&tag={tag}`         |
| Trending post author       | Author name                              | `/network/{chef_id}`                      |
| Trending post channel      | Channel name                             | `/network/channels/{slug}`                |
| Post card author           | Author name / avatar                     | `/network/{chef_id}`                      |
| Post card channel          | Channel icon + name                      | `/network/channels/{slug}`                |
| Post card hashtags         | `#{tag}`                                 | `/network?tab=feed&mode=global&tag={tag}` |
| Discover panel             | "See more chefs -->"                     | `/network?tab=discover`                   |
| Discover panel chef        | Chef name / avatar                       | `/network/{id}`                           |
| Channel card               | Channel name                             | `/network/channels/{slug}`                |
| Chef profile back link     | "Community"                              | `/network`                                |
| Own-profile redirect       | "Edit your profile -->"                  | `/settings/profile`                       |
| Notifications back link    | "Community"                              | `/network`                                |
| Notification actor         | Actor name / avatar                      | `/network/{actor_id}`                     |
| Saved posts back link      | "Community"                              | `/network`                                |
| Saved posts empty state    | "Browse the feed -->"                    | `/network`                                |
| Channel detail back link   | "All Channels"                           | `/network?tab=channels`                   |
| Community templates header | "Share a Template"                       | `/community/templates/share`              |
| Comment author             | Author name / avatar                     | `/network/{chef_id}`                      |
