# Exit Eval Swarm Recovery State

> **Updated:** 2026-05-25 (end of session)
> **Status:** 86% complete (65/76). 11 remaining.

## Disk Reality (verified post-Wave-D commit f6dde85e6)

| Role      | On Disk | Expected | Missing                                   |
| --------- | ------- | -------- | ----------------------------------------- |
| Chef      | 18      | 18       | NONE                                      |
| Client    | 13      | 13       | NONE                                      |
| Admin     | 9       | 9        | NONE                                      |
| Guest     | 10      | 10       | NONE                                      |
| Partner   | 9       | 10       | #51 (account-claiming-access)             |
| Vendor    | 6       | 7        | #66 (communication-disputes-relationship) |
| Staff     | 0       | 9        | #68-76 (all 9)                            |
| **Total** | **65**  | **76**   | **11 missing**                            |

## To Resume

1. Glob each role dir under `docs/exit-evals/` to get actual file count
2. Cross-reference against 76 prompts in `docs/exit-evals/prompts/`
3. Dispatch missing evals in batches of 10-12 (100% success rate at this size)
4. Use template below

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

## After All 76 Complete

1. Update `docs/exit-evals/RUNNER.md` status for all prompts
2. Run synthesis to produce exit-eval roadmap
3. Aggregate reducibility scores across all 489 scenarios

## Key Learnings

- 76 simultaneous agents: ~74% failure rate (silent deaths)
- 12-agent waves: 100% success rate (Waves A, B, C all perfect)
- Pattern across completed evals: most gaps are "UI surfacing of existing backend" not missing architecture
- ChefFlow infrastructure is remarkably deep across all roles
