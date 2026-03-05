param(
  [string]$DailyTime = "09:00",
  [switch]$RunNow
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$runner = Join-Path $root "scripts\mcp-check-scheduled.ps1"
$taskName = "ChefFlow MCP Health Check"

if (-not (Test-Path $runner)) {
  throw "Missing required script: $runner"
}

try {
  $time = [DateTime]::ParseExact($DailyTime, "HH:mm", $null)
} catch {
  throw "DailyTime must use 24-hour format HH:mm (example: 09:00)."
}

Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue | Out-Null

$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$runner`""

$triggers = @(
  (New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME),
  (New-ScheduledTaskTrigger -Daily -At $time)
)

$settings = New-ScheduledTaskSettingsSet `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 15) `
  -RestartCount 2 `
  -RestartInterval (New-TimeSpan -Minutes 5) `
  -MultipleInstances IgnoreNew `
  -StartWhenAvailable

$principal = New-ScheduledTaskPrincipal `
  -UserId $env:USERNAME `
  -LogonType Interactive `
  -RunLevel Highest

Register-ScheduledTask `
  -TaskName $taskName `
  -Action $action `
  -Trigger $triggers `
  -Settings $settings `
  -Principal $principal `
  -Force | Out-Null

Write-Host ""
Write-Host "  [OK] Installed scheduled task: $taskName" -ForegroundColor Green
Write-Host "       Triggers: At logon + daily at $DailyTime" -ForegroundColor Gray
Write-Host "       Runner: $runner" -ForegroundColor Gray

if ($RunNow) {
  Start-ScheduledTask -TaskName $taskName
  Write-Host "  [OK] Started task immediately." -ForegroundColor Green
}

Write-Host ""
