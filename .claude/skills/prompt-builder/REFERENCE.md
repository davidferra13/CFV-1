# Prompt Builder Reference

## Mode Selection

Use **Spec Questions Prompt** when:

- The user has a raw idea, pain point, or ambition.
- The target route, roles, data owner, or acceptance criteria are unclear.
- The idea might duplicate active queue work.

Use **Queue Item Draft Prompt** when:

- The idea has a clear goal and rough scope.
- The user wants to queue, save, backlog, or batch it.
- Implementation is not authorized yet.

Use **Fire-Ready Build Prompt** only when:

- The user explicitly says `fire the queue`, `build the queue`, `execute this queue item now`, `direct hotfix now`, or `do not queue this`.
- The prompt can name queue item IDs or a bounded hotfix scope.

Use **Prompt QA** when:

- The user asks to review, lint, score, or improve an existing generated prompt.
- The prompt is already written in chat or saved to a file.
- You need to prove the prompt includes queue state, dirty workspace protection, file ownership, security, verification, and proof gates.

Use **Prompt Repair** when:

- Prompt QA fails and the user wants a corrected prompt.
- A raw or outside-AI prompt needs to become ChefFlow-safe before paste.
- You can preserve the raw request and add missing repo-grounded safeguards without implementation.

Use **Context Pack** when:

- A queue run is fired or about to be pasted into a build agent.
- The build agent needs one run-specific handoff with queue items, dirty workspace state, queue status, domain plan, fire plan, and proof expectations.

Use **Prompt Archive** when:

- A generated prompt should be saved as a reusable/auditable artifact.
- A fired run needs the exact prompt stored under `.agents/build-queue/runs/<RUN-ID>/prompt.md`.

Use **Prompt Debrief** when:

- A build report is complete and you want to find what the prompt failed to require.
- The report mentions assumptions, skipped verification, missing proof, blockers, partial work, or unclear scope.

Use **Prompt Manifest** when:

- A serious build should keep one chain of custody across raw idea, prompt, lint score, context pack, queue IDs, final report, and debrief.
- You need to restart or audit a build without reconstructing artifacts from chat.

Use **Collision Preflight** when:

- The build is fire-ready, parallelized, or likely to touch files also named by active queue items or dirty workspace changes.
- You need explicit "do not edit these files in parallel" guidance.

Use **Verification Recommender** when:

- A prompt names likely changed files but does not yet name focused tests, type checks, runtime checks, or manual proof.

Use **Security Appendix** when:

- The prompt touches `app/api`, `route.ts`, server actions, database queries, tenant data, admin surfaces, protected routes, auth, or PII.

## Required Pre-Prompt Checks

Run or inspect:

```powershell
git status --short
npm run codex:brief
node .agents/skills/build-queue/scripts/build-queue.mjs status
node .agents/skills/build-queue/scripts/build-queue.mjs domain-plan --status active
node .agents/skills/build-queue/scripts/build-queue.mjs workspace
```

If `npm run codex:brief` is unavailable, use:

```powershell
node scripts/codex-readiness.mjs
```

For prompt QA, run one of:

```powershell
npm run prompt:lint -- --file path/to/prompt.md
node scripts/prompt-lint.mjs --stdin --strict
npm run prompt:lint -- --file path/to/prompt.md --repair-template
```

For context packs, prompt archives, and debriefs, use:

```powershell
npm run prompt:context-pack -- --run RUN-ID --ids BQ-ID-1,BQ-ID-2
npm run prompt:archive -- --file path/to/prompt.md --run RUN-ID --slug short-slug
npm run prompt:debrief -- --report path/to/final-report.md --prompt path/to/prompt.md
npm run prompt:manifest -- --run RUN-ID --prompt path/to/prompt.md --queue-ids BQ-ID-1,BQ-ID-2
npm run prompt:preflight -- --prompt path/to/prompt.md --queue-files path/to/item1.md,path/to/item2.md
npm run prompt:verify -- --file path/to/prompt.md
npm run prompt:security -- --file path/to/prompt.md
```

## Template: Spec Questions Prompt

```text
COPY-PASTE PROMPT

You are the ChefFlow Prompt Builder. Do not implement code.

Raw idea:
[raw user idea]

Your task:
Turn this raw idea into a repo-grounded spec intake. Read the required context, inspect only relevant files, then ask the minimum product/spec questions needed before this can become a queue item or build prompt.

Canonical context to read first:
- AGENTS.md
- .claude/skills/omninet/SKILL.md, if present
- docs/.codex-workspace-brief.md
- .agents/skills/build-queue/references/QUEUE-FORMAT.md
- .agents/build-queue/context-freshness.md
- .agents/build-queue/run-lifecycle.md
- .agents/build-queue/role-domain-matrix.md
- .agents/build-queue/domain-orchestration.md
- .agents/build-queue/build-observability.md
- [relevant domain docs or files]

Before output:
- Run git status --short.
- Check active, in-flight, blocked, and done queue overlap.
- Inspect current code before relying on stale docs.
- Do not overwrite unrelated dirty work.

Output:
1. Preserved raw request.
2. What the idea seems to be asking for.
3. Existing systems/files/routes likely involved, with paths.
4. Queue overlap or duplicate risk.
5. Missing decisions.
6. Concise spec questions grouped by outcome, user flow, scope boundary, roles/privacy, acceptance criteria, and verification.
7. Recommendation: not ready, queue-ready after answers, or fire-ready after authorization.
```

## Template: Queue Item Draft Prompt

```text
COPY-PASTE PROMPT

You are the ChefFlow Queue Item Writer. Do not implement code.

Raw idea:
[raw user idea]

Your task:
Create a build-queue-ready item draft from this idea using current repo context. Preserve the raw request and shape it into the ChefFlow queue contract.

Canonical context to read first:
- AGENTS.md
- docs/.codex-workspace-brief.md
- .agents/skills/build-queue/references/QUEUE-FORMAT.md
- .agents/build-queue/role-domain-matrix.md
- .agents/build-queue/domain-orchestration.md
- .agents/build-queue/build-observability.md
- [relevant domain docs or files]

Before output:
- Run git status --short.
- Check active/in-flight/blocked queue items for duplicates or dependencies.
- Inspect likely current files before naming implementation prep.

Output a queue item draft with:
- Raw Request / Research Source
- Goal
- Build Goal
- Product Domain / Module
- Queue Reconciliation
- Scope
- Out Of Scope
- Acceptance Criteria
- Role / Privacy Matrix
- Implementation Prep
- Implementation Readiness score
- Risks
- Verification Steps
- Proof Required Before Done
- Open questions, only if blocking

Rules:
- Do not create the queue file unless explicitly asked.
- Do not invent files.
- Do not start implementation.
```

## Template: Fire-Ready Build Prompt

```text
COPY-PASTE PROMPT

You are the ChefFlow Build Orchestrator. Execute only after queue fire or explicit direct-hotfix authorization.

Raw request or queue item IDs:
[raw user idea or BQ IDs]

Your task:
Build the requested scope using ChefFlow firing rules. If queue items are not in-flight, stop and fire them with build-queue.mjs before coding.

Canonical context to read first:
- AGENTS.md
- docs/.codex-workspace-brief.md
- .agents/build-queue/run-lifecycle.md
- .agents/build-queue/context-freshness.md
- .agents/build-queue/role-domain-matrix.md
- .agents/build-queue/domain-orchestration.md
- .agents/build-queue/build-observability.md
- The fired queue item files
- The run fire-plan
- The run context-pack, create one if missing
- [relevant domain docs or files]

Before coding:
- Run git status --short.
- Preserve unrelated dirty work.
- Confirm run ID and in-flight item IDs.
- Define file ownership boundaries.
- Use isolated worktrees or fresh-context agents when lanes can run in parallel.
- Do not let agents edit the same files in the same wave.

Build requirements:
- Reuse existing architecture and domain modules.
- Do not create duplicate systems.
- Fully wire routes, navigation, server/client data flow, UI states, and workflows.
- Enforce permissions server-side.
- Protect routes, API endpoints, server actions, and database queries.
- Tenant data must be scoped by tenant_id or chef_id as appropriate.
- Admin routes/actions require requireAdmin().
- Avoid fake data, fake stats, no-op buttons, silent errors, and placeholder workflows.

Finish gate:
- Start or reload the owned dev server only when needed.
- Hard refresh affected routes.
- Check browser console, network, server logs, and runtime errors.
- Run focused tests and verification commands.
- Capture UI proof when user-facing surfaces changed.
- Create or update proof packs.
- Run build-queue.mjs finish-check.
- Move items to done only when acceptance criteria are proven.

Final report:
- Run ID.
- Queue items.
- Changed files grouped by domain.
- Role/access/security summary.
- Verification output.
- Runtime proof.
- Proof-pack status.
- Remaining risks or blockers.
```

## Template: Prompt QA Report

```text
COPY-PASTE PROMPT

You are the ChefFlow Prompt QA agent. Do not implement code.

Prompt under review:
[paste prompt or file path]

Your task:
Lint this prompt against ChefFlow build-agent requirements. Use the deterministic prompt linter when a file or stdin content is available, then provide a concise repair plan.

Required checks:
- Raw request preserved.
- Objective stated.
- Canonical context listed.
- Queue state and overlap check required.
- Dirty workspace protection required.
- File ownership boundaries required.
- Server-side auth, tenant scoping, route policy, and admin guard rules included.
- Verification steps included.
- Proof pack, runtime proof, and finish-check included for fired work.
- Implementation is blocked unless explicitly authorized.
- No invented files or stale-doc assumptions.
- Final report shape defined.

Output:
- PASS or FAIL with score.
- Missing or weak safeguards.
- The minimum edits needed to make the prompt safe to paste.
- A corrected COPY-PASTE PROMPT if repair is straightforward.
```

## Template: Prompt Repair Request

```text
COPY-PASTE PROMPT

You are the ChefFlow Prompt Repair agent. Do not implement code.

Prompt to repair:
[paste weak prompt or file path]

Your task:
Convert this into a repo-grounded ChefFlow prompt that is safe to paste into Codex. Preserve the raw request. Add only the missing safeguards needed for the intended mode: spec questions, queue draft, or fire-ready build.

Required workflow:
- Run the deterministic linter when the prompt is saved or can be piped:
  npm run prompt:lint -- --file <path> --repair-template
- If the prompt is only in chat, apply the same checklist manually.
- Preserve the user's actual request.
- Do not invent files.
- Do not authorize implementation unless explicit firing or direct-hotfix language exists.

Output:
- A corrected COPY-PASTE PROMPT only.
```

## Template: Context Pack Request

```text
COPY-PASTE PROMPT

You are the ChefFlow Context Pack agent. Do not implement code.

Run ID:
[RUN-ID]

Queue item IDs:
[BQ IDs]

Your task:
Generate or refresh the run context pack for these queue items so a build agent can start from current repo state.

Required command:
npm run prompt:context-pack -- --run [RUN-ID] --ids [comma-separated BQ IDs]

Output:
- Context pack path.
- Queue item IDs included.
- Any missing item IDs or unavailable queue state.
- Dirty workspace warning if present.
```

## Template: Prompt Archive Request

```text
COPY-PASTE PROMPT

You are the ChefFlow Prompt Archive agent. Do not implement code.

Prompt file:
[prompt.md]

Run ID:
[RUN-ID, if any]

Your task:
Archive the exact generated prompt for future audit and reuse.

Required command:
npm run prompt:archive -- --file [prompt.md] --run [RUN-ID] --slug [short-slug]

Output:
- Docs archive path.
- Run prompt path, if a run ID was provided.
```

## Template: Prompt Debrief Request

```text
COPY-PASTE PROMPT

You are the ChefFlow Prompt Debrief agent. Do not implement code.

Original prompt:
[prompt.md]

Final report:
[final-report.md]

Your task:
Debrief whether the original prompt produced enough implementation evidence, verification proof, runtime proof, security summary, and finish-gate discipline. Identify what should be added to future prompts.

Required command:
npm run prompt:debrief -- --report [final-report.md] --prompt [prompt.md]

Output:
- Debrief file path.
- Missing outcome signals.
- Prompt improvements for the next similar build.
```

## Prompt Quality Checklist

- The prompt names real files or says which files still need inspection.
- The prompt states current queue overlap.
- The prompt includes dirty-workspace handling.
- The prompt does not authorize implementation unless firing language exists.
- The prompt includes server-side security requirements when protected data is involved.
- The prompt includes proof pack and `finish-check` for fired work.
- The prompt is copy-paste-ready without surrounding explanation.
- Serious prompts should pass `npm run prompt:lint -- --file <path> --strict` before being pasted.
- Fire-ready prompts should have a run context pack and archived prompt.
- Finished serious builds should get a prompt debrief when the final report shows missing proof, assumptions, or partial work.
- Serious fired runs should have a prompt manifest that links the raw idea, generated prompt, lint score, context pack, queue IDs, final report, and debrief.
- Parallel or broad build prompts should run collision preflight before delegation.
- Prompts that touch protected data or server surfaces should include the security appendix.
