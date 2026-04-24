# Agent A: Scaffold + Direct Copies

## Job

Create the `C:\Users\david\Documents\ChefFlow-Brain\` directory tree and populate it with every source that is already in markdown or JSON format. No conversion. Only `mkdir` and `cp` operations.

This agent runs in parallel with Agents B and C. It has zero dependencies.

---

## Step 1: Create Directory Tree

Run these exact commands:

```bash
mkdir -p /c/Users/david/Documents/ChefFlow-Brain/{conversations/{claude-code/{cfv1,chefflow-desktop,chefflow-v3,chefflow-other,home-llm,openclaw},codex,chatgpt/{all,promoted},remy},extracted,artifacts/{session-digests,prompts,specs,research,project-map,memory},graphs/{graphify-wiki,cil},archives/{chef-core-brain,chefv2-gdrive,google-takeout},meta}
```

Verify every leaf directory exists:

```bash
find /c/Users/david/Documents/ChefFlow-Brain -type d | sort
```

Expected: 22 directories.

---

## Step 2: Copy ChatGPT Conversations

**Source:** `/c/Users/david/Documents/CFv1/obsidian_export/chatgpt-conversations/`
**Destination:** `ChefFlow-Brain/conversations/chatgpt/all/`
**Format:** Already markdown with YAML frontmatter. Full transcripts.
**Count:** 2,520 files (including `_INDEX.md`)

```bash
cp /c/Users/david/Documents/CFv1/obsidian_export/chatgpt-conversations/*.md /c/Users/david/Documents/ChefFlow-Brain/conversations/chatgpt/all/
```

**Verify:** `ls /c/Users/david/Documents/ChefFlow-Brain/conversations/chatgpt/all/*.md | wc -l` should return ~2,520.

---

## Step 3: Copy ChatGPT Promoted (High-Signal Subset)

These are the 341 highest-value conversations selected by a triage pipeline.

**Source A:** `/c/Users/david/Documents/CFv1/obsidian_export/cfv1/.chatgpt-ingestion/batch-005-promoted/` (200 files)
**Source B:** `/c/Users/david/Documents/CFv1/obsidian_export/cfv1/.chatgpt-ingestion/batch-006-promoted/` (141 files)
**Destination:** `ChefFlow-Brain/conversations/chatgpt/promoted/`

```bash
cp /c/Users/david/Documents/CFv1/obsidian_export/cfv1/.chatgpt-ingestion/batch-005-promoted/*.md /c/Users/david/Documents/ChefFlow-Brain/conversations/chatgpt/promoted/
cp /c/Users/david/Documents/CFv1/obsidian_export/cfv1/.chatgpt-ingestion/batch-006-promoted/*.md /c/Users/david/Documents/ChefFlow-Brain/conversations/chatgpt/promoted/
```

**Verify:** `ls /c/Users/david/Documents/ChefFlow-Brain/conversations/chatgpt/promoted/*.md | wc -l` should return ~341.

---

## Step 4: Copy Extracted Signal Data

**Source A:** `/c/Users/david/Documents/CFv1/obsidian_export/cfv1/.chatgpt-ingestion/extraction-batch-*.json` (4 JSON files with 13,888 signal chunks)
**Source B:** `/c/Users/david/Documents/CFv1/obsidian_export/cfv1/.chatgpt-ingestion/ingestion-report.md`
**Destination:** `ChefFlow-Brain/extracted/`

```bash
cp /c/Users/david/Documents/CFv1/obsidian_export/cfv1/.chatgpt-ingestion/extraction-batch-*.json /c/Users/david/Documents/ChefFlow-Brain/extracted/
cp /c/Users/david/Documents/CFv1/obsidian_export/cfv1/.chatgpt-ingestion/ingestion-report.md /c/Users/david/Documents/ChefFlow-Brain/extracted/
```

**Verify:** `ls /c/Users/david/Documents/ChefFlow-Brain/extracted/ | wc -l` should return 5.

---

## Step 5: Copy Session Digests

**Source:** `/c/Users/david/Documents/CFv1/docs/session-digests/`
**Destination:** `ChefFlow-Brain/artifacts/session-digests/`
**Count:** ~64 markdown files. Developer-authored session summaries.

```bash
cp /c/Users/david/Documents/CFv1/docs/session-digests/*.md /c/Users/david/Documents/ChefFlow-Brain/artifacts/session-digests/
```

**Verify:** `ls /c/Users/david/Documents/ChefFlow-Brain/artifacts/session-digests/*.md | wc -l` should return ~64.

---

## Step 6: Copy Prompts

**Source:** `/c/Users/david/Documents/CFv1/prompts/`
**Destination:** `ChefFlow-Brain/artifacts/prompts/`
**Count:** ~35 files. Exclude `brain-agent-*` and `execute-chefflow-brain.md` and `build-chefflow-brain.md` (those are meta-prompts for this build, not project prompts).

```bash
cp /c/Users/david/Documents/CFv1/prompts/*.md /c/Users/david/Documents/ChefFlow-Brain/artifacts/prompts/
```

**Verify:** `ls /c/Users/david/Documents/ChefFlow-Brain/artifacts/prompts/*.md | wc -l` returns >= 35.

---

## Step 7: Copy Specs

**Source:** `/c/Users/david/Documents/CFv1/docs/specs/`
**Destination:** `ChefFlow-Brain/artifacts/specs/`
**Count:** ~306 markdown files.

```bash
cp /c/Users/david/Documents/CFv1/docs/specs/*.md /c/Users/david/Documents/ChefFlow-Brain/artifacts/specs/
```

**Verify:** `ls /c/Users/david/Documents/ChefFlow-Brain/artifacts/specs/*.md | wc -l` returns >= 300.

---

## Step 8: Copy Research

**Source:** `/c/Users/david/Documents/CFv1/docs/research/`
**Destination:** `ChefFlow-Brain/artifacts/research/`
**Count:** ~170 markdown files.

```bash
cp /c/Users/david/Documents/CFv1/docs/research/*.md /c/Users/david/Documents/ChefFlow-Brain/artifacts/research/
```

**Verify:** `ls /c/Users/david/Documents/ChefFlow-Brain/artifacts/research/*.md | wc -l` returns >= 170.

---

## Step 9: Copy Project Map

**Source:** `/c/Users/david/Documents/CFv1/project-map/`
**Destination:** `ChefFlow-Brain/artifacts/project-map/`
**Count:** ~30 files.

```bash
cp /c/Users/david/Documents/CFv1/project-map/*.md /c/Users/david/Documents/ChefFlow-Brain/artifacts/project-map/
```

---

## Step 10: Copy Memory Files

**Source:** `/c/Users/david/.claude/projects/c--Users-david-Documents-CFv1/memory/`
**Destination:** `ChefFlow-Brain/artifacts/memory/`

```bash
cp /c/Users/david/.claude/projects/c--Users-david-Documents-CFv1/memory/*.md /c/Users/david/Documents/ChefFlow-Brain/artifacts/memory/
```

---

## Step 11: Copy Remy AI Data

**Source A:** `/c/Users/david/Documents/CFv1/data/remy-stats/` (11 JSON files)
**Source B:** `/c/Users/david/Documents/CFv1/docs/remy-daily-reports/` (6 JSON files)
**Source C:** `/c/Users/david/Documents/CFv1/data/rl-db/chefflow-rl.sqlite` (2.1 MB SQLite)
**Destination:** `ChefFlow-Brain/conversations/remy/`

```bash
cp /c/Users/david/Documents/CFv1/data/remy-stats/*.json /c/Users/david/Documents/ChefFlow-Brain/conversations/remy/
cp /c/Users/david/Documents/CFv1/docs/remy-daily-reports/*.json /c/Users/david/Documents/ChefFlow-Brain/conversations/remy/
cp /c/Users/david/Documents/CFv1/data/rl-db/chefflow-rl.sqlite /c/Users/david/Documents/ChefFlow-Brain/conversations/remy/
```

---

## Step 12: Copy Graphify Outputs

Only copy the useful outputs, not the 207 MB of cache.

**Source:** `/c/Users/david/Documents/CFv1/graphify-out/`
**Destination:** `ChefFlow-Brain/graphs/`

```bash
cp /c/Users/david/Documents/CFv1/graphify-out/GRAPH_REPORT.md /c/Users/david/Documents/ChefFlow-Brain/graphs/graphify-report.md
cp -r /c/Users/david/Documents/CFv1/graphify-out/wiki /c/Users/david/Documents/ChefFlow-Brain/graphs/graphify-wiki/ 2>/dev/null || echo "No wiki dir"
cp /c/Users/david/Documents/CFv1/graphify-out/graph.json /c/Users/david/Documents/ChefFlow-Brain/graphs/graphify-graph.json 2>/dev/null || echo "No graph.json"
```

---

## Step 13: Copy CIL Data

**Source:** `/c/Users/david/Documents/CFv1/storage/cil/`
**Destination:** `ChefFlow-Brain/graphs/cil/`

```bash
cp /c/Users/david/Documents/CFv1/storage/cil/*.sqlite* /c/Users/david/Documents/ChefFlow-Brain/graphs/cil/ 2>/dev/null || echo "No CIL files"
cp /c/Users/david/Documents/CFv1/mempalace.yaml /c/Users/david/Documents/ChefFlow-Brain/graphs/
```

---

## Step 14: Unpack Archives

**Source:** `/c/Users/david/Downloads/`

```bash
cd /c/Users/david/Documents/ChefFlow-Brain/archives

# Chef Core Brain
unzip -o "/c/Users/david/Downloads/CHEF_CORE_BRAIN-20260217T214622Z-1-001.zip" -d chef-core-brain/ 2>/dev/null || echo "CHEF_CORE_BRAIN zip not found or failed"

# CHEFv2 Google Drive export (two zips, may overlap)
unzip -o "/c/Users/david/Downloads/CHEFv2-20260217T214248Z-1-001.zip" -d chefv2-gdrive/ 2>/dev/null || echo "CHEFv2 zip 1 not found"
unzip -o "/c/Users/david/Downloads/CHEFv2-20260217T214258Z-1-001.zip" -d chefv2-gdrive/ 2>/dev/null || echo "CHEFv2 zip 2 not found"

# Google Takeout
unzip -o "/c/Users/david/Downloads/takeout-20260302T034942Z-3-001.zip" -d google-takeout/ 2>/dev/null || echo "Takeout zip not found"

# Master document
cp "/c/Users/david/Downloads/chefflow-master-document.md" . 2>/dev/null || echo "Master doc not found"
```

---

## Step 15: Write Build Log Entry

Create `ChefFlow-Brain/_BUILD_LOG.md`:

```markdown
# ChefFlow-Brain Build Log

## Agent A: Scaffold + Direct Copies

- **Completed:** [timestamp]
- **ChatGPT conversations:** [count] files copied
- **ChatGPT promoted:** [count] files copied
- **Extracted signal:** [count] files copied
- **Session digests:** [count] files copied
- **Prompts:** [count] files copied
- **Specs:** [count] files copied
- **Research:** [count] files copied
- **Project map:** [count] files copied
- **Memory:** [count] files copied
- **Remy data:** [count] files copied
- **Graphify:** copied report + wiki + graph.json
- **Archives:** [list which zips succeeded]
- **Skipped/Failed:** [list any missing sources]
```

Fill in the actual counts by running `ls [dir] | wc -l` for each destination.

---

## Completion Check

Run this single command to verify everything:

```bash
echo "=== Agent A Verification ===" && \
echo -n "chatgpt/all: " && ls /c/Users/david/Documents/ChefFlow-Brain/conversations/chatgpt/all/*.md 2>/dev/null | wc -l && \
echo -n "chatgpt/promoted: " && ls /c/Users/david/Documents/ChefFlow-Brain/conversations/chatgpt/promoted/*.md 2>/dev/null | wc -l && \
echo -n "extracted: " && ls /c/Users/david/Documents/ChefFlow-Brain/extracted/ 2>/dev/null | wc -l && \
echo -n "session-digests: " && ls /c/Users/david/Documents/ChefFlow-Brain/artifacts/session-digests/*.md 2>/dev/null | wc -l && \
echo -n "prompts: " && ls /c/Users/david/Documents/ChefFlow-Brain/artifacts/prompts/*.md 2>/dev/null | wc -l && \
echo -n "specs: " && ls /c/Users/david/Documents/ChefFlow-Brain/artifacts/specs/*.md 2>/dev/null | wc -l && \
echo -n "research: " && ls /c/Users/david/Documents/ChefFlow-Brain/artifacts/research/*.md 2>/dev/null | wc -l && \
echo -n "project-map: " && ls /c/Users/david/Documents/ChefFlow-Brain/artifacts/project-map/*.md 2>/dev/null | wc -l && \
echo -n "memory: " && ls /c/Users/david/Documents/ChefFlow-Brain/artifacts/memory/*.md 2>/dev/null | wc -l && \
echo -n "remy: " && ls /c/Users/david/Documents/ChefFlow-Brain/conversations/remy/ 2>/dev/null | wc -l && \
echo -n "archives dirs: " && ls -d /c/Users/david/Documents/ChefFlow-Brain/archives/*/ 2>/dev/null | wc -l && \
echo "=== Expected: chatgpt/all ~2520, promoted ~341, extracted 5, digests ~64, prompts ~35, specs ~306, research ~170, project-map ~30, memory ~50, remy ~18, archives 3+ ==="
```

If all counts are within 10% of expected, Agent A is done.
