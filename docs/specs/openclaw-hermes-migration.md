# OpenClaw + Hermes Migration Spec

## Status: PROMPT READY (not yet executed)

This file contains the full agent prompt for migrating OpenClaw from the Raspberry Pi to a Docker-isolated stack on the PC, with Hermes LLM integration.

---

## Architecture Decision Record

**Decision:** Migrate OpenClaw pipeline from Raspberry Pi to PC via Docker Compose, add Hermes LLM models alongside Gemma 4, demote Pi to watchdog/backup role.

**Why:**

- PC hardware is significantly faster than Pi for inference and scraping
- Hermes models (Nous Research) offer superior agentic capabilities, function calling, and self-repairing JSON
- Docker provides equivalent isolation to "separate machine" without the hardware limits
- Pi was chosen for safety/isolation, not performance. Docker achieves the same isolation goal

**What changes:**

- OpenClaw engine runs in Docker container on PC instead of bare metal on Pi
- Ollama runs in Docker container with GPU passthrough (shared by OpenClaw + ChefFlow)
- Hermes 3 8B replaces Qwen 3 8B for product normalization
- Pi becomes backup mirror + health watchdog
- ChefFlow integration: `10.0.0.177:8081` -> `localhost:8081` (one env var)

**What does NOT change:**

- SQLite schema (prices.db)
- Scraper scripts (Flipp, direct, government)
- REST API contract (port 8081)
- ChefFlow sync mechanism
- Dashboard UI (port 8090)
- Cron job schedule

---

## Agent Prompt

Paste everything below the line into a fresh Claude Code session:

---

# MISSION: OpenClaw + Hermes Docker Migration

You are building a Docker Compose stack that migrates the OpenClaw pricing pipeline from a Raspberry Pi to this PC, adds Hermes LLM models, and maintains full isolation for safety.

## CONTEXT: What Exists Today

### OpenClaw (currently on Raspberry Pi at 10.0.0.177)

OpenClaw is a food price intelligence system. It scrapes grocery prices, maintains a catalog of ~9,270 canonical ingredients in SQLite, and syncs prices to ChefFlow nightly.

**Current Pi services:**

- Scrapers: Flipp API (primary), Puppeteer direct scrapers, BLS CPI, FRED wholesale
- Cross-matcher: maps Flipp auto-slugs to canonical ingredients daily
- Aggregator: computes 7d/30d/90d price trends, anomaly detection, monthly summaries
- REST API on port 8081: smart lookup, batch queries, full DB download
- Dashboard on port 8090: surveillance UI with SSE live view
- Receipt processor on port 8082: Tesseract OCR
- SQLite DB: `~/openclaw-prices/data/prices.db` (WAL mode, ~442MB, 19 tables)
- Normalization: 150+ keyword rules handle 70% of product names, qwen3:8b handles the rest
- ChefFlow sync: nightly at 11PM, pushes prices to ChefFlow PostgreSQL
- Cron: Flipp 3AM, cross-match 4AM, aggregator 10AM, government Mon 2AM, wholesale Wed 9AM, watchdog every 15min, sync 11PM

**Current Pi connection info:**

- SSH: `davidferra@10.0.0.177` (NOT `pi@`)
- The Pi calls the PC at `http://10.0.0.100:3100` to trigger ChefFlow sync
- The PC calls Pi at `http://10.0.0.177:8081` for on-demand price lookups

### OpenClaw development files on PC

- `.openclaw-build/` directory contains the editable mirror of OpenClaw source
- Edit on PC, SCP to Pi for deployment
- `.openclaw-build/data/prices.db` is a local copy of the database

### ChefFlow integration points

- `lib/pricing/resolve-price.ts` - 8-tier price resolution (receipt > API quote > direct scrape > flyer > Instacart > government > historical > none)
- Environment variable points to OpenClaw API endpoint
- Nightly sync writes prices into ChefFlow PostgreSQL

### Current AI models

- PC Ollama (`localhost:11434`): Gemma 4 (gemma4, gemma4:e4b) for ChefFlow app features
- Pi Ollama: qwen3:8b for product name normalization fallback
- Claude Code: Opus 4.6 (main), Haiku 4.5 (sub-agents), Gemma 4 e4b (delegation)

## WHAT WE'RE BUILDING

### Docker Compose stack: `openclaw-hermes`

Three containers on an isolated bridge network:

```yaml
# docker-compose.yml location: .openclaw-docker/docker-compose.yml

services:
  ollama:
    # Official Ollama Docker image with GPU passthrough
    # Serves models for both OpenClaw AND ChefFlow
    # Models: hermes3:8b, gemma4:e4b, and optionally hermes-4.3 (if GPU supports it)
    # Port: 11434 (internal), mapped to host 11434
    # Volume: ollama-models (persistent model storage)
    # GPU: deploy.resources.reservations.devices (nvidia)

  openclaw-engine:
    # Node.js container running the full pipeline
    # Migrated from Pi bare metal to containerized
    # All scraper scripts, cross-matcher, aggregator, normalizer, REST API, cron
    # Port: 8081 (REST API)
    # Volume: openclaw-data (prices.db)
    # Depends on: ollama
    # Env: OLLAMA_BASE_URL=http://ollama:11434 (internal Docker DNS)

  openclaw-dashboard:
    # The surveillance UI
    # Port: 8090
    # Volume: openclaw-data (read-only access to prices.db)
    # Depends on: openclaw-engine
```

Shared resources:

- Network: `openclaw-net` (isolated bridge, no access to host network except mapped ports)
- Volume: `openclaw-data` (named volume for prices.db, persistent across restarts)
- Volume: `ollama-models` (named volume for downloaded model weights)

### Hermes integration

**Replace qwen3:8b with hermes3:8b for normalization:**

- Hermes has better structured JSON output and self-repairing JSON
- Same Ollama API, just different model name in the normalization config
- Test: run the 150+ keyword rule misses through both models, compare accuracy

**Future (Phase 2): Hermes 4.3 36B for agentic pipeline orchestration:**

- Only if GPU has 24GB+ VRAM (RTX 4090)
- Hermes 4.3 has 512K context, trained on real agentic traces
- Could power adaptive scraping (detect page changes, handle failures intelligently)
- This is Phase 2, not Phase 1

### Pi demotion plan

After migration is verified:

1. Set up nightly rsync of prices.db from PC Docker volume to Pi
2. Pi runs health check every 5 minutes (pings PC stack)
3. If PC stack is down, Pi alerts (can use existing watchdog script)
4. Pi keeps its copy of prices.db as cold backup
5. Pi Ollama and scraper crons are disabled (but not deleted, can re-enable if needed)

### ChefFlow integration change

One environment variable change:

- Before: `OPENCLAW_API_URL=http://10.0.0.177:8081`
- After: `OPENCLAW_API_URL=http://localhost:8081`

The sync direction also reverses:

- Before: Pi calls PC to push prices
- After: openclaw-engine container calls ChefFlow directly (same host)

## PHASE 1 TASKS (Build This Now)

### Step 0: GPU Detection

Before anything else, detect the GPU:

```bash
# Check NVIDIA GPU
nvidia-smi
# Check available VRAM
nvidia-smi --query-gpu=name,memory.total,memory.free --format=csv
```

Report findings. This determines which Hermes variant to pull:

- <8GB VRAM: hermes3:8b only (Q4_K_M, ~5GB)
- 8-16GB: hermes3:8b + gemma4:e4b
- 16-24GB: hermes3:8b + gemma4:e4b + consider hermes-4.3:36b Q4
- 24GB+: full stack including hermes-4.3:36b

### Step 1: Create Docker Compose directory structure

```
.openclaw-docker/
├── docker-compose.yml
├── engine/
│   ├── Dockerfile
│   └── ... (migrated OpenClaw source)
├── dashboard/
│   ├── Dockerfile
│   └── ... (migrated dashboard source)
├── .env
└── README.md
```

### Step 2: Build the Ollama container config

- Use official `ollama/ollama` image
- GPU passthrough via NVIDIA Container Toolkit
- Health check: `ollama list` returns successfully
- On first start: auto-pull hermes3:8b and gemma4:e4b

### Step 3: Migrate OpenClaw engine to container

- Copy source from `.openclaw-build/` into `engine/`
- Create Node.js Dockerfile (node:20-slim base)
- Install dependencies (including Puppeteer with bundled Chromium for scrapers)
- Configure cron inside the container (or use node-cron)
- Point normalization to `http://ollama:11434` with model `hermes3:8b`
- Mount prices.db volume
- Expose port 8081

### Step 4: Migrate dashboard to container

- Copy dashboard source
- Create Dockerfile
- Mount prices.db volume (read-only)
- Expose port 8090

### Step 5: Test the stack

```bash
cd .openclaw-docker
docker-compose up -d
# Verify:
# 1. ollama container healthy, models loaded
# 2. openclaw-engine API responds on localhost:8081
# 3. Dashboard loads on localhost:8090
# 4. Run one Flipp scrape manually, verify data flows to DB
# 5. Test Hermes normalization on sample products
# 6. Verify prices.db is persisted across container restart
```

### Step 6: Update ChefFlow integration

- Change OPENCLAW_API_URL env var
- Test price resolution still works
- Test nightly sync mechanism from container context

### Step 7: Pi demotion

- SSH to Pi, disable OpenClaw crons (comment out, don't delete)
- Set up rsync cron: Pi pulls prices.db from PC nightly
- Set up health watchdog: Pi pings PC stack every 5 min
- Verify Pi backup copy stays current

## SAFETY REQUIREMENTS (NON-NEGOTIABLE)

1. **No host filesystem access**: Containers only see their own volumes. Never mount user home directory or personal files
2. **Network isolation**: Use Docker bridge network. Only expose ports 8081, 8090, and 11434 to host
3. **No outbound restriction bypass**: Scrapers make HTTP requests (same as Pi did). This is expected behavior, not a security risk
4. **GPU isolation**: Only the ollama container gets GPU access
5. **Data persistence**: prices.db lives in a named Docker volume. Survives container rebuilds
6. **No secrets in Dockerfiles**: Use .env file for tokens, API keys. .env is gitignored
7. **Existing Ollama**: If Ollama is already running natively on the PC for ChefFlow, either:
   a. Share the native Ollama (simpler, container just uses host network for Ollama)
   b. Or run a separate Ollama in Docker (more isolated, but uses more VRAM)
   Recommend option (a) for Phase 1: share native Ollama, just add Hermes models to it

## IMPORTANT CONSTRAINTS

- Read CLAUDE.md for project rules (em dash ban, no OpenClaw in UI, data safety)
- OpenClaw source is in `.openclaw-build/` - read it before migrating
- Never delete Pi data or services. Disable, don't destroy
- `prices.db` is production data with 245K+ prices. Handle with care
- Test Hermes normalization quality against Qwen before fully switching
- The developer runs Windows 11. Docker Desktop with WSL2 backend is the expected setup
- Do NOT run `docker-compose up` without explicit developer approval (same safety as drizzle-kit push)

## SUCCESS CRITERIA

- [ ] Docker stack starts with `docker-compose up -d`
- [ ] Ollama container serves hermes3:8b and gemma4:e4b
- [ ] OpenClaw API responds on localhost:8081
- [ ] Dashboard loads on localhost:8090
- [ ] Flipp scraper runs successfully inside container
- [ ] Hermes normalization produces equal or better results than Qwen
- [ ] prices.db persists across container restarts
- [ ] ChefFlow can resolve prices from containerized OpenClaw
- [ ] Pi is demoted to watchdog (crons disabled, rsync running)
- [ ] No host filesystem exposure beyond mapped ports and named volumes
