---
name: omninet
description: Always-on ChefFlow Codex operating loop. Use at the start of any ChefFlow task, ambiguous request, multi-skill request, build, debug, review, research, planning, persona pipeline work, or when deciding which project skills to load. Routes work through the best existing skills, maintains a task heartbeat, protects ChefFlow hard stops, and captures skill creation or healing opportunities.
---

# Omninet

Use this as the first-pass router for ChefFlow work. It is not a daemon or background process. It is the operating loop Codex should apply at the start of each ChefFlow task before choosing deeper skills.

## Start Loop

1. Read the active user request and the latest project rules.
2. Check whether the request names a skill. If yes, load that skill first.
3. If the request implies a task class, load the best matching skill from the router below.
4. If the request reveals a repeated developer behavior, recurring failure, new operating rule, or missing reusable workflow, also load `skill-garden`.
5. State the skill or skills being used in one short line.
6. Execute the task with the normal ChefFlow hard stops: no main push, no destructive database operations, no `drizzle-kit push`, no manual `types/database.ts`, no `@ts-nocheck`, no em dashes, no unapproved build, no unapproved long-running server.

## Skill Router

Use the most specific skill that fits. Combine skills only when their responsibilities are distinct.

| Situation | Primary skill |
| --- | --- |
| Build from a spec or implement a feature | `builder` |
| Need test-first implementation | `tdd` |
| Bug, failed behavior, broken route, recurring error | `debug` |
| Systemic or recurring root cause | `5-whys` |
| Review code before shipping | `review` |
| Compliance rules, banned text, invalid exports | `compliance` |
| Zero hallucination risks, no-op UI, fake data, optimistic updates | `hallucination-scan` |
| Build health, green claims, stale tests, status truth, conflicting evidence | `evidence-integrity` |
| Strategic product reasoning or vague request | `first-principles` |
| Thread or feature completeness check | `audit` |
| Highest leverage next move | `massive-win` |
| Mixed old or new findings, autodocket, audit findings, backlog triage | `findings-triage` |
| Persona pipeline management | `persona-inbox` |
| Huge pasted persona material | `persona-dump` |
| Persona fitness evaluation | `persona-stress-test` |
| Build missing features from persona findings | `persona-build` |
| Research task or written report | `research` |
| Health, status, warmup, Pi, pipeline checks | matching operational skill |
| Skill failed or produced bad guidance | `heal-skill` and `skill-garden` |
| New repeated workflow or developer behavior | `skill-garden` |
| Session close, commit, push | `close-session` or `ship` |

## Heartbeat

Maintain this lightweight state while working:

- Goal: what outcome the user actually asked for.
- Active skill: the current primary skill and why it applies.
- Sidecar skills: any secondary skills that materially reduce risk.
- Hard stops: any project rule that affects the task.
- Evidence: files, commands, outputs, or user-provided artifacts that ground the work.
- Skill delta: whether this task revealed a new skill, a skill repair, or no reusable change.

Do not narrate all of this unless useful. Use it to choose actions.

## Self-Improvement Trigger

Invoke `skill-garden` when any of these appear:

- The user says "always", "never", "from now on", "make Codex", "Codex should", or similar operating guidance.
- The same correction, missed behavior, or workflow appears more than once.
- A skill fails, is too vague, chooses the wrong tool, or leaves out a recurring ChefFlow rule.
- External operator guidance from Hermes, OpenCloy, ChatGPT, notes, markdowns, or pasted conversations should become project behavior.
- A workflow requires repeated manual parsing, like persona imports or build queue triage.
- Current conclusions depend on old audit findings, stale docs, mixed test failures, or operational status artifacts.
- The user asks to improve from old or new findings, audits, persona synthesis, autodocket, or backlog sources.

## Execution Rules

- Prefer existing skills over creating new ones.
- Prefer patching a weak skill over adding a duplicate.
- Keep new skill bodies concise and trigger descriptions precise.
- Commit and push any skill changes before finishing, following the project git workflow.
- If a requested background behavior is not technically possible in Codex, encode the closest reliable triggerable behavior and state the limitation plainly.
