param(
  [switch]$Resume,
  [string]$RunDir = "",
  [int]$MaxRetries = 1,
  [int]$Workers = 1,
  [bool]$RequireAdmin = $true
)

$ErrorActionPreference = "Stop"

if ($MaxRetries -lt 0) {
  throw "MaxRetries must be >= 0"
}

if ($Workers -lt 1) {
  throw "Workers must be >= 1"
}

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$reportsDir = Join-Path $root "reports"
New-Item -Path $reportsDir -ItemType Directory -Force | Out-Null

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$launcherLog = Join-Path $reportsDir "coverage-overnight-launch-$stamp.log"

$runnerArgs = @(
  "scripts/coverage-overnight-runner.mjs",
  "--max-retries=$MaxRetries",
  "--workers=$Workers",
  "--require-admin=$($RequireAdmin.ToString().ToLower())"
)

if ($Resume) {
  $runnerArgs += "--resume"
}

if ($RunDir -ne "") {
  $runnerArgs += "--run-dir=$RunDir"
}

$quotedArgs = $runnerArgs | ForEach-Object {
  if ($_ -match "\s") { '"' + $_ + '"' } else { $_ }
}

$command = "node " + ($quotedArgs -join " ") + " >> `"$launcherLog`" 2>&1"

$proc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $command -WorkingDirectory $root -PassThru

Write-Host "Started overnight coverage runner."
Write-Host "PID: $($proc.Id)"
Write-Host "Launcher log: $launcherLog"
Write-Host "Command: $command"
