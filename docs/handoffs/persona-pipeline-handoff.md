# Handoff: Persona-to-Codex Autonomous Pipeline

> Written: 2026-04-25
> Context: Fresh agent should read this top-to-bottom before touching anything.

---

## What Is This?

A pipeline that stress-tests ChefFlow against different user personas (chef, client, vendor, etc.) automatically. The goal: drop a persona description file in a folder, walk away, and wake up to a scored report on how well ChefFlow serves that persona, plus safe UI quick wins already applied on a branch.

## The End Goal (Not Yet Achieved)

```
You drop a .txt file describing a person    ──►  Pipeline generates a Codex task spec
                                            ──►  Pushes spec to GitHub
                                            ──►  Submits task to OpenAI Codex cloud
                                            ──►  Codex reads the spec, audits ChefFlow
                                            ──►  Codex writes a scored report (docs/stress-tests/)
                                            ──►  Codex applies safe quick wins (<20 lines)
                                            ──►  Codex pushes a branch (codex/persona-{slug})
                                            ──►  codex-review.mjs reviews branch next morning
```

**Zero touch after the file drop.** That's the vision.

---

## What EXISTS and WORKS

### The Script: `devtools/persona-to-codex.mjs`

Fully built. Does everything up to Codex submission. Tested and committed on `main`.

**What it does:**

1. Scans `Chef Flow Personas/Uncompleted/{Type}/` for `.txt` and `.md` files
2. Validates content (skips empty, skips under 50 chars, skips duplicates)
3. Generates a detailed Codex task spec in `system/codex-queue/persona-{slug}.md`
4. Moves source file to `Chef Flow Personas/Completed/{Type}/`
5. (If `--submit`) Pushes specs to GitHub, then calls `codex cloud exec`
6. (If `--watch`) Polls every N seconds for new files continuously

**Flags:**

```bash
node devtools/persona-to-codex.mjs                          # One-shot, generate specs only
node devtools/persona-to-codex.mjs --dry-run                # Preview, no writes
node devtools/persona-to-codex.mjs --limit 3                # Process max 3
node devtools/persona-to-codex.mjs --submit                 # Generate + submit to Codex
node devtools/persona-to-codex.mjs --submit --env ENV_ID    # Explicit env ID
node devtools/persona-to-codex.mjs --watch --submit         # Background daemon mode
node devtools/persona-to-codex.mjs --watch --interval 60    # Custom poll interval (seconds)
```

**Env ID:** Stored in `system/codex-env.txt` (currently `davidferra13/CFV-1`). Set once.

### Folder Structure

```
Chef Flow Personas/
  Uncompleted/           <-- Drop persona files here
    Chef/
    Client/
    Guest/
    Vendor/
    Staff/
    Partner/
    Public/
  Completed/             <-- Files move here after processing
    Chef/                <-- 3 files here now (Kai Donovan, Leo Varga, Rina Solis)
    Client/
    ...etc
```

### Generated Specs

Three specs exist in `system/codex-queue/`:

- `persona-kai-donovan.md`
- `persona-leo-varga.md`
- `persona-rina-solis.md`

Each contains the full Codex task template from the build spec (read `docs/specs/persona-pipeline-autonomous-agent.md` for the template).

### Codex Environment

- Environment created: `davidferra13/CFV-1` on chatgpt.com/codex
- Simple tasks succeed ("list files" returned `ready`)
- Post-setup caching is ON (dependency cache built)

### Existing Infra

- `devtools/wish-to-codex.mjs` -- the template this script was modeled after
- `devtools/codex-review.mjs` -- reviews codex/\* branches (typecheck, diff stats, report)
- `scripts/open-codex-usage-window.ps1` -- opens Codex UI in browser

---

## What is BROKEN

### Codex Task Submissions Error (0% success rate)

**All 6 persona task submissions failed with `error` status.** Two batches:

- Batch 1 (3 tasks): Failed immediately. Likely cold-start (environment had no cache yet).
- Batch 2 (3 tasks): Failed AFTER environment was warm. Simple read-only tasks succeed in the same environment, so the env works.

**Root cause is unknown.** The `codex cloud status` and `codex cloud diff` commands give no error details, just "error" and "no diff". The CLI doesn't expose error logs.

**Possible causes (investigate in this order):**

1. **Branch flag issue:** `--branch codex/persona-{slug}` may fail because the branch doesn't exist yet on the remote. Codex might need the branch to already exist, or it might not support branch creation.
2. **Prompt too vague:** "Read and execute the task spec at system/codex-queue/persona-kai-donovan.md" might not give Codex enough to work with. Maybe the full spec content needs to be the prompt somehow.
3. **Repo too large:** CFV-1 is a big repo. Codex might be timing out during clone/setup.
4. **Environment config missing:** May need environment variables, setup script, or internet access configured differently.
5. **Codex limitations:** The task might be too complex for Codex's current capabilities (multi-step: read spec, audit codebase, write report, apply changes, update registry).

### Background Watcher

A watcher process was started (PID 95873) but it has nothing to process (all 3 personas already moved to Completed). The watcher code IS fixed (`shell: true` for Windows npx), but the underlying Codex submission issue means even when it picks up new files, submissions will likely fail until the root cause is fixed.

---

## What to Do Next (Ordered)

### 1. Diagnose WHY Codex tasks error

Open the failed tasks in the Codex web UI to see error logs:

- https://chatgpt.com/codex/tasks/task_e_69ed0fd67e148320a706a2d95408065d (Kai Donovan, batch 2)
- https://chatgpt.com/codex/tasks/task_e_69ed0fde80548320b4f63dc0c9990bd4 (Leo Varga, batch 2)
- https://chatgpt.com/codex/tasks/task_e_69ed0fe65f8c8320833f906b7849f9cd (Rina Solis, batch 2)

The web UI shows full execution logs that the CLI doesn't expose. Look for: setup failures, file-not-found errors, branch creation issues, or timeout messages.

### 2. Test with simpler Codex tasks

Try submitting a task that only does one thing:

```bash
npx @openai/codex cloud exec --env "davidferra13/CFV-1" "Read system/codex-queue/persona-kai-donovan.md and create docs/stress-tests/persona-kai-donovan-2026-04-25.md with a summary of what you read."
```

If this succeeds, the issue is task complexity. Break the spec into smaller steps.

If this fails, the issue is environment setup or repo access.

### 3. Try without --branch flag

The `--branch` flag might be causing issues. Test without it:

```bash
npx @openai/codex cloud exec --env "davidferra13/CFV-1" "Read system/codex-queue/persona-kai-donovan.md and follow the instructions."
```

### 4. Check Codex environment config

At chatgpt.com/codex > Environments > davidferra13/CFV-1:

- Does it need a setup script? (e.g., `npm install`)
- Does it need environment variables?
- Is "Agent internet access" set to "On: common dependencies"?
- Is the repo accessible? (CFV-1 is private)

### 5. Once submissions work, verify end-to-end

Drop a new test persona file, let the watcher pick it up, confirm Codex runs it, review the branch with `codex-review.mjs`.

---

## Key Files

| File                                              | Purpose                                        |
| ------------------------------------------------- | ---------------------------------------------- |
| `devtools/persona-to-codex.mjs`                   | The pipeline script (built this session)       |
| `docs/specs/persona-pipeline-autonomous-agent.md` | The build spec (template, rules, architecture) |
| `system/codex-env.txt`                            | Codex environment ID (`davidferra13/CFV-1`)    |
| `system/codex-queue/persona-*.md`                 | Generated Codex task specs                     |
| `system/persona-watcher.log`                      | Background watcher log                         |
| `Chef Flow Personas/Uncompleted/`                 | Input folder (drop files here)                 |
| `Chef Flow Personas/Completed/`                   | Processed files land here                      |
| `devtools/wish-to-codex.mjs`                      | Reference script (same patterns)               |
| `devtools/codex-review.mjs`                       | Reviews codex/\* branches                      |

## Commands Reference

```bash
# Check Codex task status
npx @openai/codex cloud list --json

# Get details on a specific task
npx @openai/codex cloud status TASK_ID

# Submit a task manually
npx @openai/codex cloud exec --env "davidferra13/CFV-1" "prompt here"

# Start the watcher
node devtools/persona-to-codex.mjs --watch --submit

# Check watcher log
cat system/persona-watcher.log

# Kill watcher
# Find PID in log or use: ps aux | grep persona-to-codex | grep -v grep
```

## Git State

All work is committed and pushed to `main`. No dangling branches or uncommitted changes from this work. Commits:

1. `feat(devtools): persona-to-codex pipeline script` -- initial script
2. `feat(devtools): add --submit flag for autonomous Codex submission` -- Codex integration
3. `feat(devtools): add --watch mode for background polling` -- daemon mode
4. `chore: queue 3 persona specs + fix submit for Windows` -- specs + shell:true fix
