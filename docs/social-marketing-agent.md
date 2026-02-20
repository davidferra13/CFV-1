# Social Media Marketing Agent

## What This Is

The Marketing Agent is ChefFlow's built-in social media system. The concept: a private chef sits down once — for a day, a week, or a month — fills up ~250 post slots for the entire year, and ChefFlow automatically posts to every connected platform on schedule. No daily phone-picking, no last-minute scrambling. Like having a 24/7 marketing agent that never sleeps.

250 posts ÷ 52 weeks = ~5 posts/week. That's a fully professional posting cadence, completely hands-off.

---

## Phase 1 (Live Now): Content Planner

### What's Working

**Annual Calendar** (`/social/planner`)
- 12-month bird's-eye view of the entire year
- Each month shows: total posts, status breakdown, a color-coded completion bar
- Click any month to drill into the week-by-week slot view

**Month Planner** (`/social/planner/[1-12]`)
- Week rows showing every scheduled slot as a card
- Each card shows: content pillar, status, post title, preflight indicator, quick Edit link
- Empty slots shown as dimmed "Reserved slot" placeholders

**Post Editor** (`/social/posts/[id]`)
Four-tab editor for each post:

1. **Caption tab** — Master caption + 7 platform-specific captions (each with live character counter). Platform tabs show a green dot when the caption has been filled. Auto-fill button copies master caption to any platform. Hashtag manager with TagInput chip UI and hashtag set picker. CTA, location tag, mentions, alt text.

2. **Platforms & Preview tab** — Platform checkboxes to select which platforms to publish to. Live preview card styled to resemble each platform's feed (shows how caption truncates, hashtag limits, etc.).

3. **Media tab** — Primary media preview (image or video). Browse vault button opens a full-screen asset picker. Linked asset list with detach. Media URL override field for external links.

4. **Settings tab** — Status progression (idea → draft → approved → queued), content pillar, campaign name, offer link, seasonal flag, hot-swap toggle, internal notes.

**Persistent preflight bar** (bottom of every post): shows green "Preflight ready" or amber "N items missing" with the specific missing fields called out. Post must be preflight-ready before it can be queued for auto-publishing (Phase 3).

**Media Vault** (`/social/vault`)
- Upload zone: drag-drop or click-to-select, supports JPEG/PNG/WebP/HEIC/MP4/MOV/WebM, up to 100MB per file
- 4-column grid of all assets with thumbnails, file size, tags, usage count
- Search by name or tag, filter by image/video
- Edit name + tags in a slide-over panel
- Remove (archive) an asset — removes it from vault and all post links

**Settings** (`/social/settings`)
- Target year, posts per week (1–14 range slider), timezone, day/time slot builder
- Reserved holdout slots per month (kept empty for timely content like breaking trends)
- "Save Settings" to update configuration
- "Save & Generate Plan" to generate the annual plan for the first time
- "Regenerate (Replace All)" with a destructive confirmation dialog — use carefully

**Platform Connections** (`/social/connections`)
- Shows all 7 platforms with their API requirements and documentation links
- OAuth connection buttons are present but disabled (coming in Phase 2)
- CSV export (existing feature) continues to work as the manual posting fallback

---

## Data Model

### Key Tables
| Table | Purpose |
|---|---|
| `social_queue_settings` | Per-chef posting schedule configuration |
| `social_posts` | Annual content vault — one row per planned post |
| `social_media_assets` | Media vault — images and videos |
| `social_post_assets` | Links posts to assets (M2M with display order) |
| `social_hashtag_sets` | Named hashtag groups for quick insertion |
| `social_oauth_states` | Temporary OAuth state storage (Phase 2) |

### Post Status Flow
```
idea → draft → approved → queued → published
                                 ↘ archived
```

- **idea**: Auto-generated slot, no content yet
- **draft**: Chef has started writing
- **approved**: Chef has reviewed and approved — content is finalized
- **queued**: Ready for auto-publishing (requires preflight_ready = true)
- **published**: Successfully posted to all selected platforms
- **archived**: Removed from the active queue

### Content Pillars (6)
| Pillar | Target | Color |
|---|---|---|
| Recipes & How-To | 80 posts/yr | Green |
| Behind the Scenes | 50 posts/yr | Amber |
| Education | 40 posts/yr | Blue |
| Social Proof | 35 posts/yr | Violet |
| Offers & Events | 35 posts/yr | Orange |
| Seasonal | 20 posts/yr | Rose |

### Preflight Checklist
A post is `preflight_ready = true` when it has all of: title, master caption, CTA, hashtags, mention handles, location, alt text, selected platforms, and attached media. The preflight check runs automatically on every save via existing server action logic in `lib/social/actions.ts`.

---

## Phase 2 (Upcoming): Platform OAuth Connections

Each platform requires the chef to register their account once via a secure OAuth flow. ChefFlow never stores the chef's password — only the access tokens (encrypted, stored in `integration_connections`).

### Platform Requirements Summary
| Platform | Key Requirement | Estimated Setup Time |
|---|---|---|
| Instagram | Meta Business account + app review for Content Publishing API | 1–4 weeks (review) |
| Facebook | Facebook Business Page (not personal profile) | 1–4 weeks (review) |
| TikTok | TikTok for Business + Content Posting API approval | 1–2 weeks |
| LinkedIn | LinkedIn Marketing Developer Platform | 1–2 weeks |
| X (Twitter) | X Developer account, Basic plan (~$100/mo) | Immediate |
| Pinterest | Pinterest Business account | Immediate |
| YouTube Shorts | Google account + YouTube channel | Immediate |

Meta (Instagram + Facebook) go through the same OAuth flow — connecting once covers both.

Implementation files (to be built in Phase 2):
- `app/api/integrations/social/[platform]/connect/route.ts`
- `app/api/integrations/social/[platform]/callback/route.ts`
- `lib/social/publishing/adapters/meta.ts` (+ tiktok, x, linkedin, pinterest, youtube)

---

## Phase 3 (Upcoming): Publishing Automation

A Vercel cron job fires every 5 minutes and processes queued posts:

1. Find all posts where `status = 'queued'` AND `schedule_at ≤ now + 5min` AND `preflight_ready = true`
2. For each post × platform: fetch OAuth token from `integration_connections`, call the platform's publishing API
3. On success: add platform to `published_to_platforms[]`, store external post ID in `published_external_ids`
4. When all selected platforms are published: set `status = 'published'`
5. On failure: increment `publish_attempts`, record error in `publish_errors`, notify chef after 3 failures

New DB columns added by `20260304000001_social_publishing_layer.sql`:
- `publish_attempts` — retry counter
- `last_publish_at` — last successful publish timestamp
- `last_publish_error` — human-readable last error
- `publish_errors` — per-platform error map (JSONB)
- `published_external_ids` — per-platform external post ID map (JSONB)

---

## Key File Locations

| What | Where |
|---|---|
| All server actions (1,500+ lines) | `lib/social/actions.ts` |
| Hashtag set actions | `lib/social/hashtag-actions.ts` |
| TypeScript types + constants | `lib/social/types.ts` |
| Annual planner page | `app/(chef)/social/planner/page.tsx` |
| Month view page | `app/(chef)/social/planner/[month]/page.tsx` |
| Post editor page | `app/(chef)/social/posts/[id]/page.tsx` |
| Vault page | `app/(chef)/social/vault/page.tsx` |
| Connections page | `app/(chef)/social/connections/page.tsx` |
| Settings page | `app/(chef)/social/settings/page.tsx` |
| Layout + tabs | `app/(chef)/social/layout.tsx` |
| Annual calendar | `components/social/social-annual-calendar.tsx` |
| Month grid | `components/social/social-month-grid.tsx` |
| Slot card | `components/social/social-slot-card.tsx` |
| Post editor (main) | `components/social/social-post-editor.tsx` |
| Caption editor | `components/social/social-caption-editor.tsx` |
| Platform preview | `components/social/social-platform-preview.tsx` |
| Media vault browser | `components/social/social-vault-browser.tsx` |
| Connections manager | `components/social/social-connections-manager.tsx` |
| Settings form | `components/social/social-queue-settings-form.tsx` |
| Pillar badge | `components/social/social-pillar-badge.tsx` |
| Hashtag set picker | `components/social/social-hashtag-set-picker.tsx` |
| Migration (Phase 1+2 DB) | `supabase/migrations/20260304000001_social_publishing_layer.sql` |

---

## Typical Workflow

### First-Time Setup
1. Go to **Settings** → set year, posts/week, timezone, day/time slots
2. Click **Save & Generate Plan** → system creates ~250 empty post slots
3. Go back to **Planner** → see the annual 12-month calendar

### Filling Posts (Month by Month)
1. Click a month on the annual calendar
2. See all week rows with post slots for that month
3. Click **Edit** on any slot to open the full post editor
4. Fill Caption tab: master caption, platform-specific overrides, hashtags, CTA
5. Go to Media tab: upload or browse vault to attach an image/video
6. Go to Settings tab: confirm pillar, change status to **Approved**
7. Click **Save Post**

### Planning a Seasonal Post (e.g., 4th of July)
1. Navigate to `/social/planner/7` (July)
2. Find a slot near July 4th
3. Open the editor → write a patriotic food caption
4. Upload a red-white-blue dish photo to the vault, attach it
5. Set hashtags: `#4thofjuly #privatechef #holidaydinner #americanfood`
6. Set CTA: "Book your 4th of July dinner — DM or link in bio"
7. Set Status to **Approved** → when Phase 3 launches, change to **Queued**

### Quick-Reuse via Hashtag Sets
1. Go to any post → Caption tab → click "Insert hashtag set"
2. Select a saved set (e.g., "Recipe Posts - Core") → hashtags append instantly
3. Saves re-typing the same 20 hashtags across 80 recipe posts

---

## Opt-In / Opt-Out

Auto-publishing (Phase 3) is entirely opt-in:
- A post only publishes automatically if its `status = 'queued'`
- Only platforms the chef has explicitly connected receive posts
- Chefs can disconnect any platform at any time from the Connections page
- Turning off auto-publishing is as simple as never setting posts to "Queued" status — CSV export continues to work for manual posting
