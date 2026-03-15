# Open OpenClaw Control UI
# Ensures SSH tunnel is running, then opens the dashboard in your default browser

$tunnelRunning = Get-NetTCPConnection -LocalPort 18789 -ErrorAction SilentlyContinue
if (-not $tunnelRunning) {
    Write-Host "Starting SSH tunnel to Pi..."
    Start-Process ssh -ArgumentList "-f -N -L 18789:127.0.0.1:18789 pi" -WindowStyle Hidden
    Start-Sleep -Seconds 2
}

Write-Host "Opening OpenClaw Control UI..."
Start-Process "http://127.0.0.1:18789/"
