# PC ↔ Pi Infrastructure Audit

**Date:** 2026-02-28
**Branch:** `feature/risk-gap-closure`
**Purpose:** Document the current communication architecture between the development PC and the Raspberry Pi 5 beta server, assess against modern standards, and identify improvements.

---

## Current Architecture Summary

```
PC (localhost:3100)  ──SSH/LAN──▶  Pi (beta.cheflowhq.com)
     │                                    │
     │  git push                          │  git fetch + reset
     ▼                                    ▼
  GitHub  ◀────────────────────────────  GitHub
                                          │
                                          ▼
                                   Cloudflare Tunnel
                                          │
                                          ▼
                                   beta.cheflowhq.com
```

---

## Network Layer

| Detail     | Value                                             | Assessment                                           |
| ---------- | ------------------------------------------------- | ---------------------------------------------------- |
| Protocol   | SSH over LAN (TCP)                                | Standard                                             |
| Pi address | `10.0.0.177` (static IP)                          | Good — mDNS was unreliable, static is more robust    |
| Auth       | Ed25519 key (`~/.ssh/id_ed25519`)                 | Modern — Ed25519 is the current recommended key type |
| SSH alias  | `ssh pi` via `~/.ssh/config`                      | Clean                                                |
| Keepalive  | `ServerAliveInterval=15`, `ServerAliveCountMax=4` | Tight — detects drops in ~60s                        |
| Latency    | 3-7ms                                             | Excellent for LAN                                    |
| Pi network | Hardwired Ethernet to router                      | Reliable                                             |
| PC network | WiFi 7 @ 1.2 Gbps (two floors from router)        | Fast, acceptable                                     |

---

## Communication Channels (4 total)

### 1. Deploy Pipeline (`scripts/deploy-beta.sh`)

8-step pipeline, all over SSH:

1. Pre-flight SSH connectivity check
2. `git push` to GitHub from PC
3. Stop Ollama on Pi (safety — it's masked, but script handles both cases)
4. `ssh pi` → `git fetch origin && git reset --hard` (code comes via GitHub, not direct transfer)
5. `scp` copies `.env.local.beta` → Pi's `.env.local`
6. Backup current `.next/` build, stop PM2, run `npm install` + `next build` (6 GB heap)
7. Restart PM2 via `ecosystem.config.cjs` (1.5 GB heap cap)
8. Health check with 3 retries (curl `localhost:3100`, expects 200/302/307)

**Key files:**

- `scripts/deploy-beta.sh`
- `.env.local.beta` (env config source)
- `ecosystem.config.cjs` (PM2 config on Pi)

### 2. Rollback (`scripts/rollback-beta.sh`)

Single SSH session:

- Swaps `.next.backup` back into `.next`
- Restarts PM2
- Health check

### 3. Mission Control Live Monitoring (`scripts/launcher/server.mjs`)

Persistent SSH connections for real-time streaming:

- **PM2 logs:** `ssh pi 'pm2 logs chefflow-beta --raw'`
- **Cloudflare Tunnel logs:** `ssh pi 'journalctl -u cloudflared -f'`
- **Infra health** (on-demand via `/api/infra`): `ssh pi 'free -m; uptime; systemctl is-active ...'`
- **Ollama status:** HTTP check to `http://10.0.0.177:11434` (confirms it's down — masked)

### 4. Cloudflare Tunnel (Pi ↔ Cloudflare)

- `cloudflared` runs as a systemd service on Pi
- Maintains outbound tunnel to Cloudflare edge
- `beta.cheflowhq.com` CNAME → tunnel
- PC has no role — this is Pi ↔ Cloudflare directly
- Auto-starts on boot (`cloudflared.service` enabled)

---

## OOM Protection (already applied)

Script `scripts/fix-pi-oom.sh` hardened the Pi:

- Ollama permanently masked (`systemctl mask`)
- sshd OOM-protected (`OOMScoreAdjust=-900`)
- cloudflared OOM-protected (`OOMScoreAdjust=-800`)
- zram swap enabled (4 GB compressed)
- Hardware watchdog enabled (`bcm2835_wdt`, 15s timeout)
- Result: RAM usage dropped from ~6.5 GB to ~1.0 GB

---

## Overall Assessment

**Verdict: Standard and solid.** SSH + key auth, git-based deploys, PM2 process management, Cloudflare Tunnel — all industry-standard patterns for a self-hosted staging server.

---

## Improvements Identified

### Priority 1 — Worth Doing (real risk or significant quality-of-life)

#### 1.1 Separate Beta Database

- **Risk:** Dev and beta share the same Supabase instance. A stray mutation on beta can corrupt dev data and vice versa.
- **Fix:** Create a second Supabase project (free tier) for beta. Update `.env.local.beta` to point to the new project. Run migrations against it separately.
- **Effort:** Low (Supabase setup + env change + migrate)
- **Status:** Already noted as a TODO in project docs

#### 1.2 Zero-Downtime Deploys

- **Problem:** PM2 stops for the entire build (~8-10 min of downtime on beta).
- **Fix:** Build into a staging directory (e.g., `.next-staging`), then atomic swap:
  ```bash
  # Build into separate dir
  NEXT_BUILD_DIR=.next-staging npx next build
  # Atomic swap
  mv .next .next-old && mv .next-staging .next
  pm2 restart chefflow-beta
  # Cleanup
  rm -rf .next-old
  ```
- **Result:** Beta stays live during build, only ~2s downtime for PM2 restart.
- **Effort:** Medium (modify `deploy-beta.sh`, test on Pi)

#### 1.3 Build Caching

- **Problem:** Every deploy does `rm -rf .next` and rebuilds from scratch (~8-10 min). Next.js supports incremental builds via `.next/cache`.
- **Fix:** Preserve `.next/cache` between deploys instead of nuking the entire `.next` directory. Only clear `.next` (minus cache) before building.
  ```bash
  # Preserve cache
  mv .next/cache /tmp/next-cache-backup 2>/dev/null
  rm -rf .next
  mkdir -p .next
  mv /tmp/next-cache-backup .next/cache 2>/dev/null
  ```
- **Result:** Build time could drop from 8-10 min to 2-4 min. Less RAM pressure during build.
- **Effort:** Low (modify `deploy-beta.sh`)
- **Note:** The current `rm -rf .next` was added to fix `next-flight-client-entry-loader` errors when switching branches. Cache preservation may reintroduce those errors — test carefully.

### Priority 2 — Nice-to-Have (low risk, quality-of-life)

#### 2.1 Uptime Monitoring

- **Problem:** No alerting if Pi goes down. You discover it when you try to deploy or visit beta.
- **Fix:** Free external service (e.g., UptimeRobot, Betterstack) pinging `https://beta.cheflowhq.com` every 5 min. Email/SMS alert on failure.
- **Effort:** Minimal (5-minute signup + add URL)

#### 2.2 PM2 Log Rotation

- **Problem:** PM2 logs grow unbounded on the Pi's 128 GB microSD.
- **Fix:** `pm2 install pm2-logrotate` on Pi. Default config caps logs at 10 MB with 30 rotations.
  ```bash
  ssh pi 'pm2 install pm2-logrotate'
  ssh pi 'pm2 set pm2-logrotate:max_size 10M'
  ssh pi 'pm2 set pm2-logrotate:retain 5'
  ```
- **Effort:** One command

### Priority 3 — Not Worth It at Current Scale

#### 3.1 CI/CD (GitHub Actions)

- Deploys happen a few times a week manually. Automating with GitHub Actions would add YAML configuration, self-hosted runner setup on Pi (or SSH action), and secrets management — all for marginal time savings.
- **Revisit when:** Deploy frequency increases significantly or more team members need to deploy.

#### 3.2 Docker on Pi

- Containerization adds memory overhead (~200-500 MB) on an 8 GB device already tight on RAM. The current PM2 setup handles process management, restarts, and memory caps well.
- **Revisit when:** Multiple services need to run on the Pi or dependency isolation becomes a problem.

#### 3.3 Wired Ethernet for PC

- PC is on WiFi 7 two floors from router. Running Ethernet cable across three floors isn't practical. 3-7ms latency is already excellent — wired would shave maybe 1-2ms.
- **Not worth the physical effort.**

---

## Reference: Key Files

| File                          | Purpose                                                   |
| ----------------------------- | --------------------------------------------------------- |
| `scripts/deploy-beta.sh`      | Full deploy pipeline (PC → GitHub → Pi → build → restart) |
| `scripts/rollback-beta.sh`    | Emergency rollback to previous build                      |
| `scripts/launcher/server.mjs` | Mission Control server (live log streaming, infra health) |
| `scripts/fix-pi-oom.sh`       | One-time Pi OOM hardening (already applied)               |
| `.env.local.beta`             | Beta environment config (copied to Pi during deploy)      |
| `~/.ssh/config`               | SSH config for `pi` alias                                 |
| `docs/beta-server-setup.md`   | Pi setup documentation                                    |
| `docs/beta-hosting.md`        | Cloudflare Tunnel documentation                           |
