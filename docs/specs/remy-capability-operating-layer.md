# Spec: Remy Capability Operating Layer

> **Status:** ready
> **Priority:** P1 (next up)
> **Depends on:** `docs/specs/remy-runtime-unification-and-quality-recovery.md`
> **Estimated complexity:** large (9+ files)

## Timeline

| Event                 | Date                | Agent/Session         | Commit |
| --------------------- | ------------------- | --------------------- | ------ |
| Created               | 2026-04-30 17:43 ET | Codex planner session |        |
| Status: ready         | 2026-04-30 17:43 ET | Codex planner session |        |
| Claimed (in-progress) |                     |                       |        |
| Spike completed       |                     |                       |        |
| Pre-flight passed     |                     |                       |        |
| Build completed       |                     |                       |        |
| Type check passed     |                     |                       |        |
| Build check passed    |                     |                       |        |
| Playwright verified   |                     |                       |        |
| Status: verified      |                     |                       |        |

---

## Developer Notes

### Raw Signal

The developer asked for an explanation of the skills, CLI, hooks, and always-on operating layer that Codex uses by default, then asked how those same ideas could be applied to Remy, then asked for a perfect spec that improves Remy.

The important product signal is not "give Remy more tools." The developer wants Remy to inherit the controlled operating discipline that makes Codex useful: routing, capability choice, hard gates, approval rules, audit trails, replay tests, closeout checks, and self-improving feedback loops. Remy should feel like a governed business operator inside ChefFlow, not a loose chatbot that happens to call tools.

### Developer Intent

- **Core goal:** Make Remy operate through one typed capability contract with routing, permission checks, evidence, approval, audit, replay, and quality gates.
- **Key constraints:** Do not create a second assistant framework. Do not give Remy autonomous write authority. Do not add another model provider. Do not generate recipes. Do not bypass tenant scoping, privacy settings, approval policies, or action audit logging.
- **Motivation:** Remy already has many strong parts, but the parts are spread across task descriptions, registries, action definitions, permission manifests, UI cards, quality harnesses, and settings. The system needs one contract so every new capability is safe by construction.
- **Success from the developer's perspective:** A builder can add or modify a Remy capability and the repo automatically proves what it reads, what it writes, whether it needs approval, what it can say, what it must never do, and whether regression prompts still pass.

---

## V1 Governor

```text
CLASSIFICATION: V1 support
REASON: Remy is part of the independent chef operating loop because it helps the chef query clients, events, pricing, safety, documents, and next actions, but this spec is a safety and cohesion improvement rather than a blocker for one paid job.
CAN BUILD NOW: yes
CANONICAL OWNER: remy-ai
NEXT ACTION: build after remy runtime unification and quality recovery, or build only the audit-only foundation first
OVERRIDE NEEDED: no
```

---

## Continuity Preflight

| Question                            | Answer                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Continuity decision                 | attach                                                                                                                                                                                                                                                                                                                                               |
| Canonical owner                     | `remy-ai`, specifically `components/ai/remy-drawer.tsx`, `lib/ai/remy-actions.ts`, `lib/ai/command-orchestrator.ts`, `lib/ai/tool-permission-manifest.ts`, `lib/ai/agent-registry.ts`, `lib/ai/remy-read-task-registry.ts`, and `tests/remy-quality`.                                                                                                |
| Existing related routes             | `/remy`, `/commands`, `/settings/remy`, `/settings/ai-privacy`, Remy drawer, Remy stream API, Remy client API.                                                                                                                                                                                                                                       |
| Existing related modules/components | `lib/ai/remy-actions.ts`, `lib/ai/command-orchestrator.ts`, `lib/ai/command-intent-parser.ts`, `lib/ai/command-task-descriptions.ts`, `lib/ai/agent-registry.ts`, `lib/ai/agent-actions/*`, `lib/ai/tool-permission-manifest.ts`, `lib/ai/remy-read-task-registry.ts`, `lib/ai/remy-approval-policy-core.ts`, `lib/ai/remy-action-audit-actions.ts`. |
| Recent overlapping commits          | Recent commits include Remy routing and V1 builder work, but no current commit creates a canonical Remy capability operating layer.                                                                                                                                                                                                                  |
| Dirty or claimed overlapping files  | The continuity scan reported `docs/specs/founder-confidence-gate.md` as a dirty spec and several active claims, but no active claim owns the Remy AI canonical files listed above.                                                                                                                                                                   |
| Duplicate or orphan risk            | Medium. Existing Remy specs include runtime unification and model routing. This spec avoids duplication by focusing on the capability contract and gate, not visual Remy redesign or runtime unification.                                                                                                                                            |
| Why this is not a duplicate         | `docs/specs/remy-runtime-unification-and-quality-recovery.md` makes the runtime coherent. This spec makes each capability governed, audited, and replay-tested. `docs/specs/chefflow-command-plane.md` gives Remy read access to one app-wide operating state, but does not govern all Remy capabilities.                                            |
| What must not be rebuilt            | Do not rebuild Remy drawer UI, create a second command orchestrator, replace `parseWithOllama`, rewrite the runtime provider layer, redesign `/settings/remy`, or create a new assistant route.                                                                                                                                                      |

Continuity scan evidence: `system/agent-reports/context-continuity/20260430T214214Z-build-a-perfect-spec-that-improves-remy-by-applying-codex-skills-cli-hooks-routi.json`.

---

## Current State Summary

Remy already has the core pieces of a governed assistant, but they are not expressed as one capability contract:

- The main command orchestrator imports `parseCommandIntent`, the agent action registry, Focus Mode filtering, action audit logging, approval policy resolution, and read-task execution at `lib/ai/command-orchestrator.ts:10`, `lib/ai/command-orchestrator.ts:12`, `lib/ai/command-orchestrator.ts:79`, `lib/ai/command-orchestrator.ts:80`, `lib/ai/command-orchestrator.ts:82`, and `lib/ai/command-orchestrator.ts:87`.
- `runCommand()` is the server action entry point and is gated by `requireChef()` plus runtime assertion at `lib/ai/command-orchestrator.ts:1873`, `lib/ai/command-orchestrator.ts:1876`, and `lib/ai/command-orchestrator.ts:1868`.
- Deterministic command routing exists before LLM parsing at `lib/ai/command-orchestrator.ts:1225`; fallback LLM intent parsing happens at `lib/ai/command-orchestrator.ts:1954`.
- Focus Mode filters allowed task types before execution at `lib/ai/command-orchestrator.ts:1922` and `lib/ai/command-orchestrator.ts:1989`.
- Agent write actions already route through a registry and approval policy at `lib/ai/command-orchestrator.ts:1076`, `lib/ai/command-orchestrator.ts:1081`, and `lib/ai/agent-registry.ts:15`.
- Read tasks already have a registry at `lib/ai/remy-read-task-registry.ts:146`, with tenant-scoped DB reads in multiple executors at `lib/ai/remy-read-task-registry.ts:304`, `lib/ai/remy-read-task-registry.ts:308`, `lib/ai/remy-read-task-registry.ts:319`, `lib/ai/remy-read-task-registry.ts:365`, and `lib/ai/remy-read-task-registry.ts:424`.
- The permission manifest already declares read domains, write domains, private-model requirements, approval requirements, and privacy controls at `lib/ai/tool-permission-manifest.ts:20`, `lib/ai/tool-permission-manifest.ts:24`, `lib/ai/tool-permission-manifest.ts:25`, and `lib/ai/tool-permission-manifest.ts:30`.
- Recipe write actions are intentionally empty at `lib/ai/agent-actions/recipe-actions.ts:11`, and read-only recipe search is the only recipe permission path in the permission manifest at `lib/ai/tool-permission-manifest.ts:54` and `lib/ai/tool-permission-manifest.ts:92`.
- Approval policy blocks restricted actions at `lib/ai/remy-approval-policy-core.ts:33`, `lib/ai/remy-approval-policy-core.ts:46`, and `lib/ai/remy-approval-policy-core.ts:49`.
- Approved actions create an audit row before execution at `lib/ai/command-orchestrator.ts:2080`; audit finalization happens at `lib/ai/command-orchestrator.ts:2259`. The audit action file inserts and updates `remy_action_audit_log` at `lib/ai/remy-action-audit-actions.ts:89`, `lib/ai/remy-action-audit-actions.ts:105`, and scopes reads by tenant at `lib/ai/remy-action-audit-actions.ts:138` and `lib/ai/remy-action-audit-actions.ts:180`.
- Guardrails validate Remy input, prompt injection, memory content, and rate limits at `lib/ai/remy-guardrails.ts:32`, `lib/ai/remy-guardrails.ts:78`, `lib/ai/remy-guardrails.ts:143`, and `lib/ai/remy-guardrails.ts:229`.
- The shared Ollama parser has no fallback provider, throws `OllamaOfflineError` on missing or invalid runtime, and performs one schema repair pass at `lib/ai/parse-ollama.ts:3`, `lib/ai/parse-ollama.ts:160`, `lib/ai/parse-ollama.ts:167`, `lib/ai/parse-ollama.ts:462`, and `lib/ai/parse-ollama.ts:481`.
- `/settings/remy` already loads approval policies, audit rows, audit summary, and AI preferences at `app/(chef)/settings/remy/page.tsx:5`, `app/(chef)/settings/remy/page.tsx:10`, `app/(chef)/settings/remy/page.tsx:22`, `app/(chef)/settings/remy/page.tsx:24`, and `app/(chef)/settings/remy/page.tsx:35`.
- Remy quality harnesses already exist and cover chef, client, hallucination, voice, adversarial, data accuracy, tier enforcement, gap closure, and boundary suites through package scripts at `package.json:266` through `package.json:294`. The main harness sends real prompts through auth, guardrails, Ollama, and SSE at `tests/remy-quality/harness/remy-quality-runner.mjs:6`.
- App audit documents Remy routes, drawer views, action log, templates, universal intake, and settings at `docs/app-complete-audit.md:1571`, `docs/app-complete-audit.md:1578`, `docs/app-complete-audit.md:1584`, `docs/app-complete-audit.md:1593`, `docs/app-complete-audit.md:1607`, and `docs/app-complete-audit.md:1691`.

The gap is not missing infrastructure. The gap is that adding a Remy task still requires a builder to coordinate multiple surfaces manually. This spec turns that coordination into one explicit contract plus tests.

---

## What This Does (Plain English)

This adds a Remy capability operating layer. Every Remy task becomes a typed capability with one source of truth for routing words, read and write domains, approval tier, safety level, executor, evidence requirements, privacy controls, blocked behavior, and replay tests. Remy still talks through the existing drawer and stream route, but each action is gated the way Codex tasks are gated: route first, prove permission, execute only through the approved path, audit everything, and fail honestly.

---

## Why It Matters

Remy is already powerful enough to affect client trust, money, safety, scheduling, and communications. A unified capability layer prevents the next feature from accidentally bypassing recipe restrictions, approval policy, tenant scoping, privacy settings, or quality replay.

---

## Files to Create

| File                                              | Purpose                                                                                                                                                                |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/ai/remy-capabilities/types.ts`               | Pure type contract for `RemyCapability`, evidence requirements, lifecycle hooks, safety gates, replay prompts, and closeout checks.                                    |
| `lib/ai/remy-capabilities/registry.ts`            | Canonical registry builder that composes existing read tasks, agent write actions, permissions, and task descriptions without duplicating executors.                   |
| `lib/ai/remy-capabilities/gate.ts`                | Pure pre-tool and pre-commit gate logic: permission lookup, approval policy resolution, privacy controls, recipe ban, restricted action handling, and evidence checks. |
| `lib/ai/remy-capabilities/evidence.ts`            | Helpers for producing source-backed evidence metadata for Remy task results.                                                                                           |
| `lib/ai/remy-capabilities/closeout.ts`            | Pure closeout validator for a capability definition and an executed task result.                                                                                       |
| `scripts/remy-capability-audit.mjs`               | CLI audit that verifies every known Remy task has one capability contract, permission entry, safety tier, approval behavior, and replay coverage.                      |
| `tests/unit/remy-capability-registry.test.ts`     | Unit tests for registry coverage, duplicate task detection, recipe ban, and write-action approval defaults.                                                            |
| `tests/unit/remy-capability-gate.test.ts`         | Unit tests for blocked, approval-required, read-only, privacy-disabled, and missing-evidence cases.                                                                    |
| `tests/remy-quality/prompts/capability-gate.json` | Replay prompt suite for routing, approval, restricted actions, recipe restrictions, and no-fake-success behavior.                                                      |

---

## Files to Modify

| File                                                 | What to Change                                                                                                                                                                                                                                                              |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/ai/command-orchestrator.ts`                     | Replace scattered permission and safety checks with calls into `remy-capabilities/gate.ts`. Keep `runCommand()` and `approveTask()` as the public server action entry points. Do not change task execution semantics except to block previously ungoverned capability gaps. |
| `lib/ai/tool-permission-manifest.ts`                 | Keep as the domain permission source, but export normalized manifest data for the capability registry. Add tests for inferred permissions if coverage is missing.                                                                                                           |
| `lib/ai/agent-registry.ts`                           | Add a read-only export that returns registered action metadata in a form the capability registry can compose. Do not move executor or commit implementations.                                                                                                               |
| `lib/ai/agent-actions/index.ts`                      | Ensure action registration is idempotent and available before the capability registry builds.                                                                                                                                                                               |
| `lib/ai/remy-read-task-registry.ts`                  | Export read task names and metadata without exposing executor internals. Add missing evidence labels for tasks that read finance, pricing, clients, events, menus, recipes, vendors, staff, or documents.                                                                   |
| `lib/ai/command-task-descriptions.ts`                | Attach routing descriptions to capability ids, or add a helper that lets the registry validate task descriptions.                                                                                                                                                           |
| `lib/ai/command-intent-parser.ts`                    | Consume the capability registry's task list instead of separately assembling task text where feasible. Keep schema and parsing behavior stable.                                                                                                                             |
| `lib/ai/remy-types.ts`                               | Add optional evidence and capability metadata to task result types. Keep existing UI fields backward compatible.                                                                                                                                                            |
| `components/ai/remy-task-card.tsx`                   | Display evidence, approval reason, restricted reason, and missing-data state when present. Do not add non-functional buttons.                                                                                                                                               |
| `components/ai/command-result-card.tsx`              | Render capability evidence and honest partial-data warnings for command results.                                                                                                                                                                                            |
| `app/(chef)/settings/remy/page.tsx`                  | Add a read-only capability coverage summary to the existing Remy Control Center. If any server action fails, show an unavailable state rather than empty coverage.                                                                                                          |
| `app/(chef)/settings/remy/remy-control-client.tsx`   | Add a compact capability matrix using existing `Button` variants only. Keep emergency block and approval policy interactions intact.                                                                                                                                        |
| `package.json`                                       | Add `remy:capabilities:audit` and include it in Remy quality or release checks if the command is fast and deterministic.                                                                                                                                                    |
| `tests/remy-quality/harness/remy-quality-runner.mjs` | Add optional loading of the new capability-gate prompt suite, or wire it as a separate suite without disrupting existing suites.                                                                                                                                            |
| `docs/app-complete-audit.md`                         | Update Remy and settings sections after implementation.                                                                                                                                                                                                                     |

---

## Database Changes

None.

Do not create a migration for this first version. Reuse `remy_action_audit_log` and `remy_approval_policies` as they exist today. If a later builder finds evidence that capability definitions must be stored, that requires a separate additive migration spec with full SQL shown before writing.

---

## Data Model

The capability layer is a computed registry, not stored data.

```ts
export type RemyCapabilityKind = 'read' | 'draft' | 'write' | 'navigation' | 'restricted'

export type RemyEvidenceRequirement =
  | 'none'
  | 'source_label'
  | 'record_reference'
  | 'freshness'
  | 'partial_data_disclosure'

export interface RemyCapability {
  id: string
  taskType: string
  name: string
  kind: RemyCapabilityKind
  reads: AiAccessDomain[]
  writes: AiAccessDomain[]
  requiresPrivateModel: boolean
  requiresApproval: boolean
  safety: AgentSafetyLevel
  controlledBy: AiPrivacyControl[]
  routingExamples: string[]
  evidence: RemyEvidenceRequirement[]
  executorSource: 'read_task_registry' | 'agent_action_registry' | 'legacy_core_task'
  status: 'active' | 'restricted' | 'legacy_uncovered'
}
```

Rules:

- `writes.length > 0` means `requiresApproval` must be true.
- `safety === 'restricted'` means the gate always blocks execution.
- `taskType` beginning with `agent.` must resolve to a registered agent action or be blocked.
- Recipe capability ids may only include read-only `recipe.search` style behavior. Recipe generation, update, ingredient add, drafting, or auto-fill must be represented as restricted capabilities.
- Every finance, pricing, client, event, document, staff, vendor, menu, and recipe read result must carry evidence metadata or an honest missing-evidence warning.
- Every task result with partial source failures must expose that limitation to Remy's response formatter.

---

## Server Actions

No new user-facing server action is required for the first version. Existing server actions remain the entry points.

| Action                                               | Auth            | Input                                            | Output                                                        | Side Effects                                                         |
| ---------------------------------------------------- | --------------- | ------------------------------------------------ | ------------------------------------------------------------- | -------------------------------------------------------------------- |
| `runCommand(rawInput)`                               | `requireChef()` | `string`                                         | `CommandRun` with capability-gated task results               | Read-only tasks execute. Write tasks return pending previews.        |
| `approveTask(taskType, data, approvalConfirmation?)` | `requireChef()` | task type, payload, optional confirmation phrase | `{ success: boolean, message: string, redirectUrl?: string }` | Creates and finalizes action audit. Executes approved write actions. |
| `listRemyApprovalPolicyTargets()`                    | `requireChef()` | none                                             | Existing approval targets, enhanced with capability coverage  | None. Read-only.                                                     |
| `listRemyActionAuditLog({ limit })`                  | `requireChef()` | `{ limit?: number }`                             | Existing audit rows                                           | None. Read-only.                                                     |

Implementation requirement: any helper in `lib/ai/remy-capabilities/*` must be non-`'use server'` unless it is intentionally a server action. The first version should be pure modules consumed by existing server actions.

---

## UI / Component Spec

### Page Layout

Remy Control Center at `/settings/remy` gets a new "Capability Coverage" section below the runtime controls and above the policy table.

The section shows:

- Total active capabilities.
- Count of read-only, draft, write, navigation, and restricted capabilities.
- Coverage status: all governed, partial, or unavailable.
- A compact table with capability name, task type, reads, writes, approval, safety, evidence, and status.
- A warning row when a task exists in the parser, read registry, or agent registry but lacks a capability contract.

The Remy drawer and task cards keep their current structure. The only UI additions are:

- Evidence chips on task results.
- Approval reason text when a policy requires approval or blocks an action.
- Partial data warning when a capability result lacks complete source coverage.

### States

- **Loading:** Existing page loading state. Do not add skeletons that imply known counts.
- **Empty:** "No capabilities registered" only if the registry returns an explicit empty result. This should be rare and treated as degraded.
- **Error:** Show "Capability coverage unavailable" with the error boundary or a server-rendered warning. Do not show zero capabilities.
- **Populated:** Show real counts from the computed registry.
- **Partial:** Show known capabilities and list uncovered task sources separately.

### Interactions

- Policy edits continue using existing Remy approval policy controls.
- Capability rows are read-only in V1.
- No new enable or disable buttons should be added unless wired to existing approval policy actions.
- Any optimistic policy change must keep the existing try/catch and toast failure pattern in `remy-control-client.tsx`.

---

## Edge Cases and Error Handling

| Scenario                                        | Correct Behavior                                                                                                           |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Capability registry fails to build              | `runCommand()` returns a held/error task for affected requests; `/settings/remy` shows unavailable state, not zero counts. |
| Parser emits unknown `agent.*` task             | Gate blocks before execution and returns a supported error.                                                                |
| Read task has no evidence metadata              | Task can still run only if read-only, but result must warn that evidence is incomplete.                                    |
| Write task lacks approval requirement           | Audit CLI and unit test fail. Runtime gate forces approval.                                                                |
| Restricted recipe write requested               | Capability gate blocks with restricted reason. No preview, no commit.                                                      |
| Approval audit row cannot be created            | Existing behavior remains: execution is blocked.                                                                           |
| Audit finalization fails after successful write | Existing behavior remains: action result is not rolled back, warning is logged.                                            |
| Privacy control disables document drafts        | Gate holds draft task with existing privacy-disabled messaging.                                                            |
| Ollama runtime offline                          | Structured parsing paths throw `OllamaOfflineError`; UI shows unavailable message. No fallback provider.                   |
| Partial data source failure                     | Remy must say what was not checked. Never summarize partial data as complete.                                              |

---

## Verification Steps

1. Run `node scripts/remy-capability-audit.mjs`.
2. Run `node --test --import tsx tests/unit/remy-capability-registry.test.ts tests/unit/remy-capability-gate.test.ts`.
3. Run `npm run test:remy-quality:tier`.
4. Run `npm run test:remy-quality:hallucination`.
5. Run the new capability gate replay suite.
6. Run `npm run qa:remy:delivery` if the runtime-unification dependency has repaired that harness.
7. Run `npm run typecheck`.
8. Sign in with the agent account.
9. Navigate to `/settings/remy`.
10. Verify capability coverage renders real counts or an honest unavailable state.
11. Ask Remy for a read-only task, such as upcoming events. Verify it executes and includes evidence or source wording.
12. Ask Remy for a write task, such as creating a client. Verify it returns an approval preview and does not commit before approval.
13. Ask Remy to create or alter a recipe. Verify it is blocked.
14. Ask Remy to delete a client or bypass approval. Verify it is blocked or held.
15. Approve a reversible test action only if using safe seeded data. Verify audit row appears in Remy Control Center.
16. Screenshot `/settings/remy` and one Remy task card showing evidence or approval state.

Do not run `next build`, `npm run dev`, or restart servers unless explicitly approved.

---

## Out of Scope

- No new model provider.
- No autonomous background Remy action execution.
- No recipe generation, recipe update, or ingredient auto-fill.
- No migration.
- No direct sends of emails, SMS, invoices, or client messages.
- No redesign of the Remy drawer.
- No replacement of `parseWithOllama`.
- No public or client-facing expansion unless an existing public or client Remy path already supports the exact behavior safely.
- No changes to `types/database.ts`.

---

## Notes for Builder Agent

Build this in two slices if possible:

1. Audit-only foundation: types, registry composition, CLI audit, and unit tests. No runtime behavior changes except test visibility.
2. Runtime gate: call the gate from `runCommand()` and `approveTask()`, then add UI coverage and replay prompts.

Keep implementation additive. The safest first commit is a pure registry that observes existing tasks and fails tests for uncovered capabilities. Only after that should the builder enforce runtime behavior.

Do not remove legacy task paths unless a test proves the new capability registry covers them and existing Remy quality suites pass.

---

## Spec Validation

1. **What exists today that this touches?** Remy command orchestration exists in `lib/ai/command-orchestrator.ts:1873`, deterministic routing exists at `lib/ai/command-orchestrator.ts:1225`, LLM intent parsing exists at `lib/ai/command-orchestrator.ts:1954`, approval policy exists at `lib/ai/remy-approval-policy-core.ts:38`, action audit exists at `lib/ai/remy-action-audit-actions.ts:73`, and quality scripts exist at `package.json:266` through `package.json:294`.
2. **What exactly changes?** Add a pure `lib/ai/remy-capabilities/*` contract, add a `scripts/remy-capability-audit.mjs` CLI, add unit and replay tests, then wire the existing orchestrator and settings UI to consume the contract.
3. **What assumptions are being made?** Verified: existing task sources are split across command orchestrator, read registry, agent registry, and permission manifest. Verified by `lib/ai/command-orchestrator.ts:87`, `lib/ai/remy-read-task-registry.ts:146`, `lib/ai/agent-registry.ts:37`, and `lib/ai/tool-permission-manifest.ts:20`. Unverified: whether every legacy `executeCoreCommandTask` branch can be cleanly described in the first registry pass. Builder must classify uncovered legacy branches as `legacy_uncovered` rather than guessing.
4. **Where will this most likely break?** First, hidden legacy task branches in `command-orchestrator.ts` may not have clean metadata. Second, action registration order may cause the registry to miss agent actions if `ensureAgentActionsRegistered()` is not called first. Third, evidence metadata may be uneven across read task executors.
5. **What is underspecified?** The exact visual treatment of evidence chips is intentionally light. Builder should reuse existing task card styling and avoid a visual redesign.
6. **What dependencies or prerequisites exist?** `docs/specs/remy-runtime-unification-and-quality-recovery.md` should land first if the Remy quality harness is still broken. This spec can still start with audit-only code because it does not depend on a live server.
7. **What existing logic could this conflict with?** Approval policy resolution in `remy-approval-policy-core.ts`, Focus Mode filtering in `command-orchestrator.ts`, document draft privacy checks, and existing agent action previews.
8. **What existing work could this duplicate or fragment?** It could duplicate runtime unification, model routing, or command-plane work. This spec avoids that by governing capability contracts only and attaching to `remy-ai`.
9. **What is the end-to-end data flow?** User sends Remy message -> `runCommand()` authenticates with `requireChef()` -> deterministic or LLM parser produces planned tasks -> capability registry resolves task metadata -> gate checks permissions, privacy, recipe ban, safety, and approval policy -> read task executes or write preview returns pending -> result includes evidence and warnings -> UI renders result -> optional approval calls `approveTask()` -> audit row starts -> gate rechecks policy -> commit executes -> audit finalizes -> UI shows success or error.
10. **What is the correct implementation order?** Types first, registry second, audit CLI third, unit tests fourth, evidence helpers fifth, orchestrator gate sixth, settings UI seventh, replay suite eighth, docs last.
11. **What are the exact success criteria?** Every known Remy task has a capability record or a deliberate `legacy_uncovered` status; every write requires approval; restricted recipe tasks are blocked; unknown `agent.*` tasks are blocked; read results can expose evidence; Remy Control Center shows real capability coverage; Remy quality tier and hallucination suites pass or fail for real behavior only.
12. **What are the non-negotiable constraints?** `requireChef()` stays at server action entry points, DB reads stay tenant-scoped, no fallback AI provider, no recipe generation, no manual `types/database.ts`, no destructive DB operations, no fake success, no unapproved build or server start.
13. **What should NOT be touched?** Do not edit `types/database.ts`, migrations, ledger append or compute code, event FSM transitions, public marketing copy, provider strategy, or Remy visual mascot behavior.
14. **Is this the simplest complete version?** Yes. It does not add stored state or a new route. It composes existing registries and adds enforcement plus tests.
15. **If implemented exactly as written, what would still be wrong?** The first version may still leave some legacy command branches marked `legacy_uncovered`. That is acceptable only if the CLI fails release checks or reports them clearly until follow-up coverage is added.

## Final Check

This spec is production-ready as a builder handoff for an additive capability-governance layer. The only uncertainty is the exact count and shape of legacy command branches inside `executeCoreCommandTask`; the spec resolves that by requiring `legacy_uncovered` reporting instead of guessing.
