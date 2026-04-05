# Session Digests

> Every Claude conversation writes a digest here before closing. The next agent reads the last 3.

## What This Is

Session digests are compact summaries of what happened in each Claude conversation. Unlike the session log (operational: who did what), digests capture the CONTENT: what was discussed, what decisions were made, what changed, and what's unresolved.

## Format

Each digest is a dated file: `YYYY-MM-DD-HHMMSS-topic.md`

```markdown
# Session Digest: [topic]

**Date:** YYYY-MM-DD HH:MM EST
**Agent type:** [Planner | Builder | Research | General]
**Duration:** [approximate]

## What Was Discussed

- [Key topics, questions, decisions]

## What Changed

- [Files created/modified, features built, bugs fixed]

## Decisions Made

- [Any architectural, design, or strategic decisions]

## Unresolved

- [Things that didn't get finished, open questions, blockers]

## Context for Next Agent

- [Anything the next agent absolutely needs to know]
```

## Rules for Agents

1. **Before closing any session**, write a digest file here.
2. **On session start**, read the last 3 digest files (sorted by date).
3. Keep digests SHORT (20-40 lines). This is a summary, not a transcript.
4. Name the file descriptively: `2026-04-04-143000-product-blueprint.md`, not `2026-04-04-session.md`.
5. If a session is pure conversation (no code changes), still write a digest if decisions were made.
6. If a session is trivial (quick question, one-liner), skip the digest.
