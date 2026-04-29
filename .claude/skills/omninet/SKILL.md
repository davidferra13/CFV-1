---
name: omninet
description: Always-on ChefFlow Codex operating loop and mandatory router. Use at the start of any ChefFlow task, ambiguous request, multi-skill request, build, debug, review, research, planning, persona pipeline work, or when deciding which project skills to load. Routes work through the best existing skills, maintains a task heartbeat, protects ChefFlow hard stops, and triggers skill creation or self-healing through skill-garden when developer behavior should become durable.
---

# Omninet

Use this as the first-pass router for ChefFlow work. Codex cannot run a true background daemon inside a chat session, so Omninet is the per-turn substitute: every ChefFlow turn starts here, keeps one active skill selected, and calls sidecar skills as the task reveals new signals.

## Standing Contract

1. Treat Omninet as always active for ChefFlow, even when the user does not name it.
2. Keep exactly one primary skill in charge of the current work, then add sidecar skills only for distinct risk or workflow needs.
3. Assume ChefFlow has a swarm of agents working concurrently. Treat unfamiliar dirty files, untracked files, deletions, stubs, logs, specs, and generated artifacts as other agents' active work unless you created them in this session.
4. If the task reveals reusable developer behavior, external operator guidance, repeated friction, a missing trigger, or a skill failure, run `skill-garden` in the same turn.
5. If a skill produced bad guidance, run `heal-skill` with `skill-garden` so the fix is both local and durable.
6. At closeout, decide the skill delta: `none`, `patch`, `new-skill`, or `heal`. If it is not `none`, make the skill change before final response and commit it.

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
- Promote a proven flight record into replay corpus: `node devtools/agent-replay-corpus.mjs promote --record path --name "case-name"`
- Run replay regression: `node devtools/agent-replay-runner.mjs --corpus`
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
3. If the request implies a task class, load the best matching skill from the router below.
4. If the request reveals a repeated developer behavior, recurring failure, new operating rule, or missing reusable workflow, also load `skill-garden`.
5. If the request includes a huge persona paste or asks whether one can be pasted, load `persona-dump`.
6. Inspect branch and dirty work before writing, classify current-task files versus other agents' work, and keep ownership narrow.
7. State the skill or skills being used in one short line.
8. Execute the task with the normal ChefFlow hard stops: no main push, no destructive database operations, no `drizzle-kit push`, no manual `types/database.ts`, no `@ts-nocheck`, no em dashes, no unapproved build, no unapproved long-running server.

## Skill Router

Use the most specific skill that fits. Combine skills only when their responsibilities are distinct.

| Situation                                                                                             | Primary skill                                              |
| ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Build from a spec or implement a feature                                                              | `builder`                                                  |
| Large, multi-track, research-heavy, or build-heavy task that may benefit from bounded parallel agents | `swarm-governor`, then the task-specific skill             |
| Need test-first implementation                                                                        | `tdd`                                                      |
| Bug, failed behavior, broken route, recurring error                                                   | `debug`                                                    |
| Systemic or recurring root cause                                                                      | `5-whys`                                                   |
| Ledger, cents, balances, financial invariants, append-only money movement                             | `ledger-safety`                                            |
| Billing tiers, monetization, feature classification, upgrade prompt timing                            | `billing-monetization`                                     |
| Stripe webhooks, checkout events, payment idempotency, reconciliation                                 | `stripe-webhook-integrity`                                 |
| Review code before shipping                                                                           | `review`                                                   |
| Compliance rules, banned text, invalid exports                                                        | `compliance`                                               |
| Zero hallucination risks, no-op UI, fake data, optimistic updates                                     | `hallucination-scan`                                       |
| Build health, green claims, stale tests, status truth, conflicting evidence                           | `evidence-integrity`                                       |
| Windows host, scheduled tasks, ports, watchdogs, tunnels, zombie processes                            | `host-integrity`                                           |
| New feature request during validation phase, survey evidence, launch-readiness proof                  | `validation-gate`                                          |
| Strategic product reasoning or vague request                                                          | `first-principles`                                         |
| Thread or feature completeness check                                                                  | `audit`                                                    |
| Highest leverage next move                                                                            | `massive-win`                                              |
| Mixed old or new findings, autodocket, audit findings, backlog triage                                 | `findings-triage`                                          |
| Persona pipeline management                                                                           | `persona-inbox`                                            |
| Huge pasted persona material                                                                          | `persona-dump`                                             |
| Persona fitness evaluation                                                                            | `persona-stress-test`                                      |
| Build missing features from persona findings                                                          | `persona-build`                                            |
| Persona corpus saturated or persona generation has diminishing returns                                | `persona-inbox`, then `findings-triage` or `persona-build` |
| Research task or written report                                                                       | `research`                                                 |
| Health, status, warmup, Pi, pipeline checks                                                           | matching operational skill                                 |
| Skill failed or produced bad guidance                                                                 | `heal-skill` and `skill-garden`                            |
| New repeated workflow or developer behavior                                                           | `skill-garden`                                             |
| Session close, commit, push                                                                           | `close-session` or `ship`                                  |

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
