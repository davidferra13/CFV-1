# ChefFlow Beta Server - Setup & Operations Guide

## Architecture Overview

ChefFlow uses a 3-environment deployment model, all on the developer's PC:

```
PC localhost:3100           ->  Development (next dev, hot reload, active coding)
PC localhost:3200           ->  Beta (next start, Cloudflare Tunnel -> beta.cheflowhq.com)
Vercel (app.cheflowhq.com) ->  Production (deployed when ready)
```

### How It Works

- **Development (port 3100):** `npm run dev` with hot reload. Only the developer sees this.
- **Beta (port 3200):** A frozen production build served via Cloudflare Tunnel. Updated only when the developer runs `npm run beta:deploy`. Beta testers get a stable experience at `beta.cheflowhq.com`.
- **Production (Vercel):** Deployed when the app is ready for public release.

### Why Everything Is on One Machine

All three environments run on the developer's PC (128GB RAM, AMD Ryzen). Builds take ~2 min, Ollama runs alongside beta, and beta testers see the full app including all AI features.

---

## Directory Structure

```
C:\Users\david\Documents\CFv1\        ->  Source code (dev work)
C:\Users\david\Documents\CFv1-beta\   ->  Beta build (synced from CFv1, has its own .next and node_modules)
```

The beta directory is a separate copy to prevent the beta server from interfering with the dev server's `.next` folder, `node_modules`, or hot file changes.

---

## Deploying to Beta

From the project root:

```bash
npm run beta:deploy
# or
bash scripts/deploy-beta.sh
```

This script:

1. Pushes current branch to GitHub (backup)
2. Runs a database backup (non-blocking)
3. Syncs code from CFv1 to CFv1-beta (rsync, excludes .next/node_modules/.git)
4. Copies `.env.local.beta` as the beta `.env.local`
5. Installs dependencies (cached, fast)
6. Builds (`next build`, ~2 min on PC)
7. Restarts the beta server on port 3200
8. Health check to verify it's running

### Rolling Back

```bash
bash scripts/rollback-beta.sh
```

Stashes uncommitted work, checks out the previous commit, redeploys, then restores your working directory. With 2-minute builds, this is faster than managing backup directories.

---

## Environment Config

Beta uses `.env.local.beta` (in the project root). Key differences from dev:

| Variable               | Dev (PC)                | Beta (PC)                    |
| ---------------------- | ----------------------- | ---------------------------- |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3100` | `https://beta.cheflowhq.com` |
| `NEXT_PUBLIC_APP_URL`  | `http://localhost:3100` | `https://beta.cheflowhq.com` |
| `OLLAMA_MODEL`         | `qwen3-coder:30b`       | `qwen3-coder:30b`            |
| `OLLAMA_MODEL_FAST`    | `qwen3:4b`              | `qwen3:4b`                   |
| `DEMO_MODE_ENABLED`    | `true`                  | `false`                      |
| `STRIPE_*`             | Dev keys                | Empty (no payments on beta)  |

Both dev and beta share the same Ollama instance on `localhost:11434`.

---

## Services Running on PC

| Service           | Port  | Auto-starts? | How                                                           |
| ----------------- | ----- | ------------ | ------------------------------------------------------------- |
| Cloudflare Tunnel | n/a   | Yes          | Windows service (`cloudflared service install`)               |
| Beta server       | 3200  | Yes          | Windows Task Scheduler runs `scripts/start-beta.ps1` on login |
| Ollama            | 11434 | Yes          | Ollama's own Windows service                                  |
| Dev server        | 3100  | No           | Manual: `npm run dev`                                         |
| Mission Control   | 41937 | No           | Manual: `npm run dashboard`                                   |

### Quick Commands

```bash
npm run beta:deploy     # Build + deploy to beta
npm run beta:restart    # Restart beta server
npm run beta:logs       # View beta server logs
npm run beta:status     # Check if beta is responding
```

---

## Cloudflare Tunnel

The tunnel routes `beta.cheflowhq.com` to `localhost:3200`.

- **Config:** `.cloudflared/config.yml`
- **Tunnel ID:** `f48ab139-b448-4fd9-a431-bcf6b09902f0`
- **Credentials:** `C:\Users\david\.cloudflared\f48ab139-b448-4fd9-a431-bcf6b09902f0.json`
- **Runs as:** Windows service (auto-starts on boot)

---

## Troubleshooting

| Problem               | Fix                                                          |
| --------------------- | ------------------------------------------------------------ |
| Beta site is down     | `npm run beta:restart`                                       |
| Tunnel is down        | Restart cloudflared Windows service                          |
| Auth redirect fails   | Check `NEXT_PUBLIC_SITE_URL` in `.env.local.beta`            |
| Ollama not responding | Check Ollama Windows service, or run `ollama serve` manually |

---

## External Monitoring

- **UptimeRobot** (free tier) monitors both `app.cheflowhq.com` and `beta.cheflowhq.com`
- Alerts via email on downtime
- Checks from multiple global locations (not dependent on home network)
