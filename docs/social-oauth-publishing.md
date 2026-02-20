# Social Media OAuth & Auto-Publishing

**Phase 2 + Phase 3 of the Marketing Agent.**

## What This Implements

### Phase 2 — Real OAuth Connections
Chefs connect their social accounts once via a standard OAuth flow. ChefFlow stores
encrypted tokens and shows live "Connected" / "Not connected" status on the Connections page.

### Phase 3 — Automatic Publishing Cron
A Vercel Cron Job fires every 5 minutes, picks up posts with `status=queued` whose
`schedule_at` has arrived, and publishes them to each connected platform automatically.

---

## Architecture

### Token Security
- **Table**: `social_platform_credentials` — one row per chef per platform
- **Encryption**: AES-256-GCM, key from `SOCIAL_TOKEN_ENCRYPTION_KEY` env var
- **Format**: `iv:authTag:ciphertext` (all base64), stored as `TEXT` in Postgres
- Tokens are **never** returned to the browser — only decrypted server-side

### OAuth Flow (Phase 2)
```
Chef clicks "Connect Instagram"
    → GET /api/integrations/social/connect/instagram
    → Generates CSRF state, stores in social_oauth_states (10-min TTL)
    → Redirects to Facebook Login (Meta OAuth)

Chef grants permissions → Meta redirects back
    → GET /api/integrations/social/callback/instagram?code=...&state=...
    → Validates state (CSRF), exchanges code for short-lived token
    → Exchanges for long-lived token (60 days)
    → Fetches account info (IG user ID, username, linked Facebook Page)
    → Encrypts and upserts into social_platform_credentials
    → Redirects to /social/connections?connected=instagram
```

**PKCE** is used for X (Twitter) and TikTok (S256 challenge method).

### Publishing Flow (Phase 3)
```
Cron fires every 5 minutes
    → GET /api/scheduled/social-publish (authenticated with CRON_SECRET)
    → runPublishingEngine() queries: status=queued, preflight_ready=true, schedule_at <= now+5min
    → For each post × platform (not yet in published_to_platforms[]):
        - Fetch credential from social_platform_credentials
        - Refresh token if expires within 30 minutes
        - Call platform adapter (meta.ts, tiktok.ts, etc.)
        - On success: add platform to published_to_platforms[], store external ID
        - On failure: increment publish_attempts, store error in publish_errors{}
    → When all platforms succeed: set status = 'published'
    → After 3 failed attempts: send in-app notification to chef
```

---

## Platform-Specific Notes

### Instagram
- Requires a **Business or Creator** account linked to a Facebook Page
- Uses Meta Content Publishing API (container-based)
- Images: provide `image_url` (must be publicly accessible) → create container → publish
- Videos: provide `video_url` → create REELS container → poll status → publish
- Access token: long-lived user token (60 days); refresh via Meta long-lived exchange

### Facebook
- Requires a **Business Page** (personal profiles are not supported by API)
- Posts to the Page's timeline
- Page access tokens are non-expiring (permanent while user granted permission)

### TikTok
- Requires **TikTok for Business** account
- API only supports **video content** — image posts will be skipped with an error
- Uses `PULL_FROM_URL` source: TikTok downloads the video from Supabase storage
- Access token: 24h; refresh token: 365 days

### LinkedIn
- Posts to the chef's **personal LinkedIn profile** (UGC Posts API)
- Images shared via `originalUrl` (no binary upload needed)
- Video posts require binary upload (not yet implemented — falls back to text-only)
- Access token: 60 days; requires `w_member_social` and `r_member_social` scopes

### X (Twitter)
- Requires **X Developer Basic plan** (~$100/mo) for write access
- Images are downloaded from Supabase and uploaded to X's media endpoint (chunked upload)
- Access token: 2 hours; refresh token: 6 months (requires `offline.access` scope)
- Uses OAuth 2.0 with PKCE (mandatory for X)
- Token exchange uses HTTP Basic Auth (client_id:client_secret in Authorization header)

### Pinterest
- Requires a **Business account**
- Creates a **Pin** on the chef's first/default board (fetched during OAuth)
- Images shared via `image_url` (no binary upload — Pinterest downloads from our URL)
- Access token: ~30 days; refresh tokens available

### YouTube Shorts
- Posts **vertical video ≤60 seconds** to the chef's YouTube channel
- Uses Google OAuth 2.0 with `offline` access type (grants a permanent refresh token)
- Automatically adds `#Shorts` to the description for classification
- Access token: 1 hour; refresh token: permanent (rotated on refresh)
- Full binary upload required (downloads video from Supabase, uploads to YouTube)

---

## Required Environment Variables

Add all of these to `.env.local` and to Vercel project settings:

```bash
# Token encryption (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
SOCIAL_TOKEN_ENCRYPTION_KEY=<32-byte-base64>

# Meta (Instagram + Facebook — same app for both)
META_APP_ID=<your-meta-app-id>
META_APP_SECRET=<your-meta-app-secret>

# TikTok
TIKTOK_CLIENT_KEY=<your-tiktok-client-key>
TIKTOK_CLIENT_SECRET=<your-tiktok-client-secret>

# LinkedIn
LINKEDIN_CLIENT_ID=<your-linkedin-client-id>
LINKEDIN_CLIENT_SECRET=<your-linkedin-client-secret>

# X (Twitter)
X_CLIENT_ID=<your-x-oauth2-client-id>
X_CLIENT_SECRET=<your-x-oauth2-client-secret>

# Pinterest
PINTEREST_APP_ID=<your-pinterest-app-id>
PINTEREST_APP_SECRET=<your-pinterest-app-secret>

# YouTube
YOUTUBE_CLIENT_ID=<your-google-oauth-client-id>
YOUTUBE_CLIENT_SECRET=<your-google-oauth-client-secret>

# Base URL (required for redirect URIs)
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
```

---

## Redirect URIs to Register

Register these **exact** URIs in each platform's developer console:

| Platform | Redirect URI |
|---|---|
| Instagram / Facebook | `https://your-domain.com/api/integrations/social/callback/instagram` |
| Facebook (separate) | `https://your-domain.com/api/integrations/social/callback/facebook` |
| TikTok | `https://your-domain.com/api/integrations/social/callback/tiktok` |
| LinkedIn | `https://your-domain.com/api/integrations/social/callback/linkedin` |
| X | `https://your-domain.com/api/integrations/social/callback/x` |
| Pinterest | `https://your-domain.com/api/integrations/social/callback/pinterest` |
| YouTube | `https://your-domain.com/api/integrations/social/callback/youtube_shorts` |

---

## Key Files

| File | Purpose |
|---|---|
| `supabase/migrations/20260305000001_social_platform_credentials.sql` | DB table for encrypted OAuth tokens |
| `lib/social/oauth/crypto.ts` | AES-256-GCM encrypt/decrypt |
| `lib/social/oauth/config.ts` | Per-platform OAuth configs (auth URLs, scopes, env var names) |
| `lib/social/oauth/token-store.ts` | CRUD for social_platform_credentials |
| `lib/social/oauth-actions.ts` | Server actions for connections page |
| `app/api/integrations/social/connect/[platform]/route.ts` | Initiates OAuth flow (GET → redirect) |
| `app/api/integrations/social/callback/[platform]/route.ts` | Handles OAuth callback, stores tokens |
| `app/api/integrations/social/disconnect/[platform]/route.ts` | Disconnects a platform (POST) |
| `lib/social/publishing/adapters/meta.ts` | Instagram + Facebook publishers |
| `lib/social/publishing/adapters/tiktok.ts` | TikTok publisher |
| `lib/social/publishing/adapters/linkedin.ts` | LinkedIn publisher |
| `lib/social/publishing/adapters/x.ts` | X publisher |
| `lib/social/publishing/adapters/pinterest.ts` | Pinterest publisher |
| `lib/social/publishing/adapters/youtube.ts` | YouTube Shorts publisher |
| `lib/social/publishing/engine.ts` | Orchestrates publishing across all platforms |
| `lib/social/publishing/notify.ts` | Chef notification on publish failure |
| `app/api/scheduled/social-publish/route.ts` | Cron endpoint (fires every 5 minutes) |

---

## Platform API Approval Notes

These platforms require application review before publishing is allowed:

| Platform | Approval Process | Estimated Time |
|---|---|---|
| Instagram | Meta App Review for `instagram_business_content_publish` | 1–4 weeks |
| Facebook | Meta App Review for `pages_manage_posts` | 1–4 weeks |
| TikTok | TikTok for Business API approval | 1–2 weeks |
| LinkedIn | Marketing Developer Platform access | 1–2 weeks |
| X | Purchase Basic Developer plan ($100/mo) | Immediate |
| Pinterest | Business account (no review needed) | Immediate |
| YouTube | Google API (no review needed for uploads) | Immediate |

---

## How to Generate the Encryption Key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Add the result as `SOCIAL_TOKEN_ENCRYPTION_KEY` in your `.env.local` and Vercel settings.

---

## Post Status Flow

```
idea → draft → approved → queued → published
                                 ↘ (if 3 failures) stays queued, chef notified
```

When a post is set to `queued` and its `schedule_at` arrives, the cron picks it up.
`publish_attempts` tracks how many cron runs have touched it.
`published_to_platforms[]` tracks per-platform success.
`publish_errors{}` maps platform → last error string.
When all platforms in `platforms[]` are in `published_to_platforms[]`, `status` → `published`.
