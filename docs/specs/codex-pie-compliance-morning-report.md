# Codex Build Spec: PIE Compliance in Hermes Morning Reports

> **Priority:** P1 - Compliance code exists but nobody sees the results
> **Risk:** LOW - additive, wiring existing module to existing report system
> **Estimated scope:** ~100 lines across 2 files

## Context

`lib/pricing/pie-compliance.ts` (214 lines) checks all 13 PIE Laws and returns a `PieComplianceReport` with per-law status (passing/warning/violation/catastrophic). This data exists but is not surfaced anywhere daily.

Hermes generates morning reports in `docs/hermes/`. PIE compliance should be included.

## What to Build

### 1. PIE compliance summary generator

Create `scripts/pie-compliance-report.mjs` that:

- Calls the compliance check against the production database
- Formats results as a markdown section
- Outputs to stdout (Hermes pipes this into the morning report)

Format:

```markdown
## PIE Compliance (Law Check)

| Law | Name               | Status | Metric         | Target |
| --- | ------------------ | ------ | -------------- | ------ |
| 1   | Total Autonomy     | PASS   | 0 human inputs | 0      |
| 2   | Universal Coverage | WARN   | 62% coverage   | 95%    |
| ... | ...                | ...    | ...            | ...    |

**Overall: WARNING** (2 violations, 3 warnings)
**Census:** 143K ingredients, XX regions, XX% cells filled
```

### 2. Integration point

Add the script to whatever Hermes cron job generates the morning report. Look at:

- `docs/hermes/` for existing report format
- Pi crontab for the Hermes morning job
- The script should be callable standalone: `node scripts/pie-compliance-report.mjs`

### 3. Alert escalation

If any law is "catastrophic":

- Print `CRITICAL: PIE Law X (Name) is CATASTROPHIC` to stderr
- Exit code 1 (so cron job can trigger notification)

If all laws passing:

- Print clean summary
- Exit code 0

## Do NOT Modify

- `lib/pricing/pie-compliance.ts` (the compliance logic itself)
- Hermes core architecture

## Acceptance Criteria

- `node scripts/pie-compliance-report.mjs` produces clean markdown table
- Catastrophic laws cause exit code 1
- All-pass produces exit code 0
- Script can run standalone (has its own DB connection setup)
