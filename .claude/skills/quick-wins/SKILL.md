---
name: quick-wins
description: Scan real gap sources, extract parallel-safe quick wins (additive-only, independent, under 30 min each), output as Codex-ready specs or grouped task list.
user-invocable: true
---

# Quick Wins

Scan real gap sources. Extract parallel-safe quick wins. Additive-only, independent, under 30 min each.

## Procedure

### 1. Scan Gap Sources

Read these (skip missing):

- `system/persona-batch-synthesis/priority-queue.json` - queued gaps from persona pipeline
- `system/persona-batch-synthesis/saturation.json` - saturation data
- `system/persona-batch-synthesis/validation.json` - validation results
- Latest persona reports in `system/persona-reports/`
- `docs/build-state.md` - current build issues
- `docs/product-blueprint.md` - incomplete features
- MemPalace backlog: `memory/project_mempalace_backlog.md`

### 2. Filter Candidates

Each candidate MUST pass ALL filters:

| Filter        | Rule                                                   |
| ------------- | ------------------------------------------------------ |
| Additive only | No deletions, no migrations, no schema changes         |
| Independent   | No dependency on other wins; can ship alone            |
| Under 30 min  | Realistic for one focused session                      |
| Parallel-safe | Won't conflict with other wins if built concurrently   |
| Verifiable    | Clear done-state (UI visible, test passes, error gone) |

Kill anything that touches auth, billing, schema, or financial calculations. Those are never quick.

### 3. Validate Against Codebase

For each candidate:

1. Grep/glob to confirm the gap actually exists (not already built)
2. Identify exact file(s) to change
3. Estimate line count

Drop any candidate where the gap is already fixed or the fix touches more than 3 files.

### 4. Rank

Sort by: business impact (high/med/low) then effort (ascending).

### 5. Output Format

```
## Quick Wins ([count] found)

### 1. [Title]
- **Gap:** [what's wrong/missing]
- **Fix:** [exact change]
- **File(s):** [paths]
- **Effort:** [~X min]
- **Impact:** [high/med/low]

### 2. [Title]
...
```

If outputting for Codex, use this format per win:

```markdown
## Codex Task: [Title]

**Context:** [1-2 sentences]
**Change:** [exact instructions]
**Files:** [paths]
**Verify:** [how to confirm it worked]
```

## Rules

- Maximum 10 wins per run. Quality over quantity.
- Every win must cite the source gap (persona report, blueprint line, backlog item).
- If zero wins pass all filters, say so. Don't force bad candidates.
- Never include wins that require user input or approval (schema, billing, auth changes).
