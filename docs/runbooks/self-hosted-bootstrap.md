# Self-Hosted Production Bootstrap

This runbook provisions the dedicated production node for ChefFlow. It does not deploy from the developer workstation, start local servers, or change DNS by itself.

## Target

- Linux x86_64 host controlled by the developer
- 16 GB RAM minimum, 32 GB recommended
- SSD storage
- Stable LAN address or DHCP reservation
- Public ingress on `80` and `443` only
- ChefFlow app bound to `127.0.0.1:3300`

## Base Packages

Install Node.js, npm, Caddy, git, curl, tar, and systemd support from the host package manager. Use the current Node LTS unless a release runbook pins a newer version.

## Service Account And Directories

```bash
sudo useradd --system --create-home --shell /usr/sbin/nologin chefflow
sudo mkdir -p /srv/chefflow/releases /srv/chefflow/shared/scripts /srv/chefflow/incoming
sudo chown -R chefflow:chefflow /srv/chefflow
sudo chmod 0750 /srv/chefflow /srv/chefflow/shared
```

## Environment

Create the host-managed environment file:

```bash
sudo install -o root -g chefflow -m 0640 ops/systemd/chefflow-prod.env.example /srv/chefflow/shared/chefflow-prod.env
sudoedit /srv/chefflow/shared/chefflow-prod.env
```

Live secrets must stay outside the repository and outside release directories. Prefer systemd credentials for sensitive material when the app wrapper supports reading `$CREDENTIALS_DIRECTORY`.

## systemd

```bash
sudo install -m 0644 ops/systemd/chefflow-prod.service /etc/systemd/system/chefflow-prod.service
sudo systemctl daemon-reload
sudo systemctl enable chefflow-prod
```

Do not start the service until at least one release has been installed and `/srv/chefflow/current` exists.

## Caddy

```bash
sudo install -m 0644 ops/caddy/Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Set `ACME_EMAIL` and `CHEFFLOW_DOMAIN` in the Caddy service environment if the defaults are not correct. Caddy terminates TLS and proxies only to `127.0.0.1:3300`.

## DNS Cutover

Point `app.cheflowhq.com` at the production node only after:

1. A release passes the server-side install validation.
2. `/api/health/readiness?strict=1` passes on loopback.
3. Streaming validation has been run through the reverse proxy.
4. Rollback has been tested against a known-good prior release.

Tunnel-based workstation exposure is legacy. It must not be the public production origin after cutover.
