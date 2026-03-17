# ChefFlow Beta Server Setup And Operations Guide

## Release Model

ChefFlow currently has three operating environments:

```text
Developer workstation -> active coding on localhost:3100
Beta host -> stable invite-only beta on beta.cheflowhq.com
Production host -> public launch on app.cheflowhq.com
```

Beta is the only external-user distribution channel that should be used right now.

## Pre-Deploy Gate

Before every beta deployment, run the release candidate commit through the beta gate:

```bash
npm install
npm run verify:release:web-beta
```

Do not deploy if this command fails. The beta gate is intended to block releases when the public health contract fails, the beta build does not compile, or the packaged beta smoke test fails.

## Deploying To Beta

From the workstation, run:

```bash
bash scripts/deploy-beta.sh
```

The deploy script is expected to:

1. Push the current branch.
2. Pull the release candidate on the beta host.
3. Copy the beta `.env.local`.
4. Build the app.
5. Restart the app process.
6. Run a health verification step.

## Post-Deploy Verification

Do these checks immediately after deploy:

```bash
curl -I https://beta.cheflowhq.com/api/health/readiness?strict=1
curl https://beta.cheflowhq.com/api/health/readiness?strict=1
```

Then manually verify:

1. Home page loads in beta mode.
2. Pricing page still routes users to beta access, not self-serve checkout.
3. Sign-in works for a beta account.
4. One core chef workflow completes without manual rescue.
5. In-app feedback submission still works.

## Rolling Back

If a deploy breaks beta:

```bash
bash scripts/rollback-beta.sh
```

Rollback is part of the release contract. A beta build is not ready for external users if rollback has not been verified recently.

## Environment Notes

The beta environment should use beta-specific values for:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_APP_URL`
- Supabase auth redirect URLs
- Google OAuth callback URLs
- Stripe mode and webhook settings
- `CRON_SECRET`

Do not reuse local-development values on the beta host.

## Services On The Beta Host

Expected always-on services:

- ChefFlow app process
- Cloudflare Tunnel
- Any required background services such as Ollama, if beta depends on them

Useful status checks:

```bash
# Check beta app
curl http://localhost:3200/api/health

# Check Cloudflare Tunnel (PowerShell)
Get-Service cloudflared

# Check Ollama
curl http://localhost:11434/api/tags
```

## Troubleshooting

| Problem                  | Check first                                                                                          |
| ------------------------ | ---------------------------------------------------------------------------------------------------- |
| Beta site is down        | App process and Cloudflare Tunnel status                                                             |
| Health check is degraded | `GET /api/health/readiness?strict=1` body and headers                                                |
| Auth redirect fails      | Beta public URLs and OAuth callback configuration                                                    |
| Build fails on host      | Memory pressure, env mismatch, and `npm run verify:release:web-beta` on the release candidate commit |
| Rollback needed          | Restore the previous build with `bash scripts/rollback-beta.sh`                                      |

## Distribution Guidance

For external users, distribute only the hosted beta URL. Do not hand out source-code setup steps, Tauri installers, or mobile app packages until those channels have a production update and rollback story.
