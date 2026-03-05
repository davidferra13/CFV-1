Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$taskName = "ChefFlow MCP Health Check"

Write-Host ""
if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false | Out-Null
  Write-Host "  [OK] Removed scheduled task: $taskName" -ForegroundColor Green
} else {
  Write-Host "  [INFO] Task not found: $taskName" -ForegroundColor Yellow
}
Write-Host ""
