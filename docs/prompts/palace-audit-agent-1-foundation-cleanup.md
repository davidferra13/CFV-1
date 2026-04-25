# Agent Handoff: Foundation Cleanup

Read and execute `docs/palace-audit-build-spec.md`, section "AGENT 1: Foundation Cleanup."

## Context

A full MemPalace audit of 535+ sessions revealed the memory system contains lies, contradictions, and stale data. Every future agent session starts by reading MEMORY.md; if that index is wrong, every session starts wrong.

## Your job

Fix these memory files so the next agent that reads them gets truth, not history:

1. **MEMORY.md monetization line is WRONG.** It says "All features free. No Pro tier." The actual policy (in `project_monetization_shift.md` and CLAUDE.md) is enforced two-tier Free/Paid with `requirePro()`. Fix the index entry.

2. **CIL has two contradictory memory files.** `project_continuous_intelligence_layer.md` describes an unbuilt vision (single cil.db, daemon). `project_cil_phase1_ready.md` describes what was actually built (per-tenant SQLite, no daemon, Phase 1+2). Add a status header to the vision file linking to the built file as current truth.

3. **Live ops testing window expired.** `project_live_ops_testing.md` says 2-4 weeks from April 6. Today is April 24. Add expiry note.

4. **Anti-clutter rule is dead letter.** `feedback_anti_clutter_rule.md` says no new features after April 1. Three weeks of heavy building followed. Add an honest note.

5. **Three directory visions never resolved.** `project_ephonebook_vision.md`, `project_food_directory_vision.md`, `project_platform_vision.md`. Add clarifying notes: E-Phone Book superseded by /nearby. Platform Vision's consumer-first framing is aspirational. /nearby hidden until OpenClaw data quality improves.

6. **David's Docket AI model may be stale.** `project_davids_docket.md` references qwen2.5-coder:7b. Gemma 4 expansion happened April 18. Check if the memory is accurate; if not, note it.

7. **MEMORY.md is 204 lines (limit 200).** Prune to stay under 200. Consolidate completed audit entries.

## Rules

- Memory files are at `C:\Users\david\.claude\projects\c--Users-david-Documents-CFv1\memory\`
- Edit existing files; don't create new ones for this task
- Every edit must preserve the frontmatter (name, description, type)
- After all edits, verify `wc -l MEMORY.md` < 200
- Do NOT edit any code files. This is memory-only work.
