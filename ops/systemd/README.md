# ChefFlow Production systemd Setup

These units run the dedicated self-hosted production app on the production node. The app binds to `127.0.0.1:3300`; Caddy is the only public listener.

## Files

| File | Purpose |
| ---- | ------- |
| `chefflow-prod.service` | Production app service under `/srv/chefflow/current` |
| `chefflow-prod.env.example` | Example host-managed environment file |
| `chefflow-watchdog.service` | Legacy local watchdog, not part of the phase-1 production standard |
| `chefflow-watchdog.timer` | Legacy local watchdog timer |

## Install

Run on the production host after the bootstrap runbook creates the `chefflow` user and `/srv/chefflow` layout:

```bash
sudo install -m 0644 ops/systemd/chefflow-prod.service /etc/systemd/system/chefflow-prod.service
sudo systemctl daemon-reload
sudo systemctl enable chefflow-prod
```

Create `/srv/chefflow/shared/chefflow-prod.env` from `chefflow-prod.env.example` and set live values on the host:

```bash
sudo install -o root -g chefflow -m 0640 ops/systemd/chefflow-prod.env.example /srv/chefflow/shared/chefflow-prod.env
```

Do not commit live production secrets. Prefer systemd credentials for sensitive values after the runtime wrapper can read `$CREDENTIALS_DIRECTORY`.

## Commands

```bash
sudo systemctl status chefflow-prod
sudo journalctl -u chefflow-prod -f
sudo systemctl restart chefflow-prod
```

Rollback should use `scripts/server/rollback-release.sh`, not ad hoc directory edits.
