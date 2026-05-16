# ChefFlow Agent Rules

These rules apply to Codex and other repo agents working in this workspace.

## Build Queue First

The developer is not hand-coding. Treat casual build requests as product intake, not immediate implementation.

Default behavior:

- If the user explicitly asks to queue, backlog, save, batch, or defer work, add it to the build queue instead of editing application code.
- If the user says they "have to add", "need to add", "want to add", "should add", or otherwise introduces a feature idea conversationally, do not immediately create a queue item. First go through the spec with the user.
- Use `.agents/skills/build-queue/scripts/build-queue.mjs add` only after the request has enough spec shape to be useful, or when the user explicitly says to queue it now.
- Preserve the raw request, then shape the queue item with goal, scope, acceptance criteria, risks, dependencies, and verification.
- Do not start feature work from casual phrasing like "build this", "fix this", "add this", or "make this better".
- For underspecified ideas, ask concise product/spec questions about the outcome, user flow, scope boundaries, acceptance criteria, edge cases, and verification before queueing.

Implementation is allowed only when the user explicitly says one of:

- "fire the queue"
- "build the queue"
- "execute this queue item now"
- "direct hotfix now"
- "do not queue this"

## Firing Rules

When firing queued work:

- Claim selected items with `build-queue.mjs fire`, which moves them to `.agents/build-queue/in-flight`.
- Every fired run must have a run ID.
- One lead orchestrator owns dependency ordering, file ownership boundaries, merge order, and final verification.
- Additional orchestrators may work only on non-overlapping wave lanes.
- Do not let independent agents edit the same files in the same wave.
- Use separate branches or worktrees for substantial lanes whenever available.
- Merge serially through the lead orchestrator.
- Move completed items to `done`; move blocked items to `blocked` with a reason.
- If a run is cancelled, move its items back to `active` with a reason.

## Finish Gate

After a building agent finishes code changes for any fired queue item, the lead orchestrator must prove the app is running the new work before moving the item to `done`.

Required closeout:

- Restart or reload the owned dev server when needed. Do not kill unrelated live servers.
- Hard refresh the affected route or page.
- Check browser console, network, server logs, and runtime errors relevant to the changed surface.
- Run focused verification commands, tests, type checks, or smoke checks that match the changed files.
- For UI work, capture visible proof with a screenshot, recording, or explicit manual route check.
- Generate or update the proof pack with acceptance evidence, wiring proof, runtime proof, verification output, and partial-work notes.
- Run `build-queue.mjs finish-check` for the selected queue item IDs.
- Move the item to `done` only when acceptance criteria are proven.
- Keep the item `in-flight` or move it to `blocked` when verification is incomplete, the page still looks unchanged without objective proof, or a blocker remains.

A build is not complete just because files changed. It is complete only when the running app, proof pack, and finish check all support the queue item's acceptance criteria.

## Canonical Dev Server Policy

ChefFlow app work must use one canonical dev server by default:

- Canonical app URL: `http://localhost:3100`
- Canonical command: `npm run dev`
- Before starting any app server, inspect existing listeners/processes for port `3100`.
- If `3100` is already serving this checkout, reuse it. Do not start another ChefFlow app server on a random port.
- If `3100` is stale or broken, restart the canonical server instead of creating a second server.
- Alternate ChefFlow app ports are allowed only for explicit test isolation or an explicitly approved separate worktree run. The agent must state the reason, port, checkout path, and cleanup plan before using one.
- Temporary test servers must be stopped after verification unless the user explicitly asks to keep them running.
- Do not touch unrelated external project servers such as the Wix rebuild unless the user explicitly asks.
- Mission Control, Persona inbox, sync daemons, Playwright MCP, Ollama, cloudflared, and other tooling are not app build servers. Do not confuse them with the canonical ChefFlow app server, and do not stop them unless the task is specifically about those tools.
- Build closeout must identify the exact URL verified. For normal app work this should be `http://localhost:3100`.

Builds should converge into the main ChefFlow checkout. Do not segment implementation across ad hoc ports, duplicate dev servers, or untracked worktrees as a substitute for the queue firing workflow. If a separate worktree is necessary, it must have a named purpose, non-overlapping ownership, and a merge/cleanup plan.

## Dirty Workspace Rule

Before implementation, inspect `git status --short`.

If there is unrelated dirty work, do not overwrite it. Queue the request or create an isolated worktree. Never reset, checkout, or delete user or agent work unless the user explicitly asks.

## Direct Work Exceptions

Direct edits in the main workspace are acceptable for:

- Maintaining the queue system itself.
- Read-only diagnosis and planning.
- Tiny direct hotfixes only when the user explicitly says not to queue them.

## Skill Routing Contract

ChefFlow has both Codex-visible skills and repo-local skills under `.claude/skills`.
Do not assume every historical skill reference is installed in the current checkout.

At the start of every ChefFlow task:

1. Run the `omninet` routing loop mentally or explicitly if `.claude/skills/omninet/SKILL.md` exists.
2. Load any skill named by the user when its skill file exists.
3. Load only the most specific skill clearly implied by the task.
4. If a named or referenced skill is missing, say it is missing and use the nearest available fallback.
5. Do not run the whole skill inventory for every interaction.

Skill behavior contract:

- Always active: system instructions, this `AGENTS.md`, Build Queue First, dirty workspace protection, and hard-stop safety rules.
- User-named skills: load when present.
- Implied skills: load only when the request clearly matches their trigger.
- Historical or missing skills: guidance only, not an executed skill.
- Broad build work: prefer the build queue firing workflow unless the user explicitly authorizes a direct hotfix or says not to queue.

Use the inventory audit when routing looks stale:

```powershell
node .claude/skills/omninet/scripts/skill-inventory.mjs
```

## Security and Auth Invariants

These rules apply to ALL agent work that touches routes, server actions, API routes, or database queries.

### Auth Gates Are Mandatory

- Every server action (`'use server'`) must call `requireChef()`, `requireClient()`, `requireAuth()`, `requireAdmin()`, `requireStaff()`, or `requirePartner()` before any data access.
- Every API route must either (a) pass through middleware auth, or (b) self-authenticate via `verifyCronAuth`, `withApiAuth`, webhook signature verification, or equivalent.
- The only exceptions are intentionally public endpoints (health checks, discovery, embeds) that expose no PII or tenant data.

### Tenant Scoping Is Mandatory

- Every DB query returning tenant data must include `.eq('tenant_id', user.tenantId!)` or `.eq('chef_id', user.tenantId!)`.
- Never use a dynamic route param (e.g., `params.eventId`) as the sole filter. Always combine with tenant scoping: `.eq('id', params.eventId).eq('tenant_id', user.tenantId!)`.
- If adding a new table, include a `tenant_id` or `chef_id` column with FK to `chefs.id` unless the table is intentionally platform-level.

### Route Registration

- When adding a new page route, add it to the correct array in `lib/auth/route-policy.ts`:
  - Public pages: `PUBLIC_UNAUTHENTICATED_PATHS`
  - Chef pages: `CHEF_PROTECTED_PATHS`
  - Client pages: `CLIENT_PROTECTED_PATHS`
  - Staff/Partner/Admin: respective arrays
- The UI (nav hiding, button visibility) is NOT a security boundary. Server-side protection must exist independently.

### Admin Routes Are Runtime-Gated

- Middleware allows all authenticated users to reach `/admin` paths (returns `admin_runtime_gate`).
- Every admin page and server action MUST call `requireAdmin()`. A missing guard is a privilege escalation vulnerability.

### Key Auth Files

| File                       | Purpose                                      |
| -------------------------- | -------------------------------------------- |
| `middleware.ts`            | Edge auth gate                               |
| `lib/auth/route-policy.ts` | Path classification (single source of truth) |
| `lib/auth/get-user.ts`     | Role guard functions                         |
| `lib/auth/admin.ts`        | Admin guard                                  |
| `lib/auth/permissions.ts`  | RBAC engine                                  |
| `lib/api/v2/middleware.ts` | V2 API auth                                  |
| `lib/auth/cron-auth.ts`    | Cron auth                                    |

### Security Audit Prompt

For comprehensive security audits, use `docs/codex-security-route-audit-prompt.md`. It contains the full audit plan, known gaps, commands to run, and deliverable specifications.
