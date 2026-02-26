# Social Media OAuth — Phase 2 Implementation

## What was built

Phase 2 implements real OAuth connections for all seven social platforms. Chefs can now connect their accounts once and the post editor shows which platforms are live. Phase 3 will fire the cron that actually publishes posts at scheduled times.

---

## Files created / changed

### Database

| File                                                               | What it does                                                                                                                                                                                                               |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `supabase/migrations/20260305000001_social_connected_accounts.sql` | Adds `social_connected_accounts` table. Stores OAuth tokens and account metadata per platform per chef. Tokens are never sent to the browser — service-role-only writes, RLS allows chefs to SELECT non-sensitive columns. |

### Platform Adapters

All in `lib/social/platform-adapters/`:

| File           | Platform             | Notes                                                                                                                                                                   |
| -------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types.ts`     | All                  | `PlatformAdapter` interface, `TokenSet`, `AccountInfo`, PKCE helpers (`generateState`, `generateCodeVerifier`, `generateCodeChallenge`)                                 |
| `meta.ts`      | Instagram + Facebook | Shared Meta OAuth app. Short-lived code → long-lived 60-day token. Fetches first FB Page + linked IG Business Account. No refresh tokens — chefs re-auth before expiry. |
| `tiktok.ts`    | TikTok               | PKCE required. 24h access tokens, 365-day refresh tokens.                                                                                                               |
| `x.ts`         | X (Twitter)          | PKCE required. ~2h access tokens, long-lived refresh with `offline.access` scope.                                                                                       |
| `linkedin.ts`  | LinkedIn             | No PKCE. 60-day access tokens, 1-year refresh tokens.                                                                                                                   |
| `pinterest.ts` | Pinterest            | No PKCE. Variable/non-expiring access tokens.                                                                                                                           |
| `youtube.ts`   | YouTube Shorts       | Google OAuth. 1-hour access tokens, long-lived refresh (kept across refreshes — Google doesn't re-issue).                                                               |
| `index.ts`     | Router               | `getAdapter(platform)`, `SUPPORTED_PLATFORMS`, `isMetaPlatform()`                                                                                                       |

### API Routes

| Route                                            | Method | Purpose                                                                                                                                                        |
| ------------------------------------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/integrations/social/connect/[platform]`    | GET    | Generates state + PKCE verifier, stores in `social_oauth_states`, redirects to platform's OAuth consent page                                                   |
| `/api/integrations/social/callback/[platform]`   | GET    | Validates state, exchanges code for tokens, fetches account info, upserts `social_connected_accounts`, redirects to `/social/connections?connected=[platform]` |
| `/api/integrations/social/disconnect/[platform]` | POST   | Sets `is_active = false` on the chef's connection row                                                                                                          |

### Server Actions (`lib/social/oauth-actions.ts`)

| Function                                       | Purpose                                                                      |
| ---------------------------------------------- | ---------------------------------------------------------------------------- |
| `getSocialConnections()`                       | Returns all 7 platform statuses for the current chef. Never includes tokens. |
| `getConnectedPlatformSet()`                    | Lightweight `Set<SocialPlatform>` for O(1) lookups in the post editor.       |
| `getSocialConnectionToken(tenantId, platform)` | Admin-only: fetches tokens for the Phase 3 publishing cron.                  |
| `updateConnectionAfterRefresh(...)`            | Updates stored tokens after a successful refresh.                            |

### UI Changes

| File                                               | Change                                                                                                                                               |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/social/social-connections-manager.tsx` | Real connect / reconnect / disconnect buttons. Shows account handle, token expiry warnings, error counts.                                            |
| `app/(chef)/social/connections/page.tsx`           | Fetches real connections via `getSocialConnections()`. Handles `?connected=` and `?error=` flash messages.                                           |
| `components/social/social-post-editor.tsx`         | Accepts `connectedPlatforms: Set<SocialPlatform>`. Platform checkboxes show a green WiFi icon when the account is connected, or a grey dot when not. |
| `app/(chef)/social/posts/[id]/page.tsx`            | Fetches `connectedPlatforms` from `getConnectedPlatformSet()` and passes to editor.                                                                  |

---

## OAuth flow (step by step)

```
Chef clicks "Connect Instagram"
  ↓
GET /api/integrations/social/connect/instagram
  ↓  generates state + stores in social_oauth_states
  ↓  302 redirect → facebook.com/dialog/oauth?...
  ↓
Chef grants permission on facebook.com
  ↓
GET /api/integrations/social/callback/meta?code=X&state=Y
  ↓  validates state (CSRF check)
  ↓  deletes state row (one-time-use)
  ↓  exchanges code → short-lived token → long-lived token (Meta)
  ↓  fetches FB profile + Pages + linked IG account
  ↓  upserts row for `instagram` AND `facebook` in social_connected_accounts
  ↓  302 redirect → /social/connections?connected=instagram
  ↓
Connections page shows "Instagram — Connected · @handle"
```

---

## Security model

- **Tokens never go to the browser.** `social_connected_accounts` has RLS SELECT for chefs, but the token columns are never included in queries from client components or server actions. Only the Phase 3 cron (via `getSocialConnectionToken`) reads tokens using the admin client.
- **State is one-time-use.** The callback route deletes the state row before processing the code. Expired states (>10 min) are rejected.
- **PKCE** is enforced for TikTok and X. The code verifier lives only in `social_oauth_states` (server-side), never sent to the browser.
- **Service role for writes.** API routes use `createAdminClient()` (service role). RLS has no INSERT/UPDATE/DELETE policies on `social_connected_accounts`.
- **Soft deletes.** Disconnect sets `is_active = false`, preserving the audit trail.

---

## Environment variables required

Add these to `.env.local` / Vercel dashboard before going live:

```bash
# Meta (Instagram + Facebook)
META_APP_ID=
META_APP_SECRET=

# TikTok
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=

# X (Twitter)
X_CLIENT_ID=
X_CLIENT_SECRET=

# LinkedIn
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=

# Pinterest
PINTEREST_APP_ID=
PINTEREST_APP_SECRET=

# YouTube / Google
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Required for building redirect URIs
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

Each platform also needs its OAuth redirect URI registered in its developer console:

- Meta: `{APP_URL}/api/integrations/social/callback/meta`
- TikTok: `{APP_URL}/api/integrations/social/callback/tiktok`
- X: `{APP_URL}/api/integrations/social/callback/x`
- LinkedIn: `{APP_URL}/api/integrations/social/callback/linkedin`
- Pinterest: `{APP_URL}/api/integrations/social/callback/pinterest`
- YouTube: `{APP_URL}/api/integrations/social/callback/youtube`

---

## Platform developer account requirements

| Platform      | What you need                                                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Meta**      | Facebook developer account → create a "Business" app → enable Instagram Graph API + Pages API → submit for review (required for production) |
| **TikTok**    | TikTok for Developers account → create app → enable Content Posting API → submit for review                                                 |
| **X**         | X developer portal → create project + app → apply for Basic tier (~$100/mo) — required for write access                                     |
| **LinkedIn**  | LinkedIn developer portal → create app → request Marketing Developer Platform access (manual review)                                        |
| **Pinterest** | Pinterest developer portal → create app → request `pins:write` scope (review required for production)                                       |
| **YouTube**   | Google Cloud Console → create OAuth 2.0 credentials → enable YouTube Data API v3 → OAuth verification required for >100 users               |

---

## What Phase 3 will add

- Cron job at `app/api/scheduled/social-publish/route.ts` (added to `vercel.json`)
- Per-platform publishing adapters (one per platform, wrapping the APIs)
- Token auto-refresh before publishing (checks `token_expires_at` with 24h buffer)
- `publish_attempts`, `last_publish_error`, `published_external_ids` populated on `social_posts`
- Post status flipped to `'published'` when all selected platforms succeed
- Chef notification on publish failure
