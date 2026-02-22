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

# Ollama Health + Auto-Start

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
        Write-Log "[ollama] Ollama is online."
        return
    }

    # If Ollama is on the Raspberry Pi (remote URL), we cannot start it from Windows.
    # Just log the warning — the Pi manages its own Ollama service via systemctl.
    if (Test-OllamaIsRemote) {
        $url = Get-OllamaBaseUrl
        Write-Log "[ollama] Remote Ollama at $url is not responding. Check that the Pi is powered on and Ollama service is running."
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
    if ($loopCount % 10 -eq 0) {
        if (-not (Test-OllamaHealth)) {
            Write-Log "[ollama] Periodic health check failed - attempting restart..."
            Ensure-OllamaRunning
        }
    }

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
