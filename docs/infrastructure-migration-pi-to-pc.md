# Infrastructure Migration: Raspberry Pi to PC

**Date:** 2026-03-06
**Branch:** `feature/risk-gap-closure`

## What Changed

The beta server (`beta.cheflowhq.com`) moved from a Raspberry Pi 5 (8GB) to the developer's PC (Ryzen 9, 128GB).

## Why

The app outgrew the Pi:

- Builds required 6GB heap + 2GB swap on an 8GB machine (took 8-10 min)
- Ollama was permanently disabled (not enough RAM for app + LLM)
- Beta testers couldn't use AI features (Remy, lead scoring, recipe parsing)
- 10+ scripts existed solely to manage memory pressure and OOM recovery
- The Pi was a constant source of friction with no unique value it provided

## New Architecture

```
PC localhost:3100           ->  Development (next dev)
PC localhost:3200           ->  Beta (next start, Cloudflare Tunnel -> beta.cheflowhq.com)
Vercel (app.cheflowhq.com) ->  Production
```

All three environments now run from the PC. The Cloudflare Tunnel runs as a Windows service. The beta server auto-starts via Windows Task Scheduler.

## What Was Deleted

11 scripts that existed only because the Pi struggled:

- `pi-memory-guardian.sh` - escalating OOM kill actions
- `pi-watchdog.sh` - Ollama health monitoring
- `pi-health-check.sh` - app crash recovery
- `pi-safeguard-install.sh` - systemd service installer
- `pi-setup.sh` - initial Pi provisioning
- `pi-ssh.sh` - SSH helper
- `fix-pi-oom.sh` - emergency OOM recovery
- `restart-pi-servers.ps1` - remote restart from PC
- `beta-serve.sh` - old beta serve script
- `beta-serve.ps1` - old beta serve script (Windows)
- `ecosystem.config.cjs` - PM2 config for Pi

## What Was Rewritten

- `scripts/deploy-beta.sh` - was 295 lines (SSH, remote build). Now ~100 lines (local rsync, local build)
- `scripts/rollback-beta.sh` - was SSH-based rollback. Now redeploys previous commit locally
- `.cloudflared/config.yml` - port changed from 3100 to 3200
- `.env.local.beta` - Ollama now uses PC's full model (qwen3-coder:30b)
- `package.json` - beta scripts updated
- `docs/beta-server-setup.md` - full rewrite
- `CLAUDE.md` - 3-environment section, deploy instructions updated
- `scripts/launcher/server.mjs` - removed all SSH/Pi dependencies, updated to local beta monitoring

## What Was Added

- `scripts/start-beta.ps1` - Windows Task Scheduler auto-start script

## Pi Status

Shelved. No new role assigned. If a use case emerges (NAS, home automation, CI runner), the Pi is ready.

## External Monitoring

UptimeRobot free tier monitors `app.cheflowhq.com` and `beta.cheflowhq.com` from multiple global locations.
