# ChefFlow Production Health Check (FREE - no AI, no API cost)
# Checks canonical app origin, public production surfaces, Docker, and Ollama
# Runs every 15 minutes

$projectDir = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$logFile    = "$projectDir\logs\health-check.log"

if (-not (Test-Path "$projectDir\logs")) {
    New-Item -ItemType Directory -Path "$projectDir\logs" -Force | Out-Null
}

# Rotate log at 2 MB
if ((Test-Path $logFile) -and (Get-Item $logFile).Length -gt 2MB) {
    Remove-Item "$logFile.old" -ErrorAction SilentlyContinue
    Rename-Item  $logFile "$logFile.old" -ErrorAction SilentlyContinue
}

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$issues = @()

# 1. Canonical production trust: origin 3100 + public edge/routes
$trustStatus = "CHECK_ERROR"
$nodeExe = if (Test-Path "C:\nvm4w\nodejs\node.exe") {
    "C:\nvm4w\nodejs\node.exe"
} else {
    (Get-Command node -ErrorAction SilentlyContinue).Source
}

if (-not $nodeExe) {
    $issues += "Node.js executable not found for production trust check"
} else {
    try {
        $trustRaw = & $nodeExe "$projectDir\scripts\production-trust-check.mjs" --json 2>&1
        $trust = ($trustRaw -join "`n") | ConvertFrom-Json
        $trustStatus = $trust.classification

        if (-not $trust.ok) {
            $failedNames = @(
                $trust.results |
                    Where-Object { -not $_.ok } |
                    ForEach-Object { $_.name }
            ) -join ", "
            $issues += "Production trust failed ($trustStatus): $failedNames"
        }
    } catch {
        $issues += "Production trust check could not run: $($_.Exception.Message)"
    }
}

# 2. Docker (PostgreSQL)
try {
    $docker = docker ps --filter "name=chefflow_postgres" --format "{{.Status}}" 2>&1
    if ($docker -match "Up") {
        $dbStatus = "OK"
    } else {
        $dbStatus = "DOWN"
        $issues += "PostgreSQL Docker container not running"
    }
} catch {
    $dbStatus = "UNKNOWN"
    $issues += "Docker not accessible"
}

# 3. Ollama
try {
    $resp = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    $ollamaStatus = "OK"
} catch {
    $ollamaStatus = "DOWN"
    $issues += "Ollama (port 11434) unreachable"
}

# 4. Disk space (alert if any drive < 10GB free)
Get-PSDrive -PSProvider FileSystem | Where-Object { $_.Free -gt 0 } | ForEach-Object {
    $freeGB = [math]::Round($_.Free / 1GB, 1)
    if ($freeGB -lt 10) {
        $issues += "Low disk space on $($_.Root): ${freeGB}GB free"
    }
}

# 5. Memory usage (alert if > 90% used)
$os = Get-CimInstance Win32_OperatingSystem
$memUsedPct = [math]::Round((($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) / $os.TotalVisibleMemorySize) * 100, 1)
if ($memUsedPct -gt 90) {
    $issues += "High memory usage: ${memUsedPct}%"
}

# 6. CPU usage (alert only when > 90% across multiple samples)
try {
    $cpuCounter = Get-Counter '\Processor(_Total)\% Processor Time' -SampleInterval 1 -MaxSamples 3 -ErrorAction Stop
    $cpuPct = [math]::Round(($cpuCounter.CounterSamples | Measure-Object -Property CookedValue -Average).Average, 1)
} catch {
    $cpuPct = [math]::Round((Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average, 1)
}
if ($cpuPct -gt 90) {
    $issues += "High sustained CPU usage: ${cpuPct}%"
}

# 7. Healthchecks.io ping (dead-man's-switch: if THIS task stops, Healthchecks alerts you)
# To enable: create a check at https://healthchecks.io, paste the ping URL below
$healthchecksUrl = $env:HEALTHCHECKS_PING_URL
if ($healthchecksUrl) {
    try {
        Invoke-WebRequest -Uri $healthchecksUrl -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop | Out-Null
    } catch {
        # Non-blocking: if Healthchecks.io is down, don't fail the health check
    }
}

# Log result
$line = "[$timestamp] Trust=$trustStatus | DB=$dbStatus | Ollama=$ollamaStatus | Mem=${memUsedPct}% | CPU=${cpuPct}%"
if ($issues.Count -gt 0) {
    $line += " | ISSUES: $($issues -join '; ')"
}
Add-Content -Path $logFile -Value $line

# Desktop notification on critical failure
if ($issues.Count -gt 0) {
    $msg = $issues -join "`n"
    [System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null
    $balloon = New-Object System.Windows.Forms.NotifyIcon
    $balloon.Icon = [System.Drawing.SystemIcons]::Warning
    $balloon.Visible = $true
    $balloon.ShowBalloonTip(10000, "ChefFlow Health Alert", $msg, [System.Windows.Forms.ToolTipIcon]::Warning)
    Start-Sleep -Seconds 2
    $balloon.Dispose()
}
