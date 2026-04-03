# Research: Boris Cherny's Claude Code Workflow vs ChefFlow Current Setup

> **Date:** 2026-04-03
> **Source:** "How Claude Code's Creator Starts EVERY Project" by Austin Marchese (YouTube: KWrsLqnB6vA)
> **Cross-referenced with:** Anthropic official best practices (code.claude.com/docs/en/best-practices), XDA Developers article on Boris's setup, Push to Prod Substack deep-dive, Builder.io CLAUDE.md guide
> **Status:** complete

## Origin Context

Developer wants to extract every actionable insight from Boris Cherny's (creator of Claude Code) publicly shared workflow, cross-reference it against ChefFlow's current Claude Code setup, and identify gaps worth closing. Goal is not to copy Boris but to identify high-leverage improvements that compound over time.

## Summary

ChefFlow's CLAUDE.md is already more sophisticated than most projects (10,474 words, covering data safety, anti-loop rules, zero hallucination enforcement, builder/planner/research gates). However, **6 specific areas from Boris's workflow are either missing or underutilized** in the current setup. The biggest wins are: custom slash commands (not configured at all), CLAUDE.md pruning (file is 5-10x Boris's recommended size), and structured plan-mode enforcement (currently advisory, not systematic).

## Boris Cherny's 6 Core Principles (from video + interviews)

### 1. Plan Mode First (80% of sessions)

- 80% of sessions start in Plan Mode (Shift+Tab twice)
- Baby-sit BEFORE the plan, not after
- Once plan is locked, execution is "almost automatic"
- Uses interview prompts: "What are the core problems? Who is this for? What does success look like? What should this NOT do?"
- After plan is good, switches to auto-accept mode for one-shot execution

### 2. Minimal CLAUDE.md (couple thousand tokens)

- Anthropic's internal CLAUDE.md is "a couple thousand tokens"
- If it gets bloated: "delete your CLAUDE.md and start fresh"
- "Do the minimal possible thing to get the model on track"
- Add rules back one at a time only when the model gets off track
- Each model improvement makes previous rules unnecessary
- Team updates CLAUDE.md multiple times per week during PR reviews

### 3. Verification Loops (2-3x quality multiplier)

- "Give Claude a way to verify its work" = 2-3x quality improvement
- Two steps: (1) give Claude a tool to see output, (2) tell Claude about that tool
- Uses Claude Chrome extension to open browser, test UI, iterate
- Add to CLAUDE.md: "before you do any work, mention how you could verify that work"
- Post-session prompt: "Go back and verify all of your work so far"

### 4. Parallel Sessions (5 terminal + 5-10 web)

- 5 local terminal instances (numbered tabs)
- 5-10 web-based sessions concurrently
- Key: tasks must be PARTITIONED (no overlap)
- "Two context windows that don't know about each other tend to get better results"
- Fresh sessions see problems that deep sessions miss
- Uses `--teleport` to move sessions between terminal and web

### 5. Systematize Inner Loops (slash commands + skills)

- Every repeated workflow gets a slash command
- Slash commands live in `.claude/commands/`, checked into Git
- Skills for domain-specific repeatable processes
- "Document once, run forever"
- Prompt to discover: "Based on the project I'm working on, what Claude skills should I create?"

### 6. Build for the Future (don't bet against the model)

- References Rich Sutton's "The Bitter Lesson": general models always beat specific ones
- Every micro-tweak to improve output will be unnecessary in 6 months
- Don't over-optimize prompts; give right direction instead
- Focus energy on "information mode" (what you feed the model) not prompt engineering
- "AI will never be as bad as it is today"

## Gap Analysis: ChefFlow vs Boris's Workflow

### ALREADY DOING WELL (no action needed)

| Boris Practice                           | ChefFlow Status                                               |
| ---------------------------------------- | ------------------------------------------------------------- |
| CLAUDE.md exists and is checked into git | Yes, comprehensive                                            |
| Update CLAUDE.md when mistakes happen    | Yes, self-maintaining document rule                           |
| Verification loops                       | Yes, Builder Gate requires Playwright, typecheck, build check |
| Parallel sessions concept                | Yes, `feedback_parallel_plan_serial_build.md` memory          |
| Plan before build                        | Yes, Planner Gate with deep inspection                        |
| Browser-based testing                    | Yes, QA tester subagent with Playwright                       |
| Team knowledge in git                    | Yes, CLAUDE.md + MEMORY.md + session-log                      |
| Post-tool-use hooks                      | Yes, build-guard.sh + notify.sh                               |
| Custom subagents                         | Yes, qa-tester agent configured                               |
| MCP server                               | Yes, PostgreSQL MCP configured                                |

### GAPS TO CLOSE (high leverage)

#### Gap 1: No Custom Slash Commands

**Boris:** Every inner-loop workflow gets a slash command in `.claude/commands/`
**ChefFlow:** Directory doesn't exist. Zero custom commands configured.
**Impact:** High. Developer repeats the same multi-step workflows (ship it, run soak, health check) by typing instructions every time.
**Recommended commands:**

- `/ship` - git add + commit + push (currently manual, described in "SHIP IT" section)
- `/soak` - run the full soak test pipeline
- `/hallucination-scan` - run the zero hallucination audit
- `/close-session` - standard session close-out
- `/pre-flight` - builder pre-flight check (tsc + build)
- `/feature-closeout` - feature close-out sequence

#### Gap 2: CLAUDE.md is 10,474 words (~15,000+ tokens)

**Boris:** "A couple thousand tokens." Delete and start fresh if bloated.
**ChefFlow:** 10,474 words. Contains rules that the model likely handles natively now (e.g., "use try/catch", "don't hardcode values"). Also contains large reference tables that could be moved to skills or child CLAUDE.md files.
**Impact:** High. Anthropic's own docs say: "If your CLAUDE.md is too long, Claude ignores half of it because important rules get lost in the noise."
**Risk:** ChefFlow's CLAUDE.md has genuinely critical rules (data safety, anti-loop, no em dashes, no OpenClaw in public) that MUST survive pruning. This is not a "delete everything" situation.
**Recommended approach:**

1. Keep critical rules (data safety, em dashes, OpenClaw, anti-loop, monetization model)
2. Move reference tables (Key File Locations, Workspace Map) to a child `docs/CLAUDE-REFERENCE.md` imported via `@docs/CLAUDE-REFERENCE.md`
3. Move gate definitions (Planner Gate, Builder Gate, Research Gate) to skills in `.claude/skills/`
4. Move architecture reminders to a child `docs/CLAUDE-ARCHITECTURE.md`
5. Test: does Claude still follow the rules after pruning?

#### Gap 3: No Plan-Mode Enforcement Mechanism

**Boris:** 80% of sessions start in Plan Mode
**ChefFlow:** Planner Gate exists as written instructions but nothing enforces starting in plan mode. An agent can skip straight to coding.
**Impact:** Medium. The instructions are there but are advisory.
**Recommended:** Add a hook or CLAUDE.md instruction: "For any task that modifies more than 3 files, start in Plan Mode and present your plan before writing code."

#### Gap 4: No CLAUDE.md Pruning Habit

**Boris:** Periodically reviews and prunes. "Do the minimal possible thing."
**ChefFlow:** Self-maintaining document rule says "add rules" but never says "prune rules."
**Impact:** Medium. The file only grows, never shrinks.
**Recommended:** Add a pruning rule: "At the end of every month, review CLAUDE.md. For each rule ask: would Claude make this mistake without this instruction? If not, remove it."
**Alternative prompt (from video):** "Update my CLAUDE.md to remove anything that's no longer needed, contradictory, duplicate information, or unnecessary bloat impacting effectiveness."

#### Gap 5: No "Verify Before Building" Instruction

**Boris:** "Before you do any work, mention how you could verify that work."
**ChefFlow:** Verification happens AFTER building (Builder Gate Final Verification). Nothing requires stating verification approach BEFORE starting.
**Impact:** Medium. Forces upfront thinking about how to prove the work is correct.
**Recommended:** Add to Builder Gate: "Before writing implementation code, state your verification plan: what you will check, how you will check it, and what success looks like."

#### Gap 6: Skills Could Replace Gate Definitions

**Boris:** Uses skills for domain-specific repeatable processes
**ChefFlow:** Only 2 skills (health, verify). The Planner Gate, Builder Gate, and Research Gate are 3 massive text blocks inside CLAUDE.md (~3,000 words) that could be skills loaded on demand.
**Impact:** Medium-high. Moving gates to skills would dramatically reduce CLAUDE.md size while keeping the rules accessible when needed.
**Recommended skills to create:**

- `planner` - full Planner Gate procedure
- `builder` - full Builder Gate procedure
- `research` - full Research Gate procedure
- `simplify` - already referenced in available skills list (confirm it exists)

### NOT WORTH ADOPTING (context-dependent)

| Boris Practice                     | Why Skip for ChefFlow                                                                                                                                                  |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Delete CLAUDE.md and start fresh" | Too risky. ChefFlow has domain-critical rules (data safety, financial model, em dashes) that are genuinely project-specific and non-obvious. Pruning yes, deleting no. |
| 5-10 web sessions in parallel      | Single developer, local machine. Current parallel planning + serial building is correct for this setup.                                                                |
| Opus with thinking for everything  | Model choice is environment-dependent. Current setup works.                                                                                                            |
| `--teleport` for device switching  | Single workstation setup. Not applicable.                                                                                                                              |

## Recommendations Ranked by Impact

| Priority | Action                                                             | Effort | Impact                                                |
| -------- | ------------------------------------------------------------------ | ------ | ----------------------------------------------------- |
| 1        | Create `.claude/commands/` with 6 slash commands                   | 30 min | High: eliminates repetitive multi-step workflows      |
| 2        | Extract reference tables and architecture to child CLAUDE.md files | 45 min | High: reduces CLAUDE.md from ~15K tokens to ~5K       |
| 3        | Convert Planner/Builder/Research Gates to skills                   | 45 min | High: further CLAUDE.md reduction + on-demand loading |
| 4        | Add "verify before building" instruction to CLAUDE.md              | 5 min  | Medium: forces upfront verification planning          |
| 5        | Add monthly pruning rule to CLAUDE.md                              | 5 min  | Medium: prevents future bloat                         |
| 6        | Add plan-mode enforcement note                                     | 5 min  | Medium: reinforces existing practice                  |

## Builder Handoff

### Execution Order (dependency-aware)

**Phase 1: Create slash commands** (no dependencies, immediate value)

1. Create `.claude/commands/` directory
2. Create each command file (ship.md, soak.md, hallucination-scan.md, close-session.md, pre-flight.md, feature-closeout.md)
3. Each command encodes the exact steps from the corresponding CLAUDE.md section
4. Verify commands work by running one

**Phase 2: Extract reference content to child files** (prerequisite for Phase 3)

1. Create `docs/CLAUDE-REFERENCE.md` with Key File Locations + Workspace Map tables
2. Create `docs/CLAUDE-ARCHITECTURE.md` with Architecture Reminders + Implementation Patterns
3. Replace those sections in CLAUDE.md with `@docs/CLAUDE-REFERENCE.md` and `@docs/CLAUDE-ARCHITECTURE.md` imports
4. Verify Claude still reads the imported content correctly

**Phase 3: Convert gates to skills** (depends on Phase 2 completing)

1. Create `.claude/skills/planner/SKILL.md` with full Planner Gate content
2. Create `.claude/skills/builder/SKILL.md` with full Builder Gate content
3. Create `.claude/skills/research/SKILL.md` with full Research Gate content
4. Remove gate text from CLAUDE.md, replace with brief reference: "Use /planner, /builder, or /research skills for gate procedures"
5. Verify skills load correctly when invoked

**Phase 4: Add new rules to CLAUDE.md** (after pruning is done)

1. Add "verify before building" instruction to Builder section
2. Add monthly pruning rule to Self-Maintaining Document section
3. Add plan-mode enforcement note

**Regression risks:**

- Phase 2-3: If `@import` syntax doesn't work as expected, critical rules could become invisible. Test thoroughly.
- Phase 3: If skills don't auto-load for the right agent types, gates won't be enforced. Must verify.
- All phases: CLAUDE.md changes require re-reading to confirm nothing critical was lost.

**Must NOT change:**

- Data Safety section (stays in CLAUDE.md, never extracted)
- Anti-Loop Rule (stays in CLAUDE.md)
- No Em Dashes rule (stays in CLAUDE.md)
- No OpenClaw in Public rule (stays in CLAUDE.md)
- Zero Hallucination Rule (stays in CLAUDE.md)
- Monetization Model (stays in CLAUDE.md)
- No Forced Onboarding Gates (stays in CLAUDE.md)
