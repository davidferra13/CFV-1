# Exit Eval Swarm Recovery State

> **Updated:** 2026-05-26
> **Status:** COMPLETE (76/76). Final 11 lanes were dispatched, written, verified, and synthesized into `docs/exit-system-roadmap.md`.

## Disk Reality

| Role      | On Disk | Expected | Missing  |
| --------- | ------- | -------- | -------- |
| Chef      | 18      | 18       | NONE     |
| Client    | 13      | 13       | NONE     |
| Admin     | 9       | 9        | NONE     |
| Guest     | 10      | 10       | NONE     |
| Partner   | 10      | 10       | NONE     |
| Vendor    | 7       | 7        | NONE     |
| Staff     | 9       | 9        | NONE     |
| **Total** | **76**  | **76**   | **NONE** |

## Completion Verification

- Role file counts: Chef 18, Client 13, Admin 9, Guest 10, Partner 10, Vendor 7, Staff 9.
- Prompt/output cross-check: 76/76 prompts have output files.
- Scenario cross-check: 489/489 scenario sections present.
- `docs/exit-evals/RUNNER.md` marks all 76 prompt rows `DONE`.
- `docs/exit-system-roadmap.md` contains the full-corpus synthesis and build-roadmap seeds.

## Historical Dispatch Template

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

## Completed Actions

1. Updated `docs/exit-evals/RUNNER.md` status for all prompts.
2. Synthesized all role outputs into `docs/exit-system-roadmap.md`.
3. Aggregated reclassification scores across all 489 scenarios.

## Key Learnings

- 76 simultaneous agents: ~74% failure rate (silent deaths)
- 12-agent waves: 100% success rate (Waves A, B, C all perfect)
- Pattern across completed evals: most gaps are "UI surfacing of existing backend" not missing architecture
- ChefFlow infrastructure is remarkably deep across all roles
