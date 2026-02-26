# Wix Webhook Security Improvements

**File changed:** `app/api/webhooks/wix/route.ts`

## Context

Wix Automations HTTP Action does not support HMAC payload signing. Unlike Stripe (which uses `stripe.webhooks.constructEvent` with HMAC-SHA256), Wix sends a plain HTTP POST with no cryptographic signature. This is a platform limitation, not a code gap.

The authentication mechanism is a per-chef `webhook_secret` stored in the `wix_connections` table. This secret is configured when a chef connects their Wix site.

## What Changed

### 1. Header-Preferred Secret Delivery

**Before:** The secret was accepted from either the `?secret=` query parameter OR the `X-Wix-Webhook-Secret` header, with no preference expressed.

**After:** The header is explicitly preferred. The query param is still accepted for backward compatibility (existing Wix automations that send `?secret=` continue to work) but now logs a security notice.

**Why this matters:** Query parameters appear in:

- Server access logs (Vercel, Nginx, etc.)
- Reverse proxy access logs
- CDN logs
- Browser address bar if the URL is opened directly

Headers do not appear in access logs by default. Moving the secret to a header keeps it out of logs.

### 2. Constant-Time Secret Comparison

**Before:** Authentication relied entirely on the Supabase DB query (`.eq('webhook_secret', secret)`). The DB lookup itself may or may not use constant-time comparison internally.

**After:** After the DB lookup succeeds, the secret is also compared using `crypto.timingSafeEqual()` at the application layer. This prevents timing side-channel attacks where an attacker could measure response times to guess valid secrets byte by byte.

### 3. `webhook_secret` Added to DB Select

The query now selects `webhook_secret` in addition to `chef_id, tenant_id, auto_create_inquiry` to enable the constant-time comparison.

## What Was NOT Changed

- The per-chef secret architecture (correct — each chef has a unique secret)
- The submission idempotency logic
- The async processing / 1250ms deadline handling
- The hash-based fallback submission ID

## Why True HMAC Isn't Available

Wix Automations HTTP Action sends webhooks without signing them. The only configuration options in the Wix interface are:

- The target URL (where to send)
- Custom headers (key-value pairs)
- The HTTP method (POST)

There is no option for Wix to sign the payload with a shared key. This contrasts with the Wix Webhooks subscription API (for app developers) which does use HMAC, but that API is for Wix app marketplace developers, not for Automations users.

**Mitigation:** The per-chef `webhook_secret` in the URL/header is the correct authentication approach for this use case. It is unique per chef and can be rotated by updating `wix_connections.webhook_secret`. Use HTTPS-only (enforced by Vercel) to prevent the secret from being intercepted in transit.

## Updating Existing Wix Automations

To upgrade existing automations from query param to header delivery:

1. In Wix Automations, edit the HTTP Action
2. Add a custom header: `X-Wix-Webhook-Secret: <the-secret-value>`
3. Remove the `?secret=` from the URL
4. Test the automation to confirm it still triggers

The route will accept both until all existing automations are migrated.
