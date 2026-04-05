# Mission Control

**What:** Developer ops dashboard at localhost:41937. Battle.net-style UI with Gustav AI assistant.

**Key files:** `scripts/launcher/index.html` (11K lines), `scripts/launcher/server.mjs`
**Status:** 85% FUNCTIONAL (stale, unused for 2 months)

## What It Has

- 18 navigation panels: Home, Dev, Beta, Prod, AI, Remy, Git, Build, Log, Timeline, Feedback, Infra, Blueprint, Observe, Sysref, Expenses, Logins, Manual
- 90+ REST API endpoints for everything (status, deploy, build, git, database, testing, business data, Remy, code scanning)
- Gustav AI chat: 110+ tools, kitchen-themed personality, natural language infrastructure control
- One-click pipelines: Ship It (commit + push + deploy), Close Out (typecheck + build + commit + push)
- Live feed panel (SSE log streaming from dev, Ollama, beta, tunnel, system)
- Blueprint panel: 6-phase launch plan, mission statement, readiness checklist
- Manual panel: full app documentation explorer with search

## What's Wrong

- **Unused for 2 months.** Developer stopped using it because buttons felt overwhelming and risky.
- **Stale data.** Queue items, timeline, and stats are from February 2026.
- **Live feed panel hidden** by default (display:none), may not fully work.
- **Gustav memories are browser-only** (ephemeral per session, no persistence).
- **No connection to the new Project Map or Product Blueprint.**
- **Too many buttons.** Developer was afraid to press them. Needs to be more passive/read-only.

## What It Should Become

Per developer feedback: a passive surveillance dashboard. Google Drive-style visibility into the project. Calendar of what's happening. Progress bar toward V1. Last completed items. Active work. Queue. No scary buttons. Just a screen you look at.

## Open Items

- Full revamp needed (separate spec required)
- Should integrate with Product Blueprint for V1 progress bar
- Should show session digests (conversation history)
- Should pull from project-map/ folder for live project state
