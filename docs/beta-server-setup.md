# ChefFlow Staging And Beta Operations

The tunnel-era beta path is legacy. ChefFlow production now targets a dedicated self-hosted production node, and optional staging must follow the same self-hosted deployment standard.

## Current Policy

```text
Developer workstation -> local development on localhost:3100 only
Production node -> public app on app.cheflowhq.com
Optional staging -> self-hosted service only when needed
```

Do not expose the developer workstation as beta or production. Do not use local tunnels as the public origin for external users.

## Default

Do not run an always-on staging environment unless there is a concrete testing need that preview-on-demand cannot solve.

Preview-on-demand means a temporary branch deployment on controlled self-hosted infrastructure. It is not a third-party preview service and not a workstation tunnel.

## If Staging Is Required

Use one of these patterns:

| Pattern | Requirements |
| ------- | ------------ |
| Same host, second service | Separate loopback port, env file, systemd unit, Caddy site block, and release path |
| Second host | Same deployment model as production with lower blast radius |

Staging must use its own:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_APP_URL`
- auth callback URLs
- Stripe mode and webhook settings
- `CRON_SECRET`
- AI gateway configuration

## Release Gate

Before exposing a staging build to anyone outside development:

```bash
npm install
npm run verify:release:web-beta
```

Do not ship if the release gate fails. This check does not replace the production self-hosted deploy validation in `docs/runbooks/self-hosted-ops.md`.

## Operations

For production deploy and rollback, use:

- `scripts/package-release.ps1`
- `scripts/deploy-self-hosted.ps1`
- `scripts/rollback-self-hosted.ps1`
- `docs/runbooks/self-hosted-bootstrap.md`
- `docs/runbooks/self-hosted-ops.md`

For staging, duplicate the same pattern with staging-specific service names and ports. Keep public proxying pointed at a loopback app service on the staging host, never at the developer workstation.

## Troubleshooting

| Problem | Check first |
| ------- | ----------- |
| Staging site is down | Staging systemd service, Caddy site block, and loopback readiness |
| Health check is degraded | `GET /api/health/readiness?strict=1` body and host logs |
| Auth redirect fails | Staging public URLs and OAuth callback configuration |
| Build fails on host | Env mismatch, memory pressure, and release gate output |
| Rollback needed | Use the staging equivalent of `rollback-release.sh` |
