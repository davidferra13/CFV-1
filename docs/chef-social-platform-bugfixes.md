# Chef Social Platform — Bug Fixes

**Branch:** `feature/packing-list-system`
**Files changed:** 5

---

## Summary

After the initial social platform build, a code review identified 8 bugs — 4 critical, 2 high/medium, 2 lower. All have been addressed in this pass.

---

## Bugs Fixed

### 1. `getSocialFeed` — Visibility Privacy Leak (CRITICAL)

**File:** `lib/social/chef-social-actions.ts`

**Problem:** The feed fetched posts from followed/connected authors with no visibility filter. A chef who set a post to `connections`-only was visible to anyone who followed them but wasn't actually connected. A `private` post was visible to all followers.

**Fix:** Replaced the single query with a multi-bucket parallel approach:

| Relationship bucket | Allowed visibilities |
|---|---|
| Own posts | `public`, `followers`, `connections`, `private` |
| Follow-only (following but not connected) | `public`, `followers` |
| Connection-only (connected but not following) | `public`, `connections` |
| Both (following AND connected) | `public`, `followers`, `connections` |
| Global mode | `public` only |

Results are merged, deduplicated by `id`, re-sorted by `created_at DESC`, and sliced to `limit`. A shared `hydratePostList()` helper was added to avoid duplication.

---

### 2. `getChannelFeed` — Visibility Leak + Missing Metadata (CRITICAL + MEDIUM)

**File:** `lib/social/chef-social-actions.ts`

**Problem (visibility):** Same relationship-aware visibility rules were missing. A channel post set to `connections`-only was visible to any channel member regardless of relationship.

**Problem (metadata):** The channel query selected only `id`, so channel name/icon/color were empty strings/null in every post card within a channel.

**Fix:**
- Channel query now selects `id, slug, name, icon, color`
- Same multi-bucket parallel query approach as `getSocialFeed`, scoped to `channel_id`
- Added a **5th bucket** — `strangers` (no relationship): public-only. Unlike the main feed which only shows known chefs, channel feeds should surface `public` posts from any channel member so discussions are discoverable
- Uses `hydratePostList()` which re-fetches channel metadata from DB (correct data)

---

### 3. Channel Page — Missing WHERE Clause + Wrong Response Access (CRITICAL)

**File:** `app/(chef)/network/channels/[slug]/page.tsx`

**Problem 1:** `requireChef()` return value was discarded (`await requireChef()` with no assignment). This meant the subsequent `me` query had no `user.entityId` to filter by.

**Problem 2:** The `me` query called `.single()` without a `.eq('id', ...)` filter. `.single()` on an unfiltered table would throw a "more than one row returned" error in production.

**Problem 3:** Response was accessed as `me?.data?.display_name` when the raw Supabase response `{ data, error }` was being stored in `me` — should be destructured first.

**Fix:**
```typescript
// Before
await requireChef()
const me = await supabase.from('chefs').select(...).single()
const myName = me?.data?.display_name ?? ...

// After
const user = await requireChef()
const { data: me } = await supabase.from('chefs').select(...).eq('id', user.entityId).single()
const myName = me?.display_name ?? ...
```

---

### 4. `SocialChannelCard` Misuse in Channel Header (MEDIUM)

**File:** `app/(chef)/network/channels/[slug]/page.tsx`
**File:** `components/social/social-channel-card.tsx`

**Problem:** The channel detail page's header was rendering a full `SocialChannelCard` (which includes its own icon, name, description, member count, and post count) just to get the join/leave button. This doubled all the info already shown in the custom header.

**Fix:** Added a `ChannelJoinButton` named export to `social-channel-card.tsx` — a lean component with just the join/leave toggle logic and button. The channel page header now uses `<ChannelJoinButton channelId={ch.id} isMember={...} />`.

---

### 5. `SocialStoryBar` — `onRefresh` No-Op (HIGH)

**File:** `components/social/social-feed-client.tsx`

**Problem:** `<SocialStoryBar groups={stories} onRefresh={() => {}} />` — the refresh callback did nothing. After posting a new story or after viewing all stories, clicking the story bar's refresh had no effect.

**Fix:** Added a `reloadStories` callback that calls the `getActiveStories` server action and updates the `stories` state via `startTransition`:

```typescript
const reloadStories = useCallback(() => {
  startTransition(async () => {
    const fresh = await getActiveStories()
    setStories(fresh)
  })
}, [])
```

Also imported `getActiveStories` in the client component.

---

## Architecture Notes

- The multi-bucket visibility pattern is now the canonical approach for any feed that must respect post privacy. If a new feed type is added, copy this pattern from `getSocialFeed`.
- `hydratePostList()` is a shared private helper in `chef-social-actions.ts` — all feed functions should use it rather than manually calling `buildAuthorMap` + `getMyReactionsForPosts` + `getMySavedPosts`.
- Channel feeds intentionally include `public` posts from strangers (no relationship). This is deliberate: channels are community spaces where discoverability is the point. The main feed only shows posts from known chefs.

---

## Database

No new migrations. DB was already up to date from the initial platform build (`20260304000005_chef_social_platform.sql`, `20260304000006_chef_social_media_bucket.sql`).
