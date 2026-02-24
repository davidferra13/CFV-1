# ChefFlow Beta Server — Setup & Operations Guide

## Architecture Overview

ChefFlow uses a 3-environment deployment model:

```
Developer's PC (localhost:3100)     →  Development / active coding
Raspberry Pi 5 (beta.cheflowhq.com) →  Beta testing / stable snapshot
Vercel (app.cheflowhq.com)          →  Production / public launch
```

### How It Works

- **Development (PC):** `npm run dev` on localhost:3100. Only the developer sees this.
- **Beta (Pi):** A frozen production build served via Cloudflare Tunnel. Updated only when the developer runs `deploy-beta`. Beta testers get a stable experience.
- **Production (Vercel):** Deployed when the app is ready for public release.

---

## Hardware

|            | Development (PC)            | Beta (Raspberry Pi 5) |
| ---------- | --------------------------- | --------------------- |
| CPU        | AMD Ryzen 9 7900X (12c/24t) | ARM Cortex-A76 (4c)   |
| RAM        | 128 GB DDR5                 | 8 GB                  |
| Storage    | 3.5 TB (NVMe SSD)           | 128 GB microSD        |
| Network    | WiFi 7 (1.2 Gbps)           | WiFi                  |
| Always on? | No                          | Yes                   |

---

## Accessing the Pi

```bash
ssh pi
# Uses ~/.ssh/config (user: davidferra, key: ~/.ssh/id_ed25519)
# NEVER use pi@raspberrypi with password
```

---

## Deploying to Beta

From the PC, run:

```bash
bash scripts/deploy-beta.sh
```

This script:

1. Pushes your current branch to GitHub
2. Pulls the latest code on the Pi
3. Copies the beta `.env.local`
4. Backs up the current build
5. Stops Ollama → installs deps → builds → restarts Ollama
6. Restarts the app via PM2
7. Verifies with a health check

### Rolling Back

If a deploy breaks the beta:

```bash
bash scripts/rollback-beta.sh
```

This restores the previous `.next` build and restarts PM2.

---

## Environment Config

The beta environment uses `.env.local.beta` (in the project root). Key differences from dev:

| Variable               | Dev (PC)                | Beta (Pi)                    |
| ---------------------- | ----------------------- | ---------------------------- |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3100` | `https://beta.cheflowhq.com` |
| `NEXT_PUBLIC_APP_URL`  | `http://localhost:3100` | `https://beta.cheflowhq.com` |
| `OLLAMA_MODEL`         | `qwen3-coder:30b`       | `qwen3:8b`                   |
| `DEMO_MODE_ENABLED`    | `true`                  | `false`                      |
| `STRIPE_*`             | Dev keys                | Empty (no payments on beta)  |

---

## Services Running on Pi

| Service            | Auto-starts? | Command                              |
| ------------------ | ------------ | ------------------------------------ |
| ChefFlow app (PM2) | Yes          | `pm2 restart chefflow-beta`          |
| Cloudflare Tunnel  | Yes          | `sudo systemctl restart cloudflared` |
| Ollama             | Yes          | `sudo systemctl restart ollama`      |

### Checking Status

```bash
ssh pi 'pm2 status'                    # App status
ssh pi 'pm2 logs chefflow-beta'        # App logs
ssh pi 'sudo systemctl status cloudflared'  # Tunnel status
ssh pi 'sudo systemctl status ollama'  # Ollama status
```

---

## Maintenance

### Log Rotation

PM2 logs are automatically rotated via `pm2-logrotate`:

- Max file size: 10 MB
- Retention: 5 files

### Security Updates

Unattended security updates are enabled on the Pi. To manually update:

```bash
ssh pi 'sudo apt update && sudo apt upgrade -y'
```

### Swap Space

The Pi has 2 GB swap configured at `/var/swap` to support the Next.js build process.

### Build Notes

- **Must stop Ollama before building** — the build uses ~2-4 GB RAM, Ollama uses ~5 GB
- Build uses `NODE_OPTIONS="--max-old-space-size=4096"` for 4 GB heap
- The deploy script handles this automatically

---

## Troubleshooting

| Problem             | Fix                                                             |
| ------------------- | --------------------------------------------------------------- |
| Beta site is down   | `ssh pi 'pm2 restart chefflow-beta'`                            |
| Tunnel is down      | `ssh pi 'sudo systemctl restart cloudflared'`                   |
| Build OOM           | Ensure Ollama is stopped: `ssh pi 'sudo systemctl stop ollama'` |
| Auth redirect fails | Check `NEXT_PUBLIC_SITE_URL` in Pi's `.env.local`               |
| Google OAuth fails  | Ensure `beta.cheflowhq.com` callback is in Google Cloud Console |
| SD card full        | `ssh pi 'pm2 flush && sudo apt clean'`                          |

---

## Future Improvements

- [ ] Separate Supabase project for beta (isolated database)
- [ ] Ethernet connection for Pi (more reliable than WiFi)
- [ ] USB SSD for Pi (better than microSD for long-term server use)
- [ ] UptimeRobot monitoring for beta.cheflowhq.com
- [ ] Stripe test mode webhooks on beta
