# Social Queue System (In-App)

This feature lives fully inside ChefFlow at `/social`.

## What It Handles

- Annual content vault generation (default 260 posts = 5 posts/week x 52 weeks)
- Queue day/time configuration per chef
- Media Vault uploads (photo/video stockpile)
- Post editing (caption, hashtags, mention tags, location tag, alt text, CTA, links)
- Asset linking (attach/detach vault assets per post)
- Preflight gate (blocks `queued` / `published` if required items are missing)
- Hot-swap queue replacement workflow
- Platform rolling-window CSV exports

## Setup Workflow

1. Open `Chef Portal -> Social`.
2. Set `Target Year`, `Timezone`, and `Monthly Reserved Slots`.
3. Enable queue days and assign posting times.
4. Click `Save Settings`.
5. Click `Generate Annual Queue`.

Notes:
- `Replace existing year` overwrites existing posts for the selected year.
- Reserved slots are generated as flexible placeholders for timely campaigns.

## Post Operations

From the queue table:

- Filter by status, pillar, search text, and hot-swap flag.
- Change status inline.
- Toggle hot-swap readiness inline.
- Click `Edit` on any row to open the full post editor.

Preflight required fields:

- Title
- Master caption
- CTA
- Hashtags
- Mention tags
- Location tag
- Alt text
- Platform selection
- Media asset (linked vault media or direct media URL)

If preflight is incomplete, status changes to `queued` or `published` are blocked.

## Media Vault Workflow

1. Upload photos/videos in the `Media Vault` card.
2. Tag assets for fast retrieval.
3. In the post editor, attach assets to a post.
4. Mark one attached asset as primary (used as `media_url`).

## Hot-Swap Workflow

Use the `Hot Swap Workflow` card:

1. Select an upcoming scheduled target post.
2. Select a `hot_swap_ready` source post.
3. Click `Apply Hot Swap`.

Effect:

- Target post receives source content.
- Source post is archived and marked no longer hot-swap-ready.

## Export Workflow

Use `Rolling Export Windows` to export CSV files based on platform windows:

- Instagram: 29 days
- Facebook: 29 days
- LinkedIn: 90 days
- Pinterest: 30 days (max 10 posts/export)
- TikTok: 10 days
- X: 30 days
- YouTube Shorts: 180 days

Each export contains:

- Post code
- Schedule date/time
- Title
- Platform caption
- Media URL
- Hashtags
- Mention handles
- Location tag
- CTA
- Offer link
- Status

## Data Model

Migrations:

- `supabase/migrations/20260224000014_social_content_queue.sql`
- `supabase/migrations/20260225000016_social_pipeline_assets.sql`

Tables:

- `social_queue_settings`
- `social_posts`
- `social_media_assets`
- `social_post_assets`

Both tables are tenant-scoped with strict RLS using:

- `get_current_user_role() = 'chef'`
- `tenant_id = get_current_tenant_id()`
