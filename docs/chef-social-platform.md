# Chef Social Platform

## Overview

ChefFlow now includes a full-featured social media platform exclusively for chefs — a professional community space inspired by the best of Instagram, Facebook, Reddit, TikTok, and YouTube, but purpose-built for the private chef experience.

The social layer lives at `/network` (the existing Network section) and is completely non-invasive — it never appears while chefs are working on their business operations. It is entirely opt-in: chefs must enable network discoverability to participate, and by default they are discoverable (opt-out to hide).

---

## What's New vs. What Existed

### Already Existed (kept intact)
- `chef_connections` — bilateral friend requests (kept, still used for contact sharing)
- `chef_network_posts` — original lightweight text posts (kept for backwards compat)
- `chef_network_contact_shares` — referral sharing between connections
- `chef_network_feature_preferences` — per-feature opt-in
- Network discoverability toggle

### New Tables (migration 20260304000005)
| Table | Purpose |
|---|---|
| `chef_social_posts` | Rich posts — text, photos, video links, polls, reposts |
| `chef_follows` | Asymmetric follows (like Instagram) |
| `chef_post_reactions` | Reactions: like, fire, clap, wow, hungry, insightful |
| `chef_post_comments` | Threaded comments with replies |
| `chef_comment_reactions` | Reactions on comments |
| `chef_post_saves` | Bookmarks with named collections |
| `chef_social_channels` | Topic spaces (like subreddits) — official + chef-created |
| `chef_channel_memberships` | Per-chef channel subscriptions |
| `chef_stories` | 24-hour ephemeral content |
| `chef_story_views` | Story view tracking |
| `chef_story_reactions` | Quick emoji reactions to stories |
| `chef_social_notifications` | Social activity notifications (separate from ops) |
| `chef_post_mentions` | @mention tracking in posts and comments |
| `chef_social_hashtags` | Hashtag registry with post counts |
| `chef_post_hashtags` | Post ↔ hashtag junction |

---

## Social Features

### Feed
- **For You** — algorithmic blend of followed chefs + connections + trending content
- **Following** — posts from chefs you follow, chronological
- **Global** — public posts from all discoverable chefs

### Posts
- Text (up to 5,000 chars)
- Photo (upload to `chef-social-media` bucket)
- Video links
- Polls (up to 4 options, expiry date)
- Reposts with comment
- Visibility: `public`, `followers`, `connections`, `private`
- Optional channel association
- Hashtags auto-extracted (e.g., `#pastry #sousVide`)
- Location tag

### Reactions (on posts and comments)
| Reaction | Emoji | Meaning |
|---|---|---|
| like | 👍 | Default positive |
| fire | 🔥 | This is amazing |
| clap | 👏 | Well done |
| wow | 😮 | Impressive |
| hungry | 😋 | Makes me hungry |
| insightful | 💡 | Learned something |

### Comments
- Full text (up to 2,000 chars)
- Threaded replies (one level deep for clarity)
- Reactions on individual comments
- Soft delete (shows "comment removed")
- Edit tracking

### Stories
- 24-hour ephemeral images/videos
- Caption (up to 200 chars)
- Duration 1–60 seconds (for video)
- Quick emoji reactions
- View count visible to story author
- Horizontal story bar above feed showing connections/follows with unseen stories

### Follows vs. Connections
| Feature | Connections (existing) | Follows (new) |
|---|---|---|
| Direction | Bilateral (both must agree) | Asymmetric (one-way, no approval needed) |
| Purpose | Contact sharing, trust layer | Feed subscription, discovery |
| Gated by | Discoverability | Discoverability |

### Topic Channels (12 Official + Chef-Created)
**Official channels seeded at migration:**
- 🥐 Pastry & Baking
- 🥩 Savory & Mains
- 🌱 Plant-Based
- 🛒 Sourcing & Vendors
- 💼 Business & Growth
- 🔪 Knives & Equipment
- 📚 Technique Deep-Dive
- 👋 New to Private Chef
- 🏆 Chef Wins
- 🤝 Collaboration & Pop-Ups
- 🌍 International Cuisine
- 🍂 Seasonal & Local

Chefs can:
- Join/leave channels
- Post to a channel
- Enable/disable channel notifications
- Create custom channels (private or public)

### Discovery / Explore
- Trending posts (by reactions in last 7 days)
- Trending hashtags
- Suggested chefs to follow (based on shared connections/specialty)
- New chefs who recently joined the network
- Filter by specialty, city, channel activity

### Chef Profile Pages (within network)
Rich `/network/[chefId]` page showing:
- Bio, specialty, location
- Post grid (Instagram-style)
- Follower/following/connection counts
- Pinned posts
- Active channels
- Event count (public: "47 private dinners")
- Follow / Connect / Message buttons

### Social Notifications
Separate from operational notifications. Triggers:
- New follower
- Post reaction (aggregated: "👏 3 chefs reacted to your post")
- Post comment
- Comment reply
- Comment reaction
- Post shared
- @mention in post or comment
- New post in a channel you follow
- Story reaction

### Saves / Collections
- Bookmark any post
- Organize into named collections (default: "Saved")
- View saved posts at `/network/saved`

---

## Architecture

### Server Actions (`lib/social/chef-social-actions.ts`)
All business logic in server actions with `'use server'`, using admin client for cross-tenant queries.

Key action groups:
- **Posts**: createPost, updatePost, deletePost, getPost, getMyFeed, getProfilePosts, getTrending
- **Reactions**: togglePostReaction, toggleCommentReaction
- **Comments**: createComment, editComment, deleteComment, getComments
- **Follows**: followChef, unfollowChef, getFollowers, getFollowing, getFollowCounts
- **Discovery**: getDiscoverFeed, getTrendingChefs, getTrendingHashtags, searchPosts
- **Channels**: listChannels, joinChannel, leaveChannel, getChannelFeed, createChannel
- **Stories**: createStory, getActiveStories, markStoryViewed, reactToStory, deleteStory
- **Saves**: savePost, unsavePost, getSavedPosts
- **Notifications**: getSocialNotifications, markAllRead, markRead
- **Profile**: getPublicChefSocialProfile

### Pages (under `/network/`)
```
/network                    → Redesigned hub (tabs: Feed | Stories | Channels | Discover)
/network/feed               → Full feed page
/network/channels           → Channel directory
/network/channels/[slug]    → Channel feed
/network/discover           → Discover/explore page
/network/saved              → Saved posts
/network/notifications      → Social notifications
/network/[chefId]           → Chef social profile
/network/connections        → Existing connections (contacts/referrals)
```

### Storage
- **`chef-social-media`** bucket (new) — post photos/videos (50MB max, images + video)
- **`chef-profile-images`** bucket (existing) — profile avatars

### Privacy Model
| Content | Who can see |
|---|---|
| `public` posts | All discoverable chefs |
| `followers` posts | Chefs who follow you |
| `connections` posts | Accepted connections only |
| `private` posts | Only you |
| Stories | Followers + connections |
| Channel posts | Channel members (public channels: all discoverable chefs) |

---

## Navigation

The existing `Network & Social` entry in the nav grows into a proper social hub. Within the `/network` page, a sticky tab bar provides:
- **Feed** — main social feed
- **Channels** — topic channels directory
- **Discover** — explore new chefs and trending content
- **Connections** — existing friend/referral system (unchanged)

---

## What This Is NOT

This is a **chef-to-chef internal community**, not a public-facing platform. It is separate from:
- The **Social Queue** (`/social`) — the marketing content planner for Instagram/TikTok/etc.
- The **client portal** — clients cannot see this at all
- The **public chef profile** (`/chef/[slug]`) — this is the booking page for clients

---

## Migration Reference
- `20260304000005_chef_social_platform.sql` — all new tables, triggers, indexes, RLS, seed data
- `20260304000006_chef_social_media_bucket.sql` — storage bucket setup
