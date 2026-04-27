---
name: persona-inbox
description: Manage the persona pipeline without a running server. Status, run, synthesize, validate, import, queue, generate, vault, sources. CLI-first, no HTTP needed.
user-invocable: true
---

# Persona Inbox

Manage the persona pipeline without the HTTP server running. CLI-first.

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

1. Run `node devtools/persona-orchestrator.mjs` (or with limit arg)
2. Stream output
3. Show results when done

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

1. Validate format (needs name, type, description at minimum)
2. Copy to `Chef Flow Personas/Uncompleted/[Type]/`
3. Update pipeline state

### queue

Show the build queue:

1. Read `system/persona-batch-synthesis/priority-queue.json`
2. Display ranked gaps with scores
3. Note which are already built (cross-ref codebase)

### generate [type] [name]

Generate a new persona from a description:

1. User provides type (chef/client/vendor/guest/staff/partner/public) and name
2. Use Ollama to expand into full persona file
3. Save to `Chef Flow Personas/Uncompleted/[Type]/[name].txt`

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
