# Self-Hosted Production Operations

ChefFlow production runs from immutable release directories on the dedicated production node.

## Layout

```text
/srv/chefflow/
  current -> /srv/chefflow/releases/<release-id>
  releases/<release-id>/
  shared/chefflow-prod.env
  shared/scripts/
  shared/releases-ready/
  shared/successful-releases.log
```

The app service runs as `chefflow` and listens on `127.0.0.1:3300`. Caddy listens publicly on `80` and `443`.

## Package A Release

From a clean workstation checkout:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\package-release.ps1 -Commit HEAD
```

The package includes source files and `.chefflow-release.json`. It does not include workstation build artifacts.

## Deploy

```powershell
powershell -ExecutionPolicy Bypass -File scripts\deploy-self-hosted.ps1 -HostName prod-host-or-ip -User chefflow
```

The deploy script:

1. Packages the selected commit if no package is provided.
2. Copies the release payload over SSH.
3. Installs the server-side scripts.
4. Builds in a new release directory on the production host.
5. Starts a temporary loopback validation process.
6. Activates the release only after validation passes.
7. Checks public readiness after systemd restart.

If validation fails before activation, the current live release is unchanged.

## Rollback

```powershell
powershell -ExecutionPolicy Bypass -File scripts\rollback-self-hosted.ps1 -HostName prod-host-or-ip -User chefflow
```

Rollback changes only `/srv/chefflow/current` and restarts `chefflow-prod`. It never rebuilds during an incident.

## Health Checks

Run these on the production host:

```bash
curl -fsS http://127.0.0.1:3300/api/health
curl -fsS "http://127.0.0.1:3300/api/health/readiness?strict=1"
curl -fsS "https://app.cheflowhq.com/api/health/readiness?strict=1"
```

Streaming routes must also be checked during rollout:

```bash
curl --no-buffer --max-time 15 https://app.cheflowhq.com/api/realtime/system
curl --no-buffer --max-time 15 https://app.cheflowhq.com/api/remy/stream
```

Use a valid authenticated request when a route requires session context.

## Logs

```bash
sudo systemctl status chefflow-prod
sudo journalctl -u chefflow-prod -n 200
sudo journalctl -u caddy -n 200
```

## Recovery Rules

| Failure | Action |
| ------- | ------ |
| Package transfer fails | Retry transfer, no live release changed |
| Build fails | Fix and package a new release, current stays live |
| Temporary validation fails | Do not activate, inspect release `validation.log` |
| Public readiness fails after activation | Run rollback immediately |
| TLS renewal fails | Fix Caddy or DNS, do not bypass HTTPS |
| Disk is filling | Keep the latest three successful releases and prune older failed releases |
| Workstation shuts down | No action required for production serving |
