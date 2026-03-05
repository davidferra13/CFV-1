param(
  [ValidateSet("auto", "edge", "chrome", "default")]
  [string]$Browser = "auto",
  [switch]$AlwaysOnTop,
  [switch]$StartNow
)

$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$openScript = Join-Path $root "scripts\open-codex-usage-window.ps1"

if (-not (Test-Path $openScript)) {
  throw "Missing required script: $openScript"
}

$startupFolder = [Environment]::GetFolderPath("Startup")
$launcherPath = Join-Path $startupFolder "codex-usage-launcher.vbs"

$openScriptEscaped = $openScript.Replace('"', '""')
$command = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File ""$openScriptEscaped"""

if ($Browser -ne "auto") {
  $command += " -Browser $Browser"
}

if ($AlwaysOnTop) {
  $command += " -AlwaysOnTop"
}

$commandForVbs = $command.Replace('"', '""')

$vbs = @"
Set shell = CreateObject("WScript.Shell")
shell.Run "$commandForVbs", 0, False
"@

Set-Content -Path $launcherPath -Value $vbs -Encoding ASCII

Write-Host ""
Write-Host "  [OK] Installed login auto-start for Codex usage window." -ForegroundColor Green
Write-Host "       Startup entry: $launcherPath" -ForegroundColor Gray

if ($StartNow) {
  Start-Process -FilePath "wscript.exe" -ArgumentList @("""$launcherPath""") | Out-Null
  Write-Host "  [OK] Launched usage window now." -ForegroundColor Green
}

Write-Host ""
