param(
    [string]$ProjectDir = "C:\Users\david\Documents\CFv1",
    [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptPath = Join-Path $ProjectDir 'scripts\scheduled\watchdog-supervisor.ps1'
$taskName = 'ChefFlow-WatchdogSupervisor'

if (-not (Test-Path $scriptPath)) {
    throw "Missing supervisor script at $scriptPath"
}

$action = New-ScheduledTaskAction `
    -Execute 'powershell.exe' `
    -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`"" `
    -WorkingDirectory $ProjectDir

$trigger = New-ScheduledTaskTrigger -Once -At '00:01' -RepetitionInterval (New-TimeSpan -Minutes 1)

$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -MultipleInstances IgnoreNew `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 2)

if ($DryRun) {
    [pscustomobject]@{
        taskName = $taskName
        scriptPath = $scriptPath
        cadence = 'every 1 minute'
        action = $action.Execute
        arguments = $action.Arguments
    } | ConvertTo-Json -Depth 4
    exit 0
}

Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description 'Every minute: verifies ChefFlow-Watchdog is alive and starts it hidden when absent.' `
    -Force `
    -ErrorAction Stop | Out-Null

Write-Host "Registered $taskName to supervise ChefFlow-Watchdog every minute."
