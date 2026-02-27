# Cloudflare Turnstile Bot Protection

**Date:** 2026-02-26
**Status:** Implemented
**Scope:** Public-facing embed inquiry forms

---

## What Is Turnstile?

Cloudflare Turnstile is an invisible CAPTCHA alternative. Unlike traditional CAPTCHAs (reCAPTCHA, hCaptcha), it runs silently in the background without requiring users to solve puzzles. It's free and unlimited.

- **Client-side:** A small JavaScript widget generates a verification token
- **Server-side:** The token is validated via Cloudflare's `siteverify` API
- **Invisible mode:** No visible widget, no user interaction required

## Architecture

```
Browser (embed form)          ChefFlow API              Cloudflare
┌─────────────────┐       ┌──────────────────┐     ┌──────────────────┐
│ TurnstileWidget  │──────▶│ /api/embed/inquiry│────▶│ siteverify API   │
│ (invisible)      │ token │                  │token│                  │
│                  │       │ verifyTurnstile   │     │ Returns success  │
│ Passes token to  │       │ Token()           │◀────│ or error-codes   │
│ form submission  │       │                  │     │                  │
└─────────────────┘       └──────────────────┘     └──────────────────┘
```

## Files Changed

| File                                       | What Changed                                            |
| ------------------------------------------ | ------------------------------------------------------- |
| `lib/security/turnstile.ts`                | **NEW** — Server-side `verifyTurnstileToken()` function |
| `components/security/turnstile-widget.tsx` | **NEW** — Client-side `<TurnstileWidget>` component     |
| `components/embed/embed-inquiry-form.tsx`  | Added Turnstile widget + sends token with submission    |
| `app/api/embed/inquiry/route.ts`           | Added Turnstile token validation before processing      |
| `next.config.js`                           | Updated embed CSP to allow `challenges.cloudflare.com`  |

## Environment Variables

| Variable                         | Side   | Required? | Description                                    |
| -------------------------------- | ------ | --------- | ---------------------------------------------- |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Client | No        | Turnstile site key from Cloudflare dashboard   |
| `TURNSTILE_SECRET_KEY`           | Server | No        | Turnstile secret key from Cloudflare dashboard |

**Both are optional.** If not set, Turnstile is completely bypassed — forms work as before. This allows dev/testing environments to function without Cloudflare configuration.

## How to Set Up

1. Go to [Cloudflare Dashboard > Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile)
2. Add a new site:
   - **Domain:** `cheflowhq.com` (add `app.cheflowhq.com` and `beta.cheflowhq.com` too)
   - **Widget Mode:** Invisible
3. Copy the **Site Key** and **Secret Key**
4. Add to `.env.local`:
   ```
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAA...
   TURNSTILE_SECRET_KEY=0x4AAAAAAA...
   ```
5. For beta, add the same to `.env.local.beta`

### Testing Keys (Cloudflare provides these)

For local development, you can use Cloudflare's testing keys:

- **Site Key (always passes):** `1x00000000000000000000AA`
- **Secret Key (always passes):** `1x0000000000000000000000000000000AA`
- **Site Key (always blocks):** `2x00000000000000000000AB`
- **Secret Key (always blocks):** `2x0000000000000000000000000000000AB`

## Graceful Degradation

The entire system is designed to fail open — real users should never be blocked:

| Scenario                                | Behavior                                                     |
| --------------------------------------- | ------------------------------------------------------------ |
| Env vars not set                        | Turnstile bypassed entirely — forms work as before           |
| Turnstile script fails to load          | Widget renders nothing, no token sent, server allows through |
| Cloudflare API unreachable              | Server logs warning, allows submission through               |
| Cloudflare API returns non-200          | Server logs warning, allows submission through               |
| Token is invalid/forged                 | Server returns 403 — submission rejected                     |
| Token is missing (Turnstile configured) | Server returns 403 — submission rejected                     |

## Defense Layers (Ordered)

The embed inquiry form now has three layers of bot protection:

1. **Rate limiting** — IP-based, 10 submissions per 5 minutes (existing)
2. **Honeypot field** — Hidden `website_url` field bots fill in (existing)
3. **Cloudflare Turnstile** — Invisible CAPTCHA verification (new)

## CSP (Content Security Policy) Changes

The embed route's CSP in `next.config.js` was updated to allow Turnstile:

- `script-src` — Added `https://challenges.cloudflare.com`
- `connect-src` — Added `https://challenges.cloudflare.com`
- `frame-src` — Added `https://challenges.cloudflare.com` (Turnstile uses an iframe internally)

These changes only affect `/embed/*` routes. The main app's CSP is unchanged.

## Iframe Compatibility

Turnstile works inside iframes (the embed widget use case). The `TurnstileWidget` component:

- Loads the script dynamically (no `<script>` tag in HTML head)
- Uses explicit rendering mode (`?render=explicit`)
- Does not rely on cookies or localStorage for the verification flow

## Component API

### `verifyTurnstileToken(token, ip?)` — Server

```ts
import { verifyTurnstileToken } from '@/lib/security/turnstile'

const result = await verifyTurnstileToken(token, clientIp)
if (!result.success) {
  return Response.json({ error: result.error }, { status: 403 })
}
```

### `<TurnstileWidget>` — Client

```tsx
import { TurnstileWidget } from '@/components/security/turnstile-widget'

;<TurnstileWidget
  onVerify={(token) => setToken(token)}
  onExpire={() => setToken(null)}
  onError={() => setToken(null)}
  theme="light"
/>
```

## Future Expansion

To add Turnstile to other public forms:

1. Add `<TurnstileWidget>` to the form component
2. Store the token in form state
3. Send the token with the form submission
4. Call `verifyTurnstileToken()` on the server before processing

Candidates for future Turnstile integration:

- Public contact/inquiry page (non-embed version, if one exists)
- Password reset / magic link request forms
- Any future public-facing form
