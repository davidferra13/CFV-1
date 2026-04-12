# ChefFlow Memory Palace Sweep
# Runs hourly via Windows Task Scheduler
# Reads all local memory files + repo docs, writes findings to docs/autodocket.md

$ErrorActionPreference = "Stop"
$repoRoot = "C:\Users\david\Documents\CFv1"
$logFile = "$repoRoot\logs\memory-sweep.log"

function Log($msg) {
    $ts = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    $line = "[$ts] $msg"
    Write-Host $line
    Add-Content -Path $logFile -Value $line
}

Log "Memory sweep starting..."

$prompt = @'
You are a ChefFlow memory palace sweep agent. Run this exact procedure:

## STEP 1: Read all memory sources

Read every file in these locations (use Glob then Read each):
- C:\Users\david\.claude\projects\c--Users-david-Documents-CFv1\memory\ (ALL .md files)
- C:\Users\david\Documents\CFv1\memory\ (ALL .md files)
- C:\Users\david\Documents\CFv1\MEMORY.md
- C:\Users\david\Documents\CFv1\docs\product-blueprint.md
- C:\Users\david\Documents\CFv1\docs\build-state.md
- C:\Users\david\Documents\CFv1\docs\app-complete-audit.md (first 500 lines)
- C:\Users\david\Documents\CFv1\docs\session-log.md (last 100 lines)
- All .md files in C:\Users\david\Documents\CFv1\docs\session-digests\ (last 8 by modified date)
- All .md files in C:\Users\david\Documents\CFv1\docs\specs\ (use Glob first)

## STEP 2: Classify every gap you find

Categories:
- UNBUILT: discussed/established in memory or specs, no matching code in app/ components/ lib/
- PARTIAL: code exists but incomplete, has TODO/placeholder/commented section
- TEST_GAP: test file exists or was mentioned but failing, skipped, or untested feature
- SPEC_ONLY: spec file in docs/specs/ with zero corresponding implementation
- CONTRADICTION: two memory entries or memory vs code say opposite things
- STALE: memory entry references file/feature that no longer exists

Each finding needs:
- Category + short title
- Evidence: exact file path + brief quote proving it was established
- Gap: what specifically is missing
- Effort: SMALL (<1h) / MEDIUM (1-4h) / LARGE (4h+)
- Priority: P0 / P1 / P2 (use language from source: "launch requirement" = P0, "active" = P1, etc.)

## STEP 3: Append to C:\Users\david\Documents\CFv1\docs\autodocket.md

If the file does not exist, create it with this header first:
```
# ChefFlow Autodocket

Hourly memory palace sweep. Append-only. Do not edit manually.

```

Then append exactly this block:

```
---
## Sweep: [current UTC ISO timestamp]

### Summary
- UNBUILT: N | PARTIAL: N | TEST_GAP: N | SPEC_ONLY: N | CONTRADICTION: N | STALE: N
- Top priority items: [list top 3 titles]

### Findings

#### [CATEGORY] [Title]
- **Evidence:** [file path - quote]
- **Gap:** [what is missing]
- **Effort:** SMALL/MEDIUM/LARGE
- **Priority:** P0/P1/P2

[one card per finding, no padding]

### Contradictions
[list contradictions found, or "None"]

### Stale Entries
[list stale memory entries, or "None"]

---
```

## RULES
- Be exhaustive. This is the developer's master backlog. Do not skip anything.
- Every finding must cite real evidence from the files you read. No speculation.
- Do NOT fix, build, or modify any code. Read + analyze + write autodocket only.
- Do NOT commit anything. Just write the file.
'@

Set-Location $repoRoot

try {
    # Run claude CLI with the sweep prompt
    & "C:\Users\david\AppData\Roaming\npm\claude.cmd" `
        --print `
        --allowedTools "Read,Write,Edit,Glob,Grep" `
        $prompt

    Log "Sweep complete. Check docs/autodocket.md"
} catch {
    Log "ERROR: $_"
    exit 1
}
