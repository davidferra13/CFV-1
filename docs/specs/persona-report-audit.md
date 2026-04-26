# Build Spec: Report Quality Auditor

> Codex task. Create ONE new file. No modifications to existing files.

## What This Does

Creates `devtools/persona-report-audit.mjs` - scans all stress test reports in `docs/stress-tests/`, scores their quality, and identifies reports that need to be re-analyzed. Outputs a ranked list showing which reports are garbage and should be re-run.

## File To Create

`devtools/persona-report-audit.mjs`

## CLI Interface

```
node devtools/persona-report-audit.mjs                # audit all reports
node devtools/persona-report-audit.mjs --rerun        # print re-run commands for bad reports
```

## Algorithm

### Step 1: Scan Reports

Read all files matching `docs/stress-tests/persona-*.md`. Parse filename for slug and date.

### Step 2: Score Each Report's Quality

For each report, compute a quality score (0-100) based on these checks:

```js
function auditReport(text, slug) {
  let quality = 0
  const checks = []

  // 1. Has a proper title (## or # with persona name) - 10 points
  if (/^#\s+Persona Stress Test/im.test(text)) {
    quality += 10
    checks.push({ name: 'title', pass: true })
  } else {
    checks.push({ name: 'title', pass: false, reason: 'Missing "# Persona Stress Test" header' })
  }

  // 2. Has a score line (## Score: N/100) - 10 points
  const scoreMatch = /##\s*(?:\d+\)\s*)?Score[:\s]*\**(\d+)\s*\/\s*100\**/i.exec(text)
  if (scoreMatch) {
    quality += 10
    checks.push({ name: 'score', pass: true, value: parseInt(scoreMatch[1], 10) })
  } else {
    checks.push({ name: 'score', pass: false, reason: 'No "## Score: N/100" found' })
  }

  // 3. Has 3+ properly titled gaps (### Gap N: Title with 5+ chars) - 20 points
  const gapHeaders = text.match(/###\s*Gap\s*\d+:\s*.{5,}/gi) || []
  if (gapHeaders.length >= 3) {
    quality += 20
    checks.push({ name: 'gap_headers', pass: true, count: gapHeaders.length })
  } else {
    // Also check for numbered list format: 1. **Title**
    const numberedGaps = text.match(/^\s*\d+\.\s+\*\*.{5,}\*\*/gm) || []
    if (numberedGaps.length >= 3) {
      quality += 15
      checks.push({
        name: 'gap_headers',
        pass: true,
        count: numberedGaps.length,
        format: 'numbered',
      })
    } else {
      checks.push({
        name: 'gap_headers',
        pass: false,
        count: gapHeaders.length + numberedGaps.length,
        reason: 'Fewer than 3 properly titled gaps',
      })
    }
  }

  // 4. Gap titles are descriptive (average title length > 20 chars) - 15 points
  const allGapTitles = []
  const gapTitlePattern = /###\s*Gap\s*\d+:\s*(.+)/gi
  let m
  while ((m = gapTitlePattern.exec(text)) !== null) {
    allGapTitles.push(m[1].trim())
  }
  // Also check numbered format
  const numberedPattern = /^\s*\d+\.\s+\*\*(.+?)\*\*/gm
  while ((m = numberedPattern.exec(text)) !== null) {
    allGapTitles.push(m[1].trim())
  }

  if (allGapTitles.length > 0) {
    const avgLen = allGapTitles.reduce((s, t) => s + t.length, 0) / allGapTitles.length
    if (avgLen > 20) {
      quality += 15
      checks.push({ name: 'title_quality', pass: true, avg_length: Math.round(avgLen) })
    } else {
      checks.push({
        name: 'title_quality',
        pass: false,
        avg_length: Math.round(avgLen),
        reason: 'Gap titles too short (avg < 20 chars)',
      })
    }
  } else {
    checks.push({ name: 'title_quality', pass: false, reason: 'No gap titles found' })
  }

  // 5. Has severity markers (HIGH/MEDIUM/LOW) - 10 points
  const severityCount = (text.match(/\b(HIGH|MEDIUM|LOW)\b/g) || []).length
  if (severityCount >= 3) {
    quality += 10
    checks.push({ name: 'severity_markers', pass: true, count: severityCount })
  } else {
    checks.push({
      name: 'severity_markers',
      pass: false,
      count: severityCount,
      reason: 'Fewer than 3 severity markers',
    })
  }

  // 6. Has Quick Wins section - 10 points
  if (/##\s*(?:\d+\)\s*)?Quick Wins/i.test(text)) {
    quality += 10
    checks.push({ name: 'quick_wins', pass: true })
  } else {
    checks.push({ name: 'quick_wins', pass: false, reason: 'No "## Quick Wins" section' })
  }

  // 7. Has Verdict section - 10 points
  if (/##\s*(?:\d+\)\s*)?(?:Two-Sentence\s+)?Verdict/i.test(text)) {
    quality += 10
    checks.push({ name: 'verdict', pass: true })
  } else {
    checks.push({ name: 'verdict', pass: false, reason: 'No "## Verdict" section' })
  }

  // 8. Report length > 1000 chars (not a stub) - 10 points
  if (text.length > 1000) {
    quality += 10
    checks.push({ name: 'length', pass: true, chars: text.length })
  } else {
    checks.push({
      name: 'length',
      pass: false,
      chars: text.length,
      reason: 'Report too short (< 1000 chars)',
    })
  }

  // 9. No single-word gap titles (quality penalty) - 5 points
  const singleWordTitles = allGapTitles.filter((t) => /^[A-Za-z]+:?\s*$/.test(t))
  if (singleWordTitles.length === 0) {
    quality += 5
    checks.push({ name: 'no_junk_titles', pass: true })
  } else {
    checks.push({
      name: 'no_junk_titles',
      pass: false,
      junk: singleWordTitles,
      reason: `${singleWordTitles.length} single-word gap titles`,
    })
  }

  return { slug, quality, checks }
}
```

### Step 3: Sort and Display

Sort reports by quality ascending (worst first). Display:

```
=== Persona Report Quality Audit ===

  #  Slug                                       Quality  Issues
  1  000-wp1-reliability-test-chef                 10/100  gap_headers, title_quality, severity_markers, quick_wins, verdict, no_junk_titles
  2  alexander-davenport                           25/100  gap_headers, title_quality, severity_markers, no_junk_titles
  3  elena-ruiz                                    25/100  gap_headers, title_quality, severity_markers, no_junk_titles
  ...
 18  kai-donovan                                   95/100  (clean)
 19  leo-varga                                     95/100  (clean)

Summary:
  Total reports: 19
  Good (80+): 8
  Needs re-analysis (40-79): 5
  Garbage (<40): 6

Re-run candidates (quality < 60):
  000-wp1-reliability-test-chef, alexander-davenport, elena-ruiz, ethan-calder, malik-johnson, marcus-hale
```

### Step 4: Print Re-run Commands (--rerun flag)

When `--rerun` is passed, also print the exact commands to re-analyze garbage reports:

```
## Re-run Commands (paste these to re-analyze garbage reports)

node devtools/persona-analyzer.mjs "Chef Flow Personas/Completed/Chef/000 Wp1 Reliability Test Chef.txt" --model gemma4:e4b
node devtools/persona-analyzer.mjs "Chef Flow Personas/Completed/Chef/Alexander Davenport.txt" --model gemma4:e4b
...
```

To find the persona source file for each slug:

- Scan `Chef Flow Personas/Completed/` recursively for `.txt` and `.md` files
- Match by slugifying the filename (lowercase, replace spaces with hyphens, strip non-alphanumeric)
- If no source file found, print: `# SKIP: No source file found for {slug}`

### Step 5: Write Audit Report

Write the full audit to `system/persona-report-audit.json`:

```json
{
  "generated_at": "2026-04-26T12:00:00.000Z",
  "total_reports": 19,
  "good_count": 8,
  "reanalysis_count": 5,
  "garbage_count": 6,
  "reports": [
    {
      "slug": "000-wp1-reliability-test-chef",
      "date": "2026-04-26",
      "quality": 10,
      "checks": [ ... ],
      "recommendation": "re-analyze"
    }
  ],
  "rerun_slugs": ["000-wp1-reliability-test-chef", "alexander-davenport", ...]
}
```

Recommendation values: `"good"` (80+), `"re-analyze"` (40-79), `"garbage"` (<40)

## Implementation Rules

1. This is a NEW standalone file. Do NOT modify any existing files.
2. Use only Node.js built-in modules: `fs`, `path`, `url`
3. ROOT is resolved from `__dirname` up one level
4. Use `#!/usr/bin/env node` shebang
5. Copy the `auditReport` function from this spec EXACTLY. Do not simplify or modify the quality checks.
6. Progress to stderr, report to stdout.
7. Create `system/` directory write path if needed.
8. If no reports found, print error and exit 1.

## Do NOT

- Import from any other devtools script
- Modify any existing file
- Add npm dependencies
- Call Ollama or any external API
- Run child processes
- Delete or modify any report files
