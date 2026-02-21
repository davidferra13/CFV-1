# Build: Phase 2 Free API Integrations

**Date:** 2026-02-21
**Branch:** feature/scheduling-improvements
**Status:** Complete — TypeScript clean, no migrations required

---

## What Changed

Three integrations shipped in Phase 2, all continuing the zero-friction / minimal-key theme.

---

## Integration 1: Resend Email — Channel Router Wired (Phase 2 Complete)

**What was missing:** The notification channel router (`lib/notifications/channel-router.ts`) had a stub `deliverEmail()` function that logged every email delivery as `'skipped'` with the note "Phase 2 email routing not yet connected." Push and SMS were already live. Email was the only dark channel.

**What shipped:**

- `lib/email/templates/notification-generic.tsx` — React Email component using the existing `BaseLayout`, renders title + body + CTA button
- `lib/email/route-email.ts` — `routeEmailByAction(input: RouteInput)` function that:
  1. Looks up the recipient's email from `auth.users` via the admin Supabase client
  2. Resolves the action URL (absolute, or relative prefixed with `APP_URL`)
  3. Sends via the existing `sendEmail()` → Resend pipeline with circuit breaker
  4. Returns `true/false` for delivery logging
- `lib/notifications/channel-router.ts` — stub replaced; `deliverEmail()` now calls `routeEmailByAction` and logs `'sent'` or `'failed'`

**How it interacts with rich transactional emails:**
The channel router handles _notification-tier_ emails (e.g., "You have a new message") using the generic template. The rich transactional emails in `lib/email/notifications.ts` (30+ templates: `sendEventConfirmedEmail`, `sendPaymentConfirmationEmail`, etc.) are called directly from server actions with full context — these were already complete and unchanged.

**Setup required:**

- `RESEND_API_KEY` — get at [resend.com](https://resend.com) (free tier: 3,000 emails/month)
- `RESEND_FROM_EMAIL` — verified sender address (`Chef Name <name@yourdomain.com>`)
- Verify your sending domain in the Resend dashboard

---

## Integration 2: OpenStreetMap Fallback Map

**Problem:** `components/ui/location-map.tsx` used Google Maps unconditionally. When `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` was absent or expired, the map showed a gray "Loading map…" state forever — no fallback, no useful information.

**What shipped:**

- `components/ui/location-map.tsx` refactored into three parts:
  - `OsmMap` — iframe embed using `openstreetmap.org/export/embed.html` with a bbox calculated from the coordinates; completely free, no key
  - `GoogleMapEmbed` — the original Google Maps implementation, isolated into its own sub-component
  - `LocationMap` (public export) — checks `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` at render time; uses Google Maps when key is present, OSM otherwise

**Inline styles removed:** All `style={{ ... }}` props replaced with Tailwind classes (`min-h-[200px]`, `w-full`, `border-0`, `block`, `mapContainerClassName`).

**Behavior now:**
| Condition | Map shown |
|-----------|-----------|
| Google Maps key configured | Google Maps (existing behavior) |
| No key / key expired | OpenStreetMap embed + "View on OpenStreetMap ↗" link |

No API key, account, or env var required for OSM.

---

## Integration 3: USDA FoodData Central — Dual Nutrition Panel

**What shipped:**

- `lib/nutrition/usda-fdc.ts` — USDA FDC search utility
  - Fetches from `https://api.nal.usda.gov/fdc/v1/foods/search`
  - Uses `DEMO_KEY` (30 req/hour, no registration) by default
  - Uses `USDA_FDC_API_KEY` env var when set (1,000 req/hour)
  - Extracts: calories, protein, fat, carbs, fiber, sugar, sodium
  - Results cached for 1h via Next.js fetch cache
- `lib/nutrition/actions.ts` — added `searchFdcAction(query)`
- `components/recipes/nutrition-lookup-panel.tsx` — rebuilt with two tabs:
  - **Open Food Facts** — packaged products, branded items, Nutri-Score grade
  - **USDA FDC** — whole ingredients (`chicken breast`, `heavy cream`, `garlic`), USDA raw data

**Why two sources:**

- Open Food Facts excels at packaged/processed foods with labels
- USDA FDC excels at raw/whole ingredients and has authoritative government data
- They complement each other — between them, virtually any ingredient can be looked up

**No API key required** to start (DEMO_KEY covers recipe-detail page traffic easily).
To upgrade: register free at [fdc.nal.usda.gov](https://fdc.nal.usda.gov/api-guide.html), add `USDA_FDC_API_KEY` to Vercel env vars.

---

## No Migrations Required

All three integrations are pure application-layer changes — no schema modifications.

---

## Phase 3 Preview (requires specific keys)

| API                    | Key needed                                  | What it adds                                                   |
| ---------------------- | ------------------------------------------- | -------------------------------------------------------------- |
| Resend (already wired) | `RESEND_API_KEY` + verified domain          | **NOW ACTIVE** — just add key                                  |
| Google Places          | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`           | Address autocomplete in event form, Google Maps instead of OSM |
| Google Calendar OAuth  | `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` | Two-way calendar sync for chefs                                |
| Groq (fast LLM)        | `GROQ_API_KEY`                              | Sub-100ms AI drafts for client communications                  |
| Edamam                 | `EDAMAM_APP_ID` + `EDAMAM_APP_KEY`          | Whole-recipe nutrition (vs per-ingredient lookup)              |
| Cloudinary             | Three env vars                              | Managed image uploads, transformations, CDN                    |
