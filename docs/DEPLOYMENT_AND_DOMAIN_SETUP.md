# Deployment & Domain Setup — cheflowhq.com

## What Happened

ChefFlow V1 is now live at **https://cheflowhq.com**. This document covers everything set up in this session.

## Domain

- **Domain:** `cheflowhq.com` purchased via Cloudflare Registrar (~$6.50/yr)
- **DNS:** Cloudflare (A record pointing to Vercel's `76.76.21.21`)
- **SSL:** Automatic via Vercel (HTTPS enforced)

## Hosting

- **Platform:** Vercel (Hobby tier, free)
- **Project:** `cfv-1` under `davidferra13s-projects`
- **Region:** `iad1` (Washington D.C., East US)
- **GitHub repo:** `davidferra13/CFV1` (auto-connected)

## Environment Variables (Vercel)

All 12 variables configured via Vercel CLI:

| Variable | Status |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Set |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Set |
| `SUPABASE_SERVICE_ROLE_KEY` | Set |
| `NEXT_PUBLIC_SITE_URL` | `https://cheflowhq.com` |
| `NEXT_PUBLIC_APP_URL` | `https://cheflowhq.com` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Empty (not configured yet) |
| `STRIPE_SECRET_KEY` | Empty |
| `STRIPE_WEBHOOK_SECRET` | Empty |
| `GEMINI_API_KEY` | Set |
| `GOOGLE_CLIENT_ID` | Empty (not configured yet) |
| `GOOGLE_CLIENT_SECRET` | Empty |
| `CRON_SECRET` | Empty |

## PWA Support

Added Progressive Web App support so users can "install" ChefFlow:
- `public/manifest.json` — app manifest
- `public/icon-*.svg` — app icons (192px + 512px, regular + maskable)
- `app/layout.tsx` — manifest link, Apple PWA tags, theme-color meta

## Deployment Workflow

1. Make changes locally (visible at `localhost:3100`)
2. Commit + push to GitHub
3. Run `npx vercel deploy --prod --yes` to push live
4. cheflowhq.com updates in ~2 minutes

## Key Fix: vercel.json

The original `vercel.json` had `@secret` references in the `env` block (legacy Vercel format). These were removed — environment variables are now managed entirely through the Vercel dashboard/CLI.

## Auth Change

Removed "Continue with Google" button from both sign-in and sign-up pages. Users sign up with email/password only for now. Google OAuth can be re-enabled when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are configured.
