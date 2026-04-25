# Build Spec: Autonomous Persona Pipeline

> **Status:** ready
> **Priority:** P0
> **Depends on:** nothing (self-contained devtools script)
> **Estimated effort:** 1 Codex agent, ~200 lines

---

## What This Is

A single Node.js script (`devtools/persona-to-codex.mjs`) that reads persona files from `Chef Flow Personas/Uncompleted/`, generates Codex-compatible task specs in `system/codex-queue/`, and moves processed persona files to `Chef Flow Personas/Completed/`.

This mirrors the existing `devtools/wish-to-codex.mjs` pattern exactly. Same structure, same output format, different input source.

---

## What This Is NOT

- This script does NOT evaluate personas itself. It generates specs for Codex to evaluate.
- This script does NOT modify application code. It only writes to `system/codex-queue/` and moves files between persona folders.
- This script does NOT call any AI APIs. It is pure file I/O and string templating.

---

## Architecture

```
Chef Flow Personas/Uncompleted/Chef/maria.txt    <-- INPUT (developer drops files)
                    |
                    v
    devtools/persona-to-codex.mjs                <-- THIS SCRIPT
                    |
                    v
    system/codex-queue/persona-maria.md           <-- OUTPUT (Codex task spec)
                    |
                    v
    Chef Flow Personas/Completed/Chef/maria.txt   <-- FILE MOVED after spec generated
```

---

## Input: Persona Files

Location: `Chef Flow Personas/Uncompleted/{Type}/`
Where `{Type}` is one of: `Chef`, `Client`, `Guest`, `Vendor`, `Staff`, `Partner`, `Public`

Files can be `.txt` or `.md`. Content is freeform persona description. No required format.

The script determines persona type from the folder name.

---

## Output: Codex Task Spec

Location: `system/codex-queue/persona-{slug}.md`

The generated spec must tell Codex exactly what to do. Codex is not as smart as Claude. The spec must be explicit, narrow, and safe.

### Generated Spec Template

The script must generate a file matching this exact template (fill in the `{variables}`):

```markdown
# Codex Task: Persona Stress Test - {persona_name}

## Objective

Evaluate ChefFlow's fitness for the following persona, then make ONLY the safe improvements identified.

## The Persona

{full persona text pasted from the source file}

## Persona Type: {type}

## Instructions

### Step 1: Evaluate (READ ONLY - do not change any files yet)

Read these files to understand what ChefFlow currently offers:

- `docs/product-blueprint.md` (feature list and status)
- `docs/app-complete-audit.md` (every UI element that exists)
- `docs/service-lifecycle-blueprint.md` (the engagement model)
- `lib/billing/feature-classification.ts` (free vs paid features)

Based on the persona description, identify:

1. Which ChefFlow features this persona would use
2. Which features are missing or partially built for this persona
3. Which gaps are QUICK WINS (< 20 lines changed, existing files only)

### Step 2: Write the Report

Create file: `docs/stress-tests/persona-{slug}-{date}.md`

The report MUST follow this exact structure:
```

# Persona Stress Test: {persona_name}

## Generated: {date}

## Type: {type}

## Persona Summary

[2-3 sentence summary of who this person is and what they need]

## Capability Fit (rate each as SUPPORTED / PARTIAL / MISSING)

[List each relevant ChefFlow feature area and rate it]

## Top 5 Gaps

[The 5 most important things ChefFlow cannot do for this persona]
[For each: what's missing, which file would need to change, effort estimate]

## Quick Wins Found

[Changes under 20 lines that would improve the experience]
[For each: exact file, what to change, why]

## Score: X/100

[Workflow Coverage, Data Model Fit, UX Alignment, Financial Accuracy]
[Weighted final score with 1-sentence justification]

## Verdict

[2 sentences: would this persona succeed on ChefFlow today?]

```

### Step 3: Apply ONLY Quick Wins (if any)

Rules for code changes:
- ONLY changes under 20 lines in a SINGLE EXISTING file
- NEVER create new files (except the report)
- NEVER modify database schemas or migrations
- NEVER modify auth, layout, or routing
- NEVER modify lib/billing/ or payment code
- ONLY modify: UI text, default values, empty states, labels, placeholder text, tooltips
- If unsure whether a change is safe: DO NOT MAKE IT. Document it in the report instead.

### Step 4: Update the Registry

Append one row to the table in `docs/stress-tests/REGISTRY.md` under "## Persona Registry":

| # | Label | Type | Date | Score | Method | Report | Key Finding |
|---|-------|------|------|-------|--------|--------|-------------|
| {next_number} | {persona_name} | {type} | {date} | {score}/100 | Codex autonomous | `docs/stress-tests/persona-{slug}-{date}.md` | {one sentence} |

## Scope

Only modify files within:
- docs/stress-tests/ (reports and registry)
- app/(chef)/ (UI text/labels only, no logic)
- app/(client)/ (UI text/labels only, no logic)
- app/(public)/ (UI text/labels only, no logic)
- components/ (UI text/labels only, no logic)

Do NOT modify:
- database/ (no migrations, no schema changes)
- lib/auth/ (no auth changes)
- lib/billing/ (no payment changes)
- lib/db/ (no database logic)
- lib/ai/ (no AI changes)
- app/(chef)/layout.tsx (no layout gates)
- Any server action file (no business logic)
- devtools/ (no self-modification)
- .claude/ (no skill/agent changes)

## Branch
codex/persona-{slug}

## Guardrails
These rules are mandatory. Violating any of them makes the task a failure.

- All monetary amounts in integer cents, never floats
- Every database query must be tenant-scoped
- No em dashes anywhere
- "OpenClaw" must never appear in UI text
- No @ts-nocheck in any new file
- No DROP TABLE, DROP COLUMN, DELETE, or TRUNCATE
- Wrap side effects in try/catch
- Use only existing component variants: Button (primary/secondary/danger/ghost), Badge (default/success/warning/error/info)
- AI must never generate recipes
- No forced onboarding gates

## Acceptance Criteria
- [ ] Report exists at `docs/stress-tests/persona-{slug}-{date}.md`
- [ ] Report follows the exact structure above
- [ ] Registry row added to `docs/stress-tests/REGISTRY.md`
- [ ] `npx tsc --noEmit --skipLibCheck` exits 0
- [ ] No files modified outside scope directories
- [ ] No code changes over 20 lines in any single file
- [ ] No new files created (except the report)

## Context
Stack: Next.js 14, PostgreSQL (Drizzle ORM via postgres.js), Auth.js v5, Tailwind CSS, TypeScript.
Server actions with 'use server' for business logic. SSE for realtime. Local filesystem for storage.
ChefFlow is an operating system for food service professionals (primarily solo private chefs).
```

---

## Script Behavior

### Arguments

```bash
node devtools/persona-to-codex.mjs              # process all uncompleted
node devtools/persona-to-codex.mjs --limit 3     # process max 3
node devtools/persona-to-codex.mjs --dry-run     # preview without writing
```

### Processing Logic

1. Scan all 7 type folders under `Chef Flow Personas/Uncompleted/`
2. Collect all `.txt` and `.md` files
3. Sort by type folder (Chef first, then Client, Guest, Vendor, Staff, Partner, Public), then alphabetically
4. For each file:
   a. Read the file content
   b. Extract persona name from filename (strip extension, convert hyphens/underscores to spaces, title case)
   c. Determine type from parent folder name
   d. Generate slug from filename (lowercase, hyphens, max 48 chars)
   e. Check if `system/codex-queue/persona-{slug}.md` already exists; skip if so
   f. Generate the Codex task spec using the template above
   g. Write to `system/codex-queue/persona-{slug}.md`
   h. Move the source file from `Uncompleted/{Type}/` to `Completed/{Type}/`
   i. Log: `[persona-to-codex] Generated: system/codex-queue/persona-{slug}.md ({type})`
5. Final log: `[persona-to-codex] Done. {N} specs queued in system/codex-queue/`

### Edge Cases

- Empty file: skip, log warning, do NOT move to Completed
- File under 50 characters: skip, log warning (persona too thin)
- Duplicate slug (spec already exists): skip, log "already queued"
- Missing Uncompleted folders: create them silently
- File with no recognizable type folder: skip, log error

---

## Files Created/Modified

| File                                    | Action                                    |
| --------------------------------------- | ----------------------------------------- |
| `devtools/persona-to-codex.mjs`         | CREATE (the script)                       |
| `system/codex-queue/persona-*.md`       | CREATE (generated specs, one per persona) |
| `Chef Flow Personas/Completed/{Type}/*` | MOVE (source files moved here)            |

No application code modified. No database changes. No config changes.

---

## Existing Code to Reference

The script should follow the exact same patterns as `devtools/wish-to-codex.mjs`:

- Same import style (node:fs, node:path)
- Same argument parsing pattern
- Same logging format `[persona-to-codex]`
- Same slug generation (lowercase, hyphens, max 48)
- Same dry-run behavior

---

## Testing

After running, verify:

1. `ls system/codex-queue/persona-*` shows generated specs
2. `ls "Chef Flow Personas/Completed/"` shows moved files
3. `ls "Chef Flow Personas/Uncompleted/"` shows remaining files (or empty)
4. Each generated spec is valid markdown with all template fields filled
5. No persona file was lost (count Uncompleted + Completed + codex-queue should be consistent)

---

## Timeline

| Step | Action                                              |
| ---- | --------------------------------------------------- |
| 1    | Build `devtools/persona-to-codex.mjs`               |
| 2    | Test with `--dry-run` against any test persona file |
| 3    | Run for real against actual persona files           |
| 4    | Review generated specs in `system/codex-queue/`     |
| 5    | Submit specs to Codex                               |
