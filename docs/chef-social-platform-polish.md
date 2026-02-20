# Chef Social Platform — Polish Pass

**Files changed:** 3

---

## What Was Broken

After the full platform build and privacy bug fixes, 5 user-facing interactions were silently broken — they looked interactive but did nothing.

---

### 1. Share Button — No-Op

**File:** `components/social/social-post-card.tsx`

**Problem:** The Share button was a plain `<button>` with no `onClick`. Clicking did nothing.

**Fix:** Copies a direct post link (`/network?post=<id>`) to the clipboard using the Clipboard API. Button swaps to a green checkmark + "Copied!" for 2 seconds, then resets. No external library needed.

---

### 2. `/network/discover` — 404

**File:** `components/social/social-discover-panel.tsx`

**Problem:** "See more chefs →" linked to `/network/discover`, which doesn't exist as a route. Hard 404.

**Fix:** Changed href to `/network?tab=discover`, which routes to the Discover tab on the Community page — the correct destination.

---

### 3. Story Video Timer — NaN Freeze

**File:** `components/social/social-story-bar.tsx`

**Problem:** `story.duration_seconds * 1000` — `duration_seconds` is a nullable column. When null, the result is `NaN`. The progress step becomes `NaN`, so `setInterval` fires but progress never increments and the story freezes indefinitely.

**Fix:** `(story.duration_seconds ?? 15) * 1000` — falls back to 15 seconds, which is a sensible default for a video story with unknown duration.

---

### 4. Hashtags — Dead `cursor-pointer` Spans

**File:** `components/social/social-post-card.tsx`

**Problem:** Hashtags were rendered as `<span>` elements styled to look clickable (underline + pointer cursor) but had no navigation.

**Fix:** Changed to `<Link href="/network?tab=feed&mode=global&tag=<tag>">`. Links to the All Chefs global feed scoped to that tag. The `tag` query param is in place for future server-side filtering — currently the feed just opens; hashtag filtering can be wired to the feed query when needed without another component change.

---

### 5. Comment Reactions — Display-Only Counter

**File:** `components/social/social-post-card.tsx`

**Problem:** Comments showed a reaction count (`👍 3`) but there was no way to actually react. `toggleCommentReaction` existed in the server actions but was never called.

**Fix:**

- Added local `reacted` and `reactionCount` state to `CommentRow`
- Added `handleCommentReaction()` that optimistically toggles state and calls `toggleCommentReaction({ commentId, reaction: 'like' })` via `startTransition`
- Replaced the static count span with a clickable Like button that shows `👍 N` when reacted, or just `Like` when not
- Added `type="button"` to both the Reply and Like buttons (lint hint)

---

---

## Second Pass (Audit)

After the first polish pass, a full audit of every remaining file found four more issues:

### 6. `getProfilePosts` / `getTrendingPosts` / `getSavedPosts` — Channel Metadata Blank

**File:** `lib/social/chef-social-actions.ts`

**Problem:** All three functions called `hydratePost()` directly, which does not fetch channel metadata. Posts in any of these three views showed blank channel name/icon/color in post cards.

**Fix:** Replaced all three direct hydration loops with `hydratePostList()` — the shared helper that correctly fetches channel name, icon, and color in a single batch query. Also improved `getSavedPosts` to preserve save-order sort after the hydration step.

### 7. Discover Tab Trending Hashtags — Dead `cursor-pointer` Spans

**File:** `app/(chef)/network/page.tsx` (`DiscoverTab`)

**Problem:** Same as the post card hashtag issue — styled to look clickable but rendered as `<span>` with no navigation.

**Fix:** Changed to `<Link href="?tab=feed&mode=global&tag=...">`, consistent with the post card fix.

---

---

## Third Pass (Final Audit)

### 8. Channel Page — Mode Tabs Pulled From Wrong Feed (Critical)

**Files:** `components/social/social-feed-client.tsx`, `app/(chef)/network/channels/[slug]/page.tsx`

**Problem:** The channel detail page used `SocialFeedClient`, which shows "For You / Following / All Chefs" tabs. Switching any tab called `getSocialFeed()` — completely ignoring the channel. The initial render was correct, but "Load more", mode-switching, and the refresh button all silently pulled from the main feed instead of the channel.

**Fix:** Added `channelSlug` and `defaultChannelId` props to `SocialFeedClient`. When `channelSlug` is provided:

- Mode tabs are replaced with a simple "Channel Posts" label
- `reloadFeed` calls `getChannelFeed({ channelSlug })` instead of `getSocialFeed`
- `loadMore` calls `getChannelFeed({ channelSlug, before })` for correct pagination
- Composer defaults to posting in the current channel via `defaultChannelId`
- Empty state message is channel-specific

The channel page now passes `channelSlug={slug}` and `defaultChannelId={ch.id}`.

### 9. Unused `Badge` Import

**File:** `components/social/social-post-card.tsx`

**Problem:** `import { Badge } from '@/components/ui/badge'` — never referenced anywhere in the file. Dead import from an earlier draft.

**Fix:** Removed.

---

## What's Still Display-Only (Intentional — Needs Migration to Fix)

- **Polls** — vote counts display but voting is not wired. Adding voting requires a new `chef_poll_votes` table and a `votePoll` server action. Left for a dedicated pass since it needs schema work.
- **Post share count** — the share counter increments in the DB via trigger when `createSocialPost` is called with `post_type = 'share'`. The "Share" button currently copies a link (not a repost), so `shares_count` tracks reposts, not link copies. This is correct behavior.
