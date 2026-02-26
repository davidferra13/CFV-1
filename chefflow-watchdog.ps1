$projectDir = "C:\Users\david\Documents\CFv1"
$logFile    = "$projectDir\chefflow-watchdog.log"

function Write-Log {
    param($msg)
    $ts   = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$ts] $msg"
    Add-Content -Path $logFile -Value $line
}

# Rotate log if it exceeds 1 MB
if ((Test-Path $logFile) -and (Get-Item $logFile).Length -gt 1MB) {
    Remove-Item "$logFile.old" -ErrorAction SilentlyContinue
    Rename-Item  $logFile "$logFile.old" -ErrorAction SilentlyContinue
}

# ============================================
# Ollama Health + Auto-Start (PC)
# ============================================

# Reads OLLAMA_BASE_URL from .env.local so the watchdog always points to the
# same host the app uses (localhost when on laptop, Pi IP when Pi is connected).
function Get-OllamaBaseUrl {
    $envFile = "$projectDir\.env.local"
    if (Test-Path $envFile) {
        $line = Get-Content $envFile | Where-Object { $_ -match '^OLLAMA_BASE_URL=' }
        if ($line) {
            return ($line -split '=', 2)[1].Trim()
        }
    }
    return 'http://localhost:11434'
}

function Test-OllamaIsRemote {
    $url = Get-OllamaBaseUrl
    return ($url -notmatch 'localhost' -and $url -notmatch '127\.0\.0\.1')
}

function Test-OllamaHealth {
    $url = Get-OllamaBaseUrl
    try {
        $response = Invoke-WebRequest -Uri "$url/api/tags" `
            -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

function Ensure-OllamaRunning {
    if (Test-OllamaHealth) {
        Write-Log "[ollama] PC Ollama is online."
        return
    }

    # If Ollama is on the Raspberry Pi (remote URL), we cannot start it from Windows.
    # Just log the warning — the Pi manages its own Ollama service via systemctl.
    if (Test-OllamaIsRemote) {
        $url = Get-OllamaBaseUrl
        Write-Log "[ollama] Remote Ollama at $url is not responding. Check that the Pi is powered on and Ollama service is running."
        return
    }

    Write-Log "[ollama] PC Ollama not responding - attempting to start..."
    try {
        $svc = Get-Service -Name "Ollama" -ErrorAction SilentlyContinue
        if ($null -ne $svc) {
            Start-Service -Name "Ollama" -ErrorAction Stop
            Start-Sleep -Seconds 8
            if (Test-OllamaHealth) {
                Write-Log "[ollama] Ollama service started successfully."
            } else {
                Write-Log "[ollama] Ollama service started but not yet responding - continuing."
            }
        } else {
            Write-Log "[ollama] No Ollama service found. Launching ollama.exe serve..."
            $ollamaPsi = New-Object System.Diagnostics.ProcessStartInfo
            $ollamaPsi.FileName         = "ollama"
            $ollamaPsi.Arguments        = "serve"
            $ollamaPsi.WindowStyle      = [System.Diagnostics.ProcessWindowStyle]::Hidden
            $ollamaPsi.CreateNoWindow   = $true
            $ollamaPsi.UseShellExecute  = $false
            [System.Diagnostics.Process]::Start($ollamaPsi) | Out-Null
            Start-Sleep -Seconds 8
            if (Test-OllamaHealth) {
                Write-Log "[ollama] ollama.exe serve started successfully."
            } else {
                Write-Log "[ollama] ollama.exe serve launched but not yet responding - continuing."
            }
        }
    } catch {
        $errMsg = $_.Exception.Message
        Write-Log "[ollama] Could not start PC Ollama: $errMsg"
    }
}

# ============================================
# Pi Ollama Health + SSH Restart
# ============================================
# Best practice: Google SRE cross-monitoring pattern
# PC monitors Pi's Ollama health via network. If Pi's Ollama
# is unreachable for 5+ minutes, SSH restart it remotely.
# Circuit breaker: max 2 SSH restarts per hour.

$piRestartCount = 0
$piRestartWindowStart = Get-Date
$piConsecutiveFailures = 0
$piMaxConsecutiveFailures = 5  # 5 failed checks (~2.5 min) before SSH restart

function Get-PiUrl {
    $envFile = "$projectDir\.env.local"
    if (Test-Path $envFile) {
        $line = Get-Content $envFile | Where-Object { $_ -match '^OLLAMA_PI_URL=' }
        if ($line) {
            return ($line -split '=', 2)[1].Trim()
        }
    }
    return $null
}

function Get-PiCredentials {
    $credsFile = "$projectDir\.auth\pi.json"
    if (-not (Test-Path $credsFile)) { return $null }
    try {
        $json = Get-Content $credsFile -Raw | ConvertFrom-Json
        return @{
            Host     = $json.host
            Username = $json.username
        }
    } catch {
        return $null
    }
}

function Test-PiOllamaHealth {
    $piUrl = Get-PiUrl
    if (-not $piUrl) { return $null }  # Pi not configured

    try {
        $response = Invoke-WebRequest -Uri "$piUrl/api/tags" `
            -TimeoutSec 8 -UseBasicParsing -ErrorAction Stop
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

function Restart-PiOllama {
    # Circuit breaker: max 2 restarts per hour
    $now = Get-Date
    $elapsed = ($now - $script:piRestartWindowStart).TotalSeconds
    if ($elapsed -gt 3600) {
        # Reset window
        $script:piRestartCount = 0
        $script:piRestartWindowStart = $now
    }
    if ($script:piRestartCount -ge 2) {
        Write-Log "[pi] CIRCUIT BREAKER: Already restarted Pi Ollama $($script:piRestartCount) times this hour. Skipping."
        return $false
    }

    $creds = Get-PiCredentials
    if (-not $creds) {
        Write-Log "[pi] Cannot SSH restart — no Pi credentials found in .auth/pi.json"
        return $false
    }

    Write-Log "[pi] Attempting SSH restart of Pi Ollama..."
    try {
        # Use key-based auth (BatchMode=yes) — no password prompt
        & ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -o BatchMode=yes "$($creds.Username)@$($creds.Host)" "sudo systemctl restart ollama" 2>&1 | Out-Null
        $script:piRestartCount++

        # Wait for Ollama to come back
        Start-Sleep -Seconds 10

        $piHealthy = Test-PiOllamaHealth
        if ($piHealthy) {
            Write-Log "[pi] SSH restart successful — Pi Ollama is back online."
            return $true
        } else {
            Write-Log "[pi] SSH restart issued but Pi Ollama not yet responding."
            return $false
        }
    } catch {
        $errMsg = $_.Exception.Message
        Write-Log "[pi] SSH restart failed: $errMsg"
        return $false
    }
}

function Monitor-PiOllama {
    $piUrl = Get-PiUrl
    if (-not $piUrl) { return }  # Pi not configured — nothing to monitor

    $piHealthy = Test-PiOllamaHealth
    if ($null -eq $piHealthy) { return }  # Pi not configured

    if ($piHealthy) {
        if ($script:piConsecutiveFailures -gt 0) {
            Write-Log "[pi] Pi Ollama recovered (was down for $($script:piConsecutiveFailures) checks)."
        } else {
            Write-Log "[pi] Pi Ollama is online."
        }
        $script:piConsecutiveFailures = 0
        return
    }

    # Pi is unhealthy
    $script:piConsecutiveFailures++
    Write-Log "[pi] Pi Ollama health check failed ($($script:piConsecutiveFailures)/$piMaxConsecutiveFailures)"

    # After N consecutive failures, attempt SSH restart
    if ($script:piConsecutiveFailures -ge $piMaxConsecutiveFailures) {
        Write-Log "[pi] Pi Ollama has been down for $($script:piConsecutiveFailures) checks — initiating SSH restart..."
        $restarted = Restart-PiOllama
        if ($restarted) {
            $script:piConsecutiveFailures = 0
        }
    }
}

# Startup

Write-Log "=== ChefFlow Watchdog Started (PC + Pi Monitoring) ==="
Ensure-OllamaRunning

# ============================================
# Mission Control Dashboard — Auto-Start
# ============================================
# Ensures the dashboard server (port 3200) and system tray are running

$dashboardPort = 3200

function Ensure-MissionControlRunning {
    # Check if dashboard server is already running
    $dashboardRunning = $false
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.Connect("127.0.0.1", $dashboardPort)
        $tcp.Close()
        $dashboardRunning = $true
    } catch { }

    if (-not $dashboardRunning) {
        Write-Log "[dashboard] Starting Mission Control server on port $dashboardPort..."
        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = "node"
        $psi.Arguments = "scripts/launcher/server.mjs"
        $psi.WorkingDirectory = $projectDir
        $psi.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
        $psi.CreateNoWindow = $true
        $psi.UseShellExecute = $false
        try {
            [System.Diagnostics.Process]::Start($psi) | Out-Null
            Write-Log "[dashboard] Mission Control server started."
        } catch {
            Write-Log "[dashboard] Failed to start Mission Control: $($_.Exception.Message)"
        }
    }

    # Check if tray icon is running (look for the PowerShell process)
    $trayRunning = Get-Process powershell -ErrorAction SilentlyContinue |
        Where-Object { $_.MainWindowTitle -eq "" } |
        Where-Object {
            try {
                $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId=$($_.Id)" -ErrorAction SilentlyContinue).CommandLine
                $cmdLine -match "tray\.ps1"
            } catch { $false }
        }

    if (-not $trayRunning) {
        Write-Log "[dashboard] Starting Mission Control system tray..."
        Start-Process powershell -ArgumentList "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"$projectDir\scripts\launcher\tray.ps1`"" -WindowStyle Hidden
        Write-Log "[dashboard] System tray started."
    }
}

Ensure-MissionControlRunning

# Port check — prevents restart loop when server is already running

$port = 3100

function Test-PortInUse {
    param($p)
    $listener = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
    return ($null -ne $listener)
}

function Test-ServerHealthy {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$port/" `
            -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        return $response.StatusCode -eq 200
    } catch {
        # A 3xx/4xx still means the server is alive and responding
        if ($_.Exception.Response) { return $true }
        return $false
    }
}

# Main Loop

$loopCount = 0

while ($true) {
    $loopCount++

    # Every 10 loops (~5 min at 30s intervals): check PC Ollama
    if ($loopCount % 10 -eq 0) {
        if (-not (Test-OllamaHealth)) {
            Write-Log "[ollama] Periodic PC health check failed - attempting restart..."
            Ensure-OllamaRunning
        }
    }

    # Every loop: check Pi Ollama (lightweight — just a GET /api/tags)
    Monitor-PiOllama

    # If port 3100 is already listening, don't spawn a duplicate — just wait
    if (Test-PortInUse $port) {
        if ($loopCount -eq 1) {
            Write-Log "Port $port already in use — server is running externally. Watching."
        }
        Start-Sleep -Seconds 30
        continue
    }

    Write-Log "Launching dev server on port $port..."
    try {
        $psi                  = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName         = "C:\nvm4w\nodejs\node.exe"
        $psi.Arguments        = "`"$projectDir\node_modules\next\dist\bin\next`" dev -p $port -H 0.0.0.0"
        $psi.WorkingDirectory = $projectDir
        $psi.WindowStyle      = [System.Diagnostics.ProcessWindowStyle]::Hidden
        $psi.CreateNoWindow   = $true
        $psi.UseShellExecute  = $false

        $proc = [System.Diagnostics.Process]::Start($psi)
        Write-Log "Server running (PID $($proc.Id))"
        $proc.WaitForExit()

        # If the process died in under 3 seconds, it probably hit a port conflict
        # or a startup error — back off longer to avoid a tight loop
        Write-Log "Server stopped (exit $($proc.ExitCode)). Checking port..."
        if (Test-PortInUse $port) {
            Write-Log "Port $port still in use after exit — another process took it. Watching."
            Start-Sleep -Seconds 30
            continue
        }
        Write-Log "Port $port is free. Restarting in 5 s..."
    } catch {
        $errMsg = $_.Exception.Message
        Write-Log "Failed to launch: $errMsg. Retrying in 10 s..."
        Start-Sleep -Seconds 10
        continue
    }
    Start-Sleep -Seconds 5
}
