---
name: skill-garden
description: Create, improve, and self-heal ChefFlow project skills from observed developer behavior. Use proactively when the user gives operating guidance such as "always", "never", "Codex should", "make Codex smarter", "self-heal", "create skills", "knows when to", or "use this behavior going forward"; when a repeated workflow, correction, failure, persona import pattern, Hermes/OpenCloy markdown, or external conversation should become reusable Codex behavior; or when an existing skill needs refinement.
---

# Skill Garden

Turn repeated ChefFlow operating behavior into durable project skills. Prefer improving the smallest relevant existing skill over creating a new one.

## Proactive Garden Loop

Run this as a sidecar to `omninet` whenever durable behavior appears. The user does not need to ask for a skill by name.

1. Notice: capture the operating rule, workflow, failure, external guidance, or persona intake pattern.
2. Route: search existing skills and choose the smallest owner.
3. Decide: patch existing, create new, heal failed behavior, or record no durable change.
4. Act: when the guidance is clear and safe, update the skill now instead of promising to remember it.
5. Close: validate the changed skill files, scan for em dashes, then commit and push only the files owned by the skill change.

Do not create skill churn. A good garden pass leaves no change when the behavior is one-off, redundant with `AGENTS.md`, or too vague to encode.

## Tool Harness

Prefer the deterministic tools when changing or evaluating skills:

- `node devtools/skill-validator.mjs [skill-name ...]` checks frontmatter, trigger language, em dashes, and references.
- `node devtools/skill-trigger-tests.mjs` checks known prompts against expected skill routing evidence.
- `node devtools/agent-learning-inbox.mjs add ...` captures useful but unresolved behavior without forcing an immediate skill patch.
- `node devtools/external-guidance-intake.mjs --source "source-name"` classifies Hermes, OpenCloy, ChatGPT, or markdown guidance into routes.
- `node devtools/skill-health-report.mjs` writes a broad health snapshot for stale references, open learning items, and overlap risk.
- `node devtools/skill-closeout-report.mjs ...` records which skill owned the work and whether the skill delta was none, patch, new skill, or heal.

## Triage

1. Identify the behavior to preserve:
   - User preference or command habit.
   - Repeated developer correction.
   - Recurring task workflow.
   - Skill failure or vague trigger.
   - External operator guidance from pasted chat, Hermes, OpenCloy, markdowns, or notes.
   - User requests for Codex to become more autonomous, self-healing, or better at selecting skills without being asked.
2. Search `.claude/skills` for an existing skill that already owns the behavior.
3. Decide:
   - Patch an existing skill when ownership is clear.
   - Create a new skill when the behavior is reusable, distinct, and not already owned.
   - Do nothing when the behavior is one-off or better handled by the current task only.

## Creation Threshold

Create or update a skill when at least one is true:

- The user explicitly says this should become Codex behavior.
- The user uses words like "always", "never", "from now on", "self-healing", or "knows when to".
- The same failure or correction appears twice.
- The workflow has multiple steps that future agents would otherwise rediscover.
- A pasted external conversation contains operating rules, persona pipeline rules, or process guidance that should survive the current chat.

Do not create skills for ordinary coding facts, file locations already in `AGENTS.md`, or one-time implementation details.

## Patch Rules

- Use `skill-creator` guidance for new skills.
- Use `heal-skill` guidance when a skill failed or produced bad output.
- Keep frontmatter to `name` and `description` unless the local project pattern requires more.
- Put trigger conditions in `description`, not only in the body.
- Use lowercase hyphenated names under 64 characters.
- Keep bodies short, procedural, and specific to ChefFlow.
- Do not add README files or auxiliary docs inside skills.
- Do not duplicate AGENTS hard stops unless the skill specifically depends on them.
- Never introduce em dashes.

## Skill Design Pattern

Use this structure unless a better local pattern exists:

1. Frontmatter with precise triggers.
2. One-paragraph purpose.
3. A decision tree or workflow.
4. Guardrails that prevent common failure modes.
5. Output or closeout expectations.

## Self-Healing Loop

When a skill performs badly or future Codex behavior would likely miss the user's intent:

1. Capture the failure in one sentence.
2. Identify whether the problem is trigger scope, missing procedure, stale file path, unsafe instruction, or output format.
3. Patch only the broken part.
4. Validate the skill with the local validator.
5. If the failure came from user correction, encode the corrected behavior as a concrete rule.
6. If a skill did not technically fail but its trigger is too weak for the user's newly stated expectation, tighten the trigger and add the minimum procedural rule needed.

## External Guidance Intake

When the user pastes a large conversation or markdown guidance:

1. Extract stable operating rules, repeated requests, named systems, forbidden behaviors, and preferred defaults.
2. Map each rule to an existing skill when possible.
3. Create a new skill only for reusable behavior with no owner.
4. Ignore motivational or duplicate text unless it changes agent behavior.
5. Report the exact skills created or patched.

For Hermes, OpenCloy, external ChatGPT, or other local operator markdowns, preserve behavior, not prose. Convert durable rules into triggers, decision steps, guardrails, or closeout checks. Do not copy large source passages into skills.

When the guidance is too large or mixed to classify confidently by hand, pipe it through `devtools/external-guidance-intake.mjs`, then route each output item to `AGENTS.md`, a skill patch, `persona-dump`, or `findings-triage`.

## Findings Improvement Pass

When the user asks to improve using new or old findings:

1. Prefer existing first-class finding sources:
   - `docs/anthropic-unasked-questions-2026-04-18.md`
   - `docs/anthropic-system-audit-2026-04-18.md`
   - `docs/anthropic-follow-on-audit-answers-2026-04-18.md`
   - `docs/autodocket.md`
   - `system/regression-reports/`
   - `system/persona-batch-synthesis/`
2. Extract only reusable agent behavior, not every product feature gap.
3. Use `findings-triage` before converting product gaps into code tasks.
4. Patch `omninet` when the improvement affects skill routing.
5. Patch a specific skill when the finding belongs to an existing workflow.
6. Create a new skill only when the finding reveals a reusable workflow with no owner.
7. Keep the link between the skill and source finding obvious in the skill body, without copying large report sections.

## Closeout

After editing skills:

1. Run `node devtools/skill-validator.mjs [changed-skill ...]`.
2. Run `node devtools/skill-trigger-tests.mjs` when trigger behavior changed.
3. Run a targeted compliance scan for em dashes in changed skill files.
4. Write a closeout report with `node devtools/skill-closeout-report.mjs` when the task's main purpose was skill behavior.
5. Stage only the files you changed unless the user explicitly asks to ship all dirty work.
6. Commit and push on a feature branch.
