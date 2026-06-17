# Build State

**Status:** PRODUCTION
**Deployed:** 2026-06-17 EST
**URL:** https://app.cheflowhq.com
**Commit:** `347464681`
**Check:** `tsc --noEmit --skipLibCheck` PASS (requires `--max-old-space-size=8192`)

## Production Infrastructure

- **Host:** Windows 11, self-hosted
- **App server:** Next.js on port 3100, managed by PM2 (`chefflow-prod`)
- **Database:** PostgreSQL via Docker (`chefflow_postgres`) on port 54322, 1167 tables, 1086 migrations
- **Tunnel:** Cloudflare tunnel `chefflow-prod` (ID: `9dab6929-68e3-4775-9b8e-17482f714e83`), HTTP2 protocol, managed by PM2 (`cloudflare-tunnel`)
- **Config:** `~/.cloudflared/chefflow-prod.yml`
- **Auto-restart:** PM2 resurrect via Windows Startup folder (`pm2-resurrect.bat`)
- **Docker:** `restart: unless-stopped` on PostgreSQL container

## Domains

- `app.cheflowhq.com` - primary app (CNAME to tunnel)
- `cheflowhq.com` - root domain (existing A record, tunnel catch-all serves it)
- `www.dfprivatechef.com` / `dfprivatechef.com` - legacy domain routing
- `inbox.cheflowhq.com` - email inbox (port 3977)
- `mc.cheflowhq.com` - mission control (port 41937)
