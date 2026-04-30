param(
  [string]$TaskName = "ChefFlow Sticky Notes Sync",
  [int]$IntervalMinutes = 5
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$node = (Get-Command node).Source
$organizeScript = Join-Path $repoRoot "devtools\sticky-notes\organize.mjs"
$nodeCommand = "& `"$node`" `"$organizeScript`" --apply-colors --layout"
$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command `"$nodeCommand`"" `
  -WorkingDirectory $repoRoot
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes)
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew
$settings.Hidden = $true

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Description "Organize Simple Sticky Notes into ChefFlow local intake records and visual layout." -Force | Out-Null

Write-Host "Registered scheduled task: $TaskName"
Write-Host "Interval minutes: $IntervalMinutes"
