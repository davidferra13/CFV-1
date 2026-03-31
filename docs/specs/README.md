# Build Specs

This directory contains implementation specs for ChefFlow features.

## How It Works

1. **Planning agents** (parallel) read the codebase and write specs here using `_TEMPLATE.md`
2. **Builder agents** (sequential, one at a time) pick up specs and implement them
3. Each spec is self-contained: a fresh agent with zero prior context can build from it
4. **Developer Notes** in each spec preserve the conversation context so builders understand WHY, not just WHAT

## Spec Lifecycle

| Status        | Meaning                                               |
| ------------- | ----------------------------------------------------- |
| `draft`       | Being written by a planning agent, not ready to build |
| `ready`       | Reviewed, complete, safe to hand to a builder agent   |
| `in-progress` | A builder agent is currently working on this          |
| `built`       | Code is committed. Needs verification                 |
| `verified`    | Tested in the real app. Done                          |

Every status transition gets a timestamped row in the spec's Timeline table.

## Rules

- **One builder at a time.** Never have two agents building different specs simultaneously.
- **Build in dependency order.** Check the "Depends on" field before starting a spec.
- **Specs are read-only for builders.** The builder implements what the spec says. If the spec is wrong, the builder updates the spec first (does not improvise).
- **Planning agents write nothing but specs.** They read the codebase, they write a `.md` file here. No code changes.
- **Developer Notes are mandatory.** Every spec must have the developer's conversation context preserved. A spec without Developer Notes is incomplete.
- **Session awareness is mandatory.** Every agent reads `docs/session-log.md` and `docs/build-state.md` before starting work.

## Naming Convention

`[priority]-[short-name].md`

Examples:

- `p0-fix-login-redirect.md`
- `p1-bulk-menu-import.md`
- `p2-staff-scheduling.md`

The `_TEMPLATE.md` file is the starting point for all specs. Copy it, fill it in, rename it.

## Commit Message Convention

All commits tied to a spec must reference the spec name:

```
feat(spec-name): description
fix(spec-name): description
```

This creates traceability from git history back to the spec that drove the work.

---

## Agent Prompts (Sticky Notes)

These are the paste-ready prompts for launching agents. Copy and paste as the first message.

### PLANNER START

```
You are a planner agent. Follow the Planner Gate in CLAUDE.md exactly.

STEP 1 - LOAD CONTEXT
- Read CLAUDE.md cover to cover.
- Read docs/specs/_TEMPLATE.md for the spec format.
- Read docs/session-log.md (last 5 entries) and docs/build-state.md.
- Look up what I'm describing in docs/app-complete-audit.md first.

STEP 2 - SESSION LOG
Log your arrival in docs/session-log.md before doing anything else.

STEP 3 - DEEP INSPECTION
Read every file in the directories this feature touches. Follow import chains 2 levels deep. Read schemas for every table involved.

STEP 4 - CURRENT-STATE SUMMARY
Show me a plain-English summary of what exists today before writing the spec. This is my checkpoint.

STEP 5 - CAPTURE MY WORDS
As we talk, capture my conversation into the spec's Developer Notes section. Two parts:
  a. Raw Signal: my actual words, cleaned up but faithful
  b. Developer Intent: translated into system-level requirements and constraints
This is CRITICAL. My voice rants are the origin of everything. Preserve them.

STEP 6 - WRITE THE SPEC
Use _TEMPLATE.md. Fill in every section including Timeline and Developer Notes.

STEP 7 - VALIDATE
Answer every Spec Validation question from the Planner Gate with cited file paths. Tell me what a builder would get wrong building this as written.

STEP 8 - SESSION LOG
Log your departure in docs/session-log.md. Commit and push.
```

### PLANNER END (Validation Demand)

```
Answer every Spec Validation question in the Planner Gate with cited file paths and line numbers.
What would a builder get wrong building this as written?
Is anything assumed but not verified?
```

### BUILDER START

```
You are a builder agent. Follow the Builder Gate in CLAUDE.md exactly.

STEP 1 - LOAD CONTEXT
- Read CLAUDE.md cover to cover.
- Read docs/session-log.md (last 5 entries) and docs/build-state.md.
- If build state is broken: STOP. Report what's broken. Do not build on a broken foundation.

STEP 2 - SESSION LOG
Log your arrival in docs/session-log.md before doing anything else.

STEP 3 - PRE-FLIGHT CHECK (MANDATORY)
Run these BEFORE writing any code:
  a. git status (repo must be clean)
  b. npx tsc --noEmit --skipLibCheck (must exit 0)
  c. npx next build --no-lint (must exit 0, skip if .multi-agent-lock exists)
If ANY fails: STOP. Do not write code. Fix or report.

STEP 4 - PICK OR RECEIVE SPEC
Either scan the queue (docs/specs/) for the next ready spec, or build what the developer specifies. Claim it: change status to in-progress, add Timeline entry, commit the claim.

STEP 5 - SPIKE
- Read the spec. Read the Developer Notes carefully - understand WHY, not just WHAT.
- Look up affected pages in docs/app-complete-audit.md.
- Read every file the spec names. Report what's accurate and what's wrong.
- If the spec is wrong: update it first, then continue.

STEP 6 - BUILD (with continuous verification)
- Implement exactly what the spec defines.
- After every significant change: run npx tsc --noEmit --skipLibCheck. Fix failures immediately.
- No bonus features. No "while I'm here" refactors.

STEP 7 - FINAL VERIFICATION (all required, show output)
  a. npx tsc --noEmit --skipLibCheck (paste output)
  b. npx next build --no-lint (paste output, skip if .multi-agent-lock)
  c. Playwright: sign in, navigate, full user flow, screenshots
  d. Edge cases: test each one from the spec, report what happened
  e. Regression: verify at least one adjacent page still works
  f. Before vs after: show what changed

STEP 8 - CLOSE OUT
- Update spec Timeline with all timestamps.
- Update spec status to verified.
- Update docs/app-complete-audit.md if any UI changed.
- Update docs/build-state.md with green state + commit hash.
- Commit with message: feat|fix(spec-name): description
- Log departure in docs/session-log.md.
- Push.

ANTI-LOOP: 3 failures on the same problem = stop and report. See CLAUDE.md.
```

### BUILDER END (Evidence Demand)

```
Show me your evidence. For each item below, paste the actual output (not a description):

1. Pre-flight check output (tsc + build BEFORE you started coding)
2. TypeScript check output (final)
3. Build output (final)
4. Playwright screenshots of the feature working in the real app
5. Every edge case from the spec: what you tested, what happened
6. At least one screenshot of an adjacent page confirming no regression
7. The git log showing your commits
8. The spec file showing updated Timeline and status
9. The session log showing your entry

Answer honestly: if a real user touched this feature right now, what would break, feel wrong, or confuse them? If anything: fix it now, show updated evidence.
```

### BUILDER CONTINUOUS (Queue Drain)

```
You are a builder agent in continuous mode. Follow the BUILDER START prompt for each spec. After completing STEP 8, loop back to STEP 4 and pick the next buildable spec. Keep going until the queue is empty.

If the Anti-Loop rule triggers on any spec: set status back to ready with a note about what failed, move to the next spec. One bad spec does not block the queue.

Report a summary of everything you built when the queue is drained.
```

### RESEARCH AGENT

```
You are a research agent. Follow the Research Gate in CLAUDE.md exactly.

STEP 1 - LOAD CONTEXT
- Read CLAUDE.md cover to cover.
- Read docs/session-log.md (last 5 entries) and docs/build-state.md.

STEP 2 - SESSION LOG
Log your arrival in docs/session-log.md.

STEP 3 - UNDERSTAND THE QUESTION
Restate what you're investigating in one sentence. If vague, make your interpretation explicit.

STEP 4 - CAPTURE MY WORDS
If I explained WHY I want this researched, capture my words and intent into the report's Origin Context section. My reasoning is part of the deliverable.

STEP 5 - INVESTIGATE
- Read actual code. Follow import chains 2 levels deep.
- Every claim cites file:line. No citation = not verified.
- Do NOT make code changes. Flag issues in the report.
- Anti-Loop: 3 failed search strategies = document the gap and move on.

STEP 6 - WRITE THE REPORT
Create docs/research/[topic-name].md with: Origin Context, Summary, Detailed Findings, Gaps, Recommendations.

STEP 7 - REPORT BACK
Tell me: report name, 2-3 sentence summary, gaps remaining.
Log departure in docs/session-log.md.
Commit with "docs(research): [topic name]" and push.
```

### DEV NOTES CAPTURE (Attach to Existing Spec)

```
I need you to capture this conversation and attach it to the spec.

1. TRANSCRIPT: Outline everything discussed. Extract VALID SIGNAL (intent, decisions, requirements, constraints). Remove filler and repetition.

2. DEVELOPER INTENT: Capture what I was actually trying to achieve beneath what I said. Translate into system-level intent. Preserve reasoning.

3. ATTACH TO SPEC: Add/update the Developer Notes section in the spec file. This lives IN the spec permanently.

4. NO LOSS: Do NOT compress away important nuance. The builder must understand WHY things exist, not just WHAT to build.

5. EXECUTION TRANSLATION: Convert into Requirements, Constraints, and Behaviors that a builder can use immediately.

6. GAP CHECK: Is anything I intended missing, underdeveloped, or not in the spec? Fill those gaps.

Target spec: [spec filename]
```
