# Environment Variables

ChefFlow has separate local development and dedicated self-hosted production configuration. Public production values live on the production node, not in the repository and not on the developer workstation.

## Local Development

Local development runs with `npm run dev` on `localhost:3100`.

Use `.env.local` for developer-only values. Local values may point at local services, including the local Ollama-compatible runtime, but must never be copied directly into production.

Required local classes:

| Class | Examples |
| ----- | -------- |
| Database | `DATABASE_URL` |
| Auth | `AUTH_SECRET`, `ADMIN_EMAILS` |
| App URLs | `NEXT_PUBLIC_SITE_URL=http://localhost:3100`, `NEXT_PUBLIC_APP_URL=http://localhost:3100` |
| AI gateway | `OLLAMA_BASE_URL=http://localhost:11434`, `OLLAMA_MODEL=gemma4` |

## Dedicated Self-Hosted Production

Production runs on the dedicated host under `systemd` and Caddy. The app binds to `127.0.0.1:3300`.

Install live values at `/srv/chefflow/shared/chefflow-prod.env` with owner `root:chefflow` and mode `0640`. The checked-in example is `ops/systemd/chefflow-prod.env.example`.

Required production values:

| Variable | Purpose |
| -------- | ------- |
| `NODE_ENV=production` | Runtime mode |
| `HOST=127.0.0.1` | Loopback-only app binding |
| `PORT=3300` | Production app port behind Caddy |
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Auth.js signing secret |
| `AUTH_TRUST_HOST=true` | Trust reverse-proxy host headers |
| `NEXT_PUBLIC_SITE_URL=https://app.cheflowhq.com` | Build-time public site URL |
| `NEXT_PUBLIC_APP_URL=https://app.cheflowhq.com` | Build-time public app URL |
| `ADMIN_EMAILS` | Founder Authority and admin email list |
| `PLATFORM_OWNER_CHEF_ID` | Founder-owned chef record for routing |
| `STRIPE_SECRET_KEY` | Stripe server key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe browser key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook verification secret |
| `RESEND_API_KEY` | Email delivery key |
| `CRON_SECRET` | Scheduled job shared secret |
| `OLLAMA_BASE_URL` | Controlled Ollama-compatible AI endpoint |
| `OLLAMA_MODEL` | Production model name |

Optional production values:

| Variable | Purpose |
| -------- | ------- |
| `GOOGLE_CLIENT_ID` | Google sign-in and Gmail sync |
| `GOOGLE_CLIENT_SECRET` | Google sign-in and Gmail sync |
| `SENTRY_DSN` | Error reporting |
| `SENTRY_AUTH_TOKEN` | Source map upload |
| `NEXT_PUBLIC_POSTHOG_KEY` | Product analytics |
| `NEXT_PUBLIC_POSTHOG_HOST` | Product analytics host |

## Build-Time Versus Runtime

`NEXT_PUBLIC_*` values are build-time inputs. Changing them requires a new release build on the production host.

Server-only secrets are runtime inputs. They must come from host-managed configuration outside the repo. Prefer systemd credentials for sensitive material when the app wrapper supports `$CREDENTIALS_DIRECTORY`; use `/srv/chefflow/shared/chefflow-prod.env` as the transitional compatibility layer.

## Optional Staging

Do not create always-on staging unless there is a real testing need. If staging is required, keep it self-hosted with its own loopback port, env file, systemd unit, and Caddy site block.

Preview-on-demand means a temporary self-hosted branch deployment on controlled infrastructure.

## Must Not Be Set In Production

| Variable | Why |
| -------- | --- |
| `DEMO_MODE_ENABLED=true` | Production safety checks must block demo mode |
| Localhost public URLs | Public callbacks and links must use `https://app.cheflowhq.com` |
