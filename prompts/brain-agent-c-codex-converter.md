# Agent C: Codex JSONL-to-Markdown Converter

## Job

Write a Node.js script that converts raw Codex session JSONL files into readable markdown conversations. Then run that script against 535 sessions. Output goes to `C:\Users\david\Documents\ChefFlow-Brain\conversations\codex\`.

This agent runs in parallel with Agents A and B. It has zero dependencies except that the output directory must exist (create it if missing).

---

## Understanding the Input Format

Codex stores sessions as `.jsonl` files at:

```
C:\Users\david\.codex\archived_sessions\rollout-{timestamp}-{uuid}.jsonl
```

There are 535 files. Each filename encodes the session start time and a UUID.

### JSONL Line Types

Every line is a JSON object with a `timestamp` field and a `type` field. There are exactly 3 types you care about:

**Type 1: Session metadata**

```json
{
  "timestamp": "2026-01-17T20:34:14.528Z",
  "type": "session_meta",
  "payload": {
    "id": "019bcdaa-4fef-7a23-a621-ce87bdb2412f",
    "timestamp": "2026-01-17T20:34:09.519Z",
    "cwd": "c:\\Users\\david\\Desktop\\CHEWWW FLOW VS",
    "originator": "codex_vscode",
    "cli_version": "0.81.0-alpha.8",
    "instructions": "...(very long, skip)...",
    "source": "vscode",
    "model_provider": "openai"
  }
}
```

Action: Extract `payload.id` as session ID, `payload.timestamp` as start time, `payload.cwd` as working directory. Skip `payload.instructions` (it is the full AGENTS.md content, very long, not useful in the archive).

**Type 2: Response item (the actual conversation)**

```json
{
  "timestamp": "2026-01-17T20:34:14.529Z",
  "type": "response_item",
  "payload": {
    "type": "message",
    "role": "user",
    "content": [{ "type": "input_text", "text": "Build ChefFlow as a local-only desktop app..." }]
  }
}
```

Roles: `"user"`, `"assistant"`, `"developer"` (system instructions, skip these).

Action:

- `role === "user"` and content has `type === "input_text"` -> extract `.text`. Skip if the text starts with `<environment_context>` or `<permissions instructions>` or `# AGENTS.md instructions` (these are system context, not user messages). Write as `### User\n\n{text}`.
- `role === "assistant"` and content has `type === "output_text"` -> extract `.text`. Write as `### Assistant\n\n{text}`.
- `role === "assistant"` and content has `type === "tool_use"` -> write one line: `> Tool: {name}({truncated args})`
- `role === "developer"` -> SKIP entirely (system instructions).

**Type 3: Response completed**

```json
{
  "timestamp": "2026-04-23T...",
  "type": "response_completed",
  "payload": { ... }
}
```

Action: Extract `timestamp` as potential session end time. No content to render.

### Lines to Skip Entirely

- Any line that fails JSON.parse.
- `type === "session_meta"` (extract metadata only, do not render).
- `type === "response_completed"` (just a marker).
- `role === "developer"` messages (system context injections).
- User messages that start with `<environment_context>`, `<permissions instructions>`, or `# AGENTS.md instructions` (auto-injected context, not human input).

---

## Understanding the Output Format

Each session becomes one `.md` file. Format:

```markdown
---
source: codex
session_id: 019bcdaa-4fef-7a23-a621-ce87bdb2412f
title: 'First real user message (truncated to 80 chars)'
date: 2026-01-17
date_start: 2026-01-17T20:34:09.519Z
date_end: 2026-01-17T21:15:00.000Z
message_count: 23
working_directory: "c:\\Users\\david\\Desktop\\CHEWWW FLOW VS"
original_path: "C:\\Users\\david\\.codex\\archived_sessions\\rollout-2026-01-17T15-34-09-019bcdaa-4fef-7a23-a621-ce87bdb2412f.jsonl"
---

# Codex Session: First real user message (truncated to 80 chars)

**Working directory:** `c:\Users\david\Desktop\CHEWWW FLOW VS`
**Date:** 2026-01-17

### User

Build ChefFlow as a local-only desktop app...

### Assistant

I'll start by analyzing the current project structure...

> Tool: shell({"command":"ls -la"})

### User

next message

### Assistant

next response
```

### Title Extraction

The title is the first user message that is NOT a system context injection. A "real" user message is one where the text does NOT start with `<`, `#`, or contain `AGENTS.md` or `environment_context` or `permissions instructions`. Truncate to 80 characters. If no real user message exists, use `"Untitled Codex Session"`.

### Date Extraction

- `date_start`: from `session_meta.payload.timestamp` if available, else the first `timestamp` field in the file
- `date_end`: the `timestamp` from the last line in the file
- `date`: the YYYY-MM-DD portion of `date_start`

---

## The Script

Write this script to `C:\Users\david\Documents\CFv1\scripts\convert-codex-jsonl.mjs`.

Use only Node.js built-ins: `fs`, `path`, `readline`. No npm packages.

### Script Behavior

```
Usage: node scripts/convert-codex-jsonl.mjs
```

No arguments needed. Source and output are hardcoded:

- Source: `C:\Users\david\.codex\archived_sessions\`
- Output: `C:\Users\david\Documents\ChefFlow-Brain\conversations\codex\`

1. Scan source dir for all `*.jsonl` files (ignore `mempalace.yaml` and any non-jsonl).
2. For each `.jsonl` file:
   a. Derive a clean filename: take the original filename, strip `.jsonl`, append `.md`. Example: `rollout-2026-01-17T15-34-09-019bcdaa-4fef-7a23-a621-ce87bdb2412f.md`
   b. Check if output file already exists. If yes, skip (idempotent).
   c. Read line by line using `readline`.
   d. Parse each line. Build the markdown.
   e. Write to output directory.
3. Print summary: `Converted X sessions, skipped Y (already exist), failed Z`.

### Edge Cases

- Some sessions are very short (2-3 lines of just session_meta + context injection). If a session has zero renderable messages (no real user or assistant content), still write the file but note `*No conversation content in this session.*` in the body.
- The `content` array in Codex messages uses `input_text` (not `text` like Claude Code) for user messages and `output_text` for assistant messages. Handle both naming conventions to be safe.
- Some content items may have `type === "tool_result"` with large output. Truncate tool result text to 500 characters.

---

## Run Command

```bash
mkdir -p /c/Users/david/Documents/ChefFlow-Brain/conversations/codex
node scripts/convert-codex-jsonl.mjs
```

---

## Verification

```bash
echo "=== Agent C Verification ===" && \
echo -n "codex conversations: " && ls /c/Users/david/Documents/ChefFlow-Brain/conversations/codex/*.md 2>/dev/null | wc -l && \
echo -n "source files: " && ls /c/Users/david/.codex/archived_sessions/*.jsonl 2>/dev/null | wc -l && \
echo "=== Expected: output count should be within 5 of source count (535) ==="
```

If output count is within 5 of 535, Agent C is done.
