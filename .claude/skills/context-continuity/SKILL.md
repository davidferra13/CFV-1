---
name: context-continuity
description: Prevent fragmented or duplicate ChefFlow work. Use at the start of every non-trivial ChefFlow build, spec, research, architecture, UI, feature, backlog, homepage, workflow, Obsidian, conversation-memory, or ambiguous product request, especially when the user mentions duplication, fragmentation, repeated ideas, disconnected builds, attaching work, canonical surfaces, or asks Codex to remember and connect prior conversations.
---

# Context Continuity

Use this before planning or writing code. The goal is to turn ChefFlow into one connected system, not many similar disconnected builds.

## Continuity Scan

Before proposing a new file, route, component, table, spec, or workflow:

1. Prefer the deterministic scanner: `node devtools/context-continuity-scan.mjs --prompt "..." --write`.
2. Extract the domain words from the request: feature names, routes, actors, tables, workflows, nouns, and synonyms.
3. Search current code and docs with `rg` across the smallest relevant set first, usually `app`, `components`, `lib`, `docs/specs`, `docs/changes`, `docs/app-complete-audit.md`, `project-map`, `memory`, `system/intake`, and recent `system/agent-reports`.
4. Check `git log --oneline -30` for overlapping recent commits.
5. Check `git status --short` and `system/agent-claims` for dirty or claimed files in the same domain.
6. If the work touches routes or public surfaces, identify canonical route ownership before creating anything new. For homepages, default to exactly two surfaces: the real homepage and one sandbox duplicate for experimentation.

The canonical surface registry lives at `system/canonical-surfaces.json`. Update it when a new long-lived product surface becomes the official owner for a domain.

## Tooling

- Scan a prompt: `node devtools/context-continuity-scan.mjs --prompt "..." --write`
- Find near duplicates: `node devtools/context-near-duplicates.mjs`
- Build the feature family map: `node devtools/feature-family-map.mjs`
- Write a memory packet: `node devtools/obsidian-memory-packet.mjs --title "..." --intent "..."`
- Generate the continuity dashboard: `node devtools/context-continuity-dashboard.mjs --prompt "..."`
- Start a task with the pre-build gate: `node devtools/agent-start.mjs --prompt "..."`

## Decide Attachment

Classify the request before implementation:

- `extend`: the thing already exists and should be deepened in place.
- `attach`: an orphan or parallel build exists and should be wired into the canonical surface.
- `merge-candidate`: multiple similar implementations exist and need a developer decision before consolidation.
- `new`: no credible existing owner exists after search.
- `memory-only`: the request is an idea, preference, or repeated concern that should be captured before any build.

Default to `extend` or `attach`. Choose `new` only when the scan finds no real owner.

## Stop Conditions

Stop and ask a direct question before writing when:

- Two or more plausible canonical owners exist.
- The request would create a second version of a homepage, dashboard, workflow, or module.
- Existing code appears intentionally experimental, sandboxed, or another agent's active work.
- The user is describing product direction but the desired canonical home is unclear.

Ask the smallest useful question, usually: "Should this attach to X or replace/merge with Y?"

## Continuity Statement

Before edits on non-trivial work, state:

- Existing related surfaces found.
- Canonical attachment point.
- Duplicate or orphan risks.
- Files this session owns.
- The decision: `extend`, `attach`, `merge-candidate`, `new`, or `memory-only`.

Keep it short. This statement is the guardrail against Codex eagerly building a nearby duplicate.

## Memory Packet

When the user gives durable intent, repeated frustration, architecture direction, or Obsidian/thread-memory guidance, capture a compact memory packet before closeout.

Use the best available sink:

1. If an Obsidian app, MCP tool, or explicit vault path is available in the current session, write or update the relevant Obsidian note.
2. Otherwise, write a repo-local packet only when it is useful and safe, usually under `system/intake/notes/` or the task's existing spec/doc. Do not write raw full transcripts, secrets, auth artifacts, or local-only `obsidian_export/` copies by default.
3. Link the packet to concrete code, docs, routes, or decisions so future agents can search it.

Packet format:

```md
# Short Title

- Date: YYYY-MM-DD
- Source: Codex session
- User intent:
- Existing related surfaces:
- Canonical home:
- Duplicate risk:
- Follow-up question:
- Links:
```

Codex cannot guarantee capture of every message ever unless the host provides the conversation transcript or a real Obsidian hook. In normal Codex sessions, capture only the current visible conversation and durable decisions.

## Closeout

At final response, report the continuity decision and any memory packet location. If no packet was written, say why in one sentence.
