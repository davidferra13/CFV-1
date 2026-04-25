# Persona Pipeline v2: Local-First Overhaul

> **Status:** SPEC READY
> **Author:** Claude (architect), David (vision)
> **Date:** 2026-04-25
> **Replaces:** devtools/persona-autopilot.mjs (Codex-built, 0 builds landed)

---

## Problem

The v1 persona pipeline (built by Codex) depends on Codex cloud, has 0% build success rate, and tries to do everything in one context window. The entire right side of the pipeline (build + apply) has never worked. Reports exist but cite directory globs, not real files. The dirty-worktree safety gate blocked every build attempt with no recovery.

## Design Principles

1. **Local-first.** Analysis and planning run on Gemma via Ollama ($0). Building is queued for Codex or manual Claude sessions.
2. **One stage, one context.** Each stage is a standalone script with bounded input. No stage inherits another's context window.
3. **Serial processing.** One persona at a time. Don't max out the local model.
4. **Queue, don't build.** The pipeline DISCOVERS gaps and PLANS fixes. It does NOT execute builds automatically. Build specs are queued for human/agent pickup.
5. **Coexist, don't replace.** New files alongside the old pipeline. Old scripts untouched.

## Architecture

```
Chef Flow Personas/Uncompleted/{Type}/{name}.txt
            |
   [persona-orchestrator.mjs]  (runs stages 1-2, queues stage 3)
            |
  Stage 1:  persona-analyzer.mjs   (Ollama)  -->  docs/stress-tests/persona-{slug}-{date}.md
            |
  Stage 2:  persona-planner.mjs    (Ollama)  -->  system/persona-build-plans/{slug}/task-{N}.md
            |
  Stage 3:  BUILD QUEUE  (files on disk, picked up by Codex / Claude / developer)
```

No automated building. No automated validation. The pipeline produces actionable build specs. Humans and agents decide what to execute.

---

## Stage 1: Analyzer

**File:** `devtools/persona-analyzer.mjs` (NEW)

**Purpose:** Evaluate one persona against ChefFlow's current capabilities using a local LLM.

**CLI:**

```bash
node devtools/persona-analyzer.mjs <persona-file> [--model gemma3:4b] [--ollama-url http://localhost:11434]
```

**Behavior:**

1. Read the persona file from argv[1]
2. Read 4 reference docs from the repo (truncate each to first 200 lines to fit context):
   - `docs/product-blueprint.md`
   - `docs/app-complete-audit.md`
   - `lib/billing/feature-classification.ts`
   - `docs/service-lifecycle-blueprint.md`
3. Build the analysis prompt (template below)
4. Call Ollama: `POST ${OLLAMA_BASE_URL}/api/generate` with `{ model, prompt, stream: false, options: { temperature: 0.3, num_predict: 4000 } }`
5. Extract the markdown report from the response
6. Write to `docs/stress-tests/persona-{slug}-{date}.md`
7. Append one line to `docs/stress-tests/REGISTRY.md` (the persona table)
8. Move persona file from `Uncompleted/{type}/` to `Completed/{type}/`
9. Print the report path and score to stdout
10. Exit 0 on success, 1 on error

**Slug generation:** lowercase the persona name, replace spaces with hyphens, strip non-alphanumeric chars except hyphens. Example: "Kai Donovan" -> "kai-donovan".

**Date format:** YYYY-MM-DD (ISO date only, no time).

**Ollama Prompt Template:**

```
You are evaluating a software product called ChefFlow against a user persona.

ChefFlow is an operations platform for food service professionals: private chefs, caterers, food vendors, event cooks, and related roles. It handles events, clients, recipes, menus, pricing, invoicing, contracts, scheduling, and AI-assisted communication.

=== CHEFFLOW CAPABILITIES ===
{content from product-blueprint.md, first 200 lines}

=== FEATURE CLASSIFICATION ===
{content from feature-classification.ts, first 200 lines}

=== SERVICE LIFECYCLE ===
{content from service-lifecycle-blueprint.md, first 200 lines}

=== PAGE AND UI REGISTRY ===
{content from app-complete-audit.md, first 200 lines}

=== PERSONA TO EVALUATE ===
{full persona file content}

=== INSTRUCTIONS ===
Evaluate how well ChefFlow serves this persona TODAY. Be honest about gaps. Produce your report in EXACTLY this markdown format, no deviations:

# Persona Stress Test: {persona name}
**Type:** {Chef|Client|Guest|Vendor|Staff|Partner|Public}
**Date:** {today YYYY-MM-DD}
**Method:** local-ollama-v2

## Summary
{2-3 sentences on overall fit}

## Score: {N}/100
- Workflow Coverage (0-40): {score} -- {one line reason}
- Data Model Fit (0-25): {score} -- {one line reason}
- UX Alignment (0-15): {score} -- {one line reason}
- Financial Accuracy (0-10): {score} -- {one line reason}
- Onboarding Viability (0-5): {score} -- {one line reason}
- Retention Likelihood (0-5): {score} -- {one line reason}

## Top 5 Gaps
### Gap 1: {title}
**Severity:** {HIGH|MEDIUM|LOW}
{2-3 sentences: what is missing and why this persona needs it}

### Gap 2: {title}
**Severity:** {HIGH|MEDIUM|LOW}
{2-3 sentences}

### Gap 3: {title}
**Severity:** {HIGH|MEDIUM|LOW}
{2-3 sentences}

### Gap 4: {title}
**Severity:** {HIGH|MEDIUM|LOW}
{2-3 sentences}

### Gap 5: {title}
**Severity:** {HIGH|MEDIUM|LOW}
{2-3 sentences}

## Quick Wins
1. {one-line actionable change}
2. {one-line actionable change}
3. {one-line actionable change}

## Verdict
{one sentence: should this persona use ChefFlow today, and what is the single biggest blocker?}
```

**Error handling:**

- Ollama unreachable: print `ERROR: Ollama not reachable at ${url}. Is it running?` and exit 1
- Persona file missing: print `ERROR: File not found: ${path}` and exit 1
- Reference file missing: skip it, include `[file not found, skipped]` in that prompt section
- Ollama returns empty/malformed: write raw response to `system/persona-debug/{slug}-raw.txt`, print error, exit 1

---

## Stage 2: Planner

**File:** `devtools/persona-planner.mjs` (NEW)

**Purpose:** Read a gap report from Stage 1, find relevant source files for each gap, and produce focused build task specs.

**CLI:**

```bash
node devtools/persona-planner.mjs <gap-report-path> [--model gemma3:4b] [--ollama-url http://localhost:11434]
```

**Behavior:**

1. Read the gap report markdown from argv[1]
2. Parse the "Top 5 Gaps" section using regex:
   - Split on `### Gap \d+:` headers
   - Extract title, severity, and description for each gap
3. For each gap (up to 5):
   a. Extract 2-3 search keywords from the gap title and description
   b. Run `grep -rl "<keyword>" app/ lib/ components/ --include="*.ts" --include="*.tsx"` to find relevant files
   c. Take the top 5 unique file paths from grep results
   d. Read the first 80 lines of each file
   e. Build the planning prompt (template below) with gap + file contents
   f. Call Ollama API (same as analyzer)
   g. Write result to `system/persona-build-plans/{persona-slug}/task-{N}.md`
4. Print summary: "Created {N} build tasks in system/persona-build-plans/{slug}/"
5. Exit 0

**Directory creation:** Create `system/persona-build-plans/{persona-slug}/` if it doesn't exist.

**Persona slug extraction:** Parse from the report filename. `persona-kai-donovan-2026-04-25.md` -> `kai-donovan`.

**Planner Prompt Template (per gap):**

```
You are a software architect writing a build plan for ONE specific gap in ChefFlow, a Next.js 14 + PostgreSQL application using Drizzle ORM, Auth.js v5, and Tailwind CSS.

=== THE GAP ===
Title: {gap title}
Severity: {severity}
Description: {gap description from report}

=== RELEVANT SOURCE FILES ===
File: {path1}
```

{first 80 lines of file1}

```

File: {path2}
```

{first 80 lines of file2}

```

(up to 5 files)

=== INSTRUCTIONS ===
Write a focused, specific build plan for this ONE gap. The plan will be handed to a coding agent (Codex) that will execute it. Be explicit about file paths and what to change. Do NOT suggest changes to files you haven't seen.

Use EXACTLY this format:

# Build Task: {gap title}
**Source Persona:** {persona name from report}
**Gap Number:** {N} of 5
**Severity:** {severity}

## What to Build
{2-3 sentences describing the change}

## Files to Modify
- `{exact/file/path.tsx}` -- {what to change in this file}

## Files to Create (if any)
- `{exact/file/path.tsx}` -- {purpose of new file}

## Implementation Notes
- {key technical detail or pattern to follow}
- {edge case to handle}

## Acceptance Criteria
1. {specific, testable criterion}
2. {specific, testable criterion}
3. `npx tsc --noEmit --skipLibCheck` passes

## DO NOT
- Modify files not listed above
- Add new npm dependencies
- Change database schema
- Delete existing functionality
- Use em dashes anywhere
```

**Error handling:**

- Same pattern as analyzer
- If grep finds zero files for a gap, include `[no relevant files found via search]` in the prompt and let the model suggest file paths based on Next.js conventions
- If a file from grep results doesn't exist (race condition), skip it

---

## Orchestrator

**File:** `devtools/persona-orchestrator.mjs` (NEW)

**Purpose:** Manage the pipeline queue. Watch for new personas, run analyzer + planner in sequence, track state.

**CLI:**

```bash
node devtools/persona-orchestrator.mjs --once                    # single pass
node devtools/persona-orchestrator.mjs --watch --interval 300    # continuous (default 5 min)
```

**Behavior per cycle:**

1. Scan all `Chef Flow Personas/Uncompleted/{Type}/` subdirectories for .txt and .md files
2. Filter out files already in `state.processed` or `state.failed` (by filename)
3. For each new persona file (process ONE per cycle in watch mode, ALL in once mode):
   a. Log: `[orchestrator] Processing: {filename}`
   b. Run analyzer: spawn `node devtools/persona-analyzer.mjs "{filepath}" --model {model}`
   c. If analyzer exits non-zero: add to `state.failed`, log error, continue to next
   d. Detect the report path from analyzer stdout (last line should be the path)
   e. Run planner: spawn `node devtools/persona-planner.mjs "{report-path}" --model {model}`
   f. If planner exits non-zero: log warning (analysis succeeded, planning failed), add partial entry to state
   g. Add to `state.processed` with timestamps and paths
4. Print cycle summary: processed count, failed count, total build tasks queued
5. In watch mode: sleep for interval, then repeat
6. In once mode: exit 0

**State file:** `system/persona-pipeline-state.json`

```json
{
  "version": 2,
  "processed": [
    {
      "slug": "kai-donovan",
      "type": "Chef",
      "source_file": "Chef Flow Personas/Completed/Chef/kai-donovan.txt",
      "report": "docs/stress-tests/persona-kai-donovan-2026-04-25.md",
      "build_tasks": [
        "system/persona-build-plans/kai-donovan/task-1.md",
        "system/persona-build-plans/kai-donovan/task-2.md"
      ],
      "analyzed_at": "2026-04-25T14:30:00Z",
      "planned_at": "2026-04-25T14:31:00Z"
    }
  ],
  "failed": [
    {
      "source_file": "...",
      "error": "Ollama unreachable",
      "failed_at": "..."
    }
  ],
  "last_cycle": "2026-04-25T14:30:00Z",
  "total_personas_processed": 1,
  "total_build_tasks_queued": 5
}
```

**CLI flags:**

- `--once` : single pass, exit when done
- `--watch` : continuous loop
- `--interval <seconds>` : seconds between cycles (default 300)
- `--model <name>` : Ollama model to use (default: value of `PERSONA_MODEL` env var, or `gemma3:4b`)
- `--ollama-url <url>` : Ollama base URL (default: `OLLAMA_BASE_URL` env var, or `http://localhost:11434`)
- `--max <N>` : max personas to process per cycle in watch mode (default 1)
- `--dry-run` : print what would be processed, don't run anything

---

## New File Map

| File                                 | Type            | Purpose                            |
| ------------------------------------ | --------------- | ---------------------------------- |
| `devtools/persona-analyzer.mjs`      | NEW             | Stage 1: persona -> gap report     |
| `devtools/persona-planner.mjs`       | NEW             | Stage 2: gap report -> build tasks |
| `devtools/persona-orchestrator.mjs`  | NEW             | Runs stages 1-2, manages queue     |
| `system/persona-pipeline-state.json` | NEW (runtime)   | Orchestrator state                 |
| `system/persona-build-plans/`        | NEW (directory) | Build task output                  |
| `system/persona-debug/`              | NEW (directory) | Raw Ollama responses on failure    |

## Existing Files: DO NOT MODIFY

- `devtools/persona-autopilot.mjs` -- legacy, keep working
- `devtools/persona-to-codex.mjs` -- legacy, keep working
- `devtools/persona-analysis-to-build.mjs` -- legacy, keep working
- `devtools/persona-inbox-server.mjs` -- will wire to v2 later (separate task)
- `devtools/persona-intake.mjs` -- keep working
- Everything in `app/`, `lib/`, `components/` -- production code, never touch

## npm Scripts to Add (in package.json)

```json
"personas:analyze": "node devtools/persona-analyzer.mjs",
"personas:plan": "node devtools/persona-planner.mjs",
"personas:orchestrate": "node devtools/persona-orchestrator.mjs --watch",
"personas:orchestrate:once": "node devtools/persona-orchestrator.mjs --once"
```

These are ADDITIVE. Do not remove or rename existing `personas:*` scripts.

---

## Guardrails (for any agent building from this spec)

1. **No production code.** These scripts live in `devtools/`. They never import from `app/`, `lib/`, or `components/`.
2. **No new dependencies.** Use only Node.js built-ins (fs, path, child_process, url) and global `fetch` (Node 18+).
3. **No TypeScript.** These are standalone `.mjs` scripts. No build step.
4. **No em dashes.** Use commas, semicolons, or separate sentences.
5. **No database access.** These scripts read files and call Ollama. Nothing else.
6. **Additive only.** New files. New scripts. Never modify existing files except REGISTRY.md (append-only).
7. **Fail loudly.** Every error prints a clear message and exits non-zero. No silent failures.
8. **One persona at a time.** Serial processing. Don't parallelize Ollama calls.

## Testing

After building, verify with:

```bash
# Stage 1 alone
node devtools/persona-analyzer.mjs "Chef Flow Personas/Completed/Chef/kai-donovan.txt"
# Should produce a report in docs/stress-tests/

# Stage 2 alone
node devtools/persona-planner.mjs "docs/stress-tests/persona-kai-donovan-2026-04-25.md"
# Should produce task files in system/persona-build-plans/kai-donovan/

# Full pipeline
node devtools/persona-orchestrator.mjs --once --dry-run
# Should list what would be processed without doing anything

node devtools/persona-orchestrator.mjs --once
# Should process any pending personas end-to-end
```

If Ollama is not running, all three scripts should print an error and exit 1 (not crash, not hang).

---

## What Happens to Build Tasks After They're Queued

The files in `system/persona-build-plans/{slug}/task-{N}.md` are self-contained build specs. They can be:

1. **Sent to Codex** via `codex cloud exec` (using the existing persona-to-codex.mjs pattern)
2. **Opened in Claude Code** and executed manually
3. **Picked up by any coding agent** that can read a spec and write code
4. **Read by the developer** and built by hand

The pipeline's job is DONE once build tasks exist on disk. Execution is a separate concern.
