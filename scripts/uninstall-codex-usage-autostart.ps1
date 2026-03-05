$ErrorActionPreference = "Stop"

$startupFolder = [Environment]::GetFolderPath("Startup")
$launcherPath = Join-Path $startupFolder "codex-usage-launcher.vbs"

Write-Host ""

if (Test-Path $launcherPath) {
  Remove-Item -Path $launcherPath -Force
  Write-Host "  [OK] Removed Codex usage auto-start entry." -ForegroundColor Green
  Write-Host "       Removed: $launcherPath" -ForegroundColor Gray
} else {
  Write-Host "  [INFO] No Codex usage auto-start entry found." -ForegroundColor Yellow
  Write-Host "         Expected path: $launcherPath" -ForegroundColor Gray
}

Write-Host ""
