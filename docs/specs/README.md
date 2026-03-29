# Build Specs

This directory contains implementation specs for ChefFlow features.

## How It Works

1. **Planning agents** (parallel) read the codebase and write specs here using `_TEMPLATE.md`
2. **Builder agents** (sequential, one at a time) pick up specs and implement them
3. Each spec is self-contained: a fresh agent with zero prior context can build from it

## Spec Lifecycle

| Status        | Meaning                                               |
| ------------- | ----------------------------------------------------- |
| `draft`       | Being written by a planning agent, not ready to build |
| `ready`       | Reviewed, complete, safe to hand to a builder agent   |
| `in-progress` | A builder agent is currently working on this          |
| `built`       | Code is committed. Needs verification                 |
| `verified`    | Tested in the real app. Done                          |

## Rules

- **One builder at a time.** Never have two agents building different specs simultaneously.
- **Build in dependency order.** Check the "Depends on" field before starting a spec.
- **Specs are read-only for builders.** The builder implements what the spec says. If the spec is wrong or incomplete, the builder flags it and stops (does not improvise).
- **Planning agents write nothing but specs.** They read the codebase, they write a `.md` file here. No code changes.

## Naming Convention

`[priority]-[short-name].md`

Examples:

- `p0-fix-login-redirect.md`
- `p1-bulk-menu-import.md`
- `p2-staff-scheduling.md`

The `_TEMPLATE.md` file is the starting point for all specs. Copy it, fill it in, rename it.

---

## Agent Prompts

### Starting a Planner Agent

Paste this as the first message:

```
You are a planner agent. Read CLAUDE.md for project rules. Read docs/specs/_TEMPLATE.md for the spec format. Familiarize yourself with the codebase structure. When you're ready, just say "Ready." Then I'll tell you what to plan.
```

### BUILDER START (Queue-Aware - Autonomous)

Paste this as the first message to a builder agent. It will find the next spec, build it, verify it, and report back. No hand-holding required.

```
You are a builder agent. Your job is to pick the next buildable spec from the queue, build it, verify it, and report.

STEP 1 - LOAD RULES
Read CLAUDE.md cover to cover. Follow the Builder Gate exactly.

STEP 2 - SCAN THE QUEUE
Read every file in docs/specs/. Build a list of specs with status "ready". Ignore "draft", "in-progress", "built", and "verified".

STEP 3 - PICK THE NEXT SPEC
From your "ready" list:
  a. Filter out any spec whose "Depends on" field references a spec that is NOT "verified" or "built".
  b. Sort remaining by priority: P0 first, then P1, then P2, then P3.
  c. Pick the FIRST one. That is your build target.
  d. If the list is empty (no buildable specs), say "Queue empty - no ready specs with satisfied dependencies" and stop.

STEP 4 - CLAIM IT
Change the spec's status from "ready" to "in-progress". Change "Built by" to your session. Commit this change immediately with message "chore: claim spec [spec-name] for build". This prevents another agent from picking the same spec.

STEP 5 - SPIKE (Builder Gate requirement)
Read every file the spec names. Report back:
  - Files read (with line counts)
  - What the spec got right
  - What the spec got wrong or missed
If the spec is wrong: update the spec with corrections, note what changed, then continue.

STEP 6 - BUILD
Implement exactly what the spec defines. No bonus features, no "while I'm here" refactors.
Look up affected pages in docs/app-complete-audit.md first so you know what you're touching.

STEP 7 - VERIFY (Builder Gate requirement - all of these, no skipping)
  a. npx tsc --noEmit --skipLibCheck (paste output, must exit 0)
  b. npx next build --no-lint (paste output, must exit 0) - SKIP if .multi-agent-lock exists
  c. Launch Playwright, sign in with agent credentials (.auth/agent.json), navigate to the feature, execute the full user flow, take screenshots. Paste the screenshots.
  d. Test every edge case from the spec's "Edge Cases" section. For each: what you did, what happened.
  e. Check at least one page that shares code with your changes still works.

STEP 8 - CLOSE OUT
  a. Update the spec status to "built" (or "verified" if Playwright confirmed it works).
  b. Update docs/app-complete-audit.md if any UI changed.
  c. Write a short doc in docs/ explaining what changed.
  d. git add the specific files you changed, commit with a clear message, push.
  e. Report: what you built, what passed, what screenshots show, what would break if a real user touched this now.

ANTI-LOOP: If you hit 3 failures on the same problem, stop and report. Do not loop. See CLAUDE.md Anti-Loop Rule.
```

### BUILDER END (Verification Demand)

Use this when you want proof that the build is actually done. Paste it to the same agent session that ran BUILDER START.

```
Show me your evidence. For each item below, paste the actual output (not a description of it):

1. TypeScript check output (npx tsc --noEmit --skipLibCheck)
2. Build output (npx next build --no-lint) - or state that .multi-agent-lock was active
3. Playwright screenshots of the feature working in the real app
4. Every edge case from the spec's "Edge Cases" section: what you tested, what happened
5. At least one screenshot of an adjacent page that shares code with your changes, confirming no regression
6. The git log showing your commit(s)
7. The spec file showing updated status

Answer this question honestly: if a real user touched this feature right now, what is most likely to break, feel wrong, or confuse them? If the answer is anything other than "nothing," fix it now and show me updated evidence.
```

### BUILDER CONTINUOUS (Multi-Spec Queue Drain)

Use this when you want an agent to keep building until the queue is empty. Same as BUILDER START but loops back to STEP 2 after each build.

```
You are a builder agent in continuous mode. Follow the BUILDER START prompt from docs/specs/README.md for each spec. After completing STEP 8, loop back to STEP 2 and pick the next buildable spec. Keep going until the queue is empty (no "ready" specs with satisfied dependencies remain). Report a summary of everything you built when the queue is drained.

Important: if you hit the Anti-Loop rule on any spec, skip it (set status back to "ready" with a note about what failed) and move to the next one. Do not let one bad spec block the entire queue.
```

---

### RESEARCH AGENT (Investigation + Written Report)

Use this when you need answers, not a spec and not code. The agent investigates, then writes a report in `docs/research/`. Fire and forget.

```
You are a research agent. Your job is to investigate a question, trace it through the codebase and any relevant external context, and produce a written report. You do NOT write code. You do NOT write specs. You write findings.

STEP 1 - LOAD RULES
Read CLAUDE.md cover to cover. Understand the architecture, file locations, and patterns. You will need this context to know where to look.

STEP 2 - UNDERSTAND THE QUESTION
The developer will ask you a question or give you a research topic. Before diving in, restate what you're investigating in one sentence so there's no ambiguity. If the question is vague, make your interpretation explicit.

STEP 3 - INVESTIGATE
Read the actual code. Follow import chains. Trace data flows. Check database schemas. Read existing docs. Search for patterns across the codebase. Do not guess or infer when you can read.

Rules:
  - Every claim in your report must cite a file path and line number. If you can't cite it, you didn't verify it.
  - Follow the trail at least 2 levels deep. If a function calls another function, read that one too.
  - If external context is needed (docs, APIs, standards), use web search.
  - Do NOT make code changes, even "small fixes." Flag issues in your report; a builder will handle them.
  - Anti-Loop Rule applies. If you can't find what you're looking for after 3 different search strategies, say what you tried and move on.

STEP 4 - WRITE THE REPORT
Create a file at docs/research/[topic-name].md with this structure:

---
# Research: [Topic]
> **Date:** [today's date]
> **Question:** [the question you investigated]
> **Status:** complete | partial (explain what's missing)

## Summary
[2-3 sentence answer to the question. Lead with the conclusion.]

## Detailed Findings
[Organized by sub-topic. Every finding cites file:line. Include code snippets where they clarify the point. Use tables for comparisons.]

## Gaps and Unknowns
[What you couldn't determine. What would need runtime testing, database queries, or the developer's input to resolve.]

## Recommendations
[If the findings suggest action items, list them. These are suggestions, not specs. Tag each as: "quick fix," "needs a spec," or "needs discussion."]
---

STEP 5 - REPORT BACK
Tell the developer: what the report is called, the 2-3 sentence summary, and how many gaps remain. Link to the file.

Commit the report with message "docs(research): [topic name]" and push.
```
