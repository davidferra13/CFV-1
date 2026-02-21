$projectDir     = "C:\Users\david\Documents\CFv1"
$watchdogScript = "$projectDir\chefflow-watchdog.ps1"
$taskName       = "ChefFlow Server"

Write-Host ""
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host "    ChefFlow Persistent Auto-Start Setup" -ForegroundColor Cyan
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host ""

# Remove any existing task
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

# Build the task components
$action = New-ScheduledTaskAction `
    -Execute  "powershell.exe" `
    -Argument "-WindowStyle Hidden -ExecutionPolicy Bypass -NonInteractive -File `"$watchdogScript`""

$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME

$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit  ([TimeSpan]::Zero) `
    -RestartCount        10 `
    -RestartInterval     (New-TimeSpan -Minutes 1) `
    -MultipleInstances   IgnoreNew `
    -StartWhenAvailable

$principal = New-ScheduledTaskPrincipal `
    -UserId    $env:USERNAME `
    -LogonType Interactive `
    -RunLevel  Highest

$result = Register-ScheduledTask `
    -TaskName  $taskName `
    -Action    $action `
    -Trigger   $trigger `
    -Settings  $settings `
    -Principal $principal `
    -Force 2>&1

if ($LASTEXITCODE -ne 0 -and $result -match "Error") {
    Write-Host "  [FAIL] Could not register scheduled task:" -ForegroundColor Red
    Write-Host "  $result" -ForegroundColor Red
    exit 1
}

Write-Host "  [OK] Scheduled task '$taskName' registered." -ForegroundColor Green
Write-Host "       ChefFlow will now start automatically on every login." -ForegroundColor Green
Write-Host ""
Write-Host "  Starting ChefFlow now..." -ForegroundColor Yellow

Start-ScheduledTask -TaskName $taskName

Start-Sleep -Seconds 5

Write-Host ""
Write-Host "  [OK] ChefFlow is running!" -ForegroundColor Green
Write-Host "       Open: http://localhost:3100" -ForegroundColor Cyan
Write-Host ""
Write-Host "  To stop ChefFlow intentionally: double-click stop-chefflow.bat" -ForegroundColor Gray
Write-Host "  Log file: $projectDir\chefflow-watchdog.log" -ForegroundColor Gray
Write-Host ""
