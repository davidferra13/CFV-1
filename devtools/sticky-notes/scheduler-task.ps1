param(
  [string]$TaskName = "ChefFlow Sticky Notes Sync",
  [int]$IntervalMinutes = 5
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$npm = (Get-Command npm).Source
$action = New-ScheduledTaskAction -Execute $npm -Argument "run sticky:sync" -WorkingDirectory $repoRoot
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes)
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Description "Sync Simple Sticky Notes into ChefFlow local intake records." -Force | Out-Null

Write-Host "Registered scheduled task: $TaskName"
Write-Host "Interval minutes: $IntervalMinutes"
