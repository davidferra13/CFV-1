# Agent B: Claude Code JSONL-to-Markdown Converter

## Job

Write a Node.js script that converts raw Claude Code session JSONL files into readable markdown conversations. Then run that script against 9 project directories containing ~1,200 total sessions. Output goes to `C:\Users\david\Documents\ChefFlow-Brain\conversations\claude-code\`.

This agent runs in parallel with Agents A and C. It has zero dependencies except that the output directories must exist (create them if missing).

---

## Understanding the Input Format

Claude Code stores conversations as `.jsonl` files (one JSON object per line) at:

```
C:\Users\david\.claude\projects\{project-name}\{session-uuid}.jsonl
```

Each session may also have a directory `{session-uuid}/` containing:

- `subagents/agent-{id}.jsonl` (spawned agent conversations)
- `subagents/agent-{id}.meta.json` (agent metadata)
- `tool-results/` (cached tool output, ignore)

### JSONL Line Types

Every line is a JSON object. There are exactly 4 types you care about:

**Type 1: Queue operation (SKIP)**

```json
{
  "type": "queue-operation",
  "operation": "enqueue",
  "timestamp": "2026-04-19T16:27:53.820Z",
  "sessionId": "00859d7a-..."
}
```

Action: Skip this line entirely. It is internal scheduling metadata.

**Type 2: User message**

```json
{
  "parentUuid": null,
  "isSidechain": false,
  "type": "user",
  "message": {
    "role": "user",
    "content": [
      { "type": "text", "text": "the user's actual message" },
      {
        "type": "image",
        "source": { "type": "base64", "media_type": "image/png", "data": "iVBOR..." }
      }
    ]
  }
}
```

Action: Extract each content item where `type === "text"`. Write to output as `### User\n\n{text}`. Skip items where `type === "image"` (just note `[image attached]`).

**Type 3: Assistant message**

```json
{
  "parentUuid": "...",
  "isSidechain": false,
  "message": {
    "model": "claude-opus-4-6",
    "role": "assistant",
    "content": [
      { "type": "thinking", "thinking": "internal reasoning..." },
      { "type": "text", "text": "the visible response" },
      { "type": "tool_use", "name": "Read", "input": { "file_path": "/some/file" } }
    ]
  }
}
```

Action: Extract content items selectively:

- `type === "text"` -> write as `### Assistant\n\n{text}`
- `type === "thinking"` -> SKIP (internal reasoning, very long, not useful for archive)
- `type === "tool_use"` -> write one line: `> Tool: {name}({JSON.stringify(input).slice(0, 200)})`
- `type === "tool_result"` -> SKIP (output is often huge and duplicates tool-results/ dir)

**Type 4: System/result message**

```json
{"type":"result","message":{"role":"assistant","stop_reason":"end_turn","content":[...]}}
```

Action: If it has content with `type === "text"`, extract it same as assistant. Otherwise skip.

### Lines to Skip Entirely

- Any line that fails JSON.parse (corrupted). Log it and continue.
- Any line where `type` is `queue-operation`.
- Any line where content is only `thinking` blocks (no visible text).
- Any line where content is empty or missing.

---

## Understanding the Output Format

Each session becomes one `.md` file. Format:

```markdown
---
source: claude-code
project: cfv1
session_id: 00859d7a-a85b-43db-9113-493e3d09e4c8
title: 'First user message (truncated to 80 chars)'
date: 2026-04-19
date_start: 2026-04-19T16:27:53.820Z
date_end: 2026-04-19T18:45:12.000Z
message_count: 47
original_path: "C:\\Users\\david\\.claude\\projects\\c--Users-david-Documents-CFv1\\00859d7a-a85b-43db-9113-493e3d09e4c8.jsonl"
---

# Session: First user message (truncated to 80 chars)

### User

the user's actual message here

### Assistant

the assistant's visible response here

> Tool: Read({"file_path":"/c/Users/david/Documents/CFv1/CLAUDE.md"})

### User

next user message

### Assistant

next response

---

## Subagent: agent-a17651c4d2de31b8b

### User

subagent task prompt

### Assistant

subagent response
```

### Title Extraction

The title is the first user message's text content, truncated to 80 characters. Strip any XML tags like `<ide_opened_file>...</ide_opened_file>` or `<system-reminder>...</system-reminder>` before extracting. If the first user message is only an image or system tag with no real text, use the second user message. If no usable text exists, use `"Untitled Session"`.

### Date Extraction

- `date_start`: the `timestamp` field from the first line that has one
- `date_end`: the `timestamp` field from the last line that has one
- `date`: the date portion (YYYY-MM-DD) of `date_start`

---

## The Script

Write this script to `C:\Users\david\Documents\CFv1\scripts\convert-claude-jsonl.mjs`.

Use only Node.js built-ins: `fs`, `path`, `readline`. No npm packages.

### Script Behavior

```
Usage: node scripts/convert-claude-jsonl.mjs <source-dir> <output-dir> <project-label>
```

1. Scan `<source-dir>` for all `*.jsonl` files at the top level (not in subdirectories).
2. For each `.jsonl` file:
   a. Derive the session UUID from the filename (strip `.jsonl`).
   b. Check if `<output-dir>/{session-uuid}.md` already exists. If yes, skip (idempotent).
   c. Read the file line by line using `readline`.
   d. Parse each line as JSON. If parse fails, skip the line.
   e. Build the markdown output following the format above.
   f. If a directory `<source-dir>/{session-uuid}/subagents/` exists, read each `agent-*.jsonl` file and append as a subagent section.
   g. Write the markdown file to `<output-dir>/{session-uuid}.md`.
3. Print a summary: `Converted X sessions, skipped Y (already exist), failed Z`.

### Edge Cases

- Some JSONL files are very large (100MB+). Stream line-by-line. Never load the entire file into memory.
- Content arrays can be deeply nested. Only look at the top-level `content` array items.
- Some lines have `message.content` as a string instead of an array. Handle both.
- The `signature` field in assistant messages is a long base64 string. Ignore it.
- Tool use `input` can be very large. Truncate the stringified input to 200 characters in the output.

---

## Run Commands

After writing the script, run it against these 9 source directories in this exact order. Create the output directories first.

```bash
# Ensure output dirs exist
mkdir -p /c/Users/david/Documents/ChefFlow-Brain/conversations/claude-code/{cfv1,chefflow-desktop,chefflow-v3,chefflow-other,home-llm,openclaw}

# Primary project (largest, ~1,014 sessions, ~4.6 GB)
node scripts/convert-claude-jsonl.mjs \
  "/c/Users/david/.claude/projects/c--Users-david-Documents-CFv1" \
  "/c/Users/david/Documents/ChefFlow-Brain/conversations/claude-code/cfv1" \
  "cfv1"

# Desktop variant (32 sessions)
node scripts/convert-claude-jsonl.mjs \
  "/c/Users/david/.claude/projects/c--Users-david-Desktop-ChefFlow" \
  "/c/Users/david/Documents/ChefFlow-Brain/conversations/claude-code/chefflow-desktop" \
  "chefflow-desktop"

# V3 variant (18 sessions)
node scripts/convert-claude-jsonl.mjs \
  "/c/Users/david/.claude/projects/c--Users-david-Desktop-chefflow-v3--1-" \
  "/c/Users/david/Documents/ChefFlow-Brain/conversations/claude-code/chefflow-v3" \
  "chefflow-v3"

# Remaining ChefFlow variants -> chefflow-other
node scripts/convert-claude-jsonl.mjs \
  "/c/Users/david/.claude/projects/E--Downloads-chefflow-2--chefflow" \
  "/c/Users/david/Documents/ChefFlow-Brain/conversations/claude-code/chefflow-other" \
  "chefflow-downloads"

node scripts/convert-claude-jsonl.mjs \
  "/c/Users/david/.claude/projects/c--Users-david-Desktop-CHEWWW-FLOW-VS" \
  "/c/Users/david/Documents/ChefFlow-Brain/conversations/claude-code/chefflow-other" \
  "chewww-flow"

node scripts/convert-claude-jsonl.mjs \
  "/c/Users/david/.claude/projects/c--Users-david-Desktop-Chef-Flow-Master-1-0" \
  "/c/Users/david/Documents/ChefFlow-Brain/conversations/claude-code/chefflow-other" \
  "chefflow-master"

node scripts/convert-claude-jsonl.mjs \
  "/c/Users/david/.claude/projects/c--Users-david-Desktop-build-chefflow" \
  "/c/Users/david/Documents/ChefFlow-Brain/conversations/claude-code/chefflow-other" \
  "build-chefflow"

# Ecosystem: HOME-LLM (96 sessions)
node scripts/convert-claude-jsonl.mjs \
  "/c/Users/david/.claude/projects/c--Users-david-Documents-HOME-LLM" \
  "/c/Users/david/Documents/ChefFlow-Brain/conversations/claude-code/home-llm" \
  "home-llm"

# Ecosystem: OpenClaw (42 sessions)
node scripts/convert-claude-jsonl.mjs \
  "/c/Users/david/.claude/projects/c--Users-david-Documents-OpenClaw" \
  "/c/Users/david/Documents/ChefFlow-Brain/conversations/claude-code/openclaw" \
  "openclaw"
```

---

## Verification

```bash
echo "=== Agent B Verification ===" && \
echo -n "cfv1: " && ls /c/Users/david/Documents/ChefFlow-Brain/conversations/claude-code/cfv1/*.md 2>/dev/null | wc -l && \
echo -n "chefflow-desktop: " && ls /c/Users/david/Documents/ChefFlow-Brain/conversations/claude-code/chefflow-desktop/*.md 2>/dev/null | wc -l && \
echo -n "chefflow-v3: " && ls /c/Users/david/Documents/ChefFlow-Brain/conversations/claude-code/chefflow-v3/*.md 2>/dev/null | wc -l && \
echo -n "chefflow-other: " && ls /c/Users/david/Documents/ChefFlow-Brain/conversations/claude-code/chefflow-other/*.md 2>/dev/null | wc -l && \
echo -n "home-llm: " && ls /c/Users/david/Documents/ChefFlow-Brain/conversations/claude-code/home-llm/*.md 2>/dev/null | wc -l && \
echo -n "openclaw: " && ls /c/Users/david/Documents/ChefFlow-Brain/conversations/claude-code/openclaw/*.md 2>/dev/null | wc -l && \
echo "=== Expected: cfv1 ~483, desktop ~32, v3 ~18, other ~25, home-llm ~96, openclaw ~42 ==="
```

Note: cfv1 has ~483 top-level JSONL files (the 1,014 count includes session directories that may not all have their own JSONL). The script processes only `.jsonl` files it finds.

If counts are within 10% of expected, Agent B is done.
