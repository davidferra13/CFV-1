# Autonomous Delivery Contract

This contract applies to every implementation agent working in this repository: Codex, Claude Code, OpenCode, Antigravity, and local agents.

## Execution Trigger

An explicit implementation command from David—including **build**, **fix**, **implement**, **proceed**, **do it**, **keep building**, **ship**, or an equivalent imperative—authorizes the complete delivery lifecycle.

Do not wait for David to separately say **fire the queue**, **commit**, **push**, **publish**, or **deploy**. Those actions are included in the original implementation request.

A question, review request, diagnosis request, or conversational possibility without execution language does not authorize mutation. If David explicitly asks to queue, backlog, save, batch, defer, draft, preview, keep local, or not deploy, follow that narrower instruction.

## Standing Release Authorization

For requested implementation work in an already-linked repository and its established deployment target, the following are pre-authorized:

- task-scoped commits using the repository's commit convention;
- pushing the completed commit to the established upstream;
- completing the repository's normal branch or merge path;
- running existing CI, release gates, builds, and tests;
- deploying website/runtime changes through the established production mechanism;
- restarting only the service owned by the target project;
- applying tested, backward-compatible migrations that are an explicit part of the requested feature and use the established migration path;
- checking production health, logs, revision identity, routes, and browser behavior;
- rolling back through an established, verified rollback path when the new release makes a previously healthy production target unhealthy.

Do not ask for these actions again.

## Required Lifecycle

1. **Resolve the target.** Identify the canonical repository/worktree, requested product, branch and upstream, dirty state, deployment configuration, production domain, and current live revision. Never infer a target from a nearby project.
2. **Protect existing work.** Preserve unrelated user/agent changes. Stage only task-owned files. Use an isolated branch or worktree when ownership overlaps.
3. **Implement completely.** Reuse the existing architecture and finish the requested behavior, including error, loading, empty, mobile, accessibility, and integration states that apply.
4. **Verify locally.** Run focused tests plus the repository's required release gate. UI work requires browser verification on relevant desktop/mobile widths and inspection of console, network, and server errors.
5. **Review the diff.** Check scope, regressions, secrets, generated artifacts, placeholders, fake success states, and accidental unrelated changes.
6. **Commit.** Create a conventional, task-scoped commit as soon as the change is verified. Do not leave completed work uncommitted until session end.
7. **Push.** Push the commit immediately. If the repository uses protected branches, complete its PR/merge path after checks pass. Do not leave completed work stranded on an unpushed or unmerged branch.
8. **Deploy.** Website and runtime changes go to the correct established production target by default. A preview or local server is not production. Documentation-only or inert developer-tooling changes do not require a production restart.
9. **Verify production.** Confirm public health, the requested live behavior, critical adjacent flow, and—when exposed—the deployed revision against the pushed commit. A successful deploy command alone is not proof.
10. **Recover.** Diagnose and fix failed checks or deployment errors within bounded retries. If the new release degraded a previously healthy target and a proven rollback exists, roll it back.
11. **Close out with evidence.** Report the commit SHA, pushed branch, deployment target/revision, live URL, checks run, and final status.

## Completion States

Use exactly one truthful state:

- **LIVE** — code is verified, committed, pushed, deployed, and verified on the canonical production surface.
- **COMPLETE** — non-runtime work is verified, committed, and pushed; no production deployment applies.
- **BLOCKED** — a genuine hard stop prevented completion. Name the failed stage, exact evidence, preserved work, and the single next action.

Never use **done**, **complete**, **shipped**, or **live** for a website/runtime change that exists only locally, only in Git, only in CI, only in a preview, or behind an unverified deploy command.

## Hard Stops

Continue autonomously through recoverable failures. Stop only for:

- missing credentials, MFA, OTP, CAPTCHA, or permission that the agent cannot obtain through the established environment;
- destructive or irreversible data changes, unproven rollback, credential rotation, domain ownership/DNS changes, a new paid service, or a materially different architecture;
- external messages, outreach, purchases, transfers, or other actions outside software delivery;
- unresolved overlap with unrelated dirty work;
- inability to identify the correct repository or production target from evidence;
- a release gate that still fails after focused diagnosis and bounded repair attempts.

When blocked, commit and push any safe, independently valid work if the checks for that work pass. Never bypass a failing gate, hide a partial release, deploy to a guessed target, or claim success.

## Cross-Project User-Level Installation

Run `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/install-global-agent-delivery-policy.ps1` to install the managed standing rule without overwriting other user instructions. ChefFlow's session-start hook runs this installer idempotently.

The installer writes the managed block to the effective user-level instruction files for:

- Codex: `$CODEX_HOME/AGENTS.md` or the active `AGENTS.override.md`;
- Claude Code: `~/.claude/CLAUDE.md`;
- OpenCode: `~/.config/opencode/AGENTS.md` (respecting `XDG_CONFIG_HOME`);
- Antigravity: `~/.gemini/GEMINI.md`.

Project-specific rules may add stricter checks, but they must not restore a redundant commit/push/deploy approval gate.

## Project Separation

DFPrivateChef.com, Anthony's website/cheflicari.com, the weather app, ChefFlow, Chef Collect, and future products are separate release targets unless repository evidence explicitly proves otherwise. Inspect each target's own deployment mapping before shipping. Never use a successful deployment of one as evidence for another.

## ChefFlow Release Mapping

For this repository, re-verify these facts at runtime because historical documents conflict:

- Primary release gate: `npm run regression:firewall`; use `npm run verify:release` for production website releases.
- Current production deploy entrypoint in source: `bash scripts/deploy-prod.sh`.
- Current documented production health URL: `https://app.cheflowhq.com/api/health/readiness?strict=1`.
- Current documented revision URL: `https://app.cheflowhq.com/api/build-version`.
- `dfprivatechef.com` appears in historical routing documentation; do not treat that as proof of the current DF Private Chef website deployment without checking the live mapping.

If current code, host state, or deployment evidence supersedes these entries, update this section in the same task.
