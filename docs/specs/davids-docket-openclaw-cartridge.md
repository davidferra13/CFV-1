# Spec: David's Docket (OpenClaw Cartridge)

> **Status:** verified (built and tested 2026-04-05)
> **Priority:** P0 (blocking)
> **Depends on:** Existing OpenClaw dashboard at Pi:8090 (SSH resolved 2026-04-05)
> **Estimated complexity:** large (9+ files across Pi and PC)

## Timeline

| Event                 | Date             | Agent/Session                | Commit |
| --------------------- | ---------------- | ---------------------------- | ------ |
| Created               | 2026-04-05 23:00 | General (strategic planning) |        |
| Status: ready         | 2026-04-05 23:00 | General (strategic planning) |        |
| Claimed (in-progress) | 2026-04-05 01:00 | General (builder)            |        |
| Build completed       | 2026-04-05 01:20 | General (builder)            |        |
| E2E test passed       | 2026-04-05 01:16 | General (builder)            |        |
| Status: verified      | 2026-04-05 01:20 | General (builder)            |        |

---

## Developer Notes

### Raw Signal

"My problem is, I don't have time to sit at my computer all day. And trying to finish this has become a full-time job. I've noticed that everything I'm doing is ultimately getting passed on to Claude. All ultimately, I do every day is create planning documents for a building agent if you were to really simplify it. And that takes hours. And we're at a stage where we're not doing significant overhauling or crazy work where it requires insane monitoring."

"I think, instead of me wasting my time and money, we're gonna make a brand new cartridge for OpenClaw that knows how to read my docket and perform what I would be doing all day that day as if it was me sitting at my computer. Most importantly, OpenClaw is not allowed to do anything to the physical folder. It is not allowed to touch it or modify or do anything. All it's allowed to do is read it. We also have to understand that OpenClaw is running on the least smartest model, and that's fine, because everything it does is simply getting passed off."

"We need to make sure that when I add things to the docket, it's not just like a real quick bullshit. If things are going on David's Docket for OpenClaw to take full control of, there needs to be no gaps or ambiguity."

"I still want to sit around and do my normal workflow. I can just take things off its list if I'm working on it."

### Developer Intent

- **Core goal:** Replace the developer as the human-in-the-loop for the research/planning phase of ChefFlow development. The developer writes a task list on the Pi dashboard, walks away, and comes back to finished planning documents ready for Claude Code to build.
- **Key constraints:** The Pi must NEVER write to the ChefFlow repo. It reads the codebase via a git clone mirror. Documents are produced on the Pi and pulled to the PC by an existing sync pattern. The Pi uses Groq free tier (Llama 3.3 70B) as primary brain with local Ollama (qwen2.5-coder:7b) as fallback. The developer can still work manually on any item by claiming it.
- **Motivation:** The developer spends 10-hour days doing research and spec writing that could run autonomously. At $400/month in AI subscriptions plus massive time cost, this is unsustainable. The project is mature enough that most remaining work is refinement, additions, and fixes, not novel architecture.
- **Success from the developer's perspective:** Wake up, write 3 items on the docket from your phone over coffee, go cook dinners, come home, find finished specs in the repo ready for Claude Code to build.

---

## What This Does (Plain English)

David's Docket is a new OpenClaw cartridge that runs on the Raspberry Pi. It provides a web form on the existing Pi dashboard (10.0.0.177:8090) where the developer adds tasks. The cartridge autonomously processes each task: it reads the ChefFlow codebase from a local git mirror, researches the relevant files, and produces a finished planning document (spec, research report, bug report, or refinement doc). Finished documents are staged on the Pi for the PC to pull into the ChefFlow repo. The developer can monitor progress, claim items for manual work, or review output quality from any device on the local network.

---

## Why It Matters

The developer's entire workflow is: idea -> research -> spec -> build. The research and spec phases consume 80% of the developer's time but only 20% of the decision-making. This cartridge automates the 80%, freeing the developer to focus on the 20% (creative decisions, product direction, and reviewing output) and to actually run their chef business.

---

## Architecture

```
DEVELOPER (phone/any device)
  |
  |  Writes tasks on 10.0.0.177:8090/docket
  |
  v
PI: DOCKET DATABASE (SQLite)
  |
  |  docket.db: items table with status tracking
  |
  v
PI: DOCKET PROCESSOR (cron, every 30 min)
  |
  |  Picks up pending items by priority
  |  Reads ChefFlow codebase from local git mirror
  |  Loads targeted context (CLAUDE.md, project map, app audit, source files)
  |  Feeds to Ollama (qwen3-coder:30b or configured model)
  |  Produces planning document
  |  Saves to ~/openclaw-docket/output/
  |  Updates item status to done + confidence rating
  |
  v
PC: SYNC SCRIPT (piggybacks on existing sync-all.mjs)
  |
  |  SSHes into Pi, pulls finished documents
  |  Drops into docs/specs/ or docs/research/ with status: draft
  |
  v
CLAUDE CODE (builder)
  |
  |  Reads specs from docs/specs/ as normal
  |  Builds from docket-produced documents same as any other spec
```

---

## Components

### Component 1: Docket UI (Pi dashboard page)

**Location:** New page on existing Express.js dashboard at Pi:8090

**Form fields (3 required, 4 optional with smart defaults):**

| Field                        | Required | Type                   | Default     | Notes                                                                                                                                                                                                          |
| ---------------------------- | -------- | ---------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Title                        | Yes      | Text                   | -           | Short name: "Fix forgot password"                                                                                                                                                                              |
| What's wrong / what's needed | Yes      | Textarea               | -           | The actual problem or gap                                                                                                                                                                                      |
| Dev notes                    | Yes      | Textarea               | -           | Raw thoughts, constraints, references                                                                                                                                                                          |
| Where in app                 | No       | Text with autocomplete | -           | Route or page name. Autocomplete from project map filenames. This is the lookup key for codebase context.                                                                                                      |
| Output type                  | No       | Select                 | Auto-detect | Spec / Research / Bug Report / Refinement. Auto-detected from title keywords: "fix","broken","wrong" = Bug Report; "add","new","create" = Spec; "can we","should we","investigate" = Research; else Refinement |
| Priority                     | No       | Select                 | Medium      | High / Medium / Low                                                                                                                                                                                            |
| Complexity                   | No       | Select                 | Auto-assess | Simple / Medium / Complex. Complex items get flagged "needs human session" and are not auto-processed.                                                                                                         |

**List view:**

Shows all docket items with columns: title, status, priority, output type, confidence, processing time, created date. Status badges color-coded:

- `pending` (gray)
- `in-progress` (blue, with elapsed time)
- `done` (green, with confidence badge)
- `claimed` (yellow, developer is handling manually)
- `flagged` (orange, complex item needs human session)
- `pulled` (dim, already synced to PC)

**Actions per item:** Edit, Claim, Delete, View Output (when done), Re-process (send back to pending)

---

### Component 2: Codebase Mirror (Pi)

**Location:** `~/chefflow-mirror/` on Pi

**Setup:** One-time `git clone` of the ChefFlow repo from GitHub. Read-only. Never pushes.

**Update schedule:** `git pull` every hour via cron. Runs before the docket processor so context is fresh.

**What the processor reads from the mirror:**

For every docket item, the processor loads context in this order:

1. `CLAUDE.md` (rules, patterns, constraints) - always loaded
2. `docs/specs/_TEMPLATE.md` (output format) - always loaded for spec output type
3. `project-map/` - the file matching the "where in app" field (e.g., "dashboard" -> `project-map/chef-os/dashboard.md`)
4. `docs/app-complete-audit.md` - the section matching the "where in app" field (grep for the route/page name, extract that section)
5. `docs/product-blueprint.md` - current progress, known issues (always loaded, but just the summary section)
6. Targeted source files - the processor searches the mirror for files matching the docket item's context (route files, components, server actions mentioned in the project map entry)

**Context budget:** Maximum 30KB of text fed to the model per item. Groq's free tier has a 12K token-per-minute limit; 30KB context + system/user prompt fits within this. Local qwen2.5-coder:7b handles 32K tokens for fallback. If targeted files exceed 30KB, prioritize: project map > app audit section > source files (newest first). CLAUDE.md is loaded selectively (too large for the full file).

---

### Component 3: Docket Processor (Pi)

**Location:** `~/openclaw-docket/processor.mjs`

**Trigger:** Cron job every 10 minutes (fast cycle). Also triggerable manually from the dashboard ("Process Now" button). High-priority items trigger immediate processing via a webhook from the dashboard API.

**AI routing (speed-first):**

| Priority | Primary                | Fallback               | Why                                  |
| -------- | ---------------------- | ---------------------- | ------------------------------------ |
| High     | Groq (Llama 3.3 70B)   | Local qwen2.5-coder:7b | Fast turnaround, best quality        |
| Medium   | Groq (Llama 3.3 70B)   | Local qwen2.5-coder:7b | Same routing, normal queue           |
| Low      | Local qwen2.5-coder:7b | Groq if local busy     | Save Groq quota for high-value items |

Groq processes a full spec in 5-15 seconds. Local Ollama takes 3-10 minutes. The difference is dramatic.

**Processing loop:**

```
1. Check docket.db for items with status = 'pending', ordered by priority (high first), then created_at
2. If no pending items, exit
3. Pick the first item. Set status = 'in-progress', set started_at = now
4. Check complexity. If 'complex', set status = 'flagged', skip to next item
5. Pull latest codebase mirror (git pull)
6. Load context files based on "where in app" field
7. Build the prompt:
   - System prompt: "You are a ChefFlow planning agent. Read the project rules, understand the codebase, and produce a [output_type] document."
   - Context: CLAUDE.md + template + project map + app audit section + source files
   - Task: the docket item's fields (title, what's wrong, dev notes, where in app)
   - Output format: the spec template (for specs) or research report format (for research)
8. Try Groq first (Llama 3.3 70B via OpenAI-compatible API). If rate-limited or down, fall back to local Ollama (qwen2.5-coder:7b)
9. Receive output
10. Self-assess confidence:
    - Did the model reference real file paths from the mirror? (check against actual files)
    - Did the model fill all required template sections?
    - Did the output exceed minimum length (500 words for specs, 300 for bug reports)?
    - Score: high (all checks pass), medium (1 check fails), low (2+ checks fail)
11. Save output to ~/openclaw-docket/output/{item_id}-{output_type}-{title_slug}.md
12. Update docket.db: status = 'done', confidence = score, completed_at = now, files_read = list, processing_time_seconds = elapsed, model = which model was used
13. Move to next pending item
```

**Developer feedback loop:**

Each completed item shows a thumbs up/down on the dashboard. Feedback is stored in docket.db. If 3+ consecutive items get thumbs down, the processor auto-flags subsequent items as "needs human session" until the developer resets the quality gate. This prevents wasting processing on bad prompts or model drift.

**Output document format:**

Every output document includes a header block that identifies it as docket-produced:

```markdown
---
source: davids-docket
docket_item_id: { id }
title: { title }
output_type: { spec|research|bug_report|refinement }
confidence: { high|medium|low }
files_read: [{ list of files the processor loaded }]
processed_at: { ISO timestamp }
model: { model name used }
status: draft
---
```

For specs: the body follows `_TEMPLATE.md` format exactly. The Developer Notes section is populated from the docket item's "dev notes" and "what's wrong" fields.

For research: the body follows the research report format from `docs/research/`.

For bug reports: the body documents the problem, root cause analysis, affected files, and recommended fix.

For refinements: the body documents what exists, what should change, and why.

---

### Component 4: PC Pull Script

**Location:** Addition to existing `scripts/openclaw-pull/sync-all.mjs`

**What it does:**

1. SSH into Pi
2. List files in `~/openclaw-docket/output/` that haven't been pulled yet (check against a local manifest or use the `pulled` status in docket.db)
3. SCP each file to the correct local folder:
   - Output type `spec` or `refinement` -> `docs/specs/`
   - Output type `research` -> `docs/research/`
   - Output type `bug_report` -> `docs/specs/` (bug fixes are actionable specs)
4. Update docket.db on Pi: set status = 'pulled' for synced items
5. Log what was pulled

**Schedule:** Runs as part of the existing hourly sync, or on-demand via the Operator dashboard.

**No git commit.** The pull script drops files into the repo but does NOT commit them. Claude Code sees them on next session start and decides what to do with them.

---

## Data Model

### docket.db (new SQLite database on Pi)

```sql
CREATE TABLE docket_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  whats_wrong TEXT NOT NULL,
  dev_notes TEXT NOT NULL,
  where_in_app TEXT DEFAULT NULL,
  output_type TEXT DEFAULT 'auto' CHECK(output_type IN ('spec', 'research', 'bug_report', 'refinement', 'auto')),
  priority TEXT DEFAULT 'medium' CHECK(priority IN ('high', 'medium', 'low')),
  complexity TEXT DEFAULT 'auto' CHECK(complexity IN ('simple', 'medium', 'complex', 'auto')),
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'done', 'claimed', 'flagged', 'pulled')),
  confidence TEXT DEFAULT NULL CHECK(confidence IN ('high', 'medium', 'low')),
  files_read TEXT DEFAULT NULL,
  output_filename TEXT DEFAULT NULL,
  processing_time_seconds INTEGER DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME DEFAULT NULL,
  completed_at DATETIME DEFAULT NULL,
  pulled_at DATETIME DEFAULT NULL
);
```

---

## Files to Create (Pi-side)

| File                                                              | Purpose                                                                          |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `~/openclaw-docket/processor.mjs`                                 | Main processing engine. Reads docket, loads context, calls Ollama, writes output |
| `~/openclaw-docket/docket.db`                                     | SQLite database for docket items                                                 |
| `~/openclaw-docket/output/`                                       | Staging directory for finished documents                                         |
| `~/openclaw-docket/context-loader.mjs`                            | Reads codebase mirror, builds targeted context for each item                     |
| `~/openclaw-docket/confidence-checker.mjs`                        | Self-assessment: validates output quality before marking done                    |
| `~/openclaw-docket/cron-entry.sh`                                 | Cron wrapper script                                                              |
| Dashboard additions to existing `~/openclaw-dashboard/server.mjs` | New API routes for docket CRUD + UI page                                         |
| Dashboard additions to existing `~/openclaw-dashboard/index.html` | New docket page with form and list view                                          |

## Files to Modify (PC-side)

| File                                 | What to Change                               |
| ------------------------------------ | -------------------------------------------- |
| `scripts/openclaw-pull/sync-all.mjs` | Add docket output pull step after price sync |

---

## Database Changes

None on ChefFlow PostgreSQL. The docket is entirely Pi-side SQLite. ChefFlow never knows about the docket. It only sees the finished documents that land in `docs/specs/` or `docs/research/`.

---

## Edge Cases and Error Handling

| Scenario                                                           | Correct Behavior                                                                                                                                       |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Ollama is offline or overloaded                                    | Mark item as `pending` (retry next cycle), log the failure. Do not mark as done with empty output.                                                     |
| "Where in app" doesn't match any project map file                  | Processor loads CLAUDE.md + template + full project map index (all filenames). Confidence automatically drops to medium or low.                        |
| Model produces garbage output (fails confidence checks)            | Mark as done with confidence: low. Developer sees the low rating on dashboard and knows to review or re-process.                                       |
| Developer claims an item while processor is working on it          | Processor checks status before writing output. If status changed to `claimed`, discard work and move on.                                               |
| Git pull fails (network down)                                      | Use last available mirror state. Log warning. Do not skip processing.                                                                                  |
| Docket item is ambiguous (auto-detect can't determine output type) | Default to Research. Research is the safest output, it investigates without committing to a build plan.                                                |
| Pi is under heavy load from price-intel                            | Docket processor checks system load before starting. If CPU > 85%, defer to next cycle. Price-intel has priority.                                      |
| Context exceeds 80KB budget                                        | Truncate source files (keep headers/exports, drop function bodies). Never truncate CLAUDE.md or template.                                              |
| Complex item submitted                                             | Auto-set to `flagged`. Dashboard shows "Needs human session" badge. Not processed until developer either downgrades complexity or handles it manually. |
| PC pull fails (SSH down)                                           | Log failure. Files stay in output folder. Next successful pull picks them up. No data loss.                                                            |

---

## Verification Steps

1. On Pi: add a docket item via the dashboard form at `10.0.0.177:8090/docket`
2. Verify the item appears in the list with status `pending`
3. Trigger processing manually (or wait for cron)
4. Verify status changes to `in-progress`, then `done`
5. Verify the confidence rating and files-read list are populated
6. Verify the output file exists in `~/openclaw-docket/output/`
7. Open the output file and confirm it follows the spec template format
8. On PC: run the sync script
9. Verify the document appears in `docs/specs/` or `docs/research/` with the docket header block
10. Verify the docket item status on Pi updated to `pulled`
11. Test claiming: add an item, claim it from dashboard, verify processor skips it
12. Test complexity flagging: add an item with complexity `complex`, verify it gets flagged, not processed

---

## Out of Scope

- Claude Code auto-building from docket output (builders still need a human "go build this" trigger)
- Voice input to docket (phone browser text input only for now)
- Docket items that require multi-step back-and-forth with the developer (complex items are flagged, not processed)
- Any writes from Pi to the ChefFlow repo (the PC always pulls, Pi never pushes)
- Mobile app for the docket (the Pi dashboard is already mobile-accessible via browser)
- AI model upgrades on Pi (uses whatever Ollama model is configured)

---

## Deployment Notes (Built 2026-04-05)

**All components are live and tested.** SSH resolved (use alias `pi`, user `davidferra`).

**Pi-side files deployed:**

- `~/openclaw-docket/processor.mjs` - Groq-first processor with Ollama fallback
- `~/openclaw-docket/context-loader.mjs` - Loads codebase context from mirror (30KB budget)
- `~/openclaw-docket/confidence-checker.mjs` - Self-assessment of output quality
- `~/openclaw-docket/init-db.mjs` - Database initializer
- `~/openclaw-docket/docket.db` - SQLite database (live)
- `~/openclaw-docket/output/` - Staging directory for finished documents
- `~/openclaw-dashboard/docket-routes.mjs` - API routes for docket CRUD
- `~/openclaw-dashboard/docket.html` - Dashboard UI page
- `~/chefflow-mirror/` - Shallow clone of ChefFlow repo (read-only)

**Cron jobs added:**

- Mirror update: every hour (`git pull`)
- Docket processor: every 10 minutes
- Log rotation: weekly

**PC-side changes:**

- `scripts/openclaw-pull/sync-all.mjs` - Added Step 4: pull docket output docs, mark as pulled on Pi

**AI routing:**

- Primary: Groq Llama 3.3 70B (2-second processing, free tier)
- Fallback: Local qwen2.5-coder:7b (3-10 minute processing)
- Context budget: 30KB (fits within Groq's 12K TPM free tier limit)

**E2E test result:** Item submitted, processed by Groq in 2 seconds, output saved with medium confidence, correct frontmatter and structure.
