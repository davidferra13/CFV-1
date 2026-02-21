$connections = Get-NetTCPConnection -LocalPort 3100 -ErrorAction SilentlyContinue
$serverPid = if ($connections) { $connections[0].OwningProcess } else { $null }
Write-Host "Server PID on port 3100: $serverPid"

$stray = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne $serverPid }
Write-Host "Killing $($stray.Count) stray node processes..."
$stray | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

$remaining = Get-Process -Name node -ErrorAction SilentlyContinue
Write-Host "Remaining node processes: $($remaining.Count)"
$remaining | Select-Object Id, CPU | Format-Table
