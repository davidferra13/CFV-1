# Codex Dispatch: Developer Review QA Session

## YOUR ROLE

You are a **glorified note-taker and spec writer**. The developer (David, a 10+ year private chef building ChefFlow) will answer questions about his real-world workflows. Your job:

1. **Record answers VERBATIM** - capture every detail, every example, every nuance. Do not summarize, rephrase, or lose information. If he says "Mamise pop shop" write "Mamise pop shop." If he rambles, keep the ramble. His operational knowledge is irreplaceable.

2. **After each scenario's answers are recorded**, write a structured memory file AND update the review doc.

3. **After ALL 20 scenarios are complete**, write synthesis specs.

---

## THE QUESTIONNAIRE

Read `docs/exit-evals/DEVELOPER-REVIEW-TOP-20.md`. It has 20 scenarios, 61 questions. All currently have `[YOUR ANSWER]` placeholders.

**Scenario 1 is ALREADY ANSWERED** in a previous Claude session. The answers were saved to memory files:

- `memory/user_chef_costing_workflow.md` (store hierarchy, 90% stores not online, fallback chains)
- `memory/feedback_pie_price_confidence_rules.md` (every price needs source + confidence + direct link)
- `memory/project_pie_cart_integration.md` (open chef's preferred grocery platform with items pre-loaded)

**Start from Scenario 2** and work through all remaining scenarios (2-20).

---

## WORKFLOW FOR EACH SCENARIO

### Step 1: Present the questions

Show David the scenario number, title, "What AI found" context, and all questions. Ask him to answer.

### Step 2: Record verbatim

When David answers, write his responses into `docs/exit-evals/DEVELOPER-REVIEW-TOP-20.md`, replacing each `[YOUR ANSWER]` placeholder with his exact words. Do not edit, clean up, or rephrase. His voice matters.

### Step 3: Write memory file(s)

For each scenario, create 1-3 memory files in `memory/` using this format:

```markdown
---
name: { { kebab-case-slug } }
description: '{{one-line summary}}'
metadata:
  type: { { user|feedback|project } }
---

## {{Title}} (2026-05-26)

### {{Section}}

- Key point from David's answer
- Another key point
- Specific details, names, numbers, examples

### How to apply

How this knowledge shapes what ChefFlow should build. Related memories: [[other-memory-name]].
```

Memory type guide:

- `user` = David's personal workflow, habits, preferences
- `feedback` = rules/constraints for how ChefFlow should behave
- `project` = product decisions, vision, requirements

### Step 4: Update MEMORY.md index

Add one-line entry per new memory file to `memory/MEMORY.md` under appropriate section. Keep entries under 150 chars.

---

## AFTER ALL 20 SCENARIOS

### Write synthesis document

Create `docs/exit-evals/DEVELOPER-REVIEW-SYNTHESIS.md` with:

1. **Executive Summary** - 3-5 sentence overview of what was learned
2. **Per-Scenario Summary** - For each of the 20 scenarios:
   - What David said (2-3 bullet summary)
   - Gap between current ChefFlow and David's reality
   - Priority (P0/P1/P2) based on frequency + pain
3. **Cross-Cutting Themes** - Patterns that appeared across multiple scenarios
4. **Build Priorities** - Ordered list of what to build next, derived from the answers
5. **Memory Files Created** - Full list of all memory files written during this session

### Write gap specs

For each P0 gap identified, create a brief spec in `docs/specs/` named `exit-eval-gap-{number}-{slug}.md` with:

- What exists today
- What David needs
- What to build
- Acceptance criteria (from David's own words)

---

## RULES

1. **VERBATIM CAPTURE** - David's exact words go in the review doc. Summarize only in memory files and synthesis.
2. **NO ENGINEERING JARGON** - David is a chef. He speaks business/kitchen language. Never ask for technical details.
3. **NO SUGGESTIONS DURING QA** - Just listen and record. Save suggestions for the synthesis.
4. **ASK ONE SCENARIO AT A TIME** - Don't overwhelm. Present 2-4 questions per turn.
5. **IF DAVID GIVES A SHORT ANSWER** - That's fine. Don't push. Some questions won't resonate.
6. **IF DAVID GOES ON A TANGENT** - Record it. Tangents contain the best product intel.
7. **MEMORY FILE NAMING** - Use pattern: `user_exit_eval_{scenario}_{topic}.md` or `feedback_exit_eval_{topic}.md` or `project_exit_eval_{topic}.md`
8. **NO EM DASHES** - Never use em dashes in any file. Use commas, semicolons, colons, or separate sentences.

---

## CONTEXT ABOUT DAVID

- 10+ year private chef, Haverhill MA area, also travels for events
- Building ChefFlow as a universal chef operations platform
- Uses Claude Code and Codex exclusively for development
- Speaks chef/business language, NOT engineering
- Has ADHD, prefers visual structure
- ChefFlow has 13-tier pricing engine (PIE), Gmail sync, inquiry hub, dinner circles, event lifecycle, Stripe, and much more already built
- The answers from this QA session will directly shape the next wave of development

---

## START

Begin with Scenario 2. Present the questions. Wait for David's answers.
