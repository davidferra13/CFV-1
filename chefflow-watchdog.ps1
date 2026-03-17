$projectDir = "C:\Users\david\Documents\CFv1"
$logFile    = "$projectDir\chefflow-watchdog.log"

# ============================================
# Mutex -- prevent duplicate watchdog instances
# ============================================
$mutexName = "Global\ChefFlowWatchdog"
$createdNew = $false
$script:watchdogMutex = New-Object System.Threading.Mutex($true, $mutexName, [ref]$createdNew)
if (-not $createdNew) {
    # Another watchdog is already running -- exit silently
    exit 0
}
# Release mutex on exit so Task Scheduler can relaunch cleanly
Register-EngineEvent PowerShell.Exiting -Action { $script:watchdogMutex.ReleaseMutex() } | Out-Null

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
        Write-Log "[ollama] Ollama is online."
        return
    }

    Write-Log "[ollama] Ollama not responding - attempting to start..."
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
        Write-Log "[ollama] Could not start Ollama: $errMsg"
    }
}

# Startup

Write-Log "=== ChefFlow Watchdog Started ==="
Ensure-OllamaRunning

# ============================================
# Mission Control Dashboard -- Auto-Start
# ============================================

$dashboardPort = 41937

function Ensure-MissionControlRunning {
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

    # Check if tray icon is running
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

# ============================================
# Dev Server Watchdog
# ============================================

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
        if ($_.Exception.Response) { return $true }
        return $false
    }
}

# Main Loop

$loopCount = 0

while ($true) {
    $loopCount++

    # Every 10 loops (~5 min at 30s intervals): check Ollama
    if ($loopCount % 10 -eq 0) {
        if (-not (Test-OllamaHealth)) {
            Write-Log "[ollama] Periodic health check failed - attempting restart..."
            Ensure-OllamaRunning
        }
    }

    # Every 6 loops (~3 min): check Mission Control + tray are alive
    if ($loopCount % 6 -eq 0) {
        Ensure-MissionControlRunning
    }

    # If port 3100 is already listening, don't spawn a duplicate -- just wait
    if (Test-PortInUse $port) {
        if ($loopCount -eq 1) {
            Write-Log "Port $port already in use -- server is running externally. Watching."
        }
        Start-Sleep -Seconds 30
        continue
    }

    Write-Log "Launching dev server on port $port..."
    try {
        $psi                  = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName         = "node"
        $psi.Arguments        = "`"$projectDir\node_modules\next\dist\bin\next`" dev -p $port -H 0.0.0.0"
        $psi.WorkingDirectory = $projectDir
        $psi.WindowStyle      = [System.Diagnostics.ProcessWindowStyle]::Hidden
        $psi.CreateNoWindow   = $true
        $psi.UseShellExecute  = $false

        $proc = [System.Diagnostics.Process]::Start($psi)
        Write-Log "Server running (PID $($proc.Id))"
        $proc.WaitForExit()

        Write-Log "Server stopped (exit $($proc.ExitCode)). Checking port..."
        if (Test-PortInUse $port) {
            Write-Log "Port $port still in use after exit -- another process took it. Watching."
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
