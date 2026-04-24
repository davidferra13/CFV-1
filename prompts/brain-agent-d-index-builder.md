# Agent D: Index Builder

## Job

Build three index files for the `ChefFlow-Brain` folder: `_SOURCES.md`, `_TIMELINE.md`, and `_INDEX.md`. These files make the entire archive searchable and browsable.

**This agent runs AFTER Agents A, B, and C are complete.** It depends on their output existing in `C:\Users\david\Documents\ChefFlow-Brain\`.

---

## Pre-check

Before starting, verify the prior agents finished:

```bash
echo "=== Pre-check ===" && \
echo -n "chatgpt/all: " && ls /c/Users/david/Documents/ChefFlow-Brain/conversations/chatgpt/all/*.md 2>/dev/null | wc -l && \
echo -n "chatgpt/promoted: " && ls /c/Users/david/Documents/ChefFlow-Brain/conversations/chatgpt/promoted/*.md 2>/dev/null | wc -l && \
echo -n "claude-code/cfv1: " && ls /c/Users/david/Documents/ChefFlow-Brain/conversations/claude-code/cfv1/*.md 2>/dev/null | wc -l && \
echo -n "codex: " && ls /c/Users/david/Documents/ChefFlow-Brain/conversations/codex/*.md 2>/dev/null | wc -l && \
echo -n "specs: " && ls /c/Users/david/Documents/ChefFlow-Brain/artifacts/specs/*.md 2>/dev/null | wc -l
```

**Minimum thresholds to proceed:**

- chatgpt/all >= 2000
- claude-code/cfv1 >= 400
- codex >= 400

If any threshold is not met, STOP. Write to `_BUILD_LOG.md`: "Agent D blocked: [source] has [count] files, expected [threshold]. Agents B/C may still be running." Do not proceed.

---

## File 1: `_SOURCES.md`

Create `C:\Users\david\Documents\ChefFlow-Brain\_SOURCES.md`.

This is a static reference file. Write it by reading the actual file counts from disk.

```markdown
# ChefFlow-Brain: Source Inventory

Generated: [current date]

## Conversation Sources

| Source                 | Location in Brain                           | Files   | Original Location                                        | Format                         | Date Range          |
| ---------------------- | ------------------------------------------- | ------- | -------------------------------------------------------- | ------------------------------ | ------------------- |
| ChatGPT                | conversations/chatgpt/all/                  | [count] | obsidian_export/chatgpt-conversations/                   | Markdown (full transcripts)    | Aug 2025 - Apr 2026 |
| ChatGPT Promoted       | conversations/chatgpt/promoted/             | [count] | .chatgpt-ingestion/batch-005+006                         | Markdown (curated high-signal) | Aug 2025 - Feb 2026 |
| Claude Code (CFv1)     | conversations/claude-code/cfv1/             | [count] | .claude/projects/c--Users-david-Documents-CFv1/          | Converted from JSONL           | Jan - Apr 2026      |
| Claude Code (Desktop)  | conversations/claude-code/chefflow-desktop/ | [count] | .claude/projects/c--Users-david-Desktop-ChefFlow/        | Converted from JSONL           | 2026                |
| Claude Code (V3)       | conversations/claude-code/chefflow-v3/      | [count] | .claude/projects/c--Users-david-Desktop-chefflow-v3--1-/ | Converted from JSONL           | 2026                |
| Claude Code (Other)    | conversations/claude-code/chefflow-other/   | [count] | Multiple .claude/projects/ dirs                          | Converted from JSONL           | Jan 2026            |
| Claude Code (HOME-LLM) | conversations/claude-code/home-llm/         | [count] | .claude/projects/c--Users-david-Documents-HOME-LLM/      | Converted from JSONL           | 2026                |
| Claude Code (OpenClaw) | conversations/claude-code/openclaw/         | [count] | .claude/projects/c--Users-david-Documents-OpenClaw/      | Converted from JSONL           | 2026                |
| Codex                  | conversations/codex/                        | [count] | .codex/archived_sessions/                                | Converted from JSONL           | Jan - Apr 2026      |
| Remy AI                | conversations/remy/                         | [count] | data/remy-stats/ + docs/remy-daily-reports/              | JSON + SQLite                  | Mar - Apr 2026      |

## Artifact Sources

| Source          | Location in Brain          | Files   | Description                          |
| --------------- | -------------------------- | ------- | ------------------------------------ |
| Session Digests | artifacts/session-digests/ | [count] | Developer-authored session summaries |
| Prompts         | artifacts/prompts/         | [count] | Builder prompts and templates        |
| Specs           | artifacts/specs/           | [count] | Product and feature specifications   |
| Research        | artifacts/research/        | [count] | Research reports and analysis        |
| Project Map     | artifacts/project-map/     | [count] | Product map cards                    |
| Memory          | artifacts/memory/          | [count] | Agent memory files                   |

## Other Sources

| Source           | Location in Brain     | Description                                             |
| ---------------- | --------------------- | ------------------------------------------------------- |
| Extracted Signal | extracted/            | 13,888 signal chunks from ChatGPT triage pipeline       |
| Graphify         | graphs/               | AST knowledge graph (report + wiki + raw graph)         |
| CIL              | graphs/cil/           | Continuous Intelligence Layer SQLite data               |
| MemPalace Config | graphs/mempalace.yaml | Config only; 14 GB index at C:\Users\david\.mempalace\  |
| Archives         | archives/             | Unpacked Google Drive exports + master doc              |

## Not Included (reference only)

| Source                   | Location on Disk                      | Size   | Why Excluded                          |
| ------------------------ | ------------------------------------- | ------ | ------------------------------------- |
| MemPalace ChromaDB       | C:\Users\david\.mempalace\palace2\    | 14 GB  | Vector index, not readable text       |
| Claude Code file-history | C:\Users\david\.claude\file-history\  | 323 MB | Code diffs, not conversations         |
| Claude Code todos        | C:\Users\david\.claude\todos\         | 5.5 MB | Ephemeral per-session task tracking   |
| Ollama server logs       | AppData\Local\Ollama\                 | 18 MB  | Request/response traces, no structure |
| ChatGPT raw export       | Downloads\ChatGPTexport.zip           | 981 MB | Already processed into chatgpt/all/   |
```

Replace every `[count]` with the actual number from `ls [dir]/*.md 2>/dev/null | wc -l` or `ls [dir]/* 2>/dev/null | wc -l`.

---

## File 2: `_TIMELINE.md`

Create `C:\Users\david\Documents\ChefFlow-Brain\_TIMELINE.md`.

Write a Node.js script at `C:\Users\david\Documents\CFv1\scripts\build-brain-timeline.mjs` that:

1. Scans every `.md` file in `ChefFlow-Brain/conversations/` (recursively).
2. For each file, extracts the `date` and `title` from YAML frontmatter (between `---` markers). If no frontmatter, try to extract date from the filename (Codex files have timestamps in the name; ChatGPT files have `created_at` in frontmatter).
3. Determines the source from the file's parent directory path (chatgpt, claude-code, codex).
4. Collects all entries into a list of `{date, title, source, relative_path}`.
5. Sorts by date descending (newest first).
6. Groups by month (YYYY-MM).
7. Writes the output as:

```markdown
# ChefFlow-Brain: Timeline

Total conversations: [count]
Date range: [earliest] to [latest]
Generated: [current date]

## 2026-04

| Date       | Source      | Title               | File                                                                     |
| ---------- | ----------- | ------------------- | ------------------------------------------------------------------------ |
| 2026-04-24 | claude-code | Event lifecycle fix | [cfv1/abc123.md](conversations/claude-code/cfv1/abc123.md)               |
| 2026-04-24 | codex       | rollout session     | [codex/rollout-2026-04-24.md](conversations/codex/rollout-2026-04-24.md) |
| ...        | ...         | ...                 | ...                                                                      |

## 2026-03

| Date | Source | Title | File |
| ---- | ------ | ----- | ---- |
| ...  | ...    | ...   | ...  |

## 2025-08

| Date       | Source  | Title                        | File                                                                         |
| ---------- | ------- | ---------------------------- | ---------------------------------------------------------------------------- |
| 2025-08-09 | chatgpt | Full Chef Flow Program Build | [chatgpt/all/chatgpt-697xxx.md](conversations/chatgpt/all/chatgpt-697xxx.md) |
```

### Script Requirements

- Use only Node.js built-ins (`fs`, `path`, `readline`).
- For YAML frontmatter parsing: do NOT use a YAML library. Just read lines between the first `---` and second `---`, split on `: `, and extract `date`, `title`, `source`, `created_at` fields. This is sufficient for the simple key-value frontmatter used here.
- If a file has no parseable date, log a warning and skip it.
- Truncate titles to 60 characters in the table for readability.
- The file will be large (4,000+ rows). That is fine.

Run it:

```bash
node scripts/build-brain-timeline.mjs
```

---

## File 3: `_INDEX.md`

Create `C:\Users\david\Documents\ChefFlow-Brain\_INDEX.md`.

This is the master file. A human or AI opens this first.

```markdown
# ChefFlow-Brain

The complete knowledge archive for the ChefFlow project. Every AI conversation,
spec, research document, and artifact from August 2025 through April 2026.

## Stats

| Metric                   | Value                                |
| ------------------------ | ------------------------------------ |
| Total conversation files | [sum of all conversations/*]         |
| ChatGPT conversations    | [count]                              |
| Claude Code sessions     | [count across all subdirs]           |
| Codex sessions           | [count]                              |
| Artifact files           | [sum of all artifacts/*]             |
| Date range               | [earliest from timeline] to [latest] |
| Total size               | [du -sh output]                      |

## How to Search

**Keyword search (fastest):**
```

grep -r "your search term" ChefFlow-Brain/conversations/ --include="\*.md" -l

```

**Semantic search (requires MemPalace MCP to be running):**
Use the `search` tool with your query. MemPalace has 420K+ embeddings covering most of this content.

**Browse by time:**
Open [_TIMELINE.md](_TIMELINE.md) for a reverse-chronological list of every conversation.

**Browse by source:**
Open [_SOURCES.md](_SOURCES.md) for a breakdown of where everything came from.

## Folder Structure

```

ChefFlow-Brain/
conversations/
chatgpt/all/ - 2,520 ChatGPT conversations (Aug 2025 - Apr 2026)
chatgpt/promoted/ - 341 highest-signal ChatGPT conversations
claude-code/cfv1/ - ~483 Claude Code sessions (primary project)
claude-code/\*/ - ~213 sessions from variant projects
codex/ - 535 Codex sessions
remy/ - Remy AI stats and reports
artifacts/
session-digests/ - Developer session summaries
prompts/ - Builder prompts
specs/ - Product specifications
research/ - Research reports
project-map/ - Product map cards
memory/ - Agent memory files
extracted/ - 13,888 signal chunks from ChatGPT triage
graphs/ - Graphify knowledge graph + CIL + MemPalace config
archives/ - Unpacked Google Drive exports

```

## Top 30 Highest-Signal Conversations

These are the densest, most decision-rich conversations across all sources.
Pulled from the ChatGPT ingestion report (signal chunk count).

| Rank | Title | Signal Chunks | Messages | Source | File |
|------|-------|---------------|----------|--------|------|
| 1 | Dashboard features overview | 475 | 717 | ChatGPT | [link] |
| 2 | Private Chef Event Summary | 464 | 683 | ChatGPT | [link] |
| 3 | Full Chef Flow Program Build | 434 | 924 | ChatGPT | [link] |
| 4 | ChefFlow Website Blueprint | 304 | 414 | ChatGPT | [link] |
| 5 | Gmail Bot Test Design | 252 | 336 | ChatGPT | [link] |
| ... | ... | ... | ... | ... | ... |

(Complete top-30 list from extracted/ingestion-report.md)
```

To fill in the Top 30 table:

1. Read `ChefFlow-Brain/extracted/ingestion-report.md`
2. Find the "Top 30 Conversations by Signal Density" section
3. For each entry, find the matching file in `conversations/chatgpt/all/` by title
4. Build the link

Replace all `[count]` and `[link]` placeholders with real values from disk.

---

## Final Step: Update Build Log

Append to `ChefFlow-Brain/_BUILD_LOG.md`:

```markdown
## Agent D: Index Builder

- **Completed:** [timestamp]
- **\_SOURCES.md:** written with [X] source entries
- **\_TIMELINE.md:** written with [X] conversation entries spanning [date range]
- **\_INDEX.md:** written with stats and top-30 table
- **Issues:** [any files with unparseable dates, missing frontmatter, etc.]
```

---

## Verification

```bash
echo "=== Agent D Verification ===" && \
test -f /c/Users/david/Documents/ChefFlow-Brain/_INDEX.md && echo "_INDEX.md exists" || echo "MISSING: _INDEX.md" && \
test -f /c/Users/david/Documents/ChefFlow-Brain/_SOURCES.md && echo "_SOURCES.md exists" || echo "MISSING: _SOURCES.md" && \
test -f /c/Users/david/Documents/ChefFlow-Brain/_TIMELINE.md && echo "_TIMELINE.md exists" || echo "MISSING: _TIMELINE.md" && \
wc -l /c/Users/david/Documents/ChefFlow-Brain/_TIMELINE.md 2>/dev/null && \
echo "=== Expected: _TIMELINE.md should have 4000+ lines ==="
```

If all three files exist and `_TIMELINE.md` has 4000+ lines, Agent D is done.
