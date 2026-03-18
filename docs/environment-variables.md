# Environment Variables - Production Deployment

Quick reference for setting production environment variables.
All values should be set in `.env.local` on the production server.

## Required (app will not start without these)

| Variable                             | Source                                   | Format                      |
| ------------------------------------ | ---------------------------------------- | --------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`           | Supabase dashboard > Settings > API      | `https://xxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`      | Supabase dashboard > Settings > API      | `eyJ...`                    |
| `SUPABASE_SERVICE_ROLE_KEY`          | Supabase dashboard > Settings > API      | `eyJ...`                    |
| `STRIPE_SECRET_KEY`                  | Stripe dashboard > Developers > API keys | `sk_live_...`               |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe dashboard > Developers > API keys | `pk_live_...`               |
| `STRIPE_WEBHOOK_SECRET`              | Stripe dashboard > Developers > Webhooks | `whsec_...`                 |
| `RESEND_API_KEY`                     | Resend dashboard > API Keys              | `re_...`                    |
| `CRON_SECRET`                        | Generate: `openssl rand -hex 32`         | Random hex string           |
| `NEXT_PUBLIC_SITE_URL`               | Fixed                                    | `https://app.cheflowhq.com` |
| `NEXT_PUBLIC_APP_URL`                | Fixed                                    | `https://app.cheflowhq.com` |
| `ADMIN_EMAILS`                       | Fixed                                    | `davidferra13@gmail.com`    |

## Required for specific features

| Variable                 | Feature                    | Source                     |
| ------------------------ | -------------------------- | -------------------------- |
| `GOOGLE_CLIENT_ID`       | Gmail sync, Google sign-in | Google Cloud Console       |
| `GOOGLE_CLIENT_SECRET`   | Gmail sync, Google sign-in | Google Cloud Console       |
| `PLATFORM_OWNER_CHEF_ID` | Contact form routing       | Supabase: `chefs` table ID |

## Optional (graceful degradation if missing)

| Variable                   | Feature                          | Behavior if missing                        |
| -------------------------- | -------------------------------- | ------------------------------------------ |
| `SENTRY_DSN`               | Error tracking                   | Errors not reported                        |
| `SENTRY_AUTH_TOKEN`        | Source map upload                | Stack traces unreadable in Sentry          |
| `NEXT_PUBLIC_POSTHOG_KEY`  | Product analytics                | Analytics disabled                         |
| `NEXT_PUBLIC_POSTHOG_HOST` | Analytics host                   | Defaults to `https://us.i.posthog.com`     |
| `GEMINI_API_KEY`           | Non-private AI (technique lists) | Feature shows "AI unavailable"             |
| `UPSTASH_REDIS_REST_URL`   | Persistent rate limiting         | Falls back to in-memory (resets on deploy) |
| `UPSTASH_REDIS_REST_TOKEN` | Persistent rate limiting         | Falls back to in-memory                    |

## Must NOT be set in production

| Variable            | Why                                                                       |
| ------------------- | ------------------------------------------------------------------------- |
| `DEMO_MODE_ENABLED` | Must be `false` or unset. Production safety check blocks startup.         |
| `OLLAMA_BASE_URL`   | Ollama is local-only. Production has no GPU. Features degrade gracefully. |

## Safety checks

`lib/environment/production-safety.ts` runs at startup and validates:

- All required vars present
- Stripe keys are `sk_live_`/`pk_live_` (not test keys)
- Stripe keys are from the same mode (live/live, not live/test)
- Webhook secret has `whsec_` prefix
- Site/App URLs are not localhost
- Demo mode is disabled
- Sentry auth token present if DSN is set (warning)

If any check fails, the app throws and does not start.

## Setup steps

1. Copy `.env.local.example` to `.env.local` on the production server
2. Fill in each variable from the corresponding dashboard
3. Restart the production server after updating
