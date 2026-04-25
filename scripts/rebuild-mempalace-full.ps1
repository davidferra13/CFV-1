# MemPalace Full Rebuild + ChatGPT Ingestion
#
# INSTRUCTIONS:
#   1. Close Claude Code (releases ChromaDB locks)
#   2. Open a plain PowerShell terminal
#   3. cd C:\Users\david\Documents\CFv1
#   4. powershell -ExecutionPolicy Bypass -File scripts\rebuild-mempalace-full.ps1
#
# This script runs sequentially. Each step waits for completion before the next.
# If interrupted, re-run it. It skips steps that already completed (resume-safe).
#
# Total time estimate: 30-90 minutes depending on conversation sizes.

$ErrorActionPreference = "Continue"
$env:PYTHONIOENCODING = "utf-8"

$ROOT = "C:\Users\david\Documents\CFv1"
$PALACE = "C:\Users\david\.mempalace\palace2"
$PROGRESS_FILE = "$ROOT\.chatgpt-ingestion\rebuild-progress.json"
$LOG_FILE = "$ROOT\.chatgpt-ingestion\rebuild-log.txt"

Set-Location $ROOT

function Log($msg) {
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$ts] $msg"
    Write-Host $line
    Add-Content -Path $LOG_FILE -Value $line
}

function Get-Progress {
    if (Test-Path $PROGRESS_FILE) {
        return (Get-Content $PROGRESS_FILE | ConvertFrom-Json)
    }
    return @{ completedSteps = @() }
}

function Save-Progress($stepName) {
    $progress = Get-Progress
    $steps = [System.Collections.ArrayList]@($progress.completedSteps)
    if ($stepName -notin $steps) { $steps.Add($stepName) | Out-Null }
    @{ completedSteps = $steps; lastUpdated = (Get-Date -Format "o") } | ConvertTo-Json | Set-Content $PROGRESS_FILE
}

function Step-Done($stepName) {
    $progress = Get-Progress
    return ($stepName -in $progress.completedSteps)
}

function Run-Mine($stepName, $description, $dir, $extraArgs) {
    if (Step-Done $stepName) {
        Log "SKIP: $description (already done)"
        return
    }

    Log "START: $description"
    Log "  Command: py -m mempalace mine $dir $extraArgs"

    $startTime = Get-Date

    try {
        $argList = @("mine", $dir) + ($extraArgs -split " " | Where-Object { $_ })
        $output = & py -m mempalace @argList 2>&1
        $exitCode = $LASTEXITCODE

        # Log output
        $output | ForEach-Object { Log "  $_" }

        if ($exitCode -eq 0) {
            $elapsed = (Get-Date) - $startTime
            Log "DONE: $description (${elapsed.TotalMinutes:N1} minutes)"
            Save-Progress $stepName
        } else {
            Log "FAIL: $description (exit code $exitCode)"
            Log "  Continuing to next step..."
        }
    } catch {
        Log "ERROR: $description - $_"
        Log "  Continuing to next step..."
    }
}

# ============================================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MemPalace Full Rebuild + ChatGPT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check no other Python/mempalace is running
$pythonProcs = Get-Process python -ErrorAction SilentlyContinue
if ($pythonProcs) {
    Write-Host "WARNING: Python processes detected:" -ForegroundColor Yellow
    $pythonProcs | ForEach-Object { Write-Host "  PID $($_.Id) - $($_.WorkingSet64 / 1MB)MB" }
    Write-Host ""
    $confirm = Read-Host "These may hold ChromaDB locks. Continue anyway? (y/N)"
    if ($confirm -ne "y") {
        Write-Host "Aborted. Kill Python processes first, then re-run."
        exit 1
    }
}

# ============================================================
# Step 0: Wipe corrupted palace
# ============================================================
if (-not (Step-Done "wipe")) {
    Log "STEP 0: Wiping corrupted palace..."

    if (Test-Path $PALACE) {
        Remove-Item -Recurse -Force $PALACE -ErrorAction SilentlyContinue
        if (Test-Path $PALACE) {
            Log "FAIL: Cannot delete $PALACE (files locked). Close all Python processes."
            exit 1
        }
    }
    New-Item -ItemType Directory -Path $PALACE -Force | Out-Null

    # Also wipe palace1 if it exists
    $PALACE1 = "C:\Users\david\.mempalace\palace"
    if (Test-Path $PALACE1) {
        Remove-Item -Recurse -Force $PALACE1 -ErrorAction SilentlyContinue
    }
    New-Item -ItemType Directory -Path $PALACE1 -Force | Out-Null

    Log "  Palace wiped clean."
    Save-Progress "wipe"
}

# ============================================================
# Step 1: Mine CFv1 project files (~10K drawers)
# ============================================================
Run-Mine "project-files" "Mining CFv1 project files" "." ""

# ============================================================
# Step 2: Mine Claude Code sessions
# ============================================================
$claudeSessionDir = "C:\Users\david\.claude\projects\c--Users-david-Documents-CFv1"
if (Test-Path $claudeSessionDir) {
    Run-Mine "claude-sessions" "Mining Claude Code sessions" $claudeSessionDir "--mode convos --extract general --wing chefflow-conversations"
} else {
    Log "SKIP: Claude sessions dir not found at $claudeSessionDir"
}

# ============================================================
# Step 3-8: Mine ChatGPT conversation batches (ONE AT A TIME)
# ============================================================
$batches = @(
    @{ name = "chatgpt-batch-001"; dir = ".chatgpt-ingestion\batch-001"; desc = "ChatGPT batch 1 (200 conversations)" },
    @{ name = "chatgpt-batch-002"; dir = ".chatgpt-ingestion\batch-002"; desc = "ChatGPT batch 2 (200 conversations)" },
    @{ name = "chatgpt-batch-003"; dir = ".chatgpt-ingestion\batch-003"; desc = "ChatGPT batch 3 (200 conversations)" },
    @{ name = "chatgpt-batch-004"; dir = ".chatgpt-ingestion\batch-004"; desc = "ChatGPT batch 4 (142 conversations)" },
    @{ name = "chatgpt-batch-005"; dir = ".chatgpt-ingestion\batch-005-promoted"; desc = "ChatGPT batch 5 - promoted (200 conversations)" },
    @{ name = "chatgpt-batch-006"; dir = ".chatgpt-ingestion\batch-006-promoted"; desc = "ChatGPT batch 6 - promoted (141 conversations)" }
)

foreach ($batch in $batches) {
    if (Test-Path $batch.dir) {
        Run-Mine $batch.name $batch.desc $batch.dir "--mode convos --extract general --wing chatgpt-conversations --agent chatgpt-ingestion"
    } else {
        Log "SKIP: $($batch.desc) - directory not found: $($batch.dir)"
    }
}

# ============================================================
# Step 9: Verify
# ============================================================
Log "STEP 9: Verifying palace..."
try {
    $status = & py -m mempalace status 2>&1
    $status | ForEach-Object { Log "  $_" }
    Log "Palace verification complete."
} catch {
    Log "WARNING: Status check failed - $_"
}

# ============================================================
# Summary
# ============================================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  REBUILD COMPLETE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Log: $LOG_FILE"
Write-Host "Progress: $PROGRESS_FILE"
Write-Host ""
Write-Host "Next: restart Claude Code. The MCP server will connect to the fresh palace."
Write-Host ""

Log "=== REBUILD COMPLETE ==="
