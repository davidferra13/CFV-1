# Spec: V1 Control Plane

> **Status:** ready
> **Priority:** P0 (blocking)
> **Depends on:** `docs/specs/autonomous-v1-builder-contract.md`, `docs/specs/mission-control-passive-dashboard.md`
> **Estimated complexity:** large (9+ files)

## Timeline

| Event         | Date             | Agent/Session | Commit |
| ------------- | ---------------- | ------------- | ------ |
| Created       | 2026-04-30 18:58 | Codex         |        |
| Status: ready | 2026-04-30 18:58 | Codex         |        |

---

## Developer Notes

### Raw Signal

ChefFlow needs a locked V1 boundary. It does not need more ideas. It needs a defined finish line, build execution, completion, and deployment.

The finish line should not be a loose feature list. It should name the things ChefFlow cannot fail at: money truth, pricing trust, allergy safety, event state, client source of truth, quote integrity, prep execution, follow-up memory, tenant privacy, no fake UI, core recovery, AI boundaries, public booking trust, and release proof.

The developer asked whether there is anything else to discuss or research. The answer was no more idea research, only scope-risk decisions and proof research. The next artifact should be a V1 cannot-fail contract with pass/fail gates for each failure category.

The developer then asked how to make sure ChefFlow tracks progress and documents 24/7 without being asked, whether the blueprint should be part of this, what else belongs in the system, and whether this is a module. The answer is yes: this should be a real internal V1 Control Plane module, not a habit. It should connect `docs/product-blueprint.md`, `docs/v1-v2-governor.md`, cannot-fail contracts, the live builder queue, claims, receipts, and Mission Control.

### Developer Intent

- **Core goal:** Build a durable internal control plane that turns V1 scope, cannot-fail contracts, queue state, agent progress, validation receipts, and Mission Control into one accountable release system.
- **Key constraints:** Do not create a second ungoverned backlog. Do not replace the product blueprint, V1 governor, autonomous builder contract, or Mission Control. Do not rely on chat memory. Do not mark progress from prose. Do not require David to ask agents to document progress.
- **Motivation:** ChefFlow has enough surface area and enough agents that completion cannot depend on manual memory, vibes, chat summaries, or stale percentages.
- **Success from the developer's perspective:** David can open Mission Control at any time and see the real V1 finish line, what cannot fail, what passed, what failed, what is active, what is blocked, what was pushed, what is parked for V2, and the next single allowed action.

---

## Continuity Preflight

| Question                            | Answer                                                                                                                                                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Continuity decision                 | attach                                                                                                                                                                                                  |
| Canonical owner                     | `autonomous-v1-builder`, with storage under `system/v1-builder/` and display through Mission Control                                                                                                    |
| Existing related routes             | Mission Control launcher and internal dashboard surface defined by `docs/specs/mission-control-passive-dashboard.md`                                                                                    |
| Existing related modules/components | `docs/product-blueprint.md`, `docs/v1-v2-governor.md`, `docs/specs/autonomous-v1-builder-contract.md`, `system/v1-builder/*.jsonl`, `system/v1-builder/claims/`, `system/v1-builder/receipts/`          |
| Recent overlapping commits          | Current branch already contains active V1 builder runtime work and multiple V1 builder claim or receipt records                                                                                         |
| Dirty or claimed overlapping files  | Worktree contains unrelated dirty V1 builder files and other agent claim or receipt files. This spec must not modify those records.                                                                     |
| Duplicate or orphan risk            | Medium if implemented as a new queue namespace. Mitigation: reuse `system/v1-builder/` for operational records and add a `lib/v1-control-plane/` read model over those records.                         |
| Why this is not a duplicate         | The existing autonomous builder contract defines queue, claims, receipts, and task execution. This spec adds blueprint reconciliation, cannot-fail gates, release snapshots, and Mission Control truth. |
| What must not be rebuilt            | Do not replace the V1 governor, the product blueprint, the autonomous builder contract, the builder queue, or Mission Control. Extend them.                                                             |

Continuity scan: `system/agent-reports/context-continuity/20260430T225754Z-build-spec-for-v1-control-plane-module-connecting-product-blueprint-v1-v2-govern.json`.

---

## Current-State Summary

- `docs/product-blueprint.md` is already declared as the finish line and defines what V1 includes, what is done, what is left, and when it ships. Evidence: `docs/product-blueprint.md:1`, `docs/product-blueprint.md:3`.
- The product blueprint already records progress percentages, V1 pillars, V1 exit criteria, queued work, out-of-scope items, known issues, and revenue validation risk. Evidence: `docs/product-blueprint.md:28`, `docs/product-blueprint.md:44`, `docs/product-blueprint.md:189`, `docs/product-blueprint.md:236`, `docs/product-blueprint.md:253`, `docs/product-blueprint.md:269`, `docs/product-blueprint.md:299`.
- `docs/v1-v2-governor.md` already defines the V1 spine as `inquiry -> client -> engagement/event -> menu/offer -> quote -> agreement -> payment -> prep -> sourcing -> service -> follow-up -> client memory`. Evidence: `docs/v1-v2-governor.md:11`, `docs/v1-v2-governor.md:16`.
- The governor already defines mandatory classification for new work and requires Mission Control to show active lane, V1 spine completion, blockers, unverified work, parked V2 ideas, overrides, and the next single allowed action. Evidence: `docs/v1-v2-governor.md:65`, `docs/v1-v2-governor.md:71`, `docs/v1-v2-governor.md:124`, `docs/v1-v2-governor.md:130`.
- `docs/project-definition-and-scope.md` defines ChefFlow as a chef-first operating system with one primary authenticated operator workspace and supporting public, client, staff, partner, admin, and API surfaces. Evidence: `docs/project-definition-and-scope.md:21`, `docs/project-definition-and-scope.md:29`, `docs/project-definition-and-scope.md:35`, `docs/project-definition-and-scope.md:50`.
- `docs/definition-of-done.md` already says done requires real app completion, accurate labels and numbers, functional buttons, confirmed success states, honest failures, real execution, and automated drift protection. Evidence: `docs/definition-of-done.md:23`, `docs/definition-of-done.md:27`, `docs/definition-of-done.md:30`, `docs/definition-of-done.md:31`, `docs/definition-of-done.md:33`, `docs/definition-of-done.md:34`.
- `docs/specs/autonomous-v1-builder-contract.md` already defines request ledger records, active queue location, task eligibility, receipts, and Mission Control fields. Evidence: `docs/specs/autonomous-v1-builder-contract.md:141`, `docs/specs/autonomous-v1-builder-contract.md:201`, `docs/specs/autonomous-v1-builder-contract.md:246`, `docs/specs/autonomous-v1-builder-contract.md:328`, `docs/specs/autonomous-v1-builder-contract.md:358`.
- `docs/specs/mission-control-passive-dashboard.md` already captures the developer need for a passive status monitor, progress bar, active work, next up, and system status. Evidence: `docs/specs/mission-control-passive-dashboard.md:31`, `docs/specs/mission-control-passive-dashboard.md:42`, `docs/specs/mission-control-passive-dashboard.md:48`, `docs/specs/mission-control-passive-dashboard.md:132`.

---

## What This Does (Plain English)

V1 Control Plane is an internal release-governance module. It reads the product blueprint, V1 governor, builder queue, claims, receipts, blocked records, parked V2 records, and cannot-fail gate definitions. It produces one current V1 release snapshot that Mission Control can display and agents can validate against. The module makes progress tracking automatic because every task, blocker, receipt, gate, and blueprint claim has a machine-readable state.

## Why It Matters

ChefFlow cannot finish V1 if progress lives in chat, stale markdown percentages, or agent summaries. The control plane makes the blueprint the finish line, the builder ledger the execution proof, cannot-fail gates the release contract, and Mission Control the live truth surface.

---

## Product Contract

The control plane owns four questions:

1. What is the V1 finish line?
2. What can ChefFlow not fail at?
3. What is actively moving, blocked, parked, or verified?
4. What is the next single allowed action?

The control plane does not decide product strategy. It enforces the strategy already expressed in the blueprint and governor.

---

## Cannot-Fail Contracts

Create a machine-readable registry for V1 release-critical contracts.

Initial contract list:

| ID                     | Contract                             | V1 Failure Definition                                                                                                  | Required Gate                                                          |
| ---------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `money_truth`          | Money truth                          | Lost payment, duplicate ledger entry, fake balance, silent Stripe failure, or number shown from non-ledger state       | Money flow integrity audit passes for V1 payment scope                 |
| `pricing_trust`        | Pricing trust                        | Recognized ingredient prices blank, unsafe quote confidence, fake local claim, or modeled price displayed as observed  | Pricing reliability proof returns acceptable quote-safety distribution |
| `dietary_safety`       | Dietary and allergy safety           | Client, guest, household, inquiry, RSVP, or event dietary data fails to reach prep or service surfaces                 | Allergy safety walkthrough and readiness gate pass                     |
| `inquiry_continuity`   | Inquiry-to-event continuity          | Inquiry disappears, duplicates incorrectly, loses client/date/location/budget, or dead-ends before real work           | Golden path intake to event conversion passes                          |
| `event_state_truth`    | Event state truth                    | UI implies booked, paid, ready, completed, or cancelled without FSM proof                                              | Event state machine tests and UI walkthrough pass                      |
| `client_truth`         | Client source of truth               | Client identity, preferences, memory, spend, portal visibility, or relationship notes attach to wrong record or tenant | Client CRM and portal visibility proof passes                          |
| `quote_integrity`      | Quote and agreement integrity        | Budget is treated as revenue, quote acceptance fails to update event, or payment opens before agreement state          | Quote, agreement, payment gate proof passes                            |
| `prep_execution`       | Prep and service execution           | Confirmed job lacks menu, guest count, dietary warnings, prep list, sourcing needs, schedule, location, or checklist   | Event ops walkthrough passes                                           |
| `followup_memory`      | Follow-up and memory                 | Completed work fails to update feedback, review, client memory, financial history, or repeat context                   | Completion and after-action walkthrough passes                         |
| `tenant_privacy`       | Tenant privacy and Founder Authority | Protected data leaks across tenants or Founder Authority loses owner-level access                                      | Auth, tenant scoping, and founder access audit pass                    |
| `no_fake_ui`           | No hallucinated UI                   | Fake numbers, placeholder metrics, dead buttons, empty handlers, silent zeros, or success without confirmation         | Hallucination and compliance scans pass                                |
| `core_recovery`        | Core recovery                        | Returning chef cannot see changed state, blockers, next action, and where to resume                                    | Dashboard, queue, and return-to-work proof passes                      |
| `ai_boundaries`        | AI boundaries                        | AI creates recipes, invents facts, silently falls back, or uses a second provider                                      | AI policy and Ollama gateway audit pass                                |
| `public_booking_trust` | Public booking trust                 | Public booking black-holes requests, overpromises confirmation, or exposes internal implementation language            | Non-developer public booking test passes                               |
| `release_proof`        | Release proof                        | V1 marked done without receipts, validation, commit, push, UI proof, and real-chef operating evidence                  | Release snapshot shows all must-have gates green                       |

---

## Files to Create

| File                                               | Purpose                                                                                                                   |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `lib/v1-control-plane/types.ts`                    | Shared TypeScript types for blueprint state, cannot-fail contracts, gates, queue records, claims, receipts, and snapshots |
| `lib/v1-control-plane/jsonl.ts`                    | Safe JSONL reader for request ledger, queue, blocked, parked, escalation, claim, and receipt records                      |
| `lib/v1-control-plane/blueprint-parser.ts`         | Parser for `docs/product-blueprint.md` progress, pillars, exit criteria, queued work, known issues, and out-of-scope list |
| `lib/v1-control-plane/governor-parser.ts`          | Parser for `docs/v1-v2-governor.md` active lane, classifications, parked queues, and override phrase                      |
| `lib/v1-control-plane/cannot-fail.ts`              | Cannot-fail registry loader, validator, and status reducer                                                                |
| `lib/v1-control-plane/gates.ts`                    | Gate registry loader and gate result reducer                                                                              |
| `lib/v1-control-plane/snapshot.ts`                 | Builds the single V1 release snapshot consumed by scripts and Mission Control                                             |
| `system/v1-builder/cannot-fail-registry.json`      | Source-controlled initial cannot-fail contract registry                                                                   |
| `system/v1-builder/gate-registry.json`             | Source-controlled registry mapping each contract to command, proof requirement, owner, and last result                    |
| `system/v1-builder/gate-results.jsonl`             | Append-only gate run results                                                                                              |
| `system/v1-builder/snapshots/`                     | Generated release snapshots, ignored or committed according to builder policy decided during implementation               |
| `scripts/v1-control-plane/status.mjs`              | CLI that prints current V1 status from the snapshot                                                                       |
| `scripts/v1-control-plane/reconcile-blueprint.mjs` | CLI that compares blueprint claims to receipts and gate evidence                                                          |
| `scripts/v1-control-plane/verify-gates.mjs`        | CLI that runs safe read-only gates and writes gate results                                                                |
| `tests/unit/v1-control-plane-blueprint.test.ts`    | Unit tests for blueprint parsing                                                                                          |
| `tests/unit/v1-control-plane-snapshot.test.ts`     | Unit tests for snapshot reduction                                                                                         |
| `tests/unit/v1-control-plane-gates.test.ts`        | Unit tests for gate and cannot-fail registry validation                                                                   |

---

## Files to Modify

| File                                           | What to Change                                                                                                                                              |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/product-blueprint.md`                    | Add a short section naming V1 Control Plane as the reconciliation layer. Do not manually rewrite progress percentages unless receipts prove a gate changed. |
| `docs/v1-v2-governor.md`                       | Add V1 Control Plane as the owner for cannot-fail gates and release snapshot output.                                                                        |
| `docs/specs/autonomous-v1-builder-contract.md` | Cross-link this spec as the release progress layer above queue, claims, and receipts.                                                                       |
| `scripts/launcher/server.mjs`                  | Add read-only API endpoints for the release snapshot, cannot-fail status, queue status, claims, receipts, blocked work, and parked V2 ideas.                |
| `scripts/launcher/index.html`                  | Update Mission Control live tab to read the V1 Control Plane snapshot instead of scraping stale standalone sections.                                        |
| `package.json`                                 | Add non-destructive scripts for `v1:status`, `v1:reconcile`, and `v1:verify-gates` if this matches existing package script style.                           |

---

## Database Changes

None.

This is intentionally file-based. It must not create database tables, mutate production data, or require migrations for V1.

---

## Data Model

### Cannot-Fail Registry

`system/v1-builder/cannot-fail-registry.json`

```json
{
  "version": 1,
  "contracts": [
    {
      "id": "money_truth",
      "label": "Money truth",
      "v1FailureDefinition": "Lost payment, duplicate ledger entry, fake balance, silent Stripe failure, or number shown from non-ledger state.",
      "severity": "release_blocker",
      "gateIds": ["money_flow_integrity"],
      "canonicalDocs": ["docs/specs/system-integrity-question-set-money-flow.md"],
      "owner": "finance"
    }
  ]
}
```

Rules:

- IDs are stable.
- Labels are human-readable.
- Every contract has at least one gate.
- Every release-blocker contract must resolve to `pass`, `fail`, `blocked`, or `unknown`.
- `unknown` is not shippable.

### Gate Registry

`system/v1-builder/gate-registry.json`

```json
{
  "version": 1,
  "gates": [
    {
      "id": "pricing_reliability_proof",
      "contractIds": ["pricing_trust"],
      "label": "Pricing reliability proof",
      "command": "node scripts/audit-geographic-pricing-proof.mjs --dry-run",
      "mode": "read_only",
      "requiresApproval": false,
      "expectedProof": "Counts for safe_to_quote, verify_first, planning_only, not_usable, top blockers, and worst geographies.",
      "passRule": "No recognized ingredient blank path, modeled fallbacks labeled, quote safety counts present.",
      "lastResultPath": null
    }
  ]
}
```

Rules:

- Commands must be read-only unless explicitly marked blocked by required approval.
- Commands must not deploy, start servers, restart servers, mutate databases, or run destructive actions.
- Gates may be manual when real user validation is required.
- Manual gates must include required evidence and owner.

### Gate Results

`system/v1-builder/gate-results.jsonl`

Each row:

```json
{
  "id": "gate-run-20260430-0001",
  "gateId": "pricing_reliability_proof",
  "status": "pass",
  "startedAt": "2026-04-30T18:58:00-04:00",
  "finishedAt": "2026-04-30T18:59:00-04:00",
  "command": "node scripts/audit-geographic-pricing-proof.mjs --dry-run",
  "exitCode": 0,
  "proofSummary": "safe_to_quote=..., verify_first=..., planning_only=..., not_usable=...",
  "artifactPath": "system/v1-builder/gate-artifacts/20260430T225800Z-pricing-reliability-proof.json",
  "commit": null
}
```

### Release Snapshot

Generated shape:

```json
{
  "generatedAt": "2026-04-30T18:58:00-04:00",
  "blueprint": {
    "overallProgress": 71,
    "buildCompleteness": 95,
    "securityHardening": 82,
    "polishUx": 75,
    "validation": 10,
    "launchReadiness": 25,
    "mustHave": { "total": 7, "done": 5, "blocked": 2 },
    "shouldHave": { "total": 5, "done": 3, "blocked": 2 }
  },
  "governor": {
    "activeLane": "V1 event spine stabilization",
    "nextAllowedAction": "string"
  },
  "cannotFail": {
    "pass": 0,
    "fail": 0,
    "blocked": 0,
    "unknown": 15,
    "contracts": []
  },
  "builder": {
    "requestLedgerCounts": {},
    "approvedQueueCounts": {},
    "activeClaims": [],
    "staleClaims": [],
    "latestReceipts": [],
    "blocked": [],
    "parkedV2": [],
    "escalations": []
  },
  "releaseVerdict": {
    "status": "not_ready",
    "reasons": []
  }
}
```

---

## Server Actions

None.

This module is internal and file-based. Mission Control endpoints are Node launcher APIs, not app server actions.

If a future implementation exposes this inside the authenticated Next.js app, every route must be admin-only or Founder Authority-only.

---

## Mission Control API Spec

Add read-only endpoints to `scripts/launcher/server.mjs`:

| Endpoint                                | Purpose                                                                           |
| --------------------------------------- | --------------------------------------------------------------------------------- |
| `GET /api/v1-control-plane/snapshot`    | Returns the latest generated snapshot or builds one on read                       |
| `GET /api/v1-control-plane/cannot-fail` | Returns contract statuses with failing and blocked gates                          |
| `GET /api/v1-control-plane/queue`       | Returns approved queue, active lane, blocked items, and next allowed action       |
| `GET /api/v1-control-plane/claims`      | Returns active claims, stale claims, branch names, owned files, and heartbeat age |
| `GET /api/v1-control-plane/receipts`    | Returns latest receipts with validation, commit, and push status                  |
| `GET /api/v1-control-plane/escalations` | Returns open Founder Authority escalations                                        |

Endpoint rules:

- Read-only only.
- No queue mutation.
- No builder execution.
- No database writes.
- No server restarts.
- Errors return honest unavailable states, not empty success arrays.

---

## UI / Component Spec

### Mission Control Live Tab

Mission Control should show one release control view:

1. V1 finish line from the blueprint.
2. Cannot-fail contract grid with `pass`, `fail`, `blocked`, and `unknown`.
3. Active V1 lane from the governor.
4. Active claims with branch, owner, phase, heartbeat age, and stale warning.
5. Blocked work with unblock condition.
6. Built but unverified work.
7. Latest receipts with validation, commit, and push status.
8. Parked V2 ideas count and latest entries.
9. Open Founder Authority escalations.
10. Next single allowed action.

### States

- **Loading:** Show "Loading V1 Control Plane" and preserve last snapshot if available.
- **Empty:** Show "No control plane snapshot yet" with the command needed to generate one.
- **Error:** Show the parser or file error with the affected path. Do not show zeros as success.
- **Partial:** Show available sections and mark missing sources as unavailable.
- **Populated:** Show the full release snapshot with timestamps and source paths.

### Interactions

The first implementation is read-only. No action buttons can mutate queues, run builders, push branches, or change the blueprint.

---

## Blueprint Reconciliation Rules

The blueprint is the strategic finish line. The control plane must not treat it as live proof by itself.

Rules:

1. Blueprint percentages are displayed as blueprint claims.
2. Receipts and gate results are displayed as proof.
3. A blueprint checkbox can be marked forward only when a receipt or gate result supports it.
4. If blueprint progress says a section is complete but cannot-fail gates are `unknown`, Mission Control must show the mismatch.
5. If a receipt says work was built but no gate proves it, status is `built_unverified`.
6. If the blueprint and builder records conflict, the snapshot must say `conflict` and list both sources.

---

## 24/7 Tracking Contract

The control plane does not require Codex to run forever. It makes every invocation accountable.

When a scheduled runner, launcher, or manual Codex session runs, it must:

1. Record or update a request ledger entry for every non-trivial ask.
2. Claim approved V1 work before editing.
3. Update claim heartbeat while active.
4. Write a receipt before closeout.
5. Update gate results when verification runs.
6. Generate or refresh the release snapshot.
7. Leave Mission Control able to explain current state without reading chat.

No work can exist only in chat. No task can be called done without a receipt. No receipt counts without validation and commit or an explicit blocked reason.

---

## Edge Cases and Error Handling

| Scenario                                   | Correct Behavior                                                                          |
| ------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Blueprint file missing                     | Snapshot marks blueprint unavailable and keeps queue, claim, and receipt sections working |
| Blueprint parse fails                      | Snapshot reports parse error with line or section name                                    |
| Registry JSON invalid                      | Gate verification fails closed and marks release not ready                                |
| Claim file invalid                         | Claim section marks file invalid and excludes it from active work counts                  |
| Receipt missing commit                     | Receipt appears as incomplete and cannot advance blueprint proof                          |
| Receipt says pushed but no commit hash     | Receipt appears as invalid                                                                |
| Gate command missing                       | Gate status becomes blocked with missing command reason                                   |
| Gate requires approval                     | Gate status becomes blocked until approval evidence exists                                |
| Queue contains V2 item                     | Reconciler flags scope violation and excludes it from approved active work                |
| Another agent writes while snapshot builds | Reader tolerates append-only files and retries once on JSON parse failure                 |
| Dirty work pollutes validation             | Receipt records exact pollution and does not modify unrelated files                       |

---

## Verification Steps

1. Run `node scripts/v1-control-plane/status.mjs`.
2. Verify the output includes blueprint progress, active lane, cannot-fail summary, queue counts, active claims, latest receipts, blockers, parked V2, escalations, and next allowed action.
3. Run `node scripts/v1-control-plane/reconcile-blueprint.mjs`.
4. Verify stale or unsupported blueprint claims are reported as warnings, not silently accepted.
5. Run `node scripts/v1-control-plane/verify-gates.mjs --dry-run`.
6. Verify only read-only gates are selected and no destructive or long-running command is invoked.
7. Run unit tests:
   - `node --test --import tsx tests/unit/v1-control-plane-blueprint.test.ts`
   - `node --test --import tsx tests/unit/v1-control-plane-snapshot.test.ts`
   - `node --test --import tsx tests/unit/v1-control-plane-gates.test.ts`
8. If Mission Control files are changed, open the launcher and verify the V1 Control Plane view shows partial and error states honestly.
9. Run targeted compliance scan on changed files for em dashes, public forbidden names, and `@ts-nocheck`.
10. Commit and push only owned files.

---

## Out of Scope

- No database migrations.
- No production deploy.
- No server restart.
- No destructive database operations.
- No queue mutation from Mission Control.
- No automatic blueprint percentage edits without receipt-backed proof.
- No new product feature surface.
- No V2 work execution.
- No Hermes authority to approve or build tasks.
- No replacement of `system/v1-builder/`.

---

## Implementation Order

1. Add types and parsers.
2. Add cannot-fail registry and gate registry.
3. Add snapshot reducer.
4. Add status and reconciliation CLIs.
5. Add unit tests.
6. Add Mission Control read APIs.
7. Add Mission Control UI readout.
8. Add blueprint and governor cross-links.
9. Run validation and commit.

---

## Planner Validation

1. **What exists today that this touches?** Product blueprint finish line, V1 governor, builder queue, claims, receipts, and Mission Control all exist. Evidence: `docs/product-blueprint.md:3`, `docs/v1-v2-governor.md:124`, `docs/specs/autonomous-v1-builder-contract.md:201`, `docs/specs/mission-control-passive-dashboard.md:42`.
2. **What exactly changes?** Adds a read-only control plane module, registries, gate results, snapshot generation, CLIs, tests, and Mission Control read APIs.
3. **What assumptions are being made?** Assumption verified: file-based records are the intended phase 1 storage. Evidence: `docs/specs/autonomous-v1-builder-contract.md:201`, `docs/specs/autonomous-v1-builder-contract.md:218`.
4. **Where will this most likely break?** Markdown parsing, invalid JSONL from parallel agents, stale blueprint claims, and Mission Control treating missing data as empty success.
5. **What is underspecified?** Exact pass thresholds for pricing and money gates. This spec requires gate status support, but some gate pass rules must be finalized when each audit command is implemented.
6. **Dependencies or prerequisites?** Existing V1 builder contract and Mission Control launcher. Evidence: `docs/specs/autonomous-v1-builder-contract.md:328`, `docs/specs/mission-control-passive-dashboard.md:188`.
7. **Existing logic conflict risk?** Risk is duplicate queue namespace. This spec mitigates by using `system/v1-builder/`.
8. **Duplicate or fragmentation risk?** Context continuity returned `attach` to `autonomous-v1-builder`, so this spec extends that owner.
9. **End-to-end data flow.** Blueprint, governor, queue, claim, receipt, gate registry, and gate result files feed `buildSnapshot()`, scripts print it, Mission Control APIs return it, launcher renders it.
10. **Correct implementation order.** Parsers first, registries second, snapshot third, CLI fourth, tests fifth, Mission Control last.
11. **Success criteria.** A local command returns one release snapshot with cannot-fail status, queue status, claims, receipts, blockers, V2 parking, escalations, blueprint conflicts, and next action.
12. **Non-negotiable constraints.** Read-only first, no DB migration, no deployment, no server restart, no destructive operations, no V2 execution, no fake success.
13. **What should not be touched?** Do not edit unrelated dirty claim, receipt, sync, service-worker, simulation, identity, or log files.
14. **Is this the simplest complete version?** Yes. File-based read model first. No database or mutation UI.
15. **If implemented exactly as written, what would still be wrong?** It will show truth, but it will not by itself run agents 24/7. A scheduled runner or launcher loop remains a separate implementation decision.

## Final Check

This spec is production-ready for builder execution as an internal read-only release-control module. The remaining uncertainty is gate threshold detail for individual cannot-fail contracts, and this spec handles that by making unknown gates unshippable until each gate has proof.
