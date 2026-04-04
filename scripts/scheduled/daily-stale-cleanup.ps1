# ChefFlow Daily Stale Artifact Cleanup (FREE - no AI, no API cost)
# Cleans stale build caches, temp files, old screenshots
# Runs daily at 2:00 AM

$projectDir = "C:\Users\david\Documents\CFv1"
$logFile    = "$projectDir\logs\cleanup.log"

if (-not (Test-Path "$projectDir\logs")) {
    New-Item -ItemType Directory -Path "$projectDir\logs" -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$cleaned = @()

# 1. Clean test artifacts older than 7 days
$testDirs = @("test-results", "test-screenshots", "tmp-screenshots", "results")
foreach ($dir in $testDirs) {
    $fullPath = Join-Path $projectDir $dir
    if (Test-Path $fullPath) {
        $old = Get-ChildItem $fullPath -Recurse -File | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) }
        if ($old.Count -gt 0) {
            $old | Remove-Item -Force -ErrorAction SilentlyContinue
            $cleaned += "$dir: $($old.Count) files"
        }
    }
}

# 2. Clean QA screenshots older than 14 days
$qaDirs = @("qa-screenshots", ".qa-screenshots", "screenshots")
foreach ($dir in $qaDirs) {
    $fullPath = Join-Path $projectDir $dir
    if (Test-Path $fullPath) {
        $old = Get-ChildItem $fullPath -Recurse -File | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-14) }
        if ($old.Count -gt 0) {
            $old | Remove-Item -Force -ErrorAction SilentlyContinue
            $cleaned += "$dir: $($old.Count) files"
        }
    }
}

# 3. Clean old log files (not current ones) older than 30 days
$logDir = Join-Path $projectDir "logs"
if (Test-Path $logDir) {
    $oldLogs = Get-ChildItem $logDir -File "*.old" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) }
    if ($oldLogs.Count -gt 0) {
        $oldLogs | Remove-Item -Force -ErrorAction SilentlyContinue
        $cleaned += "logs: $($oldLogs.Count) old files"
    }
}

# 4. Clean runtime probe folders
$probes = Get-ChildItem $projectDir -Directory -Filter ".next-*-probe*" -ErrorAction SilentlyContinue
if ($probes.Count -gt 0) {
    $probes | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    $cleaned += "probes: $($probes.Count) directories"
}

# Log
if ($cleaned.Count -gt 0) {
    Add-Content -Path $logFile -Value "[$timestamp] Cleaned: $($cleaned -join ', ')"
} else {
    Add-Content -Path $logFile -Value "[$timestamp] Nothing to clean."
}
