---
name: persona-inbox
description: Manage the persona pipeline without a running server. Status, run, synthesize, validate, import, queue, generate, vault, sources. CLI-first, no HTTP needed.
---

# Persona Inbox

Manage the persona pipeline without the HTTP server running. CLI-first.

## Saturation Gate

Before `run`, `generate`, or bulk `import`, read `system/persona-batch-synthesis/saturation.json` when it exists.

If `saturation.saturated` is `true`:

1. Report the saturation state: total personas, categories discovered, consecutive zero-new-category count, and latest synthesis date if available.
2. Do not generate more generic personas by default.
3. Route the user toward `queue`, `synthesize`, `findings-triage`, `quick-wins`, or `persona-build`.
4. Continue importing only when the user explicitly wants a named edge case, missing category, real customer, or strategically important persona.
5. For accepted imports after saturation, label the reason: `edge-case`, `real-user`, `missing-domain`, `strategic`, or `user-explicit`.

The current pipeline can be saturated while still having many build gaps. Saturation means "stop collecting more generic personas"; it does not mean "the product is complete."

## Subcommands

Usage: `/persona-inbox [subcommand]` or just `/persona-inbox` for status.

### status (default)

Show pipeline state:

1. Read `system/persona-pipeline-state.json`
2. Read `system/persona-batch-synthesis/saturation.json`
3. Count files in `Chef Flow Personas/Uncompleted/` (pending)
4. Count files in `Chef Flow Personas/Completed/` (processed)
5. Count entries in `system/persona-vault/index.json`

Output:

```
Pipeline: [running/idle]
Pending personas: [count by type]
Completed: [count by type]
Vault entries: [count]
Saturation: [summary]
Priority queue: [top 5 gaps]
```

### run [limit]

Trigger the persona pipeline manually:

1. Apply the Saturation Gate.
2. Run `node devtools/persona-orchestrator.mjs` (or with limit arg) only if the gate allows it or the user explicitly confirms.
3. Stream output.
4. Show results when done.

### synthesize

Run batch synthesis on completed persona reports:

1. Run `node devtools/persona-batch-synthesizer.mjs` (if it exists)
2. Or manually: read all completed persona reports, cross-reference gaps, update `system/persona-batch-synthesis/`

### validate

Run validation on pipeline output:

1. Run `node devtools/persona-validator.mjs`
2. Show pass/fail counts
3. Flag any reports that need re-running

### import [path]

Import a new persona file:

1. Apply the Saturation Gate.
2. Validate format (needs name, type, description at minimum).
3. Copy to `Chef Flow Personas/Uncompleted/[Type]/`.
4. Update pipeline state.

### queue

Show the build queue:

1. Read `system/persona-batch-synthesis/priority-queue.json`
2. Display ranked gaps with scores
3. Note which are already built (cross-ref codebase)

### bridge

Prepare 3977 build output for Codex:

1. Run `node devtools/codex-build-bridge.mjs status` to compare ready tasks and build queue volume.
2. Run `node devtools/codex-build-bridge.mjs next --write` for a non-mutating Codex build packet.
3. Use `node devtools/codex-build-bridge.mjs claim --dry-run` before any live claim.
4. Only run `node devtools/codex-build-bridge.mjs claim` when the current Codex session is ready to own and build the returned task.
5. After a task is built, report the result with `node devtools/codex-build-bridge.mjs complete --source-plan path --status built --commit sha --pushed --write`.

The bridge must classify tasks as buildable, duplicate, blocked, needs-human, or needs-triage before Codex writes product code. Do not build blocked or duplicate tasks.

### generate [type] [name]

Generate a new persona from a description:

1. Apply the Saturation Gate.
2. User provides type (chef/client/vendor/guest/staff/partner/public) and name.
3. Use Ollama to expand into full persona file only if the gate allows it or the user explicitly confirms.
4. Save to `Chef Flow Personas/Uncompleted/[Type]/[name].txt`.

### vault

Browse the persona vault:

1. Read `system/persona-vault/index.json`
2. List all personas with scores and dates
3. Flag any that should be re-tested (stale, low score)

### sources

Show where persona gap data comes from:

1. List all persona report files with dates
2. Show which personas have been synthesized
3. Show which gaps have been built vs pending

## Key Files

| File                                 | Purpose                          |
| ------------------------------------ | -------------------------------- |
| `devtools/persona-inbox-server.mjs`  | HTTP server (not needed for CLI) |
| `devtools/persona-orchestrator.mjs`  | Pipeline runner                  |
| `devtools/persona-validator.mjs`     | Report validator                 |
| `system/persona-pipeline-state.json` | Pipeline state                   |
| `system/persona-batch-synthesis/`    | Synthesis output                 |
| `system/persona-vault/index.json`    | Vault index                      |
| `Chef Flow Personas/`                | Raw persona files                |

## Rules

- Never delete persona files. Archive, don't destroy.
- Pipeline state files are JSON. Read/write carefully.
- If Ollama is needed (generate subcommand) and offline, say so. Don't fake output.
- The vault is append-only. Never remove entries, only add or update scores.
- If the corpus is saturated, prefer building and triage over collecting more generic personas.
