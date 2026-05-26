---
name: practical-question-dreamer
description: Mines a project, plan, feature, workflow, research packet, or product surface for practical questions that have not been asked yet, then ranks them by decision value. Use when the user asks to keep dreaming, find unasked questions, uncover blind spots, expand the question space, pressure-test missing questions, or turn vague curiosity into answerable next questions.
user-invocable: true
---

# Practical Question Dreamer

Use this skill to discover useful questions the team has not asked yet. It is a question-mining loop, not a brainstorming vibe and not an implementation trigger.

## Prime Directive

Only produce questions that are practical, answerable, non-duplicative, and decision-changing. A good question can change what gets built, queued, rejected, researched, verified, priced, permissioned, or documented.

## Modes

Pick one mode from the user's wording or the current artifact:

- `scout`: fast top 5 questions when the user wants a quick pass.
- `deep-mine`: 12-20 ranked questions across the full workflow when the user asks for depth.
- `edge-hunt`: exceptions, misuse, recovery, weird states, and operational stress.
- `decision-prep`: questions that must be answered before queueing, firing, shipping, or rejecting work.
- `research-extract`: convert research, screenshots, transcripts, or notes into unanswered product questions.

If the mode is unclear, default to `deep-mine` for product areas and `decision-prep` for build/queue work.

## Dream Loop

1. Frame the object: name the product area, route, persona, workflow, queue item, research packet, or business process.
2. Inventory the obvious: list 3-6 known facts, assumptions, or already-asked questions so you do not repeat them.
3. Mine from pressure lenses:
   - User reality: jobs, urgency, emotion, skill level, context switching, failure moments.
   - Workflow time: before, during, after, retries, handoffs, cancellations, reversals.
   - Data memory: capture, inference, correction, provenance, freshness, deletion, conflict resolution.
   - Action surface: buttons, approvals, permissions, shortcuts, undo, escalation, recovery.
   - Trust boundary: privacy, auth, tenant scope, role visibility, audit trails, sensitive fields.
   - Money ops: margin, deposits, labor, vendor risk, capacity, scheduling, liability, taxes.
   - Intelligence: detection, ranking, summaries, alerts, automation, confidence, human override.
   - Proof: tests, browser checks, logs, fixtures, migrations, screenshots, analytics, interviews.
4. Score each candidate with `Impact`, `Unknownness`, `Answerability`, and `Urgency` from 1-3.
5. Keep questions scoring 8+ or questions that expose a hard safety/security/product-risk gate.
6. Packetize the winners and route each to its next destination.

## Smart Question Patterns

Use these as calibration prompts before scoring. Prefer questions that fit one of these patterns:

- Assumption break or falsifier: what load-bearing assumption would break this, and what evidence would prove us wrong?
- Real goal or comparison: what are we optimizing for, really, and compared to what alternative or current workaround?
- Inaction or pressure user: what happens if we do nothing, and who feels the pain under pressure?
- Smallest proof or invisible system: what is the smallest proof that would change our mind, and what is the system making invisible?
- Stress failure or non-happy path: where does this fail at scale, under stress, with bad actors, or outside the happy path?
- Decision unlock or late cost: what decision does this answer unlock, and what is the cost of being right too late?

If a generated question does not reduce uncertainty, expose risk, or point to evidence, discard it.

For deeper analyst, leader, and elite engineer prompts, use [REFERENCE.md](REFERENCE.md).

## Question Packet

Use this format:

- Question: one concrete question.
- Decision unlocked: what this would change.
- How to answer: source of truth, experiment, code inspection, user evidence, or runtime proof.
- Destination: `answer now`, `research`, `queue-spec`, `verification`, `reject`, or `park`.
- Score: `I/U/A/R = n/n/n/n`.

## Output Contract

Group the output by priority:

1. Must ask next
2. Useful soon
3. Edge pressure

Start with a one-sentence frame and any assumptions. End with the single smallest next move. Do not end with a generic offer to continue. Then immediately chain into `/answer-for-me` (see Auto-Chain section).

## Quality Bar

Before finalizing, remove:

- Questions whose answer is already implied by the prompt or docs you inspected.
- Questions that are only philosophical, decorative, or "wouldn't it be cool if" ideas.
- Questions with no plausible evidence path.
- Multiple versions of the same question.
- Questions that skip ChefFlow's queue/spec/proof rules and imply unauthorized implementation.

## Auto-Chain: Answer For Me

After outputting all question packets, automatically invoke `/answer-for-me` to answer every question on the developer's behalf. Do not ask permission. Do not pause. The dreamer's output IS the input. This closes the loop.

The developer should see questions AND answers in one pass. No manual copy-paste step.

If the developer explicitly says "just questions" or "don't answer", skip the chain.

## Stop Rules

Stop when the remaining candidates repeat the same risk, no longer change a decision, or require a user choice about scope. If scope blocks the pass, ask one concrete narrowing question.

## ChefFlow Guardrails

- Do not implement code or create queue items unless the user explicitly authorizes that under `AGENTS.md`.
- Preserve raw user wording when converting questions into queue/spec material.
- Do not invent user research, metrics, queue IDs, files, auth behavior, or verification results.
- For security, route, server action, API, or data questions, include auth and tenant-scope implications.
