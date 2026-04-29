# ChefFlow Production Health Check (FREE - no AI, no API cost)
# Checks prod (3000) and dev (3100) servers, Docker, Ollama
# Runs every 15 minutes

$projectDir = "C:\Users\david\Documents\CFv1"
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
$watchdogRecovery = "SKIP"

# 1. Production server (port 3000)
try {
    $resp = Invoke-WebRequest -Uri "http://localhost:3000/api/health/ping" -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    if ($resp.StatusCode -eq 200) {
        $prodStatus = "OK"
    } else {
        $prodStatus = "HTTP $($resp.StatusCode)"
        $issues += "Prod server returned $($resp.StatusCode)"
    }
} catch {
    $prodStatus = "DOWN"
    $issues += "Prod server (port 3000) unreachable"
}

# 2. Dev server (port 3100)
try {
    $resp = Invoke-WebRequest -Uri "http://localhost:3100/api/health/ping" -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    if ($resp.StatusCode -eq 200) { $devStatus = "OK" } else { $devStatus = "HTTP $($resp.StatusCode)" }
} catch {
    $devStatus = "DOWN"
    # Dev server being down is informational, not critical
}

# 3. Docker (PostgreSQL)
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

# 4. Ollama
try {
    $resp = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    $ollamaStatus = "OK"
} catch {
    $ollamaStatus = "DOWN"
    $issues += "Ollama (port 11434) unreachable"
}

# 5. Cloudflare Tunnel (check if app.cheflowhq.com resolves to prod)
try {
    $resp = Invoke-WebRequest -Uri "https://app.cheflowhq.com/api/health/ping" -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop
    $tunnelStatus = "OK"
} catch {
    $tunnelStatus = "DOWN"
    $issues += "Cloudflare Tunnel (app.cheflowhq.com) unreachable"
}

# 5b. Non-destructive recovery bridge: if prod or public tunnel is down,
# make sure the watchdog itself is alive. The supervisor only starts the
# watchdog when absent. It does not kill, restart, or register services.
if (($prodStatus -ne "OK") -or ($tunnelStatus -ne "OK")) {
    $supervisorScript = "$projectDir\scripts\scheduled\watchdog-supervisor.ps1"
    if (Test-Path $supervisorScript) {
        try {
            powershell.exe -NoProfile -ExecutionPolicy Bypass -File $supervisorScript | Out-Null
            $watchdogRecovery = "CHECKED"
        } catch {
            $watchdogRecovery = "FAILED"
            $issues += "Watchdog supervisor failed: $($_.Exception.Message)"
        }
    } else {
        $watchdogRecovery = "MISSING"
        $issues += "Watchdog supervisor script missing"
    }
}

# 6. Disk space (alert if any drive < 10GB free)
Get-PSDrive -PSProvider FileSystem | Where-Object { $_.Free -gt 0 } | ForEach-Object {
    $freeGB = [math]::Round($_.Free / 1GB, 1)
    if ($freeGB -lt 10) {
        $issues += "Low disk space on $($_.Root): ${freeGB}GB free"
    }
}

# 7. Memory usage (alert if > 90% used)
$os = Get-CimInstance Win32_OperatingSystem
$memUsedPct = [math]::Round((($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) / $os.TotalVisibleMemorySize) * 100, 1)
if ($memUsedPct -gt 90) {
    $issues += "High memory usage: ${memUsedPct}%"
}

# 8. CPU usage (alert if > 90% sustained)
$cpuPct = [math]::Round((Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average, 1)
if ($cpuPct -gt 90) {
    $issues += "High CPU usage: ${cpuPct}%"
}

# 9. Healthchecks.io ping (dead-man's-switch: if THIS task stops, Healthchecks alerts you)
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
$line = "[$timestamp] Prod=$prodStatus | Dev=$devStatus | DB=$dbStatus | Ollama=$ollamaStatus | Tunnel=$tunnelStatus | WatchdogRecovery=$watchdogRecovery | Mem=${memUsedPct}% | CPU=${cpuPct}%"
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
