# Research: Dev / IT / System Admin Workflows

> **Date:** 2026-04-03
> **Perspective:** Solo Developer, System Administrator, DevOps
> **Status:** complete
> **Related:** `docs/scheduled-tasks.md`, `docs/research/infrastructure-audit.md`, `docs/emergency-runbook.md`

---

## Executive Summary

ChefFlow runs as a self-hosted production SaaS on a single Windows 11 Home machine, exposed via Cloudflare Tunnel, with PostgreSQL in Docker, scheduled tasks via Windows Task Scheduler, and a Raspberry Pi running a price-scraping data pipeline. This research examines five domains: solo developer operations, system administration, monitoring and observability, data pipeline operations, and security for food service platforms.

**Key finding:** ChefFlow's infrastructure is already more mature than most solo-developer SaaS operations. The 15-task scheduled system, automated backups with restore testing, health checks with dead-man's-switch pinging, and pre-commit secret scanning put it ahead of the typical one-person stack. The gaps that remain are specific and addressable: CI/CD automation, structured log aggregation, encrypted backups, and closing the last few network exposure items from the March 2026 security audit.

---

## 1. Solo Developer / Maintainer

### 1.1 How Solo Devs Maintain a Production SaaS

**Real workflows:**

The solo SaaS developer in 2025-2026 typically follows a pattern of "boring technology that wins": stable, well-documented tools where every problem has a Stack Overflow answer. The philosophy is to optimize for speed and reliability, not scale. Build for hundreds or thousands of users, not millions.

Deployment is continuous. The modern solo dev pushes to main, CI runs tests and builds, and the artifact deploys automatically. Feature flags gate risky changes per user or environment. The goal is multiple daily deployments with zero downtime and instant rollback capability.

For monitoring, the entry-level stack is Sentry (error tracking) plus UptimeRobot or Healthchecks.io (availability), plus whatever the hosting provider offers for server metrics. This covers 80% of operational needs at near-zero cost.

**ChefFlow's current position:**

ChefFlow's deployment model is manual but well-defined: `git add + commit + push` on main, then rebuild prod (`npm run prod`). The watchdog auto-restarts the prod server, Ollama, and Mission Control on logon. This is reliable for a single-machine setup.

**Breakpoints:**

- Manual deployment means the developer must be present to ship. If a critical bug is found at 2 AM, recovery requires the developer to wake up, SSH in or sit at the machine, and run commands.
- No automated test gate before production. A broken commit on main goes live immediately when rebuilt.
- Single point of failure: one machine, one person. If the developer is unavailable for 48+ hours, nothing ships and nothing gets fixed.

**Workarounds in use:**

- The watchdog script (`chefflow-watchdog.ps1`) handles process recovery automatically.
- The emergency runbook (`docs/emergency-runbook.md`) documents 8 recovery scenarios.
- Health checks run every 15 minutes with desktop alerts on failure.

**Missing pieces:**

- No CI/CD pipeline. A minimal GitHub Actions workflow (type check + build on push) would catch broken commits before they reach the machine.
- No staged rollout. Consider a "build on push, deploy on approval" model where the GitHub Action builds and the developer triggers deployment to the local machine via a webhook or scheduled pull.
- No on-call rotation (obviously, with one person), but no documented escalation either. What happens if the developer is on vacation and production goes down?

### 1.2 Tools for Uptime Monitoring, Error Tracking, Performance

**Industry standard free/cheap stack (2025-2026):**

| Layer              | Tool            | Cost                              | What it does                                |
| ------------------ | --------------- | --------------------------------- | ------------------------------------------- |
| Uptime             | UptimeRobot     | $0 (50 monitors, 5-min intervals) | External HTTP checks, status page           |
| Uptime             | Healthchecks.io | $0 (20 checks)                    | Dead-man's-switch (cron monitoring)         |
| Error tracking     | Sentry          | $0 (5K events/mo)                 | Client + server error capture, stack traces |
| Self-hosted uptime | Uptime Kuma     | $0 (open source)                  | Unlimited monitors, no vendor dependency    |
| APM/metrics        | Grafana Cloud   | $0 (limited free tier)            | Dashboards, metrics, basic alerting         |

**ChefFlow's current stack:**

- Health check script pings Healthchecks.io (dead-man's-switch, configured but env var not yet set).
- Health check monitors prod server, dev server, DB, Ollama, tunnel, disk, memory, CPU.
- Sentry is configured (`NEXT_PUBLIC_SENTRY_DSN` and `SENTRY_AUTH_TOKEN` in env).
- No external uptime monitor (UptimeRobot) yet.
- No Uptime Kuma instance.

**Recommendation:** Sign up for UptimeRobot and Healthchecks.io (already documented in `docs/specs/p1-ops-external-services-setup.md`). These are the highest-value, lowest-effort improvements remaining. Total time: ~20 minutes of browser-based setup.

### 1.3 Database Backup and Disaster Recovery

**Industry best practice (the 3-2-1 rule):**

Keep three copies of data, on two different storage types, with one copy off-site. Test restores monthly. A developer who open-sourced a PostgreSQL backup tool in 2025 did so after almost losing a $1,500/month project when a careless UPDATE destroyed production data and no fresh backups existed.

**ChefFlow's current state (strong):**

| Practice                  | Status   | Notes                                                                               |
| ------------------------- | -------- | ----------------------------------------------------------------------------------- |
| Automated daily backup    | Done     | `scripts/scheduled/daily-backup.ps1`, 3 AM, 7-day rotation                          |
| Backup via Docker pg_dump | Done     | Fixed from 0-byte bug in mid-March 2026                                             |
| Monthly restore test      | Done     | `scripts/scheduled/monthly-restore-test.ps1`, verified 9 chefs/18 clients/21 events |
| Off-site backup script    | Ready    | `scripts/scheduled/offsite-backup-sync.ps1`, requires R2 bucket creation            |
| Backup encryption         | Not done | Backups are plaintext SQL on local disk                                             |
| Backup monitoring         | Partial  | Size check (>100 bytes) but no content validation                                   |

**Breakpoints:**

- Plaintext backups on the same machine as the database. If the drive fails or the machine is stolen, both the live DB and all backups are gone.
- No encryption at rest. Anyone with filesystem access can read all client PII from backup files.

**Missing pieces:**

- Create the Cloudflare R2 bucket and configure rclone (15 min, $0).
- Add GPG or age encryption to the backup pipeline before writing to disk.
- Consider Databasus (open source, 400K+ Docker pulls as of March 2026) for continuous WAL archiving if point-in-time recovery becomes important.

### 1.4 CI/CD for One-Person Teams

**Industry reality (2025-2026):**

GitHub Actions is the default CI/CD for solo developers. As of January 2026, all Linux runners default to 4 vCPU / 16 GB RAM. Windows and macOS pricing decreased 15-25%. Queue times for Linux runners dropped 62% after the August 2025 architecture refresh.

A minimal solo-dev pipeline:

1. On push to main: run `tsc --noEmit`, run `next build --no-lint`
2. On success: create a build artifact or tag the commit as "green"
3. On failure: block and notify (email, Slack, or GitHub notification)

**ChefFlow's current state:**

No CI/CD pipeline exists. All testing is manual (`npm run typecheck:app`, `npm run build -- --no-lint`) run by Claude Code agents or the developer. The `docs/build-state.md` file tracks the last known green build manually.

**Recommendation:**

A minimal `.github/workflows/ci.yml` that runs type checking and build on push to main would catch broken commits before they reach the production machine. Cost would be minimal given the free tier (2,000 minutes/month for private repos). This does NOT replace the local build/deploy workflow; it adds a safety net.

### 1.5 Security Practices (Dependency Scanning, Secret Management)

**Industry landscape (2025-2026):**

GitGuardian's 2025 report found 23.8 million secrets leaked on public GitHub in 2024, a 25% jump year-over-year. The recommended layered defense:

1. **Pre-commit hooks** (first line): Gitleaks, git-secrets, ripsecrets, or detect-secrets
2. **Repository-level scans** (safety net): GitHub secret scanning (free for public repos, paid for private)
3. **Runtime secrets injection**: Move secrets out of .env files into a dedicated secrets manager

**ChefFlow's current state (good):**

- Pre-commit secret scanner installed (`.git/hooks/pre-commit`), catches API keys/tokens/passwords.
- Weekly secret scan (`scripts/scheduled/weekly-secret-scan.ps1`) as a secondary check.
- `.env.local` is gitignored. No `NEXT_PUBLIC_` prefix on sensitive keys.
- Stripe keys, Resend API key, Google OAuth secrets all in `.env.local`.

**Breakpoints:**

- If the pre-commit hook is bypassed (e.g., `--no-verify`), no server-side scan exists to catch it. GitHub's free secret scanning only works on public repos.
- All secrets live in a single `.env.local` file. No rotation schedule. No audit trail of who accessed what.

**Workaround:** The CLAUDE.md rule against `--no-verify` is a procedural guard, but not a technical one.

**Missing piece:** A GitHub Actions step that runs gitleaks or similar on every push would provide a server-side safety net, catching anything the local hook missed.

---

## 2. System Administration

### 2.1 Self-Hosted vs Cloud-Hosted Tradeoffs

**The 2025-2026 landscape:**

The self-hosted vs. cloud debate has shifted. Regulatory pressure (EU Digital Operational Resilience Act, January 2025; AI Act, full enforcement August 2026) is pushing enterprises toward self-hosted for sovereignty and control. Meanwhile, GitHub's analysis suggests self-hosted solutions cost roughly 5.25x more than cloud when accounting for operational overhead.

For ChefFlow specifically, the calculus is different from enterprise:

| Factor              | Self-hosted (current)                      | Cloud-hosted alternative                     |
| ------------------- | ------------------------------------------ | -------------------------------------------- |
| Monthly cost        | ~$15 (electricity + domain)                | $50-200 (Vercel/Railway/Render + managed DB) |
| Data sovereignty    | Complete (data never leaves the machine)   | Depends on provider region                   |
| Latency to local AI | <1ms (Ollama on same machine)              | Would require cloud GPU ($50-500/mo)         |
| Uptime guarantee    | None (Windows updates, power outages, ISP) | 99.9% typical SLA                            |
| Operational burden  | High (you are the sysadmin)                | Low (vendor handles infra)                   |
| Disaster recovery   | Manual (you manage backups)                | Automated (vendor snapshots)                 |

**ChefFlow's position is defensible:** The local Ollama requirement for PII-safe AI processing means a cloud migration would either require a cloud GPU service (expensive) or splitting the architecture (complex). The current approach of self-hosting with Cloudflare Tunnel for external access is a pragmatic middle ground.

**Key risk:** The single-machine, single-location architecture means a house fire, theft, or extended power/internet outage takes everything offline with no automatic failover.

### 2.2 Cloudflare Tunnel vs Traditional Reverse Proxy

**2025-2026 comparison:**

| Feature          | Cloudflare Tunnel          | Nginx reverse proxy                    |
| ---------------- | -------------------------- | -------------------------------------- |
| Port exposure    | Zero inbound ports needed  | Requires 80/443 open                   |
| DDoS protection  | Built-in, enterprise-grade | Requires CrowdSec/Fail2ban             |
| SSL certificates | Automatic provisioning     | Requires Let's Encrypt + renewal       |
| Latency overhead | 2-8ms (through CF edge)    | 2-8ms (local processing)               |
| HTTP/3           | Full support               | Requires Nginx 1.25+ and manual config |
| Cost             | $0 (free tier)             | $0 (open source) + VPS cost            |
| Control          | Limited (CF controls edge) | Full (you control everything)          |
| Debugging        | Opaque (CF metrics only)   | Full access to logs                    |

**ChefFlow's position:**

Cloudflare Tunnel is the right choice for this setup. It eliminates the need to open inbound ports on a residential ISP connection (where port 80/443 may be blocked anyway), provides free DDoS protection and SSL, and requires zero infrastructure beyond the `cloudflared` daemon.

**Breakpoint:** Cloudflare is a single vendor dependency. If Cloudflare has an outage or changes their free tier policy, the entire external access path breaks. The March 2026 infrastructure audit found Cloudflare `530` / `1033` errors during tunnel verification.

**Workaround:** The tunnel config in the Cloudflare dashboard provides some resilience (can be reconfigured without local changes). For true redundancy, a secondary path (Tailscale Funnel, or a cheap VPS with WireGuard) would provide failover, but the complexity may not justify the risk for a single-operator SaaS.

### 2.3 Windows as a Server OS: Gotchas

**Known issues for production workloads (2025-2026):**

1. **Forced restarts from Windows Update.** Windows 11 Home has limited update deferral. Active Hours only covers a 12-hour window. A forced restart kills all processes: prod server, dev server, Ollama, Docker containers, the Cloudflare Tunnel.

2. **WSL2 memory leak.** The `VmmemWSL` process (which runs Docker Desktop's WSL2 backend) can consume all physical memory over time. Docker with WSL2 can spike to 20GB+ during builds and idles at roughly 3GB. The `.wslconfig` file's `autoMemoryReclaim=gradual` setting (available in newer Windows builds) helps but does not fully solve the problem.

3. **Sleep/hibernate interruptions.** Windows 11 Home defaults to sleeping after inactivity. A production server that goes to sleep is a production server that's down. Power settings must be set to "Never sleep" for both plugged-in and battery.

4. **Path length limits.** Windows has a 260-character path limit by default. Deep `node_modules` paths can fail. The long path registry setting (`HKLM\SYSTEM\CurrentControlSet\Control\FileSystem\LongPathsEnabled = 1`) must be enabled.

5. **File locking.** Windows locks files that are in use. Hot-reloading, file watchers, and build tools can fail with "EBUSY" or "EPERM" errors when trying to overwrite locked files (common with `.next/` cache).

6. **Process management.** No built-in equivalent to `systemd` for service management. The watchdog script is a custom solution to a problem Linux solves natively.

**ChefFlow's mitigations:**

- Watchdog script (`chefflow-watchdog.ps1`) auto-restarts prod, Ollama, and Mission Control on logon.
- Health check every 15 minutes detects process deaths.
- `.next/` cache deletion is documented as a known fix for webpack errors.

**Missing:** No documentation of Windows power settings or update deferral configuration. These should be part of the emergency runbook or a setup guide.

### 2.4 Docker on Windows: Stability and Resource Usage

**Current state (2025-2026):**

Docker Desktop on Windows 11 Home uses WSL2 as its backend. Key facts:

- Idle memory consumption: ~3GB for the WSL2 VM plus Docker engine.
- Build-time spikes: can reach 20GB+ during image builds or heavy container workloads.
- Memory is not released back to Windows until WSL2 is shut down (unless `autoMemoryReclaim` is configured).
- Docker Desktop is generally stable with regular updates, but some builds have memory leak issues.

**ChefFlow's usage:** Docker runs only PostgreSQL (one container, `chefflow_postgres`). This is a light workload. The container itself uses minimal memory (~200-400MB for PostgreSQL with default settings). The overhead is almost entirely from the WSL2 VM.

**Recommendation:** Add `autoMemoryReclaim=gradual` to `.wslconfig` if not already set. This prevents the WSL2 VM from slowly consuming all available RAM over multi-day uptime.

### 2.5 Windows Task Scheduler vs Cron vs Systemd

**Comparison:**

| Feature              | Windows Task Scheduler                        | Cron (Linux)            | Systemd timers (Linux)             |
| -------------------- | --------------------------------------------- | ----------------------- | ---------------------------------- |
| Syntax               | GUI + XML                                     | `*/5 * * * *` one-liner | Unit files                         |
| Missed task recovery | "Run ASAP after missed start" option          | None (missed is missed) | `Persistent=true`                  |
| Logging              | Event Viewer (hard to parse)                  | syslog or custom        | journalctl (structured)            |
| Dependency chains    | Limited                                       | None                    | Full dependency graph              |
| Process monitoring   | Basic (exit code only)                        | None                    | Full lifecycle (restart, watchdog) |
| Reliability          | Generally reliable, but fragile on sleep/wake | Rock solid              | Rock solid + service management    |

**ChefFlow's implementation (15 tasks):**

The current schedule is well-designed with overnight, morning, and all-day windows. Tasks log to `logs/` with timestamps. The health check runs every 15 minutes.

**Breakpoints:**

- Task Scheduler's UI is dense and managing 15+ tasks through it is painful. The `register-all-tasks.ps1` script solves this elegantly.
- If the PC sleeps or hibernates, tasks scheduled during sleep are missed unless "Run as soon as possible after a scheduled start is missed" is enabled for each task.
- Task Scheduler has no built-in alerting for failed tasks. The health check catches downstream effects, but a task that fails silently (e.g., the backup script errors out) may not be noticed until the next integrity check.

**Missing:** Consider adding a simple "task health" check to the 15-minute health check script: verify that each critical task ran within its expected window by checking log file timestamps.

---

## 3. Monitoring and Observability

### 3.1 What Metrics Matter for a Food Service App

**Food service-specific metrics (beyond standard uptime/latency):**

| Metric                               | Why it matters                                                                                               | Current state                                                  |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| Response time for inquiry submission | 78% of clients book with the first business that responds. A slow or broken inquiry form means lost revenue. | Not measured                                                   |
| Email delivery rate                  | Quotes, confirmations, and payment requests go via email. A failed email is a failed business transaction.   | Resend has built-in analytics, but no monitoring integration   |
| Payment success rate                 | Stripe payment failures (card declined, 3DS timeout) directly affect revenue collection.                     | Not tracked                                                    |
| AI response time (Ollama)            | Remy and other AI features depend on Ollama latency. If Ollama is slow or down, multiple features degrade.   | Health check pings Ollama, but no latency tracking             |
| Price pipeline freshness             | Stale ingredient prices lead to incorrect food cost calculations and bad quoting.                            | Pipeline audit runs daily                                      |
| Backup success rate                  | Data loss is existential for a platform handling client PII and financial records.                           | Backup script checks file size, monthly restore test validates |

**Google's Four Golden Signals (already partially adopted in health check):**

1. **Latency:** Time to serve a request. Not currently measured.
2. **Traffic:** Request rate. Not currently measured.
3. **Errors:** Rate of failed requests. Sentry captures frontend/backend errors.
4. **Saturation:** How full the system is. Health check monitors disk, memory, CPU.

### 3.2 Free/Cheap Monitoring Stacks

**Recommended stack for ChefFlow (all $0):**

| Layer              | Tool                              | What it adds                                                |
| ------------------ | --------------------------------- | ----------------------------------------------------------- |
| External uptime    | UptimeRobot (free, 50 monitors)   | Checks `app.cheflowhq.com` from outside, alerts on downtime |
| Cron monitoring    | Healthchecks.io (free, 20 checks) | Dead-man's-switch for all 15 scheduled tasks                |
| Error tracking     | Sentry (already configured)       | Client + server errors with stack traces                    |
| Self-hosted uptime | Uptime Kuma (optional)            | Internal monitoring dashboard, unlimited checks             |

**What would require more investment (not recommended yet):**

| Tool           | Cost                                      | What it adds                                   | When to consider                               |
| -------------- | ----------------------------------------- | ---------------------------------------------- | ---------------------------------------------- |
| Grafana + Loki | $0 (self-hosted) but operational overhead | Structured log aggregation, search, dashboards | When log files become unmanageable (>10GB)     |
| Grafana Cloud  | $0 free tier                              | Hosted metrics + logs                          | When self-hosted monitoring becomes a burden   |
| Prometheus     | $0 (self-hosted)                          | Time-series metrics collection                 | When you need trend analysis over weeks/months |

**Recommendation:** UptimeRobot + Healthchecks.io first (20 min setup, $0). Loki/Grafana only when the current log file approach breaks down.

### 3.3 Log Management for Small Operations

**Current state:**

ChefFlow writes logs to `logs/` as flat files. Each scheduled task has its own log file with size rotation (1-2 MB max). The watchdog writes to `chefflow-watchdog.log` at the project root.

**When this breaks:**

- Searching across multiple log files for a specific error requires manual `grep`.
- No correlation between a health check failure and what happened in the application logs at the same time.
- No log retention policy beyond file rotation. Old log entries are lost when the file rotates.

**Lightweight improvement (no new infrastructure):**

Add a timestamp and severity prefix to all log output: `[2026-04-03T14:30:00Z] [ERROR] Backup failed: disk full`. This makes log files searchable and parseable without a log aggregation system.

**When to add Loki:**

When any of these become true: (a) more than 10 log files to monitor, (b) need to correlate events across services, (c) need to search logs older than one rotation cycle, (d) need alerting on log patterns (e.g., "3 backup failures in a row").

---

## 4. Data Pipeline Operations

### 4.1 Real-Time Pricing Data Pipelines in Food Tech

**Industry context (2025-2026):**

Commercial grocery price APIs (Actowiz, Foodspark, RealDataAPI) offer real-time pricing with customizable crawl frequencies (hourly, daily, weekly) and claim 99.9%+ accuracy. Quick commerce pricing adjusts 25-35% within hours based on inventory and demand.

**ChefFlow's approach (OpenClaw on Raspberry Pi):**

ChefFlow uses a custom-built data pipeline rather than commercial APIs:

- Raspberry Pi runs OpenClaw scrapers on cron schedules
- Data lands in SQLite (`prices.db`: 14 tables, 298MB, 162K prices, 54K ingredients)
- `scripts/openclaw-pull/pull.mjs` syncs Pi SQLite to local `openclaw.*` PostgreSQL tables
- Runs 5 times daily (6:00, 10:00, 14:00, 18:00, 22:00)
- Price resolution uses a 10-tier fallback chain (`lib/pricing/resolve-price.ts`)

**This is a strong custom implementation.** It avoids vendor lock-in, avoids per-query API costs, and keeps all pricing data under the developer's control.

### 4.2 SQLite to PostgreSQL Sync Patterns and Failure Modes

**Common failure modes:**

1. **Type mismatch:** SQLite's flexible typing vs PostgreSQL's strict typing. Booleans stored as 0/1 in SQLite need conversion. Text fields with unexpected content can violate PostgreSQL constraints.

2. **Network interruption mid-sync:** If the Pi-to-PC connection drops during a pull, partial data may be written. Without transactional sync, this creates inconsistent state.

3. **Schema drift:** If the SQLite schema on the Pi changes (new columns, renamed tables) without updating the pull script, the sync silently produces incomplete data or fails entirely.

4. **Clock skew:** If the Pi and PC clocks diverge, timestamp-based "sync only new records" logic may miss records or duplicate them.

5. **Constraint violations:** Foreign key references that exist in SQLite may not have corresponding records in PostgreSQL if the sync order is wrong (e.g., syncing prices before syncing ingredients).

**ChefFlow's mitigations:**

- Post-sync validation compares SQLite vs PostgreSQL record counts (added in the April 2026 infrastructure improvements).
- Pipeline audit runs daily (`scripts/scheduled/daily-pipeline-audit.ps1`).

**Missing pieces:**

- No transactional guarantee on the sync. If `pull.mjs` fails mid-run, partial writes are not rolled back.
- No schema version tracking between Pi and PC. A schema change on either side can silently break the pipeline.
- No checksums or hash-based validation (row counts catch gross failures but miss subtle data corruption).

### 4.3 Data Validation to Catch Pipeline Drift

**Best practices from the SQLite-to-PostgreSQL migration literature:**

1. **Row count comparison** (already done): `SELECT COUNT(*)` on both sides after sync.
2. **Sample data verification**: Select N random rows from both sides and compare field values.
3. **Referential integrity check**: Verify all foreign keys resolve after sync.
4. **Type casting validation**: Ensure no silent type coercion (e.g., a price stored as text in SQLite being cast to numeric in PostgreSQL).
5. **Freshness check**: Verify the most recent record timestamp is within expected bounds (e.g., if the last price update is >24 hours old, alert).

**Recommendation:** Add a freshness check to the daily pipeline audit. If the newest price record in PostgreSQL is older than expected given the sync schedule, flag it. This catches the case where the Pi scraper has stopped collecting new data but the sync itself still "succeeds" (syncing stale data).

---

## 5. Security for Food Service Platforms

### 5.1 PII Handling for Client Data

**Regulatory context (2025-2026):**

Food service platforms collect sensitive data categories:

| Data type                                      | Sensitivity level     | Regulatory treatment                              |
| ---------------------------------------------- | --------------------- | ------------------------------------------------- |
| Client names, contact info                     | Standard PII          | CCPA, state privacy laws                          |
| Dietary restrictions, allergies                | **Health data**       | GDPR Article 9 (special category), HIPAA-adjacent |
| Payment information                            | Financial PII         | PCI DSS                                           |
| Event details (dates, locations, guest counts) | Business data         | Standard privacy                                  |
| Recipes                                        | Intellectual property | Trade secret law                                  |

**The allergy data question is critical:** Under GDPR, allergy and dietary information constitutes health data, which is a "special category" requiring explicit consent and enhanced protection. The California ADMT transparency requirements (effective January 1, 2026) add new obligations for platforms that use automated decision-making with personal data.

**ChefFlow's current state:**

- All AI processing of client PII routes through Ollama (local, never to third-party cloud). This is the strongest possible position for data sovereignty.
- Gemini is used only for non-PII tasks (technique lists, kitchen specs, generic themes).
- No data leaves the machine except via Cloudflare Tunnel (encrypted) and Resend (emails only).
- No explicit consent mechanism for allergy data collection (the form collects it, but there is no checkbox saying "I consent to my dietary information being stored").

**Missing:**

- No data retention policy. Client data persists indefinitely. GDPR requires defined retention periods.
- No data deletion workflow. If a client requests their data be deleted (GDPR Article 17, "right to be forgotten"), there is no documented process.
- No explicit consent for health-category data (allergies, dietary restrictions).
- These are low-priority while ChefFlow operates in the US with a small user base, but become blocking if any EU-based clients use the platform.

### 5.2 Payment Data Security (PCI for Small Operators)

**Stripe's role:**

Stripe is PCI Level 1 certified. When using Stripe Checkout or Stripe Elements (hosted payment fields), the cardholder's payment data never touches ChefFlow's servers. This reduces PCI scope to SAQ A (the simplest self-assessment questionnaire).

**What ChefFlow must still do:**

1. **Never handle raw card numbers.** Stripe Checkout and Elements handle this. As long as ChefFlow never passes card data through its own API, scope remains minimal.
2. **Complete SAQ A annually.** This is a short self-assessment (~20 questions). Cost: $0.
3. **Use HTTPS everywhere.** Cloudflare Tunnel provides this for external traffic. Internal traffic (localhost) is HTTP, which is acceptable since it never leaves the machine.
4. **Keep Stripe keys secure.** Currently in `.env.local` (gitignored), no `NEXT_PUBLIC_` prefix. This is correct.

**Breakpoint:** If ChefFlow ever implements a custom payment form that sends card numbers to its own server (instead of using Stripe Elements), PCI scope explodes to SAQ D, requiring annual assessments costing $1,000-$10,000+. Never do this.

**Current status:** SAQ A self-assessment is listed as P3 (future, low priority) in `docs/scheduled-tasks.md`. This is appropriate.

### 5.3 API Security for Self-Hosted Platforms

**OWASP API Security Top 10 (2023, still current through 2025-2026):**

1. Broken Object Level Authorization (BOLA)
2. Broken Authentication
3. Broken Object Property Level Authorization
4. Unrestricted Resource Consumption
5. Broken Function Level Authorization
6. Unrestricted Access to Sensitive Business Flows
7. Server-Side Request Forgery (SSRF)
8. Security Misconfiguration
9. Improper Inventory Management
10. Unsafe Consumption of APIs

**ChefFlow's posture:**

| Risk                      | Status    | Notes                                                                             |
| ------------------------- | --------- | --------------------------------------------------------------------------------- |
| BOLA                      | Mitigated | Tenant scoping on every query (`tenant_id` / `chef_id` from session)              |
| Broken auth               | Mitigated | Auth.js v5 with JWT sessions, `requireChef()`/`requireClient()` gates             |
| Rate limiting             | Missing   | No rate limiting on API routes or server actions                                  |
| SSRF                      | Low risk  | No user-supplied URLs are fetched server-side (except Ollama, which is localhost) |
| Security misconfiguration | Partial   | Network exposure issues documented in March 2026 audit                            |
| Input validation          | Partial   | Zod schemas on most server actions, but the March audit found gaps                |

**Critical gap: no rate limiting.** An attacker who discovers the API can send unlimited requests. For a self-hosted platform behind Cloudflare Tunnel, Cloudflare's WAF rate limiting rules (free tier includes basic rules) provide the first defense. Application-level rate limiting (e.g., `next-rate-limit` or a simple in-memory counter) would add depth.

**Recommendation:** Enable Cloudflare WAF rate limiting rules in the Cloudflare dashboard. This is a configuration change, not a code change, and provides immediate protection against brute-force and abuse.

---

## 6. ChefFlow-Specific Gap Analysis

### What ChefFlow already does well (ahead of typical solo-dev SaaS):

1. 15 automated scheduled tasks covering backup, cleanup, integrity, security, health, and pipeline operations
2. Monthly backup restore testing (most solo devs never test restores)
3. Dead-man's-switch health check pattern (Healthchecks.io integration ready)
4. Pre-commit secret scanning
5. Emergency runbook with 8 recovery scenarios
6. PII-safe AI architecture (all sensitive data processed locally via Ollama)
7. Separation of scraping infrastructure (Pi) from application infrastructure (PC)

### Priority gaps to close:

| Priority | Gap                                               | Effort | Cost | Impact                                                |
| -------- | ------------------------------------------------- | ------ | ---- | ----------------------------------------------------- |
| **P1**   | Sign up for UptimeRobot + Healthchecks.io         | 20 min | $0   | External uptime monitoring, cron dead-man's-switch    |
| **P1**   | Create Cloudflare R2 bucket for off-site backups  | 15 min | $0   | Off-machine backup (the last copy of the 3-2-1 rule)  |
| **P1**   | Enable Cloudflare WAF rate limiting               | 10 min | $0   | Basic API abuse protection                            |
| **P2**   | Add minimal CI/CD (GitHub Actions: tsc + build)   | 30 min | $0   | Catch broken commits before they reach production     |
| **P2**   | Encrypt backups at rest (GPG/age)                 | 30 min | $0   | Protect PII in backup files                           |
| **P2**   | Add `.wslconfig` with `autoMemoryReclaim=gradual` | 5 min  | $0   | Prevent Docker/WSL2 memory leak over multi-day uptime |
| **P3**   | Add pipeline freshness check                      | 15 min | $0   | Detect stale pricing data from Pi                     |
| **P3**   | Add task-health check to 15-min health script     | 20 min | $0   | Detect silently failed scheduled tasks                |
| **P3**   | Document Windows power/update settings            | 10 min | $0   | Prevent sleep/restart-related outages                 |
| **P3**   | Complete Stripe SAQ-A self-assessment             | 30 min | $0   | PCI compliance documentation                          |

### What to NOT do (diminishing returns for a solo operator):

- Do not set up Prometheus + Grafana + Loki yet. The log file approach works for the current scale.
- Do not add a second machine or cloud failover. The complexity is not justified for the current user base.
- Do not implement a full secrets manager (Vault, AWS Secrets Manager). `.env.local` with pre-commit scanning is sufficient.
- Do not build a custom deployment pipeline with webhooks, artifact staging, and canary deploys. Push-to-main with manual rebuild is reliable enough.

---

## Sources

- [Complete Tech Stack for Solo SaaS Development 2025](https://solodevstack.com/blog/complete-tech-stack-saas-solo-2025)
- [The solo dev SaaS stack powering $10K/month Micro-SaaS tools in 2025](https://dev.to/dev_tips/the-solo-dev-saas-stack-powering-10kmonth-micro-saas-tools-in-2025-pl7)
- [SaaS vs Self-Hosted ERP: The Real Comparison for 2026](https://oec.sh/blog/saas-vs-self-hosted-erp)
- [Why 2026 Is the Year Enterprises Move From SaaS to Self-Hosted](https://iomete.com/resources/blog/why-2026-enterprises-move-saas-to-selfhosted-lakehouses)
- [Tailscale Funnel vs Cloudflare Tunnel vs Nginx Reverse Proxy 2025](https://onidel.com/blog/tailscale-cloudflare-nginx-vps-2025)
- [Say Goodbye to Reverse Proxy and Hello to Cloudflare Tunnels](https://noted.lol/say-goodbye-to-reverse-proxy-and-hello-to-cloudflare-tunnels/)
- [VPS Hosting in 2026: Windows vs Linux for Stability](https://windowsnews.ai/article/vps-hosting-in-2026-windows-vs-linux-for-stability-control-and-performance.408470)
- [Docker Desktop Using Too Much Memory (VmmemWSL)](https://blog.devops.dev/docker-desktop-using-too-much-memory-vmmemwsl-cause-and-solution-0a54998ab65a)
- [How to Configure Docker Desktop Memory and CPU Limits on Windows](https://oneuptime.com/blog/post/2026-02-08-how-to-configure-docker-desktop-memory-and-cpu-limits-on-windows/view)
- [JAMS: Cron vs Task Scheduler vs SQL Agent Comparison](https://www.jamsscheduler.com/blog/native-scheduler-showdown-breaking-automation-task-scheduler-sql-agent-cron/)
- [UptimeRobot: Free Website Monitoring](https://uptimerobot.com/)
- [Uptime Kuma: Self-Hosted Monitoring](https://uptimekuma.org/)
- [Grafana Loki: Log Aggregation](https://grafana.com/oss/loki/)
- [PostgreSQL Docker backup strategies](https://dev.to/piteradyson/postgresql-docker-backup-strategies-how-to-backup-postgresql-running-in-docker-containers-1bla)
- [Databasus: PostgreSQL backup tool](https://databasus.com/)
- [Implementing PostgreSQL Replication and Automated Cloud Backups Using Docker and Rclone](https://dev.to/bharat_solanke_8e45411fa6/implementing-postgresql-replication-and-automated-cloud-backups-using-docker-and-rclone-115)
- [PowerSync v1.0: Postgres to SQLite Sync Layer](https://www.powersync.com/blog/introducing-powersync-v1-0-postgres-sqlite-sync-layer)
- [Restaurant Data Privacy: Best Practices 2025](https://www.fishbowl.com/blog/restaurant-data-privacy)
- [PII Compliance Checklist 2025](https://www.sentra.io/learn/pii-compliance-checklist)
- [Stripe PCI DSS Compliance Guide](https://stripe.com/guides/pci-compliance)
- [Stripe Integration Security Guide](https://docs.stripe.com/security/guide)
- [Why companies that use Stripe still need PCI compliance](https://www.vanta.com/resources/why-companies-that-use-stripe-still-need-pci-compliance)
- [API Security: The Complete 2025 Guide](https://www.aikido.dev/blog/api-security-guide)
- [10 Essential REST API Security Best Practices for 2025](https://group107.com/blog/rest-api-security-best-practices/)
- [Cloudflare WAF Rate Limiting Best Practices](https://developers.cloudflare.com/waf/rate-limiting-rules/best-practices/)
- [Why 28 million credentials leaked on GitHub in 2025](https://snyk.io/articles/state-of-secrets/)
- [Secret Scanning Tools 2026](https://blog.gitguardian.com/secret-scanning-tools/)
- [Git Workflows for Solo Developers 2026](https://dasroot.net/posts/2026/03/git-workflows-solo-developers-content-creators/)
- [Build a CI/CD Pipeline with GitHub Actions 2026](https://tech-insider.org/github-actions-ci-cd-pipeline-tutorial-2026/)
