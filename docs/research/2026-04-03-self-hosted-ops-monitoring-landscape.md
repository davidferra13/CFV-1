# Self-Hosted Ops & Monitoring Landscape Research

**Date:** 2026-04-03
**Agent:** Research (Claude Opus 4.6)
**Scope:** How solo developers handle production monitoring, scheduled maintenance, and operational automation for self-hosted apps. Cross-referenced against ChefFlow's current 13-task Windows Task Scheduler setup (~$0.90/month).

---

## Executive Summary

ChefFlow's current automation setup is well ahead of what most solo developers run. The 13-task Windows Task Scheduler system with health checks, backup rotation, secret scanning, and AI-assisted environment sync covers more surface area than the typical indie dev setup. The main gaps are: (1) no off-machine backup copy, (2) no dead-man's-switch monitoring for the scheduled tasks themselves, (3) no disk/memory/CPU threshold alerting, and (4) no automated restore testing. All four are fixable at near-zero cost.

---

## 1. Self-Hosting Monitoring Patterns

### What Solo Devs Actually Use

The self-hosting community (r/selfhosted, Hacker News, IndieHackers) converges on a small set of tools:

| Tool                                      | Type                              | Cost                                    | Adoption                                             |
| ----------------------------------------- | --------------------------------- | --------------------------------------- | ---------------------------------------------------- |
| **Uptime Kuma**                           | Self-hosted uptime monitor        | Free (runs on $3-5/mo VPS or locally)   | 60K+ GitHub stars, dominant in self-hosting          |
| **UptimeRobot**                           | SaaS uptime monitor               | Free tier: 50 monitors, 5-min intervals | Most common "just works" choice                      |
| **Healthchecks.io**                       | Dead-man's-switch / cron monitor  | Free tier: 20 checks                    | Best for monitoring that scheduled jobs actually run |
| **Beszel**                                | Lightweight server metrics        | Free, self-hosted                       | Emerging favorite: <10MB RAM per agent               |
| **Better Stack (formerly Better Uptime)** | SaaS uptime + incident management | Free tier available                     | Growing in indie dev space                           |

**The typical indie dev setup:** UptimeRobot free tier (external ping) + maybe Uptime Kuma if they're self-hosting enthusiasts. Most solo devs have no monitoring at all beyond "users tell me it's down."

**What ChefFlow has vs. the field:** ChefFlow's watchdog already checks 5 services every 15 minutes. This is more comprehensive than what 80%+ of solo devs run. The gap is that the watchdog itself has no external monitor: if the PC reboots and Task Scheduler doesn't fire, nobody knows.

### Recommendation

**Adopt (high priority):** Healthchecks.io free tier as a dead-man's-switch. Each scheduled task pings a Healthchecks.io URL on successful completion. If the ping stops arriving, Healthchecks.io sends an email alert. This is the missing "who watches the watchmen?" layer. Zero cost, 20-minute setup, covers all 13 tasks.

**Consider (low priority):** Beszel agent for system-level metrics (CPU, memory, disk, temperature). Single Go binary, <10MB RAM. Would give historical graphs and threshold alerts for disk space and memory, which the current setup doesn't track.

**Skip:** Uptime Kuma (you'd need to run it somewhere other than the same PC, defeating the purpose), Grafana/Prometheus/Loki stack (massive overkill for one server).

---

## 2. Windows Task Scheduler vs. Alternatives

### The Landscape

| Approach                               | Pros                                                      | Cons                                                                            |
| -------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **Windows Task Scheduler** (current)   | Native, no dependencies, survives reboots, runs as SYSTEM | Clunky UI, verbose XML config, no built-in alerting, no dashboard               |
| **WSL2 cron**                          | Familiar Linux syntax, easy to write                      | WSL2 must be running, doesn't auto-start on boot reliably, separate environment |
| **PM2**                                | Process manager with restart/log, ecosystem file          | Designed for long-running processes not scheduled tasks, Node dependency        |
| **NSSM (Non-Sucking Service Manager)** | Wraps any exe as a Windows service                        | For services not scheduled tasks                                                |
| **VisualCron**                         | GUI scheduler with advanced triggers                      | Paid ($200+), overkill for solo use                                             |

### Pain Points Specific to Windows Task Scheduler

1. **No native "every 5 minutes" syntax** - requires "repeat every 5 minutes for 1 day" within a daily trigger, unlike cron's simple `*/5 * * * *`
2. **Silent failures** - tasks can fail and nobody knows unless you check Event Viewer
3. **No centralized dashboard** - must open Task Scheduler MMC snap-in to see status
4. **PowerShell execution policy** - can block scripts if not configured correctly
5. **User session dependency** - some tasks need "Run whether user is logged on or not" with stored credentials

### What ChefFlow Should Do

**Keep Windows Task Scheduler.** It's the right tool for this job. It's native, survives reboots, runs as SYSTEM, and has zero dependencies. The pain points are real but mitigable:

- **Silent failures** - solved by adding Healthchecks.io pings (see Section 1)
- **No dashboard** - the watchdog log + Healthchecks.io dashboard covers this
- **Execution policy** - already handled in ChefFlow's setup

**Don't switch to WSL2 cron.** WSL2 doesn't auto-start reliably on Windows boot. You'd need a Windows Task Scheduler task to start WSL2, which is circular. Keep it simple.

---

## 3. Database Backup Strategies

### The Spectrum

| Level              | Strategy                                                  | RPO               | Cost                    | Effort |
| ------------------ | --------------------------------------------------------- | ----------------- | ----------------------- | ------ |
| **Minimum viable** | Daily pg_dump + local 7-day rotation                      | 24 hours          | $0                      | Low    |
| **Good**           | Daily pg_dump + upload to cloud (R2/S3/B2)                | 24 hours          | ~$0 (within free tiers) | Low    |
| **Better**         | pg_dump + WAL archiving + cloud upload                    | Minutes           | $1-5/mo                 | Medium |
| **Gold standard**  | Databasus or pgBackRest + cloud + automated restore tests | Minutes, verified | $5-10/mo                | Medium |

### What Solo Devs Actually Do

Most solo devs with self-hosted PostgreSQL: daily pg_dump with local rotation. That's it. A disturbing number do nothing at all. Almost nobody tests restores regularly.

The emerging tool is **Databasus** (400K+ Docker pulls, 6.1K GitHub stars as of March 2026). It wraps pg_dump in a web UI with scheduling, compression, multi-destination storage (local, S3, R2, Google Drive, SFTP), AES-256-GCM encryption, retention policies, and health monitoring. Single Docker container, Apache 2.0 license. It also supports WAL archiving for point-in-time recovery.

### Cloud Storage Costs for Backups

| Provider          | Free Tier                       | Paid Rate    | Egress              |
| ----------------- | ------------------------------- | ------------ | ------------------- |
| **Cloudflare R2** | 10GB storage, 1M Class A ops/mo | $0.015/GB/mo | **$0 always**       |
| **Backblaze B2**  | 10GB storage                    | $0.006/GB/mo | Free via Cloudflare |
| **AWS S3**        | 5GB for 12 months               | $0.023/GB/mo | $0.09/GB            |

**R2 is the clear winner** for a self-hosted setup already using Cloudflare Tunnel. Zero egress fees means restore-testing is free. 10GB free tier easily covers daily pg_dump of a production ChefFlow database.

### How Often Do People Test Restores?

The honest answer from community discussions: almost never. The recommendation from every DBA guide: monthly at minimum, quarterly at absolute minimum. The practical solo dev approach: automate it. Script a monthly job that restores the latest backup to a scratch database, runs a count query, and reports success/failure.

### What ChefFlow Has vs. What's Missing

**Current:** Daily pg_dump with 7-day local rotation. This is the "minimum viable" tier.

**Missing (ranked by priority):**

1. **Off-machine backup copy** - if the PC's disk fails, all 7 backups are gone. Upload to R2 (free). This is the single highest-value improvement in this entire report.
2. **Automated restore test** - monthly script that restores to a temp database and validates. Catches silent corruption.
3. **Backup size monitoring** - alert if backup size drops dramatically (sign of data loss) or grows unexpectedly.

---

## 4. AI-Assisted Monitoring (Emerging Pattern)

### Is This Novel?

Using Claude Code CLI for scheduled environment analysis is a genuinely novel approach as of early 2026. The pattern is emerging but not yet mainstream:

- **Claude Code's official /loop and /schedule features** were released in late 2025/early 2026, enabling scheduled prompt execution. The official docs describe use cases like deployment monitoring and PR babysitting.
- **runCLAUDErun** (macOS-only) is a third-party scheduler for Claude Code tasks.
- **LLM-based log anomaly detection** is being researched in academia (AIOps) and by APM vendors, but most implementations use fine-tuned models, not general-purpose API calls.
- **MCP (Model Context Protocol)** is enabling LLMs to query observability data directly, which is the enterprise version of what ChefFlow does more simply.

**ChefFlow's approach** (Windows Task Scheduler fires Claude Code CLI with Haiku model for ~$0.03/run to analyze environment drift) is ahead of the curve. Most solo devs aren't using LLMs for ops automation at all. The ones who are tend to use Claude Code's built-in /loop, which is session-scoped (dies when you close the terminal). Using Task Scheduler for persistent scheduling is more robust.

### Where AI Monitoring Is Heading

1. **Log anomaly detection** - LLMs can catch novel error patterns that regex rules miss. Academic research confirms LLMs outperform traditional methods for previously-unseen anomaly types.
2. **Root cause analysis** - feed an LLM the last N minutes of logs during an incident and get a probable cause analysis.
3. **Drift detection** - exactly what ChefFlow already does with the daily environment sync check.

### Recommendation

**Keep the current approach.** $0.03/day for AI-assisted environment sync is excellent value. Consider extending it to:

- Weekly "deep health audit" prompt that checks for things like stale dependencies, disk usage trends, backup integrity
- Post-incident analysis (on-demand, not scheduled)

---

## 5. Health Check Best Practices

### What Production Monitoring Actually Checks

Most self-hosters check only HTTP status (is the site up?). Production-grade monitoring checks much more:

| Check                      | What It Catches                               | ChefFlow Status                              |
| -------------------------- | --------------------------------------------- | -------------------------------------------- |
| HTTP 200 response          | App is serving                                | Covered (prod + dev checks)                  |
| Database connectivity      | DB is reachable                               | Covered (PostgreSQL Docker check)            |
| Database query latency     | Slow queries, connection exhaustion           | **Not covered**                              |
| Disk space (>20% free)     | Imminent disk full crash                      | **Not covered**                              |
| Memory usage               | Memory leaks, OOM risk                        | **Not covered**                              |
| CPU usage                  | Runaway processes                             | **Not covered**                              |
| SSL/TLS certificate expiry | Certificate lapses                            | N/A (Cloudflare handles this)                |
| DNS resolution             | Domain stops resolving                        | **Not covered** (but Cloudflare manages DNS) |
| Docker container status    | Container crashed but Docker is fine          | Partially covered (checks PostgreSQL)        |
| Tunnel connectivity        | Cloudflare Tunnel dropped                     | Covered (tunnel check)                       |
| Backup recency             | Last backup is stale                          | **Not covered**                              |
| Node.js process memory     | Next.js memory leak (known issue with v14-16) | **Not covered**                              |
| Response time (p95/p99)    | Performance degradation                       | **Not covered**                              |

### Next.js-Specific Concerns

Next.js 14-16 have documented memory leak issues in production, especially with the fetch API and standalone output mode. Multiple GitHub issues report 9GB+ RAM usage requiring server restarts. For a self-hosted Next.js app, monitoring Node.js heap usage is important.

### What to Add (Priority Order)

1. **Disk space check** - PowerShell one-liner: alert if any drive drops below 20% free. Catches log growth, backup accumulation, .next cache bloat.
2. **Memory usage check** - Monitor total system RAM and Node.js process memory. Alert above 85% system or 2GB per Node process.
3. **Backup recency check** - Verify the most recent backup file is <26 hours old and >0 bytes.
4. **Response time check** - Time the health check HTTP requests. Alert if >5 seconds (early warning of degradation).

---

## 6. Cost-Efficient Monitoring for Solo Developers

### Typical Monthly Spend

| Tier                     | Monthly Cost | What You Get                                                      |
| ------------------------ | ------------ | ----------------------------------------------------------------- |
| **Most solo devs**       | $0           | Nothing. They find out from users.                                |
| **Basic**                | $0           | UptimeRobot free (50 monitors) + Healthchecks.io free (20 checks) |
| **Good**                 | $0-5         | Above + Uptime Kuma on a cheap VPS ($3-5)                         |
| **ChefFlow current**     | ~$0.90       | Windows Task Scheduler + AI env sync (Haiku)                      |
| **ChefFlow recommended** | ~$0.90       | Same + Healthchecks.io free + R2 free tier                        |
| **Overkill for solo**    | $20-50+      | Datadog/New Relic/Better Stack paid tiers                         |

### Free Tier Tools Worth Using

| Tool                       | Free Tier                   | Use Case                                            |
| -------------------------- | --------------------------- | --------------------------------------------------- |
| **Healthchecks.io**        | 20 checks                   | Dead-man's-switch for all scheduled tasks           |
| **UptimeRobot**            | 50 monitors, 5-min interval | External uptime ping (independent of your PC)       |
| **Cloudflare R2**          | 10GB storage                | Off-machine backup storage                          |
| **GitHub Secret Scanning** | Free for all repos          | Passive secret detection                            |
| **Sentry**                 | 5K errors/mo                | Error tracking (if you want frontend error capture) |

**ChefFlow's $0.90/month is remarkably efficient.** Adding Healthchecks.io + UptimeRobot + R2 keeps the total at $0.90/month while closing the three biggest gaps (external monitoring, task monitoring, off-machine backups).

---

## 7. What Breaks in Self-Hosted Setups

### Most Common Failure Modes (Ranked by Frequency)

Based on r/selfhosted, r/homelab, Hacker News, and Docker community forums:

1. **Disk space exhaustion** - Logs, Docker images, backups, and build artifacts accumulate silently. The #1 killer. ChefFlow mitigates this with daily stale artifact cleanup but doesn't alert on low disk.

2. **Docker container crashes** - OOM kills, corrupted volumes, platform mismatches. Docker's `--restart=unless-stopped` policy handles most cases, but silent data corruption can occur if PostgreSQL is killed mid-write. **Check:** Does the ChefFlow PostgreSQL container have a restart policy set?

3. **Memory leaks in long-running processes** - Next.js 14-16 have documented fetch-related memory leaks. Node.js processes can grow to multi-GB over days/weeks. Without monitoring, this manifests as sudden OOM crashes.

4. **SSL certificate expiry** - Not a concern for ChefFlow (Cloudflare manages certs), but the #4 cause of "my site is down" posts on r/selfhosted.

5. **Tunnel/VPN disconnects** - Cloudflare Tunnel can drop and not reconnect. `cloudflared` should auto-reconnect, but network changes, Windows updates, or `cloudflared` crashes can break this. ChefFlow checks this every 15 minutes, which is good.

6. **Windows Updates rebooting the machine** - Can interrupt running processes, break Docker, and require re-authentication. Task Scheduler's "on logon" triggers help, but there's a window between reboot and login.

7. **Database connection exhaustion** - PostgreSQL has a default `max_connections` of 100. Long-running connections from Next.js server actions, cron jobs, and the dev server can exhaust the pool. Not currently monitored.

8. **DNS propagation / expiry** - Domain registrar expires, DNS records change. Less relevant with Cloudflare managing everything, but the domain itself could lapse.

### What ChefFlow Should Watch For That It Isn't

1. **Disk space** (see Section 5)
2. **Node.js heap size** (see Section 5)
3. **PostgreSQL connection count** - `SELECT count(*) FROM pg_stat_activity` in the health check
4. **Docker container restart count** - `docker inspect --format='{{.RestartCount}}'` detects restart loops
5. **Backup file size** - dramatic drop = data loss; dramatic growth = something writing excessively

---

## 8. Secrets Management and Rotation

### What Solo Devs Actually Do

Most: nothing. Secrets live in `.env.local`, `.env`, or even committed to git. The bar is low.

### Minimum Viable Security Posture

| Layer                      | Tool                         | Cost               | Effort                            |
| -------------------------- | ---------------------------- | ------------------ | --------------------------------- |
| **Pre-commit scanning**    | Gitleaks                     | Free, OSS          | 5-minute setup as git hook        |
| **CI/repo scanning**       | GitHub Secret Scanning       | Free for all repos | Enable in repo settings           |
| **Deep scan (historical)** | TruffleHog                   | Free, OSS          | Run once to scan full git history |
| **Scheduled scanning**     | Weekly secret scan (current) | $0                 | Already implemented               |

### Key Facts (2025 Data)

- 28 million credentials were leaked on GitHub in 2025 (Snyk research)
- Gitleaks (25.7K GitHub stars) is the most popular pre-commit scanner; fast enough that developers don't notice it
- TruffleHog's unique feature is **live credential verification**: it tests whether leaked keys still work, covering 800+ secret types
- The community consensus is to use Gitleaks for pre-commit (speed) and TruffleHog for periodic deep scans (thoroughness)

### What ChefFlow Has vs. What's Missing

**Current:** Weekly secret scan via Task Scheduler. Good.

**Consider adding:**

1. **Gitleaks pre-commit hook** - catches secrets before they enter git history. Much easier to handle than after-the-fact detection.
2. **One-time TruffleHog historical scan** - scan the full git history once to find any previously committed secrets. If the repo goes public (even briefly), this matters.

---

## 9. Log Management Patterns

### The Spectrum

| Approach                          | Tools                           | Cost               | Practical for Solo?                         |
| --------------------------------- | ------------------------------- | ------------------ | ------------------------------------------- |
| **Local files + rotation**        | logrotate / PowerShell rotation | $0                 | Yes, and it's what most do                  |
| **Lightweight aggregation**       | Loki + Grafana                  | Free (self-hosted) | Borderline - real operational overhead      |
| **LoggiFly**                      | Pattern-based log notifications | Free, self-hosted  | Yes - lightweight alternative to full stack |
| **Cloud logging**                 | Datadog, Logtail, Axiom         | $0-25/mo           | Easy but adds cost and external dependency  |
| **Structured JSON logs + search** | Pino/Winston + local jq queries | $0                 | Practical, low overhead                     |

### What ChefFlow Should Do

**Keep local log files with rotation.** The watchdog already rotates its own log at 1MB. This is pragmatic and appropriate for a one-server setup.

**Don't adopt Loki/Grafana.** The operational overhead of running a monitoring stack (Loki + Grafana + Promtail/Alloy + potentially Minio for storage) on the same machine you're monitoring is a net negative for a solo developer. You're adding failure modes, not reducing them.

**Consider:** LoggiFly for pattern-based alerting on specific log lines (e.g., "FATAL", "OOM", "connection refused"). It's a single container that watches log files and sends notifications when patterns match. Low overhead, high signal.

---

## 10. Emerging Patterns Worth Adopting

### Tools and Approaches from 2025-2026

| Pattern                          | Tool/Approach                    | Relevance                                  | Adopt?                          |
| -------------------------------- | -------------------------------- | ------------------------------------------ | ------------------------------- |
| **Dead-man's-switch monitoring** | Healthchecks.io                  | High - monitors the monitors               | **Yes, immediately**            |
| **Off-machine backups to R2**    | pg_dump + rclone/aws-cli to R2   | High - disaster recovery                   | **Yes, immediately**            |
| **Lightweight system metrics**   | Beszel                           | Medium - fills disk/RAM/CPU gap            | Consider                        |
| **Automated restore testing**    | Monthly scripted pg_restore      | Medium - validates backups work            | Yes, schedule monthly           |
| **AI-assisted ops**              | Claude Code CLI scheduled tasks  | Already doing this (ahead of curve)        | Keep, possibly extend           |
| **Pre-commit secret scanning**   | Gitleaks hook                    | Medium - prevents leaks at source          | Yes, one-time setup             |
| **Managed backup tool**          | Databasus                        | Medium - wraps pg_dump in UI + multi-dest  | Consider when backup needs grow |
| **Claude Code /schedule**        | Built-in persistent scheduling   | Low - Windows Task Scheduler already works | Skip (redundant)                |
| **Full observability stack**     | Grafana + Prometheus + Loki      | Low - massive overhead for one server      | **Skip**                        |
| **Upright (Basecamp)**           | Open-source synthetic monitoring | Low - interesting but nascent              | Watch                           |
| **MCP-based observability**      | LLM queries telemetry directly   | Low - enterprise pattern, premature        | Watch                           |

### The Basecamp Connection

Basecamp released **Upright** in 2025, an open-source synthetic monitoring tool that runs health probes from multiple geographic sites and reports via Prometheus. Interesting for multi-site setups but overkill for a single-server deployment.

---

## Prioritized Recommendations

### Tier 1: Do Now (Zero Cost, High Impact)

1. **Add Healthchecks.io dead-man's-switch** - Each of the 13 scheduled tasks pings a unique Healthchecks.io URL on success. Free tier covers all 13. If any task stops running, you get an email. 20-minute setup.

2. **Add off-machine backup to Cloudflare R2** - After the daily pg_dump, upload the compressed backup to R2. Free tier (10GB, zero egress). If the PC's disk dies, you have a copy. 30-minute setup with rclone or aws-cli.

3. **Add disk space check to watchdog** - PowerShell: `Get-PSDrive C | Where-Object { $_.Free / $_.Used -lt 0.2 }`. Alert in the watchdog log and optionally via Healthchecks.io signal. 10-minute addition.

4. **Add UptimeRobot external ping** - Free tier, point it at `app.cheflowhq.com`. Independent of your PC entirely. Catches Cloudflare Tunnel drops, ISP outages, and PC-is-off scenarios that the watchdog can't detect. 5-minute setup.

### Tier 2: Do Soon (Near-Zero Cost, Medium Impact)

5. **Add memory/process monitoring to watchdog** - Check system RAM usage and Node.js process heap. Alert above thresholds. Catches Next.js memory leaks before they crash the server.

6. **Add backup validation** - Check that the most recent backup file exists, is <26 hours old, and is >1KB. Add to the daily health check.

7. **Install Gitleaks pre-commit hook** - One-time setup, catches secrets before they enter git history.

8. **Monthly automated restore test** - Script that restores latest backup to a temp database, runs `SELECT count(*) FROM events`, drops the temp database. Scheduled monthly via Task Scheduler.

9. **Verify Docker restart policy** - Ensure the PostgreSQL container has `--restart=unless-stopped`. This is a one-line check that prevents data loss from Docker crashes.

### Tier 3: Consider Later (Low Cost, Lower Impact)

10. **Beszel agent** - For historical system metrics graphs and threshold alerts. Useful but not urgent given the watchdog checks.

11. **PostgreSQL connection count monitoring** - Add `SELECT count(*) FROM pg_stat_activity` to the health check. Catches connection exhaustion before it causes failures.

12. **Databasus** - When backup complexity grows (multiple databases, WAL archiving, multi-destination), Databasus is the right upgrade path. Premature now with a single database and daily dumps.

13. **TruffleHog one-time historical scan** - Run once against the full git history. Important if the repo ever becomes public.

### What to Skip

- **Grafana/Prometheus/Loki** - operational overhead exceeds value for a single server
- **Switching from Task Scheduler to WSL2 cron** - WSL2 doesn't auto-start reliably; Task Scheduler is the right tool on Windows
- **PM2 for scheduled tasks** - PM2 is a process manager, not a scheduler
- **VisualCron or enterprise schedulers** - $200+ for features you don't need
- **Sentry/Datadog/New Relic** - paid tiers are overkill; free tiers add external dependencies for marginal benefit
- **Claude Code /schedule** - Task Scheduler already does this more reliably on Windows

---

## Sources

### Self-Hosted Monitoring

- [Uptime Kuma - GitHub](https://github.com/louislam/uptime-kuma)
- [Uptime Kuma - DEV Community](https://dev.to/mdismail_e830c2c4f43ae37/-uptime-kuma-the-ultimate-self-hosted-uptime-monitoring-tool-1pnj)
- [11 Best Uptime Monitoring Tools 2026 - UptimeRobot](https://uptimerobot.com/knowledge-hub/monitoring/11-best-uptime-monitoring-tools-compared/)
- [Cheapest Way to Self-Host Uptime Kuma 2026 - DEV](https://dev.to/vikasprogrammer/the-cheapest-way-to-self-host-uptime-kuma-in-2026-3l2c)
- [Beszel - Lightweight Server Monitoring](https://beszel.dev/)
- [Beszel Feature Review - XDA](https://www.xda-developers.com/beszel-feature/)
- [Beszel - Homelab Monitoring](https://akashrajpurohit.com/blog/beszel-selfhosted-server-monitoring-solution/)

### Windows Task Scheduler

- [Cron Job Windows Automation Guide](https://serverscheduler.com/blog/cron-job-windows)
- [Task Scheduler Alternatives 2026](https://research.aimultiple.com/alternative-to-task-scheduler/)
- [Windows Task Scheduler - Cronitor](https://cronitor.io/directory/windows-task-scheduler)
- [Windows Forum - Task Scheduler Alternatives](https://windowsforum.com/threads/best-task-scheduler-alternatives-for-windows-z-cron-robointern-task-till-dawn-robotask.378781/)

### Database Backup

- [PostgreSQL Backup to S3 - DEV Community](https://dev.to/finny_collins/postgresql-backup-to-s3-how-to-store-your-database-backups-in-the-cloud-b8f)
- [Top 7 pg_dump Backup Strategies - DEV Community](https://dev.to/dmetrovich/top-7-pgdump-backup-strategies-for-production-grade-postgresql-10k0)
- [Databasus - PostgreSQL Backup Tool](https://databasus.com/)
- [Databasus - GitHub](https://github.com/databasus/databasus)
- [Top 5 PostgreSQL Backup Tools 2026](https://medium.com/@rostislavdugin/top-5-postgresql-backup-tools-in-2025-82da772c89e5)
- [Cloudflare R2 Pricing](https://developers.cloudflare.com/r2/pricing/)
- [Cloudflare R2 Free Tier Guide](https://dev.to/yeagoo/cloudflare-r2-hands-on-guide-set-up-free-10gb-storage-zero-egress-object-storage-and-325n)
- [PostgreSQL Disaster Recovery - pgEdge](https://www.pgedge.com/blog/8-steps-to-proactively-handle-postgresql-database-disaster-recovery)
- [PostgreSQL Disaster Recovery - Tiger Data](https://www.tigerdata.com/blog/database-backups-and-disaster-recovery-in-postgresql-your-questions-answered)

### AI-Assisted Monitoring

- [LLMs for Log Anomaly Detection - ARCsoft](https://arcsoft.uvic.ca/log/2025-10-17-llm-for-log-anomaly-detection/)
- [Claude Code Scheduled Tasks - Official Docs](https://code.claude.com/docs/en/scheduled-tasks)
- [Claude Code + Cron Automation Guide](https://smartscope.blog/en/generative-ai/claude/claude-code-cron-schedule-automation-complete-guide-2025/)
- [Claude Code Scheduled Tasks Guide 2026](https://claudefa.st/blog/guide/development/scheduled-tasks)
- [AI-Powered Predictive Maintenance with MCP](https://medium.com/@luigigianpio.dimaggio/building-an-ai-powered-predictive-maintenance-system-with-model-context-protocol-and-claude-1b0ed588e574)
- [AIOps for Log Anomaly Detection - ScienceDirect](https://www.sciencedirect.com/science/article/pii/S2667305325001346)

### Health Check Best Practices

- [Server Monitoring Checklist 2025 - ManageEngine](https://www.manageengine.com/network-monitoring/blog/server-monitoring-checklist.html)
- [Complete Health Checks - Medium](https://medium.com/@tbobm/complete-health-checks-and-why-they-matter-8b2120d86e4f)
- [Health Checks Guide - Better Stack](https://betterstack.com/community/guides/monitoring/health-checks/)
- [Docker Health Check Best Practices](https://oneuptime.com/blog/post/2026-01-30-docker-health-check-best-practices/view)
- [Database Health Checks - USAVPS](https://usavps.com/blog/database-health-checks/)

### Cost & Indie Dev Patterns

- [100 Tools Indie Hackers Use 2025 - Calmops](https://calmops.com/indie-hackers/100-tools-indie-hackers-2025/)
- [Self-Hosting like it's 2025 - Hacker News](https://news.ycombinator.com/item?id=43544979)
- [Healthchecks.io](https://healthchecks.io/)
- [Healthchecks.io Pricing](https://healthchecks.io/pricing/)
- [Healthchecks.io vs Cronitor](https://healthchecks.io/docs/healthchecks_cronitor_comparison/)

### Common Failure Modes

- [6 Problems Self-Hosting on NAS - XDA](https://www.xda-developers.com/nas-self-hosting-headaches/)
- [Docker Container Restart Policies](https://oneuptime.com/blog/post/2026-01-25-docker-container-restart-policies/view)
- [Docker Restart Policies Explained](https://oneuptime.com/blog/post/2026-01-16-docker-restart-policies/view)
- [Next.js Memory Usage Guide](https://nextjs.org/docs/app/guides/memory-usage)
- [Next.js Memory Leak Issues - GitHub](https://github.com/vercel/next.js/issues/79588)
- [Cloudflare Tunnel Monitoring Docs](https://developers.cloudflare.com/tunnel/monitoring/)

### Secrets Management

- [28M Credentials Leaked on GitHub 2025 - Snyk](https://snyk.io/articles/state-of-secrets/)
- [TruffleHog vs Gitleaks Comparison - Jit](https://www.jit.io/resources/appsec-tools/trufflehog-vs-gitleaks-a-detailed-comparison-of-secret-scanning-tools)
- [TruffleHog - GitHub](https://github.com/trufflesecurity/trufflehog)
- [Best Secret Scanning Tools 2025 - Aikido](https://www.aikido.dev/blog/top-secret-scanning-tools)

### Log Management

- [Grafana Loki OSS](https://grafana.com/oss/loki/)
- [20 Best Log Monitoring Tools 2026 - Dash0](https://www.dash0.com/comparisons/best-log-monitoring-tools-2025)

### Emerging Patterns

- [12 DevOps Tools 2026 - StatusPal](https://www.statuspal.io/blog/top-devops-tools-sre)
- [Emerging DevOps Tools 2025-2026 - Medium](https://medium.com/@averageguymedianow/emerging-devops-and-sre-tools-for-2025-2026-shaping-the-future-of-cloud-infrastructure-c2ae0a5b39ad)
- [Favorite Self-Hosted Apps 2025 - selfh.st](https://selfh.st/post/2025-favorite-new-apps/)
- [Docker Auto-Restart After Reboot](https://oneuptime.com/blog/post/2026-02-08-how-to-restart-a-docker-container-automatically-after-reboot/view)

---

---

## Research: OpenClaw Operational Targets Compliance Audit

> **Date:** 2026-04-04
> **Question:** Does the current OpenClaw Pi implementation comply with its stated operational targets?
> **Status:** complete

## Origin Context

These targets define the performance and safety constraints for OpenClaw running on a resource-constrained Raspberry Pi. Compliance directly affects Pi stability and ChefFlow protection. The Pi runs at 10.0.0.177 and processes scraping jobs for ~60+ chains across four daily cron slots.

---

## Summary

**Overall: Partially compliant.** The Pi is healthy at rest and several targets are well-implemented (rate limiting, sleep intervals, retry caps, flock-based write serialization, hung-process killing, log trimming). However, a significant cluster of targets are not implemented or are structurally impossible to comply with given the current cron architecture. The most serious gaps are: no pre-task load gating (CPU/memory check before spawning), no per-operation timeout on individual HTTP requests within walkers, temp file proliferation in `/tmp` (141 files, 128 MB), duplicate log entries in every watchdog run, and an active shell syntax error that prevents some national-expansion cron jobs from running at all.

**Targets met:** 14 of ~30 audited
**Targets violated or non-compliant:** 10
**Targets unknown/partially met:** 6

---

## Current System State (as of 2026-04-04 ~11:00 AM)

```text
Memory:   8 GB total | 1,899 MB used | 4,812 MB buff/cache | 6,163 MB available
Swap:     4 GB total |   386 MB used | 3,644 MB free
Load avg: 0.02, 0.05, 0.07 (13 days uptime, idle)
Disk:     117 GB total | 37 GB used (34%) | 75 GB free
```

**Active processes of note:**

- `sync-api.mjs`: 0.2% CPU, 6.7% RAM (554 MB RSS) - long-running daemon
- `next-server (v...)`: 0.0% CPU, 1.4% RAM (121 MB RSS) - Pi also runs a Next.js instance
- `cloudflared`, `tailscaled`: <0.1% CPU each
- No scraper processes running at time of audit (system idle between cron windows)

**Log sizes:**

- `instacart-walker.log`: 608 KB
- `watchdog.log`: 556 KB (7,301 lines)
- All others under 64 KB

---

## Target-by-Target Audit

| #   | Target                                                                         | Status                     | Evidence                                                                                                                                                                                                                                                                                                                                                                                                       | Severity if Violated                                                                                   |
| --- | ------------------------------------------------------------------------------ | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 1   | CPU average <= 60%, never sustain > 80% for 30s                                | UNKNOWN                    | No CPU monitoring in watchdog. Idle load is 0.02. No telemetry during active scrapes.                                                                                                                                                                                                                                                                                                                          | Medium - no alerting if a scraper spins                                                                |
| 2   | Memory <= 70% total RAM; no swap thrashing                                     | COMPLIANT (idle)           | `free -m`: 1,899 MB used of 8,063 MB = 23.5%. Swap 386 MB used of 4,031 MB = 9.6%. No thrashing.                                                                                                                                                                                                                                                                                                               | Low at current load; unknown during full-catalog runs                                                  |
| 3   | Disk I/O < 20 MB/s sustained; batch writes                                     | PARTIALLY COMPLIANT        | `flock` on `catalog-write.lock` serializes all DB writes from cron jobs. No I/O rate monitoring exists. SQLite WAL mode not confirmed. `writeFileSync` (non-atomic) used for session files.                                                                                                                                                                                                                    | Medium - no I/O cap enforcement                                                                        |
| 4   | Max 3 concurrent processes                                                     | COMPLIANT (architectural)  | Each cron entry runs a single `node` process. `run-full-catalog.sh` is invoked serially (dept walker then search walker sequentially with `sleep 30` between). No parallel spawning observed.                                                                                                                                                                                                                  | Low - structure prevents concurrency violations                                                        |
| 5   | Max 500 files per pass                                                         | UNKNOWN                    | No file-count guard in any walker code. Walkers operate on in-memory data and DB writes, not per-file operations. Not applicable to the Instacart scrape pattern.                                                                                                                                                                                                                                              | Low - not the relevant constraint here                                                                 |
| 6   | Max 2-5 min task execution window, then re-evaluate                            | NON-COMPLIANT              | `run-full-catalog.sh` runs a department walker then a search walker in sequence with no time limit. Walker logs show 1,754 search terms processed in one run. A full Instacart catalog capture takes well over 60 minutes. No mid-run abort or checkpointing.                                                                                                                                                  | High - directly violates the window constraint                                                         |
| 7   | Idle/yield 2-10 seconds between heavy operations                               | COMPLIANT                  | `scrape-utils.mjs` `rateLimitDelay()`: 3-6 seconds between requests. Department walker: 1-2s between item batches, 3s between departments. Catalog walker: 2-4s between search terms, 15s cooldown every 10 terms. `run-full-catalog.sh` has explicit `sleep 30` between Phase 1 and Phase 2.                                                                                                                  | -                                                                                                      |
| 8   | Abort any operation exceeding 60 seconds without progress                      | NON-COMPLIANT              | `fetchJsonWithRetry()` has no per-request timeout (no `AbortSignal`, no `signal` param passed to `fetch()`). A hung HTTP request can block indefinitely. The watchdog `killHungScrapers()` kills at 30 minutes, not 60 seconds.                                                                                                                                                                                | High - a single stalled request blocks the entire scrape run                                           |
| 9   | Full repo scans: max once per session                                          | NOT APPLICABLE             | No "repo scan" pattern exists on the Pi. OpenClaw is a data pipeline, not a code analysis tool.                                                                                                                                                                                                                                                                                                                | -                                                                                                      |
| 10  | Incremental scans preferred                                                    | COMPLIANT                  | Each cron slot scrapes one chain per day. Chains are rotated across the week. Not full-catalog-everything each run.                                                                                                                                                                                                                                                                                            | -                                                                                                      |
| 11  | Rebuilds only after meaningful changes; never loop                             | COMPLIANT                  | No build system on the Pi. Node scripts run directly. No build loop possible.                                                                                                                                                                                                                                                                                                                                  | -                                                                                                      |
| 12  | Cache intermediate results; do not recompute identical work                    | COMPLIANT                  | `upsertProduct` and `upsertStoreProduct` use INSERT OR REPLACE with change detection. Walker only logs "new" and "changed" counts separately, indicating deduplication is active.                                                                                                                                                                                                                              | -                                                                                                      |
| 13  | Avoid re-reading unchanged files; use timestamps or hashing                    | COMPLIANT                  | Session file mtime is checked before re-reading (`statSync`). `getSessionContext()` reads the session once and passes state through.                                                                                                                                                                                                                                                                           | -                                                                                                      |
| 14  | Do not reload full datasets into memory; stream or chunk                       | PARTIALLY COMPLIANT        | Instacart responses are paginated and processed per-page. However, `storeProductsBatch()` accumulates results for the entire term before inserting, not true streaming. For 10,000+ item catalogs this loads significant data in RAM. `sync-api.mjs` holds 554 MB RSS suggesting a large in-memory dataset.                                                                                                    | Medium - acceptable now, risk at scale                                                                 |
| 15  | Network: no repeated external calls                                            | COMPLIANT                  | `fetchJsonWithRetry()` uses cached session state across requests in a single run. No redundant session fetches per term.                                                                                                                                                                                                                                                                                       | -                                                                                                      |
| 16  | Retry failed operations max 2 times                                            | COMPLIANT                  | `fetchJsonWithRetry(maxAttempts = 3)` = 1 attempt + 2 retries = 3 total, matching "at most 2 retries."                                                                                                                                                                                                                                                                                                         | -                                                                                                      |
| 17  | File writes atomic and batched; no partial or frequent writes                  | PARTIALLY COMPLIANT        | DB writes via SQLite are batched per search term (`storeProductsBatch`). Session state writes use `writeFileSync` (not atomic: no write-to-temp-then-rename pattern). Watchdog log uses `appendFileSync` per line = frequent small writes.                                                                                                                                                                     | Low - session file corruption risk on crash                                                            |
| 18  | No duplicate files or redundant artifacts                                      | NON-COMPLIANT              | `/tmp` contains 141 files totaling 128 MB. These include `.mjs`, `.json`, debug scripts, cron backups, log files, and temp working files from previous agent sessions. Watchdog log shows every log line duplicated (each check appears twice: once at real time, once again a few ms later).                                                                                                                  | Medium - /tmp bloat; duplicate log lines inflate log size and consume disk                             |
| 19  | Clean up temp files immediately after use                                      | NON-COMPLIANT              | 141 files in `/tmp` including `debug-dept.mjs`, `debug-dept2.mjs` ... `debug-dept5.mjs`, `audit.mjs`, `bridge-patch.mjs`, `fix2.py`, etc. These are leftover from development sessions and were never cleaned up. No automated cleanup for `/tmp` in crontab (the log rotation cron is weekly, `/tmp` has no cleanup entry).                                                                                   | Medium - 128 MB occupied; could accumulate further                                                     |
| 20  | Logging: max 1 log per major step; actionable only                             | NON-COMPLIANT              | Watchdog log shows every entry duplicated. Example: `[OK] Service openclaw-sync-api: active` appears at identical timestamps seconds apart. 7,301 lines for ~15-min interval checks = excessive verbosity.                                                                                                                                                                                                     | Low - wastes disk, makes log scanning harder                                                           |
| 21  | No watchers/daemons/background loops unless required                           | COMPLIANT                  | `sync-api.mjs` and `receipt-processor.mjs` are explicitly required long-running services (HTTP APIs). No unnecessary background processes observed in `ps aux`.                                                                                                                                                                                                                                                | -                                                                                                      |
| 22  | All processes terminate cleanly after task completion                          | COMPLIANT                  | Cron jobs invoke `node script.mjs` which exits after completion. `run-full-catalog.sh` uses `set -euo pipefail` and terminates. `killHungScrapers()` handles any that don't.                                                                                                                                                                                                                                   | -                                                                                                      |
| 23  | Monitor load before starting new task cycle                                    | NON-COMPLIANT              | No load check before any cron job fires. Cron jobs execute unconditionally at scheduled time regardless of current CPU or memory state. Watchdog checks memory and disk but does not gate execution of other tasks.                                                                                                                                                                                            | High - target explicitly requires "delay execution, reduce workload size" if CPU > 70% or memory > 75% |
| 24  | If CPU > 70% or memory > 75%: delay execution                                  | NON-COMPLIANT              | No implementation exists. The watchdog logs memory percentage but does not write any gate file, signal, or lock that would cause cron jobs to wait.                                                                                                                                                                                                                                                            | High - the specified behavior is entirely absent                                                       |
| 25  | ChefFlow protection: never compete for peak CPU; yield if responsiveness drops | NON-COMPLIANT              | No mechanism exists to detect ChefFlow responsiveness or yield to it. The Pi runs both `openclaw-prices` jobs and a `next-server` process. During a full-catalog run, the scraper competes directly with the Next.js process. No priority setting (`nice`, `ionice`) applied to scraper cron jobs.                                                                                                             | Medium - Pi's Next.js is presumably not production ChefFlow, but the principle is violated             |
| 26  | Task prioritization: 1 task = 1 focused objective                              | COMPLIANT                  | Each cron entry targets one chain. `run-full-catalog.sh` has a clear single objective per invocation.                                                                                                                                                                                                                                                                                                          | -                                                                                                      |
| 27  | Max 20 files changed per code iteration                                        | NOT APPLICABLE             | This is a developer constraint for code changes, not a runtime constraint.                                                                                                                                                                                                                                                                                                                                     | -                                                                                                      |
| 28  | Validate after each iteration: no broken imports, no syntax errors             | NON-COMPLIANT (active bug) | Several national-expansion cron entries use `cd` without a target: `cd  && bash run-full-catalog.sh publix ...`. This drops back to `$HOME` but more critically the walker log shows `run-full-catalog.sh: line 40: syntax error near unexpected token '('`. The national expansion chains with coordinates are hitting a shell syntax error in `run-full-catalog.sh`. These scrape runs are silently failing. | Critical - entire national expansion cron set is broken                                                |
| 29  | Restart safety: all services recover cleanly                                   | COMPLIANT                  | `watchdog.mjs` checks systemd service status and calls `systemctl restart` if down. `sync-api.mjs` and `receipt-processor.mjs` have systemd unit files.                                                                                                                                                                                                                                                        | -                                                                                                      |
| 30  | Final state: stable, no memory leaks, no runaway processes                     | COMPLIANT (at rest)        | Load average 0.02 after 13 days uptime, no hung processes, swap under 10%. No evidence of memory leaks or runaway processes at time of audit.                                                                                                                                                                                                                                                                  | -                                                                                                      |

---

## Critical Violations

### 1. National Expansion Cron Jobs Are Broken (CRITICAL)

The cron entries added for national chain coverage use shell argument passing with coordinates:

```bash
0 9 * * 1 cd  && bash run-full-catalog.sh publix 28.5383 -81.3792 >> logs/instacart-walker.log 2>&1
```

The `run-full-catalog.sh` script uses `CHAIN=$1; LAT=$2; LNG=$3` but then constructs commands like:

```bash
node services/instacart-department-walker.mjs $CHAIN $LAT $LNG
```

The walker log shows the active error: `run-full-catalog.sh: line 40: syntax error near unexpected token '('`

This means all Southeast, West Coast, Midwest, Mountain, Mid-Atlantic, and national specialty chains added during the national expansion are failing every run. The core NE chains (Market Basket, Hannaford, etc.) at the 7:30/12:00/17:00/22:00 slots do not pass coordinates and appear to run successfully.

**Chains affected:** publix, h-e-b, harris-teeter, food-lion, winn-dixie, ingles-markets, ralphs, vons, albertsons, safeway, stater-brothers-markets, smart-and-final, grocery-outlet, lucky, fred-meyer, king-soopers, natural-grocers, meijer, jewel-osco, hy-vee, giant-eagle, schnucks, marianos, giant-food, giant-martins, shoprite, acme-markets, weis-markets, lidl, trader-joes, sprouts-farmers-market, tom-thumb, randalls, and all 18:00 slot chains. Approximately 34 chains are currently producing no data.

### 2. No Pre-Task Load Gating

The spec requires: "Monitor system load before starting new task cycle. If CPU > 70% or memory > 75%: delay execution, reduce workload size."

Zero implementation. Cron fires unconditionally. If the 7:30 market-basket run is still in progress when the 9:00 publix run fires, both execute simultaneously, violating the concurrent process limit and the load gate requirement simultaneously.

### 3. No Per-Request HTTP Timeout in Walkers

`fetchJsonWithRetry()` passes no `signal` to `fetch()`. A TCP connection that hangs (no bytes received, connection accepted but server stalled) can block for the OS default timeout (minutes). The 30-minute watchdog kill is the only backstop, meaning a single stalled request can tie up the walker for 30 minutes before the watchdog intervenes. The target requires aborting operations with no progress after 60 seconds.

### 4. Watchdog Log Duplication

Every watchdog check writes each log line twice. The walker log shows entries like:

```text
[2026-04-04T15:00:05.854Z] [WARN] Trader Joe's (via Instacart): Never scraped
[2026-04-04T15:00:05.854Z] [WARN] Trader Joe's (via Instacart): Never scraped
```

With 7,301 lines for a 15-minute-interval watchdog, approximately 3,650 of those lines are duplicates. This doubles disk consumption and makes grep-based alerting unreliable (duplicate matches). The cause is likely the watchdog being invoked twice per 15-minute window (two cron entries, or the process being called from two places).

---

## Recommendations

| Priority | Recommendation                                                                                                                                                                 | Tag           |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- |
| **P0**   | Fix `run-full-catalog.sh` to handle coordinate arguments correctly so national expansion chains run                                                                            | immediate fix |
| **P0**   | Fix watchdog duplicate log entries (check crontab for double-entry or internal loop)                                                                                           | immediate fix |
| **P1**   | Add `AbortSignal.timeout(60000)` to all `fetch()` calls in `instacart-catalog-walker.mjs` and `instacart-department-walker.mjs`                                                | immediate fix |
| **P1**   | Add a pre-task load gate wrapper script that checks `uptime` load average and `free -m` before invoking any cron job; skip the run if load is over threshold                   | needs a spec  |
| **P1**   | Clean up `/tmp`: add a weekly cron entry `find /tmp -maxdepth 1 -type f -mtime +7 -delete` to remove stale dev artifacts                                                       | immediate fix |
| **P2**   | Apply `nice -n 10` and `ionice -c 3` to all scraper cron invocations so the Pi's Next.js process is never starved                                                              | immediate fix |
| **P2**   | Add `AbortSignal.timeout()` to the Instacart session probe in watchdog (`checkInstacartSession`) - already present at 8s, good; verify same pattern is in all other HTTP calls | monitor       |
| **P2**   | Investigate `sync-api.mjs` 554 MB RSS; confirm this is normal for the dataset size or identify if unbounded growth is occurring                                                | monitor       |
| **P3**   | Convert `writeFileSync` session saves to atomic write (write to `.tmp` then `renameSync`) to prevent corruption on crash                                                       | monitor       |
| **P3**   | Watchdog to write a gate file (`/tmp/openclaw-load-gate`) when memory > 75% that all cron jobs check before executing                                                          | needs a spec  |
| **P3**   | Document which Flipp-sourced scrapers (Market Basket Weekly Flyer, Hannaford Weekly Flyer, etc.) have been stale 167h per watchdog; verify if Flipp scraper is working         | monitor       |
