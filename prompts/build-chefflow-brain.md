# BUILD: ChefFlow-Brain Unified Knowledge Folder

## What This Is

You are building `C:\Users\david\Documents\ChefFlow-Brain\`, a single folder containing every AI conversation, artifact, and knowledge source ever used to discuss, plan, design, debug, or build ChefFlow. When you are done, a person or AI can open this folder and find anything that was ever said about ChefFlow, from any tool, in any format, organized by source and cross-indexed by time.

## Why This Exists

The developer has used Claude Code, Codex, ChatGPT, AnythingLLM, Remy (local Ollama), and MemPalace across 10+ months of building ChefFlow. The conversations are scattered across 22 locations on disk totaling ~9.5 GB and ~48,000 files. There is no single place to search "what did I decide about X" or "when did I first discuss Y." This folder fixes that permanently.

---

## The 8 Sources (Exact Paths, Exact Counts)

### 1. Claude Code Sessions

**Location:** `C:\Users\david\.claude\projects\`
**Format:** JSONL (one JSON object per line, each object is a message)
**What to grab:**

| Project Path                                   | Sessions | Size   | Notes                                                   |
| ---------------------------------------------- | -------- | ------ | ------------------------------------------------------- |
| `c--Users-david-Documents-CFv1\`               | 1,014    | 4.6 GB | Primary. 587 already converted to MD in obsidian_export |
| `c--Users-david-Desktop-ChefFlow\`             | 32       | 131 MB | Early desktop variant                                   |
| `c--Users-david-Desktop-chefflow-v3--1-\`      | 18       | 18 MB  | V3 experiment                                           |
| `E--Downloads-chefflow-2--chefflow\`           | 11       | 7.6 MB | Downloads variant                                       |
| `c--Users-david-Desktop-CHEWWW-FLOW-VS\`       | 11       | 4.1 MB | Earliest ChefFlow work (Jan 18, 2026)                   |
| `c--Users-david-Desktop-Chef-Flow-Master-1-0\` | 2        | 12 KB  | Master attempt                                          |
| `c--Users-david-Desktop-build-chefflow\`       | 1        | 5 KB   | Single session                                          |
| `c--Users-david-Documents-HOME-LLM\`           | 96       | 110 MB | Ecosystem (local AI infra)                              |
| `c--Users-david-Documents-OpenClaw\`           | 42       | 5.5 MB | Ecosystem (pricing engine)                              |

**Conversion rule:** Each `.jsonl` file becomes one `.md` file. Extract `role`, `content`, and timestamp from each line. Use the conversation title from the first user message or from `sessions-index.json` in each project directory. Subagent files (in `subagents/` subdirectories) get appended to their parent conversation, not stored separately.

**Already converted (do not reconvert):** 587 sessions exist as markdown at `C:\Users\david\Documents\CFv1\obsidian_export\chefflow-conversations\`. Match by session UUID to avoid duplication. Convert only the remaining ~427 CFv1 sessions plus all sessions from the other 8 projects.

### 2. Codex Sessions

**Location:** `C:\Users\david\Documents\CFv1\obsidian_export\codex-conversations\`
**Format:** Already markdown (`.jsonl.md` files)
**Count:** 1,010 files, 2.0 GB
**Date range:** Jan 17 - Apr 23, 2026
**Action:** Copy directly. No conversion needed. Strip the `.jsonl` from filenames so they end in `.md`.

### 3. ChatGPT Conversations

**Location:** `C:\Users\david\Documents\CFv1\obsidian_export\chatgpt-conversations\`
**Format:** Already markdown
**Count:** 2,520 files (includes `_INDEX.md`), 83 MB
**Date range:** Aug 2025 - Feb 2026
**Action:** Copy directly. These are the pre-Claude-Code era; the oldest and most foundational product thinking.

**Also grab the extracted signal:**

- `C:\Users\david\Documents\CFv1\obsidian_export\cfv1\.chatgpt-ingestion\batch-005-promoted\` (200 files)
- `C:\Users\david\Documents\CFv1\obsidian_export\cfv1\.chatgpt-ingestion\batch-006-promoted\` (141 files)
- `C:\Users\david\Documents\CFv1\obsidian_export\cfv1\.chatgpt-ingestion\extraction-batch-*.json` (4 files, structured signal chunks)
- `C:\Users\david\Documents\CFv1\obsidian_export\cfv1\.chatgpt-ingestion\ingestion-report.md` (triage summary)

### 4. Session Digests

**Location:** `C:\Users\david\Documents\CFv1\docs\session-digests\`
**Format:** Markdown
**Count:** 64 files, 420 KB
**Date range:** Apr 4 - Apr 24, 2026
**Action:** Copy directly. These are developer-authored summaries written at the end of each working session. High signal density.

### 5. Prompts and Specs

**Prompts:** `C:\Users\david\Documents\CFv1\prompts\` (35 files, 308 KB)
**Specs:** `C:\Users\david\Documents\CFv1\docs\specs\` (grab all `.md` files)
**Research:** `C:\Users\david\Documents\CFv1\docs\research\` (grab all `.md` files)
**Project map:** `C:\Users\david\Documents\CFv1\project-map\` (30 files, 154 KB)
**Memory:** `C:\Users\david\.claude\projects\c--Users-david-Documents-CFv1\memory\` (all `.md` files)
**Action:** Copy directly into respective subdirectories.

### 6. Remy AI Data

**Stats:** `C:\Users\david\Documents\CFv1\data\remy-stats\` (11 files, 1.1 MB, JSON)
**Reports:** `C:\Users\david\Documents\CFv1\docs\remy-daily-reports\` (6 files, 156 KB, JSON)
**RL database:** `C:\Users\david\Documents\CFv1\data\rl-db\chefflow-rl.sqlite` (2.1 MB)
**Action:** Copy all into `remy/` subdirectory.

### 7. Knowledge Graphs and Indexes

**Graphify output:** `C:\Users\david\Documents\CFv1\graphify-out\` - copy only `GRAPH_REPORT.md`, `wiki/` directory, and `graph.json`. Skip cache files. (~20 MB useful, ignore the other 187 MB of cache)
**CIL:** `C:\Users\david\Documents\CFv1\storage\cil\` (2 SQLite files, 776 KB)
**MemPalace config:** `C:\Users\david\Documents\CFv1\mempalace.yaml` (2 KB)
**Action:** Copy into `graphs/` subdirectory. Do NOT copy the 14 GB MemPalace ChromaDB; just note its location in the index.

### 8. Unpacked Archives

**Location:** `C:\Users\david\Downloads\`

| File                                         | Size   | Action                                     |
| -------------------------------------------- | ------ | ------------------------------------------ |
| `CHEF_CORE_BRAIN-20260217T214622Z-1-001.zip` | 1.7 MB | Unzip into `archives/chef-core-brain/`     |
| `CHEFv2-20260217T214248Z-1-001.zip`          | 1.0 MB | Unzip into `archives/chefv2-gdrive/`       |
| `CHEFv2-20260217T214258Z-1-001.zip`          | 1.0 MB | Unzip into same (may be duplicate; dedupe) |
| `chefflow-master-document.md`                | 48 KB  | Copy into `archives/`                      |
| `takeout-20260302T034942Z-3-001.zip`         | 964 KB | Unzip into `archives/google-takeout/`      |

Do NOT unzip `ChatGPTexport.zip` (981 MB, already processed into chatgpt-conversations). Do NOT unzip `EmailGOLDMINE.zip` (36 MB, not AI conversations).

### NOT Included (and why)

- **`.claude/file-history/`** (323 MB, 16,931 diffs) - these are code snapshots, not conversations. Accessible from `.claude/` if needed. Not worth copying.
- **`.claude/todos/`** (5.5 MB, 2,171 files) - ephemeral task tracking per session. Low signal for retrospective use.
- **`.claude/telemetry/`** - system noise.
- **MemPalace ChromaDB** (14 GB) - this is a vector index, not readable content. Reference its location in the master index.
- **Ollama server logs** - request/response traces in `AppData/Local/Ollama/`. Ephemeral, no conversation structure.
- **AnythingLLM** - config files only, no stored conversations found.
- **`obsidian_export/cfv1/`** - this is a stale snapshot of the live repo. The live repo is at `C:\Users\david\Documents\CFv1\`. Do not duplicate it.

---

## Target Folder Structure

```
C:\Users\david\Documents\ChefFlow-Brain\
│
├── _INDEX.md                          # You build this last (see below)
├── _TIMELINE.md                       # Chronological view across all sources
├── _SOURCES.md                        # One-page summary of every source, path, count, date range
│
├── conversations/
│   ├── claude-code/
│   │   ├── cfv1/                      # ~1,014 markdown files (587 existing + 427 converted)
│   │   ├── chefflow-desktop/          # 32 sessions
│   │   ├── chefflow-v3/              # 18 sessions
│   │   ├── chefflow-other/           # 14 sessions (downloads, CHEWWW, master, build)
│   │   ├── home-llm/                 # 96 sessions
│   │   └── openclaw/                 # 42 sessions
│   │
│   ├── codex/                         # 1,010 markdown files
│   │
│   ├── chatgpt/
│   │   ├── all/                       # 2,520 markdown files
│   │   └── promoted/                  # 341 highest-signal conversations
│   │
│   └── remy/                          # Stats, reports, RL database
│
├── artifacts/
│   ├── session-digests/              # 64 files
│   ├── prompts/                      # 35 files
│   ├── specs/                        # All spec documents
│   ├── research/                     # All research documents
│   ├── project-map/                  # 30 product map cards
│   └── memory/                       # Agent memory files
│
├── extracted/
│   ├── chatgpt-signal/              # 4 extraction batch JSON files (13,888 signal chunks)
│   └── ingestion-report.md          # Triage summary of all 2,519 ChatGPT conversations
│
├── graphs/
│   ├── graphify-report.md           # GRAPH_REPORT.md
│   ├── graphify-wiki/               # Wiki directory
│   ├── graphify-graph.json          # Raw graph data
│   ├── cil/                         # CIL SQLite files
│   └── mempalace.yaml               # MemPalace config (index lives at C:\Users\david\.mempalace\)
│
└── archives/
    ├── chef-core-brain/             # Unpacked Google Drive archive
    ├── chefv2-gdrive/               # Unpacked CHEFv2
    ├── google-takeout/              # Unpacked Takeout export
    └── chefflow-master-document.md  # Master doc from Downloads
```

---

## Execution Order

### Phase 1: Create Structure

Create every directory in the tree above. Do not populate yet.

### Phase 2: Copy Direct Sources (no conversion needed)

These are already in the right format. Copy them:

1. Codex conversations -> `conversations/codex/`
2. ChatGPT conversations -> `conversations/chatgpt/all/`
3. ChatGPT promoted -> `conversations/chatgpt/promoted/`
4. Session digests -> `artifacts/session-digests/`
5. Prompts -> `artifacts/prompts/`
6. Specs -> `artifacts/specs/`
7. Research -> `artifacts/research/`
8. Project map -> `artifacts/project-map/`
9. Memory files -> `artifacts/memory/`
10. Remy data -> `conversations/remy/`
11. Extraction batches + ingestion report -> `extracted/`
12. Graphify report, wiki, graph.json -> `graphs/`
13. CIL SQLite -> `graphs/cil/`
14. mempalace.yaml -> `graphs/`

### Phase 3: Copy Already-Converted Claude Code Sessions

Copy the 587 existing markdown files from `obsidian_export/chefflow-conversations/` into `conversations/claude-code/cfv1/`.

### Phase 4: Convert Remaining Claude Code JSONL to Markdown

Write a Node.js script (`scripts/convert-claude-jsonl.mjs`) that:

1. Reads each `.jsonl` file line by line
2. Parses each JSON object
3. Extracts: `role` (human/assistant/system), `content` (text or tool results), timestamp
4. Writes a markdown file with YAML frontmatter (session ID, project, date range, message count) and a clean transcript
5. For subagent files: append to parent conversation under a `## Subagent: {name}` heading
6. Skips any session UUID that already exists in `conversations/claude-code/cfv1/` (dedup against Phase 3)

Run this against:

- All unconverted CFv1 sessions (~427)
- All sessions from the 8 other projects (32 + 18 + 11 + 11 + 2 + 1 + 96 + 42 = 213)

Output goes to the appropriate `conversations/claude-code/{subfolder}/`.

### Phase 5: Unpack Archives

Unzip the 4 archives from Downloads into `archives/`. Use `unzip` or Node.js `yauzl`. If two CHEFv2 zips produce identical content, keep one.

### Phase 6: Build the Index Files

**`_SOURCES.md`:** One table listing every source, its original path, file count, size, date range, and destination path in ChefFlow-Brain.

**`_TIMELINE.md`:** Read the date metadata from every conversation file (frontmatter or filename). Produce a reverse-chronological list grouped by month:

```
## April 2026
- [2026-04-24] Claude Code: "Event lifecycle fix" (cfv1/abc123.md)
- [2026-04-24] Codex: "rollout-2026-04-24T..." (codex/rollout-xyz.md)
- [2026-04-23] ChatGPT: "VS Code Agent Prompt" (chatgpt/all/chatgpt-698xxx.md)
...

## January 2026
...

## August 2025
- [2025-08-09] ChatGPT: "Full Chef Flow Program Build" (chatgpt/all/chatgpt-697xxx.md)
```

This file will be large. That is fine. It is a lookup table, not prose.

**`_INDEX.md`:** The master file. Contains:

1. Total stats (conversations, messages, size, date range, sources)
2. Links to `_TIMELINE.md` and `_SOURCES.md`
3. A "How to search" section explaining: use grep for keyword search, use MemPalace MCP for semantic search, use the timeline for chronological browsing
4. Top 30 highest-signal conversations (pulled from the ChatGPT ingestion report + any Claude Code sessions with >100 messages)
5. A "What's NOT here" section listing MemPalace ChromaDB location, file-history location, and other excluded sources with their paths

---

## Constraints

1. **No symlinks.** Copy files. Symlinks break when drives change, repos move, or Obsidian indexes the vault. Disk is cheap; broken links are not.
2. **No data loss.** This is additive. Never delete or modify source files. Only read from sources, write to ChefFlow-Brain.
3. **Dedup by content, not by name.** Two files with different names but the same session UUID or conversation ID are the same conversation. Keep one. Use the richer version (more messages, better formatting).
4. **Markdown everywhere.** Every file a human reads should be `.md`. JSON extraction batches stay as `.json` because they are machine-readable data, not narratives.
5. **Frontmatter on every conversation file.** Minimum fields: `source` (claude-code|codex|chatgpt|remy), `session_id` or `conversation_id`, `title`, `date` (ISO 8601), `message_count`, `original_path`.
6. **No AI summarization.** Do not summarize, condense, or editorialize any conversation. Copy the full content. The value is in the raw record, not a summary.
7. **File naming:** `{source}-{date}-{short-title-slug}.md` where possible. For ChatGPT files that already have UUID names, keep them but ensure the title is in frontmatter.
8. **Size budget:** The final folder should be ~4-6 GB. The main bulk is the 2 GB of Codex conversations and ~2 GB of converted Claude Code sessions. If it exceeds 8 GB, something is duplicated.

---

## Verification Checklist (run after completion)

- [ ] `find ChefFlow-Brain/conversations -name "*.md" | wc -l` returns >= 4,800 (1,014 + 213 + 1,010 + 2,520 + 341 minus dedup overlap)
- [ ] `_INDEX.md` exists and contains accurate totals
- [ ] `_TIMELINE.md` has entries from Aug 2025 through Apr 2026
- [ ] `_SOURCES.md` lists all 8 sources with correct counts
- [ ] `conversations/claude-code/cfv1/` has ~1,014 files
- [ ] `conversations/codex/` has ~1,010 files
- [ ] `conversations/chatgpt/all/` has ~2,520 files
- [ ] `archives/` contains unpacked content from at least 3 zips
- [ ] `grep -r "conversation_id\|session_id" ChefFlow-Brain/conversations/ | head -5` returns valid frontmatter
- [ ] No file in ChefFlow-Brain is a symlink: `find ChefFlow-Brain -type l | wc -l` returns 0
- [ ] Total size: `du -sh ChefFlow-Brain/` reports 4-8 GB
