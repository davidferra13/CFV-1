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

# ── Ollama Health + Auto-Start ──────────────────────────────────────────────

function Test-OllamaHealth {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" `
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

    Write-Log "[ollama] Ollama not responding — attempting to start Windows service..."
    try {
        $svc = Get-Service -Name "Ollama" -ErrorAction SilentlyContinue
        if ($null -ne $svc) {
            Start-Service -Name "Ollama" -ErrorAction Stop
            Start-Sleep -Seconds 8   # give it time to initialize
            if (Test-OllamaHealth) {
                Write-Log "[ollama] Ollama service started successfully."
            } else {
                Write-Log "[ollama] Ollama service started but not yet responding — continuing anyway."
            }
        } else {
            # Service not registered — try launching ollama.exe directly
            Write-Log "[ollama] No Ollama Windows service found. Launching ollama.exe serve..."
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
                Write-Log "[ollama] ollama.exe serve launched but not yet responding — ChefFlow will use Gemini fallback until Ollama is ready."
            }
        }
    } catch {
        Write-Log "[ollama] Could not start Ollama: $_. ChefFlow will use Gemini fallback."
    }
}

# ── Startup ──────────────────────────────────────────────────────────────────

Write-Log "=== ChefFlow Watchdog Started ==="
Ensure-OllamaRunning

# ── Main Loop ────────────────────────────────────────────────────────────────

$loopCount = 0

while ($true) {
    # Check Ollama every 10 restart cycles (~50 s of uptime per cycle)
    $loopCount++
    if ($loopCount % 10 -eq 0) {
        if (-not (Test-OllamaHealth)) {
            Write-Log "[ollama] Periodic health check failed — attempting restart..."
            Ensure-OllamaRunning
        }
    }

    Write-Log "Launching dev server..."
    try {
        $psi                  = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName         = "cmd.exe"
        $psi.Arguments        = "/c npm run dev"
        $psi.WorkingDirectory = $projectDir
        $psi.WindowStyle      = [System.Diagnostics.ProcessWindowStyle]::Hidden
        $psi.CreateNoWindow   = $true
        $psi.UseShellExecute  = $false

        $proc = [System.Diagnostics.Process]::Start($psi)
        Write-Log "Server running (PID $($proc.Id))"
        $proc.WaitForExit()
        Write-Log "Server stopped — exit code $($proc.ExitCode). Restarting in 5 s..."
    }
    catch {
        Write-Log "Failed to launch: $_. Retrying in 10 s..."
        Start-Sleep -Seconds 10
        continue
    }
    Start-Sleep -Seconds 5
}
