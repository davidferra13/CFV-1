---
name: persona-build
description: Process persona pipeline findings into built features. Reads batch synthesis, validates every gap against the actual codebase, filters out already-built features, and builds genuinely missing ones in priority order. The critical step the Ollama analyzer cannot do.
user-invocable: true
---

# Persona Build

Process persona pipeline findings into built features. This is the step Ollama cannot do - it requires codebase access, judgment, and real verification.

## Procedure

### 1. Load Pipeline State

Read:

- `system/persona-batch-synthesis/priority-queue.json` - ranked gaps
- `system/persona-batch-synthesis/saturation.json` - what's saturated
- `system/persona-batch-synthesis/validation.json` - validation state
- `system/persona-pipeline-state.json` - pipeline status
- Latest persona reports in `system/persona-reports/` (if they exist)

### 2. Extract Gap List

From priority queue, pull all gaps sorted by priority. Each gap has:

- Description of what's missing
- Which persona(s) surfaced it
- Severity/priority score

### 3. Validate Every Gap Against Codebase

For EACH gap:

1. **Grep/glob for it.** Does the feature already exist?
2. **Check if it's wired.** Exists in code but not routed/rendered?
3. **Check if it's partial.** Server action exists but no UI? UI exists but no backend?

Classify each as:

- **BUILT** - fully working, persona analyzer was wrong. Skip it.
- **PARTIAL** - exists but incomplete. Note what's missing.
- **GENUINE** - truly missing. Needs building.

**Be aggressive about BUILT classification.** The Ollama analyzer hallucinates gaps constantly. Verify before building anything.

### 4. Filter and Prioritize GENUINE Gaps

Apply these filters:

- Skip anything requiring schema changes (needs approval)
- Skip anything touching auth or billing (needs approval)
- Skip anything the developer has explicitly deprioritized (check memory)
- Prefer gaps surfaced by multiple personas
- Prefer gaps in active feature areas (check `docs/product-blueprint.md`)

### 5. Build

For each GENUINE gap, in priority order:

1. State what you're building and why
2. Build it (follow all CLAUDE.md rules)
3. Verify it works
4. Mark it done in pipeline state

### 6. Output Summary

```
## Persona Build Report

**Pipeline gaps processed:** [count]
**Already built (false positives):** [count]
**Partial (wired up):** [count]
**Genuinely built:** [count]
**Skipped (needs approval):** [count]

### Built
- [feature]: [what was done]

### Wired Up (was partial)
- [feature]: [what was connected]

### Needs Approval
- [feature]: [why it needs approval]

### False Positives
- [feature]: [already existed at path:line]
```

## Rules

- NEVER trust the persona analyzer blindly. It runs on local Ollama and hallucinates gaps that are already built. Verify everything.
- NEVER build schema changes, auth changes, or billing changes without developer approval.
- Commit after each meaningful chunk of work, not all at the end.
- If more than 50% of gaps are false positives, note this - the analyzer may need recalibration.
