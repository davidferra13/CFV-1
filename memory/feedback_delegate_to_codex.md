---
name: Delegate Builds to Codex
description: NEVER build everything in main Claude session. Dispatch build work to parallel Codex agents. Main session plans and coordinates only.
type: feedback
---

STOP building everything single-handedly in the main Claude Code session. It wastes Opus tokens on mechanical build work.

**Why:** Claude doing all builds in one session burns expensive Opus tokens. User pays for every token. Codex agents run in separate context windows at lower cost. The main session should coordinate, not execute.

**How to apply:**

- When user asks Claude to BUILD something: dispatch to Codex/parallel agents using Agent tool (with `model: "haiku"` for mechanical work)
- Main session role: plan, coordinate, review results, fix issues
- Use `isolation: "worktree"` for independent build tasks
- Spawn multiple agents in parallel when tasks are independent
- Only build directly in main session for: tiny fixes (< 20 lines), debugging that requires conversation context, or architecture decisions
- For any feature or substantial code change: Agent tool with clear specs, not inline building
- Think of main session as architect/PM, agents as builders
