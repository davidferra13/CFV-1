# Build Spec: Report Normalization + Categorization Fix

**Priority:** P0 (fragile parsing causes data loss in synthesis)
**Files to modify:** `devtools/persona-batch-synthesizer.mjs`
**Files to create:** `devtools/normalize-reports.mjs`
**Files to migrate:** 5 files in `docs/stress-tests/`
**Test command:** `npm run personas:synthesize`

---

## Problem

There are 7 persona stress test reports in `docs/stress-tests/` using **3 incompatible formats**. Only 2 (Kai, Maya) match the canonical v2 spec. The other 5 use different heading styles, score locations, gap formats, and metadata. This causes:

1. Dashboard parsing requires fragile multi-regex fallbacks
2. Synthesizer categorization misses gaps (15 end up "uncategorized")
3. Any new tooling must handle 3+ formats forever

This spec normalizes all reports to one format AND fixes categorization.

---

## Canonical Format (from `docs/specs/persona-pipeline-v2.md` lines 96-142)

```markdown
# Persona Stress Test: {Human Name}

**Type:** Chef
**Date:** 2026-04-25
**Method:** local-ollama-v2

## Summary

{2-3 sentences}

## Score: {N}/100

- Workflow Coverage (0-40): {score} -- {reason}
- Data Model Fit (0-25): {score} -- {reason}
- UX Alignment (0-15): {score} -- {reason}
- Financial Accuracy (0-10): {score} -- {reason}
- Onboarding Viability (0-5): {score} -- {reason}
- Retention Likelihood (0-5): {score} -- {reason}

## Top 5 Gaps

### Gap 1: {title}

**Severity:** HIGH
{2-3 sentences}

### Gap 2: {title}

**Severity:** HIGH
{2-3 sentences}

(repeat for gaps 3-5)

## Quick Wins

1. {one-line}
2. {one-line}
3. {one-line}

## Verdict

{one sentence}
```

---

## Part 1: Migration Script

**File to create:** `devtools/normalize-reports.mjs`

This script reads each non-canonical report, extracts the semantic content, and rewrites it in canonical format. Run once, verify diffs, commit.

### Files to migrate and their specific issues

| File                                                                 | Issues                                                                                                                                                                                                                                         |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `persona-noah-kessler-2026-04-25.md`                                 | No metadata. `## Persona Summary` not `## Summary`. Score at bottom after Quick Wins. Gaps as numbered bold items, no severity, structured bullet sub-items. 5 quick wins with file/change/why details.                                        |
| `persona-rina-solis-2026-04-25.md`                                   | Metadata as `##` headings (`## Generated:`, `## Type:`). `## Persona Summary`. Score at bottom. Gaps as numbered bold, no severity. `## Quick Wins Found`. 5 detailed quick wins.                                                              |
| `persona-leo-varga-2026-04-25.md`                                    | Same as Rina. Metadata as `##` headings. Score at bottom. Gaps as numbered bold. 5 detailed quick wins.                                                                                                                                        |
| `persona-dr-julien-armand-michelin-2026-04-25.md`                    | Em dash in title. Numbered sections (`## 1) Persona Summary`). Capability Fit as TABLE. Score as `**68 / 100**` under `## 5) Score`. Gaps as plain numbered list, no severity. Quick wins with `_Why_:` italic. `## Build Follow-Up` appendix. |
| `persona-jordan-hale-cannabis-culinary-director-multi-2026-04-25.md` | No metadata. `## Persona Summary`. Score at bottom. Gaps as numbered bold with `- Why it matters:` sub-items. `## Build Follow-Up - Gap N` appendix sections.                                                                                  |

### Migration logic per file

For each non-canonical file:

1. **Extract name** from H1 (strip "Persona Stress Test", colon/em dash, trim)
2. **Extract date** from `**Date:**`, `## Generated:`, or filename date pattern
3. **Extract summary** from `## Summary`, `## Persona Summary`, or `## 1) Persona Summary`
4. **Extract score** from `## Score: N/100` or `**N / 100**`
5. **Extract sub-scores**: If original has sub-scores (even in different format), map them to the 6 canonical categories. If original uses 4 categories, distribute proportionally. If no sub-scores, estimate from the total score and gap analysis.
6. **Extract 5 gaps**: Parse from `### Gap N:`, numbered bold items, or plain numbered list. For each gap:
   - Keep the title
   - Assign severity: if original has severity, keep it. If not, infer from language ("critical"/"broken"/"no X exists" = HIGH, "partial"/"limited" = MEDIUM, "minor"/"cosmetic" = LOW). Default HIGH if unclear.
   - Condense description to 2-3 sentences (drop file paths, effort estimates, structured bullets)
7. **Extract quick wins**: Take first 3, condense each to one line
8. **Extract verdict**: Take first sentence of verdict section
9. **Preserve non-spec sections** (Capability Fit, Build Follow-Up) in an appendix section at the bottom:
   ```markdown
   ---

   ## Appendix (preserved from original report)

   {original content}
   ```
10. **Write** the normalized file, overwriting the original

### Important rules

- **Back up originals first.** Before overwriting, copy all 5 files to `docs/stress-tests/archive/` with `-original` suffix.
- **Do NOT touch Kai or Maya's files** (they already match canonical format, except Maya's slug-name issue which was already fixed in the dashboard).
- Actually, fix Maya's H1 from `# Persona Stress Test: maya-rios-cannabis-pastry-chef-micro` to `# Persona Stress Test: Maya Rios`. The name "Maya Rios" is the persona name; the rest is descriptor.
- **Line endings**: Write with `\n` (Unix), not `\r\n`.

### Usage

```bash
# Dry run (show what would change)
node devtools/normalize-reports.mjs --dry-run

# Execute
node devtools/normalize-reports.mjs

# Verify
git diff docs/stress-tests/
```

### Acceptance criteria

- All 7 files in `docs/stress-tests/persona-*.md` pass this regex check:
  ```
  /^# Persona Stress Test: .+\n\*\*Type:\*\*.+\n\*\*Date:\*\*.+\n/
  /## Score: \d+\/100/
  /### Gap [1-5]: .+\n\*\*Severity:\*\* (?:HIGH|MEDIUM|LOW)/
  ```
- Original content preserved in appendix sections
- Backups exist in `docs/stress-tests/archive/`
- `git diff` shows no data loss (scores unchanged, gap titles unchanged)

---

## Part 2: Fix Categorization in Batch Synthesizer

**File:** `devtools/persona-batch-synthesizer.mjs`

### Problem 1: Threshold too high

**Lines 367-373:** First pass requires `hits >= 2` (two different keywords from same category must appear in gap title + description). Short gap titles often have only 1 keyword.

**Fix:** Lower threshold to `hits >= 1` for the first pass. The multi-word keyword fallback becomes unnecessary.

```js
// Before (line 371):
if (hitCount >= 2) matches.push({ category: cat.id, hits: hitCount })

// After:
if (hitCount >= 1) matches.push({ category: cat.id, hits: hitCount })
```

### Problem 2: Fallback ignores single-word keywords

**Lines 375-385:** The fallback only checks multi-word keywords (`kw.includes(' ')`). Since most keywords are single-word, the fallback almost never rescues anything.

**Fix:** With threshold lowered to 1, delete the fallback entirely (lines 375-385). It's no longer needed.

### Problem 3: Missing keywords for common gap themes

Add keywords to these categories:

| Category              | Add Keywords                                                    |
| --------------------- | --------------------------------------------------------------- |
| `recipe-menu`         | `planner`, `builder`, `pairing`, `provisioning`                 |
| `scheduling-calendar` | `offline`, `sync`, `conflict-safe`, `real-time`                 |
| `sourcing-supply`     | `store`, `market`, `route`, `cart`, `optimizer`, `availability` |
| `payment-financial`   | `price`, `freshness`, `contract`, `real-time`                   |
| `compliance-legal`    | `traceability`, `evidence`, `cockpit`, `governance`             |
| `staffing-team`       | `multi-chef`, `director`, `governance`, `cross-event`           |
| `reporting-analytics` | `outcome`, `intelligence`, `longitudinal`, `telemetry`          |
| `scaling-multi`       | `multi-event`, `charter`, `voyage`, `roster`, `churn`           |
| `onboarding-ux`       | `safety command`, `safe-only`, `reaction log`                   |
| `dosing-cannabis`     | `tolerance`, `dose-curve`, `molecule`, `batch lineage`          |

### Problem 4: "uncategorized" as a category has highest priority score (42)

The 15 uncategorized gaps are a symptom, not a category. After fixing the keyword matching, re-run synthesis and verify that the uncategorized count drops significantly.

### Acceptance criteria

After fixes:

```bash
npm run personas:synthesize
cat system/persona-batch-synthesis/saturation.json | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log('Uncategorized:',j.categories.uncategorized.count)})"
```

- Uncategorized count drops from 6 to 2 or fewer
- Categories previously at 0 (`communication`, `staffing-team`, `costing-margin`, `reporting-analytics`, `onboarding-ux`, `scaling-multi`, `delivery-logistics`) should gain at least 2-3 hits
- No gaps that clearly belong to a category end up uncategorized

---

## What NOT to change

- Do NOT modify the dashboard (`persona-inbox-server.mjs`)
- Do NOT modify the analyzer, validator, planner, or orchestrator
- Do NOT modify production code
- Do NOT delete any files (only overwrite reports after backing up)
- Do NOT run `drizzle-kit push`
