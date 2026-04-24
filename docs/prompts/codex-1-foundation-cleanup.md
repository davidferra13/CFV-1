# Codex Task: Foundation Memory Cleanup

Fix stale memory entries so every future agent starts with correct information.

## Files to Edit

All files are in: `C:\Users\david\.claude\projects\c--Users-david-Documents-CFv1\memory\`

### 1. Fix MEMORY.md monetization index line

File: `MEMORY.md`

Find the line containing `project_monetization_shift.md`. It currently says something about "all free" or "no Pro tier". Replace the ENTIRE line with:

```
- `memory/project_monetization_shift.md` - Two-tier Free/Paid enforced via requirePro(). March 2026 "all free" experiment reversed April 2026.
```

### 2. Update CIL memory

File: `project_continuous_intelligence_layer.md`

Add this block at the TOP of the file content (after the frontmatter `---`):

```
**STATUS (2026-04-24):** Phase 1+2 BUILT on 2026-04-18. Architecture changed from original vision. Per-tenant SQLite at `storage/cil/{tenantId}.db`, 7 signal sources, hourly scanner. No daemon. See `project_cil_phase1_ready.md` for current truth. Below is the original vision doc (partially superseded).
```

### 3. Mark live ops testing as expired

File: `project_live_ops_testing.md`

Add this line at the END of the file:

```
**UPDATE (2026-04-24):** Testing window expired (was 2-4 weeks from April 6). No formal results were captured. The product has continued development through the window.
```

### 4. Mark validation phase as de facto ended

File: `feedback_anti_clutter_rule.md`

Add this line at the END of the file:

```
**UPDATE (2026-04-24):** This rule was aspirational. 3 weeks of heavy feature building followed the April 1 declaration. The principle is sound but was overridden by development momentum. Treat as guidance, not a hard gate.
```

### 5. Update David's Docket AI model reference

File: `project_davids_docket.md`

Find any reference to `qwen2.5-coder:7b` or `qwen` and add a note:

```
**NOTE (2026-04-24):** Gemma 4 expansion happened April 18. Verify current model on Pi with `ssh davidferra@10.0.0.177 'ollama list'`. If Gemma 4 is present, it likely replaced Qwen as the primary model.
```

### 6. Prune MEMORY.md to under 200 lines

File: `MEMORY.md`

Count lines with `wc -l`. If over 200, consolidate the "Completed Audits" section at the bottom. Remove these entries entirely (they're closed and documented elsewhere):

- Any entries about completed audits from before April 2026
- Any entries about ChatGPT ingestion pipeline (one-time task)
- Consolidate the "AI Agents" section to 2 lines max

Target: under 190 lines.

## Rules

- Do NOT delete any memory files, only edit content within them
- Do NOT modify CLAUDE.md
- Read each file before editing it
- Keep all existing content; only ADD status updates or REPLACE the specific lines noted

## Verification

- `wc -l MEMORY.md` returns < 200
- `grep -c "all free\|No Pro tier\|no paywalls" MEMORY.md` returns 0
- Each updated file has the new status note
