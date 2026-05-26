# Exit Eval Swarm Recovery State

> **Updated:** 2026-05-25
> **Status:** Wave D running, Wave E not yet dispatched

## Overall Progress: ~57/76 written

### Wave A (COMPLETE - 12/12)

Chef 05, 13 + Client 20-29. All files written.

### Wave B (COMPLETE - 12/12)

Client 30-31, Admin 32-36/39-40, Guest 41-43. All files written.

### Wave C (11/12 - Partner #51 FAILED)

Guest 44-50, Partner 52-55. All written EXCEPT Partner #51 (account-claiming-access).

### Wave D (IN FLIGHT - 11 agents, partial completions)

Partner 56-60 + Vendor 61-63, 65-67.

**Confirmed written from Wave D:**

- Partner 56 (commission-payouts-money.md) - DONE

**Possibly failed (truncated results):**

- Vendor 66 (communication-disputes) - suspicious, verify file exists

**Still running when session ended:**

- Partner 57, 58, 59, 60
- Vendor 61, 62, 63, 65, 67

### Wave E (NOT DISPATCHED - 10 agents)

- Staff 68-76 (9 agents)
- Partner 51 retry (1 agent)

## To Resume

1. Check `docs/exit-evals/` for actual files written (glob each role dir)
2. Cross-reference against the 76 prompts in `docs/exit-evals/prompts/`
3. Dispatch missing evals in batches of 10-12 (haiku model, auto mode, background)
4. Each agent reads its prompt file at `docs/exit-evals/prompts/[NN]-[name].md` and executes

## Agent Dispatch Template

```
You are running an exit-eval for ChefFlow. Read and execute this prompt file exactly: `docs/exit-evals/prompts/[FILE]`

Steps:
1. Read the prompt file for instructions, rubric reference, and output location
2. Read the rubric at `.claude/skills/exit-eval/SKILL.md`
3. Read the source scenarios from `docs/research/[ROLE]-exit-points-analysis.md`
4. Read the companion `docs/research/[ROLE]-never-leaves-analysis.md`
5. For each scenario, grep/read relevant `lib/` and `app/` code
6. Apply the 7-question rubric to each scenario
7. Write output to the file specified in the prompt
8. Do NOT update the roadmap file

Write thorough, evidence-based evaluations. Reference specific files/functions.
```

Model: haiku, mode: auto, run_in_background: true

## Key Findings So Far

- 100% success rate with 12-agent waves (vs 26% with 76 simultaneous)
- Average completion time: 8-12 minutes per agent
- Pattern: most gaps are "UI surfacing of existing backend" not missing architecture
- ChefFlow's infrastructure is remarkably deep across all roles
