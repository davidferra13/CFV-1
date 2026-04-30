# Spec: Private Dev Cockpit Consolidation

> **Status:** built (pending browser verification)
> **Priority:** P0 (blocking)
> **Depends on:** none
> **Estimated complexity:** large (9+ files)

## Timeline

| Event         | Date             | Agent/Session | Commit |
| ------------- | ---------------- | ------------- | ------ |
| Created       | 2026-04-30 12:35 | Codex         |        |
| Status: ready | 2026-04-30 12:35 | Codex         |        |
| Built         | 2026-04-30 17:20 | Codex         |        |

---

## Developer Notes

### Raw Signal

David asked how he controls everything and sees everything without living inside Codex prompts all day. The current feeling is that the pieces already exist, but they are fragmented: conversations happen in one place, Sticky Notes live elsewhere, build queues exist in multiple forms, 3977 has its own dashboard, Mission Control is old, and Codex still asks to be told what to build.

The target is not another pile of tiny cards or another separate dashboard. The target is David's own private local development cockpit: one place to capture thoughts, one place for Codex to leave build work and escalation questions, and one always-on monitor where he can see the project improving. He wants to understand where conversations live, where builds are left, how he answers questions, and whether this is a private dev window on his machine.

The answer is: yes, it should be private local dev infrastructure. The mistake would be creating another disconnected surface. The work now is consolidation.

### Developer Intent

- **Core goal:** Consolidate ChefFlow's fragmented agent, intake, queue, receipt, escalation, and monitor surfaces into one private local development cockpit.
- **Key constraints:** Do not build a new public product surface. Do not create database tables. Do not mutate Sticky Notes. Do not start resident processes, schedulers, Cloudflare tunnels, or servers without explicit approval. Do not let raw notes or persona output directly become code. Do not obscure pricing readiness.
- **Motivation:** David is the bottleneck because he still has to prompt, dispatch, monitor, and answer scattered questions manually. The system needs a visible operating loop that lets Codex build from governed queues while David acts as Founder Authority.
- **Success from the developer's perspective:** David can leave Mission Control open on a dedicated monitor and see capture intake, active build, current branch, queue depth, receipts, validation state, pricing-readiness state, and Founder Authority questions without digging through files or asking Codex for status.

---

## Continuity Preflight

| Question                            | Answer                                                                                                                                                                                                                                |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Continuity decision                 | attach                                                                                                                                                                                                                                |
| Canonical owner                     | `autonomous-v1-builder`, with Sticky Notes and 3977 attached as intake sources and Mission Control attached as the read-only monitor.                                                                                                 |
| Existing related routes             | Local launcher assets: `scripts/launcher/server.mjs`, `scripts/launcher/index.html`; 3977 inbox server: `devtools/persona-inbox-server.mjs`.                                                                                          |
| Existing related modules/components | `docs/specs/autonomous-v1-builder-contract.md`, `docs/specs/sticky-notes-intake-layer.md`, `docs/specs/mission-control-passive-dashboard.md`, `docs/specs/universal-intake-pipeline.md`, `docs/specs/p0-builder-agent-foundation.md`. |
| Recent overlapping commits          | Recent work added the `autonomous-build-loop` skill and patched routing so human-bottleneck prompts route to the autonomous builder path.                                                                                             |
| Dirty or claimed overlapping files  | Current worktree already has unrelated active work in PWA files, Sticky Notes implementation files, and system reports. This spec owns only this new spec file and its context report.                                                |
| Duplicate or orphan risk            | High if this creates another dashboard. Mitigation: extend Mission Control and `system/v1-builder/*`, do not create a new cockpit app.                                                                                                |
| Why this is not a duplicate         | Existing specs own the fragments, but none defines the exact consolidation spine and private cockpit contract across capture, approval, build, receipt, escalation, and monitor.                                                      |
| What must not be rebuilt            | Do not replace 3977, Sticky Notes intake, Mission Control, the V1 builder contract, builder-agent foundation, skill-garden, or context-continuity. Wire them together.                                                                |

Continuity scan evidence: `system/agent-reports/context-continuity/20260430T163511Z-private-dev-cockpit-consolidate-3977-sticky-notes-v1-builder-queue-claims-receip.json`.

The scan matched `autonomous-v1-builder` as the canonical owner and marked the decision `attach`. It also identified `sticky-notes-intake-layer` and `agent-skill-system` as related surfaces, with duplicate risk from multiple canonical matches and dirty Sticky Notes files already in the tree.

---

## Current-State Summary

- `system/canonical-surfaces.json` already defines `autonomous-v1-builder` as the internal governed path from ideas to V1 governor classification, approved queue, Codex execution, validation receipts, and Mission Control monitoring. Evidence: `system/canonical-surfaces.json:64`, `system/canonical-surfaces.json:66`, `system/canonical-surfaces.json:80`.
- The same registry already defines `sticky-notes-intake-layer` as the local source adapter for Simple Sticky Notes records. Evidence: `system/canonical-surfaces.json:90`, `system/canonical-surfaces.json:92`, `system/canonical-surfaces.json:107`.
- The autonomous builder contract already defines `system/v1-builder/*` as the internal file-based queue, claim, receipt, override, blocked, research, and escalation state location. Evidence: `docs/specs/autonomous-v1-builder-contract.md:129`, `docs/specs/autonomous-v1-builder-contract.md:157`, `docs/specs/autonomous-v1-builder-contract.md:397`.
- The autonomous builder contract already requires Mission Control to show current claimed task, latest commit and push receipt, Founder Authority escalations, and pricing reliability state. Evidence: `docs/specs/autonomous-v1-builder-contract.md:304`, `docs/specs/autonomous-v1-builder-contract.md:307`, `docs/specs/autonomous-v1-builder-contract.md:317`, `docs/specs/autonomous-v1-builder-contract.md:318`, `docs/specs/autonomous-v1-builder-contract.md:319`.
- Mission Control already has a passive dashboard spec whose main view must be TV-friendly, no-scrolling, no scary action buttons, and readable from a dedicated monitor. Evidence: `docs/specs/mission-control-passive-dashboard.md:36`, `docs/specs/mission-control-passive-dashboard.md:38`, `docs/specs/mission-control-passive-dashboard.md:44`, `docs/specs/mission-control-passive-dashboard.md:79`, `docs/specs/mission-control-passive-dashboard.md:184`.
- `scripts/launcher/server.mjs` already exists as a local HTTP server and exposes live feed, blueprint progress, and activity summary style endpoints. Evidence: `scripts/launcher/server.mjs:14`, `scripts/launcher/server.mjs:7463`, `scripts/launcher/server.mjs:7520`, `scripts/launcher/server.mjs:8422`, `scripts/launcher/server.mjs:8768`.
- `scripts/launcher/index.html` already has launcher UI sections, activity log, blueprint view, live feed usage, and blueprint queue rendering hooks. Evidence: `scripts/launcher/index.html:2087`, `scripts/launcher/index.html:2103`, `scripts/launcher/index.html:3682`, `scripts/launcher/index.html:10339`, `scripts/launcher/index.html:11726`, `scripts/launcher/index.html:11754`.
- The universal intake spec already says 3977 is the single funnel for developer input, but it still says Codex only gets involved when David says "build," which conflicts with the newer autonomous-builder direction and must be reconciled through governed queue approval. Evidence: `docs/specs/universal-intake-pipeline.md:12`, `docs/specs/universal-intake-pipeline.md:65`, `docs/specs/universal-intake-pipeline.md:386`, `docs/specs/universal-intake-pipeline.md:387`.
- The Sticky Notes spec already defines read-only `Notes.db` ingestion, classification, attachment, and near-real-time sync, with explicit no-mutation rules. Evidence: `docs/specs/sticky-notes-intake-layer.md:27`, `docs/specs/sticky-notes-intake-layer.md:35`, `docs/specs/sticky-notes-intake-layer.md:36`, `docs/specs/sticky-notes-intake-layer.md:76`, `docs/specs/sticky-notes-intake-layer.md:133`, `docs/specs/sticky-notes-intake-layer.md:134`, `docs/specs/sticky-notes-intake-layer.md:179`, `docs/specs/sticky-notes-intake-layer.md:184`.
- Builder-agent foundation already identifies the missing internal runtime pieces: memory index, execution journal, loop guard, hygiene scanner, and CLI entrypoint. Evidence: `docs/specs/p0-builder-agent-foundation.md:57`, `docs/specs/p0-builder-agent-foundation.md:66`, `docs/specs/p0-builder-agent-foundation.md:68`, `docs/specs/p0-builder-agent-foundation.md:69`, `docs/specs/p0-builder-agent-foundation.md:72`.
- Pricing reliability is the V1 release blocker. ChefFlow must produce system-owned pricing and the required acknowledgement is: THE PRICING DATA SUCKS AND IT MUST BE FIXED. Evidence: `.claude/skills/pricing-reliability/SKILL.md:8`, `.claude/skills/pricing-reliability/SKILL.md:12`, `.claude/skills/pricing-reliability/SKILL.md:16`, `.claude/skills/pricing-reliability/SKILL.md:24`, `.claude/skills/pricing-reliability/SKILL.md:26`.

---

## What This Does (Plain English)

This builds the private development cockpit spine. It does not create another dashboard. It creates the missing file-based control layer under `system/v1-builder/`, exposes read-only launcher APIs for queue, claims, receipts, escalations, intake summary, and pricing-readiness summary, and updates Mission Control's Live view so David can see one coherent operating loop: capture -> classify -> approve -> claim -> build -> validate -> commit -> push -> receipt -> monitor.

## Why It Matters

Without this consolidation, every useful system stays true but disconnected. David still becomes the dispatcher. This spec gives Codex a governed lane to leave work, leave proof, and leave questions without forcing David to live in chat.

---

## Operating Model

The cockpit has three control surfaces:

1. **Capture surface:** Sticky Notes and 3977 receive raw thoughts, ideas, bugs, notes, critiques, personas, and directives.
2. **Control surface:** `system/v1-builder/*` stores approved queue records, claims, receipts, blocked items, research items, parked V2 items, overrides, and Founder Authority escalations.
3. **Visibility surface:** Mission Control reads those files and shows the current truth on a passive private monitor.

There is one spine:

```text
Sticky Notes / 3977 / specs / persona synthesis
  -> classification
  -> V1 governor
  -> system/v1-builder/approved-queue.jsonl
  -> claim
  -> build on feature branch
  -> validation
  -> commit and push
  -> receipt
  -> Mission Control
```

Raw input never writes code. Only approved V1 queue records can become build work.

---

## Files to Create

| File                                     | Purpose                                                                 |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| `system/v1-builder/README.md`            | Explains private cockpit state files, lifecycle, and operator rules.    |
| `system/v1-builder/approved-queue.jsonl` | Approved V1 build queue, append-only JSONL.                             |
| `system/v1-builder/blocked.jsonl`        | Blocked records with reason and unblock criteria.                       |
| `system/v1-builder/research-queue.jsonl` | Items that need evidence before build approval.                         |
| `system/v1-builder/parked-v2.jsonl`      | V2 ideas preserved outside the active build lane.                       |
| `system/v1-builder/escalations.jsonl`    | Founder Authority questions with recommended defaults.                  |
| `system/v1-builder/overrides.jsonl`      | Explicit developer overrides and risk notes.                            |
| `system/v1-builder/claims/.gitkeep`      | Keeps claim directory present.                                          |
| `system/v1-builder/receipts/.gitkeep`    | Keeps receipt directory present.                                        |
| `lib/v1-builder/types.ts`                | Shared Zod schemas and TypeScript types for queue, claims, receipts.    |
| `lib/v1-builder/store.ts`                | Safe JSONL read/write helpers with parse errors surfaced honestly.      |
| `lib/v1-builder/select-next.ts`          | Next-task selector and eligibility rules.                               |
| `lib/v1-builder/claims.ts`               | Claim writer, stale-claim detection, and active-claim reader.           |
| `lib/v1-builder/receipts.ts`             | Append-only receipt writer and receipt reader.                          |
| `lib/v1-builder/escalations.ts`          | Escalation writer and open-escalation reader.                           |
| `lib/v1-builder/cockpit-summary.ts`      | Builds one read-only summary object for Mission Control.                |
| `scripts/v1-builder/next.mjs`            | CLI to print the next eligible task and why others were skipped.        |
| `scripts/v1-builder/claim.mjs`           | CLI to claim the next task or a specific task.                          |
| `scripts/v1-builder/record-receipt.mjs`  | CLI to record validation, commit, push, and final status.               |
| `scripts/v1-builder/escalate.mjs`        | CLI to write a Founder Authority escalation.                            |
| `scripts/v1-builder/submit.mjs`          | CLI to submit governed queue records without hand-written JSON.         |
| `scripts/v1-builder/promote.mjs`         | CLI to append a promoted record while preserving the original record.   |
| `tests/unit/v1-builder-store.test.ts`    | Verifies parse errors, append-only behavior, and honest missing states. |
| `tests/unit/v1-builder-select.test.ts`   | Verifies V1 blocker selection, V2 rejection, and blocked-item handling. |
| `tests/unit/v1-builder-claims.test.ts`   | Verifies fresh and stale claim behavior.                                |
| `tests/unit/v1-builder-receipts.test.ts` | Verifies receipt schema and append-only writes.                         |
| `tests/unit/v1-builder-cockpit.test.ts`  | Verifies cockpit summary never hides errors as empty state.             |
| `tests/unit/v1-builder-submissions.test.ts` | Verifies submit and promote routing and approval gates.              |

## Files to Modify

| File                                              | What to Change                                                                                                                                                       |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`                                    | Add scripts: `v1-builder:next`, `v1-builder:claim`, `v1-builder:receipt`, `v1-builder:escalate`, `v1-builder:summary`, `test:v1-builder`.                            |
| `scripts/launcher/server.mjs`                     | Add read-only endpoints for `/api/v1-builder/summary`, `/api/v1-builder/queue`, `/api/v1-builder/claims`, `/api/v1-builder/receipts`, `/api/v1-builder/escalations`. |
| `scripts/launcher/index.html`                     | Add or replace a Mission Control Live zone that displays cockpit summary, active task, intake, queue, receipt, blockers, escalations, and pricing readiness.         |
| `docs/specs/autonomous-v1-builder-contract.md`    | Add this spec as the implementation slice that consolidates cockpit visibility and file-based runtime.                                                               |
| `docs/specs/mission-control-passive-dashboard.md` | Add the cockpit summary API as the source for active work, queue, receipts, and escalations.                                                                         |
| `docs/specs/universal-intake-pipeline.md`         | Clarify that 3977 stages candidates into governed queues, but only V1-approved records enter `system/v1-builder/approved-queue.jsonl`.                               |

## Database Changes

None.

This is private developer infrastructure. Do not create migrations. Do not add tenant tables. Do not write to the ChefFlow production database.

## Data Model

### Queue Record

```json
{
  "id": "v1-20260430-0001",
  "createdAt": "2026-04-30T12:35:00-04:00",
  "source": "spec|sticky-note|3977|persona-synthesis|developer|governor",
  "sourcePath": "docs/specs/example.md",
  "classification": "approved_v1_blocker",
  "activeLane": "pricing-reliability",
  "title": "Short title",
  "reason": "Why this belongs in V1.",
  "canonicalOwner": "docs/specs/example.md",
  "dependencies": [],
  "risk": "low",
  "status": "queued",
  "pricingRelevant": false,
  "overrideId": null
}
```

Allowed `classification` values:

- `approved_v1_blocker`
- `approved_v1_support`
- `parked_v2`
- `research_required`
- `duplicate_attach`
- `blocked`
- `rejected`

Only `approved_v1_blocker` and current-lane `approved_v1_support` are buildable.

### Claim Record

```json
{
  "taskId": "v1-20260430-0001",
  "claimedAt": "2026-04-30T12:35:00-04:00",
  "branch": "feature/v1-builder-short-title",
  "agent": "codex",
  "status": "claimed",
  "expiresAt": "2026-04-30T14:35:00-04:00"
}
```

### Receipt Record

```json
{
  "taskId": "v1-20260430-0001",
  "branch": "feature/v1-builder-short-title",
  "status": "validated",
  "startedAt": "2026-04-30T12:35:00-04:00",
  "finishedAt": "2026-04-30T13:20:00-04:00",
  "touchedFiles": [],
  "validations": [],
  "commit": "abc1234",
  "pushed": true,
  "blockedReason": null,
  "missionControlSummary": "One sentence."
}
```

### Escalation Record

```json
{
  "id": "esc-20260430-0001",
  "createdAt": "2026-04-30T12:35:00-04:00",
  "taskId": "v1-20260430-0001",
  "question": "Exact question for David.",
  "whyCodexCannotDecide": "Founder Authority, money risk, data risk, credentials, or hard stop.",
  "recommendedDefault": "Specific default if David approves.",
  "blocks": "build",
  "status": "open",
  "answer": null
}
```

### Cockpit Summary

`lib/v1-builder/cockpit-summary.ts` returns:

```ts
type CockpitSummary = {
  ok: boolean
  generatedAt: string
  activeTask: QueueRecord | null
  activeClaim: ClaimRecord | null
  queueCounts: {
    v1Blockers: number
    v1Support: number
    blocked: number
    research: number
    parkedV2: number
    escalations: number
  }
  latestReceipts: ReceiptRecord[]
  openEscalations: EscalationRecord[]
  pricingReadiness: {
    status: 'blocked' | 'unknown' | 'improving'
    message: string
    evidence: string[]
  }
  errors: string[]
}
```

If any file read or parse fails, `ok` is `false`, `errors` includes exact file paths, and Mission Control shows an error state. Never render missing files as an empty queue.

## Server Actions

None.

These are local launcher APIs and CLI scripts, not Next.js server actions. Do not add customer-facing routes.

## UI / Component Spec

### Page Layout

Modify the existing Mission Control Live view in `scripts/launcher/index.html`. Do not create a new standalone cockpit page.

The Live view must show fixed zones:

1. **Header:** current branch, dirty count, clock, health dots.
2. **V1 Builder:** active task, active branch, claim age, claim freshness.
3. **Queue:** V1 blockers, current-lane support, research, blocked, parked V2.
4. **Receipts:** latest commits, validation state, push state.
5. **Escalations:** open Founder Authority questions with recommended defaults.
6. **Intake:** latest Sticky Notes and 3977 candidate counts when available.
7. **Pricing:** pricing readiness banner with the exact blocked message when unresolved.

### States

- **Loading:** "Loading private dev cockpit..." with no fake counts.
- **Ready:** Show real queue, claim, receipt, escalation, and pricing data.
- **Empty queue:** Show "No approved V1 tasks" only when files exist and parse cleanly.
- **Error:** Show exact failed file and parser message.
- **Blocked:** Show the blocking reason and the next required Founder Authority action.

### Interactions

The main Live view is read-only. No build-start, claim, push, deploy, server-start, or scheduler buttons on the Live view.

An Actions tab may link to CLI commands as copyable text, but must not execute long-running processes from the browser in this spec.

## Edge Cases and Error Handling

| Scenario                                         | Correct Behavior                                                                                  |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `system/v1-builder/approved-queue.jsonl` missing | Create it during setup, then summary shows empty only after successful file creation.             |
| JSONL line malformed                             | Summary `ok: false`; show exact file and line number; do not treat as empty queue.                |
| Fresh claim exists                               | Selector refuses to pick another task and reports active claim.                                   |
| Stale claim exists                               | Selector refuses automatic reclaim and writes or reports a blocker requiring review.              |
| V2 item appears in queue                         | Selector rejects it and explains that only V1 blockers or current-lane support are buildable.     |
| Pricing readiness unknown                        | Show `unknown`, not green. Link to pricing reliability evidence.                                  |
| Mission Control cannot read summary              | Show connection or parse error; do not render all zeros.                                          |
| Sticky Notes outputs are absent                  | Intake zone says "Sticky Notes intake not connected yet"; not a failure for builder queue.        |
| 3977 is not running                              | Intake zone says "3977 offline or not configured"; do not start it automatically.                 |
| User answers escalation                          | Builder reads updated `escalations.jsonl` answer field or a later Sticky Notes intake attachment. |

## Verification Steps

1. Run `node --test --import tsx tests/unit/v1-builder-store.test.ts tests/unit/v1-builder-select.test.ts tests/unit/v1-builder-claims.test.ts tests/unit/v1-builder-receipts.test.ts tests/unit/v1-builder-cockpit.test.ts`.
2. Run `npm run typecheck:app`.
3. Run `node scripts/v1-builder/next.mjs` against fixture queue data and verify it selects a V1 blocker first.
4. Add a fixture V2 item and verify the selector rejects it.
5. Add a malformed JSONL fixture and verify the cockpit summary returns `ok: false` with file and line.
6. Run `node scripts/v1-builder/claim.mjs --task v1-fixture` and verify a claim file is written under `system/v1-builder/claims/`.
7. Run `node scripts/v1-builder/record-receipt.mjs --task v1-fixture --status validated --commit test --pushed false` and verify receipt appears under `system/v1-builder/receipts/`.
8. Run `node scripts/v1-builder/escalate.mjs --task v1-fixture --question "Fixture approval?" --recommended-default "Approve fixture"` and verify it appends to `escalations.jsonl`.
9. Run `node scripts/v1-builder/submit.mjs --title "Fixture research" --reason "Needs evidence"` and verify it writes to `research-queue.jsonl`.
10. Run `node scripts/v1-builder/promote.mjs --from v1-fixture --classification approved_v1_blocker --reason "Approved" --v1-governor-approved` against fixture data and verify it appends to `approved-queue.jsonl`.
11. Start or use the already approved launcher only if David has explicitly allowed it. If a launcher is already running, open Mission Control and verify the Live view displays active queue, claim, receipt, escalation, and pricing states.
12. Do a targeted em dash scan on all changed files.

## Out of Scope

- No public UI.
- No product database changes.
- No Cloudflare tunnel setup.
- No PM2 setup.
- No Windows Task Scheduler setup.
- No server start, server restart, deploy, or production action without explicit approval.
- No automatic raw-note-to-code path.
- No recipe generation.
- No pricing-engine fix in this spec. Pricing status is surfaced so the next pricing work stays visible.

## Notes for Builder Agent

- This is a consolidation spec. Do not invent a separate cockpit app.
- Attach to `system/v1-builder/*` and `scripts/launcher/*`.
- Keep all writes local and file-based.
- Preserve unrelated dirty work.
- If implementation discovers that Sticky Notes intake files are already being actively edited by another agent, do not touch them. Read only the output contract and keep this builder slice focused on V1 builder state plus Mission Control summary.
- The pricing banner must say the product is blocked or unknown until pricing evidence proves otherwise. Do not show green pricing readiness from hope or empty data.

---

## Spec Validation

1. **What exists today that this touches?** Existing canonical owners are `autonomous-v1-builder` and `sticky-notes-intake-layer` in `system/canonical-surfaces.json:64`, `system/canonical-surfaces.json:66`, `system/canonical-surfaces.json:90`, and `system/canonical-surfaces.json:92`. Existing launcher files are `scripts/launcher/server.mjs` and `scripts/launcher/index.html`, with live feed and blueprint endpoints at `scripts/launcher/server.mjs:7463` and `scripts/launcher/server.mjs:7520`. Existing 3977 intake is specified at `docs/specs/universal-intake-pipeline.md:12` and `docs/specs/universal-intake-pipeline.md:65`.
2. **What exactly changes?** Add `system/v1-builder/*`, `lib/v1-builder/*`, `scripts/v1-builder/*`, and unit tests. Modify `package.json`, `scripts/launcher/server.mjs`, `scripts/launcher/index.html`, and three existing specs to point at the cockpit summary and governed queue.
3. **What assumptions are you making?** Verified: Mission Control is the intended passive monitor (`docs/specs/mission-control-passive-dashboard.md:36`, `docs/specs/mission-control-passive-dashboard.md:44`). Verified: Sticky Notes must be read-only (`docs/specs/sticky-notes-intake-layer.md:179`, `docs/specs/sticky-notes-intake-layer.md:184`). Verified: the autonomous builder state is file-based (`docs/specs/autonomous-v1-builder-contract.md:157`). Unverified: exact current launcher visual layout after unrelated dirty PWA work, so the builder must inspect `scripts/launcher/index.html` before editing.
4. **Where will this most likely break?** JSONL parsing and missing-file behavior, stale claims blocking progress, and Mission Control accidentally showing fake empty states. The tests focus on those.
5. **What is underspecified?** Exact CSS layout details are intentionally left to existing Mission Control style. The data contract and zones are specified.
6. **What dependencies or prerequisites exist?** Node, TypeScript, existing launcher files, and existing specs. No database, server start, or scheduler is required.
7. **What existing logic could this conflict with?** 3977's current principle says Codex gets involved when David says "build" (`docs/specs/universal-intake-pipeline.md:12`). This spec resolves that by requiring V1 governor approval before any queue item becomes buildable.
8. **What existing work could this duplicate or fragment?** Mission Control and 3977. The continuity scan chose `attach`, and the spec modifies those surfaces instead of adding a new dashboard.
9. **What is the end-to-end data flow?** Sticky Notes, 3977, specs, or persona synthesis produce candidates; V1 governor classifies; eligible records append to `approved-queue.jsonl`; selector picks one; claim file is written; builder works on a branch; validations run; receipt is written; Mission Control reads cockpit summary.
10. **What is the correct implementation order?** Types and store helpers first, queue selector second, claims and receipts third, cockpit summary fourth, CLI scripts fifth, launcher read-only API sixth, Mission Control UI seventh, tests throughout.
11. **What are the exact success criteria?** A builder can run local CLI commands to select, claim, escalate, and receipt a fixture task; Mission Control can read a single summary; missing or malformed state shows errors; V2 tasks cannot run; pricing is never shown green without evidence.
12. **What are the non-negotiable constraints?** No main push, no deploy, no destructive DB operations, no `drizzle-kit push`, no server restart, no resident process setup, no raw-note-to-code path, no fake success states, no recipe generation.
13. **What should NOT be touched?** ChefFlow product DB, `types/database.ts`, public routes, customer-facing UI, Cloudflare config, PM2 config, Task Scheduler, unrelated PWA files, unrelated Sticky Notes implementation files unless this builder owns them.
14. **Is this the simplest complete version?** Yes. It builds one local file-based control spine and one Mission Control projection, not full remote automation.
15. **If implemented exactly as written, what would still be wrong?** Codex still will not run 24/7 automatically. This spec creates the control and visibility rails. A later approved host-integrity spec must handle resident scheduling, PM2, Task Scheduler, or tunnels.

## Final Check

This spec is production-ready for a local internal builder pass. The main uncertainty is the exact current launcher layout because the worktree has unrelated dirty files. That does not block the spec because the builder is instructed to attach to existing launcher sections and preserve unrelated work.
