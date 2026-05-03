# /services - Service Manager

Control what's running. On/off switch for ChefFlow local environment.

## When to Use

- User says "start", "stop", "what's running", "clean up servers", "make it fast"
- Before any work session (auto-check in /morning)
- When localhost is slow
- When agents spawn garbage

## Execution

Run `bash scripts/services.sh [command] [service]` with the appropriate subcommand:

| Command       | What it does                                                          |
| ------------- | --------------------------------------------------------------------- |
| `status`      | Show all services, RAM usage, what's needed vs garbage                |
| `up`          | Kill garbage + start essentials (postgres + prod:3000)                |
| `down`        | Stop everything project-related                                       |
| `start <svc>` | Start one service: prod, dev, ollama, openclaw, anythingllm, postgres |
| `stop <svc>`  | Stop one service                                                      |
| `clean`       | Kill ALL project node processes (nuclear)                             |

## Essential Services (always needed for localhost)

1. **PostgreSQL** (Docker: chefflow_postgres, port 54322)
2. **Production server** (port 3000, via `scripts/run-next-prod.mjs`)

## Non-Essential (stop to save resources)

- Dev server (:3100) - uses 15-20GB RAM. NEVER run alongside prod unless explicitly requested.
- Ollama (:11434) - only needed if testing AI/Remy features
- OpenClaw engine (Docker) - not needed for ChefFlow localhost
- AnythingLLM (Docker) - not needed for ChefFlow localhost
- Playwright test server - only needed during test runs
- Persona tools - batch processing, not needed for localhost
- PM2 - not needed for ChefFlow

## Self-Healing Rules

1. **On session start:** if dev server is running alongside prod, kill dev server (it's the #1 RAM hog).
2. **Before starting prod:** always release port 3000 first (run-next-prod.mjs handles this).
3. **Never run dev + prod simultaneously** unless explicitly asked.
4. **If localhost is slow:** run `bash scripts/services.sh status` first. 90% chance something is eating RAM.

## Arguments

If the user says:

- "turn everything on" -> `bash scripts/services.sh up`
- "shut it down" -> `bash scripts/services.sh down`
- "what's running" -> `bash scripts/services.sh status`
- "start ollama" -> `bash scripts/services.sh start ollama`
- "stop dev" -> `bash scripts/services.sh stop dev`
- "nuke it" -> `bash scripts/services.sh clean` then `bash scripts/services.sh up`
