# Build: Always-On Ollama + Sim-to-Real Quality Loop

## What Changed

This build wires Ollama permanently into ChefFlow as a required local service and builds the first sim-to-real quality improvement loop — a system that uses Ollama to generate synthetic chef scenarios, runs them through ChefFlow's real AI pipeline, grades the outputs, and surfaces failures for prompt improvement.

---

## Phase 1: Always-On Ollama Infrastructure

### Problem

Ollama was optional — if `OLLAMA_BASE_URL` wasn't set it silently fell back to Gemini. There was no health check, no status visibility, and no guarantee Ollama would be running.

### Solution

Four pieces working together:

**`lib/ai/ollama-health.ts`** (new)
Proactive health check — pings `/api/tags`, measures latency, returns model list. 5-second timeout, never throws. Used by the status API and dashboard badge.

**`app/api/ollama-status/route.ts`** (new)
Public GET endpoint — returns `{ online, configured, latencyMs, model, models, error }`. No auth required. Powers the dashboard badge's 30-second polling loop.

**`components/dashboard/ollama-status-badge.tsx`** (new)
Client-side badge in the dashboard header. Three states:

- `configured + online` → green "Local AI · 45ms" (data stays on device)
- `configured + offline` → amber "Cloud AI active" warning (Gemini fallback in effect)
- `not configured` → renders nothing (cloud-only is expected, no alarm needed)

**`chefflow-watchdog.ps1`** (modified)
Added `Ensure-OllamaRunning` function that:

1. Pings Ollama on watchdog startup
2. If down: tries `Start-Service Ollama` (Windows service) or launches `ollama.exe serve` directly
3. Checks every 10 server restart cycles (~periodically throughout uptime)
4. Logs all Ollama events with timestamps

### One-Time Setup Required

Register Ollama as a Windows service (runs as SYSTEM, survives reboots, starts before login):

```powershell
# Run PowerShell as Administrator
ollama service install
```

Full setup guide: `docs/ollama-setup.md`

---

## Phase 2: Sim-to-Real Quality Loop

### Problem

ChefFlow's AI pipeline (inquiry parsing, allergen detection, correspondence drafting, etc.) has no automated quality assurance. Prompt failures only surface when a real chef encounters them, which is too late.

### Solution

A closed feedback loop using Ollama as both the simulation engine and the evaluator.

### New Files

**`lib/simulation/types.ts`**
TypeScript types for the simulation system: `SimModule`, `SimScenario`, `SimResult`, `SimRun`, `SimRunConfig`, `SimSummary`. Exported module labels and full module list.

**`lib/simulation/scenario-generator.ts`**
`generateScenarios(module, count)` — prompts Ollama to create `count` realistic synthetic scenarios for the given module. Generates:

- Inquiry emails with varied dietary needs, budgets, occasions
- Client notes with realistic PII patterns
- Event menus with tricky allergen combinations
- Conversation contexts at each lifecycle stage
- Event scenarios for menu suggestions and quote drafting

**`lib/simulation/pipeline-runner.ts`**
`runScenario(scenario)` — runs a scenario through the real AI prompt logic (same system prompts as production modules). Returns raw output + timing. Covers all 6 modules: `inquiry_parse`, `client_parse`, `allergen_risk`, `correspondence`, `menu_suggestions`, `quote_draft`.

**`lib/simulation/quality-evaluator.ts`**
`evaluateOutput(scenario, rawOutput)` — asks Ollama to grade the output against module-specific rubrics. Returns `score` (0–100), `passed` (≥70), and `failures` (list of specific issues). Module rubrics:

- `allergen_risk`: Did every (dish, guest) conflict get detected? Were severe allergens flagged?
- `correspondence`: Did the email obey lifecycle rules? Any forbidden content?
- `inquiry_parse`/`client_parse`: Were all fields captured? No invented data?

**`lib/simulation/simulation-actions.ts`** (`'use server'`)
Five server actions: `startSimulationRun`, `getSimulationRuns`, `getSimulationResults`, `getFailureExamples`, `getSimulationSummary`. Orchestrates the full generate→run→evaluate→store loop. High-scoring results (≥90) auto-save to `fine_tuning_examples`.

**`app/(chef)/dev/simulate/page.tsx`** + **`simulate-client.tsx`**
Simulation control panel at `/dev/simulate`. Module selection chips, scenario count slider, run button with loading state, pass rate by module (progress bars), failure drill-down with scenario text + specific issues, run history.

**`components/simulation/simulation-results-panel.tsx`**
Expandable results panel showing per-module pass rates with color coding (green ≥80%, amber ≥60%, red <60%), failure examples, and passing examples for comparison.

### Database Migration

`supabase/migrations/20260321000001_simulation_tables.sql`

Three new tables:

- `simulation_runs` — batch metadata (status, pass rate, module breakdown, config)
- `simulation_results` — per-scenario results (score, failures, raw output, timing)
- `fine_tuning_examples` — high-quality examples from sim + real interactions, for future model fine-tuning

All tables: tenant-scoped RLS, chef-only access.

---

## How the Loop Works

```
1. GENERATE   Ollama creates N synthetic scenarios per module
      ↓
2. EXECUTE    Each scenario runs through real AI prompt logic (unchanged)
      ↓
3. EVALUATE   Ollama grades each output (0–100) with specific failure reasons
      ↓
4. STORE      Results → simulation_results; high scores → fine_tuning_examples
      ↓
5. SURFACE    /dev/simulate shows pass rates + failure examples
      ↓
6. FIX        Developer improves the failing prompt
      ↓
7. REPEAT     Re-run — improved pass rate confirms the fix transfers to real users
```

---

## Connection to the System

- All AI policy constraints honored: simulation never writes canonical state, never touches ledger, never auto-transitions events
- Synthetic data only — real client PII never enters the simulation pipeline
- Non-blocking: simulation failures never affect the main app
- Fine-tuning dataset accumulates silently; when it reaches ~2000 examples, the export pipeline can fine-tune a smaller/faster local model (e.g., `qwen2.5:7b`)
- The existing Gemini fallback behavior is unchanged — Ollama is now always-on, but if it somehow goes down, the app degrades gracefully to cloud AI with a visible warning badge

---

## Documentation

- `docs/ollama-setup.md` — One-time Windows service setup + troubleshooting
- `docs/sim-to-real-loop.md` — Architecture, the four phases, fine-tuning pipeline roadmap
