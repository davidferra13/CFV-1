# ChefFlow Emergency Runbook

> For when things are broken and you need to fix them fast.
> Print this. Keep a copy outside the PC.

---

## 1. Everything Is Down (Full Recovery from Scratch)

**Prerequisites:** Windows PC with Docker Desktop, Node.js 20+, Git

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_REPO/CFv1.git
cd CFv1

# 2. Install dependencies
npm install

# 3. Start PostgreSQL
docker compose up -d
# Wait 10 seconds for container to be healthy

# 4. Restore from backup
bash scripts/verify-backup.sh backups/chefflow-LATEST.dump.gpg
bash scripts/restore-backup.sh backups/chefflow-LATEST.dump.gpg --confirm

# 5. Copy environment config
# Restore .env.local from your secure backup location
# Required vars: DATABASE_URL, AUTH_SECRET, STRIPE_SECRET_KEY, OLLAMA_BASE_URL

# 6. Build and start
npm run build
npm run start  # port 3000

# 7. Re-establish Cloudflare Tunnel
cloudflared tunnel run chefflow
# Or: configure via Cloudflare Zero Trust dashboard

# 8. Re-register scheduled tasks
powershell -ExecutionPolicy Bypass -File scripts\scheduled\register-all-tasks.ps1

# 9. Start watchdog
powershell -ExecutionPolicy Bypass -File chefflow-watchdog.ps1
```

---

## 2. Production Server Down (Port 3000)

```bash
# Check if the process is running
tasklist | findstr node

# Kill stale processes if needed
taskkill /F /IM node.exe

# Rebuild and restart
cd C:\Users\david\Documents\CFv1
npm run build
npm run start
```

The watchdog should handle this automatically. If it doesn't:

```bash
# Check watchdog log
tail -20 chefflow-watchdog.log

# Restart watchdog
powershell -ExecutionPolicy Bypass -File chefflow-watchdog.ps1
```

---

## 3. Database Down (PostgreSQL Docker)

```bash
# Check container status
docker ps -a --filter "name=chefflow_postgres"

# Restart container
docker restart chefflow_postgres

# If container is gone
docker compose up -d

# Verify connectivity
docker exec chefflow_postgres pg_isready -U postgres
```

---

## 4. Database Needs Restore

```bash
# List available generated backups
ls -lh backups/chefflow-*.dump*

# Verify checksum and dump readability first
bash scripts/verify-backup.sh backups/chefflow-FILENAME.dump.gpg

# Restore (DESTRUCTIVE: replaces database objects contained in the backup)
bash scripts/restore-backup.sh backups/chefflow-FILENAME.dump.gpg --confirm

# If off-site backup needed (requires rclone configured)
rclone copy r2:chefflow-backups/chefflow-LATEST.dump.gpg ./backups/
rclone copy r2:chefflow-backups/chefflow-LATEST.dump.gpg.manifest.json ./backups/
bash scripts/verify-backup.sh backups/chefflow-LATEST.dump.gpg
bash scripts/restore-backup.sh backups/chefflow-LATEST.dump.gpg --confirm
```

Point-in-time recovery requires a physical base backup plus WAL archive files. Use
`backups/basebackups/` and `backups/wal_archive/` only after WAL archiving has been activated by a
controlled PostgreSQL restart. Exact commands live in `docs/pitr-restore-runbook.md`.

To restore secrets and host configuration, decrypt the latest host config bundle:

```bash
gpg -o host-config.zip -d backups/host-config/chefflow-host-config-LATEST.zip.gpg
```

The bundle contains `.env.local`, selected `.auth` files, scheduled task XML exports, Docker config,
tunnel config when present, rclone config when present, and a git commit manifest.

---

## 5. Cloudflare Tunnel Down

```bash
# Check if cloudflared is running
tasklist | findstr cloudflared

# Restart tunnel
cloudflared tunnel run chefflow

# If tunnel config is lost: log into Cloudflare Zero Trust dashboard
# https://one.dash.cloudflare.com/ -> Access -> Tunnels -> chefflow
```

---

## 6. Ollama AI Down

```bash
# Check status
curl http://localhost:11434/api/tags

# Restart
taskkill /F /IM ollama.exe
"C:\Users\david\AppData\Local\Programs\Ollama\ollama.exe" serve

# Verify model available
curl http://localhost:11434/api/tags | jq '.models[].name'
```

---

## 7. Pi / OpenClaw Unreachable

```bash
# Ping Pi
ping 10.0.0.177

# SSH to Pi
ssh pi@10.0.0.177

# Check OpenClaw services on Pi
ssh pi@10.0.0.177 "systemctl status openclaw-*"

# If Pi won't connect: check USB tether, power, or connect via monitor
```

---

## 8. Scheduled Tasks Not Running

```powershell
# Check all ChefFlow tasks
Get-ScheduledTask | Where-Object { $_.TaskName -like "ChefFlow-*" -or $_.TaskName -like "OpenClaw*" } | Get-ScheduledTaskInfo

# Re-register all tasks
powershell -ExecutionPolicy Bypass -File scripts\scheduled\register-all-tasks.ps1

# Run a specific task manually
Start-ScheduledTask -TaskName "ChefFlow-DailyBackup"
```

---

## Critical Files to Back Up Externally

These files are needed to restore the entire system:

| File                          | Contains                             | Where to store securely           |
| ----------------------------- | ------------------------------------ | --------------------------------- |
| `.env.local`                  | All API keys, secrets, DB connection | Password manager or encrypted USB |
| `.auth/agent.json`            | Agent test account credentials       | Password manager                  |
| `.auth/developer.json`        | Developer account credentials        | Password manager                  |
| `backups/chefflow-*.dump.gpg` | Encrypted logical database dump      | Cloudflare R2 (automated)         |
| `backups/*.manifest.json`     | Backup checksum and metadata         | Cloudflare R2 (automated)         |
| `backups/basebackups/`        | Encrypted physical base backups      | Cloudflare R2 (automated)         |
| `backups/wal_archive/`        | WAL files for point-in-time recovery | Cloudflare R2 (automated)         |
| `backups/host-config/`        | Encrypted host and secrets bundle    | Cloudflare R2 (automated)         |
| Cloudflare Tunnel token       | Tunnel authentication                | Cloudflare dashboard (online)     |
| Stripe dashboard access       | Payment processing                   | stripe.com (online)               |
| Google OAuth credentials      | Auth provider                        | Google Cloud Console (online)     |
| Domain registrar access       | cheflowhq.com DNS                    | Registrar dashboard (online)      |

---

## Service Ports

| Port  | Service                  | Protocol |
| ----- | ------------------------ | -------- |
| 3000  | Production server        | HTTP     |
| 3100  | Dev server               | HTTP     |
| 11434 | Ollama AI                | HTTP     |
| 41937 | Mission Control / Gustav | HTTP     |
| 54322 | PostgreSQL               | TCP      |

---

## Contacts and Access

| What                 | Where                              |
| -------------------- | ---------------------------------- |
| Cloudflare Dashboard | https://dash.cloudflare.com        |
| Stripe Dashboard     | https://dashboard.stripe.com       |
| GitHub Repo          | https://github.com/YOUR_REPO       |
| Google Cloud Console | https://console.cloud.google.com   |
| Domain Registrar     | (your registrar for cheflowhq.com) |

> Update the GitHub repo URL and domain registrar above with actual values.

---

_Last updated: 2026-04-03_
