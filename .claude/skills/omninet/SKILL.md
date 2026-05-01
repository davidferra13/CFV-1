---
name: omninet
description: Always-on ChefFlow Codex operating loop and quiet mandatory router. Use at the start of any ChefFlow task, ambiguous request, multi-skill request, build, debug, review, research, planning, persona pipeline work, or when deciding which project skills to load. Routes work through the best existing skill with minimal narration, protects ChefFlow hard stops, and triggers skill creation or self-healing through skill-garden when developer behavior should become durable.
---

# Omninet

Use this as the first-pass router for ChefFlow work. Codex cannot run a true background daemon inside a chat session, so Omninet is the per-turn substitute: every ChefFlow turn starts here, keeps one active skill selected, and calls sidecar skills only when the task reveals a concrete risk or distinct workflow need.

## Quiet Routing Standard

Omninet should make Codex behave like a quiet expert, not a visible process engine.

1. Keep routing mostly internal. Announce only the selected primary skill and any sidecar that materially changes the work.
2. Use exactly one primary skill by default.
3. Add a sidecar skill only for a named risk, separate workflow, explicit user request, or durable behavior change.
4. Do not narrate the heartbeat, full routing tree, harness options, or internal checklists unless the user asks, a blocker appears, or a decision needs developer input.
5. Do not load skill bodies just because a skill exists. Load only the smallest skill body needed to execute the current task.
6. Treat hooks as enforcement, skills as judgment, and progress updates as brief status.
7. Do not prune, merge, or delete skills just because the list looks large. Use evidence of duplication, staleness, or bad behavior before changing skill inventory.

## Standing Contract

1. Treat Omninet as always active for ChefFlow, even when the user does not name it.
2. Run `autonomous-build-loop` when David says Codex is making him prompt every build, asks why the project is not building itself, references 24/7 Codex building, builder queues, Sticky Notes as build input, or Mission Control as a live monitor.
3. Run `v1-governor` before any new ChefFlow feature, urgency spike, V1/V2 scope decision, Hermes or swarm build idea, Mission Control progress work, or "what should we build next" request. Build only when the request is a V1 blocker, current-lane V1 support, critical bug/security/money/safety repair, or the user says `Override V1 governor: build this anyway.`
4. Run `context-continuity` as a sidecar before non-trivial ChefFlow planning, building, research, architecture, UI, feature, backlog, workflow, or ambiguous product work so Codex attaches to existing surfaces instead of creating near-duplicates.
5. Keep exactly one primary skill in charge of the current work, then add sidecar skills only for distinct risk or workflow needs that are worth naming.
6. Keep `software-fundamentals` active as the Matt Pocock audit lens for every non-trivial code task. For any build or implementation work, also load `improve-codebase-architecture` as the architecture sidecar so module depth, interface seams, locality, and test surface stay organized while code changes happen. Nothing gets built if it does not get moduled: before claiming or editing, read `docs/architecture/v1-module-primer.md` when available, identify the module owner, canonical files or route family, interface, invariants, and test surface. If the item is unassigned or too fuzzy to own a module, route it to module review or planning instead of implementation. During implementation, deepen repeated or tangled behavior into real modules when it protects the task. Before closeout, record whether module deepening happened, was unnecessary, or is intentionally deferred.
7. For ChefFlow release readiness, "what is stopping release," "what must work," or "what should we prove" questions, route to `pricing-reliability` first unless the user explicitly asks about go-to-market. For repeated pricing data audits, proof harness runs, "does ChefFlow work now," "what now" after pricing proof, or data engine reliability checks, route to `pricing-engine-auditor` with `pricing-reliability` as sidecar. Use `pricing-reliability` as the law and `pricing-engine-auditor` as the procedure.
8. Assume ChefFlow has a swarm of agents working concurrently. Treat unfamiliar dirty files, untracked files, deletions, stubs, logs, specs, and generated artifacts as other agents' active work unless you created them in this session.
9. If the task reveals reusable developer behavior, external operator guidance, repeated friction, a missing trigger, or a skill failure, run `skill-garden` in the same turn.
10. If a skill produced bad guidance, run `heal-skill` with `skill-garden` so the fix is both local and durable.
11. At closeout, decide the skill delta internally: `none`, `patch`, `new-skill`, or `heal`. If it is not `none`, make the skill change before final response and commit it.
12. If David asks for windows, sign-in, Mission Control, surveillance, or third-monitor placement, route to `show-me` with `host-integrity` as the placement sidecar. Success requires a signed-in page when auth is available plus OS window bounds on the requested monitor. A PID alone, hidden process, headless screenshot, or sign-in redirect is not success.

## Harness Commands

Use these tools when the task touches skills or durable agent behavior:

- Validate changed skills: `node devtools/skill-validator.mjs [skill-name ...]`
- Test routing triggers: `node devtools/skill-trigger-tests.mjs`
- Route a prompt before work: `node devtools/skill-router.mjs --prompt "..." [--write]`
- Start a recorded task: `node devtools/agent-start.mjs --prompt "..."`
- Run the combined harness preflight: `node devtools/agent-preflight.mjs --prompt "..."`
- Finish a recorded task: `node devtools/agent-finish.mjs --record path --owned path,other-path --used skill,skill --validations check,check`
- Write or update a flight record directly: `node devtools/agent-flight-recorder.mjs start|finish ...`
- Score a finished task: `node devtools/skill-outcome-scorer.mjs --record path --update-stats --auto-maturity`
- Detect missed skills: `node devtools/missed-skill-detector.mjs --record path [--write-learning]`
- Generate repair queue: `node devtools/skill-repair-queue.mjs`
- Generate a research brief: `node devtools/research-brief-generator.mjs --prompt "..." [--write]`
- Query evidence sources: `node devtools/evidence-source-index.mjs --query "..."`
- Convert a brief to a report scaffold: `node devtools/research-brief-to-report.mjs --brief path --write`
- Score a question answer: `node devtools/question-outcome-scorer.mjs --brief path --answer path`
- Promote a proven flight record into replay corpus: `node devtools/agent-replay-corpus.mjs promote --record path --name "case-name"`
- Run replay regression: `node devtools/agent-replay-runner.mjs --corpus`
- Bridge 3977 tasks into Codex build packets: `node devtools/codex-build-bridge.mjs next [--write]`
- Generate session digest: `node devtools/agent-session-digest.mjs`
- Gate closeout before final: `node devtools/agent-closeout-gate.mjs --owned path,other-path`
- Audit prior sessions: `node devtools/session-transcript-auditor.mjs [--file transcript.txt] [--write]`
- Propose learning actions: `node devtools/skill-learning-proposals.mjs`
- Map skill coverage: `node devtools/skill-coverage-map.mjs`
- Map skill dependencies: `node devtools/skill-dependency-graph.mjs`
- Report skill maturity: `node devtools/skill-maturity-report.mjs`
- Write skill dashboard: `node devtools/skill-dashboard.mjs`
- Report a skill failure: `node devtools/report-skill-failure.mjs --skill skill-name --what "..."`
- Record unresolved learning: `node devtools/agent-learning-inbox.mjs add --category behavior --title "..."`
- Classify external guidance: `node devtools/external-guidance-intake.mjs --source "source-name"`
- Write skill closeout evidence: `node devtools/skill-closeout-report.mjs --goal "..." --primary skill-name --delta none|patch|new-skill|heal`
- Generate skill health report: `node devtools/skill-health-report.mjs`

## Start Loop

1. Read the active user request and the latest project rules.
2. Check whether the request names a skill. If yes, load that skill first.
3. If the request says Codex should stop making David prompt every build, asks for autonomous or 24/7 building, references builder queues, Sticky Notes as build input, or a live monitor, load `autonomous-build-loop`.
4. If the request is a new feature, urgency spike, V1/V2 scope decision, Hermes or swarm build idea, Mission Control progress request, or "what should we build next" question, load `v1-governor` before builder or planner. Preserve V2 ideas instead of building them.
5. If the request implies a task class, load the best matching skill from the router below.
6. If the task is non-trivial or could create duplicate surfaces, load `context-continuity` before writing or planning, but mention it only when it changes the plan or prevents duplicate work.
7. If an approved build will edit code, load `software-fundamentals` and `improve-codebase-architecture` as sidecars unless the change is tiny and mechanical. Keep them active through closeout so the Matt Pocock audit checks module ownership and the architecture sidecar checks module depth, interface seams, locality, and test surface before shipping, but do not narrate the audits unless they affect the implementation or closeout.
8. If the request reveals a repeated developer behavior, recurring failure, new operating rule, or missing reusable workflow, also load `skill-garden`.
9. If the request includes a huge persona paste or asks whether one can be pasted, load `persona-dump`.
10. Inspect branch and dirty work before writing, classify current-task files versus other agents' work, and keep ownership narrow.
11. State the skill or skills being used in one short line only when the user named a skill, the skill choice affects risk, or project rules require disclosure.
12. Execute the task with the normal ChefFlow hard stops: no main push, no destructive database operations, no `drizzle-kit push`, no manual `types/database.ts`, no `@ts-nocheck`, no em dashes, no unapproved build, no unapproved long-running server.

## Skill Router

Use the most specific skill that fits. Combine skills only when their responsibilities are distinct.

| Situation                                                                                                                                                                                 | Primary skill                                                                                       |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| David says "show me", "show me the site", "show me what is built", "open the website", or asks to see the current app. This means open the website first, then report visual evidence.    | `show-me`                                                                                           |
| David asks to sign in, open windows, put Mission Control on the third monitor, use the surveillance monitor, or stop spawning offscreen windows.                                          | `show-me` with `host-integrity` as sidecar                                                          |
| David says he is the human bottleneck, Codex is making him prompt every build, the project should build itself, or a 24/7 builder queue and monitor should exist                          | `autonomous-build-loop` with `skill-garden` when behavior is durable                                |
| New ChefFlow feature, urgency spike, V1/V2 scope decision, Hermes or swarm build idea, Mission Control progress work, or "what should we build next" request                              | `v1-governor`, then the task-specific skill only if allowed                                         |
| Build from a spec or implement a feature                                                                                                                                                  | `builder`                                                                                           |
| Non-trivial ChefFlow build, spec, research, architecture, UI, feature, backlog, workflow, homepage, Obsidian, or ambiguous product request where duplicate or fragmented work is possible | `context-continuity` as sidecar with the task-specific skill                                        |
| Large, multi-track, research-heavy, or build-heavy task that may benefit from bounded parallel agents                                                                                     | `swarm-governor`, then the task-specific skill                                                      |
| Need test-first implementation                                                                                                                                                            | `tdd`                                                                                               |
| Bug, failed behavior, broken route, recurring error                                                                                                                                       | `debug`                                                                                             |
| Systemic or recurring root cause                                                                                                                                                          | `5-whys`                                                                                            |
| Ledger, cents, balances, financial invariants, append-only money movement                                                                                                                 | `ledger-safety`                                                                                     |
| Billing tiers, monetization, feature classification, upgrade prompt timing                                                                                                                | `billing-monetization`                                                                              |
| Stripe webhooks, checkout events, payment idempotency, reconciliation                                                                                                                     | `stripe-webhook-integrity`                                                                          |
| Review code before shipping                                                                                                                                                               | `review`                                                                                            |
| Freeze feature work, audit the codebase against skills or standards, or run repeated audit passes before more building                                                                    | `freeze-audit` with `evidence-integrity` and `audit`                                                |
| Compliance rules, banned text, invalid exports                                                                                                                                            | `compliance`                                                                                        |
| Zero hallucination risks, no-op UI, fake data, optimistic updates                                                                                                                         | `hallucination-scan`                                                                                |
| Build health, green claims, stale tests, status truth, conflicting evidence                                                                                                               | `evidence-integrity`                                                                                |
| Windows host, scheduled tasks, ports, watchdogs, tunnels, zombie processes                                                                                                                | `host-integrity`                                                                                    |
| Repeated pricing proof audits, pricing data engine reliability, geographic proof harness runs, "does ChefFlow work now," or "what now" after pricing proof                                | `pricing-engine-auditor` with `pricing-reliability`, `pipeline`, and `evidence-integrity` as needed |
| Pricing law, menu costing rules, ingredient coverage rules, OpenClaw price data, local grocery coverage, quote safety, or release-readiness blocker questions                             | `pricing-reliability` with `pipeline` and `evidence-integrity` as needed                            |
| New feature request during validation phase, survey evidence, launch-readiness proof unrelated to pricing                                                                                 | `validation-gate`                                                                                   |
| Vague product, market, strategy, research, or "does Codex know what to do with this question" request                                                                                     | `question-optimizer`                                                                                |
| Market research, demand, audience, buyer, chef, client, guest, vendor, staff, public buyer, or segment selection question                                                                 | `market-research-router`                                                                            |
| Strategic or product answer needs evidence labels across real users, codebase truth, persona simulation, public research, developer intent, inference, or unknowns                        | `evidence-broker`, then `answer-provenance`                                                         |
| Need a deterministic research packet with optimized question, audience lenses, evidence threshold, sources, stop conditions, and output format                                            | `research-brief-generator`                                                                          |
| Strategic product reasoning or vague request                                                                                                                                              | `first-principles`                                                                                  |
| Thread or feature completeness check                                                                                                                                                      | `audit`                                                                                             |
| Highest leverage next move                                                                                                                                                                | `massive-win`                                                                                       |
| Mixed old or new findings, autodocket, audit findings, backlog triage                                                                                                                     | `findings-triage`                                                                                   |
| Persona pipeline management                                                                                                                                                               | `persona-inbox`                                                                                     |
| Huge pasted persona material                                                                                                                                                              | `persona-dump`                                                                                      |
| Persona fitness evaluation                                                                                                                                                                | `persona-stress-test`                                                                               |
| Build missing features from persona findings                                                                                                                                              | `persona-build`                                                                                     |
| Persona corpus saturated or persona generation has diminishing returns                                                                                                                    | `persona-inbox`, then `findings-triage` or `persona-build`                                          |
| Research task or written report                                                                                                                                                           | `research`                                                                                          |
| Health, status, warmup, Pi, pipeline checks                                                                                                                                               | matching operational skill                                                                          |
| Skill failed or produced bad guidance                                                                                                                                                     | `heal-skill` and `skill-garden`                                                                     |
| New repeated workflow or developer behavior                                                                                                                                               | `skill-garden`                                                                                      |
| Session close, commit, push                                                                                                                                                               | `close-session` or `ship`                                                                           |

## Heartbeat

Maintain this lightweight state while working:

- Goal: what outcome the user actually asked for.
- Active skill: the current primary skill and why it applies.
- Sidecar skills: any secondary skills that materially reduce risk.
- Swarm context: which files are owned by this task and which dirty files belong to other agents.
- Hard stops: any project rule that affects the task.
- Flight record: the start or finish evidence file when the work changes durable agent behavior.
- Outcome score: whether routing, skill usage, validation, commit, push, and owned-file cleanup succeeded.
- Replay status: whether current routing still matches promoted known-good skill decisions.
- Evidence: files, commands, outputs, or user-provided artifacts that ground the work.
- Skill delta: whether this task revealed a new skill, a skill repair, or no reusable change.
- Closeout evidence: validator, trigger tests, skill health, or learning inbox entry when relevant.

Do not narrate all of this unless useful. Use it to choose actions.

## Self-Improvement Trigger

Invoke `skill-garden` when any of these appear:

- The user says "always", "never", "from now on", "make Codex", "Codex should", or similar operating guidance.
- The same correction, missed behavior, or workflow appears more than once.
- A skill fails, is too vague, chooses the wrong tool, or leaves out a recurring ChefFlow rule.
- A task finishes with a missed-skill detector finding or a flight record showing selected skills differed from expected skills.
- A task receives a weak outcome score, records a missed skill, or adds an item to the skill repair queue.
- External operator guidance from Hermes, OpenCloy, ChatGPT, notes, markdowns, or pasted conversations should become project behavior.
- A workflow requires repeated manual parsing, like persona imports or build queue triage.
- Current conclusions depend on old audit findings, stale docs, mixed test failures, or operational status artifacts.
- The user asks to improve from old or new findings, audits, persona synthesis, autodocket, or backlog sources.
- A proposed product build needs user-validation evidence before adding more surface area.
- Work touches local servers, Task Scheduler, ports, tunnels, watchdogs, or process cleanup.
- The user asks Codex to become smarter, more autonomous, more self-healing, or more like a ChefFlow operating agent.
- The user references Hermes, OpenCloy, external ChatGPT conversations, local notes, or other markdowns as behavior that should influence future Codex sessions.

## Execution Rules

- Prefer existing skills over creating new ones.
- Prefer patching a weak skill over adding a duplicate.
- Do not wait for the user to explicitly say "make a skill" when the request clearly contains durable operating guidance.
- Never revert, delete, rename, reformat, stage, or "clean up" files owned by other agents. If unrelated dirty work affects validation or hooks, report the exact polluted evidence and keep the current task scoped.
- Keep new skill bodies concise and trigger descriptions precise.
- Commit and push any skill changes before finishing, following the project git workflow.
- If a requested background behavior is not technically possible in Codex, encode the closest reliable triggerable behavior and state the limitation plainly.
