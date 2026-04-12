# Install hourly memory sweep as Windows Task Scheduler task
# Run this ONCE as Administrator (or it will prompt for elevation)

$taskName = "ChefFlow-MemorySweep"
$scriptPath = "C:\Users\david\Documents\CFv1\scripts\memory-sweep.ps1"
$logDir = "C:\Users\david\Documents\CFv1\logs"

# Ensure logs dir exists
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir | Out-Null
}

# Remove existing task if present
if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "Removed existing task."
}

$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NonInteractive -NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`"" `
    -WorkingDirectory "C:\Users\david\Documents\CFv1"

# Run every hour, starting now
$trigger = New-ScheduledTaskTrigger -RepetitionInterval (New-TimeSpan -Hours 1) -Once -At (Get-Date)

$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Hours 1) `
    -RunOnlyIfNetworkAvailable `
    -StartWhenAvailable `
    -DontStopIfGoingOnBatteries `
    -WakeToRun:$false

$principal = New-ScheduledTaskPrincipal `
    -UserId $env:USERNAME `
    -LogonType Interactive `
    -RunLevel Highest

Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Description "Hourly ChefFlow memory palace sweep - reads all memory files and appends findings to docs/autodocket.md" `
    | Out-Null

Write-Host ""
Write-Host "Task '$taskName' installed. Runs every hour."
Write-Host "Logs: $logDir\memory-sweep.log"
Write-Host "Output: C:\Users\david\Documents\CFv1\docs\autodocket.md"
Write-Host ""
Write-Host "To run it NOW: Start-ScheduledTask -TaskName '$taskName'"
Write-Host "To check status: Get-ScheduledTask -TaskName '$taskName' | Get-ScheduledTaskInfo"
Write-Host "To remove: Unregister-ScheduledTask -TaskName '$taskName' -Confirm:`$false"
