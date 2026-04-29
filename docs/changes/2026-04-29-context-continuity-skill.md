# Context Continuity Skill

- Date: 2026-04-29
- Source: Codex session
- User intent: Prevent Codex from rebuilding similar ChefFlow features in disconnected places. Future agents should search existing code, docs, recent commits, claims, and memory surfaces before creating new files or routes.
- Existing related surfaces: `builder`, `planner`, `omninet`, `docs/AGENT-WORKFLOW.md`, `docs/architecture/current-state.md`, `docs/app-complete-audit.md`, `docs/changes/`, `system/agent-reports/`, `system/agent-claims/`.
- Canonical home: `.claude/skills/context-continuity/SKILL.md`, with routing from `omninet` and gate references from `builder` and `planner`.
- Duplicate risk: Without this guard, Codex can create near-duplicate routes, homepages, dashboards, specs, or modules instead of deepening the canonical owner.
- Obsidian note: No direct Obsidian write was performed because this session only exposes local `obsidian_export/`, which is locally excluded and may contain archive material or secrets. The skill now requires using a real Obsidian tool or explicit vault path when available, otherwise writing a compact searchable packet in repo docs or intake.
- Follow-up question: If there is a live Obsidian MCP/app endpoint or exact vault path for safe writes, future work can add a deterministic hook that writes these packets there automatically.
- Links: `.claude/skills/context-continuity/SKILL.md`, `.claude/skills/omninet/SKILL.md`, `.claude/skills/builder/SKILL.md`, `.claude/skills/planner/SKILL.md`.
