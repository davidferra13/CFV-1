# Execute: ChefFlow-Brain Unified Knowledge Folder

## Context (read this first, then act)

You are a Claude Code agent working on the ChefFlow project at `C:\Users\david\Documents\CFv1\`. The developer wants to unify every AI conversation ever used to discuss ChefFlow into a single browsable folder called `ChefFlow-Brain`.

A complete build spec exists at `prompts/build-chefflow-brain.md`. Read it in full before doing anything. It contains:

- All 8 source locations with exact disk paths, file counts, sizes, and formats
- The target folder structure (`C:\Users\david\Documents\ChefFlow-Brain\`)
- A 6-phase execution order
- Conversion rules for JSONL -> Markdown
- Dedup rules, constraints, and a verification checklist

## Your Task

**Scope: ChefFlow-Brain build.** Nothing else. Do not touch the ChefFlow application code, database, server, or any running process. This is a file organization and conversion job.

**Standing order:** Identify the single highest-leverage action remaining within this scope, execute it, then identify the next one. Repeat until scope complete.

**Decision rules for action selection:**

1. Only actions specified in `prompts/build-chefflow-brain.md`. Nothing outside it.
2. Must be additive. No deleting, modifying, or moving source files. Only read from sources, write to `ChefFlow-Brain/`.
3. Follow the phase order (1 through 6). Do not skip ahead. Phase N+1 starts only after Phase N is verified.
4. If nothing remains, say "scope complete" and run the verification checklist from the spec.
5. Cite evidence for every action: file paths, line numbers in the spec, counts before and after.

## Before You Start

1. `cat prompts/build-chefflow-brain.md` - Read the full spec. Do not skim.
2. `ls "C:\Users\david\Documents\ChefFlow-Brain\" 2>/dev/null` - Check if the folder exists and what state it is in.
3. If the folder already has content from a prior run, assess what phases are complete by checking file counts against the spec's verification checklist. Resume from the first incomplete phase.
4. If the folder does not exist, start at Phase 1.

## Execution Standards

- **No AI summarization of conversations.** Copy full content. The value is in the raw record.
- **Frontmatter on every conversation markdown file.** Minimum: `source`, `session_id` or `conversation_id`, `title`, `date`, `message_count`, `original_path`.
- **Dedup by session UUID or conversation ID**, not by filename. Keep the richer version.
- **No symlinks.** Copy files. Symlinks break on drive changes.
- **Log your progress.** After completing each phase, append a timestamped entry to `ChefFlow-Brain/_BUILD_LOG.md` noting what you did, file counts, and any issues.

## JSONL Conversion (Phase 4)

When you reach Phase 4, write the conversion script at `scripts/convert-claude-jsonl.mjs`. The spec describes the format. Key points:

- Each `.jsonl` file = one conversation = one output `.md` file
- Parse each line as JSON. Extract `role`, `content` (text only; skip binary tool results), timestamp
- YAML frontmatter with session metadata
- Subagent files (in `subagents/` dirs) append to parent conversation under `## Subagent: {name}`
- Skip any session UUID that already exists in the target directory
- The script must be idempotent: running it twice produces the same output

## When You Finish

Run every check in the "Verification Checklist" section of the spec. Report results. If all pass, write "scope complete" to `ChefFlow-Brain/_BUILD_LOG.md` with a final timestamp.

## What You Do NOT Do

- Do not modify any file in `C:\Users\david\Documents\CFv1\` (except writing the conversion script to `scripts/`)
- Do not start the dev server, run builds, or touch the database
- Do not install new npm packages (use Node.js built-ins: `fs`, `path`, `readline`)
- Do not create git commits (the developer will review and commit)
- Do not ask questions. The spec has everything. If a source path does not exist, skip it and note the skip in `_BUILD_LOG.md`
