param(
  [switch]$Once,
  [switch]$Foreground,
  [int]$IntervalSeconds = 60
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$scriptPath = Join-Path $repoRoot 'scripts\live-ingestion-pipeline.mjs'

if (-not (Test-Path $scriptPath)) {
  throw "Missing live ingestion runner at $scriptPath"
}

$arguments = @(
  'scripts/live-ingestion-pipeline.mjs'
)

if ($Once) {
  $arguments += '--once'
} else {
  $arguments += '--watch'
  $arguments += '--interval-seconds'
  $arguments += $IntervalSeconds.ToString()
}

if ($Foreground) {
  Push-Location $repoRoot
  try {
    & node @arguments
    exit $LASTEXITCODE
  } finally {
    Pop-Location
  }
}

$process = Start-Process -FilePath 'node' -ArgumentList $arguments -WorkingDirectory $repoRoot -WindowStyle Hidden -PassThru
Write-Output "Live ingestion started. PID=$($process.Id)"
