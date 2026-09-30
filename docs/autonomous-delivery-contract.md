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

## One Source of Truth, One Deployer (ChefFlow)

Owner complaint 2026-09-30: "ChefFlow looks different every single time we work on something." Measured cause: 41 working copies, production served for months out of the dirty `Documents\CFv1` folder, finished UI work left uncommitted there (the 2026-09-24 chef Today/navigation pass was only recovered on 2026-09-30), and unregistered agents changing main and the production folder at the same time. These rules exist so the owner always sees the same app.

1. **Only `origin/main` is ChefFlow.** Work that is not on main does not exist for the owner. Commit and push to main the moment it is verified (lifecycle steps 6 and 7). Uncommitted or branch-only UI work older than a working session is a defect, not a draft.
2. **Production only ever serves main.** `Documents\CFv1-worktrees\production-live` stays checked out on `main` at exactly the commit it serves (`.next\BUILD_ID` equals `git rev-parse --short HEAD`). Never commit, cherry-pick, or create a branch inside `production-live`; do the work in your own worktree, push to main, then deploy main.
3. **One deployer at a time.** Before building or swapping in `production-live`, register with `C:\Users\david\Desktop\AGENT COMMAND\agent-control\checkin.ps1 start -Agent <you> -Repo "Documents\CFv1-worktrees\production-live" -Task "<deploy commit>"`. If `checkin.ps1 who -Repo "Documents\CFv1-worktrees\production-live"` exits 3, or a `run-next-build` process is already running there, wait for it; do not start a second build. Release with `checkin.ps1 end` after production is verified.
4. **Never serve a folder agents edit.** No dev server, `next start`, or tunnel may point production hostnames at `Documents\CFv1` or any feature worktree.
5. **Before moving production, rescue stranded work.** Run `node scripts/stranded-work-scan.mjs` and commit or explicitly hand off anything it lists under `app/`, `components/`, or `lib/`, so a deploy never silently drops work someone could see before.
6. **Direction changes are the owner's.** A change that alters what the public homepage or the chef Today page is for (who it addresses, its primary action) needs the owner's explicit instruction in the task. Record that instruction in the commit message.

## ChefFlow Release Mapping

For this repository, re-verify these facts at runtime because historical documents conflict:

- Primary release gate: `npm run regression:firewall`; use `npm run verify:release` for production website releases.
- Production runtime (verified 2026-09-30): `Documents\CFv1-worktrees\production-live` on main, served by `next start` on `127.0.0.1:3100`, supervised by `production-live\chefflow-watchdog.ps1` (launched by `scripts\watchdog-launcher.vbs`), public through the `chefflow-prod` Cloudflare tunnel. `scripts/deploy-prod.sh` targets a Docker build on 3200 that no hostname routes to; do not use it.
- Zero-downtime deploy: `scripts/run-next-build.mjs` deletes `.next` before building, so never build into the live `.next`. Build with `NEXT_DIST_DIR=.next-staging` (and `NODE_ENV=production`) in `production-live`, confirm `.next-staging\BUILD_ID` equals HEAD and `prerender-manifest.json` exists, then stop the 3100 server, rename `.next` to `.next-prev` and `.next-staging` to `.next`; the watchdog relaunches in about 30 seconds. Roll back by the reverse rename.
- Current documented production health URL: `https://app.cheflowhq.com/api/health/readiness?strict=1`.
- Current documented revision URL: `https://app.cheflowhq.com/api/build-version`.
- `dfprivatechef.com` appears in historical routing documentation; do not treat that as proof of the current DF Private Chef website deployment without checking the live mapping.

If current code, host state, or deployment evidence supersedes these entries, update this section in the same task.
